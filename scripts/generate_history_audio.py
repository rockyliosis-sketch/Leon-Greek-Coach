"""Render, fully decode and publish history MP3s with edge-tts, ffmpeg and gcloud.

    python3 scripts/generate_history_audio.py --lesson g3_u1_l1
    python3 scripts/generate_history_audio.py --cache-dir /tmp/leon-history-voices
    python3 scripts/generate_history_audio.py --lesson g3_u1_l1 --local-only
"""

import argparse
import base64
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
import fcntl
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import time
import unicodedata


ROOT = Path(__file__).resolve().parents[1]
ZH = ("zh-CN-YunxiNeural", "-5%")
EL = ("el-GR-NestorasNeural", "-18%")
EL_STORY = ("el-GR-NestorasNeural", "-22%")
RATE = 24000
TAG = re.compile(r"\[\[el:([^\[\]]+)\]\]")
HISTORY = ROOT / "frontend/src/data/history"
BUCKET = "gs://leon-greek-coach.firebasestorage.app/history"
CACHE_CONTROL = "public, max-age=31536000, immutable"
DEFAULT_OUTPUT = Path(tempfile.gettempdir()) / "leon-history-audio"
UNIT_FILE = re.compile(r"g\d+_unit\d+\.json")
GREEK_LETTER = re.compile(r"[Α-ΡΣ-ωάέήίόύώϊϋΐΰΆΈΉΊΌΎΏ]")
TRIM = ("silenceremove=start_periods=1:start_silence=0.03:start_threshold=-45dB,"
        "areverse,silenceremove=start_periods=1:start_silence=0.03:"
        "start_threshold=-45dB,areverse")


@dataclass(frozen=True)
class Speech:
    text: str
    voice: str
    rate: str

    @classmethod
    def spoken(cls, text, settings):
        if settings != ZH:
            text = text.translate(str.maketrans({":": ",", "«": " ", "»": " "}))
        return cls(" ".join(text.split()), *settings)


def spelling(text):
    return " ".join(unicodedata.normalize("NFC", text).casefold().split())


def term_key(text):
    # Preserve lexical stress (Αθηνά / Αθήνα) and whole titles (Ξένιος Ζευς).
    key = re.sub(r"^(?:ο|η|το|οι|τα) ", "", spelling(text))
    return {"ζευσ": "δίασ", "ζεύσ": "δίασ"}.get(key, key)


def validate_curriculum(lessons):
    seen = {}
    ids = set()
    order = set()
    errors = []
    for lesson in sorted(lessons, key=lambda item: (item["grade"], item["unitNumber"], item["lessonNumber"])):
        label = lesson["id"]
        position = (lesson["grade"], lesson["unitNumber"], lesson["lessonNumber"])
        if label in ids or position in order:
            errors.append(f"{label}: duplicate lesson ID or curriculum position {position}")
        ids.add(label)
        order.add(position)
        cards = Counter()
        for entry in lesson["vocabReview"]:
            term = entry["el"]
            if not GREEK_LETTER.search(term) or not entry["zh"].strip():
                errors.append(f"{label}: invalid vocabulary entry {entry}")
            cards[unicodedata.normalize("NFC", term)] += 1
            key = term_key(term)
            if key in seen:
                errors.append(f"{label}: repeated vocabulary {term!r}, first introduced in {seen[key]}")
            else:
                seen[key] = label
        tags = Counter()
        for number, paragraph in enumerate(lesson["zhStoryScript"], 1):
            plain = TAG.sub("", paragraph)
            if re.search(r"[\[\]［］]|\bel\s*[:：]", plain):
                errors.append(f"{label} paragraph {number}: malformed Greek marker")
            if GREEK_LETTER.search(plain):
                errors.append(f"{label} paragraph {number}: Greek outside a voice marker")
            for term in TAG.findall(paragraph):
                if not GREEK_LETTER.search(term) or any(c.isalpha() and "GREEK" not in unicodedata.name(c, "") for c in term):
                    errors.append(f"{label} paragraph {number}: invalid Greek marker {term!r}")
                tags[unicodedata.normalize("NFC", term)] += 1
        for term in sorted(tags.keys() | cards.keys()):
            if (tags[term], cards[term]) != (1, 1):
                errors.append(f"{label}: {term!r} has {tags[term]} body tags and {cards[term]} review/cards, expected 1 each")
    if errors:
        raise ValueError("\n".join(errors))


def load_curriculum(input_path=None, history_dir=HISTORY):
    # A scratch input can replace individual lessons for rendering, but cannot
    # make previous units invisible to the first-introduction check.
    paths = sorted(p.resolve() for p in history_dir.glob("g*_unit*.json") if UNIT_FILE.fullmatch(p.name))
    by_file = {p: json.loads(p.read_text()) for p in paths}
    lessons = [lesson for unit in by_file.values() for lesson in unit]
    input_path = input_path.resolve() if input_path else None
    if input_path and input_path not in by_file:
        selected = json.loads(input_path.read_text())
        replacements = {item["id"] for item in selected}
        lessons = [item for item in lessons if item["id"] not in replacements] + selected
    else:
        selected = by_file[input_path] if input_path else lessons
    validate_curriculum(lessons)
    return sorted(selected, key=lambda item: (item["grade"], item["unitNumber"], item["lessonNumber"]))


def lesson_tracks(lesson):
    chinese = []
    for paragraph in lesson["zhStoryScript"]:
        if chinese:
            chinese.append(550)
        pieces = TAG.split(paragraph)
        if any("[[" in text or "]]" in text for text in pieces):
            raise ValueError(f"Invalid Greek tag in {paragraph}")
        for i, text in enumerate(pieces):
            if not text.strip():
                continue
            if not any(c.isalnum() for c in text):
                chinese.append(280 if re.search(r"[。！？.!?]", text) else 120)
                continue
            if i and chinese and isinstance(chinese[-1], Speech):
                chinese.append(130)
            chinese.append(Speech.spoken(text, EL if i % 2 else ZH))

    review_index = sum(isinstance(part, Speech) for part in chinese)
    chinese.extend([1000, Speech.spoken("现在，一起来复习本课的人物和关键词。听完希腊语，你也可以跟着读一遍。", ZH), 600])
    cards = []
    for entry in lesson["vocabReview"]:
        word = Speech.spoken(entry["el"], EL)
        cards.append(word)
        chinese.extend([Speech.spoken(entry["zh"], ZH), 280, word, 600])
    chinese.append(Speech.spoken("今天的故事就讲到这里。晚安，做个好梦。", ZH))

    greek = []
    for paragraph in lesson["elStoryParagraphs"]:
        if greek:
            greek.append(650)
        greek.append(Speech.spoken(paragraph["el"], EL_STORY))
    return chinese, greek, cards, review_index


def ffmpeg(*args):
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", *args], check=True)


def render_speech(speech, cache):
    filters = TRIM + (",volume=1.15" if (speech.voice, speech.rate) == EL else "")
    key = json.dumps([speech.text, speech.voice, speech.rate, filters, RATE])
    pcm = cache / (hashlib.sha256(key.encode()).hexdigest() + ".pcm")
    if pcm.is_file() and pcm.stat().st_size:
        return pcm
    with tempfile.TemporaryDirectory(dir=cache) as tmp:
        mp3 = Path(tmp) / "voice.mp3"
        decoded = Path(tmp) / "voice.pcm"
        for attempt in range(6):
            try:
                subprocess.run(["edge-tts", "--voice", speech.voice, "--rate=" + speech.rate,
                                "--text", speech.text, "--write-media", mp3],
                               capture_output=True, check=True, timeout=90)
                ffmpeg("-i", mp3, "-af", filters, "-ar", str(RATE), "-ac", "1",
                       "-f", "s16le", decoded)
                if decoded.stat().st_size < RATE // 10:
                    raise ValueError("Speech is shorter than 50 ms")
                decoded.replace(pcm)
                return pcm
            except (subprocess.SubprocessError, ValueError) as exc:
                if attempt == 5:
                    raise RuntimeError(f"Could not synthesize {speech.voice}: {speech.text}") from exc
                time.sleep(2 ** attempt)


def encode(sequence, clips, destination, tmp):
    raw = tmp / "track.pcm"
    starts = []
    with raw.open("wb") as output:
        for part in sequence:
            if isinstance(part, int):
                output.write(bytes(RATE * part // 1000 * 2))
            else:
                starts.append(round(output.tell() / (RATE * 2), 5))
                with clips[part].open("rb") as audio:
                    shutil.copyfileobj(audio, output)
    ffmpeg("-f", "s16le", "-ar", str(RATE), "-ac", "1", "-i", raw,
           "-codec:a", "libmp3lame", "-b:a", "64k", destination)
    decoded = tmp / "verify.pcm"
    ffmpeg("-xerror", "-err_detect", "explode", "-i", destination, "-map", "0:a:0",
           "-f", "s16le", decoded)
    if not raw.stat().st_size or raw.stat().st_size != decoded.stat().st_size:
        raise ValueError(f"{destination.name}: incomplete MP3 audio")
    return starts


def update_index(path, values, removals=()):
    # Concurrent lesson publishers share the frontend indexes.
    path.parent.mkdir(parents=True, exist_ok=True)
    lock_id = hashlib.sha256(str(path.resolve()).encode()).hexdigest()
    with (Path(tempfile.gettempdir()) / f"leon-history-{lock_id}.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        previous = json.loads(path.read_text()) if path.exists() else {}
        updated_index = previous | values
        for key in removals:
            updated_index.pop(key, None)
        if previous == updated_index and path.exists():
            return
        with tempfile.NamedTemporaryFile("w", dir=path.parent, delete=False) as updated:
            json.dump(updated_index, updated, indent=2, sort_keys=True)
            updated.write("\n")
        Path(updated.name).replace(path)


def object_metadata(url):
    command = ["gcloud", "storage", "objects", "describe", url, "--raw", "--format=json"]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode:
        if re.search(r"HTTPError 404|not found: 404\b|\b404:|No URLs matched|matched no objects", result.stderr, re.I):
            return None
        raise RuntimeError(f"Could not read {url}: {result.stderr.strip()}")
    return json.loads(result.stdout)


def publish_asset(path, relative):
    content = path.read_bytes()
    md5 = base64.b64encode(hashlib.md5(content).digest()).decode()
    revision = hashlib.sha256(content).hexdigest()
    for name in (relative, f"revisions/{revision}/{relative}"):
        url = f"{BUCKET}/{name}"
        metadata = object_metadata(url)
        if metadata is None:
            # Only the first publisher can create a given name. Check the result
            # even after a failed copy: a concurrent publisher may have won.
            copied = subprocess.run(["gcloud", "storage", "cp", "--if-generation-match=0",
                                     "--content-type=audio/mpeg", f"--cache-control={CACHE_CONTROL}",
                                     str(path), url], capture_output=True, text=True)
            metadata = object_metadata(url)
            if metadata is None:
                raise RuntimeError(f"Upload missing at {url}: {copied.stderr.strip()}")
        if (metadata.get("md5Hash") == md5 and str(metadata.get("size")) == str(len(content))
                and metadata.get("contentType") == "audio/mpeg"
                and {v.strip() for v in metadata.get("cacheControl", "").split(",")} ==
                    {v.strip() for v in CACHE_CONTROL.split(",")}):
            return name
    raise RuntimeError(f"Content or metadata conflict at immutable revision {url}")


def prune_stale_cards(directory, count):
    if not directory.is_dir() or directory.is_symlink():
        return
    for path in directory.iterdir():
        match = re.fullmatch(r"word-([1-9]\d*)\.mp3", path.name)
        if match and int(match[1]) > count and path.is_file() and not path.is_symlink():
            path.unlink()


def render(lesson, cache, output_dir, jobs, timings_path, zh_only=False, revisions_path=None):
    if not re.fullmatch(r"[A-Za-z0-9_-]+", lesson["id"]):
        raise ValueError(f"Invalid lesson directory: {lesson['id']}")
    for key in ("audioZh", "audioEl"):
        name = lesson[key]
        if Path(name).name != name or not name.endswith(".mp3"):
            raise ValueError(f"Invalid {key} filename: {name}")
    if (output_dir / lesson["id"]).is_symlink():
        raise ValueError(f"Word audio directory is a symbolic link: {lesson['id']}")
    chinese, greek, cards, review_index = lesson_tracks(lesson)
    tracks = [("Zh", chinese)] if zh_only else [("Zh", chinese), ("El", greek)]
    phrases = list(dict.fromkeys(part for _, sequence in tracks for part in sequence if isinstance(part, Speech)))
    print(f'{lesson["id"]}: synthesizing {len(phrases)} unique phrases', flush=True)
    with ThreadPoolExecutor(jobs) as pool:
        clips = dict(zip(phrases, pool.map(lambda item: render_speech(item, cache), phrases)))
    with tempfile.TemporaryDirectory() as scratch:
        tmp = Path(scratch)
        staging = tmp / "publish"
        card_dir = staging / lesson["id"]
        card_dir.mkdir(parents=True)
        duration = {}
        for key, sequence in tracks:
            dest = staging / lesson["audio" + key]
            starts = encode(sequence, clips, dest, tmp)
            if key == "El":
                paragraph_starts = starts
            else:
                duration["reviewStartsSec"] = round(starts[review_index], 2)
            seconds = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries",
                                               "format=duration", "-of", "csv=p=0", dest])
            duration["duration" + key + "Sec"] = round(float(seconds))
        for index, word in enumerate(cards, 1):
            encode([word], clips, card_dir / f"word-{index}.mp3", tmp)
        assets = sorted(staging.rglob("*.mp3"))
        uploaded = {}
        if revisions_path is not None:
            def publish(path):
                relative = path.relative_to(staging).as_posix()
                return relative, publish_asset(path, relative)

            with ThreadPoolExecutor(min(4, jobs)) as pool:
                uploaded = dict(pool.map(publish, assets))
        for path in assets:
            target = output_dir / path.relative_to(staging)
            target.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(dir=target.parent, delete=False) as pending:
                try:
                    with path.open("rb") as source:
                        shutil.copyfileobj(source, pending)
                    pending.close()
                    Path(pending.name).replace(target)
                finally:
                    Path(pending.name).unlink(missing_ok=True)
        if revisions_path is not None:
            update_index(revisions_path,
                         {k: v for k, v in uploaded.items() if k != v},
                         [k for k, v in uploaded.items() if k == v])
        prune_stale_cards(output_dir / lesson["id"], len(cards))
        if not zh_only:
            update_index(timings_path, {lesson["id"]: paragraph_starts})
        print(lesson["id"], json.dumps(duration), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="Render one unit (default: all curriculum units)")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT,
                        help=f"Local verified MP3 output (default: {DEFAULT_OUTPUT})")
    parser.add_argument("--local-only", action="store_true", help="Keep verified MP3s locally without uploading")
    parser.add_argument("--revisions", type=Path, default=HISTORY / "audioRevisions.json",
                        help="Frontend immutable audio path index")
    parser.add_argument("--timings", type=Path, help="Paragraph times (default: timings.json beside input)")
    parser.add_argument("--lesson", action="append", help="Render only this lesson ID (repeatable)")
    parser.add_argument("--cache-dir", type=Path, help="Reuse decoded phrases across runs")
    parser.add_argument("--jobs", type=int, default=4, choices=range(1, 17))
    parser.add_argument("--validate-only", action="store_true", help="Validate all curriculum units without audio synthesis")
    parser.add_argument("--zh-only", action="store_true", help="Render only Chinese stories and their word cards")
    args = parser.parse_args()
    try:
        lessons = load_curriculum(args.input)
    except (ValueError, KeyError, OSError) as exc:
        parser.error(str(exc))
    if args.lesson:
        missing = set(args.lesson) - {lesson["id"] for lesson in lessons}
        if missing:
            parser.error(f"Unknown lesson IDs: {sorted(missing)}")
        lessons = [lesson for lesson in lessons if lesson["id"] in args.lesson]
    if args.validate_only:
        print(f"Curriculum validated; {len(lessons)} lesson(s) selected.")
        return
    with tempfile.TemporaryDirectory() as temporary:
        cache = args.cache_dir or Path(temporary)
        cache.mkdir(parents=True, exist_ok=True)
        for lesson in lessons:
            timings = args.timings or (args.input.parent if args.input else HISTORY) / "timings.json"
            render(lesson, cache, args.output_dir, args.jobs, timings, args.zh_only,
                   None if args.local_only else args.revisions)


if __name__ == "__main__":
    main()

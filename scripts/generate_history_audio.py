"""Render history lesson MP3s. Requires edge-tts, ffmpeg and ffprobe on PATH.

    python3 scripts/generate_history_audio.py --lesson g3_u1_l1
    python3 scripts/generate_history_audio.py --cache-dir /tmp/leon-history-voices
"""

import argparse
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


ROOT = Path(__file__).resolve().parents[1]
ZH = ("zh-CN-YunxiNeural", "-5%")
EL = ("el-GR-NestorasNeural", "-18%")
EL_STORY = ("el-GR-NestorasNeural", "-22%")
RATE = 24000
TAG = re.compile(r"\[\[el:([^\[\]]+)\]\]")
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
    return chinese, greek, cards


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
    return starts


def save_timings(path, lesson_id, starts):
    # Parallel per-lesson runs share a single timing index.
    path.parent.mkdir(parents=True, exist_ok=True)
    lock_id = hashlib.sha256(str(path.resolve()).encode()).hexdigest()
    with (Path(tempfile.gettempdir()) / f"leon-history-{lock_id}.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        timings = json.loads(path.read_text()) if path.exists() else {}
        timings[lesson_id] = starts
        with tempfile.NamedTemporaryFile("w", dir=path.parent, delete=False) as updated:
            json.dump(timings, updated, indent=2, sort_keys=True)
            updated.write("\n")
        Path(updated.name).replace(path)


def render(lesson, cache, output_dir, jobs, timings_path):
    chinese, greek, cards = lesson_tracks(lesson)
    phrases = list(dict.fromkeys(part for part in chinese + greek if isinstance(part, Speech)))
    print(f'{lesson["id"]}: synthesizing {len(phrases)} unique phrases', flush=True)
    with ThreadPoolExecutor(jobs) as pool:
        clips = dict(zip(phrases, pool.map(lambda item: render_speech(item, cache), phrases)))
    with tempfile.TemporaryDirectory() as scratch:
        tmp = Path(scratch)
        staging = tmp / "publish"
        card_dir = staging / lesson["id"]
        card_dir.mkdir(parents=True)
        duration = {}
        for key, sequence in [("Zh", chinese), ("El", greek)]:
            dest = staging / lesson["audio" + key]
            starts = encode(sequence, clips, dest, tmp)
            if key == "El":
                paragraph_starts = starts
            seconds = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries",
                                               "format=duration", "-of", "csv=p=0", dest])
            duration["duration" + key + "Sec"] = round(float(seconds))
        for index, word in enumerate(cards, 1):
            encode([word], clips, card_dir / f"word-{index}.mp3", tmp)
        for path in staging.rglob("*.mp3"):
            target = output_dir / path.relative_to(staging)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(path, target)
        save_timings(timings_path, lesson["id"], paragraph_starts)
        print(lesson["id"], json.dumps(duration), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=ROOT / "frontend/src/data/history/g3_unit1.json")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "frontend/public/audio/history")
    parser.add_argument("--timings", type=Path, help="Paragraph times (default: timings.json beside input)")
    parser.add_argument("--lesson", action="append", help="Render only this lesson ID (repeatable)")
    parser.add_argument("--cache-dir", type=Path, help="Reuse decoded phrases across runs")
    parser.add_argument("--jobs", type=int, default=4, choices=range(1, 17))
    args = parser.parse_args()
    lessons = json.loads(args.input.read_text())
    if args.lesson:
        missing = set(args.lesson) - {lesson["id"] for lesson in lessons}
        if missing:
            parser.error(f"Unknown lesson IDs: {sorted(missing)}")
        lessons = [lesson for lesson in lessons if lesson["id"] in args.lesson]
    with tempfile.TemporaryDirectory() as temporary:
        cache = args.cache_dir or Path(temporary)
        cache.mkdir(parents=True, exist_ok=True)
        for lesson in lessons:
            render(lesson, cache, args.output_dir, args.jobs, args.timings or args.input.with_name("timings.json"))


if __name__ == "__main__":
    main()

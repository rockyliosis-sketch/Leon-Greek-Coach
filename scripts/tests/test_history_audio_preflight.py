import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import generate_history_audio as audio


def lesson(unit, terms):
    lesson_id = f"g3_u{unit}_l1"
    return {
        "id": lesson_id, "grade": 3, "unitNumber": unit, "lessonNumber": 1,
        "zhStoryScript": ["希腊语叫" + "，还有".join(f"[[el:{term}]]" for term in terms) + "。"],
        "vocabReview": [{"el": term, "zh": "中文释义"} for term in terms],
        "elStoryParagraphs": [{"el": "Μια ιστορία."}],
        "audioZh": lesson_id + "_zh.mp3", "audioEl": lesson_id + "_el.mp3",
    }


class HistoryPreflight(unittest.TestCase):
    def test_title_and_stress_remain_distinct(self):
        audio.validate_curriculum([lesson(2, ["Ξένιος Ζευς", "Αθήνα"]), lesson(1, ["Δίας", "Αθηνά"])])

    def test_missing_extra_duplicate_and_malformed_markers(self):
        for body in ["宙斯。", "[[el:Δίας]]与[[el:Ήρα]]", "[[el:Δίας]]，[[el:Δίας]]",
                     "[el:Δίας]", "[[el:Δίας]", "[[el:δίας]]", "[[el:Δίας]]，Ήρα。", "[[el:Δίας汉字]]"]:
            with self.subTest(body=body):
                item = lesson(1, ["Δίας"])
                item["zhStoryScript"] = [body]
                with self.assertRaises(ValueError):
                    audio.validate_curriculum([item])

    def test_input_cannot_hide_earlier_unit(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            first = directory / "g3_unit1.json"
            last = directory / "g3_unit2.json"
            first.write_text(json.dumps([lesson(1, ["Δίας"])]))
            last.write_text(json.dumps([lesson(2, ["ο Ζευς"])]))
            with self.assertRaisesRegex(ValueError, "first introduced in g3_u1_l1"):
                audio.load_curriculum(last, directory)
            override = directory / "lesson.json"
            override.write_text(last.read_text())
            with self.assertRaisesRegex(ValueError, "first introduced in g3_u1_l1"):
                audio.load_curriculum(override, directory)
            with self.assertRaisesRegex(ValueError, "first introduced in g3_u1_l1"):
                audio.load_curriculum(first, directory)

    def test_chinese_only_preserves_greek_and_prunes_numbered_clips(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            item = lesson(1, ["Ήρα"])
            greek = directory / item["audioEl"]
            timings = directory / "timings.json"
            card_dir = directory / item["id"]
            card_dir.mkdir()
            for path in (greek, timings, card_dir / "word-2.mp3", card_dir / "personal.mp3"):
                path.write_bytes(b"original")
            (card_dir / "word-3.mp3").symlink_to(greek)
            raw = directory / "clip.pcm"
            raw.write_bytes(bytes(4800))
            with patch.object(audio, "render_speech", return_value=raw) as synth:
                audio.render(item, directory, directory, 1, timings, zh_only=True)
            self.assertNotIn(audio.EL_STORY, [(s.args[0].voice, s.args[0].rate) for s in synth.call_args_list])
            self.assertEqual(greek.read_bytes(), b"original")
            self.assertEqual(timings.read_bytes(), b"original")
            self.assertGreater((directory / item["audioZh"]).stat().st_size, 100)
            self.assertGreater((card_dir / "word-1.mp3").stat().st_size, 100)
            self.assertFalse((card_dir / "word-2.mp3").exists())
            self.assertTrue((card_dir / "word-3.mp3").is_symlink())
            self.assertEqual((card_dir / "personal.mp3").read_bytes(), b"original")


if __name__ == "__main__":
    unittest.main()

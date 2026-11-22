import base64
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import generate_history_audio as audio


class HistoryPublicationTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        self.path = self.directory / "word-1.mp3"
        self.path.write_bytes(b"verified audio fixture")
        self.relative = "g3_u1_l1/word-1.mp3"
        self.content = self.path.read_bytes()
        self.metadata = dict(size=str(len(self.content)), contentType="audio/mpeg",
                             md5Hash=base64.b64encode(hashlib.md5(self.content).digest()).decode(),
                             cacheControl=audio.CACHE_CONTROL)

    def test_first_upload_is_create_only_and_verified(self):
        with patch.object(audio, "object_metadata", side_effect=[None, self.metadata]), \
             patch.object(subprocess, "run") as command:
            self.assertEqual(audio.publish_asset(self.path, self.relative), self.relative)
        argv = command.call_args.args[0]
        self.assertIn("--if-generation-match=0", argv)
        self.assertIn("--content-type=audio/mpeg", argv)
        self.assertIn("--cache-control=" + audio.CACHE_CONTROL, argv)
        self.assertEqual(argv[-1], audio.BUCKET + "/" + self.relative)

    def test_retry_reuses_matching_revision_without_overwriting_original(self):
        expected = f"revisions/{hashlib.sha256(self.content).hexdigest()}/{self.relative}"
        old = self.metadata | {"md5Hash": "different"}
        with patch.object(audio, "object_metadata", side_effect=[old, self.metadata]), \
             patch.object(subprocess, "run") as command:
            self.assertEqual(audio.publish_asset(self.path, self.relative), expected)
        command.assert_not_called()

    def test_existing_revision_with_wrong_metadata_is_rejected(self):
        with patch.object(audio, "object_metadata", return_value=self.metadata | {"cacheControl": "private"}):
            with self.assertRaisesRegex(RuntimeError, "metadata conflict"):
                audio.publish_asset(self.path, self.relative)

    def test_missing_object_and_access_error_are_distinct(self):
        with patch.object(subprocess, "run", return_value=subprocess.CompletedProcess([], 1, "", "not found: 404.")):
            self.assertIsNone(audio.object_metadata("gs://example/o"))
        with patch.object(subprocess, "run", return_value=subprocess.CompletedProcess([], 1, "", "forbidden: 403")):
            with self.assertRaisesRegex(RuntimeError, "403"):
                audio.object_metadata("gs://example/o")

    def test_real_encoder_decodes_all_samples(self):
        phrase = audio.Speech("test", "test", "test")
        pcm = self.directory / "voice.pcm"
        pcm.write_bytes(b"\x04\x00" * 24000)
        audio.encode([phrase, 650, phrase], {phrase: pcm}, self.path, self.directory)
        self.assertEqual((self.directory / "verify.pcm").stat().st_size, int(2.65 * 48000))

    def test_partial_upload_leaves_indexes_and_previous_local_files_intact(self):
        story = {"id": "lesson", "audioZh": "zh.mp3", "audioEl": "el.mp3",
                 "zhStoryScript": ["故事[[el:λέξη]]。"], "elStoryParagraphs": [{"el": "λέξη"}],
                 "vocabReview": [{"zh": "词", "el": "λέξη"}]}
        pcm = self.directory / "voice.pcm"
        pcm.write_bytes(b"\x04\x00" * 2400)
        revisions = self.directory / "index.json"
        revisions.write_text('{"zh.mp3":"previous.mp3"}')
        timings = self.directory / "timings.json"
        old_track = self.directory / "zh.mp3"
        old_track.write_bytes(b"previous")
        def upload(_path, relative):
            if relative == "lesson/word-1.mp3":
                raise RuntimeError("upload interrupted")
            return "revisions/new/" + relative

        with patch.object(audio, "render_speech", return_value=pcm), \
             patch.object(audio, "publish_asset", side_effect=upload), \
             self.assertRaisesRegex(RuntimeError, "interrupted"):
            audio.render(story, self.directory, self.directory, 1, timings,
                         revisions_path=revisions)
        self.assertEqual(json.loads(revisions.read_text()), {"zh.mp3": "previous.mp3"})
        self.assertEqual(old_track.read_bytes(), b"previous")
        self.assertFalse(timings.exists())


if __name__ == "__main__":
    unittest.main()

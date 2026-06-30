import subprocess
import json

try:
    result = subprocess.run(
        ["git", "show", "HEAD~1:frontend/src/data/vocabulary.json"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True
    )
    data = json.loads(result.stdout.decode('utf-8'))
    vocab = data.get("textbook_vocabulary", [])
    print(f"Total vocabulary records in HEAD~1: {len(vocab)}")
except Exception as e:
    print(f"Error reading previous git commit: {e}")

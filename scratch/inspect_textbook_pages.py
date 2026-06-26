import re
import os

files = [
    "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/（已压缩）LEON_S GREEK TEXTBOOK A1-A.md",
    "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/（已压缩）LEON_S GREEK TEXTBOOK A1-B.md",
    "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/（已压缩）LEON_S GREEK TEXTBOOK A2.md"
]

for f in files:
    if not os.path.exists(f):
        print(f"Not found: {f}")
        continue
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    
    pages = re.findall(r'^## Page (\d+)', content, re.MULTILINE)
    pages = [int(p) for p in pages]
    if pages:
        print(f"{os.path.basename(f)}: Page range {min(pages)} to {max(pages)}, Total pages: {len(pages)}")
    else:
        print(f"{os.path.basename(f)}: No ## Page X headers found.")

import re
import os

files = [
    "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/（已压缩）LEON_S GREEK TEXTBOOK A1-A.md",
    "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/（已压缩）LEON_S GREEK TEXTBOOK A1-B.md",
    "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/（已压缩）LEON_S GREEK TEXTBOOK A2.md"
]

for filepath in files:
    if not os.path.exists(filepath):
        print(f"Not found: {filepath}")
        continue
    print(f"\nScanning placeholders in {os.path.basename(filepath)}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    for i, line in enumerate(lines):
        line_strip = line.strip()
        # Look for things like "翻译：--", "-> --", "翻译：[", or empty translations
        if re.search(r'[-–=]\s*--\b', line_strip) or re.search(r'翻译\s*：\s*--\b', line_strip) or "待补充" in line_strip or "TODO" in line_strip:
            print(f"  Line {i+1}: {line_strip}")

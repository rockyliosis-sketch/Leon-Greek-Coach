import re
import os

files = [
    "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/（已压缩）LEON_S GREEK TEXTBOOK A1-A.md",
    "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/（已压缩）LEON_S GREEK TEXTBOOK A1-B.md",
    "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/（已压缩）LEON_S GREEK TEXTBOOK A2.md"
]

greek_chars = set("αβγδεζηθικλμνξοπρστυφχψωάέήίόύώϊϋΐΰ")
english_chars = set("abcdefghijklmnopqrstuvwxyz")

def analyze_file(filepath):
    print(f"\nAnalyzing: {os.path.basename(filepath)}")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Look for mixed alphabets in single words (e.g. "aγορά" where a is English 'a')
    words = re.findall(r'[a-zA-Zα-ωΑ-Ωά-ώΆ-Ώϊϋΐΰ]+', content)
    mixed_words = []
    for w in words:
        w_lower = w.lower()
        has_greek = any(c in w_lower for c in greek_chars)
        has_english = any(c in w_lower for c in english_chars)
        if has_greek and has_english:
            mixed_words.append(w)
            
    print(f"Total words found: {len(words)}")
    print(f"Words with mixed Greek/English characters: {len(mixed_words)}")
    if mixed_words:
        print("Sample mixed words:", set(mixed_words[:20]))
        
    # 2. Look for sections/headers
    headers = re.findall(r'^#+ .*$', content, re.MULTILINE)
    print(f"Total headers: {len(headers)}")
    page_headers = [h for h in headers if "Page" in h or "页" in h]
    print(f"Page headers (e.g. '## Page X'): {len(page_headers)}")
    
    # 3. Print out some sample Greek vocabulary items or sentences to manually verify grammar and translation
    greek_chinese_pairs = []
    # Search for bullet points with Greek and Chinese translations
    # Matches patterns like "* **word** - translation" or "* **word** (pronunciation) - translation"
    matches = re.findall(r'\*\s+\*\*([^*]+)\*\*\s*(?:\([^)]+\))?\s*[-–=]\s*(.+)', content)
    print(f"Found vocabulary-like matches: {len(matches)}")
    if matches:
        print("Sample translations (first 5 and last 5):")
        for m in matches[:5]:
            print(f"  {m[0].strip()} -> {m[1].strip()}")
        print("  ...")
        for m in matches[-5:]:
            print(f"  {m[0].strip()} -> {m[1].strip()}")

for f in files:
    if os.path.exists(f):
        analyze_file(f)
    else:
        print(f"File not found: {f}")

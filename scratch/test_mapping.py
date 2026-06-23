import os
import re
import json
import fitz

PROJECT_DIR = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach"
A1_A_PATH = os.path.join(PROJECT_DIR, "materials", "（已压缩）LEON_S_GREEK_TEXTBOOK_A1-A.md")
A1_B_PATH = os.path.join(PROJECT_DIR, "materials", "（已压缩）LEON_S_GREEK_TEXTBOOK_A1-B.md")
A2_PATH = os.path.join(PROJECT_DIR, "materials", "（已压缩）LEON_S_GREEK_TEXTBOOK_A2.md")
A1_GLOSSARY_PATH = os.path.join(PROJECT_DIR, "materials", "Glossary_A1_kids.pdf")
A2_GLOSSARY_PATH = os.path.join(PROJECT_DIR, "materials", "KLIK_A2_Ef_Glossary.md")

a1_a_ranges = {
    0: (10, 57), 1: (58, 65), 2: (66, 77), 3: (78, 79), 4: (80, 87),
    5: (88, 103), 6: (104, 111), 7: (112, 119), 8: (120, 127), 9: (128, 133),
    10: (134, 147), 11: (148, 155), 12: (156, 163), 13: (164, 171), 14: (172, 177), 15: (178, 191)
}

a1_b_ranges = {
    16: (6, 17), 17: (18, 29), 18: (30, 41), 19: (42, 53), 20: (54, 65),
    21: (66, 77), 22: (78, 89), 23: (90, 101), 24: (102, 113), 25: (114, 125),
    26: (126, 137), 27: (138, 149), 28: (150, 161), 29: (162, 168), 30: (169, 175)
}

a2_ranges = {
    31: (4, 39), 32: (40, 63), 33: (64, 83), 34: (84, 87), 35: (88, 101),
    36: (102, 119), 37: (120, 137), 38: (138, 141), 39: (142, 148)
}

def get_unit_for_page(book_id, page):
    if book_id == "a1-a":
        for u, (start, end) in a1_a_ranges.items():
            if start <= page <= end:
                return 1 if u == 0 else u
    elif book_id == "a1-b":
        for u, (start, end) in a1_b_ranges.items():
            if start <= page <= end:
                return u
    elif book_id == "a2":
        for u, (start, end) in a2_ranges.items():
            if start <= page <= end:
                return u
    return None

def normalize_greek(text):
    text = text.lower()
    replacements = {
        'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω',
        'ϊ': 'ι', 'ϋ': 'υ', 'ΐ': 'ι', 'ΰ': 'υ',
        'ὰ': 'α', 'ὲ': 'ε', 'ὴ': 'η', 'ὶ': 'ι', 'ὸ': 'ο', 'ὺ': 'υ', 'ώ': 'ω',
        'ἀ': 'α', 'ἐ': 'ε', 'ἠ': 'η', 'ἰ': 'ι', 'ὀ': 'ο', 'ὐ': 'υ', 'ὠ': 'ω',
        'ᾶ': 'α', 'ῆ': 'η', 'ῖ': 'ι', 'υ': 'υ', 'ῶ': 'ω'
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    cleaned = ""
    for char in text:
        if char.isalpha() or char.isspace():
            cleaned += char
    return cleaned.strip()

def get_clean_greek_base(greek_raw):
    clean = re.sub(r'\(.*?\)', '', greek_raw).strip()
    clean_base = clean.split(",")[0].strip()
    return clean_base

def get_possible_stems(word):
    word = normalize_greek(word)
    if len(word) <= 3:
        return [word]
    stems = {word}
    
    verb_endings = ["ομαι", "εσαι", "εται", "ομαστε", "εστε", "ονται", "αω", "εω", "ω", "ει"]
    for ending in verb_endings:
        if word.endswith(ending):
            root = word[:-len(ending)]
            if len(root) >= 3:
                stems.add(root)
            break
            
    noun_endings = ["ος", "η", "o", "α", "ης", "ας", "ες", "ου", "ων", "οι", "ατα", "μα"]
    for ending in noun_endings:
        if word.endswith(ending):
            root = word[:-len(ending)]
            if len(root) >= 3:
                stems.add(root)
            break
            
    variants = []
    for s in list(stems):
        if "βγ" in s:
            variants.append(s.replace("βγ", "υγ"))
        if "υγ" in s:
            variants.append(s.replace("υγ", "βγ"))
        if "δελφ" in s:
            variants.append(s.replace("δελφ", "δερφ"))
        if "δερφ" in s:
            variants.append(s.replace("δερφ", "δελφ"))
        if "αυτ" in s:
            variants.append(s.replace("αυτ", "αφτ"))
        if "αφτ" in s:
            variants.append(s.replace("αφτ", "αυτ"))
    stems.update(variants)
    
    return sorted(list(stems), key=len, reverse=True)

def parse_textbook_tokens(path):
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    sections = re.split(r'(## Book Page [^\n]+)', content)
    pages = {}
    for i in range(1, len(sections), 2):
        header = sections[i]
        text = sections[i+1] if i+1 < len(sections) else ""
        page_match = re.search(r'## Book Page (\d+)(?:-(\d+))?', header)
        if page_match:
            start_p = int(page_match.group(1))
            end_p = int(page_match.group(2)) if page_match.group(2) else start_p
            normalized_text = normalize_greek(text)
            tokens = set(normalized_text.split())
            for p in range(start_p, end_p + 1):
                if p not in pages:
                    pages[p] = set()
                pages[p].update(tokens)
    return pages

def parse_a1_glossary_pdf():
    doc = fitz.open(A1_GLOSSARY_PATH)
    pattern = re.compile(r"^([^,=\n]+)(?:,\s*([^=\n]+))?\s*=\s*(.+)$")
    vocab = []
    for page in doc:
        text = page.get_text()
        for line in text.split("\n"):
            line = line.strip()
            if not line or "=" not in line:
                continue
            match = pattern.match(line)
            if match:
                greek = match.group(1).strip()
                article = match.group(2).strip() if match.group(2) else ""
                english = match.group(3).strip()
                vocab.append({
                    "greek_raw": greek,
                    "article": article,
                    "word_greek": greek + (f", {article}" if article else ""),
                    "word_english": english
                })
    return vocab

def parse_a2_glossary_md():
    vocab = []
    with open(A2_GLOSSARY_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()
    pattern = re.compile(r"^\*\s+\*\*([^*]+)\*\*\s*=\s*(.+)$")
    for line in lines:
        line = line.strip()
        match = pattern.match(line)
        if match:
            greek_raw = match.group(1).strip()
            english = match.group(2).strip()
            greek_clean = get_clean_greek_base(greek_raw)
            article = ""
            parts = greek_raw.split(",")
            if len(parts) > 1:
                article = parts[1].strip()
            vocab.append({
                "greek_raw": greek_clean,
                "article": article,
                "word_greek": greek_raw,
                "word_english": english
            })
    return vocab

def is_stem_match(tok, stem):
    if not tok.startswith(stem):
        return False
    stem_len = len(stem)
    tok_len = len(tok)
    if stem_len <= 3:
        return tok_len <= stem_len + 1
    elif stem_len <= 5:
        return tok_len <= stem_len + 2
    else:
        return tok_len <= stem_len + 3

def run_test():
    a1_glossary = parse_a1_glossary_pdf()
    a1_clean = [w for w in a1_glossary if len(normalize_greek(get_clean_greek_base(w["word_greek"]))) > 1]
    a1_glossary_norm_set = set(normalize_greek(get_clean_greek_base(w["word_greek"])) for w in a1_clean)
    
    a1_a_pages = parse_textbook_tokens(A1_A_PATH)
    a1_b_pages = parse_textbook_tokens(A1_B_PATH)
    
    a1_mapped = []
    for item in a1_clean:
        greek_base = get_clean_greek_base(item["greek_raw"])
        stems = get_possible_stems(greek_base)
        mapped_to = None
        
        # Search page by page, EXCLUDING alphabet pages (10-57)
        for book_id, book_pages in [("a1-a", a1_a_pages), ("a1-b", a1_b_pages)]:
            for p in sorted(book_pages.keys()):
                if book_id == "a1-a" and 10 <= p <= 57:
                    continue
                tokens = book_pages[p]
                matched = False
                for stem in stems:
                    for tok in tokens:
                        if is_stem_match(tok, stem):
                            matched = True
                            break
                    if matched: break
                
                if matched:
                    mapped_to = (book_id, get_unit_for_page(book_id, p), p)
                    break
            if mapped_to: break
            
        if mapped_to:
            a1_mapped.append({
                "word": item["word_greek"],
                "book_id": mapped_to[0],
                "unit": mapped_to[1]
            })
            
    # Map A2 words
    a2_glossary = parse_a2_glossary_md()
    a2_filtered = []
    
    for item in a2_glossary:
        greek_base = get_clean_greek_base(item["word_greek"])
        norm_base = normalize_greek(greek_base)
        if len(norm_base) <= 1:
            continue
        if norm_base not in a1_glossary_norm_set:
            a2_filtered.append(item)
            
    a2_pages = parse_textbook_tokens(A2_PATH)
    a2_mapped = []
    
    for item in a2_filtered:
        greek_base = get_clean_greek_base(item["word_greek"])
        stems = get_possible_stems(greek_base)
        mapped_to = None
        for p in sorted(a2_pages.keys()):
            tokens = a2_pages[p]
            matched = False
            for stem in stems:
                for tok in tokens:
                    if is_stem_match(tok, stem):
                        matched = True
                        break
                if matched: break
            if matched:
                mapped_to = ("a2", get_unit_for_page("a2", p), p)
                break
        if mapped_to:
            a2_mapped.append({
                "word": item["word_greek"],
                "book_id": mapped_to[0],
                "unit": mapped_to[1]
            })
            
    # Combine and count
    counts = {}
    for entry in a1_mapped:
        k = f"{entry['book_id'].upper()} Unit {entry['unit']}"
        counts[k] = counts.get(k, 0) + 1
    for entry in a2_mapped:
        k = f"{entry['book_id'].upper()} Unit {entry['unit']}"
        counts[k] = counts.get(k, 0) + 1
        
    print(f"\n--- WITH STRICT MATCH AND STRICT FILTER ---")
    for k in sorted(counts.keys()):
        print(f"  {k}: {counts[k]}")

run_test()

import os
import re
import json
import sqlite3
import urllib.parse
import urllib.request
from datetime import datetime

PROJECT_DIR = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach"
A1_A_PATH = os.path.join(PROJECT_DIR, "materials", "（已压缩）LEON_S_GREEK_TEXTBOOK_A1-A.md")
A1_B_PATH = os.path.join(PROJECT_DIR, "materials", "（已压缩）LEON_S_GREEK_TEXTBOOK_A1-B.md")
A2_PATH = os.path.join(PROJECT_DIR, "materials", "（已压缩）LEON_S_GREEK_TEXTBOOK_A2.md")
NOTES_PATH = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/希腊语学习笔记/希腊语学习笔记.md"

VOCAB_JSON_PATH = os.path.join(PROJECT_DIR, "frontend", "src", "data", "vocabulary.json")
DB_PATH = os.path.join(PROJECT_DIR, "backend", "greek_coach.db")
TRANSLATION_CACHE_PATH = os.path.join(PROJECT_DIR, "backend", "translation_cache.json")

START_DATE = datetime(2025, 9, 6)

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

def get_unit_from_date(date_str):
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
        diff = (d - START_DATE).days
        if diff < 0: return 1, "a1-a"
        if diff < 210:
            u = (diff // 7) + 1
            return u, "a1-a" if u <= 15 else "a1-b"
        u = 31 + ((diff - 210) // 14)
        return min(39, u), "a2"
    except:
        return 1, "a1-a"

def get_default_page_for_unit(book_id, unit):
    if book_id == "a1-a":
        u_key = 0 if unit == 1 else unit
        if u_key in a1_a_ranges:
            return a1_a_ranges[u_key][0]
    elif book_id == "a1-b":
        if unit in a1_b_ranges:
            return a1_b_ranges[unit][0]
    elif book_id == "a2":
        if unit in a2_ranges:
            return a2_ranges[unit][0]
    return 1

def normalize_greek(text):
    text = text.lower()
    replacements = {
        'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω',
        'ϊ': 'ι', 'ϋ': 'υ', 'ΐ': 'ι', 'ΰ': 'υ',
        'ὰ': 'α', 'ὲ': 'ε', 'ὴ': 'η', 'ὶ': 'ι', 'ὸ': 'ο', 'ὺ': 'υ', 'ώ': 'ω',
        'ἀ': 'α', 'ἐ': 'ε', 'ἠ': 'η', 'ἰ': 'ι', 'ὀ': 'ο', 'ὐ': 'υ', 'ὠ': 'ω',
        'ᾶ': 'α', 'ῆ': 'η', 'ῖ': 'ι', 'ῦ': 'υ', 'ῶ': 'ω'
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

def transliterate_greek(text):
    text = text.lower()
    accents = {
        'ά': 'a', 'έ': 'e', 'ή': 'i', 'ί': 'i', 'ό': 'o', 'ύ': 'i', 'ώ': 'o',
        'α': 'a', 'β': 'v', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'i',
        'θ': 'th', 'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x',
        'ο': 'o', 'π': 'p', 'ρ': 'r', 'σ': 's', 'ς': 's', 'τ': 't', 'υ': 'i',
        'φ': 'f', 'χ': 'ch', 'ψ': 'ps', 'ω': 'o', 'ϊ': 'i', 'ϋ': 'i',
        'ΰ': 'i', 'ΐ': 'i'
    }
    digraphs = {
        'αι': 'e', 'ει': 'i', 'οι': 'i', 'ου': 'ou', 'υι': 'i',
        'μπ': 'b', 'ντ': 'd', 'γκ': 'g', 'γγ': 'ng',
        'αυ': 'av', 'ευ': 'ev'
    }
    cleaned = ""
    for char in text:
        if char.isalpha() or char.isspace() or char == '-':
            cleaned += char
        elif char == ',':
            break
            
    words = cleaned.split()
    pron_words = []
    
    for word in words:
        if not word: continue
        p_word = word
        for k, v in digraphs.items():
            p_word = p_word.replace(k, v)
        result = []
        for char in p_word:
            result.append(accents.get(char, char))
        pron_words.append("".join(result))
        
    return "-".join(pron_words)

translation_cache = {}
def load_translation_cache():
    global translation_cache
    if os.path.exists(TRANSLATION_CACHE_PATH):
        try:
            with open(TRANSLATION_CACHE_PATH, "r", encoding="utf-8") as f:
                translation_cache = json.load(f)
        except Exception as e:
            print("Error loading translation cache:", e)

def save_translation_cache():
    with open(TRANSLATION_CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(translation_cache, f, ensure_ascii=False, indent=2)

def translate_to_chinese(english_text):
    if not english_text:
        return ""
    english_text = english_text.strip()
    if english_text in translation_cache:
        return translation_cache[english_text]
        
    clean_text = re.sub(r'\[.*?\]', '', english_text).strip()
    clean_text = re.sub(r'\(.*?\)', '', clean_text).strip()
    
    try:
        url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=" + urllib.parse.quote(clean_text)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            res = response.read().decode('utf-8')
            data = json.loads(res)
            translation = data[0][0][0]
            translation_cache[english_text] = translation
            return translation
    except Exception as e:
        return english_text

# Direct extraction helper
def clean_brackets(text):
    return re.sub(r'\s*[\(（].*?[\)）]', '', text).strip()

def has_greek_chars(text):
    return bool(re.search(r'[\u0370-\u03FF\u1F00-\u1FFF]', text))

def has_chinese_chars(text):
    return bool(re.search(r'[\u4e00-\u9fa5]', text))

def parse_textbook_vocab(filepath, book_id):
    extracted = []
    if not os.path.exists(filepath):
        print(f"Textbook file not found: {filepath}")
        return extracted
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    sections = re.split(r'(## Book Page \d+)', content)
    for i in range(1, len(sections), 2):
        header = sections[i]
        body = sections[i+1] if i+1 < len(sections) else ""
        
        # Get page range
        page_match = re.search(r'## Book Page (\d+)(?:-(\d+))?', header)
        if not page_match:
            continue
        start_p = int(page_match.group(1))
        
        unit = get_unit_for_page(book_id, start_p)
        if not unit:
            continue
            
        # Parse Bullet points
        bullet_pattern = re.compile(r'^\*\s+\*\*([^*]+)\*\*\s*(?:\([^)]+\))?\s*[-–=:：]\s*(.+)$', re.MULTILINE)
        bullets = bullet_pattern.findall(body)
        for g, t in bullets:
            g = g.strip()
            t = t.strip()
            # Clean and filter
            if has_greek_chars(g) and not "|" in g and not "**" in g:
                # If translation has Chinese, keep it, otherwise translate if English
                chinese = t if has_chinese_chars(t) else translate_to_chinese(t)
                # Filter grammatical notes or empty strings
                if len(g) > 1 and chinese and not "中性名词" in t and not "阴性名词" in t and not "阳性名词" in t:
                    extracted.append({
                        "word_greek": g,
                        "word_chinese": clean_brackets(chinese),
                        "unit": unit,
                        "book_id": book_id,
                        "page_number": start_p,
                        "source": f"{book_id.upper()} Page {start_p}"
                    })
                    
        # Parse Tables
        table_pattern = re.compile(r'^\|\s+\*\*([^*]+)\*\*\s*\|\s*([^|]+)\|\s*([^|]+)\|', re.MULTILINE)
        table_rows = table_pattern.findall(body)
        for g, p, t in table_rows:
            g = g.strip()
            t = t.strip()
            if has_greek_chars(g) and not "|" in g:
                chinese = t if has_chinese_chars(t) else translate_to_chinese(t)
                if len(g) > 1 and chinese and not "中性名词" in t and not "阴性名词" in t and not "阳性名词" in t:
                    extracted.append({
                        "word_greek": g,
                        "word_chinese": clean_brackets(chinese),
                        "unit": unit,
                        "book_id": book_id,
                        "page_number": start_p,
                        "source": f"{book_id.upper()} Table Page {start_p}"
                    })
                    
    print(f"Extracted {len(extracted)} words from {book_id.upper()} textbook.")
    return extracted

def parse_notes_vocab():
    extracted = []
    if not os.path.exists(NOTES_PATH):
        print(f"Notes file not found: {NOTES_PATH}")
        return extracted
        
    with open(NOTES_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
        
    sections = re.split(r'(## Book Page \d+)', content)
    current_date = "2025-09-07"
    
    for i in range(1, len(sections), 2):
        header = sections[i]
        body = sections[i+1] if i+1 < len(sections) else ""
        
        # Get page
        page_num_match = re.search(r'## Book Page (\d+)', header)
        notebook_page = int(page_num_match.group(1)) if page_num_match else 1
        
        # Get date
        date_match = re.search(r'Date:\s*([\d-]+)', body)
        if date_match:
            current_date = date_match.group(1).strip()
            
        unit, book_id = get_unit_from_date(current_date)
        default_book_page = get_default_page_for_unit(book_id, unit)
        
        lines = body.split('\n')
        for line in lines:
            line = line.strip()
            if not line or line.startswith("Date:") or line.startswith("——") or line.startswith("##"):
                continue
                
            # format: greek - translation
            if " - " in line and not "|" in line:
                parts = line.split(" - ")
                g = parts[0].replace("**", "").replace("*", "").strip()
                t = " - ".join(parts[1:]).replace("**", "").replace("*", "").strip()
                
                if has_greek_chars(g) and has_chinese_chars(t) and len(g) > 1:
                    extracted.append({
                        "word_greek": g,
                        "word_chinese": clean_brackets(t),
                        "unit": unit,
                        "book_id": book_id,
                        "page_number": default_book_page,
                        "source": f"Notes Page {notebook_page}",
                        "note_date": current_date
                    })
                    
    print(f"Extracted {len(extracted)} words from Study Notes.")
    return extracted

def main():
    load_translation_cache()
    print("Directly extracting vocabulary from files...")
    
    # 1. Extract from all sources
    all_raw_words = []
    all_raw_words += parse_textbook_vocab(A1_A_PATH, "a1-a")
    all_raw_words += parse_textbook_vocab(A1_B_PATH, "a1-b")
    all_raw_words += parse_textbook_vocab(A2_PATH, "a2")
    all_raw_words += parse_notes_vocab()
    
    # 2. Merge and deduplicate
    # Rules:
    # - If a word appears in multiple places, keep the one with the smallest Unit
    # - Prefer textbook source for page numbers if available
    # - Retain note_date if it was present in any of the duplicate entries
    vocab_map = {} # normalized -> dict
    
    for entry in all_raw_words:
        greek = entry["word_greek"]
        clean_base = get_clean_greek_base(greek)
        norm = normalize_greek(clean_base)
        
        if not norm:
            continue
            
        note_date = entry.get("note_date")
            
        if norm in vocab_map:
            existing = vocab_map[norm]
            # Propagate note_date if existing doesn't have it
            if note_date and not existing.get("note_date"):
                existing["note_date"] = note_date
            
            # Keep the smaller unit
            if entry["unit"] < existing["unit"]:
                prev_note_date = existing.get("note_date") or note_date
                vocab_map[norm] = entry
                if prev_note_date:
                    vocab_map[norm]["note_date"] = prev_note_date
            # If unit is same, prefer textbook source over Notes
            elif entry["unit"] == existing["unit"] and "Notes" in existing["source"] and "Page" in entry["source"]:
                prev_note_date = existing.get("note_date") or note_date
                vocab_map[norm] = entry
                if prev_note_date:
                    vocab_map[norm]["note_date"] = prev_note_date
        else:
            vocab_map[norm] = entry
            
    # 3. Format and construct final entries
    all_compiled = []
    next_id = 1
    
    sorted_norm_keys = sorted(vocab_map.keys())
    for norm in sorted_norm_keys:
        entry = vocab_map[norm]
        greek = entry["word_greek"]
        clean_base = get_clean_greek_base(greek)
        chinese = entry["word_chinese"]
        
        pronunciation = transliterate_greek(clean_base)
        
        # Example sentences
        example_greek = f"Αυτό είναι {clean_base}."
        example_chinese = f"这是 {chinese}。"
        if "to " in entry.get("word_english", "").lower() or entry["word_chinese"].endswith("跑") or entry["word_chinese"].endswith("玩") or entry["word_chinese"].endswith("吃") or entry["word_chinese"].endswith("写"):
            # Simple verb heuristic
            example_greek = f"Θέλω να {clean_base}."
            example_chinese = f"我想 {chinese}。"
            
        compiled_entry = {
            "id": next_id,
            "book_id": entry["book_id"],
            "unit": entry["unit"],
            "page_number": entry["page_number"],
            "word_greek": greek,
            "word_chinese": chinese,
            "pronunciation": pronunciation,
            "example_greek": example_greek,
            "example_chinese": example_chinese
        }
        if "note_date" in entry:
            compiled_entry["note_date"] = entry["note_date"]
            
        all_compiled.append(compiled_entry)
        next_id += 1
        
    save_translation_cache()
    
    # 4. Write to vocabulary.json
    print("Writing vocabulary.json...")
    with open(VOCAB_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "master_glossary": [],
            "textbook_vocabulary": all_compiled
        }, f, ensure_ascii=False, indent=2)
    print(f"Successfully wrote {len(all_compiled)} words to {VOCAB_JSON_PATH}")
    
    # 5. Seed SQLite DB
    print("Seeding SQLite database...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Run safe migration to add note_date column if missing
    try:
        cursor.execute("ALTER TABLE vocabulary ADD COLUMN note_date TEXT")
    except sqlite3.OperationalError:
        pass # Column already exists
        
    cursor.execute("DELETE FROM vocabulary")
    for w in all_compiled:
        cursor.execute("""
            INSERT INTO vocabulary (id, book_id, unit, page_number, word_greek, word_chinese, pronunciation, example_greek, example_chinese, note_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            w["id"], w["book_id"], w["unit"], w["page_number"], 
            w["word_greek"], w["word_chinese"], w["pronunciation"], 
            w["example_greek"], w["example_chinese"], w.get("note_date")
        ))
    conn.commit()
    conn.close()
    print("Successfully seeded SQLite database.")
    
    # 6. Print counts per unit
    counts = {}
    for w in all_compiled:
        k = f"{w['book_id'].upper()} Unit {w['unit']}"
        counts[k] = counts.get(k, 0) + 1
    print("\nWord counts per unit:")
    for k in sorted(counts.keys()):
        print(f"  {k}: {counts[k]} words")

if __name__ == "__main__":
    main()

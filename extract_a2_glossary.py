import os
import re
import json
import sqlite3
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
GLOSSARY_PDF_PATH = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/KLIK_A2_Ef_Glossary.pdf"
OUTPUT_DIR = os.path.join(PROJECT_DIR, "frontend", "src", "data")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "vocabulary.json")
VOCAB_JSON_PATH = OUTPUT_PATH
DB_PATH = os.path.join(PROJECT_DIR, "backend", "greek_coach.db")
TRANSLATION_CACHE_PATH = os.path.join(PROJECT_DIR, "backend", "translation_cache.json")

# Clean A2 units page ranges mapping (clamped to max page in units)
a2_ranges = {
    31: (4, 13), 32: (14, 23), 33: (24, 33), 34: (34, 43), 35: (44, 53),
    36: (54, 63), 37: (64, 73), 38: (74, 83), 39: (84, 93), 40: (94, 103),
    41: (104, 113), 42: (114, 123), 43: (124, 133), 44: (134, 141), 45: (142, 148)
}

# Greek-to-English phonetic transliterater
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
            break  # Skip articles like ", o" for pronunciation
            
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

# Translation cache loading
translation_cache = {}
if os.path.exists(TRANSLATION_CACHE_PATH):
    try:
        with open(TRANSLATION_CACHE_PATH, "r", encoding="utf-8") as f:
            translation_cache = json.load(f)
    except:
        pass

def save_cache():
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
            return translation
    except Exception as e:
        return english_text # Fallback to English

def translate_batch(english_list):
    results = {}
    total = len(english_list)
    print(f"Translating {total} terms to Chinese in parallel...")
    
    completed = 0
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(translate_to_chinese, eng): eng for eng in english_list}
        for future in as_completed(futures):
            eng = futures[future]
            try:
                ch = future.result()
                results[eng] = ch
            except:
                results[eng] = eng
            completed += 1
            if completed % 100 == 0 or completed == total:
                print(f"Translation progress: {completed}/{total} done.")
    return results

def main():
    import fitz
    if not os.path.exists(GLOSSARY_PDF_PATH):
        print(f"A2 Glossary PDF not found at {GLOSSARY_PDF_PATH}")
        return

    print("Parsing A2 Glossary PDF...")
    doc = fitz.open(GLOSSARY_PDF_PATH)
    
    # Matching pattern: e.g. "αβγό, το = egg"
    pattern = re.compile(r"^([^,=\n]+)(?:,\s*([^=\n]+))?\s*=\s*(.+)$")
    
    raw_words = []
    for page_idx, page in enumerate(doc):
        if page_idx < 4:  # Skip title/intro
            continue
        text = page.get_text()
        lines = text.split("\n")
        for line in lines:
            line = line.strip()
            if not line or "=" not in line:
                continue
            
            # Skip alphabet letter lists
            if any(f" = {l}" in line for l in ['άλφα', 'βήτα', 'γάμα', 'δέλτα', 'έψιλον', 'ζήτα', 'ήτα', 'θήτα', 'γιώτα', 'κάπα', 'λάμδα', 'μι', 'νι', 'ξι', 'όμικρον', 'πι', 'ρω', 'σίγμα', 'ταυ', 'ύψιλον', 'φι', 'χι', 'ψι', 'ωμέγα']):
                continue
                
            match = pattern.match(line)
            if match:
                greek = match.group(1).strip()
                if len(greek) <= 1:
                    continue # skip single letters
                article = match.group(2).strip() if match.group(2) else ""
                english = match.group(3).strip()
                
                raw_words.append({
                    "greek_raw": greek,
                    "article": article,
                    "word_greek": greek + (f", {article}" if article else ""),
                    "word_english": english
                })

    print(f"Extracted {len(raw_words)} words from PDF. Deduplicating...")
    
    # Deduplicate by Greek word
    seen = set()
    deduped_words = []
    for w in raw_words:
        if w["word_greek"] not in seen:
            seen.add(w["word_greek"])
            deduped_words.append(w)
            
    print(f"Total unique words: {len(deduped_words)}")

    # Translate definitions
    english_texts = list(set([w["word_english"] for w in deduped_words]))
    texts_to_translate = [t for t in english_texts if t not in translation_cache]
    
    if texts_to_translate:
        new_translations = translate_batch(texts_to_translate)
        for eng, ch in new_translations.items():
            if ch:
                translation_cache[eng] = ch
        save_cache()

    # Distribute words into 15 units (Unit 31 to 45)
    # 15 units total. We divide the sorted vocabulary sequentially.
    # Sorted alphabetically by Greek raw word.
    deduped_words.sort(key=lambda x: x["greek_raw"].lower())
    
    total_words_count = len(deduped_words)
    words_per_unit = total_words_count // 15
    
    compiled_words = []
    next_id = 2000 # keep A2 IDs clean and separate, starting at 2000
    
    for idx, w in enumerate(deduped_words):
        unit = 31 + (idx // words_per_unit)
        if unit > 45:
            unit = 45
            
        p_start, p_end = a2_ranges.get(unit, (4, 148))
        page_spread = p_end - p_start + 1
        # Distribute page numbers
        page_number = p_start + (idx % page_spread)
        
        greek = w["word_greek"]
        english = w["word_english"]
        chinese = translation_cache.get(english, english)
        pronunciation = transliterate_greek(w["greek_raw"])
        
        # Create dummy examples
        example_greek = f"Αυτό είναι {w['greek_raw']}."
        example_chinese = f"这是 {chinese}。"
        if "to " in english.lower() or english.lower().startswith("to"):
            example_greek = f"Θέλω να {w['greek_raw']}."
            example_chinese = f"我想 {chinese}。"
            
        compiled_words.append({
            "id": next_id,
            "book_id": "a2",
            "unit": unit,
            "page_number": page_number,
            "word_greek": greek,
            "word_chinese": chinese,
            "pronunciation": pronunciation,
            "example_greek": example_greek,
            "example_chinese": example_chinese
        })
        next_id += 1

    # Merge into vocabulary.json
    if not os.path.exists(VOCAB_JSON_PATH):
        print(f"vocabulary.json not found at {VOCAB_JSON_PATH}")
        return
        
    with open(VOCAB_JSON_PATH, "r", encoding="utf-8") as f:
        vocab_json_data = json.load(f)
        
    existing_vocab = vocab_json_data.get("textbook_vocabulary", [])
    # Filter out existing A2 entries to prevent duplicates
    existing_vocab = [item for item in existing_vocab if item.get("book_id") != "a2"]
    
    vocab_json_data["textbook_vocabulary"] = existing_vocab + compiled_words
    
    with open(VOCAB_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(vocab_json_data, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully wrote {len(compiled_words)} A2 words to {VOCAB_JSON_PATH}.")

    # Seed SQLite Database
    if os.path.exists(DB_PATH):
        print("Seeding A2 vocabulary into SQLite database...")
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM vocabulary WHERE book_id = 'a2'")
        
        for w in compiled_words:
            cursor.execute("""
                INSERT INTO vocabulary (id, book_id, unit, page_number, word_greek, word_chinese, pronunciation, example_greek, example_chinese)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                w["id"], 
                w["book_id"], 
                w["unit"], 
                w["page_number"], 
                w["word_greek"], 
                w["word_chinese"], 
                w["pronunciation"], 
                w["example_greek"], 
                w["example_chinese"]
            ))
            
        conn.commit()
        conn.close()
        print(f"Successfully seeded {len(compiled_words)} A2 words to SQLite database.")
    else:
        print(f"Warning: SQLite database not found at {DB_PATH}")

if __name__ == "__main__":
    main()

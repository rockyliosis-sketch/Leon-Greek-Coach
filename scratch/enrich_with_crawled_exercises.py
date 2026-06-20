import os
import re
import json
import sqlite3
import urllib.parse
import urllib.request
import time

PROJECT_DIR = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach"
TXT_DIR = os.path.join(PROJECT_DIR, "scratch", "extracted_txt")
VOCAB_JSON_PATH = os.path.join(PROJECT_DIR, "frontend", "src", "data", "vocabulary.json")
DB_PATH = os.path.join(PROJECT_DIR, "backend", "greek_coach.db")
TRANSLATION_CACHE_PATH = os.path.join(PROJECT_DIR, "backend", "translation_cache.json")

instruction_patterns = [
    r"βλέπεις", r"διαβάζεις", r"γράφεις", r"ενώνεις", r"συμπληρώνεις",
    r"ακούς", r"άσκηση", r"σελ\.", r"ενότητα", r"--- page", r"κλικ", r"ελληνικά"
]

# Words that indicate a sentence is incomplete if it ends with them
incomplete_ends = {
    'ο', 'η', 'το', 'οι', 'τα', 'τον', 'την', 'της', 'του', 'στα', 'στη', 'στην', 'στο', 'στους', 'στις',
    'με', 'σε', 'απο', 'για', 'προς', 'κατα', 'παρα', 'αντι', 'διχως', 'χωρις', 'και', 'να', 'θα', 'οτι',
    'πως', 'αν', 'γιατι', 'αλλα', 'η', 'ουτε', 'μητε', 'απο', 'ειναι'
}

translation_cache = {}

def load_translation_cache():
    global translation_cache
    if os.path.exists(TRANSLATION_CACHE_PATH):
        try:
            with open(TRANSLATION_CACHE_PATH, "r", encoding="utf-8") as f:
                translation_cache = json.load(f)
            print(f"Loaded {len(translation_cache)} cached translations.")
        except Exception as e:
            print("Error loading translation cache:", e)

def save_translation_cache():
    with open(TRANSLATION_CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(translation_cache, f, ensure_ascii=False, indent=2)
    print("Saved translation cache.")

def translate_greek_to_chinese(greek_text):
    if not greek_text:
        return ""
    greek_text = greek_text.strip()
    if greek_text in translation_cache:
        return translation_cache[greek_text]
        
    try:
        url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=el&tl=zh-CN&dt=t&q=" + urllib.parse.quote(greek_text)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            res = response.read().decode('utf-8')
            data = json.loads(res)
            translation = data[0][0][0]
            translation_cache[greek_text] = translation
            # Wait 0.2s to prevent Google Translate blocking
            time.sleep(0.2)
            return translation
    except Exception as e:
        print(f"Error translating '{greek_text}': {e}")
        return ""

def clean_greek(text):
    text = text.lower()
    replacements = {
        'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω',
        'ϊ': 'ι', 'ϋ': 'υ', 'ΐ': 'ι', 'ΰ': 'υ',
        'ὰ': 'α', 'ὲ': 'ε', 'ὴ': 'η', 'ὶ': 'ι', 'ὸ': 'ο', 'ὺ': 'υ', 'ὼ': 'ω',
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

def clean_sentence(text):
    text = text.replace("\xa0", " ").strip()
    # Strip leading numbers/letters from list prefixes
    text = re.sub(r'^(?:\d+[\.\)]|([a-zA-Zοο])\s*[\]\)])\s*', '', text).strip()
    # Replace multiple spaces with single space
    text = re.sub(r'\s+', ' ', text)
    # Fix spacing before period/question mark
    text = re.sub(r'\s+([\.\!\?\;])', r'\1', text)
    return text

def is_valid_sentence(text):
    if not text:
        return False
    if "___" in text or "..." in text or "___" in text:
        return False
    if len(text) < 8 or len(text.split()) < 3:
        return False
    
    # Must end with standard Greek punctuation
    if text[-1] not in ['.', '!', '?', ';']:
        return False
        
    # Check incomplete last word
    words = clean_greek(text).split()
    if words and words[-1] in incomplete_ends:
        return False
        
    text_lower = text.lower()
    for pattern in instruction_patterns:
        if re.search(pattern, text_lower):
            return False
    if not re.search(r'[α-ωΑ-Ωίϊΐόάέύϋΰήώ]', text):
        return False
    return True

def extract_sentences_from_file(file_path):
    if not os.path.exists(file_path):
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        raw_lines = f.readlines()
    
    segments = []
    for line in raw_lines:
        line_clean = line.replace("\xa0", " ").strip()
        if not line_clean:
            continue
        
        # Split by 3 or more spaces (multi-column)
        parts = re.split(r'\s{3,}', line_clean)
        for p in parts:
            p_clean = clean_sentence(p)
            if p_clean:
                segments.append(p_clean)
                
    merged_sentences = []
    i = 0
    while i < len(segments):
        curr = segments[i]
        
        # Check if we should merge with next
        while i + 1 < len(segments):
            nxt = segments[i+1]
            ends_with_punc = curr[-1] in ['.', '!', '?', ';', ':']
            starts_with_lower = re.match(r'^[α-ωάέήίόύώϊϋΐΰ]', nxt)
            
            if not ends_with_punc and starts_with_lower:
                curr = curr + " " + nxt
                i += 1
            else:
                break
        
        if is_valid_sentence(curr):
            merged_sentences.append(curr)
        i += 1
        
    return merged_sentences

def get_clean_greek_base(greek_raw):
    clean = re.sub(r'\(.*?\)', '', greek_raw).strip()
    clean_base = clean.split(",")[0].strip()
    return clean_base

def get_word_stem(greek_word):
    clean_w = get_clean_greek_base(greek_word)
    clean_w = clean_greek(clean_w)
    
    if len(clean_w) <= 3:
        return clean_w
        
    # Suffixes mapping from textbook database
    suffixes = [
        "ουμε", "ετε", "ουν", "ουνε", "ομαι", "εσαι", "εται", "ομαστε", "εστε", "ονται",
        "ουσα", "ουσες", "ουσε", "ουσαμε", "ουσατε", "ουσαν", "ησα", "ησες", "ησε", "ησαμε",
        "ησατε", "ησαν", "ησω", "ησεις", "ησει", "ησουμε", "ησετε", "ησουν", "αμε", "ατε", "αν",
        "εισ", "ει", "ειν", "ου", "ησ", "ασ", "οσ", "ων", "οι", "εσ", "α", "η", "ο", "ω", "ι", "υ"
    ]
    for suf in suffixes:
        if clean_w.endswith(suf):
            stem = clean_w[:-len(suf)]
            if len(stem) >= 3:
                return stem
    return clean_w

def get_unit_file(book_id, unit):
    if book_id == 'a1-a':
        return f"a1_a_unit{unit}.txt"
    elif book_id == 'a1-b':
        return f"a1_b_unit{unit}.txt"
    elif book_id == 'a2':
        if unit == 31: return "a2_unit31.txt"
        elif unit == 32: return "a2_unit32.txt"
        elif unit == 33: return "a2_unit33.txt"
        elif unit == 35: return "a2_unit34.txt"
        elif unit == 36: return "a2_unit35.txt"
        elif unit == 37: return "a2_unit36.txt"
        else:
            return None
    return None

def main():
    load_translation_cache()
    
    # Load vocabulary
    with open(VOCAB_JSON_PATH, "r", encoding="utf-8") as f:
        vocab_data = json.load(f)
    vocab_list = vocab_data.get("textbook_vocabulary", [])
    
    print(f"Loaded {len(vocab_list)} vocabulary words from JSON.")
    
    # Cache extracted sentences from all files
    all_files_sentences = {}
    all_cert_sentences_set = set()
    for filename in os.listdir(TXT_DIR):
        if filename.endswith(".txt"):
            file_path = os.path.join(TXT_DIR, filename)
            sentences = extract_sentences_from_file(file_path)
            all_files_sentences[filename] = sentences
            for s in sentences:
                all_cert_sentences_set.add(s)
            
    print(f"Loaded sentences from {len(all_files_sentences)} text files (Total unique sentences: {len(all_cert_sentences_set)}).")
    
    # Match vocabulary words to sentences and clean false positives
    enriched_count = 0
    cleaned_count = 0
    start_time = time.time()
    
    for idx, word in enumerate(vocab_list):
        book_id = word["book_id"]
        unit = word["unit"]
        greek_word = word["word_greek"]
        word_chinese = word["word_chinese"]
        
        stem = get_word_stem(greek_word)
        if not stem:
            continue
            
        # Find matching sentences in the same unit first
        matched_sentences = []
        unit_file = get_unit_file(book_id, unit)
        
        if unit_file and unit_file in all_files_sentences:
            for s in all_files_sentences[unit_file]:
                s_clean = clean_greek(s)
                if any(word_in_sentence.startswith(stem) for word_in_sentence in s_clean.split()):
                    matched_sentences.append(s)
                    
        # If no match in the same unit, scan other files in the same book
        if not matched_sentences:
            for fn, s_list in all_files_sentences.items():
                if book_id == 'a1-a' and not fn.startswith("a1_a"):
                    continue
                if book_id == 'a1-b' and not fn.startswith("a1_b"):
                    continue
                if book_id == 'a2' and not fn.startswith("a2"):
                    continue
                    
                for s in s_list:
                    s_clean = clean_greek(s)
                    if any(word_in_sentence.startswith(stem) for word_in_sentence in s_clean.split()):
                        matched_sentences.append(s)
                        
        if matched_sentences:
            # Pick the shortest matching sentence
            best_sentence = min(matched_sentences, key=len)
            
            # Check if this is a change from what we currently have
            current_example = word.get("example_greek", "")
            if current_example != best_sentence:
                translation = translate_greek_to_chinese(best_sentence)
                if translation:
                    word["example_greek"] = best_sentence
                    word["example_chinese"] = translation
                    enriched_count += 1
        else:
            # If no matches are found, check if the current example sentence is a false positive 
            # (i.e. it is in the pool of certification sentences but we did not match it under prefix matching)
            current_example = word.get("example_greek", "")
            if current_example in all_cert_sentences_set:
                # Reset to simple fallback!
                clean_base = get_clean_greek_base(greek_word)
                # Check if it's a verb (usually ends with ω or ώ)
                clean_base_normalized = clean_greek(clean_base)
                is_verb = clean_base_normalized.endswith(('ω', 'ω')) or 'ώ' in clean_base
                
                if is_verb:
                    word["example_greek"] = f"Θέλω να {clean_base}."
                    word["example_chinese"] = f"我想 {word_chinese}。"
                else:
                    word["example_greek"] = f"Αυτό είναι {clean_base}."
                    word["example_chinese"] = f"这是 {word_chinese}。"
                    
                cleaned_count += 1
                print(f"Cleaned false positive match for: '{greek_word}' -> Reset to fallback: '{word['example_greek']}'")
                
    print(f"Finished. Enriched/Updated: {enriched_count} words. Reset false positives: {cleaned_count} words. Time: {time.time() - start_time:.1f}s.")
    
    # Save vocabulary JSON
    with open(VOCAB_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(vocab_data, f, ensure_ascii=False, indent=2)
    print("Updated vocabulary.json saved.")
    
    # Synchronize database
    print("Syncing to SQLite database...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    db_updated = 0
    for w in vocab_list:
        cursor.execute("""
            UPDATE vocabulary 
            SET example_greek = ?, example_chinese = ?
            WHERE id = ?
        """, (w.get("example_greek", ""), w.get("example_chinese", ""), w["id"]))
        db_updated += cursor.rowcount
        
    conn.commit()
    conn.close()
    print(f"Synchronized database: updated {db_updated} rows.")
    
    save_translation_cache()
    print("Enrichment complete!")

if __name__ == "__main__":
    main()

import os
import re
import json
import sqlite3
import urllib.parse
import urllib.request
import time
import fitz  # PyMuPDF
from concurrent.futures import ThreadPoolExecutor, as_completed

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GLOSSARY_PATH = os.path.join(PROJECT_DIR, "materials", "Glossary_A1_kids.pdf")
OUTPUT_DIR = os.path.join(PROJECT_DIR, "frontend", "src", "data")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "vocabulary.json")
DB_PATH = os.path.join(PROJECT_DIR, "backend", "greek_coach.db")

# Simple Greek-to-English phonetic transliterater
def transliterate_greek(text):
    text = text.lower()
    # Normalize accents
    accents = {
        'ά': 'a', 'έ': 'e', 'ή': 'i', 'ί': 'i', 'ό': 'o', 'ύ': 'i', 'ώ': 'o',
        'α': 'a', 'β': 'v', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'i',
        'θ': 'th', 'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x',
        'ο': 'o', 'π': 'p', 'ρ': 'r', 'σ': 's', 'ς': 's', 'τ': 't', 'υ': 'i',
        'φ': 'f', 'χ': 'ch', 'ψ': 'ps', 'ω': 'o', 'ϊ': 'i', 'ϋ': 'i',
        'ΰ': 'i', 'ΐ': 'i'
    }
    
    # Dipthongs and digraphs replacement
    digraphs = {
        'αι': 'e', 'ει': 'i', 'οι': 'i', 'ου': 'ou', 'υι': 'i',
        'μπ': 'b', 'ντ': 'd', 'γκ': 'g', 'γγ': 'ng',
        'αυ': 'av', 'ευ': 'ev'
    }
    
    # Clean up non-alphabetic chars for phonetics
    cleaned = ""
    for char in text:
        if char.isalpha() or char.isspace() or char == '-':
            cleaned += char
        elif char == ',':
            break  # Skip articles like ", o" or ", η" for pronunciation
            
    words = cleaned.split()
    pron_words = []
    
    for word in words:
        if not word: continue
        # Apply digraphs
        p_word = word
        for k, v in digraphs.items():
            p_word = p_word.replace(k, v)
        # Apply single letters
        result = []
        for char in p_word:
            result.append(accents.get(char, char))
        pron_words.append("".join(result))
        
    return "-".join(pron_words)

# Translation Cache to avoid repeating API calls if run multiple times
TRANSLATION_CACHE_PATH = os.path.join(PROJECT_DIR, "backend", "translation_cache.json")
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
        
    # Remove bracketed descriptions for cleaner translation
    clean_text = re.sub(r'\[.*?\]', '', english_text).strip()
    clean_text = re.sub(r'\(.*?\)', '', clean_text).strip()
    
    try:
        url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=" + urllib.parse.quote(clean_text)
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            res = response.read().decode('utf-8')
            data = json.loads(res)
            translation = data[0][0][0]
            return translation
    except Exception as e:
        return ""

def parse_glossary_pdf():
    if not os.path.exists(GLOSSARY_PATH):
        print(f"Glossary PDF not found at {GLOSSARY_PATH}")
        return []

    print(f"Parsing Glossary_A1_kids.pdf...")
    doc = fitz.open(GLOSSARY_PATH)
    pattern = re.compile(r"^([^,=\n]+)(?:,\s*([^=\n]+))?\s*=\s*(.+)$")
    
    vocab_raw = []
    
    for p_idx, page in enumerate(doc):
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
                
                vocab_raw.append({
                    "greek_raw": greek,
                    "article": article,
                    "word_greek": greek + (f", {article}" if article else ""),
                    "word_english": english
                })
                
    print(f"Extracted {len(vocab_raw)} words from PDF.")
    return vocab_raw

# Core mapping config
unit_keywords = {
    # Book A1-A
    ("a1-a", 1): ["hello", "hi", "good morning", "good evening", "good night", "goodbye", "bye", "welcome", "please", "thank you", "thanks", "sorry", "name", "who", "i am", "you are", "how are you", "fine", "ok", "yes", "no"],
    ("a1-a", 2): ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "zero", "where", "from", "origin", "country", "national", "greek", "greece", "england", "english", "france", "french", "china", "chinese", "albania", "albanian", "germany", "german", "italy", "italian", "spain", "spanish", "cyprus", "cypriot"],
    ("a1-a", 3): ["write", "read", "speak", "talk", "listen", "hear", "play", "sing", "dance", "run", "jump", "walk", "draw", "paint", "learn", "study"],
    ("a1-a", 4): ["school", "classroom", "desk", "board", "chair", "pencil", "notebook", "book", "eraser", "sharpener", "bag", "teacher", "pupil", "student", "classmate", "pen", "ruler", "scissors", "pencilcase"],
    ("a1-a", 5): ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "day", "week", "schedule", "timetable", "math", "history", "music", "gym", "art", "geography", "science"],
    ("a1-a", 6): ["toy", "game", "ball", "doll", "car", "train", "bear", "blocks", "balloon", "kite", "bike", "bicycle", "puzzle", "cards"],
    ("a1-a", 7): ["family", "parent", "mother", "father", "mom", "dad", "sister", "brother", "grandfather", "grandmother", "grandpa", "grandma", "uncle", "aunt", "cousin", "son", "daughter", "baby"],
    ("a1-a", 8): ["color", "red", "blue", "yellow", "green", "white", "black", "orange", "pink", "purple", "brown", "grey", "big", "small", "tall", "short", "beautiful", "ugly", "clean", "dirty", "new", "old"],
    ("a1-a", 9): ["wolf", "fox", "bear", "lion", "rabbit", "bunny", "dragon", "dog", "cat", "bird", "fish", "horse", "cow", "sheep", "chicken", "pig", "monkey", "elephant", "zebra", "forest", "fairy", "king", "queen", "princess"],
    ("a1-a", 10): ["time", "clock", "watch", "hour", "minute", "morning", "noon", "afternoon", "evening", "night", "wake", "get up", "wash", "brush", "teeth", "shower", "sleep", "television", "tv", "program", "watch", "eat", "breakfast", "lunch", "dinner"],
    ("a1-a", 11): ["house", "home", "room", "living room", "kitchen", "bathroom", "bedroom", "garden", "door", "window", "floor", "wall", "roof", "yard", "balcony"],
    ("a1-a", 12): ["bed", "table", "chair", "sofa", "armchair", "wardrobe", "cupboard", "cabinet", "carpet", "lamp", "mirror", "on", "under", "in", "out", "behind", "in front of", "between"],
    ("a1-a", 13): ["town", "city", "village", "street", "road", "square", "park", "hospital", "supermarket", "bakery", "shop", "store", "cafe", "cinema", "theatre", "bank", "post office", "church"],
    ("a1-a", 15): ["circus", "clown", "acrobat", "magician", "show", "performance", "ringmaster", "tent", "ticket"],

    # Book A1-B
    ("a1-b", 16): ["weather", "season", "spring", "summer", "autumn", "winter", "sun", "rain", "snow", "wind", "cloud", "sky", "hot", "cold", "warm", "cool", "windy", "sunny", "rainy", "snowy"],
    ("a1-b", 17): ["food", "drink", "meal", "water", "milk", "bread", "cheese", "egg", "butter", "rice", "pasta", "meat", "chicken", "fish", "soup", "salad", "fruit", "vegetable", "dessert", "cake", "ice cream"],
    ("a1-b", 18): ["clothes", "clothing", "wear", "dress", "skirt", "pants", "trousers", "shirt", "jacket", "coat", "sweater", "shoes", "socks", "boots", "hat", "cap", "gloves", "scarf", "umbrella"],
    ("a1-b", 19): ["body", "head", "face", "hair", "eye", "ear", "nose", "mouth", "tooth", "teeth", "tongue", "arm", "hand", "finger", "leg", "foot", "toe", "pain", "hurt", "ache", "sick", "ill", "doctor", "nurse", "medicine"],
    ("a1-b", 20): ["sport", "soccer", "football", "basketball", "tennis", "swimming", "swim", "run", "jump", "ride", "climb", "hobby", "team", "match", "win", "lose"],
    ("a1-b", 21): ["travel", "journey", "trip", "holiday", "vacation", "car", "bus", "train", "plane", "airplane", "boat", "ship", "ticket", "station", "airport", "hotel", "passport"],
    ("a1-b", 22): ["shop", "shopping", "buy", "sell", "money", "euro", "cent", "price", "cost", "pay", "cheap", "expensive"],
    ("a1-b", 23): ["job", "work", "occupation", "profession", "doctor", "teacher", "police", "firefighter", "driver", "pilot", "chef", "cook", "nurse", "singer", "actor", "writer"],
    ("a1-b", 24): ["nature", "environment", "plant", "tree", "flower", "grass", "leaf", "forest", "mountain", "hill", "river", "lake", "sea", "ocean", "beach", "sand"],
    ("a1-b", 25): ["holiday", "celebration", "festival", "party", "birthday", "gift", "present", "cake", "candle", "christmas", "easter", "new year"]
}

# Book Page Ranges for distribution
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
    31: (4, 13), 32: (14, 23), 33: (24, 33), 34: (34, 43), 35: (44, 53),
    36: (54, 63), 37: (64, 73), 38: (74, 83), 39: (84, 93), 40: (94, 103),
    41: (104, 113), 42: (114, 123), 43: (124, 133), 44: (134, 141), 45: (142, 148)
}

def classify_word(greek, english):
    eng_lower = english.lower()
    
    # 1. Match semantic keywords
    for (book, unit), keywords in unit_keywords.items():
        for kw in keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', eng_lower):
                return book, unit
                
    # 2. Fallback based on Greek alphabet starting character
    first_char = greek.strip().upper()[0] if greek.strip() else 'A'
    
    if first_char in ['Α', 'B', 'Γ', 'Δ', 'E']:
        unit = (ord(first_char) % 6) + 1
        return "a1-a", unit
    elif first_char in ['Ζ', 'Η', 'Θ', 'Ι', 'Κ', 'Λ']:
        unit = (ord(first_char) % 5) + 7
        return "a1-a", unit
    elif first_char in ['Μ', 'Ν', 'Ξ', 'Ο', 'Π']:
        unit = (ord(first_char) % 4) + 12
        return "a1-a", unit
    elif first_char in ['Ρ', 'Σ', 'Τ', 'Υ']:
        unit = (ord(first_char) % 5) + 16
        return "a1-b", unit
    elif first_char in ['Φ', 'Χ', 'Ψ', 'Ω']:
        unit = (ord(first_char) % 5) + 21
        return "a1-b", unit
    else:
        return "a1-a", 1

def translate_batch(english_list):
    results = {}
    total = len(english_list)
    print(f"Starting parallel translation of {total} words using ThreadPoolExecutor...")
    
    completed = 0
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(translate_to_chinese, eng): eng for eng in english_list}
        for future in as_completed(futures):
            eng = futures[future]
            try:
                ch = future.result()
                results[eng] = ch
            except Exception as e:
                results[eng] = eng
            completed += 1
            if completed % 100 == 0 or completed == total:
                print(f"Translation progress: {completed}/{total} completed.")
    return results

def main():
    raw_vocab = parse_glossary_pdf()
    if not raw_vocab:
        print("No vocabulary found in glossary.")
        return
        
    # Gather all English texts to translate
    english_texts = list(set([item["word_english"] for item in raw_vocab]))
    texts_to_translate = [t for t in english_texts if t not in translation_cache]
    
    if texts_to_translate:
        new_translations = translate_batch(texts_to_translate)
        for eng, ch in new_translations.items():
            if ch: # only cache successful translations
                translation_cache[eng] = ch
        save_cache()
    
    print("Formatting and mapping words...")
    processed_vocab = []
    unit_counters = {}
    
    for idx, item in enumerate(raw_vocab):
        greek = item["greek_raw"]
        english = item["word_english"]
        
        book_id, unit = classify_word(greek, english)
        
        chinese = translation_cache.get(english, english)
        pronunciation = transliterate_greek(greek)
        
        key = (book_id, unit)
        if key not in unit_counters:
            unit_counters[key] = 0
        counter = unit_counters[key]
        unit_counters[key] += 1
        
        # Determine page number based on unit distribution
        if book_id == "a1-a":
            p_start, p_end = a1_a_ranges.get(unit, (10, 50))
        elif book_id == "a1-b":
            p_start, p_end = a1_b_ranges.get(unit, (6, 100))
        else:
            p_start, p_end = a2_ranges.get(unit, (4, 100))
            
        page_spread = p_end - p_start + 1
        page_number = p_start + (counter % page_spread)
        
        # Create dummy examples
        example_greek = f"Αυτό είναι {greek}."
        example_chinese = f"这是 {chinese}。"
        if "to " in english.lower() or english.lower().startswith("to"):
            example_greek = f"Θέλω να {greek}."
            example_chinese = f"我想 {chinese}。"
            
        word_entry = {
            "id": idx + 1,
            "book_id": book_id,
            "unit": unit,
            "page_number": page_number,
            "word_greek": item["word_greek"],
            "word_chinese": chinese,
            "pronunciation": pronunciation,
            "example_greek": example_greek,
            "example_chinese": example_chinese
        }
        
        processed_vocab.append(word_entry)
        
    # Save vocabulary.json in frontend
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "master_glossary": [],
            "textbook_vocabulary": processed_vocab
        }, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully wrote {len(processed_vocab)} terms to {OUTPUT_PATH}")
    
    # Now sync to SQLite database
    print("Seeding SQLite database with the full vocabulary...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Clear existing vocabulary
    cursor.execute("DELETE FROM vocabulary")
    
    # Insert new vocabulary
    seeded_count = 0
    for w in processed_vocab:
        cursor.execute("""
            INSERT INTO vocabulary (book_id, unit, page_number, word_greek, word_chinese, pronunciation, example_greek, example_chinese)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (w["book_id"], w["unit"], w["page_number"], w["word_greek"], w["word_chinese"], w["pronunciation"], w["example_greek"], w["example_chinese"]))
        seeded_count += 1
        
    conn.commit()
    conn.close()
    print(f"Successfully seeded {seeded_count} words into SQLite database {DB_PATH}.")

if __name__ == "__main__":
    main()

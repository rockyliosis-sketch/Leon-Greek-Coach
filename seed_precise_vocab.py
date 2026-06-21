import os
import re
import json
import sqlite3
import fitz
import urllib.parse
import urllib.request
import time

PROJECT_DIR = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach"
A1_A_PATH = os.path.join(PROJECT_DIR, "materials", "（已压缩）LEON_S_GREEK_TEXTBOOK_A1-A.md")
A1_B_PATH = os.path.join(PROJECT_DIR, "materials", "（已压缩）LEON_S_GREEK_TEXTBOOK_A1-B.md")
A2_PATH = os.path.join(PROJECT_DIR, "materials", "（已压缩）LEON_S_GREEK_TEXTBOOK_A2.md")
A1_GLOSSARY_PATH = os.path.join(PROJECT_DIR, "materials", "Glossary_A1_kids.pdf")
A2_GLOSSARY_PATH = os.path.join(PROJECT_DIR, "materials", "KLIK_A2_Ef_Glossary.md")
VOCAB_JSON_PATH = os.path.join(PROJECT_DIR, "frontend", "src", "data", "vocabulary.json")
DB_PATH = os.path.join(PROJECT_DIR, "backend", "greek_coach.db")
TRANSLATION_CACHE_PATH = os.path.join(PROJECT_DIR, "backend", "translation_cache.json")

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

# Thematic keywords for semantic backup mapping
unit_keywords = {
    # Book A1-A
    1: ["hello", "hi", "good morning", "good evening", "good night", "goodbye", "bye", "welcome", "please", "thank you", "thanks", "sorry", "name", "who", "i am", "you are", "how are you", "fine", "ok", "yes", "no"],
    2: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "zero", "where", "from", "origin", "country", "national", "greek", "greece", "england", "english", "france", "french", "china", "chinese", "albania", "albanian", "germany", "german", "italy", "italian", "spain", "spanish", "cyprus", "cypriot"],
    3: ["write", "read", "speak", "talk", "listen", "hear", "play", "sing", "dance", "run", "jump", "walk", "draw", "paint", "learn", "study"],
    4: ["school", "classroom", "desk", "board", "chair", "pencil", "notebook", "book", "eraser", "sharpener", "bag", "teacher", "pupil", "student", "classmate", "pen", "ruler", "scissors", "pencilcase"],
    5: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "day", "week", "schedule", "timetable", "math", "history", "music", "gym", "art", "geography", "science"],
    6: ["toy", "game", "ball", "doll", "car", "train", "bear", "blocks", "balloon", "kite", "bike", "bicycle", "puzzle", "cards"],
    7: ["family", "parent", "mother", "father", "mom", "dad", "sister", "brother", "grandfather", "grandmother", "grandpa", "grandma", "uncle", "aunt", "cousin", "son", "daughter", "baby"],
    8: ["color", "red", "blue", "yellow", "green", "white", "black", "orange", "pink", "purple", "brown", "grey", "big", "small", "tall", "short", "beautiful", "ugly", "clean", "dirty", "new", "old"],
    9: ["wolf", "fox", "bear", "lion", "rabbit", "bunny", "dragon", "dog", "cat", "bird", "fish", "horse", "cow", "sheep", "chicken", "pig", "monkey", "elephant", "zebra", "forest", "fairy", "king", "queen", "princess"],
    10: ["time", "clock", "watch", "hour", "minute", "morning", "noon", "afternoon", "evening", "night", "wake", "get up", "wash", "brush", "teeth", "shower", "sleep", "television", "tv", "program", "watch", "eat", "breakfast", "lunch", "dinner"],
    11: ["house", "home", "room", "living room", "kitchen", "bathroom", "bedroom", "garden", "door", "window", "floor", "wall", "roof", "yard", "balcony"],
    12: ["bed", "table", "chair", "sofa", "armchair", "wardrobe", "cupboard", "cabinet", "carpet", "lamp", "mirror", "on", "under", "in", "out", "behind", "in front of", "between"],
    13: ["town", "city", "village", "street", "road", "square", "park", "hospital", "supermarket", "bakery", "shop", "store", "cafe", "cinema", "theatre", "bank", "post office", "church"],
    14: ["review", "exam", "test", "exercise", "practice", "repeat", "summarize"],
    15: ["circus", "clown", "acrobat", "magician", "show", "performance", "ringmaster", "tent", "ticket"],

    # Book A1-B
    16: ["weather", "season", "spring", "summer", "autumn", "winter", "sun", "rain", "snow", "wind", "cloud", "sky", "hot", "cold", "warm", "cool", "windy", "sunny", "rainy", "snowy"],
    17: ["food", "drink", "meal", "water", "milk", "bread", "cheese", "egg", "butter", "rice", "pasta", "meat", "chicken", "fish", "soup", "salad", "fruit", "vegetable", "dessert", "cake", "ice cream"],
    18: ["clothes", "clothing", "wear", "dress", "skirt", "pants", "trousers", "shirt", "jacket", "coat", "sweater", "shoes", "socks", "boots", "hat", "cap", "gloves", "scarf", "umbrella"],
    19: ["body", "head", "face", "hair", "eye", "ear", "nose", "mouth", "tooth", "teeth", "tongue", "arm", "hand", "finger", "leg", "foot", "toe", "pain", "hurt", "ache", "sick", "ill", "doctor", "nurse", "medicine"],
    20: ["sport", "soccer", "football", "basketball", "tennis", "swimming", "swim", "run", "jump", "ride", "climb", "hobby", "team", "match", "win", "lose"],
    21: ["travel", "journey", "trip", "holiday", "vacation", "car", "bus", "train", "plane", "airplane", "boat", "ship", "ticket", "station", "airport", "hotel", "passport"],
    22: ["shop", "shopping", "buy", "sell", "money", "euro", "cent", "price", "cost", "pay", "cheap", "expensive"],
    23: ["job", "work", "occupation", "profession", "doctor", "teacher", "police", "firefighter", "driver", "pilot", "chef", "cook", "nurse", "singer", "actor", "writer"],
    24: ["nature", "environment", "plant", "tree", "flower", "grass", "leaf", "forest", "mountain", "hill", "river", "lake", "sea", "ocean", "beach", "sand"],
    25: ["holiday", "celebration", "festival", "party", "birthday", "gift", "present", "cake", "candle", "christmas", "easter", "new year"],
    26: ["nutrition", "diet", "healthy", "salad", "fruit", "vegetable"],
    27: ["free time", "leisure", "hobby", "paint", "read", "music", "sport"],
    28: ["service", "bank", "post office", "library", "police", "hospital"],
    29: ["friend", "relationship", "social", "meet", "chat", "love"],
    30: ["review", "exam", "test", "exercise", "final"]
}

a2_keywords = {
    31: ["height", "hair", "eye", "face", "character", "personality", "description", "tall", "short", "fat", "thin", 
         "beautiful", "handsome", "ugly", "good", "kind", "nice", "friendly", "polite", "rude", "clever", "smart", 
         "stupid", "lazy", "active", "serious", "funny", "happy", "sad", "angry", "calm", "patient", "impatient", 
         "honest", "liar", "proud", "brave", "coward", "scared", "fear", "love", "hate", "friend", "cousin", 
         "relative", "sister", "brother", "mother", "father", "son", "daughter", "man", "woman", "boy", "girl", "child"],
    32: ["city", "town", "countryside", "village", "street", "road", "square", "building", "house", "apartment", 
         "traffic", "car", "bus", "train", "station", "stop", "park", "nature", "tree", "river", "lake", "mountain", 
         "field", "forest", "animal", "bird", "fish", "quiet", "noisy", "crowded", "polluted", "clean", "dirty", 
         "distance", "near", "far"],
    33: ["weather", "season", "spring", "summer", "autumn", "winter", "sun", "rain", "snow", "wind", "cloud", 
         "temperature", "forecast", "future", "plan", "tomorrow", "will", "going to", "intend", "hope", "wish", 
         "predict", "expect"],
    34: ["review", "repeat", "exam", "test", "exercise", "practice", "summary", "mid-term"],
    35: ["party", "celebration", "festival", "holiday", "birthday", "wedding", "anniversary", "invite", "invitation", 
         "guest", "host", "celebrate", "congratulate", "gift", "present", "cake", "balloon", "gathering", "meet", "welcome",
         "phone", "telephone", "call", "mobile", "message", "email", "post office", "letter", "stamp", "package", 
         "bank", "account", "money", "card", "cash", "service", "customer", "support", "help", "information", 
         "library", "museum", "police", "fire station"],
    36: ["healthy", "nutrition", "diet", "food", "eat", "drink", "meal", "breakfast", "lunch", "dinner", "snack", 
         "fruit", "vegetable", "apple", "banana", "orange", "grape", "tomato", "potato", "onion", "garlic", "salad", 
         "meat", "chicken", "beef", "fish", "milk", "water", "juice", "bread", "cheese", "egg", "sugar", "salt", "oil",
         "accident", "emergency", "problem", "danger", "hurt", "pain", "injury", "broken", "cut", "wound", "blood", 
         "sick", "ill", "illness", "disease", "fever", "cold", "flu", "cough", "headache", "toothache", "doctor", 
         "dentist", "nurse", "hospital", "pharmacy", "medicine", "pill", "cure", "help", "rescue", "save",
         "housing", "rent", "apartment", "flat", "room", "bedroom", "living room", "kitchen", "bathroom", "balcony", 
         "floor", "wall", "renting", "landlord", "tenant", "price", "contract", "furniture", "table", "chair", "bed", 
         "sofa", "wardrobe", "cupboard", "lamp", "appliance", "fridge", "oven", "washing machine", "closet"],
    37: ["job", "work", "career", "profession", "occupation", "resume", "cv", "interview", "application", "apply", 
         "hire", "fire", "boss", "manager", "employee", "salary", "wage", "office", "company", "business", "doctor", 
         "teacher", "engineer", "lawyer", "writer", "artist", "nurse", "pilot", "driver", "study", "learn", "school",
         "university", "college", "lesson", "class", "student", "classroom"],
    38: ["review", "repeat", "exam", "test", "exercise", "practice", "summary"],
    39: ["exam", "test", "proficiency"]
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

def get_clean_greek_base(greek_raw):
    clean = re.sub(r'\(.*?\)', '', greek_raw).strip()
    clean_base = clean.split(",")[0].strip()
    return clean_base

# Custom Greek stemmer to strip inflections for textbook search
def get_greek_stem(word):
    word = normalize_greek(word)
    if len(word) <= 3:
        return word
    suffixes = [
        "ουμε", "ετε", "ουν", "ουνε", "ομαι", "εσαι", "εται", "ομαστε", "εστε", "ονται",
        "ουσα", "ουσες", "ουσε", "ουσαμε", "ουσατε", "ουσαν", "ησα", "ησες", "ησε", "ησαμε",
        "ησατε", "ησαν", "ησω", "ησεις", "ησει", "ησουμε", "ησετε", "ησουν", "αμε", "ατε", "αν",
        "εισ", "ει", "ειν", "ου", "ησ", "ασ", "οσ", "ων", "οι", "εσ", "α", "η", "ο", "ω", "ι", "υ"
    ]
    for suf in suffixes:
        if word.endswith(suf):
            stem = word[:-len(suf)]
            if len(stem) >= 3:
                return stem
    return word

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

def parse_textbook_tokens(path):
    if not os.path.exists(path):
        print(f"Warning: textbook path not found {path}")
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

# Google Translation function
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
        # Fallback to English if translation fails
        return english_text

def main():
    load_translation_cache()
    print(f"Loaded {len(translation_cache)} cached translations.")
    
    print("Parsing glossaries...")
    a1_glossary = parse_a1_glossary_pdf()
    a2_glossary = parse_a2_glossary_md()
    
    print("Parsing textbooks...")
    a1_a_pages = parse_textbook_tokens(A1_A_PATH)
    a1_b_pages = parse_textbook_tokens(A1_B_PATH)
    a2_pages = parse_textbook_tokens(A2_PATH)
    
    # Filter A1 single letters
    a1_clean = [w for w in a1_glossary if len(normalize_greek(get_clean_greek_base(w["word_greek"]))) > 1]
    
    # ------------------
    # Step 1: Map A1 Words
    # ------------------
    print("Mapping A1 words...")
    a1_mapped = []
    
    for item in a1_clean:
        greek_base = get_clean_greek_base(item["greek_raw"])
        norm_base = normalize_greek(greek_base)
        stem = get_greek_stem(greek_base)
        
        mapped_to = None
        
        # 1. Textbook exact search
        for book_id, book_pages in [("a1-a", a1_a_pages), ("a1-b", a1_b_pages)]:
            for p, tokens in sorted(book_pages.items()):
                if norm_base in tokens:
                    mapped_to = (book_id, get_unit_for_page(book_id, p), p, "textbook_exact")
                    break
            if mapped_to: break
            
        # 2. Textbook stem search
        if not mapped_to:
            for book_id, book_pages in [("a1-a", a1_a_pages), ("a1-b", a1_b_pages)]:
                for p, tokens in sorted(book_pages.items()):
                    for tok in tokens:
                        if tok.startswith(stem) and len(tok) <= len(stem) + 4:
                            mapped_to = (book_id, get_unit_for_page(book_id, p), p, "textbook_stem")
                            break
                    if mapped_to: break
                if mapped_to: break
                
        # 3. Semantic keyword search
        if not mapped_to:
            eng_lower = item["word_english"].lower()
            for u, kws in unit_keywords.items():
                for kw in kws:
                    if re.search(r'\b' + re.escape(kw) + r'\b', eng_lower):
                        book_id = "a1-a" if u <= 15 else "a1-b"
                        p_start = a1_a_ranges.get(u, (58, 65))[0] if u <= 15 else a1_b_ranges.get(u, (6, 17))[0]
                        mapped_to = (book_id, u, p_start, "semantic")
                        break
                if mapped_to: break
                
        if mapped_to:
            a1_mapped.append({
                "item": item,
                "book_id": mapped_to[0],
                "unit": mapped_to[1],
                "page_number": mapped_to[2],
                "match_type": mapped_to[3]
            })
            
    mapped_keys = set(w["item"]["word_greek"] for w in a1_mapped)
    a1_unmapped = [w for w in a1_clean if w["word_greek"] not in mapped_keys]
    
    print(f"A1 mapped: {len(a1_mapped)}, unmapped: {len(a1_unmapped)}")
    
    # Distribute unmapped A1 words to the final review unit of A1-B (Unit 30) instead of randomly
    for idx, item in enumerate(a1_unmapped):
        book_id = "a1-b"
        unit = 30
        p_start = a1_b_ranges.get(unit, (169, 175))[0]
        a1_mapped.append({
            "item": item,
            "book_id": book_id,
            "unit": unit,
            "page_number": p_start,
            "match_type": "fallback_end_of_book"
        })
        
    # ------------------
    # Step 2: Map A2 Words (Filter duplicates from A1)
    # ------------------
    print("Mapping A2 words...")
    a1_norm_set = set(normalize_greek(get_clean_greek_base(w["item"]["word_greek"])) for w in a1_mapped)
    
    a2_filtered = []
    for item in a2_glossary:
        greek_base = get_clean_greek_base(item["word_greek"])
        norm_base = normalize_greek(greek_base)
        if len(norm_base) <= 1:
            continue
        if norm_base not in a1_norm_set:
            a2_filtered.append(item)
            
    print(f"A2 remaining unique words after duplicate filtering: {len(a2_filtered)}")
    
    a2_mapped = []
    for item in a2_filtered:
        greek_base = get_clean_greek_base(item["word_greek"])
        norm_base = normalize_greek(greek_base)
        stem = get_greek_stem(greek_base)
        
        mapped_to = None
        
        # 1. Textbook exact search
        for p, tokens in sorted(a2_pages.items()):
            if norm_base in tokens:
                mapped_to = (get_unit_for_page("a2", p), p, "textbook_exact")
                break
                
        # 2. Textbook stem search
        if not mapped_to:
            for p, tokens in sorted(a2_pages.items()):
                for tok in tokens:
                    if tok.startswith(stem) and len(tok) <= len(stem) + 4:
                        mapped_to = (get_unit_for_page("a2", p), p, "textbook_stem")
                        break
                if mapped_to: break
                
        # 3. Semantic keywords search
        if not mapped_to:
            eng_lower = item["word_english"].lower()
            for u, kws in a2_keywords.items():
                for kw in kws:
                    if re.search(r'\b' + re.escape(kw) + r'\b', eng_lower):
                        p_start = a2_ranges.get(u, (4, 13))[0]
                        mapped_to = (u, p_start, "semantic")
                        break
                if mapped_to: break
                
        if mapped_to:
            a2_mapped.append({
                "item": item,
                "book_id": "a2",
                "unit": mapped_to[0],
                "page_number": mapped_to[1],
                "match_type": mapped_to[2]
            })
            
    a2_mapped_keys = set(w["item"]["word_greek"] for w in a2_mapped)
    a2_unmapped = [w for w in a2_filtered if w["word_greek"] not in a2_mapped_keys]
    
    print(f"A2 mapped: {len(a2_mapped)}, unmapped: {len(a2_unmapped)}")
    
    # Distribute unmapped A2 words to the final review unit of A2 (Unit 39)
    for idx, item in enumerate(a2_unmapped):
        unit = 39
        p_start = a2_ranges.get(unit, (142, 148))[0]
        a2_mapped.append({
            "item": item,
            "book_id": "a2",
            "unit": unit,
            "page_number": p_start,
            "match_type": "fallback_end_of_book"
        })

    # ------------------
    # Step 3: Combine and format output
    # ------------------
    print("Formatting and translating to Chinese...")
    all_compiled = []
    next_id = 1
    
    combined_list = a1_mapped + a2_mapped
    total_to_process = len(combined_list)
    
    seen_bases = set()
    
    for idx, entry in enumerate(combined_list):
        item = entry["item"]
        book_id = entry["book_id"]
        unit = entry["unit"]
        page_number = entry["page_number"]
        
        greek = item["word_greek"]
        clean_base = get_clean_greek_base(greek)
        norm_base = normalize_greek(clean_base)
        
        if norm_base in seen_bases:
            continue
        seen_bases.add(norm_base)
        
        greek = item["word_greek"]
        english = item["word_english"]
        chinese = translate_to_chinese(english)
        pronunciation = transliterate_greek(get_clean_greek_base(greek))
        
        # Example sentences
        clean_base = get_clean_greek_base(greek)
        example_greek = f"Αυτό είναι {clean_base}."
        example_chinese = f"这是 {chinese}。"
        if "to " in english.lower() or english.lower().startswith("to"):
            example_greek = f"Θέλω να {clean_base}."
            example_chinese = f"我想 {chinese}。"
            
        all_compiled.append({
            "id": next_id,
            "book_id": book_id,
            "unit": unit,
            "page_number": page_number,
            "word_greek": greek,
            "word_chinese": chinese,
            "pronunciation": pronunciation,
            "example_greek": example_greek,
            "example_chinese": example_chinese
        })
        next_id += 1
        
        if next_id % 200 == 0:
            print(f"Processed {next_id}/{total_to_process} words...")
            save_translation_cache() # Save cache periodically
            
    save_translation_cache()
    print("Saving to frontend JSON...")
    
    # Save to vocabulary.json
    with open(VOCAB_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "master_glossary": [],
            "textbook_vocabulary": all_compiled
        }, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully wrote {len(all_compiled)} words to {VOCAB_JSON_PATH}")
    
    # Save to SQLite DB
    print("Seeding SQLite database...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Clear old vocabulary
    cursor.execute("DELETE FROM vocabulary")
    
    # Insert new vocabulary
    for w in all_compiled:
        cursor.execute("""
            INSERT INTO vocabulary (id, book_id, unit, page_number, word_greek, word_chinese, pronunciation, example_greek, example_chinese)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            w["id"], w["book_id"], w["unit"], w["page_number"], 
            w["word_greek"], w["word_chinese"], w["pronunciation"], 
            w["example_greek"], w["example_chinese"]
        ))
        
    conn.commit()
    conn.close()
    print(f"Successfully seeded SQLite database with {len(all_compiled)} words.")

if __name__ == "__main__":
    main()

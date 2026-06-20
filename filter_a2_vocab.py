import os
import re
import json
import sqlite3

PROJECT_DIR = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach"
VOCAB_JSON_PATH = os.path.join(PROJECT_DIR, "frontend", "src", "data", "vocabulary.json")
DB_PATH = os.path.join(PROJECT_DIR, "backend", "greek_coach.db")
GLOSSARY_MD_PATH = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/KLIK_A2_Ef_Glossary.md"
TEXTBOOK_MD_PATH = os.path.join(PROJECT_DIR, "materials", "（已压缩）LEON_S_GREEK_TEXTBOOK_A2.md")

a2_ranges = {
    31: (4, 13), 32: (14, 23), 33: (24, 33), 34: (34, 43), 35: (44, 53),
    36: (54, 63), 37: (64, 73), 38: (74, 83), 39: (84, 93), 40: (94, 103),
    41: (104, 113), 42: (114, 123), 43: (124, 133), 44: (134, 141), 45: (142, 148)
}

def get_unit_for_page(page):
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

# Phonetic transliteration helper
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

# Keywords
unit_keywords = {
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
    34: ["housing", "rent", "apartment", "flat", "room", "bedroom", "living room", "kitchen", "bathroom", "balcony", 
         "floor", "wall", "renting", "landlord", "tenant", "price", "contract", "furniture", "table", "chair", "bed", 
         "sofa", "wardrobe", "cupboard", "lamp", "appliance", "fridge", "oven", "washing machine", "closet"],
    35: ["healthy", "nutrition", "diet", "food", "eat", "drink", "meal", "breakfast", "lunch", "dinner", "snack", 
         "fruit", "vegetable", "apple", "banana", "orange", "grape", "tomato", "potato", "onion", "garlic", "salad", 
         "meat", "chicken", "beef", "fish", "milk", "water", "juice", "bread", "cheese", "egg", "sugar", "salt", "oil"],
    36: ["cook", "cooking", "kitchen", "recipe", "ingredient", "pot", "pan", "knife", "fork", "spoon", "plate", 
         "glass", "cup", "bowl", "boil", "fry", "bake", "grill", "mix", "cut", "add", "prepare", "taste", "delicious", 
         "sweet", "sour", "salty", "bitter", "spicy"],
    37: ["job", "work", "career", "profession", "occupation", "resume", "cv", "interview", "application", "apply", 
         "hire", "fire", "boss", "manager", "employee", "salary", "wage", "office", "company", "business", "doctor", 
         "teacher", "engineer", "lawyer", "writer", "artist", "nurse", "pilot", "driver"],
    38: ["phone", "telephone", "call", "mobile", "message", "email", "post office", "letter", "stamp", "package", 
         "bank", "account", "money", "card", "cash", "service", "customer", "support", "help", "information", 
         "library", "museum", "police", "fire station"],
    39: ["emotion", "feeling", "feel", "think", "thought", "opinion", "view", "agree", "disagree", "happy", "sad", 
         "angry", "afraid", "scared", "worried", "anxious", "excited", "bored", "surprised", "confused", "tired", 
         "sleepy", "dream", "hope", "wish", "believe", "know", "understand", "forget", "remember"],
    40: ["travel", "trip", "journey", "holiday", "vacation", "tourist", "guide", "sight", "attraction", "museum", 
         "monument", "history", "culture", "tradition", "country", "greece", "athens", "hotel", "passport", "ticket", 
         "luggage", "baggage", "flight", "plane", "train", "boat", "ship", "beach", "sea"],
    41: ["accident", "emergency", "problem", "danger", "hurt", "pain", "injury", "broken", "cut", "wound", "blood", 
         "sick", "ill", "illness", "disease", "fever", "cold", "flu", "cough", "headache", "toothache", "doctor", 
         "dentist", "nurse", "hospital", "pharmacy", "medicine", "pill", "cure", "help", "rescue", "save"],
    42: ["entertainment", "fun", "leisure", "hobby", "music", "song", "sing", "dance", "instrument", "guitar", 
         "piano", "play", "game", "toy", "movie", "film", "cinema", "theatre", "play", "actor", "actress", "art", 
         "painting", "drawing", "book", "read", "story", "novel"],
    43: ["news", "media", "newspaper", "magazine", "article", "report", "reporter", "journalist", "television", 
         "tv", "radio", "broadcast", "internet", "website", "social media", "post", "video", "information", "press"],
    44: ["party", "celebration", "festival", "holiday", "birthday", "wedding", "anniversary", "invite", "invitation", 
         "guest", "host", "celebrate", "congratulate", "gift", "present", "cake", "balloon", "gathering", "meet", "welcome"],
    45: ["review", "exam", "test", "study", "learn", "grammar", "vocabulary", "word", "sentence", "text", "exercise", 
         "question", "answer", "correct", "wrong", "mistake", "mark", "grade", "school", "university", "college", 
         "lesson", "class"]
}

def classify_word_locally(english):
    eng_lower = english.lower()
    for u, keywords in unit_keywords.items():
        for kw in keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', eng_lower):
                return u
    return None

def main():
    # Load A1 vocabulary set
    with open(VOCAB_JSON_PATH, "r", encoding="utf-8") as f:
        vocab_json_data = json.load(f)
    existing_vocab = vocab_json_data.get("textbook_vocabulary", [])
    
    a1_words = [w for w in existing_vocab if w.get("book_id") in ["a1-a", "a1-b"]]
    a1_set = set()
    for w in a1_words:
        # Clean up brackets & get base word
        clean = re.sub(r'\(.*?\)', '', w["word_greek"]).strip()
        clean_base = clean.split(",")[0].strip()
        a1_set.add(normalize_greek(clean_base))
        
    print(f"Loaded {len(a1_set)} unique A1 words from existing database.")

    # Load A2 Glossary
    words = []
    with open(GLOSSARY_MD_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    pattern = re.compile(r"^\*\s+\*\*([^*]+)\*\*\s*=\s*(.+)$")
    for line in lines:
        line = line.strip()
        match = pattern.match(line)
        if match:
            greek_raw = match.group(1).strip()
            english = match.group(2).strip()
            greek_clean = re.sub(r'\(.*?\)', '', greek_raw).strip()
            greek_clean_base = greek_clean.split(",")[0].strip()
            
            # Skip single letters or alphabet definitions
            if len(greek_clean_base) <= 1:
                continue
                
            article = ""
            parts = greek_clean.split(",")
            if len(parts) > 1:
                article = parts[1].strip()
                
            words.append({
                "raw": greek_raw,
                "clean_base": greek_clean_base,
                "article": article,
                "english": english
            })

    # Filter out duplicate A1 words
    a2_only_words = []
    filtered_count = 0
    for w in words:
        norm_base = normalize_greek(w["clean_base"])
        if norm_base in a1_set:
            filtered_count += 1
        else:
            a2_only_words.append(w)
            
    print(f"Total entries in A2 glossary: {len(words)}")
    print(f"Filtered out {filtered_count} duplicate A1 words.")
    print(f"Remaining unique A2-specific words: {len(a2_only_words)}")

    # Load A2 Textbook Pages
    pages = parse_textbook()
    norm_pages = {p: normalize_greek(text) for p, text in pages.items()}
    
    mapped_words = {}
    
    # Map by Textbook Occurrence
    for w in a2_only_words:
        clean_word = normalize_greek(w["clean_base"])
        first_unit = None
        for p in sorted(norm_pages.keys()):
            if clean_word in norm_pages[p]:
                unit = get_unit_for_page(p)
                if unit:
                    first_unit = unit
                    break
        if first_unit:
            mapped_words[w["raw"]] = first_unit

    print(f"Textbook matched: {len(mapped_words)} / {len(a2_only_words)} words.")

    # Map by Semantic Keywords
    unmapped_words = [w for w in a2_only_words if w["raw"] not in mapped_words]
    keyword_mapping = {}
    for w in unmapped_words:
        unit = classify_word_locally(w["english"])
        if unit:
            keyword_mapping[w["raw"]] = unit
            
    print(f"Locally classified via keywords: {len(keyword_mapping)} words.")

    # Fallback distribution
    remaining_words = [w for w in unmapped_words if w["raw"] not in keyword_mapping]
    fallback_mapping = {}
    for idx, w in enumerate(remaining_words):
        unit = 31 + (idx % 15)
        fallback_mapping[w["raw"]] = unit
        
    print(f"Sequential fallback distributed: {len(remaining_words)} words.")

    # Merge mappings
    final_mapping = {}
    for w in a2_only_words:
        raw = w["raw"]
        if raw in mapped_words:
            final_mapping[raw] = mapped_words[raw]
        elif raw in keyword_mapping:
            final_mapping[raw] = keyword_mapping[raw]
        else:
            final_mapping[raw] = fallback_mapping[raw]

    # Print final counts per unit
    counts = {}
    for gk, unit in final_mapping.items():
        counts[unit] = counts.get(unit, 0) + 1
    print("\nNew A2 mapped word counts per unit (No A1 duplicates):")
    for u in sorted(counts.keys()):
        print(f"Unit {u}: {counts[u]} words")

    # Translate cache loading
    translation_cache = {}
    TRANSLATION_CACHE_PATH = os.path.join(PROJECT_DIR, "backend", "translation_cache.json")
    if os.path.exists(TRANSLATION_CACHE_PATH):
        try:
            with open(TRANSLATION_CACHE_PATH, "r", encoding="utf-8") as f:
                translation_cache = json.load(f)
        except:
            pass

    compiled_words = []
    next_id = 2000
    
    for w in a2_only_words:
        raw = w["raw"]
        unit = final_mapping[raw]
        p_start, p_end = a2_ranges.get(unit, (4, 148))
        page_spread = p_end - p_start + 1
        page_number = p_start + (next_id % page_spread)
        
        greek = w["raw"]
        english = w["english"]
        chinese = translation_cache.get(english, english)
        pronunciation = transliterate_greek(w["clean_base"])
        
        example_greek = f"Αυτό είναι {w['clean_base']}."
        example_chinese = f"这是 {chinese}。"
        if "to " in english.lower() or english.lower().startswith("to"):
            example_greek = f"Θέλω να {w['clean_base']}."
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

    # Filter out existing A2 entries to prevent duplicates in JSON
    cleaned_textbook_vocab = [item for item in existing_vocab if item.get("book_id") != "a2"]
    vocab_json_data["textbook_vocabulary"] = cleaned_textbook_vocab + compiled_words
    
    with open(VOCAB_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(vocab_json_data, f, ensure_ascii=False, indent=2)
        
    print(f"\nSuccessfully wrote {len(compiled_words)} UNIQUE A2 words to {VOCAB_JSON_PATH}.")

    # Seed SQLite Database
    if os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM vocabulary WHERE book_id = 'a2'")
        for w in compiled_words:
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
        print(f"Successfully seeded {len(compiled_words)} unique A2 words to SQLite database.")

def parse_textbook():
    with open(TEXTBOOK_MD_PATH, "r", encoding="utf-8") as f:
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
            for p in range(start_p, end_p + 1):
                pages[p] = text
    return pages

if __name__ == "__main__":
    main()

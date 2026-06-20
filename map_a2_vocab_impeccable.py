import os
import re
import json
import time
import sqlite3
import google.generativeai as genai
from dotenv import load_dotenv

PROJECT_DIR = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach"
GLOSSARY_MD_PATH = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/KLIK_A2_Ef_Glossary.md"
TEXTBOOK_MD_PATH = os.path.join(PROJECT_DIR, "materials", "（已压缩）LEON_S_GREEK_TEXTBOOK_A2.md")
VOCAB_JSON_PATH = os.path.join(PROJECT_DIR, "frontend", "src", "data", "vocabulary.json")
DB_PATH = os.path.join(PROJECT_DIR, "backend", "greek_coach.db")

load_dotenv(os.path.join(PROJECT_DIR, ".env"))
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    load_dotenv(os.path.join(PROJECT_DIR, "backend", ".env"))
    api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY not configured.")

genai.configure(api_key=api_key)

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

def parse_glossary_words():
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
            
            # Clean up greek raw word
            greek_clean = re.sub(r'\(.*?\)', '', greek_raw).strip()
            greek_clean_base = greek_clean.split(",")[0].strip()
            
            # Extract article if present
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
    return words

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

# Transliteration helper
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

def classify_chunk_via_gemini(words_chunk):
    prompt = f"""
You are a helpful assistant specialized in Greek language education.
Please classify the following list of Greek-English vocabulary words into the most appropriate learning units (from 31 to 45) based on their meaning and themes:
31: 人物特征与性格描述 (People descriptions, appearance, height, hair, character, family relations, occupations/roles)
32: 城市生活与乡村对比 (City vs country, places, roads, nature, traffic, village)
33: 天气预测与未来计划 (Weather, seasons, future plans, tense, time, travel)
34: 房屋租赁与居住空间 (Housing, rent, furniture, rooms)
35: 健康饮食与营养搭配 (Food, drinks, healthy eating)
36: 市场购物与厨房烹饪 (Cooking, kitchen, market, ingredients)
37: 职业选择、简历与面试 (Jobs, occupations, resume, interview)
38: 电话沟通与日常服务 (Communication, phone, services, post office, bank)
39: 情感表达与个人观点 (Emotions, feelings, opinions, thoughts)
40: 旅游体验与文化名胜 (Travel, culture, sights, museums, countries)
41: 突发意外、问题与救助 (Accidents, emergencies, illnesses, doctors)
42: 休闲娱乐、电影与戏剧 (Entertainment, movies, theatre, music, games)
43: 新闻媒体与信息渠道 (News, media, newspaper, tv, radio)
44: 节日派对与聚会邀请 (Parties, festivals, invitations, celebrations)
45: A2级别冲刺与真题演练 (General academic, grammar terms, exam preps, abstract words that don't fit other themes)

Words to classify:
{json.dumps(words_chunk, ensure_ascii=False, indent=2)}

Return ONLY a valid JSON object mapping each raw Greek word to its classified unit number. Do not include markdown code fences or backticks. Example format:
{{
  "αγαθός, -ή, -ό": 31,
  "αγγίζω (verb)": 39
}}
"""
    for attempt in range(3):
        try:
            model = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(prompt)
            if response and response.text:
                text = response.text.strip()
                if text.startswith("```json"):
                    text = text[7:]
                if text.startswith("```"):
                    text = text[3:]
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()
                return json.loads(text)
        except Exception as e:
            print(f"Error on attempt {attempt+1}: {e}")
            time.sleep(5)
    return {}

def main():
    words = parse_glossary_words()
    pages = parse_textbook()
    
    print(f"Loaded {len(words)} glossary words.")
    print(f"Loaded {len(pages)} textbook pages.")
    
    # 1. Page-based search mapping
    norm_pages = {p: normalize_greek(text) for p, text in pages.items()}
    mapped_words = {}
    
    print("Step 1: Mapping words based on textbook text occurrences...")
    for w in words:
        clean_word = normalize_greek(w["clean_base"])
        if len(clean_word) < 2:
            continue
            
        first_unit = None
        for p in sorted(norm_pages.keys()):
            if clean_word in norm_pages[p]:
                unit = get_unit_for_page(p)
                if unit:
                    first_unit = unit
                    break
        if first_unit:
            mapped_words[w["raw"]] = first_unit
            
    print(f"Textbook matched: {len(mapped_words)} / {len(words)} words.")
    
    # 2. Semantic mapping for the remainder via Gemini
    unmapped_words = [w for w in words if w["raw"] not in mapped_words]
    print(f"Step 2: Classifying the remaining {len(unmapped_words)} words via Gemini...")
    
    chunk_size = 80
    gemini_mapping = {}
    
    for i in range(0, len(unmapped_words), chunk_size):
        chunk = unmapped_words[i:i+chunk_size]
        print(f"Processing batch {i//chunk_size + 1} / {len(unmapped_words)//chunk_size + 1} (size {len(chunk)})...")
        
        chunk_data = [{w["raw"]: w["english"]} for w in chunk]
        # Flatten list of dicts to a single dict for cleaner input
        chunk_dict = {}
        for w in chunk:
            chunk_dict[w["raw"]] = w["english"]
            
        batch_mapping = classify_chunk_via_gemini(chunk_dict)
        if batch_mapping:
            print(f"  Received classification for {len(batch_mapping)} words.")
            for gk, u in batch_mapping.items():
                try:
                    unit = int(u)
                    if 31 <= unit <= 45:
                        gemini_mapping[gk] = unit
                except:
                    pass
        else:
            print("  Warning: Empty response or error on batch.")
            
        time.sleep(3) # rate limiting protection
        
    # Merge mappings
    final_mapping = {}
    for w in words:
        raw = w["raw"]
        if raw in mapped_words:
            final_mapping[raw] = mapped_words[raw]
        elif raw in gemini_mapping:
            final_mapping[raw] = gemini_mapping[raw]
        else:
            # Fallback to Unit 45 (general review)
            final_mapping[raw] = 45
            
    # Print final counts per unit
    counts = {}
    for gk, unit in final_mapping.items():
        counts[unit] = counts.get(unit, 0) + 1
    print("\nFinal mapped word counts per unit:")
    for u in sorted(counts.keys()):
        print(f"Unit {u}: {counts[u]} words")
        
    # Translate and build compiled vocabulary entries
    # Load translation cache
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
    
    for w in words:
        raw = w["raw"]
        unit = final_mapping[raw]
        
        # Determine page number based on unit distribution
        p_start, p_end = a2_ranges.get(unit, (4, 148))
        page_spread = p_end - p_start + 1
        page_number = p_start + (next_id % page_spread)
        
        greek = w["raw"]
        english = w["english"]
        chinese = translation_cache.get(english, english)
        pronunciation = transliterate_greek(w["clean_base"])
        
        # Examples
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
        
    # Write to vocabulary.json
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
    
if __name__ == "__main__":
    main()

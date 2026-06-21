import os
import re
import json
import sqlite3
import fitz
import urllib.parse
import urllib.request
import time
import google.generativeai as genai
from dotenv import load_dotenv

PROJECT_DIR = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach"
A1_A_PATH = os.path.join(PROJECT_DIR, "materials", "（已压缩）LEON_S_GREEK_TEXTBOOK_A1-A.md")
A1_B_PATH = os.path.join(PROJECT_DIR, "materials", "（已压缩）LEON_S_GREEK_TEXTBOOK_A1-B.md")
A2_PATH = os.path.join(PROJECT_DIR, "materials", "（已压缩）LEON_S_GREEK_TEXTBOOK_A2.md")
A1_GLOSSARY_PATH = os.path.join(PROJECT_DIR, "materials", "Glossary_A1_kids.pdf")
A2_GLOSSARY_PATH = os.path.join(PROJECT_DIR, "materials", "KLIK_A2_Ef_Glossary.md")
VOCAB_JSON_PATH = os.path.join(PROJECT_DIR, "frontend", "src", "data", "vocabulary.json")
DB_PATH = os.path.join(PROJECT_DIR, "backend", "greek_coach.db")
TRANSLATION_CACHE_PATH = os.path.join(PROJECT_DIR, "backend", "translation_cache.json")

# Load environment variables for Gemini API
load_dotenv(os.path.join(PROJECT_DIR, ".env"))
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    load_dotenv(os.path.join(PROJECT_DIR, "backend", ".env"))
    api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("Warning: GEMINI_API_KEY not configured. Gemini semantic classification will fallback to Unit 1/31.")
else:
    genai.configure(api_key=api_key)

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

def get_possible_stems(word):
    word = normalize_greek(word)
    if len(word) <= 3:
        return [word]
    stems = {word}
    
    # Remove common verb endings
    verb_endings = ["ομαι", "εσαι", "εται", "ομαστε", "εστε", "ονται", "αω", "εω", "ω", "ει"]
    for ending in verb_endings:
        if word.endswith(ending):
            root = word[:-len(ending)]
            if len(root) >= 3:
                stems.add(root)
                # ζ -> σ variation (e.g. αγοράζω -> αγοράσω)
                if root.endswith("ζ"):
                    stems.add(root[:-1] + "σ")
                # φ -> ψ variation (e.g. γράφω -> γράψω)
                elif root.endswith("φ"):
                    stems.add(root[:-1] + "ψ")
                # π -> ψ variation (e.g. βλέπω -> βλέψω)
                elif root.endswith("π"):
                    stems.add(root[:-1] + "ψ")
                # τ/θ/δ -> σ variation (e.g. πείθω -> πείσω)
                elif root.endswith("θ") or root.endswith("τ") or root.endswith("δ"):
                    stems.add(root[:-1] + "σ")
            break
            
    # Remove common noun endings
    noun_endings = ["ος", "η", "o", "α", "ης", "ας", "ες", "ου", "ων", "οι", "ατα", "μα"]
    for ending in noun_endings:
        if word.endswith(ending):
            root = word[:-len(ending)]
            if len(root) >= 3:
                stems.add(root)
            break
            
    # Spelling variants (such as au/av/ab, sister/brother spellings)
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

CLASSIFICATION_CACHE_PATH = os.path.join(PROJECT_DIR, "backend", "gemini_classification_cache.json")
classification_cache = {}

def load_classification_cache():
    global classification_cache
    if os.path.exists(CLASSIFICATION_CACHE_PATH):
        try:
            with open(CLASSIFICATION_CACHE_PATH, "r", encoding="utf-8") as f:
                classification_cache = json.load(f)
            print(f"Loaded {len(classification_cache)} cached Gemini classifications.")
        except Exception as e:
            print("Error loading classification cache:", e)

def save_classification_cache():
    try:
        with open(CLASSIFICATION_CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(classification_cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print("Error saving classification cache:", e)

def classify_unmapped_gemini(unmapped_list, book_type):
    if not api_key:
        print("No API key available, using default unit fallback.")
        return {w["word_greek"]: (1 if book_type == "A1" else 31) for w in unmapped_list}

    A1_THEMATIC_UNITS = """
1: 问候与自我介绍 (Greetings & self-introduction, basics, being, names)
2: 数字、国家与国籍 (Numbers 1-10, countries, nationalities, origins, where)
3: 日常活动与常见动词 (Daily activities, verbs like read, write, run, speak, listen)
4: 学校课堂与文具物品 (School objects, classroom, stationery)
5: 星期时间与课程表 (Days of the week, school subjects, basic time)
6: 玩具、游戏与玩耍 (Toys, games, childhood playing)
7: 家庭成员与亲属 (Family members, relatives)
8: 颜色服装与外貌描述 (Colors, basic clothing, physical description)
9: 动物王国与童话故事 (Animals, birds, fairy tales, kings, queens)
10: 日常作息与时间表达 (Daily routines, meals, telling time, daily actions)
11: 房子房间与布局描述 (House parts, rooms, garden)
12: 家具陈设与空间方位 (Furniture, appliances, prepositions of place like on, under, in)
13: 城市生活与公共场所 (City spots, shops, bank, post office, church)
15: 马戏团与娱乐表演 (Circus, clowns, performance, show)
16: 天气气候与四季变化 (Weather, seasons, rain, snow, temperature)
17: 饮食习惯、食物与饮料 (Food items, drinks, dairy, meat, fruit, vegetables)
18: 日常服装与穿戴搭配 (Detailed clothing, shopping for clothes)
19: 身体部位与健康医疗 (Body parts, illness, medicine, health)
20: 体育运动、游戏与休闲 (Sports, hobbies, games, recreation)
21: 旅行度假与交通出行 (Travel, transport, vehicles, hotels, holidays)
22: 商场购物、价格与金钱 (Shopping, prices, money, shopping actions)
23: 各行各业与职业工作 (Jobs, occupations, work places)
24: 大自然、动植物与环境 (Nature, plants, trees, environment, geography)
25: 节日庆典与美好祝愿 (Festivals, holidays, wishes, birthday, Christmas)
26: 饮食与健康生活 (Nutrition, diet, healthy lifestyles)
27: 闲暇时光与兴趣爱好 (Free time, hobbies, leisure, entertainment)
28: 日常生活与社区服务 (Common daily services, community, public institutions)
29: 朋友社交与人际交往 (Friendship, relationships, communication)
"""

    A2_THEMATIC_UNITS = """
31: 我与他人 (Self & others: detailed appearance description, character/personality traits, family relationships, occupations/roles)
32: 广告时间 (Advertising: publicity, slogans, marketing words)
33: 阳光明媚！我们去散步吗？ (Weather & Future: climate, seasons, plans, forecasts, travel)
35: 节日快乐！ (Holidays & Services: celebrations, bank/post office transactions, public services, wishes)
36: 健康第一！ (Health & Living: nutrition, diet, body/health issues, housing, renting, furniture)
37: 读书与学习！ (Education & Jobs: school, study, lessons, careers, interviews)
"""

    units_desc = A1_THEMATIC_UNITS if book_type == "A1" else A2_THEMATIC_UNITS
    allowed_range = "1 to 29 (excluding 14)" if book_type == "A1" else "31 to 37 (excluding 34)"

    # Identify which words are already cached
    to_classify = []
    for w in unmapped_list:
        cache_key = f"{book_type}:{w['word_greek']}"
        if cache_key not in classification_cache:
            to_classify.append(w)

    if to_classify:
        print(f"Found {len(to_classify)} words to classify via Gemini for {book_type} (out of {len(unmapped_list)} total).")
        # Batch process in sizes of 80
        chunk_size = 80
        for i in range(0, len(to_classify), chunk_size):
            chunk = to_classify[i:i+chunk_size]
            print(f"Classifying {book_type} batch {i//chunk_size + 1} / {(len(to_classify)-1)//chunk_size + 1} (size {len(chunk)})...")
            
            # Build id payload
            id_to_word = {}
            words_payload = {}
            for idx, w in enumerate(chunk):
                w_id = f"w{idx}"
                id_to_word[w_id] = w["word_greek"]
                words_payload[w_id] = {
                    "greek": w["word_greek"],
                    "english": w["word_english"]
                }
            
            prompt = f"""
You are a helpful assistant specialized in Greek language education.
Please classify the following list of Greek-English vocabulary words into the most appropriate thematic learning units based on their meaning and themes:
{units_desc}

Strictly map each word's ID ONLY to one of the units listed above.
Allowed units range: {allowed_range}.
Do NOT classify into review units (14, 30, 34, 38, 39).

Words to classify:
{json.dumps(words_payload, ensure_ascii=False, indent=2)}

Return ONLY a valid JSON object mapping each ID (e.g. "w0", "w1", etc.) to its classified unit number. Do not include markdown code fences or backticks. Example format:
{{
  "w0": 31,
  "w1": 36
}}
"""
            success = False
            for attempt in range(5):
                try:
                    model = genai.GenerativeModel('gemini-flash-latest')
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
                        
                        batch_map = json.loads(text)
                        valid_count = 0
                        for w_id, u in batch_map.items():
                            greek_word = id_to_word.get(w_id)
                            if not greek_word:
                                continue
                            try:
                                unit = int(u)
                                # Validate allowed range
                                if book_type == "A1" and (1 <= unit <= 29) and unit != 14:
                                    cache_key = f"{book_type}:{greek_word}"
                                    classification_cache[cache_key] = unit
                                    valid_count += 1
                                elif book_type == "A2" and (31 <= unit <= 37) and unit != 34:
                                    cache_key = f"{book_type}:{greek_word}"
                                    classification_cache[cache_key] = unit
                                    valid_count += 1
                            except:
                                pass
                        
                        print(f"Successfully classified {valid_count} / {len(chunk)} words in batch.")
                        success = True
                        save_classification_cache()
                        break
                except Exception as e:
                    print(f"Error on attempt {attempt+1} for batch: {e}")
                    sleep_time = 45 if "429" in str(e) or "Quota" in str(e) else 15
                    print(f"Sleeping for {sleep_time} seconds before retry...")
                    time.sleep(sleep_time)
            
            if not success:
                print(f"Warning: Failed to classify batch starting at index {i} after 5 attempts.")
                time.sleep(10)
            else:
                # Sleep between successful requests to respect rate limits
                print("Sleeping 15 seconds to respect rate limits...")
                time.sleep(15)
    else:
        print(f"All {len(unmapped_list)} words for {book_type} are already cached. Skipping Gemini API calls.")

    # Build final mapping results from cache
    mapping_results = {}
    for w in unmapped_list:
        cache_key = f"{book_type}:{w['word_greek']}"
        fallback_unit = 1 if book_type == "A1" else 31
        mapping_results[w["word_greek"]] = classification_cache.get(cache_key, fallback_unit)

    return mapping_results

def main():
    load_classification_cache()
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
    print("Mapping A1 words based on first textbook occurrence...")
    a1_mapped = []
    a1_unmapped = []
    
    for item in a1_clean:
        greek_base = get_clean_greek_base(item["greek_raw"])
        stems = get_possible_stems(greek_base)
        
        mapped_to = None
        
        # Search page by page in ascending order to find the first page
        for book_id, book_pages in [("a1-a", a1_a_pages), ("a1-b", a1_b_pages)]:
            for p in sorted(book_pages.keys()):
                tokens = book_pages[p]
                # Check if any stem matches
                matched = False
                for stem in stems:
                    for tok in tokens:
                        if tok.startswith(stem) and len(tok) <= len(stem) + 3:
                            matched = True
                            break
                    if matched: break
                
                if matched:
                    mapped_to = (book_id, get_unit_for_page(book_id, p), p, "textbook_matched")
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
        else:
            a1_unmapped.append(item)
            
    print(f"A1 textbook matched: {len(a1_mapped)}, unmapped: {len(a1_unmapped)}")
    
    # Classify unmapped A1 words via Gemini
    if len(a1_unmapped) > 0:
        print("Classifying A1 unmapped words via Gemini...")
        a1_unmapped_formatted = [{"word_greek": w["word_greek"], "word_english": w["word_english"]} for w in a1_unmapped]
        a1_semantic_map = classify_unmapped_gemini(a1_unmapped_formatted, "A1")
        
        for item in a1_unmapped:
            gk = item["word_greek"]
            unit = a1_semantic_map.get(gk, 1) # fallback to unit 1 if missing
            book_id = "a1-a" if unit <= 15 else "a1-b"
            p_start = a1_a_ranges.get(unit, (58, 65))[0] if unit <= 15 else a1_b_ranges.get(unit, (6, 17))[0]
            
            a1_mapped.append({
                "item": item,
                "book_id": book_id,
                "unit": unit,
                "page_number": p_start,
                "match_type": "semantic_gemini"
            })
            
    # ------------------
    # Step 2: Map A2 Words (Filter duplicates from A1)
    # ------------------
    print("Mapping A2 words...")
    # Normalize set of A1 mapped words
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
    a2_unmapped = []
    
    for item in a2_filtered:
        greek_base = get_clean_greek_base(item["word_greek"])
        stems = get_possible_stems(greek_base)
        
        mapped_to = None
        
        # Search page by page in A2 textbook
        for p in sorted(a2_pages.keys()):
            tokens = a2_pages[p]
            matched = False
            for stem in stems:
                for tok in tokens:
                    if tok.startswith(stem) and len(tok) <= len(stem) + 3:
                        matched = True
                        break
                if matched: break
                
            if matched:
                mapped_to = (get_unit_for_page("a2", p), p, "textbook_matched")
                break
                
        if mapped_to:
            a2_mapped.append({
                "item": item,
                "book_id": "a2",
                "unit": mapped_to[0],
                "page_number": mapped_to[1],
                "match_type": mapped_to[2]
            })
        else:
            a2_unmapped.append(item)
            
    print(f"A2 textbook matched: {len(a2_mapped)}, unmapped: {len(a2_unmapped)}")
    
    # Classify unmapped A2 words via Gemini
    if len(a2_unmapped) > 0:
        print("Classifying A2 unmapped words via Gemini...")
        a2_unmapped_formatted = [{"word_greek": w["word_greek"], "word_english": w["word_english"]} for w in a2_unmapped]
        a2_semantic_map = classify_unmapped_gemini(a2_unmapped_formatted, "A2")
        
        for item in a2_unmapped:
            gk = item["word_greek"]
            unit = a2_semantic_map.get(gk, 31) # fallback to unit 31 if missing
            p_start = a2_ranges.get(unit, (4, 39))[0]
            
            a2_mapped.append({
                "item": item,
                "book_id": "a2",
                "unit": unit,
                "page_number": p_start,
                "match_type": "semantic_gemini"
            })
            
    # Add Unit 38 dummy word to prevent blank unit 38 display (1-word helper)
    # The user noted that Unit 38 review is 4-6. We can add a review helper word
    a2_mapped.append({
        "item": {
            "word_greek": "Ώρα για επανάληψη (Ενότητες 4-6)",
            "word_english": "Review time for units 4-6"
        },
        "book_id": "a2",
        "unit": 38,
        "page_number": a2_ranges[38][0],
        "match_type": "helper_review"
    })
    
    # Add Unit 39 dummy word to prevent blank unit 39 display (1-word helper)
    # Unit 39 is A2 final exams practice
    a2_mapped.append({
        "item": {
            "word_greek": "Εξετάσεις Ελληνομάθειας",
            "word_english": "A2 Level Exam Practice"
        },
        "book_id": "a2",
        "unit": 39,
        "page_number": a2_ranges[39][0],
        "match_type": "helper_review"
    })
    
    # ------------------
    # Step 3: Combine, deduplicate, and compile output
    # ------------------
    print("Combining lists and preparing outputs...")
    all_compiled = []
    next_id = 1
    seen_bases = set()
    
    combined_list = a1_mapped + a2_mapped
    
    for entry in combined_list:
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
        
        english = item["word_english"]
        chinese = translate_to_chinese(english)
        pronunciation = transliterate_greek(clean_base)
        
        # Example sentences
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
        
    save_translation_cache()
    print(f"Processed {len(all_compiled)} total unique words.")
    
    # Write to vocabulary.json
    print("Writing vocabulary.json...")
    with open(VOCAB_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "master_glossary": [],
            "textbook_vocabulary": all_compiled
        }, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully wrote {len(all_compiled)} words to {VOCAB_JSON_PATH}")
    
    # Seed SQLite DB
    print("Seeding SQLite database...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM vocabulary")
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
    print("Successfully seeded SQLite database.")
    
    # Print counts per unit for verification
    counts = {}
    for w in all_compiled:
        k = f"{w['book_id'].upper()} Unit {w['unit']}"
        counts[k] = counts.get(k, 0) + 1
        
    print("\nWord counts per unit:")
    for k in sorted(counts.keys()):
        print(f"  {k}: {counts[k]} words")

if __name__ == "__main__":
    main()

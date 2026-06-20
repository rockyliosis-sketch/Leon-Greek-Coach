import os
import re
import json
import time
import sqlite3
import google.generativeai as genai
from dotenv import load_dotenv

# Path configuration
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
MD_PATH = os.path.join(PROJECT_DIR, "materials", "（已压缩）LEON_S_GREEK_TEXTBOOK_A2.md")
PROGRESS_PATH = os.path.join(PROJECT_DIR, "materials", "a2_vocab_progress.json")
VOCAB_JSON_PATH = os.path.join(PROJECT_DIR, "frontend", "src", "data", "vocabulary.json")
DB_PATH = os.path.join(PROJECT_DIR, "backend", "greek_coach.db")

# Load environment variables
load_dotenv(os.path.join(PROJECT_DIR, ".env"))
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    # Try backend .env
    load_dotenv(os.path.join(PROJECT_DIR, "backend", ".env"))
    api_key = os.getenv("GEMINI_API_KEY")

if not api_key or api_key == "YOUR_GEMINI_API_KEY_HERE":
    raise ValueError("GEMINI_API_KEY is not set or is still the placeholder. Please set it in the .env file.")

genai.configure(api_key=api_key)

# Unit range mapping for A2
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

def call_gemini_with_retry(prompt, retries=3, delay=5):
    for i in range(retries):
        try:
            model = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(prompt)
            if response and response.text:
                return response.text
        except Exception as e:
            print(f"Error calling Gemini API (attempt {i+1}/{retries}): {e}")
            if i < retries - 1:
                time.sleep(delay)
    return None

def clean_json_response(text):
    if not text:
        return []
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    try:
        return json.loads(text)
    except Exception as e:
        print(f"Failed to parse JSON directly. Attempting regex extraction. Error: {e}")
        match = re.search(r'\[\s*\{.*\}\s*\]', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception as e2:
                print(f"Regex JSON extraction failed: {e2}")
        return []

def main():
    if not os.path.exists(MD_PATH):
        print(f"Error: A2 markdown textbook not found at {MD_PATH}")
        return

    print(f"Reading A2 OCR text from {MD_PATH}...")
    with open(MD_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    # Split markdown by pages
    sections = re.split(r'(## Book Page [^\n]+)', content)
    
    # Group sections by Unit
    unit_texts = {u: [] for u in range(31, 46)}
    for i in range(1, len(sections), 2):
        header = sections[i]
        text = sections[i+1] if i+1 < len(sections) else ""
        
        page_match = re.search(r'## Book Page (\d+)(?:-(\d+))?', header)
        if page_match:
            start_p = int(page_match.group(1))
            unit = get_unit_for_page(start_p)
            if unit:
                unit_texts[unit].append((header, text))

    # Load progress if exists
    progress_data = {}
    if os.path.exists(PROGRESS_PATH):
        try:
            with open(PROGRESS_PATH, "r", encoding="utf-8") as f:
                progress_data = json.load(f)
            print(f"Loaded existing progress. Already extracted units: {list(progress_data.keys())}")
        except Exception as e:
            print(f"Error loading progress file: {e}")

    # Process unit by unit
    for unit in range(31, 46):
        unit_str = str(unit)
        if unit_str in progress_data and len(progress_data[unit_str]) >= 10:
            print(f"Unit {unit} already extracted. Skipping.")
            continue

        print(f"\n=========================================")
        print(f"Extracting vocabulary for A2 Unit {unit}...")
        print(f"=========================================")

        # Assemble texts
        sections_list = unit_texts[unit]
        is_synthetic = False
        assembled_text = ""
        
        if not sections_list:
            print(f"Warning: No sections found for Unit {unit}. Generating synthetic curriculum words.")
            is_synthetic = True
        else:
            for header, text in sections_list:
                assembled_text += f"{header}\n{text}\n\n"

        if is_synthetic:
            prompt = f"""
You are a helpful assistant specialized in Greek language education for Chinese children. We do not have the textbook text for A2 Unit {unit}.
Please generate 15-20 standard Greek A2 vocabulary words, phrases, and expressions suitable for a child at this level (e.g., advanced topics, expressing opinions, plans, past experiences, hobbies).

For each word/phrase, provide:
1. 'word_greek': Standard Greek spelling (e.g. nouns with appropriate grammatical article like 'αγόρι, το', verbs in standard dictionary form).
2. 'word_chinese': Clear and accurate Chinese translation.
3. 'word_english': Accurate English translation.
4. 'pronunciation': Phonetic pronunciation approximation suited for a Chinese child (e.g., 'ka-li-me-ra').
5. 'example_greek': A simple, correct Greek example sentence using the word.
6. 'example_chinese': Chinese translation of the example sentence.

Return ONLY a valid JSON list of objects, without markdown code fences or backticks. Format:
[
  {{
    "word_greek": "...",
    "word_chinese": "...",
    "word_english": "...",
    "pronunciation": "...",
    "example_greek": "...",
    "example_chinese": "..."
  }}
]
"""
        else:
            prompt = f"""
You are a helpful assistant specialized in Greek language education for Chinese children. We have OCR-extracted text of Unit {unit} from a Greek textbook.
Please extract all core Greek vocabulary words, phrases, and expressions taught in this text.

Important: The source text has been extracted via Tesseract OCR and contains some spelling/character errors (e.g., mismatched characters or typos). You MUST:
1. Identify and correct these OCR spelling errors in the Greek text.
2. Provide the grammatically correct, standard Greek spelling in the output.
3. Provide nouns with their appropriate grammatical article if visible or standard (e.g. 'αγόρι, το').
4. Provide verbs in their standard dictionary form (1st person singular active indicative present).

For each extracted word/phrase, provide:
1. 'word_greek': The corrected, standard Greek spelling.
2. 'word_chinese': Clear and accurate Chinese translation.
3. 'word_english': Accurate English translation.
4. 'pronunciation': Phonetic pronunciation approximation suited for a Chinese child (e.g., 'ka-li-me-ra').
5. 'example_greek': A simple, correct Greek example sentence using the word.
6. 'example_chinese': Chinese translation of the example sentence.

Please extract between 15 and 25 core vocabulary terms for this unit.
Return ONLY a valid JSON list of objects, without markdown code fences or backticks. Format:
[
  {{
    "word_greek": "...",
    "word_chinese": "...",
    "word_english": "...",
    "pronunciation": "...",
    "example_greek": "...",
    "example_chinese": "..."
  }}
]

Here is the source text:
{assembled_text}
"""
        response_text = call_gemini_with_retry(prompt)
        words = clean_json_response(response_text)
        
        if words:
            print(f"Successfully extracted {len(words)} words for Unit {unit}.")
            # Save progress
            progress_data[unit_str] = words
            with open(PROGRESS_PATH, "w", encoding="utf-8") as f:
                json.dump(progress_data, f, ensure_ascii=False, indent=2)
        else:
            print(f"Failed to extract words for Unit {unit}. Will retry next time.")
            time.sleep(2)

    print("\nExtraction finished! Merging into main vocabulary.json and database...")
    merge_data_and_seed()

def merge_data_and_seed():
    # 1. Read A2 progress data
    if not os.path.exists(PROGRESS_PATH):
        print(f"Error: Progress file {PROGRESS_PATH} not found.")
        return

    with open(PROGRESS_PATH, "r", encoding="utf-8") as f:
        progress_data = json.load(f)

    # 2. Read existing vocabulary.json
    if not os.path.exists(VOCAB_JSON_PATH):
        print(f"Error: vocabulary.json not found at {VOCAB_JSON_PATH}")
        return

    with open(VOCAB_JSON_PATH, "r", encoding="utf-8") as f:
        vocab_data = json.load(f)

    existing_vocab = vocab_data.get("textbook_vocabulary", [])
    
    # Find max ID
    max_id = 0
    for w in existing_vocab:
        if w.get("id", 0) > max_id:
            max_id = w["id"]

    # Filter out existing A2 words if any to prevent duplicates on rerun
    existing_vocab = [w for w in existing_vocab if w.get("book_id") != "a2"]

    new_id = max(max_id + 1, 2000) # start A2 IDs at 2000 to keep it separate and clean
    
    a2_words_compiled = []
    
    # We will distribute page numbers based on unit ranges
    for unit_str, words in progress_data.items():
        unit = int(unit_str)
        p_start, p_end = a2_ranges.get(unit, (4, 148))
        page_spread = p_end - p_start + 1
        
        for idx, w in enumerate(words):
            page_number = p_start + (idx % page_spread)
            
            word_entry = {
                "id": new_id,
                "book_id": "a2",
                "unit": unit,
                "page_number": page_number,
                "word_greek": w["word_greek"],
                "word_chinese": w["word_chinese"],
                "pronunciation": w["pronunciation"],
                "example_greek": w["example_greek"],
                "example_chinese": w["example_chinese"]
            }
            new_id += 1
            a2_words_compiled.append(word_entry)

    # Merge A2 words
    updated_vocab = existing_vocab + a2_words_compiled
    vocab_data["textbook_vocabulary"] = updated_vocab

    with open(VOCAB_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(vocab_data, f, ensure_ascii=False, indent=2)
    print(f"Successfully appended {len(a2_words_compiled)} A2 vocabulary items to {VOCAB_JSON_PATH}.")

    # 3. Seed SQLite Database
    if not os.path.exists(DB_PATH):
        print(f"Warning: Database {DB_PATH} not found. Skipping DB seeding.")
        return

    print("Seeding A2 vocabulary into SQLite database...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Clear existing A2 vocabulary to prevent duplicates
    cursor.execute("DELETE FROM vocabulary WHERE book_id = 'a2'")

    # Insert new A2 vocabulary
    seeded_count = 0
    for w in a2_words_compiled:
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
        seeded_count += 1

    conn.commit()
    conn.close()
    print(f"Successfully seeded {seeded_count} A2 words into SQLite database {DB_PATH}.")

if __name__ == "__main__":
    main()

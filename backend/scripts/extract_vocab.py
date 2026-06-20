import os
import re
import sqlite3
import fitz  # PyMuPDF
import google.generativeai as genai
from dotenv import load_dotenv

# Load env variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env'))

DB_PATH = os.path.join(os.path.dirname(__file__), '../greek_coach.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_glossary_master_table():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS glossary_master (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word_greek TEXT NOT NULL UNIQUE,
            word_article TEXT,
            word_english TEXT NOT NULL,
            word_chinese TEXT
        )
    """)
    conn.commit()
    conn.close()

def parse_glossary_pdf():
    init_glossary_master_table()
    
    glossary_path = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach/materials/Glossary_A1_kids.pdf"
    if not os.path.exists(glossary_path):
        print(f"Glossary PDF not found at {glossary_path}")
        return

    print("Parsing Glossary_A1_kids.pdf...")
    doc = fitz.open(glossary_path)
    
    conn = get_db_connection()
    cursor = conn.cursor()

    # Regex to match Greek word, optional article/suffix, and English meaning
    # e.g., "αβγό, το = egg" -> group 1: "αβγό", group 2: "το", group 3: "egg"
    # e.g., "αγαπάω, -ώ = to love"
    pattern = re.compile(r"^([^,=\n]+)(?:,\s*([^=\n]+))?\s*=\s*(.+)$")

    word_count = 0
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
                
                # Check for duplicate
                try:
                    cursor.execute(
                        "INSERT OR IGNORE INTO glossary_master (word_greek, word_article, word_english) VALUES (?, ?, ?)",
                        (greek, article, english)
                    )
                    word_count += 1
                except Exception as e:
                    pass
    
    conn.commit()
    conn.close()
    print(f"Master Glossary parsing completed. Loaded {word_count} terms.")

def extract_words_from_textbook_page(book_id, page_number):
    """
    Converts a textbook page to an image, sends it to Gemini to extract Greek words,
    cross-references the master glossary to find translations, and stores them in the DB.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY is not set in the environment or .env file.")
        return False
        
    genai.configure(api_key=api_key)

    # Resolve textbook file path
    book_filenames = {
        'a1-a': "（已压缩）LEON'S GREEK TEXTBOOK A1-A.pdf",
        'a1-b': "（已压缩）LEON'S GREEK TEXTBOOK A1-B.pdf",
        'a2': "（已压缩）LEON'S GREEK TEXTBOOK A2.pdf"
    }
    
    filename = book_filenames.get(book_id)
    if not filename:
        print(f"Unknown book ID: {book_id}")
        return False
        
    pdf_path = os.path.join("/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach/materials", filename)
    if not os.path.exists(pdf_path):
        print(f"Textbook PDF not found at {pdf_path}")
        return False

    print(f"Processing {book_id} page {page_number}...")
    doc = fitz.open(pdf_path)
    
    # PDF pages are 0-indexed, but textbooks are usually 1-indexed (with cover offset)
    # For now, let's assume page_number corresponds directly to PDF page (0-indexed)
    pdf_page_index = page_number - 1
    if pdf_page_index < 0 or pdf_page_index >= len(doc):
        print(f"Page number {page_number} is out of bounds for PDF (length: {len(doc)}).")
        return False

    page = doc[pdf_page_index]
    
    # Render page to PNG image
    pix = page.get_pixmap(dpi=150)
    image_data = pix.tobytes("png")

    # Call Gemini model
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = """
    Analyze this page from the Greek textbook. Identify all Greek vocabulary words, phrases, and short sentences taught on this page.
    Provide the output strictly as a JSON list of objects, with no markdown formatting.
    Each object should have the following keys:
    - 'greek': The exact Greek spelling of the word or phrase.
    - 'chinese': The Chinese translation.
    - 'pronunciation': Phonetic pronunciation (pinyin-like or Latin phonetic representation for a Chinese child, e.g., 'ya sas').
    - 'example_greek': An example Greek sentence using the word if visible on the page, or leave empty.
    - 'example_chinese': Chinese translation of the example sentence, or leave empty.
    
    Example output format:
    [
      {"greek": "Καλημέρα", "chinese": "早上好", "pronunciation": "ka-li-me-ra", "example_greek": "Καλημέρα, Μαρία!", "example_chinese": "早上好，玛丽亚！"}
    ]
    """

    response = model.generate_content([
        {"mime_type": "image/png", "data": image_data},
        prompt
    ])
    
    text_response = response.text.strip()
    
    # Strip markdown block if model outputted it
    if text_response.startswith("```json"):
        text_response = text_response[7:]
    if text_response.endswith("```"):
        text_response = text_response[:-3]
    text_response = text_response.strip()

    import json
    try:
        words_data = json.loads(text_response)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        unit = 1 # We can infer unit later, default to 1 for now
        
        inserted_count = 0
        for item in words_data:
            greek = item.get('greek', '').strip()
            chinese = item.get('chinese', '').strip()
            pronunciation = item.get('pronunciation', '').strip()
            example_greek = item.get('example_greek', '').strip()
            example_chinese = item.get('example_chinese', '').strip()
            
            if not greek:
                continue
                
            # Insert into database
            cursor.execute("""
                INSERT INTO vocabulary (book_id, unit, page_number, word_greek, word_chinese, pronunciation, example_greek, example_chinese)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (book_id, unit, page_number, greek, chinese, pronunciation, example_greek, example_chinese))
            inserted_count += 1
            
        conn.commit()
        conn.close()
        print(f"Successfully extracted and stored {inserted_count} words for {book_id} page {page_number}.")
        return True
    except Exception as e:
        print(f"Failed to parse or save Gemini output for {book_id} page {page_number}: {e}")
        print("Gemini response was:", text_response)
        return False

if __name__ == "__main__":
    # Test glossary parsing
    parse_glossary_pdf()

import urllib.request
import json
import sqlite3
import os
import re

FIRESTORE_URL = "https://firestore.googleapis.com/v1/projects/leon-greek-coach/databases/(default)/documents/leon_greek_coach/shared_state"
DB_PATH = "backend/greek_coach.db"
OUTPUT_PATH = "frontend/src/data/vocabulary.json"

# Accent stripping helper for pronunciation
def get_pron(word):
    accents = {
        'ά': 'a', 'έ': 'e', 'ή': 'i', 'ί': 'i', 'ό': 'o', 'ύ': 'y', 'ώ': 'o',
        'α': 'a', 'β': 'v', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'i',
        'θ': 'th', 'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x',
        'ο': 'o', 'π': 'p', 'ρ': 'r', 'σ': 's', 'τ': 't', 'υ': 'y', 'φ': 'f',
        'χ': 'ch', 'ψ': 'ps', 'ω': 'o', 'ς': 's',
        'Ά': 'a', 'Έ': 'e', 'Ή': 'i', 'Ί': 'i', 'Ό': 'o', 'Ύ': 'y', 'Ώ': 'o'
    }
    res = []
    for char in word.lower():
        res.append(accents.get(char, char))
    cleaned = "".join(res)
    cleaned = re.sub(r'[^a-z]', '', cleaned)
    return cleaned

def fetch_firestore_state():
    print(f"Fetching Firestore state from {FIRESTORE_URL}...")
    req = urllib.request.Request(FIRESTORE_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())

def sync_to_sqlite(firestore_data):
    fields = firestore_data.get("fields", {})
    custom_vocab_val = fields.get("custom_vocab", {}).get("arrayValue", {}).get("values", [])
    print(f"Found {len(custom_vocab_val)} custom words in Firestore.")
    
    if not custom_vocab_val:
        print("No custom words to sync.")
        return
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    inserted_count = 0
    updated_count = 0
    
    for w in custom_vocab_val:
        wd = w.get("mapValue", {}).get("fields", {})
        if not wd:
            continue
            
        word_greek = wd.get("word_greek", {}).get("stringValue", "").strip()
        word_chinese = wd.get("word_chinese", {}).get("stringValue", "").strip()
        book_id = wd.get("book_id", {}).get("stringValue", "a2").strip()
        unit = int(wd.get("unit", {}).get("integerValue", "35"))
        note_date = wd.get("note_date", {}).get("stringValue", "").strip()
        example_greek = wd.get("example_greek", {}).get("stringValue", "").strip()
        example_chinese = wd.get("example_chinese", {}).get("stringValue", "").strip()
        
        if not word_greek or not word_chinese:
            continue
            
        # Check if word exists in SQLite
        cursor.execute("SELECT id FROM vocabulary WHERE word_greek = ?", (word_greek,))
        row = cursor.fetchone()
        
        if row:
            # Update existing note_date and translations
            cursor.execute("""
                UPDATE vocabulary 
                SET note_date = ?, word_chinese = ?, book_id = ?, unit = ?
                WHERE id = ?
            """, (note_date, word_chinese, book_id, unit, row[0]))
            updated_count += 1
        else:
            # Insert as a new custom row
            pron = get_pron(word_greek)
            if not example_greek:
                example_greek = f"Αυτό είναι {word_greek}."
            if not example_chinese:
                example_chinese = f"这是 {word_chinese}。"
                
            cursor.execute("""
                INSERT INTO vocabulary (book_id, unit, page_number, word_greek, word_chinese, pronunciation, example_greek, example_chinese, error_count, difficulty_score, note_date)
                VALUES (?, ?, 0, ?, ?, ?, ?, ?, 0, 1.0, ?)
            """, (book_id, unit, word_greek, word_chinese, pron, example_greek, example_chinese, note_date))
            inserted_count += 1
            
    conn.commit()
    conn.close()
    
    print(f"Sync complete! Inserted {inserted_count} new words, updated {updated_count} existing words.")

def export_db_to_json():
    print(f"Exporting database to {OUTPUT_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, book_id, unit, page_number, word_greek, word_chinese, pronunciation, example_greek, example_chinese, error_count, difficulty_score, last_reviewed_at, next_review_at, note_date FROM vocabulary")
    all_vocab = []
    col_names = [desc[0] for desc in cursor.description]
    for row in cursor.fetchall():
        vocab_dict = dict(zip(col_names, row))
        all_vocab.append(vocab_dict)
        
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "master_glossary": [],
            "textbook_vocabulary": all_vocab
        }, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully exported {len(all_vocab)} words to {OUTPUT_PATH}")
    conn.close()

def main():
    try:
        firestore_data = fetch_firestore_state()
        sync_to_sqlite(firestore_data)
        export_db_to_json()
    except Exception as e:
        print(f"Error during sync: {e}")

if __name__ == "__main__":
    main()

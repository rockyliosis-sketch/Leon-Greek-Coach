import os
import json
import sqlite3
import re

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTPUT_DIR = os.path.join(PROJECT_DIR, "frontend", "src", "data")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "vocabulary.json")
DB_PATH = os.path.join(PROJECT_DIR, "backend", "greek_coach.db")

def main():
    print("Connecting to SQLite Database...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # --- 1. CLEAN UP SPECIFIC DATA ---
    print("Applying specific data fixes...")
    
    # Fix τουαλέτα (Toilet / Dressing table)
    cursor.execute("""
        UPDATE vocabulary 
        SET word_chinese = '厕所 / 梳妆台' 
        WHERE word_greek LIKE '%τουαλέτα%' AND word_chinese LIKE '%梳妆台%';
    """)
    
    # Fix Πράσινο (remove 例如...)
    cursor.execute("""
        UPDATE vocabulary 
        SET word_chinese = '绿色' 
        WHERE word_greek LIKE '%Πράσινο%' AND word_chinese LIKE '%例如：λάχανο, ακτινίδιο%';
    """)
    
    # Delete 'Βάζω το άλφα' and 'Βάζω το σίγμα' completely as they are not valid spelling words
    cursor.execute("""
        DELETE FROM vocabulary 
        WHERE word_greek LIKE '%Βάζω το άλφα%' OR word_greek LIKE '%Βάζω το σίγμα%';
    """)
    
    # --- 2. CLEAN UP '笔记写为' ARTIFACTS ---
    print("Cleaning up (笔记写为) annotations...")
    cursor.execute("SELECT id, word_greek, word_chinese, example_chinese FROM vocabulary WHERE word_greek LIKE '%(笔记%' OR word_chinese LIKE '%笔记%' OR example_chinese LIKE '%笔记%'")
    rows = cursor.fetchall()
    
    update_count = 0
    for row in rows:
        vid, word_greek, word_chinese, example_chinese = row
        new_greek = re.sub(r'\s*\(笔记[^\)]+\)', '', word_greek).strip()
        # Sometimes it's in Chinese text
        new_chinese = re.sub(r'笔记(写为|写作|误写为)[^，。！]*[，。！]?', '', word_chinese).strip()
        new_chinese = re.sub(r'，\s*实际应为.*', '', new_chinese).strip()
        if not new_chinese and '笔记本' in word_chinese: # don't accidentally remove legitimate word
             new_chinese = word_chinese
             
        new_example_chinese = re.sub(r'笔记(写为|写作|误写为)[^，。！]*[，。！]?', '', example_chinese).strip()
        new_example_chinese = re.sub(r'，\s*实际应为.*', '', new_example_chinese).strip()
        if not new_example_chinese and '笔记本' in example_chinese:
             new_example_chinese = example_chinese
             
        if new_greek != word_greek or new_chinese != word_chinese or new_example_chinese != example_chinese:
            cursor.execute("""
                UPDATE vocabulary 
                SET word_greek = ?, word_chinese = ?, example_chinese = ?
                WHERE id = ?
            """, (new_greek, new_chinese, new_example_chinese, vid))
            update_count += 1
            
    conn.commit()
    print(f"Cleaned up {update_count} rows with note annotations.")
    
    # --- 3. EXPORT TO JSON ---
    print("Exporting database to vocabulary.json...")
    cursor.execute("SELECT id, book_id, unit, page_number, word_greek, word_chinese, pronunciation, example_greek, example_chinese, error_count, difficulty_score, last_reviewed_at, next_review_at, note_date FROM vocabulary")
    all_vocab = []
    
    # Fetch rows using column names
    col_names = [desc[0] for desc in cursor.description]
    for row in cursor.fetchall():
        vocab_dict = dict(zip(col_names, row))
        all_vocab.append(vocab_dict)
        
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "master_glossary": [],
            "textbook_vocabulary": all_vocab
        }, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully exported {len(all_vocab)} words to {OUTPUT_PATH}")
    
    # Validate the 25th notes exported
    count_25th = sum(1 for v in all_vocab if v.get("note_date") == "2026-06-25")
    print(f"Exported {count_25th} notes for 2026-06-25.")
    
    conn.close()

if __name__ == "__main__":
    main()

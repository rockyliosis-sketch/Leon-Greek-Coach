import sqlite3
import json
import os
import re

PROJECT_DIR = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach"
DB_PATH = os.path.join(PROJECT_DIR, "backend", "greek_coach.db")
OUTPUT_PATH = os.path.join(PROJECT_DIR, "frontend", "src", "data", "vocabulary.json")

def cleanup_database():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Clear all dummy "Αυτό είναι..." and "这是..." synthesized examples
    cursor.execute("""
        UPDATE vocabulary 
        SET example_greek = NULL, example_chinese = NULL
        WHERE example_greek LIKE '%Αυτό είναι%' 
           OR example_greek LIKE '%αυτό είναι%'
           OR example_chinese LIKE '这是 %'
           OR example_chinese LIKE '这是%';
    """)
    cleaned_dummy = cursor.rowcount
    print(f"Cleared {cleaned_dummy} dummy 'Αυτό είναι' / '这是' synthesized example rows.")
    
    # 2. Fix specific sentence ID 964 (Μένω στο σπίτι...)
    cursor.execute("""
        UPDATE vocabulary
        SET word_greek = 'Μένω στο σπίτι, βλέπω τηλεόραση, πίνω ζεστό τσάι.',
            word_chinese = '我呆在家里，看电视，喝热茶。',
            example_greek = NULL,
            example_chinese = NULL
        WHERE id = 964 OR word_greek LIKE '%Μένω στο σπίτι%';
    """)
    print("Fixed sentence entry for Μένω στο σπίτι...")
    
    # 3. Clean any remaining Greek in Chinese fields or placeholder text
    cursor.execute("SELECT id, word_greek, word_chinese, example_greek, example_chinese FROM vocabulary")
    rows = cursor.fetchall()
    
    fixed_count = 0
    for r in rows:
        vid, w_gr, w_zh, ex_gr, ex_zh = r
        # Clean double punctuation
        if w_zh and w_zh.endswith("。。"):
            new_zh = w_zh[:-1]
            cursor.execute("UPDATE vocabulary SET word_chinese = ? WHERE id = ?", (new_zh, vid))
            fixed_count += 1
        if ex_zh and ex_zh.endswith("。。"):
            new_ex_zh = ex_zh[:-1]
            cursor.execute("UPDATE vocabulary SET example_chinese = ? WHERE id = ?", (new_ex_zh, vid))
            fixed_count += 1
            
    print(f"Fixed {fixed_count} punctuation issues.")
    
    conn.commit()
    conn.close()

def export_database():
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

if __name__ == "__main__":
    cleanup_database()
    export_database()

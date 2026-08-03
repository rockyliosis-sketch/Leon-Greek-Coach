import sqlite3
import json
import os
import re

PROJECT_DIR = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach"
DB_PATH = os.path.join(PROJECT_DIR, "backend", "greek_coach.db")
OUTPUT_PATH = os.path.join(PROJECT_DIR, "frontend", "src", "data", "vocabulary.json")

def fix_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Fix Φωτιά (ID 1789)
    cursor.execute("""
        UPDATE vocabulary 
        SET word_chinese = '火 / 火灾', example_chinese = '这是火 / 火灾。' 
        WHERE word_greek = 'Φωτιά' OR (word_greek = 'φωτιά' AND word_chinese = '禁止生火');
    """)
    print("Fixed Φωτιά => 火 / 火灾")

    # 2. Fix σπυράκι (ID 3824)
    cursor.execute("""
        UPDATE vocabulary 
        SET word_chinese = '粉刺 / 痘痘 / 小脓疱', example_chinese = '这是粉刺 / 痘痘。' 
        WHERE word_greek = 'σπυράκι';
    """)
    print("Fixed σπυράκι => 粉刺 / 痘痘 / 小脓疱")

    # 3. Clean any example_chinese containing grammar explanations (e.g. starts with 中性名词/阴性名词/阳性名词/动词)
    cursor.execute("SELECT id, word_greek, word_chinese, example_chinese FROM vocabulary")
    rows = cursor.fetchall()
    cleaned_examples = 0
    for row in rows:
        vid, gr, zh, ex_zh = row
        if ex_zh:
            if re.search(r'[\u0370-\u03ff\u1f00-\u1fff]', ex_zh) or re.match(r'^(中性|阴性|阳性|动词|名词|形容词|副词)', ex_zh):
                # Clean example_chinese
                new_ex = f"这是 {zh}。"
                cursor.execute("UPDATE vocabulary SET example_chinese = ? WHERE id = ?", (new_ex, vid))
                cleaned_examples += 1

    print(f"Cleaned {cleaned_examples} invalid example_chinese fields.")
    conn.commit()
    conn.close()

def export_db():
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
    print(f"Exported {len(all_vocab)} words to {OUTPUT_PATH}")
    conn.close()

if __name__ == "__main__":
    fix_db()
    export_db()

import sqlite3
import json
import re

DB_PATH = "backend/greek_coach.db"
JSON_PATH = "frontend/src/data/vocabulary.json"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Fix ID 1327
cursor.execute("""
    UPDATE vocabulary 
    SET word_greek = 'πολλούς',
        word_chinese = '许多的 (阳性复数宾格)',
        pronunciation = 'pollous'
    WHERE id = 1327 OR word_greek LIKE '%πολλούς%';
""")

# Clean any leading/trailing quotes and punctuation in word_greek across the entire DB
cursor.execute("SELECT id, word_greek, word_chinese FROM vocabulary")
rows = cursor.fetchall()

fixed = 0
for r in rows:
    vid, gr, zh = r
    clean_gr = gr.replace('“', '').replace('”', '').replace('"', '').replace('。', '').strip()
    if clean_gr.endswith('.') and len(clean_gr.split()) <= 2:
        clean_gr = clean_gr[:-1].strip()
    if clean_gr != gr:
        cursor.execute("UPDATE vocabulary SET word_greek = ? WHERE id = ?", (clean_gr, vid))
        fixed += 1

print(f"Cleaned quotation marks and stray punctuation in {fixed} words.")

# Delete any rows where word_chinese is pure grammar instruction
grammar_patterns = [
    '形式要用', '格形式', '未完成过去时', '现在时变位', '现在时第三人称'
]
deleted_grammar = 0
for pat in grammar_patterns:
    cursor.execute("DELETE FROM vocabulary WHERE word_chinese LIKE ?", (f"%{pat}%",))
    deleted_grammar += cursor.rowcount

print(f"Deleted {deleted_grammar} grammar explanation noise rows.")

conn.commit()

# Export clean vocabulary.json
cursor.execute("SELECT id, book_id, unit, page_number, word_greek, word_chinese, pronunciation, example_greek, example_chinese, error_count, difficulty_score, last_reviewed_at, next_review_at, note_date FROM vocabulary")
all_vocab = []
col_names = [desc[0] for desc in cursor.description]
for row in cursor.fetchall():
    vocab_dict = dict(zip(col_names, row))
    all_vocab.append(vocab_dict)

with open(JSON_PATH, "w", encoding="utf-8") as f:
    json.dump({
        "master_glossary": [],
        "textbook_vocabulary": all_vocab
    }, f, ensure_ascii=False, indent=2)

print(f"Exported {len(all_vocab)} clean vocabulary words to {JSON_PATH}")
conn.close()

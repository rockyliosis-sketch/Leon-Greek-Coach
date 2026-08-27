import sqlite3
import json

DB_PATH = "backend/greek_coach.db"
JSON_PATH = "frontend/src/data/vocabulary.json"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("SELECT id, book_id, unit, word_greek, word_chinese FROM vocabulary WHERE unit = 24")
rows = cursor.fetchall()
print(f"Unit 24 has {len(rows)} vocabulary entries:")
for r in rows:
    print(f"  ID {r[0]}: {r[3]} ===> {r[4]}")

conn.close()

import sqlite3
import json

DB_PATH = "backend/greek_coach.db"
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Search for Ραπουνζέλ
cursor.execute("SELECT id, book_id, unit, word_greek, word_chinese, note_date FROM vocabulary WHERE word_greek LIKE '%απουνζέλ%' OR word_chinese LIKE '%长发公主%'")
rows = cursor.fetchall()
print("Found rows for Rapunzel in DB:")
for r in rows:
    print(r)

# Check total vocabulary count and order
cursor.execute("SELECT count(*) FROM vocabulary")
total = cursor.fetchone()[0]
print(f"Total vocabulary rows in DB: {total}")

conn.close()

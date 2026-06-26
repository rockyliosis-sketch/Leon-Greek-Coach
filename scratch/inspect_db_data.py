import sqlite3
import json

db_path = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach/backend/greek_coach.db"

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get table names
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Tables in database:", [t[0] for t in tables])

# Check books count
cursor.execute("SELECT id, title, total_pages FROM books")
print("\nBooks:")
for row in cursor.fetchall():
    print(f"  {row}")

# Check daily_history count and sample
cursor.execute("SELECT COUNT(*) FROM daily_history")
print(f"\nTotal daily_history records: {cursor.fetchone()[0]}")
cursor.execute("SELECT * FROM daily_history ORDER BY date LIMIT 5")
print("Sample daily_history:")
for row in cursor.fetchall():
    # Print fields except the full report to save space
    print(f"  Date: {row[0]} | Book: {row[1]} | Page: {row[2]} | Steps: {row[3]} | Score: {row[4]} | Report Length: {len(row[5]) if row[5] else 0}")

# Check vocabulary count
cursor.execute("SELECT COUNT(*) FROM vocabulary")
print(f"\nTotal vocabulary records: {cursor.fetchone()[0]}")
cursor.execute("SELECT book_id, unit, count(*) FROM vocabulary GROUP BY book_id, unit")
print("Vocabulary count per book/unit:")
for row in cursor.fetchall():
    print(f"  Book: {row[0]} | Unit: {row[1]} | Count: {row[2]}")

conn.close()

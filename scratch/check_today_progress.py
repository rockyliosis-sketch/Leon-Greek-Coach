import sqlite3
import json
import os
from datetime import datetime

DB_PATH = "backend/greek_coach.db"
JSON_PATH = "frontend/src/data/vocabulary.json"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=== 1. 词库全量统计 ===")
cursor.execute("SELECT book_id, count(*), min(unit), max(unit) FROM vocabulary GROUP BY book_id")
for row in cursor.fetchall():
    print(f"Book: {row[0]}, 词汇量: {row[1]}, 单元区间: Unit {row[2]} ~ Unit {row[3]}")

print("\n=== 2. 最新录入的手写笔记与单元进度 ===")
cursor.execute("SELECT note_date, count(*), group_concat(DISTINCT word_greek) FROM vocabulary WHERE note_date IS NOT NULL GROUP BY note_date ORDER BY note_date DESC LIMIT 10")
for row in cursor.fetchall():
    sample = row[2][:80] + "..." if len(row[2]) > 80 else row[2]
    print(f"笔记日期: {row[0]} | 词汇数: {row[1]} | 样例: {sample}")

print("\n=== 3. 检查库中包含标点符号、语法解析的脏词条 ===")
cursor.execute("""
    SELECT id, word_greek, word_chinese, note_date 
    FROM vocabulary 
    WHERE word_greek LIKE '%“%' 
       OR word_greek LIKE '%”%' 
       OR word_greek LIKE '%。%' 
       OR word_chinese LIKE '%宾格%' 
       OR word_chinese LIKE '%语法%'
       OR word_chinese LIKE '%形式要用%'
""")
dirty_rows = cursor.fetchall()
print(f"发现 {len(dirty_rows)} 个语法说明被误录为单词的词条:")
for r in dirty_rows:
    print(f"ID {r[0]}: 希腊语='{r[1]}' | 中文='{r[2]}' | 笔记日期={r[3]}")

conn.close()

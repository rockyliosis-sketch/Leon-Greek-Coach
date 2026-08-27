import sqlite3
import json

DB_PATH = "backend/greek_coach.db"
JSON_PATH = "frontend/src/data/vocabulary.json"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=== 1. 查找包含多个逗号（>=3个逗号）或超长罗列单词的词条 ===")
cursor.execute("""
    SELECT id, book_id, unit, word_greek, word_chinese 
    FROM vocabulary 
    WHERE (LENGTH(word_greek) - LENGTH(REPLACE(word_greek, ',', ''))) >= 2
       OR (LENGTH(word_chinese) - LENGTH(REPLACE(word_chinese, '、', ''))) >= 3
""")
rows = cursor.fetchall()
print(f"找到 {len(rows)} 个可能属于单词罗列串的词条：\n")
for r in rows:
    print(f"ID {r[0]} | Book: {r[1]} U{r[2]} | GR: {r[3][:60]}... | ZH: {r[4][:60]}...")

print("\n=== 2. 检查 vocabulary.json 中的类似词条 ===")
with open(JSON_PATH, "r", encoding="utf-8") as f:
    vdata = json.load(f)

textbook_vocab = vdata.get("textbook_vocabulary", [])
long_list_items = []
for w in textbook_vocab:
    gr = w.get("word_greek", "")
    zh = w.get("word_chinese", "")
    comma_count_gr = gr.count(",")
    comma_count_zh = zh.count("、")
    word_count_gr = len(gr.split())
    
    # Check if it's a list of words rather than a natural sentence
    # Natural sentences usually have verbs, periods/question marks, fewer than 3 commas
    if comma_count_gr >= 2 or comma_count_zh >= 3 or (word_count_gr >= 6 and ("," in gr or "、" in zh)):
        long_list_items.append(w)

print(f"vocabulary.json 中匹配到 {len(long_list_items)} 个堆叠罗列词条:")
for item in long_list_items:
    print(f"- ID {item.get('id')} ({item.get('book_id')} U{item.get('unit')}): {item.get('word_greek')} ===> {item.get('word_chinese')}")

conn.close()

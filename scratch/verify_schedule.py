import json

with open("frontend/src/data/vocabulary.json", "r", encoding="utf-8") as f:
    data = json.load(f)

glossary = data["master_glossary"]

dates = ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27"]
for d in dates:
    day_words = [w for w in glossary if w.get("scheduled_date") == d]
    print(f"\n📅 【{d}】 排期词数: {len(day_words)}")
    for w in day_words:
        print(f"  - #{w['id']} {w['word_greek']} ({w['tag']}): {w['word_chinese']}")

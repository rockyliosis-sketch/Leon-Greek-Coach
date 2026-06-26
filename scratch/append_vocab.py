import re
import json
from datetime import datetime

START_DATE = datetime(2025, 9, 6)

def get_unit(date_str):
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
        diff = (d - START_DATE).days
        if diff < 0: return 1, "a1-a"
        if diff < 210:
            u = (diff // 7) + 1
            return u, "a1-a" if u <= 15 else "a1-b"
        u = 31 + ((diff - 210) // 14)
        return min(39, u), "a2"
    except:
        return 1, "a1-a"

md_path = '/Users/johnsmacbook/Documents/antigravity IDE/Greek book/希腊语学习笔记/希腊语学习笔记.md'
json_path = '/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach/frontend/src/data/vocabulary.json'

with open(md_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

current_date = "2025-09-07"
words = []
current_id = 1000

for line in lines:
    line = line.strip()
    if line.startswith("Date: "):
        current_date = line.replace("Date: ", "").strip()
    elif " - " in line and not line.startswith("——") and not line.startswith("##") and not line.startswith("Date:"):
        parts = line.split(" - ", 1)
        if len(parts) >= 2:
            greek = parts[0].strip()
            chinese = parts[1].strip()
            if re.search(r'[\u0370-\u03FF\u1F00-\u1FFF]', greek) and not "|" in line:
                u, b = get_unit(current_date)
                
                # Check for parenthesis info
                example_greek = ""
                example_chinese = ""
                
                # We could try to split pronunciation but let's just keep it simple
                words.append({
                    "id": current_id,
                    "book_id": b,
                    "unit": u,
                    "word_greek": greek,
                    "word_chinese": chinese
                })
                current_id += 1

print(f"Adding {len(words)} words...")

with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Find max ID in existing data just in case
max_id = max((item.get('id', 0) for item in data.get('textbook_vocabulary', [])), default=0)
if max_id >= 1000:
    current_id = max_id + 1
    for w in words:
        w['id'] = current_id
        current_id += 1

data['textbook_vocabulary'].extend(words)

with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Done. Appended to vocabulary.json")

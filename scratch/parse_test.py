import re
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

with open('/Users/johnsmacbook/Documents/antigravity IDE/Greek book/希腊语学习笔记/希腊语学习笔记.md', 'r') as f:
    lines = f.readlines()

current_date = "2025-09-07"
words = []

for line in lines:
    line = line.strip()
    if line.startswith("Date: "):
        current_date = line.replace("Date: ", "").strip()
    elif " - " in line and not line.startswith("——") and not line.startswith("##") and not line.startswith("Date:"):
        parts = line.split(" - ")
        if len(parts) >= 2:
            greek = parts[0].strip()
            chinese = " - ".join(parts[1:]).strip()
            # simple heuristic: Greek part has greek letters
            if re.search(r'[\u0370-\u03FF\u1F00-\u1FFF]', greek) and not "|" in line:
                u, b = get_unit(current_date)
                words.append((greek, chinese, current_date, u, b))

print(f"Extracted {len(words)} words.")
print("Sample:")
for w in words[:5]: print(w)
for w in words[-5:]: print(w)

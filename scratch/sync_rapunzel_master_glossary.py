import re
import json
import os
from datetime import datetime, timedelta

PROJECT_DIR = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach"
GLOSSARY_MD_PATH = os.path.join(PROJECT_DIR, "materials", "Glossary_A1_kids_CN.md")
VOCAB_JSON_PATH = os.path.join(PROJECT_DIR, "frontend", "src", "data", "vocabulary.json")

# Regex to parse "- **word** `[tag]` — **chinese** *(english)*"
pattern = re.compile(r"^-\s+\*\*([^*]+)\*\*(?:\s+`\[([^\]]+)\]`)?\s+—\s+\*\*([^*]+)\*\*(?:\s+\*\(([^)]+)\)\*)?")

words = []
with open(GLOSSARY_MD_PATH, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line.startswith("- **"):
            continue
        m = pattern.match(line)
        if m:
            gr = m.group(1).strip()
            tag = m.group(2).strip() if m.group(2) else ""
            zh = m.group(3).strip()
            en = m.group(4).strip() if m.group(4) else ""
            
            # extract letter group
            first_char = gr[0].upper()
            
            words.append({
                "word_greek": gr,
                "tag": tag,
                "word_chinese": zh,
                "word_english": en,
                "letter": first_char
            })

print(f"Parsed {len(words)} words from Glossary_A1_kids_CN.md")

# Find index of Ραπουνζέλ
rapunzel_idx = -1
for i, w in enumerate(words):
    if "απουνζέλ" in w["word_greek"] or "长发公主" in w["word_chinese"]:
        rapunzel_idx = i
        print(f"Found Rapunzel at 0-indexed position {i} (1-indexed #{i+1}): {w}")

# Anchor: 2026-08-24 is the day that reaches Rapunzel (words #930 ~ #949, i.e. indices 929 to 948)
# Group words into blocks of 20
ANCHOR_DATE = datetime(2026, 8, 24)
ANCHOR_BLOCK_START = 929  # index 929 is word #930; index 947 is Rapunzel #948

master_glossary = []
for i, w in enumerate(words):
    word_id = i + 1
    block_index = (i - ANCHOR_BLOCK_START) // 20
    scheduled_d = ANCHOR_DATE + timedelta(days=block_index)
    scheduled_str = scheduled_d.strftime("%Y-%m-%d")
    
    status = "upcoming" if scheduled_d >= ANCHOR_DATE else "mastered"
    if scheduled_d == ANCHOR_DATE:
        status = "learning"
        
    master_glossary.append({
        "id": word_id,
        "word_greek": w["word_greek"],
        "word_chinese": w["word_chinese"],
        "word_english": w["word_english"],
        "pronunciation": "",
        "level": "A1",
        "letter": w["letter"],
        "tag": w["tag"],
        "status": status,
        "scheduled_date": scheduled_str,
        "day_assigned": block_index + 7 # Day 7 is Anchor Day
    })

print(f"Sample word at index {rapunzel_idx}:")
print(json.dumps(master_glossary[rapunzel_idx], ensure_ascii=False, indent=2))

# Load existing vocabulary.json and update master_glossary
with open(VOCAB_JSON_PATH, "r", encoding="utf-8") as f:
    vocab_data = json.load(f)

vocab_data["master_glossary"] = master_glossary

with open(VOCAB_JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(vocab_data, f, ensure_ascii=False, indent=2)

print(f"Successfully updated master_glossary in {VOCAB_JSON_PATH} with {len(master_glossary)} scheduled words!")

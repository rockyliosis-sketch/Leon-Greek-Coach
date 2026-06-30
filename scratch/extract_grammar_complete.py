import os
import re
from datetime import datetime

PROJECT_DIR = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach"
A1_A_PATH = os.path.join(PROJECT_DIR, "materials", "（已压缩）LEON_S_GREEK_TEXTBOOK_A1-A.md")
A1_B_PATH = os.path.join(PROJECT_DIR, "materials", "（已压缩）LEON_S_GREEK_TEXTBOOK_A1-B.md")
A2_PATH = os.path.join(PROJECT_DIR, "materials", "（已压缩）LEON_S_GREEK_TEXTBOOK_A2.md")
NOTES_PATH = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/希腊语学习笔记/希腊语学习笔记.md"

START_DATE = datetime(2025, 9, 6)

a1_a_ranges = {
    0: (10, 57), 1: (58, 65), 2: (66, 77), 3: (78, 79), 4: (80, 87),
    5: (88, 103), 6: (104, 111), 7: (112, 119), 8: (120, 127), 9: (128, 133),
    10: (134, 147), 11: (148, 155), 12: (156, 163), 13: (164, 171), 14: (172, 177), 15: (178, 191)
}

a1_b_ranges = {
    16: (6, 17), 17: (18, 29), 18: (30, 41), 19: (42, 53), 20: (54, 65),
    21: (66, 77), 22: (78, 89), 23: (90, 101), 24: (102, 113), 25: (114, 125),
    26: (126, 137), 27: (138, 149), 28: (150, 161), 29: (162, 168), 30: (169, 175)
}

a2_ranges = {
    31: (4, 39), 32: (40, 63), 33: (64, 83), 34: (84, 87), 35: (88, 101),
    36: (102, 119), 37: (120, 137), 38: (138, 141), 39: (142, 148)
}

def get_unit_for_page(book_id, page):
    if book_id == "a1-a":
        for u, (start, end) in a1_a_ranges.items():
            if start <= page <= end:
                return 1 if u == 0 else u
    elif book_id == "a1-b":
        for u, (start, end) in a1_b_ranges.items():
            if start <= page <= end:
                return u
    elif book_id == "a2":
        for u, (start, end) in a2_ranges.items():
            if start <= page <= end:
                return u
    return None

def get_unit_from_date(date_str):
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

def clean_markdown(text):
    text = text.replace("**", "").replace("*", "").replace("`", "").strip()
    return text

def parse_textbook_grammar(filepath, book_id):
    grammar_by_unit = {}
    if not os.path.exists(filepath):
        return grammar_by_unit
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    sections = re.split(r'(## Book Page \d+)', content)
    for i in range(1, len(sections), 2):
        header = sections[i]
        body = sections[i+1] if i+1 < len(sections) else ""
        page_match = re.search(r'## Book Page (\d+)', header)
        if not page_match:
            continue
        page = int(page_match.group(1))
        unit = get_unit_for_page(book_id, page)
        if not unit:
            continue
        
        # Look for headers containing grammar keywords
        lines = body.split('\n')
        collecting = False
        grammar_lines = []
        for line in lines:
            line_strip = line.strip()
            if not line_strip:
                continue
            if line_strip.startswith("##") or line_strip.startswith("###") or line_strip.startswith("####") or line_strip.startswith("**【") or line_strip.startswith("【"):
                if any(kw in line_strip for kw in ["语法", "解析", "说明", "提示", "Notes", "Grammar", "小贴士", "要点", "规则"]):
                    collecting = True
                    grammar_lines.append(clean_markdown(line_strip))
                else:
                    collecting = False
            elif line_strip.startswith("---"):
                collecting = False
            elif collecting:
                if not line_strip.startswith("|") and len(line_strip) > 2: # skip table formatting
                    grammar_lines.append(clean_markdown(line_strip))
                    
        if grammar_lines:
            if unit not in grammar_by_unit:
                grammar_by_unit[unit] = []
            grammar_by_unit[unit].extend(grammar_lines)
    return grammar_by_unit

def parse_notes_grammar():
    grammar_by_unit = {}
    if not os.path.exists(NOTES_PATH):
        return grammar_by_unit
    with open(NOTES_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    sections = re.split(r'(## Book Page \d+)', content)
    current_date = "2025-09-07"
    for i in range(1, len(sections), 2):
        header = sections[i]
        body = sections[i+1] if i+1 < len(sections) else ""
        date_match = re.search(r'Date:\s*([\d-]+)', body)
        if date_match:
            current_date = date_match.group(1).strip()
        unit, book_id = get_unit_from_date(current_date)
        
        lines = body.split('\n')
        collecting = False
        grammar_lines = []
        for line in lines:
            line_strip = line.strip()
            if not line_strip:
                continue
            if "语法" in line_strip or "规则" in line_strip or "解析" in line_strip or "句型" in line_strip:
                collecting = True
                grammar_lines.append(clean_markdown(line_strip))
            elif line_strip.startswith("##") or line_strip.startswith("Date:"):
                collecting = False
            elif collecting:
                if len(line_strip) > 2 and not " - " in line_strip: # skip vocabulary lines
                    grammar_lines.append(clean_markdown(line_strip))
        if grammar_lines:
            if unit not in grammar_by_unit:
                grammar_by_unit[unit] = []
            grammar_by_unit[unit].extend(grammar_lines)
    return grammar_by_unit

def main():
    print("Extracting grammar points...")
    all_grammar = {}
    for unit in range(1, 40):
        all_grammar[unit] = []
        
    # 1. Parse textbooks
    t1 = parse_textbook_grammar(A1_A_PATH, "a1-a")
    t2 = parse_textbook_grammar(A1_B_PATH, "a1-b")
    t3 = parse_textbook_grammar(A2_PATH, "a2")
    
    for t in [t1, t2, t3]:
        for unit, lines in t.items():
            all_grammar[unit].extend(lines)
            
    # 2. Parse notes
    notes_g = parse_notes_grammar()
    for unit, lines in notes_g.items():
        all_grammar[unit].extend(lines)
        
    # Summarize and format nicely
    print("\n--- Summary per Unit ---")
    summarized_data = {}
    for unit in sorted(all_grammar.keys()):
        lines = all_grammar[unit]
        # De-duplicate lines while preserving order
        seen = set()
        unique_lines = []
        for line in lines:
            line_norm = line.lower().strip()
            if line_norm not in seen and len(line_norm) > 4:
                seen.add(line_norm)
                unique_lines.append(line)
        
        # Format a combined string of up to 4 key grammar points
        key_points = []
        for line in unique_lines:
            # Clean up leading numbers or dots
            clean_line = re.sub(r'^[\d\.\-\*#\s【]+', '', line)
            clean_line = re.sub(r'】$', '', clean_line)
            if clean_line and len(clean_line) > 3:
                key_points.append(clean_line)
                
        # Limit to top 4 points
        summary = "。".join(key_points[:4])
        if len(summary) > 250:
            summary = summary[:247] + "..."
        summarized_data[unit] = summary
        print(f"Unit {unit}: {summary}\n")

if __name__ == "__main__":
    main()

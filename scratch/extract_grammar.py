import os
import re

base_dir = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach/materials"
a1_a_path = os.path.join(base_dir, "（已压缩）LEON_S_GREEK_TEXTBOOK_A1-A.md")
a1_b_path = os.path.join(base_dir, "（已压缩）LEON_S_GREEK_TEXTBOOK_A1-B.md")
a2_path = os.path.join(base_dir, "（已压缩）LEON_S_GREEK_TEXTBOOK_A2.md")

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

def extract_grammar_from_file(filepath, book_id):
    grammar_by_unit = {}
    if not os.path.exists(filepath):
        return grammar_by_unit
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    sections = re.split(r'(## Book Page [^\n]+)', content)
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
            
        lines = body.split('\n')
        collecting = False
        notes = []
        for line in lines:
            line_strip = line.strip()
            if not line_strip:
                continue
            if line_strip.startswith("##") or line_strip.startswith("###") or line_strip.startswith("####"):
                if any(kw in line_strip for kw in ["语法", "解析", "说明", "提示", "Notes", "Grammar", "小贴士"]):
                    collecting = True
                    # Strip headers markers
                    clean_h = re.sub(r'^#+\s*', '', line_strip)
                    notes.append(clean_h)
                else:
                    collecting = False
            elif line_strip.startswith("---"):
                collecting = False
            elif collecting:
                notes.append(line_strip)
                
        if notes:
            clean_notes = []
            for n in notes:
                n_clean = n.replace("**", "").replace("*", "").strip()
                if n_clean:
                    clean_notes.append(n_clean)
            if clean_notes:
                if unit not in grammar_by_unit:
                    grammar_by_unit[unit] = []
                grammar_by_unit[unit].append("; ".join(clean_notes[:4]))
                
    return grammar_by_unit

all_grammar = {}
for book_id, filepath in [("a1-a", a1_a_path), ("a1-b", a1_b_path), ("a2", a2_path)]:
    g = extract_grammar_from_file(filepath, book_id)
    for u, notes in g.items():
        all_grammar[u] = " | ".join(notes[:3])

for u in sorted(all_grammar.keys()):
    desc = all_grammar[u]
    print(f"Unit {u}: {desc[:250]}...")

import re
import os
from datetime import datetime

# Paths
base_dir = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book"
a1_a_path = os.path.join(base_dir, "（已压缩）LEON_S GREEK TEXTBOOK A1-A.md")
a1_b_path = os.path.join(base_dir, "（已压缩）LEON_S GREEK TEXTBOOK A1-B.md")
a2_path = os.path.join(base_dir, "（已压缩）LEON_S GREEK TEXTBOOK A2.md")
notes_path = os.path.join(base_dir, "希腊语学习笔记", "希腊语学习笔记.md")

START_DATE = datetime(2025, 9, 6)

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

def clean_greek(text):
    # Remove markdown bold/italics
    text = text.replace("**", "").replace("*", "").strip()
    return text

def analyze_notes():
    print("\n--- Analyzing 希腊语学习笔记.md ---")
    if not os.path.exists(notes_path):
        print("Notes file not found.")
        return
        
    with open(notes_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Split by Book Page
    sections = re.split(r'(## Book Page \d+)', content)
    current_date = "2025-09-07"
    extracted_vocab = []
    
    for i in range(1, len(sections), 2):
        header = sections[i]
        body = sections[i+1] if i+1 < len(sections) else ""
        
        # Get date
        date_match = re.search(r'Date:\s*([\d-]+)', body)
        if date_match:
            current_date = date_match.group(1).strip()
            
        unit, book_id = get_unit_from_date(current_date)
        
        lines = body.split('\n')
        for line in lines:
            line = line.strip()
            if not line or line.startswith("Date:") or line.startswith("——") or line.startswith("##"):
                continue
                
            # Pattern: greek - translation
            if " - " in line and not "|" in line:
                parts = line.split(" - ")
                greek = clean_greek(parts[0])
                chinese = " - ".join(parts[1:]).strip()
                # Check if contains Greek characters
                if re.search(r'[\u0370-\u03FF\u1F00-\u1FFF]', greek):
                    extracted_vocab.append((greek, chinese, unit, book_id))
                    
    print(f"Extracted {len(extracted_vocab)} words from study notes.")
    if extracted_vocab:
        print("Sample notes vocab:")
        for w in extracted_vocab[:5]:
            print(f"  {w[0]} -> {w[1]} (Unit {w[2]}, {w[3]})")

def analyze_textbook(path, name):
    print(f"\n--- Analyzing {name} ---")
    if not os.path.exists(path):
        print(f"{name} file not found.")
        return
        
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Find Page headers
    sections = re.split(r'(## Page \d+)', content)
    print(f"Total parts split: {len(sections)}")
    
    # We will search for bullet points with bold Greek text followed by translation
    # Examples:
    # * **άλογο** (άλογο) - 马
    # * **διάλειμμα** (το): 课间休息
    # | **Επιτραπέζιο** | epitrapézio | 桌面的 |
    
    extracted_bullets = []
    # Match bullet points like: * **word** ... -/：/: translation
    bullet_pattern = re.compile(r'^\*\s+\*\*([^*]+)\*\*\s*(?:\([^)]+\))?\s*[-–=:：]\s*(.+)$', re.MULTILINE)
    matches = bullet_pattern.findall(content)
    
    # Match table rows like: | **word** | pronunciation | translation |
    table_pattern = re.compile(r'^\|\s+\*\*([^*]+)\*\*\s*\|\s*([^|]+)\|\s*([^|]+)\|', re.MULTILINE)
    table_matches = table_pattern.findall(content)
    
    print(f"Found {len(matches)} bullet vocab items.")
    print(f"Found {len(table_matches)} table vocab items.")
    
    if matches:
        print("Sample bullet vocab:")
        for m in matches[:5]:
            print(f"  {m[0].strip()} -> {m[1].strip()}")
    if table_matches:
        print("Sample table vocab:")
        for m in table_matches[:5]:
            print(f"  {m[0].strip()} -> {m[2].strip()}")

analyze_notes()
analyze_textbook(a1_a_path, "A1-A")
analyze_textbook(a1_b_path, "A1-B")
analyze_textbook(a2_path, "A2")

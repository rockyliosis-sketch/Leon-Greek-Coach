import json
import os
import re

BASE_DIR = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/希腊语学习笔记"
PROGRESS_PATH = os.path.join(BASE_DIR, "transcribe_progress.json")
OUTPUT_MD = os.path.join(BASE_DIR, "希腊语学习笔记.md")

def extract_greek_and_chinese(line):
    # Skip header lines or helper lines
    if "——" in line or "原笔记" in line:
        return None
        
    line_clean = line.strip()
    if not line_clean:
        return None
        
    # Pattern 1: Split by separators ->, →, -, =, :
    parts = re.split(r'->|→|-|=|:', line_clean)
    if len(parts) >= 2:
        part1, part2 = parts[0].strip(), parts[1].strip()
        # Clean markdown symbols
        part1 = part1.replace('*', '').replace('`', '')
        part2 = part2.replace('*', '').replace('`', '')
        
        has_greek_1 = bool(re.search(r'[\u0370-\u03FF\u1F00-\u1FFF]', part1))
        has_greek_2 = bool(re.search(r'[\u0370-\u03FF\u1F00-\u1FFF]', part2))
        has_chinese_1 = bool(re.search(r'[\u4e00-\u9fa5]', part1))
        has_chinese_2 = bool(re.search(r'[\u4e00-\u9fa5]', part2))
        
        if has_greek_1 and not has_greek_2:
            return part1, part2
        elif has_greek_2 and not has_greek_1:
            return part2, part1
        elif has_greek_1 and has_greek_2:
            if has_chinese_2 and not has_chinese_1:
                return part1, part2
            elif has_chinese_1 and not has_chinese_2:
                return part2, part1
                
    # Pattern 2: Parentheses e.g. "το τρίγωνο (三角形)"
    match = re.match(r'^([^\(]+)\(([^\)]+)\)', line_clean)
    if match:
        part1, part2 = match.group(1).strip(), match.group(2).strip()
        has_greek = bool(re.search(r'[\u0370-\u03FF\u1F00-\u1FFF]', part1))
        has_chinese = bool(re.search(r'[\u4e00-\u9fa5]', part2))
        if has_greek and has_chinese:
            return part1, part2
            
    # Pattern 3: Space separator where left is Greek, right is Chinese
    # e.g., "επίσης 也是" or "αγόρι 男孩"
    words = line_clean.split()
    if len(words) >= 2:
        # Check transition from Greek to Chinese
        greek_words = []
        chinese_words = []
        for w in words:
            # If word contains Greek letters, put in Greek part
            if re.search(r'[\u0370-\u03FF\u1F00-\u1FFF]', w) or w in ["o", "η", "το", "οι", "τα", "του", "της", "των", "τους", "τις"]:
                greek_words.append(w)
            else:
                chinese_words.append(w)
        if greek_words and chinese_words:
            greek_str = " ".join(greek_words).strip()
            chinese_str = " ".join(chinese_words).strip()
            # Clean symbols
            greek_str = re.sub(r'^[1-9]\)\s*', '', greek_str) # remove "1)" prefix
            if bool(re.search(r'[\u4e00-\u9fa5]', chinese_str)) and not bool(re.search(r'[\u4e00-\u9fa5]', greek_str)):
                return greek_str, chinese_str
                
    return None

def normalize_date_string(date_str, current_year=2025):
    if not date_str:
        return None, current_year
    date_str = date_str.strip()
    
    # Check YYYY-MM-DD
    match = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})$", date_str)
    if match:
        y, m, d = int(match.group(1)), int(match.group(2)), int(match.group(3))
        return f"{y:04d}-{m:02d}-{d:02d}", y

    # Check DD/MM/YY or DD/MM/YYYY
    match = re.match(r"^(\d{1,2})[/\.-](\d{1,2})[/\.-](\d{2,4})$", date_str)
    if match:
        d, m, y = int(match.group(1)), int(match.group(2)), int(match.group(3))
        if y < 100:
            y += 2000
        return f"{y:04d}-{m:02d}-{d:02d}", y

    # Check DD/MM
    match = re.match(r"^(\d{1,2})[/\.-](\d{1,2})$", date_str)
    if match:
        d, m = int(match.group(1)), int(match.group(2))
        y = 2025
        if m < 8:
            y = 2026
        return f"{y:04d}-{m:02d}-{d:02d}", y

    # Check Chinese
    match = re.search(r"(\d{4})年(\d{1,2})月(\d{1,2})日", date_str)
    if match:
        y, m, d = int(match.group(1)), int(match.group(2)), int(match.group(3))
        return f"{y:04d}-{m:02d}-{d:02d}", y

    match = re.search(r"(\d{1,2})月(\d{1,2})日", date_str)
    if match:
        m, d = int(match.group(1)), int(match.group(2))
        y = 2025
        if m < 8:
            y = 2026
        return f"{y:04d}-{m:02d}-{d:02d}", y

    return date_str, current_year

def main():
    if not os.path.exists(PROGRESS_PATH):
        print(f"Error: Progress file not found: {PROGRESS_PATH}")
        return
        
    with open(PROGRESS_PATH, 'r', encoding='utf-8') as f:
        progress = json.load(f)
        
    processed_pages = progress.get("processed_pages", {})
    total_pages = len(processed_pages)
    
    # Sort pages by index (0, 1, 2...)
    sorted_page_keys = sorted(processed_pages.keys(), key=lambda x: int(x))
    
    md_lines = []
    md_lines.append("# Leon's Greek Learning Notes (希腊语学习笔记)")
    md_lines.append("")
    md_lines.append("*Generated from notebook.pdf for website upload.*")
    md_lines.append("")
    
    current_date = "2025-09-07"
    current_year = 2025
    
    for page_key in sorted_page_keys:
        page_data = processed_pages[page_key]
        raw_date = page_data.get("date")
        if raw_date:
            normalized, year = normalize_date_string(raw_date, current_year)
            if normalized:
                current_date = normalized
                current_year = year
                
        md_lines.append(f"## Book Page {int(page_key)+1}")
        md_lines.append(f"Date: {current_date}")
        md_lines.append(f"—— 原笔记第 {int(page_key)+1} 页 ——")
        md_lines.append("")
        
        lines = page_data.get("text", "").split("\n")
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
                
            # Try to extract standard Greek - Chinese pair
            pair = extract_greek_and_chinese(stripped)
            if pair:
                greek, chinese = pair
                md_lines.append(f"{greek} - {chinese}")
            else:
                # If it's a grammar block or non-word line, output as is
                # But if it has a list symbol, format it nicely
                if stripped.startswith(("-", "*", "•")):
                    md_lines.append(stripped)
                else:
                    md_lines.append(stripped)
                    
        md_lines.append("") # blank line between pages
        
    with open(OUTPUT_MD, 'w', encoding='utf-8') as f:
        f.write("\n".join(md_lines))
        
    print(f"Successfully generated Markdown file for upload: {OUTPUT_MD}")

if __name__ == "__main__":
    main()

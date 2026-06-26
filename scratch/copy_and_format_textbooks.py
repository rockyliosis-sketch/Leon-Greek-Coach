import re
import os

source_files = [
    {
        "src": "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/（已压缩）LEON_S GREEK TEXTBOOK A1-A.md",
        "dest": "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach/materials/（已压缩）LEON_S_GREEK_TEXTBOOK_A1-A.md",
        "total_pages": 91,
        "offset": 8  # 2*k + 8
    },
    {
        "src": "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/（已压缩）LEON_S GREEK TEXTBOOK A1-B.md",
        "dest": "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach/materials/（已压缩）LEON_S_GREEK_TEXTBOOK_A1-B.md",
        "total_pages": 85,
        "offset": 4  # 2*k + 4
    },
    {
        "src": "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/（已压缩）LEON_S GREEK TEXTBOOK A2.md",
        "dest": "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach/materials/（已压缩）LEON_S_GREEK_TEXTBOOK_A2.md",
        "total_pages": 67,
        "offset": 2  # 2*k + 2
    }
]

for item in source_files:
    src = item["src"]
    dest = item["dest"]
    total = item["total_pages"]
    offset = item["offset"]
    
    if not os.path.exists(src):
        print(f"Source file not found: {src}")
        continue
        
    print(f"Reading from {os.path.basename(src)}")
    with open(src, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Replace "## Page k" with correct book page ranges
    # Example: ## Page 1 -> ## Book Page 10-11 (Physical PDF Page 91)
    def replacer(match):
        k = int(match.group(1))
        start_p = 2 * k + offset
        end_p = start_p + 1
        pdf_page = total - k + 1
        return f"## Book Page {start_p}-{end_p} (Physical PDF Page {pdf_page})"

    modified_content = re.sub(r'^## Page (\d+)', replacer, content, flags=re.MULTILINE)
    
    dest_dir = os.path.dirname(dest)
    if not os.path.exists(dest_dir):
        os.makedirs(dest_dir, exist_ok=True)
        
    with open(dest, 'w', encoding='utf-8') as f:
        f.write(modified_content)
        
    print(f"Wrote reformatted file to {dest}")
    
print("All files processed successfully!")

import re

notebook_path = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/希腊语学习笔记/希腊语学习笔记.md"

with open(notebook_path, 'r', encoding='utf-8') as f:
    content = f.read()

sections = re.split(r'(## Book Page \d+)', content)
print(f"Total parts split: {len(sections)}")

pages_info = []
for i in range(1, len(sections), 2):
    header = sections[i]
    body = sections[i+1] if i+1 < len(sections) else ""
    page_num_match = re.search(r'## Book Page (\d+)', header)
    page_num = int(page_num_match.group(1)) if page_num_match else None
    
    date_match = re.search(r'Date:\s*([\d-]+)', body)
    date_str = date_match.group(1) if date_match else None
    
    body_lines = [l.strip() for l in body.split('\n') if l.strip()]
    non_meta_lines = [l for l in body_lines if not l.startswith("Date:") and not l.startswith("——")]
    
    pages_info.append({
        'page': page_num,
        'date': date_str,
        'line_count': len(non_meta_lines),
        'preview': non_meta_lines[:2] if non_meta_lines else []
    })

print(f"Extracted info for {len(pages_info)} pages.")
print("First 10 pages in notebook:")
for p in pages_info[:10]:
    print(f"  Page {p['page']} | Date: {p['date']} | Lines: {p['line_count']} | Preview: {p['preview']}")
    
print("\nLast 10 pages in notebook:")
for p in pages_info[-10:]:
    print(f"  Page {p['page']} | Date: {p['date']} | Lines: {p['line_count']} | Preview: {p['preview']}")

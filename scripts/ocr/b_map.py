# -*- coding: utf-8 -*-
"""B 本(Ελληνικά Β')单元 -> 书页 -> PDF页 映射. 数据源: 解码后全文的目录 + InDesign 版式页码标记"""
import re, json, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
T = open(f'{ROOT}/scratch/pdf_verify/B_pdf_decoded.txt').read()

# 1) 目录: ΕΝΟΤΗΤΑ n 标题 ....... 页码   (页码可能落到下一行)
toc = []
lines = T.split('\n')
for i, ln in enumerate(lines):
    m = re.match(r'\s*ΕΝΟΤΗΤΑ\s+(\d+)\s+(.+?)\s*[\.\s]{6,}\s*(\d+)?\s*$', ln)
    if not m: continue
    n, title, pg = int(m.group(1)), m.group(2).strip(), m.group(3)
    if pg is None:                       # 页码换行了, 往下找第一个纯数字行
        for j in range(i+1, min(i+4, len(lines))):
            if re.fullmatch(r'\s*(\d{1,3})\s*', lines[j]): pg = lines[j].strip(); break
    if pg and not any(x['unit'] == n for x in toc):
        toc.append({'unit': n, 'title': title, 'start_page': int(pg)})
toc.sort(key=lambda x: x['unit'])

# 2) PDF页 -> 书页: 版式标记 "...:Layout ... Page N" (按换页符 \f 切 PDF 页)
pdf2book = {}
pages = T.split('\f')
for i, pg in enumerate(pages, 1):
    m = re.search(r':Layout\b.*?\bPage\s+(\d+)', pg)
    if m: pdf2book[i] = int(m.group(1))

# 3) 单元 -> 结束页
for i, u in enumerate(toc):
    u['end_page'] = (toc[i+1]['start_page'] - 1) if i+1 < len(toc) else 356
    u['system_unit'] = 39 + u['unit']          # 现系统里 B 本是 40-59
    u['pdf_pages'] = sorted(p for p, bp in pdf2book.items() if u['start_page'] <= bp <= u['end_page'])

out = {'book': 'B', 'source': 'Ελληνικά Β.pdf (解码文本, 非OCR)',
       'pdf_page_to_book_page': {str(k): v for k, v in sorted(pdf2book.items())},
       'units': toc}
json.dump(out, open(f'{ROOT}/materials/textbooks/B_unit_page_map.json','w'), ensure_ascii=False, indent=1)
print(f'版式页码锚点 {len(pdf2book)} 个 (PDF共394页)')
print(f'单元 {len(toc)} 个')
for u in toc:
    print(f"  U{u['unit']:>2} (系统{u['system_unit']}) 书页 {u['start_page']:>3}-{u['end_page']:>3} | PDF {len(u['pdf_pages']):>2}页 | {u['title']}")

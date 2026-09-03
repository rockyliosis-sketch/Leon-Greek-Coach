# -*- coding: utf-8 -*-
"""A段三本书单元切分: 靠页眉 '<书页号> | Ενότητα <N>' + 页序公式交叉验证.
输出: materials/textbooks/A_unit_page_map.json
"""
import re, os, sys, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from eval_ocr import BOOKS
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Ενότητα 可能被识别成 Ενοτητα/Evότητα 等; 单元号后可能跟垃圾字符
UNIT_RE = re.compile(r'[ΕE][νvν][όoο0][τtτ][ηnη][τtτ][αa][ςσs]?\s*[:.\s]?\s*(\d{1,2})\b', re.I)

def scan(book):
    fn, total, f = BOOKS[book]
    d = f'{ROOT}/scratch/ocr_text/{book}'
    per_page = {}
    for pg in range(1, total+1):
        p = f'{d}/p{pg:03d}.txt'
        if not os.path.exists(p): continue
        txt = open(p).read()
        hits = [int(x) for x in UNIT_RE.findall(txt) if 1 <= int(x) <= 20]
        per_page[pg] = {'book_page': f(pg), 'unit_hits': hits}
    return per_page

def consolidate(per_page):
    """页眉识别有噪声: 用'书页递增则单元号不减'的单调性做平滑"""
    # 按书页升序(= PDF页降序)
    order = sorted(per_page, key=lambda p: per_page[p]['book_page'])
    raw = []
    for p in order:
        h = per_page[p]['unit_hits']
        raw.append((per_page[p]['book_page'], p, collections.Counter(h).most_common(1)[0][0] if h else None))
    # 前后填补 + 单调不减修正
    known = [(i, u) for i, (_, _, u) in enumerate(raw) if u is not None]
    filled = [u for _, _, u in raw]
    for idx in range(len(filled)):
        if filled[idx] is None:
            prev = next((u for i, u in reversed(known) if i < idx), None)
            nxt  = next((u for i, u in known if i > idx), None)
            filled[idx] = prev if prev is not None and (nxt is None or prev == nxt) else (prev or nxt)
    # 单调不减
    for i in range(1, len(filled)):
        if filled[i] is not None and filled[i-1] is not None and filled[i] < filled[i-1]:
            filled[i] = filled[i-1]
    return [{'book_page': bp, 'pdf_page': pp, 'unit_raw': u, 'unit': fu}
            for (bp, pp, u), fu in zip(raw, filled)]

if __name__ == '__main__':
    result = {}
    for book in BOOKS:
        pp = scan(book)
        rows = consolidate(pp)
        got = sum(1 for r in rows if r['unit_raw'] is not None)
        units = collections.defaultdict(list)
        for r in rows:
            if r['unit'] is not None: units[r['unit']].append(r['book_page'])
        result[book] = {'pages_ocred': len(pp), 'pages_with_header': got,
                        'units': {str(u): [min(v), max(v), len(v)] for u, v in sorted(units.items())},
                        'rows': rows}
        print(f"=== {book} === OCR已完成 {len(pp)}/{BOOKS[book][1]} 页, 其中 {got} 页读到单元号")
        for u, v in sorted(units.items()):
            print(f"   单元 {u:>2}: 书页 {min(v):>3}-{max(v):>3} ({len(v)} 个跨页)")
    json.dump(result, open(f'{ROOT}/materials/textbooks/A_unit_page_map.json','w'),
              ensure_ascii=False, indent=1)

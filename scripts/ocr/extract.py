# -*- coding: utf-8 -*-
"""每单元真词提取: 封闭词表反向搜索.
对每个单元的页面 OCR 文本, 问"权威词典里的哪些词出现在这里".
输出: materials/glossaries/<book>_unit_words.json
"""
import re, os, sys, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from morph import norm
from wordfind import find
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GREEK_RE = re.compile(r'[Ͱ-Ͽἀ-῿]+')

D = json.load(open(f'{ROOT}/materials/glossaries/AUTHORITATIVE_DICT.json'))
MAP = json.load(open(f'{ROOT}/materials/textbooks/A_unit_page_map.json'))

def page_words(book, pdf_page):
    p = f'{ROOT}/scratch/ocr_text/{book}/p{pdf_page:03d}.txt'
    if not os.path.exists(p): return []
    txt = open(p).read().split('\n', 1)[-1]
    return [norm(w) for w in GREEK_RE.findall(txt) if len(norm(w)) >= 2]

def run(book, level):
    entries = D[level]
    rows = MAP[book]['rows']
    by_unit = collections.defaultdict(list)
    for r in rows:
        if r['unit'] is not None: by_unit[r['unit']].append(r)
    out = []
    for u in sorted(by_unit):
        pages = by_unit[u]
        hay = []
        for r in pages: hay += page_words(book, r['pdf_page'])
        hay_set = list(dict.fromkeys(hay))
        found = []
        for e in entries:
            best = None
            for k in e['keys']:
                d = find(k, hay_set)
                if d is not None and (best is None or d < best): best = d
                if best == 0: break
            if best is not None:
                found.append({'word': e['entry'], 'key': e['key'], 'pos': e.get('pos',''),
                              'en': e.get('english',''), 'zh': e.get('chinese',''),
                              'confidence': 'high' if best == 0 else ('mid' if best == 1 else 'low')})
        hi = sum(1 for f in found if f['confidence']=='high')
        out.append({'unit': u, 'book': book,
                    'book_pages': [min(r['book_page'] for r in pages), max(r['book_page'] for r in pages)],
                    'pdf_pages': sorted(r['pdf_page'] for r in pages),
                    'ocr_word_types': len(hay_set),
                    'found_total': len(found), 'found_exact': hi, 'words': found})
        print(f"  单元{u:>2} 书页{out[-1]['book_pages'][0]:>3}-{out[-1]['book_pages'][1]:>3} "
              f"| OCR词型 {len(hay_set):>4} | 命中词典 {len(found):>4} (精确 {hi:>3})")
    json.dump(out, open(f'{ROOT}/materials/glossaries/{book}_unit_words.json','w'),
              ensure_ascii=False, indent=1)
    return out

if __name__ == '__main__':
    for book, level in [(a, b) for a, b in [('A2','A2'),('A1-A','A1'),('A1-B','A1')]
                        if a in (sys.argv[1:] or ['A2'])]:
        print(f'=== {book} (词典层级 {level}, {len(D[level])} 条) ===')
        run(book, level)

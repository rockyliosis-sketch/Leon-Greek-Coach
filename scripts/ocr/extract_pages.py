# -*- coding: utf-8 -*-
"""按跨页提取真词(A1-A / A1-B 用): 每个跨页一份词表, 100% 有据.
单元号不猜 —— 只标注已确认的真值锚点.
输出: materials/glossaries/<book>_page_words.json
"""
import re, os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from morph import norm
from wordfind import find
from eval_ocr import BOOKS
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GREEK_RE = re.compile(r'[Ͱ-Ͽἀ-῿]+')
D = json.load(open(f'{ROOT}/materials/glossaries/AUTHORITATIVE_DICT.json'))

# 已确认的单元锚点(来源: 全页OCR / 实拍图人工确认), 不做任何插值
ANCHORS = {
 'A1-A': {132: 9},
 'A1-B': {28: 19, 34: 20, 96: 27, 114: 29},
}

def run(book, level):
    fn, total, f = BOOKS[book]
    entries = D[level]
    out = []
    for pg in range(1, total+1):
        p = f'{ROOT}/scratch/ocr_text/{book}/p{pg:03d}.txt'
        if not os.path.exists(p): continue
        txt = open(p).read().split('\n', 1)[-1]
        hay = list(dict.fromkeys(norm(w) for w in GREEK_RE.findall(txt) if len(norm(w)) >= 2))
        if not hay: continue
        found = []
        for e in entries:
            best = None
            for k in e['keys']:
                d = find(k, hay)
                if d is not None and (best is None or d < best): best = d
                if best == 0: break
            if best == 0:                      # 只收精确命中, 宁少而准
                found.append({'word': e['entry'], 'key': e['key'], 'pos': e.get('pos',''),
                              'en': e.get('english',''), 'zh': e.get('chinese','')})
        bp = f(pg)
        out.append({'pdf_page': pg, 'book_pages': [bp, bp+1],
                    'unit_confirmed': ANCHORS.get(book, {}).get(bp),
                    'ocr_word_types': len(hay), 'word_count': len(found), 'words': found})
    json.dump(out, open(f'{ROOT}/materials/glossaries/{book}_page_words.json','w'),
              ensure_ascii=False, indent=1)
    nz = [o for o in out if o['word_count'] > 0]
    tot = len({w['key'] for o in out for w in o['words']})
    print(f"{book}: {len(out)} 个跨页有OCR文本, {len(nz)} 个提出真词 | "
          f"每跨页中位 {sorted(o['word_count'] for o in nz)[len(nz)//2]} 词 | 全书去重 {tot} 词")

if __name__ == '__main__':
    for b in (sys.argv[1:] or ['A1-A','A1-B']):
        run(b, 'A1')

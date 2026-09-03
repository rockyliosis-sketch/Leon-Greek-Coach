# -*- coding: utf-8 -*-
"""印刷版扫描件的每单元真词提取(封闭词表反向搜索).
输入: materials/textbooks/<name>_unit_page_map.json + scratch/ocr_text/<name>/
输出: materials/glossaries/<name>_unit_words.json
"""
import re, os, sys, json, collections, itertools
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from morph import norm
from wordfind import find
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GREEK_RE = re.compile(r'[Ͱ-Ͽἀ-῿]+')
D = json.load(open(f'{ROOT}/materials/glossaries/AUTHORITATIVE_DICT.json'))

def lambda_variants(w, chars='βπώϊ', maxn=3):
    """印刷版字体里 λ 常被认成 β/π/ώ/ϊ. 生成还原候选(原词保留, 只做增补)."""
    idx = [i for i, c in enumerate(w) if c in chars]
    if not idx or len(idx) > maxn: return []
    out = []
    for r in range(1, len(idx)+1):
        for combo in itertools.combinations(idx, r):
            t = list(w)
            for i in combo: t[i] = 'λ'
            out.append(''.join(t))
    return out

def run(name, level):
    M = json.load(open(f'{ROOT}/materials/textbooks/{name}_unit_page_map.json'))
    entries = D[level]
    out = []
    for u in M['units']:
        a, b = u['pdf_pages']
        hay = set()
        for pg in range(a, b+1):
            p = f'{ROOT}/scratch/ocr_text/{name}/p{pg:03d}.txt'
            if not os.path.exists(p): continue
            t = open(p).read().split('\n', 1)[-1]
            hay |= {norm(w) for w in GREEK_RE.findall(t) if len(norm(w)) >= 2}
        base = list(hay)
        extra = set()
        for w in base: extra |= set(lambda_variants(w))
        extra -= hay
        hay_all = base + list(extra)
        found = []
        for e in entries:
            best = None
            for k in e['keys']:
                d = find(k, base)
                if d is not None and (best is None or d < best): best = d
                if best == 0: break
            src = 'ocr'
            if best != 0:                      # 原文找不到时才试 λ 还原, 并留痕
                for k in e['keys']:
                    if find(k, list(extra)) == 0: best, src = 0, 'lambda-fix'; break
            if best is not None:
                found.append({'word': e['entry'], 'key': e['key'], 'pos': e.get('pos',''),
                              'en': e.get('english',''), 'zh': e.get('chinese',''),
                              'source': src,
                              'confidence': 'high' if best == 0 else ('mid' if best == 1 else 'low')})
        hi = [f for f in found if f['confidence'] == 'high']
        out.append({'unit': u['unit'], 'book_pages': u['book_pages'], 'pdf_pages': [a, b],
                    'ocr_word_types': len(hay), 'found_total': len(found),
                    'found_exact': len(hi), 'words': found})
        print(f"  单元{u['unit']:>2} 原书{u['book_pages'][0]:>3}-{u['book_pages'][1]:>3} "
              f"| OCR词型 {len(hay):>4} | 命中 {len(found):>4} (精确 {len(hi):>3})")
    # 首现归属(只在精确命中里)
    seen = set()
    for u in out:
        ex = []
        for w in u['words']:
            if w['confidence'] == 'high' and w['key'] not in seen:
                seen.add(w['key']); ex.append(w)
        u['exclusive_words'] = ex; u['exclusive_count'] = len(ex)
    json.dump(out, open(f'{ROOT}/materials/glossaries/{name}_unit_words.json','w'),
              ensure_ascii=False, indent=1)
    print(f'  首现归属合计 {sum(u["exclusive_count"] for u in out)} 词, 全书去重 {len(seen)} 词')

if __name__ == '__main__':
    for nm, lv in [('A2new','A2'), ('A1new','A1')]:
        if nm in (sys.argv[1:] or ['A2new']):
            print(f'=== {nm} (词典 {lv}, {len(D[lv])} 条) ==='); run(nm, lv)

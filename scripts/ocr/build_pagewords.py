# -*- coding: utf-8 -*-
"""统一逐页真词提取(所有教材).
三种命中方式, 各自留痕:
  exact  —— 页面上直接出现词典原形
  stem   —— 页面上是变位形式, 按希腊语词尾规则还原到原形
  lambda —— 印刷版字体 λ 被认成 β/π/ώ/ϊ, 还原后精确命中
输出: materials/glossaries/pagewords_<book>.json
"""
import re, os, sys, json, itertools, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from morph import MorphMatcher, norm, STOP
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GR = re.compile(r'[Ͱ-Ͽἀ-῿]+')
D = json.load(open(f'{ROOT}/materials/glossaries/AUTHORITATIVE_DICT.json'))

# book -> (OCR目录, 词典层级, 页码换算, 总页数)
BOOKS = {
 'a1-a':  ('A1-A',  'A1', lambda n: 10 + (91-n)*2, 91,  'spread'),
 'a1-b':  ('A1-B',  'A1', lambda n: 6  + (85-n)*2, 85,  'spread'),
 'a2':    ('A2new', 'A2', lambda n: n - 1,         152, 'single'),
 'a1new': ('A1new', 'A1', lambda n: n - 1,         256, 'single'),
}

def lam_variants(w, chars='βπώϊ', maxn=3):
    idx = [i for i, c in enumerate(w) if c in chars]
    if not idx or len(idx) > maxn: return []
    out = []
    for r in range(1, len(idx)+1):
        for cb in itertools.combinations(idx, r):
            t = list(w)
            for i in cb: t[i] = 'λ'
            out.append(''.join(t))
    return out

def run(book):
    d, level, pagef, total, kind = BOOKS[book]
    entries = D[level]
    # 词典键 -> 词条 (含 -άω/-ώ 等全部匹配键)
    key2e = {}
    for e in entries:
        for k in e['keys']: key2e.setdefault(k, e)
    mm = MorphMatcher()
    out = []
    for pg in range(1, total+1):
        p = f'{ROOT}/scratch/ocr_text/{d}/p{pg:03d}.txt'
        if not os.path.exists(p): continue
        txt = open(p).read().split('\n', 1)[-1]
        raw = [norm(w) for w in GR.findall(txt)]
        hay = {w for w in raw if len(w) >= 2}
        if not hay: continue
        hits = {}
        # 1) 原形直接出现
        for w in hay & key2e.keys():
            hits[key2e[w]['key']] = (key2e[w], 'exact')
        # 2) λ 还原后精确命中
        for w in hay:
            for v in lam_variants(w):
                e = key2e.get(v)
                if e and e['key'] not in hits: hits[e['key']] = (e, 'lambda')
        # 3) 变位形式 -> 词形还原
        for w in hay:
            if w in key2e or w in STOP or len(w) < 4: continue
            k, how = mm.match(w)
            if k and how and how.startswith('stem') and k not in hits:
                e = key2e.get(k)
                if e: hits[k] = (e, 'stem')
        bp = pagef(pg)
        out.append({'pdf_page': pg,
                    'book_pages': [bp, bp+1] if kind == 'spread' else [bp],
                    'ocr_types': len(hay),
                    'words': [{'key': k, 'word': e['entry'], 'pos': e.get('pos',''),
                               'en': e.get('english',''), 'zh': e.get('chinese',''),
                               'match': how} for k, (e, how) in sorted(hits.items())]})
    json.dump(out, open(f'{ROOT}/materials/glossaries/pagewords_{book}.json','w'),
              ensure_ascii=False, indent=1)
    c = collections.Counter(w['match'] for p in out for w in p['words'])
    uniq = len({w['key'] for p in out for w in p['words']})
    med = sorted(len(p['words']) for p in out)[len(out)//2] if out else 0
    print(f"{book:>6}: {len(out):>3}页 | 每页中位 {med:>3} 词 | 全书去重 {uniq:>4} 词 "
          f"| exact {c['exact']} stem {c['stem']} lambda {c['lambda']}")

if __name__ == '__main__':
    for b in (sys.argv[1:] or list(BOOKS)): run(b)

# -*- coding: utf-8 -*-
"""希腊语教材 OCR 流水线: 渲染 -> OCR -> 多调归一 -> 权威词典纠错"""
import re, json, unicodedata, subprocess, os, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GREEK_RE = re.compile(r'[Ͱ-Ͽἀ-῿]+')
LAT2GR = str.maketrans({'A':'Α','B':'Β','E':'Ε','H':'Η','I':'Ι','K':'Κ','M':'Μ','N':'Ν',
                        'O':'Ο','P':'Ρ','T':'Τ','X':'Χ','Y':'Υ','Z':'Ζ','o':'ο','v':'ν'})

def to_monotonic(s):
    """古希腊多调符号 -> 现代单调 (ἰ->ι, ὗ->υ, ῆ->η)"""
    out = []
    for ch in s:
        d = unicodedata.normalize('NFD', ch)
        base = d[0]
        if 'Ͱ' <= base <= 'Ͽ' or 'ἀ' <= ch <= '῿':
            marks = [m for m in d[1:] if m in ('́', '̈')]
            out.append(unicodedata.normalize('NFC', base + ''.join(marks)))
        else:
            out.append(ch)
    return ''.join(out)

def norm(s):
    s = s.translate(LAT2GR)
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    return s.lower().strip()

def lev(a, b, cap=2):
    """带上限的编辑距离"""
    if abs(len(a) - len(b)) > cap: return cap + 1
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i] + [0] * len(b)
        best = cur[0]
        for j, cb in enumerate(b, 1):
            cur[j] = min(prev[j] + 1, cur[j-1] + 1, prev[j-1] + (ca != cb))
            best = min(best, cur[j])
        if best > cap: return cap + 1
        prev = cur
    return prev[-1]

class Corrector:
    def __init__(self):
        self.idx = json.load(open(f'{ROOT}/materials/glossaries/AUTHORITATIVE_INDEX.json'))
        d = json.load(open(f'{ROOT}/materials/glossaries/AUTHORITATIVE_DICT.json'))
        self.by_key = {x['key']: x for lv in d.values() for x in lv}
        self.buckets = collections.defaultdict(list)
        for k in self.idx:
            self.buckets[len(k)].append(k)

    def lookup(self, w):
        return self.idx.get(norm(w))

    def correct(self, w):
        """返回 (纠正后词条key, 编辑距离) 或 (None, None)"""
        n = norm(w)
        if not n: return None, None
        if n in self.idx: return self.idx[n], 0
        if len(n) < 4: return None, None            # 太短不猜
        best, bd = None, 3
        for L in (len(n)-1, len(n), len(n)+1):
            for k in self.buckets.get(L, ()):
                d = lev(n, k, cap=1)
                if d < bd: best, bd = k, d
                if bd == 0: break
        return (self.idx[best], bd) if best and bd <= 1 else (None, None)

WORK = f'{ROOT}/scratch/ocr_work'
os.makedirs(WORK, exist_ok=True)

def render(pdf, page, dpi=300, out=None):
    """pdftoppm 的补零位数取决于总页数(2位/3位), 不能猜 —— 用 glob 取实际文件"""
    import glob as _g
    out = out or f'{WORK}/p{page}'
    for f in _g.glob(out + '-*.png'):
        os.remove(f)
    subprocess.run(['pdftoppm','-f',str(page),'-l',str(page),'-r',str(dpi),'-png',pdf,out],
                   capture_output=True)
    hits = _g.glob(out + '-*.png')
    if not hits:
        raise FileNotFoundError(f'pdftoppm 未产出: {out} (page {page})')
    return hits[0]

def ocr(img, psm=3):
    r = subprocess.run(['tesseract', img, 'stdout', '-l', 'ell', '--psm', str(psm)],
                       capture_output=True, text=True, errors='replace')
    return to_monotonic(r.stdout)

def analyse(text, corr):
    """统计 OCR 文本的词典命中率"""
    words = [w for w in GREEK_RE.findall(text) if len(norm(w)) >= 3]
    hit = fixed = miss = 0
    fixes, misses = [], []
    for w in words:
        if corr.lookup(w): hit += 1
        else:
            k, d = corr.correct(w)
            if k: fixed += 1; fixes.append((w, corr.by_key[k]['entry']))
            else: miss += 1; misses.append(w)
    return {'total': len(words), 'hit': hit, 'fixed': fixed, 'miss': miss,
            'fixes': fixes, 'misses': misses}

if __name__ == '__main__':
    corr = Corrector()
    pdf = f'{ROOT}/raw_books/raw_sources/textbooks/（已压缩）LEON_S GREEK TEXTBOOK A1-A.pdf'
    for pg in [int(x) for x in sys.argv[1:]] or [10]:
        img = render(pdf, pg)
        txt = ocr(img)
        r = analyse(txt, corr)
        t = r['total'] or 1
        print(f"=== A1-A PDF p{pg} ===  希腊语词 {r['total']}")
        print(f"  直接命中词典 {r['hit']:>3} ({r['hit']/t*100:.0f}%)"
              f" | 纠错后命中 {r['fixed']:>3} ({r['fixed']/t*100:.0f}%)"
              f" | 仍未识别 {r['miss']:>3} ({r['miss']/t*100:.0f}%)")
        print(f"  可用率(命中+纠错) = {(r['hit']+r['fixed'])/t*100:.0f}%")
        if r['fixes']:
            print("  纠错样例:", '; '.join(f'{a}→{b}' for a,b in r['fixes'][:8]))
        if r['misses']:
            print("  未识别样例:", ' '.join(r['misses'][:12]))
        print()

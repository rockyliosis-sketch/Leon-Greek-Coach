# -*- coding: utf-8 -*-
import sys, os, re, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from morph import MorphMatcher, norm
from greek_ocr import render, ocr, GREEK_RE, ROOT

BOOKS = {
 'A1-A': ('（已压缩）LEON_S GREEK TEXTBOOK A1-A.pdf', 91, lambda n: 10 + (91-n)*2),
 'A1-B': ('（已压缩）LEON_S GREEK TEXTBOOK A1-B.pdf', 85, lambda n: 6  + (85-n)*2),
 'A2'  : ('（已压缩）LEON_S GREEK TEXTBOOK A2.pdf',   67, lambda n: 16 + (67-n)*2),
}

def evaluate(m, book, pages):
    fn, total, f = BOOKS[book]
    pdf = f'{ROOT}/raw_books/raw_sources/textbooks/{fn}'
    agg = dict(tot=0, stop=0, exact=0, stem=0, weak=0, miss=0)
    miss_samples, found = [], []
    for pg in pages:
        txt = ocr(render(pdf, pg))
        for w in GREEK_RE.findall(txt):
            if len(norm(w)) < 2:
                continue
            agg['tot'] += 1
            if m.is_stop(w):
                agg['stop'] += 1; continue
            k, how = m.match(w)
            if how == 'exact': agg['exact'] += 1; found.append(k)
            elif how and how.startswith('stem:'): agg['stem'] += 1; found.append(k)
            elif how: agg['weak'] += 1; found.append(k)
            else:
                agg['miss'] += 1
                if len(miss_samples) < 25: miss_samples.append(w)
    content = agg['tot'] - agg['stop']
    c = content or 1
    print(f"— {book} 抽样 {len(pages)} 页 (原书 {', '.join(str(f(p)) for p in pages)} 页) —")
    print(f"  希腊语词 {agg['tot']} 个, 其中语法功能词 {agg['stop']} 个 → 实词 {content} 个")
    print(f"  精确匹配词典 {agg['exact']:>4} ({agg['exact']/c*100:.0f}%)")
    print(f"  词形还原命中 {agg['stem']:>4} ({agg['stem']/c*100:.0f}%)")
    print(f"  低置信匹配   {agg['weak']:>4} ({agg['weak']/c*100:.0f}%)")
    print(f"  未识别       {agg['miss']:>4} ({agg['miss']/c*100:.0f}%)")
    print(f"  ★ 可信识别率 = {(agg['exact']+agg['stem'])/c*100:.0f}%   含低置信 = {(agg['exact']+agg['stem']+agg['weak'])/c*100:.0f}%")
    print(f"  未识别样例: {' '.join(miss_samples[:16])}")
    print(f"  识别到的不同词条: {len(set(found))} 个")
    print()
    return agg

if __name__ == '__main__':
    m = MorphMatcher()
    evaluate(m, 'A1-A', [10, 45, 80])
    evaluate(m, 'A1-B', [20, 40, 70])
    evaluate(m, 'A2',   [15, 30, 55])

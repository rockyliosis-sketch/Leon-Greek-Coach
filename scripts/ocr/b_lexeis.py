# -*- coding: utf-8 -*-
"""提取 B 本每单元 "Λέξεις, λέξεις" 侧栏方框里的词 —— 教材自己点名的生词.

为什么必须按坐标提, 不能读文字流:
  这个方框是分栏/旋转排版, pdftotext 的文字流会把 "πρόσκληση (η)"
  拆成 "ση (η)" + "πρόσκλη" 两段, 直接读文字流必然出错.

识别方框的判据(试过字号和字体都不可靠, 全书不统一):
  1) 位置: 在 "Λέξεις, λέξεις" 标签下方 175pt 内, 且不在标签左侧 45pt 以外
  2) 自成一列: 同一水平线上、标签左边远处没有词(有则说明它属于正文行)
  然后按 top 聚成行、行内按 x0 排序拼回, 冠词才能跟回它的名词.

多栏方框(如 p167/p70)行内会交错, 属于已知缺陷 —— 词本身不丢, 留待逐词校对时拆开.

输出: materials/glossaries/B_lexeis_box.json
"""
import re, os, sys, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from decode import dec, fix_mixed
import pdfplumber

ROOT  = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PDF   = f'{ROOT}/raw_books/raw_sources/textbooks/Ελληνικά Β.pdf'
GREEK = re.compile(r'[Α-Ωα-ωΆ-Ώά-ώϊϋΐΰ]')
TOKEN = re.compile(r'[Α-Ωα-ωΆ-Ώά-ώϊϋΐΰ]{3,}')

def force(s):
    """老式字形 -> 真希腊字母.
    'fi' 是 ό 的连字, pdfplumber 会把它拆成两个 ASCII 字符, 先合回去。
    解码本身交给 decode.dec(), 它按行做两级判断, 不会把正常 Unicode 解坏。
    """
    return fix_mixed(dec(s.replace('ﬁ', 'ό').replace('fi', 'ό')))

def box_lines(pg):
    ws = pg.extract_words()
    if not ws: return []
    dw = [(force(w['text']), w) for w in ws]
    labs = [w for t, w in dw if t.startswith('Λέξεις')]
    if not labs: return []
    lab = min(labs, key=lambda w: w['top'])
    lx, lt = lab['x0'], lab['top']

    cand = []
    for t, w in dw:
        if not (lt + 8 < w['top'] < lt + 175): continue
        if w['x0'] < lx - 45: continue
        if any(abs(x['top'] - w['top']) <= 3 and x['x0'] < lx - 70 for _, x in dw): continue
        cand.append((t, w))

    cand.sort(key=lambda z: (z[1]['top'], z[1]['x0']))
    rows, cur, curtop = [], [], None
    for t, w in cand:
        if curtop is None or abs(w['top'] - curtop) <= 3.5:
            cur.append((t, w))
            if curtop is None: curtop = w['top']
        else:
            rows.append(cur); cur = [(t, w)]; curtop = w['top']
    if cur: rows.append(cur)

    out = []
    for r in rows:
        r.sort(key=lambda z: z[1]['x0'])
        s = ''
        for i, (t, w) in enumerate(r):
            if i and w['x0'] - r[i-1][1]['x1'] > 1.6: s += ' '
            s += t
        s = force(s).strip()      # 拼成完整行后再解一次, 行级证据比单词更足
        if GREEK.search(s): out.append(s)
    return out

def main():
    umap = json.load(open(f'{ROOT}/materials/textbooks/B_unit_page_map.json'))
    pdf2book = {int(k): v for k, v in umap['pdf_page_to_book_page'].items()}
    page2unit = {p: u for u in umap['units'] for p in u['pdf_pages']}

    boxes = []
    with pdfplumber.open(PDF) as pdf:
        for i, pg in enumerate(pdf.pages, 1):
            u = page2unit.get(i)
            if not u: continue
            lines = box_lines(pg)
            if not lines: continue
            boxes.append({'pdf_page': i, 'book_page': pdf2book.get(i),
                          'unit': u['unit'], 'system_unit': u['system_unit'],
                          'unit_title': u['title'], 'lines': lines,
                          'tokens': sorted({t for ln in lines for t in TOKEN.findall(ln)})})

    json.dump({'schema': 'b_lexeis_box_v1',
               'note': 'B本每单元 Λέξεις,λέξεις 方框内容, 按PDF坐标聚类提取(非OCR). '
                       'lines=按行重建的原文, tokens=其中的希腊词(>=3字母)',
               'boxes': boxes},
              open(f'{ROOT}/materials/glossaries/B_lexeis_box.json', 'w'),
              ensure_ascii=False, indent=1)

    tot = len({t for b in boxes for t in b['tokens']})
    print(f'方框 {len(boxes)} 个, 去重后词 {tot} 个')
    c = collections.Counter(b['unit'] for b in boxes)
    for u in sorted(c):
        n = len({t for b in boxes if b['unit'] == u for t in b['tokens']})
        print(f'  U{u:>2}  {c[u]} 框  {n:>3} 词')

if __name__ == '__main__':
    main()

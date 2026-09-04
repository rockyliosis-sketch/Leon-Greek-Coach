# -*- coding: utf-8 -*-
"""
从压缩教材文本里还原 A1 儿童版两册的**真实单元页码带**。

背景：这两本书的照片 OCR 只认出零星几个单元锚点(A1-A 只认出 1 个)，所以之前
一直只能按「20 页一块」切，界面上写「课本第 X–Y 页」。但压缩版教材
（（已压缩）LEON_S GREEK TEXTBOOK A1-A/B.md）里逐页保留了 "Ενότητα N" 标题，
锚点干净且单调递增 —— 只是它的「原书第 N 页」数的是**跨页**，要换算回书页。

换算：每个跨页 = 2 个书页，A1-A 从书页 10 起，A1-B 从书页 6 起
      书页 = 起始页 + 2 × (跨页号 − 1)

已核对：把还原出的页码带和词库里那几页的实际词对照，
  A1-A U1 人名/你好、U4 课桌/学生/记号笔、U7 奶奶/父母、U8 眼睛/头发/蓝色、
       U9 宝藏/骑士/巫婆、U12 书桌/报纸/椅子、U13 邮局/银行/红绿灯、U15 小丑/气球
  —— 与单元主题一一对上，换算成立。

⚠️ A1-B 的实际单元号是 16–33（18 个），而应用里那份单元名只列到 30，
   且主题与实际页码内容对不上（应用说 U24 是「大自然动植物」，那几页实际在讲天气）。
   所以 A1-B 只输出**真实单元号 + 页码带**，不套用那份对不上的主题名。
"""
import re, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BOOKS = [
    ('a1-a', '（已压缩）LEON_S GREEK TEXTBOOK A1-A.md', 10, 191),
    ('a1-b', '（已压缩）LEON_S GREEK TEXTBOOK A1-B.md',  6, 174),
]

out = {}
for book, fname, first_page, last_page in BOOKS:
    txt = open(f'{ROOT}/materials/textbooks/{fname}', encoding='utf-8').read()
    spread, anchors = None, {}
    for ln in txt.split('\n'):
        m = re.match(r'^—— 原书第\s*(\d+)\s*页 ——', ln.strip())
        if m:
            spread = int(m.group(1)); continue
        if spread is None: continue
        for mm in re.finditer(r'Ενότητα\s*(\d+)|第\s*(\d+)\s*单元', ln):
            u = int(mm.group(1) or mm.group(2))
            if 1 <= u <= 40:
                anchors.setdefault(u, spread)          # 每个单元取最早出现的跨页
    # 按**跨页先后**走一遍，单元号必须递增；不递增的是正文里回指别的单元的误匹配。
    # (A1-B 末尾出现一个「Ενότητα 7」，是课文里提到前册的单元，必须剔掉，
    #  否则会把整册压成两段。)
    clean, last_u = {}, -1
    for sp in sorted(set(anchors.values())):
        for u, s2 in sorted(anchors.items()):
            if s2 == sp and u > last_u:
                clean[u] = sp; last_u = u; break
    units, ks = [], sorted(clean)
    for i, u in enumerate(ks):
        lo = first_page + 2 * (clean[u] - 1)
        hi = (first_page + 2 * (clean[ks[i+1]] - 1) - 1) if i + 1 < len(ks) else last_page
        units.append({'unit': u, 'pages': [lo, hi], 'spread': clean[u]})
    # 单元 1 之前的部分（A1-A 是字母表教学区）单独成段
    if units and units[0]['pages'][0] > first_page:
        units.insert(0, {'unit': 0, 'pages': [first_page, units[0]['pages'][0] - 1],
                         'spread': 1, 'preface': True})
    out[book] = units
    print(f'{book}: {len(units)} 段  ' +
          ' '.join(f"U{u['unit']}:{u['pages'][0]}-{u['pages'][1]}" for u in units))

json.dump({
    'schema': 'a1_unit_page_map_v1',
    'note': ('A1 儿童版两册的真实单元页码带，从压缩版教材逐页保留的 Ενότητα 标题还原。'
             '跨页号 → 书页：书页 = 起始页 + 2×(跨页号−1)。已用词库内容逐单元核对主题。'
             'unit=0 表示单元 1 之前的部分（A1-A 是字母表教学区）。'
             'A1-B 实际单元号到 33，与应用里只到 30 的那份单元名不对应，故不套用主题名。'),
    'built_by': 'scripts/ocr/build_a1_unit_map.py',
    'books': out,
}, open(f'{ROOT}/frontend/src/data/a1_unit_map.json', 'w', encoding='utf-8'),
   ensure_ascii=False, indent=1)

# -*- coding: utf-8 -*-
"""把 B 本 967 词做成一张「单词表」, 写进 frontend/src/data/glossary_v2.json 的 lists.B1。

为什么要单独做一张:
  家长后台的「单词表背诵进度」原本只有 A1/A2 两张官方词表。B 本的词表 PDF
  (Ellinika_B_Glossary_CN.pdf) 已经印出来了, 家长手里有纸, 却没地方标「背到哪」。

编号规则 —— 必须和 PDF 一模一样, 否则家长照着纸点会点错:
  单元 1→20 升序, 单元内按「去掉重音的小写 headword」字母序,
  与 scripts/ocr/make_b_glossary.py 的 sortkey 保持同一套。

id 号段: A1 用 900001+, A2 用 950001+, B1 用 960001+ (967 词, 不会与 A2 的 951682 重叠)。
可重跑: 每次都从 vocabulary_v2.json 重新生成, 覆盖 lists.B1。
"""
import json, os, collections, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VOCAB = f'{ROOT}/frontend/src/data/vocabulary_v2.json'
GLOSS = f'{ROOT}/frontend/src/data/glossary_v2.json'
UMAP  = f'{ROOT}/materials/textbooks/B_unit_page_map.json'

def sortkey(e):
    """与 make_b_glossary.py 完全一致: NFD 去重音 + 小写"""
    return ''.join(c for c in unicodedata.normalize('NFD', e['headword'].lower())
                   if unicodedata.category(c) != 'Mn')

V = [e for e in json.load(open(VOCAB))['entries'] if e['book_id'] == 'b1']
UM = {u['unit']: u for u in json.load(open(UMAP))['units']}

byu = collections.defaultdict(list)
for e in V:
    byu[e['unit']].append(e)

out, idx = [], 0
for u in sorted(byu):
    m = UM[u]
    for e in sorted(byu[u], key=sortkey):
        idx += 1
        out.append({
            'idx': idx,
            'id': 960000 + idx,
            'level': 'B1',
            'unit': u,
            'unit_title': m['title'],
            'unit_pages': f"{m['start_page']}-{m['end_page']}",
            'word_greek': e['word_greek'],
            'entry': e['word_greek'],
            'word_chinese': e.get('word_chinese') or '',
            'word_english': e.get('word_english') or '',
            'pronunciation': e.get('pronunciation') or '',
            'pos': e.get('pos') or '',
            'star': e.get('match') == 'lexeis-box',   # 教材方框点名的生词
            'zh_source': e.get('zh_source') or 'claude',
        })

g = json.load(open(GLOSS))
g['lists']['B1'] = out
g['note'] = ('A1/A2: 希腊教育部官方词表, 按字母序编号. '
             'B1: B本课本提取词表, 按单元编号(与 Ellinika_B_Glossary_CN.pdf 同序), 中文为 AI 给出非官方. '
             '家长在后台点词标「背到这里」来控制解锁.')
json.dump(g, open(GLOSS, 'w'), ensure_ascii=False, indent=1)

print(f'B1 词表写入 {len(out)} 条  (idx 1–{idx}, id 960001–{960000+idx})')
for u in sorted(byu):
    print(f'  第 {u:>2} 单元  {len(byu[u]):>3} 词   {UM[u]["title"]}')

# -*- coding: utf-8 -*-
"""把人工校对好的 B 本词表拼装成 vocabulary_v2 的 b1 条目.

输入:
  materials/glossaries/B_review/u01..u20.tsv   人工逐条校对的结果
      每行: 词干 \\t 原形(带冠词) \\t 中文 \\t 英文 \\t 词性
  materials/glossaries/B_selected.json         机器提取的证据(页码/单元/频次)

为什么中文标 zh_source='claude':
  A1/A2 的中文来自希腊教育部官方词表, 有权威出处;
  B 本没有官方词表, 中文是我逐条给的。来源不同就必须标不同,
  日后要复核、要换更权威的来源, 一条 SQL 就能筛出来。

输出: materials/glossaries/B_vocab.json
"""
import os, re, sys, json, glob, unicodedata, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_vocab_v2 import translit

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REV  = f'{ROOT}/materials/glossaries/B_review'

sel = {w['stem']: w for w in json.load(open(f'{ROOT}/materials/glossaries/B_selected.json'))['words']}
umap = {u['unit']: u for u in json.load(open(f'{ROOT}/materials/textbooks/B_unit_page_map.json'))['units']}

def headword(entry):
    """'κάταγμα, το' -> 'κάταγμα';  'φαρδύς, -ιά, -ύ' -> 'φαρδύς'"""
    return re.split(r'\s*,\s*', entry.strip())[0].strip()

rows, missing, dup = [], [], collections.Counter()
for f in sorted(glob.glob(f'{REV}/u*.tsv')):
    unit = int(os.path.basename(f)[1:3])
    for ln in open(f):
        ln = ln.rstrip('\n')
        if not ln.strip(): continue
        parts = ln.split('\t')
        if len(parts) < 4:
            print('!! 字段不足:', f, repr(ln)); continue
        stem, lemma, zh, en = parts[0], parts[1], parts[2], parts[3]
        pos = parts[4] if len(parts) > 4 else ''
        ev = sel.get(stem)
        if not ev:
            missing.append((unit, stem)); continue
        hw = headword(lemma)
        dup[hw] += 1
        rows.append({
            'stem': stem, 'unit': unit, 'lemma': lemma, 'headword': hw,
            'zh': zh, 'en': en, 'pos': pos, 'ev': ev,
        })

# 同一个原形在多个单元重复出现 -> 只保留最早的单元
seen, out = set(), []
for r in sorted(rows, key=lambda r: (r['unit'], -r['ev']['score'])):
    if r['headword'] in seen: continue
    seen.add(r['headword'])
    out.append(r)

entries = []
for i, r in enumerate(out, 1):
    ev, u = r['ev'], umap.get(r['unit'], {})
    entries.append({
        'id': 400000 + i,                       # b1 号段, 与 a1/a2(1-2472) 和词表(9xxxxx) 都不撞
        'book_id': 'b1',
        'unit': r['unit'],
        'unit_title': u.get('title', ''),
        'system_unit': u.get('system_unit'),
        'page_number': ev['first_page'],
        'pages': ev.get('pages') or ([ev['first_page']] if ev['first_page'] else []),
        'word_greek': r['lemma'],
        'headword': r['headword'],
        'word_chinese': r['zh'],
        'word_english': r['en'],
        'pronunciation': translit(r['headword']),
        'pos': r['pos'],
        'match': 'lexeis-box' if ev['boxed'] else 'corpus',
        'zh_source': 'claude',
        'occurrences': ev['total'],
        'boxed': ev['boxed'],
        'forms': ev['forms'][:6],
    })

json.dump({'schema': 'b_vocab_v1',
           'note': 'B本(Ελληνικά Β\')词表. 词来自PDF文字层逐字解码(非OCR), '
                   '原形与中文由人工逐条校对, zh_source=claude 表示中文非官方来源.',
           'total': len(entries), 'entries': entries},
          open(f'{ROOT}/materials/glossaries/B_vocab.json', 'w'),
          ensure_ascii=False, indent=1)

print(f'入库 {len(entries)} 条 (校对 {len(rows)} 条, 跨单元重复合并 {len(rows)-len(out)} 条)')
if missing:
    print(f'!! 词干对不上证据表 {len(missing)} 条:', missing[:10])
print('\n按单元:')
c = collections.Counter(e['unit'] for e in entries)
for u in sorted(c):
    print(f"  U{u:>2} (系统{umap[u]['system_unit']})  {c[u]:>3} 词   p{umap[u]['start_page']}-{umap[u]['end_page']}  {umap[u]['title'][:26]}")
print(f"\n教材方框点名 {sum(1 for e in entries if e['boxed'])} 条")
print('缺中文:', sum(1 for e in entries if not e['word_chinese']))

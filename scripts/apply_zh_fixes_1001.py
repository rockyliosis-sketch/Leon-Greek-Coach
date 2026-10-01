"""2026-10-01: 改词库里写错 / 会误导的中文 (清单 docs/zh_fix_2026-10-01.tsv, 逐词审核后人工复核)。

只改 word_chinese(+ zh_source='fix'), 不增删词条, 不动 idx/id (背词进度按 idx 记)。
同一个词在 A1/A2/B1 词表和课本词库里各有一份, 「原中文」完全相同的那几份一起改;
写法不同的那份(别的词表另写的)不动 —— 它可能本来就对。
另: A2 单词表 1275「προσκαλώ]」多了半个括号, 去掉。
可重复运行: 第二次跑应当一处都不改。
"""
import json, re, unicodedata, csv

R = '/Users/johnsmacbook/Documents/Codex/Leon-Greek-Coach/'
D = R + 'frontend/src/data/'


def same_word_key(greek):   # 与 StudentApp.tsx 的 sameWordKey 一致
    s = (greek or '').split(',')[0]
    s = re.sub(r'\(.*?\)|\[.*?\]|（.*?）|【.*?】', '', s)
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()
    return re.sub(r'[^Ͱ-Ͽἀ-῿]', '', s)


rows = list(csv.DictReader(open(R + 'docs/zh_fix_2026-10-01.tsv'), delimiter='\t'))
fix = {}
for r in rows:
    assert not re.search(r'[Ͱ-Ͽ]', re.sub(r'（.*?）', '', r['新中文'])), r
    fix[(same_word_key(r['希腊语']), r['原中文'])] = r['新中文']

used = set()
changes = 0


def apply(entries, where):
    global changes
    for e in entries:
        key = (same_word_key(e.get('word_greek', '')), e.get('word_chinese', ''))
        if key in fix:
            used.add(key)
            if e['word_chinese'] != fix[key]:
                e['word_chinese'] = fix[key]
                e['zh_source'] = 'fix'
                changes += 1


def save(p, d):
    tail = '\n' if open(p).read().endswith('\n') else ''
    open(p, 'w').write(json.dumps(d, ensure_ascii=False, indent=1) + tail)


g = json.load(open(D + 'glossary_v2.json'))
for lv, lst in g['lists'].items():
    apply(lst, 'glossary ' + lv)
    for w in lst:
        for f in ('word_greek', 'entry'):
            if w.get(f) == 'προσκαλώ]':
                w[f] = 'προσκαλώ'
                changes += 1
save(D + 'glossary_v2.json', g)

v = json.load(open(D + 'vocabulary_v2.json'))
apply(v['entries'], 'vocab')
save(D + 'vocabulary_v2.json', v)

missing = [k for k in fix if k not in used]
for k in missing:
    print('清单里有、词库里没对上:', k)
print(f'清单 {len(fix)} 条; 本次改动 {changes} 处')

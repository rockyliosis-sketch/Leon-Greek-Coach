"""2026-10-01: 生成 frontend/src/data/zh_accept.json —— 「希译汉」里除了标准答案, 还有哪些中文说法也算对。

来源 docs/zh_accept_audit_2026-10-01.jsonl: 全库 2903 个希腊语词逐词审过(8 路并行, 再人工复核),
每行 {"forms": [这个词在各词表里的写法], "zh": [现有中文], "alts": [也算对的说法]}。
要加要减说法, 改那个 jsonl 再跑本脚本。

键必须与 StudentApp.tsx 的 sameWordKey 完全一致:
第一个逗号前 -> 去括号 -> 去重音 -> 小写 -> 只留希腊字母 (αγόρι, το -> αγορι; μεγάλ-ος -> μεγαλος)。
"""
import json, re, unicodedata

R = '/Users/johnsmacbook/Documents/Codex/Leon-Greek-Coach/'
SRC = R + 'docs/zh_accept_audit_2026-10-01.jsonl'
OUT = R + 'frontend/src/data/zh_accept.json'


def same_word_key(greek: str) -> str:
    s = (greek or '').split(',')[0]
    s = re.sub(r'\(.*?\)|\[.*?\]|（.*?）|【.*?】', '', s)
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()
    return re.sub(r'[^Ͱ-Ͽἀ-῿]', '', s)


accept = {}
rows = 0
for line in open(SRC):
    r = json.loads(line)
    rows += 1
    if not r['alts']:
        continue
    for form in r['forms']:
        k = same_word_key(form)
        if not k:
            continue
        lst = accept.setdefault(k, [])
        for a in r['alts']:
            if a not in lst:
                lst.append(a)

payload = {
    'note': '希译汉: 标准答案之外也算对的中文说法(男生/男孩、汞/水银、失去/丢…)。'
            '键 = 词头去重音去符号, 与 StudentApp.tsx 的 sameWordKey 一致。',
    'generated_by': 'scripts/build_zh_accept.py',
    'source': 'docs/zh_accept_audit_2026-10-01.jsonl',
    'accept': dict(sorted(accept.items())),
}
open(OUT, 'w').write(json.dumps(payload, ensure_ascii=False, indent=1) + '\n')
print(f'审过 {rows} 个词; {len(accept)} 个词头有额外说法, 共 {sum(len(v) for v in accept.values())} 条 -> {OUT}')

# -*- coding: utf-8 -*-
"""把 2560 条候选精炼成约 1500 条、按单元归位.

三步:
 1) 词形归并: γράφω/έγραψα/γράψει 这类同一个词的不同变位合成一簇
 2) 剔除: 疑似专有名词(人名地名)、只在一个单元出现一次两次的边角料
 3) 排序取舍: 教材点名 > 跨单元复现(通用词) > 单元内高频
    再按单元配额分配, 保证每个单元都有词, 不会全挤在长单元

输出: materials/glossaries/B_selected.json  (待人工逐条配中文)
"""
import re, os, sys, json, math, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from morph import norm

ROOT   = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET = 1500

SUF = sorted(set('''ονται ομαστε οσαστε ουμαι ηκαμε ηκατε ηκανε θηκαν θηκες θηκε θηκα
ουσαν ουσες ουσε ουσα ομουν οσουν οταν ομαι εσαι εται ουμε ουνε ονταν
ηκαν ηκες ηκε ηκα αμε ατε ανε εις ετε ουν ει ω ας ε
ιοτητα οτητα ματα ματος ιμος ισμος ισμου ισμο
εων ιων ους ων οι ες ας ης ος ου αι ια α η ο ς ι υ'''.split()), key=len, reverse=True)

def crude(n):
    """粗词干: 剥掉最长的一个常见结尾, 保底留 4 个字母"""
    for s in SUF:
        if n.endswith(s) and len(n) - len(s) >= 4:
            return n[:len(n)-len(s)]
    return n

D = json.load(open(f'{ROOT}/materials/glossaries/B_candidates.json'))['candidates']

# ---- 1) 归并 ----
clusters = collections.defaultdict(list)
for c in D:
    clusters[crude(c['norm'])].append(c)

merged = []
for stem, items in clusters.items():
    items.sort(key=lambda x: -x['total'])
    total = sum(x['total'] for x in items)
    units = collections.Counter()
    for x in items:
        for u in x['units']: units[u] += 1
    forms = []
    for x in items:
        forms.extend(x['forms'])
    forms.sort(key=lambda f: -f['n'])
    boxed = any(x['boxed'] for x in items)
    merged.append({
        'stem': stem,
        'top_form': items[0]['forms'][0]['form'] if items[0]['forms'] else items[0]['norm'],
        'variants': [x['norm'] for x in items],
        'forms': [f['form'] for f in forms[:8]],
        'total': total,
        'units': sorted(units),
        'unit_main': min(units, key=lambda u: (-units[u], u)),
        'unit_span': len(units),
        'first_page': min((x['first_page'] for x in items if x['first_page']), default=None),
        'pages': sorted({p for x in items for p in x.get('pages', [])}),
        'boxed': boxed,
        'all_caps_start': all(x['all_caps_start'] for x in items),
        'example': next((x['example'] for x in items if x['example']), None),
    })

print(f'归并: {len(D)} 条候选 -> {len(merged)} 簇')

# ---- 2) 剔除 ----
# "每次出现都大写" 主要抓人名地名(Μελέκ/Φοίβος/Παναγιώτης), 但会误伤两类真词:
#   1) 语法术语 —— 教材里总是大写(Ενεστώτας/Αόριστος/Προστακτική), 而每道练习
#      的指令都在用这些词, 学生看不懂指令就做不了题, 必须收
#   2) 固定礼貌用语与口语感叹词 —— 通常出现在句首, 所以永远大写
KEEP_ANYWAY = set('''μελλοντ προστακτικ ενεστωτ υποτακτικ συνεχ παρατατικ
αξιοτιμ βεβαιω αμαν σχολ δημοτικ οκε μπα'''.split())

drop_name = [m for m in merged
             if m['all_caps_start'] and not m['boxed'] and m['stem'] not in KEEP_ANYWAY]
pool = [m for m in merged if m not in drop_name]
print(f'剔除疑似专有名词 {len(drop_name)} 簇 -> 剩 {len(pool)}')

# ---- 2b) 跨单元过多 = 基础词, 不是 B 阶段新词 ----
# 一个词在 11 个以上单元反复出现, 说明它是全书通用的基础词(A1/A2 词表没收全而已),
# 不该占用 B 本 1500 个名额。教材方框点名的除外 —— 那是教材自己说"这个要学"。
drop_basic = [m for m in pool if m['unit_span'] >= 11 and not m['boxed']]
pool = [m for m in pool if not (m['unit_span'] >= 11 and not m['boxed'])]
print(f'剔除跨>=11单元的基础词 {len(drop_basic)} 簇 -> 剩 {len(pool)}')

# ---- 3) 打分 ----
# 跨单元数的奖励在 5 个单元封顶: 适度复现说明是有用的话题词,
# 过度复现说明是基础词(已在上一步剔除, 这里只防漏网)
for m in pool:
    span_pts = 16 * min(m['unit_span'], 5)
    m['score'] = (200 if m['boxed'] else 0) + span_pts + 11 * math.log(m['total'] + 1)

# 单元配额: 按各单元候选数按比例分, 每单元至少 35
by_unit = collections.defaultdict(list)
for m in pool: by_unit[m['unit_main']].append(m)
for u in by_unit: by_unit[u].sort(key=lambda m: -m['score'])

units = sorted(by_unit)
base  = {u: max(35, round(TARGET * len(by_unit[u]) / len(pool))) for u in units}
scale = TARGET / sum(base.values())
quota = {u: max(30, int(base[u] * scale)) for u in units}

sel = []
for u in units:
    sel.extend(by_unit[u][:quota[u]])
# 配额没填满就按总分补齐
if len(sel) < TARGET:
    rest = sorted([m for m in pool if m not in sel], key=lambda m: -m['score'])
    sel.extend(rest[:TARGET - len(sel)])
sel.sort(key=lambda m: (m['unit_main'], -m['score']))

json.dump({'schema': 'b_selected_v1',
           'note': '归并+精炼后的 B 本词表骨架. 原形(top_form)是机器猜的, 中文尚未填, '
                   '两者都必须人工逐条确认后才能入库.',
           'target': TARGET, 'total': len(sel), 'words': sel},
          open(f'{ROOT}/materials/glossaries/B_selected.json', 'w'),
          ensure_ascii=False, indent=1)

print(f'\n选入 {len(sel)} 条 (其中教材点名 {sum(1 for m in sel if m["boxed"])} 条)')
c = collections.Counter(m['unit_main'] for m in sel)
umap = {u['unit']: u['title'] for u in json.load(open(f'{ROOT}/materials/textbooks/B_unit_page_map.json'))['units']}
for u in sorted(c): print(f'  U{u:>2}  {c[u]:>3} 词   {umap.get(u,"")[:30]}')

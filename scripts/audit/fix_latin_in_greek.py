# -*- coding: utf-8 -*-
"""
修：词库里混进拉丁字母的希腊语词条。

这类字符长得和希腊字母一模一样（拉丁 o / 希腊 ο），肉眼看不出，
但「拼字大作战」是逐字比对的 —— 学生按希腊键盘打出正确的词，
系统会判他错，而且他永远看不出哪里错了。
"""
import json, re

P = 'frontend/src/data/vocabulary_v2.json'
LOOKALIKE = str.maketrans({
    'A':'Α','B':'Β','E':'Ε','Z':'Ζ','H':'Η','I':'Ι','K':'Κ','M':'Μ','N':'Ν',
    'O':'Ο','P':'Ρ','T':'Τ','X':'Χ','Y':'Υ',
    'a':'α','e':'ε','o':'ο','i':'ι','k':'κ','n':'ν','p':'ρ','v':'ν','x':'χ','y':'γ',
})
GREEK = re.compile(r'[Ͱ-Ͽ]')
TARGET_IDS = {82, 596, 1155, 1336, 1788, 1912, 2257, 2258}
# 顺手修掉两条明显错译
ZH_FIX = {
    1336: '肉店 / 肉铺',                       # κρεοπωλείο, 原写「屠夫的」
    1788: 'ΤΕΙ 希腊高等技术教育学院',            # 原写「科技」
}

d = json.load(open(P, encoding='utf-8'))
n_lat = n_zh = 0
for w in d['entries']:
    if w['id'] not in TARGET_IDS:
        continue
    for f in ('headword', 'word_greek'):
        old = w.get(f) or ''
        new = old.translate(LOOKALIKE)
        if new != old:
            print(f"  id={w['id']:5d} {f:11s} {old!r} -> {new!r}")
            w[f] = new
            n_lat += 1
    if w['id'] in ZH_FIX:
        print(f"  id={w['id']:5d} word_chinese {w['word_chinese']!r} -> {ZH_FIX[w['id']]!r}")
        w['word_chinese'] = ZH_FIX[w['id']]
        n_zh += 1

json.dump(d, open(P, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'\n改了 {n_lat} 个希腊语字段、{n_zh} 条中文释义')
# 复查
bad = [w for w in d['entries'] if re.search(r'[A-Za-z]', w.get('headword') or '')
       or not GREEK.search(w.get('headword') or '')]
print('复查：仍混有拉丁字母/无希腊字母的词条 =', len(bad))

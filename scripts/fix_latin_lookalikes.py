"""2026-10-01: 希腊语里混进了长得一样的英文字母 (Zέτα 的 Z、xιονίζει 的 x、κρεoπωλείο 的 o ...)。

肉眼看不出来, 但电脑认为它们是两个不同的字:
  · 孩子写对了也要白白用掉「允许错 1 个字母」的额度, 再错一个就判错 (Zέτα: 孩子写 Ζέλτα 被判错);
  · 人名名单查不到 (Zέτα 是人名, 因为 Z 是英文字母, 名单拦不住, 照样出题);
  · 语法题是逐字比对的, 一个英文 H 就让标准答案永远打不出来。

只改「希腊字母和英文字母挤在同一个词里」的情况, 和两道语法题里单独的 H / Tη,
以及逗号后面当冠词用的英文 o (χειμώνας, o)。A2 / A1 这种级别名、对话里的 A: B: 不动。
可重复运行: 第二次跑应当一处都不改。
"""
import json, re

R = '/Users/johnsmacbook/Documents/Codex/Leon-Greek-Coach/frontend/src/data/'
MAP = str.maketrans({
    'A': 'Α', 'B': 'Β', 'E': 'Ε', 'Z': 'Ζ', 'H': 'Η', 'I': 'Ι', 'K': 'Κ', 'M': 'Μ', 'N': 'Ν',
    'O': 'Ο', 'P': 'Ρ', 'T': 'Τ', 'X': 'Χ', 'Y': 'Υ',
    'o': 'ο', 'x': 'χ', 'i': 'ι', 'v': 'ν', 'k': 'κ', 'a': 'α', 'u': 'υ',
})
GREEK = re.compile(r'[Ͱ-Ͽἀ-῿]')
LATIN = re.compile(r'[A-Za-z]')
TOKEN = re.compile(r'[A-Za-zͰ-Ͽἀ-῿]+')

# 整个词都是英文、但其实是希腊语缩写 / 冠词的, 单独列出
WHOLE = {'OTE': 'ΟΤΕ'}

changes = []


def save(p, d):
    # 保持原文件格式不变(1 格缩进; 词表两个文件末尾有换行, 语法题文件没有), 免得 git 里整片变动
    tail = '\n' if open(p).read().endswith('\n') else ''
    open(p, 'w').write(json.dumps(d, ensure_ascii=False, indent=1) + tail)


def fix_text(s: str, where: str) -> str:
    def tok(m):
        t = m.group(0)
        if GREEK.search(t) and LATIN.search(t):
            return t.translate(MAP)
        return t
    new = TOKEN.sub(tok, s)
    # 逗号后当冠词用的英文 o: 「χειμώνας, o」「γεμάτος, -η, -o」「τζίτζικας/τζιτζίκι, o/το」
    new = re.sub(r'(?<=[,/\s-])o(?=$|[\s/,\[])', 'ο', new) if GREEK.search(new) else new
    if new != s:
        changes.append((where, s, new))
    return new


def fix_glossary():
    p = R + 'glossary_v2.json'
    d = json.load(open(p))
    for lv, lst in d['lists'].items():
        for w in lst:
            for f in ('word_greek', 'entry'):
                if w.get(f):
                    if w[f] in WHOLE:
                        changes.append((f'glossary {lv}#{w["idx"]}.{f}', w[f], WHOLE[w[f]]))
                        w[f] = WHOLE[w[f]]
                    else:
                        w[f] = fix_text(w[f], f'glossary {lv}#{w["idx"]}.{f}')
    save(p, d)


def fix_vocab():
    p = R + 'vocabulary_v2.json'
    d = json.load(open(p))
    for w in d['entries']:
        for f in ('word_greek', 'headword'):
            if w.get(f):
                w[f] = fix_text(w[f], f'vocab #{w["id"]}.{f}')
    save(p, d)


def fix_drills():
    p = R + 'b_grammar_drills.json'
    d = json.load(open(p))
    for dr in d['drills']:
        # 这两道是「Η Μαρίνα – τις φίλες της」: 开头的 H / Tη 是英文字母
        def drill_fix(s, where):
            s2 = re.sub(r'(?<![A-Za-z])H(?= Μαρίνα)', 'Η', s)
            s2 = re.sub(r'(?<![A-Za-z])Tη(?= Μαρίνα)', 'Τη', s2)
            if s2 != s:
                changes.append((where, s, s2))
            return s2
        for f in ('answer', 'question'):
            if isinstance(dr.get(f), str):
                dr[f] = drill_fix(dr[f], f'drill {dr["id"]}.{f}')
        for f in ('options', 'acceptable_answers'):
            if isinstance(dr.get(f), list):
                dr[f] = [drill_fix(x, f'drill {dr["id"]}.{f}') if isinstance(x, str) else x for x in dr[f]]
    save(p, d)


fix_glossary()
fix_vocab()
fix_drills()
for c in changes:
    print(c)
print('共改', len(changes), '处')

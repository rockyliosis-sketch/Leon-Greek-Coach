# -*- coding: utf-8 -*-
"""
题库体检：把学生端实际会出到的每一道题过一遍，找机器能判定的硬伤。
只报「确定是错」或「确定可疑」的，不做主观评判。
"""
import json, re, sys, unicodedata
from collections import Counter, defaultdict

D = 'frontend/src/data/'
GREEK = re.compile(r'[Ͱ-Ͽἀ-῿]')
LATIN = re.compile(r'[A-Za-z]')
CJK   = re.compile(r'[一-鿿]')

def strip_acc(s):
    s = unicodedata.normalize('NFD', str(s or ''))
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower().strip()

def norm_gr(s):
    """归一化希腊语：去重音、统一词尾 ς/σ、去标点"""
    s = strip_acc(s).replace('ς', 'σ')
    return re.sub(r'[^Ͱ-Ͽ]', '', s)

issues = defaultdict(list)
def bad(bank, kind, ident, detail):
    issues[f'{bank} :: {kind}'].append((ident, detail))

# ─────────────────────────────────────────── 1. 语法闯关题库
drills_units = json.load(open(D + 'unit_knowledge_drills.json'))
n_drills = 0
seen_q = defaultdict(list)
for u in drills_units:
    tag = f"{u['book_id']} U{u['unit']}"
    for d in u.get('drills', []):
        n_drills += 1
        qid = f"{tag} #{d.get('id')}"
        q   = str(d.get('question') or '')
        ans = str(d.get('answer') or '')
        opts = d.get('options') or []
        acc = d.get('acceptable_answers') or []

        if not q.strip():                 bad('语法闯关', '题干为空', qid, '')
        if not ans.strip():               bad('语法闯关', '答案为空', qid, q[:50])

        if opts:
            if len(opts) != len(set(opts)):
                bad('语法闯关', '选项重复', qid, f'{opts}')
            # 答案必须在选项里（选择题的死线）
            if ans and ans not in opts:
                loose = [o for o in opts if norm_gr(o) == norm_gr(ans)]
                if not loose:
                    bad('语法闯关', '答案不在选项里', qid, f'答案「{ans}」 选项{opts}')
            # 归一化后重合的干扰项 = 两个都对
            nn = [norm_gr(o) for o in opts]
            # 去掉重音后重合的选项: 有可能是「同一个词写两遍」(错), 也可能是
            # πού(哪里) / που(那个) 这种**故意考重音**的好题(对)。带重音差异的放行。
            for i, x in enumerate(nn):
                for j in range(i + 1, len(nn)):
                    if x and x == nn[j] and opts[i] == opts[j]:
                        bad('语法闯关', '两个选项完全相同', qid, f'{opts[i]} / {opts[j]}')
            if len(opts) < 3:
                bad('语法闯关', '选项少于3个', qid, f'{opts}')

        if d.get('drill_type') == 'cloze' and '___' not in q:
            bad('语法闯关', '填空题没有空位', qid, q[:60])
        # 答案里带解释性中文（应当只填希腊语）
        if CJK.search(ans) and d.get('drill_type') in ('cloze', 'choice'):
            bad('语法闯关', '答案里混了中文', qid, ans[:50])
        if acc and ans and ans not in acc and strip_acc(ans) not in [strip_acc(a) for a in acc]:
            bad('语法闯关', '标准答案不在可接受答案表里', qid, f'{ans} vs {acc}')
        seen_q[norm_gr(q) + strip_acc(re.sub(GREEK, '', q))].append(qid)

for k, v in seen_q.items():
    if len(v) > 1 and k.strip():
        bad('语法闯关', '重复题', v[0], f'与 {v[1:]} 完全相同')

# ─────────────────────────────────────────── 2. 课本原句填空
sents = json.load(open(D + 'sentences.json'))['sentences']
for s in sents:
    qid = f"{s.get('book')} p{s.get('page')} #{s.get('id')}"
    cloze, ans, opts = s.get('cloze', ''), s.get('answer', ''), s.get('options') or []
    text, blank = s.get('text', ''), s.get('blank_word', '')
    if '___' not in cloze:            bad('课本填空', '没有空位', qid, cloze[:60])
    if ans not in opts:               bad('课本填空', '答案不在选项里', qid, f'{ans} / {opts}')
    if len(opts) != len(set(opts)):   bad('课本填空', '选项重复', qid, f'{opts}')
    if len(opts) < 3:                 bad('课本填空', '选项少于3个', qid, f'{opts}')
    # 把答案填回空位, 必须还原成原句
    if '___' in cloze:
        restored = re.sub(r'_+', ans, cloze, count=1)
        if norm_gr(restored) != norm_gr(text):
            bad('课本填空', '答案填回去还原不出原句', qid, f'原句「{text[:45]}」 还原「{restored[:45]}」')
    if blank and norm_gr(blank) != norm_gr(ans):
        bad('课本填空', '挖空词与答案不一致', qid, f'{blank} vs {ans}')
    # 干扰项归一化后与答案相同 = 有两个正确答案
    for o in opts:
        if o != ans and norm_gr(o) == norm_gr(ans):
            bad('课本填空', '干扰项与答案是同一个词', qid, f'{o} / {ans}')
    # 数字是教材原文(608 路公交、10% 折扣、1,40 欧元), 不是错误; 只查拉丁字母
    if LATIN.search(cloze):
        bad('课本填空', '句子里混了拉丁字母', qid, cloze[:60])

# ─────────────────────────────────────────── 3. 真题
exams = json.load(open(D + 'exam_questions.json'))
elist = exams if isinstance(exams, list) else exams.get('questions', [])
for e in elist:
    qid = f"exam #{e.get('id')} {e.get('type','')}"
    opts = e.get('options') or []
    ans  = e.get('answer')
    if opts:
        if len(opts) != len(set(opts)): bad('真题', '选项重复', qid, f'{opts}')
        if isinstance(ans, str) and ans not in opts:
            bad('真题', '答案不在选项里', qid, f'{ans} / {opts}')
    if not str(e.get('greek') or '').strip(): bad('真题', '希腊语题干为空', qid, '')

# ─────────────────────────────────────────── 4. 词库（六大题型的词都从这来）
v2 = json.load(open(D + 'vocabulary_v2.json'))['entries']
zh_map = defaultdict(list)
for w in v2:
    wid = f"{w['book_id']} p{w['page_number']} #{w['id']}"
    g, z = str(w.get('headword') or ''), str(w.get('word_chinese') or '')
    if not g.strip():                 bad('词库', '希腊语为空', wid, '')
    if not z.strip():                 bad('词库', '中文释义为空', wid, g)
    if not GREEK.search(g):           bad('词库', '希腊语里没有希腊字母', wid, g)
    if LATIN.search(g):               bad('词库', '希腊语里混了拉丁字母', wid, g)
    # 括号里的希腊语搭配(如「信贷的（πιστωτική κάρτα 信用卡）」)是有用信息, 不是错。
    # 真正的风险是「汉译希」把它印在题面上等于泄题 —— 已由 promptZhOnly() 去掉括号解决。
    if GREEK.search(re.sub(r'[（(].*?[)）]', '', z)):
        bad('词库', '中文释义主体里混了希腊语', wid, f'{g} -> {z}')
    if z and not CJK.search(z):       bad('词库', '中文释义里没有汉字', wid, f'{g} -> {z}')
    if re.search(r'(拓展核心词汇|占位|待补|TODO|λέξη \d)', g + z):
        bad('词库', '占位符词条', wid, f'{g} -> {z}')
    zh_map[re.sub(r'[（(].*?[)）]', '', z).strip()].append((wid, g))

# ─────────────────────────────────────────── 汇总
print('=' * 74)
print(f'扫描：语法闯关 {n_drills} 题 · 课本填空 {len(sents)} 题 · 真题 {len(elist)} 题 · 词库 {len(v2)} 词')
print('=' * 74)
total = 0
for k in sorted(issues, key=lambda x: -len(issues[x])):
    v = issues[k]; total += len(v)
    print(f'\n■ {k} —— {len(v)} 处')
    for ident, detail in v[:6]:
        print(f'   · {ident}  {detail}'[:150])
    if len(v) > 6: print(f'   … 另有 {len(v)-6} 处')
print('\n' + '=' * 74)
print(f'合计发现 {total} 处硬伤')
dup = {k: v for k, v in zh_map.items() if len(v) > 3 and k}
print(f'另：中文释义完全相同的词组 {len(dup)} 组（同义词会让「汉译希」出现多个正确答案）')
for k, v in sorted(dup.items(), key=lambda x: -len(x[1]))[:5]:
    print(f'   · 「{k}」 有 {len(v)} 个词: ' + ', '.join(g for _, g in v[:6]))
json.dump({k: v for k, v in issues.items()}, open('scratch/audit_report.json', 'w'), ensure_ascii=False, indent=1)

# -*- coding: utf-8 -*-
"""
造 B 本的语法题 —— 全部取自课本原句，一个希腊语字符都不自造。

为什么只挑冠词与「介词+冠词」缩合：
    这两类的正确答案由后面那个名词的**性 / 数 / 格**唯一确定，出成选择题只有一个对。
    代词弱读、介词、连词看着也能挖空，但一句话里往往好几个说法都成立
    （«και» 换成 «αλλά» 未必错），拿来出题就会出现「答案跟题目对不上」——
    这正是家长指出的老毛病，所以一律不碰。

怎么保证干扰项确实是错的：
    不靠语法推理，靠**全书语料实证**。把 B 本解码全文里所有「冠词 + 下一个词」的搭配
    统计出来；只有当某个名词形式在全书里**只跟过一种冠词**时才出题，
    干扰项只从「全书从没跟过这个词」的冠词里选。

输出: frontend/src/data/b_grammar_drills.json
"""
import re, json, os, unicodedata
from collections import defaultdict, Counter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GR = r'Ͱ-Ͽἀ-῿'
WORD = re.compile(f'[{GR}]+')

ARTICLES = ['ο','η','το','οι','τα','τον','την','του','της','των','τους','τις']
CONTRACT = ['στο','στη','στην','στον','στους','στις','στα','στου','στης','στων']

DESC = {
    'ο':'阳性 单数 主格','η':'阴性 单数 主格','το':'中性 单数 主格/宾格',
    'οι':'阳/阴性 复数 主格','τα':'中性 复数 主格/宾格',
    'τον':'阳性 单数 宾格','την':'阴性 单数 宾格',
    'του':'阳/中性 单数 属格','της':'阴性 单数 属格','των':'复数 属格',
    'τους':'阳性 复数 宾格','τις':'阴性 复数 宾格',
    'στο':'σε + το（中性单数）','στη':'σε + τη（阴性单数）','στην':'σε + την（阴性单数）',
    'στον':'σε + τον（阳性单数）','στους':'σε + τους（阳性复数）',
    'στις':'σε + τις（阴性复数）','στα':'σε + τα（中性复数）',
    'στου':'σε + του（属格）','στης':'σε + της（属格）','στων':'σε + των（属格）',
}

def norm(s):
    s = unicodedata.normalize('NFD', s)
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()

# ── 1. 全书语料：统计「冠词 + 下一个词」出现过什么 ─────────────────────
raw = open(f'{ROOT}/materials/textbooks/derivation/B_pdf_decoded.txt', encoding='utf-8').read()
toks = WORD.findall(raw)
after = defaultdict(Counter)          # 归一化后的名词形式 -> Counter(冠词原形)
ALL = set(ARTICLES) | set(CONTRACT)
for i in range(len(toks) - 1):
    a = toks[i].lower()
    if a in ALL:
        after[norm(toks[i+1])][a] += 1
print(f'语料：全书 {len(toks)} 个希腊语词，统计到 {len(after)} 个「冠词后接词」')

# ── 1b. 词形 -> 词性。空格后面必须是名词/形容词。
# 抽查发现 «Η Δήμητρα δεν ___ πηγαίνει καλά» 这种: 那里的 τα 根本不是冠词,
# 是习语 «τα πηγαίνω καλά»(相处得好) 里的代词。答案虽对, 解析却会胡说
# 「空格后是 πηγαίνει, 所以用中性复数冠词」—— 这正是家长说的「答案跟题目对不上」。
NOUNISH = {'阴', '中', '阳', '复', '形'}
FORM_POS = {}
for e in json.load(open(f'{ROOT}/materials/glossaries/B_vocab.json'))['entries']:
    pos = e.get('pos') or ''
    for f in [e['headword']] + [ (f['form'] if isinstance(f, dict) else f) for f in (e.get('forms') or []) ]:
        FORM_POS.setdefault(norm(f), set()).add(pos)
# A1/A2 的词也会出现在 B 的课文里, 词性一并并进来(只有原形, 够用了)
for e in json.load(open(f'{ROOT}/frontend/src/data/vocabulary_v2.json'))['entries']:
    if e['book_id'] == 'b1':
        continue
    FORM_POS.setdefault(norm(e['headword']), set()).add(e.get('pos') or '')
# 词形还原里的「看着像动词」规则, 用来兜住词表里没有的变位形式
VERB_END = ('ω','εις','ει','ουμε','ετε','ουν','ομαι','εσαι','εται','ονται','ουμαι','ομαστε')
def looks_verb(n):
    return n.endswith(VERB_END)
print(f'词形词性表: {len(FORM_POS)} 个词形')

# ── 2. 从课本全文取句（带页码归属） ────────────────────────────────
# 为什么不只用 sentences.json 的 469 句: 那份是给「填空题」用的, 过滤极严
# ——「一个实词在权威词典里认不出就整句丢掉」。造冠词题不需要那么严:
# 真正要担保的是「这个冠词搭配对不对」, 而那一步已经由全书语料实证兜住了。
# 所以这里放宽到「句子本身干净」即可, 句源仍然是课本原文, 一个字不自造。
UMAP = json.load(open(f'{ROOT}/materials/textbooks/B_unit_page_map.json'))
P2B  = {int(k): v for k, v in UMAP['pdf_page_to_book_page'].items()}
def unit_of(bp):
    for u in UMAP['units']:
        if u['start_page'] <= bp <= u['end_page']:
            return u['system_unit'], u['title']
    return None, ''

LATIN = re.compile(r'[A-Za-z]')
DIGIT_IN_WORD = re.compile(f'[{GR}]\\d|\\d[{GR}]')
NOISE = re.compile(r'Layout|GREEK|ΕΛΛΗΝΙΚΑ|protoselida|\.{4,}|_{2,}|\|')

def clean_line(ln):
    ln = re.sub(r'^\s*\d{1,2}[.)]\s*', '', ln)        # 行首练习题编号
    ln = re.sub(r'^[α-ωΑ-Ω]\.\s*', '', ln)             # α. β. γ. 选项标号
    return ln.strip()

def line_ok(ln):
    if NOISE.search(ln): return False
    if '/' in ln or '=' in ln: return False            # 连词成句练习 / 语法对照示范行
    if ln.count(',') >= 4: return False                # 词表堆叠
    if LATIN.search(ln): return False
    if DIGIT_IN_WORD.search(ln): return False
    if not re.match(f'^[Α-ΩΆΈΉΊΌΎΏ«\u201c]', ln): return False   # 必须大写开头, 排除换行截断的残句
    if not re.search(r'[.;!?·]\s*$', ln): return False
    if not (22 <= len(ln) <= 110): return False
    ws = WORD.findall(ln)
    if len(ws) < 5: return False
    OK1 = {'ο','η','τ','σ','ν','κ'}
    if any(len(w) == 1 and w.lower() not in OK1 for w in ws): return False
    return True

# 抽查发现 «Περιβάλλοντος είναι σημαντική…» 这种残句: 它是上一行被换行截断后
# 剩下的半截, 恰好以大写开头就混了进来。规则: 上一条非空行没有以句末标点收尾,
# 当前行就是它的续行, 整行丢弃。
SENT = []
cur_pdf = 0
prev_closed = True
for ln in raw.split('\n'):
    m = re.search(r'Page (\d+)\s*$', ln)
    if m:
        cur_pdf = int(m.group(1)); prev_closed = True; continue
    stripped = ln.strip()
    if not stripped:
        prev_closed = True; continue
    was_closed = prev_closed
    prev_closed = bool(re.search(r'[.;!?·:»]\s*$', stripped))
    bp = P2B.get(cur_pdf)
    if not bp or bp < 8: continue
    if not was_closed: continue
    t = clean_line(stripped)
    if not line_ok(t): continue
    su, ut = unit_of(bp)
    if not su: continue
    SENT.append({'book': 'b1', 'page': bp, 'text': t, 'unit': su, 'unit_title': ut})
# 同一句在书里可能重复出现, 去重
_seen = set(); _u = []
for x in SENT:
    k = norm(x['text'])
    if k in _seen: continue
    _seen.add(k); _u.append(x)
SENT = _u
print(f'课本全文取到干净原句 {len(SENT)} 句（原先只用 sentences.json 的 469 句）')

SYL  = json.load(open(f'{ROOT}/frontend/src/data/b_syllabus.json'))['units']
def theme(u):
    x = next((s for s in SYL if s['unit'] == u - 39), None)
    return (x.get('theme_zh') or x.get('title')) if x else ''

drills, per_unit, skipped = [], Counter(), Counter()
seen_blank = {}
for s in SENT:
    if s.get('book') != 'b1':
        continue
    text = s['text']
    words = list(WORD.finditer(text))
    for i in range(len(words) - 1):
        art = words[i].group(0)
        low = art.lower()
        if low not in ALL:
            continue
        if art[0].isupper():                    # 句首大写的冠词, 挖掉会露出大小写线索
            skipped['句首'] += 1; continue
        nxt = words[i+1].group(0)
        key = norm(nxt)
        pos = FORM_POS.get(key)
        if pos is not None and not (pos & NOUNISH):
            skipped['空格后不是名词/形容词'] += 1; continue
        if pos is None and looks_verb(key):
            # 词表里没有、但词尾一看就是动词变位 —— «τα πηγαίνει» 那类习语代词, 不出
            skipped['空格后像动词'] += 1; continue
        obs = after.get(key)
        if not obs:
            skipped['语料里没见过'] += 1; continue
        if obs[low] < 2:
            skipped['该搭配全书不足2次'] += 1; continue
        if len(obs) > 1:                        # 全书跟过不止一种冠词 -> 答案不唯一, 不出
            skipped['答案不唯一'] += 1; continue
        family = CONTRACT if low in CONTRACT else ARTICLES
        # 干扰项: 同类、且全书从没跟过这个词
        pool = [a for a in family if a != low and a not in obs]
        if len(pool) < 3:
            skipped['凑不够干扰项'] += 1; continue
        # 同一个搭配最多出两道(用不同的原句), 再多就重样了
        h = (key, low)
        seen_blank[h] = seen_blank.get(h, 0) + 1
        if seen_blank[h] > 3:
            skipped['同搭配已够三道'] += 1; continue

        st, en = words[i].span()
        cloze = text[:st] + '______' + text[en:]
        picks = sorted(pool, key=lambda a: (abs(len(a)-len(low)), a))[:3]
        options = sorted([art] + picks, key=lambda x: norm(x))
        kind = '介词+冠词缩合' if low in CONTRACT else '冠词'
        base = {
            'drill_type': 'choice',
            'skill_type': 'article' if low in ARTICLES else 'contraction',
            'book_id': 'b1',
            'unit': s['unit'],
            'unit_title': s.get('unit_title', ''),
            'page': s['page'],
            'question': cloze,
            'options': options,
            'answer': art,
            'translation': f"{kind}练习 · 课本第 {s['page']} 页",
            'detailed_tip': (
                f"【{kind}】空格后是「{nxt}」，所以要用 **{art}**（{DESC.get(low,'')}）。\n"
                f"【课本原句】{text}\n"
                f"【出处】第 {s['unit']-39} 单元 {theme(s['unit'])} · 课本第 {s['page']} 页\n"
                f"（全书 {obs[low]} 次都用这个搭配，其余选项一次也没出现过。）"
            ),
        }
        drills.append({'id': 320000 + len(drills), **base})
        # 同一句再出一道**手打填空**: 认得出 ≠ 写得出, 换个技能再练一遍。
        # 家长原话:「并不是说我一定要完全不能重复，可以让它出现好几种题目类型。」
        drills.append({
            'id': 320000 + len(drills),
            **base,
            'drill_type': 'cloze',
            'options': None,
            'acceptable_answers': sorted({art, art.lower(), norm(art)}),
            'translation': f"{kind}练习（手写）· 课本第 {s['page']} 页",
        })
        per_unit[s['unit']] += 2

os.makedirs(f'{ROOT}/frontend/src/data', exist_ok=True)
out = {
    'schema': 'b_grammar_drills_v1',
    'note': ('B 本语法题。每一道的希腊语都直接取自课本原句(PDF 文字层解码, 非 OCR), '
             '无自造句。只挖冠词与「介词+冠词」缩合 —— 这两类答案由后接名词的性/数/格唯一确定; '
             '干扰项经全书语料实证: 该冠词在整本书里从未跟过这个词。'),
    'built_by': 'scripts/ocr/build_b_grammar_drills.py',
    'drills': drills,
}
json.dump(out, open(f'{ROOT}/frontend/src/data/b_grammar_drills.json','w',encoding='utf-8'),
          ensure_ascii=False, indent=1)

print(f'\n生成 {len(drills)} 道 B 本语法题')
print('按单元:', ' '.join(f'U{u-39}:{n}' for u, n in sorted(per_unit.items())))
print('丢弃原因:', dict(skipped))

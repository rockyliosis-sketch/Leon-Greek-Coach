# -*- coding: utf-8 -*-
"""生成 vocabulary_v2.json —— 与旧结构同字段, 但每一条都有据可查.
新增字段: match(命中方式) / source_book / verified(是否官方词表原形)
单元号: A2 可定(真书6单元 -> 系统31-36); A1儿童版无可靠单元标记, unit=null, 按 page_number 索引.
"""
import json, os, re, sys, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
G = f'{ROOT}/materials/glossaries'

# 希腊语 -> 拉丁转写(给 pronunciation 字段用)
TR = {'α':'a','β':'v','γ':'g','δ':'d','ε':'e','ζ':'z','η':'i','θ':'th','ι':'i','κ':'k',
      'λ':'l','μ':'m','ν':'n','ξ':'x','ο':'o','π':'p','ρ':'r','σ':'s','ς':'s','τ':'t',
      'υ':'y','φ':'f','χ':'ch','ψ':'ps','ω':'o'}
DI = [('ου','ou'),('αι','e'),('ει','i'),('οι','i'),('υι','i'),('αυ','af'),('ευ','ef'),
      ('μπ','b'),('ντ','d'),('γκ','g'),('τσ','ts'),('τζ','tz'),('γγ','ng')]
def translit(s):
    s = ''.join(c for c in unicodedata.normalize('NFD', s.lower())
                if unicodedata.category(c) != 'Mn')
    s = re.sub(r'[^α-ωϊϋ\s]', '', s).strip()
    for a, b in DI: s = s.replace(a, b)
    return ''.join(TR.get(c, c) for c in s)

LIG = {'ﬁ':'fi','ﬂ':'fl','ﬀ':'ff','ﬃ':'ffi','ﬄ':'ffl'}
def clean_zh(z):
    """去连字符乱码 / 去尾部英文括注 / 去重复义项"""
    if not z: return ''
    for a, b in LIG.items(): z = z.replace(a, b)
    # 中文词表是多栏排版, 相邻词条会被粘进来. 释义里不该出现希腊字母 -> 见到就截断
    m = re.search(r'[\u0370-\u03FF\u1F00-\u1FFF]', z)
    if m: z = z[:m.start()]
    z = re.sub(r'\s*[\(（][^)）]*$', '', z)          # 去掉没闭合的尾部英文括注
    z = re.sub(r'\s*[\(（]\s*[a-zA-Z][^)）]*[\)）]', '', z)   # 去掉纯英文括注
    z = re.sub(r'\[[^\]]*\]', '', z)
    parts, seen = [], set()
    for x in re.split(r'[，,、；;/]+', z):
        x = x.strip(' 。.')
        if x and x not in seen: seen.add(x); parts.append(x)
    return '，'.join(parts)

def headword(entry):
    """'γάλα, το' -> 'γάλα';  'αγαπάω, -ώ' -> 'αγαπάω'"""
    h = re.split(r'\s*[,\[(]', entry)[0].strip()
    return h or entry

# 交叉引用与人工补充的中文释义
XREF = json.load(open(f'{ROOT}/scratch/zh_crossref.json')) if os.path.exists(f'{ROOT}/scratch/zh_crossref.json') else {}
_SUP_RAW = json.load(open(f'{G}/zh_supplement.json'))
SUPP = {k: v for k, v in _SUP_RAW.items() if not k.startswith('_')}
FIXES = _SUP_RAW.get('_corrections', {})       # 更正官方误译, 优先级最高

A2MAP = json.load(open(f'{ROOT}/materials/textbooks/A2new_unit_page_map.json'))
FM = A2MAP.get('front_matter_book_pages', [0, -1])
def a2_unit(bp):
    if FM[0] <= bp <= FM[1]: return 'SKIP'      # 前言/序言, 不算教学内容
    for u in A2MAP['units']:
        if u['book_pages'][0] <= bp <= u['book_pages'][1]:
            return 30 + u['unit']          # 真书单元1-6 -> 系统31-36
    return None

BOOKS = [('a1-a', 'A1-A 第一分册(儿童版)', None),
         ('a1-b', 'A1-B 第二分册(儿童版)', None),
         ('a2',   'A2 (ΚΛΙΚ Α2)',          a2_unit)]

occ, uniq_map = [], {}
stat = {}
for bid, bname, unitf in BOOKS:
    pages = json.load(open(f'{G}/pagewords_{bid}.json'))
    n = 0
    for p in pages:
        bp = p['book_pages'][0]
        unit = unitf(bp) if unitf else None
        if unit == 'SKIP': continue
        for w in p['words']:
            n += 1
            hw = headword(w['word'])
            zh_raw, zh_src = clean_zh(w['zh']), 'official'
            if not zh_raw and hw in XREF: zh_raw, zh_src = clean_zh(XREF[hw]), 'xref'
            if not zh_raw and hw in SUPP: zh_raw, zh_src = SUPP[hw], 'claude'
            if hw in FIXES: zh_raw, zh_src = FIXES[hw], 'fix'      # 更正覆盖官方误译
            uk = (bid, hw)
            rec = uniq_map.get(uk)
            if rec is not None:
                rec['pages'].append(bp)
                if bp < rec['page_number']:
                    rec['page_number'], rec['unit'], rec['match'] = bp, unit, w['match']
                continue
            uniq_map[uk] = {
                'id': 0, 'book_id': bid, 'unit': unit, 'page_number': bp,
                'pages': [bp],
                'word_greek': w['word'], 'headword': hw,
                'word_chinese': zh_raw, 'zh_source': zh_src,
                'word_english': (w['en'] or '').strip(' ,;'),
                'pronunciation': translit(hw), 'pos': w['pos'],
                'example_greek': None, 'example_chinese': None,
                'match': w['match'],                 # exact / stem / lambda
                'has_chinese': bool(zh_raw),
                'error_count': 0, 'difficulty_score': 1.0,
                'last_reviewed_at': None, 'next_review_at': None, 'note_date': None,
            }
    stat[bid] = n
out = []
for i, (uk, r) in enumerate(sorted(uniq_map.items(),
        key=lambda x: (x[0][0], x[1]['page_number'], x[0][1])), 1):
    r['id'] = i; r['pages'] = sorted(set(r['pages'])); r['occurrences'] = len(r['pages'])
    out.append(r)
json.dump({'schema': 'vocabulary_v2',
           'built_from': '希腊教育部官方词表(3038条) + 教材逐页OCR封闭词表反向搜索',
           'note': 'a1-a/a1-b 为儿童版, 课本照片无可靠单元标记, unit=null, 按 page_number 索引',
           'entries': out}, open(f'{ROOT}/frontend/src/data/vocabulary_v2.json','w'),
          ensure_ascii=False, indent=1)

print('原始出现次数(词x页):', stat, '合计', sum(stat.values()))
print(f'去重后词条数: {len(out)}')
import collections as _c
print('每本词数:', dict(_c.Counter(e['book_id'] for e in out)))
nz = sum(1 for e in out if e['has_chinese'])
print(f'带中文释义: {nz}/{len(out)} = {nz/len(out)*100:.0f}%')
import collections
print('中文来源:', dict(collections.Counter(e['zh_source'] for e in out)))
print('命中方式:', dict(collections.Counter(e['match'] for e in out)))
print('A2 单元分布:', dict(sorted(collections.Counter(e['unit'] for e in out if e['unit']).items())))

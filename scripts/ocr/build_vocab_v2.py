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
SUPP = {k: v for k, v in json.load(open(f'{G}/zh_supplement.json')).items() if not k.startswith('_')}

A2MAP = json.load(open(f'{ROOT}/materials/textbooks/A2new_unit_page_map.json'))
def a2_unit(bp):
    for u in A2MAP['units']:
        if u['book_pages'][0] <= bp <= u['book_pages'][1]:
            return 30 + u['unit']          # 真书单元1-6 -> 系统31-36
    return None

BOOKS = [('a1-a', 'A1-A 第一分册(儿童版)', None),
         ('a1-b', 'A1-B 第二分册(儿童版)', None),
         ('a2',   'A2 (ΚΛΙΚ Α2)',          a2_unit)]

out, i, seen_pos = [], 0, {}
stat = {}
for bid, bname, unitf in BOOKS:
    pages = json.load(open(f'{G}/pagewords_{bid}.json'))
    n = 0
    for p in pages:
        bp = p['book_pages'][0]
        unit = unitf(bp) if unitf else None
        for w in p['words']:
            i += 1; n += 1
            hw = headword(w['word'])
            zh_raw, zh_src = clean_zh(w['zh']), 'official'
            if not zh_raw and hw in XREF: zh_raw, zh_src = clean_zh(XREF[hw]), 'xref'
            if not zh_raw and hw in SUPP: zh_raw, zh_src = SUPP[hw], 'claude'
            out.append({
                'id': i, 'book_id': bid, 'unit': unit, 'page_number': bp,
                'page_span': p['book_pages'],
                'word_greek': w['word'], 'headword': hw,
                'word_chinese': zh_raw, 'zh_source': zh_src,
                'word_english': (w['en'] or '').strip(' ,;'),
                'pronunciation': translit(hw), 'pos': w['pos'],
                'example_greek': None, 'example_chinese': None,
                'match': w['match'],                 # exact / stem / lambda
                'has_chinese': bool(zh_raw),
                'error_count': 0, 'difficulty_score': 1.0,
                'last_reviewed_at': None, 'next_review_at': None, 'note_date': None,
            })
    stat[bid] = n
json.dump({'schema': 'vocabulary_v2',
           'built_from': '希腊教育部官方词表(3038条) + 教材逐页OCR封闭词表反向搜索',
           'note': 'a1-a/a1-b 为儿童版, 课本照片无可靠单元标记, unit=null, 按 page_number 索引',
           'entries': out}, open(f'{ROOT}/frontend/src/data/vocabulary_v2.json','w'),
          ensure_ascii=False, indent=1)

print('条目数(词×页, 同一个词在多页出现会重复计):')
for k, v in stat.items(): print(f'  {k}: {v}')
print(f'  合计 {len(out)}')
uniq = {}
for e in out: uniq.setdefault((e['book_id'], e['headword']), 0)
print(f'\n去重(书内不同词): {len(uniq)}')
nz = sum(1 for e in out if e['has_chinese'])
print(f'带中文释义: {nz}/{len(out)} = {nz/len(out)*100:.0f}%')
import collections
print('中文来源:', dict(collections.Counter(e['zh_source'] for e in out)))
print('命中方式:', dict(collections.Counter(e['match'] for e in out)))
print('A2 单元分布:', dict(sorted(collections.Counter(e['unit'] for e in out if e['unit']).items())))

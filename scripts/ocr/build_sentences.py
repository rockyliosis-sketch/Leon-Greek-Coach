# -*- coding: utf-8 -*-
"""从教材抽取「干净可用」的真句子, 供填空题使用.
严格过滤: 句中不得有拉丁字母/数字混入希腊词、不得有孤立单字符、
所有实词必须能在权威词典或词形还原里认出来 —— 认不出就说明 OCR 或解码有杂质, 整句丢弃.
输出: frontend/src/data/sentences.json
"""
import re, os, sys, json, unicodedata
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from morph import MorphMatcher, norm, STOP
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GR_CH = r'Ͱ-Ͽἀ-῿'
WORD = re.compile(f'[{GR_CH}]+')
LATIN = re.compile(r'[A-Za-z]')
DIGIT_IN_WORD = re.compile(f'[{GR_CH}]\\d|\\d[{GR_CH}]')
NOISE = re.compile(r'Layout|GREEK|ΕΛΛΗΝΙΚΑ|protoselida|\.{4,}|_{2,}|\|')

mm = MorphMatcher()
IDX = json.load(open(f'{ROOT}/materials/glossaries/AUTHORITATIVE_INDEX.json'))

def sentence_ok(line):
    line = re.sub(r'^\s*\d{1,2}[.)]\s*', '', line)      # 去掉行首练习题编号
    line = re.sub(r'^[α-ωΑ-Ω]\.\s*', '', line)           # 去掉 α. β. γ. 选项标号
    if NOISE.search(line): return None
    if '/' in line: return None                          # 连词成句练习的乱序词
    if line.count(',') >= 3: return None                 # 词表堆叠
    if not re.match(r'^[Α-ΩΆΈΉΊΌΎΏ«\u201c]', line): return None   # 必须大写开头, 排除换行截断的残句
    if LATIN.search(line): return None                 # 混入拉丁字母 = OCR 杂质
    if DIGIT_IN_WORD.search(line): return None         # τι5 这种
    if not re.search(r'[.;!?·]\s*$', line): return None
    n = len(line)
    if not (22 <= n <= 100): return None
    words = WORD.findall(line)
    if len(words) < 5: return None
    # 孤立单字符希腊词(除了 ο/η/το/σε/με/να/και 等真单字词)
    OK1 = {'ο','η','τ','σ','ν','κ'}
    if any(len(w) == 1 and w.lower() not in OK1 for w in words): return None
    known, content = 0, 0
    for w in words:
        nw = norm(w)
        if len(nw) < 2 or nw in STOP: continue
        content += 1
        if nw in IDX: known += 1; continue
        k, how = mm.match(w)
        if k and how and how.startswith(('exact', 'stem')): known += 1
    if content < 3: return None
    if known < content: return None                    # 有一个实词认不出就丢掉整句
    return {'text': line, 'words': words, 'content': content}

def blankable(words):
    """挑一个可以挖空的实词: 在词典里、长度>=4、非句首"""
    out = []
    for i, w in enumerate(words):
        if i == 0: continue
        nw = norm(w)
        if len(nw) < 4 or nw in STOP: continue
        if nw in IDX: out.append((w, IDX[nw]))
    return out

def harvest(name, lines_with_page, source):
    res = []
    for page, line in lines_with_page:
        if page < 8: continue                 # B本前7页是版权/目录
        r = sentence_ok(line.strip())
        if not r: continue
        bl = blankable(r['words'])
        if not bl: continue
        w, key = bl[len(bl)//2]                        # 取中间那个, 避免总挖第一个
        res.append({'book': name, 'page': page, 'source': source,
                    'text': r['text'], 'blank_word': w, 'blank_key': key})
    return res

# 干扰项: 同词典里长度相近、首字母不同的词
DICT = json.load(open(f'{ROOT}/materials/glossaries/AUTHORITATIVE_DICT.json'))
def _head(entry):
    return re.split(r'\s*[,\[(]', entry)[0].strip()
# 干扰项只用「单个纯希腊词」的词条, 并保留重音形式
KEY2DISP = {}
for lv in DICT.values():
    for e in lv:
        h = _head(e['entry'])
        if not h or ' ' in h or '-' in h or '/' in h or '!' in h: continue
        if not re.fullmatch(f'[{GR_CH}]+', h): continue
        KEY2DISP.setdefault(norm(h), h)
ALLK = sorted(k for k in KEY2DISP if len(k) >= 3)
def distractors(correct, n=3, seed=0):
    c = norm(correct); L = len(c)
    pool = [k for k in ALLK if abs(len(k) - L) <= 2 and k != c and k[0] != c[0]]
    if len(pool) < n: pool = [k for k in ALLK if k != c]
    out = []
    for i in range(n):
        if not pool: break
        out.append(pool[(seed * 7919 + i * 104729) % len(pool)])
        pool = [x for x in pool if x != out[-1]]
    return out

def from_ocr(book, ocr_dir, pagef, total):
    out = []
    for pg in range(1, total+1):
        p = f'{ROOT}/scratch/ocr_text/{ocr_dir}/p{pg:03d}.txt'
        if not os.path.exists(p): continue
        t = open(p).read().split('\n', 1)[-1]
        for ln in t.split('\n'): out.append((pagef(pg), ln))
    return out

def from_b():
    T = open(f'{ROOT}/scratch/pdf_verify/B_pdf_decoded.txt').read()
    M = json.load(open(f'{ROOT}/materials/textbooks/B_unit_page_map.json'))
    p2b = {int(k): v for k, v in M['pdf_page_to_book_page'].items()}
    out = []
    for i, pg in enumerate(T.split('\f'), 1):
        if i not in p2b: continue
        for ln in pg.split('\n'): out.append((p2b[i], ln))
    return out

# 只用 B 本: 它来自 PDF 文字层解码, 逐字精确.
# A1/A2 三本是照片/扫描件 OCR, 实测句子仍带错(Το 被认成 Ο 会让语法直接错), 一律不用.
all_s = harvest('b1', from_b(), 'pdf-text')

# 去重
seen, uniq = set(), []
for s in all_s:
    k = re.sub(r'\s+', '', s['text'])
    if k in seen: continue
    seen.add(k); uniq.append(s)
UMAP = json.load(open(f'{ROOT}/materials/textbooks/B_unit_page_map.json'))
def b_unit(bp):
    for u in UMAP['units']:
        if u['start_page'] <= bp <= u['end_page']: return u['system_unit'], u['title']
    return None, ''
for i, s in enumerate(uniq, 1):
    s['id'] = 300000 + i
    s['unit'], s['unit_title'] = b_unit(s['page'])
    s['cloze'] = s['text'].replace(s['blank_word'], '______', 1)
    correct = s['blank_word']                       # 保留课文里的原形(带重音)
    opts = [KEY2DISP.get(k, k) for k in distractors(correct, 3, i)]
    allo = list(dict.fromkeys([correct] + opts))
    import random as _r; _r.Random(i).shuffle(allo)
    s['options'] = allo
    s['answer'] = correct

json.dump({'schema': 'sentences_v1',
           'note': '来自教材原文的真句子. 严格过滤: 混入拉丁字母/数字、有孤立单字、'
                   '或有实词认不出的整句丢弃. B本来自PDF文字层解码(非OCR), 逐字精确.',
           'sentences': uniq}, open(f'{ROOT}/frontend/src/data/sentences.json','w'),
          ensure_ascii=False, indent=1)
import collections
print('可用真句子:', dict(collections.Counter(s['book'] for s in uniq)), '合计', len(uniq))
for s in uniq[:6]: print(f"  [{s['book']} p{s['page']}] {s['text']}   (挖空: {s['blank_word']})")

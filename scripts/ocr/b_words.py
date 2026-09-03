# -*- coding: utf-8 -*-
"""B 本分单元候选新词提取.
定义: 出现在 B 课文里、且不在 A1+A2 官方词典(3038词)里的实词 = B 阶段新词候选.
数据源是解码后的真文本(非OCR), 所以字形可信; 需要人工/模型确认原形与释义.
输出: materials/glossaries/B_candidate_words.json
"""
import re, json, os, sys, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from morph import MorphMatcher, norm, STOP

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GREEK_RE = re.compile(r'[Α-Ωα-ωΆ-Ώά-ώϊϋΐΰ]+')

T = open(f'{ROOT}/scratch/pdf_verify/B_pdf_decoded.txt').read()
pages = T.split('\f')
M = json.load(open(f'{ROOT}/materials/textbooks/B_unit_page_map.json'))
pdf2book = {int(k): v for k, v in M['pdf_page_to_book_page'].items()}
mm = MorphMatcher()

# 已学词(A1+A2)的全部匹配键
known = set(json.load(open(f'{ROOT}/materials/glossaries/AUTHORITATIVE_INDEX.json')).keys())

# 版式噪声: 页眉页脚、英文、日期
NOISE = re.compile(r'Layout|GREEK|ΕΛΛΗΝΙΚΑ|protoselida')

out = []
for u in M['units']:
    cnt = collections.Counter()
    forms = collections.defaultdict(collections.Counter)
    for p in u['pdf_pages']:
        txt = pages[p-1] if p-1 < len(pages) else ''
        for ln in txt.split('\n'):
            if NOISE.search(ln): continue
            for w in GREEK_RE.findall(ln):
                n = norm(w)
                if len(n) < 3 or n in STOP or n in known: continue
                if w.isupper(): continue          # 全大写多为标题/版式
                k, how = mm.match(w)
                lemma = k if how == 'exact' else n
                cnt[lemma] += 1
                forms[lemma][w] += 1
    cand = [{'lemma': k, 'freq': c, 'forms': [f for f, _ in forms[k].most_common(3)]}
            for k, c in cnt.most_common() if c >= 2]
    out.append({'unit': u['unit'], 'system_unit': u['system_unit'], 'title': u['title'],
                'book_pages': [u['start_page'], u['end_page']],
                'candidate_count': len(cand), 'candidates': cand})

json.dump(out, open(f'{ROOT}/materials/glossaries/B_candidate_words.json','w'),
          ensure_ascii=False, indent=1)
print('单元  系统  出现≥2次的候选新词数')
for u in out:
    print(f"  U{u['unit']:>2}  {u['system_unit']:>3}   {u['candidate_count']:>4}   {u['title'][:28]}")
print('合计候选:', sum(u['candidate_count'] for u in out))

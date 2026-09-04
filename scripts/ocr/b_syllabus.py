# -*- coding: utf-8 -*-
"""从 B 本课本目录里提取每单元的教学大纲(语法点 / 交际功能 / 功能句型)。

为什么用目录:
  B 本正文里语法讲解是散在版面里的方框, 位置不规则; 但书前面的目录
  (περιεχόμενα, 解码全文第 94–344 行) 把每个单元印成整齐的四栏:
      ΕΝΟΤΗΤΑ n  <标题> ....... <页码>
      <主题>
      ΕΠΙΚΟΙΝΩΝΙΑΚΕΣ ΛΕΙΤΟΥΡΓΙΕΣ   交际功能
      ΛΕΙΤΟΥΡΓΙΚΑ ΣΤΟΙΧΕΙΑ         功能句型(书上原句)
      ΓΡΑΜΜΑΤΙΚΗ                   语法点
  这是书上原印的教学大纲, 不是推断出来的。16 个单元有 ΓΡΑΜΜΑΤΙΚΗ,
  另外 4 个(5/10/15/20)是复习单元 Πάμε πάλι!, 书上本来就没有语法栏。

输出: materials/textbooks/B_syllabus.json
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC  = f'{ROOT}/materials/textbooks/derivation/B_pdf_decoded.txt'
UMAP = f'{ROOT}/materials/textbooks/B_unit_page_map.json'
OUT  = f'{ROOT}/materials/textbooks/B_syllabus.json'

LINES = open(SRC, encoding='utf-8').read().splitlines()

# 目录起止按内容定位, 不写死行号 ——
# 文件里有换页符, grep 与 Python 的行计数对不上, 写死会把目录尾部截掉。
_s = next(i for i, l in enumerate(LINES) if l.startswith('ΕΝΟΤΗΤΑ 1 '))
_e = next(i for i, l in enumerate(LINES) if l.startswith('ΕΝΟΤΗΤΑ 20 '))
_e = next(i for i in range(_e, len(LINES)) if LINES[i].strip().startswith('Επανάληψη')) + 1
TOC = LINES[_s:_e]

UNIT_RE = re.compile(r'^ΕΝΟΤΗΤΑ\s+(\d+)\s+(.+?)\s*[.\s]*\s*(\d+)?\s*$')
# 目录里的栏目标签; ΛΕΙΤΟΥΡΓΙΕΣ 是上一行标签换行后的下半截
LABELS = {
    'ΕΠΙΚΟΙΝΩΝΙΑΚΕΣ': 'functions',
    'ΛΕΙΤΟΥΡΓΙΚΑ ΣΤΟΙΧΕΙΑ': 'exponents',
    'ΓΡΑΜΜΑΤΙΚΗ': 'grammar',
}
NOISE = re.compile(r'^(\d+|ΕΛΛΗΝΙΚΑ Β’|περιεχόμενα|.*:Layout \d.*Page \d+)\s*$')
# 目录的页眉「περιεχόμενα」会被吸进上一条语法点里
# (U14 曾变成 "Φωνητική: Ουράνωση περιεχόμενα"), 单独剔掉。
TAIL_NOISE = re.compile(r'\s*περιεχόμενα\s*$')

units, cur, sec = {}, None, None
for raw in TOC:
    ln = raw.strip()
    if not ln or NOISE.match(ln):
        continue
    m = UNIT_RE.match(ln)
    if m:
        n = int(m.group(1))
        title = re.sub(r'[.\s]+$', '', m.group(2)).strip()
        cur = units.setdefault(n, {'unit': n, 'title': title, 'theme': '',
                                   'functions': '', 'exponents': '', 'grammar': ''})
        sec = 'theme'          # 单元标题的下一行是主题
        continue
    if cur is None:
        continue
    if ln.startswith('ΛΕΙΤΟΥΡΓΙΕΣ'):          # ΕΠΙΚΟΙΝΩΝΙΑΚΕΣ 的换行下半截
        cur['functions'] += ' ' + ln[len('ΛΕΙΤΟΥΡΓΙΕΣ'):].strip()
        sec = 'functions'
        continue
    hit = next((lab for lab in LABELS if ln.startswith(lab)), None)
    if hit:
        sec = LABELS[hit]
        cur[sec] += ' ' + ln[len(hit):].strip()
        continue
    if sec:
        cur[sec] += ' ' + ln

def clean(s):
    return TAIL_NOISE.sub('', re.sub(r'\s+', ' ', s)).strip(' •·-')

def bullets(s):
    return [b for b in (clean(x) for x in clean(s).split('•')) if b]

UM = {u['unit']: u for u in json.load(open(UMAP))['units']}
out = []
for n in sorted(units):
    u = units[n]
    m = UM.get(n, {})
    out.append({
        'unit': n,
        'system_unit': m.get('system_unit', 39 + n),
        'title': u['title'],
        'pages': [m.get('start_page'), m.get('end_page')],
        'theme': clean(u['theme']),
        'functions': bullets(u['functions']),
        'exponents': bullets(u['exponents']),
        'grammar': bullets(u['grammar']),
        'is_review': not bullets(u['grammar']),
    })

json.dump({'schema': 'b_syllabus_v1',
           'source': 'Ελληνικά Β΄ 课本目录(περιεχόμενα), PDF 文字层逐字解码, 非 OCR',
           'note': '5/10/15/20 是复习单元 Πάμε πάλι!, 书上本来就没有语法栏',
           'units': out}, open(OUT, 'w'), ensure_ascii=False, indent=1)

ng = sum(1 for u in out if u['grammar'])
print(f'共 {len(out)} 个单元, {ng} 个有语法栏, {len(out)-ng} 个复习单元')
print(f'语法点合计 {sum(len(u["grammar"]) for u in out)} 条, 功能句型 {sum(len(u["exponents"]) for u in out)} 条')
for u in out:
    flag = '(复习)' if u['is_review'] else ''
    print(f'  U{u["unit"]:>2} p{u["pages"][0]}-{u["pages"][1]} {u["title"][:34]:<36}'
          f' 语法{len(u["grammar"]):>2} 句型{len(u["exponents"]):>2} {flag}')

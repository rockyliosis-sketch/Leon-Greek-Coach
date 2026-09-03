# -*- coding: utf-8 -*-
"""生成 B1 单词表 PDF, 排版沿用 A1/A2 中文词表, 但按单元分节(不是按首字母).

家长的要求原话: "按照单元把它入库", "不要再按照首字母来排了".
所以这里 20 个单元各成一节, 节内按希腊语字母序排, 方便对着课本一课一课背。

输出:
  raw_books/raw_sources/glossaries/Ellinika_B_Glossary_CN.html
  raw_books/raw_sources/glossaries/Ellinika_B_Glossary_CN.pdf
"""
import os, sys, json, html, subprocess, collections, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT  = f'{ROOT}/raw_books/raw_sources/glossaries'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

V = [e for e in json.load(open(f'{ROOT}/frontend/src/data/vocabulary_v2.json'))['entries']
     if e['book_id'] == 'b1']
UM = {u['unit']: u for u in json.load(open(f'{ROOT}/materials/textbooks/B_unit_page_map.json'))['units']}

TAG = {'中': ('tag-neuter', '中'), '阳': ('tag-masc', '阳'), '阴': ('tag-fem', '阴'),
       '动': ('tag-verb', '动'), '形': ('tag-adj', '形'), '副': ('tag-adv', '副'),
       '复': ('tag-other', '复'), '介': ('tag-other', '介'), '连': ('tag-other', '连')}

def sortkey(e):
    s = ''.join(c for c in unicodedata.normalize('NFD', e['headword'].lower())
                if unicodedata.category(c) != 'Mn')
    return s

CSS = """
@page { size: A4; margin: 18mm 15mm 20mm 15mm; }
@page :first { margin: 0; }
/* 字体顺序很要紧: -apple-system 和 PingFang SC 都有希腊字母, 却缺带重音的那些,
   Chrome 会退回去把重音单独画出来 —— μήνυμά 变成 μηνυμα΄, Λέξεις 变成 Λεξεις。
   所以必须把希腊语覆盖完整的 Helvetica Neue 放在中文字体前面;
   中文字符它没有, 会自然落到后面的 PingFang SC, 两边都不受影响。 */
body { font-family: "Helvetica Neue","Lucida Grande","PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif;
       color:#1e293b; margin:0; padding:0; -webkit-print-color-adjust:exact; }
.cover-page { page-break-after: always; height:297mm; display:flex; flex-direction:column;
  justify-content:space-between; box-sizing:border-box; padding:55mm 20mm 35mm 20mm;
  text-align:center; background:linear-gradient(135deg,#ecfeff 0%,#e0f2fe 60%,#eef2ff 100%); }
.cover-title-wrap { flex-grow:1; display:flex; flex-direction:column; justify-content:center; }
.cover-badge { display:inline-block; align-self:center; font-size:14pt; font-weight:800;
  padding:6px 20px; background-color:#0e7490; color:#fff; border-radius:30px; margin-bottom:24px;
  letter-spacing:1px; }
.cover-title { font-size:34pt; font-weight:900; color:#134e4a; margin:0 0 16px 0; line-height:1.25; }
.cover-subtitle { font-size:17pt; font-weight:700; color:#0f766e; margin:0 0 28px 0; }
.cover-desc { font-size:11pt; color:#334155; line-height:2; max-width:130mm; margin:0 auto; }
.cover-note { font-size:9.5pt; color:#475569; line-height:1.9; max-width:132mm; margin:26px auto 0;
  background:rgba(255,255,255,.72); border:1px solid #a5f3fc; border-radius:10px;
  padding:14px 18px; text-align:left; }
.cover-note b { color:#0e7490; }
.cover-footer { font-size:10pt; color:#64748b; }
.toc-title, .section-title { font-size:18pt; font-weight:800; color:#0f172a; margin-bottom:20px;
  border-bottom:3px solid #e2e8f0; padding-bottom:8px; }
.toc-row { display:flex; justify-content:space-between; font-size:10.5pt; padding:5px 2px;
  border-bottom:1px dashed #e2e8f0; }
.toc-row .t { color:#0f766e; font-weight:700; }
.toc-row .n { color:#64748b; }
.dictionary-columns { column-count:2; column-gap:26px; column-rule:1px solid #e2e8f0; }
.unit-section { column-span:all; break-before:auto; break-after:avoid;
  margin-top:22px; margin-bottom:10px; }
.unit-title { font-size:14.5pt; font-weight:800; color:#0e7490;
  border-bottom:2px solid #0e7490; padding-bottom:4px;
  display:flex; justify-content:space-between; align-items:baseline; }
.unit-meta { font-size:9.5pt; font-weight:500; color:#64748b; }
.unit-zh { font-size:9.5pt; color:#0f766e; margin-top:3px; }
.word-item { break-inside:avoid; display:flex; flex-direction:row; align-items:flex-start;
  padding:5px 4px; border-bottom:1px dashed #f1f5f9; }
.word-greek { font-family:"Georgia",serif; font-weight:700; font-size:10.5pt; color:#1e293b;
  width:46%; padding-right:8px; box-sizing:border-box; word-wrap:break-word; }
.word-translation { width:54%; display:flex; flex-direction:column; }
.word-chinese { font-size:9.5pt; font-weight:700; color:#0f172a; line-height:1.35; }
.word-english { font-size:8pt; color:#64748b; margin-top:2px; line-height:1.25; }
.star { color:#d97706; font-size:8.5pt; }
.tag { display:inline-block; font-size:7.5pt; font-weight:bold; padding:1px 4px; border-radius:3px;
  margin-left:4px; vertical-align:middle; line-height:1.1; }
.tag-neuter{background:#e0f2fe;color:#0369a1;} .tag-masc{background:#dcfce7;color:#15803d;}
.tag-fem{background:#fee2e2;color:#b91c1c;}    .tag-verb{background:#faf5ff;color:#6b21a8;}
.tag-adj{background:#fef9c3;color:#854d0e;}    .tag-adv{background:#fff7ed;color:#c2410c;}
.tag-other{background:#f1f5f9;color:#475569;}
"""

def esc(x): return html.escape(x or '')

byu = collections.defaultdict(list)
for e in V: byu[e['unit']].append(e)

parts = [f'<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">'
         f'<title>希腊语单词表 — Ελληνικά Β΄</title><style>{CSS}</style></head><body>']

# ---- 封面 ----
parts.append(f"""
<div class="cover-page">
  <div class="cover-title-wrap">
    <div class="cover-badge">Ελληνικά Β΄ &nbsp;·&nbsp; Level B1</div>
    <h1 class="cover-title">希腊语 - 中文双语词汇手册</h1>
    <h2 class="cover-subtitle">B 级课本生词表 · 按单元编排</h2>
    <div class="cover-desc">
      共 {len(V)} 词 &nbsp;·&nbsp; 20 个单元<br>
      希腊语原词 • 重音标注 • 中文释义 • 英文对照 • 词性标注<br>
      带 ★ 的是教材每单元「Λέξεις, λέξεις」方框点名的生词
    </div>
    <div class="cover-note">
      <b>这份词表和 A1/A2 那两份不一样，说明一下：</b><br>
      A1/A2 的中文来自<b>希腊教育部官方配套词表</b>。B 级课本<b>没有</b>这样一份官方词表，
      所以这里的<b>希腊语原词是从课本 PDF 文字层逐字解码提取的</b>（不是 OCR 识别，逐字精确），
      而<b>中文释义由 AI 逐条给出，不是官方译文</b>，仅供 Leon 学习参考。<br>
      <b>选词标准：</b>教材方框点名的生词优先，其次是该单元高频出现、且 A1/A2 词表里
      没有收录的词；人名地名、A1/A2 已学词、纯变位形式都已剔除。
    </div>
  </div>
  <div class="cover-footer">Leon's Greek Coach · 学习伴侣系列 · 2026 年 9 月版</div>
</div>""")

# ---- 目录 ----
parts.append('<div class="toc-title">目录 · Περιεχόμενα</div>')
for u in sorted(byu):
    m = UM[u]
    parts.append(f'<div class="toc-row"><span class="t">第 {u} 单元 &nbsp; {esc(m["title"])}</span>'
                 f'<span class="n">课本 p{m["start_page"]}–{m["end_page"]} &nbsp;·&nbsp; {len(byu[u])} 词</span></div>')
parts.append('<div style="page-break-after:always"></div>')

# ---- 正文 ----
parts.append('<div class="section-title">B 级课本生词表</div><div class="dictionary-columns">')
for u in sorted(byu):
    m = UM[u]
    parts.append(f'<div class="unit-section"><div class="unit-title">'
                 f'<span>第 {u} 单元 &nbsp; {esc(m["title"])}</span>'
                 f'<span class="unit-meta">课本 p{m["start_page"]}–{m["end_page"]} · {len(byu[u])} 词</span>'
                 f'</div></div>')
    for e in sorted(byu[u], key=sortkey):
        cls, lab = TAG.get(e.get('pos') or '', ('tag-other', ''))
        tag = f'<span class="tag {cls}">{lab}</span>' if lab else ''
        star = ' <span class="star">★</span>' if e.get('match') == 'lexeis-box' else ''
        en = f'<div class="word-english">{esc(e["word_english"])}</div>' if e.get('word_english') else ''
        parts.append(
            f'<div class="word-item"><div class="word-greek">{esc(e["word_greek"])}{tag}{star}</div>'
            f'<div class="word-translation"><div class="word-chinese">{esc(e["word_chinese"])}</div>{en}</div></div>')
parts.append('</div></body></html>')

hp = f'{OUT}/Ellinika_B_Glossary_CN.html'
open(hp, 'w').write('\n'.join(parts))
print(f'HTML: {hp}  ({os.path.getsize(hp)//1024} KB)')

pp = f'{OUT}/Ellinika_B_Glossary_CN.pdf'
r = subprocess.run([CHROME, '--headless', '--disable-gpu', '--no-pdf-header-footer',
                    f'--print-to-pdf={pp}', f'file://{hp}'],
                   capture_output=True, text=True, timeout=180)
if os.path.exists(pp):
    print(f'PDF : {pp}  ({os.path.getsize(pp)//1024} KB)')
else:
    print('PDF 生成失败:', r.stderr[-800:])

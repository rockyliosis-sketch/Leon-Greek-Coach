# -*- coding: utf-8 -*-
"""从 4 个官方词汇表 PDF 构建权威词典 (A1 / A2)
修复: 拉丁-希腊同形字母、动词 -άω/-ώ 双写、方括号注释续行"""
import re, json, unicodedata, subprocess, os

GLOS = 'raw_books/raw_sources/glossaries'
GREEK = re.compile(r'[Ͱ-Ͽἀ-῿]')
# 拉丁字母 -> 视觉相同的希腊字母 (PDF 常见混排)
LAT2GR = str.maketrans({
    'A':'Α','B':'Β','E':'Ε','H':'Η','I':'Ι','K':'Κ','M':'Μ','N':'Ν','O':'Ο',
    'P':'Ρ','T':'Τ','X':'Χ','Y':'Υ','Z':'Ζ','o':'ο','v':'ν','p':'ρ','x':'χ','y':'υ',
})

def pdftext(p):
    return subprocess.run(['pdftotext', p, '-'], capture_output=True, text=True).stdout

def norm(s):
    s = s.translate(LAT2GR)
    s = ''.join(c for c in unicodedata.normalize('NFD', s)
                if unicodedata.category(c) != 'Mn')
    return s.lower().strip()

def headword(entry):
    return entry.split(',')[0].split('(')[0].split('/')[0].split('[')[0].strip()

def keys_of(entry):
    """一个词条 -> 所有可匹配的键 (含 -άω/-ώ 双写变体)"""
    h = norm(headword(entry))
    if not h:
        return set()
    ks = {h}
    if h.endswith('αω'):  ks.add(h[:-2] + 'ω')      # αγαπαω -> αγαπω
    elif h.endswith('εω'): ks.add(h[:-2] + 'ω')
    elif h.endswith('ω'):  ks.add(h[:-1] + 'αω')    # αγαπω  -> αγαπαω
    # 词条里显式写出的变体, 如 'αγαπάω, -ώ'
    for part in entry.split(',')[1:]:
        part = part.strip()
        if part.startswith('-') and len(part) > 1 and GREEK.search(part):
            suf = norm(part[1:])
            if suf and len(suf) <= 3 and not suf.startswith(('η','ο','ε','ι','α')):
                ks.add(re.sub(r'[α-ω]{1,3}$', suf, h))
    return {k for k in ks if k}

def join_wrapped(lines, sep):
    out = []
    for ln in lines:
        s = ln.strip()
        if not s:
            continue
        cont = (sep not in s) or s.startswith(('[', 'see ', 'also ', '(')) \
               or (out and out[-1].count('[') > out[-1].count(']'))
        if out and cont and not re.match(r'^[Α-Ωα-ω]\s*,\s*[α-ω]\s*' + re.escape(sep), s):
            out[-1] += ' ' + s
        else:
            out.append(s)
    return out

def parse_en(txt):
    res = {}
    raw = [l for l in txt.split('\n') if GREEK.search(l) and ('=' in l or l.strip().startswith(('[','see','also')))]
    for ln in join_wrapped(raw, '='):
        if '=' not in ln or re.match(r'^[Α-Ωα-ω]\s*,\s*[α-ω]\s*=', ln):
            continue
        g, e = ln.split('=', 1)
        g, e = g.strip(), e.strip()
        if not g or not GREEK.search(g):
            continue
        for k in keys_of(g):
            res.setdefault(k, {'entry': g, 'english': e})
    return res

def parse_cn(txt):
    res = {}
    raw = [l for l in txt.split('\n') if GREEK.search(l) and ('—' in l or l.strip().startswith(('[','(')))]
    for ln in join_wrapped(raw, '—'):
        if '—' not in ln:
            continue
        g, c = ln.split('—', 1)
        g, c = g.strip(), c.strip()
        pos = ''
        m = re.search(r'\s(动|形|阳|阴|中|复|副|介|连|代|数|名|叹)$', g)
        if m:
            pos = m.group(1); g = g[:m.start()].strip()
        if not g or not GREEK.search(g):
            continue
        cn = re.sub(r'\s*\([^)]*\)\s*$', '', c).strip()
        for k in keys_of(g):
            res.setdefault(k, {'entry': g, 'pos': pos, 'chinese': cn})
    return res

def build(level, en_pdf, cn_pdf):
    en = parse_en(pdftext(f'{GLOS}/{en_pdf}'))
    cn = parse_cn(pdftext(f'{GLOS}/{cn_pdf}'))
    out, seen = [], set()
    for k in sorted(set(en) | set(cn)):
        e, c = en.get(k, {}), cn.get(k, {})
        ent = e.get('entry') or c.get('entry')
        sig = norm(headword(ent))
        if sig in seen:
            continue
        seen.add(sig)
        out.append({'key': sig, 'keys': sorted(keys_of(ent)), 'entry': ent,
                    'english': e.get('english',''), 'chinese': c.get('chinese',''),
                    'pos': c.get('pos',''), 'level': level})
    both = sum(1 for x in out if x['english'] and x['chinese'])
    print(f'[{level}] 英文键 {len(en)} | 中文键 {len(cn)} | 词条 {len(out)} | 双语齐全 {both} ({both/len(out)*100:.0f}%)')
    return out

if __name__ == '__main__':
    a1 = build('A1', 'Glossary_A1_kids.pdf', 'Glossary_A1_kids_CN.pdf')
    a2 = build('A2', 'KLIK_A2_Ef_Glossary.pdf', 'KLIK_A2_Ef_Glossary_CN.pdf')
    json.dump({'A1': a1, 'A2': a2},
              open('materials/glossaries/AUTHORITATIVE_DICT.json','w'),
              ensure_ascii=False, indent=1)
    idx = {}
    for lv in (a1, a2):
        for x in lv:
            for k in x['keys']:
                idx.setdefault(k, x['key'])
    json.dump(idx, open('materials/glossaries/AUTHORITATIVE_INDEX.json','w'), ensure_ascii=False)
    print(f'\n词条合计 {len(a1)+len(a2)} | 匹配键合计 {len(idx)}')

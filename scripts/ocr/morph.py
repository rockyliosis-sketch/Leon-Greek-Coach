# -*- coding: utf-8 -*-
"""希腊语形态感知匹配: 用词干规则把变位形式对回词典原形"""
import re, json, unicodedata, collections, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LAT2GR = str.maketrans({'A':'Α','B':'Β','E':'Ε','H':'Η','I':'Ι','K':'Κ','M':'Μ','N':'Ν',
                        'O':'Ο','P':'Ρ','T':'Τ','X':'Χ','Y':'Υ','Z':'Ζ','o':'ο','v':'ν'})
VERB_SUF = ['ονται','ομαστε','ουμαι','ομαι','εσαι','εται','ουμε','ουνε','ετε','ουν',
            'θηκαν','θηκε','θηκα','ηκαν','ηκε','αμε','ατε','εις','ει','αν','ω','ας','ε']
NOUN_SUF = ['ιων','εων','ους','ων','οι','ες','ας','ης','ος','ου','αι','ια','α','η','ο','ς','ι','υ','ες']
ALL_SUF  = sorted(set(VERB_SUF + NOUN_SUF), key=len, reverse=True)
# 语法功能词: 不是"生词", 不计入未识别
STOP = set('''ο η το οι τα του της των τον την τους τις ενας μια ενα εναν μιας ενος
και κι να θα δε δεν μη μην ας σε στο στη στην στον στους στις στα απο με για ως προς
κατα μετα πριν που πως οτι αν οταν γιατι αλλα ή ειτε οσο καθε
εγω εσυ αυτος αυτη αυτο εμεις εσεις αυτοι αυτες αυτα μου σου μας σας
ειμαι εισαι ειναι ειμαστε ειστε εχω εχεις εχει εχουμε εχετε εχουν
πολυ πιο παλι ακομα τωρα εδω εκει ναι οχι μονο ολα ολο ολη ολοι'''.split())

def norm(s):
    s = s.translate(LAT2GR)
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    return s.lower().strip()

def stems(n, minlen=2):
    out = {n} if len(n) >= minlen else set()
    for suf in ALL_SUF:
        if n.endswith(suf) and len(n) - len(suf) >= minlen:
            out.add(n[:len(n)-len(suf)])
    return out

def looks_verb(n):
    return any(n.endswith(s) for s in ('ω','εις','ει','ουμε','ετε','ουν','ομαι','εσαι','εται','ονται'))

class MorphMatcher:
    def __init__(self):
        d = json.load(open(f'{ROOT}/materials/glossaries/AUTHORITATIVE_DICT.json'))
        self.by_key = {x['key']: x for lv in d.values() for x in lv}
        self.exact, self.stem_idx = {}, collections.defaultdict(set)
        for x in self.by_key.values():
            for k in x['keys']:
                self.exact[k] = x['key']
                for s in stems(k):
                    self.stem_idx[s].add(x['key'])

    def is_stop(self, w):
        return norm(w) in STOP

    def match(self, w):
        n = norm(w)
        if not n:
            return None, None
        if n in self.exact:
            return self.exact[n], 'exact'
        if len(n) < 3:
            return None, None
        cand_stems = [x for x in sorted(stems(n), key=len, reverse=True) if len(x) >= 3]
        # 1) 若像动词, 先在所有词干层级里找动词条目
        if looks_verb(n):
            for s_ in cand_stems:
                vs = [k for k in self.stem_idx.get(s_, ()) if self.by_key[k]['pos'] == '动']
                if len(vs) == 1:
                    return vs[0], f'stem:{s_}'
                if vs:
                    return min(vs, key=lambda k: abs(len(k)-len(n))), f'stem?:{s_}'
        # 2) 一般匹配: 唯一命中优先
        for s_ in cand_stems:
            c = self.stem_idx.get(s_)
            if c and len(c) == 1:
                return next(iter(c)), f'stem:{s_}'
        for s_ in cand_stems:
            c = self.stem_idx.get(s_)
            if c:
                return min(c, key=lambda k: abs(len(k)-len(n))), f'stem?:{s_}'
        return None, None

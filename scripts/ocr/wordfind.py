# -*- coding: utf-8 -*-
"""封闭词表反向搜索: 判断词典里的词是否出现在某页 OCR 文本中"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from morph import norm

def _lev(a, b, cap):
    if abs(len(a)-len(b)) > cap: return cap+1
    prev = list(range(len(b)+1))
    for i, ca in enumerate(a, 1):
        cur = [i]+[0]*len(b); best = cur[0]
        for j, cb in enumerate(b, 1):
            cur[j] = min(prev[j]+1, cur[j-1]+1, prev[j-1]+(ca != cb))
            best = min(best, cur[j])
        if best > cap: return cap+1
        prev = cur
    return prev[-1]

def tolerance(w):
    """词越长容错越松, 但比例受控 —— 短词必须近乎精确"""
    L = len(w)
    if L <= 4:  return 0
    if L <= 6:  return 1
    if L <= 10: return 2
    return 3

def find(word, hay_words, maxd=None):
    """hay_words: 页面 OCR 文本切成的词列表(已 norm)
       返回最小编辑距离, 未命中返回 None"""
    n = norm(word)
    if not n: return None
    cap = tolerance(n) if maxd is None else maxd
    best = None
    for hw in hay_words:
        if abs(len(hw)-len(n)) > cap: continue
        d = _lev(n, hw, cap)
        if d <= cap and (best is None or d < best):
            best = d
            if best == 0: break
    return best

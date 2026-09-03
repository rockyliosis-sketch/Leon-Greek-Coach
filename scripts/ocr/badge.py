# -*- coding: utf-8 -*-
"""检测单元起始页: A1 系列每个单元第一页左上角有粉色 'Ενότητα N' 徽章.
不认艺术字, 只按颜色定位徽章 -> 得到单元分界线.
"""
import os, sys, json, subprocess
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from eval_ocr import BOOKS
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W = f'{ROOT}/scratch/ocr_work'

def pink_score(im):
    """左侧 1/3、上半部区域内的品红像素数"""
    w, h = im.size
    box = im.crop((int(w*0.02), int(h*0.20), int(w*0.38), int(h*0.55)))
    px = box.convert('RGB').getdata()
    n = 0
    for r, g, b in px:
        if r > 140 and g < 95 and 60 < b < 175 and (r - g) > 70:
            n += 1
    return n, box.size[0]*box.size[1]

def scan(book, dpi=80):
    fn, total, f = BOOKS[book]
    pdf = f'{ROOT}/raw_books/raw_sources/textbooks/{fn}'
    res = []
    for pg in range(1, total+1):
        out = f'{W}/badge_{book}_{pg}'
        subprocess.run(['pdftoppm','-f',str(pg),'-l',str(pg),'-r',str(dpi),'-jpeg',pdf,out],
                       capture_output=True)
        cand = [p for p in os.listdir(W) if p.startswith(f'badge_{book}_{pg}-')]
        if not cand: res.append((pg, f(pg), 0, 0)); continue
        p = f'{W}/{cand[0]}'
        n, tot = pink_score(Image.open(p))
        os.remove(p)
        res.append((pg, f(pg), n, round(n/tot*1000, 2)))
    return res

if __name__ == '__main__':
    for book in (sys.argv[1:] or ['A1-B']):
        r = scan(book)
        r.sort(key=lambda x: -x[2])
        print(f'=== {book} 粉色徽章得分 Top20 (PDF页, 书页, 像素数, 千分比) ===')
        for x in r[:20]: print('  ', x)

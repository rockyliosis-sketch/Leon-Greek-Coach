# -*- coding: utf-8 -*-
"""单元起始页识别: 亮度定位书本区域 -> 裁左页顶部 -> 高分辨率 OCR 找 'Ενότητα N'"""
import os, sys, re, json, subprocess
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from greek_ocr import ocr
from eval_ocr import BOOKS
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W = f'{ROOT}/scratch/ocr_work'
UNIT = re.compile(r'[ΕΈE][νvνuπ][όoΟ0ό][τtτ][ηnηθ][τtτ][αa]\D{0,4}(\d{1,2})')
ANY  = re.compile(r'[ΕΈE]ν[όo]τητα', re.I)

def book_box(im):
    """书本比桌面亮 -> 用亮度阈值找书本外接框"""
    w, h = im.size
    g = im.convert('L').resize((w//6, h//6))
    W2, H2 = g.size; px = g.load()
    thr = 150
    rows = [sum(1 for x in range(W2) if px[x,y] > thr) for y in range(H2)]
    cols = [sum(1 for y in range(H2) if px[x,y] > thr) for x in range(W2)]
    def span(a, frac):
        m = max(a) or 1
        idx = [i for i, v in enumerate(a) if v > m*frac]
        return (idx[0], idx[-1]) if idx else (0, len(a)-1)
    y0, y1 = span(rows, 0.35); x0, x1 = span(cols, 0.35)
    return x0/W2, y0/H2, (x1+1)/W2, (y1+1)/H2

def read_unit(book, pg, dpi=450):
    fn, total, f = BOOKS[book]
    pdf = f'{ROOT}/raw_books/raw_sources/textbooks/{fn}'
    lo = f'{W}/bb_{book}_{pg}'
    subprocess.run(['pdftoppm','-f',str(pg),'-l',str(pg),'-r','70','-jpeg',pdf,lo], capture_output=True)
    c = [p for p in os.listdir(W) if p.startswith(f'bb_{book}_{pg}-')]
    if not c: return None
    bx = book_box(Image.open(f'{W}/{c[0]}'))
    for p in c: os.remove(f'{W}/{p}')
    hi = f'{W}/bg_{book}_{pg}'
    subprocess.run(['pdftoppm','-f',str(pg),'-l',str(pg),'-r',str(dpi),'-jpeg',pdf,hi], capture_output=True)
    c2 = [p for p in os.listdir(W) if p.startswith(f'bg_{book}_{pg}-')]
    if not c2: return None
    big = Image.open(f'{W}/{c2[0]}'); BW, BH = big.size
    x0, y0, x1, y1 = bx
    # 左页 = 书本左半; 取其顶部 22%
    cx0, cx1 = x0, x0 + (x1-x0)*0.55
    cy0, cy1 = y0, y0 + (y1-y0)*0.24
    crop = big.crop((int(cx0*BW), int(cy0*BH), int(cx1*BW), int(cy1*BH)))
    cp = f'{W}/cg_{book}_{pg}.png'; crop.save(cp)
    txts = [ocr(cp, psm=p) for p in (6, 11)]
    for p in c2: os.remove(f'{W}/{p}')
    os.remove(cp)
    joined = ' '.join(txts)
    m = UNIT.search(joined)
    return {'num': int(m.group(1)) if m and 1 <= int(m.group(1)) <= 30 else None,
            'has_word': bool(ANY.search(joined)),
            'sample': joined.replace('\n',' ')[:80]}

if __name__ == '__main__':
    book = sys.argv[1]
    for pg in [int(x) for x in sys.argv[2:]]:
        r = read_unit(book, pg)
        print(f'PDF{pg:>3} 书页{BOOKS[book][2](pg):>3}: 单元={r["num"]} 有"Ενότητα"={r["has_word"]}  « {r["sample"][:60]}')

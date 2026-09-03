# -*- coding: utf-8 -*-
"""定位粉色徽章外框 -> 裁出来高分辨率识别单元号"""
import os, sys, re, json, subprocess
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from greek_ocr import ocr
from eval_ocr import BOOKS
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W = f'{ROOT}/scratch/ocr_work'

def is_pink(r, g, b):
    return r > 140 and g < 100 and 55 < b < 185 and (r - g) > 70

def badge_box(im):
    """在左半页找最大的粉色矩形块, 返回归一化 bbox"""
    w, h = im.size
    sm = im.convert('RGB').resize((w//4, h//4))
    W2, H2 = sm.size
    px = sm.load()
    cols = [0]*W2; rows = [0]*H2
    pts = []
    for y in range(int(H2*0.15), int(H2*0.60)):
        for x in range(0, int(W2*0.40)):
            if is_pink(*px[x, y]):
                cols[x] += 1; rows[y] += 1; pts.append((x, y))
    if len(pts) < 60: return None
    # 取投影峰值附近的连续区间
    def span(arr, lo, hi):
        mx = max(arr[lo:hi]) if hi > lo else 0
        if mx == 0: return None
        c = arr.index(mx)
        a = c
        while a > lo and arr[a-1] >= mx*0.20: a -= 1
        b = c
        while b < hi-1 and arr[b+1] >= mx*0.20: b += 1
        return a, b
    sx = span(cols, 0, int(W2*0.40)); sy = span(rows, int(H2*0.15), int(H2*0.60))
    if not sx or not sy: return None
    return (sx[0]/W2, sy[0]/H2, (sx[1]+1)/W2, (sy[1]+1)/H2)

NUM = re.compile(r'(\d{1,2})')
def read_unit(book, pg, dpi=500):
    fn, total, f = BOOKS[book]
    pdf = f'{ROOT}/raw_books/raw_sources/textbooks/{fn}'
    lo = f'{W}/bx_{book}_{pg}'
    subprocess.run(['pdftoppm','-f',str(pg),'-l',str(pg),'-r','80','-jpeg',pdf,lo], capture_output=True)
    c = [p for p in os.listdir(W) if p.startswith(f'bx_{book}_{pg}-')]
    if not c: return None
    im = Image.open(f'{W}/{c[0]}'); box = badge_box(im)
    for p in c: os.remove(f'{W}/{p}')
    if not box: return None
    hi = f'{W}/bh_{book}_{pg}'
    subprocess.run(['pdftoppm','-f',str(pg),'-l',str(pg),'-r',str(dpi),'-jpeg',pdf,hi], capture_output=True)
    c2 = [p for p in os.listdir(W) if p.startswith(f'bh_{book}_{pg}-')]
    if not c2: return None
    big = Image.open(f'{W}/{c2[0]}'); BW, BH = big.size
    pad = 0.012
    crop = big.crop((int(max(0,box[0]-pad)*BW), int(max(0,box[1]-pad)*BH),
                     int(min(1,box[2]+pad)*BW), int(min(1,box[3]+pad)*BH)))
    # 徽章是粉底白字, 反相后更像黑字白底
    from PIL import ImageOps
    crop = ImageOps.invert(crop.convert('L')).point(lambda v: 0 if v < 110 else 255)
    cp = f'{W}/crop_{book}_{pg}.png'; crop.save(cp)
    txts = [ocr(cp, psm=p) for p in (7, 8, 6)]
    for p in c2: os.remove(f'{W}/{p}')
    os.remove(cp)
    nums = []
    for t in txts:
        nums += [int(x) for x in NUM.findall(t) if 1 <= int(x) <= 30]
    return (box, nums, ' | '.join(t.strip().replace('\n',' ') for t in txts)[:70])

if __name__ == '__main__':
    book = sys.argv[1]
    for pg in [int(x) for x in sys.argv[2:]]:
        r = read_unit(book, pg)
        bp = BOOKS[book][2](pg)
        print(f'PDF{pg:>3} 书页{bp:>3}: {r[1] if r else "无徽章"}   « {r[2] if r else ""}')

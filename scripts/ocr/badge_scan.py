# -*- coding: utf-8 -*-
"""单元徽章扫描: 只渲染每页左上角(徽章所在区域)做 OCR, 找 'Ενότητα N'.
pdftoppm -x -y -W -H 直接裁剪渲染, 面积只有全页 1/5, 速度快 5 倍.
"""
import os, sys, re, json, glob, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from greek_ocr import ocr
from eval_ocr import BOOKS
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W = f'{ROOT}/scratch/ocr_work'
DPI = 400
UNIT = re.compile(r'[ΕΈEΞ]\W{0,2}[νvνu]\W{0,2}[όoΟ0ό]\W{0,2}[τtτ]\W{0,2}[ηnηθ]\W{0,2}[τtτ]\W{0,2}[αa]\D{0,6}(\d{1,2})')
ANY  = re.compile(r'ν[όo]τητ', re.I)

def page_px(pdf, pg):
    r = subprocess.run(['pdfinfo','-f',str(pg),'-l',str(pg),pdf], capture_output=True, text=True)
    m = re.search(r'Page\s+\d+\s+size:\s+([\d.]+)\s+x\s+([\d.]+)', r.stdout)
    if not m: return None
    return int(float(m.group(1))/72*DPI), int(float(m.group(2))/72*DPI)

def scan(book):
    fn, total, f = BOOKS[book]
    pdf = f'{ROOT}/raw_books/raw_sources/textbooks/{fn}'
    dim = page_px(pdf, 1)
    out = {}
    for pg in range(1, total+1):
        if dim is None: break
        PW, PH = dim
        x, y = 0, int(PH*0.10)
        w, h = int(PW*0.48), int(PH*0.48)
        stem = f'{W}/bs_{book}_{pg}'
        subprocess.run(['pdftoppm','-f',str(pg),'-l',str(pg),'-r',str(DPI),
                        '-x',str(x),'-y',str(y),'-W',str(w),'-H',str(h),'-png',pdf,stem],
                       capture_output=True)
        c = glob.glob(stem + '-*.png')
        txt = ''
        if c:
            txt = ocr(c[0], psm=11) + '\n' + ocr(c[0], psm=6)
            for p in c: os.remove(p)
        m = UNIT.search(txt)
        out[pg] = {'book_page': f(pg), 'unit': int(m.group(1)) if m and 1 <= int(m.group(1)) <= 30 else None,
                   'has_word': bool(ANY.search(txt))}
        if out[pg]['unit'] or out[pg]['has_word']:
            print(f"  PDF{pg:>3} 书页{f(pg):>3}: 单元={out[pg]['unit']} 见词={out[pg]['has_word']}", flush=True)
    json.dump(out, open(f'{ROOT}/scratch/badge_{book}.json','w'), ensure_ascii=False, indent=1)
    hit = sum(1 for v in out.values() if v['unit'])
    print(f'== {book}: {total} 页扫完, 读到单元号 {hit} 页', flush=True)

if __name__ == '__main__':
    for b in (sys.argv[1:] or ['A1-A','A1-B']): scan(b)

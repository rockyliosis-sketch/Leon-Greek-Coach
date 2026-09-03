# -*- coding: utf-8 -*-
"""页脚扫描: 印刷版每页页脚有 'Ενότητα N   <页码>', 只渲染底部窄条做 OCR.
输出: scratch/footer_<name>.json  {pdf_page: {unit, book_page}}
"""
import os, sys, re, json, glob, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from greek_ocr import ocr
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W = f'{ROOT}/scratch/ocr_work'
DPI = 400
U = re.compile(r'[ΕΈE]\s?ν\s?[όoό0]\s?τ\s?η\s?τ\s?α\s*(\d{1,2})')
P = re.compile(r'\b(\d{1,3})\b')

def scan(name, pdf, total, band=(0.93, 1.0)):
    r = subprocess.run(['pdfinfo','-f','1','-l','1',pdf], capture_output=True, text=True)
    m = re.search(r'Page\s+\d+\s+size:\s+([\d.]+)\s+x\s+([\d.]+)', r.stdout)
    PW, PH = int(float(m.group(1))/72*DPI), int(float(m.group(2))/72*DPI)
    y = int(PH*band[0]); h = int(PH*(band[1]-band[0]))
    out = {}
    for pg in range(1, total+1):
        stem = f'{W}/ft_{name}_{pg}'
        subprocess.run(['pdftoppm','-f',str(pg),'-l',str(pg),'-r',str(DPI),
                        '-x','0','-y',str(y),'-W',str(PW),'-H',str(h),'-png',pdf,stem],
                       capture_output=True)
        c = glob.glob(stem+'-*.png'); txt = ''
        if c:
            txt = ocr(c[0], psm=7) + ' ' + ocr(c[0], psm=6)
            for p in c: os.remove(p)
        mu = U.search(txt.replace('\n',' '))
        nums = [int(x) for x in P.findall(txt)]
        bp = max([n for n in nums if 1 <= n <= 400], default=None)
        out[pg] = {'unit': int(mu.group(1)) if mu and 1 <= int(mu.group(1)) <= 30 else None,
                   'book_page': bp, 'raw': txt.replace('\n',' ').strip()[:60]}
        if pg % 25 == 0: print(f'  {name} {pg}/{total}', flush=True)
    json.dump(out, open(f'{ROOT}/scratch/footer_{name}.json','w'), ensure_ascii=False, indent=1)
    hu = sum(1 for v in out.values() if v['unit'])
    hp = sum(1 for v in out.values() if v['book_page'])
    print(f'== {name}: {total} 页, 读到单元号 {hu} 页 ({hu/total*100:.0f}%), 读到页码 {hp} 页', flush=True)

if __name__ == '__main__':
    T = f'{ROOT}/raw_books/raw_sources/textbooks'
    for name, fn, n in [('A2new', 'A2_Book.pdf', 152), ('A1new', 'A1_Book.pdf', 256)]:
        if name in (sys.argv[1:] or [name]): scan(name, f'{T}/{fn}', n)

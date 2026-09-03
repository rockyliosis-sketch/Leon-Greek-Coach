# -*- coding: utf-8 -*-
"""儿童版单元徽章: 只认数字(白名单), 不认希腊字.
徽章在单元首页左上角, 数字是大字. 页码已知 -> 排除页码后剩的 1..30 数字 = 单元号.
"""
import os, sys, re, json, glob, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from greek_ocr import ROOT
from eval_ocr import BOOKS
W = f'{ROOT}/scratch/ocr_work'

def ocr_digits(img, psm):
    r = subprocess.run(['tesseract', img, 'stdout', '--psm', str(psm),
                        '-c', 'tessedit_char_whitelist=0123456789'],
                       capture_output=True, text=True, errors='replace')
    return r.stdout

def scan_page(book, pg, dpi=400):
    fn, total, f = BOOKS[book]
    pdf = f'{ROOT}/raw_books/raw_sources/textbooks/{fn}'
    r = subprocess.run(['pdfinfo','-f',str(pg),'-l',str(pg),pdf], capture_output=True, text=True)
    m = re.search(r'Page\s+\d+\s+size:\s+([\d.]+)\s+x\s+([\d.]+)', r.stdout)
    PW, PH = int(float(m.group(1))/72*dpi), int(float(m.group(2))/72*dpi)
    stem = f'{W}/bd_{book}_{pg}'
    for x in glob.glob(stem+'-*'): os.remove(x)
    # 左页左上角: x 0~35%, y 15~48%
    subprocess.run(['pdftoppm','-f',str(pg),'-l',str(pg),'-r',str(dpi),
                    '-x','0','-y',str(int(PH*0.15)),'-W',str(int(PW*0.35)),
                    '-H',str(int(PH*0.33)),'-png',pdf,stem], capture_output=True)
    c = glob.glob(stem+'-*.png')
    if not c: return None, ''
    txt = ' '.join(ocr_digits(c[0], p) for p in (11, 6, 7))
    for x in c: os.remove(x)
    bp = f(pg)
    nums = [int(n) for n in re.findall(r'\d{1,2}', txt)]
    cand = [n for n in nums if 1 <= n <= 30 and n != bp and n != bp+1]
    return (max(set(cand), key=cand.count) if cand else None), txt.replace('\n',' ').strip()[:40]

if __name__ == '__main__':
    book = sys.argv[1]
    for pg in [int(x) for x in sys.argv[2:]]:
        u, raw = scan_page(book, pg)
        print(f'PDF{pg:>3} 书页{BOOKS[book][2](pg):>3}: 单元={u}  « {raw}')

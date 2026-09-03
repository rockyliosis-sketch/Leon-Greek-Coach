# -*- coding: utf-8 -*-
"""页脚单元号提取(靠数字, 不靠希腊字).
页脚格式: 'Ενότητα <单元号>  <页码>'. 页码已知(=PDF页+offset),
剔掉页码后剩下的小数字就是单元号 —— 数字OCR远比希腊艺术字可靠.
"""
import os, sys, re, json, glob, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from greek_ocr import ocr
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W = f'{ROOT}/scratch/ocr_work'

def scan(name, pdf, total, offset=-1, max_unit=12, dpi=600, band=(0.92, 1.0)):
    r = subprocess.run(['pdfinfo','-f','1','-l','1',pdf], capture_output=True, text=True)
    m = re.search(r'size:\s+([\d.]+)\s+x\s+([\d.]+)', r.stdout)
    PW, PH = int(float(m.group(1))/72*dpi), int(float(m.group(2))/72*dpi)
    y, h = int(PH*band[0]), int(PH*(band[1]-band[0]))
    out = {}
    for pg in range(1, total+1):
        stem = f'{W}/f2_{name}_{pg}'
        for f in glob.glob(stem+'-*'): os.remove(f)
        subprocess.run(['pdftoppm','-f',str(pg),'-l',str(pg),'-r',str(dpi),
                        '-x','0','-y',str(y),'-W',str(PW),'-H',str(h),'-png',pdf,stem],
                       capture_output=True)
        c = glob.glob(stem+'-*.png'); txt = ''
        if c:
            txt = ' '.join(ocr(c[0], psm=p) for p in (6, 7, 11)).replace('\n', ' ')
            for f in c: os.remove(f)
        bp = pg + offset
        nums = [int(x) for x in re.findall(r'\d{1,3}', txt)]
        # 剔掉页码(容许±1的相邻页码), 剩下 1..max_unit 的最常见数字 = 单元号
        cand = [n for n in nums if abs(n - bp) > 1 and 1 <= n <= max_unit]
        unit = max(set(cand), key=cand.count) if cand else None
        out[pg] = {'book_page': bp, 'unit': unit, 'raw': txt.strip()[:50]}
        if pg % 40 == 0: print(f'  {name} {pg}/{total}', flush=True)
    json.dump(out, open(f'{ROOT}/scratch/footer2_{name}.json','w'), ensure_ascii=False, indent=1)
    hit = sum(1 for v in out.values() if v['unit'])
    print(f'== {name}: {total} 页, 读到单元号 {hit} 页 ({hit/total*100:.0f}%)', flush=True)

if __name__ == '__main__':
    T = f'{ROOT}/raw_books/raw_sources/textbooks'
    for nm, fn, n, mu in [('A2new','A2_Book.pdf',152,6), ('A1new','A1_Book.pdf',256,12)]:
        if nm in (sys.argv[1:] or [nm]): scan(nm, f'{T}/{fn}', n, max_unit=mu)

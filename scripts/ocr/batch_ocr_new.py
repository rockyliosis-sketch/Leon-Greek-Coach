# -*- coding: utf-8 -*-
"""印刷版扫描件全量 OCR (单页, 正序). 可断点续跑."""
import sys, os, glob, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from greek_ocr import render, ocr, ROOT
BOOKS = {'A2new': ('A2_Book.pdf', 152), 'A1new': ('A1_Book.pdf', 256)}
for book in (sys.argv[1:] or list(BOOKS)):
    fn, total = BOOKS[book]
    pdf = f'{ROOT}/raw_books/raw_sources/textbooks/{fn}'
    d = f'{ROOT}/scratch/ocr_text/{book}'; os.makedirs(d, exist_ok=True)
    for pg in range(1, total+1):
        dst = f'{d}/p{pg:03d}.txt'
        if os.path.exists(dst) and os.path.getsize(dst) > 0: continue
        stem = f'{ROOT}/scratch/ocr_work/n{book}_p{pg}'
        try: txt = ocr(render(pdf, pg, dpi=350, out=stem))
        except Exception: txt = ''
        open(dst,'w').write(f'# book={book} pdf_page={pg}\n' + txt)
        for x in glob.glob(stem+'-*'): os.remove(x)
        if pg % 25 == 0: print(f'  {book} {pg}/{total}', flush=True)
    print(f'== {book} 完成', flush=True)

# -*- coding: utf-8 -*-
"""第二遍 OCR: psm 11 稀疏文本模式, 专门找页面上孤立的艺术字(单元徽章)"""
import sys, os, glob, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from greek_ocr import render, ocr, ROOT
from eval_ocr import BOOKS
OUT = f'{ROOT}/scratch/ocr_text_psm11'
for book in (sys.argv[1:] or ['A1-A','A1-B']):
    fn, total, f = BOOKS[book]
    pdf = f'{ROOT}/raw_books/raw_sources/textbooks/{fn}'
    d = f'{OUT}/{book}'; os.makedirs(d, exist_ok=True)
    for pg in range(1, total+1):
        dst = f'{d}/p{pg:03d}.txt'
        if os.path.exists(dst) and os.path.getsize(dst) > 0: continue
        stem = f'{ROOT}/scratch/ocr_work/x{book}_p{pg}'
        try: txt = ocr(render(pdf, pg, dpi=400, out=stem), psm=11)
        except Exception as e: txt = ''
        open(dst,'w').write(f'# book={book} pdf_page={pg} book_page={f(pg)}\n' + txt)
        for x in glob.glob(stem + '-*'): os.remove(x)
    print(f'{book} 完成', flush=True)

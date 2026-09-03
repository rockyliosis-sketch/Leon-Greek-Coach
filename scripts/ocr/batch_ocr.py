# -*- coding: utf-8 -*-
"""全量 OCR: 把三本书每一跨页识别成文本落盘, 可断点续跑.
用法: python3 scripts/ocr/batch_ocr.py [A1-A|A1-B|A2|all]
输出: scratch/ocr_text/<book>/p<NNN>.txt   (已存在则跳过)
"""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from greek_ocr import render, ocr, ROOT
from eval_ocr import BOOKS

OUT = f'{ROOT}/scratch/ocr_text'

def run(book):
    fn, total, f = BOOKS[book]
    pdf = f'{ROOT}/raw_books/raw_sources/textbooks/{fn}'
    d = f'{OUT}/{book}'; os.makedirs(d, exist_ok=True)
    done = skip = 0
    for pg in range(1, total + 1):
        dst = f'{d}/p{pg:03d}.txt'
        if os.path.exists(dst) and os.path.getsize(dst) > 0:
            skip += 1; continue
        t0 = time.time()
        stem = f'{ROOT}/scratch/ocr_work/{book}_p{pg}'
        try:
            txt = ocr(render(pdf, pg, out=stem))
        except Exception as e:
            txt = ''
            print(f'  !! {book} p{pg} 失败: {e}', flush=True)
        with open(dst, 'w') as fh:
            fh.write(f'# book={book} pdf_page={pg} book_page={f(pg)}\n')
            fh.write(txt)
        done += 1
        print(f'  {book} p{pg:>3}/{total} (原书 {f(pg):>3} 页) {len(txt):>5}字 {time.time()-t0:.1f}s', flush=True)
        # 渲染出的大图用完即删, 避免占几个 G
        import glob
        for ext in glob.glob(stem + '-*.png'): os.remove(ext)
    print(f'== {book} 完成: 新识别 {done} 页, 跳过已有 {skip} 页', flush=True)

if __name__ == '__main__':
    arg = sys.argv[1] if len(sys.argv) > 1 else 'all'
    for b in (list(BOOKS) if arg == 'all' else [arg]):
        run(b)

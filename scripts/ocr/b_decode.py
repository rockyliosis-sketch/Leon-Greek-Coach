# -*- coding: utf-8 -*-
"""从 B 本 PDF 重新生成解码全文.

之前这一步是手工跑的、脚本躺在 scratch/ 里(未入库), 意味着全文一旦丢失就重建不出来。
现在固化成脚本: pdftotext 抽文字层 -> 逐页判断是否老式编码 -> 映射回真希腊字母。

输出: materials/textbooks/derivation/B_pdf_decoded.txt  (按 \\f 分页, 与 PDF 页一一对应)
"""
import os, sys, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from decode import dec, fix_mixed

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PDF  = f'{ROOT}/raw_books/raw_sources/textbooks/Ελληνικά Β.pdf'
OUT  = f'{ROOT}/materials/textbooks/derivation/B_pdf_decoded.txt'

raw = subprocess.run(['pdftotext', PDF, '-'], capture_output=True, text=True).stdout
pages = raw.split('\f')
out = fix_mixed('\f'.join(dec(p) for p in pages))
open(OUT, 'w').write(out)

n_legacy = sum(1 for p in pages if p != dec(p))
print(f'PDF页 {len(pages)}, 其中老式编码页 {n_legacy}, 已解码写入 {OUT}')

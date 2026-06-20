#!/usr/bin/env python3
"""
Convert PDF pages to PNG images for AI-powered transcription.
Saves each page as a numbered PNG in the output directory.
For reversed PDFs (A1-A, A1-B, A2), pages are exported in reverse order
so they appear in the correct reading sequence.
"""
import os
import sys
import fitz  # PyMuPDF

PDF_DIR = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book"

FILES_TO_PROCESS = [
    {"filename": "Glossary_A1_kids.pdf", "reverse": False, "out_dir": "Glossary_pages"},
    {"filename": "（已压缩）LEON_S GREEK TEXTBOOK A1-A.pdf", "reverse": True, "out_dir": "A1-A_pages"},
    {"filename": "（已压缩）LEON_S GREEK TEXTBOOK A1-B.pdf", "reverse": True, "out_dir": "A1-B_pages"},
    {"filename": "（已压缩）LEON_S GREEK TEXTBOOK A2.pdf", "reverse": True, "out_dir": "A2_pages"},
]

DPI = 150  # Sufficient for text recognition, keeps file sizes manageable

for item in FILES_TO_PROCESS:
    pdf_path = os.path.join(PDF_DIR, item["filename"])
    out_dir = os.path.join(PDF_DIR, item["out_dir"])
    
    if not os.path.exists(pdf_path):
        print(f"Skipping: {pdf_path} not found.")
        continue
    
    os.makedirs(out_dir, exist_ok=True)
    
    doc = fitz.open(pdf_path)
    total = len(doc)
    print(f"\nProcessing {item['filename']} ({total} pages)...")
    
    pages = list(range(total - 1, -1, -1)) if item["reverse"] else list(range(total))
    
    for out_idx, page_num in enumerate(pages):
        page = doc.load_page(page_num)
        mat = fitz.Matrix(DPI / 72, DPI / 72)
        pix = page.get_pixmap(matrix=mat)
        out_path = os.path.join(out_dir, f"page_{out_idx + 1:03d}.png")
        pix.save(out_path)
        if (out_idx + 1) % 10 == 0 or (out_idx + 1) == total:
            print(f"  Exported {out_idx + 1}/{total} pages...")
    
    doc.close()
    print(f"  Done. Images saved to: {out_dir}")

print("\nAll PDFs converted to images successfully.")

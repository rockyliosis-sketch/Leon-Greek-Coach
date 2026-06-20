import os
import subprocess
import fitz  # PyMuPDF

PROJECT_DIR = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach"
GREEK_BOOK_DIR = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book"
MATERIALS_DIR = os.path.join(PROJECT_DIR, "materials")
TESSDATA_DIR = os.path.join(MATERIALS_DIR, "tessdata")
TEMP_DIR = os.path.join(PROJECT_DIR, "backend", "temp_ocr")

# Verify directories
os.makedirs(TEMP_DIR, exist_ok=True)

def run_ocr_on_page(doc, page_idx, doc_name):
    # Render page to PNG
    page = doc[page_idx]
    pix = page.get_pixmap(dpi=150)
    img_path = os.path.join(TEMP_DIR, f"{doc_name}_page_{page_idx}.png")
    pix.save(img_path)
    
    # Run Tesseract
    out_base = os.path.join(TEMP_DIR, f"{doc_name}_page_{page_idx}_out")
    cmd = [
        "tesseract",
        img_path,
        out_base,
        "-l", "ell+eng",
        "--tessdata-dir", TESSDATA_DIR
    ]
    
    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        txt_path = out_base + ".txt"
        if os.path.exists(txt_path):
            with open(txt_path, "r", encoding="utf-8") as f:
                text = f.read()
            # Clean up temp files
            os.remove(img_path)
            os.remove(txt_path)
            return text.strip()
    except Exception as e:
        print(f"Error during OCR of page {page_idx}: {e}")
        # Clean up if img exists
        if os.path.exists(img_path):
            os.remove(img_path)
            
    return ""

def convert_book(filename, reverse_pages=True):
    pdf_path = os.path.join(GREEK_BOOK_DIR, filename)
    if not os.path.exists(pdf_path):
        print(f"PDF not found: {pdf_path}")
        return
        
    doc_name = os.path.splitext(filename)[0].replace(" ", "_")
    md_filename = doc_name + ".md"
    md_path = os.path.join(MATERIALS_DIR, md_filename)
    
    print(f"\n=========================================")
    print(f"Converting {filename} -> {md_filename}")
    print(f"=========================================")
    
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    print(f"Total Pages: {total_pages}, Reverse order: {reverse_pages}")
    
    # Determine page traversal order
    page_indices = list(range(total_pages))
    if reverse_pages:
        page_indices.reverse()
        
    with open(md_path, "w", encoding="utf-8") as md_file:
        md_file.write(f"# {filename.replace('（已压缩）', '').replace('.pdf', '')}\n\n")
        md_file.write(f"*Note: This document was auto-generated via Tesseract OCR from {filename}.*\n\n---\n\n")
        
        for counter, page_idx in enumerate(page_indices):
            print(f"Processing page {counter+1}/{total_pages} (Physical page {page_idx+1})...")
            
            # Map physical page to printed page number if possible
            printed_page_info = ""
            if "A1-A" in filename or "A1_A" in filename:
                # physical page p -> book page 2*(91-p)+10 and +11
                p_num = 91 - page_idx
                printed_page_info = f"Book Page {2*(p_num-1)+10}-{2*(p_num-1)+11}"
            elif "A1-B" in filename or "A1_B" in filename:
                p_num = 85 - page_idx
                printed_page_info = f"Book Page {2*(p_num-1)+6}-{2*(p_num-1)+7}"
            elif "A2" in filename:
                p_num = 67 - page_idx
                printed_page_info = f"Book Page {2*(p_num-1)+4}-{2*(p_num-1)+5}"
            else:
                printed_page_info = f"Page {counter+1}"
                
            md_file.write(f"## {printed_page_info} (Physical PDF Page {page_idx+1})\n\n")
            
            text = run_ocr_on_page(doc, page_idx, doc_name)
            md_file.write(text + "\n\n")
            md_file.write("---\n\n")
            
    print(f"Finished writing to {md_path}")

def main():
    # Convert A1-A
    convert_book("（已压缩）LEON_S GREEK TEXTBOOK A1-A.pdf", reverse_pages=True)
    
    # Convert A1-B
    convert_book("（已压缩）LEON_S GREEK TEXTBOOK A1-B.pdf", reverse_pages=True)
    
    # Convert A2
    convert_book("（已压缩）LEON_S GREEK TEXTBOOK A2.pdf", reverse_pages=True)
    
    # Convert Glossary (Normal order)
    convert_book("Glossary_A1_kids.pdf", reverse_pages=False)

if __name__ == "__main__":
    main()

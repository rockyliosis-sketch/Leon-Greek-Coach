import os
import fitz  # PyMuPDF

GREEK_BOOK_DIR = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book"

def convert_pdf_folder(folder_name):
    folder_path = os.path.join(GREEK_BOOK_DIR, folder_name)
    if not os.path.exists(folder_path):
        print(f"Folder not found: {folder_path}")
        return

    print(f"\n=========================================")
    print(f"Converting PDFs in {folder_name} to Markdown...")
    print(f"=========================================")

    files = [f for f in os.listdir(folder_path) if f.endswith(".pdf")]
    for filename in files:
        pdf_path = os.path.join(folder_path, filename)
        doc_name = os.path.splitext(filename)[0]
        md_path = os.path.join(folder_path, doc_name + ".md")

        print(f"Converting {filename} -> {doc_name}.md")
        doc = fitz.open(pdf_path)
        
        with open(md_path, "w", encoding="utf-8") as md_file:
            md_file.write(f"# {doc_name.replace('_', ' ')}\n\n")
            md_file.write(f"*Note: This document was auto-extracted from {filename}.*\n\n---\n\n")
            
            for page_idx in range(len(doc)):
                page_text = doc[page_idx].get_text()
                md_file.write(f"## Page {page_idx + 1}\n\n")
                md_file.write(page_text + "\n\n")
                md_file.write("---\n\n")
                
        print(f"Saved: {md_path}")

def main():
    convert_pdf_folder("A1考试题目")
    convert_pdf_folder("A2考试题目")

if __name__ == "__main__":
    main()

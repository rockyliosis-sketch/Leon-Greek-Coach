import urllib.request
import urllib.parse
import os
import fitz  # PyMuPDF

# Directories
pdf_dir = "scratch/downloaded_pdfs"
txt_dir = "scratch/extracted_txt"
os.makedirs(pdf_dir, exist_ok=True)
os.makedirs(txt_dir, exist_ok=True)

headers = {'User-Agent': 'Mozilla/5.0'}

def clean_url(url):
    parts = list(urllib.parse.urlparse(url))
    parts[2] = urllib.parse.quote(parts[2])
    return urllib.parse.urlunparse(parts)

# 1. A1 Set 1: Units 1 to 15
a1_set1_urls = []
for i in range(1, 16):
    a1_set1_urls.append((f"a1_a_unit{i}", f"https://www.greek-language.gr/certification/ΚΛΙΚ/A1k1yl/Enotita{i}.pdf"))

# 2. A1 Set 2: Units 16 to 30
a1_set2_urls = []
for i in range(16, 31):
    a1_set2_urls.append((f"a1_b_unit{i}", f"https://www.greek-language.gr/certification/ΚΛΙΚ/A1k2yl/Enotita{i}.pdf"))

# 3. A2 Set: Units 1 to 6
a2_urls = []
for i in range(1, 7):
    a2_urls.append((f"a2_unit{30+i}", f"https://www.greek-language.gr/certification/ΚΛΙΚ/A2kgl/Ενότητα {i}.pdf"))

all_downloads = a1_set1_urls + a1_set2_urls + a2_urls

print(f"Total PDFs to download: {len(all_downloads)}")

for name, url in all_downloads:
    pdf_path = os.path.join(pdf_dir, f"{name}.pdf")
    txt_path = os.path.join(txt_dir, f"{name}.txt")
    
    # Skip if already extracted
    if os.path.exists(txt_path):
        print(f"Skipping {name}, already done.")
        continue
        
    print(f"Downloading {name}...")
    cleaned = clean_url(url)
    req = urllib.request.Request(cleaned, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            with open(pdf_path, "wb") as f:
                f.write(res.read())
        print(f"  Saved to {pdf_path}")
        
        # Extract text
        doc = fitz.open(pdf_path)
        text = ""
        for page_idx, page in enumerate(doc):
            text += f"\n--- Page {page_idx+1} ---\n" + page.get_text()
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"  Extracted text to {txt_path} ({len(text)} chars)")
    except Exception as e:
        print(f"  Error downloading/extracting {name}: {e}")

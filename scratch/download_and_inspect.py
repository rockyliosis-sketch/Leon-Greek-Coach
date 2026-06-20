import urllib.request
import fitz  # PyMuPDF
import os

import urllib.parse

def clean_url(url):
    parts = list(urllib.parse.urlparse(url))
    parts[2] = urllib.parse.quote(parts[2])
    return urllib.parse.urlunparse(parts)

pdf_urls = [
    ("a1_enotita1", clean_url("https://www.greek-language.gr/certification/ΚΛΙΚ/A1k1yl/Enotita1.pdf")),
    ("a2_enotita1", clean_url("https://www.greek-language.gr/certification/ΚΛΙΚ/A2kgl/Ενότητα 1.pdf"))
]

headers = {'User-Agent': 'Mozilla/5.0'}

os.makedirs("scratch/temp_pdfs", exist_ok=True)

for name, url in pdf_urls:
    print(f"Downloading {name} from {url}...")
    req = urllib.request.Request(url, headers=headers)
    try:
        pdf_path = f"scratch/temp_pdfs/{name}.pdf"
        with urllib.request.urlopen(req) as res:
            with open(pdf_path, "wb") as f:
                f.write(res.read())
        print(f"Downloaded to {pdf_path}")
        
        # Read first page text
        doc = fitz.open(pdf_path)
        print(f"Pages: {len(doc)}")
        text = ""
        for i in range(min(3, len(doc))):
            text += f"\n--- Page {i+1} ---\n" + doc[i].get_text()
        
        txt_path = f"scratch/temp_pdfs/{name}.txt"
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Saved text excerpt to {txt_path}")
        print(f"First 200 chars: {text[:200]}")
    except Exception as e:
        print(f"Error {name}: {e}")

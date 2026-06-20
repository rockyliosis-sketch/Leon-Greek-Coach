import urllib.request
import re
import os
import json

urls = {
    "a1k1yl": "https://www.greek-language.gr/certification/node/a1k1yl.html",
    "a1k2yl": "https://www.greek-language.gr/certification/node/a1k2yl.html",
    "a2kgl": "https://www.greek-language.gr/certification/node/a2kgl.html"
}

headers = {'User-Agent': 'Mozilla/5.0'}

for name, url in urls.items():
    print(f"Crawling {name}: {url}")
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            html = res.read().decode('utf-8')
            print(f"Length of {name} HTML: {len(html)}")
            # Find all PDF links
            pdf_links = re.findall(r'href=["\']([^"\']+\.pdf)["\']', html)
            print(f"Found {len(pdf_links)} pdf links:")
            for p in pdf_links[:10]:
                print(f"  - {p}")
            
            # Write raw html to temporary files for examination
            temp_path = f"/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach/backend/temp_{name}.html"
            with open(temp_path, "w", encoding="utf-8") as f:
                f.write(html)
            print(f"Saved html to {temp_path}")
    except Exception as e:
        print(f"Error crawling {name}: {e}")

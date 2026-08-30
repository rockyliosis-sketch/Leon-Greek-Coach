import os
import re
import json
import fitz  # PyMuPDF

A1_JSON_PATH = "parsed_a1.json"
A2_JSON_PATH = "parsed_a2.json"
CACHE_PATH = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach/backend/translation_cache.json"

A1_PDF_OUT = "Glossary_A1_kids_CN.pdf"
A2_PDF_OUT = "KLIK_A2_Ef_Glossary_CN.pdf"

GREEK_LETTERS = {
    'Α': 'άλφα / Alpha',
    'Β': 'βήτα / Beta',
    'Γ': 'γάμα / Gamma',
    'Δ': 'δέλτα / Delta',
    'Ε': 'έψιλον / Epsilon',
    'Ζ': 'ζήτα / Zeta',
    'Η': 'ήτα / Eta',
    'Θ': 'θήτα / Theta',
    'Ι': 'ιώτα / Iota',
    'Κ': 'κάπα / Kappa',
    'Λ': 'λάμδα / Lambda',
    'Μ': 'μι / Mu',
    'Ν': 'νι / Nu',
    'Ξ': 'ξι / Xi',
    'Ο': 'όμικρον / Omicron',
    'Π': 'πι / Pi',
    'Ρ': 'ρω / Rho',
    'Σ': 'σίγμα / Sigma',
    'Τ': 'ταυ / Tau',
    'Υ': 'ύψιλον / Upsilon',
    'Φ': 'φι / Phi',
    'Χ': 'χι / Chi',
    'Ψ': 'ψι / Psi',
    'Ω': 'ωμέγα / Omega'
}

def normalize_greek_char(char):
    char = char.upper()
    mapping = {
        'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ό': 'Ο', 'Ύ': 'Υ', 'Ώ': 'Ω',
        'Ϊ': 'Ι', 'Ϋ': 'Υ'
    }
    return mapping.get(char, char)

def get_base_greek_letter(word):
    word_clean = word.strip().lstrip("«\"'“")
    if not word_clean:
        return "Others"
    char = word_clean[0].upper()
    norm_char = normalize_greek_char(char)
    if norm_char in GREEK_LETTERS:
        return norm_char
    return "Others"

def process_a1_entry(item, cache):
    greek = item["greek"]
    details = item["details"]
    english = item["english"]
    chinese = cache.get(english, english)
    
    tag = "other"
    tag_label = ""
    greek_display = greek
    
    if details == "το":
        tag = "neuter"
        tag_label = "中"
        greek_display = f"{greek}, {details}"
    elif details == "ο":
        tag = "masc"
        tag_label = "阳"
        greek_display = f"{greek}, {details}"
    elif details == "η":
        tag = "fem"
        tag_label = "阴"
        greek_display = f"{greek}, {details}"
    elif details in ["οι", "τα"]:
        tag = "other"
        tag_label = "复"
        greek_display = f"{greek}, {details}"
    elif details.startswith("-") and ("ώ" in details or "ω" in details):
        tag = "verb"
        tag_label = "动"
        greek_display = f"{greek} ({details})"
    elif details.startswith("-") and ("," in details):
        tag = "adj"
        tag_label = "形"
        greek_display = f"{greek}, {details}"
    elif english.lower().startswith("to ") or english.lower().startswith("to:"):
        tag = "verb"
        tag_label = "动"
        greek_display = greek + (f" ({details})" if details else "")
    else:
        tag = "other"
        tag_label = ""
        greek_display = greek + (f", {details}" if details else "")
        
    return {
        "greek_raw": greek,
        "greek": greek_display,
        "english": english,
        "chinese": chinese,
        "tag": tag,
        "tag_label": tag_label,
        "indent": item.get("indent", False)
    }

def process_a2_entry(item, cache):
    greek = item["greek"]
    details = item.get("details", "")
    english = item["english"]
    chinese = cache.get(english, english)
    
    tag = "other"
    tag_label = ""
    greek_clean = greek
    
    if ", το" in greek:
        tag = "neuter"
        tag_label = "中"
    elif ", ο" in greek:
        tag = "masc"
        tag_label = "阳"
    elif ", η" in greek:
        tag = "fem"
        tag_label = "阴"
    elif ", οι" in greek or ", τα" in greek:
        tag = "other"
        tag_label = "复"
    elif "(verb)" in greek:
        tag = "verb"
        tag_label = "动"
        greek_clean = greek.replace("(verb)", "").strip()
    elif "(noun)" in greek:
        tag = "other"
        tag_label = "名"
        greek_clean = greek.replace("(noun)", "").strip()
    elif "[noun]" in greek:
        tag = "other"
        tag_label = "名"
        greek_clean = greek.replace("[noun]", "").strip()
    elif "(adverb)" in greek or "[adv]" in greek or "[adverb]" in greek:
        tag = "adv"
        tag_label = "副"
        greek_clean = greek.replace("(adverb)", "").replace("[adv]", "").replace("[adverb]", "").strip()
    elif "(adjective)" in greek or "[adj]" in greek:
        tag = "adj"
        tag_label = "形"
        greek_clean = greek.replace("(adjective)", "").replace("[adj]", "").strip()
    elif "(conjunction)" in greek or "[conj]" in greek:
        tag = "other"
        tag_label = "连"
        greek_clean = greek.replace("(conjunction)", "").replace("[conj]", "").strip()
    elif "(preposition)" in greek or "[prep]" in greek:
        tag = "other"
        tag_label = "介"
        greek_clean = greek.replace("(preposition)", "").replace("[prep]", "").strip()
    elif english.lower().startswith("to ") or english.lower().startswith("to:"):
        tag = "verb"
        tag_label = "动"
    elif details and ("adj" in details or "adj" in english):
        tag = "adj"
        tag_label = "形"
    elif details and ("adv" in details or "adv" in english):
        tag = "adv"
        tag_label = "副"
        
    if tag == "other":
        if "," in greek_clean:
            parts = [p.strip() for p in greek_clean.split(",")]
            if len(parts) >= 2 and parts[1].startswith("-"):
                tag = "adj"
                tag_label = "形"
                
    if details:
        details_clean = details.strip()
        if details_clean:
            if "adj" in details_clean:
                tag = "adj"
                tag_label = "形"
            elif "adv" in details_clean:
                tag = "adv"
                tag_label = "副"
            if details_clean not in greek_clean:
                greek_clean += f" {details_clean}"
                
    return {
        "greek_raw": greek,
        "greek": greek_clean,
        "english": english,
        "chinese": chinese,
        "tag": tag,
        "tag_label": tag_label,
        "indent": item.get("indent", False)
    }

def build_html_content(entries, title, subtitle, badge, is_a2=False):
    groups = {}
    for entry in entries:
        letter = get_base_greek_letter(entry["greek_raw"])
        if letter not in groups:
            groups[letter] = []
        groups[letter].append(entry)
        
    sorted_letters = sorted(groups.keys(), key=lambda l: list(GREEK_LETTERS.keys()).index(l) if l in GREEK_LETTERS else 999)
    
    html = []
    
    # 1. Cover Page
    bg_style = "background-color: #f0fdf4; border: 2px solid #b9f6ca;" if not is_a2 else "background-color: #f0f9ff; border: 2px solid #bae6fd;"
    badge_style = "background-color: #0284c7;" if not is_a2 else "background-color: #a21caf;"
    title_color = "color: #0369a1;" if not is_a2 else "color: #701a75;"
    
    html.append(f"""
<div style="{bg_style} padding: 90px 40px; text-align: center; border-radius: 10px; margin: 40px auto; max-width: 500px; box-sizing: border-box;">
  <div style="display: inline-block; font-size: 13pt; font-weight: bold; color: white; {badge_style} padding: 5px 16px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px;">
    {badge}
  </div>
  <h1 style="font-size: 26pt; font-weight: bold; {title_color} margin: 0 0 12px 0;">{title}</h1>
  <h2 style="font-size: 15pt; color: #475569; margin: 0 0 35px 0; font-weight: 600;">{subtitle}</h2>
  <div style="font-size: 11.5pt; color: #64748b; line-height: 1.8; margin-bottom: 50px;">
    专门为 10 岁的 Leon 精心制作的希腊语词汇表<br>
    希腊语原文词汇 • 拼写重音标注 • 专业级少儿友好中文释义 • 英文对照<br>
    助你高效记忆，轻松攻克希腊语学习大关！
  </div>
  <div style="font-size: 9.5pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; font-weight: 500;">
    Leon's Greek Coach • 学习伴侣系列 • 2026年7月版
  </div>
</div>
<div style="page-break-after: always;"></div>
""")
    
    # 2. Vocabulary Entries
    for letter in sorted_letters:
        letter_name = GREEK_LETTERS.get(letter, "其他 / Others")
        html.append(f"""
<div class="letter-header">
  <span>{letter} {letter.lower()}</span>
  <span style="float: right; font-size: 8.5pt; font-weight: 500; color: #64748b; padding-top: 3px;">{letter_name}</span>
</div>
""")
        for entry in groups[letter]:
            indent_class = " indented" if entry["indent"] else ""
            tag_html = ""
            if entry["tag_label"]:
                tag_html = f' <span class="tag tag-{entry["tag"]}">{entry["tag_label"]}</span>'
                
            html.append(f"""
<div class="word-row{indent_class}">
  <span class="word-greek">{entry["greek"]}</span>{tag_html}
  <span class="word-separator"> — </span>
  <span class="word-chinese">{entry["chinese"]}</span>
  <span class="word-english">({entry["english"]})</span>
</div>
""")
            
    return "".join(html)

def get_css_styling():
    return """
.letter-header {
  font-size: 11pt;
  font-weight: bold;
  color: #0284c7;
  border-bottom: 1.5px solid #0284c7;
  padding-bottom: 2px;
  margin-top: 10px;
  margin-bottom: 4px;
}
.word-row {
  font-size: 9.2pt;
  line-height: 1.3;
  margin-bottom: 2px;
  padding: 1px 0;
  border-bottom: 1px dashed #f1f5f9;
  word-wrap: break-word;
  break-inside: avoid;
}
.word-row.indented {
  padding-left: 8px;
  border-left: 2px solid #cbd5e1;
}
.word-greek {
  font-family: Georgia, serif;
  font-weight: bold;
  font-size: 9.5pt;
  color: #1e293b;
}
.word-separator {
  color: #94a3b8;
  font-weight: bold;
}
.word-chinese {
  font-weight: bold;
  color: #0f172a;
}
.word-english {
  color: #64748b;
  font-size: 8pt;
}

/* Pill Tags */
.tag {
  display: inline;
  font-size: 6.5pt;
  font-weight: bold;
  padding: 1px 3px;
  border-radius: 2px;
  margin-left: 3px;
  vertical-align: middle;
  line-height: 1.1;
}
.tag-neuter { background-color: #e0f2fe; color: #0369a1; }
.tag-masc { background-color: #dcfce7; color: #15803d; }
.tag-fem { background-color: #fee2e2; color: #b91c1c; }
.tag-verb { background-color: #faf5ff; color: #6b21a8; }
.tag-adj { background-color: #fef9c3; color: #854d0e; }
.tag-adv { background-color: #fff7ed; color: #c2410c; }
.tag-other { background-color: #f1f5f9; color: #475569; }
"""

def make_rectfn(has_cover=True):
    def rectfn(rect_num, filled):
        if has_cover and rect_num == 0:
            # Cover page: full page
            return fitz.Rect(0, 0, 595, 842), fitz.Rect(42.5, 42.5, 552.5, 799.5), fitz.Matrix(1, 1)
            
        col_idx = (rect_num - 1) if has_cover else rect_num
        col_on_page = col_idx % 2
        
        # Create a new page only for the left column (col_on_page == 0)
        mediabox = fitz.Rect(0, 0, 595, 842) if col_on_page == 0 else None
        
        left_margin = 30.0
        right_margin = 30.0
        top_margin = 35.0     # leave space for running header
        bottom_margin = 35.0  # leave space for running footer
        
        content_width = 595.0 - left_margin - right_margin
        column_gap = 18.0
        column_width = (content_width - column_gap) / 2.0
        
        y0 = top_margin
        y1 = 842.0 - bottom_margin
        
        if col_on_page == 0:
            x0 = left_margin
            x1 = left_margin + column_width
        else:
            x0 = left_margin + column_width + column_gap
            x1 = 595.0 - right_margin
            
        rect = fitz.Rect(x0, y0, x1, y1)
        ctm = fitz.Matrix(1, 1)
        return mediabox, rect, ctm
    return rectfn

def add_headers_footers(pdf_path, is_a2=False, title_name=""):
    print(f"Adding headers and footers to {pdf_path}...")
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    
    header_color = (0.01, 0.52, 0.78) if not is_a2 else (0.64, 0.11, 0.69)
    line_color = (0.85, 0.85, 0.85)
    text_color = (0.35, 0.35, 0.35)
    
    # Page 0 is cover, so start from page 1
    for idx in range(1, total_pages):
        page = doc[idx]
        
        header_text = f"Leon's Greek-Chinese Glossary: {title_name}"
        footer_text = "Leon's Greek Coach • 学习伴侣"
        page_num_text = f"Page {idx} of {total_pages - 1}"
        
        # 1. Header
        page.insert_text(fitz.Point(30.0, 21), header_text, fontsize=8.0, color=text_color, fontname="helv")
        # Header line
        page.draw_line(fitz.Point(30.0, 26), fitz.Point(565.0, 26), color=line_color, width=0.5)
        
        # 2. Footer
        # Footer line
        page.draw_line(fitz.Point(30.0, 815), fitz.Point(565.0, 815), color=line_color, width=0.5)
        # Footer text
        page.insert_text(fitz.Point(30.0, 826), footer_text, fontsize=8.0, color=text_color, fontname="china-s")
        # Page number on right
        page.insert_text(fitz.Point(515, 826), page_num_text, fontsize=8.0, color=text_color, fontname="helv")
        
    # Save to a temporary path, then replace the original file to avoid locking issues
    temp_path = pdf_path + ".tmp"
    doc.save(temp_path, deflate=True)
    doc.close()
    
    os.replace(temp_path, pdf_path)
    print(f"Successfully finalized PDF with {total_pages} pages: {pdf_path}")

def generate_pdf(entries, title, subtitle, badge, output_path, is_a2=False):
    print(f"Generating PDF structure for {output_path}...")
    html = build_html_content(entries, title, subtitle, badge, is_a2)
    css = get_css_styling()
    
    # Create story
    story = fitz.Story(html, css)
    
    # Initialize DocumentWriter
    writer = fitz.DocumentWriter(output_path)
    
    # Flow story
    story.write(writer, make_rectfn(has_cover=True))
    writer.close()
    
    # Add headers & footers
    add_headers_footers(output_path, is_a2=is_a2, title_name=badge)

def main():
    # Load translation cache
    with open(CACHE_PATH, "r", encoding="utf-8") as f:
        cache = json.load(f)
        
    # Load parsed entries
    with open(A1_JSON_PATH, "r", encoding="utf-8") as f:
        a1_raw = json.load(f)
    with open(A2_JSON_PATH, "r", encoding="utf-8") as f:
        a2_raw = json.load(f)
        
    # Process entries
    a1_processed = []
    for item in a1_raw:
        if item["type"] == "entry":
            a1_processed.append(process_a1_entry(item, cache))
            
    a2_processed = []
    for item in a2_raw:
        if item["type"] == "entry":
            a2_processed.append(process_a2_entry(item, cache))
            
    print(f"Processed {len(a1_processed)} A1 entries and {len(a2_processed)} A2 entries.")
    
    # Compile A1 PDF
    generate_pdf(
        entries=a1_processed,
        title="希腊语 - 中文双语词汇手册",
        subtitle="A1 儿童版词汇手册 (6-12岁)",
        badge="Level A1 - Kids",
        output_path=A1_PDF_OUT,
        is_a2=False
    )
    
    # Compile A2 PDF
    generate_pdf(
        entries=a2_processed,
        title="希腊语 - 中文双语词汇手册",
        subtitle="A2 青少年版词汇手册",
        badge="Level A2 - Ef",
        output_path=A2_PDF_OUT,
        is_a2=True
    )

if __name__ == "__main__":
    main()

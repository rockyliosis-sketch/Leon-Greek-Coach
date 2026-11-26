#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build frontend textbook assets for Leon Greek Coach:
  1. Cover thumbnails -> frontend/public/images/textbook_covers/<code>.jpg
  2. Per-book page JSONs (keyed by printed Book Page!) -> frontend/public/textbooks/<code>.json
  3. Master catalog + Textbook<->Workbook links + Grade 3 Glossa Unit Challenge catalog
     -> frontend/src/data/school_textbooks_catalog.json
"""

import glob
import json
import os
import re
import fitz  # PyMuPDF

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEXTBOOKS_MD_DIR = os.path.join(ROOT, "materials", "textbooks")
RAW_TEXTBOOKS_DIR = os.path.join(ROOT, "raw_books", "raw_sources", "textbooks")
COVERS_OUT_DIR = os.path.join(ROOT, "frontend", "public", "images", "textbook_covers")
PAGES_OUT_DIR = os.path.join(ROOT, "frontend", "public", "textbooks")
CATALOG_OUT_PATH = os.path.join(ROOT, "frontend", "src", "data", "school_textbooks_catalog.json")

os.makedirs(COVERS_OUT_DIR, exist_ok=True)
os.makedirs(PAGES_OUT_DIR, exist_ok=True)


def render_cover(pdf_path: str, out_jpg: str, target_width: int = 420):
    doc = fitz.open(pdf_path)
    page = doc[0]
    scale = target_width / max(1.0, page.rect.width)
    mat = fitz.Matrix(scale, scale)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    pix.save(out_jpg, jpg_quality=84)
    doc.close()


def parse_dual_md_pages(md_path: str) -> dict:
    """Parse ## 书本第 X 页（PDF 第 Y 页） into { str(book_page): text }."""
    txt = open(md_path, encoding="utf-8").read()
    parts = re.split(r"^## (?:书本第 (\d+) 页（PDF 第 \d+ 页）|PDF 第 (\d+) 页.*)$", txt, flags=re.M)
    pages = {}
    # re.split with 2 capture groups produces chunks of 3: [pre, g1, g2, body, g1, g2, body...]
    for i in range(1, len(parts), 3):
        book_p = parts[i]
        body = parts[i + 2].split("\n---\n")[0].strip()
        if book_p is not None:
            pages[str(int(book_p))] = body
    return pages


def clean_and_reflow_tutor_page(body: str) -> str:
    """Clean OCR blank-line splits before (verb) hints and reflow mid-sentence hard wraps in Tutor B / A2."""
    # Strip Wingdings/PUA bullets in older Tutor MD into clean '• '
    body = re.sub(r"[\ue000-\uf8ff]+", "• ", body)
    body = body.replace("\xad", "")
    # 1. Rejoin fill-in-the-blank `(τρώω)` that jumped onto a new line right after a missing blank
    body = re.sub(
        r"([^\n.!;?:»])\n\s*\(([\u0370-\u03FF\u1F00-\u1FFFά-ώϊϋΐΰΆ-ΏΪΫ\s/,.-]{1,45})\)",
        r"\1 ______ (\2)",
        body,
    )
    # 2. Collapse long runs of dots/underscores
    body = re.sub(r"(?:[._…]\s*){6,}", " ______ ", body)

    raw_lines = [l.rstrip() for l in body.split("\n")]
    out = []
    cur = ""

    new_block_re = re.compile(
        r"^(?:#{1,4}\s|\*\*|\||>\s|[•◆▪\-—–]\s|\d{1,2}[.)\s]\s*[Α-ΩΆ-ΏA-Z]|[α-ωΑ-Ωa-zA-Z][.)]\s|[Α-ΩΆ-ΏA-Z][\wά-ώϊϋΐΰ.\s]{0,16}:\s)"
    )

    for ln in raw_lines:
        s = ln.strip()
        if not s:
            if cur:
                out.append(cur)
                cur = ""
            if out and out[-1] != "":
                out.append("")
            continue

        if s.startswith("#") or "|" in s:
            if cur:
                out.append(cur)
                cur = ""
            if out and out[-1] != "":
                out.append("")
            out.append(s)
            out.append("")
            continue

        if not cur:
            cur = s
            continue

        prev_done = bool(re.search(r"[.;!?:»”]$", cur))
        if new_block_re.match(s) or prev_done:
            out.append(cur)
            out.append("")
            cur = s
        else:
            if len(cur) >= 2 and cur[-1] in ("-", "‑") and s[:1].isalpha():
                cur = f"{cur[:-1]}{s}" if s[:1].islower() else f"{cur}{s}"
            else:
                cur = f"{cur} {s}"

    if cur:
        out.append(cur)

    cleaned = []
    for l in out:
        if l == "":
            if cleaned and cleaned[-1] != "":
                cleaned.append("")
        else:
            cleaned.append(re.sub(r"[ \t]{2,}", " ", l).strip())
    while cleaned and cleaned[-1] == "":
        cleaned.pop()
    return "\n".join(cleaned)


def parse_tutor_book_md_pages(md_path: str, pdf_to_book_offset: int = 1) -> dict:
    """Parse Tutor Book MD (## Page K) into printed book pages."""
    raw = open(md_path, encoding="utf-8", errors="replace").read()
    # Clean any stray control characters except \n and \t
    raw = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", raw)
    parts = re.split(r"^## Page (\d+)\s*$", raw, flags=re.M)
    pages = {}
    for i in range(1, len(parts), 2):
        pdf_p = int(parts[i])
        book_p = pdf_p - pdf_to_book_offset
        if book_p < 1:
            continue
        body = parts[i + 1].split("\n---\n")[0].strip()
        body = re.sub(r"^——\s*原书第\s*\d+\s*页\s*——\s*", "", body).strip()
        body = clean_and_reflow_tutor_page(body)
        pages[str(book_p)] = body
    return pages


BOOKS_DEF = [
    # --- 四年级 语言 (Γλώσσα Δ΄) ---
    {
        "id": "g4-glossa-a",
        "code": "10-0202-01",
        "pdf": "10-0202-01_V3_Glossa_D-Dimotikou_Vivlio-Mathiti_Teuchos-A.pdf",
        "md": "10-0202-01_V3_Glossa_D-Dimotikou_Vivlio-Mathiti_Teuchos-A.md",
        "subject": "希腊语 (Γλώσσα)",
        "grade": 4,
        "isWorkbook": False,
        "volume": "Α册",
        "shortTitle": "四年级语言 · 课本 Α册",
        "zhTitle": "希腊小学四年级语言课本（第1册 · Α΄ Τεύχος）",
        "origTitle": "Γλώσσα Δ΄ Δημοτικού · Βιβλίο Μαθητή (Α΄)",
    },
    {
        "id": "g4-glossa-b",
        "code": "10-0084-02",
        "pdf": "10-0084-02_V2_Glossa_D-Dimotikou_Vivlio-Mathiti_Teuchos-B.pdf",
        "md": "10-0084-02_V2_Glossa_D-Dimotikou_Vivlio-Mathiti_Teuchos-B.md",
        "subject": "希腊语 (Γλώσσα)",
        "grade": 4,
        "isWorkbook": False,
        "volume": "Β册",
        "shortTitle": "四年级语言 · 课本 Β册",
        "zhTitle": "希腊小学四年级语言课本（第2册 · Β΄ Τεύχος）",
        "origTitle": "Γλώσσα Δ΄ Δημοτικού · Βιβλίο Μαθητή (Β΄)",
    },
    {
        "id": "g4-glossa-g",
        "code": "10-0086-02",
        "pdf": "10-0086-02_V3_Glossa_D-Dimotikou_Vivlio-Mathiti_Teuchos-G.pdf",
        "md": "10-0086-02_V3_Glossa_D-Dimotikou_Vivlio-Mathiti_Teuchos-G.md",
        "subject": "希腊语 (Γλώσσα)",
        "grade": 4,
        "isWorkbook": False,
        "volume": "Γ册",
        "shortTitle": "四年级语言 · 课本 Γ册",
        "zhTitle": "希腊小学四年级语言课本（第3册 · Γ΄ Τεύχος）",
        "origTitle": "Γλώσσα Δ΄ Δημοτικού · Βιβλίο Μαθητή (Γ΄)",
    },
    {
        "id": "g4-glossa-wb-a",
        "code": "10-0083-02",
        "pdf": "10-0083-02_V2_Glossa_D-Dimotikou_Tetradio-Ergasion_Teuchos-A.pdf",
        "md": "10-0083-02_V2_Glossa_D-Dimotikou_Tetradio-Ergasion_Teuchos-A.md",
        "subject": "希腊语 (Γλώσσα)",
        "grade": 4,
        "isWorkbook": True,
        "volume": "练习册 Α册",
        "shortTitle": "四年级语言 · 练习册 Α册",
        "zhTitle": "希腊小学四年级语言练习册（第1册 · Α΄ Τεύχος）",
        "origTitle": "Γλώσσα Δ΄ Δημοτικού · Τετράδιο Εργασιών (Α΄)",
    },
    {
        "id": "g4-glossa-wb-b",
        "code": "10-0085-02",
        "pdf": "10-0085-02_V2_Glossa_D-Dimotikou_Tetradio-Ergasion_Teuchos-B.pdf",
        "md": "10-0085-02_V2_Glossa_D-Dimotikou_Tetradio-Ergasion_Teuchos-B.md",
        "subject": "希腊语 (Γλώσσα)",
        "grade": 4,
        "isWorkbook": True,
        "volume": "练习册 Β册",
        "shortTitle": "四年级语言 · 练习册 Β册",
        "zhTitle": "希腊小学四年级语言练习册（第2册 · Β΄ Τεύχος）",
        "origTitle": "Γλώσσα Δ΄ Δημοτικού · Τετράδιο Εργασιών (Β΄)",
    },
    # --- 三年级 语言 (Γλώσσα Γ΄) ---
    {
        "id": "g3-glossa-a",
        "code": "10-0048-02",
        "pdf": "10-0048-02_Glossa_G-Dimotikou_Vivlio-Mathiti_Teuchos-A.pdf",
        "md": "10-0048-02_Glossa_G-Dimotikou_Vivlio-Mathiti_Teuchos-A.md",
        "subject": "希腊语 (Γλώσσα)",
        "grade": 3,
        "isWorkbook": False,
        "volume": "三年级 Α册",
        "shortTitle": "三年级语言 · 课本 Α册",
        "zhTitle": "希腊小学三年级语言课本（第1册 · Α΄ Τεύχος）",
        "origTitle": "Γλώσσα Γ΄ Δημοτικού · Βιβλίο Μαθητή (Α΄)",
    },
    {
        "id": "g3-glossa-b",
        "code": "10-0050-02",
        "pdf": "10-0050-02_V2_Glossa_G-Dimotikou_Vivlio-Mathiti_Teuchos-B.pdf",
        "md": "10-0050-02_V2_Glossa_G-Dimotikou_Vivlio-Mathiti_Teuchos-B.md",
        "subject": "希腊语 (Γλώσσα)",
        "grade": 3,
        "isWorkbook": False,
        "volume": "三年级 Β册",
        "shortTitle": "三年级语言 · 课本 Β册",
        "zhTitle": "希腊小学三年级语言课本（第2册 · Β΄ Τεύχος）",
        "origTitle": "Γλώσσα Γ΄ Δημοτικού · Βιβλίο Μαθητή (Β΄)",
    },
    {
        "id": "g3-glossa-g",
        "code": "10-0052-02",
        "pdf": "10-0052-02_Glossa_G-Dimotikou_Vivlio-Mathiti_Teuchos-G.pdf",
        "md": "10-0052-02_Glossa_G-Dimotikou_Vivlio-Mathiti_Teuchos-G.md",
        "subject": "希腊语 (Γλώσσα)",
        "grade": 3,
        "isWorkbook": False,
        "volume": "三年级 Γ册",
        "shortTitle": "三年级语言 · 课本 Γ册",
        "zhTitle": "希腊小学三年级语言课本（第3册 · Γ΄ Τεύχος）",
        "origTitle": "Γλώσσα Γ΄ Δημοτικού · Βιβλίο Μαθητή (Γ΄)",
    },
    {
        "id": "g3-glossa-wb-a",
        "code": "10-0049-02",
        "pdf": "10-0049-02_Glossa_G-Dimotikou_Tetradio-Ergasion_Teuchos-A.pdf",
        "md": "10-0049-02_Glossa_G-Dimotikou_Tetradio-Ergasion_Teuchos-A.md",
        "subject": "希腊语 (Γλώσσα)",
        "grade": 3,
        "isWorkbook": True,
        "volume": "三年级练习册 Α册",
        "shortTitle": "三年级语言 · 练习册 Α册",
        "zhTitle": "希腊小学三年级语言练习册（第1册 · Α΄ Τεύχος）",
        "origTitle": "Γλώσσα Γ΄ Δημοτικού · Τετράδιο Εργασιών (Α΄)",
    },
    {
        "id": "g3-glossa-wb-b",
        "code": "10-0051-02",
        "pdf": "10-0051-02_Glossa_G-Dimotikou_Tetradio-Ergasion_Teuchos-B.pdf",
        "md": "10-0051-02_Glossa_G-Dimotikou_Tetradio-Ergasion_Teuchos-B.md",
        "subject": "希腊语 (Γλώσσα)",
        "grade": 3,
        "isWorkbook": True,
        "volume": "三年级练习册 Β册",
        "shortTitle": "三年级语言 · 练习册 Β册",
        "zhTitle": "希腊小学三年级语言练习册（第2册 · Β΄ Τεύχος）",
        "origTitle": "Γλώσσα Γ΄ Δημοτικού · Τετράδιο Εργασιών (Β΄)",
    },
    # --- 历史 (Ιστορία Δ΄ & Γ΄) ---
    {
        "id": "g4-istoria",
        "code": "10-0090-02",
        "pdf": "10-0090-02_Istoria_D-Dimotikou_Vivlio-Mathiti.pdf",
        "md": "10-0090-02_Istoria_D-Dimotikou_Vivlio-Mathiti.md",
        "subject": "历史 (Ιστορία)",
        "grade": 4,
        "isWorkbook": False,
        "volume": "四年级全册",
        "shortTitle": "四年级历史 · 课本",
        "zhTitle": "希腊小学四年级历史课本（Στα αρχαία χρόνια）",
        "origTitle": "Ιστορία Δ΄ Δημοτικού · Βιβλίο Μαθητή",
    },
    {
        "id": "g4-istoria-wb",
        "code": "10-0091-02",
        "pdf": "10-0091-02_Istoria_D-Dimotikou_Tetradio-Ergasion.pdf",
        "md": "10-0091-02_Istoria_D-Dimotikou_Tetradio-Ergasion.md",
        "subject": "历史 (Ιστορία)",
        "grade": 4,
        "isWorkbook": True,
        "volume": "四年级练习册",
        "shortTitle": "四年级历史 · 练习册",
        "zhTitle": "希腊小学四年级历史练习册（Στα αρχαία χρόνια）",
        "origTitle": "Ιστορία Δ΄ Δημοτικού · Τετράδιο Εργασιών",
    },
    {
        "id": "g3-istoria",
        "code": "10-0056-02",
        "pdf": "10-0056-02_V3_Istoria_G-Dimotikou_Vivlio-Mathiti.pdf",
        "md": "10-0056-02_V3_Istoria_G-Dimotikou_Vivlio-Mathiti.md",
        "subject": "历史 (Ιστορία)",
        "grade": 3,
        "isWorkbook": False,
        "volume": "三年级全册",
        "shortTitle": "三年级历史 · 课本",
        "zhTitle": "希腊小学三年级历史课本（Από τη Μυθολογία στην Ιστορία）",
        "origTitle": "Ιστορία Γ΄ Δημοτικού · Βιβλίο Μαθητή",
    },
    {
        "id": "g3-istoria-wb",
        "code": "10-0057-02",
        "pdf": "10-0057-02_V2_Istoria_G-Dimotikou_Tetradio-Ergasion.pdf",
        "md": "10-0057-02_V2_Istoria_G-Dimotikou_Tetradio-Ergasion.md",
        "subject": "历史 (Ιστορία)",
        "grade": 3,
        "isWorkbook": True,
        "volume": "三年级练习册",
        "shortTitle": "三年级历史 · 练习册",
        "zhTitle": "希腊小学三年级历史练习册（Από τη Μυθολογία στην Ιστορία）",
        "origTitle": "Ιστορία Γ΄ Δημοτικού · Τετράδιο Εργασιών",
    },
    # --- 英语 (Αγγλικά Δ΄) ---
    {
        "id": "g4-agglika",
        "code": "10-0232-01",
        "pdf": "10-0232-01_V2_Agglika_D-Dimotikou_Vivlio-Mathiti.pdf",
        "md": "10-0232-01_V2_Agglika_D-Dimotikou_Vivlio-Mathiti.md",
        "subject": "英语/其他",
        "grade": 4,
        "isWorkbook": False,
        "volume": "四年级课本",
        "shortTitle": "四年级英语 · 课本",
        "zhTitle": "希腊小学四年级英语课本（English 4th Grade · Pupil's Book）",
        "origTitle": "Αγγλικά Δ΄ Δημοτικού · Βιβλίο Μαθητή",
    },
    {
        "id": "g4-agglika-wb",
        "code": "10-0079-02",
        "pdf": "10-0079-02_Agglika_D-Dimotikou_Tetradio-Ergasion.pdf",
        "md": "10-0079-02_Agglika_D-Dimotikou_Tetradio-Ergasion.md",
        "subject": "英语/其他",
        "grade": 4,
        "isWorkbook": True,
        "volume": "四年级练习册",
        "shortTitle": "四年级英语 · 练习册",
        "zhTitle": "希腊小学四年级英语练习册（English 4th Grade · Activity Book）",
        "origTitle": "Αγγλικά Δ΄ Δημοτικού · Τετράδιο Εργασιών",
    },
]

# Tutor Book B & A2
TUTOR_BOOKS_DEF = [
    {
        "id": "tutor-b",
        "code": "tutor-b",
        "raw_pdf": "Ελληνικά Β.pdf",
        "md": "（已压缩）LEON_S GREEK TEXTBOOK B.md",
        "offset": 1,
        "subject": "私教希腊语",
        "grade": 0,
        "isWorkbook": False,
        "volume": "B 本 (Ελληνικά Β΄)",
        "shortTitle": "私教 B 本 (Ελληνικά Β΄)",
        "zhTitle": "私教核心教材 B 本（Ελληνικά Β΄）",
        "origTitle": "Ελληνικά Β΄ · Μέθοδος εκμάθησης της ελληνικής",
    },
    {
        "id": "tutor-a2",
        "code": "tutor-a2",
        "raw_pdf": "（已压缩）LEON_S GREEK TEXTBOOK A2.pdf",
        "md": "（已压缩）LEON_S GREEK TEXTBOOK A2.md",
        "offset": 0,
        "subject": "私教希腊语",
        "grade": 0,
        "isWorkbook": False,
        "volume": "A2 (ΚΛΙΚ Α2)",
        "shortTitle": "私教 A2 课本 (ΚΛΙΚ Α2)",
        "zhTitle": "私教教材 A2（ΚΛΙΚ στα Ελληνικά Α2）",
        "origTitle": "ΚΛΙΚ στα Ελληνικά Α2",
    },
]


# ---------------------------------------------------------------------------
# Textbook Page Range -> Paired Workbook Page Range Mapping
# ---------------------------------------------------------------------------
WORKBOOK_LINKS = {
    # 1. Grade 4 Glossa (Α, Β, Γ -> wb-a, wb-b)
    "g4-glossa-a": [
        {"tb": [9, 30], "wbId": "g4-glossa-wb-a", "wb": [7, 20], "title": "Ενότητα 1 · Ένα ακόμα σκαλί"},
        {"tb": [31, 46], "wbId": "g4-glossa-wb-a", "wb": [21, 33], "title": "Ενότητα 2 · Ρώτα το νερό... τι τρέχει"},
        {"tb": [57, 72], "wbId": "g4-glossa-wb-a", "wb": [34, 46], "title": "Ενότητα 4 · Εμένα με νοιάζει..."},
        {"tb": [73, 88], "wbId": "g4-glossa-wb-a", "wb": [47, 56], "title": "Ενότητα 5 · Ασφαλώς... κυκλοφορώ"},
    ],
    "g4-glossa-b": [
        {"tb": [7, 26], "wbId": "g4-glossa-wb-a", "wb": [57, 66], "title": "Ενότητα 6 · Ιστορίες παιδιών"},
        {"tb": [27, 46], "wbId": "g4-glossa-wb-a", "wb": [67, 76], "title": "Ενότητα 7 · Η ελιά"},
        {"tb": [57, 80], "wbId": "g4-glossa-wb-b", "wb": [7, 20], "title": "Ενότητα 9 · Η παράσταση αρχίζει"},
        {"tb": [81, 99], "wbId": "g4-glossa-wb-b", "wb": [21, 29], "title": "Ενότητα 10 · Λέξεις φτερουγίζουν πέρα..."},
    ],
    "g4-glossa-g": [
        {"tb": [7, 26], "wbId": "g4-glossa-wb-b", "wb": [30, 40], "title": "Ενότητα 11 · Γελάσαμε με την ψυχή μας"},
        {"tb": [33, 48], "wbId": "g4-glossa-wb-b", "wb": [41, 50], "title": "Ενότητα 13 · Όλοι διαφορετικοί, όλοι ίδιοι"},
        {"tb": [49, 66], "wbId": "g4-glossa-wb-b", "wb": [51, 61], "title": "Ενότητα 14 · Το ανθρώπινο θαύμα"},
        {"tb": [73, 91], "wbId": "g4-glossa-wb-b", "wb": [62, 71], "title": "Ενότητα 16 · Ταξίδια στην Ελλάδα"},
    ],
    # 2. Grade 4 English (10-0232 -> 10-0079)
    "g4-agglika": [
        {"tb": [9, 13], "wbId": "g4-agglika-wb", "wb": [7, 10], "title": "Unit 1 · Lesson 1: A new student in class"},
        {"tb": [14, 20], "wbId": "g4-agglika-wb", "wb": [11, 14], "title": "Unit 1 · Lesson 2-3: My timetable & My school"},
        {"tb": [21, 25], "wbId": "g4-agglika-wb", "wb": [15, 17], "title": "Unit 2 · Lesson 1: My favourite sport"},
        {"tb": [26, 32], "wbId": "g4-agglika-wb", "wb": [18, 21], "title": "Unit 2 · Lesson 2-3: Have you got a hobby?"},
        {"tb": [33, 37], "wbId": "g4-agglika-wb", "wb": [22, 24], "title": "Unit 3 · Lesson 1: My country"},
        {"tb": [38, 44], "wbId": "g4-agglika-wb", "wb": [25, 29], "title": "Unit 3 · Lesson 2-3: My city"},
        {"tb": [45, 49], "wbId": "g4-agglika-wb", "wb": [30, 34], "title": "Unit 4 · Lesson 1: Happy Birthday!"},
        {"tb": [50, 56], "wbId": "g4-agglika-wb", "wb": [35, 38], "title": "Unit 4 · Lesson 2-3: What's the weather like?"},
        {"tb": [57, 61], "wbId": "g4-agglika-wb", "wb": [39, 42], "title": "Unit 5 · Lesson 1: Habits"},
        {"tb": [62, 68], "wbId": "g4-agglika-wb", "wb": [43, 46], "title": "Unit 5 · Lesson 2-3: Customs"},
        {"tb": [69, 73], "wbId": "g4-agglika-wb", "wb": [47, 50], "title": "Unit 6 · Lesson 1: My pet"},
        {"tb": [74, 80], "wbId": "g4-agglika-wb", "wb": [51, 54], "title": "Unit 6 · Lesson 2-3: Endangered animals"},
        {"tb": [81, 85], "wbId": "g4-agglika-wb", "wb": [55, 57], "title": "Unit 7 · Lesson 1: Helping around the house"},
        {"tb": [86, 92], "wbId": "g4-agglika-wb", "wb": [58, 61], "title": "Unit 7 · Lesson 2-3: What do you do?"},
        {"tb": [93, 97], "wbId": "g4-agglika-wb", "wb": [62, 65], "title": "Unit 8 · Lesson 1: At the park & school"},
        {"tb": [98, 104], "wbId": "g4-agglika-wb", "wb": [66, 69], "title": "Unit 8 · Lesson 2-3: Traffic signs"},
        {"tb": [105, 109], "wbId": "g4-agglika-wb", "wb": [70, 73], "title": "Unit 9 · Lesson 1: At the supermarket"},
        {"tb": [110, 116], "wbId": "g4-agglika-wb", "wb": [74, 77], "title": "Unit 9 · Lesson 2-3: Let's make some..."},
        {"tb": [117, 129], "wbId": "g4-agglika-wb", "wb": [78, 83], "title": "Unit 10 · Enjoy your holidays!"},
    ],
}


# ---------------------------------------------------------------------------
# Grade 3 Glossa Complete Unit & Sub-Lesson Challenge Catalog (11 Core Paired Units)
# ---------------------------------------------------------------------------
G3_GLOSSA_UNITS = [
    {
        "unitId": "g3_u1",
        "unitNo": 1,
        "titleEl": "Πάλι μαζί!",
        "titleZh": "又见面啦！（开学与校园时光）",
        "tbId": "g3-glossa-a",
        "wbId": "g3-glossa-wb-a",
        "lessons": [
            {"id": "g3_u1_l1", "title": "1. Θαλασσινό σχολείο（大海学校）", "tb": [10, 11], "wb": [8, 8]},
            {"id": "g3_u1_l2", "title": "2. Επιστροφή στα θρανία!（重返课桌）", "tb": [12, 14], "wb": [9, 9]},
            {"id": "g3_u1_l3", "title": "3. Το σχολείο ταξιδεύει στον χρόνο（穿越时空的学校）", "tb": [15, 17], "wb": [10, 12]},
            {"id": "g3_u1_l4", "title": "4. Δημοτικό Σχολείο Τρικάλων Ημαθίας（特里卡拉小学）", "tb": [18, 20], "wb": [13, 15]},
            {"id": "g3_u1_l5", "title": "5-6. Δεν είναι τρελοί οι δίδυμοι & Λεξιλόγιο（双胞胎趣事与词汇总结）", "tb": [21, 26], "wb": [16, 19]},
        ],
    },
    {
        "unitId": "g3_u2",
        "unitNo": 2,
        "titleEl": "Στο σπίτι και στη γειτονιά",
        "titleZh": "在家里与邻里街坊",
        "tbId": "g3-glossa-a",
        "wbId": "g3-glossa-wb-a",
        "lessons": [
            {"id": "g3_u2_l1", "title": "1. Αγαπητό μου ημερολόγιο（亲爱的日记）", "tb": [28, 31], "wb": [20, 21]},
            {"id": "g3_u2_l2", "title": "2. Η φίλη μας η Αργυρώ（我们的朋友阿ργυρώ）", "tb": [32, 35], "wb": [22, 24]},
            {"id": "g3_u2_l3", "title": "3. Τα παιδικά μου παιχνίδια（我的童年玩具）", "tb": [36, 39], "wb": [25, 30]},
            {"id": "g3_u2_l4", "title": "4. Στη νέα μας γειτονιά & Λεξιλόγιο（在我们的新社区）", "tb": [40, 44], "wb": [31, 33]},
        ],
    },
    {
        "unitId": "g3_u3",
        "unitNo": 3,
        "titleEl": "Στη γη και στη θάλασσα",
        "titleZh": "在大地与海洋之间",
        "tbId": "g3-glossa-a",
        "wbId": "g3-glossa-wb-a",
        "lessons": [
            {"id": "g3_u3_l1", "title": "1. Σπίτι με κήπον（带花园的房子）", "tb": [46, 49], "wb": [34, 35]},
            {"id": "g3_u3_l2", "title": "2. Γάτος από σπίτι ζητά νέα οικογένεια（找新家的家猫）", "tb": [50, 52], "wb": [36, 38]},
            {"id": "g3_u3_l3", "title": "3. Οι ακροβάτες της θάλασσας（海上的杂技演员：海豚）", "tb": [53, 55], "wb": [39, 40]},
            {"id": "g3_u3_l4", "title": "4. Γη και θάλασσα（陆地与海洋）", "tb": [56, 58], "wb": [41, 42]},
            {"id": "g3_u3_l5", "title": "5. Οι μικροί ταξιδιώτες ανεβαίνουν στο βουνό（小旅行者登山记）", "tb": [59, 63], "wb": [43, 45]},
        ],
    },
    {
        "unitId": "g3_u4",
        "unitNo": 4,
        "titleEl": "Ο κόσμος γύρω μας",
        "titleZh": "我们周围的世界（环保与自然）",
        "tbId": "g3-glossa-a",
        "wbId": "g3-glossa-wb-a",
        "lessons": [
            {"id": "g3_u4_l1", "title": "1. Πώς υιοθετήσαμε ένα κομμάτι γης（我们如何认养一片土地）", "tb": [64, 67], "wb": [46, 48]},
            {"id": "g3_u4_l2", "title": "2. Τα χαρτιά ανακυκλώνονται!（纸张回收再生）", "tb": [68, 71], "wb": [49, 52]},
            {"id": "g3_u4_l3", "title": "3. Το τετράδιο ζωγραφικής & Λεξιλόγιο（画画本与单元词汇）", "tb": [72, 77], "wb": [53, 55]},
        ],
    },
    {
        "unitId": "g3_u6",
        "unitNo": 6,
        "titleEl": "Πολιτείες ντυμένες στα λευκά",
        "titleZh": "银装素裹的城市（大雪天）",
        "tbId": "g3-glossa-b",
        "wbId": "g3-glossa-wb-a",
        "lessons": [
            {"id": "g3_u6_l1", "title": "1. Η πόλη χάθηκε στο χιόνι（大雪掩埋的城市·上）", "tb": [8, 10], "wb": [56, 58]},
            {"id": "g3_u6_l2", "title": "2. Η πόλη χάθηκε στο χιόνι (συνέχεια)（大雪掩埋的城市·下）", "tb": [11, 14], "wb": [59, 61]},
            {"id": "g3_u6_l3", "title": "3. Τόσο χιόνι δεν ξανάγινε! & Λεξιλόγιο（从未见过这么大的雪）", "tb": [15, 19], "wb": [62, 65]},
        ],
    },
    {
        "unitId": "g3_u7",
        "unitNo": 7,
        "titleEl": "Ιστορίες του χειμώνα",
        "titleZh": "冬日童话故事",
        "tbId": "g3-glossa-b",
        "wbId": "g3-glossa-wb-a",
        "lessons": [
            {"id": "g3_u7_l1", "title": "1. Ο χιονάνθρωπος και το κορίτσι（雪人与小女孩）", "tb": [20, 24], "wb": [66, 67]},
            {"id": "g3_u7_l2", "title": "2. Κάτω απ’ το χιόνι（白雪之下）", "tb": [25, 26], "wb": [68, 68]},
            {"id": "g3_u7_l3", "title": "3. Ο εγωιστής Γίγαντας & Λεξιλόγιο（自私的巨人与单元词汇）", "tb": [27, 33], "wb": [69, 71]},
        ],
    },
    {
        "unitId": "g3_u8",
        "unitNo": 8,
        "titleEl": "Έλα στην παρέα μας!",
        "titleZh": "加入我们的伙伴圈！（生日与美食邀请）",
        "tbId": "g3-glossa-b",
        "wbId": "g3-glossa-wb-b",
        "lessons": [
            {"id": "g3_u8_l1", "title": "1. Αξέχαστα γενέθλια（难忘的生日）", "tb": [34, 38], "wb": [8, 12]},
            {"id": "g3_u8_l2", "title": "2. Μικρομαγειρέματα（小厨师做菜）", "tb": [39, 42], "wb": [13, 14]},
            {"id": "g3_u8_l3", "title": "3-4. Φτιάχνουμε προσκλήσεις & Ημερολόγιο Ελτόν（做邀请函与日记）", "tb": [43, 48], "wb": [15, 17]},
            {"id": "g3_u8_l4", "title": "5. Το χαρούμενο λιβάδι & Λεξιλόγιο（欢乐草地与单元词汇）", "tb": [49, 54], "wb": [18, 21]},
        ],
    },
    {
        "unitId": "g3_u9",
        "unitNo": 9,
        "titleEl": "Άνθρωποι και μηχανές",
        "titleZh": "人类与奇妙机器",
        "tbId": "g3-glossa-b",
        "wbId": "g3-glossa-wb-b",
        "lessons": [
            {"id": "g3_u9_l1", "title": "1. Φτιάξε μου έναν σιδερένιο άνθρωπο（给我造个铁人）", "tb": [56, 59], "wb": [22, 24]},
            {"id": "g3_u9_l2", "title": "2. Μηχανές του μέλλοντος（未来的机器）", "tb": [60, 63], "wb": [25, 27]},
            {"id": "g3_u9_l3", "title": "3. Ο Θεός της Τεχνολογίας（科技之神：赫菲斯托斯）", "tb": [64, 65], "wb": [28, 29]},
            {"id": "g3_u9_l4", "title": "4. Η μηχανή του χρόνου & Λεξιλόγιο（时间机器与单元词汇）", "tb": [66, 72], "wb": [30, 35]},
        ],
    },
    {
        "unitId": "g3_u11",
        "unitNo": 11,
        "titleEl": "Ήτανε μια φορά...",
        "titleZh": "很久很久以前…（远航与童话）",
        "tbId": "g3-glossa-g",
        "wbId": "g3-glossa-wb-b",
        "lessons": [
            {"id": "g3_u11_l1", "title": "1. Τα ταξίδια του παππού μου（爷爷的远航·上）", "tb": [8, 10], "wb": [36, 37]},
            {"id": "g3_u11_l2", "title": "2. Τα ταξίδια του παππού μου (συνέχεια)（爷爷的远航·下）", "tb": [11, 14], "wb": [38, 39]},
            {"id": "g3_u11_l3", "title": "3. Μια αληθινή ιστορία（一个真实的故事）", "tb": [15, 18], "wb": [40, 41]},
            {"id": "g3_u11_l4", "title": "4. Στο νησί του Αιόλου（在风神埃俄罗斯岛）", "tb": [19, 22], "wb": [42, 44]},
            {"id": "g3_u11_l5", "title": "5. Γεια σου χαρά σου Βενετιά & Λεξιλόγιο（你好威尼斯与单元词汇）", "tb": [23, 27], "wb": [45, 47]},
        ],
    },
    {
        "unitId": "g3_u12",
        "unitNo": 12,
        "titleEl": "Του κόσμου το ψωμί",
        "titleZh": "世间的面包与传统皮影戏",
        "tbId": "g3-glossa-g",
        "wbId": "g3-glossa-wb-b",
        "lessons": [
            {"id": "g3_u12_l1", "title": "1. Το πιο γλυκό ψωμί（最香甜的面包·上）", "tb": [28, 31], "wb": [48, 49]},
            {"id": "g3_u12_l2", "title": "2. Το πιο γλυκό ψωμί (συνέχεια)（最香甜的面包·下）", "tb": [32, 36], "wb": [50, 51]},
            {"id": "g3_u12_l3", "title": "3-4. Ψωμί κι ελιά & Μύλος（面包橄榄与风车磨坊）", "tb": [37, 43], "wb": [52, 55]},
            {"id": "g3_u12_l4", "title": "5. Ο Καραγκιόζης φούρναρης & Λεξιλόγιο（卡拉乔齐当面包师）", "tb": [44, 49], "wb": [56, 59]},
        ],
    },
    {
        "unitId": "g3_u13",
        "unitNo": 13,
        "titleEl": "Όλοι μια αγκαλιά",
        "titleZh": "四海一家 · 温暖拥抱",
        "tbId": "g3-glossa-g",
        "wbId": "g3-glossa-wb-b",
        "lessons": [
            {"id": "g3_u13_l1", "title": "1. Ένας ξένος στη γειτονιά μας（社区里的新邻居）", "tb": [50, 52], "wb": [60, 61]},
            {"id": "g3_u13_l2", "title": "2. Πώς θα γίνει καλύτερος ο κόσμος μας（怎样让世界更美好）", "tb": [53, 55], "wb": [62, 63]},
            {"id": "g3_u13_l3", "title": "3. Τα δικαιώματα των παιδιών（儿童的权利）", "tb": [56, 59], "wb": [64, 65]},
            {"id": "g3_u13_l4", "title": "4. Γράμμα στον Θεό & Λεξιλόγιο（写给上天的信与单元词汇）", "tb": [60, 63], "wb": [66, 69]},
        ],
    },
]

# Non-sequential, interleaved challenge order across Volumes A, B, and Γ!
# Jumps across books & themes so Leon stays challenged instead of going 1->2->3 linearly,
# while completing each unit's lessons cleanly before jumping to the next unit!
SHUFFLED_G3_UNIT_ORDER = [
    "g3_u7",   # Β册 · Ιστορίες του χειμώνα (3课, 冬日童话开局，亲切有趣)
    "g3_u3",   # Α册 · Στη γη και στη θάλασσα (5课, 动植物与大海)
    "g3_u11",  # Γ册 · Ήτανε μια φορά... (5课, 远航与风神岛)
    "g3_u9",   # Β册 · Άνθρωποι και μηχανές (4课, 机器人与时间机器)
    "g3_u2",   # Α册 · Στο σπίτι και στη γειτονιά (4课, 日记与玩具)
    "g3_u12",  # Γ册 · Του κόσμου το ψωμί (4课, 面包与卡拉乔齐喜剧)
    "g3_u6",   # Β册 · Πολιτείες ντυμένες στα λευκά (3课, 大雪城市纪实)
    "g3_u4",   # Α册 · Ο κόσμος γύρω μας (3课, 环保与自然)
    "g3_u8",   # Β册 · Έλα στην παρέα μας! (4课, 生日与做菜祈使句)
    "g3_u13",  # Γ册 · Όλοι μια αγκαλιά (4课, 世界与友谊)
    "g3_u1",   # Α册 · Πάλι μαζί! (5课, 校园收官大满贯)
]


def build_history_workbook_links(tb_pages: dict, wb_pages: dict, wb_id: str) -> list:
    """Match ΚΕΦΑΛΑΙΟ / numbered lessons between History Textbook and Workbook."""
    # Map chapter number -> page range in wb
    wb_chap_pages = {}
    for p_str, txt in sorted(wb_pages.items(), key=lambda kv: int(kv[0])):
        p = int(p_str)
        if p < 5:
            continue
        # Look for ΚΕΦΑΛΑΙΟ X or leading 'X. Title'
        for m in re.finditer(r"(?:ΚΕΦΑΛΑΙΟ\s*(\d+)|^\s*(\d+)\.\s+[Α-ΩΆ-Ώ])", txt, flags=re.M):
            cno = int(m.group(1) or m.group(2))
            if 1 <= cno <= 55:
                wb_chap_pages.setdefault(cno, []).append(p)

    links = []
    for p_str, txt in sorted(tb_pages.items(), key=lambda kv: int(kv[0])):
        p = int(p_str)
        if p < 7:
            continue
        m = re.search(r"(?:ΚΕΦΑΛΑΙΟ\s*(\d+)|^\s*(\d+)\.\s+([Α-ΩΆ-Ώ][^\n]{3,60}))", txt, flags=re.M)
        if m:
            cno = int(m.group(1) or m.group(2))
            if cno in wb_chap_pages:
                wps = wb_chap_pages[cno]
                links.append({
                    "tb": [p, p + 2],
                    "wbId": wb_id,
                    "wb": [min(wps), max(wps)],
                    "title": f"Κεφάλαιο {cno}",
                })
    return links


def main():
    catalog_books = []
    loaded_pages_cache = {}

    # 1. Process 16 school books
    for b in BOOKS_DEF:
        pdf_path = os.path.join(TEXTBOOKS_MD_DIR, b["pdf"])
        md_path = os.path.join(TEXTBOOKS_MD_DIR, b["md"])
        cover_rel = f"/images/textbook_covers/{b['id']}.jpg"
        cover_out = os.path.join(COVERS_OUT_DIR, f"{b['id']}.jpg")

        render_cover(pdf_path, cover_out)
        pages = parse_dual_md_pages(md_path)
        loaded_pages_cache[b["id"]] = pages

        p_nums = [int(k) for k in pages.keys()]
        min_p, max_p = min(p_nums), max(p_nums)

        json_out = os.path.join(PAGES_OUT_DIR, f"{b['id']}.json")
        with open(json_out, "w", encoding="utf-8") as jf:
            json.dump({"id": b["id"], "shortTitle": b["shortTitle"], "pages": pages}, jf, ensure_ascii=False)

        catalog_books.append({
            "id": b["id"],
            "code": b["code"],
            "subject": b["subject"],
            "grade": b["grade"],
            "isWorkbook": b["isWorkbook"],
            "volume": b["volume"],
            "shortTitle": b["shortTitle"],
            "zhTitle": b["zhTitle"],
            "origTitle": b["origTitle"],
            "coverUrl": cover_rel,
            "minPage": min_p,
            "maxPage": max_p,
        })
        print(f"[School Book] {b['id']} -> cover ({os.path.getsize(cover_out)//1024}KB) + {len(pages)} pages")

    # 2. Process Tutor Books (B & A2)
    for tb in TUTOR_BOOKS_DEF:
        raw_pdf = os.path.join(RAW_TEXTBOOKS_DIR, tb["raw_pdf"])
        md_path = os.path.join(TEXTBOOKS_MD_DIR, tb["md"])
        if not os.path.exists(md_path):
            continue
        cover_rel = f"/images/textbook_covers/{tb['id']}.jpg"
        cover_out = os.path.join(COVERS_OUT_DIR, f"{tb['id']}.jpg")
        if os.path.exists(raw_pdf):
            render_cover(raw_pdf, cover_out)

        pages = parse_tutor_book_md_pages(md_path, pdf_to_book_offset=tb["offset"])
        p_nums = [int(k) for k in pages.keys()]
        min_p, max_p = min(p_nums), max(p_nums)

        json_out = os.path.join(PAGES_OUT_DIR, f"{tb['id']}.json")
        with open(json_out, "w", encoding="utf-8") as jf:
            json.dump({"id": tb["id"], "shortTitle": tb["shortTitle"], "pages": pages}, jf, ensure_ascii=False)

        catalog_books.append({
            "id": tb["id"],
            "code": tb["code"],
            "subject": tb["subject"],
            "grade": tb["grade"],
            "isWorkbook": False,
            "volume": tb["volume"],
            "shortTitle": tb["shortTitle"],
            "zhTitle": tb["zhTitle"],
            "origTitle": tb["origTitle"],
            "coverUrl": cover_rel if os.path.exists(cover_out) else "",
            "minPage": min_p,
            "maxPage": max_p,
        })
        print(f"[Tutor Book]  {tb['id']} -> {len(pages)} pages")

    # Add Grade 3 Glossa links into WORKBOOK_LINKS automatically from G3_GLOSSA_UNITS
    for u in G3_GLOSSA_UNITS:
        tb_id = u["tbId"]
        WORKBOOK_LINKS.setdefault(tb_id, [])
        for ls in u["lessons"]:
            WORKBOOK_LINKS[tb_id].append({
                "tb": ls["tb"],
                "wbId": u["wbId"],
                "wb": ls["wb"],
                "title": f"{u['titleEl']} · {ls['title']}",
            })

    # Add History Grade 4 & Grade 3 chapter links
    WORKBOOK_LINKS["g4-istoria"] = build_history_workbook_links(
        loaded_pages_cache["g4-istoria"], loaded_pages_cache["g4-istoria-wb"], "g4-istoria-wb"
    )
    WORKBOOK_LINKS["g3-istoria"] = build_history_workbook_links(
        loaded_pages_cache["g3-istoria"], loaded_pages_cache["g3-istoria-wb"], "g3-istoria-wb"
    )

    catalog = {
        "books": catalog_books,
        "workbookLinks": WORKBOOK_LINKS,
        "g3GlossaChallenge": {
            "shuffledUnitOrder": SHUFFLED_G3_UNIT_ORDER,
            "units": G3_GLOSSA_UNITS,
        },
    }

    with open(CATALOG_OUT_PATH, "w", encoding="utf-8") as cf:
        json.dump(catalog, cf, ensure_ascii=False, indent=2)
        cf.write("\n")

    total_lessons = sum(len(u["lessons"]) for u in G3_GLOSSA_UNITS)
    print(f"\nWrote {CATALOG_OUT_PATH}: {len(catalog_books)} books, G3 Glossa = {len(G3_GLOSSA_UNITS)} units / {total_lessons} lessons.")


if __name__ == "__main__":
    main()

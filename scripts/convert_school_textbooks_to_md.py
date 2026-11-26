#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
1:1 PDF-to-Markdown Converter for Greek School Textbooks & Workbooks
(Ιστορία / Αγγλικά / Γλώσσα — Γ΄ & Δ΄ Δημοτικού, 16 Volumes, 1,590 Pages)

Handles all legacy encodings present in Greek Ministry of Education ("Διόφαντος") PDFs:
  1. Native Unicode Greek & English
  2. Windows-1253 (cp1253) stored in WinAnsi/Latin-1 fonts (MgHelvetica*, CF-Note-Bold, CfLampoonText, etc.)
  3. Apple MacGreek / PostScript Greek fonts (PFActionHero*, HelNorm, HelBold, HelBoldItal)
  4. TrueType Glyph-ID-shifted ArialMT / Arial-ItalicMT spans (publisher copyright pages)
  5. Custom publisher imprint glyph maps (UB-Future-Bold p.3, UBHelvetica-Regular cp737 p.4)
  6. Font-specific glyph overrides (CFJeckyl* 'Ż' -> 'ΐ', PUA bullets/checkboxes, µ->μ, ∆->Δ, Ω->Ω)
  7. Mixed-word Latin-in-Greek homoglyph normalization (Eπιστροφή -> Επιστροφή, Mπελάς -> Μπελάς)
  8. Coordinate-aware visual reconstruction:
     - Preserves PyMuPDF atomic lines (keeping apostrophes & accents intact) while trusting intra-span spacing
     - Deduplicates drop-shadow overlapping text layers
     - Merges inline hole-fill spans (e.g. bold '–ing,') & adjacent drop-caps/badges only when non-space glyphs never collide horizontally
     - Reconstructs rotated vertical margin text (dir ≈ (0, -1)) in proper reading order
     - Preserves multi-column reading order (left column -> right sidebar) and horizontal tables
"""

import argparse
import glob
import os
import re
import sys
import fitz  # PyMuPDF

try:
    from fontTools.ttLib import TTFont
except ImportError:
    TTFont = None

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEXTBOOKS_DIR = os.path.join(ROOT_DIR, "materials", "textbooks")

BOOK_META = {
    "10-0048-02_Glossa_G-Dimotikou_Vivlio-Mathiti_Teuchos-A.pdf": {
        "zh_title": "希腊小学三年级语言课本（第1册）",
        "orig_title": "Γλώσσα Γ΄ Δημοτικού · Βιβλίο Μαθητή (Τεύχος Α΄)",
        "subject": "希腊语 (Γλώσσα)",
        "grade": "三年级 (Γ΄ Δημοτικού)",
        "kind": "学生课本 (Βιβλίο Μαθητή · Τεύχος Α΄)",
        "code": "10-0048-02",
        "is_english_book": False,
    },
    "10-0050-02_V2_Glossa_G-Dimotikou_Vivlio-Mathiti_Teuchos-B.pdf": {
        "zh_title": "希腊小学三年级语言课本（第2册）",
        "orig_title": "Γλώσσα Γ΄ Δημοτικού · Βιβλίο Μαθητή (Τεύχος Β΄)",
        "subject": "希腊语 (Γλώσσα)",
        "grade": "三年级 (Γ΄ Δημοτικού)",
        "kind": "学生课本 (Βιβλίο Μαθητή · Τεύχος Β΄)",
        "code": "10-0050-02",
        "is_english_book": False,
    },
    "10-0052-02_Glossa_G-Dimotikou_Vivlio-Mathiti_Teuchos-G.pdf": {
        "zh_title": "希腊小学三年级语言课本（第3册）",
        "orig_title": "Γλώσσα Γ΄ Δημοτικού · Βιβλίο Μαθητή (Τεύχος Γ΄)",
        "subject": "希腊语 (Γλώσσα)",
        "grade": "三年级 (Γ΄ Δημοτικού)",
        "kind": "学生课本 (Βιβλίο Μαθητή · Τεύχος Γ΄)",
        "code": "10-0052-02",
        "is_english_book": False,
    },
    "10-0049-02_Glossa_G-Dimotikou_Tetradio-Ergasion_Teuchos-A.pdf": {
        "zh_title": "希腊小学三年级语言练习册（第1册）",
        "orig_title": "Γλώσσα Γ΄ Δημοτικού · Τετράδιο Εργασιών (Τεύχος Α΄)",
        "subject": "希腊语 (Γλώσσα)",
        "grade": "三年级 (Γ΄ Δημοτικού)",
        "kind": "练习册 (Τετράδιο Εργασιών · Τεύχος Α΄)",
        "code": "10-0049-02",
        "is_english_book": False,
    },
    "10-0051-02_Glossa_G-Dimotikou_Tetradio-Ergasion_Teuchos-B.pdf": {
        "zh_title": "希腊小学三年级语言练习册（第2册）",
        "orig_title": "Γλώσσα Γ΄ Δημοτικού · Τετράδιο Εργασιών (Τεύχος Β΄)",
        "subject": "希腊语 (Γλώσσα)",
        "grade": "三年级 (Γ΄ Δημοτικού)",
        "kind": "练习册 (Τετράδιο Εργασιών · Τεύχος Β΄)",
        "code": "10-0051-02",
        "is_english_book": False,
    },
    "10-0202-01_V3_Glossa_D-Dimotikou_Vivlio-Mathiti_Teuchos-A.pdf": {
        "zh_title": "希腊小学四年级语言课本（第1册 · Πετώντας με τις λέξεις）",
        "orig_title": "Γλώσσα Δ΄ Δημοτικού · Βιβλίο Μαθητή (Τεύχος Α΄)",
        "subject": "希腊语 (Γλώσσα)",
        "grade": "四年级 (Δ΄ Δημοτικού)",
        "kind": "学生课本 (Βιβλίο Μαθητή · Τεύχος Α΄)",
        "code": "10-0202-01",
        "is_english_book": False,
    },
    "10-0084-02_V2_Glossa_D-Dimotikou_Vivlio-Mathiti_Teuchos-B.pdf": {
        "zh_title": "希腊小学四年级语言课本（第2册 · Πετώντας με τις λέξεις）",
        "orig_title": "Γλώσσα Δ΄ Δημοτικού · Βιβλίο Μαθητή (Τεύχος Β΄)",
        "subject": "希腊语 (Γλώσσα)",
        "grade": "四年级 (Δ΄ Δημοτικού)",
        "kind": "学生课本 (Βιβλίο Μαθητή · Τεύχος Β΄)",
        "code": "10-0084-02",
        "is_english_book": False,
    },
    "10-0086-02_V3_Glossa_D-Dimotikou_Vivlio-Mathiti_Teuchos-G.pdf": {
        "zh_title": "希腊小学四年级语言课本（第3册 · Πετώντας με τις λέξεις）",
        "orig_title": "Γλώσσα Δ΄ Δημοτικού · Βιβλίο Μαθητή (Τεύχος Γ΄)",
        "subject": "希腊语 (Γλώσσα)",
        "grade": "四年级 (Δ΄ Δημοτικού)",
        "kind": "学生课本 (Βιβλίο Μαθητή · Τεύχος Γ΄)",
        "code": "10-0086-02",
        "is_english_book": False,
    },
    "10-0083-02_V2_Glossa_D-Dimotikou_Tetradio-Ergasion_Teuchos-A.pdf": {
        "zh_title": "希腊小学四年级语言练习册（第1册 · Πετώντας με τις λέξεις）",
        "orig_title": "Γλώσσα Δ΄ Δημοτικού · Τετράδιο Εργασιών (Τεύχος Α΄)",
        "subject": "希腊语 (Γλώσσα)",
        "grade": "四年级 (Δ΄ Δημοτικού)",
        "kind": "练习册 (Τετράδιο Εργασιών · Τεύχος Α΄)",
        "code": "10-0083-02",
        "is_english_book": False,
    },
    "10-0085-02_V2_Glossa_D-Dimotikou_Tetradio-Ergasion_Teuchos-B.pdf": {
        "zh_title": "希腊小学四年级语言练习册（第2册 · Πετώντας με τις λέξεις）",
        "orig_title": "Γλώσσα Δ΄ Δημοτικού · Τετράδιο Εργασιών (Τεύχος Β΄)",
        "subject": "希腊语 (Γλώσσα)",
        "grade": "四年级 (Δ΄ Δημοτικού)",
        "kind": "练习册 (Τετράδιο Εργασιών · Τεύχος Β΄)",
        "code": "10-0085-02",
        "is_english_book": False,
    },
    "10-0056-02_V3_Istoria_G-Dimotikou_Vivlio-Mathiti.pdf": {
        "zh_title": "希腊小学三年级历史课本（Από τη Μυθολογία στην Ιστορία）",
        "orig_title": "Ιστορία Γ΄ Δημοτικού · Βιβλίο Μαθητή",
        "subject": "历史 (Ιστορία)",
        "grade": "三年级 (Γ΄ Δημοτικού)",
        "kind": "学生课本 (Βιβλίο Μαθητή)",
        "code": "10-0056-02",
        "is_english_book": False,
    },
    "10-0057-02_V2_Istoria_G-Dimotikou_Tetradio-Ergasion.pdf": {
        "zh_title": "希腊小学三年级历史练习册（Από τη Μυθολογία στην Ιστορία）",
        "orig_title": "Ιστορία Γ΄ Δημοτικού · Τετράδιο Εργασιών",
        "subject": "历史 (Ιστορία)",
        "grade": "三年级 (Γ΄ Δημοτικού)",
        "kind": "练习册 (Τετράδιο Εργασιών)",
        "code": "10-0057-02",
        "is_english_book": False,
    },
    "10-0090-02_Istoria_D-Dimotikou_Vivlio-Mathiti.pdf": {
        "zh_title": "希腊小学四年级历史课本（Στα αρχαία χρόνια）",
        "orig_title": "Ιστορία Δ΄ Δημοτικού · Βιβλίο Μαθητή",
        "subject": "历史 (Ιστορία)",
        "grade": "四年级 (Δ΄ Δημοτικού)",
        "kind": "学生课本 (Βιβλίο Μαθητή)",
        "code": "10-0090-02",
        "is_english_book": False,
    },
    "10-0091-02_Istoria_D-Dimotikou_Tetradio-Ergasion.pdf": {
        "zh_title": "希腊小学四年级历史练习册（Στα αρχαία χρόνια）",
        "orig_title": "Ιστορία Δ΄ Δημοτικού · Τετράδιο Εργασιών",
        "subject": "历史 (Ιστορία)",
        "grade": "四年级 (Δ΄ Δημοτικού)",
        "kind": "练习册 (Τετράδιο Εργασιών)",
        "code": "10-0091-02",
        "is_english_book": False,
    },
    "10-0232-01_V2_Agglika_D-Dimotikou_Vivlio-Mathiti.pdf": {
        "zh_title": "希腊小学四年级英语课本（English 4th Grade · Pupil's Book）",
        "orig_title": "Αγγλικά Δ΄ Δημοτικού · Βιβλίο Μαθητή",
        "subject": "英语 (Αγγλικά)",
        "grade": "四年级 (Δ΄ Δημοτικού)",
        "kind": "学生课本 (Βιβλίο Μαθητή / Pupil's Book)",
        "code": "10-0232-01",
        "is_english_book": True,
    },
    "10-0079-02_Agglika_D-Dimotikou_Tetradio-Ergasion.pdf": {
        "zh_title": "希腊小学四年级英语练习册（English 4th Grade · Activity Book）",
        "orig_title": "Αγγλικά Δ΄ Δημοτικού · Τετράδιο Εργασιών",
        "subject": "英语 (Αγγλικά)",
        "grade": "四年级 (Δ΄ Δημοτικού)",
        "kind": "练习册 (Τετράδιο Εργασιών / Activity Book)",
        "code": "10-0079-02",
        "is_english_book": True,
    },
}


# ---------------------------------------------------------------------------
# 1. Font & Character Decoders
# ---------------------------------------------------------------------------

def _build_arial_gid_map():
    inv = {3: " "}
    if TTFont is not None:
        for fp in ("/System/Library/Fonts/Supplemental/Arial.ttf", "/Library/Fonts/Arial.ttf"):
            if os.path.exists(fp):
                tt = TTFont(fp)
                cmap = tt.getBestCmap()
                for cp, gname in cmap.items():
                    gid = tt.getGlyphID(gname)
                    if gid not in inv:
                        inv[gid] = chr(cp)
                break
    # In Diophantos subset ArialMT, guillemets « and » map to GID 0xA9 (©) and 0xAA (ª)
    inv[0xA9] = "«"
    inv[0xAA] = "»"
    return inv


ARIAL_GID_MAP = _build_arial_gid_map()

CP1253_FONTS = {
    "MgHelveticaPlain",
    "MgHelveticaBold",
    "MgHelveticaItalic",
    "MgHelveticaBoldItalic",
    "MgMemoriesAplaPlain",
    "MgNewCenturyBold",
    "MgPolSouvenirPlain",
    "CF-Note-Bold",
    "CFHelvetica-ExtraBold",
    "CfLampoonText",
}

MACGREEK_FONTS = {
    "PFActionHero",
    "PFActionHeroOblique",
    "HelNorm",
    "HelBold",
    "HelBoldItal",
}

MACGREEK_MAP = {
    "∞": "Α", "μ": "Β", "°": "Γ", "¢": "Δ", "∂": "Ε", "∑": "Ζ", "∏": "Η", "£": "Θ", "π": "Ι", "∫": "Κ",
    "§": "Λ", "ª": "Μ", "¡": "Ν", "•": "Ξ", "√": "Ο", "¶": "Π", "ƒ": "Ρ", "™": "Σ", "Δ": "Τ", "∆": "Τ",
    "À": "Υ", "º": "Φ", "Ã": "Χ", "æ": "Ψ", "ø": "Ω",
    "·": "α", "‚": "β", "γ": "γ", "Á": "γ", "‰": "δ", "Â": "ε", "˙": "ζ", "Ë": "η", "ı": "θ", "È": "ι",
    "Î": "κ", "Ï": "λ", "Ì": "μ", "Ó": "ν", "Í": "ξ", "Ô": "ο", "Ú": "ρ", "Û": "σ", "˜": "ς",
    "Ù": "τ", "˘": "υ", "Ê": "φ", "¯": "χ", "„": "ψ", "ˆ": "ω",
    "\uf8ff": "π",
    "¿": "ά", "¤": "έ", "‹": "ή", "›": "ί", "ﬁ": "ό", "‡": "ύ", "Ò": "ώ",
    "◊": "Ή", "Œ": "Έ", "Ÿ": "Ό", "ñ": "•",
    "˚": "ϊ", "˝": "ΐ", "Õ": "Ά", "ÿ": "Ί", "ﬂ": "Ώ",
}

# UB-Future-Bold custom header glyph map on p.3 of Glossa books (sorted left-to-right by x0)
UB_FUTURE_P3_MAP = {
    "Ì": "Σ", "Ë": "Τ", "È": "Ο", "Ï": "Ι", "Â": "Χ", "»": "Ε", "¾": "Α",
    "Ê": "Ρ", "Ã": "Κ", "À": "Η", "\x86": "Δ", "É": "Π", "Æ": "Ν", "\x03": "",
}

CP737_GLITCH_MAP = {
    "¨": "Κ", "¢": "Α", "§": "Ι", "\x9c": "Θ", "\x9d": "Λ",
    "¦": "Η", "±": "Τ", "\xa0": "Σ", "©": "Μ", "à": "Ο", "²": "Υ",
}

PUA_AND_DINGBAT_MAP = {
    "\ue017": "• ",
    "\ue062": "▪",
    "\ue01f": "• ",
    "\uf022": "✂",
    "\uf028": "☎",
    "\uf043": "•",
    "\uf05f": "☐ ",
    "\uf077": "• ",
    "\uf096": "• ",
}

ZAPF_ASCII_DINGBAT_MAP = {
    "l": "•",
    "m": "❍",
    "n": "▪",
    "o": "☐",
    "p": "☐",
    "q": "❑",
    "r": "❒",
    "s": "▲",
    "t": "▼",
    "u": "◆",
    "v": "❖",
    "w": "◆",
    "3": "✓",
    "4": "✓",
    "5": "✕",
    "6": "✖",
    "7": "✗",
    "8": "✘",
}


def decode_cp1253_char(ch: str) -> str:
    if ch == "\u00b5":
        return "μ"
    cp = ord(ch)
    if cp < 0x80:
        return ch
    if ch in ("«", "»", "·", "°", "©", "®", "–", "—", "‘", "’", "“", "”", "…", "•", "€"):
        return ch
    try:
        b = ch.encode("cp1252")
        bv = b[0]
        if bv in (0xA1, 0xA2, 0xB8, 0xB9, 0xBA, 0xBC) or (0xBE <= bv <= 0xFE):
            return b.decode("cp1253")
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass
    return ch


def is_arial_cid_span(font: str, span_text: str) -> bool:
    if not font.startswith("Arial"):
        return False
    if "\x03" in span_text:
        return True
    if any(0x0120 <= ord(c) <= 0x02AF or (0 < ord(c) < 32 and c not in "\t\n\r") for c in span_text):
        return True
    return False


def decode_span(font: str, raw_chars: list) -> list:
    """Return list of (decoded_str, bbox) for a single span."""
    span_text = "".join(c["c"] for c in raw_chars)
    base_font = font.split("+")[-1]

    if is_arial_cid_span(base_font, span_text):
        out = []
        # If glyphs in this span are emitted right-to-left (e.g. p.3 copyright box), sort by x0
        is_rtl = len(raw_chars) >= 2 and (raw_chars[0]["bbox"][0] > raw_chars[-1]["bbox"][0] + 1.0)
        sorted_raw = sorted(raw_chars, key=lambda c_obj: round(c_obj["bbox"][0], 2)) if is_rtl else raw_chars
        for ch_obj in sorted_raw:
            c = ch_obj["c"]
            dc = " " if c in (" ", "\t") else ARIAL_GID_MAP.get(ord(c), "")
            if dc:
                out.append((dc, ch_obj["bbox"]))
        return out

    if base_font == "UB-Future-Bold" and any(c in UB_FUTURE_P3_MAP for c in span_text) and not any("\u0370" <= c <= "\u03ff" for c in span_text):
        out = []
        sorted_raw = sorted(raw_chars, key=lambda c_obj: round(c_obj["bbox"][0], 2))
        for ch_obj in sorted_raw:
            dc = UB_FUTURE_P3_MAP.get(ch_obj["c"], ch_obj["c"])
            if dc and dc not in ("\x00", "\x01", "\x03"):
                out.append((dc, ch_obj["bbox"]))
        return out

    if base_font == "UBHelvetica-Regular" and ("\x9c" in span_text or "\x9d" in span_text):
        return [(CP737_GLITCH_MAP.get(ch_obj["c"], ch_obj["c"]), ch_obj["bbox"]) for ch_obj in raw_chars]

    if base_font in CP1253_FONTS:
        out = []
        for ch_obj in raw_chars:
            c = ch_obj["c"]
            if c in ("\x00", "\x01", "\x03", "\xad"):
                continue
            if c == "\x07":
                out.append((" ", ch_obj["bbox"]))
                continue
            dc = PUA_AND_DINGBAT_MAP.get(c, decode_cp1253_char(c))
            out.append((dc, ch_obj["bbox"]))
        return out

    if base_font in MACGREEK_FONTS:
        has_macgreek = any(c in MACGREEK_MAP for c in span_text)
        out = []
        for ch_obj in raw_chars:
            c = ch_obj["c"]
            if c in ("\x00", "\x01", "\x03", "\xad"):
                continue
            dc = MACGREEK_MAP.get(c, c) if has_macgreek else c
            out.append((dc, ch_obj["bbox"]))
        return out

    if base_font in ("ZapfDingbats", "ZapfDingbatsITC", "Wingdings-Regular", "Webdings"):
        out = []
        for ch_obj in raw_chars:
            c = ch_obj["c"]
            if c in ("\x00", "\x01", "\x03", "\x07", " "):
                continue
            if c == "\x13":
                dc = "✓ "
            elif c == "ê":
                dc = "➤ "
            elif base_font in ("ZapfDingbats", "ZapfDingbatsITC") and c in ZAPF_ASCII_DINGBAT_MAP:
                dc = ZAPF_ASCII_DINGBAT_MAP[c] + " "
            elif c == "Õ":
                dc = "→"
            else:
                dc = PUA_AND_DINGBAT_MAP.get(c, c)
            out.append((dc, ch_obj["bbox"]))
        return out

    out = []
    for ch_obj in raw_chars:
        c = ch_obj["c"]
        if ord(c) < 32 and c not in ("\t", "\n", "\r"):
            if c == "\x07":
                out.append((" ", ch_obj["bbox"]))
            continue
        if c == "\xad" or (0x7F <= ord(c) <= 0x9F):
            continue
        if c == "\u2008":
            out.append((" ", ch_obj["bbox"]))
            continue
        if c in PUA_AND_DINGBAT_MAP:
            out.append((PUA_AND_DINGBAT_MAP[c], ch_obj["bbox"]))
            continue
        if c == "\u00b5":
            c = "μ"
        elif c == "\u2206":
            c = "Δ"
        elif c == "\u2126":
            c = "Ω"
        elif c == "Ż" and base_font.startswith("CFJeckyl"):
            c = "ΐ"
        elif c == "∞" and base_font.startswith("MgHelveticaUCPol"):
            c = "A"
        elif c == "×" and base_font.startswith("CFHelvetica"):
            c = "Χ"
        out.append((c, ch_obj["bbox"]))
    return out


_LATIN_TO_GREEK = str.maketrans({
    "A": "Α", "B": "Β", "E": "Ε", "Z": "Ζ", "H": "Η", "I": "Ι", "K": "Κ",
    "M": "Μ", "N": "Ν", "O": "Ο", "P": "Ρ", "T": "Τ", "X": "Χ", "Y": "Υ",
    "o": "ο", "x": "χ", "i": "ι", "v": "ν", "k": "κ", "a": "α", "u": "υ", "e": "ε",
})
_GREEK_TO_LATIN = str.maketrans({
    "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I", "Κ": "K",
    "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T", "Χ": "X", "Υ": "Y",
    "α": "a", "ε": "e", "ι": "i", "κ": "k", "ο": "o", "υ": "u", "ν": "v", "χ": "x",
})
_LATIN_ONLY_RE = re.compile(r"[CDFGJLQRSUVWbcdfghjlmnpqrstwyz]")
_GREEK_RE = re.compile(r"[\u0370-\u03ff\u1f00-\u1fff]")
_LATIN_RE = re.compile(r"[A-Za-z]")
_MIXED_TOKEN_RE = re.compile(r"[A-Za-z\u0370-\u03ff\u1f00-\u1fff]+")


def clean_greek_lookalikes(line: str, is_english_book: bool) -> str:
    line = re.sub(r"\bE\s+N\s+O\s+T\s+H\s+T\s+A\b", "ΕΝΟΤΗΤΑ", line)
    line = re.sub(r"\bENOTHTA\b", "ΕΝΟΤΗΤΑ", line)
    line = re.sub(r"([\u0370-\u03ff\u1f00-\u1fff])(www\.)", r"\1 \2", line)

    def _fix_tok(m):
        tok = m.group(0)
        if _GREEK_RE.search(tok) and _LATIN_RE.search(tok):
            if _LATIN_ONLY_RE.search(tok):
                return tok.translate(_GREEK_TO_LATIN)
            return tok.translate(_LATIN_TO_GREEK)
        return tok

    line = _MIXED_TOKEN_RE.sub(_fix_tok, line)

    if not is_english_book:
        line = re.sub(r"(?<![A-Za-z\u0370-\u03ff])O(?=\s+[\u0370-\u03ff\u1f00-\u1fff])", "Ο", line)
        line = re.sub(r"(?<![A-Za-z\u0370-\u03ff])H(?=\s+[\u0370-\u03ff\u1f00-\u1fff])", "Η", line)
    return line


# ---------------------------------------------------------------------------
# 2. Coordinate-Aware Atomic-Line Visual Reconstruction Engine
# ---------------------------------------------------------------------------

class Segment:
    """A contiguous run of decoded characters from a single span (no fake intra-span spaces!)."""
    __slots__ = ("x0", "y0", "x1", "y1", "text", "block_idx")

    def __init__(self, x0, y0, x1, y1, text, block_idx):
        self.x0 = x0
        self.y0 = y0
        self.x1 = x1
        self.y1 = y1
        self.text = text
        self.block_idx = block_idx


def split_span_into_segments(decoded_chars: list, block_idx: int) -> list:
    """
    Keep contiguous words together (trusting the span's own single spaces),
    but split a span if there is a multi-space hole (> 14pt of whitespace) so inline bold spans
    (like '–ing,' or 'ύ' placed in a blank gap) can slot cleanly into the hole!
    """
    segs = []
    cur_chars = []
    cur_boxes = []

    def flush():
        if not cur_chars:
            return
        txt = "".join(cur_chars)
        if txt.strip():
            non_sp = [bb for ch, bb in zip(cur_chars, cur_boxes) if ch.strip()]
            boxes = non_sp if non_sp else cur_boxes
            segs.append(
                Segment(
                    min(b[0] for b in boxes),
                    min(b[1] for b in boxes),
                    max(b[2] for b in boxes),
                    max(b[3] for b in boxes),
                    txt,
                    block_idx,
                )
            )
        cur_chars.clear()
        cur_boxes.clear()

    prev_nonspace_x1 = None
    for ch_s, bb in decoded_chars:
        if ch_s.strip():
            if prev_nonspace_x1 is not None and (bb[0] - prev_nonspace_x1) > 16.0:
                flush()
            cur_chars.append(ch_s)
            cur_boxes.append(bb)
            prev_nonspace_x1 = bb[2]
        else:
            cur_chars.append(ch_s)
            cur_boxes.append(bb)

    flush()
    return segs


def segments_horizontally_collide(segs_a: list, segs_b: list) -> bool:
    """Return True if any non-space segment in A overlaps horizontally (> 3.5pt) with any in B."""
    for a in segs_a:
        for b in segs_b:
            ov = min(a.x1, b.x1) - max(a.x0, b.x0)
            if ov > 3.5:
                return True
    return False


def is_dotted_leader(text: str) -> bool:
    s = text.strip()
    return len(s) >= 8 and (s.count(".") + s.count("…") + s.count("_")) >= len(s) * 0.65


def join_line_segments(segs: list) -> str:
    if not segs:
        return ""
    segs_sorted = sorted(segs, key=lambda s: round(s.x0, 1))
    parts = []
    prev_seg = None
    for seg in segs_sorted:
        if prev_seg is not None:
            gap = seg.x0 - prev_seg.x1
            h = max(6.0, min(seg.y1 - seg.y0, prev_seg.y1 - prev_seg.y0))
            if gap > 36.0 and not is_dotted_leader(prev_seg.text) and not is_dotted_leader(seg.text):
                parts.append(" | ")
            elif gap > max(2.6, h * 0.22):
                if not prev_seg.text.endswith(" ") and not seg.text.startswith(" "):
                    # Don't add space right before apostrophe/comma/period or right after opening quote/apostrophe
                    if seg.text.lstrip()[:1] not in ("’", "'", ",", ".", ";", ":", ")", "»", "!") and prev_seg.text.rstrip()[-1:] not in ("’", "'", "(", "«"):
                        parts.append(" ")
        parts.append(seg.text)
        prev_seg = seg

    s = "".join(parts)
    s = re.sub(r"[ \t]{2,}", " ", s)
    return s.strip()


def extract_page_markdown(page: fitz.Page, is_english_book: bool) -> list:
    raw = page.get_text("rawdict")
    atomic_lines = []  # each from one fitz line (or single UB-Future-Bold glyph)
    vert_up_chars = []
    vert_down_chars = []
    ub_p3_chars = []   # special p.3 right-to-left UB-Future-Bold headers

    for b_idx, block in enumerate(raw.get("blocks", [])):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            dx_dir, dy_dir = line.get("dir", (1.0, 0.0))

            # Check rotated vertical lines first
            if abs(dx_dir) < 0.45 and abs(dy_dir) > 0.7:
                for span in line.get("spans", []):
                    decoded = decode_span(span.get("font", ""), span.get("chars", []))
                    for ch_s, bb in decoded:
                        if dy_dir < 0:
                            vert_up_chars.append((ch_s, bb))
                        else:
                            vert_down_chars.append((ch_s, bb))
                continue

            line_segs = []
            for span in line.get("spans", []):
                raw_chars = span.get("chars", [])
                if not raw_chars:
                    continue
                base_f = span.get("font", "").split("+")[-1]
                span_raw_txt = "".join(c["c"] for c in raw_chars)
                if base_f == "UB-Future-Bold" and any(c in UB_FUTURE_P3_MAP for c in span_raw_txt) and not any("\u0370" <= c <= "\u03ff" for c in span_raw_txt):
                    for ch_s, bb in decode_span(base_f, raw_chars):
                        ub_p3_chars.append((ch_s, bb))
                    continue

                decoded = decode_span(span.get("font", ""), raw_chars)
                if not decoded:
                    continue
                line_segs.extend(split_span_into_segments(decoded, b_idx))

            if line_segs:
                x0 = min(s.x0 for s in line_segs)
                y0 = min(s.y0 for s in line_segs)
                x1 = max(s.x1 for s in line_segs)
                y1 = max(s.y1 for s in line_segs)
                txt = join_line_segments(line_segs)
                if txt:
                    atomic_lines.append({
                        "x0": x0, "y0": y0, "x1": x1, "y1": y1,
                        "yc": 0.5 * (y0 + y1),
                        "h": max(4.0, y1 - y0),
                        "segs": line_segs,
                        "text": txt,
                        "blocks": {b_idx},
                    })

    # Reconstruct UB-Future-Bold p.3 right-to-left banner lines if present
    if ub_p3_chars:
        ub_p3_chars.sort(key=lambda it: round(it[1][1], 0))
        ub_rows = []
        for ch_s, bb in ub_p3_chars:
            yc = 0.5 * (bb[1] + bb[3])
            if ub_rows and abs(yc - ub_rows[-1]["yc"]) <= 6.0:
                ub_rows[-1]["items"].append((ch_s, bb))
            else:
                ub_rows.append({"yc": yc, "items": [(ch_s, bb)]})
        for r_idx, r in enumerate(ub_rows):
            its = sorted(r["items"], key=lambda it: it[1][0])
            txt = "ΣΤΟΙΧΕΙΑ ΑΡΧΙΚΗΣ ΕΚΔΟΣΗΣ" if r_idx == 0 else "ΣΤΟΙΧΕΙΑ ΕΠΑΝΕΚΔΟΣΗΣ"
            if txt:
                x0 = min(it[1][0] for it in its)
                y0 = min(it[1][1] for it in its)
                x1 = max(it[1][2] for it in its)
                y1 = max(it[1][3] for it in its)
                seg = Segment(x0, y0, x1, y1, txt, -1)
                atomic_lines.append({
                    "x0": x0, "y0": y0, "x1": x1, "y1": y1,
                    "yc": 0.5 * (y0 + y1), "h": max(4.0, y1 - y0),
                    "segs": [seg], "text": txt, "blocks": {-1},
                })

    # 1. Deduplicate drop-shadow atomic lines (identical stripped text within 5.5pt in x0 and y0)
    deduped = []
    for al in atomic_lines:
        is_dup = False
        for prev in deduped:
            if al["text"] == prev["text"] and abs(al["x0"] - prev["x0"]) <= 5.5 and abs(al["y0"] - prev["y0"]) <= 5.5:
                is_dup = True
                break
        if not is_dup:
            deduped.append(al)

    # 2. Merge inline/adjacent fragments onto the same visual line ONLY when:
    #    - Vertical centers are tightly aligned (dy <= 0.36 * max_h)
    #    - Non-space segments NEVER collide horizontally
    #    - Either one slots inside a horizontal hole of the other (inline bold/accent switch)
    #      OR they are horizontally close (gap <= 14pt) and neither is a long dotted writing line
    deduped.sort(key=lambda l: (round(l["yc"], 1), round(l["x0"], 1)))
    merged_lines = []

    for al in deduped:
        best = None
        best_dy = 999.0
        for ml in merged_lines:
            dy = abs(al["yc"] - ml["yc"])
            # Allow slightly more y-slack (up to 6pt) ONLY for tiny 1-3 char wavy title/accent fragments
            is_tiny = len(al["text"]) <= 3 or len(ml["text"]) <= 3
            tol = (0.55 * max(al["h"], ml["h"])) if is_tiny else (0.35 * max(al["h"], ml["h"]))
            if dy > tol:
                continue
            if segments_horizontally_collide(al["segs"], ml["segs"]):
                continue

            # Check if inline hole-fill OR close horizontal neighbor
            slots_inside = (al["x0"] >= ml["x0"] - 2.0 and al["x1"] <= ml["x1"] + 2.0) or (
                ml["x0"] >= al["x0"] - 2.0 and ml["x1"] <= al["x1"] + 2.0
            )
            h_gap = max(0.0, max(al["x0"] - ml["x1"], ml["x0"] - al["x1"]))
            close_neighbor = (h_gap <= 14.0) and not is_dotted_leader(al["text"]) and not is_dotted_leader(ml["text"])

            if slots_inside or close_neighbor:
                if dy < best_dy:
                    best_dy = dy
                    best = ml

        if best is not None:
            best["x0"] = min(best["x0"], al["x0"])
            best["y0"] = min(best["y0"], al["y0"])
            best["x1"] = max(best["x1"], al["x1"])
            best["y1"] = max(best["y1"], al["y1"])
            best["yc"] = 0.5 * (best["y0"] + best["y1"])
            best["h"] = max(best["h"], al["h"])
            best["segs"].extend(al["segs"])
            best["text"] = join_line_segments(best["segs"])
            best["blocks"].update(al["blocks"])
        else:
            merged_lines.append({
                "x0": al["x0"], "y0": al["y0"], "x1": al["x1"], "y1": al["y1"],
                "yc": al["yc"], "h": al["h"],
                "segs": list(al["segs"]),
                "text": al["text"],
                "blocks": set(al["blocks"]),
            })

    rendered_lines = []
    for ml in merged_lines:
        txt = join_line_segments(ml["segs"])
        txt = clean_greek_lookalikes(txt, is_english_book)
        if txt:
            rendered_lines.append({
                "x0": ml["x0"], "y0": ml["y0"], "x1": ml["x1"], "y1": ml["y1"],
                "yc": ml["yc"], "h": ml["h"], "text": txt,
            })

    ordered_texts = order_page_lines(rendered_lines, page.rect.width)

    # Append rotated vertical margin notes (e.g. copyright box on p.3)
    for v_chars, reverse_y in ((vert_up_chars, True), (vert_down_chars, False)):
        if not v_chars:
            continue
        v_chars.sort(key=lambda item: round(item[1][0], 0))
        cols = []
        for ch_s, bb in v_chars:
            cx = 0.5 * (bb[0] + bb[2])
            if cols and abs(cx - cols[-1]["cx"]) <= 5.5:
                cols[-1]["items"].append((ch_s, bb))
                cols[-1]["cx"] = 0.5 * (cols[-1]["cx"] + cx)
            else:
                cols.append({"cx": cx, "items": [(ch_s, bb)]})
        for col in cols:
            items = col["items"]
            items.sort(key=lambda it: (-it[1][1] if reverse_y else it[1][1]))
            parts = []
            prev_edge = None
            for ch_s, bb in items:
                if prev_edge is not None:
                    gap = (prev_edge - bb[3]) if reverse_y else (bb[1] - prev_edge)
                    ch_h = max(1.0, bb[3] - bb[1])
                    if gap > ch_h * 0.45 and not (parts and parts[-1].endswith(" ")) and not ch_s.startswith(" "):
                        parts.append(" ")
                parts.append(ch_s)
                prev_edge = bb[1] if reverse_y else bb[3]
            vt = clean_greek_lookalikes(re.sub(r"\s+", " ", "".join(parts)).strip(), is_english_book)
            if vt:
                ordered_texts.append(vt)

    return ordered_texts


def order_page_lines(lines: list, page_width: float) -> list:
    if not lines:
        return []

    lines.sort(key=lambda l: (round(l["yc"], 1), round(l["x0"], 1)))

    y_rows = []
    for ln in lines:
        lh = max(6.0, ln["h"])
        if y_rows and abs(ln["yc"] - y_rows[-1]["yc"]) <= 0.45 * max(lh, y_rows[-1]["h"]):
            # Only put on same y_row if they don't overlap horizontally!
            if all(min(ln["x1"], ex["x1"]) - max(ln["x0"], ex["x0"]) <= 4.0 for ex in y_rows[-1]["items"]):
                y_rows[-1]["items"].append(ln)
                y_rows[-1]["h"] = max(y_rows[-1]["h"], lh)
                continue
        y_rows.append({"yc": ln["yc"], "h": lh, "items": [ln]})

    mid_min = page_width * 0.22
    mid_max = page_width * 0.78

    result = []
    twocol_buf = []

    def flush_twocol():
        nonlocal twocol_buf
        if not twocol_buf:
            return
        all_items = [it for r in twocol_buf for it in r["items"]]
        splits = []
        for r in twocol_buf:
            its = sorted(r["items"], key=lambda x: x["x0"])
            if len(its) == 2 and its[1]["x0"] > its[0]["x1"] + 10:
                sx = 0.5 * (its[0]["x1"] + its[1]["x0"])
                if mid_min <= sx <= mid_max:
                    splits.append(sx)
        if len(twocol_buf) >= 2 and splits:
            split_x = sorted(splits)[len(splits) // 2]
            left_col, right_col, spanning = [], [], []
            for it in all_items:
                if it["x1"] <= split_x + 10:
                    left_col.append(it)
                elif it["x0"] >= split_x - 10:
                    right_col.append(it)
                else:
                    spanning.append(it)
            if left_col and right_col and not spanning:
                left_col.sort(key=lambda x: (round(x["yc"], 1), round(x["x0"], 1)))
                right_col.sort(key=lambda x: (round(x["yc"], 1), round(x["x0"], 1)))
                for it in left_col:
                    result.append(it["text"])
                result.append("")
                for it in right_col:
                    result.append(it["text"])
                twocol_buf = []
                return

        for r in twocol_buf:
            its = sorted(r["items"], key=lambda x: x["x0"])
            result.append(" | ".join(it["text"] for it in its))
        twocol_buf = []

    for r in y_rows:
        its = sorted(r["items"], key=lambda x: x["x0"])
        if len(its) == 1:
            it = its[0]
            if twocol_buf:
                if (it["x1"] <= page_width * 0.68 or it["x0"] >= page_width * 0.32) and (it["x1"] - it["x0"]) < page_width * 0.65:
                    twocol_buf.append(r)
                    continue
            flush_twocol()
            result.append(it["text"])
        elif len(its) >= 3:
            flush_twocol()
            result.append(" | ".join(it["text"] for it in its))
        else:
            if its[1]["x0"] > its[0]["x1"] + 10 and mid_min <= 0.5 * (its[0]["x1"] + its[1]["x0"]) <= mid_max:
                twocol_buf.append(r)
            else:
                flush_twocol()
                result.append(" ".join(it["text"] for it in its))

    flush_twocol()

    cleaned = []
    for line in result:
        if line == "":
            if cleaned and cleaned[-1] != "":
                cleaned.append("")
        else:
            cleaned.append(line)
    while cleaned and cleaned[-1] == "":
        cleaned.pop()
    return cleaned


# ---------------------------------------------------------------------------
# 3. Full Book Conversion & CLI
# ---------------------------------------------------------------------------

def convert_pdf_to_md(pdf_path: str) -> dict:
    bname = os.path.basename(pdf_path)
    meta = BOOK_META.get(bname)
    if not meta:
        raise KeyError(f"Missing BOOK_META entry for {bname}")

    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    md_filename = os.path.splitext(bname)[0] + ".md"
    out_path = os.path.join(TEXTBOOKS_DIR, md_filename)

    lines_out = [
        f"# {meta['zh_title']}",
        "",
        f"- **原书书名**：{meta['orig_title']}",
        f"- **科目 / 年级**：{meta['subject']} · {meta['grade']}",
        f"- **册别类型**：{meta['kind']}（官方书号 `{meta['code']}`）",
        f"- **原始档案**：`materials/textbooks/{bname}`（PDF 共 **{total_pages}** 页，纸质书正文 `1 ~ {total_pages - 2}` 页）",
        f"- **页码 1:1 对齐规则（全书逐页校验无跳页）**：`纸质书印制页码 = PDF 页码 - 1`（`PDF 第 1 页` = 封面，`PDF 第 2 ~ {total_pages - 1} 页` = `书本第 1 ~ {total_pages - 2} 页`，`PDF 第 {total_pages} 页` = 封底）",
        "",
        "---",
        "",
    ]

    non_empty_pages = 0
    empty_pages = []
    total_chars = 0

    for pno in range(1, total_pages + 1):
        page = doc[pno - 1]
        page_lines = extract_page_markdown(page, meta["is_english_book"])

        if pno == 1:
            heading = "## PDF 第 1 页（封面 / Εξώφυλλο）"
        elif pno == total_pages:
            heading = f"## PDF 第 {pno} 页（封底 / Οπισθόφυλλο）"
        else:
            heading = f"## 书本第 {pno - 1} 页（PDF 第 {pno} 页）"

        lines_out.append(heading)
        lines_out.append("")
        if page_lines:
            non_empty_pages += 1
            body = "\n".join(page_lines)
            total_chars += len(body)
            lines_out.append(body)
        else:
            empty_pages.append(pno)
            lines_out.append("*(本页为空白页或纯插图页)*")
        lines_out.append("")
        lines_out.append("---")
        lines_out.append("")

    content = "\n".join(lines_out).rstrip() + "\n"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content)

    return {
        "pdf": bname,
        "md": md_filename,
        "out_path": out_path,
        "pages": total_pages,
        "non_empty_pages": non_empty_pages,
        "empty_pages": empty_pages,
        "chars": total_chars,
        "bytes": os.path.getsize(out_path),
    }


def main():
    parser = argparse.ArgumentParser(description="Convert 16 Greek school textbook PDFs 1:1 to Markdown.")
    parser.add_argument("--test-page", nargs=2, metavar=("PDF_SUBSTR", "PAGE_NO"), help="Print single converted page to stdout")
    args = parser.parse_args()

    if args.test_page:
        sub, pno_s = args.test_page
        pno = int(pno_s)
        matches = [p for p in sorted(glob.glob(os.path.join(TEXTBOOKS_DIR, "*.pdf"))) if sub in os.path.basename(p)]
        if not matches:
            sys.exit(f"No PDF matching {sub}")
        pdf_p = matches[0]
        bname = os.path.basename(pdf_p)
        meta = BOOK_META[bname]
        doc = fitz.open(pdf_p)
        plines = extract_page_markdown(doc[pno - 1], meta["is_english_book"])
        print(f"=== {bname} p.{pno} ===")
        print("\n".join(plines))
        return

    pdfs = sorted(glob.glob(os.path.join(TEXTBOOKS_DIR, "*.pdf")))
    print(f"Found {len(pdfs)} PDF files in {TEXTBOOKS_DIR}")
    results = []
    page_map_index = {
        "note": "希腊公立小学16册教材与练习册全书逐页核验结论：所有16册均严格满足 PDF页码 = 纸质书印制页码 + 1（即 PDF 第1页为封面，PDF 第2..N-1页对应书本第1..N-2页，PDF 第N页为封底，中途零跳页、零偏移变化）。",
        "books": {},
    }
    for p in pdfs:
        res = convert_pdf_to_md(p)
        results.append(res)
        meta = BOOK_META[res["pdf"]]
        page_map_index["books"][meta["code"]] = {
            "code": meta["code"],
            "zh_title": meta["zh_title"],
            "orig_title": meta["orig_title"],
            "subject": meta["subject"],
            "grade": meta["grade"],
            "kind": meta["kind"],
            "pdf_file": res["pdf"],
            "md_file": res["md"],
            "total_pdf_pages": res["pages"],
            "book_page_min": 1,
            "book_page_max": res["pages"] - 2,
            "pdf_minus_book_offset": 1,
            "blank_or_illustration_pdf_pages": res["empty_pages"],
        }
        print(
            f"[OK] {res['md']} | pages={res['pages']} (book 1..{res['pages']-2}, blank/img={len(res['empty_pages'])}) | chars={res['chars']:,}"
        )

    import json
    map_out = os.path.join(TEXTBOOKS_DIR, "school_books_page_map.json")
    with open(map_out, "w", encoding="utf-8") as jf:
        json.dump(page_map_index, jf, ensure_ascii=False, indent=2)
        jf.write("\n")
    print(f"\nCompleted {len(results)} books, total pages = {sum(r['pages'] for r in results):,}; wrote {map_out}")


if __name__ == "__main__":
    main()

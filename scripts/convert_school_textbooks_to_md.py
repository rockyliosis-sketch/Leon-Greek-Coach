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
    "G": "◆",
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
            if c in ("\x00", "\x01", "\x03"):
                continue
            if c == "\xad":
                out.append(("\xad", ch_obj["bbox"]))
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
            if c in ("\x00", "\x01", "\x03"):
                continue
            if c == "\xad":
                out.append(("\xad", ch_obj["bbox"]))
                continue
            dc = MACGREEK_MAP.get(c, c) if has_macgreek else c
            out.append((dc, ch_obj["bbox"]))
        return out

    if base_font.startswith("ZapfDingbats") or base_font in ("Wingdings-Regular", "Webdings"):
        out = []
        prev_sym = None
        for ch_obj in raw_chars:
            c = ch_obj["c"]
            if c in ("\x00", "\x01", "\x03", "\x07", " "):
                continue
            if c == "\x13":
                dc = "✓ "
            elif c == "ê":
                dc = "➤ "
            elif base_font.startswith("ZapfDingbats") and c in ZAPF_ASCII_DINGBAT_MAP:
                dc = ZAPF_ASCII_DINGBAT_MAP[c] + " "
            elif c == "Õ":
                dc = "→"
            else:
                dc = PUA_AND_DINGBAT_MAP.get(c, "")
            if dc:
                # Collapse doubled decorative dingbats like 'GG' -> single '◆ '
                if prev_sym == dc:
                    continue
                prev_sym = dc
                out.append((dc, ch_obj["bbox"]))
        return out

    out = []
    for ch_obj in raw_chars:
        c = ch_obj["c"]
        if ord(c) < 32 and c not in ("\t", "\n", "\r"):
            if c == "\x07":
                out.append((" ", ch_obj["bbox"]))
            continue
        if 0x7F <= ord(c) <= 0x9F:
            continue
        if c == "\xad":
            out.append(("\xad", ch_obj["bbox"]))
            continue
        if c == "\u2008":
            out.append((" ", ch_obj["bbox"]))
            continue
        if c in PUA_AND_DINGBAT_MAP:
            out.append((PUA_AND_DINGBAT_MAP[c], ch_obj["bbox"]))
            continue
        if 0xE000 <= ord(c) <= 0xF8FF:
            out.append(("• ", ch_obj["bbox"]))
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
            prev_t = prev_seg.text.strip()
            # Standalone 1-2 digit exercise number on the left gutter joins with space, not '|'
            is_left_ex_num = bool(re.match(r"^\d{1,2}[.)]?$", prev_t)) and gap <= 62.0
            if gap > 36.0 and not is_left_ex_num and not is_dotted_leader(prev_seg.text) and not is_dotted_leader(seg.text):
                parts.append(" | ")
            elif gap > max(2.6, h * 0.22) or is_left_ex_num:
                if not prev_seg.text.endswith(" ") and not seg.text.startswith(" "):
                    if seg.text.lstrip()[:1] not in ("’", "'", ",", ".", ";", ":", ")", "»", "!") and prev_seg.text.rstrip()[-1:] not in ("’", "'", "(", "«"):
                        parts.append(" ")
        parts.append(seg.text)
        prev_seg = seg

    s = "".join(parts)
    s = re.sub(r"[ \t]{2,}", " ", s)
    return s.strip()


_GREEK_SHORT_WORDS = {
    "Ο", "Η", "Το", "Οι", "Τα", "Τον", "Την", "Των", "Τους", "Τις",
    "ο", "η", "το", "οι", "τα", "τον", "την", "των", "τους", "τις", "του", "της",
    "Στο", "Στα", "Στη", "Στην", "Στον", "Στους", "Στις",
    "στο", "στα", "στη", "στην", "στον", "στους", "στις",
    "Με", "με", "Για", "για", "Από", "από", "Και", "και", "Κι", "κι",
    "Σε", "σε", "Προς", "προς", "ως", "Ως", "να", "Να", "θα", "Θα",
    "Ένα", "Ένας", "Μια", "ένα", "ένας", "μια",
}

_RUNNING_BANNER_RE = re.compile(
    r"^(?:\d{1,3}\s*(?:\|\s*)?)?(?:ΣΤΑ ΑΡΧΑΙΑ ΧΡΟΝΙΑ|ΑΠΟ ΤΗ ΜΥΘΟΛΟΓΙΑ ΣΤΗΝ ΙΣΤΟΡΙΑ|.*[●•]\s*ΓΛΩΣΣΑ\s*[ΓΔ][΄'´]?\s*ΔΗΜΟΤΙΚΟΥ|ΓΛΩΣΣΑ\s*[ΓΔ][΄'´]?\s*ΔΗΜΟΤΙΚΟΥ\s*[●•].*)(?:\s*(?:\|\s*)?\d{1,3})?$",
    re.I,
)

_HEADING_TEXT_RE = re.compile(
    r"^(?:###\s+|ΕΝΟΤΗΤΑ\b|\d+\s*ΕΝΟΤΗΤΑ\b|Ενότητα\s*\d+|ΚΕΦΑΛΑΙΟ\s*\d+|Κεφάλαιο\s*\d+|Unit\s+\d+|Lesson\s+\d+|παράθεμα\s*\d+|Παράθεμα\s*\d+|Οριζόντια$|Κάθετα$)",
    re.I,
)

_NEW_ITEM_START_RE = re.compile(
    r"^(?:"
    r"[•◆▪❑❒▲▼❖☐✓✕✖✗✘➤—–]\s*"
    r"|(?:\d{1,2}[.)]|[α-ωΑ-Ωa-zA-Z][.)])\s+"
    r"|\d{1,2}\s+[Α-ΩΆ-ΏA-Z«\"“]"
    r"|[Α-ΩΆ-ΏA-Z][\wά-ώϊϋΐΰ.\s]{0,16}:\s+"
    r")"
)

_TERMINAL_PUNCT_RE = re.compile(r"[.;!?:»”…)…]$")
_WORD_CHAR_RE = re.compile(r"[A-Za-z\u0370-\u03FF\u1F00-\u1FFFά-ώϊϋΐΰΆ-ΏΪΫ]")


def normalize_inline_dots(text: str) -> str:
    """Turn long inline dot/underscore leaders inside a text line into a clean blank marker."""
    if is_dotted_leader(text):
        return "[✏️ 纸质书作答横线]"
    s = re.sub(r"(?:[._…]\s*){6,}", " ______ ", text)
    s = re.sub(r"[ \t]{2,}", " ", s).strip()
    return s


def join_across_linebreak(a: str, b: str) -> str:
    """Join two consecutive lines of the same paragraph, rejoining hyphenated words cleanly."""
    a_s = a.rstrip()
    b_s = b.lstrip()
    if not a_s:
        return b_s
    if not b_s:
        return a_s

    # 1. Explicit PDF soft hyphen (\xad) at end of line A
    if a_s.endswith("\xad"):
        stem = a_s[:-1].rstrip("\xad")
        if b_s[:1].isupper():
            return f"{stem}-{b_s}"
        return f"{stem}{b_s}"

    # 2. Line-end hyphen ('-' or non-breaking '‑') attached directly to a letter
    if len(a_s) >= 2 and a_s[-1] in ("-", "‑") and _WORD_CHAR_RE.match(a_s[-2]) and _WORD_CHAR_RE.match(b_s[:1]):
        stem = a_s[:-1]
        if b_s[:1].isupper():
            return f"{stem}-{b_s}"
        return f"{stem}{b_s}"

    return f"{a_s} {b_s}"


def line_ends_with_hyphen(text: str) -> bool:
    t = text.rstrip()
    if t.endswith("\xad"):
        return True
    return len(t) >= 2 and t[-1] in ("-", "‑") and bool(_WORD_CHAR_RE.match(t[-2]))


def reconstruct_curved_titles(raw_blocks: list, is_english_book: bool, book_pno: int):
    """
    Detect arched/wave decorative lesson titles (e.g. 'Οι μικροί ταξιδιώτες ανεβαίνουν στο βουνό')
    where glyphs sit along a curved path at sz >= 17.5 in the upper band of the page.
    Returns (curved_atomic_lines, consumed_span_keys).
    """
    consumed = set()
    curved_lines = []
    if book_pno < 1:
        return curved_lines, consumed

    groups = {}
    for b_idx, block in enumerate(raw_blocks):
        if block.get("type") != 0:
            continue
        for l_idx, line in enumerate(block.get("lines", [])):
            dx_dir, dy_dir = line.get("dir", (1.0, 0.0))
            if abs(dx_dir) < 0.5:
                continue
            for s_idx, span in enumerate(line.get("spans", [])):
                raw_chars = span.get("chars", [])
                if not raw_chars:
                    continue
                sz = round(span.get("size", 0.0), 1)
                y0 = span.get("bbox", (0, 999, 0, 999))[1]
                base_f = span.get("font", "").split("+")[-1]
                if sz >= 17.5 and y0 < 195.0:
                    groups.setdefault((base_f, sz), []).append(
                        (b_idx, l_idx, s_idx, dy_dir, span)
                    )

    for (base_f, sz), items in groups.items():
        if len(items) < 2 or not any(abs(it[3]) >= 0.025 for it in items):
            continue

        # Decode each span, deduplicate drop shadows, and sort spans left-to-right
        span_pieces = []
        for b_idx, l_idx, s_idx, dy_dir, span in items:
            decoded = decode_span(span.get("font", ""), span.get("chars", []))
            if not decoded:
                continue
            txt = "".join(ch for ch, _ in decoded)
            if not txt.strip():
                continue
            non_sp = [bb for ch, bb in decoded if ch.strip()]
            boxes = non_sp if non_sp else [bb for _, bb in decoded]
            sx0 = min(b[0] for b in boxes)
            sy0 = min(b[1] for b in boxes)
            sx1 = max(b[2] for b in boxes)
            sy1 = max(b[3] for b in boxes)
            span_pieces.append({
                "key": (b_idx, l_idx, s_idx),
                "x0": sx0, "y0": sy0, "x1": sx1, "y1": sy1,
                "yc": 0.5 * (sy0 + sy1),
                "text": txt,
            })

        if len(span_pieces) < 2:
            continue
        span_pieces.sort(key=lambda sp: (round(sp["x0"], 1), round(sp["y0"], 1)))

        # Deduplicate drop-shadow pieces
        dedup_pieces = []
        for sp in span_pieces:
            if any(
                sp["text"] == prev["text"]
                and abs(sp["x0"] - prev["x0"]) <= 5.5
                and abs(sp["y0"] - prev["y0"]) <= 5.5
                for prev in dedup_pieces
            ):
                consumed.add(sp["key"])
                continue
            dedup_pieces.append(sp)

        if len(dedup_pieces) < 2:
            continue

        # Verify pieces form a smooth horizontal chain (no huge vertical jump > 32pt between neighbors)
        if any(abs(dedup_pieces[i + 1]["yc"] - dedup_pieces[i]["yc"]) > 34.0 for i in range(len(dedup_pieces) - 1)):
            continue

        parts = []
        prev_sp = None
        for sp in dedup_pieces:
            consumed.add(sp["key"])
            if prev_sp is not None:
                gap = sp["x0"] - prev_sp["x1"]
                prev_clean = clean_greek_lookalikes(prev_sp["text"], is_english_book).strip()
                need_space = (
                    not prev_sp["text"].endswith(" ")
                    and not sp["text"].startswith(" ")
                    and (
                        gap > 1.3
                        or (len(prev_clean) >= 2 and prev_clean in _GREEK_SHORT_WORDS and gap >= -0.5)
                        or (gap >= -1.2 and prev_clean[-1:] in "ς!;,.:?")
                    )
                )
                if need_space:
                    parts.append(" ")
            parts.append(sp["text"])
            prev_sp = sp

        full_title = clean_greek_lookalikes(re.sub(r"\s+", " ", "".join(parts)).strip(), is_english_book)
        full_title = re.sub(r"\b(Οι|Τα|Το)(?=[μβγζθλνξπρτφχψ])", r"\1 ", full_title)
        if full_title:
            tx0 = min(sp["x0"] for sp in dedup_pieces)
            ty0 = min(sp["y0"] for sp in dedup_pieces)
            tx1 = max(sp["x1"] for sp in dedup_pieces)
            ty1 = max(sp["y1"] for sp in dedup_pieces)
            seg = Segment(tx0, ty0, tx1, ty1, f"### {full_title}", -2)
            curved_lines.append({
                "x0": tx0, "y0": ty0, "x1": tx1, "y1": ty1,
                "yc": 0.5 * (ty0 + ty1),
                "h": max(18.0, ty1 - ty0),
                "sz": sz,
                "segs": [seg],
                "text": f"### {full_title}",
                "blocks": {-2},
            })

    return curved_lines, consumed


def extract_page_markdown(page: fitz.Page, is_english_book: bool, book_pno: int = 0) -> list:
    raw = page.get_text("rawdict")
    raw_blocks = raw.get("blocks", [])
    page_w = page.rect.width
    page_h = page.rect.height

    curved_lines, consumed_curved = reconstruct_curved_titles(raw_blocks, is_english_book, book_pno)

    atomic_lines = list(curved_lines)
    vert_up_chars = []
    vert_down_chars = []
    ub_p3_chars = []

    for b_idx, block in enumerate(raw_blocks):
        if block.get("type") != 0:
            continue
        for l_idx, line in enumerate(block.get("lines", [])):
            dx_dir, dy_dir = line.get("dir", (1.0, 0.0))

            # Check rotated vertical lines first
            if abs(dx_dir) < 0.45 and abs(dy_dir) > 0.7:
                for span in line.get("spans", []):
                    sz = span.get("size", 10.0)
                    # Skip tiny vertical photo credits on lesson pages (keep copyright on p.1-3)
                    if book_pno >= 4 and sz <= 9.5:
                        continue
                    decoded = decode_span(span.get("font", ""), span.get("chars", []))
                    for ch_s, bb in decoded:
                        if dy_dir < 0:
                            vert_up_chars.append((ch_s, bb))
                        else:
                            vert_down_chars.append((ch_s, bb))
                continue

            line_segs = []
            max_sz = 0.0
            alpha_sz = 0.0
            for s_idx, span in enumerate(line.get("spans", [])):
                if (b_idx, l_idx, s_idx) in consumed_curved:
                    continue
                raw_chars = span.get("chars", [])
                if not raw_chars:
                    continue
                sz = float(span.get("size", 12.0))
                if sz > max_sz:
                    max_sz = sz
                base_f = span.get("font", "").split("+")[-1]
                span_raw_txt = "".join(c["c"] for c in raw_chars)
                if not base_f.startswith("ZapfDingbats") and base_f not in ("Wingdings-Regular", "Webdings"):
                    if any(_WORD_CHAR_RE.match(ch) for ch in span_raw_txt) and sz > alpha_sz:
                        alpha_sz = sz
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
                        "sz": alpha_sz or max_sz or max(4.0, y1 - y0),
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
                    "yc": 0.5 * (y0 + y1), "h": max(4.0, y1 - y0), "sz": 14.0,
                    "segs": [seg], "text": txt, "blocks": {-1},
                })

    # 1. Deduplicate drop-shadow atomic lines
    deduped = []
    for al in atomic_lines:
        is_dup = False
        for prev in deduped:
            if al["text"] == prev["text"] and abs(al["x0"] - prev["x0"]) <= 5.5 and abs(al["y0"] - prev["y0"]) <= 5.5:
                is_dup = True
                break
        if not is_dup:
            deduped.append(al)

    # 2. Merge inline/adjacent fragments onto the same visual line
    deduped.sort(key=lambda l: (round(l["yc"], 1), round(l["x0"], 1)))
    merged_lines = []

    for al in deduped:
        if al["text"].startswith("### "):
            merged_lines.append(al)
            continue
        best = None
        best_dy = 999.0
        for ml in merged_lines:
            if ml["text"].startswith("### "):
                continue
            dy = abs(al["yc"] - ml["yc"])
            is_tiny = len(al["text"]) <= 3 or len(ml["text"]) <= 3
            tol = (0.55 * max(al["h"], ml["h"])) if is_tiny else (0.35 * max(al["h"], ml["h"]))
            if dy > tol:
                continue
            if segments_horizontally_collide(al["segs"], ml["segs"]):
                continue

            slots_inside = (al["x0"] >= ml["x0"] - 2.0 and al["x1"] <= ml["x1"] + 2.0) or (
                ml["x0"] >= al["x0"] - 2.0 and ml["x1"] <= al["x1"] + 2.0
            )
            h_gap = max(0.0, max(al["x0"] - ml["x1"], ml["x0"] - al["x1"]))
            left_item = al if al["x0"] < ml["x0"] else ml
            is_ex_badge = bool(re.match(r"^\d{1,2}[.)]?$", left_item["text"].strip())) and h_gap <= 60.0
            close_neighbor = (h_gap <= 14.0 or is_ex_badge) and not is_dotted_leader(al["text"]) and not is_dotted_leader(ml["text"])

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
            best["sz"] = max(best["sz"], al["sz"])
            best["segs"].extend(al["segs"])
            best["text"] = join_line_segments(best["segs"])
            best["blocks"].update(al["blocks"])
        else:
            merged_lines.append({
                "x0": al["x0"], "y0": al["y0"], "x1": al["x1"], "y1": al["y1"],
                "yc": al["yc"], "h": al["h"], "sz": al["sz"],
                "segs": list(al["segs"]),
                "text": al["text"],
                "blocks": set(al["blocks"]),
            })

    rendered_lines = []
    for ml in merged_lines:
        txt = ml["text"] if ml["text"].startswith("### ") else join_line_segments(ml["segs"])
        txt = clean_greek_lookalikes(txt, is_english_book)
        if txt:
            rendered_lines.append({
                "x0": ml["x0"], "y0": ml["y0"], "x1": ml["x1"], "y1": ml["y1"],
                "yc": ml["yc"], "h": ml["h"], "sz": ml["sz"],
                "text": txt,
                "blocks": ml["blocks"],
            })

    # Detect TOC page so we never strip page numbers or reflow TOC entries
    full_raw_text = "\n".join(l["text"] for l in rendered_lines)
    is_toc_page = bool(re.search(r"\b(?:Περιεχόμενα|ΠΕΡΙΕΧΟΜΕΝΑ|Contents|CONTENTS)\b", full_raw_text))

    # 3. Strip corner page numbers & repetitive running banners on body pages
    if book_pno >= 2 and not is_toc_page:
        filtered = []
        for ln in rendered_lines:
            t_clean = ln["text"].replace("\xad", "").strip()
            in_header_or_footer = (ln["y0"] < 56.0) or (ln["y1"] > page_h - 56.0)
            if in_header_or_footer and t_clean == str(book_pno):
                continue
            if ln["y0"] < 52.0 and _RUNNING_BANNER_RE.match(t_clean):
                continue
            filtered.append(ln)
        rendered_lines = filtered

    # 4. Separate outer-margin glossary / sidebar boxes (e.g. History & Glossa side notes)
    main_lines, sidebar_callouts = separate_margin_sidebars(rendered_lines, page_w, is_toc_page)

    # 5. Order & reflow main content into structured paragraphs, poems, tables & headings
    ordered_texts = order_and_reflow_page(main_lines, page_w, is_toc_page)

    # Append sidebar callouts cleanly at the bottom of the page
    if sidebar_callouts:
        if ordered_texts and ordered_texts[-1] != "":
            ordered_texts.append("")
        for sc in sidebar_callouts:
            ordered_texts.append(sc)

    # Append rotated vertical margin notes ONLY when kept (e.g. copyright box on p.3)
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
            vt = vt.replace("\xad", "")
            if vt and not (book_pno >= 4 and re.match(r"^(?:Φωτ|Πηγή|Photo)", vt, re.I)):
                if ordered_texts and ordered_texts[-1] != "":
                    ordered_texts.append("")
                ordered_texts.append(vt)

    # Final pass: remove any residual soft hyphens (\xad) and collapse excess blank lines
    final_lines = []
    for line in ordered_texts:
        clean_l = line.replace("\xad", "").rstrip()
        if clean_l == "":
            if final_lines and final_lines[-1] != "":
                final_lines.append("")
        else:
            final_lines.append(clean_l)
    while final_lines and final_lines[-1] == "":
        final_lines.pop()

    return final_lines


def separate_margin_sidebars(lines: list, page_w: float, is_toc_page: bool):
    """
    Detect narrow outer-margin glossary / note blocks (left margin x1 <= 0.28*W or right margin x0 >= 0.72*W)
    when wider main-column content coexists on the page, and format them as `> 📌 ...` callouts.
    """
    if is_toc_page or len(lines) < 4:
        return lines, []

    # Group lines by primary PDF block_idx when single-block
    by_block = {}
    for idx, ln in enumerate(lines):
        b_id = min(ln["blocks"]) if len(ln["blocks"]) == 1 else -(idx + 100)
        by_block.setdefault(b_id, []).append(ln)

    # Check if there is substantial central/main content
    has_main_center = any((ln["x1"] - ln["x0"]) >= page_w * 0.34 for ln in lines)
    if not has_main_center:
        return lines, []

    sidebar_line_ids = set()
    sidebar_blocks = []

    for b_id, blines in by_block.items():
        if b_id < 0 or len(blines) < 2:
            continue
        bx0 = min(l["x0"] for l in blines)
        bx1 = max(l["x1"] for l in blines)
        by0 = min(l["y0"] for l in blines)
        by1 = max(l["y1"] for l in blines)
        bw = bx1 - bx0
        max_sz = max(l["sz"] for l in blines)

        in_left_margin = bx1 <= page_w * 0.275
        in_right_margin = bx0 >= page_w * 0.725
        if not (in_left_margin or in_right_margin):
            continue
        if bw > page_w * 0.25 or max_sz > 12.8:
            continue
        if any(" | " in l["text"] or is_dotted_leader(l["text"]) for l in blines):
            continue

        # Must horizontally coexist with non-margin lines on the page (so we never grab a standalone narrow poem)
        has_complement = any(
            id(other) not in {id(x) for x in blines}
            and ((other["x0"] >= bx1 + 8.0) if in_left_margin else (other["x1"] <= bx0 - 8.0))
            and (min(other["y1"], by1 + 40.0) - max(other["y0"], by0 - 40.0) > 0)
            for other in lines
        )
        if not has_complement:
            continue

        blines_sorted = sorted(blines, key=lambda l: (round(l["yc"], 1), round(l["x0"], 1)))
        merged_txt = ""
        for l in blines_sorted:
            t = normalize_inline_dots(l["text"])
            merged_txt = join_across_linebreak(merged_txt, t) if merged_txt else t
        merged_txt = merged_txt.replace("\xad", "").strip()
        if len(merged_txt) >= 8:
            # Bold leading glossary term before ':' if present
            m_term = re.match(r"^([^:]{2,42}):\s+(.+)$", merged_txt)
            if m_term:
                callout = f"> 📌 **{m_term.group(1).strip()}:** {m_term.group(2).strip()}"
            else:
                callout = f"> 📌 {merged_txt}"
            sidebar_blocks.append((by0, callout))
            for l in blines:
                sidebar_line_ids.add(id(l))

    if not sidebar_line_ids:
        return lines, []

    sidebar_blocks.sort(key=lambda x: x[0])
    remaining = [l for l in lines if id(l) not in sidebar_line_ids]
    return remaining, [c for _, c in sidebar_blocks]


def is_heading_line(ln: dict) -> bool:
    t = ln["text"].replace("\xad", "").strip()
    if t.startswith("### "):
        return True
    if " | " in t or is_dotted_leader(t):
        return False
    if _HEADING_TEXT_RE.match(t) and len(t) <= 95:
        return True
    if ln["sz"] >= 18.2 and len(t) <= 80 and not t.endswith(","):
        # Exclude lines ending with standalone articles/prepositions (drop-cap story lead-in lines!)
        last_tok = t.split()[-1] if t.split() else ""
        if last_tok not in _GREEK_SHORT_WORDS and not re.match(r"^[•◆▪❑❒▲▼❖☐✓➤]\s+\w+\s+\w+\s+\w+", t):
            return True
    return False


def format_heading_text(text: str) -> str:
    t = text.replace("\xad", "").strip()
    if t.startswith("### "):
        return t
    # Normalize "1 ΕΝΟΤΗΤΑ" -> "ΕΝΟΤΗΤΑ 1"
    m = re.match(r"^(\d{1,2})\s+(ΕΝΟΤΗΤΑ)$", t)
    if m:
        t = f"{m.group(2)} {m.group(1)}"
    return f"### {t}"


def is_poem_run(run: list, page_w: float) -> bool:
    """Detect short-line verse / song blocks vs. justified prose."""
    if len(run) < 4:
        return False
    widths = [l["x1"] - l["x0"] for l in run]
    max_w = max(widths)
    sorted_w = sorted(widths)
    med_w = sorted_w[len(sorted_w) // 2]
    if max_w > page_w * 0.44 or med_w > page_w * 0.35:
        return False
    # Poems rarely hyphenate words across line ends
    if any(line_ends_with_hyphen(l["text"]) for l in run):
        return False
    # Poems don't start with numbered exercises or bullets
    if sum(1 for l in run if _NEW_ITEM_START_RE.match(l["text"].strip())) >= 2:
        return False
    # Check if right edge is justified (narrow prose column like History source box hits same x1!)
    col_right = max(l["x1"] for l in run)
    near_right = sum(1 for l in run[:-1] if col_right - l["x1"] <= 8.0)
    if len(run) >= 4 and near_right >= (len(run) - 1) * 0.65:
        return False
    return True


def reflow_column_lines(col_lines: list, page_w: float, is_toc_page: bool) -> list:
    """
    Reflow a single reading column of lines into clean Markdown blocks:
      - `### Heading`
      - Single-line reflowed prose paragraphs (separated by `""`)
      - Multi-line poem stanzas (verses separated by `\n`, stanzas separated by `""`)
      - Table rows (`|`) and collapsed `[✏️ 纸质书作答横线]`
    """
    if not col_lines:
        return []
    if is_toc_page:
        return [normalize_inline_dots(l["text"]) for l in col_lines]

    out = []
    n = len(col_lines)
    i = 0

    while i < n:
        ln = col_lines[i]
        raw_t = ln["text"].strip()

        # 1. Pure dotted writing lines -> collapse consecutive ones into a single marker
        if is_dotted_leader(raw_t):
            while i + 1 < n and is_dotted_leader(col_lines[i + 1]["text"].strip()):
                i += 1
            if out and out[-1] != "" and not out[-1].endswith("[✏️ 纸质书作答横线]"):
                out.append("[✏️ 纸质书作答横线]")
            elif not out or out[-1] == "":
                out.append("[✏️ 纸质书作答横线]")
            i += 1
            continue

        # 2. Table row containing ' | '
        if " | " in raw_t:
            if out and out[-1] != "":
                out.append("")
            while i < n and " | " in col_lines[i]["text"]:
                out.append(normalize_inline_dots(col_lines[i]["text"]))
                i += 1
            out.append("")
            continue

        # 3. Headings (merge stacked subtitle immediately below if both are headings, e.g. ΚΕΦΑΛΑΙΟ 4 + Η τέχνη...)
        if is_heading_line(ln):
            h_txt = format_heading_text(raw_t)[4:].strip()
            while (
                i + 1 < n
                and is_heading_line(col_lines[i + 1])
                and (col_lines[i + 1]["y0"] - col_lines[i]["y1"]) <= 22.0
                and col_lines[i + 1]["text"].strip() not in ("Οριζόντια", "Κάθετα")
                and h_txt not in ("Οριζόντια", "Κάθετα")
            ):
                nxt_h = format_heading_text(col_lines[i + 1]["text"].strip())[4:].strip()
                if nxt_h and nxt_h != h_txt:
                    sep = " " if h_txt.endswith(":") else " · "
                    h_txt = f"{h_txt}{sep}{nxt_h}"
                i += 1
            if out and out[-1] != "":
                out.append("")
            out.append(f"### {h_txt}")
            out.append("")
            i += 1
            continue

        # 4. Collect contiguous normal lines up to the next heading / table / pure dotted line
        run = []
        while i < n:
            cur = col_lines[i]
            ct = cur["text"].strip()
            if is_dotted_leader(ct) or " | " in ct or is_heading_line(cur):
                break
            run.append(cur)
            i += 1

        if not run:
            continue

        # 4a. Poem / Song stanza preservation
        if is_poem_run(run, page_w):
            if out and out[-1] != "":
                out.append("")
            steps = [
                run[k + 1]["yc"] - run[k]["yc"]
                for k in range(len(run) - 1)
                if run[k + 1]["yc"] > run[k]["yc"]
            ]
            med_step = sorted(steps)[len(steps) // 2] if steps else 18.0
            for k, pln in enumerate(run):
                if k > 0:
                    step = pln["yc"] - run[k - 1]["yc"]
                    # Author attribution at the bottom of a poem or stanza gap
                    is_author = bool(re.search(r"\bεκδ\.|\b\d{4}\b", pln["text"])) and k >= len(run) - 3
                    if step > med_step * 1.45 or (is_author and k > 0 and not re.search(r"\bεκδ\.", run[k - 1]["text"])):
                        out.append("")
                out.append(normalize_inline_dots(pln["text"]))
            out.append("")
            continue

        # 4b. Prose / Exercise / Dialogue paragraph reflow
        # Compute baseline left & right edges of this text run
        xs_left = sorted(l["x0"] for l in run)
        col_left = xs_left[len(xs_left) // 4] if len(xs_left) >= 4 else min(xs_left)
        col_right = max(l["x1"] for l in run)

        cur_para = normalize_inline_dots(run[0]["text"])
        prev_l = run[0]

        for nxt_l in run[1:]:
            nxt_txt = normalize_inline_dots(nxt_l["text"])
            v_gap = nxt_l["y0"] - prev_l["y1"]
            max_h = max(prev_l["h"], nxt_l["h"])

            # Centered speech bubble check (same horizontal midpoint within 12pt)
            prev_mid = 0.5 * (prev_l["x0"] + prev_l["x1"])
            nxt_mid = 0.5 * (nxt_l["x0"] + nxt_l["x1"])
            is_centered_pair = abs(prev_mid - nxt_mid) <= 13.0 and (prev_l["x0"] > col_left + 6 or nxt_l["x0"] > col_left + 6)

            starts_new_item = bool(_NEW_ITEM_START_RE.match(nxt_txt))
            is_biblio = bool(re.match(r"^(?:[Α-ΩΆ-Ώ]\.\s*[Α-ΩΆ-Ώα-ωά-ώ]+,|[Α-ΩΆ-Ώα-ωά-ώ]+\s+[Α-ΩΆ-Ώα-ωά-ώ]+,\s*[«A-ZΑ-ΩΆ-Ώ])", nxt_txt)) and prev_l["text"].rstrip().endswith((".", "!", "»", ";"))
            large_v_gap = v_gap > max(9.0, 0.72 * max_h)
            sz_jump = abs(nxt_l["sz"] - prev_l["sz"]) > 2.6 and not (prev_l is run[0] and not _TERMINAL_PUNCT_RE.search(prev_l["text"].rstrip()))

            prev_ended_sentence = bool(_TERMINAL_PUNCT_RE.search(prev_l["text"].replace("\xad", "").rstrip()))
            prev_ended_short = prev_ended_sentence and (prev_l["x1"] < col_right - 34.0) and not is_centered_pair
            nxt_is_indented = (
                (nxt_l["x0"] > col_left + 8.5)
                and not is_centered_pair
                and not line_ends_with_hyphen(prev_l["text"])
                and prev_ended_sentence
            )

            should_break = (
                starts_new_item
                or is_biblio
                or large_v_gap
                or sz_jump
                or prev_ended_short
                or nxt_is_indented
            )

            if should_break:
                if out and out[-1] != "":
                    out.append("")
                out.append(cur_para)
                out.append("")
                cur_para = nxt_txt
            else:
                cur_para = join_across_linebreak(cur_para, nxt_txt)

            prev_l = nxt_l

        if cur_para:
            if out and out[-1] != "":
                out.append("")
            out.append(cur_para)
            out.append("")

    return out


def flush_twocol_region(twocol_buf: list, page_w: float, is_toc_page: bool, prev_line_was_table_header: bool) -> list:
    """Handle a 2-column region: either row-paired comparison table OR Left-Col then Right-Col reflow."""
    if not twocol_buf:
        return []

    mid_min = page_w * 0.22
    mid_max = page_w * 0.78
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
            # Check if this is a row-paired comparison table (like 'Τι διάβασε | Τι κατάλαβε')
            if prev_line_was_table_header:
                # Reflow each PDF block cell on left & right, then pair by matching y0!
                def group_cells(col_items):
                    by_b = {}
                    for idx, x in enumerate(col_items):
                        bid = min(x["blocks"]) if len(x["blocks"]) == 1 else -(idx + 1)
                        by_b.setdefault(bid, []).append(x)
                    cells = []
                    for _, clines in by_b.items():
                        clines.sort(key=lambda z: z["yc"])
                        txt = ""
                        for cl in clines:
                            t = normalize_inline_dots(cl["text"])
                            txt = join_across_linebreak(txt, t) if txt else t
                        cells.append({"y0": min(z["y0"] for z in clines), "yc": 0.5 * (min(z["y0"] for z in clines) + max(z["y1"] for z in clines)), "text": txt})
                    cells.sort(key=lambda c: c["y0"])
                    return cells

                l_cells = group_cells(left_col)
                r_cells = group_cells(right_col)
                if len(l_cells) == len(r_cells) and len(l_cells) >= 2:
                    return [f"{lc['text']} | {rc['text']}" for lc, rc in zip(l_cells, r_cells)]

            left_col.sort(key=lambda x: (round(x["yc"], 1), round(x["x0"], 1)))
            right_col.sort(key=lambda x: (round(x["yc"], 1), round(x["x0"], 1)))
            res = []
            res.extend(reflow_column_lines(left_col, page_w, is_toc_page))
            if res and res[-1] != "":
                res.append("")
            res.extend(reflow_column_lines(right_col, page_w, is_toc_page))
            return res

    # Fallback: join items on each row
    fallback_lines = []
    for r in twocol_buf:
        its = sorted(r["items"], key=lambda x: x["x0"])
        if len(its) >= 2:
            fallback_lines.append({
                "x0": its[0]["x0"], "y0": min(x["y0"] for x in its),
                "x1": its[-1]["x1"], "y1": max(x["y1"] for x in its),
                "yc": r["yc"], "h": r["h"], "sz": max(x["sz"] for x in its),
                "text": " | ".join(it["text"] for it in its),
                "blocks": set().union(*(x["blocks"] for x in its)),
            })
        else:
            fallback_lines.extend(its)
    return reflow_column_lines(fallback_lines, page_w, is_toc_page)


def pre_reflow_isolated_frames(lines: list, page_width: float, is_toc_page: bool) -> list:
    """
    Reflow multi-line text frames (single PDF block_idx, narrow/medium width < 0.72*W, no '|' table)
    that sit beside another frame horizontally so side-by-side captions & source boxes never interleave!
    """
    if is_toc_page or len(lines) < 3:
        return lines

    by_block = {}
    for ln in lines:
        if len(ln["blocks"]) == 1 and min(ln["blocks"]) >= 0:
            by_block.setdefault(min(ln["blocks"]), []).append(ln)

    consumed_ids = set()
    collapsed_frames = []

    for b_id, blines in by_block.items():
        if len(blines) < 2:
            continue
        bx0 = min(l["x0"] for l in blines)
        by0 = min(l["y0"] for l in blines)
        bx1 = max(l["x1"] for l in blines)
        by1 = max(l["y1"] for l in blines)
        if (bx1 - bx0) > page_width * 0.74:
            continue
        if any(" | " in l["text"] or is_dotted_leader(l["text"]) or is_heading_line(l) for l in blines):
            continue

        # Only pre-collapse when another non-overlapping block shares vertical space with this frame!
        has_side_neighbor = any(
            id(other) not in {id(x) for x in blines}
            and (min(other["y1"], by1) - max(other["y0"], by0) > 2.0)
            and (other["x0"] >= bx1 + 8.0 or other["x1"] <= bx0 - 8.0)
            for other in lines
        )
        if not has_side_neighbor:
            continue

        blines_sorted = sorted(blines, key=lambda l: (round(l["yc"], 1), round(l["x0"], 1)))
        if is_poem_run(blines_sorted, page_width):
            continue

        reflowed_strs = [s for s in reflow_column_lines(blines_sorted, page_width, False) if s != ""]
        if not reflowed_strs:
            continue
        for idx_p, p_str in enumerate(reflowed_strs):
            collapsed_frames.append({
                "x0": bx0,
                "y0": by0 + idx_p * 2.0,
                "x1": bx1,
                "y1": by0 + idx_p * 2.0 + 12.0,
                "yc": by0 + idx_p * 2.0 + 6.0,
                "h": 12.0,
                "sz": blines_sorted[0]["sz"],
                "text": p_str,
                "blocks": {b_id},
            })
        for l in blines:
            consumed_ids.add(id(l))

    if not consumed_ids:
        return lines

    return [l for l in lines if id(l) not in consumed_ids] + collapsed_frames


def order_and_reflow_page(lines: list, page_width: float, is_toc_page: bool) -> list:
    if not lines:
        return []

    lines = pre_reflow_isolated_frames(lines, page_width, is_toc_page)
    lines.sort(key=lambda l: (round(l["yc"], 1), round(l["x0"], 1)))

    y_rows = []
    for ln in lines:
        lh = max(6.0, ln["h"])
        if (
            not ln["text"].startswith("### ")
            and y_rows
            and not y_rows[-1]["items"][0]["text"].startswith("### ")
            and abs(ln["yc"] - y_rows[-1]["yc"]) <= 0.45 * max(lh, y_rows[-1]["h"])
        ):
            if all(min(ln["x1"], ex["x1"]) - max(ln["x0"], ex["x0"]) <= 4.0 for ex in y_rows[-1]["items"]):
                y_rows[-1]["items"].append(ln)
                y_rows[-1]["h"] = max(y_rows[-1]["h"], lh)
                continue
        y_rows.append({"yc": ln["yc"], "h": lh, "items": [ln]})

    mid_min = page_width * 0.22
    mid_max = page_width * 0.78

    result = []
    single_buf = []
    twocol_buf = []

    def flush_single():
        nonlocal single_buf
        if not single_buf:
            return
        result.extend(reflow_column_lines(single_buf, page_width, is_toc_page))
        single_buf = []

    def flush_twocol():
        nonlocal twocol_buf
        if not twocol_buf:
            return
        prev_non_empty = next((x for x in reversed(result) if x != ""), "")
        is_after_tbl_hdr = (" | " in prev_non_empty)
        if is_after_tbl_hdr and result and result[-1] == "":
            result.pop()
        tbl_or_cols = flush_twocol_region(twocol_buf, page_width, is_toc_page, is_after_tbl_hdr)
        result.extend(tbl_or_cols)
        if result and result[-1] != "":
            result.append("")
        twocol_buf = []

    for r in y_rows:
        its = sorted(r["items"], key=lambda x: x["x0"])
        if len(its) == 1:
            it = its[0]
            if twocol_buf:
                if (
                    not it["text"].startswith("### ")
                    and not is_dotted_leader(it["text"])
                    and (it["x1"] <= page_width * 0.68 or it["x0"] >= page_width * 0.32)
                    and (it["x1"] - it["x0"]) < page_width * 0.62
                ):
                    twocol_buf.append(r)
                    continue
                flush_twocol()
            single_buf.append(it)
        elif len(its) >= 3:
            flush_single()
            flush_twocol()
            row_str = " | ".join(normalize_inline_dots(it["text"]) for it in its)
            if result and result[-1] != "" and " | " not in result[-1]:
                result.append("")
            result.append(row_str)
        else:
            # 2 items on the same y_row
            gap = its[1]["x0"] - its[0]["x1"]
            sx = 0.5 * (its[0]["x1"] + its[1]["x0"])
            if gap > 10.0 and mid_min <= sx <= mid_max and not is_dotted_leader(its[0]["text"]) and not is_dotted_leader(its[1]["text"]):
                flush_single()
                twocol_buf.append(r)
            else:
                flush_twocol()
                joined_txt = " | ".join(it["text"] for it in its) if gap > 36.0 else " ".join(it["text"] for it in its)
                single_buf.append({
                    "x0": its[0]["x0"], "y0": min(x["y0"] for x in its),
                    "x1": its[1]["x1"], "y1": max(x["y1"] for x in its),
                    "yc": r["yc"], "h": r["h"], "sz": max(x["sz"] for x in its),
                    "text": joined_txt,
                    "blocks": its[0]["blocks"] | its[1]["blocks"],
                })

    flush_single()
    flush_twocol()
    return result


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
        b_pno = (pno - 1) if (1 < pno < total_pages) else 0
        page_lines = extract_page_markdown(page, meta["is_english_book"], book_pno=b_pno)

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
        b_pno = (pno - 1) if (1 < pno < len(doc)) else 0
        plines = extract_page_markdown(doc[pno - 1], meta["is_english_book"], book_pno=b_pno)
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

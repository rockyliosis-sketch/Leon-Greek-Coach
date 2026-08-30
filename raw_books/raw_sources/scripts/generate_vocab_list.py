import os
import re
import json

A1_PATH = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/Glossary_A1_kids.md"
A2_PATH = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/KLIK_A2_Ef_Glossary.md"
CACHE_PATH = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach/backend/translation_cache.json"

def parse_a1_line(line):
    stripped = line.strip()
    if not stripped or "=" not in line:
        return None
    
    # Alphabet header
    if stripped.startswith("**") and " = " in stripped and stripped.endswith("**"):
        m = re.match(r"^\*\*(?P<letter>[^=]+)\s*=\s*(?P<name>[^*]+)\*\*$", stripped)
        if m:
            return {"type": "alphabet", "letter": m.group("letter").strip(), "name": m.group("name").strip()}
        return {"type": "alphabet", "letter": stripped, "name": ""}

    # Match: **αβγό**, _το_ = egg
    m = re.match(r"^(?P<indent>\s*)\*\*(?P<greek>[^*]+)\*\*,\s*_(?P<details>[^_]+)_\s*=\s*(?P<english>.+)$", line)
    if m:
        return {
            "type": "entry",
            "greek": m.group("greek").strip(),
            "details": m.group("details").strip(),
            "english": m.group("english").strip(),
            "indent": len(m.group("indent")) > 0
        }
        
    # Match: **αγοράζω** = to buy
    m = re.match(r"^(?P<indent>\s*)\*\*(?P<greek>[^*]+)\*\*\s*=\s*(?P<english>.+)$", line)
    if m:
        return {
            "type": "entry",
            "greek": m.group("greek").strip(),
            "details": "",
            "english": m.group("english").strip(),
            "indent": len(m.group("indent")) > 0
        }
        
    return None

def parse_a2_line(line):
    stripped = line.strip()
    if not stripped or "=" not in line:
        return None
        
    if not (stripped.startswith("*") or stripped.startswith("-")):
        return None
        
    indent_match = re.match(r"^(\s*)", line)
    is_indented = len(indent_match.group(1)) > 0 if indent_match else False
    
    content = stripped[1:].strip()
    
    # Alphabet
    if any(f" = {l}" in content for l in ['άλφα', 'βήτα', 'γάμα', 'δέλτα', 'έψιλον', 'ζήτα', 'ήτα', 'θήτα', 'γιώτα', 'κάπα', 'λάμδα', 'μι', 'νι', 'ξι', 'όμικρον', 'πι', 'ρω', 'σίγμα', 'ταυ', 'ύψιλον', 'φι', 'χι', 'ψι', 'ωμέγα']):
        parts = content.split("=")
        return {"type": "alphabet", "letter": parts[0].strip(), "name": parts[1].strip()}
        
    # Match: **αβγό, το** = egg
    m = re.match(r"^\*\*(?P<greek>[^*]+)\*\*(?P<details>[^=]*)\s*=\s*(?P<english>.+)$", content)
    if m:
        return {
            "type": "entry",
            "greek": m.group("greek").strip(),
            "details": m.group("details").strip(),
            "english": m.group("english").strip(),
            "indent": is_indented
        }
        
    # Match non-bold: * έχει αέρα = it is windy
    m = re.match(r"^(?P<greek>[^=]+)\s*=\s*(?P<english>.+)$", content)
    if m:
        return {
            "type": "entry",
            "greek": m.group("greek").strip(),
            "details": "",
            "english": m.group("english").strip(),
            "indent": is_indented
        }
        
    return None

def main():
    # Load cache
    with open(CACHE_PATH, "r", encoding="utf-8") as f:
        cache = json.load(f)
        
    a1_items = []
    with open(A1_PATH, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f):
            item = parse_a1_line(line)
            if item:
                item["line"] = idx + 1
                a1_items.append(item)
                
    a2_items = []
    with open(A2_PATH, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f):
            item = parse_a2_line(line)
            if item:
                item["line"] = idx + 1
                a2_items.append(item)
                
    # Find missing
    missing_eng = set()
    for item in a1_items + a2_items:
        if item["type"] == "entry":
            eng = item["english"].strip()
            if eng not in cache:
                missing_eng.add(eng)
                
    missing_list = sorted(list(missing_eng))
    with open("missing_translations.json", "w", encoding="utf-8") as f:
        json.dump(missing_list, f, ensure_ascii=False, indent=2)
        
    print(f"Parsed {len(a1_items)} A1 items, {len(a2_items)} A2 items.")
    print(f"Saved {len(missing_list)} missing terms to missing_translations.json.")
    
    # Save parsed data to inspect
    with open("parsed_a1.json", "w", encoding="utf-8") as f:
        json.dump(a1_items, f, ensure_ascii=False, indent=2)
    with open("parsed_a2.json", "w", encoding="utf-8") as f:
        json.dump(a2_items, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()

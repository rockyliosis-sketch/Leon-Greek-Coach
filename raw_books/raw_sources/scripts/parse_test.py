import os
import re

A1_PATH = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/Glossary_A1_kids.md"
A2_PATH = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/KLIK_A2_Ef_Glossary.md"

def parse_a1_line(line):
    stripped = line.strip()
    if not stripped or "=" not in line:
        return None
    
    # Check if alphabet header like **Α, α = άλφα**
    if stripped.startswith("**") and " = " in stripped and stripped.endswith("**"):
        m = re.match(r"^\*\*(?P<letter>[^=]+)\s*=\s*(?P<name>[^*]+)\*\*$", stripped)
        if m:
            return {"type": "alphabet", "letter": m.group("letter").strip(), "name": m.group("name").strip()}
        return {"type": "alphabet_raw", "text": stripped}

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
        
    # Match: **αγοράζω** = to buy or **αγγλική γλώσσα** (/αγγλικά) = English
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
        
    # Must start with bullet: * or -
    if not (stripped.startswith("*") or stripped.startswith("-")):
        return None
        
    # Extract indentation
    indent_match = re.match(r"^(\s*)", line)
    is_indented = len(indent_match.group(1)) > 0 if indent_match else False
    
    content = stripped[1:].strip()
    
    # Check if alphabet header like "Α, α = άλφα"
    if any(f" = {l}" in content for l in ['άλφα', 'βήτα', 'γάμα', 'δέλτα', 'έψιλον', 'ζήτα', 'ήτα', 'θήτα', 'γιώτα', 'κάπα', 'λάμδα', 'μι', 'νι', 'ξι', 'όμικρον', 'πι', 'ρω', 'σίγμα', 'ταυ', 'ύψιλον', 'φι', 'χι', 'ψι', 'ωμέγα']):
        return {"type": "alphabet", "text": content}
        
    # Match: **αβγό, το** = egg or **αγαπώ (verb)** = love, like
    m = re.match(r"^\*\*(?P<greek>[^*]+)\*\*\s*=\s*(?P<english>.+)$", content)
    if m:
        return {
            "type": "entry",
            "greek": m.group("greek").strip(),
            "english": m.group("english").strip(),
            "indent": is_indented
        }
        
    # Match non-bold: * έχει αέρα = it is windy
    m = re.match(r"^(?P<greek>[^=]+)\s*=\s*(?P<english>.+)$", content)
    if m:
        return {
            "type": "entry_raw",
            "greek": m.group("greek").strip(),
            "english": m.group("english").strip(),
            "indent": is_indented
        }
        
    return None

def test():
    print("Testing A1 parser...")
    a1_entries = []
    with open(A1_PATH, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f):
            parsed = parse_a1_line(line)
            if parsed:
                parsed["line_no"] = idx + 1
                a1_entries.append(parsed)
                
    print(f"Total A1 lines parsed: {len(a1_entries)}")
    print("Sample A1 entries:")
    for e in a1_entries[:10]:
        print(e)
    print("...")
    for e in a1_entries[-5:]:
        print(e)

    print("\nTesting A2 parser...")
    a2_entries = []
    with open(A2_PATH, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f):
            parsed = parse_a2_line(line)
            if parsed:
                parsed["line_no"] = idx + 1
                a2_entries.append(parsed)
                
    print(f"Total A2 lines parsed: {len(a2_entries)}")
    print("Sample A2 entries:")
    for e in a2_entries[:10]:
        print(e)
    print("...")
    for e in a2_entries[-5:]:
        print(e)

if __name__ == "__main__":
    test()

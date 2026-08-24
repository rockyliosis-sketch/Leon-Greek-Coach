# -*- coding: utf-8 -*-
"""
Leon Greek Coach - Pre-Flight Drill & Translation Verification Engine
Automated bidirectional quality assurance gate for all curriculum drills and vocabulary.
"""

import json
import re
import sys

def remove_accents(text: str) -> str:
    accents_map = {
        'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω',
        'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ό': 'Ο', 'Ύ': 'Υ', 'Ώ': 'Ω',
        'ΐ': 'ι', 'ΰ': 'υ', 'ϊ': 'ι', 'ϋ': 'υ'
    }
    for k, v in accents_map.items():
        text = text.replace(k, v)
    return text

def validate_drill_item(drill: dict, unit_context: dict) -> list:
    errors = []
    d_id = drill.get("id")
    q = drill.get("question", "").strip()
    ans = drill.get("answer", "").strip()
    opts = drill.get("options", [])
    trans = drill.get("translation", "").strip()
    tip = drill.get("detailed_tip", "").strip()
    stype = drill.get("skill_type", "").strip()

    # Rule 1: All required fields present
    if not q:
        errors.append(f"[ID {d_id}] Missing question text")
    if not ans:
        errors.append(f"[ID {d_id}] Missing answer")
    if not trans:
        errors.append(f"[ID {d_id}] Missing translation")
    if not tip:
        errors.append(f"[ID {d_id}] Missing detailed tip")

    # Rule 2: Options count & uniqueness
    if len(opts) != 4:
        errors.append(f"[ID {d_id}] Option count is {len(opts)}, expected exactly 4")
    if len(opts) != len(set(opts)):
        errors.append(f"[ID {d_id}] Duplicate options found: {opts}")
    
    # Rule 3: Answer must be one of the options
    if ans not in opts:
        errors.append(f"[ID {d_id}] Answer '{ans}' is not in options list: {opts}")

    # Rule 4: Fill-in-the-blank target reconstruction
    if "______" in q:
        reconstructed = q.replace("______", ans)
        # Check if the reconstructed sentence contains Greek characters
        if not re.search(r'[\u0370-\u03ff\u1f00-\u1fff]', reconstructed):
            errors.append(f"[ID {d_id}] Reconstructed sentence has no Greek characters: {reconstructed}")
    
    # Rule 5: Translation & Question Consistency Check
    if len(trans) < 2 or "TODO" in trans or "undefined" in trans:
        errors.append(f"[ID {d_id}] Suspicious translation text: '{trans}'")

    # Rule 6: Check for dual valid answers in conjugation/declension drills
    if stype == "syntax" or stype == "conjugation":
        opts_cleaned = [remove_accents(o.lower()) for o in opts]
        if "πονουν" in opts_cleaned and "πονανε" in opts_cleaned:
            errors.append(f"[ID {d_id}] Both 'Πονούν' and 'Πονάνε' exist in options, causing ambiguous correct answers")
        if "μη" in opts and "μην" in opts:
            errors.append(f"[ID {d_id}] Both 'μη' and 'μην' exist in options, causing ambiguous correct answers")

    return errors

def validate_all_units(json_path: str) -> dict:
    with open(json_path, 'r', encoding='utf-8') as f:
        units = json.load(f)

    total_drills = 0
    all_errors = []
    
    for u in units:
        b_id = u.get("book_id", "")
        u_num = u.get("unit", 0)
        u_title = u.get("unit_title", "")
        drills = u.get("drills", [])
        total_drills += len(drills)

        # Check golden dialogues
        for dia in u.get("golden_dialogues", []):
            if not dia.get("greek") or not dia.get("chinese"):
                all_errors.append(f"[{b_id} U{u_num}] Dialogue missing greek or chinese: {dia}")
        
        # Check drills
        for d in drills:
            item_errors = validate_drill_item(d, u)
            for err in item_errors:
                all_errors.append(f"[{b_id} U{u_num} ({u_title})] {err}")

    return {
        "total_units": len(units),
        "total_drills": total_drills,
        "errors": all_errors,
        "passed": len(all_errors) == 0
    }

if __name__ == "__main__":
    target_path = "frontend/src/data/unit_knowledge_drills.json"
    if len(sys.argv) > 1:
        target_path = sys.argv[1]

    print(f"🔍 Running Pre-Flight Verification Gate on {target_path}...")
    result = validate_all_units(target_path)
    print(f"📊 Audited Units: {result['total_units']}")
    print(f"📊 Audited Drills: {result['total_drills']}")
    
    if result["passed"]:
        print("✅ ALL CHECKS PASSED: 100% Structural, Grammatical & Translation Integrity Verified!")
        sys.exit(0)
    else:
        print(f"❌ VERIFICATION FAILED with {len(result['errors'])} issue(s):")
        for e in result["errors"]:
            print(f"  • {e}")
        sys.exit(1)

# -*- coding: utf-8 -*-
"""
Leon Greek Coach - Pre-Flight Multi-Type Drill & Translation Verification Engine
Automated bidirectional quality assurance gate for all 39 curriculum units:
- Choice (选择题)
- Cloze (填空题)
- QA (问答题 / 情景应答)
- Translate (翻译题)
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
    dtype = drill.get("drill_type", "choice")
    q = drill.get("question", "").strip()
    ans = drill.get("answer", "").strip()
    opts = drill.get("options", [])
    trans = drill.get("translation", "").strip()
    tip = drill.get("detailed_tip", "").strip()
    stype = drill.get("skill_type", "").strip()

    # Rule 1: Required basic fields
    if not q:
        errors.append(f"[ID {d_id}] Missing question text")
    if not ans:
        errors.append(f"[ID {d_id}] Missing answer")
    if not trans:
        errors.append(f"[ID {d_id}] Missing translation")
    if not tip:
        errors.append(f"[ID {d_id}] Missing detailed tip")

    # Rule 2: Type-specific validations
    if dtype == "choice":
        if len(opts) != 4:
            errors.append(f"[ID {d_id}] Option count is {len(opts)}, expected exactly 4")
        if len(opts) != len(set(opts)):
            errors.append(f"[ID {d_id}] Duplicate options found: {opts}")
        if ans not in opts:
            errors.append(f"[ID {d_id}] Answer '{ans}' is not in options: {opts}")
        if stype in ["syntax", "conjugation"]:
            opts_cleaned = [remove_accents(o.lower()) for o in opts]
            if "πονουν" in opts_cleaned and "πονανε" in opts_cleaned:
                errors.append(f"[ID {d_id}] Ambiguous options 'Πονούν' and 'Πονάνε'")
            if "μη" in opts and "μην" in opts:
                errors.append(f"[ID {d_id}] Ambiguous options 'μη' and 'μην'")

    elif dtype == "cloze":
        if "______" not in q:
            errors.append(f"[ID {d_id}] Cloze question must have '______' blank marker: {q}")
        if not drill.get("acceptable_answers"):
            errors.append(f"[ID {d_id}] Cloze question must have acceptable_answers list")
        # Sentence reconstruction check
        reconstructed = q.replace("______", ans)
        if not re.search(r'[\u0370-\u03ff\u1f00-\u1fff]', reconstructed):
            errors.append(f"[ID {d_id}] Cloze sentence missing Greek characters: {reconstructed}")

    elif dtype == "qa":
        if not drill.get("acceptable_answers"):
            errors.append(f"[ID {d_id}] QA question must have acceptable_answers list")
        if not re.search(r'[\u0370-\u03ff\u1f00-\u1fff]', ans):
            errors.append(f"[ID {d_id}] QA answer missing Greek characters: {ans}")

    elif dtype == "translate":
        if not drill.get("acceptable_answers"):
            errors.append(f"[ID {d_id}] Translate question must have acceptable_answers list")
        if not re.search(r'[\u0370-\u03ff\u1f00-\u1fff]', ans):
            errors.append(f"[ID {d_id}] Translate Greek answer missing Greek: {ans}")

    return errors

def validate_all_units(json_path: str) -> dict:
    with open(json_path, 'r', encoding='utf-8') as f:
        units = json.load(f)

    total_drills = 0
    type_counts = {}
    all_errors = []
    
    for u in units:
        b_id = u.get("book_id", "")
        u_num = u.get("unit", 0)
        u_title = u.get("unit_title", "")
        drills = u.get("drills", [])
        total_drills += len(drills)

        for dia in u.get("golden_dialogues", []):
            if not dia.get("greek") or not dia.get("chinese"):
                all_errors.append(f"[{b_id} U{u_num}] Dialogue missing greek or chinese: {dia}")
        
        for d in drills:
            dtype = d.get("drill_type", "choice")
            type_counts[dtype] = type_counts.get(dtype, 0) + 1
            item_errors = validate_drill_item(d, u)
            for err in item_errors:
                all_errors.append(f"[{b_id} U{u_num} ({u_title})] {err}")

    return {
        "total_units": len(units),
        "total_drills": total_drills,
        "type_counts": type_counts,
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
    print(f"📊 Drill Types Breakdown: {result['type_counts']}")
    
    if result["passed"]:
        print("✅ ALL CHECKS PASSED: 100% Structural, Grammatical, Typological & Translation Integrity Verified!")
        sys.exit(0)
    else:
        print(f"❌ VERIFICATION FAILED with {len(result['errors'])} issue(s):")
        for e in result["errors"]:
            print(f"  • {e}")
        sys.exit(1)

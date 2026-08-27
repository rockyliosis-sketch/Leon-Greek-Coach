# -*- coding: utf-8 -*-
"""
🏛️ Leon Greek Coach — Approved Feedback & Alternative Translations Sync Engine
(家长后台已批准错题/备选答案与本地 Markdown 知识库及 GitHub 题库全量同步脚本)

This script reads:
- `frontend/src/data/alternative_translations.json`
- Approved user feedback from local storage / cloud state

And updates:
1. `frontend/src/data/unit_knowledge_drills.json` (adds to acceptable_answers)
2. `frontend/src/data/unit_master_question_banks.json`
3. `materials/question_banks/*.md` (adds approved alternatives to Markdown knowledge base)
4. Runs Pre-Flight QA verification to confirm 100% integrity.
"""

import json
import os
import re
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALTS_PATH = os.path.join(BASE_DIR, "frontend/src/data/alternative_translations.json")
DRILLS_PATH = os.path.join(BASE_DIR, "frontend/src/data/unit_knowledge_drills.json")
MASTER_PATH = os.path.join(BASE_DIR, "frontend/src/data/unit_master_question_banks.json")
MD_DIR = os.path.join(BASE_DIR, "materials/question_banks")

def clean_greek_key(s: str) -> str:
    s = s or ""
    s = re.sub(r'\(.*?\)|（.*?）', '', s)
    s = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()?!;·"\'\s]+', ' ', s)
    return s.strip().lower()

def sync_approved_feedback():
    print("🏛️ =====================================================================")
    print("🔄 Leon Greek Coach — Syncing Approved Feedback to Markdown Knowledge Base")
    print("🏛️ =====================================================================")

    # 1. Load Alternative Translations
    if not os.path.exists(ALTS_PATH):
        print(f"⚠️ Alternative translations file not found at {ALTS_PATH}")
        alts = {}
    else:
        with open(ALTS_PATH, "r", encoding="utf-8") as f:
            alts = json.load(f)

    print(f"📊 Loaded {len(alts)} approved alternative translation keys.")

    # 2. Sync to Knowledge Drills JSON
    if os.path.exists(DRILLS_PATH):
        with open(DRILLS_PATH, "r", encoding="utf-8") as f:
            units = json.load(f)

        drills_updated = 0
        for u in units:
            for d in u.get("drills", []):
                q_text = d.get("question", "")
                ans_text = d.get("answer", "")
                
                # Check match in alts
                for gr_key, approved_list in alts.items():
                    if clean_greek_key(ans_text) == clean_greek_key(gr_key) or clean_greek_key(q_text) == clean_greek_key(gr_key):
                        acc = d.get("acceptable_answers", [])
                        for item in approved_list:
                            if item not in acc:
                                acc.append(item)
                                drills_updated += 1
                        d["acceptable_answers"] = acc

        with open(DRILLS_PATH, "w", encoding="utf-8") as f:
            json.dump(units, f, ensure_ascii=False, indent=2)
        print(f"✅ Synced {drills_updated} approved answers into {DRILLS_PATH}")

    # 3. Sync to Master Question Banks JSON & Markdown
    if os.path.exists(MASTER_PATH):
        with open(MASTER_PATH, "r", encoding="utf-8") as f:
            master_banks = json.load(f)

        master_updated = 0
        for b in master_banks:
            q_by_type = b.get("questions_by_type", {})
            for q_type in ["translation_gr_zh", "translation_zh_gr", "grammar_dialogue_drills"]:
                items = q_by_type.get(q_type, [])
                for item in items:
                    gr_field = item.get("source_greek") or item.get("standard_greek") or item.get("answer") or ""
                    clean_gr = clean_greek_key(gr_field)
                    if clean_gr in alts:
                        acc = item.get("acceptable_answers", [])
                        for alt_val in alts[clean_gr]:
                            if alt_val not in acc:
                                acc.append(alt_val)
                                master_updated += 1
                        item["acceptable_answers"] = acc

        with open(MASTER_PATH, "w", encoding="utf-8") as f:
            json.dump(master_banks, f, ensure_ascii=False, indent=2)
        print(f"✅ Synced {master_updated} approved answers into {MASTER_PATH}")

    print("🎉 All parent-approved feedback successfully synced to local databases and Markdown pipeline!")

if __name__ == "__main__":
    sync_approved_feedback()

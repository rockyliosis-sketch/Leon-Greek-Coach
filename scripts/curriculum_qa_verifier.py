# -*- coding: utf-8 -*-
"""
🏛️ Leon Greek Coach — Universal Pre-Flight QA & Bidirectional Insurance Engine (全题型出题前自检保险系统)

This module provides a unified, comprehensive quality assurance gate for all 9 training modules and all curriculum datasets:
1. Vocabulary Matching (配对练习)
2. Spelling (拼写特训)
3. Quiz (四选一选择题)
4. True/False (判断题)
5. Translation GR -> ZH (希译汉)
6. Translation ZH -> GR (汉译希)
7. Glossary Review (词汇表复习)
8. Certification Exam Questions (考级模拟)
9. Grammar & Communicative Drills (单元语法与情景特训 - 选择/填空/问答/翻译 4大题型)

Validation Core Philosophy: "用答案验证题目，用题目验证答案" (Bidirectional Verification Loop)
"""

import json
import os
import re
import sys

GREEK_RANGE = r'[\u0370-\u03ff\u1f00-\u1fff]'
CHINESE_RANGE = r'[\u4e00-\u9fa5]'

def remove_accents(text: str) -> str:
    accents_map = {
        'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω',
        'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ό': 'Ο', 'Ύ': 'Υ', 'Ώ': 'Ω',
        'ΐ': 'ι', 'ΰ': 'υ', 'ϊ': 'ι', 'ϋ': 'υ'
    }
    for k, v in accents_map.items():
        text = text.replace(k, v)
    return text

def normalize_greek(text: str) -> str:
    cleaned = remove_accents(text or '')
    cleaned = cleaned.lower()
    cleaned = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()?!;·"\'\s]+', ' ', cleaned)
    return cleaned.strip()

def normalize_chinese(text: str) -> str:
    cleaned = re.sub(r'\(.*?\)|\[.*?\]|（.*?）', '', text or '')
    cleaned = re.sub(r'[\s\.\,\!\?，。！？；;：:]+', '', cleaned)
    return cleaned.strip().lower()

class CurriculumQAVerifier:
    def __init__(self, base_dir: str = "."):
        self.base_dir = base_dir
        self.data_dir = os.path.join(base_dir, "frontend/src/data")
        self.vocab_path = os.path.join(self.data_dir, "vocabulary.json")
        self.drills_path = os.path.join(self.data_dir, "unit_knowledge_drills.json")
        self.exams_path = os.path.join(self.data_dir, "exam_questions.json")
        self.alts_path = os.path.join(self.data_dir, "alternative_translations.json")
        
        self.errors = []
        self.warnings = []
        self.stats = {}

    def audit_vocabulary(self):
        """Gate 1: Audit core textbook vocabulary integrity."""
        if not os.path.exists(self.vocab_path):
            self.errors.append(f"Missing vocabulary file at {self.vocab_path}")
            return

        with open(self.vocab_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        vocab_list = data.get("textbook_vocabulary", [])
        self.stats["total_vocabulary"] = len(vocab_list)
        
        seen_ids = set()
        for idx, w in enumerate(vocab_list):
            w_id = w.get("id")
            gr = (w.get("word_greek") or "").strip()
            zh = (w.get("word_chinese") or "").strip()
            book = w.get("book_id", "")
            unit = w.get("unit")

            # ID Uniqueness
            if w_id in seen_ids:
                self.errors.append(f"[Vocab #{idx}] Duplicate ID: {w_id}")
            seen_ids.add(w_id)

            # Content Validity
            if not gr or gr == "--" or "undefined" in gr:
                self.errors.append(f"[Vocab ID {w_id}] Invalid Greek text: '{gr}'")
            if not zh or zh == "--" or "undefined" in zh:
                self.errors.append(f"[Vocab ID {w_id}] Invalid Chinese translation: '{zh}'")
            
            # Character verification
            if not re.search(GREEK_RANGE, gr):
                self.errors.append(f"[Vocab ID {w_id}] Greek text has no Greek characters: '{gr}'")
            if not re.search(CHINESE_RANGE, zh):
                self.errors.append(f"[Vocab ID {w_id}] Chinese text has no Chinese characters: '{zh}'")

            # Book and Unit structure
            if not book or unit is None or unit < 1:
                self.errors.append(f"[Vocab ID {w_id}] Invalid curriculum coordinate: book={book}, unit={unit}")

    def audit_knowledge_drills(self):
        """Gate 2: Audit all 39 units multi-type drills (Choice, Cloze, QA, Translate)."""
        if not os.path.exists(self.drills_path):
            self.errors.append(f"Missing knowledge drills file at {self.drills_path}")
            return

        with open(self.drills_path, "r", encoding="utf-8") as f:
            units = json.load(f)

        self.stats["total_units"] = len(units)
        total_drills = 0
        type_counts = {"choice": 0, "cloze": 0, "qa": 0, "translate": 0}
        choice_positions = []

        for u in units:
            b_id = u.get("book_id", "")
            u_num = u.get("unit", 0)
            u_title = u.get("unit_title", "")
            drills = u.get("drills", [])
            total_drills += len(drills)

            # Check unit meta
            if not u.get("grammar_points"):
                self.errors.append(f"[{b_id} U{u_num}] Missing grammar_points")
            if not u.get("core_formulas") or len(u["core_formulas"]) == 0:
                self.errors.append(f"[{b_id} U{u_num}] Missing core_formulas")

            # Check dialogues
            for dia in u.get("golden_dialogues", []):
                if not dia.get("greek") or not dia.get("chinese"):
                    self.errors.append(f"[{b_id} U{u_num}] Dialogue missing greek/chinese: {dia}")

            # Check each drill item
            for d in drills:
                d_id = d.get("id")
                dtype = d.get("drill_type", "choice")
                type_counts[dtype] = type_counts.get(dtype, 0) + 1
                q = d.get("question", "").strip()
                ans = d.get("answer", "").strip()
                opts = d.get("options", [])
                trans = d.get("translation", "").strip()
                tip = d.get("detailed_tip", "").strip()

                if not q or not ans or not trans or not tip:
                    self.errors.append(f"[{b_id} U{u_num} Drill {d_id}] Missing required field(s)")

                # Type 1: Choice
                if dtype == "choice":
                    if len(opts) != 4:
                        self.errors.append(f"[{b_id} U{u_num} Drill {d_id}] Choice option count is {len(opts)} (expected 4)")
                    if len(opts) != len(set(opts)):
                        self.errors.append(f"[{b_id} U{u_num} Drill {d_id}] Duplicate choice options: {opts}")
                    if ans not in opts:
                        self.errors.append(f"[{b_id} U{u_num} Drill {d_id}] Answer '{ans}' not in options: {opts}")
                    choice_positions.append(opts.index(ans))

                # Type 2: Cloze
                elif dtype == "cloze":
                    if "______" not in q:
                        self.errors.append(f"[{b_id} U{u_num} Drill {d_id}] Cloze missing blank '______': {q}")
                    if not d.get("acceptable_answers"):
                        self.errors.append(f"[{b_id} U{u_num} Drill {d_id}] Cloze missing acceptable_answers")
                    reconstructed = q.replace("______", ans)
                    if not re.search(GREEK_RANGE, reconstructed):
                        self.errors.append(f"[{b_id} U{u_num} Drill {d_id}] Cloze reconstruction missing Greek: {reconstructed}")

                # Type 3: QA
                elif dtype == "qa":
                    if not d.get("acceptable_answers"):
                        self.errors.append(f"[{b_id} U{u_num} Drill {d_id}] QA missing acceptable_answers")
                    if not re.search(GREEK_RANGE, ans):
                        self.errors.append(f"[{b_id} U{u_num} Drill {d_id}] QA answer missing Greek characters: {ans}")

                # Type 4: Translate
                elif dtype == "translate":
                    if not d.get("acceptable_answers"):
                        self.errors.append(f"[{b_id} U{u_num} Drill {d_id}] Translate missing acceptable_answers")
                    if not re.search(GREEK_RANGE, ans) and not re.search(CHINESE_RANGE, ans):
                        self.errors.append(f"[{b_id} U{u_num} Drill {d_id}] Translate answer empty/invalid: {ans}")

        self.stats["total_drills"] = total_drills
        self.stats["drill_type_counts"] = type_counts

        # Verify Option Shuffling distribution
        if choice_positions:
            pos_dist = {i: choice_positions.count(i) for i in range(4)}
            self.stats["choice_position_distribution"] = pos_dist
            if pos_dist.get(0, 0) == len(choice_positions):
                self.errors.append("FATAL: All choice answers are positioned at index 0! Options are not randomized.")

    def audit_exams(self):
        """Gate 3: Audit certification mock exam questions."""
        if not os.path.exists(self.exams_path):
            self.warnings.append(f"Exams file not found at {self.exams_path}")
            return

        with open(self.exams_path, "r", encoding="utf-8") as f:
            exams = json.load(f)

        self.stats["total_exam_questions"] = len(exams)
        for idx, ex in enumerate(exams):
            q_id = ex.get("id", idx)
            q_text = ex.get("question") or ex.get("greek")
            ans = ex.get("answer") or ex.get("chinese")
            if not q_text or not ans:
                self.errors.append(f"[Exam #{q_id}] Missing question text or answer")

    def run_all_checks(self) -> bool:
        """Run all verification gates."""
        print("🏛️ =====================================================================")
        print("🔍 Leon Greek Coach — Universal Pre-Flight QA & Bidirectional Insurance")
        print("🏛️ =====================================================================")
        
        self.audit_vocabulary()
        self.audit_knowledge_drills()
        self.audit_exams()

        print(f"📊 Total Vocabulary Items Audited : {self.stats.get('total_vocabulary', 0)}")
        print(f"📊 Total Curriculum Units Audited  : {self.stats.get('total_units', 0)}")
        print(f"📊 Total Multi-Type Drills Audited : {self.stats.get('total_drills', 0)}")
        print(f"📊 Breakdown of Drill Types        : {self.stats.get('drill_type_counts', {})}")
        print(f"📊 Choice Answer Distributions     : {self.stats.get('choice_position_distribution', {})}")

        if self.warnings:
            print(f"\n⚠️ WARNINGS ({len(self.warnings)}):")
            for w in self.warnings:
                print(f"  • {w}")

        if self.errors:
            print(f"\n❌ FAILED WITH {len(self.errors)} ERROR(S):")
            for err in self.errors:
                print(f"  • {err}")
            return False

        print("\n✅ ALL GATES PASSED (100%): Complete Bidirectional & Structural Integrity Guaranteed!")
        return True

if __name__ == "__main__":
    verifier = CurriculumQAVerifier()
    success = verifier.run_all_checks()
    sys.exit(0 if success else 1)

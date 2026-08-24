import os
import shutil

SRC_DIR = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book"
DEST_DIR = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach/materials"

# Ensure destination subdirectories
subdirs = ["textbooks", "glossaries", "notes", "exams_a1", "exams_a2"]
for sd in subdirs:
    os.makedirs(os.path.join(DEST_DIR, sd), exist_ok=True)

# 1. Copy Glossaries and Schedules
glossary_files = [
    "Glossary_A1_kids.md",
    "Glossary_A1_kids_CN.md",
    "KLIK_A2_Ef_Glossary.md",
    "KLIK_A2_Ef_Glossary_CN.md",
    "Leon_A1_词汇背诵进度与艾宾浩斯复习表.md",
    "Leon_希腊语_A1_A2_词汇全景背诵与复习表.md"
]
for f in glossary_files:
    src = os.path.join(SRC_DIR, f)
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(DEST_DIR, "glossaries", f))
        print(f"Copied glossary: {f}")

# 2. Copy Textbooks MD
textbook_files = [
    "（已压缩）LEON_S GREEK TEXTBOOK A1-A.md",
    "（已压缩）LEON_S GREEK TEXTBOOK A1-B.md",
    "（已压缩）LEON_S GREEK TEXTBOOK A2.md",
    "（已压缩）LEON_S GREEK TEXTBOOK A1-A_progress.json",
    "（已压缩）LEON_S GREEK TEXTBOOK A1-B_progress.json",
    "（已压缩）LEON_S GREEK TEXTBOOK A2_progress.json"
]
for f in textbook_files:
    src = os.path.join(SRC_DIR, f)
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(DEST_DIR, "textbooks", f))
        print(f"Copied textbook: {f}")

# 3. Copy Notes MD
notes_src = os.path.join(SRC_DIR, "希腊语学习笔记")
if os.path.exists(notes_src):
    for f in os.listdir(notes_src):
        if f.endswith(".md") or f.endswith(".json") or f.endswith(".py"):
            shutil.copy2(os.path.join(notes_src, f), os.path.join(DEST_DIR, "notes", f))
            print(f"Copied note: {f}")

# 4. Copy A1 Exams MD
a1_src = os.path.join(SRC_DIR, "A1考试题目")
if os.path.exists(a1_src):
    for f in os.listdir(a1_src):
        if f.endswith(".md"):
            shutil.copy2(os.path.join(a1_src, f), os.path.join(DEST_DIR, "exams_a1", f))
            print(f"Copied A1 exam: {f}")

# 5. Copy A2 Exams MD
a2_src = os.path.join(SRC_DIR, "A2考试题目")
if os.path.exists(a2_src):
    for f in os.listdir(a2_src):
        if f.endswith(".md"):
            shutil.copy2(os.path.join(a2_src, f), os.path.join(DEST_DIR, "exams_a2", f))
            print(f"Copied A2 exam: {f}")

print("\nSync completed successfully!")

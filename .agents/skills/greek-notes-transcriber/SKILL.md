---
name: greek-notes-transcriber
description: "Triggers when the user provides handwritten images of Greek-Chinese learning notes. Automatically transcribes, names, and calibrates them with mutual translation verification."
---

# Greek Notes Transcriber Skill

This skill governs the process of automatically transcribing, naming, and verifying Greek-Chinese handwritten study notes uploaded by the user.

## Triggering Conditions
Activate this skill whenever the user uploads one or more images of handwritten notes containing Greek vocabulary alongside Chinese translations.

## Core Execution Steps

### 1. Date & Filename Recognition
*   Scan the top of the handwritten note to identify the date (typically formatted like `D.M.YY` or `M.D.YY`, e.g. `7.3.26` for July 3, 2026).
*   Format this date as `YYYY-MM-DD`.
*   The output file must be named `YYYY-MM-DD.md`.

### 2. Sequential Transcription Workflow
To guarantee accuracy, transcribe the list line-by-line following this precise sequence:
*   **Greek First**: Transcribe the Greek word/phrase on the left. Pay close attention to Greek letters and accents (`ά`, `έ`, `ή`, `ί`, `ό`, `ύ`, `ώ`).
*   **Chinese Second**: Transcribe the Chinese translation on the right.

### 3. Mutual Translation Verification (Calibration)
*   For each transcribed pair, verify if the Greek word and Chinese translation match semantically.
*   Lookup or translate the Greek word back to Chinese, and translate the Chinese word to Greek.
*   Cross-verify with existing textbooks or dictionaries if applicable.
*   If a mismatch is found, or if a handwritten character was misread, correct it and highlight it in the **Calibration Report**.

### 4. Output Generation & Path
*   Generate a Markdown file containing:
    *   Header stating the date.
    *   A table of recognized vocabulary with columns: `序号`, `希腊语 (Greek)`, `中文翻译 (Chinese)`, `语法与发音备注`, `校验状态` (e.g. `[√] 校验通过`).
    *   A **Calibration Report** detailing handwriting deciphering notes, accent marks verification, and translation alignments.
*   Write and save the Markdown file directly to:
    `/Users/johnsmacbook/Documents/antigravity IDE/Greek book/希腊语学习笔记/YYYY-MM-DD.md`

### 5. Confirmation Safeguard
*   **Do NOT** modify the database `greek_coach.db` or the frontend file `vocabulary.json` during the note transcription phase.
*   Ask the user to review the generated Markdown note content first. Only sync the vocabulary to the database and frontend when the user explicitly gives confirmation to import/upload the notes.

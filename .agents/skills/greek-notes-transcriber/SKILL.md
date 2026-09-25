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

### 4. Output Generation & Path（2026-09-25 家长定型，以此为准）
*   The file is pasted **as a whole** into the parent admin import box, so it must contain ONLY:

    ```
    # 2026-09-23

    | 希腊语 | 中文 |
    | --- | --- |
    | σπάω | 打破 |
    ```
*   **No** calibration report, image source, check marks, grammar-note or status columns in the file.
    Put handwriting doubts and calibration notes in the chat reply to the parent instead.
*   The Chinese column is copied verbatim from the teacher's handwriting — never "correct" it.
*   Save to: `/Users/johnsmacbook/Documents/Codex/Leon-Greek-Coach/materials/notes/YYYY-MM-DD.md`
*   Verify with the real import code: `python3 scripts/tests/check_note_import.py materials/notes/YYYY-MM-DD.md`
    (word count and date must match the photo).
*   If a date's words were already imported, do NOT ask the parent to re-upload; fix the cloud
    `custom_vocab` directly and update the md file.

### 5. Confirmation Safeguard
*   **Do NOT** modify the database `greek_coach.db` or the frontend file `vocabulary.json` during the note transcription phase.
*   Ask the user to review the generated Markdown note content first. Only sync the vocabulary to the database and frontend when the user explicitly gives confirmation to import/upload the notes.

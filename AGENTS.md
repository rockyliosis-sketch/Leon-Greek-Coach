# AGENTS.md — Multi-Agent Engineering & Content Workflow Protocol

This document establishes the universal development, maintenance, and synchronization protocols for **Antigravity IDE**, **Codex (Obsidian / Cursor)**, and **Claude Code CLI** across the `Leon-Greek-Coach` project.

---

## 1. Project Context & Workspace Root

- **Target Workspace Root**: `/Users/johnsmacbook/Documents/Codex/Leon-Greek-Coach`
- **Production URL**: `https://leon-greek-coach.vercel.app/`
- **Remote Git Repository**: `https://github.com/rockyliosis-sketch/Leon-Greek-Coach.git` (branch: `main`)

---

## 2. Directory & Data Structure Rules

- `frontend/`: React 18 + Vite + TypeScript web application for student and parent interfaces.
  - `src/pages/student/StudentApp.tsx`: Student gamified learning app (9 drill & practice modules).
  - `src/pages/parent/ParentDashboard.tsx`: Parent vocabulary approval, error dispute management, analytics.
  - `src/data/`: High-speed bundled JSON question banks and glossary databases.
- `backend/`: FastAPI backend for text-to-speech, translation caching, question generation.
- `materials/`: **Clean Markdown Knowledge Base**. All textbook texts, question banks, glossaries, notes, and exam papers are stored here in readable Markdown format.
- `raw_books/`: **Original Archive Folder**. Raw PDFs, DOCX files, scans, and original resources.
- `scripts/`: Python and Node automation scripts for vocabulary extraction, question bank generation, and database sync.
- `knowledge_docs/`: Historical research documents, Ebbinghaus curve planning, and curriculum notes.

---

## 3. Universal Pedagogical & Validation Guardrails (CRITICAL)

### Rule A: Broad Acceptance Boundaries & High Fault Tolerance
Greek is a highly inflected, flexible language. Never use strict, rigid single-string matching.
- **Verb Dual Form Tolerant**: Always accept both `-άω` and `-ώ` (e.g., `συζητάω` and `συζητώ`).
- **Synonym & Inflection Mesh**: Connect lemmas with imperatives and synonyms (e.g., `λέω`, `μιλάω`, `μιλώ`, `πες`).
- **Typo Forgiveness**: Allow 1 typo for words >= 4 letters using `isFuzzyGreekMatch` (Levenshtein distance <= 1).
- **Accents & Punctuation Agnostic**: Diacritics and punctuation must be normalized before comparison.

### Rule B: Universal Non-Blocking Rule (Zero Frustration)
Every single question across all 9 modules MUST provide:
1. `🚩 一键报错 / 纠错 (Dispute / Report)`: Directly sends student input and question ID to parent admin queue and unlocks question.
2. `⏭️ 跳过此题 (Skip Question)`: Bypasses the current question without penalty.

---

## 4. Build, Validation & Deployment Routine

Before finishing any task:
1. Validate TypeScript & Vite build:
   ```bash
   npm --prefix frontend run build
   ```
2. Deploy to Production:
   ```bash
   git add .
   git commit -m "feat/fix: <description>"
   git push origin main
   ```
   Pushing to `main` automatically triggers instant Vercel cloud deployment.

# AGENTS.md — Multi-Agent Engineering & Content Workflow Protocol

This document establishes the universal development, maintenance, and synchronization protocols for **Antigravity IDE**, **Codex (Obsidian / Cursor)**, and **Claude Code CLI** across the `Leon-Greek-Coach` project.

---

## 0. Session Start & End Protocol (MANDATORY for every agent)

- **开工先读 `工作进程.md`**（项目根目录）：当前状态、遗留事项、上一次停在哪。
- **收工更新 `工作进程.md`**：在「三、工作记录」最上面加一节（家长问了什么 / 做了什么 / 停在哪 / 遗留），并同步「一、当前状态」「二、遗留事项」。
- **每次发版后**运行 `bash scripts/backup_github_releases.sh`，把 GitHub Release 说明备份到 `docs/GitHub发布记录备份.md`。
- 课堂笔记 `materials/notes/YYYY-MM-DD.md` 只放「`# YYYY-MM-DD` + `| 希腊语 | 中文 |` 表」，家长会整篇粘进后台导入，不许夹校验报告、图源、对号、备注列。

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
- **Accents & Punctuation Agnostic**: Diacritics and punctuation must be normalized before comparison. This includes symbols a tablet keyboard cannot type (– — « » … ’ emoji); apostrophes are unified, not removed (some drills test elision: Μ’).
- **Chinese Answers Are Not One-String Either** (v2.9.2): Greek→Chinese accepts (1) every gloss the same Greek word has in any word list (`getExtraChineseAnswers`) and (2) the reviewed synonyms in `frontend/src/data/zh_accept.json` (男孩=男生, 水银=汞). New words → add their synonyms via `docs/zh_accept_audit_*.jsonl` + `scripts/build_zh_accept.py`. Never add a synonym that is really another Greek word's meaning (αγόρι ≠ 男人).

### Rule B: Universal Non-Blocking Rule (Zero Frustration)
Every single question across all 9 modules MUST provide:
1. `🚩 一键报错 / 纠错 (Dispute / Report)`: Sends student input and question ID to parent admin queue. **It must NOT reveal the answer** (parent decision 2026-09-27: report had become a shortcut to the answer). Non-blocking is guaranteed by Skip, not by Report.
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

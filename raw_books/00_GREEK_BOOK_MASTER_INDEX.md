# 🏛️ Greek Book 原文档母库全景总索引 (Master Archive Index)

> **目录定位**：本目录（`/Greek book/`）为 Leon 希腊语学习项目的**全格式原文档母库与知识备份中心**。
> 本目录分为两大核心区域：
> 1. **`markdown_backup/`**：专供 Antigravity Agent、IDE 与 AI 交互读取的**全量纯净 Markdown 备份库**（与前端项目 `materials/` 严格镜像同步）。
> 2. **`raw_sources/`**：项目原始文件总归档区，按教材、词汇表、真题、笔记分类存放 **PDF、Word (DOCX)、HTML、JSON** 原版资料，剔除了冗余陈旧文件，仅保留最终完整版本。

---

## 📂 顶层目录分类架构

```
Greek book/
├── 00_GREEK_BOOK_MASTER_INDEX.md           # 🏛️ 母库总索引与定位说明
│
├── markdown_backup/                        # 📄 纯净 Markdown 完整备份库
│   ├── textbooks/                          # 课本 1:1 Markdown (A1-A, A1-B, A2, B)
│   ├── glossaries/                         # 官方词汇表与按单元生词表
│   ├── question_banks/                     # 核心实战考题库 (A1, A2, B)
│   ├── exams/                              # 官方全真考试 (A1, A2)
│   └── notes/                              # 课堂学习笔记
│
└── raw_sources/                            # 📦 原始全格式文件终版归档区 (PDF / DOCX / HTML)
    ├── textbooks/                          # 原版教材 (PDF / Word)
    ├── glossaries/                         # 官方双语词汇表 (PDF / HTML / JSON)
    ├── exams/                              # 官方水平考试原版试卷 (PDF)
    │   ├── A1/                             # A1 听说读写真题 PDF
    │   └── A2/                             # A2 听说读写真题 PDF
    ├── notes/                              # 手写笔记本原版与 Word (PDF / DOCX)
    └── scripts/                            # 自动化提取与生成工具脚本 (.py)
```

---

## 📚 1. 原始文件归档区明细 (`raw_sources/`)

### 1.1 原版教材 (`raw_sources/textbooks/`)
- `（已压缩）LEON_S GREEK TEXTBOOK A1-A.pdf` & `.docx` (A1 上册原版)
- `（已压缩）LEON_S GREEK TEXTBOOK A1-B.pdf` & `.docx` (A1 下册原版)
- `（已压缩）LEON_S GREEK TEXTBOOK A2.pdf` & `.docx` (A2 全册原版)
- `Ελληνικά Β.pdf` (B 级 394 页全本原版 PDF，41.6 MB)

### 1.2 官方词汇表 (`raw_sources/glossaries/`)
- `Glossary_A1_kids_CN.pdf` & `.html` (A1 官方双语词表最终版)
- `KLIK_A2_Ef_Glossary_CN.pdf` & `.html` (A2 官方双语词表最终版)
- `parsed_a1.json` & `parsed_a2.json` (A1/A2 结构化词库数据)

### 1.3 官方水平考试真题原卷 (`raw_sources/exams/`)
- **A1 等级真题 (`raw_sources/exams/A1/`)**：涵盖听力 (Κατανόηση Προφορικού)、阅读 (Κατανόηση Γραπτού)、写作 (Παραγωγή Γραπτού)、口语 (Παραγωγή Προφορικού) 试卷 PDF。
- **A2 等级真题 (`raw_sources/exams/A2/`)**：涵盖听力、阅读、写作、口语两套官方完整试卷 PDF。

### 1.4 课堂原始笔记 (`raw_sources/notes/`)
- `notebook.pdf` (原始课堂手写笔记高清全彩扫描件，324 MB)
- `希腊语学习笔记.docx` (整理手写笔记 Word 文档)
- `Test_Le3ilogio_Sosto.docx` (词汇测试文档)

---

## 📄 2. Markdown 知识库备份区明细 (`markdown_backup/`)

- [textbooks/（已压缩）LEON_S GREEK TEXTBOOK B.md](file:///Users/johnsmacbook/Documents/antigravity%20IDE/Greek%20book/markdown_backup/textbooks/（已压缩）LEON_S%20GREEK%20TEXTBOOK%20B.md)：**B 级 1:1 原版 394 页完整 Markdown 档案**
- [glossaries/LEON_Greek_Book_B_按单元核心生词表.md](file:///Users/johnsmacbook/Documents/antigravity%20IDE/Greek%20book/markdown_backup/glossaries/LEON_Greek_Book_B_按单元核心生词表.md)：**B 级 1,088 核心生词表**
- [question_banks/LEON_Greek_Book_B_各单元重点语法场景与实战考题库.md](file:///Users/johnsmacbook/Documents/antigravity%20IDE/Greek%20book/markdown_backup/question_banks/LEON_Greek_Book_B_各单元重点语法场景与实战考题库.md)：**B 级各单元重点语法场景与实战考题库**

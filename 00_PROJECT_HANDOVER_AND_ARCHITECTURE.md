# Leon Greek Coach — 全局架构与项目交接全景白皮书 (Master Handover & Architecture Guide)

> **项目归档与工作空间**：`/Users/johnsmacbook/Documents/Codex/Leon-Greek-Coach`  
> **生产部署线上地址 (Vercel)**：[https://leon-greek-coach.vercel.app/](https://leon-greek-coach.vercel.app/)  
> **远程代码仓库**：`https://github.com/rockyliosis-sketch/Leon-Greek-Coach.git` (`branch: main`)  
> **适用协作工具**：Antigravity IDE、Codex (Obsidian / Cursor)、Claude Code CLI 及其他智能 Agent

---

## 一、 项目背景与教育目标 (Background & Pedagogical Mission)

本项目是专为 **Leon（希腊语学习者）** 定制开发的 **全沉浸式、自适应希腊语智能教练系统（Leon Greek Coach）**。
系统结合官方标准教材（《Ελληνικά A1-A》、《Ελληνικά A1-B》、《Ελληνικά A2》、《Ελληνικά B》全册 394 页）、官方全真考卷（A1/A2/B1 听力、阅读、写作、口语）以及日常课堂笔记，打造从 **“艾宾浩斯智能背单词”** 到 **“9 大题型游戏化实战训练”** 的全闭环学习平台。

### 核心教学进展里程碑
1. **A1 阶段（已 100% 达成）**：
   - A1 阶段 1,200+ 核心词汇已全量背诵完毕。
   - 建立了牢固的希腊字母正字法拼写、发音读音、名词三性（阳/阴/中）与第 I 变位动词体系。
2. **A2+B1 阶段（当前攻坚期 · 方案 B 全景大题库）**：
   - 覆盖《Ελληνικά Β》394 页教材全景，构建 2,200+ 词汇矩阵与 1,500+ 道场景化大题库。
   - 单单元轮转周期 2~3 周（20~30 天），每单元 60~80 道精选练习题，确保低重复率、高情境感与综合实战能力。

---

## 二、 核心设计理念与人机交互红线 (Core Philosophy & Agent Guardrails)

无论是由 **Antigravity**、**Codex** 还是 **Claude Code** 介入维护，后续所有开发必须严格遵循以下三大核心原则：

### 1. 宽边界、高容错智能校验体系 (Broad Acceptance Boundaries & High Fault Tolerance)
希腊语是高度灵活的屈折语，**严禁使用死板的单一绝对字符串比对**：
* **动词缩约与双重形态自由**：如 `συζητάω` 与 `συζητώ`，`αγαπάω` 与 `αγαπώ`，`μιλάω` 与 `μιλώ` 100% 等价放行。
* **同义词与语境形态网格**：中文“说”自动支持 `λέω / μιλάω / μιλώ / πες / πείτε / λες`；“看”支持 `βλέπω / κοιτάζω / κοιτώ / δες` 等。
* **轻微手误与编辑距离容错**：长词错拼/漏拼 1 个字母（Levenshtein 距离 <= 1）判定通过并展示标准答案，绝不卡死挫伤积极性。
* **重音标点脱敏**：重音字母（`ά, έ, ή, ί, ό, ύ, ώ`）与标点符号（`; , . !`）自动归一化处理。

### 2. 全模块防卡死双保险 (Universal Non-Blocking Rule)
系统全部 9 大训练题型（连连看、拼字、四选一选择、判断对错、希译中、中译希、单词表每日复习、写作口语、语法情景特训）**必须 100% 配备以下两个功能**：
* `🚩 一键报错 / 纠错 (Dispute / Report)`：学生可随时提交当前作答，自动存入家长后台待审列表并放行。
* `⏭️ 跳过此题 (Skip Question)`：遇到疑问直接跳过，绝不允许任何题目卡住做题流。

### 3. 数据与文件分流规范 (Directory & Storage Routing)
* `materials/`：纯结构化 Markdown 知识库（课本、词汇、笔记、题库）。
* `raw_books/`：原始 PDF、Word、扫描件素材归档。
* `frontend/`：React + Vite 前端客户端。
* `backend/`：FastAPI 后端与数据处理服务。
* `scripts/`：数据生成、词汇提取与自动化同步脚本。

---

## 三、 完整目录结构与职责划分 (Directory Architecture)

```
/Users/johnsmacbook/Documents/Codex/Leon-Greek-Coach/
│
├── 00_PROJECT_HANDOVER_AND_ARCHITECTURE.md   # 本交接白皮书（技术架构与运行全览）
├── 00 项目总览与全局架构说明.md                  # Obsidian 知识库中文总览索引
├── AGENTS.md                                 # 多 Agent（Codex/Claude/Antigravity）协作契约
├── README.md                                 # 项目快速上手与环境说明
├── package.json / vercel.json                # 前端工程配置与 Vercel 部署路由
├── docker-compose.yml / Dockerfile           # 容器化部署配置
│
├── frontend/                                 # 🖥️ 前端应用 (React 18 + Vite + TypeScript)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── student/StudentApp.tsx       # ★ 学生端主程序：9大训练模块、Apple毛玻璃UI、积分段位
│   │   │   └── parent/ParentDashboard.tsx   # ★ 家长控制台：词汇审核、每日进度管理、报错处理
│   │   ├── data/
│   │   │   ├── unit_master_question_banks.json # ★ 1,500+ 全真大题库
│   │   │   ├── unit_knowledge_drills.json      # ★ 语法与情景对话特训题库
│   │   │   ├── comprehensive_unit_vocab.json   # ★ 全景分单元词汇库
│   │   │   └── full_greek_vocab.json           # ★ 全量词汇总表
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                                  # ⚙️ 后端服务 (FastAPI + Python)
│   ├── app/
│   │   ├── api/                              # REST API 接口 (TTS、词汇、练习、家长同步)
│   │   └── core/                             # 配置与中间件
│   ├── requirements.txt
│   └── translation_cache.json                # 翻译与发音缓存
│
├── materials/                                # 📚 纯 Markdown 结构化教学知识库
│   ├── textbooks/                            # A1-A, A1-B, A2, B1 课本全景 Markdown
│   ├── glossaries/                           # 官方词汇表、单元技能矩阵、词性索引
│   ├── question_banks/                       # 各阶段大题库 Markdown 备份
│   ├── exams/                                # 官方真题（听力、阅读、口语、写作）
│   └── notes/                                # 手写课堂笔记转录与语法点沉淀
│
├── raw_books/                                # 🗄️ 原始文档归档 (PDF, Word, 扫描件)
│   ├── 00_GREEK_BOOK_MASTER_INDEX.md         # 原始图书总索引
│   ├── raw_sources/                          # 原始 PDF/DOCX (按 A1/A2/B1/Exams 分类)
│   └── markdown_backup/                      # 原始转换镜像备份
│
├── scripts/                                  # 🛠️ 题库生成与数据维护工具集
│   ├── build_full_b_question_bank.py         # 《Ελληνικά Β》全量大题库构建器
│   ├── generate_massive_b_bank.py            # B1 场景化 7 大题型扩展生成器
│   ├── generate_scheme_b_complete.py         # 方案 B 全景词库与题库一键组装
│   ├── sync_a1_a2_full.py                    # A1/A2 词汇与进度同步脚本
│   └── sync_feedback_to_knowledge_base.py    # 家长纠错自动回流知识库工具
│
└── knowledge_docs/                           # 📑 历史实施方案与教研规划备忘
    ├── 希腊语A1词汇背诵与艾宾浩斯复习系统.md
    ├── 希腊语A1-A2全阶段词汇背诵与艾宾浩斯复习系统.md
    └── 希腊语学习与复习工具规划指南.md
```

---

## 四、 本地运行与云端生产部署 (Local Development & Deployment)

### 1. 本地启动前端客户端
```bash
cd "/Users/johnsmacbook/Documents/Codex/Leon-Greek-Coach/frontend"
npm install
npm run dev
# 本地访问：http://localhost:5173
```

### 2. 生产环境构建验证
```bash
cd "/Users/johnsmacbook/Documents/Codex/Leon-Greek-Coach"
npm --prefix frontend run build
```

### 3. 一键推送到云端生产环境 (Vercel)
本项目前端已与 GitHub 仓库 `rockyliosis-sketch/Leon-Greek-Coach` 的 `main` 分支绑定 Vercel CI/CD 自动部署流程：
```bash
cd "/Users/johnsmacbook/Documents/Codex/Leon-Greek-Coach"
git add .
git commit -m "feat/fix: <你的更新说明>"
git push origin main
# 推送成功后，Vercel 会在 30 秒内完成自动打包上线，刷新 https://leon-greek-coach.vercel.app/ 即可生效
```

---

## 五、 后续 Agent (Codex / Claude Code / Antigravity) 接入指引

当其他 AI Agent 或工具打开 `/Users/johnsmacbook/Documents/Codex/Leon-Greek-Coach` 时：
1. **优先读取**：`00_PROJECT_HANDOVER_AND_ARCHITECTURE.md` 与 `AGENTS.md`。
2. **新增/修改题库**：运行 `scripts/` 下对应的 Python 脚本更新 `frontend/src/data/` 中的 JSON 数据源，并同步刷新 `materials/` 中的 Markdown 备份。
3. **前端交互迭代**：在 `frontend/src/pages/student/StudentApp.tsx` 中迭代，确保遵守**宽容度比对函数 (`isFuzzyGreekMatch`)\** 与 **防卡死按钮规范**。
4. **提交与上线**：使用 `git push origin main` 即可触发自动化生产部署。

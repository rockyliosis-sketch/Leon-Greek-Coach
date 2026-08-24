# 🏛️ 希腊语日常自适应学习系统 (Leon Greek Coach v2.0)

这是一个专为 10 岁的 Leon 定制的希腊语日常自适应学习全栈系统。在 **2.0 版本** 中，系统不仅涵盖完整的 A1-A、A1-B、A2 核心词汇体系，更全面构建了**多维能力知识库**，突破了“低生词高语法/交际单元”的训练痛点，将动词变位公式、名词变格规律、生活黄金对话和情境考题深度融合进每日练习流。

---

## 🌟 v2.0 核心架构与创新亮点

1. **🧠 多维知识库 (Multi-Dimensional Pedagogical Matrix)**
   - 全量覆盖 A1-A（Units 1-15）、A1-B（Units 16-30）、A2（Units 31-39）共 39 个单元。
   - 每个单元除单词外，精细提炼：
     - **语法规则**（如 Aorist 过去时、`να` 从句、中动被动态、变格规律）；
     - **公式矩阵**（动词变位表、冠词/介词缩合、形容词变格）；
     - **生活情境黄金对话**（问路指引、看病求医、命名日祝福、餐厅点餐、集市称重砍价）；
     - **多维考题**（变位、变格、句式、交际、微阅读）。
2. **🎯 低生词高语法/交际单元专项攻坚**
   - 彻底解决“部分单元生词极少（如 A1-B Unit 22 仅 3 词、Unit 28 仅 10 词、Unit 29 仅 9 词、A2 Unit 37 仅 4 词）”导致的日常练习真空问题。
   - 智能提升这些单元的语法变位与情境金句权重。
3. **🏛️ 学生端 9 大实战模块闭环**
   - 包含：连线配对、拼字大作战、智能选择题、正误判断题、希译中输入、中译希输入、真题挑战、单词表艾宾浩斯复习、**单元语法与情景特训（v2.0 新增）**。
4. **🔍 家长后台 (Admin Dashboard) 全景课纲穿透透视**
   - 单元教研标签（`🎯 语法攻坚`、`🗣️ 情境交际`、`📚 核心词汇`）；
   - 支持一键打开 `🔍 查看教学重点、变位与黄金句型 →` 深度弹窗查阅。

---

## 📂 项目结构

*   `frontend/` — 基于 React + Vite + TypeScript + CSS 构建的高质感自适应学习端与家长控制台。
*   `materials/` — 存放教材 PDF、`Leon_Greek_A1_A2_Unit_Skills_Matrix.md` 39 单元全景技能矩阵、双语词汇表与历年官方真题。
*   `backend/` — 基于 Node.js + Express + SQLite 的备份后端。

---

## 🛠️ 本地运行开发指南

### 1. 后端服务启动
1. 进入 backend 目录：
   ```bash
   cd backend
   ```
2. 安装依赖并运行开发服务器：
   ```bash
   npm install
   npm run dev
   ```
   * 后端服务器默认在 `http://localhost:3001` 运行。
   * SQLite 数据库会自动在 `backend/greek_coach.db` 生成并完成表结构初始化。

3. 词汇数据库注入（Seeding）：
   系统在首次启动时是空的，我们在 `backend/scripts` 下准备了初始化数据脚本：
   * **解析基础字典 (必做)**：读取 `Glossary_A1_kids.pdf` 建立 1,300+ 希腊语-英语主词典：
     ```bash
     .venv/bin/python scripts/extract_vocab.py
     ```
   * **生成测试数据**：为 A1-A 前 5 页注入高品质生词和例句对照：
     ```bash
     .venv/bin/python scripts/seed_mock_data.py
     ```

---

### 2. 前端服务启动
1. 进入 frontend 目录：
   ```bash
   cd frontend
   ```
2. 安装依赖并运行前端：
   ```bash
   npm install
   npm run dev
   ```
   * 浏览器打开终端输出的 Vite 本地链接（一般为 `http://localhost:5173`）即可进入 Leon 学习舱。

---

## 🐳 DMIT 服务器部署指南 (Docker Compose)

您的 DMIT 服务器拥有 1TB 的大磁盘空间，使用 Docker Compose 可以一键完成全栈打包和容器化运行。

### 1. 准备工作
将项目上传至您的 DMIT 服务器目录（例如 `/opt/leon-greek-coach`）。

### 2. 编写环境配置文件 `.env`
在项目根目录下创建一个 `.env` 文件，填入您的 Gemini API 密钥：
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. 一键编译与拉起容器
在项目根目录下，执行以下 Docker 命令：
```bash
# 编译并以后台守护进程模式启动
docker-compose up --build -d
```
* 容器启动后，全栈应用将统一绑定并运行在宿主机的 **3001** 端口上。

### 4. 数据备份与安全
* 本项目的数据存储在 `backend/greek_coach.db` 中。该文件已通过卷挂载（Volume Mount）暴露在宿主机的项目目录下。
* 备份数据库只需要每天定时复制并压缩该单文件：
  ```bash
  cp ./backend/greek_coach.db ./backend/backups/greek_coach_$(date +%F).db
  ```

---

## 🌐 域名绑定与 HTTPS 配置 (Caddy 推荐)
如果您想通过域名公共访问您的网站，推荐在 DMIT 服务器上安装 **Caddy** 作为反向代理，它会自动申请 SSL 证书并配置 HTTPS。

在服务器的 `/etc/caddy/Caddyfile` 中写入：
```caddy
greek.yourdomain.com {
    reverse_proxy localhost:3001
}
```
保存后重启 Caddy 服务 (`sudo systemctl restart caddy`)，即可通过安全域名直接在 iPad 上开始每天的学习！

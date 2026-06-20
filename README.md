# 希腊语日常学习与复习工具 (Leon Greek Coach)

这是一个专为 10 岁的 Leon 定制的希腊语日常学习与复习全栈 Web 应用。它将原有的 “大哥哥教练” GEM 流程进行了游戏化和界面化升级，支持课本页码自动计算、双向默写、闪卡复习、音频合成朗读和口语录音纠错。

---

## 📂 项目结构

*   `frontend/` — 基于 React + Vite + TypeScript 构建的卡通卡通风格前端。
*   `backend/` — 基于 Node.js + Express + SQLite 构建的后端，负责进度调度和词汇持久化。
*   `materials/` — 存放教材 PDF 以及 `Glossary_A1_kids.pdf` 原始文件的目录。

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

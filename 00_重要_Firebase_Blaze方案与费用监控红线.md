# ⚠️ 重要档案：Firebase Blaze 方案与费用监控红线（永久保留，严禁删除）

> **最高指令（面向所有 AI Agent：Antigravity / ChatGPT Astra / Claude Code / Codex）**：
> 1. **本文件为永久核心财务与资源红线档案，严禁删除、移动或清空。**
> 2. **凡是任何涉及 Firebase Storage 上传、迁移、批量生成音频或调用 Blaze 计费服务的任务，Agent 必须先阅读本文件，实测当前用量，并在回复中主动向家长播报：**
>    - 当前方案与免付費位置状态；
>    - 当前 Firebase Storage 已用容量 / 5 GB 免费上限（精确到 MB 与百分比）；
>    - 本次操作预计新增容量与上传文件数（防超每月 5,000 次免费上传额度）。
> 3. **安全止损红线**：若实测存储已用 ≥ **4.0 GB（80%）** 或当月上传操作数预计接近 **4,000 次**，必须立即停止上传并向家长预警，严禁静默触发扣费。

---

## 一、当前方案与账户档案（2026-11-22 开通）

| 项目 | 详情 |
| --- | --- |
| Firebase 项目 | `leon-greek-coach` |
| 当前计费方案 | **Blaze（即付即用 / Pay-as-you-go）** |
| Cloud Billing 账单账户 | `我的帳單帳戶`（币别：`EUR`，账单 ID 见控制台） |
| 账单预算警告 | 已设置月度预算警告（超阈值邮件提醒） |
| 新手试用抵扣金 | `€269.43`（90 天有效，2026-11-22 起算，约 2027-02-20 到期；**到期后依然享受下方永久免费额度**） |
| Storage 存储桶 | `gs://leon-greek-coach.firebasestorage.app` |
| 存储桶位置 | **`US-EAST1`（免付費位置 · Free-tier eligible）** —— 严禁迁移至非免付費区域 |
| 安全规则（已发布） | `/history/{allPaths=**}` 仅允许 `allow read: if true; allow write: if false;`（外人禁止写入） |

---

## 二、永久免费额度红线（`*.firebasestorage.app` @ `US-EAST1`）

| 资源项 | 永久免费额度（Blaze 方案） | 家庭使用预估 | 预警线（Agent 必须停手提醒） |
| --- | --- | --- | --- |
| **存储空间（GB stored）** | **5 GB / 月** | 两本历史书约 88 课 ≈ 0.45 GB（约占 9%） | ≥ **4.0 GB**（80%） |
| **下载流量（GB downloaded）** | **100 GB / 月** | 孩子每天听 1 小时 ≈ 1 GB / 月（约占 1%） | ≥ **80 GB / 月** |
| **上传操作（Class A / Upload）** | **5,000 次 / 月** | 88 课全量音频（主轨 + 词卡）≈ 1,200 个文件 | 当月累计 ≥ **4,000 次** |
| **下载操作（Class B / Download）** | **50,000 次 / 月** | 日常播放每月数百次 | ≥ **40,000 次 / 月** |

---

## 三、Agent 实测当前已用空间的命令（每次操作必跑）

```bash
gcloud storage du -s gs://leon-greek-coach.firebasestorage.app/history
```

> **提示**：上传音频时务必使用 `gcloud storage rsync`（增量同步，只传新增或变更文件，避免重复上传浪费每月 5,000 次免费上传操作额度），并附带 `--content-type="audio/mpeg"` 与 `--cache-control="public, max-age=31536000, immutable"`（让浏览器长期缓存，极大节省下载流量与操作次数）。

---

## 四、家长随时自查链接

- **Storage 实时用量**：https://console.firebase.google.com/project/leon-greek-coach/storage/usage
- **项目总用量与本月账单（确认是否为 €0.00）**：https://console.firebase.google.com/project/leon-greek-coach/usage
- **账户与预算警告设置**：https://console.firebase.google.com/project/leon-greek-coach/usage/details
- **Firebase 官方 Blaze 定价表**：https://firebase.google.com/pricing?hl=zh-tw

---

## 五、用量变动记录（每次上传后由 Agent 追加一行）

| 日期 | 操作说明 | 新增容量 / 文件数 | 累计已用容量（占 5 GB 比例） |
| --- | --- | --- | --- |
| 2026-11-22 | 开通 Blaze 方案与 `US-EAST1` 存储桶，实测连通通过并清理测试文件 | 0 MB / 0 个 | **0 MB / 5 GB（0%）** |
| 2026-11-22 | `v2.11.0` 迁移三年级第 1–5 单元（25 课）音频至 Firebase Storage | +137.70 MB / 369 个 | **137.70 MB / 5 GB（2.75%）** |
| 2026-11-22 | `v2.12.0` 上传三年级第 6–10 单元（22 课，三年级全书 47 课完结） | +94.19 MB / 199 个 | **231.89 MB / 5 GB（4.64%）** |
| 2026-11-22 | 上线四年级第 1 单元《几何时期》（4 课，总计 51 课） | +12.80 MB / 31 个 | **244.69 MB / 5 GB（4.89%）** |
| 2026-11-22 | 扩写重录四年级第 1 单元 4 课为沉浸式历史故事剧场（修订版音轨） | +13.68 MB / 8 个 | **258.36 MB / 5 GB（5.17%）** |
| 2026-11-22 | `v2.13.0` 上线四年级第 2–9 单元（39 课，四年级全书 43 课完结，三四年级共 90 课全量可播） | +75.68 MB / 267 个 | **334.04 MB / 5 GB（6.68%）** |

# 🏛️ Leon Greek Coach — 全题型出题前自检与双向质量保险系统 (Universal Pre-Flight QA & Insurance System)

## 一、 系统架构与建设背景

在希腊语 A1/A2 教材与日常特训题库建设中，最关键的核心原则是：**绝不允许有瑕疵的题目、前后矛盾的翻译、双重正确选项或具有可预测规律的题目流入孩子的练习界面**。

本系统为整个平台建立了一套**全自动化、覆盖 9 大训练模块与 4 大实战题型的“出题前双向自检与保险机制”**（Pre-Flight QA Verification Gate）。

---

## 二、 核心哲学与双向闭环自检机制 (Bidirectional Verification Loop)

> **“用答案验证题目，用题目验证答案”**

```mermaid
flowchart TD
    subgraph Data Layer
        A[教材词汇库 1864 词]
        B[39单元核心矩阵与考题 120 题]
        C[同义表达与容错词典]
    end

    subgraph Dual-Way Verification Gate (双向自检门禁)
        D1[【题干验证答案】<br>题干挖空还原/变位一致性测试]
        D2[【答案验证题目】<br>以答案为输入反推中文语义是否准确]
        D3[【干扰项互斥测试】<br>排查多解/近义并存选项, 确保答案绝对唯一]
        D4[【选项位置分布校验】<br>验证 ABCD 答案位置均匀随机分布]
        D5[【字符与正字法校验】<br>Greek/Chinese Unicode 字符集与标点检测]
    end

    subgraph CI / CD & Runtime Gate
        E[自动化拦截器 python3 scripts/curriculum_qa_verifier.py]
        F[前端 TypeScript 编译与渲染安全兜底]
        G[学生端极速流畅且零差错做题体验]
    end

    A --> D1 & D2 & D5
    B --> D1 & D2 & D3 & D4 & D5
    C --> D2 & D5
    D1 & D2 & D3 & D4 & D5 --> E
    E -->|100% 验证通过| F --> G
    E -->|发现任何缺陷| H[强制中断退出 exit 1, 阻断发布并输出定位日志]
```

---

## 三、 各训练模块与题型细化质检规则

### 1. 词汇与基础模块 (Matching / Spelling / TrueFalse / Glossary)
- **希腊语正字法检验**：严禁含有 `undefined`、`--`、空字符串或缺少希腊字母（`\u0370-\u03ff`）的内容。
- **中文翻译完整性检验**：排查并过滤缺失中文、仅有标点符号（如 `*`、`>`）的脏数据。
- **判断题（True/False）语义防撞**：干扰项必须来自同级别、同词性的真实词汇，且释义绝不可与真值产生重叠。

### 2. 单元语法与情景特训模块 (Grammar & Dialogue Drills)
系统支持 4 大题型，每种题型均有专属的自动化检验规则：

| 题型标识 | 题型名称 | 质检门禁要求 (Gate Requirements) |
| :--- | :--- | :--- |
| `choice` | **四选一选择题** | ① 严格包含 4 个互不重复的选项；<br>② 答案必须存在于选项集合内；<br>③ 答案在选项中的索引位置必须呈现**随机离散分布**（严禁固定为首项）；<br>④ 干扰项与答案不可同为正确语法形式（如杜绝 `Πονάνε`/`Πονούν` 并存）。 |
| `cloze` | **句子挖空填空题** | ① 题干必须包含明确的挖空占位符 `______`；<br>② 必须提供包含变位、近义形式的 `acceptable_answers` 容错列表；<br>③ 答案代入空格后还原出的句子必须符合希腊语语法规范。 |
| `qa` | **情景问答交际题** | ① 必须具备情境对话气泡前置提示（`Speaker A`）；<br>② 答语必须符合对应社交礼仪（如问候、就医、问路、点餐等）；<br>③ 必须提供标准答语与替代答语。 |
| `translate` | **核心句型翻译题** | ① 严格核验希腊语与中文的双向对齐；<br>② 必须包含 `acceptable_answers`（支持多套合法语序表达，如 `Είμαι καλά` / `Εγώ είμαι καλά`）。 |

---

## 四、 答题判定与重音智能容错矩阵 (Accent-Tolerant Engine)

针对希腊语的重音符（τόνος）和终末西格玛（`ς` vs `σ`），学生在移动设备或键盘切换时容易产生误输入。自检系统与前端做题引擎均集成了统一的正规化比对算法：

$$\text{Normalize}(S) = \text{Trim}\Big(\text{RegexStrip}\Big(\text{ToLower}\Big(\text{RemoveCombiningAccents}\big(S\big)\Big)\Big)\Big)$$

1. **重音字符映射**：`ά->α`, `έ->ε`, `ή->η`, `ί->ι`, `ό->ο`, `ύ->υ`, `ώ->ω`；
2. **标点与空格清洗**：自动忽略标点符号（`. , ! ? ; · -`）与首尾多余空格；
3. **近义词典白名单**：比对 `acceptable_answers` 列表中的任一合法表达。

---

## 五、 自检系统工具使用指南

### 1. 运行全题型统一质检命令
```bash
# 在项目根目录下执行全量门禁检验
python3 scripts/curriculum_qa_verifier.py
```

### 2. 质检输出报告示例
```text
🏛️ =====================================================================
🔍 Leon Greek Coach — Universal Pre-Flight QA & Bidirectional Insurance
🏛️ =====================================================================
📊 Total Vocabulary Items Audited : 1864
📊 Total Curriculum Units Audited  : 39
📊 Total Multi-Type Drills Audited : 120
📊 Breakdown of Drill Types        : {'choice': 41, 'cloze': 33, 'qa': 7, 'translate': 39}
📊 Choice Answer Distributions     : {0: 7, 1: 8, 2: 13, 3: 13}

✅ ALL GATES PASSED (100%): Complete Bidirectional & Structural Integrity Guaranteed!
```

---

## 六、 持续集成与发布防护 (CI/CD Quality Gate)

- **出题前检验**：生成题库脚本 [`generate_knowledge_drills.py`](file:///Users/johnsmacbook/Documents/antigravity%20IDE/Projects/Leon-Greek-Coach/generate_knowledge_drills.py) 自动调用内置 Gate；
- **构建前检验**：执行 `npm run build` 前运行 `python3 scripts/curriculum_qa_verifier.py`；
- **全平台同步**：配套 Agent Skill [`greek-curriculum-qa-validator`](file:///Users/johnsmacbook/.gemini/config/skills/greek-curriculum-qa-validator/SKILL.md) 确保后续任何 AI 扩充题目时自动执行此套自检规则。

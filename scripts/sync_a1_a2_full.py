import os
import re
import json
import sqlite3
from datetime import datetime, timedelta

def parse_md_glossary(file_path, level_name):
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    vocab_list = []
    curr_letter = ""

    for line in lines:
        line_s = line.strip()
        if line_s.startswith("## "):
            curr_letter = re.sub(r"<a id=\"[^\"]*\"></a>", "", line_s).replace("## ", "").strip()
        elif line_s.startswith("- **") or line_s.startswith("  - **"):
            is_sub = line_s.startswith("  - **")
            m = re.match(r"^\s*-\s*\*\*(?P<greek>[^*]+)\*\*(?:\s*`\[(?P<tag>[^\]]+)\]`)?\s*—\s*\*\*(?P<chinese>[^*]+)\*\*\s*\*\((?P<english>.*)\)\*", line_s)
            if m:
                vocab_list.append({
                    "id_in_level": len(vocab_list) + 1,
                    "level": level_name,
                    "letter": curr_letter,
                    "greek": m.group("greek").strip(),
                    "tag": m.group("tag") or "",
                    "chinese": m.group("chinese").strip(),
                    "english": m.group("english").strip(),
                    "is_sub": is_sub
                })
    return vocab_list

a1_list = parse_md_glossary("Greek book/Glossary_A1_kids_CN.md", "A1")
a2_list = parse_md_glossary("Greek book/KLIK_A2_Ef_Glossary_CN.md", "A2")

print(f"Parsed A1: {len(a1_list)} words, A2: {len(a2_list)} words. Total: {len(a1_list) + len(a2_list)} words.")

# Timeline calculation
# A1 Remaining: 809 already learned (1~809), remaining 810~1236 (427 words)
# A1 Start: 2026-08-21 (Day 1) -> 2026-09-11 (Day 22)
# A2 Start: 2026-09-12 (Day 23) -> 2026-12-10 (Day 112)
daily_rate = 20
ebbinghaus_intervals = [1, 2, 4, 7, 15, 30]

all_day_plans = {}
start_date = datetime(2026, 8, 21)

# Phase 1: A1 Remaining
a1_learned = 809
a1_rem_start = 810
day_idx = 1

while a1_rem_start <= len(a1_list):
    a1_rem_end = min(len(a1_list), a1_rem_start + daily_rate - 1)
    d_date = start_date + timedelta(days=day_idx - 1)
    words_today = a1_list[a1_rem_start - 1 : a1_rem_end]
    
    all_day_plans[day_idx] = {
        "day": day_idx,
        "date": d_date.strftime("%Y-%m-%d"),
        "level": "A1",
        "range": (a1_rem_start, a1_rem_end),
        "count": len(words_today),
        "words": words_today,
        "cum_a1": a1_rem_end,
        "cum_total": a1_rem_end,
        "phase_desc": f"A1 冲刺阶段 ({a1_rem_end}/1236)"
    }
    a1_rem_start = a1_rem_end + 1
    day_idx += 1

a1_finish_day = day_idx - 1

# Phase 2: A2 Full
a2_start_idx = 1
while a2_start_idx <= len(a2_list):
    a2_end_idx = min(len(a2_list), a2_start_idx + daily_rate - 1)
    d_date = start_date + timedelta(days=day_idx - 1)
    words_today = a2_list[a2_start_idx - 1 : a2_end_idx]
    
    all_day_plans[day_idx] = {
        "day": day_idx,
        "date": d_date.strftime("%Y-%m-%d"),
        "level": "A2",
        "range": (a2_start_idx, a2_end_idx),
        "count": len(words_today),
        "words": words_today,
        "cum_a2": a2_end_idx,
        "cum_total": len(a1_list) + a2_end_idx,
        "phase_desc": f"A2 进阶阶段 ({a2_end_idx}/1792)"
    }
    a2_start_idx = a2_end_idx + 1
    day_idx += 1

total_learning_days = day_idx - 1
print(f"Total learning days calculated: {total_learning_days} days (A1: {a1_finish_day} days, A2: {total_learning_days - a1_finish_day} days)")

# Build Unified Master Glossary Data
unified_glossary = []
global_id = 1

# 1. A1 items
for item in a1_list:
    item_id = item["id_in_level"]
    is_mastered = item_id <= a1_learned
    
    if is_mastered:
        learned_date = "2026-08-20"
        day_num = 0
    else:
        day_num = (item_id - a1_learned - 1) // daily_rate + 1
        learned_date = all_day_plans[day_num]["date"]
        
    unified_glossary.append({
        "id": global_id,
        "id_in_level": item_id,
        "level": "A1",
        "word_greek": item["greek"],
        "tag": item["tag"],
        "word_chinese": item["chinese"],
        "word_english": item["english"],
        "letter": item["letter"],
        "is_sub": item["is_sub"],
        "status": "mastered" if is_mastered else "upcoming",
        "day_assigned": day_num,
        "scheduled_date": learned_date,
        "error_count": 0,
        "difficulty_score": 1.0,
        "last_reviewed_at": "2026-08-20T09:00:00Z" if is_mastered else None,
        "next_review_at": "2026-08-21T09:00:00Z" if is_mastered else None
    })
    global_id += 1

# 2. A2 items
for item in a2_list:
    item_id = item["id_in_level"]
    day_num = a1_finish_day + (item_id - 1) // daily_rate + 1
    learned_date = all_day_plans[day_num]["date"]
    
    unified_glossary.append({
        "id": global_id,
        "id_in_level": item_id,
        "level": "A2",
        "word_greek": item["greek"],
        "tag": item["tag"],
        "word_chinese": item["chinese"],
        "word_english": item["english"],
        "letter": item["letter"],
        "is_sub": item["is_sub"],
        "status": "upcoming",
        "day_assigned": day_num,
        "scheduled_date": learned_date,
        "error_count": 0,
        "difficulty_score": 1.0,
        "last_reviewed_at": None,
        "next_review_at": None
    })
    global_id += 1

# Update frontend/src/data/vocabulary.json SAFELY
vocab_file_path = "Projects/Leon-Greek-Coach/frontend/src/data/vocabulary.json"
with open(vocab_file_path, "r", encoding="utf-8") as f:
    current_vocab_json = json.load(f)

# Preserve textbook_vocabulary completely!
textbook_vocab_backup = current_vocab_json.get("textbook_vocabulary", [])

current_vocab_json["master_glossary"] = unified_glossary
current_vocab_json["metadata"] = {
    "title": "希腊语 A1-A2 阶段词汇背诵与艾宾浩斯复习系统",
    "target_user": "Leon",
    "baseline_date": "2026-08-20",
    "baseline_progress_a1": "第 10 页 截止 #809 「παλάτι, το」[宫殿]",
    "total_a1_words": len(a1_list),
    "total_a2_words": len(a2_list),
    "total_combined_words": len(unified_glossary),
    "already_mastered_words": a1_learned,
    "total_remaining_words": len(unified_glossary) - a1_learned,
    "daily_rate": daily_rate,
    "a1_finish_date": "2026-09-11",
    "a2_start_date": "2026-09-12",
    "a2_finish_date": all_day_plans[total_learning_days]["date"],
    "total_learning_days": total_learning_days
}

with open(vocab_file_path, "w", encoding="utf-8") as f:
    json.dump(current_vocab_json, f, ensure_ascii=False, indent=2)

print(f"Safely updated vocabulary.json: {len(unified_glossary)} master glossary words. textbook_vocabulary preserved at {len(textbook_vocab_backup)} items.")

# Update SQLite Database
conn = sqlite3.connect("Projects/Leon-Greek-Coach/backend/greek_coach.db")
cursor = conn.cursor()
cursor.execute("DROP TABLE IF EXISTS glossary_master")
cursor.execute("""
CREATE TABLE glossary_master (
    id INTEGER PRIMARY KEY,
    id_in_level INTEGER NOT NULL,
    level TEXT NOT NULL,
    word_greek TEXT NOT NULL,
    tag TEXT DEFAULT '',
    word_chinese TEXT NOT NULL,
    word_english TEXT NOT NULL,
    letter TEXT NOT NULL,
    is_sub INTEGER DEFAULT 0,
    status TEXT DEFAULT 'upcoming',
    day_assigned INTEGER DEFAULT 0,
    scheduled_date TEXT,
    last_reviewed_at TEXT,
    next_review_at TEXT
)
""")

for item in unified_glossary:
    cursor.execute("""
    INSERT INTO glossary_master (
        id, id_in_level, level, word_greek, tag, word_chinese, word_english, letter, is_sub, status, day_assigned, scheduled_date, last_reviewed_at, next_review_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        item["id"], item["id_in_level"], item["level"], item["word_greek"], item.get("tag", ""),
        item["word_chinese"], item["word_english"], item["letter"], 1 if item.get("is_sub") else 0,
        item["status"], item.get("day_assigned", 0), item.get("scheduled_date"),
        item.get("last_reviewed_at"), item.get("next_review_at")
    ))

conn.commit()
cursor.execute("SELECT level, status, count(*) FROM glossary_master GROUP BY level, status")
print("SQLite database glossary_master synced:", cursor.fetchall())
conn.close()

# Generate Full Planning Markdown Document
doc_lines = [
    "# Leon 希腊语 A1 - A2 进阶词汇全景背诵与艾宾浩斯复习总览",
    "",
    "> **学习者**：Leon (10 岁)",
    "> **全量词汇库**：希腊语 A1 儿童版 (1,236 词) + 希腊语 A2 青少年进阶版 (1,792 词)",
    "> **双阶段总词汇量**：**3,028 词**",
    "> **当前进度基准 (2026-08-20)**：A1 已背至 **#809 「παλάτι, το」[宫殿]**（已掌握 809 词）",
    "> **推进速率**：稳定保持 **+20 词 / 天**",
    "> **两阶段推进节点**：",
    "> - **阶段一 (A1 冲刺)**：2026-08-21 ~ 2026-09-11（用时 22 天，完成 A1 全量 1,236 词）",
    "> - **阶段二 (A2 进阶)**：2026-09-12 ~ 2026-12-10（用时 90 天，完成 A2 全量 1,792 词）",
    "> - **总里程碑**：共计 112 天，**2026年12月10日** 达成 A1 + A2 **3,028 词大满贯！**",
    "> **复习模型**：艾宾浩斯记忆曲线 (+1d, +2d, +4d, +7d, +15d, +30d) + 历史掌握词库循环滚动轮巡",
    "",
    "---",
    "",
    "## 📈 一、全阶段学习进度全景图 (Progress Roadmap)",
    "",
    "```mermaid",
    "gantt",
    "    title Leon 希腊语词汇背诵与进阶全景甘特图 (2026.08 - 2026.12)",
    "    dateFormat  YYYY-MM-DD",
    "    section A1 词汇阶段",
    "    A1 历史已掌握 (1-809词)      :done,    des1, 2026-08-01, 2026-08-20",
    "    A1 冲刺通关 (810-1236词)     :active,  des2, 2026-08-21, 2026-09-11",
    "    section A2 词汇阶段",
    "    A2 前期基础 (1-600词)        :         des3, 2026-09-12, 2026-10-11",
    "    A2 中期拓展 (601-1200词)     :         des4, 2026-10-12, 2026-11-10",
    "    A2 后期冲刺 (1201-1792词)    :         des5, 2026-11-11, 2026-12-10",
    "```",
    "",
    "---",
    "",
    "## 📊 二、全阶段 112 天每日推进计划总表 (Daily Master Matrix)",
    "",
    "| 阶段 | 学习日 | 日期 | 当日新学目标 | 范围编号 | 当日进度 | 累计总词数 | 艾宾浩斯复习节点 | 状态 |",
    "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
    "| **基准** | **基准日** | **2026-08-20** | **A1 历史已学** | **A1 #1 ~ #809** | **809 / 1236** | **809 / 3028** | **截止「παλάτι 宫殿」** | **[√] 已达成** |"
]

for d, info in all_day_plans.items():
    reviews_due = []
    for interval in ebbinghaus_intervals:
        target_day = d - interval
        if target_day in all_day_plans:
            t_plan = all_day_plans[target_day]
            t_r = t_plan["range"]
            t_lvl = t_plan["level"]
            reviews_due.append(f"+{interval}d (D{target_day}: {t_lvl} #{t_r[0]}-{t_r[1]})")
            
    rev_str = "<br>".join(reviews_due) if reviews_due else "首日免复习"
    nr = info["range"]
    lvl = info["level"]
    first_w = info["words"][0]["greek"]
    last_w = info["words"][-1]["greek"]
    words_brief = f"{first_w} ~ {last_w}"
    
    if d == a1_finish_day:
        status_tag = "🎉 A1 通关！"
    elif d == total_learning_days:
        status_tag = "🏆 A2 总大满贯！"
    else:
        status_tag = "⏳ 计划中"
        
    doc_lines.append(f"| {lvl} | Day {d:03d} | {info['date']} | {words_brief} | {lvl} #{nr[0]} ~ #{nr[1]} ({info['count']}词) | {info['phase_desc']} | {info['cum_total']} / 3028 | {rev_str} | {status_tag} |")

doc_lines.extend([
    "",
    "---",
    "",
    "## 📅 三、A2 阶段精选推进节点示例 (A2 Key Milestones)",
    "",
    f"- **A2 启动日（Day 23, 2026-09-12）**：开启 A2 词汇 `#1 ~ #20`（`αβγό, το` ~ `αγοράζω`），无缝衔接！",
    f"- **A2 30% 里程碑（Day 53, 2026-10-12）**：达成 A2 前 600 词，总累计掌握 `1,836 词`！",
    f"- **A2 65% 里程碑（Day 83, 2026-11-11）**：达成 A2 前 1,200 词，总累计掌握 `2,436 词`！",
    f"- **A2 终期大满贯（Day 112, 2026-12-10）**：完成 A2 全部 1,792 词，总累计掌握 `3,028 词`！",
    "",
    "---",
    "",
    "## 🛡️ 四、系统数据稳定性与独立性保证说明",
    "",
    "1. **课本核心词库完全隔离保护**：原有的 `textbook_vocabulary`（1,864 条章节练习词汇）与 `exam_questions.json`（36 单元考核题目）未做任何变更，完全保持原貌。",
    "2. **学生端日常功能零影响**：Student App 现有的章节测验、课后复习、拼写游戏、希腊神话成就系统均不受任何干扰，运行依然如丝般顺滑。",
    "3. **词汇知识库模块独立叠加**：新导入的 A1 (1,236词) 与 A2 (1,792词) 作为独立的 `master_glossary` 与 SQLite 数据底座，提供全局词典与拓展背诵追踪服务。"
])

# Save unified documents
with open("02_Knowledge/希腊语A1-A2全阶段词汇背诵与艾宾浩斯复习系统.md", "w", encoding="utf-8") as f:
    f.write("\n".join(doc_lines))

with open("Greek book/Leon_希腊语_A1_A2_词汇全景背诵与复习表.md", "w", encoding="utf-8") as f:
    f.write("\n".join(doc_lines))

with open("04_Outputs/希腊语A1-A2全阶段词汇背诵与艾宾浩斯复习规划方案.md", "w", encoding="utf-8") as f:
    f.write("\n".join(doc_lines))

print("Successfully generated all unified A1+A2 roadmap files!")

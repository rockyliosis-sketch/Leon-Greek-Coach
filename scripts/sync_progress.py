import os
import re
import json
from datetime import datetime, timedelta

# 1. Parse Glossary_A1_kids_CN.md
with open("Greek book/Glossary_A1_kids_CN.md", "r", encoding="utf-8") as f:
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
                "id": len(vocab_list) + 1,
                "letter": curr_letter,
                "greek": m.group("greek").strip(),
                "tag": m.group("tag") or "",
                "chinese": m.group("chinese").strip(),
                "english": m.group("english").strip(),
                "is_sub": is_sub
            })

start_date = datetime(2026, 8, 21)
daily_new = 20
learned_so_far = 809
ebbinghaus_intervals = [1, 2, 4, 7, 15, 30]

day_plans = {}
curr_start = learned_so_far + 1
day_idx = 1

while curr_start <= len(vocab_list):
    curr_end = min(len(vocab_list), curr_start + daily_new - 1)
    d_date = start_date + timedelta(days=day_idx - 1)
    date_str = d_date.strftime("%Y-%m-%d")
    
    words_today = vocab_list[curr_start - 1 : curr_end]
    
    day_plans[day_idx] = {
        "day": day_idx,
        "date": date_str,
        "range": (curr_start, curr_end),
        "count": len(words_today),
        "words": words_today,
        "cum_learned": curr_end,
        "percent": (curr_end / len(vocab_list)) * 100
    }
    
    curr_start = curr_end + 1
    day_idx += 1

# Generate Greek book/Leon_A1_词汇背诵进度与艾宾浩斯复习表.md
doc_lines = [
    "# Leon 希腊语 A1 词汇背诵进度与艾宾浩斯复习全景表",
    "",
    "> **学生**：Leon (10 岁)",
    "> **词汇库**：希腊语 A1 儿童版双语词汇手册 (`Glossary_A1_kids_CN`)",
    "> **总词汇量**：1,236 词",
    "> **当前进度基准 (2026-08-20)**：已背完第 10 页，截止词条 **#809 「παλάτι, το」[宫殿]**（已掌握 809 词，完成率 65.5%）",
    "> **每日推进速率**：+20 新词/天",
    "> **总周期**：22 天（2026-08-21 至 2026-09-11 达成 100% 全书通关）",
    "> **复习模型**：艾宾浩斯记忆曲线 (+1d, +2d, +4d, +7d, +15d, +30d) + 历史掌握词滚动轮巡 (40词/天)",
    "",
    "---",
    "",
    "## 📊 一、22天学习推进与复习全景总览 (Overview Matrix)",
    "",
    "| 学习日 | 日期 | 每日新学词条 | 范围编号 | 累计掌握数 | 总进度 | 艾宾浩斯复习批次 (新学词) | 历史掌握词轮巡 (809词池) | 状态 |",
    "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
    "| **基准日** | **2026-08-20** | **历史已学累计** | **#1 ~ #809** | **809 / 1236** | **65.5%** | **已学截止「παλάτι 宫殿」** | **历史基础牢固** | **[√] 已达成** |"
]

for d, info in day_plans.items():
    reviews_due = []
    for interval in ebbinghaus_intervals:
        target_day = d - interval
        if target_day in day_plans:
            t_r = day_plans[target_day]["range"]
            reviews_due.append(f"+{interval}d (D{target_day}: #{t_r[0]}-{t_r[1]})")
            
    rev_str = "<br>".join(reviews_due) if reviews_due else "首日免复习"
    
    hist_start = ((d - 1) * 40) % 809 + 1
    hist_end = min(809, hist_start + 39)
    hist_str = f"#{hist_start} ~ #{hist_end} (40词)"
    
    nr = info["range"]
    first_w = info["words"][0]["greek"]
    last_w = info["words"][-1]["greek"]
    words_brief = f"{first_w} ~ {last_w}"
    
    status_tag = "🎯 最终通关！" if d == 22 else "⏳ 待执行"
    
    doc_lines.append(f"| Day {d:02d} | {info['date']} | {words_brief} | #{nr[0]} ~ #{nr[1]} ({info['count']}词) | {info['cum_learned']} / 1236 | {info['percent']:.1f}% | {rev_str} | {hist_str} | {status_tag} |")

doc_lines.extend([
    "",
    "---",
    "",
    "## 📅 二、每日背诵与复习任务卡片 (Daily Action Cards)",
    ""
])

for d, info in day_plans.items():
    nr = info["range"]
    doc_lines.append(f"### 📍 Day {d:02d}（{info['date']}）任务清单")
    doc_lines.append(f"- **🎯 今日新学目标（{info['count']} 词）**：编号 `#{nr[0]}` 至 `#{nr[1]}` | 累计进度：`{info['cum_learned']}/1236` ({info['percent']:.1f}%)")
    doc_lines.append("")
    doc_lines.append("#### 🟢 1. 今日新学词汇表：")
    for w in info["words"]:
        tag_str = f" `[{w['tag']}]`" if w["tag"] else ""
        sub_str = "  - " if w["is_sub"] else "- "
        doc_lines.append(f"{sub_str}**#{w['id']}** **{w['greek']}**{tag_str} — **{w['chinese']}** *({w['english']})*")
    doc_lines.append("")
    
    # Reviews
    reviews_due = []
    for interval in ebbinghaus_intervals:
        target_day = d - interval
        if target_day in day_plans:
            t_plan = day_plans[target_day]
            reviews_due.append((interval, target_day, t_plan))
            
    doc_lines.append("#### 🔁 2. 今日艾宾浩斯复习任务：")
    if not reviews_due:
        doc_lines.append("- *(首日开始，无前序新词到期复习)*")
    else:
        for itv, t_day, t_plan in reviews_due:
            t_nr = t_plan["range"]
            doc_lines.append(f"- **【+{itv}天复习】Day {t_day:02d} 词包（#{t_nr[0]}~#{t_nr[1]}）**：")
            sample_words = ", ".join([w["greek"] for w in t_plan["words"][:6]]) + (" 等" if len(t_plan["words"]) > 6 else "")
            doc_lines.append(f"  - 包含词汇：{sample_words}")
            
    hist_start = ((d - 1) * 40) % 809 + 1
    hist_end = min(809, hist_start + 39)
    doc_lines.append("")
    doc_lines.append("#### 🔄 3. 历史掌握词（前809词池）滚动快刷：")
    doc_lines.append(f"- **快速抽检批次**：编号 `#{hist_start}` ~ `#{hist_end}`（共 40 词，建议用时 3~5 分钟快速看希腊语说中文）")
    doc_lines.append("")
    doc_lines.append("---")
    doc_lines.append("")

# Save to Greek book
with open("Greek book/Leon_A1_词汇背诵进度与艾宾浩斯复习表.md", "w", encoding="utf-8") as f:
    f.write("\n".join(doc_lines))

# Save to 02_Knowledge
with open("02_Knowledge/希腊语A1词汇背诵与艾宾浩斯复习系统.md", "w", encoding="utf-8") as f:
    f.write("\n".join(doc_lines))

# Save to 04_Outputs
with open("04_Outputs/希腊语A1词汇进阶与艾宾浩斯复习实施方案.md", "w", encoding="utf-8") as f:
    f.write("\n".join(doc_lines))

# Now, build frontend/src/data/vocabulary.json master_glossary
master_glossary = []
for item in vocab_list:
    item_id = item["id"]
    is_mastered = item_id <= learned_so_far
    
    # Calculate scheduled learning date
    if is_mastered:
        learned_date = "2026-08-20"
        day_num = 0
    else:
        # Which day plan?
        day_num = (item_id - learned_so_far - 1) // daily_new + 1
        learned_date = day_plans[day_num]["date"]
        
    master_glossary.append({
        "id": item_id,
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

vocab_file_path = "Projects/Leon-Greek-Coach/frontend/src/data/vocabulary.json"
with open(vocab_file_path, "r", encoding="utf-8") as f:
    current_vocab_json = json.load(f)

current_vocab_json["master_glossary"] = master_glossary
current_vocab_json["metadata"] = {
    "title": "希腊语 A1 儿童版词汇背诵与艾宾浩斯复习系统",
    "target_user": "Leon",
    "baseline_date": "2026-08-20",
    "baseline_progress_word_id": 809,
    "baseline_progress_word": "παλάτι, το",
    "baseline_progress_meaning": "宫殿",
    "total_words": len(vocab_list),
    "learned_count": learned_so_far,
    "remaining_count": len(vocab_list) - learned_so_far,
    "daily_rate": daily_new,
    "total_days": len(day_plans),
    "target_finish_date": "2026-09-11"
}

with open(vocab_file_path, "w", encoding="utf-8") as f:
    json.dump(current_vocab_json, f, ensure_ascii=False, indent=2)

print("Updated vocabulary.json with master_glossary (1236 items) and metadata!")

import sqlite3
import json
import re

DB_PATH = "backend/greek_coach.db"
JSON_PATH = "frontend/src/data/vocabulary.json"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=== 开始执行词库深度清洗与单词/单句规范化 ===")

# 1. 删除思维导图/脑图堆叠字符串、语法列表等无效词条
garbage_ids = [814, 677, 815, 940, 1099, 1581]
for gid in garbage_ids:
    cursor.execute("DELETE FROM vocabulary WHERE id = ?", (gid,))
print(f"删除了 {len(garbage_ids)} 个思维导图堆叠与语法代词表头词条。")

# 2. 插入 Unit 24 拆解后的纯粹、标准独立单词
new_unit_24_words = [
    (None, "a1-b", 24, 34, "ίσιος", "直的 (直发)", "isios", "Έχει ίσια μαλλιά.", "他有直发。", 0, 1, None, None, None),
    (None, "a1-b", 24, 34, "κυματιστός", "波浪状的 (波浪发)", "kymatistos", "Έχει κυματιστά μαλλιά.", "她有波浪发。", 0, 1, None, None, None),
    (None, "a1-b", 24, 34, "σγουρός", "卷曲的 (卷发)", "sgouros", "Έχει σγουρά μαλλιά.", "他有卷发。", 0, 1, None, None, None),
    (None, "a1-b", 24, 34, "μαλλιά", "头发", "mallia", "Έχει όμορφα μαλλιά.", "他/她有漂亮的头发。", 0, 1, None, None, None),
    (None, "a1-b", 24, 34, "κοντός", "短的", "kontos", "Έχει κοντά μαλλιά.", "他有短发。", 0, 1, None, None, None),
    (None, "a1-b", 24, 34, "μακρύς", "长的", "makrys", "Έχει μακριά μαλλιά.", "她有长发。", 0, 1, None, None, None),
]

for w in new_unit_24_words:
    # Check if already exists
    cursor.execute("SELECT id FROM vocabulary WHERE word_greek = ? AND book_id = 'a1-b' AND unit = 24", (w[4],))
    if not cursor.fetchone():
        cursor.execute("""
            INSERT INTO vocabulary (book_id, unit, page_number, word_greek, word_chinese, pronunciation, example_greek, example_chinese, error_count, difficulty_score, note_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (w[1], w[2], w[3], w[4], w[5], w[6], w[7], w[8], w[9], w[10], w[13]))
        print(f"新增 Unit 24 标准单词: {w[4]} ({w[5]})")

# 3. 规范化多性词尾后缀缩写 (如 -η, -ο -> 原形阳性)
cursor.execute("SELECT id, word_greek, word_chinese FROM vocabulary")
all_rows = cursor.fetchall()

suffix_pattern = re.compile(r"^([^,]+),\s*-[ηιαόηο]+,\s*-[οό]+\s*$", re.IGNORECASE)

cleaned_suffixes = 0
for r in all_rows:
    vid, gr, zh = r
    # Strip suffixes like "αγαπημένος, -η, -ο" -> "αγαπημένος"
    if ", -" in gr or ", -" in gr:
        base_word = gr.split(",")[0].strip()
        cursor.execute("UPDATE vocabulary SET word_greek = ? WHERE id = ?", (base_word, vid))
        cleaned_suffixes += 1
        print(f"规范化形容词词尾: ID {vid} '{gr}' -> '{base_word}'")

print(f"共规范化了 {cleaned_suffixes} 个形容词三性词尾。")

# 4. 规范化代词/疑问词/代词格并列串
normalize_map = {
    172: ("έκαναν", "他们/她们/它们做 (过去时)", "ekanan"),
    179: ("έκανε", "他/她/它做 (过去时)", "ekane"),
    378: ("δικός μου", "我的 (阳性)", "dikos mou"),
    451: ("εκείνος", "那个 / 那位", "ekeinos"),
    479: ("ένας", "一个 (阳性)", "enas"),
    1320: ("ποιοι", "谁 / 哪些人 (复数)", "poioi"),
    1322: ("ποιος", "谁 / 哪一位", "poios"),
    1342: ("πόσοι", "多少 (阳性复数)", "posoi"),
    1343: ("πόσος", "多少 (阳性单数)", "posos"),
    727: ("Κάνω μπάνιο στη θάλασσα.", "我在海里游泳。", "Kano banio sti thalassa."),
    729: ("Κάνω ταξίδι και πίνω κρύο καφέ.", "我旅行并喝冰咖啡。", "Kano taxidi kai pino kryo kafe."),
    964: ("Μένω στο σπίτι και βλέπω τηλεόραση.", "我呆在家里看电视。", "Meno sto spiti kai vlepo tileorasi."),
    1272: ("Πηγαίνω στο θέατρο και σε συναυλίες.", "我去剧院和音乐会。", "Pigaino sto theatro kai se synavlies."),
}

for vid, (norm_gr, norm_zh, norm_pro) in normalize_map.items():
    cursor.execute("""
        UPDATE vocabulary 
        SET word_greek = ?, word_chinese = ?, pronunciation = ?
        WHERE id = ?
    """, (norm_gr, norm_zh, norm_pro, vid))
    print(f"重构并规范化词条 ID {vid}: '{norm_gr}' ===> '{norm_zh}'")

conn.commit()

# 5. 重新导出 vocabulary.json
cursor.execute("SELECT id, book_id, unit, page_number, word_greek, word_chinese, pronunciation, example_greek, example_chinese, error_count, difficulty_score, last_reviewed_at, next_review_at, note_date FROM vocabulary ORDER BY id ASC")
exported_vocab = []
col_names = [desc[0] for desc in cursor.description]
for row in cursor.fetchall():
    exported_vocab.append(dict(zip(col_names, row)))

# Load existing master_glossary
with open(JSON_PATH, "r", encoding="utf-8") as f:
    existing_json = json.load(f)

existing_json["textbook_vocabulary"] = exported_vocab

with open(JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(existing_json, f, ensure_ascii=False, indent=2)

print(f"\n✅ 清洗完成！全量干净词条共 {len(exported_vocab)} 条，已同步写入 {JSON_PATH}。")
conn.close()

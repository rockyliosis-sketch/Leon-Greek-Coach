import sqlite3
import json
import os
import re

DB_PATH = "backend/greek_coach.db"
VOCAB_JSON_PATH = "frontend/src/data/vocabulary.json"
EXAM_JSON_PATH = "frontend/src/data/exam_questions.json"

# Accent stripping helper for pronunciation
def get_pron(word):
    accents = {
        'ά': 'a', 'έ': 'e', 'ή': 'i', 'ί': 'i', 'ό': 'o', 'ύ': 'y', 'ώ': 'o',
        'α': 'a', 'β': 'v', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'i',
        'θ': 'th', 'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x',
        'ο': 'o', 'π': 'p', 'ρ': 'r', 'σ': 's', 'τ': 't', 'υ': 'y', 'φ': 'f',
        'χ': 'ch', 'ψ': 'ps', 'ω': 'o', 'ς': 's',
        'Ά': 'a', 'Έ': 'e', 'Ή': 'i', 'Ί': 'i', 'Ό': 'o', 'Ύ': 'y', 'Ώ': 'o'
    }
    res = []
    for char in word.lower():
        res.append(accents.get(char, char))
    cleaned = "".join(res)
    cleaned = re.sub(r'[^a-z]', '', cleaned)
    return cleaned

test_vocab = [
    ("βάφτιση", "洗礼"),
    ("γάμος", "婚礼"),
    ("εγκαίνια", "开业剪彩 / 开幕式"),
    ("συλλυπητήρια", "吊唁 / 节哀"),
    ("συγχαρητήρια", "祝贺 / 恭喜"),
    ("περαστικά", "早日康复"),
    ("γκαράζ", "车库"),
    ("δημόσια υπηρεσία", "公共服务部门"),
    ("αστυνομική ταυτότητα", "身份证"),
    ("επίσημο έγγραφο", "官方文件 / 正式文档"),
    ("διαβατήριο", "护照"),
    ("ληξιαρχείο", "注册处 / 民事登记处"),
    ("τροχαία", "交警 / 交通警察"),
    ("πρώτες βοήθειες", "急救 / 第一时间救援"),
    ("πιστοποιητικό γέννησης", "出生证明"),
    ("δηλώνω", "申报 / 声明"),
    ("εξυπηρετώ", "服务 / 协助"),
    ("διάστημα", "时间段 / 间隔"),
    ("ΚΕΠ", "公民服务中心 (Κέντρο Εξυπηρέτησης Πολιτών)"),
    ("λογαριασμός τηλεφώνου", "电话账单"),
    ("προσωπικά στοιχεία", "个人信息 / 个人资料"),
    ("πυροσβεστική", "消防队 / 消防局"),
    ("κλέφτης", "小偷 / 窃贼"),
    ("κατάθεση", "存款 / 存钱"),
    ("ανάληψη", "取款 / 提款"),
    ("δέμα", "包裹"),
    ("γραμματόσημο", "邮票"),
    ("γραμματοκιβώτιο", "邮箱 / 信箱"),
    ("εφορία", "税务局"),
    ("αίτηση", "申请 / 申请书"),
    ("κάλαντα", "圣诞赞美诗 / 颂歌"),
    ("θυμίζω", "提醒"),
    ("θυμάμαι", "记得 / 记住"),
    ("απαραίτητος", "必要的 / 必需的"),
    ("βεβαιώνω", "证明 / 确认"),
    ("μάρτυρας", "证人 / 目击者"),
    ("σκίτσο", "速写 / 素描"),
    ("κλέβω", "偷 / 盗窃")
]

new_exam_questions = [
    {
        "id": 200025,
        "exam_level": "A2",
        "question_type": "quiz",
        "greek": "Πρέπει να κάνω __________ για να πάρω χρήματα από την τράπεζα.",
        "chinese": "为了从银行取钱，我必须做__________。",
        "options": ["ανάληψη", "κατάθεση", "αίτηση", "εφορία"],
        "answer": "ανάληψη",
        "detailed_tip": "【真题解析】\n- 句意：为了从银行取钱，我必须办理取款。\n- 核心词汇：ανάληψη = 取款/提款 (bank withdrawal)；κατάθεση = 存款。"
    },
    {
        "id": 200026,
        "exam_level": "A2",
        "question_type": "quiz",
        "greek": "Θα κάνω __________ χρημάτων στον τραπεζικό μου λογαριασμό.",
        "chinese": "我将在我的银行账户里进行存款。",
        "options": ["κατάθεση", "ανάληψη", "δέμα", "σκίτσο"],
        "answer": "κατάθεση",
        "detailed_tip": "【真题解析】\n- 句意：我将在我的银行账户里进行资金存款。\n- 核心词汇：κατάθεση = 存款 (bank deposit)。"
    },
    {
        "id": 200027,
        "exam_level": "A2",
        "question_type": "quiz",
        "greek": "Πρέπει να πληρώσω τον __________ μέχρι το τέλος του μήνα.",
        "chinese": "我必须在月底前缴纳电话账单。",
        "options": ["λογαριασμό τηλεφώνου", "μάρτυρα", "κλέφτη", "γάμο"],
        "answer": "λογαριασμό τηλεφώνου",
        "detailed_tip": "【真题解析】\n- 句意：我必须在月底之前支付电话账单。\n- 核心词汇：λογαριασμός τηλεφώνου = 电话账单。"
    },
    {
        "id": 200028,
        "exam_level": "A2",
        "question_type": "quiz",
        "greek": "Για να στείλω ένα γράμμα, χρειάζομαι ένα __________.",
        "chinese": "为了寄一封信，我需要一张__________。",
        "options": ["γραμματόσημο", "διαβατήριο", "γκαράζ", "ΚΕΠ"],
        "answer": "γραμματόσημο",
        "detailed_tip": "【真题解析】\n- 句意：为了寄信，我需要一张邮票。\n- 核心词汇：γραμματόσημο = 邮票 (postage stamp)。"
    },
    {
        "id": 200029,
        "exam_level": "A2",
        "question_type": "quiz",
        "greek": "Πήγα στα __________ για να βγάλω ένα πιστοποιητικό.",
        "chinese": "我去了__________开具证明。",
        "options": ["ΚΕΠ", "γκαράζ", "κάλαντα", "σκίτσο"],
        "answer": "ΚΕΠ",
        "detailed_tip": "【真题解析】\n- 句意：我去了公民服务中心 (ΚΕΠ) 办理证明文件。\n- 核心词汇：ΚΕΠ = 公民服务中心 (Citizen Service Center)。"
    },
    {
        "id": 200030,
        "exam_level": "A2",
        "question_type": "quiz",
        "greek": "Η __________ έφτασε γρήγορα για να σβήσει τη φωτιά.",
        "chinese": "__________快速赶到扑灭了火灾。",
        "options": ["πυροσβεστική", "τροχαία", "εφορία", "αίτηση"],
        "answer": "πυροσβεστική",
        "detailed_tip": "【真题解析】\n- 句意：消防队迅速赶到灭火。\n- 核心词汇：πυροσβεστική = 消防队/消防局；σβήνω τη φωτιά = 灭火。"
    },
    {
        "id": 200031,
        "exam_level": "A2",
        "question_type": "quiz",
        "greek": "Όταν κάποιος πεθαίνει, λέμε:",
        "chinese": "当有人去世致哀时，我们习惯表达：",
        "options": ["Συλλυπητήρια", "Συγχαρητήρια", "Περαστικά", "Να τα εκατοστήσεις"],
        "answer": "Συλλυπητήρια",
        "detailed_tip": "【真题解析】\n- 场景祝词：Συλλυπητήρια = 节哀 / 吊唁。用于向逝者亲属致以深切慰问。"
    },
    {
        "id": 200032,
        "exam_level": "A2",
        "question_type": "quiz",
        "greek": "Όταν κάποιος είναι άρρωστος, λέμε:",
        "chinese": "当有人生病时，我们祝愿：",
        "options": ["Περαστικά!", "Καλό ταξίδι!", "Συλλυπητήρια!", "Συγχαρητήρια!"],
        "answer": "Περαστικά!",
        "detailed_tip": "【真题解析】\n- 场景祝词：Περαστικά! = 祝早日康复！用于探望或关怀病人。"
    },
    {
        "id": 200033,
        "exam_level": "A2",
        "question_type": "quiz",
        "greek": "Όταν κάποιος κερδίζει έναν διαγωνισμό, λέμε:",
        "chinese": "当有人在比赛中获胜/获奖时，我们说：",
        "options": ["Συγχαρητήρια!", "Περαστικά!", "Καλό κουράγιο!", "Συλλυπητήρια!"],
        "answer": "Συγχαρητήρια!",
        "detailed_tip": "【真题解析】\n- 场景祝词：Συγχαρητήρια! = 恭喜 / 祝贺！用于庆祝成功与胜利。"
    },
    {
        "id": 200034,
        "exam_level": "A2",
        "question_type": "quiz",
        "greek": "Όταν κάποιος έχει γενέθλια, λέμε:",
        "chinese": "当有人过生日时，我们祝愿：",
        "options": ["Να τα εκατοστήσεις!", "Συλλυπητήρια!", "Περαστικά!", "Καλό ταξίδι!"],
        "answer": "Να τα εκατοστήσεις!",
        "detailed_tip": "【真题解析】\n- 场景祝词：Να τα εκατοστήσεις! = 祝你长命百岁/百岁长寿！是最正宗的生日祝福。"
    },
    {
        "id": 200035,
        "exam_level": "A2",
        "question_type": "quiz",
        "greek": "Όταν γινεται ένα αυτοκινητιστικό ατύχημα, καλούμε:",
        "chinese": "当发生交通事故时，我们呼叫：",
        "options": ["την τροχαία", "το ΚΕΠ", "το ταχυδρομείο", "την εφορία"],
        "answer": "την τροχαία",
        "detailed_tip": "【真题解析】\n- 场景常识：τροχαία = 交警部门。发生车祸时需联系交警部门处理。"
    },
    {
        "id": 200036,
        "exam_level": "A2",
        "question_type": "quiz",
        "greek": "Είναι __________ να έχεις μαζί σου την αστυνομική σου ταυτότητα.",
        "chinese": "随身携带身份证是__________的。",
        "options": ["απαραίτητο", "κλέφτης", "σκίτσο", "διάστημα"],
        "answer": "απαραίτητο",
        "detailed_tip": "【真题解析】\n- 语法词形：απαραίτητος (形容词) -> 中性单数形式 απαραίτητο (必要的/必须的)。"
    }
]

def update_database():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("--- 1. Updating Unit 35 and Test Vocabulary in SQLite ---")
    # First, assign note_date = '2026-07-18' for all Unit 35 words to ensure A2 Unit 35 is marked as actively learned/completed
    cursor.execute("UPDATE vocabulary SET note_date = '2026-07-18' WHERE book_id = 'a2' AND unit = 35")
    print(f"Updated note_date for existing Unit 35 words: {cursor.rowcount} rows.")
    
    # Next, insert/update all test vocabulary items into Unit 35
    for greek, chinese in test_vocab:
        cursor.execute("SELECT id FROM vocabulary WHERE word_greek = ?", (greek,))
        row = cursor.fetchone()
        if row:
            cursor.execute("UPDATE vocabulary SET note_date = '2026-07-18', word_chinese = ? WHERE id = ?", (chinese, row[0]))
        else:
            pron = get_pron(greek)
            ex_greek = f"Αυτό είναι {greek}."
            ex_chinese = f"这是 {chinese}。"
            cursor.execute("""
                INSERT INTO vocabulary (book_id, unit, page_number, word_greek, word_chinese, pronunciation, example_greek, example_chinese, error_count, difficulty_score, note_date)
                VALUES ('a2', 35, 0, ?, ?, ?, ?, ?, 0, 1.0, '2026-07-18')
            """, (greek, chinese, pron, ex_greek, ex_chinese))
            print(f"Inserted new test word: {greek} ({chinese})")
            
    conn.commit()
    conn.close()
    print("SQLite Database successfully updated!")

def update_exam_questions():
    print("--- 2. Updating exam_questions.json ---")
    with open(EXAM_JSON_PATH, "r", encoding="utf-8") as f:
        questions = json.load(f)
        
    existing_ids = set(q["id"] for q in questions)
    added_count = 0
    for nq in new_exam_questions:
        if nq["id"] not in existing_ids:
            questions.append(nq)
            existing_ids.add(nq["id"])
            added_count += 1
            
    with open(EXAM_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
        
    print(f"Added {added_count} new interactive test questions to {EXAM_JSON_PATH}. Total questions now: {len(questions)}")

def main():
    update_database()
    update_exam_questions()

if __name__ == "__main__":
    main()

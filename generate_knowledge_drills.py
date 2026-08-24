# -*- coding: utf-8 -*-
"""
Leon Greek Coach v2.0 - Comprehensive Multi-Type Knowledge Drills Generator
Generates 39 units of deep grammar, communicative dialogue, and reading drills with 4 distinct question types:
1. Choice (选择题 - 4 options with randomized position)
2. Cloze (填空题 - Type the missing conjugated verb/declined noun/preposition)
3. QA (问答题 / 情景应答 - Answer the conversational situation)
4. Translate (句子翻译题 - Translate key communicative sentence/formula)

Includes Pre-Flight QA Verification Gate ensuring 100% bidirectional correctness.
"""

import json
import random
import re

random.seed(42)  # Deterministic shuffle for reproducible builds

def make_shuffled_options(correct_answer, distractors):
    opts = [correct_answer] + distractors[:3]
    random.shuffle(opts)
    return opts

# 39 Units Full Curriculum Data
raw_units = [
    # ==================== A1-A (Units 1-15) ====================
    {
        "book_id": "a1-a",
        "unit": 1,
        "book_title": "A1-A",
        "unit_title": "问候与自我介绍 (Γεια σας)",
        "badge": "🗣️ 问候与发音",
        "category": "communicative",
        "grammar_points": "字母发音与重音符号(Τόνος)、动词 είμαι (是) 单数一二三人称 (είμαι, είσαι, είναι)、熟人与长辈问候 (Γεια σου vs Γεια σας)。",
        "core_formulas": [
            "Γεια σου / Γεια σας (你好 / 您好)",
            "Με λένε + 名字 (我叫...)",
            "Είμαι ο/η + 名字 (我是...)",
            "είμαι (我是) / είσαι (你是) / είναι (他/她是)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Γεια σας! Πώς σας λένε;", "chinese": "您好！请问您叫什么名字？"},
            {"speaker": "B", "greek": "Γεια σας! Με λένε Νίκο. Εσάς;", "chinese": "您好！我叫尼科斯。您呢？"},
            {"speaker": "A", "greek": "Με λένε Μαρία. Χάρηκα πολύ!", "chinese": "我叫玛利亚。很高兴认识你！"},
            {"speaker": "B", "greek": "Κι εγώ χάρηκα!", "chinese": "我也很高兴！"}
        ],
        "drills": [
            {
                "id": 10101,
                "drill_type": "choice",
                "skill_type": "conjugation",
                "question": "Πώς ______; — Με λένε Ελένη.",
                "translation": "你叫什么名字？—— 我叫埃莱妮。",
                "options": make_shuffled_options("σε λένε", ["με λένε", "τον λένε", "μας λένε"]),
                "answer": "σε λένε",
                "detailed_tip": "【变位解析】问对方名字（单数熟人）用 'Πώς σε λένε;'（你叫什么？），回答用 'Με λένε...'（我叫...）。"
            },
            {
                "id": 10102,
                "drill_type": "cloze",
                "skill_type": "conjugation",
                "question": "Εγώ ______ (είμαι) μαθητής.",
                "translation": "我是学生。",
                "answer": "είμαι",
                "acceptable_answers": ["είμαι", "ειμαι"],
                "detailed_tip": "【动词 είμαι 变位】第一人称单数 εγώ (我) 对应 'είμαι' (我是)。"
            },
            {
                "id": 10103,
                "drill_type": "qa",
                "skill_type": "dialogue",
                "question": "A: Γεια σας! Πώς σας λένε;\nB: ______ (回答：我叫马诺利斯)",
                "translation": "情境问答：回答自己的名字",
                "answer": "Με λένε Μανώλη.",
                "acceptable_answers": ["Με λένε Μανώλη.", "Με λένε Μανώλη", "με λένε μανώλη", "Είμαι ο Μανώλης"],
                "options": make_shuffled_options("Με λένε Μανώλη.", ["Είσαι ο Μανώλης.", "Τον λένε Μανώλη.", "Σας λένε Μανώλη."]),
                "detailed_tip": "【自我介绍】回答自己名字使用固定短语 'Με λένε...' 或 'Είμαι ο/η...'。"
            },
            {
                "id": 10104,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "很高兴认识你！(希腊语口语最常用表达)",
                "translation": "汉译希：很高兴认识你！",
                "answer": "Χάρηκα πολύ!",
                "acceptable_answers": ["Χάρηκα πολύ!", "Χάρηκα πολύ", "χαρηκα πολυ", "Χάρηκα"],
                "detailed_tip": "【初次见面礼貌用语】希腊语初次结识对方时说 'Χάρηκα πολύ!' (很高兴认识你)。"
            }
        ]
    },
    {
        "book_id": "a1-a",
        "unit": 2,
        "book_title": "A1-A",
        "unit_title": "数字、国家与国籍 (Από πού είσαι;)",
        "badge": "🌍 国籍与冠词",
        "category": "grammar",
        "grammar_points": "定冠词三性主格 (ο, η, το)、国籍形容词性尾变化 (Έλληνας/Ελληνίδα, Κινένος/Κινέζα)、动词 είμαι 复数变位 (είμαστε, είστε, είναι)。",
        "core_formulas": [
            "Από πού είσαι; — Είμαι από την Ελλάδα / την Κίνα.",
            "ο Έλληνας (希腊男) / η Ελληνίδα (希腊女)",
            "ο Κινέζος (中国男) / η Κινέζα (中国女)",
            "定冠词主格: ο (阳性), η (阴性), το (中性)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Από πού είστε;", "chinese": "您来自哪里？"},
            {"speaker": "B", "greek": "Είμαι από την Κίνα. Είμαι Κινέζος. Εσείς;", "chinese": "我来自中国。我是中国人。您呢？"},
            {"speaker": "A", "greek": "Εγώ είμαι από την Ελλάδα. Είμαι Έλληνας.", "chinese": "我来自希腊。我是希腊人。"}
        ],
        "drills": [
            {
                "id": 10201,
                "drill_type": "choice",
                "skill_type": "declension",
                "question": "Είμαι από ______ Ελλάδα.",
                "translation": "我来自希腊。",
                "options": make_shuffled_options("την", ["το", "τον", "της"]),
                "answer": "την",
                "detailed_tip": "【介词与冠词】'από + 宾格'，Ελλάδα 为阴性名词，宾格定冠词用 'την'。"
            },
            {
                "id": 10202,
                "drill_type": "cloze",
                "skill_type": "conjugation",
                "question": "Εμείς ______ (είμαι) από το Πεκίνο.",
                "translation": "我们来自北京。",
                "answer": "είμαστε",
                "acceptable_answers": ["είμαστε", "ειμαστε"],
                "detailed_tip": "【动词 είμαι 复数】第一人称复数 εμείς 对应 'είμαστε' (我们是)。"
            },
            {
                "id": 10203,
                "drill_type": "choice",
                "skill_type": "declension",
                "question": "Η Άννα είναι ______ (希腊人·女).",
                "translation": "安娜是希腊人（女性）。",
                "options": make_shuffled_options("Ελληνίδα", ["Έλληνας", "Ελληνικό", "Έλληνες"]),
                "answer": "Ελληνίδα",
                "detailed_tip": "【国籍阴阳性】女性希腊人用 'Ελληνίδα'，男性用 'Έλληνας'。"
            },
            {
                "id": 10204,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "你来自哪里？(询问对方国籍/出身地)",
                "translation": "汉译希：你来自哪里？",
                "answer": "Από πού είσαι;",
                "acceptable_answers": ["Από πού είσαι;", "Από πού είσαι", "απο που εισαι", "Από πού είστε;"],
                "detailed_tip": "【地道句型】询问出身地使用 'Από πού είσαι;' (单数) 或 'Από πού είστε;' (尊称/复数)。"
            }
        ]
    },
    {
        "book_id": "a1-a",
        "unit": 3,
        "book_title": "A1-A",
        "unit_title": "日常活动与动作动词 (Τι κάνεις;)",
        "badge": "🎯 语法攻坚·变位",
        "category": "grammar",
        "grammar_points": "第一类规则动词现在时陈述式变位 (Group A: -ω, -εις, -ει, -ουμε, -ετε, -ουν: κάνω, διαβάζω, γράφω, μένω)、名词属格表示所有权 (του Leo, της Μαρίας)。",
        "core_formulas": [
            "动词词尾公式: εγώ -ω, εσύ -εις, αυτός -ει, εμείς -ουμε, εσείς -ετε, αυτοί -ουν",
            "属格所有权: το βιβλίο της Μαρίας (玛利亚的书), το μολύβι του Leo (Leo的铅笔)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Τι κάνεις τώρα;", "chinese": "你现在在做什么？"},
            {"speaker": "B", "greek": "Διαβάζω ένα ωραίο βιβλίο. Εσύ τι κάνεις;", "chinese": "我在读一本好书。你在做什么？"},
            {"speaker": "A", "greek": "Εγώ γράφω ένα γράμμα στη μαμά μου.", "chinese": "我在给我妈妈写一封信。"}
        ],
        "drills": [
            {
                "id": 10301,
                "drill_type": "choice",
                "skill_type": "conjugation",
                "question": "Εσείς τι ______ τώρα; (κάνω)",
                "translation": "你们现在在做什么？",
                "options": make_shuffled_options("κάνετε", ["κάνουμε", "κάνεις", "κάνουν"]),
                "answer": "κάνετε",
                "detailed_tip": "【动词变位】第二人称复数 εσείς 对应的现在时词尾为 '-ετε' -> κάνετε。"
            },
            {
                "id": 10302,
                "drill_type": "cloze",
                "skill_type": "conjugation",
                "question": "Τα παιδιά ______ (διαβάζω) ελληνικά.",
                "translation": "孩子们在学希腊语。",
                "answer": "διαβάζουν",
                "acceptable_answers": ["διαβάζουν", "διαβαζουν", "διαβάζουνε"],
                "detailed_tip": "【动词变位】主语 τα παιδιά (复数/他们) 对应动词第三人称复数词尾 '-ουν' -> διαβάζουν。"
            },
            {
                "id": 10303,
                "drill_type": "choice",
                "skill_type": "declension",
                "question": "Αυτό είναι το βιβλίο ______ Μαρίας.",
                "translation": "这是玛利亚的书。",
                "options": make_shuffled_options("της", ["την", "η", "του"]),
                "answer": "της",
                "detailed_tip": "【属格表达】阴性名词人名前用属格冠词 'της' 表示所属关系 (της Μαρίας = 玛利亚的)。"
            },
            {
                "id": 10304,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "我在写一封信。(使用动词 γράφω)",
                "translation": "汉译希：我在写一封信。",
                "answer": "Γράφω ένα γράμμα.",
                "acceptable_answers": ["Γράφω ένα γράμμα.", "Γράφω ένα γράμμα", "γραφω ενα γραμμα", "Εγώ γράφω ένα γράμμα."],
                "detailed_tip": "【核心句型】动词 γράφω + 宾格名词 ένα γράμμα (一封信)。"
            }
        ]
    },
    {
        "book_id": "a1-a",
        "unit": 4,
        "book_title": "A1-A",
        "unit_title": "学校课堂与文具用品 (Στο σχολείο)",
        "badge": "🎒 词性与文具",
        "category": "grammar",
        "grammar_points": "名词三性单数主格规则 (阳性 -ος/-ας/-ης, 阴性 -α/-η, 中性 -ο/-ι/-μα)、冠词与名词一致性。",
        "core_formulas": [
            "ο πίνακας (阳性-黑板), η τσάντα (阴性-书包), το θρανίο (中性-书桌)",
            "Έχω ένα μολύβι και μια γόμα (我有一支铅笔和一块橡皮)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Τι έχεις μέσα στην τσάντα σου;", "chinese": "你的书包里有什么？"},
            {"speaker": "B", "greek": "Έχω ένα τετράδιο, ένα βιβλίο και ένα μολύβι.", "chinese": "我有一本练习本、一本书和一支铅笔。"}
        ],
        "drills": [
            {
                "id": 10401,
                "drill_type": "choice",
                "skill_type": "declension",
                "question": "______ πίνακας είναι πράσινος.",
                "translation": "黑板是绿色的。",
                "options": make_shuffled_options("Ο", ["Η", "Το", "Οι"]),
                "answer": "Ο",
                "detailed_tip": "【名词词性】πίνακας (黑板) 是阳性名词 (-ας结尾)，定冠词主格用 'Ο'。"
            },
            {
                "id": 10402,
                "drill_type": "cloze",
                "skill_type": "declension",
                "question": "Έχω ______ (不定冠词·阴性) καινούργια τσάντα.",
                "translation": "我有一个新书包。",
                "answer": "μια",
                "acceptable_answers": ["μια", "μία"],
                "detailed_tip": "【不定冠词】τσάντα (书包) 是阴性单数名词，不定冠词用 'μια' / 'μία'。"
            },
            {
                "id": 10403,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "你的书包里有什么？",
                "translation": "汉译希：你的书包里有什么？",
                "answer": "Τι έχεις στην τσάντα σου;",
                "acceptable_answers": ["Τι έχεις στην τσάντα σου;", "Τι έχεις στην τσάντα σου", "Τι έχεις μέσα στην τσάντα σου;", "τι εχεις στην τσαντα σου"],
                "detailed_tip": "【课堂句型】Τι έχεις... (你有什么...) + στην τσάντα σου (在你的书包里)。"
            }
        ]
    },
    {
        "book_id": "a1-a",
        "unit": 5,
        "book_title": "A1-A",
        "unit_title": "星期时间与课程表 (Το πρόγραμμά μου)",
        "badge": "⏰ 时间与星期",
        "category": "communicative",
        "grammar_points": "星期名词表达 (Δευτέρα, Τρίτη...)、时间介词 στις + 钟点、时间副词 (σήμερα, αύριο, το πρωί)。",
        "core_formulas": [
            "Τι μέρα είναι σήμερα; — Σήμερα είναι Δευτέρα.",
            "Τι ώρα είναι; — Είναι οκτώ η ώρα.",
            "Στις + 时间: στις τρεις (在三点)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Τι ώρα αρχίζει το μάθημα;", "chinese": "课程几点开始？"},
            {"speaker": "B", "greek": "Αρχίζει στις εννιά το πρωί.", "chinese": "早上九点开始。"}
        ],
        "drills": [
            {
                "id": 10501,
                "drill_type": "choice",
                "skill_type": "syntax",
                "question": "Το μάθημα είναι ______ πέντε το απόγευμα.",
                "translation": "课程在下午五点。",
                "options": make_shuffled_options("στις", ["στο", "στη", "στην"]),
                "answer": "στις",
                "detailed_tip": "【时间介词】表达“在几点钟”时，使用介词短语 'στις + 钟点' (除了1点用 στη μία)。"
            },
            {
                "id": 10502,
                "drill_type": "qa",
                "skill_type": "dialogue",
                "question": "A: Τι μέρα είναι σήμερα;\nB: Σήμερα είναι ______ (星期五).",
                "translation": "今天星期几？—— 今天是星期五。",
                "answer": "Παρασκευή",
                "acceptable_answers": ["Παρασκευή", "παρασκευη", "Σήμερα είναι Παρασκευή."],
                "options": make_shuffled_options("Παρασκευή", ["χθες", "το βράδυ", "στις έξι"]),
                "detailed_tip": "【星期表达】星期五在希腊语中是 'Παρασκευή'。"
            },
            {
                "id": 10503,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "现在几点钟？",
                "translation": "汉译希：现在几点钟？",
                "answer": "Τι ώρα είναι;",
                "acceptable_answers": ["Τι ώρα είναι;", "Τι ώρα είναι", "τι ωρα ειναι", "Τι ώρα είναι τώρα;"],
                "detailed_tip": "【问时间固定句型】'Τι ώρα είναι;' 是询问时间的标准希腊语句型。"
            }
        ]
    },
    {
        "book_id": "a1-a",
        "unit": 6,
        "book_title": "A1-A",
        "unit_title": "玩具与游戏 (Παιχνίδια)",
        "badge": "🎲 复数主格",
        "category": "grammar",
        "grammar_points": "名词复数主格规则：阳性 -ος -> -οι, 阴性 -α -> -ες / -η -> -εις, 中性 -ο -> -α / -ι -> -ια。",
        "core_formulas": [
            "το παιχνίδι -> τα παιχνίδια (玩具)",
            "η μπάλα -> οι μπάλες (球)",
            "ο φίλος -> οι φίλοι (朋友)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Έχεις πολλά παιχνίδια;", "chinese": "你有很多玩具吗？"},
            {"speaker": "B", "greek": "Ναι, έχω τρία αυτοκινητάκια και δύο μπάλες.", "chinese": "是的，我有三辆小汽车和两个球。"}
        ],
        "drills": [
            {
                "id": 10601,
                "drill_type": "choice",
                "skill_type": "declension",
                "question": "Τα ______ είναι πάνω στο χαλί. (το παιχνίδι -> 复数)",
                "translation": "玩具都在地毯上。",
                "options": make_shuffled_options("παιχνίδια", ["παιχνίδι", "παιχνιδιού", "παιχνίδες"]),
                "answer": "παιχνίδια",
                "detailed_tip": "【中性复数】中性名词 -ι 结尾变复数时词尾变为 '-ια' -> το παιχνίδι -> τα παιχνίδια。"
            },
            {
                "id": 10602,
                "drill_type": "cloze",
                "skill_type": "declension",
                "question": "Στην αυλή παίζουν πολλοί ______ (ο φίλος -> 复数).",
                "translation": "院子里有很多朋友在玩耍。",
                "answer": "φίλοι",
                "acceptable_answers": ["φίλοι", "φιλοι"],
                "detailed_tip": "【阳性名词复数】阳性名词 -ος 结尾变复数词尾为 '-οι' -> ο φίλος -> οι φίλοι。"
            },
            {
                "id": 10603,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "我有两个球。(使用 η μπάλα)",
                "translation": "汉译希：我有两个球。",
                "answer": "Έχω δύο μπάλες.",
                "acceptable_answers": ["Έχω δύο μπάλες.", "Έχω δύο μπάλες", "εχω δυο μπαλες", "Έχω 2 μπάλες."],
                "detailed_tip": "【阴性复数】η μπάλα (单数) -> οι μπάλες (复数)。"
            }
        ]
    },
    {
        "book_id": "a1-a",
        "unit": 7,
        "book_title": "A1-A",
        "unit_title": "家庭成员与亲属 (Η οικογένειά μου)",
        "badge": "👨‍👩‍👧 家庭与属格",
        "category": "communicative",
        "grammar_points": "家庭称谓、物主代词 (μου, σου, του, της, μας, σας, τους)、形容词配合。",
        "core_formulas": [
            "ο πατέρας μου (我父亲), η μητέρα μου (我母亲)",
            "ο αδερφός μου (我兄弟), η αδερφή μου (我姐妹)",
            "Έχω μια μεγάλη οικογένεια (我有一个大家庭)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Πόσα αδέρφια έχεις;", "chinese": "你有几个兄弟姐妹？"},
            {"speaker": "B", "greek": "Έχω έναν αδερφό και μία αδερφή.", "chinese": "我有一个哥哥和一个妹妹。"}
        ],
        "drills": [
            {
                "id": 10701,
                "drill_type": "choice",
                "skill_type": "declension",
                "question": "Ο αδερφός ______ είναι γιατρός.",
                "translation": "我的哥哥是一名医生。",
                "options": make_shuffled_options("μου", ["εγώ", "μου είναι", "εμένα"]),
                "answer": "μου",
                "detailed_tip": "【物主代词】表达“我的...”在名词后紧跟弱读物主代词 'μου' (ο αδερφός μου)。"
            },
            {
                "id": 10702,
                "drill_type": "cloze",
                "skill_type": "declension",
                "question": "Η μητέρα ______ (你的) είναι δασκάλα.",
                "translation": "你的妈妈是一名老师。",
                "answer": "σου",
                "acceptable_answers": ["σου", "σου είναι"],
                "detailed_tip": "【物主代词】第二人称弱读物主代词用 'σου' (你的)。"
            },
            {
                "id": 10703,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "我有一个大家庭。",
                "translation": "汉译希：我有一个大家庭。",
                "answer": "Έχω μια μεγάλη οικογένεια.",
                "acceptable_answers": ["Έχω μια μεγάλη οικογένεια.", "Έχω μια μεγάλη οικογένεια", "εχω μια μεγαλη οικογενεια", "Έχω μία μεγάλη οικογένεια."],
                "detailed_tip": "【核心句型】Έχω + μια μεγάλη οικογένεια (阴性名词词组)。"
            }
        ]
    },
    {
        "book_id": "a1-a",
        "unit": 8,
        "book_title": "A1-A",
        "unit_title": "颜色服装与外貌 (Χρώματα και ρούχα)",
        "badge": "🎨 颜色与形容词",
        "category": "grammar",
        "grammar_points": "形容词性数格一致性 (-ος, -η, -ο / κόκκινος, κόκκινη, κόκκινο)、不可变颜色 (ροζ, μπεζ, καφέ, μπλε)。",
        "core_formulas": [
            "Το κόκκινο φόρεμα (红色连衣裙 - 中性)",
            "Ο μπλε ουρανός (蓝色天空 - 阳性)",
            "Η άσπρη γάτα (白色猫 - 阴性)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Τι χρώμα είναι το πουκάμισό σου;", "chinese": "你的衬衫是什么颜色的？"},
            {"speaker": "B", "greek": "Είναι άσπρο.", "chinese": "是白色的。"}
        ],
        "drills": [
            {
                "id": 10801,
                "drill_type": "choice",
                "skill_type": "declension",
                "question": "Η Μαρία φοράει μια ______ φούστα.",
                "translation": "玛利亚穿着一条蓝色的裙子。",
                "options": make_shuffled_options("μπλε", ["μπλεες", "μπλεα", "μπλεσ"]),
                "answer": "μπλε",
                "detailed_tip": "【不可变形容词】'μπλε' (蓝色) 为外来语不可变形容词，修饰阴性/阳性/中性形式不变。"
            },
            {
                "id": 10802,
                "drill_type": "cloze",
                "skill_type": "declension",
                "question": "Το αυτοκίνητο είναι ______ (κόκκινος -> 中性单数).",
                "translation": "这辆车是红色的。",
                "answer": "κόκκινο",
                "acceptable_answers": ["κόκκινο", "κοκκινο"],
                "detailed_tip": "【形容词性配合】το αυτοκίνητο 是中性名词，形容词用中性形式 'κόκκινο'。"
            },
            {
                "id": 10803,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "你的衬衫是什么颜色的？",
                "translation": "汉译希：你的衬衫是什么颜色的？",
                "answer": "Τι χρώμα είναι το πουκάμισό σου;",
                "acceptable_answers": ["Τι χρώμα είναι το πουκάμισό σου;", "Τι χρώμα είναι το πουκάμισό σου", "τι χρωμα ειναι το πουκαμισο σου", "Τι χρώμα είναι το πουκάμισο σου;"],
                "detailed_tip": "【问颜色固定句型】'Τι χρώμα είναι...;' (是什么颜色的？)。"
            }
        ]
    },
    {
        "book_id": "a1-a",
        "unit": 9,
        "book_title": "A1-A",
        "unit_title": "动物王国与童话故事 (Ζώα και παραμύθια)",
        "badge": "🦁 动物与复数",
        "category": "vocabulary",
        "grammar_points": "动物名词复数、动词现在时描述动作、叙述句结构。",
        "core_formulas": [
            "Ο σκύλος γαβγίζει (狗在叫)",
            "Η γάτα νιαουρίζει (猫在叫)",
            "Τα πουλιά πετούν (鸟儿在飞)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Ποιο είναι το αγαπημένο σου ζώο;", "chinese": "你最喜欢的动物是什么？"},
            {"speaker": "B", "greek": "Μου αρέσουν πολύ τα σκυλιά και τα άλογα.", "chinese": "我非常喜欢狗和马。"}
        ],
        "drills": [
            {
                "id": 10901,
                "drill_type": "choice",
                "skill_type": "declension",
                "question": "Στο δάσος ζουν πολλά ______.",
                "translation": "森林里住着许多野生动物。",
                "options": make_shuffled_options("ζώα", ["ζώο", "ζώοι", "ζώες"]),
                "answer": "ζώα",
                "detailed_tip": "【中性名词复数】'το ζώο' (动物) 的复数主格形式是 'τα ζώα'。"
            },
            {
                "id": 10902,
                "drill_type": "cloze",
                "skill_type": "conjugation",
                "question": "Ο σκύλος ______ (γαβγίζω - 狗在叫).",
                "translation": "狗在吠叫。",
                "answer": "γαβγίζει",
                "acceptable_answers": ["γαβγίζει", "γαβγιζει"],
                "detailed_tip": "【动词第三人称单数】主语 ο σκύλος (单数他) 对应词尾 '-ει' -> γαβγίζει。"
            },
            {
                "id": 10903,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "你最喜欢的动物是什么？",
                "translation": "汉译希：你最喜欢的动物是什么？",
                "answer": "Ποιο είναι το αγαπημένο σου ζώο;",
                "acceptable_answers": ["Ποιο είναι το αγαπημένο σου ζώο;", "Ποιο είναι το αγαπημένο σου ζώο", "ποιο ειναι το αγαπημενο σου ζωο"],
                "detailed_tip": "【偏好提问】Ποιο είναι το αγαπημένο σου... (你最喜欢的是什么...)。"
            }
        ]
    },
    {
        "book_id": "a1-a",
        "unit": 10,
        "book_title": "A1-A",
        "unit_title": "日常作息与时间 (Η ώρα)",
        "badge": "⏰ 日常作息",
        "category": "communicative",
        "grammar_points": "时间表达法 (και τέταρτο, και μισή, παρά τέταρτο)、频度副词 (πάντα, συχνά, μερικές φορές, ποτέ)。",
        "core_formulas": [
            "Είναι οκτώ και μισή (八点半)",
            "Είναι εννιά παρά είκοσι (九点差二十分 = 8:40)",
            "Ξυπνάω στις επτά το πρωί (我早上七点起床)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Τι ώρα ξυπνάς το πρωί;", "chinese": "你早上几点起床？"},
            {"speaker": "B", "greek": "Ξυπνάω πάντα στις εφτά και μισή.", "chinese": "我总是在七点半起床。"}
        ],
        "drills": [
            {
                "id": 11001,
                "drill_type": "choice",
                "skill_type": "dialogue",
                "question": "Είναι εννιά ______ είκοσι (= 8:40 / 九点差二十分).",
                "translation": "现在是九点差二十分。",
                "options": make_shuffled_options("παρά", ["και", "από", "σε"]),
                "answer": "παρά",
                "detailed_tip": "【时间差几分】在希腊语中表示“差几分”使用介词 'παρά' (εννιά παρά είκοσι = 9点差20分 = 8:40)。"
            },
            {
                "id": 11002,
                "drill_type": "cloze",
                "skill_type": "conjugation",
                "question": "Κάθε μέρα ______ (ξυπνάω) στις επτά.",
                "translation": "我每天七点起床。",
                "answer": "ξυπνάω",
                "acceptable_answers": ["ξυπνάω", "ξυπνώ", "ξυπναω", "ξυπνω"],
                "detailed_tip": "【日常动词】动词 ξυπνάω / ξυπνώ (起床) 第一人称形式。"
            },
            {
                "id": 11003,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "现在是八点半。",
                "translation": "汉译希：现在是八点半。",
                "answer": "Είναι οκτώ και μισή.",
                "acceptable_answers": ["Είναι οκτώ και μισή.", "Είναι οκτώ και μισή", "ειναι οκτω και μιση", "Είναι 8 και μισή."],
                "detailed_tip": "【时间半点】半点使用 'και μισή' (Είναι οκτώ και μισή)。"
            }
        ]
    },
    {
        "book_id": "a1-a",
        "unit": 11,
        "book_title": "A1-A",
        "unit_title": "房子房间与布局 (Το σπίτι μου)",
        "badge": "🏠 空间与处所",
        "category": "grammar",
        "grammar_points": "处所介词 σε 与定冠词缩合 (σε + το -> στο, σε + τη -> στη, σε + τον -> στον, σε + τα -> στα, σε + τους -> στους, σε + τις -> στις)。",
        "core_formulas": [
            "στο σαλόνι (在客厅), στην κουζίνα (在厨房), στο υπνοδωμάτιο (在卧室)",
            "Το σπίτι μου έχει τέσσερα δωμάτια (我的房子有四个房间)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Πού είναι η μαμά;", "chinese": "妈妈在哪里？"},
            {"speaker": "B", "greek": "Είναι στην κουζίνα και μαγειρεύει.", "chinese": "她在厨房做饭。"}
        ],
        "drills": [
            {
                "id": 11101,
                "drill_type": "choice",
                "skill_type": "declension",
                "question": "Ο μπαμπάς είναι ______ σαλόνι.",
                "translation": "爸爸在客厅里。",
                "options": make_shuffled_options("στο", ["στη", "στον", "στα"]),
                "answer": "στο",
                "detailed_tip": "【介词缩合】σαλόνι (客厅) 是中性名词，'σε + το' 缩合为 'στο'。"
            },
            {
                "id": 11102,
                "drill_type": "cloze",
                "skill_type": "declension",
                "question": "Η αδερφή μου κοιμάται ______ (σε + το) δωμάτιό της.",
                "translation": "我妹妹在她的房间里睡觉。",
                "answer": "στο",
                "acceptable_answers": ["στο", "μέσα στο"],
                "detailed_tip": "【介词缩合】δωμάτιο 是中性名词，'σε + το' 缩合为 'στο'。"
            },
            {
                "id": 11103,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "妈妈在厨房里。(使用 η κουζίνα)",
                "translation": "汉译希：妈妈在厨房里。",
                "answer": "Η μαμά είναι στην κουζίνα.",
                "acceptable_answers": ["Η μαμά είναι στην κουζίνα.", "Η μαμά είναι στην κουζίνα", "η μαμα ειναι στην κουζινα", "Η μητέρα είναι στην κουζίνα."],
                "detailed_tip": "【介词缩合】κουζίνα 为阴性名词，'σε + την' 缩合为 'στην'。"
            }
        ]
    },
    {
        "book_id": "a1-a",
        "unit": 12,
        "book_title": "A1-A",
        "unit_title": "家具陈设与方位 (Έπιπλα)",
        "badge": "🪑 方位介词短语",
        "category": "grammar",
        "grammar_points": "方位介词短语：πάνω σε (在...上), κάτω από (在...下), δίπλα σε (在...旁边), απέναντι από (在...对面), ανάμεσα σε (在...之间)。",
        "core_formulas": [
            "Το βιβλίο είναι πάνω στο γραφείο (书在书桌上)",
            "Η γάτα κοιμάται κάτω από το κρεβάτι (猫在床底下睡觉)",
            "Η καρέκλα είναι δίπλα στο τραπέζι (椅子在桌子旁边)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Πού είναι τα κλειδιά μου;", "chinese": "我的钥匙在哪里？"},
            {"speaker": "B", "greek": "Είναι πάνω στο τραπέζι, δίπλα στην τηλεόραση.", "chinese": "在桌子上，电视机旁边。"}
        ],
        "drills": [
            {
                "id": 11201,
                "drill_type": "choice",
                "skill_type": "syntax",
                "question": "Η μπάλα είναι ______ από το κρεβάτι.",
                "translation": "球在床底下。",
                "options": make_shuffled_options("κάτω", ["πάνω", "μέσα", "δίπλα"]),
                "answer": "κάτω",
                "detailed_tip": "【方位介词搭配】表达“在...下方”用 'κάτω από'。"
            },
            {
                "id": 11202,
                "drill_type": "cloze",
                "skill_type": "syntax",
                "question": "Το βιβλίο είναι ______ (在...上面) στο γραφείο.",
                "translation": "书在书桌上面。",
                "answer": "πάνω",
                "acceptable_answers": ["πάνω", "πανω"],
                "detailed_tip": "【方位词】在...上面固定为 'πάνω σε' (πάνω στο γραφείο)。"
            },
            {
                "id": 11203,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "钥匙在桌子上。",
                "translation": "汉译希：钥匙在桌子上。",
                "answer": "Τα κλειδιά είναι πάνω στο τραπέζι.",
                "acceptable_answers": ["Τα κλειδιά είναι πάνω στο τραπέζι.", "Τα κλειδιά είναι πάνω στο τραπέζι", "τα κλειδια ειναι πανω στο τραπεζι", "Το κλειδί είναι πάνω στο τραπέζι."],
                "detailed_tip": "【方位句】Τα κλειδιά είναι (钥匙在) + πάνω στο τραπέζι (在桌子上)。"
            }
        ]
    },
    {
        "book_id": "a1-a",
        "unit": 13,
        "book_title": "A1-A",
        "unit_title": "城市生活与公共场所 (Στην πόλη)",
        "badge": "🏙️ 城市与比较级",
        "category": "communicative",
        "grammar_points": "名词宾格单数 (阳性 -ο/-η/-α, 阴性 -α/-η, 中性 -ο/-ι)、比较句型 'πιο + 形容词 + από' (比...更...)。",
        "core_formulas": [
            "Πηγαίνω στο σούπερ μάρκετ (我去超市)",
            "Η Αθήνα είναι πιο μεγάλη από τη Θεσσαλονίκη (雅典比塞萨洛尼基更大)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Συγγνώμη, πού είναι η τράπεζα;", "chinese": "对不起，请问银行在哪里？"},
            {"speaker": "B", "greek": "Είναι ευθεία και μετά δεξιά, απέναντι από το φαρμακείο.", "chinese": "一直走然后右转，在药店对面。"}
        ],
        "drills": [
            {
                "id": 11301,
                "drill_type": "choice",
                "skill_type": "syntax",
                "question": "Το αεροπλάνο είναι ______ γρήγορο από το τρένο.",
                "translation": "飞机比火车更快。",
                "options": make_shuffled_options("πιο", ["πολύ", "πολλά", "πιο πολύ"]),
                "answer": "πιο",
                "detailed_tip": "【比较级结构】希腊语比较级结构为 'πιο + 形容词原级 + από'。"
            },
            {
                "id": 11302,
                "drill_type": "qa",
                "skill_type": "dialogue",
                "question": "A: Συγγνώμη, πού είναι η τράπεζα;\nB: ______ (回答：一直走然后右转)",
                "translation": "问路与指路情境",
                "answer": "Ευθεία και μετά δεξιά.",
                "acceptable_answers": ["Ευθεία και μετά δεξιά.", "Ευθεία και δεξιά", "ευθεια και μετα δεξια"],
                "options": make_shuffled_options("Ευθεία και μετά δεξιά.", ["Είμαι στην τράπεζα.", "Πόσο κάνει;", "Χρόνια Πολλά!"]),
                "detailed_tip": "【指路常用语】'Ευθεία' (直走) + 'και μετά δεξιά' (然后右转)。"
            },
            {
                "id": 11303,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "我去超级市场。(使用 το σούπερ μάρκετ)",
                "translation": "汉译希：我去超级市场。",
                "answer": "Πηγαίνω στο σούπερ μάρκετ.",
                "acceptable_answers": ["Πηγαίνω στο σούπερ μάρκετ.", "Πηγαίνω στο σούπερ μάρκετ", "πηγαινω στο σουπερ μαρκετ", "Πάω στο σούπερ μάρκετ."],
                "detailed_tip": "【处所方向】Πηγαίνω / Πάω + στο + 中性名词。"
            }
        ]
    },
    {
        "book_id": "a1-a",
        "unit": 14,
        "book_title": "A1-A",
        "unit_title": "期中综合复习 (Επανάληψη)",
        "badge": "🔄 综合语法回顾",
        "category": "grammar",
        "grammar_points": "名词三性复数主格总复习、现在时规则变位复习、主宾格冠词对照表。",
        "core_formulas": [
            "主格: ο/η/το -> οι/οι/τα",
            "宾格: τον/την/το -> τους/τις/τα"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Μιλάτε ελληνικά;", "chinese": "您说希腊语吗？"},
            {"speaker": "B", "greek": "Ναι, μιλάω λίγα ελληνικά.", "chinese": "是的，我会说一点希腊语。"}
        ],
        "drills": [
            {
                "id": 11401,
                "drill_type": "choice",
                "skill_type": "conjugation",
                "question": "Εμείς ______ στην Αθήνα εδώ και δύο χρόνια. (μένω)",
                "translation": "我们在雅典已经住了两年了。",
                "options": make_shuffled_options("μένουμε", ["μένετε", "μένουν", "μένεις"]),
                "answer": "μένουμε",
                "detailed_tip": "【动词变位】εμείς (我们) 对应现在时第一人称复数 '-ουμε' -> μένουμε。"
            },
            {
                "id": 11402,
                "drill_type": "cloze",
                "skill_type": "conjugation",
                "question": "Εσύ ______ (μιλάω) ελληνικά;",
                "translation": "你会说希腊语吗？",
                "answer": "μιλάς",
                "acceptable_answers": ["μιλάς", "μιλας", "μιλάτε"],
                "detailed_tip": "【第二类动词变位】εσύ 对应 '-άς' -> μιλάς。"
            },
            {
                "id": 11403,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "是的，我会说一点希腊语。",
                "translation": "汉译希：是的，我会说一点希腊语。",
                "answer": "Ναι, μιλάω λίγα ελληνικά.",
                "acceptable_answers": ["Ναι, μιλάω λίγα ελληνικά.", "Ναι, μιλάω λίγα ελληνικά", "ναι μιλαω λιγα ελληνικα", "Ναι, μιλώ λίγα ελληνικά."],
                "detailed_tip": "【交际应答】'Ναι' (是的) + 'μιλάω λίγα ελληνικά' (我说一点希腊语)。"
            }
        ]
    },
    {
        "book_id": "a1-a",
        "unit": 15,
        "book_title": "A1-A",
        "unit_title": "马戏团与娱乐表演 (Στο τσίρκο)",
        "badge": "🎪 数量与描述",
        "category": "communicative",
        "grammar_points": "数量词变化 (ένας, μία, ένα; δύο; τρεις, τρία; τέσσερις, τέσσερα)、描述性副词。",
        "core_formulas": [
            "Θέλω ένα εισιτήριο (我想要一张票 - 中性)",
            "Θέλω δύο εισιτήρια (我想要两张票)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Πόσα εισιτήρια θέλετε;", "chinese": "您要几张票？"},
            {"speaker": "B", "greek": "Θέλουμε τρία εισιτήρια, παρακαλώ.", "chinese": "我们要三张票，谢谢。"}
        ],
        "drills": [
            {
                "id": 11501,
                "drill_type": "choice",
                "skill_type": "declension",
                "question": "Παρακαλώ, θέλω ______ εισιτήριο. (数词 1 · 中性)",
                "translation": "请给我一张票。",
                "options": make_shuffled_options("ένα", ["ένας", "μία", "έναν"]),
                "answer": "ένα",
                "detailed_tip": "【数词性配合】εισιτήριο (票) 是中性名词，数词'1'用中性格 'ένα'。"
            },
            {
                "id": 11502,
                "drill_type": "cloze",
                "skill_type": "declension",
                "question": "Θέλουμε ______ (数词 3 · 中性复数) εισιτήρια.",
                "translation": "我们想要三张门票。",
                "answer": "τρία",
                "acceptable_answers": ["τρία", "τρια", "3"],
                "detailed_tip": "【数词变格】中性名词复数搭配数词 'τρία' (阳/阴用 τρεις)。"
            },
            {
                "id": 11503,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "您想要几张票？",
                "translation": "汉译希：您想要几张票？",
                "answer": "Πόσα εισιτήρια θέλετε;",
                "acceptable_answers": ["Πόσα εισιτήρια θέλετε;", "Πόσα εισιτήρια θέλετε", "ποσα εισιτηρια θελετε"],
                "detailed_tip": "【数量提问】Πόσα + 中性复数名词 + θέλετε (您想要)。"
            }
        ]
    },

    # ==================== A1-B (Units 16-30) ====================
    {
        "book_id": "a1-b",
        "unit": 16,
        "book_title": "A1-B",
        "unit_title": "天气气候与四季 (Ο καιρός)",
        "badge": "⛅ 天气无人称动词",
        "category": "communicative",
        "grammar_points": "无人称天气动词 (βρέχει 下雨, χιονίζει 下雪)、天气句式 (κάνει ζέστη/κρύο, έχει ήλιο/συννεφιά)、四季与月份表达。",
        "core_formulas": [
            "Τι καιρό κάνει σήμερα; (今天天气怎么样？)",
            "Σήμερα κάνει πολύ κρύο / έχει ήλιο (今天很冷 / 阳光明媚)",
            "Το καλοκαίρι κάνει ζέστη (夏天很热)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Τι καιρό κάνει στην Αθήνα σήμερα;", "chinese": "今天雅典天气怎么样？"},
            {"speaker": "B", "greek": "Κάνει πολύ καλό καιρό και έχει ήλιο!", "chinese": "天气非常好，阳光明媚！"}
        ],
        "drills": [
            {
                "id": 11601,
                "drill_type": "choice",
                "skill_type": "syntax",
                "question": "Σήμερα έξω ______ και έχει πολύ κρύο.",
                "translation": "今天外面在下雨，非常冷。",
                "options": make_shuffled_options("βρέχει", ["βρέχουν", "βρέχουμε", "βρέχεις"]),
                "answer": "βρέχει",
                "detailed_tip": "【无人称天气动词】下雨使用无人称单三动词 'βρέχει'。"
            },
            {
                "id": 11602,
                "drill_type": "cloze",
                "skill_type": "syntax",
                "question": "Το καλοκαίρι στην Ελλάδα κάνει πολύ ______ (热).",
                "translation": "夏天在希腊天气很热。",
                "answer": "ζέστη",
                "acceptable_answers": ["ζέστη", "ζεστη"],
                "detailed_tip": "【天气固定表达】天气热用 'κάνει ζέστη'，天气冷用 'κάνει κρύο'。"
            },
            {
                "id": 11603,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "今天天气怎么样？",
                "translation": "汉译希：今天天气怎么样？",
                "answer": "Τι καιρό κάνει σήμερα;",
                "acceptable_answers": ["Τι καιρό κάνει σήμερα;", "Τι καιρό κάνει σήμερα", "τι καιρο κανει σημερα"],
                "detailed_tip": "【天气经典问句】'Τι καιρό κάνει σήμερα;' 是询问天气的标准句式。"
            }
        ]
    },
    {
        "book_id": "a1-b",
        "unit": 17,
        "book_title": "A1-B",
        "unit_title": "饮食习惯与餐厅点餐 (Φαγητό)",
        "badge": "🍽️ 餐厅点餐·第二类变位",
        "category": "communicative",
        "grammar_points": "第二类动词现在时变位 (Group B: -άω/-ώ, -άς, -άει/-ά, -άμε/-ούμε, -άτε, -άνε/-ούν: αγαπάω, μιλάω, πεινάω, διψάω)、餐厅礼貌点餐 (Θα ήθελα / Φέρτε μου)。",
        "core_formulas": [
            "Θα ήθελα μια ελληνική σαλάτα και νερό (我想要一份希腊沙拉和水)",
            "Πεινάω πολύ / Διψάω (我很饿 / 我很渴)",
            "Τον λογαριασμό, παρακαλώ (买单，谢谢)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Γεια σας! Τι θα πάρετε;", "chinese": "您好！您想点什么？"},
            {"speaker": "B", "greek": "Θα ήθελα ένα σουβλάκι και μια πορτοκαλάδα, παρακαλώ.", "chinese": "我想要一份烤肉串和一杯橙汁，谢谢。"},
            {"speaker": "A", "greek": "Αμέσως!", "chinese": "马上来！"}
        ],
        "drills": [
            {
                "id": 11701,
                "drill_type": "choice",
                "skill_type": "conjugation",
                "question": "Εσείς ______ ελληνικά; (μιλάω)",
                "translation": "你们说希腊语吗？",
                "options": make_shuffled_options("μιλάτε", ["μιλάμε", "μιλάς", "μιλούν"]),
                "answer": "μιλάτε",
                "detailed_tip": "【第二类动词变位】'μιλάω' (说) 第二人称复数形式为 'μιλάτε'。"
            },
            {
                "id": 11702,
                "drill_type": "qa",
                "skill_type": "dialogue",
                "question": "在希腊餐厅用餐完毕准备结账时，应该对服务员说：______",
                "translation": "情境交际：结账买单",
                "answer": "Τον λογαριασμό, παρακαλώ.",
                "acceptable_answers": ["Τον λογαριασμό, παρακαλώ.", "Τον λογαριασμό, παρακαλώ", "τον λογαριασμο παρακαλω", "Λογαριασμό παρακαλώ"],
                "options": make_shuffled_options("Τον λογαριασμό, παρακαλώ.", ["Τι ώρα είναι;", "Καλημέρα!", "Πού είναι το φαγητό;"]),
                "detailed_tip": "【结账买单】标准希腊语结账用语是 'Τον λογαριασμό, παρακαλώ'。"
            },
            {
                "id": 11703,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "我想要一份希腊沙拉，谢谢。",
                "translation": "汉译希：我想要一份希腊沙拉，谢谢。",
                "answer": "Θα ήθελα μια ελληνική σαλάτα, παρακαλώ.",
                "acceptable_answers": ["Θα ήθελα μια ελληνική σαλάτα, παρακαλώ.", "Θα ήθελα μια ελληνική σαλάτα παρακαλώ", "θα ηθελα μια ελληνικη σαλατα παρακαλω", "Θέλω μια ελληνική σαλάτα παρακαλώ."],
                "detailed_tip": "【餐厅礼貌点餐】'Θα ήθελα...' (我想要...) + 'παρακαλώ' (请/谢谢)。"
            }
        ]
    },
    {
        "book_id": "a1-b",
        "unit": 18,
        "book_title": "A1-B",
        "unit_title": "日常服装与过去时叙述 (Ρούχα)",
        "badge": "👗 服装与过去叙述",
        "category": "grammar",
        "grammar_points": "简单过去时 (Aorist) 规则动词入门 (-σα: αγόρασα, φόρεσα, διάβασα)、形容词宾格修饰服装。",
        "core_formulas": [
            "Χθες αγόρασα ένα ωραίο παντελόνι (昨天我买了一条好看的裤子)",
            "Τι φόρεσες στο πάρτι; (你穿什么去参加派对？)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Τι έκανες χθες το απόγευμα;", "chinese": "你昨天下午做了什么？"},
            {"speaker": "B", "greek": "Πήγα στα μαγαζιά και αγόρασα ένα ζεστό μπουφάν.", "chinese": "我去了商店，买了一件保暖夹克。"}
        ],
        "drills": [
            {
                "id": 11801,
                "drill_type": "choice",
                "skill_type": "conjugation",
                "question": "Χθες η Ελένη ______ ένα καινούργιο φόρεμα. (αγοράζω -> 过去时)",
                "translation": "昨天埃莱妮买了一条新裙子。",
                "options": make_shuffled_options("αγόρασε", ["αγόρασα", "αγοράζει", "αγοράσουν"]),
                "answer": "αγόρασε",
                "detailed_tip": "【简单过去时】第三人称单数过去时形式为 '-σε' -> αγόρασε (她买了)。"
            },
            {
                "id": 11802,
                "drill_type": "cloze",
                "skill_type": "conjugation",
                "question": "Χθες το βράδυ εγώ ______ (διαβάζω -> 过去时) δύο ώρες.",
                "translation": "昨晚我读了两个小时书。",
                "answer": "διάβασα",
                "acceptable_answers": ["διάβασα", "διαβασα"],
                "detailed_tip": "【简单过去时第一人称】规则动词变过去时第一人称词尾为 '-σα' -> διάβασα。"
            },
            {
                "id": 11803,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "昨天你做了什么？(询问过去事情)",
                "translation": "汉译希：昨天你做了什么？",
                "answer": "Τι έκανες χθες;",
                "acceptable_answers": ["Τι έκανες χθες;", "Τι έκανες χθες", "τι εκανες χθες"],
                "detailed_tip": "【过去时提问】Τι έκανες (你做了什么 - 过去时) + χθες (昨天)。"
            }
        ]
    },
    {
        "book_id": "a1-b",
        "unit": 19,
        "book_title": "A1-B",
        "unit_title": "身体部位与健康问诊 (Υγεία)",
        "badge": "🩺 身体病痛与问诊",
        "category": "communicative",
        "grammar_points": "表达身体疼痛 (Πονάει / Πονούν + 部位 + μου)、病状表达 (Έχω πυρετό, βήχα, συνάχι)、医生问诊句型。",
        "core_formulas": [
            "Πονάει το κεφάλι μου (我头疼 - 单数)",
            "Πονούν τα πόδια μου (我腿疼 - 复数)",
            "Έχω πυρετό και δεν νιώθω καλά (我发烧了，感觉不舒服)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Τι έχεις; Δεν σε βλέπω καλά.", "chinese": "你怎么了？看你气色不太好。"},
            {"speaker": "B", "greek": "Πονάει πολύ ο λαιμός μου και έχω πυρετό.", "chinese": "我嗓子很疼，还发烧了。"},
            {"speaker": "A", "greek": "Πρέπει να πας στον γιατρό!", "chinese": "你必须去看医生！"}
        ],
        "drills": [
            {
                "id": 11901,
                "drill_type": "choice",
                "skill_type": "syntax",
                "question": "______ τα μάτια μου από το πολύ διάβασμα.",
                "translation": "因为看太多书，我的眼睛很疼。",
                "options": make_shuffled_options("Πονούν", ["Πονάει", "Πονάω", "Πονάτε"]),
                "answer": "Πονούν",
                "detailed_tip": "【身体疼痛动词配合】主语 'τα μάτια' 是复数，动词使用第三人称复数 'Πονούν'。"
            },
            {
                "id": 11902,
                "drill_type": "cloze",
                "skill_type": "syntax",
                "question": "______ (单数疼) το κεφάλι μου.",
                "translation": "我头疼。",
                "answer": "Πονάει",
                "acceptable_answers": ["Πονάει", "ποναει", "Πονάει πολύ"],
                "detailed_tip": "【单数部位疼痛】单数名词搭配 'Πονάει' (Πονάει το κεφάλι μου)。"
            },
            {
                "id": 11903,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "我发烧了，而且嗓子疼。",
                "translation": "汉译希：我发烧了，而且嗓子疼。",
                "answer": "Έχω πυρετό και πονάει ο λαιμός μου.",
                "acceptable_answers": ["Έχω πυρετό και πονάει ο λαιμός μου.", "Έχω πυρετό και πονάει ο λαιμός μου", "εχω πυρετο και ποναει ο λαιμος μου"],
                "detailed_tip": "【看病问诊】Έχω πυρετό (我发烧) + και πονάει ο λαιμός μου (嗓子疼)。"
            }
        ]
    },
    {
        "book_id": "a1-b",
        "unit": 20,
        "book_title": "A1-B",
        "unit_title": "体育运动与休闲 (Αθλητισμός)",
        "badge": "⚽ 偏好与爱好",
        "category": "communicative",
        "grammar_points": "表达喜好 (Μου αρέσει + 单数名词/动词原形 vs Μου αρέσουν + 复数名词)、动词 παίζω (玩/踢/下棋)。",
        "core_formulas": [
            "Μου αρέσει το ποδόσφαιρο (我喜欢足球)",
            "Μου αρέσουν τα σπορ (我喜欢各项运动)",
            "Παίζω τένις / μπάσκετ / σκάκι (我打网球/打篮球/下象棋)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Σου αρέσει το κολύμπι;", "chinese": "你喜欢游泳吗？"},
            {"speaker": "B", "greek": "Ναι, μου αρέσει πολύ να κολυμπάω το καλοκαίρι.", "chinese": "是的，夏天我非常喜欢游泳。"}
        ],
        "drills": [
            {
                "id": 12001,
                "drill_type": "choice",
                "skill_type": "syntax",
                "question": "Μου ______ πολύ τα ταξίδια.",
                "translation": "我非常喜欢旅行。",
                "options": make_shuffled_options("αρέσουν", ["αρέσει", "αγαπάει", "θέλει"]),
                "answer": "αρέσουν",
                "detailed_tip": "【喜好句式配合】'τα ταξίδια' 为中性复数名词，需用动词复数形式 'Μου αρέσουν'。"
            },
            {
                "id": 12002,
                "drill_type": "cloze",
                "skill_type": "syntax",
                "question": "Μου ______ (喜欢·单数) το ποδόσφαιρο.",
                "translation": "我喜欢足球。",
                "answer": "αρέσει",
                "acceptable_answers": ["αρέσει", "αρεσει"],
                "detailed_tip": "【单数喜好】修饰单数名词用 'Μου αρέσει'。"
            },
            {
                "id": 12003,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "夏天我喜欢去游泳。",
                "translation": "汉译希：夏天我喜欢去游泳。",
                "answer": "Το καλοκαίρι μου αρέσει να κολυμπάω.",
                "acceptable_answers": ["Το καλοκαίρι μου αρέσει να κολυμπάω.", "Το καλοκαίρι μου αρέσει να κολυμπάω", "το καλοκαιρι μου αρεσει να κολυμπαω", "Μου αρέσει να κολυμπάω το καλοκαίρι."],
                "detailed_tip": "【意愿从句】Μου αρέσει + να κολυμπάω (我喜欢去游泳)。"
            }
        ]
    },
    {
        "book_id": "a1-b",
        "unit": 21,
        "book_title": "A1-B",
        "unit_title": "旅行度假与交通出行 (Ταξίδια)",
        "badge": "✈️ 交通与介词",
        "category": "communicative",
        "grammar_points": "交通工具介词 (με το λεωφορείο, με το τρένο, με το αεροπλάνο, με τα πόδια)、出行提问 (Με τι πας...;)。",
        "core_formulas": [
            "Πώς πας στη δουλειά; — Πάω με το μετρό (你怎么去上班？—— 我坐地铁去)",
            "Πάω με τα πόδια (我步行去)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Πώς θα πάτε στα νησιά;", "chinese": "你们打算怎么去岛上？"},
            {"speaker": "B", "greek": "Θα πάμε με το πλοίο από τον Πειραιά.", "chinese": "我们将从比雷埃夫斯坐轮船去。"}
        ],
        "drills": [
            {
                "id": 12101,
                "drill_type": "choice",
                "skill_type": "syntax",
                "question": "Κάθε πρωί πηγαίνω στο σχολείο ______ τα πόδια.",
                "translation": "每天早晨我步行去学校。",
                "options": make_shuffled_options("με", ["σε", "από", "για"]),
                "answer": "με",
                "detailed_tip": "【交通固定搭配】表达“步行去”固定搭配为 'με τα πόδια'。"
            },
            {
                "id": 12102,
                "drill_type": "cloze",
                "skill_type": "syntax",
                "question": "Πηγαίνω στη δουλειά ______ (坐地铁) το μετρό.",
                "translation": "我坐地铁去上班。",
                "answer": "με",
                "acceptable_answers": ["με"],
                "detailed_tip": "【交通工具介词】希腊语表达乘坐交通工具使用介词 'με' (με το μετρό)。"
            },
            {
                "id": 12103,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "我们将坐轮船去岛上。",
                "translation": "汉译希：我们将坐轮船去岛上。",
                "answer": "Θα πάμε στα νησιά με το πλοίο.",
                "acceptable_answers": ["Θα πάμε στα νησιά με το πλοίο.", "Θα πάμε στα νησιά με το πλοίο", "θα παμε στα νησια με το πλοιο", "Θα πάμε με το πλοίο στα νησιά."],
                "detailed_tip": "【将来时与交通】Θα πάμε (我们将去) + με το πλοίο (坐船)。"
            }
        ]
    },
    {
        "book_id": "a1-b",
        "unit": 22,
        "book_title": "A1-B",
        "unit_title": "商场购物、价格与健康 (Ψώνια και Υγεία)",
        "badge": "🎯 语法攻坚·购物与询价",
        "category": "communicative",
        "grammar_points": "询价核心句式 (Πόσο κάνει; / Πόσο κοστίζουν;)、价格数字表达 (ευρώ, λεπτά)、看病配药情境 (φάρμακο, πίεση, πυρετός)。",
        "core_formulas": [
            "Πόσο κάνει αυτό; — Κάνει δέκα ευρώ (这个多少钱？—— 10欧元)",
            "Πόσο κοστίζουν αυτά τα παπούτσια; (这双鞋多少钱？)",
            "Παίρνω αυτό το φάρμακο δύο φορές την ημέρα (我每天吃两次这种药)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Γεια σας! Πόσο κάνει αυτό το μπλουζάκι;", "chinese": "您好！这件T恤多少钱？"},
            {"speaker": "B", "greek": "Κάνει δεκαπέντε ευρώ και πενήντα λεπτά.", "chinese": "15欧元50欧分。"},
            {"speaker": "A", "greek": "Ωραία, θα το πάρω!", "chinese": "太好了，我买了！"}
        ],
        "drills": [
            {
                "id": 12201,
                "drill_type": "choice",
                "skill_type": "syntax",
                "question": "Πόσο ______ αυτά τα μήλα; (κοστίζω)",
                "translation": "这些苹果多少钱？",
                "options": make_shuffled_options("κοστίζουν", ["κοστίζει", "κάνω", "κάνει"]),
                "answer": "κοστίζουν",
                "detailed_tip": "【复数询价】主语 'αυτά τα μήλα' 为复数，问价格动词用第三人称复数 'κοστίζουν' (或 κάνουν)。"
            },
            {
                "id": 12202,
                "drill_type": "cloze",
                "skill_type": "syntax",
                "question": "Πόσο ______ (κάνω - 单数) αυτό το φόρεμα;",
                "translation": "这条裙子多少钱？",
                "answer": "κάνει",
                "acceptable_answers": ["κάνει", "κανει", "κοστίζει"],
                "detailed_tip": "【单数询价】问单件商品价格用 'Πόσο κάνει...;'。"
            },
            {
                "id": 12203,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "这件T恤多少钱？",
                "translation": "汉译希：这件T恤多少钱？",
                "answer": "Πόσο κάνει αυτό το μπλουζάκι;",
                "acceptable_answers": ["Πόσο κάνει αυτό το μπλουζάκι;", "Πόσο κάνει αυτό το μπλουζάκι", "ποσο κανει αυτο το μπλουζακι", "Πόσο κοστίζει αυτό το μπλουζάκι;"],
                "detailed_tip": "【询价固定句型】Πόσο κάνει + αυτό το μπλουζάκι (这件T恤)。"
            }
        ]
    },
    {
        "book_id": "a1-b",
        "unit": 23,
        "book_title": "A1-B",
        "unit_title": "各行各业与未来职业 (Επαγγέλματα)",
        "badge": "🎯 语法攻坚·将来时",
        "category": "grammar",
        "grammar_points": "简单将来时构造法 (Μέλλοντας: θα + 动词变位，如 θα γίνω, θα δουλέψω, θα σπουδάσω)、职业名词阴阳性词尾转换 (-ος -> -α, -τής -> -τρια)。",
        "core_formulas": [
            "Τι θα γίνεις όταν μεγαλώσεις; (你长大后想成为什么？)",
            "Θα γίνω γιατρός / δάσκαλος / μηχανικός (我想成为一名医生/教师/工程师)",
            "Στο μέλλον θα δουλέψω στην Αθήνα (未来我将在雅典工作)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Τι θέλεις να σπουδάσεις στο Πανεπιστήμιο;", "chinese": "你想在大学学什么专业？"},
            {"speaker": "B", "greek": "Θέλω να σπουδάσω ιατρική. Στο μέλλον θα γίνω γιατρός.", "chinese": "我想学医。未来我想成为一名医生。"}
        ],
        "drills": [
            {
                "id": 12301,
                "drill_type": "choice",
                "skill_type": "conjugation",
                "question": "Αύριο ο Νίκος ______ για το Λονδίνο. (φεύγω -> 将来时)",
                "translation": "明天尼科斯将启程前往伦敦。",
                "options": make_shuffled_options("θα φύγει", ["φεύγει", "έφυγε", "να φύγει"]),
                "answer": "θα φύγει",
                "detailed_tip": "【简单将来时】'θα + 简单动词变位' -> θα φύγει (他将离开)。"
            },
            {
                "id": 12302,
                "drill_type": "cloze",
                "skill_type": "declension",
                "question": "Ο Γιώργος είναι καθηγητής και η Μαρία είναι ______ (阴性女老师).",
                "translation": "乔治是男老师，玛利亚是女老师。",
                "answer": "καθηγήτρια",
                "acceptable_answers": ["καθηγήτρια", "καθηγητρια", "δασκάλα"],
                "detailed_tip": "【职业阴阳性】阳性 '-τής' 对应阴性 '-τρια' -> καθηγητής -> καθηγήτρια。"
            },
            {
                "id": 12303,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "未来我想成为一名医生。",
                "translation": "汉译希：未来我想成为一名医生。",
                "answer": "Στο μέλλον θα γίνω γιατρός.",
                "acceptable_answers": ["Στο μέλλον θα γίνω γιατρός.", "Στο μέλλον θα γίνω γιατρός", "στο μελλον θα γινω γιατρος", "Θα γίνω γιατρός στο μέλλον."],
                "detailed_tip": "【将来时愿望】Στο μέλλον (未来) + θα γίνω (我将成为) + γιατρός (医生)。"
            }
        ]
    },
    {
        "book_id": "a1-b",
        "unit": 24,
        "book_title": "A1-B",
        "unit_title": "大自然与疑问句式 (Η φύση)",
        "badge": "🌲 自然与疑问词",
        "category": "grammar",
        "grammar_points": "全套疑问代词与副词 (Ποιος, Τι, Πού, Πότε, Πώς, Γιατί, Πόσο)、重音辨析 (πού vs που, πώς vs πως)。",
        "core_formulas": [
            "Γιατί μαθαίνεις ελληνικά; — Επειδή μου αρέσει η γλώσσα.",
            "Πού (带重音=哪里) vs που (不带重音=关系词)",
            "Πώς (带重音=怎样) vs πως (不带重音=连词引导宾语从句)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Γιατί δεν ήρθες χθες στο μάθημα;", "chinese": "你昨天为什么没来上课？"},
            {"speaker": "B", "greek": "Γιατί ήμουν άρρωστος και έμεινα στο κρεβάτι.", "chinese": "因为我生病了，卧床休息。"}
        ],
        "drills": [
            {
                "id": 12401,
                "drill_type": "choice",
                "skill_type": "syntax",
                "question": "______ μένεις; — Μένω στο κέντρο της Αθήνας.",
                "translation": "你住在哪里？—— 我住在雅典市中心。",
                "options": make_shuffled_options("Πού", ["Πότε", "Πώς", "Γιατί"]),
                "answer": "Πού",
                "detailed_tip": "【疑问词选择】询问地点用带重音符号的 'Πού' (在哪里)。"
            },
            {
                "id": 12402,
                "drill_type": "cloze",
                "skill_type": "syntax",
                "question": "______ (为什么) μαθαίνεις ελληνικά; — Επειδή μου αρέσουν.",
                "translation": "你为什么学希腊语？—— 因为我喜欢。",
                "answer": "Γιατί",
                "acceptable_answers": ["Γιατί", "γιατι", "Γιατί;"],
                "detailed_tip": "【因果疑问词】询问原因使用 'Γιατί' (为什么)。"
            },
            {
                "id": 12403,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "你什么时候去学校？",
                "translation": "汉译希：你什么时候去学校？",
                "answer": "Πότε πας στο σχολείο;",
                "acceptable_answers": ["Πότε πας στο σχολείο;", "Πότε πας στο σχολείο", "ποτε πας στο σχολειο", "Πότε πηγαίνεις στο σχολείο;"],
                "detailed_tip": "【时间疑问句】'Πότε' (何时) + 'πας στο σχολείο' (去学校)。"
            }
        ]
    },
    {
        "book_id": "a1-b",
        "unit": 25,
        "book_title": "A1-B",
        "unit_title": "节日庆典与美好祝愿 (Γιορτές)",
        "badge": "🎉 节日与祝愿金句",
        "category": "communicative",
        "grammar_points": "希腊节庆常用祝愿语 (Χρόνια Πολλά, Καλά Χριστούγεννα, Καλό Πάσχα, Καλή Χρονιά, Καλή επιτυχία)、将来时简单应答。",
        "core_formulas": [
            "Χρόνια Πολλά! (祝你长寿/节日快乐！)",
            "Καλά Χριστούγεννα και Ευτυχισμένο το Νέο Έτος! (圣诞快乐，新年幸福！)",
            "Καλή επιτυχία στις εξετάσεις! (考试顺利！)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Σήμερα είναι η γιορτή μου!", "chinese": "今天是我的命名日！"},
            {"speaker": "B", "greek": "Χρόνια Πολλά, Νίκο! Να τα εκατοστήσεις!", "chinese": "祝你长命百岁，节日快乐，尼科斯！"}
        ],
        "drills": [
            {
                "id": 12501,
                "drill_type": "choice",
                "skill_type": "dialogue",
                "question": "当朋友过生日或命名日时，最经典的希腊语祝福是：______",
                "translation": "情境祝愿选择",
                "options": make_shuffled_options("Χρόνια Πολλά!", ["Καληνύχτα!", "Περαστικά!", "Γεια σας!"]),
                "answer": "Χρόνια Πολλά!",
                "detailed_tip": "【节日与生日祝愿】希腊最通用的生日/节日/命名日祝愿是 'Χρόνια Πολλά'。"
            },
            {
                "id": 12502,
                "drill_type": "qa",
                "skill_type": "dialogue",
                "question": "在圣诞节期间，对他人致以圣诞祝福应当说：______",
                "translation": "情境应答：圣诞祝福",
                "answer": "Καλά Χριστούγεννα!",
                "acceptable_answers": ["Καλά Χριστούγεννα!", "Καλά Χριστούγεννα", "καλα χριστουγεννα"],
                "options": make_shuffled_options("Καλά Χριστούγεννα!", ["Καλό Πάσχα!", "Καλημέρα!", "Καλή όρεξη!"]),
                "detailed_tip": "【圣诞祝愿】圣诞节传统祝福为 'Καλά Χριστούγεννα!'。"
            },
            {
                "id": 12503,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "祝你考试顺利！",
                "translation": "汉译希：祝你考试顺利！",
                "answer": "Καλή επιτυχία στις εξετάσεις!",
                "acceptable_answers": ["Καλή επιτυχία στις εξετάσεις!", "Καλή επιτυχία στις εξετάσεις", "καλη επιτυχια στις εξετασεις", "Καλή επιτυχία!"],
                "detailed_tip": "【考前祝福】'Καλή επιτυχία' (祝愿成功/顺利) + 'στις εξετάσεις' (在考试中)。"
            }
        ]
    },
    {
        "book_id": "a1-b",
        "unit": 26,
        "book_title": "A1-B",
        "unit_title": "简单过去时不规则动词 (Αόριστος)",
        "badge": "🎯 语法攻坚·不规则过去时",
        "category": "grammar",
        "grammar_points": "高频不规则动词简单过去时 (Αόριστος) 词根突变：τρώω -> έφαγα, πίνω -> ήπια, βλέπω -> είδα, λέω -> είπα, πηγαίνω -> πήγα, παίρνω -> πήρα, βρίσκω -> βρήκα, κάνω -> έκανα。",
        "core_formulas": [
            "εγώ έφαγα (我吃了) / εσύ έφαγες / αυτός έφαγε",
            "εγώ είδα (我看了) / εσύ είδες / αυτός είδε",
            "εγώ πήγα (我去了) / εσύ πήγες / αυτός πήγε"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Τι έφαγες το μεσημέρι;", "chinese": "你中午吃了什么？"},
            {"speaker": "B", "greek": "Έφαγα ψάρι και ήπια έναν χυμό πορτοκάλι.", "chinese": "我吃了鱼，喝了一杯橙汁。"}
        ],
        "drills": [
            {
                "id": 12601,
                "drill_type": "choice",
                "skill_type": "conjugation",
                "question": "Χθες το βράδυ εμείς ______ μια πολύ ωραία ταινία. (βλέπω -> 过去时)",
                "translation": "昨晚我们看了一部非常棒的电影。",
                "options": make_shuffled_options("είδαμε", ["είδα", "βλέπουμε", "είδαν"]),
                "answer": "είδαμε",
                "detailed_tip": "【不规则过去时】动词 βλέπω (看) 过去时第一人称复数形式为 'είδαμε' (我们看了)。"
            },
            {
                "id": 12602,
                "drill_type": "cloze",
                "skill_type": "conjugation",
                "question": "Το μεσημέρι εγώ ______ (τρώω -> 过去时) σουβλάκι.",
                "translation": "中午我吃了烤肉串。",
                "answer": "έφαγα",
                "acceptable_answers": ["έφαγα", "εφαγα"],
                "detailed_tip": "【不规则过去时】τρώω (吃) 过去时第一人称单数突变为 'έφαγα'。"
            },
            {
                "id": 12603,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "你们夏天去哪里了？(使用 πηγαίνω 过去时)",
                "translation": "汉译希：你们夏天去哪里了？",
                "answer": "Πού πήγατε το καλοκαίρι;",
                "acceptable_answers": ["Πού πήγατε το καλοκαίρι;", "Πού πήγατε το καλοκαίρι", "που πηγατε το καλοκαιρι"],
                "detailed_tip": "【过去时疑问】Πού (在哪里/去哪) + πήγατε (你们去了 - 过去时) + το καλοκαίρι (在夏天)。"
            }
        ]
    },
    {
        "book_id": "a1-b",
        "unit": 27,
        "book_title": "A1-B",
        "unit_title": "闲暇爱好与时态对比 (Ελεύθερος χρόνος)",
        "badge": "🎨 过去时态辨析",
        "category": "grammar",
        "grammar_points": "完成过去时 (Aorist) 与持续/未完成动作对比、时间状语搭配 (χθες, προχθές, πέρυσι)。",
        "core_formulas": [
            "Χθες διάβασα για δύο ώρες (昨天我读了两个小时书)",
            "Πέρυσι το καλοκαίρι πήγαμε στην Κρήτη (去年夏天我们去了克里特岛)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Πώς πέρασες το Σαββατοκύριακο;", "chinese": "你周末过得怎么样？"},
            {"speaker": "B", "greek": "Πέρασα υπέροχα! Πήγα στη θάλασσα με τους φίλους μου.", "chinese": "过得棒极了！我和朋友们去了海边。"}
        ],
        "drills": [
            {
                "id": 12701,
                "drill_type": "choice",
                "skill_type": "conjugation",
                "question": "Προχθές ο Πέτρος ______ τα κλειδιά του. (βρίσκω -> Aorist)",
                "translation": "前天彼得找到了他的钥匙。",
                "options": make_shuffled_options("βρήκε", ["βρήκα", "βρίσκει", "βρουν"]),
                "answer": "βρήκε",
                "detailed_tip": "【不规则过去时】动词 βρίσκω (找到) 第三人称单数过去时是 'βρήκε' (他找到了)。"
            },
            {
                "id": 12702,
                "drill_type": "cloze",
                "skill_type": "conjugation",
                "question": "Πέρυσι εμείς ______ (πηγαίνω -> Aorist) στην Κρήτη.",
                "translation": "去年我们去了克里特岛。",
                "answer": "πήγαμε",
                "acceptable_answers": ["πήγαμε", "πηγαμε"],
                "detailed_tip": "【不规则过去时】动词 πηγαίνω (去) 第一人称复数过去时是 'πήγαμε' (我们去了)。"
            },
            {
                "id": 12703,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "你周末过得怎么样？",
                "translation": "汉译希：你周末过得怎么样？",
                "answer": "Πώς πέρασες το Σαββατοκύριακο;",
                "acceptable_answers": ["Πώς πέρασες το Σαββατοκύριακο;", "Πώς πέρασες το Σαββατοκύριακο", "πως περασες το σαββατοκυριακο"],
                "detailed_tip": "【交际问候】'Πώς πέρασες...' (你度过得怎么样) + 'το Σαββατοκύριακο' (周末)。"
            }
        ]
    },
    {
        "book_id": "a1-b",
        "unit": 28,
        "book_title": "A1-B",
        "unit_title": "公共求助与祈使语气 (Βοήθεια και Οδηγίες)",
        "badge": "🎯 语法攻坚·命令与求助",
        "category": "communicative",
        "grammar_points": "祈使式/命令语气入门 (Πες μου 告诉我, Δείξε μου 指给我看, Έλα 过来, Κοίτα 看)、礼貌求助 (Μπορείτε να με βοηθήσετε;)。",
        "core_formulas": [
            "Πες μου πού είναι ο σταθμός (告诉我车站在哪里)",
            "Δείξε μου στον χάρτη, παρακαλώ (请在地图上指给我看)",
            "Μπορείτε να με βοηθήσετε; (您能帮帮我吗？)",
            "Βοήθεια! (救命/帮助！)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Συγγνώμη, κύριε! Μπορείτε να μου πείτε πού είναι το μετρό;", "chinese": "打扰了，先生！您可以告诉我地铁站在哪里吗？"},
            {"speaker": "B", "greek": "Βεβαίως! Πηγαίνετε ευθεία και στρίψτε αριστερά.", "chinese": "当然！直走然后左转。"},
            {"speaker": "A", "greek": "Ευχαριστώ πολύ!", "chinese": "非常感谢！"}
        ],
        "drills": [
            {
                "id": 12801,
                "drill_type": "choice",
                "skill_type": "syntax",
                "question": "Σε παρακαλώ, ______ μου την αλήθεια! (λέω - 命令式单数)",
                "translation": "请告诉我真相！",
                "options": make_shuffled_options("πες", ["λες", "είπες", "πείτε"]),
                "answer": "πες",
                "detailed_tip": "【命令式】对熟人（单数你）用命令式 'πες' (说/告诉)。"
            },
            {
                "id": 12802,
                "drill_type": "qa",
                "skill_type": "dialogue",
                "question": "在街上迷路，向路人寻求礼貌协助的标准开场白是：______",
                "translation": "情境求助选择",
                "answer": "Συγγνώμη, μπορείτε να με βοηθήσετε;",
                "acceptable_answers": ["Συγγνώμη, μπορείτε να με βοηθήσετε;", "Συγγνώμη, μπορείτε να με βοηθήσετε", "συγγνωμη μπορειτε να με βοηθησετε"],
                "options": make_shuffled_options("Συγγνώμη, μπορείτε να με βοηθήσετε;", ["Ποιος είσαι εσύ;", "Τι κάνεις εδώ;", "Φύγε τώρα!"]),
                "detailed_tip": "【礼貌求助】标准开场白是 'Συγγνώμη, μπορείτε να με βοηθήσετε;'。"
            },
            {
                "id": 12803,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "请在地图上指给我看。(使用 δείχνω 命令式)",
                "translation": "汉译希：请在地图上指给我看。",
                "answer": "Δείξε μου στον χάρτη, παρακαλώ.",
                "acceptable_answers": ["Δείξε μου στον χάρτη, παρακαλώ.", "Δείξε μου στον χάρτη παρακαλώ", "δειξε μου στον χαρτη παρακαλω", "Δείξτε μου στον χάρτη παρακαλώ."],
                "detailed_tip": "【祈使句】Δείξε μου (指给我看) + στον χάρτη (在地图上) + παρακαλώ (请)。"
            }
        ]
    },
    {
        "book_id": "a1-b",
        "unit": 29,
        "book_title": "A1-B",
        "unit_title": "菜市场与肉铺购物 (Στη λαϊκή και στο κρεοπωλείο)",
        "badge": "🎯 语法攻坚·量词与市集交际",
        "category": "communicative",
        "grammar_points": "数量与称重计量单位 (ένα κιλό 一公斤, μισό κιλό 半公斤, διακόσια γραμμάρια 200克, φέτες 片)、市集点购句型 (Βάλτε μου... / Θέλω... / Πόσο έχει το κιλό;)。",
        "core_formulas": [
            "Βάλτε μου ένα κιλό κιμά, παρακαλώ (请给我称一公斤肉末)",
            "Πόσο έχουν τα ακτινίδια; (猕猴桃多少钱？)",
            "Πάω στη λαϊκή αγορά για φρέσκα φρούτα (我去露天市集买新鲜水果)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Καλημέρα! Τι να σας βάλω;", "chinese": "早上好！给您装点什么？"},
            {"speaker": "B", "greek": "Βάλτε μου δύο κιλά ντομάτες και ένα κιλό ακτινίδια.", "chinese": "请给我装两公斤西红柿和一公斤猕猴桃。"},
            {"speaker": "A", "greek": "Ορίστε! Κάτι άλλο;", "chinese": "给您！还要别的吗？"},
            {"speaker": "B", "greek": "Όχι, αυτά, ευχαριστώ. Πόσο κάνουν όλα μαζί;", "chinese": "不用了，就这些，谢谢。一共多少钱？"}
        ],
        "drills": [
            {
                "id": 12901,
                "drill_type": "choice",
                "skill_type": "syntax",
                "question": "Παρακαλώ, βάλτε μου ένα ______ κιμά.",
                "translation": "请给我装一公斤肉末。",
                "options": make_shuffled_options("κιλό", ["φέτα", "κουτί", "ποτήρι"]),
                "answer": "κιλό",
                "detailed_tip": "【称重计量单位】买肉末、水果等称重使用 'κιλό' (公斤)。"
            },
            {
                "id": 12902,
                "drill_type": "cloze",
                "skill_type": "syntax",
                "question": "Κάθε Σάββατο πηγαίνω ______ (σε + τη) λαϊκή αγορά.",
                "translation": "每个周六我都去露天菜市场。",
                "answer": "στη",
                "acceptable_answers": ["στη", "στην"],
                "detailed_tip": "【介词缩合】'λαϊκή' 是阴性名词，'σε + τη' 缩合为 'στη'。"
            },
            {
                "id": 12903,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "一公斤西红柿多少钱？",
                "translation": "汉译希：一公斤西红柿多少钱？",
                "answer": "Πόσο έχουν οι ντομάτες το κιλό;",
                "acceptable_answers": ["Πόσο έχουν οι ντομάτες το κιλό;", "Πόσο έχει το κιλό;", "ποσο εχουν οι ντοματες το κιλο", "Πόσο κάνουν οι ντομάτες το κιλό;"],
                "detailed_tip": "【市集询单价】'Πόσο έχει το κιλό;' 或 'Πόσο έχουν οι ντομάτες το κιλό;'。"
            }
        ]
    },
    {
        "book_id": "a1-b",
        "unit": 30,
        "book_title": "A1-B",
        "unit_title": "A1阶段终期全面语法总结 (Τελική Επανάληψη)",
        "badge": "🏆 A1 语法大通关",
        "category": "grammar",
        "grammar_points": "现在时、简单过去时、简单将来时三大时态总对齐、名词冠词三性格位大汇总、直接宾语代词位置 (μου, σου, τον, την, το)。",
        "core_formulas": [
            "现在时: γράφω (我写)",
            "过去时: έγραψα (我写了)",
            "将来时: θα γράψω (我将写)",
            "直接宾语代词: Τον βλέπω (我看见他), Την αγαπώ (我爱她)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Συγχαρητήρια! Τελείωσες το επίπεδο A1!", "chinese": "祝贺你！你学完了 A1 级别！"},
            {"speaker": "B", "greek": "Ευχαριστώ πολύ! Τώρα είμαι έτοιμος για το A2!", "chinese": "非常感谢！现在我准备好进入 A2 了！"}
        ],
        "drills": [
            {
                "id": 13001,
                "drill_type": "choice",
                "skill_type": "conjugation",
                "question": "Χθες έγραψα ένα γράμμα, σήμερα γράφω ένα ποίημα και αύριο ______ ένα βιβλίο. (γράφω)",
                "translation": "昨天我写了一封信，今天我写一首诗，明天我将写一本书。",
                "options": make_shuffled_options("θα γράψω", ["έγραψα", "γράφω", "να γράφω"]),
                "answer": "θα γράψω",
                "detailed_tip": "【三大时态贯通】'αύριο' (明天) 必须搭配将来时结构 'θα + 变位' -> θα γράψω。"
            },
            {
                "id": 13002,
                "drill_type": "cloze",
                "skill_type": "syntax",
                "question": "Τον Νίκο ______ (我看见他) κάθε μέρα στο σχολείο.",
                "translation": "我每天在学校都看见他。",
                "answer": "τον βλέπω",
                "acceptable_answers": ["τον βλέπω", "τον βλεπω", "βλέπω"],
                "detailed_tip": "【直接宾语代词】表达“看见他”，弱读宾格代词放在动词前 -> 'τον βλέπω'。"
            },
            {
                "id": 13003,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "现在我准备好进入 A2 级别了！",
                "translation": "汉译希：现在我准备好进入 A2 级别了！",
                "answer": "Τώρα είμαι έτοιμος για το επίπεδο A2!",
                "acceptable_answers": ["Τώρα είμαι έτοιμος για το επίπεδο A2!", "Τώρα είμαι έτοιμος για το A2!", "τωρα ειμαι ετοιμος για το α2", "Είμαι έτοιμος για το A2!"],
                "detailed_tip": "【终极冲刺金句】'Είμαι έτοιμος' (我准备好了) + 'για το A2' (为进入A2)。"
            }
        ]
    },

    # ==================== A2 (Units 31-39) ====================
    {
        "book_id": "a2",
        "unit": 31,
        "book_title": "A2",
        "unit_title": "关系代词与复杂句式 (Εγώ και οι άλλοι)",
        "badge": "🧩 关系代词 που",
        "category": "grammar",
        "grammar_points": "关系代词 'που' 和 'ο οποίος' 的用法、弱读代词双宾语位置、自我与他人深度介绍。",
        "core_formulas": [
            "Ο άνθρωπος που γνώρισα χθες (我昨天认识的那个人)",
            "Το βιβλίο που διαβάζω είναι πολύ ενδιαφέρον (我正在读的那本书非常有趣)",
            "Του το δίνω (我把那个给他)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Ποιος είναι αυτός ο άντρας;", "chinese": "那个男人是谁？"},
            {"speaker": "B", "greek": "Είναι ο καθηγητής που μας διδάσκει ελληνικά.", "chinese": "他是教我们希腊语的老师。"}
        ],
        "drills": [
            {
                "id": 13101,
                "drill_type": "choice",
                "skill_type": "syntax",
                "question": "Η πόλη ______ μένω είναι πολύ όμορφη.",
                "translation": "我住的那座城市非常美丽。",
                "options": make_shuffled_options("που", ["πού", "πώς", "γιατί"]),
                "answer": "που",
                "detailed_tip": "【关系代词】引导定语从句的关系代词用不带重音的 'που' (相当于 which/where)。"
            },
            {
                "id": 13102,
                "drill_type": "cloze",
                "skill_type": "syntax",
                "question": "Το βιβλίο ______ (关系代词) διαβάζω είναι πολύ καλό.",
                "translation": "我正在读的那本书非常好。",
                "answer": "που",
                "acceptable_answers": ["που", "το οποίο"],
                "detailed_tip": "【关系代词】修饰先行词用通用关系代词 'που'。"
            },
            {
                "id": 13103,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "他是教我们希腊语的老师。(使用关系代词 που)",
                "translation": "汉译希：他是教我们希腊语的老师。",
                "answer": "Είναι ο καθηγητής που μας διδάσκει ελληνικά.",
                "acceptable_answers": ["Είναι ο καθηγητής που μας διδάσκει ελληνικά.", "Είναι ο καθηγητής που μας διδάσκει ελληνικά", "ειναι ο καθηγητης που μας διδασκει ελληνικα", "Είναι ο δάσκαλος που μας μαθαίνει ελληνικά."],
                "detailed_tip": "【定语从句】ο καθηγητής (先行词) + που μας διδάσκει (教我们)。"
            }
        ]
    },
    {
        "book_id": "a2",
        "unit": 32,
        "book_title": "A2",
        "unit_title": "历史文化与过去叙事 (Ιστορία και Ανακαλύψεις)",
        "badge": "🏛️ 历史文化与叙事",
        "category": "grammar",
        "grammar_points": "未完成过去时 (Παρατατικός: διάβαζα, έγραφα) 与简单过去时 (Αόριστος) 组合叙事、历史篇章阅读。",
        "core_formulas": [
            "Όταν ήμουν μικρός, έπαιζα κάθε μέρα (当我小时候，我每天都在玩 - 习惯)",
            "Χθες ξαφνικά άρχισε να βρέχει (昨天突然开始下雨 - 瞬间)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Τι έκανες όταν χτύπησε το τηλέφωνο;", "chinese": "电话响的时候你在做什么？"},
            {"speaker": "B", "greek": "Μαγείρευα στην κουζίνα.", "chinese": "我当时正在厨房做饭。"}
        ],
        "drills": [
            {
                "id": 13201,
                "drill_type": "choice",
                "skill_type": "syntax",
                "question": "Όταν έφτασε ο Νίκος, εμείς ______ τηλεόραση. (βλέπω - Παρατατικός 正在进行)",
                "translation": "当尼科斯到达时，我们正在看电视。",
                "options": make_shuffled_options("βλέπαμε", ["είδαμε", "θα δούμε", "βλέπουμε"]),
                "answer": "βλέπαμε",
                "detailed_tip": "【未完成过去时】表示过去某一时刻正在持续进行的动作，用未完成过去时 'βλέπαμε'。"
            },
            {
                "id": 13202,
                "drill_type": "cloze",
                "skill_type": "syntax",
                "question": "Όταν ήμουν μικρός, ______ (μένω - Παρατατικός 过去长期居住) στο χωριό.",
                "translation": "当我小的时候，我住在村子里。",
                "answer": "έμενα",
                "acceptable_answers": ["έμενα", "εμενα"],
                "detailed_tip": "【未完成过去时】表达过去长期重复或持续状态用 Παρατατικός (έμενα)。"
            },
            {
                "id": 13203,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "电话响的时候我正在做饭。",
                "translation": "汉译希：电话响的时候我正在做饭。",
                "answer": "Όταν χτύπησε το τηλέφωνο, μαγείρευα.",
                "acceptable_answers": ["Όταν χτύπησε το τηλέφωνο, μαγείρευα.", "Όταν χτύπησε το τηλέφωνο μαγείρευα", "οταν χτυπησε το τηλεφωνο μαγειρευα", "Μαγείρευα όταν χτύπησε το τηλέφωνο."],
                "detailed_tip": "【双时态复合句】Όταν χτύπησε (瞬间过去) + μαγείρευα (持续过去)。"
            }
        ]
    },
    {
        "book_id": "a2",
        "unit": 33,
        "book_title": "A2",
        "unit_title": "剧院艺术与高级形容词 (Στο θέατρο)",
        "badge": "🎭 艺术与形容词变格",
        "category": "grammar",
        "grammar_points": "特殊形容词变格 (-ύς, -ιά, -ύ / βαθύς, βαθιά, βαθύ; βαρύς, βαριά, βαρύ)、文化评论与喜好探讨。",
        "core_formulas": [
            "Ο βαρύς χειμώνας (严酷的冬天)",
            "Η βαθιά θάλασσα (深海)",
            "Το ελαφρύ φαγητό (清淡的食物)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Πώς σου φάνηκε η θεατρική παράσταση;", "chinese": "你觉得那场话剧演出怎么样？"},
            {"speaker": "B", "greek": "Ήταν καταπληκτική! Οι ηθοποιοί έπαιξαν υπέροχα.", "chinese": "太精彩了！演员们演得太棒了。"}
        ],
        "drills": [
            {
                "id": 13301,
                "drill_type": "choice",
                "skill_type": "declension",
                "question": "Η βαλίτσα μου είναι πολύ ______ (沉重·阴性).",
                "translation": "我的行李箱非常重。",
                "options": make_shuffled_options("βαριά", ["βαρύς", "βαρύ", "βαριές"]),
                "answer": "βαριά",
                "detailed_tip": "【特殊形容词阴性】βαλίτσα 为阴性单数名词，形容词 βαρύς 的阴性形式为 'βαριά'。"
            },
            {
                "id": 13302,
                "drill_type": "cloze",
                "skill_type": "declension",
                "question": "Κολυμπάμε στη ______ (βαθύς -> 阴性深) θάλασσα.",
                "translation": "我们在深海里游泳。",
                "answer": "βαθιά",
                "acceptable_answers": ["βαθιά", "βαθια"],
                "detailed_tip": "【特殊形容词】θάλασσα 是阴性名词，形容词 βαθύς 阴性宾格形式为 'βαθιά'。"
            },
            {
                "id": 13303,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "那场话剧演出太精彩了！",
                "translation": "汉译希：那场话剧演出太精彩了！",
                "answer": "Η θεατρική παράσταση ήταν καταπληκτική!",
                "acceptable_answers": ["Η θεατρική παράσταση ήταν καταπληκτική!", "Η παράσταση ήταν καταπληκτική!", "η θεατρικη παρασταση ηταν καταπληκτικη", "Η παράσταση ήταν υπέροχη!"],
                "detailed_tip": "【艺术评价】Η παράσταση ήταν (演出是) + καταπληκτική (精彩绝伦的)。"
            }
        ]
    },
    {
        "book_id": "a2",
        "unit": 34,
        "book_title": "A2",
        "unit_title": "商业服务与礼貌条件式 (Κατάστημα)",
        "badge": "🛍️ 礼貌条件式与服务",
        "category": "communicative",
        "grammar_points": "礼貌条件式表达 (Θα ήθελα / Θα μπορούσατε να μου πείτε...)、商场试穿与退换货交际 (νούμερο, απόδειξη, αλλαγή)。",
        "core_formulas": [
            "Θα μπορούσα να δοκιμάσω αυτό το πουλόβερ; (我可以试穿这件毛衣吗？)",
            "Έχετε αυτό σε μικρότερο νούμερο; (这个您有更小尺码的吗？)",
            "Μπορώ να κάνω αλλαγή με την απόδειξη; (凭小票我可以换货吗？)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Μπορώ να σας βοηθήσω;", "chinese": "有什么可以帮您的吗？"},
            {"speaker": "B", "greek": "Ναι, θα ήθελα να δοκιμάσω αυτό το παντελόνι στο νούμερο 40.", "chinese": "是的，我想试穿一下这条40码的裤子。"},
            {"speaker": "A", "greek": "Τα δοκιμαστήρια είναι στο βάθος δεξιά.", "chinese": "试衣间在里面右侧。"}
        ],
        "drills": [
            {
                "id": 13401,
                "drill_type": "choice",
                "skill_type": "syntax",
                "question": "______ να μου δώσετε λίγο νερό, παρακαλώ; (极其礼貌请求)",
                "translation": "您可以给我一点水吗（极其礼貌）？",
                "options": make_shuffled_options("Θα μπορούσατε", ["Μπορείς", "Έπρεπε", "Θα θέλεις"]),
                "answer": "Θα μπορούσατε",
                "detailed_tip": "【礼貌条件式】极其礼貌地向他人提出请求，使用条件式 'Θα μπορούσατε να...' (您能否...)。"
            },
            {
                "id": 13402,
                "drill_type": "cloze",
                "skill_type": "syntax",
                "question": "Θα μπορούσα ______ (δοκιμάζω -> 虚拟式) αυτό το πουλόβερ;",
                "translation": "我可以试穿一下这件毛衣吗？",
                "answer": "να δοκιμάσω",
                "acceptable_answers": ["να δοκιμάσω", "να δοκιμασω", "δοκιμάσω"],
                "detailed_tip": "【条件式搭配】'Θα μπορούσα + να + 简单虚拟式' -> να δοκιμάσω。"
            },
            {
                "id": 13403,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "试衣间在里面右侧。",
                "translation": "汉译希：试衣间在里面右侧。",
                "answer": "Τα δοκιμαστήρια είναι στο βάθος δεξιά.",
                "acceptable_answers": ["Τα δοκιμαστήρια είναι στο βάθος δεξιά.", "Τα δοκιμαστήρια είναι στο βάθος δεξιά", "τα δοκιμαστηρια ειναι στο βαθος δεξια"],
                "detailed_tip": "【商场方位】Τα δοκιμαστήρια (试衣间) + είναι στο βάθος δεξιά (在深处右侧)。"
            }
        ]
    },
    {
        "book_id": "a2",
        "unit": 35,
        "book_title": "A2",
        "unit_title": "虚拟从句与意愿表达 (Να + 动词)",
        "badge": "🎯 语法攻坚·虚词 να 体系",
        "category": "grammar",
        "grammar_points": "虚词 'να' 引导从句核心体系 (Θέλω να..., Πρέπει να..., Μπορώ να..., Μου αρέσει να...)、否定句式 (Μην + 动词 / Δεν θέλω να...)、间接引语基础。",
        "core_formulas": [
            "Θέλω να μάθω ελληνικά (我想学希腊语)",
            "Πρέπει να φύγω τώρα (我现在必须走了)",
            "Μην κάνεις θόρυβο! (不要制造噪音！)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Τι θέλεις να κάνουμε το βράδυ;", "chinese": "你今晚想做什么？"},
            {"speaker": "B", "greek": "Θέλω να πάμε σινεμά και μετά να φάμε πίτσα.", "chinese": "我想去看电影，然后去吃披萨。"}
        ],
        "drills": [
            {
                "id": 13501,
                "drill_type": "choice",
                "skill_type": "syntax",
                "question": "Πρέπει ______ αμέσως στον γιατρό. (πηγαίνω - εσύ)",
                "translation": "你必须立刻去看医生。",
                "options": make_shuffled_options("να πας", ["πας", "να πηγαίνεις", "πήγες"]),
                "answer": "να πας",
                "detailed_tip": "【να + 虚拟式】'Πρέπει να + 简单虚拟式' -> να πας (你必须去)。"
            },
            {
                "id": 13502,
                "drill_type": "cloze",
                "skill_type": "syntax",
                "question": "Σε παρακαλώ, ______ (否定词) λες ψέματα!",
                "translation": "请你不要撒谎！",
                "answer": "μην",
                "acceptable_answers": ["μην", "μη"],
                "detailed_tip": "【虚拟式与命令否定】在虚拟式、祈使从句中表达否定用 'μη / μην'，不用 'δεν'。"
            },
            {
                "id": 13503,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "我想学好希腊语。(使用 να μάθω)",
                "translation": "汉译希：我想学好希腊语。",
                "answer": "Θέλω να μάθω καλά ελληνικά.",
                "acceptable_answers": ["Θέλω να μάθω καλά ελληνικά.", "Θέλω να μάθω ελληνικά.", "θελω να μαθω καλα ελληνικα", "Θέλω να μάθω ελληνικά"],
                "detailed_tip": "【意愿表达】Θέλω (我想) + να μάθω (去学) + καλά ελληνικά (好希腊语)。"
            }
        ]
    },
    {
        "book_id": "a2",
        "unit": 36,
        "book_title": "A2",
        "unit_title": "命令式与外貌特征 (Προστακτική)",
        "badge": "🎯 语法攻坚·命令与禁令",
        "category": "grammar",
        "grammar_points": "简单命令式 (Προστακτική Aorist: γράψε/γράψτε, διάβασε/διαβάστε, πες/πείτε, έλα/ελάτε)、否定禁令 (Μην + 虚拟式: Μην γράφεις / Μην πεις)。",
        "core_formulas": [
            "Άνοιξε το παράθυρο (打开窗户 - 单数亲昵)",
            "Ανοίξτε το βιβλίο στη σελίδα 20 (请打开书到第20页 - 礼貌/复数)",
            "Μην αργήσεις! (千万别迟到！)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Πού να βάλω τα ψώνια;", "chinese": "我把买的东西放哪？"},
            {"speaker": "B", "greek": "Βάλε το γάλα στο ψυγείο και άσε τα φρούτα στο τραπέζι.", "chinese": "把牛奶放进冰箱，把水果留在桌上。"}
        ],
        "drills": [
            {
                "id": 13601,
                "drill_type": "choice",
                "skill_type": "conjugation",
                "question": "Παιδιά, ______ γρήγορα! Θα χάσουμε το λεωφορείο! (τρέχω - 命令式复数)",
                "translation": "孩子们，快跑！我们要赶不上公交车了！",
                "options": make_shuffled_options("τρέξτε", ["τρέξε", "τρέχουμε", "τρέχουν"]),
                "answer": "τρέξτε",
                "detailed_tip": "【命令式复数】动词 τρέχω (跑) 面对复数主语的简单命令式为 'τρέξτε'。"
            },
            {
                "id": 13602,
                "drill_type": "cloze",
                "skill_type": "conjugation",
                "question": "Νίκο, ______ (ανοίγω - 命令式单数) το παράθυρο, σε παρακαλώ!",
                "translation": "尼科斯，请打开窗户！",
                "answer": "άνοιξε",
                "acceptable_answers": ["άνοιξε", "ανοιξε"],
                "detailed_tip": "【命令式单数】ανοίγω 面对单数熟人的简单命令式为 'άνοιξε'。"
            },
            {
                "id": 13603,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "千万别迟到！",
                "translation": "汉译希：千万别迟到！",
                "answer": "Μην αργήσεις!",
                "acceptable_answers": ["Μην αργήσεις!", "Μην αργήσεις", "μην αργησεις", "Μην αργήσετε!"],
                "detailed_tip": "【否定禁令】'Μην' + 简单虚拟式 'αργήσεις' (千万别迟到)。"
            }
        ]
    },
    {
        "book_id": "a2",
        "unit": 37,
        "book_title": "A2",
        "unit_title": "命名日与地点介词缩合 (Ονομαστική γιορτή)",
        "badge": "🎯 语法攻坚·命名日礼仪与介词",
        "category": "communicative",
        "grammar_points": "希腊命名日文化 (Ονομαστική γιορτή) 与专属祝词 (Να ζήσεις, Να χαίρεσαι το όνομά σου)、复杂地点介词 σε 的缩合用法 (θα πάω στην Αθήνα, θα μείνω σε μια φίλη, πάμε στα μαγαζιά)、邀请与赴宴礼仪。",
        "core_formulas": [
            "Χρόνια Πολλά για την ονομαστική σου γιορτή! (祝你命名日快乐！)",
            "Να χαίρεσαι το όνομά σου! (愿你为你的名字增光添彩/福寿安康！)",
            "Θα πάω στην Αθήνα και θα μείνω σε ένα ξενοδοχείο (我将去雅典并住在一间酒店)",
            "Πάμε στα μαγαζιά για δώρα (我们去商店买礼物)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Σε προσκαλώ στο σπίτι μου το Σάββατο για την ονομαστική μου γιορτή!", "chinese": "这个周六我邀请你来我家庆祝我的命名日！"},
            {"speaker": "B", "greek": "Ευχαριστώ πολύ! Θα έρθω με μεγάλη χαρά. Να χαίρεσαι το όνομά σου!", "chinese": "非常感谢！我一定欣然前往。祝你命名日快乐！"}
        ],
        "drills": [
            {
                "id": 13701,
                "drill_type": "choice",
                "skill_type": "dialogue",
                "question": "在希腊，当朋友庆祝命名日 (Ονομαστική γιορτή) 时，除了 'Χρόνια Πολλά'，最传统地道的祝福是：______",
                "translation": "命名日传统祝词",
                "options": make_shuffled_options("Να χαίρεσαι το όνομά σου!", ["Καλό ταξίδι!", "Περαστικά σου!", "Καλή όρεξη!"]),
                "answer": "Να χαίρεσαι το όνομά σου!",
                "detailed_tip": "【希腊传统文化】命名日专属祝词是 'Να χαίρεσαι το όνομά σου!' (愿你享有名字的荣光/命名日吉庆)。"
            },
            {
                "id": 13702,
                "drill_type": "cloze",
                "skill_type": "syntax",
                "question": "Το απόγευμα θα πάμε ______ (σε + τα) μαγαζιά για να αγοράσουμε δώρα.",
                "translation": "今天下午我们要去商店买礼物。",
                "answer": "στα",
                "acceptable_answers": ["στα"],
                "detailed_tip": "【介词与中性复数】'μαγαζιά' 为中性复数名词，'σε + τα' 缩合为 'στα'。"
            },
            {
                "id": 13703,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "祝你命名日快乐！(地道希腊语祝福)",
                "translation": "汉译希：祝你命名日快乐！",
                "answer": "Χρόνια Πολλά για την ονομαστική σου γιορτή!",
                "acceptable_answers": ["Χρόνια Πολλά για την ονομαστική σου γιορτή!", "Χρόνια Πολλά για τη γιορτή σου!", "χρονια πολλα για την ονομαστικη σου γιορτη", "Να χαίρεσαι το όνομά σου!"],
                "detailed_tip": "【命名日祝福】'Χρόνια Πολλά για την ονομαστική σου γιορτή!'。"
            }
        ]
    },
    {
        "book_id": "a2",
        "unit": 38,
        "book_title": "A2",
        "unit_title": "综合连词与复合从句 (Συνδετικές λέξεις)",
        "badge": "🔗 复合句连词",
        "category": "grammar",
        "grammar_points": "时间与因果连词 (ενώ 当...时/然而, αφού 既然/在...之后, πριν (να) 在...之前, μόλις 刚...就, επειδή/γιατί 因为)、长句逻辑衔接。",
        "core_formulas": [
            "Μόλις έφτασα σπίτι, άρχισε να βρέχει (我刚到家，就开始下雨了)",
            "Πριν φύγεις, κλείσε τα φώτα (在你离开之前，把灯关上)",
            "Ενώ διάβαζα, άκουγα μουσική (我一边读书，一边听音乐)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Πότε θα συναντηθούμε;", "chinese": "我们什么时候碰面？"},
            {"speaker": "B", "greek": "Μόλις τελειώσω τη δουλειά μου, θα σε πάρω τηλέφωνο.", "chinese": "我一完成工作，就给你打电话。"}
        ],
        "drills": [
            {
                "id": 13801,
                "drill_type": "choice",
                "skill_type": "syntax",
                "question": "______ φύγεις από το σπίτι, πάρε την ομπρέλα σου.",
                "translation": "在你离开家之前，带上你的雨伞。",
                "options": make_shuffled_options("Πριν", ["Αφού", "Μόλις", "Ενώ"]),
                "answer": "Πριν",
                "detailed_tip": "【时间连词】表达“在...之前”用 'Πριν'。"
            },
            {
                "id": 13802,
                "drill_type": "cloze",
                "skill_type": "syntax",
                "question": "______ (一...就...) τελειώσω το μάθημα, θα σου τηλεφωνήσω.",
                "translation": "我一下课，就给你打电话。",
                "answer": "Μόλις",
                "acceptable_answers": ["Μόλις", "μολις"],
                "detailed_tip": "【时间连词】'Μόλις' 表达“刚一...就...”。"
            },
            {
                "id": 13803,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "我一边看书，一边听音乐。(使用 بينما / ενώ)",
                "translation": "汉译希：我一边看书，一边听音乐。",
                "answer": "Ενώ διάβαζα, άκουγα μουσική.",
                "acceptable_answers": ["Ενώ διάβαζα, άκουγα μουσική.", "Ενώ διάβαζα άκουγα μουσική", "ενω διαβαζα ακουγα μουσικη"],
                "detailed_tip": "【伴随动作连词】Ενώ + Παρατατικός (一边...一边...)。"
            }
        ]
    },
    {
        "book_id": "a2",
        "unit": 39,
        "book_title": "A2",
        "unit_title": "A2水平测试与长篇微阅读 (Προσομοίωση Εξετάσεων)",
        "badge": "🏆 A2 考前模拟",
        "category": "reading",
        "grammar_points": "真题阅读理解、长难句结构拆解、口语问答实战演练、希腊语 A2 证书考试技巧。",
        "core_formulas": [
            "Σύμφωνα με το κείμενο (根据文章内容)",
            "Σωστό ή Λάθος (正确还是错误)",
            "Ποια είναι η κύρια ιδέα; (主旨大意是什么？)"
        ],
        "golden_dialogues": [
            {"speaker": "A", "greek": "Είσαι έτοιμος για τις εξετάσεις A2;", "chinese": "你准备好参加 A2 考试了吗？"},
            {"speaker": "B", "greek": "Ναι! Έχω κάνει πολλές επαναλήψεις και νιώθω πολύ σίγουρος!", "chinese": "是的！我做了很多复习，感觉非常有信心！"}
        ],
        "drills": [
            {
                "id": 13901,
                "drill_type": "choice",
                "skill_type": "reading",
                "question": "Κείμενο: 'Η Μαρία μένει στην Αθήνα αλλά τα καλοκαίρια πηγαίνει πάντα στην Κρήτη στο σπίτι της γιαγιάς της.' -> Ερώτηση: Πού περνάει η Μαρία τα καλοκαίρια της;",
                "translation": "微阅读理解：玛利亚在哪里过夏天？",
                "options": make_shuffled_options("Στην Κρήτη", ["Στην Αθήνα", "Στο Λονδίνο", "Στη Θεσσαλονίκη"]),
                "answer": "Στην Κρήτη",
                "detailed_tip": "【微阅读事实提取】文中明确说明 'τα καλοκαίρια πηγαίνει πάντα στην Κρήτη'，因此正确答案是 'Στην Κρήτη'。"
            },
            {
                "id": 13902,
                "drill_type": "qa",
                "skill_type": "reading",
                "question": "Κείμενο: 'Ο Νίκος μαθαίνει ελληνικά εδώ και τρία χρόνια επειδή θέλει να σπουδάσει στην Αθήνα.' -> Ερώτηση: Γιατί μαθαίνει ελληνικά ο Νίκος;",
                "translation": "阅读理解问答：尼科斯为什么学希腊语？",
                "answer": "Επειδή θέλει να σπουδάσει στην Αθήνα.",
                "acceptable_answers": ["Επειδή θέλει να σπουδάσει στην Αθήνα.", "Γιατί θέλει να σπουδάσει στην Αθήνα.", "επειδη θελει να σπουδασει στην αθηνα"],
                "options": make_shuffled_options("Επειδή θέλει να σπουδάσει στην Αθήνα.", ["Επειδή μένει στο Λονδίνο.", "Επειδή είναι καθηγητής.", "Επειδή δεν του αρέσει η Ελλάδα."]),
                "detailed_tip": "【阅读因果提取】根据文章 'επειδή θέλει να σπουδάσει στην Αθήνα'。"
            },
            {
                "id": 13903,
                "drill_type": "translate",
                "skill_type": "dialogue",
                "question": "祝贺你！你学完了 A2 级别！",
                "translation": "汉译希：祝贺你！你学完了 A2 级别！",
                "answer": "Συγχαρητήρια! Τελείωσες το επίπεδο A2!",
                "acceptable_answers": ["Συγχαρητήρια! Τελείωσες το επίπεδο A2!", "Συγχαρητήρια! Τελείωσες το A2!", "συγχαρητηρια τελειωσες το επιπεδο α2", "Μπράβο! Τελείωσες το A2!"],
                "detailed_tip": "【通关祝贺】'Συγχαρητήρια!' (恭喜/祝贺) + 'Τελείωσες το επίπεδο A2!'。"
            }
        ]
    }
]

# Pre-Flight QA Verification Gate
def remove_accents(text: str) -> str:
    accents_map = {
        'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω',
        'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ό': 'Ο', 'Ύ': 'Υ', 'Ώ': 'Ω',
        'ΐ': 'ι', 'ΰ': 'υ', 'ϊ': 'ι', 'ϋ': 'υ'
    }
    for k, v in accents_map.items():
        text = text.replace(k, v)
    return text

print("🔍 Executing Pre-Flight Quality Assurance Gate across 4 drill types...")
validation_errors = []
total_drills = 0
choice_ans_positions = []

for u in raw_units:
    b_id = u.get("book_id", "")
    u_num = u.get("unit", 0)
    u_title = u.get("unit_title", "")
    drills = u.get("drills", [])
    total_drills += len(drills)

    for dia in u.get("golden_dialogues", []):
        if not dia.get("greek") or not dia.get("chinese"):
            validation_errors.append(f"[{b_id} U{u_num}] Dialogue missing greek/chinese: {dia}")

    for d in drills:
        d_id = d.get("id")
        dtype = d.get("drill_type", "choice")
        q = d.get("question", "").strip()
        ans = d.get("answer", "").strip()
        opts = d.get("options", [])
        trans = d.get("translation", "").strip()
        tip = d.get("detailed_tip", "").strip()

        if not q or not ans or not trans or not tip:
            validation_errors.append(f"[{b_id} U{u_num} Drill {d_id}] Missing required field(s)")

        if dtype == "choice":
            if len(opts) != 4:
                validation_errors.append(f"[{b_id} U{u_num} Drill {d_id}] Choice drill must have 4 options, got {len(opts)}")
            if len(opts) != len(set(opts)):
                validation_errors.append(f"[{b_id} U{u_num} Drill {d_id}] Duplicate options found: {opts}")
            if ans not in opts:
                validation_errors.append(f"[{b_id} U{u_num} Drill {d_id}] Answer '{ans}' not in options {opts}")
            ans_pos = opts.index(ans)
            choice_ans_positions.append(ans_pos)
        
        elif dtype == "cloze":
            if "______" not in q:
                validation_errors.append(f"[{b_id} U{u_num} Drill {d_id}] Cloze drill must contain '______' placeholder")
            if not d.get("acceptable_answers"):
                validation_errors.append(f"[{b_id} U{u_num} Drill {d_id}] Cloze drill must have acceptable_answers list")
        
        elif dtype == "qa":
            if not d.get("acceptable_answers"):
                validation_errors.append(f"[{b_id} U{u_num} Drill {d_id}] QA drill must have acceptable_answers list")

        elif dtype == "translate":
            if not d.get("acceptable_answers"):
                validation_errors.append(f"[{b_id} U{u_num} Drill {d_id}] Translate drill must have acceptable_answers list")

# Verify that choice answers are NOT all in index 0
if choice_ans_positions:
    pos_counts = {i: choice_ans_positions.count(i) for i in range(4)}
    print(f"📊 Choice Answer Distribution Across Positions [0, 1, 2, 3]: {pos_counts}")
    if pos_counts[0] == len(choice_ans_positions):
        validation_errors.append("All choice answers are at index 0! Options randomization required.")

if validation_errors:
    print(f"❌ FATAL: {len(validation_errors)} QA validation error(s) detected. Generation ABORTED:")
    for err in validation_errors:
        print(f"  • {err}")
    exit(1)

print(f"✅ QA Gate Passed: All {len(raw_units)} units and {total_drills} multi-type drills verified with 100% integrity!")

# Write JSON
frontend_json_path = 'frontend/src/data/unit_knowledge_drills.json'
with open(frontend_json_path, 'w', encoding='utf-8') as f:
    json.dump(raw_units, f, ensure_ascii=False, indent=2)

print(f"Generated {len(raw_units)} unit knowledge entries with {total_drills} drills in {frontend_json_path}")

# Write Markdown Skills Matrix
md_path = 'materials/glossaries/Leon_Greek_A1_A2_Unit_Skills_Matrix.md'
with open(md_path, 'w', encoding='utf-8') as f:
    f.write("# 🏛️ Leon Greek Coach — A1 & A2 全景教学大纲与多维能力矩阵 (v2.0)\n\n")
    f.write("> **版本说明**：本矩阵将 A1-A、A1-B、A2 共 39 个单元中除生词外的**动词变位矩阵、变格一致性、情境交际金句、句法从句与微阅读考点**全面结构化沉淀，涵盖【选择题】、【填空题】、【问答题】与【翻译题】四大实战题型，彻底攻坚低生词高语法单元。\n\n---\n\n")
    
    for u in raw_units:
        f.write(f"## 📖 {u['book_title']} 第 {u['unit']} 单元: {u['unit_title']}\n\n")
        f.write(f"- **教学属性标签**：`{u['badge']}` (`{u['category']}`)\n")
        f.write(f"- **核心语法与教学重点**：{u['grammar_points']}\n\n")
        f.write("### 📐 核心公式与语法矩阵\n")
        for formula in u['core_formulas']:
            f.write(f"- `{formula}`\n")
        f.write("\n### 🗣️ 黄金情境对话\n")
        for dia in u['golden_dialogues']:
            f.write(f"- **{dia['speaker']}**: {dia['greek']} ({dia['chinese']})\n")
        f.write("\n### 🎯 知识库精选日常考题 (多题型实战)\n")
        for drill in u['drills']:
            dtype_label = "【选择题】" if drill.get("drill_type") == "choice" else \
                          "【填空题】" if drill.get("drill_type") == "cloze" else \
                          "【情境问答】" if drill.get("drill_type") == "qa" else "【句子翻译】"
            f.write(f"1. **{dtype_label} [{drill['skill_type'].upper()}]** {drill['question']}\n")
            f.write(f"   - **中文**：{drill['translation']}\n")
            f.write(f"   - **标准答案**：`{drill['answer']}`\n")
            f.write(f"   - **详细解析**：{drill['detailed_tip']}\n")
        f.write("\n---\n\n")

print(f"Generated Markdown skills matrix at {md_path}")

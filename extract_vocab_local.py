import os
import re
import json
import fitz  # PyMuPDF

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
GLOSSARY_PATH = os.path.join(PROJECT_DIR, "materials", "Glossary_A1_kids.pdf")
OUTPUT_DIR = os.path.join(PROJECT_DIR, "frontend", "src", "data")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "vocabulary.json")

def parse_glossary():
    if not os.path.exists(GLOSSARY_PATH):
        print(f"Error: Glossary PDF not found at {GLOSSARY_PATH}")
        return []

    print(f"Parsing Glossary_A1_kids.pdf from {GLOSSARY_PATH}...")
    doc = fitz.open(GLOSSARY_PATH)
    
    # Regex to match Greek word, optional article/suffix, and English meaning
    # e.g., "αβγό, το = egg" -> group 1: "αβγό", group 2: "το", group 3: "egg"
    pattern = re.compile(r"^([^,=\n]+)(?:,\s*([^=\n]+))?\s*=\s*(.+)$")
    
    vocab_list = []
    word_id = 1
    
    for page in doc:
        text = page.get_text()
        for line in text.split("\n"):
            line = line.strip()
            if not line or "=" not in line:
                continue
                
            match = pattern.match(line)
            if match:
                greek = match.group(1).strip()
                article = match.group(2).strip() if match.group(2) else ""
                english = match.group(3).strip()
                
                vocab_list.append({
                    "id": word_id,
                    "word_greek": greek + (f", {article}" if article else ""),
                    "word_english": english,
                    "word_chinese": "",  # Will be translated/seized later
                    "pronunciation": "",
                    "example_greek": "",
                    "example_chinese": ""
                })
                word_id += 1
                
    return vocab_list

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Parse master glossary
    master_vocab = parse_glossary()
    print(f"Successfully extracted {len(master_vocab)} master vocabulary terms.")

    # Seeding high-quality mock data for pages 1-5 of A1-A (for instant child trial)
    mock_data = [
        # Page 1: Greetings & Basics
        {"id": 10001, "book_id": "a1-a", "unit": 1, "page_number": 1, "word_greek": "Γεια σας", "word_chinese": "你好 / 你们好", "pronunciation": "ya sas", "example_greek": "Γεια σας! Με λένε Γιώργο.", "example_chinese": "你们好！我叫乔治。"},
        {"id": 10002, "book_id": "a1-a", "unit": 1, "page_number": 1, "word_greek": "Καλημέρα", "word_chinese": "早上好 / 日安", "pronunciation": "ka-li-me-ra", "example_greek": "Καλημέρα, Μαρία!", "example_chinese": "早上好，玛丽亚！"},
        {"id": 10003, "book_id": "a1-a", "unit": 1, "page_number": 1, "word_greek": "Τι κάνεις;", "word_chinese": "你好吗？ / 你在做什么？", "pronunciation": "ti ka-nis", "example_greek": "Γεια σου Λεωνίδα, τι κάνεις;", "example_chinese": "你好列奥尼达，你好吗？"},
        {"id": 10004, "book_id": "a1-a", "unit": 1, "page_number": 1, "word_greek": "Καλά", "word_chinese": "好 / 很好", "pronunciation": "ka-la", "example_greek": "Είμαι πολύ καλά, ευχαριστώ.", "example_chinese": "我很好，谢谢。"},
        {"id": 10005, "book_id": "a1-a", "unit": 1, "page_number": 1, "word_greek": "Ευχαριστώ", "word_chinese": "谢谢", "pronunciation": "ef-ha-ri-sto", "example_greek": "Ευχαριστώ πολύ για τη βοήθεια.", "example_chinese": "非常感谢你的帮助。"},

        # Page 2: People & Classroom Roles
        {"id": 10006, "book_id": "a1-a", "unit": 1, "page_number": 2, "word_greek": "αγόρι", "word_chinese": "男孩", "pronunciation": "a-go-ri", "example_greek": "Αυτό το αγόρι είναι ο Λεωνίδας.", "example_chinese": "这个男孩是列奥尼达。"},
        {"id": 10007, "book_id": "a1-a", "unit": 1, "page_number": 2, "word_greek": "κορίτσι", "word_chinese": "女孩", "pronunciation": "ko-ri-tsi", "example_greek": "Ένα μικρό κορίτσι παίζει στην αυλή.", "example_chinese": "一个女孩在院子里玩耍。"},
        {"id": 10008, "book_id": "a1-a", "unit": 1, "page_number": 2, "word_greek": "μαθητής", "word_chinese": "学生 (男)", "pronunciation": "ma-thi-tis", "example_greek": "Ο Λεωνίδας είναι μαθητής στο σχολείο.", "example_chinese": "列奥尼达是学校的学生。"},
        {"id": 10009, "book_id": "a1-a", "unit": 1, "page_number": 2, "word_greek": "δάσκαλος", "word_chinese": "老师 (男)", "pronunciation": "da-ska-los", "example_greek": "Ο δάσκαλος είναι στην τάξη.", "example_chinese": "老师在教室里。"},
        {"id": 10010, "book_id": "a1-a", "unit": 1, "page_number": 2, "word_greek": "σχολείο", "word_chinese": "学校", "pronunciation": "sho-li-o", "example_greek": "Μου αρέσει πολύ το σχολείο μου.", "example_chinese": "我很喜欢我的学校。"},

        # Page 3: School Supplies
        {"id": 10011, "book_id": "a1-a", "unit": 1, "page_number": 3, "word_greek": "βιβλίο", "word_chinese": "书", "pronunciation": "vi-vli-o", "example_greek": "Αυτό είναι το βιβλίο των ελληνικών.", "example_chinese": "这是希腊语书。"},
        {"id": 10012, "book_id": "a1-a", "unit": 1, "page_number": 3, "word_greek": "τετράδιο", "word_chinese": "笔记本", "pronunciation": "te-tra-di-o", "example_greek": "Γράφω στο κόκκινο τετράδιο.", "example_chinese": "我写在红色的笔记本上。"},
        {"id": 10013, "book_id": "a1-a", "unit": 1, "page_number": 3, "word_greek": "μολύβι", "word_chinese": "铅笔", "pronunciation": "mo-li-vi", "example_greek": "Έχεις ένα μολύβι;", "example_chinese": "你有一支铅笔吗？"},
        {"id": 10014, "book_id": "a1-a", "unit": 1, "page_number": 3, "word_greek": "στυλό", "word_chinese": "钢笔 / 圆珠笔", "pronunciation": "sti-lo", "example_greek": "Το στυλό μου είναι μπλε.", "example_chinese": "我的笔是蓝色的。"},
        {"id": 10015, "book_id": "a1-a", "unit": 1, "page_number": 3, "word_greek": "τσάντα", "word_chinese": "书包 / 包", "pronunciation": "tsa-nta", "example_greek": "Η τσάντα μου είναι βαριά.", "example_chinese": "我的书包很重。"},

        # Page 4: Numbers
        {"id": 10016, "book_id": "a1-a", "unit": 1, "page_number": 4, "word_greek": "ένα", "word_chinese": "一", "pronunciation": "e-na", "example_greek": "Έχω ένα μολύβι.", "example_chinese": "我有一支铅笔。"},
        {"id": 10017, "book_id": "a1-a", "unit": 1, "page_number": 4, "word_greek": "δύο", "word_chinese": "二", "pronunciation": "di-o", "example_greek": "Έχω δύο τετράδια.", "example_chinese": "我有两本笔记本。"},
        {"id": 10018, "book_id": "a1-a", "unit": 1, "page_number": 4, "word_greek": "τρία", "word_chinese": "三", "pronunciation": "tri-a", "example_greek": "Υπάρχουν τρία βιβλία στο τραπέζι.", "example_chinese": "桌上有三本书。"},
        {"id": 10019, "book_id": "a1-a", "unit": 1, "page_number": 4, "word_greek": "τέσσερα", "word_chinese": "四", "pronunciation": "te-se-ra", "example_greek": "Βλέπω τέσσερα αγόρια.", "example_chinese": "我看到四个男孩。"},
        {"id": 10020, "book_id": "a1-a", "unit": 1, "page_number": 4, "word_greek": "πέντε", "word_chinese": "五", "pronunciation": "pe-nde", "example_greek": "Έχω πέντε ευρώ.", "example_chinese": "我有五欧元。"},

        # Page 5: Animals & Home
        {"id": 10021, "book_id": "a1-a", "unit": 1, "page_number": 5, "word_greek": "γάτα", "word_chinese": "猫", "pronunciation": "ga-ta", "example_greek": "Η γάτα κοιμάται στον καναπέ.", "example_chinese": "猫在沙发上睡觉。"},
        {"id": 10022, "book_id": "a1-a", "unit": 1, "page_number": 5, "word_greek": "σκύλος", "word_chinese": "狗", "pronunciation": "ski-los", "example_greek": "Ο σκύλος μου γαβγίζει.", "example_chinese": "我的狗在叫。"},
        {"id": 10023, "book_id": "a1-a", "unit": 1, "page_number": 5, "word_greek": "σπίτι", "word_chinese": "家 / 房子", "pronunciation": "spi-ti", "example_greek": "Πηγαίνω στο σπίτι μου.", "example_chinese": "我回我的家。"},
        {"id": 10024, "book_id": "a1-a", "unit": 1, "page_number": 5, "word_greek": "οικογένεια", "word_chinese": "家庭 / 家人", "pronunciation": "i-ko-ye-ni-a", "example_greek": "Αγαπώ την οικογένειά μου.", "example_chinese": "我爱我的家庭。"},
        {"id": 10025, "book_id": "a1-a", "unit": 1, "page_number": 5, "word_greek": "μαμά", "word_chinese": "妈妈", "pronunciation": "ma-ma", "example_greek": "Η μαμά μου μαγειρεύει.", "example_chinese": "我的妈妈在做饭。"},
        {"id": 10026, "book_id": "a1-a", "unit": 1, "page_number": 5, "word_greek": "μπαμπάς", "word_chinese": "爸爸", "pronunciation": "ba-mbas", "example_greek": "Ο μπαμπάς μου παίζει ποδόσφαιρο.", "example_chinese": "我的爸爸在踢足球。"}
    ]
    
    output_data = {
        "master_glossary": master_vocab,
        "textbook_vocabulary": mock_data
    }
    
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully generated static JSON file at {OUTPUT_PATH}")

if __name__ == "__main__":
    main()

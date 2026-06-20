import os
import re
import json

# Paths
txt_dir = "scratch/extracted_txt"
vocab_json_path = "frontend/src/data/vocabulary.json"

# Load existing vocabulary
with open(vocab_json_path, "r", encoding="utf-8") as f:
    data = json.load(f)
    vocab_list = data.get("textbook_vocabulary", [])

print(f"Loaded {len(vocab_list)} existing vocabulary items.")

def clean_greek(text):
    text = text.lower()
    replacements = {
        'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω',
        'ϊ': 'ι', 'ϋ': 'υ', 'ΐ': 'ι', 'ΰ': 'υ',
        'ὰ': 'α', 'ὲ': 'ε', 'ὴ': 'η', 'ὶ': 'ι', 'ὸ': 'ο', 'ὺ': 'υ', 'ὼ': 'ω',
        'ἀ': 'α', 'ἐ': 'ε', 'ἠ': 'η', 'ἰ': 'ι', 'ὀ': 'ο', 'ὐ': 'υ', 'ὠ': 'ω',
        'ᾶ': 'α', 'ῆ': 'η', 'ῖ': 'ι', 'ῦ': 'υ', 'ῶ': 'ω'
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    cleaned = ""
    for char in text:
        if char.isalpha() or char.isspace():
            cleaned += char
    return cleaned.strip()

# We want to extract sentence exercises from the txt files and add/override examples in vocab_list
# Let's inspect typical questions in A1 and A2 files
# In A1:
# "Ο Νίκος είναι μέσα στην τάξη." -> "Nikos is in the classroom." -> "尼科斯在教室里。"
# "Ο Ανέστης είναι στην αυλή του σχολείου." -> "Anestis is in the schoolyard." -> "阿内斯蒂斯在学校院子里。"
# "Γεια σας, κυρία!" -> "Hello, madam!" -> "您好，女士！"
# "Είμαι η κυρία Γιάννα." -> "I am Mrs. Gianna." -> "我是扬娜女士。"
# "Από πού είσαι;" -> "Where are you from?" -> "你来自哪里？"
# "Είμαι από την Αλβανία." -> "I am from Albania." -> "我来自阿尔巴尼亚。"
# "Η Λίτσα μένει στην Καβάλα" -> "Litsa lives in Kavala." -> "利察住在卡瓦拉。"
# "Το επώνυμο της Χαράς είναι Ανδρεάδη." -> "Hara's surname is Andreadi." -> "哈拉的姓是安德里亚迪。"
# "Ο Γιώργος Αρβανιτίδης είναι 7 χρονών." -> "Giorgos Arvanitidis is 7 years old." -> "乔治·阿尔瓦尼蒂迪斯7岁了。"
# "Πού μένει ο Βαγγέλης;" -> "Where does Vangelis live?" -> "瓦杰利斯住在哪里？"

# In A2:
# "ΕΓΩ ΚΑΙ ΟΙ ΑΛΛΟΙ" -> "I and others" -> "我与他人"
# "Περιγράφεις τον Γεράσιμο." -> "Describe Gerasimos." -> "描述杰拉西莫斯。"
# "Περιγράφεις τον εαυτό σου." -> "Describe yourself." -> "描述你自己。"
# "Πού σου αρέσει να ζεις στην πόλη ή στο χωριό. Γιατί;" -> "Where do you like to live, in the city or in the village? Why?" -> "你喜欢住在城市还是农村？为什么？"

# Let's construct a map of typical sentences extracted from these PDFs to enrich our vocabulary database with real certification sentences.
# We will match key vocabulary words (e.g. τάξη, αυλή, μένω, επώνυμο, χωριό, πόλη) and set these as their "example_greek" and "example_chinese"!
certification_examples = {
    "τάξη": ("Ο Νίκος είναι μέσα στην τάξη.", "尼科斯在教室里。"),
    "αυλή": ("Ο Ανέστης είναι στην αυλή του σχολείου.", "阿内斯蒂斯在学校院子里。"),
    "κυρία": ("Γεια σας, κυρία! Είμαι η κυρία Γιάννα.", "您好，女士！我是扬娜女士。"),
    "πού": ("Από πού είσαι; Είμαι από την Αλβανία.", "你来自哪里？我来自阿尔巴尼亚。"),
    "μένω": ("Η Λίτσα μένει στην Καβάλα.", "利察住在卡瓦拉。"),
    "επώνυμο": ("Το επώνυμο της Χαράς είναι Ανδρεάδη.", "哈拉的姓是安德里亚迪。"),
    "χρονών": ("Ο Γιώργος Αρβανιτίδης είναι 7 χρονών.", "乔治·阿尔瓦尼蒂迪斯7岁了。"),
    "πόλη": ("Πού σου αρέσει να ζεις, στην πόλη ή στο χωριό;", "你喜欢住在城市还是农村？"),
    "χωριό": ("Πού σου αρέσει να ζεις, στην πόλη ή στο χωριό; Γιατί;", "你喜欢住在城市还是农村？为什么？"),
    "εαυτός": ("Περιγράφεις τον εαυτό σου και ένα φίλο σου.", "描述你自己和你的一个朋友。"),
    "εμφάνιση": ("Πώς είναι η εξωτερική τους εμφάνιση;", "他们的外表是怎样的？"),
    "ρούχα": ("Τι ρούχα φορούν και ποια χρώματα έχουν;", "他们穿什么衣服，什么颜色？"),
    "δουλειά": ("Τι δουλειά κάνουν και πού μένουν;", "他们做什么工作，住在哪里？"),
    "ηλικία": ("Γράφεις το όνομα, την ηλικία και την εθνικότητα.", "写下姓名、年龄和国籍。"),
    "γλώσσα": ("Ποιες γλώσσες μιλάς στο σπίτι σου;", "你在家里说哪些语言？")
}

# Update examples for existing words
updated_count = 0
for word in vocab_list:
    greek_cleaned = clean_greek(word["word_greek"])
    for keyword, (ex_gr, ex_zh) in certification_examples.items():
        if keyword in greek_cleaned:
            word["example_greek"] = ex_gr
            word["example_chinese"] = ex_zh
            updated_count += 1
            break

print(f"Updated {updated_count} vocabulary examples with certification-grade sentences.")

# Let's save the updated vocabulary to JSON
with open(vocab_json_path, "w", encoding="utf-8") as f:
    json.dump({
        "master_glossary": [],
        "textbook_vocabulary": vocab_list
    }, f, ensure_ascii=False, indent=2)

print("Saved updated vocabulary.json.")

# Sync back to SQLite DB
import sqlite3
db_path = "backend/greek_coach.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# We update only example sentences to prevent losing learning logs or other data
for w in vocab_list:
    cursor.execute("""
        UPDATE vocabulary 
        SET example_greek = ?, example_chinese = ?
        WHERE id = ?
    """, (w["example_greek"], w["example_chinese"], w["id"]))

conn.commit()
conn.close()
print("Synchronized updated examples with SQLite database.")

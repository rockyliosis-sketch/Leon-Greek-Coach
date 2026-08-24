import sqlite3
import os
import re

DB_PATH = "backend/greek_coach.db"

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
    # Remove non-alphabetic chars
    cleaned = "".join(res)
    cleaned = re.sub(r'[^a-z]', '', cleaned)
    return cleaned

def clean_word(w):
    return w.strip()

notes_7_3 = [
    ("ληξιαρχείο", "注册处 / 民事登记处"),
    ("πυροσβεστική", "消防队 / 消防局"),
    ("κλέβω", "偷 / 盗窃"),
    ("τροχαία", "交警 / 交通警察"),
    ("ατύχημα", "事故 / 车祸"),
    ("πρώτες βοήθειες", "急救 / 第一时间救援"),
    ("φωτιά", "火灾 / 火"),
    ("ανάληψη", "取款 / 提款"),
    ("κλέφτης", "小偷 / 窃贼"),
    ("κατάθεση", "存款 / 存钱")
]

notes_7_6 = [
    ("δέμα", "包裹"),
    ("γραμματόσημο", "邮票"),
    ("γραμματοκιβώτιο", "邮箱 / 信箱"),
    ("έγγραφο", "文件 / 公文"),
    ("σκίτσο", "速写 / 素描"),
    ("εφορία", "税务局"),
    ("μάρτυρας", "证人 / 目击者"),
    ("πιστοποιητικό γέννησης", "出生证明"),
    ("απαραίτητος", "必要的 / 必需的"),
    ("βεβαιώνω", "证明 / 确认"),
    ("αίτηση", "申请 / 申请书")
]

def insert_note_words(conn, words, date_str):
    cursor = conn.cursor()
    for greek, chinese in words:
        greek = clean_word(greek)
        chinese = clean_word(chinese)
        
        # Check if the word exists
        cursor.execute("SELECT id FROM vocabulary WHERE word_greek = ?", (greek,))
        row = cursor.fetchone()
        
        if row:
            # Update existing note_date
            vid = row[0]
            cursor.execute("UPDATE vocabulary SET note_date = ? WHERE id = ?", (date_str, vid))
            print(f"Updated note_date for existing word: {greek} -> {date_str}")
        else:
            # Insert new custom vocabulary row
            pron = get_pron(greek)
            ex_greek = f"Αυτό είναι {greek}."
            ex_chinese = f"这是 {chinese}。"
            
            # For new words, we assign them to book 'a2' and unit '35'
            cursor.execute("""
                INSERT INTO vocabulary (book_id, unit, page_number, word_greek, word_chinese, pronunciation, example_greek, example_chinese, error_count, difficulty_score, note_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, ("a2", 35, 0, greek, chinese, pron, ex_greek, ex_chinese, 0, 1.0, date_str))
            print(f"Inserted new vocabulary row: {greek} ({chinese}) -> {date_str}")

def main():
    print(f"Connecting to database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    
    print("\n--- Processing July 3 Notes ---")
    insert_note_words(conn, notes_7_3, "2026-07-03")
    
    print("\n--- Processing July 6 Notes ---")
    insert_note_words(conn, notes_7_6, "2026-07-06")
    
    conn.commit()
    conn.close()
    print("\nDatabase transaction committed successfully!")

if __name__ == "__main__":
    main()

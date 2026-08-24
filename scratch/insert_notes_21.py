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
    cleaned = "".join(res)
    cleaned = re.sub(r'[^a-z]', '', cleaned)
    return cleaned

def clean_word(w):
    return w.strip()

notes_7_21 = [
    ("βαμβάκι", "棉花 / 棉球"),
    ("οινόπνευμα", "酒精"),
    ("μιας χρήσης", "一次性"),
    ("κίνδυνος", "危险"),
    ("επικίνδυνος", "危险的"),
    ("ασφάλεια", "安全"),
    ("χώρος", "空间 / 地方"),
    ("κρύβω", "隐藏 / 藏"),
    ("αποκτώ", "获得 / 取得"),
    ("πληγή", "伤口"),
    ("τραύμα", "创伤 / 伤口"),
    ("ηλεκτρική πρίζα", "电源插座"),
    ("καλύπτω", "覆盖 / 遮盖"),
    ("παθαίνω", "遭受 / 患上"),
    ("ηλεκτροπληξία", "触电"),
    ("φτάνω", "够到 / 到达"),
    ("αντικείμενο", "物品 / 物体"),
    ("πνίγομαι", "噎住 / 溺水 / 窒息"),
    ("κλειδώνω", "锁上 / 锁住"),
    ("δηλητηριάζω", "使中毒"),
    ("δηλητήριο", "毒物 / 毒药"),
    ("κάγκελο", "栏杆"),
    ("φυτεύω", "种植"),
    ("εργαλείο", "工具"),
    ("χρησιμοποιώ", "使用 / 用"),
    ("προϊόν", "产品"),
    ("περιβάλλον", "环境"),
    ("πλανήτης", "行星"),
    ("ξύδι", "醋"),
    ("υλικό", "材料 / 物质"),
    ("πλαστικό", "塑料"),
    ("γάζα", "纱布")
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
            cursor.execute("UPDATE vocabulary SET note_date = ?, word_chinese = ? WHERE id = ?", (date_str, chinese, vid))
            print(f"Updated existing word: {greek} -> {date_str}")
        else:
            # Insert new custom vocabulary row
            pron = get_pron(greek)
            ex_greek = f"Αυτό είναι {greek}."
            ex_chinese = f"这是 {chinese}。"
            
            # Assign to book 'a2' and unit '35' (or custom note container unit)
            cursor.execute("""
                INSERT INTO vocabulary (book_id, unit, page_number, word_greek, word_chinese, pronunciation, example_greek, example_chinese, error_count, difficulty_score, note_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, ("a2", 35, 0, greek, chinese, pron, ex_greek, ex_chinese, 0, 1.0, date_str))
            print(f"Inserted new word: {greek} ({chinese}) -> {date_str}")

def main():
    print(f"Connecting to database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    
    print("\n--- Processing July 21 Notes ---")
    insert_note_words(conn, notes_7_21, "2026-07-21")
    
    conn.commit()
    conn.close()
    print("\nDatabase transaction committed successfully!")

if __name__ == "__main__":
    main()

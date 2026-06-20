import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '../greek_coach.db')

def seed_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Ensure tables exist
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS books (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            sequence_order INTEGER NOT NULL,
            total_pages INTEGER DEFAULT 100
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vocabulary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id TEXT NOT NULL,
            unit INTEGER NOT NULL,
            page_number INTEGER NOT NULL,
            word_greek TEXT NOT NULL,
            word_chinese TEXT NOT NULL,
            pronunciation TEXT DEFAULT '',
            example_greek TEXT DEFAULT '',
            example_chinese TEXT DEFAULT '',
            error_count INTEGER DEFAULT 0,
            difficulty_score REAL DEFAULT 1.0,
            last_reviewed_at DATETIME,
            next_review_at DATETIME,
            FOREIGN KEY(book_id) REFERENCES books(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS progress (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)

    # Insert default books
    default_books = [
        ('a1-a', "LEON'S GREEK TEXTBOOK A1-A", 0, 120),
        ('a1-b', "LEON'S GREEK TEXTBOOK A1-B", 1, 120),
        ('a2', "LEON'S GREEK TEXTBOOK A2", 2, 150),
        ('b1', "LEON'S GREEK TEXTBOOK B1", 3, 180)
    ]
    cursor.executemany("INSERT OR IGNORE INTO books (id, title, sequence_order, total_pages) VALUES (?, ?, ?, ?)", default_books)

    # Insert default progress values
    cursor.execute("INSERT OR IGNORE INTO progress (key, value) VALUES ('current_book_id', 'a1-a')")
    cursor.execute("INSERT OR IGNORE INTO progress (key, value) VALUES ('current_page_number', '1')")

    # Clear existing vocabulary to avoid duplicates on re-run
    cursor.execute("DELETE FROM vocabulary WHERE book_id = 'a1-a'")

    # Mock vocabulary items for A1-A Pages 1-5
    mock_vocab = [
        # Page 1: Greetings & Basics
        ('a1-a', 1, 1, 'Γεια σας', '你好 / 你们好', 'ya sas', 'Γεια σας! Με λένε Γιώργο.', '你们好！我叫乔治。'),
        ('a1-a', 1, 1, 'Καλημέρα', '早上好 / 日安', 'ka-li-me-ra', 'Καλημέρα, Μαρία!', '早上好，玛丽亚！'),
        ('a1-a', 1, 1, 'Τι κάνεις;', '你好吗？ / 你在做什么？', 'ti ka-nis', 'Γεια σου Λεωνίδα, τι κάνεις;', '你好列奥尼达，你好吗？'),
        ('a1-a', 1, 1, 'Καλά', '好 / 很好', 'ka-la', 'Είμαι πολύ καλά, ευχαριστώ.', '我很好，谢谢。'),
        ('a1-a', 1, 1, 'Ευχαριστώ', '谢谢', 'ef-ha-ri-sto', 'Ευχαριστώ πολύ για τη βοήθεια.', '非常感谢你的帮助。'),

        # Page 2: People & Classroom Roles
        ('a1-a', 1, 2, 'αγόρι', '男孩', 'a-go-ri', 'Αυτό το αγόρι είναι ο Λεωνίδας.', '这个男孩是列奥尼达。'),
        ('a1-a', 1, 2, 'κορίτσι', '女孩', 'ko-ri-tsi', 'Ένα μικρό κορίτσι παίζει στην αυλή.', '一个女孩在院子里玩耍。'),
        ('a1-a', 1, 2, 'μαθητής', '学生 (男)', 'ma-thi-tis', 'Ο Λεωνίδας είναι μαθητής στο σχολείο.', '列奥尼达是学校的学生。'),
        ('a1-a', 1, 2, 'δάσκαλος', '老师 (男)', 'da-ska-los', 'Ο δάσκαλος είναι στην τάξη.', '老师在教室里。'),
        ('a1-a', 1, 2, 'σχολείο', '学校', 'sho-li-o', 'Μου αρέσει πολύ το σχολείο μου.', '我很喜欢我的学校。'),

        # Page 3: School Supplies
        ('a1-a', 1, 3, 'βιβλίο', '书', 'vi-vli-o', 'Αυτό είναι το βιβλίο των ελληνικών.', '这是希腊语书。'),
        ('a1-a', 1, 3, 'τετράδιο', '笔记本', 'te-tra-di-o', 'Γράφω στο κόκκινο τετράδιο.', '我写在红色的笔记本上。'),
        ('a1-a', 1, 3, 'μολύβι', '铅笔', 'mo-li-vi', 'Έχεις ένα μολύβι;', '你有一支铅笔吗？'),
        ('a1-a', 1, 3, 'στυλό', '钢笔 / 圆珠笔', 'sti-lo', 'Το στυλό μου είναι μπλε.', '我的笔是蓝色的。'),
        ('a1-a', 1, 3, 'τσάντα', '书包 / 包', 'tsa-nta', 'Η τσάντα μου είναι βαριά.', '我的书包很重。'),

        # Page 4: Numbers
        ('a1-a', 1, 4, 'ένα', '一', 'e-na', 'Έχω ένα μολύβι.', '我有一支铅笔。'),
        ('a1-a', 1, 4, 'δύο', '二', 'di-o', 'Έχω δύο τετράδια.', '我有两本笔记本。'),
        ('a1-a', 1, 4, 'τρία', '三', 'tri-a', 'Υπάρχουν τρία βιβλία στο τραπέζι.', '桌上有三本书。'),
        ('a1-a', 1, 4, 'τέσσερα', '四', 'te-se-ra', 'Βλέπω τέσσερα αγόρια.', '我看到四个男孩。'),
        ('a1-a', 1, 4, 'πέντε', '五', 'pe-nde', 'Έχω πέντε ευρώ.', '我有五欧元。'),

        # Page 5: Animals & Home
        ('a1-a', 1, 5, 'γάτα', '猫', 'ga-ta', 'Η γάτα κοιμάται στον καναπέ.', '猫在沙发上睡觉。'),
        ('a1-a', 1, 5, 'σκύλος', '狗', 'ski-los', 'Ο σκύλος μου γαβγίζει.', '我的狗在叫。'),
        ('a1-a', 1, 5, 'σπίτι', '家 / 房子', 'spi-ti', 'Πηγαίνω στο σπίτι μου.', '我回我的家。'),
        ('a1-a', 1, 5, 'οικογένεια', '家庭 / 家人', 'i-ko-ye-ni-a', 'Αγαπώ την οικογένειά μου.', '我爱我的家庭。'),
        ('a1-a', 1, 5, 'μαμά', '妈妈', 'ma-ma', 'Η μαμά μου μαγειρεύει.', '我的妈妈在做饭。'),
        ('a1-a', 1, 5, 'μπαμπάς', '爸爸', 'ba-mbas', 'Ο μπαμπάς μου παίζει ποδόσφαιρο.', 'Ο μπαμπάς μου παίζει ποδόσφαιρο.')
    ]

    cursor.executemany("""
        INSERT INTO vocabulary (book_id, unit, page_number, word_greek, word_chinese, pronunciation, example_greek, example_chinese)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, mock_vocab)

    conn.commit()
    conn.close()
    print(f"Successfully created tables and seeded {len(mock_vocab)} mock vocabulary terms for offline testing.")

if __name__ == "__main__":
    seed_data()

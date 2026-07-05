import sqlite3
import re
import os

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(PROJECT_DIR, "backend", "greek_coach.db")

def is_greek(text):
    return bool(re.search(r'[\u0370-\u03ff\u1f00-\u1fff]', text))

def clean_database():
    print(f"Connecting to database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Fix specific words
    print("Fixing specific words...")
    
    # Fix βgázw fwtografía -> βγάζω φωτογραφία
    cursor.execute("""
        UPDATE vocabulary 
        SET word_greek = 'βγάζω φωτογραφία', pronunciation = 'vgazo-fotografia'
        WHERE word_greek = 'βgázw fwtografía';
    """)
    
    # Clean up suffix " -> xánw ->" in word_chinese for χάνω
    cursor.execute("""
        UPDATE vocabulary 
        SET word_chinese = '丢失 / 失去' 
        WHERE word_greek = 'χάνω' AND word_chinese LIKE '%丢失 / 失去%';
    """)
    
    # Clean up double dash "--" entries
    # For common single words with "--", we update them to correct Chinese translations
    common_fixes_dash = {
        "σπίτι": "家 / 房子",
        "στρώμα": "床垫 / 被褥",
        "τα φάρμακα": "药 / 药品",
        "τετράγωνο": "正方形 / 广场",
        "έφαγα": "我吃了（吃，过去式）",
        "Προσκαλούμε": "我们邀请",
        "Πώς": "怎么 / 如何",
        "αγαπημένος -η -ο": "最喜欢的",
        "ζωντανός -ή -ό": "活着的 / 充满活力的",
        "παραδοσιακός -ή -ό": "传统的",
        "Κλειδιά": "钥匙",
        "παπαγάλος": "鹦鹉",
        "ΠΑΠΑΓΑΛΟΣ": "鹦鹉",
        "Δεν ξέρω": "我不知道"
    }
    
    for gr, zh in common_fixes_dash.items():
        cursor.execute("UPDATE vocabulary SET word_chinese = ? WHERE word_greek = ? AND word_chinese = '--'", (zh, gr))
        
    # Also handle word_greek with parentheses where translation was --
    # e.g. "Κλειδιά (钥匙)" -> word_greek = "κλειδιά", word_chinese = "钥匙"
    cursor.execute("SELECT id, word_greek FROM vocabulary WHERE word_chinese = '--' AND word_greek LIKE '%(%)%'")
    for row in cursor.fetchall():
        vid, gr = row
        match = re.search(r'([^(]+)\s*\(([^)]+)\)', gr)
        if match:
            clean_gr = match.group(1).strip()
            zh = match.group(2).strip()
            # If the text inside parentheses is Chinese, update both fields
            if re.search(r'[\u4e00-\u9fa5]', zh):
                cursor.execute("UPDATE vocabulary SET word_greek = ?, word_chinese = ? WHERE id = ?", (clean_gr, zh, vid))

    # Delete all other rows where word_chinese is still "--" or purely whitespace/dashes
    cursor.execute("DELETE FROM vocabulary WHERE word_chinese = '--' OR trim(word_chinese) = '' OR word_chinese IS NULL")
    print("Deleted empty/placeholder '--' vocabulary rows.")

    # 2. Fix Greek characters in Chinese field
    print("Cleaning up Greek characters in Chinese field...")
    cursor.execute("SELECT id, word_greek, word_chinese FROM vocabulary")
    all_rows = cursor.fetchall()
    
    deleted_count = 0
    fixed_count = 0
    
    # Known mappings for Greek words that had wrong/Greek entries in Chinese field
    known_greek_chinese_mappings = {
        "Άκης": "阿基斯（人名）",
        "ανοιχτός": "开着的 / 开放的",
        "Γιώργος": "乔治（人名）",
        "Νίκος": "尼科斯（人名）",
        "Παππούς": "爷爷 / 外公",
        "Ελένη": "埃莱妮（人名）",
        "Κώστας": "科斯塔斯（人名）",
        "Πέτρος": "彼得罗斯（人名）"
    }

    for row in all_rows:
        vid, gr, zh = row
        if is_greek(zh):
            # If it's in our known mapping, fix it
            if gr in known_greek_chinese_mappings:
                cursor.execute("UPDATE vocabulary SET word_chinese = ? WHERE id = ?", (known_greek_chinese_mappings[gr], vid))
                fixed_count += 1
            # If it's a long sentence or heading, delete it
            elif len(gr) > 15 or " " in gr or "σκέλος" in gr or "Πλαίσιο" in gr or "Βάζω" in gr or "Άλλος" in gr:
                cursor.execute("DELETE FROM vocabulary WHERE id = ?", (vid,))
                deleted_count += 1
            else:
                # Fallback: if it's a short Greek word, it shouldn't have Greek in Chinese field. Let's delete it to be safe
                cursor.execute("DELETE FROM vocabulary WHERE id = ?", (vid,))
                deleted_count += 1
                
    print(f"Fixed {fixed_count} Greek-in-Chinese rows; deleted {deleted_count} exercise/sentence rows.")

    # 3. Clean up grammatical text and parentheses in the Greek word field
    print("Cleaning parentheses and grammatical artifacts from Greek words...")
    cursor.execute("SELECT id, word_greek, word_chinese FROM vocabulary")
    all_rows = cursor.fetchall()
    
    cleaned_parentheses = 0
    deleted_grammar = 0
    
    for row in all_rows:
        vid, gr, zh = row
        # If the Greek field contains Chinese letters (e.g. grammatical explanations), delete it
        if re.search(r'[\u4e00-\u9fa5]', gr):
            cursor.execute("DELETE FROM vocabulary WHERE id = ?", (vid,))
            deleted_grammar += 1
            continue
            
        # Clean parentheses in word_greek: e.g. "(τα) αξιοθέατα" -> "αξιοθέατα"
        # but keep gender modifiers if they are part of standard entry, or clean them
        if "(" in gr or ")" in gr:
            # Remove parentheses but keep the content if it's part of the word, or remove it if it's just article like (τα)
            new_gr = re.sub(r'\((τα|το|ο|η|阳性|阴性|中性)\)', '', gr) # remove standard articles/genders in parens
            new_gr = re.sub(r'\s*\(.*?\)\s*', ' ', new_gr).strip() # remove other parenthesized comments
            new_gr = re.sub(r'\s*（.*?）\s*', ' ', new_gr).strip()
            
            if new_gr != gr and len(new_gr) > 0:
                cursor.execute("UPDATE vocabulary SET word_greek = ? WHERE id = ?", (new_gr, vid))
                cleaned_parentheses += 1

    print(f"Deleted {deleted_grammar} grammar explanation rows; cleaned parentheses for {cleaned_parentheses} rows.")

    # 4. Clean up corrupted example translations (e.g. ID 1295 has been deleted by Greek-in-Chinese rule, but let's check others)
    cursor.execute("SELECT id, example_chinese FROM vocabulary WHERE example_chinese LIKE '%这是%'")
    example_rows = cursor.fetchall()
    for row in example_rows:
        vid, ex_zh = row
        # If example_chinese has Greek letters, clean it or set to empty
        if is_greek(ex_zh):
            cursor.execute("UPDATE vocabulary SET example_chinese = NULL WHERE id = ?", (vid,))

    conn.commit()
    conn.close()
    print("Database cleaning complete!")

if __name__ == "__main__":
    clean_database()

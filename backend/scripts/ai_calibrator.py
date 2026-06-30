import os
import json
import sqlite3
import argparse
import time

try:
    from google import genai
except ImportError:
    genai = None

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(PROJECT_DIR, "backend", "greek_coach.db")
ENV_PATH = os.path.join(PROJECT_DIR, "backend", ".env")

def load_env():
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r") as f:
            for line in f:
                if line.startswith("GEMINI_API_KEY="):
                    return line.strip().split("=", 1)[1]
    return os.environ.get("GEMINI_API_KEY")

def calibrate_database(api_key, limit=50, only_notes=False):
    if not genai:
        print("Error: google-genai is not installed. Run 'pip install google-genai'")
        return

    client = genai.Client(api_key=api_key)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 按照用户的要求："如果已经跟三个课本同步过了，那么就不再改变了"
    # 我们优先检查带有 note_date（笔记）的最新内容，或者用户指定的范围
    query = "SELECT id, word_greek, word_chinese, example_greek, example_chinese FROM vocabulary"
    if only_notes:
        query += " WHERE note_date IS NOT NULL"
    query += f" ORDER BY id DESC LIMIT {limit}"
    
    cursor.execute(query)
    rows = cursor.fetchall()
    
    print(f"[*] AI Calibrator 启动：检查 {len(rows)} 条词汇/笔记...")
    
    prompt_template = """
    你是一个精通希腊语和中文语法的语言专家（较准器）。
    请帮我检查以下希腊语学习数据是否有明显的拼写错误、翻译错误、或者不符合常理的地方。
    希腊语单词："{word_greek}"
    中文翻译："{word_chinese}"
    希腊语例句："{example_greek}"
    中文例句翻译："{example_chinese}"
    
    如果完全正确，请只回复 "OK"。
    如果有错误，请指出错误并给出修正建议。
    """
    
    for row in rows:
        vid, wg, wc, eg, ec = row
        prompt = prompt_template.format(word_greek=wg, word_chinese=wc, example_greek=eg, example_chinese=ec)
        
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
            )
            result = response.text.strip()
            
            if result != "OK":
                print(f"\n[!] 发现潜在问题 (ID: {vid}): {wg} -> {wc}")
                print(f"AI 较准建议:\n{result}\n")
            else:
                print(f"[√] ID {vid} 校验通过。")
                
            time.sleep(1) # Rate limit protection
            
        except Exception as e:
            print(f"API 请求失败: {e}")
            break
            
    conn.close()
    print("\n[*] 较准完毕。如需采纳 AI 建议，请在后台手动修改或更新数据库。")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Leon Greek Coach - AI Calibrator")
    parser.add_argument("--notes-only", action="store_true", help="Only calibrate words with note_date")
    parser.add_argument("--limit", type=int, default=50, help="Number of recent records to check")
    args = parser.parse_args()

    api_key = load_env()
    if not api_key or api_key == "YOUR_GEMINI_API_KEY_HERE":
        print("错误: 找不到有效的 GEMINI_API_KEY。请在 backend/.env 中配置您的 API Key。")
    else:
        calibrate_database(api_key, limit=args.limit, only_notes=args.notes_only)

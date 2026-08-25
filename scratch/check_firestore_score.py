import urllib.request
import json

url = "https://firestore.googleapis.com/v1/projects/leon-greek-coach/databases/(default)/documents/leon_greek_coach/shared_state"

try:
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read().decode())
        fields = data.get("fields", {})
        
        score_val = fields.get("score", {})
        score_int = int(score_val.get("integerValue", score_val.get("stringValue", 0)))
        print(f"🔥 当前云端 Firestore 总积分为: {score_int} XP")
        
        daily_rewards = fields.get("daily_rewards_awarded", {}).get("mapValue", {}).get("fields", {})
        print(f"📅 累计打卡奖励天数: {len(daily_rewards)} 天")
        for date_key in sorted(daily_rewards.keys()):
            print(f"   - {date_key}: +10 XP")
            
except Exception as e:
    print("Error:", e)

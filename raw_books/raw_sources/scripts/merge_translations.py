import os
import json

CACHE_PATH = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach/backend/translation_cache.json"

MANUAL_TRANSLATIONS = {
  "\"play 20 questions\"": "玩“20个提问”游戏",
  "(at ten o'clock) sharp": "（十点）整",
  "(at ten o’clock) sharp": "（十点）整",
  "(electric) stove, (electric) cooker": "电炉，电磁炉",
  "(it is) four o'clock": "四点整",
  "(it is) half past four": "四点半",
  "(well) known, famous": "著名的，有名的",
  "Alexander the Great": "亚历山大大帝",
  "Cloud Music": "云音乐",
  "Elementary/Primary School": "小学",
  "English(man/-woman)": "英国人（男/女）",
  "How old are you?": "你几岁了？",
  "I/you ... must": "我/你……必须",
  "Karagiozis [popular hero in Greek shadow play]": "卡拉约齐斯（希腊皮影戏人物）",
  "Kavala": "卡瓦拉（希腊城市）",
  "Mathematics, Maths": "数学",
  "Merry Christmas!": "圣诞快乐！",
  "Miguel de Cervantes": "米格尔·德·塞万提斯",
  "Olympic games": "奥林匹克运动会",
  "Vasiliki": "瓦西里基（人名/地名）",
  "What's your name?": "你叫什么名字？",
  "White Tower": "白塔（塞萨洛尼基地标）",
  "a play is put on": "上演一出戏",
  "administration": "行政，管理",
  "air, wind": "空气，风",
  "alphabet": "字母表",
  "angel": "天使",
  "archaeological": "考古的",
  "archaeological site": "考古遗址",
  "blackboard": "黑板",
  "board game": "桌面游戏（桌游）",
  "boat, ship": "船，小舟",
  "bodysuit, leotard": "连体衣，体操服",
  "buy": "买，购买",
  "cap": "帽子（有舌帽）",
  "close, nearby": "近的，在附近",
  "cobra": "眼镜蛇",
  "community": "社区，社群",
  "cosmos": "宇宙",
  "courage": "勇气",
  "direction": "方向",
  "dollhouse": "玩具娃娃屋",
  "early in the morning, first thing in the morning": "大清早，一大清早",
  "entertainment, fun, amusement": "娱乐，乐趣",
  "false, incorrect, wrong": "错误的，假的",
  "favorite, beloved, dear": "最喜欢的，亲爱的",
  "final stop, terminal": "终点站",
  "football bench": "足球替补席",
  "from, by, since": "来自，自……以来，被",
  "glue": "胶水",
  "go up, ascend": "上去，攀登",
  "good morning": "早上好",
  "grandfather, grandad, grandpa": "爷爷，外公",
  "great, important": "伟大的，重要的",
  "grown up, adult": "大人，成年人",
  "have a nice time, enjoy": "玩得开心，享受",
  "hear, listen": "听，听到",
  "her, hers": "她的",
  "hippopotamus, hippo": "河马",
  "history class": "历史课",
  "housework, housekeeping chores": "家务活",
  "how many": "多少",
  "how much does/do... cost?": "……多少钱？",
  "huge, enormous, gigantic": "巨大的",
  "important, significant": "重要的",
  "its": "它的",
  "jailed, imprisoned, prisoner": "被囚禁的，囚犯",
  "kick": "踢",
  "language (Greek, English, etc.)": "语言（希腊语、英语等）",
  "library": "图书馆",
  "lonesome, deserted": "孤单的，荒凉的",
  "macaroni, spaghetti, pasta": "意大利面，通心粉",
  "madam, lady": "女士，夫人",
  "many, a lot of": "许多的，很多的",
  "marvellous, wonderful, splendid": "美妙的，棒极了的",
  "mom, mum, mommy": "妈妈",
  "movement": "运动，动作",
  "musical instrument": "乐器",
  "my, mine": "我的",
  "no one": "没有人",
  "once upon a time": "从前，很久以前",
  "our, ours": "我们的",
  "peak": "山顶，巅峰",
  "pencil case, pencil holder": "铅笔盒，笔袋",
  "radio station": "广播电台",
  "really?, truly?": "真的吗？",
  "refreshment, beverage": "清凉饮料",
  "ribbon": "丝带，缎带",
  "rythmic gymnastics": "艺术体操",
  "school bus": "校车",
  "seashore, seaside, coastline": "海岸，海滨",
  "seven hundred": "七百",
  "short sleeve": "短袖",
  "silence, quietness, calmness": "安静，平静",
  "society": "社会",
  "some, a little": "一些，一点",
  "spear": "矛，枪",
  "sports events": "体育赛事",
  "sports games": "体育比赛",
  "subject, lesson, course, class": "学科，课",
  "sweet, cute (metaph.)": "甜的，可爱的",
  "terrifying, frightening": "可怕的",
  "the day before yesterday": "前天",
  "the phone is ringing": "电话响了",
  "their, theirs": "他们的，她们的，它们的",
  "there is a knock on the door": "有人敲门",
  "tiredness": "疲劳，累",
  "to answer, to respond, to reply": "回答，答复",
  "to be careful, to pay attention": "小心，注意",
  "to be open": "营业，开着",
  "to be responsible, I am to blame, it is my fault": "负责任，怪我，是我的错",
  "to be/get injured": "受伤",
  "to close a window": "关窗户",
  "to colour, to paint": "涂色，上色",
  "to depart, to go": "出发，离开",
  "to do the laundry": "洗衣服",
  "to do the washing up": "洗碗碟",
  "to get tired": "变累，疲倦",
  "to go camping": "去露营",
  "to have a good time, to enjoy myself": "玩得开心，过得愉快",
  "to have a stomach ache": "肚子痛",
  "to have/take a bath": "洗澡",
  "to knock on the door": "敲门",
  "to lock": "锁上",
  "to meet (with), to come across": "遇见，碰见",
  "to meet, to come across": "遇见，碰见",
  "to move, to shake, to swing": "移动，摇晃，摆动",
  "to reserve": "预订",
  "to stay indoors": "待在室内",
  "to swim, to have a swim": "游泳",
  "to work, to function": "工作，运转",
  "to worry, to be concerned": "担心，焦虑",
  "top": "顶部 / 陀螺",
  "torso": "躯干",
  "trousers (a pair of), pants": "裤子，长裤",
  "vacuum cleaner": "吸尘器",
  "watermelon": "西瓜",
  "way, path, route, itinerary": "道路，路线，行程",
  "whatever": "无论什么",
  "your, yours": "你的，你们的",
  "zucchini": "西葫芦",
  "Ενί": "埃尼（人名）",
  "Ινί": "伊尼（人名/地名）",
  "ιώτα": "约塔（希腊字母 ι）"
}

def main():
    if not os.path.exists(CACHE_PATH):
        print(f"Error: Cache file not found at {CACHE_PATH}")
        return
        
    with open(CACHE_PATH, "r", encoding="utf-8") as f:
        cache = json.load(f)
        
    added = 0
    overwritten = 0
    for key, val in MANUAL_TRANSLATIONS.items():
        if key in cache:
            # Overwrite only if different, or keep count
            if cache[key] != val:
                cache[key] = val
                overwritten += 1
        else:
            cache[key] = val
            added += 1
            
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
        
    print(f"Merge complete: added {added} new keys, updated {overwritten} keys in the cache.")

if __name__ == "__main__":
    main()

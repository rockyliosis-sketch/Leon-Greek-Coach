"""v2.8.0: 修正 A1/A2 词表里机翻出错的中文 (来源 scratch/zh_audit_merged.tsv, 人工复核后)。
只改 word_chinese 与 zh_source, 不增删词条, 不动 idx/id (背词进度按 idx 记)。"""
import json, re
R = '/Users/johnsmacbook/Documents/Codex/Leon-Greek-Coach/'
rows = [l.rstrip('\n').split('\t') for l in open(R + 'docs/zh_audit_v2.8.0.tsv')][1:]

# 原译虽不完美但也算对: 不改, 免得孩子原本答对的写法被判错
SKIP = {5, 8, 11, 42, 45, 74, 85, 88, 139, 152, 153, 180, 186, 189}
# 希腊语那一栏本身残缺, 清空中文 = 不再出题 (isValidWordPair 规则 1)
DROP = {106, 296}
# 建议译法把关键义项放进了括号/用了省略号: 判题会去掉括号再按「，；/」切义项, 这里重写
OVR = {
    2: '不；没有', 9: '分音符', 14: '你；你们；您', 27: '中国的；中文的', 34: '姐妹；姐姐；妹妹',
    35: '当……的时候', 46: '图画；草图；计划', 50: '一点也不；根本不', 57: '上去；攀登；上车',
    75: '预订；关闭', 78: '上面；更上面', 95: '球员；选手', 99: '甜椒；辣椒', 109: '说……；认为……（连词）',
    112: '必须；不得不', 115: '表兄弟；表姐妹', 116: '离婚的；分居的', 117: '让……吧',
    122: '向右；在右边', 128: '周围；大约', 133: '在下面划线', 136: '要紧；没关系',
    141: '希腊人', 142: '德拉马', 145: '拿着；握住；持续', 150: '值；花费', 164: '狂欢节',
    169: '舞台', 170: '税务局', 171: '市民服务中心', 173: '希腊国家电力公司', 174: '希腊天然气公司',
    176: '也就是说', 185: '金字塔；棱锥', 188: '是不是……；会不会……', 199: '玩接话游戏',
    200: '空乘人员；空姐', 209: '他；她；它', 215: '在……外面', 219: '现在四点整', 220: '现在四点半',
    256: '你从哪里来？', 262: '他；她；它', 275: '班次；路线', 290: '', 298: '狂欢节',
    303: '主新闻；晚间新闻', 309: '克里特的；克里特人', 323: '适合我', 328: '定冠词',
    331: '无论谁；谁……就', 333: '采访', 340: '本都的', 347: '', 367: '负责的；负责人',
    370: '招待；接待', 377: '然而',
}
fix = {}   # "src:id" -> 新中文
for n, r in enumerate(rows, 1):
    if n in SKIP: continue
    new = '' if n in DROP else OVR.get(n, r[3])
    new = new.replace('，', '；').strip() if n not in OVR else new
    assert not re.search(r'[Ͱ-Ͽ]', new), (n, new)
    for key in r[6].split(','):
        fix[key.strip()] = (new, r[2])

def apply(entries, keyfn):
    hit = 0
    for e in entries:
        k = keyfn(e)
        if k in fix:
            new, old = fix[k]
            assert e['word_chinese'] == old, (k, e['word_chinese'], old)
            e['word_chinese'] = new; e['zh_source'] = 'fix'
            if 'has_chinese' in e: e['has_chinese'] = bool(new)
            hit += 1
    return hit

vp = R + 'frontend/src/data/vocabulary_v2.json'; v = json.load(open(vp))
h1 = apply(v['entries'], lambda e: f"{e['book_id']}:{100000 + e['id']}")
gp = R + 'frontend/src/data/glossary_v2.json'; g = json.load(open(gp))
h2 = sum(apply(g['lists'][L], lambda e, L=L: f"{L}:{e['id']}") for L in ('A1', 'A2'))
print('vocabulary_v2 改', h1, '条; glossary_v2 改', h2, '条; 复核后采纳', len(rows) - len(SKIP), '/', len(rows))
json.dump(v, open(vp, 'w'), ensure_ascii=False, indent=1)
json.dump(g, open(gp, 'w'), ensure_ascii=False, indent=1)

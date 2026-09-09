# -*- coding: utf-8 -*-
"""扫描三份词库，按人工分类生成「不出题的专有名词」名单。"""
import json, re, unicodedata, collections

GK = re.compile(r'[Ͱ-Ͽἀ-῿]')

def is_proper(w):
    t = re.sub(r'^[^Ͱ-Ͽἀ-῿]+', '', (w or '').strip())
    c = t[:1]
    return bool(c) and bool(GK.match(c)) and c != c.lower()

def norm(s):
    """去重音、去括号、取第一个逗号前的部分、只留第一个词，小写。"""
    s = re.sub(r'\(.*?\)|\[.*?\]|（.*?）|【.*?】', ' ', s or '')
    s = s.split(',')[0].split('，')[0]
    s = unicodedata.normalize('NFD', s)
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')
    s = re.sub(r'[^Ͱ-Ͽἀ-῿\s\-]', ' ', s)
    s = s.lower().strip()
    toks = [t for t in re.split(r'[\s\-]+', s) if t]
    return toks[0] if toks else ''

# ── 人名（含希腊本名、外国名、作家/名人姓氏）──────────────────
PERSON = """
Άγγελος Αγγέλα Άκης Άννα Άθως Άραμις Άρης Άριελ Έλλη Έλσα Ήβη Όλγα
Αίσωπος Αθανασία Αλέξανδρος Αλέξης Αλίκη Αλεξία Ανέστης Αναστασία
Αντρέας Αντωνία Αντώνης Βάσω Βίκυ Βαγγέλης Βασίλης Βασιλική Βερν
Γεράσιμος Γιάννα Γιάννης Γιώργος Γκρέτελ Γκριμ Γρηγόρης Γωγώ
Δέσποινα Δήμητρα Δανάη Δημήτρης Δημήτριος Δώρα
Ελένη Ελίνα Ελισάβετ Ευάγγελος Εύη Ζέτα Ζήσης Ηλίας Ηλιάνα
Θάνος Θανάσης Θερβάντες Θωμαή Ιάσονας Ιωάννα
Κάιτη Καίτη Κάρμεν Κάτια Καλλιόπη Κατερίνα Κοσμάς Κυριάκος Κώστας
Λένα Λίζα Λίνα Λίνκον Λίτσα Λευτέρης Λιάνα
Μάρθα Μάριος Μάρκος Μίρκα Μαίρη Μανόλης Μαρί Μαρία Μαργαρίτα
Μαριάννα Μαριώ Μαρίνα Μηνάς Μιχάλης Μιχαέλα Μπάμπης
Νίκος Νεκτάριος Νιόβη Ντίνα Ξένια Ουρανία
Πάνος Πάτρικ Πέρσα Πέτρος Παύλος Πηνελόπη Πόπη
Ρέα Ρόζα Σάκης Σαίξπηρ Σαμ Σμαρώ Σοφί Σοφία Στάθης Σωτήρης Σωτηρία
Τάνια Τάσος Τασούλα Τζιμ Τουέιν Τσιτσάνης Υβόννη
Φάμπιο Φάνης Φανή Φωτεινή Φώτης
Χάνσελ Χάρης Χαράλαμπος Χαρίκλεια Χαρούλα Χρήστος Χριστίνα
Νίκη Ελπίδα Ειρήνη Ελευθερία Γεωργία
"""

# ── 虚构角色 / 神话 / 星座 / 文学作品 ──────────────────────────
CHARACTER = """
Αλαντίν Αστερίξ Οβελίξ Πινόκιο Ραπουνζέλ Σταχτοπούτα Στρουμφίτα
Τίνκερμπελ Χιονάτη Πήτερ Καραγκιόζης
Ηρακλής Οδυσσέας Ορέστης Κύκλωπας Πήγασος Κένταυρος
Δον Δούρειος Ρωμαίος
"""

# ── 冷门地名（纯音译、孩子没有中文语境）────────────────────────
PLACE = """
Αργοστόλι Βρέμη Βόλος Ιωάννινα Καβάλα Καλαμάτα Καστοριά Κομοτηνή
Κως Λάρισα Μυτιλήνη Ναύπλιο Ξάνθη Πάτρα Πειραιάς Ρέθυμνο Τρίπολη
Ναβαρίνου Καμάρα
"""

def toks(block):
    return [t for t in re.split(r'\s+', block.strip()) if t]

groups = {'person': toks(PERSON), 'character': toks(CHARACTER), 'place': toks(PLACE)}

# 载入词库，统计每个 key 命中的词条
d = json.load(open('frontend/src/data/vocabulary.json'))
v2 = json.load(open('frontend/src/data/vocabulary_v2.json'))['entries']
g2 = json.load(open('frontend/src/data/glossary_v2.json'))['lists']
sources = [('mg', d['master_glossary']), ('tv', d['textbook_vocabulary']), ('v2', v2)]
for k, lst in (g2.items() if isinstance(g2, dict) else []):
    sources.append(('g2:' + k, lst))

hits = collections.defaultdict(list)
for tag, lst in sources:
    for x in lst:
        g = (x.get('word_greek') or '').strip()
        if not is_proper(g):
            continue
        hits[norm(g)].append((tag, g, x.get('word_chinese')))

out = {}
missing = []
for name, items in groups.items():
    keys = []
    for t in items:
        k = norm(t)
        if not k:
            continue
        if k not in hits:
            missing.append((name, t, k))
        keys.append(k)
    out[name] = sorted(set(keys))

print('=== 没在词库里命中的（可能是我打错了，或该词只在句子里出现）===')
for n, t, k in missing:
    print('  ', n, t, '->', k)

blocked = set(sum(out.values(), []))
total = sum(len(v) for v in hits.values())
gone = sum(len(hits[k]) for k in blocked if k in hits)
print(f'\n大写词条总数 {total} 条；本次撤掉 {gone} 条（{len(blocked)} 个词头）')

print('\n=== 撤掉的词条抽样 ===')
shown = 0
for k in sorted(blocked):
    for tag, g, z in hits.get(k, [])[:1]:
        print(f'  {g} | {z}')
        shown += 1
    if shown > 60:
        print('  ...')
        break

# 留下的大写词条，供复核有没有误留
kept = sorted(k for k in hits if k not in blocked)
print(f'\n=== 保留的大写词头 {len(kept)} 个 ===')
print('  ' + ' '.join(kept))

payload = {
    "note": "题库里不再出现的专有名词词头（去重音、小写、只取第一个词）。人名/虚构角色/冷门地名对孩子没有中文语境，背了也用不上。",
    "generated_by": "scripts/build_proper_name_blocklist.py",
    **out,
}
json.dump(payload, open('frontend/src/data/proper_name_blocklist.json', 'w'), ensure_ascii=False, indent=2)
print('\n已写出 frontend/src/data/proper_name_blocklist.json')

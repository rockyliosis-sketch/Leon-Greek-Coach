import re, unicodedata, json

def strip_acc(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s)
                   if unicodedata.category(c) != 'Mn')

GR = re.compile(r'[Ͱ-Ͽἀ-῿]{4,}')
def words(t):
    return {strip_acc(w).lower() for w in GR.findall(t)}

pdf_pages = open('scratch/pdf_verify/B_pdf_raw.txt', encoding='utf-8').read().split('\f')
md = open('materials/textbooks/（已压缩）LEON_S GREEK TEXTBOOK B.md', encoding='utf-8').read()

# split md by page
parts = re.split(r'^## Page (\d+)\s*$', md, flags=re.M)
md_pages = {}
for i in range(1, len(parts), 2):
    md_pages[int(parts[i])] = parts[i+1]

rows = []
for p in sorted(md_pages):
    mw = words(md_pages[p])
    pw = words(pdf_pages[p-1]) if p-1 < len(pdf_pages) else set()
    if not mw and not pw:
        continue
    hit = len(mw & pw)
    prec = hit/len(mw)*100 if mw else 0     # MD的词有多少真在原书这页
    rec  = hit/len(pw)*100 if pw else 0     # 原书这页的词有多少被MD收录
    rows.append((p, len(mw), len(pw), hit, prec, rec))

print(f"{'页':>4} {'MD词':>5} {'PDF词':>6} {'命中':>5} {'准确率%':>7} {'覆盖率%':>7}")
for r in rows[:0]:
    pass
import statistics
precs = [r[4] for r in rows if r[1] > 0]
recs  = [r[5] for r in rows if r[2] > 0]
print(f"\n=== 全书 {len(rows)} 页汇总 ===")
print(f"MD内容准确率(MD的希腊词真在原书该页) 中位数: {statistics.median(precs):.1f}%  平均: {statistics.mean(precs):.1f}%")
print(f"原书覆盖率(原书该页的词被MD收录)     中位数: {statistics.median(recs):.1f}%  平均: {statistics.mean(recs):.1f}%")

buckets = {'0-20%':0,'20-40%':0,'40-60%':0,'60-80%':0,'80-100%':0}
for r in rows:
    v = r[4]
    k = '0-20%' if v<20 else '20-40%' if v<40 else '40-60%' if v<60 else '60-80%' if v<80 else '80-100%'
    buckets[k]+=1
print("\n准确率分布(页数):", buckets)

print("\n=== 最差20页 ===")
for r in sorted(rows, key=lambda x: x[4])[:20]:
    print(f"p{r[0]:<4} MD词{r[1]:<4} PDF词{r[2]:<4} 命中{r[3]:<4} 准确{r[4]:.0f}% 覆盖{r[5]:.0f}%")
print("\n=== 最好10页 ===")
for r in sorted(rows, key=lambda x: -x[4])[:10]:
    print(f"p{r[0]:<4} MD词{r[1]:<4} PDF词{r[2]:<4} 命中{r[3]:<4} 准确{r[4]:.0f}% 覆盖{r[5]:.0f}%")
json.dump(rows, open('scratch/pdf_verify/B_cmp.json','w'))

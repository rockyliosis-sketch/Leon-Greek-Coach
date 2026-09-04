# -*- coding: utf-8 -*-
"""B 本 U2–U20 题库统一构建器。

数据来源与 U1 同一套四级可靠度(见 b-drill-authoring-method 记忆):
  1. 课本自带练习(Διαλέγω το σωστό / Συμπληρώνω / Απαντάω) —— 题干与选项照抄, 只补答案与讲解
  2. 课本原印的规则表 / 变格表 —— 逐字照抄, 不推导
  3. Πώς το λένε; 交际功能句方框 —— 整句来自课本
  4. 课文原句挖空 —— 仅在答案唯一时出
禁止: 按规则推导动词变位(已用真数据撞死)。

每个单元一个数据文件: scripts/ocr/b_units/uNN.py, 里面是 UNIT / TITLE / ITEMS。
ITEMS 每条 = dict(page, tag, orig, q, ans, dis, zh, tip)
  page 课本页码 | tag 题型中文名 | orig 课本原句(出处) | q 题干(______ 为空)
  ans 正确答案 | dis 干扰项(形近义远) | zh 中文翻译 | tip 中文讲解
  acc 选填: 手写题额外接受的写法(希腊语 -άω/-ώ 双写法、καμιά/καμία 之类必须都收)

每条生成两道: choice(三/四选一) + cloze(手写填空)。
页码闸门: page 字段决定放行时机, Leon 学到哪页哪页才出现, 做完整本不算超纲。

用法: python3 scripts/ocr/build_b_units.py [单元号...]   不给参数 = 全部重建
"""
import json, os, sys, glob, importlib.util, unicodedata, re
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BANK = f'{ROOT}/frontend/src/data/b_grammar_drills.json'
UDIR = os.path.dirname(os.path.abspath(__file__)) + '/b_units'
ID_BASE = 321000          # U2 起 321000, 每单元预留 1000 个 id


def norm(s):
    """判题归一化: 去重音、去标点、小写 —— 与前端 isFuzzyGreekMatch 的前处理对齐。"""
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[;·.,!?:'’\"()\-–—…]", '', s)
    return s.lower().strip()


def shuffle(ans, dis, seed):
    o = [ans] + list(dis)
    return [o[(i + seed) % len(o)] for i in range(len(o))]


def load_units(only=None):
    mods = []
    for path in sorted(glob.glob(f'{UDIR}/u*.py')):
        name = os.path.basename(path)[:-3]
        if only and int(name[1:]) not in only:
            continue
        spec = importlib.util.spec_from_file_location(f'b_units.{name}', path)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        mods.append(m)
    return mods


def build(mods):
    rows, problems = [], []
    for m in mods:
        sk = f'u{m.UNIT - 39}_exercise'          # system unit 41 -> u2_exercise
        nid = ID_BASE + (m.UNIT - 41) * 1000
        for it in m.ITEMS:
            page, tag, orig = it['page'], it['tag'], it['orig']
            ans, dis = it['ans'], list(it['dis'])
            q = it['q'] if it.get('zh') is None else f"{it['q']}\n（{it['zh']}）"
            tip = (f"【{tag}】{it['tip']}\n【课本原句】{orig}\n"
                   f"【出处】第 {m.UNIT - 39} 单元 {m.TITLE} · 课本第 {page} 页")
            base = dict(book_id='b1', unit=m.UNIT, unit_title=m.TITLE, page=page,
                        skill_type=sk, question=q, answer=ans, detailed_tip=tip)
            opts = shuffle(ans, dis, nid % (len(dis) + 1))
            rows.append(dict(id=nid, drill_type='choice', options=opts,
                             translation=f'{tag} · 课本第 {page} 页', **base)); nid += 1
            acc = set(it.get('acc', [])) | {ans, ans.lower(),
                    ans.replace('’', "'"), ans.replace("'", '’')}
            acc = sorted(acc)
            rows.append(dict(id=nid, drill_type='cloze', options=None,
                             translation=f'{tag}（手写）· 课本第 {page} 页',
                             acceptable_answers=acc, **base)); nid += 1

            # ---- 自检四条(U1 靠它抓到 4 处写错) ----
            no = [norm(x) for x in opts]
            if len(set(no)) != len(no):
                problems.append(f'U{m.UNIT-39} p{page} 选项归一化后重复: {opts}')
            if norm(ans) not in no:
                problems.append(f'U{m.UNIT-39} p{page} 答案不在选项内: {ans} / {opts}')
            for d in dis:
                if norm(d) == norm(ans):
                    problems.append(f'U{m.UNIT-39} p{page} 干扰项与答案同形: {d} vs {ans}')
            if norm(ans) not in [norm(a) for a in acc]:
                problems.append(f'U{m.UNIT-39} p{page} cloze 答案不在 acceptable 内: {ans}')
            if '______' not in it['q'] and '哪一句' not in it['q'] and '意思' not in it['q']:
                problems.append(f'U{m.UNIT-39} p{page} 题干没有空格也不是辨析题: {it["q"][:40]}')
    return rows, problems


def main():
    only = {int(a) for a in sys.argv[1:]} or None
    mods = load_units(only)
    if not mods:
        print('没有找到单元数据文件'); return
    rows, problems = build(mods)
    if problems:
        print('❌ 自检不通过, 未写库:')
        for p in problems[:40]:
            print('  ', p)
        print(f'共 {len(problems)} 处'); sys.exit(1)

    bank = json.load(open(BANK))
    sks = {f'u{m.UNIT-39}_exercise' for m in mods}
    kept = [d for d in bank['drills'] if d.get('skill_type') not in sks]
    bank['drills'] = kept + rows
    json.dump(bank, open(BANK, 'w'), ensure_ascii=False, indent=1)

    print(f'✅ 自检通过。本次写入 {len(rows)} 道, 题库 {len(kept)} → {len(bank["drills"])}')
    per = Counter(f'U{r["unit"]-39}' for r in rows)
    print('按单元:', dict(sorted(per.items(), key=lambda x: int(x[0][1:]))))


if __name__ == '__main__':
    main()

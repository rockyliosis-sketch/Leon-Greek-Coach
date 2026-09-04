/**
 * 复习单位（Review Unit）
 * ---------------------------------------------------------------
 * 从前每天的复习是按「课本页」抽的：一页平均只有 3–4 个词，抽 6 页只有 20 多个词，
 * 却要支撑 260 道题，于是八成题目只能从全库随机补 —— 首页说的和实际做的对不上。
 *
 * 现在改成按「单元」：
 *   - B 本（在学）：已学完的单元按单元；正在学的那个单元按页（只到今天上到的那一页）
 *   - A2：教材本身的 6 个单元（词库里已带真实单元号 31–36）
 *   - A1 儿童版两册：教材没有可靠的单元页码带，按固定页码区块切（20 页一块），
 *     界面上如实写「第 X–Y 页」，不假装成单元
 *
 * 一个复习单位的「学习日期」= 它最后一页被讲到的那天（= 学完那天），
 * 艾宾浩斯从那天开始算。
 */

import type { PageMark } from './pageProgress';
import { getPageDate, getBookFrontier } from './pageProgress';

/** 实在拿不到单元结构时的兜底：按多少页切一块 */
export const A1_BLOCK_SIZE = 20;

/** 某本书的单元页码带（A1 两册来自 a1_unit_map.json，A2 来自词库自带的真实单元号） */
export interface UnitBand { unit: number; pages: [number, number]; preface?: boolean }

/** 艾宾浩斯复习节点（天） */
export const EBBINGHAUS_DAYS = [0, 1, 2, 3, 4, 5, 7, 10, 15, 30, 60, 90];

/**
 * 各书在「今日复习」里的权重。
 * A2 刚学完、难度最大，家长要求优先复习 —— 权重最高，且每天保底占一席。
 */
export const BOOK_WEIGHT: Record<string, number> = {
  'A2': 3,
  'B1': 2,
  'B': 2,
  'A1-B': 1,
  'A1-A': 1,
};

export interface ReviewUnit {
  /** 唯一键，例如 A2#u#33 / B1#u#9 / B1#cur#12 / A1-A#b#3 */
  key: string;
  bookId: string;
  /** unit=教材真单元 · block=页码区块 · current=正在学的那个单元(按页) */
  kind: 'unit' | 'block' | 'current';
  /** 教材真单元号（kind=block 时为 null） */
  unitNo: number | null;
  /** 这个复习单位覆盖的课本页码 [起, 止]；没有页码信息时为 null */
  pages: [number, number] | null;
  /** 学完那天（YYYY-MM-DD） */
  studyDate: string;
  /** 属于它的词 id */
  wordIds: number[];
}

const PAGE_UNIT_BASE = 1000;

/** 词对象里取课本页码：优先 page_number，其次合成单元号(1000+页) */
const pageOf = (w: any): number | null => {
  if (typeof w.page_number === 'number' && w.page_number > 0) return w.page_number;
  if (typeof w.unit === 'number' && w.unit >= PAGE_UNIT_BASE) return w.unit - PAGE_UNIT_BASE;
  return null;
};

export interface BuildInput {
  /** 截至今天已解锁的词 */
  words: any[];
  /** 词 id -> 解锁日期 */
  activatedDates: Record<number, string>;
  /** 家长记的课堂进度 */
  marks: PageMark[];
  /** B 本教学大纲（单元号 + 页码区间） */
  syllabusB: any[];
  /** A1 两册的真实单元页码带（从课本文本还原）*/
  unitBands?: Record<string, UnitBand[]>;
  today: string;
}

/**
 * 把已解锁的词归拢成「复习单位」。
 * 只产出**已经学过**的单位；正在学的那个单元单独标成 kind='current'。
 */
export const buildReviewUnits = ({ words, activatedDates, marks, syllabusB, unitBands, today }: BuildInput): ReviewUnit[] => {
  const bandOf = (book: string, page: number): UnitBand | null => {
    const list = unitBands?.[book.toLowerCase()];
    if (!list) return null;
    return list.find(b => page >= b.pages[0] && page <= b.pages[1]) || null;
  };
  const buckets = new Map<string, { u: Omit<ReviewUnit, 'studyDate' | 'wordIds'>; ids: number[]; dates: string[] }>();

  const push = (
    key: string, bookId: string, kind: ReviewUnit['kind'],
    unitNo: number | null, pages: [number, number] | null,
    wordId: number, date: string
  ) => {
    let b = buckets.get(key);
    if (!b) { b = { u: { key, bookId, kind, unitNo, pages }, ids: [], dates: [] }; buckets.set(key, b); }
    b.ids.push(wordId);
    if (date && date !== 'LOCKED') b.dates.push(date);
    // 页码区间取并集，正在学的单元页码上界会随进度往后长
    if (pages && b.u.pages) {
      b.u.pages = [Math.min(b.u.pages[0], pages[0]), Math.max(b.u.pages[1], pages[1])];
    }
  };

  const frontierCache = new Map<string, number>();
  const frontierOf = (book: string) => {
    const k = book.toLowerCase();
    if (!frontierCache.has(k)) frontierCache.set(k, getBookFrontier(marks, k));
    return frontierCache.get(k)!;
  };

  words.forEach(w => {
    const date = activatedDates[w.id];
    if (!date || date === 'LOCKED' || date > today) return;
    const BOOK = String(w.book_id || '').toUpperCase();
    const page = pageOf(w);

    // --- B 本：按教学大纲的真单元；正在学的那个单元单独拎出来 ---
    if ((BOOK === 'B1' || BOOK === 'B') && page !== null) {
      const su = syllabusB.find((u: any) => page >= u.pages[0] && page <= u.pages[1]);
      if (su) {
        const front = frontierOf('b1');
        const done = front >= su.pages[1];
        const kind: ReviewUnit['kind'] = done ? 'unit' : 'current';
        const hi = done ? su.pages[1] : Math.max(su.pages[0], front);
        push(`${BOOK}#${done ? 'u' : 'cur'}#${su.unit}`, BOOK, kind, su.unit,
             [su.pages[0], hi], w.id, date);
        return;
      }
    }

    // --- A2：词库里已带真实单元号(31–36) ---
    if (BOOK === 'A2' && typeof w.unit === 'number' && w.unit > 0 && w.unit < PAGE_UNIT_BASE) {
      push(`A2#u#${w.unit}`, 'A2', 'unit', w.unit, page !== null ? [page, page] : null, w.id, date);
      return;
    }

    // --- A1 儿童版：用从课本文本还原出来的真实单元 ---
    // 从前这里只能按「20 页一块」切, 是因为照片 OCR 只认出零星几个单元锚点。
    // 现在压缩版教材里逐页保留的 Ενότητα 标题已经还原出完整的单元页码带
    // (scripts/ocr/build_a1_unit_map.py), 所以可以按真单元复习了。
    if (page !== null) {
      const band = bandOf(BOOK, page);
      if (band) {
        // unit=0 是单元 1 之前的部分(A1-A 前 48 页是字母表教学区), 单独成段
        push(`${BOOK}#u#${band.unit}`, BOOK, band.preface ? 'block' : 'unit',
             band.preface ? null : band.unit, [band.pages[0], band.pages[1]], w.id, date);
        return;
      }
    }

    // --- 兜底：连单元页码带都没有的书, 按页码区块 ---
    if (page !== null) {
      const bi = Math.floor((page - 1) / A1_BLOCK_SIZE);
      push(`${BOOK}#b#${bi}`, BOOK, 'block', null, [page, page], w.id, date);
      return;
    }

    // --- 兜底：还在用旧的「按单元解锁」的书 ---
    if (typeof w.unit === 'number') {
      push(`${BOOK}#u#${w.unit}`, BOOK, 'unit', w.unit, null, w.id, date);
    }
  });

  return [...buckets.values()].map(b => ({
    ...b.u,
    // 学完那天 = 这个单位里最后一页被讲到的日期
    studyDate: b.dates.length ? b.dates.reduce((a, c) => (c > a ? c : a)) : '',
    wordIds: b.ids,
  })).filter(u => !!u.studyDate);
};

export const daysBetween = (fromStr: string, toStr: string): number => {
  const p = (s: string) => {
    const a = s.split('-');
    return new Date(parseInt(a[0], 10), parseInt(a[1], 10) - 1, parseInt(a[2], 10), 0, 0, 0, 0);
  };
  if (!fromStr || !toStr) return -1;
  const d = p(fromStr), t = p(toStr);
  if (isNaN(d.getTime()) || isNaN(t.getTime())) return -1;
  return Math.round((t.getTime() - d.getTime()) / 86400000);
};

/** 今天是不是这个复习单位的艾宾浩斯复习节点 */
export const isUnitDue = (u: ReviewUnit, today: string): boolean => {
  const d = daysBetween(u.studyDate, today);
  return d >= 0 && EBBINGHAUS_DAYS.includes(d);
};

/**
 * 选出今天要复习的复习单位。
 *
 * 规则（按优先级）：
 *  1. 正在学的那个单元永远占第一席（「最近的复习」）
 *  2. A2 保底一席 —— 刚学完、最难，家长指定优先
 *  3. 其余席位按「久远度」分四档铺开（这是遗忘曲线要的覆盖面），
 *     每档内部：今天到期的优先 → 权重高的优先 → 按日期轮换，保证天天不重样
 */
export const pickDailyReviewUnits = (
  all: ReviewUnit[], today: string, count = 6
): ReviewUnit[] => {
  if (all.length === 0) return [];

  const byDate = [...all].sort((a, b) =>
    a.studyDate === b.studyDate ? a.key.localeCompare(b.key) : a.studyDate.localeCompare(b.studyDate));

  const t = today.split('-');
  const dayCount = Math.floor(
    new Date(parseInt(t[0], 10), parseInt(t[1], 10) - 1, parseInt(t[2], 10)).getTime() / 86400000);

  const picked: ReviewUnit[] = [];
  // 席位满了就不再收 —— 否则最后 slice(0,6) 会按日期截掉后面挑的, 把 A2 那一席砍没
  const take = (u?: ReviewUnit) => {
    if (picked.length >= count) return;
    if (u && !picked.some(p => p.key === u.key)) picked.push(u);
  };

  /** 档内排序：到期 > 权重 > 每日轮换 */
  const rank = (pool: ReviewUnit[], salt: number) =>
    [...pool].sort((a, b) => {
      const da = isUnitDue(a, today) ? 0 : 1, db = isUnitDue(b, today) ? 0 : 1;
      if (da !== db) return da - db;
      const wa = BOOK_WEIGHT[a.bookId.toUpperCase()] ?? 1;
      const wb = BOOK_WEIGHT[b.bookId.toUpperCase()] ?? 1;
      if (wa !== wb) return wb - wa;
      const ha = (a.key.length * 31 + dayCount + salt) % 97;
      const hb = (b.key.length * 31 + dayCount + salt) % 97;
      return ha - hb;
    });

  /** 每天从池子里轮换一个，保证连续几天不重复 */
  const rotate = (pool: ReviewUnit[], salt: number): ReviewUnit | undefined => {
    if (pool.length === 0) return undefined;
    const ranked = rank(pool, salt);
    const due = ranked.filter(u => isUnitDue(u, today));
    if (due.length) return due[(dayCount + salt) % due.length];
    return ranked[(dayCount + salt) % ranked.length];
  };

  const isA2 = (u: ReviewUnit) => u.bookId.toUpperCase() === 'A2';
  /**
   * 每本书一天最多两席。
   * 六个席位、四本书, 不封顶的话页数最多的那本(A1 第一分册有 10 个区块)会一口气占掉三四席,
   * 把 A2 和刚学完的 B 挤下去 —— 封成 2 就保证每天至少覆盖三本书。
   */
  const BOOK_MAX = 2;
  const bookCount = (u: ReviewUnit) =>
    picked.filter(p => p.bookId.toUpperCase() === u.bookId.toUpperCase()).length;

  // 1. 正在学的单元
  take(byDate.filter(u => u.kind === 'current').pop());
  // 没有「在学」标记时，退回最近学完的那个
  if (picked.length === 0) take(byDate[byDate.length - 1]);

  // 2. 最近学完的那个单元 —— 刚学完的东西忘得最快, 必须占一席
  take(byDate.filter(u => u.kind !== 'current' && !picked.some(p => p.key === u.key)).pop());

  // 3. A2 固定两席（刚学完、难度最大, 家长指定优先）
  take(rotate(byDate.filter(isA2), 7));
  take(rotate(byDate.filter(u => isA2(u) && !picked.some(p => p.key === u.key)), 13));

  // 4. 其余按久远度四档铺开
  const rest = () => byDate.filter(u =>
    !picked.some(p => p.key === u.key) && bookCount(u) < BOOK_MAX);
  const tierPick = (from: number, to: number, salt: number) => {
    const pool = rest();
    if (pool.length === 0) return;
    const lo = Math.max(0, Math.floor(pool.length * from));
    const hi = Math.max(lo, Math.min(pool.length - 1, Math.ceil(pool.length * to) - 1));
    take(rotate(pool.slice(lo, hi + 1), salt));
  };
  tierPick(0.35, 0.75, 2);   // 稍远
  tierPick(0.00, 0.35, 4);   // 最遥远
  tierPick(0.00, 0.35, 5);   // 最遥远

  // 还没满 6 个（学过的东西本来就少、或者书本数不够）就放开限额补齐
  const leftovers = byDate.filter(u => !picked.some(p => p.key === u.key));
  for (const u of rank(leftovers, 0)) {
    if (picked.length >= count) break;
    take(u);
  }

  // 由近及远排列，配合界面上「最近 → 最遥远」的版式
  return picked.slice(0, count).sort((a, b) =>
    b.studyDate.localeCompare(a.studyDate) || a.key.localeCompare(b.key));
};

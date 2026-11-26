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

/** 标准艾宾浩斯复习节点（天）：当天 → 次日 → 第2天 → 第4天 → 第7天 → 第15天 → 第30天 → 第60天 → 第90天 */
export const EBBINGHAUS_DAYS = [0, 1, 2, 4, 7, 15, 30, 60, 90];

/**
 * 各书在「今日复习」里的权重标记（保留导出兼容外部引用；A2 每天在 pickDailyReviewUnitsCore 中享有独立保底席位）。
 */
export const BOOK_WEIGHT: Record<string, number> = {
  'A2': 3,
  'B1': 2,
  'B': 2,
  'A1-B': 1,
  'A1-A': 1,
};

export interface ReviewUnit {
  /** 唯一键，例如 A2#u#33 / B1#u#9 / B1#cur#12 / 今日生词笔记#w#2026-11-23 */
  key: string;
  bookId: string;
  /** unit=教材真单元或周笔记批次 · block=页码区块 · current=正在学的那个单元(按页) */
  kind: 'unit' | 'block' | 'current';
  /** 教材真单元号（kind=block 时为 null） */
  unitNo: number | null;
  /** 这个复习单位覆盖的课本页码 [起, 止]；没有页码信息时为 null */
  pages: [number, number] | null;
  /** 学完那天（YYYY-MM-DD，桶内最晚日期） */
  studyDate: string;
  /** 桶内最早激活日期（供历史回溯精准判断某天该批次是否已存在） */
  firstDate?: string;
  /** 若为按周归拢的生词/笔记批次，记录其包含的所有具体录入日期，任一子日期命中节点即视为到期 */
  batchDates?: string[];
  /** 属于它的词 id */
  wordIds: number[];
}

const PAGE_UNIT_BASE = 1000;

/** 取某天所在自然周的周一（YYYY-MM-DD），供自定义生词/笔记按周独立成复习批次 */
const mondayOfISO = (dateStr: string): string => {
  const a = String(dateStr || '').split('-');
  if (a.length !== 3) return dateStr;
  const d = new Date(parseInt(a[0], 10), parseInt(a[1], 10) - 1, parseInt(a[2], 10));
  if (isNaN(d.getTime())) return dateStr;
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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
  const buckets = new Map<string, {
    u: Omit<ReviewUnit, 'studyDate' | 'wordIds' | 'firstDate' | 'batchDates'>;
    ids: number[];
    dates: string[];
    isNoteBatch?: boolean;
  }>();

  const push = (
    key: string, bookId: string, kind: ReviewUnit['kind'],
    unitNo: number | null, pages: [number, number] | null,
    wordId: number, date: string, isNoteBatch = false
  ) => {
    let b = buckets.get(key);
    if (!b) {
      b = { u: { key, bookId, kind, unitNo, pages }, ids: [], dates: [], isNoteBatch };
      buckets.set(key, b);
    }
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
    const date = w.note_date || activatedDates[w.id];
    if (!date || date === 'LOCKED' || date > today) return;
    const BOOK = String(w.book_id || '').toUpperCase();
    const page = pageOf(w);

    // --- 带 note_date 的自定义生词 / 课堂笔记 / 历史故事词：按「书目 + 自然周」独立成批次 ---
    // 解决旧版今日生词笔记(unit=101)/历史故事词汇(unit=103)全年堆进同一个单元、studyDate 天天重置的断层问题。
    if (w.note_date && page === null) {
      const wk = mondayOfISO(w.note_date);
      push(`${BOOK}#w#${wk}`, BOOK, 'unit', typeof w.unit === 'number' ? w.unit : null, null, w.id, w.note_date, true);
      return;
    }

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
    if (page !== null) {
      const band = bandOf(BOOK, page);
      if (band) {
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

  return [...buckets.values()].map(b => {
    const uniqDates = Array.from(new Set(b.dates)).sort();
    return {
      ...b.u,
      studyDate: uniqDates.length ? uniqDates[uniqDates.length - 1] : '',
      firstDate: uniqDates.length ? uniqDates[0] : '',
      batchDates: b.isNoteBatch ? uniqDates : undefined,
      wordIds: b.ids,
    };
  }).filter(u => !!u.studyDate);
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

/** 今天是不是这个复习单位的艾宾浩斯复习节点（周笔记批次内任一子日期命中即算到期） */
export const isUnitDue = (u: ReviewUnit, today: string): boolean => {
  if (u.batchDates && u.batchDates.length > 0) {
    return u.batchDates.some(dt => {
      const d = daysBetween(dt, today);
      return d >= 0 && EBBINGHAUS_DAYS.includes(d);
    });
  }
  const d = daysBetween(u.studyDate, today);
  return d >= 0 && EBBINGHAUS_DAYS.includes(d);
};

/** 对单元 key + 日期计数 + 盐值做 32 位雪崩哈希，解决旧版用 key.length 导致同书单元哈希恒等的问题 */
const unitDailyHash = (key: string, dayCount: number, salt: number): number => {
  let h = 2166136261 ^ Math.imul(dayCount + salt * 131, 2654435761);
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
};

const shiftDateISO = (dateStr: string, deltaDays: number): string => {
  const a = dateStr.split('-');
  const d = new Date(parseInt(a[0], 10), parseInt(a[1], 10) - 1, parseInt(a[2], 10));
  d.setDate(d.getDate() + deltaDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * 选出今天要复习的复习单位（默认 6 席）。
 *
 * 规则（按优先级）：
 *  1. 正在学的课本单元占第 1 席（「最近的复习」）
 *  2. A2 保底 1 席（刚学完、难度最大，6 个单元循环轮转）
 *  3. 其余 4 席按「久远度四分位（75–100% 近期 / 50–75% 中近 / 25–50% 中远 / 0–25% 远期）」无死角全覆盖，
 *     彻底消除旧版漏掉 [75%, 100%] 导致 B1 已结课单元与近期课堂笔记永远抽不到的盲区。
 *  4. 每档内部：今天命中艾宾浩斯节点的优先 → 前 2 天没选过的优先 → 32 位雪崩哈希公平轮转（不再用静态书本权重锁死顺序）。
 */
const pickDailyReviewUnitsCore = (
  all: ReviewUnit[], today: string, count: number, avoidKeys: Set<string>
): ReviewUnit[] => {
  // 严格过滤掉在 today 之后才产生的单元，确保历史回溯（t-1 / t-2 / t-3）绝不被当天新录词篡改
  const eligible = all.filter(u => {
    const start = u.firstDate || u.studyDate;
    return !!start && start <= today;
  });
  if (eligible.length === 0) return [];

  const byDate = [...eligible].sort((a, b) =>
    a.studyDate === b.studyDate ? a.key.localeCompare(b.key) : a.studyDate.localeCompare(b.studyDate));

  const t = today.split('-');
  const dayCount = Math.floor(
    new Date(parseInt(t[0], 10), parseInt(t[1], 10) - 1, parseInt(t[2], 10)).getTime() / 86400000);

  const picked: ReviewUnit[] = [];
  const take = (u?: ReviewUnit) => {
    if (picked.length >= count) return;
    if (u && !picked.some(p => p.key === u.key)) picked.push(u);
  };

  /** 档内排序：艾宾浩斯到期 > 避开前两天已选 > 32 位每日雪崩哈希公平轮转 */
  const rank = (pool: ReviewUnit[], salt: number) =>
    [...pool].sort((a, b) => {
      const da = isUnitDue(a, today) ? 0 : 1, db = isUnitDue(b, today) ? 0 : 1;
      if (da !== db) return da - db;
      const aa = avoidKeys.has(a.key) ? 1 : 0, ab = avoidKeys.has(b.key) ? 1 : 0;
      if (aa !== ab) return aa - ab;
      return unitDailyHash(a.key, dayCount, salt) - unitDailyHash(b.key, dayCount, salt);
    });

  const rotate = (pool: ReviewUnit[], salt: number): ReviewUnit | undefined => {
    if (pool.length === 0) return undefined;
    return rank(pool, salt)[0];
  };

  const isA2 = (u: ReviewUnit) => u.bookId.toUpperCase() === 'A2';
  /** 每本书一天最多两席，保证每天覆盖多个阶段与书目 */
  const BOOK_MAX = 2;
  const bookCount = (u: ReviewUnit) =>
    picked.filter(p => p.bookId.toUpperCase() === u.bookId.toUpperCase()).length;

  // 1. 正在学的单元占第 1 席
  take(byDate.filter(u => u.kind === 'current').pop());
  if (picked.length === 0) take(byDate[byDate.length - 1]);

  // 2. A2 保底 1 席（6 个单元按到期与前两天避重循环轮转）
  take(rotate(byDate.filter(isA2), 7));

  // 3. 其余 4 席严格覆盖 [0%, 100%] 四个久远度四分位（由近及远：近期 / 中近 / 中远 / 最远），零盲区
  const rest = () => byDate.filter(u =>
    !picked.some(p => p.key === u.key) && bookCount(u) < BOOK_MAX);
  const tierPick = (from: number, to: number, salt: number) => {
    const pool = rest();
    if (pool.length === 0) return;
    const lo = Math.max(0, Math.floor(pool.length * from));
    const hi = Math.max(lo, Math.min(pool.length - 1, Math.ceil(pool.length * to) - 1));
    take(rotate(pool.slice(lo, hi + 1), salt));
  };
  tierPick(0.75, 1.00, 1);   // 近期巩固（最近学完的 B1 单元、近期笔记/生词批次）
  tierPick(0.50, 0.75, 2);   // 稍近过渡（初秋 B1 / 课堂笔记 / A2 到期单元）
  tierPick(0.25, 0.50, 3);   // 稍远记忆（A1 第二分册）
  tierPick(0.00, 0.25, 4);   // 远期唤醒（A1 第一分册）

  // 还没满 count 个时放开书本限额兜底补齐
  const leftovers = byDate.filter(u => !picked.some(p => p.key === u.key));
  for (const u of rank(leftovers, 0)) {
    if (picked.length >= count) break;
    take(u);
  }

  // 由近及远排列，配合界面上「最近 → 最遥远」的版式
  return picked.slice(0, count).sort((a, b) =>
    b.studyDate.localeCompare(a.studyDate) || a.key.localeCompare(b.key));
};

export const pickDailyReviewUnits = (
  all: ReviewUnit[], today: string, count = 6
): ReviewUnit[] => {
  if (all.length === 0) return [];
  // 先递推前 2 天选出过的非在学单元，今天优先避开，实现「由远及近各梯度每日滚动更新」
  const avoidKeys = new Set<string>();
  const d2 = shiftDateISO(today, -2);
  const p2 = pickDailyReviewUnitsCore(all, d2, count, new Set());
  p2.forEach(u => { if (u.kind !== 'current') avoidKeys.add(u.key); });
  const d1 = shiftDateISO(today, -1);
  const p1 = pickDailyReviewUnitsCore(all, d1, count, avoidKeys);
  p1.forEach(u => { if (u.kind !== 'current') avoidKeys.add(u.key); });

  return pickDailyReviewUnitsCore(all, today, count, avoidKeys);
};

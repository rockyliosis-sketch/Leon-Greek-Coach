/**
 * 内置学习时间轴
 * ---------------------------------------------------------------
 * 家长口述的事实（2026-09-04）：
 *   「我从去年 9 月 10 号开始学习希腊语，每周 4 节课，
 *     到今年 8 月 25 日 A2 连考试带学习彻底学完。整体来说时间还是比较平均的。」
 *
 * 这三本书已经学完了，家长没有理由再回头一页一页补记进度 —— 所以时间轴直接内置，
 * 不需要任何人在后台填。B 本还在学，仍然以家长每次课记的页码进度为准。
 *
 * 排法：三本书按**页数占比**分掉这 349 天（页数多的占的时间长），
 * 每本书内部再按单元的结束页线性推算「这个单元是哪天学完的」。
 * 艾宾浩斯就是从这个「学完那天」开始算的。
 */

export const STUDY_START = '2025-09-10';
export const A2_FINISH  = '2026-08-25';

/** 学习顺序 + 各书页码范围 */
export const BOOK_ORDER: Array<{ id: string; from: number; to: number }> = [
  { id: 'a1-a', from: 10, to: 191 },
  { id: 'a1-b', from: 6,  to: 174 },
  { id: 'a2',   from: 16, to: 151 },
];

const parse = (s: string) => {
  const a = s.split('-');
  return new Date(parseInt(a[0], 10), parseInt(a[1], 10) - 1, parseInt(a[2], 10), 0, 0, 0, 0);
};
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 每本书分到的日期窗口（按页数占比） */
export const BOOK_WINDOW: Record<string, { start: string; end: string; from: number; to: number }> = (() => {
  const t0 = parse(STUDY_START), t1 = parse(A2_FINISH);
  const totalDays = Math.round((t1.getTime() - t0.getTime()) / 86400000);
  const totalPages = BOOK_ORDER.reduce((a, b) => a + (b.to - b.from + 1), 0);
  const out: Record<string, any> = {};
  let cursor = 0;
  BOOK_ORDER.forEach(b => {
    const n = b.to - b.from + 1;
    const span = Math.round(totalDays * n / totalPages);
    out[b.id] = {
      start: fmt(new Date(t0.getTime() + cursor * 86400000)),
      end:   fmt(new Date(t0.getTime() + (cursor + span) * 86400000)),
      from: b.from, to: b.to,
    };
    cursor += span;
  });
  return out;
})();

/**
 * 内置时间轴下，某本书的第 N 页是哪天讲到的。
 * 不在时间轴里的书（B 本）返回 null，交给家长记的课堂进度。
 */
export const builtinPageDate = (bookId: string, page: number): string | null => {
  const w = BOOK_WINDOW[String(bookId).toLowerCase()];
  if (!w) return null;
  const p = Math.min(w.to, Math.max(w.from, page));
  const t0 = parse(w.start), t1 = parse(w.end);
  const span = Math.round((t1.getTime() - t0.getTime()) / 86400000);
  const ratio = (p - w.from + 1) / (w.to - w.from + 1);
  return fmt(new Date(t0.getTime() + Math.round(span * ratio) * 86400000));
};

/** 这本书走不走内置时间轴 */
export const hasBuiltinCalendar = (bookId: string) => !!BOOK_WINDOW[String(bookId).toLowerCase()];

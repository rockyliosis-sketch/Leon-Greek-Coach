/**
 * 按课本页码的学习进度模型
 * ---------------------------------------------------------------
 * 为什么不再按「单元」：一个单元要学两三周，家长在单元学完前无法勾选；
 * 一勾选又是整个单元一次性放开，做题内容和课上进度对不上。
 *
 * 新模型：家长每次课后记一笔「今天上到第几页」。
 *   - 每一页因此都有了「被讲到的日期」
 *   - 每个词按它在书里**首次出现**的那一页解锁
 *   - 艾宾浩斯复习锚点挂在页上，而不是整个单元上
 */

export interface PageMark {
  id: string;          // 唯一键，用于删除
  date: string;        // YYYY-MM-DD，这次课的日期
  bookId: string;      // a1-a / a1-b / a2 / b1
  upToPage: number;    // 这次课上到第几页（含）
  note?: string;
}

export interface V2Word {
  id: number;
  book_id: string;
  unit: number | null;
  page_number: number;   // 书内首次出现的页
  pages: number[];       // 出现过的所有页
  word_greek: string;
  headword: string;
  word_chinese: string;
  word_english?: string;
  pronunciation?: string;
  pos?: string;
  match?: string;        // exact / stem / lambda
  zh_source?: string;    // official / xref / claude
  occurrences?: number;
}

export const LOCKED = 'LOCKED';

/** 同一本书的进度点，按页码升序；同页多次记录取最早日期 */
export const normalizeMarks = (marks: PageMark[], bookId: string): PageMark[] => {
  const mine = marks.filter(m => m.bookId === bookId && m.upToPage > 0 && !!m.date);
  const byPage = new Map<number, PageMark>();
  mine.forEach(m => {
    const cur = byPage.get(m.upToPage);
    if (!cur || m.date < cur.date) byPage.set(m.upToPage, m);
  });
  return [...byPage.values()].sort((a, b) => a.upToPage - b.upToPage);
};

/** 某本书目前教到第几页（没有记录则返回 0） */
export const getBookFrontier = (marks: PageMark[], bookId: string): number => {
  const s = normalizeMarks(marks, bookId);
  return s.length ? Math.max(...s.map(m => m.upToPage)) : 0;
};

/**
 * 某一页是哪天被讲到的。
 * 规则：第一个「上到页数 >= 该页」的记录，它的日期就是这一页的学习日期。
 * 还没讲到 → null（锁住）
 */
export const getPageDate = (marks: PageMark[], bookId: string, page: number): string | null => {
  const s = normalizeMarks(marks, bookId);
  for (const m of s) if (m.upToPage >= page) return m.date;
  return null;
};

/**
 * 词 -> 激活日期。只处理有进度记录的书；其余书返回空，交给旧的按单元逻辑。
 */
export const resolveActivationByPage = (
  words: V2Word[],
  marks: PageMark[]
): Record<number, string> => {
  const books = new Set(marks.map(m => m.bookId));
  const out: Record<number, string> = {};
  const cache = new Map<string, string | null>();
  words.forEach(w => {
    if (!books.has(w.book_id)) return;
    const k = `${w.book_id}#${w.page_number}`;
    let d = cache.get(k);
    if (d === undefined) { d = getPageDate(marks, w.book_id, w.page_number); cache.set(k, d); }
    out[w.id] = d ?? LOCKED;
  });
  return out;
};

/** 落在某个页码区间内的词（供出题时限定范围用） */
export const wordsInPageRange = (words: V2Word[], bookId: string, from: number, to: number) =>
  words.filter(w => w.book_id === bookId && w.pages.some(p => p >= from && p <= to));

/** 已解锁的词（截至某天） */
export const unlockedWords = (words: V2Word[], marks: PageMark[], onDate: string) => {
  const act = resolveActivationByPage(words, marks);
  return words.filter(w => {
    const d = act[w.id];
    return !!d && d !== LOCKED && d <= onDate;
  });
};

export const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const makeMarkId = () => `pm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

/** 各书的页码范围（来自教材重建，用于输入校验与滑块上下界） */
export const BOOK_PAGE_RANGE: Record<string, { min: number; max: number; name: string }> = {
  'a1-a': { min: 10, max: 191, name: 'A1 第一分册（儿童版）' },
  'a1-b': { min: 6,  max: 174, name: 'A1 第二分册（儿童版）' },
  'a2':   { min: 16, max: 151, name: 'A2（ΚΛΙΚ Α2）' },
  'b1':   { min: 8,  max: 356, name: 'B（Ελληνικά Β΄）' },
};

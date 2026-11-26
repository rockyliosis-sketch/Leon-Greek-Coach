import catalogData from '../data/school_textbooks_catalog.json';
import historyCatalogData from '../data/history_catalog.json';
import type { G3GlossaProgressState } from '../dbService';

export interface TextbookMeta {
  id: string;
  code: string;
  subject: string;
  grade: number;
  isWorkbook: boolean;
  volume: string;
  shortTitle: string;
  zhTitle: string;
  origTitle: string;
  coverUrl: string;
  minPage: number;
  maxPage: number;
}

export interface WorkbookLinkItem {
  tb: [number, number];
  wbId: string;
  wb: [number, number];
  title: string;
}

export interface G3ChallengeLesson {
  id: string;
  title: string;
  tb: [number, number];
  wb: [number, number];
}

export interface G3ChallengeUnit {
  unitId: string;
  unitNo: number;
  titleEl: string;
  titleZh: string;
  tbId: string;
  wbId: string;
  lessons: G3ChallengeLesson[];
}

export interface WordAssistResult {
  lemma: string;
  chinese: string;
  formNote: string;
  usageTip: string;
}

export interface PreviewGuideResult {
  storyHook: string;
  writeOnBookWords: Array<{
    word: string;
    lemma: string;
    chinese: string;
    why: string;
  }>;
  thinkPrompts: string[];
  keyPointsForCheck: string[];
}

export interface ReviewCoachQuizItem {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface ReviewCoachResult {
  corePoints: Array<{ title: string; detail: string }>;
  quiz: ReviewCoachQuizItem[];
}

export interface ExerciseExplainResult {
  items: Array<{
    title: string;
    instructionZh: string;
    grammarFocus: string;
    howToSolve: string;
    exampleHint: string;
  }>;
}

const ALL_BOOKS: TextbookMeta[] = (catalogData as any).books || [];
const WORKBOOK_LINKS: Record<string, WorkbookLinkItem[]> = (catalogData as any).workbookLinks || {};
const G3_CHALLENGE_RAW = (catalogData as any).g3GlossaChallenge || { shuffledUnitOrder: [], units: [] };

export const G3_UNITS: G3ChallengeUnit[] = G3_CHALLENGE_RAW.units || [];
export const G3_SHUFFLED_UNIT_ORDER: string[] = G3_CHALLENGE_RAW.shuffledUnitOrder || [];

const bookPagesMemoryCache = new Map<string, Record<string, string>>();
const bookPagesInflight = new Map<string, Promise<Record<string, string>>>();

export function getAllBooks(): TextbookMeta[] {
  return ALL_BOOKS;
}

export function getBookById(bookId?: string | null): TextbookMeta | null {
  if (!bookId) return null;
  return ALL_BOOKS.find((b) => b.id === bookId) || null;
}

/** 根据科目名称返回可选的课本或练习册列表（默认把四年级排在前面，三年级排在后面） */
export function getBooksForSubject(subjectRaw: string, isWorkbook: boolean): TextbookMeta[] {
  const cleanSubj = String(subjectRaw || '').replace(/\s*练习册$/, '').trim();
  if (!cleanSubj) return [];
  return ALL_BOOKS.filter((b) => b.subject === cleanSubj && b.isWorkbook === isWorkbook).sort(
    (a, b) => b.grade - a.grade
  );
}

/** 根据私教课下拉框名称匹配教材 ID */
export function getTutorBookId(tutorBookLabel?: string): string | null {
  const s = String(tutorBookLabel || '');
  if (s.includes('B 本') || s.includes('Ελληνικά Β')) return 'tutor-b';
  if (s.includes('A2')) return 'tutor-a2';
  return null;
}

/** 获取某个科目的默认推荐书册 ID */
export function getDefaultBookIdForSubject(
  subjectRaw: string,
  isWorkbook: boolean,
  savedMap?: Record<string, string>
): string | null {
  const cleanSubj = String(subjectRaw || '').replace(/\s*练习册$/, '').trim();
  const candidates = getBooksForSubject(cleanSubj, isWorkbook);
  if (candidates.length === 0) return null;
  const saved = savedMap?.[cleanSubj];
  if (saved && candidates.some((c) => c.id === saved)) {
    return saved;
  }
  return candidates[0].id;
}

/** 按需拉取某本书的全部印刷页内容（内存缓存，二次读取 0 毫秒） */
export async function loadBookPages(bookId: string): Promise<Record<string, string>> {
  if (bookPagesMemoryCache.has(bookId)) {
    return bookPagesMemoryCache.get(bookId)!;
  }
  if (bookPagesInflight.has(bookId)) {
    return bookPagesInflight.get(bookId)!;
  }
  const p = fetch(`/textbooks/${encodeURIComponent(bookId)}.json`)
    .then(async (res) => {
      if (!res.ok) throw new Error(`加载课本数据失败 (${res.status})`);
      const data = await res.json();
      const pages = (data?.pages || {}) as Record<string, string>;
      bookPagesMemoryCache.set(bookId, pages);
      bookPagesInflight.delete(bookId);
      return pages;
    })
    .catch((err) => {
      bookPagesInflight.delete(bookId);
      throw err;
    });
  bookPagesInflight.set(bookId, p);
  return p;
}

/** 根据课本与页码区间，自动查找配套练习册与对应页码 */
export function findPairedWorkbook(
  bookId: string,
  fromPage: number,
  toPage: number
): { wbBook: TextbookMeta; wbFrom: number; wbTo: number; unitTitle: string } | null {
  const links = WORKBOOK_LINKS[bookId];
  if (!links || links.length === 0) return null;

  const hits = links.filter((lk) => lk.tb[0] <= toPage && lk.tb[1] >= fromPage);
  if (hits.length === 0) {
    // 找距离最近的一课
    let best = links[0];
    let bestDist = 9999;
    for (const lk of links) {
      const d = Math.min(Math.abs(lk.tb[0] - fromPage), Math.abs(lk.tb[1] - fromPage));
      if (d < bestDist) {
        bestDist = d;
        best = lk;
      }
    }
    if (bestDist <= 3) {
      const wbBook = getBookById(best.wbId);
      if (wbBook) {
        return { wbBook, wbFrom: best.wb[0], wbTo: best.wb[1], unitTitle: best.title };
      }
    }
    return null;
  }

  const first = hits[0];
  const wbBook = getBookById(first.wbId);
  if (!wbBook) return null;
  const wbFrom = Math.min(...hits.map((h) => h.wb[0]));
  const wbTo = Math.max(...hits.map((h) => h.wb[1]));
  return {
    wbBook,
    wbFrom,
    wbTo,
    unitTitle: first.title,
  };
}

/** 若当前选中的是三/四年级历史课本，自动匹配对应的历史故事馆音频课程 */
export function findLinkedHistoryStories(
  bookId: string,
  fromPage: number,
  toPage: number
): Array<{ id: string; titleZh: string; titleEl: string; grade: number }> {
  if (bookId !== 'g4-istoria' && bookId !== 'g3-istoria') return [];
  const grade = bookId === 'g4-istoria' ? 4 : 3;
  const units = ((historyCatalogData as any).units || []).filter((u: any) => u.grade === grade);
  const matched: Array<{ id: string; titleZh: string; titleEl: string; grade: number }> = [];

  for (const u of units) {
    for (const ls of u.lessons || []) {
      const pagesStr = String(ls.pages || ls.bookPages || '');
      const nums = (pagesStr.match(/\d+/g) || []).map(Number);
      if (nums.length > 0) {
        const pMin = Math.min(...nums);
        const pMax = Math.max(...nums);
        if (pMin <= toPage + 1 && pMax >= fromPage - 1) {
          matched.push({
            id: ls.id,
            titleZh: ls.titleZh || ls.title || '',
            titleEl: ls.titleEl || '',
            grade,
          });
        }
      }
    }
  }
  return matched.slice(0, 3);
}

/** 计算三年级《语言》跳单元闯关的当前目标单元与当前小课 */
export function computeG3ChallengeSummary(
  progress: G3GlossaProgressState | undefined,
  todayStr: string
): {
  orderedUnits: G3ChallengeUnit[];
  totalUnits: number;
  completedUnitsCount: number;
  totalLessons: number;
  completedLessonsCount: number;
  currentUnit: G3ChallengeUnit;
  currentLesson: G3ChallengeLesson;
  lessonIndexInUnit: number;
  completedTodayLessonId: string | null;
  allFinished: boolean;
} {
  const completedLessons = new Set(progress?.completedLessonIds || []);
  const orderedUnits: G3ChallengeUnit[] = [];
  const unitMap = new Map(G3_UNITS.map((u) => [u.unitId, u]));

  for (const uid of G3_SHUFFLED_UNIT_ORDER) {
    const u = unitMap.get(uid);
    if (u) orderedUnits.push(u);
  }
  for (const u of G3_UNITS) {
    if (!orderedUnits.some((x) => x.unitId === u.unitId)) {
      orderedUnits.push(u);
    }
  }

  const totalUnits = orderedUnits.length;
  const totalLessons = orderedUnits.reduce((acc, u) => acc + u.lessons.length, 0);
  const completedUnitsCount = orderedUnits.filter((u) =>
    u.lessons.every((l) => completedLessons.has(l.id))
  ).length;
  const completedLessonsCount = orderedUnits.reduce(
    (acc, u) => acc + u.lessons.filter((l) => completedLessons.has(l.id)).length,
    0
  );

  const completedTodayLessonId = progress?.dailyCompletedLesson?.[todayStr] || null;

  // 若今天刚完成过一课，默认定位展示今天已通关的那一课（同时支持点「再挑战下一课」）
  if (completedTodayLessonId) {
    for (const u of orderedUnits) {
      const idx = u.lessons.findIndex((l) => l.id === completedTodayLessonId);
      if (idx >= 0) {
        return {
          orderedUnits,
          totalUnits,
          completedUnitsCount,
          totalLessons,
          completedLessonsCount,
          currentUnit: u,
          currentLesson: u.lessons[idx],
          lessonIndexInUnit: idx,
          completedTodayLessonId,
          allFinished: completedLessonsCount >= totalLessons,
        };
      }
    }
  }

  // 按乱序单元队列，找到第一个尚未通关的单元，并取其中第一节尚未通关的小课
  for (const u of orderedUnits) {
    const idx = u.lessons.findIndex((l) => !completedLessons.has(l.id));
    if (idx >= 0) {
      return {
        orderedUnits,
        totalUnits,
        completedUnitsCount,
        totalLessons,
        completedLessonsCount,
        currentUnit: u,
        currentLesson: u.lessons[idx],
        lessonIndexInUnit: idx,
        completedTodayLessonId,
        allFinished: false,
      };
    }
  }

  const fallbackUnit = orderedUnits[0];
  return {
    orderedUnits,
    totalUnits,
    completedUnitsCount,
    totalLessons,
    completedLessonsCount,
    currentUnit: fallbackUnit,
    currentLesson: fallbackUnit.lessons[0],
    lessonIndexInUnit: 0,
    completedTodayLessonId,
    allFinished: true,
  };
}

// ---------------------------------------------------------------------------
// Local Cache + /api/textbook-assist Client
// ---------------------------------------------------------------------------

const ASSIST_CACHE_KEY = 'leon_tb_assist_cache_v1';

function readAssistCache(): Record<string, any> {
  try {
    const raw = localStorage.getItem(ASSIST_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAssistCache(key: string, val: any) {
  try {
    const cur = readAssistCache();
    cur[key] = val;
    const keys = Object.keys(cur);
    if (keys.length > 220) {
      delete cur[keys[0]];
    }
    localStorage.setItem(ASSIST_CACHE_KEY, JSON.stringify(cur));
  } catch {}
}

export async function callTextbookAssist<T = any>(
  cacheKey: string,
  payload: Record<string, any>
): Promise<T> {
  const cached = readAssistCache()[cacheKey];
  if (cached) return cached as T;

  const resp = await fetch('/api/textbook-assist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || !json?.data) {
    throw new Error(json?.error || `智能助教请求失败 (HTTP ${resp.status})`);
  }
  writeAssistCache(cacheKey, json.data);
  return json.data as T;
}

/** 朗读希腊语或英语单词/短句 */
export function speakTextbookWord(text: string, isEnglish = false) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const hasGreek = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(text);
    u.lang = hasGreek ? 'el-GR' : isEnglish ? 'en-GB' : 'el-GR';
    u.rate = 0.88;
    window.speechSynthesis.speak(u);
  } catch {}
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FolderOpen,
  Headphones,
  Loader2,
  Plus,
  RotateCw,
  Volume2,
  X,
} from 'lucide-react';
import type { CircledBookWord, TextbookPreferencesState } from '../dbService';
import {
  findVocabSuggestions,
  getMondayDateStr,
  getWeeklyNoteUnit,
  normalizeGreekKey,
  stripLeadingArticleParens,
  validateNewVocabEntry,
} from '../lib/dailyMissionHelpers';
import {
  callTextbookAssist,
  findLinkedHistoryStories,
  findPairedWorkbook,
  getBookById,
  getBooksForSubject,
  getDefaultBookIdForSubject,
  loadBookPages,
  peekTextbookAssistCache,
  speakTextbookWord,
  type ExerciseExplainResult,
  type PreviewGuideResult,
  type ReviewCoachResult,
  type TextbookMeta,
  type WordAssistResult,
} from '../lib/textbookService';
import { GeminiBadge, GeminiStarIcon } from './GeminiBadge';

export type ViewerMode = 'review' | 'preview' | 'workbook';

interface InteractiveTextbookViewerProps {
  mode: ViewerMode;
  subject: string;
  isWorkbook?: boolean;
  explicitBookId?: string | null;
  fromPage: number;
  toPage: number;
  todayStr: string;
  customVocab: any[];
  unitStudyDates: Record<string, string>;
  textbookPrefs?: TextbookPreferencesState;
  studentSummary?: string;
  onSelectBookId?: (bookId: string) => void;
  onSaveVocab: (nextCustomVocab: any[], nextUnitDates: Record<string, string>, addedCount: number) => void;
  onUpdateTextbookPrefs?: (nextPrefs: TextbookPreferencesState) => void;
  onPreviewKeyPointsReady?: (points: string[]) => void;
}

const WORD_SPLIT_RE = /([A-Za-z\u0370-\u03FF\u1F00-\u1FFFάέήίόύώϊϋΐΰΆΈΉΊΌΎΏΪΫ’']+)/g;
const IS_CLICKABLE_WORD_RE = /^[A-Za-z\u0370-\u03FF\u1F00-\u1FFFάέήίόύώϊϋΐΰΆΈΉΊΌΎΏΪΫ’']{2,}$/;

type SectionThemeKind =
  | 'unit_banner'
  | 'grammar'
  | 'speaking'
  | 'vocab_box'
  | 'true_false'
  | 'qa_exercise'
  | 'role_play'
  | 'history_source'
  | 'crossword'
  | 'reading';

interface SectionThemeMeta {
  kind: SectionThemeKind;
  emoji: string;
  badgeLabel: string;
  zhHint: string;
  bg: string;
  border: string;
  headerBg: string;
  accent: string;
}

const SECTION_THEMES: Record<SectionThemeKind, SectionThemeMeta> = {
  unit_banner: {
    kind: 'unit_banner',
    emoji: '📘',
    badgeLabel: '单元 / 章节导览',
    zhHint: '本单元主题与核心学习目标',
    bg: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
    border: '#93c5fd',
    headerBg: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)',
    accent: '#1e40af',
  },
  grammar: {
    kind: 'grammar',
    emoji: '🔍',
    badgeLabel: '语法放大镜',
    zhHint: '观察下面的词形变化规律（阳 / 阴 / 中性或变位）与地道例句，点词可看拆解',
    bg: '#faf5ff',
    border: '#d8b4fe',
    headerBg: '#f3e8ff',
    accent: '#6b21a8',
  },
  speaking: {
    kind: 'speaking',
    emoji: '🗣️',
    badgeLabel: '地道口语表达框',
    zhHint: '课本教你日常交际时这样说，点击任意词即可听标准发音',
    bg: '#f0fdfa',
    border: '#99f6e4',
    headerBg: '#ccfbf1',
    accent: '#0f766e',
  },
  vocab_box: {
    kind: 'vocab_box',
    emoji: '🗂️',
    badgeLabel: '本页核心生词宝盒',
    zhHint: '课本列出的本节重点生词，点击任意词卡即可看中文释义并一键入库',
    bg: '#fffbeb',
    border: '#fde68a',
    headerBg: '#fef3c7',
    accent: '#b45309',
  },
  true_false: {
    kind: 'true_false',
    emoji: '✅',
    badgeLabel: '判断对错练习',
    zhHint: '对照课文内容，判断每句话是对（Σωστό）还是错（Λάθος）',
    bg: '#f0f9ff',
    border: '#bae6fd',
    headerBg: '#e0f2fe',
    accent: '#0369a1',
  },
  qa_exercise: {
    kind: 'qa_exercise',
    emoji: '🙋',
    badgeLabel: '课堂问答与动笔练习',
    zhHint: '读懂题目要求后用希腊语口头回答或在纸质书上动笔完成（不懂可点上方 Gemini 讲题）',
    bg: '#f8fafc',
    border: '#cbd5e1',
    headerBg: '#e2e8f0',
    accent: '#1e3a8a',
  },
  role_play: {
    kind: 'role_play',
    emoji: '🎭',
    badgeLabel: '双人情景角色扮演',
    zhHint: '课本情景对话练习（Ρόλος Α / Ρόλος Β），看看双方各自要表达什么',
    bg: '#fdf2f8',
    border: '#fbcfe8',
    headerBg: '#fce7f3',
    accent: '#9d174d',
  },
  history_source: {
    kind: 'history_source',
    emoji: '📜',
    badgeLabel: '古籍史料选段',
    zhHint: '课本引用的古代历史学家原文或考古铭文证据（Παράθεμα）',
    bg: '#fefce8',
    border: '#fde047',
    headerBg: '#fef9c3',
    accent: '#854d0e',
  },
  crossword: {
    kind: 'crossword',
    emoji: '🧩',
    badgeLabel: '趣味填字游戏线索',
    zhHint: '根据横向（Οριζόντια）/ 纵向（Κάθετα）线索猜出对应希腊语单词',
    bg: '#eff6ff',
    border: '#bfdbfe',
    headerBg: '#dbeafe',
    accent: '#1d4ed8',
  },
  reading: {
    kind: 'reading',
    emoji: '📖',
    badgeLabel: '课文阅读与对话',
    zhHint: '直接点击文中任意不懂的词，右侧小窗即刻显示发音、词义与入库按钮',
    bg: '#ffffff',
    border: '#e2e8f0',
    headerBg: '#f8fafc',
    accent: '#334155',
  },
};

function detectHeadingTheme(rawHeading: string): SectionThemeKind | null {
  const h = rawHeading.replace(/^#{1,4}\s*/, '').replace(/\*\*/g, '').trim();
  if (/^(?:ΕΝΟΤΗΤΑ|Ενότητα|\d+\s*ΕΝΟΤΗΤΑ|\d+\s*ενότητα|ΚΕΦΑΛΑΙΟ|Κεφάλαιο|Unit\s+\d+|Lesson\s+\d+)/i.test(h)) {
    return 'unit_banner';
  }
  if (/Για\s+δες|Γραμματική|αντωνυμίες|ρήματα|ουσιαστικά|επίθετα|Αόριστος|Ενεστώτας|Παρατατικός/i.test(h)) {
    return 'grammar';
  }
  if (/Πώς\s+το\s+λένε/i.test(h)) {
    return 'speaking';
  }
  if (/Λέξεις,\s*λέξεις|Λεξιλόγιο/i.test(h)) {
    return 'vocab_box';
  }
  if (/Σωστό\s+ή\s+λάθος/i.test(h)) {
    return 'true_false';
  }
  if (/Παίζω\s+έναν\s+ρόλο/i.test(h)) {
    return 'role_play';
  }
  if (/παράθεμα/i.test(h)) {
    return 'history_source';
  }
  if (/^(?:Οριζόντια|Κάθετα)$/i.test(h) || /σταυρόλεξο/i.test(h)) {
    return 'crossword';
  }
  if (/Απαντάω|Η\s+σειρά\s+μου\s+τώρα|Σκέφτομαι\s+και\s+γράφω|Warm\s*[–-]\s*up|Listen,\s*read|练习题/i.test(h)) {
    return 'qa_exercise';
  }
  return null;
}

/** Strip raw Markdown syntax (`#`, `**`, `* •`, `[Unit X]`) for clean 1-line folded page preview */
function extractPagePreviewSnippet(pageText: string): string {
  if (!pageText || pageText.includes('*(本页为空白页或纯插图页)*')) {
    return '🖼️ 纯插图页 / 过渡页';
  }
  const lines = pageText
    .split('\n')
    .map((l) =>
      l
        .replace(/^#{1,4}\s*/, '')
        .replace(/^>\s*(?:📌\s*)?/, '')
        .replace(/^\*\s*•\s*/, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\[✏️ 纸质书作答横线\]/g, '')
        .replace(/\[Unit\s*\d+\]/gi, '')
        .replace(/\s*\|\s*/g, ' · ')
        .trim()
    )
    .filter((l) => l.length >= 2 && !/^[-:|]+$/.test(l));

  if (lines.length === 0) return '📖 点击展开本页内容';
  const joined = lines.slice(0, 2).join(' · ');
  return joined.length > 58 ? `${joined.slice(0, 58)}…` : joined;
}

/** Parse a glossary string like `δρομολόγιο (το) επικυρώνω εισιτήριο επιλογή (η)` into discrete vocab items */
function splitGlossaryBoxTokens(line: string): string[] {
  const cleaned = line.replace(/\bΕΛΛΗΝΙΚΑ\s*Β[’'´΄]?\b/gi, '').trim();
  // Match word optionally followed by `(το|η|ο|τα|οι)` article tag
  const matches = cleaned.match(
    /[A-Za-z\u0370-\u03FF\u1F00-\u1FFFά-ώϊϋΐΰΆ-ΏΪΫ’'-]+(?:\s*\((?:ο|η|το|οι|τα|την|τον)\))?/g
  );
  return matches && matches.length >= 2 ? matches.map((m) => m.trim()) : [];
}

export const InteractiveTextbookViewer: React.FC<InteractiveTextbookViewerProps> = ({
  mode,
  subject,
  isWorkbook = false,
  explicitBookId,
  fromPage,
  toPage,
  todayStr,
  customVocab,
  unitStudyDates,
  textbookPrefs,
  studentSummary = '',
  onSelectBookId,
  onSaveVocab,
  onUpdateTextbookPrefs,
  onPreviewKeyPointsReady,
}) => {
  const topWordCardRef = useRef<HTMLDivElement | null>(null);
  const [highlightTopCard, setHighlightTopCard] = useState(false);

  const candidates = useMemo<TextbookMeta[]>(() => {
    if (explicitBookId) {
      const b = getBookById(explicitBookId);
      return b ? [b] : [];
    }
    return getBooksForSubject(subject, isWorkbook);
  }, [explicitBookId, subject, isWorkbook]);

  const savedBookMap = isWorkbook
    ? textbookPrefs?.selectedWorkbookBySubject
    : textbookPrefs?.selectedBookBySubject;

  const activeBookId = useMemo(() => {
    if (explicitBookId) return explicitBookId;
    return getDefaultBookIdForSubject(subject, isWorkbook, savedBookMap);
  }, [explicitBookId, subject, isWorkbook, savedBookMap]);

  const activeBook = useMemo(() => getBookById(activeBookId), [activeBookId]);

  const [pagesData, setPagesData] = useState<Record<string, string> | null>(null);
  const [loadingBook, setLoadingBook] = useState(false);
  const [bookErr, setBookErr] = useState<string | null>(null);

  // Per-page accordion state: ALL COLLAPSED BY DEFAULT (`{}`) so multi-page views stay ultra-compact!
  const [expandedPages, setExpandedPages] = useState<Record<number, boolean>>({});

  // Word tap popup state (powers BOTH right-side floating mini-widget AND top full explanation card)
  const [selectedWordInfo, setSelectedWordInfo] = useState<{
    word: string;
    sentence: string;
    pageNo: number;
    loading: boolean;
    data?: WordAssistResult;
    error?: string;
    addedMsg?: string;
  } | null>(null);

  // AI Preview Guide state + collapsible toggle
  const [previewGuide, setPreviewGuide] = useState<PreviewGuideResult | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewErr, setPreviewErr] = useState<string | null>(null);

  // AI Review Coach state + collapsible toggle
  const [reviewCoach, setReviewCoach] = useState<ReviewCoachResult | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [reviewErr, setReviewErr] = useState<string | null>(null);
  const [quizSelected, setQuizSelected] = useState<Record<number, number>>({});

  // AI Workbook / Exercise Explanation state + collapsible toggle
  const [exerciseExplain, setExerciseExplain] = useState<ExerciseExplainResult | null>(null);
  const [explainOpen, setExplainOpen] = useState(false);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [explainErr, setExplainErr] = useState<string | null>(null);

  // Paired Workbook Drawer (when viewing a Student Textbook)
  const [showPairedWb, setShowPairedWb] = useState(false);
  const [wbPagesData, setWbPagesData] = useState<Record<string, string> | null>(null);
  const [wbCustomRange, setWbCustomRange] = useState<[number, number] | null>(null);
  const [wbExplain, setWbExplain] = useState<ExerciseExplainResult | null>(null);
  const [wbExplainOpen, setWbExplainOpen] = useState(false);
  const [loadingWbExplain, setLoadingWbExplain] = useState(false);

  // Self-test mask toggle for circled / recorded words in Review mode
  const [maskChinese, setMaskChinese] = useState(false);

  const clampedRange = useMemo<[number, number]>(() => {
    if (!activeBook) return [fromPage, toPage];
    const fp = Math.max(activeBook.minPage, Math.min(activeBook.maxPage, fromPage || 1));
    const tp = Math.max(fp, Math.min(activeBook.maxPage, Math.min(fp + 6, toPage || fp)));
    return [fp, tp];
  }, [activeBook, fromPage, toPage]);

  const pairedWbInfo = useMemo(() => {
    if (!activeBook || activeBook.isWorkbook) return null;
    return findPairedWorkbook(activeBook.id, clampedRange[0], clampedRange[1]);
  }, [activeBook, clampedRange]);

  const effectiveWbRange = useMemo<[number, number] | null>(() => {
    if (!pairedWbInfo) return null;
    return wbCustomRange || [pairedWbInfo.wbFrom, Math.min(pairedWbInfo.wbFrom + 3, pairedWbInfo.wbTo)];
  }, [pairedWbInfo, wbCustomRange]);

  // Cache keys for the current book & page range
  const previewCacheKey = activeBook ? `pv_guide:${activeBook.id}:${clampedRange[0]}-${clampedRange[1]}` : '';
  const reviewCacheKey = activeBook ? `rv_coach:${activeBook.id}:${clampedRange[0]}-${clampedRange[1]}` : '';
  const explainCacheKey = activeBook ? `ex_explain:${activeBook.id}:${clampedRange[0]}-${clampedRange[1]}` : '';
  const wbExplainCacheKey =
    pairedWbInfo && effectiveWbRange
      ? `ex_explain:${pairedWbInfo.wbBook.id}:${effectiveWbRange[0]}-${effectiveWbRange[1]}`
      : '';

  // Auto-hydrate cached AI panels (0ms, 0 API calls across refresh & across devices!) and reset fold states on page change
  useEffect(() => {
    setSelectedWordInfo(null);
    setExpandedPages({});
    setPreviewErr(null);
    setReviewErr(null);
    setExplainErr(null);
    setQuizSelected({});
    setWbCustomRange(null);

    const cloud = textbookPrefs?.aiAssistCache;
    const cachedPv = previewCacheKey ? peekTextbookAssistCache<PreviewGuideResult>(previewCacheKey, cloud) : null;
    const cachedRv = reviewCacheKey ? peekTextbookAssistCache<ReviewCoachResult>(reviewCacheKey, cloud) : null;
    const cachedEx = explainCacheKey ? peekTextbookAssistCache<ExerciseExplainResult>(explainCacheKey, cloud) : null;

    setPreviewGuide(cachedPv);
    setPreviewOpen(false);
    if (cachedPv && onPreviewKeyPointsReady && Array.isArray(cachedPv.keyPointsForCheck)) {
      onPreviewKeyPointsReady(cachedPv.keyPointsForCheck);
    }

    setReviewCoach(cachedRv);
    setReviewOpen(false);

    setExerciseExplain(cachedEx);
    setExplainOpen(false);
  }, [activeBookId, clampedRange[0], clampedRange[1]]);

  // Also hydrate paired workbook explanation cache whenever wb range or cloud cache updates
  useEffect(() => {
    if (!wbExplainCacheKey) {
      setWbExplain(null);
      setWbExplainOpen(false);
      return;
    }
    const cachedWb = peekTextbookAssistCache<ExerciseExplainResult>(
      wbExplainCacheKey,
      textbookPrefs?.aiAssistCache
    );
    setWbExplain(cachedWb);
  }, [wbExplainCacheKey, textbookPrefs?.aiAssistCache]);

  // Keep top-level caches synced if cloud state arrives slightly after mount
  useEffect(() => {
    const cloud = textbookPrefs?.aiAssistCache;
    if (!cloud) return;
    if (!previewGuide && previewCacheKey && cloud[previewCacheKey]) {
      setPreviewGuide(cloud[previewCacheKey]);
    }
    if (!reviewCoach && reviewCacheKey && cloud[reviewCacheKey]) {
      setReviewCoach(cloud[reviewCacheKey]);
    }
    if (!exerciseExplain && explainCacheKey && cloud[explainCacheKey]) {
      setExerciseExplain(cloud[explainCacheKey]);
    }
  }, [textbookPrefs?.aiAssistCache, previewCacheKey, reviewCacheKey, explainCacheKey]);

  useEffect(() => {
    if (!activeBookId) {
      setPagesData(null);
      return;
    }
    let cancelled = false;
    setLoadingBook(true);
    setBookErr(null);
    loadBookPages(activeBookId)
      .then((p) => {
        if (!cancelled) setPagesData(p);
      })
      .catch((e) => {
        if (!cancelled) setBookErr(e?.message || '课本加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoadingBook(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeBookId]);

  useEffect(() => {
    if (!pairedWbInfo || !showPairedWb) return;
    let cancelled = false;
    loadBookPages(pairedWbInfo.wbBook.id)
      .then((p) => {
        if (!cancelled) setWbPagesData(p);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pairedWbInfo, showPairedWb]);

  const linkedStories = useMemo(() => {
    if (!activeBook) return [];
    return findLinkedHistoryStories(activeBook.id, clampedRange[0], clampedRange[1]);
  }, [activeBook, clampedRange]);

  const recordedNormSet = useMemo(() => {
    const s = new Set<string>();
    for (const w of customVocab || []) {
      const k = normalizeGreekKey(w?.word_greek || '');
      if (k) s.add(k);
    }
    return s;
  }, [customVocab]);

  const pageCircledWords = useMemo<CircledBookWord[]>(() => {
    if (!activeBook) return [];
    const map = textbookPrefs?.circledWordsByBookPage || {};
    const list: CircledBookWord[] = [];
    const seen = new Set<string>();
    for (let p = clampedRange[0]; p <= clampedRange[1]; p++) {
      const arr = map[`${activeBook.id}:${p}`] || [];
      for (const item of arr) {
        const k = (item.lemma || item.raw).toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          list.push(item);
        }
      }
    }
    return list;
  }, [activeBook, textbookPrefs, clampedRange]);

  const circledRawNormSet = useMemo(() => {
    const s = new Set<string>();
    for (const cw of pageCircledWords) {
      s.add(normalizeGreekKey(cw.raw));
      s.add(normalizeGreekKey(cw.lemma));
    }
    return s;
  }, [pageCircledWords]);

  const matchedVocabOnPage = useMemo(() => {
    if (!pagesData || !activeBook) return [];
    const combinedTxt = [];
    for (let p = clampedRange[0]; p <= clampedRange[1]; p++) {
      combinedTxt.push(pagesData[String(p)] || '');
    }
    const pageTokens = new Set(
      (combinedTxt.join('\n').match(WORD_SPLIT_RE) || []).map((t) => normalizeGreekKey(t))
    );
    const out: CircledBookWord[] = [...pageCircledWords];
    const existingKeys = new Set(out.map((o) => normalizeGreekKey(o.lemma || o.raw)));

    for (const w of customVocab || []) {
      const gr = String(w?.word_greek || '').trim();
      const k = normalizeGreekKey(gr);
      if (k && pageTokens.has(k) && !existingKeys.has(k)) {
        existingKeys.add(k);
        out.push({
          raw: gr,
          lemma: gr,
          chinese: String(w?.word_chinese || ''),
          date: String(w?.note_date || ''),
        });
      }
    }
    return out;
  }, [pagesData, activeBook, clampedRange, pageCircledWords, customVocab]);

  if (candidates.length === 0 || !activeBook) {
    return null;
  }

  const cleanSubjKey = String(subject || '').replace(/\s*练习册$/, '').trim();
  const isEnglishBook = activeBook.id.includes('agglika');

  const persistCloudAiCache = (nextCloudCache: Record<string, any>) => {
    if (!onUpdateTextbookPrefs) return;
    onUpdateTextbookPrefs({
      ...(textbookPrefs || {}),
      aiAssistCache: nextCloudCache,
    });
  };

  const handleBookPick = (bookId: string) => {
    if (onSelectBookId) onSelectBookId(bookId);
    if (onUpdateTextbookPrefs) {
      const nextPrefs: TextbookPreferencesState = { ...(textbookPrefs || {}) };
      if (isWorkbook) {
        nextPrefs.selectedWorkbookBySubject = {
          ...(nextPrefs.selectedWorkbookBySubject || {}),
          [cleanSubjKey]: bookId,
        };
      } else {
        nextPrefs.selectedBookBySubject = {
          ...(nextPrefs.selectedBookBySubject || {}),
          [cleanSubjKey]: bookId,
        };
      }
      onUpdateTextbookPrefs(nextPrefs);
    }
  };

  const combinedPageText = (() => {
    if (!pagesData) return '';
    const chunks: string[] = [];
    for (let p = clampedRange[0]; p <= clampedRange[1]; p++) {
      const t = pagesData[String(p)];
      if (t) chunks.push(`【第 ${p} 页】\n${t}`);
    }
    return chunks.join('\n\n');
  })();

  const handleJumpToTopWordCard = () => {
    if (topWordCardRef.current) {
      topWordCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightTopCard(true);
      setTimeout(() => setHighlightTopCard(false), 1600);
    }
  };

  const handleTapWord = async (rawToken: string, lineText: string, pageNo: number) => {
    const cleanWord = rawToken.replace(/^[’']+|[’']+$/g, '').trim();
    if (!cleanWord) return;
    speakTextbookWord(cleanWord, isEnglishBook);

    const cacheKey = `word:${activeBook.id}:${pageNo}:${cleanWord}:${lineText.slice(0, 60)}`;
    const instantCached = peekTextbookAssistCache<WordAssistResult>(cacheKey);
    if (instantCached) {
      setSelectedWordInfo({
        word: cleanWord,
        sentence: lineText,
        pageNo,
        loading: false,
        data: instantCached,
      });
      return;
    }

    setSelectedWordInfo({
      word: cleanWord,
      sentence: lineText,
      pageNo,
      loading: true,
    });

    const norm = normalizeGreekKey(cleanWord);
    const localHit = findVocabSuggestions(cleanWord, 2).find(
      (s) => normalizeGreekKey(s.greek) === norm
    );

    try {
      const res = await callTextbookAssist<WordAssistResult>(cacheKey, {
        mode: 'word',
        word: cleanWord,
        sentence: lineText,
        bookTitle: activeBook.zhTitle,
        pageRange: `P.${pageNo}`,
        isEnglishBook,
      });
      setSelectedWordInfo((prev) =>
        prev && prev.word === cleanWord
          ? { ...prev, loading: false, data: res }
          : prev
      );
    } catch (err: any) {
      if (localHit) {
        setSelectedWordInfo((prev) =>
          prev && prev.word === cleanWord
            ? {
                ...prev,
                loading: false,
                data: {
                  lemma: localHit.greek,
                  chinese: localHit.chinese.replace(/[\u0370-\u03FF\u1F00-\u1FFF()（）]/g, '').trim(),
                  formNote: `本地词库匹配（来源：${localHit.source}）`,
                  usageTip: `所在原句：${lineText}`,
                },
              }
            : prev
        );
      } else {
        setSelectedWordInfo((prev) =>
          prev && prev.word === cleanWord
            ? { ...prev, loading: false, error: err?.message || '词义解析失败，请再点一次重试' }
            : prev
        );
      }
    }
  };

  const handleSaveWordToBankAndCircle = (
    rawWord: string,
    lemmaRaw: string,
    chineseRaw: string,
    formNote: string,
    sentence: string,
    pageNo: number
  ) => {
    const targetBookPageKey = `${activeBook.id}:${pageNo}`;
    const cleanLemma = stripLeadingArticleParens(lemmaRaw || rawWord).trim() || rawWord;
    const cleanZh = String(chineseRaw || '')
      .replace(/[\u0370-\u03FF\u1F00-\u1FFF()（）]/g, '')
      .trim();

    if (onUpdateTextbookPrefs && cleanZh) {
      const prevMap = textbookPrefs?.circledWordsByBookPage || {};
      const prevList = prevMap[targetBookPageKey] || [];
      const exists = prevList.some(
        (x) => (x.lemma || x.raw).toLowerCase() === cleanLemma.toLowerCase()
      );
      if (!exists) {
        const nextEntry: CircledBookWord = {
          raw: rawWord,
          lemma: cleanLemma,
          chinese: cleanZh,
          formNote,
          sentence: sentence.slice(0, 140),
          date: todayStr,
        };
        onUpdateTextbookPrefs({
          ...(textbookPrefs || {}),
          circledWordsByBookPage: {
            ...prevMap,
            [targetBookPageKey]: [...prevList, nextEntry],
          },
        });
      }
    }

    const hasGreek = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(cleanLemma);
    if (!hasGreek) {
      setSelectedWordInfo((prev) =>
        prev ? { ...prev, addedMsg: '✓ 已加入本页重点词卡（英文词不混入希腊语拼写题库）' } : null
      );
      return;
    }

    const vRes = validateNewVocabEntry(cleanLemma, cleanZh);
    if (!vRes.ok) {
      setSelectedWordInfo((prev) => (prev ? { ...prev, addedMsg: vRes.error } : null));
      return;
    }

    const norm = normalizeGreekKey(vRes.greek);
    const alreadyInCustom = (customVocab || []).some(
      (w: any) => normalizeGreekKey(w?.word_greek || '') === norm
    );

    if (alreadyInCustom) {
      setSelectedWordInfo((prev) =>
        prev ? { ...prev, addedMsg: `✓「${vRes.greek}」已在题库中，并已标为本页重点词！` } : null
      );
      return;
    }

    let maxId = (customVocab || []).reduce((acc: number, w: any) => {
      const n = Number(w?.id);
      return Number.isFinite(n) && n > acc ? n : acc;
    }, 90000);
    maxId += 1;

    const bookLabel = '今日生词笔记';
    const unitNum = getWeeklyNoteUnit(todayStr, 200);
    const newEntry = {
      id: maxId,
      book_id: bookLabel,
      unit: unitNum,
      word_greek: vRes.greek,
      word_chinese: vRes.chinese,
      pronunciation: 'new',
      example_greek: sentence.slice(0, 140),
      example_chinese: formNote ? formNote.slice(0, 80) : '',
      note_date: todayStr,
      source: 'student_school',
    };

    const nextCustom = [...(customVocab || []), newEntry];
    const nextDates = {
      ...(unitStudyDates || {}),
      [`${bookLabel}_${unitNum}`]: getMondayDateStr(todayStr),
    };
    onSaveVocab(nextCustom, nextDates, 1);

    setSelectedWordInfo((prev) =>
      prev
        ? {
            ...prev,
            addedMsg: `🎉 已存「${vRes.greek} = ${vRes.chinese}」入题库并标黄！`,
          }
        : null
    );
  };

  // Toggle if already cached; fetch from Gemini only when not yet generated or forceRefresh=true
  const handleToggleOrLoadPreview = async (forceRefresh = false) => {
    if (!forceRefresh && previewGuide) {
      setPreviewOpen((v) => !v);
      return;
    }
    if (!combinedPageText.trim() || loadingPreview) return;
    setLoadingPreview(true);
    setPreviewErr(null);
    setPreviewOpen(true);
    try {
      const data = await callTextbookAssist<PreviewGuideResult>(
        previewCacheKey,
        {
          mode: 'preview_guide',
          bookTitle: activeBook.zhTitle,
          pageRange: `书本第 ${clampedRange[0]}–${clampedRange[1]} 页`,
          pageText: combinedPageText,
        },
        {
          forceRefresh,
          cloudCache: textbookPrefs?.aiAssistCache,
          onSaveCloudCache: persistCloudAiCache,
        }
      );
      setPreviewGuide(data);
      if (onPreviewKeyPointsReady && Array.isArray(data.keyPointsForCheck)) {
        onPreviewKeyPointsReady(data.keyPointsForCheck);
      }
    } catch (e: any) {
      setPreviewErr(e?.message || '生成预习指南失败，请重试');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleToggleOrLoadReview = async (forceRefresh = false) => {
    if (!forceRefresh && reviewCoach) {
      setReviewOpen((v) => !v);
      return;
    }
    if (!combinedPageText.trim() || loadingReview) return;
    setLoadingReview(true);
    setReviewErr(null);
    setReviewOpen(true);
    if (forceRefresh) setQuizSelected({});
    try {
      let wbTxt = '';
      if (pairedWbInfo && wbPagesData && effectiveWbRange) {
        const arr: string[] = [];
        for (let p = effectiveWbRange[0]; p <= effectiveWbRange[1]; p++) {
          if (wbPagesData[String(p)]) arr.push(wbPagesData[String(p)]);
        }
        wbTxt = arr.join('\n');
      }
      const data = await callTextbookAssist<ReviewCoachResult>(
        reviewCacheKey,
        {
          mode: 'review_coach',
          bookTitle: activeBook.zhTitle,
          pageRange: `书本第 ${clampedRange[0]}–${clampedRange[1]} 页`,
          pageText: combinedPageText,
          workbookText: wbTxt,
        },
        {
          forceRefresh,
          cloudCache: textbookPrefs?.aiAssistCache,
          onSaveCloudCache: persistCloudAiCache,
        }
      );
      setReviewCoach(data);
    } catch (e: any) {
      setReviewErr(e?.message || '生成复习重点与小测失败，请重试');
    } finally {
      setLoadingReview(false);
    }
  };

  const handleToggleOrExplainExercises = async (
    targetBook: TextbookMeta,
    pRange: [number, number],
    rawTxt: string,
    isPairedDrawer = false,
    forceRefresh = false
  ) => {
    if (!forceRefresh) {
      if (isPairedDrawer && wbExplain) {
        setWbExplainOpen((v) => !v);
        return;
      }
      if (!isPairedDrawer && exerciseExplain) {
        setExplainOpen((v) => !v);
        return;
      }
    }
    if (!rawTxt.trim()) return;
    if (isPairedDrawer) {
      setLoadingWbExplain(true);
      setWbExplainOpen(true);
    } else {
      setLoadingExplain(true);
      setExplainErr(null);
      setExplainOpen(true);
    }
    try {
      const key = `ex_explain:${targetBook.id}:${pRange[0]}-${pRange[1]}`;
      const data = await callTextbookAssist<ExerciseExplainResult>(
        key,
        {
          mode: 'explain_exercise',
          bookTitle: targetBook.zhTitle,
          pageRange: `第 ${pRange[0]}–${pRange[1]} 页`,
          exerciseText: rawTxt,
        },
        {
          forceRefresh,
          cloudCache: textbookPrefs?.aiAssistCache,
          onSaveCloudCache: persistCloudAiCache,
        }
      );
      if (isPairedDrawer) {
        setWbExplain(data);
      } else {
        setExerciseExplain(data);
      }
    } catch (e: any) {
      if (!isPairedDrawer) setExplainErr(e?.message || '题目讲解生成失败，请重试');
    } finally {
      if (isPairedDrawer) setLoadingWbExplain(false);
      else setLoadingExplain(false);
    }
  };

  // Clean inline Markdown (`**bold**`, `*italic*`, `[Unit X]`, `______`, `(verb)`) with ZERO raw `#` or `*` leaked!
  const renderInlineInteractiveText = (rawText: string, sentenceCtx: string, pageNo: number) => {
    const preCleaned = rawText
      .replace(/\*\*([^*\n]+?)\s*\*\*/g, '**$1**')
      .replace(/^\*\s*•\s*/, '• ');

    const segments = preCleaned.split(
      /(\*\*[^*]+\*\*|\[Unit\s*\d+\]|_{4,}|\([\u0370-\u03FF\u1F00-\u1FFFά-ώϊϋΐΰΆ-ΏΪΫ\s/,.-]{1,40}\))/gi
    );

    return segments.map((seg, sIdx) => {
      if (!seg) return null;
      if (/^_{4,}$/.test(seg)) {
        return (
          <span
            key={sIdx}
            aria-label="填空横线"
            style={{
              display: 'inline-block',
              minWidth: 54,
              borderBottom: '2px solid #94a3b8',
              margin: '0 5px',
              transform: 'translateY(-2px)',
            }}
          />
        );
      }
      if (/^\[Unit\s*\d+\]$/i.test(seg)) {
        return (
          <span
            key={sIdx}
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              background: '#dbeafe',
              color: '#1d4ed8',
              padding: '1px 7px',
              borderRadius: 999,
              marginLeft: 6,
              verticalAlign: 'middle',
            }}
          >
            {seg.slice(1, -1)}
          </span>
        );
      }

      const isBoldWrap = seg.startsWith('**') && seg.endsWith('**') && seg.length > 4;
      const isParenHint =
        seg.startsWith('(') &&
        seg.endsWith(')') &&
        /^[\u0370-\u03FF\u1F00-\u1FFFά-ώϊϋΐΰΆ-ΏΪΫ\s/,.-]+$/.test(seg.slice(1, -1));

      // Strip any stray lone asterisks so raw `*` never renders
      const inner = (isBoldWrap ? seg.slice(2, -2) : seg).replace(/\*+/g, '');
      const tokens = inner.split(WORD_SPLIT_RE);

      const renderedTokens = tokens.map((tok, tIdx) => {
        if (!IS_CLICKABLE_WORD_RE.test(tok)) {
          return <React.Fragment key={tIdx}>{tok}</React.Fragment>;
        }
        const norm = normalizeGreekKey(tok);
        const isCircled = norm && circledRawNormSet.has(norm);
        const isRecorded = norm && recordedNormSet.has(norm);
        const isSelected =
          selectedWordInfo?.word === tok.replace(/^[’']+|[’']+$/g, '') &&
          selectedWordInfo?.pageNo === pageNo;

        return (
          <span
            key={tIdx}
            className="tb-word-tok"
            onClick={() => handleTapWord(tok, sentenceCtx, pageNo)}
            title="点击听发音、右侧悬浮窗即刻看释义与入库"
            style={{
              cursor: 'pointer',
              padding: '1px 2.5px',
              margin: '0 0.5px',
              borderRadius: 5,
              fontWeight: isBoldWrap ? 800 : undefined,
              background: isSelected
                ? '#fde047'
                : isCircled
                  ? '#fef3c7'
                  : isRecorded
                    ? '#dcfce7'
                    : undefined,
              borderBottom: isSelected
                ? '2px solid #d97706'
                : isCircled
                  ? '2px solid #f59e0b'
                  : isRecorded
                    ? '1.5px dashed #10b981'
                    : undefined,
            }}
          >
            {tok}
          </span>
        );
      });

      if (isParenHint) {
        return (
          <span
            key={sIdx}
            style={{
              background: '#eef2ff',
              color: '#4338ca',
              fontWeight: 700,
              padding: '0 5px',
              borderRadius: 6,
              margin: '0 2px',
              fontSize: '0.95em',
            }}
          >
            {renderedTokens}
          </span>
        );
      }
      if (isBoldWrap) {
        return (
          <strong key={sIdx} style={{ fontWeight: 800, color: '#0f172a' }}>
            {renderedTokens}
          </strong>
        );
      }
      return <React.Fragment key={sIdx}>{renderedTokens}</React.Fragment>;
    });
  };

  // Render a single structured textbook page into rich color-coded Pedagogical Section Cards!
  const renderClickablePageText = (pageText: string, pageNo: number) => {
    if (!pageText || pageText.includes('*(本页为空白页或纯插图页)*')) {
      return (
        <div style={{ padding: '20px 16px', color: '#94a3b8', fontStyle: 'italic', fontSize: 14.5, textAlign: 'center' }}>
          🖼️ 本页在纸质原书中为纯插图页或过渡页，请对照纸质书插图查看
        </div>
      );
    }

    // 1. Separate `> 📌 ...` margin sidebars & group consecutive blocks into themed Pedagogical Sections
    const rawBlocks = pageText
      .replace(/\r\n/g, '\n')
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter(Boolean);

    const sidebarItems: string[] = [];
    const cleanedBlocks: string[] = [];

    for (const blk of rawBlocks) {
      const blkLines = blk.split('\n').map((l) => l.trim()).filter(Boolean);
      const keep: string[] = [];
      for (const ln of blkLines) {
        if (/^#{1,4}\s*【(?:课文、对话与练习|课文\/对话)】$/.test(ln)) continue;
        if (/^(?:\d{1,3}\s+)?ΕΛΛΗΝΙΚΑ\s*Β[’'´΄]?$/i.test(ln)) continue;
        if (ln.startsWith('> 📌') || ln.startsWith('> ')) {
          sidebarItems.push(ln.replace(/^>\s*(?:📌\s*)?/, '').trim());
        } else {
          keep.push(ln);
        }
      }
      if (keep.length > 0) {
        // Deduplicate consecutive identical short lines (e.g. shadow/callout repeats in grammar boxes)
        const dedupedKeep: string[] = [];
        for (const kl of keep) {
          if (dedupedKeep.length === 0 || dedupedKeep[dedupedKeep.length - 1] !== kl) {
            dedupedKeep.push(kl);
          }
        }
        cleanedBlocks.push(dedupedKeep.join('\n'));
      }
    }

    // Merge consecutive single-row `| ... |` table blocks that were separated by blank lines
    const mergedTableBlocks: string[] = [];
    for (const blk of cleanedBlocks) {
      const isTbl = blk.split('\n').every((l) => l.startsWith('|') || l.includes(' | '));
      const prev = mergedTableBlocks[mergedTableBlocks.length - 1];
      const prevIsTbl = prev && prev.split('\n').every((l) => l.startsWith('|') || l.includes(' | '));
      if (isTbl && prevIsTbl) {
        mergedTableBlocks[mergedTableBlocks.length - 1] = `${prev}\n${blk}`;
      } else {
        mergedTableBlocks.push(blk);
      }
    }

    // Group blocks into Semantic Sections whenever a heading introduces a new rubric (`Για δες`, `Σωστό ή λάθος`, etc.)
    interface PageSectionGroup {
      theme: SectionThemeMeta;
      headingText?: string;
      headingLevel?: number;
      blocks: string[];
    }

    const sections: PageSectionGroup[] = [];
    let currentSec: PageSectionGroup = {
      theme: SECTION_THEMES.reading,
      blocks: [],
    };

    const pushCurrentIfNotEmpty = () => {
      if (currentSec.headingText || currentSec.blocks.length > 0) {
        sections.push(currentSec);
      }
    };

    for (const blk of mergedTableBlocks) {
      const lines = blk.split('\n');
      // Check if block is a heading (`#`..`####` or bold rubric line like `**2 Απαντάω:**`)
      const hMatch = lines.length === 1 ? lines[0].match(/^(#{1,4})\s+(.+)$/) : null;
      const boldRubricMatch =
        !hMatch && lines.length === 1
          ? lines[0].match(/^\*\*(\d{0,2}\s*(?:Απαντάω|Σωστό\s+ή\s+λάθος|Για\s+δες|Πώς\s+το\s+λένε|Λέξεις,\s*λέξεις)[^*]*)\*\*\s*(.*)$/i)
          : null;

      // Special split for `Πώς το λένε; | Λέξεις, λέξεις` dual header
      if (lines.length === 1 && /Πώς\s+το\s+λένε;\s*\|\s*Λέξεις,\s*λέξεις/i.test(lines[0])) {
        pushCurrentIfNotEmpty();
        currentSec = {
          theme: SECTION_THEMES.speaking,
          headingText: 'Πώς το λένε; & Λέξεις, λέξεις',
          headingLevel: 3,
          blocks: [],
        };
        continue;
      }

      if (hMatch) {
        const level = hMatch[1].length;
        const rawTitle = hMatch[2].replace(/\*\*/g, '').trim();
        const detected = detectHeadingTheme(rawTitle);
        pushCurrentIfNotEmpty();
        currentSec = {
          theme: detected ? SECTION_THEMES[detected] : level <= 2 ? SECTION_THEMES.unit_banner : SECTION_THEMES.reading,
          headingText: rawTitle,
          headingLevel: level,
          blocks: [],
        };
        continue;
      }

      if (boldRubricMatch) {
        const rubricTitle = boldRubricMatch[1].trim();
        const trailingRest = boldRubricMatch[2].trim();
        const detected = detectHeadingTheme(rubricTitle) || 'qa_exercise';
        pushCurrentIfNotEmpty();
        currentSec = {
          theme: SECTION_THEMES[detected],
          headingText: rubricTitle,
          headingLevel: 3,
          blocks: trailingRest ? [trailingRest] : [],
        };
        continue;
      }

      currentSec.blocks.push(blk);
    }
    pushCurrentIfNotEmpty();

    const renderBlockInsideSection = (blk: string, bIdx: number, secKind: SectionThemeKind) => {
      const blkLines = blk.split('\n').map((l) => l.trim()).filter(Boolean);
      if (blkLines.length === 0) return null;

      // 1. Standalone writing line marker
      if (blkLines.length === 1 && blkLines[0] === '[✏️ 纸质书作答横线]') {
        return (
          <div
            key={bIdx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 12px',
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              color: '#94a3b8',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span>✏️ 纸质书手写横线区</span>
            <span style={{ flex: 1, borderBottom: '1px dotted #cbd5e1', height: 1 }} />
          </div>
        );
      }

      // 2. Skip standalone redundant `Σωστό | Λάθος` header when inside `true_false` card (we render badges per item!)
      if (secKind === 'true_false' && blkLines.length === 1 && /^Σωστό\s*\|\s*Λάθος$/i.test(blkLines[0])) {
        return null;
      }

      // 3. Vocabulary Box / Glossary Chips (`δρομολόγιο (το) επικυρώνω εισιτήριο...`)
      if (blkLines.length === 1 && !blkLines[0].includes(' | ')) {
        const hasArticleTags = (blkLines[0].match(/\((?:ο|η|το|οι|τα)\)/g) || []).length >= 2;
        if (secKind === 'vocab_box' || hasArticleTags) {
          const chips = splitGlossaryBoxTokens(blkLines[0]);
          if (chips.length >= 2) {
            return (
              <div
                key={bIdx}
                style={{
                  padding: '10px 12px',
                  borderRadius: 11,
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {secKind !== 'vocab_box' && (
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#b45309' }}>
                    🗂️ 本页重点生词卡（点任意词卡即刻听发音 &amp; 看释义）：
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {chips.map((ch, cIdx) => (
                    <span
                      key={cIdx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '5px 10px',
                        borderRadius: 999,
                        background: '#ffffff',
                        border: '1px solid #fcd34d',
                        fontSize: 14.5,
                        fontWeight: 700,
                        color: '#78350f',
                        boxShadow: '0 1px 2px rgba(245, 158, 11, 0.08)',
                      }}
                    >
                      <span>🏷️</span>
                      {renderInlineInteractiveText(ch, ch, pageNo)}
                    </span>
                  ))}
                </div>
              </div>
            );
          }
        }
      }

      // 4. Table / Grammar Gender Triple (`ο ίδιος | η ίδια | το ίδιο` or multi-row tables)
      if (
        blkLines.every((l) => l.startsWith('|') || l.includes(' | ')) ||
        (blkLines.length >= 2 &&
          blkLines.filter((l) => l.startsWith('|') || l.includes(' | ')).length >= blkLines.length - 1 &&
          (blkLines[0].startsWith('|') || blkLines[0].includes(' | ')))
      ) {
        const rows = blkLines
          .map((l) =>
            l
              .replace(/^\|+|\|+$/g, '')
              .split(/\s*\|\s*/)
              .map((c) => c.trim())
          )
          .filter((r) => !r.every((c) => /^[-:\s]+$/.test(c)));

        const colCount = Math.max(...rows.map((r) => r.length), 1);

        // Detect 1-row 3-column Greek Masculine / Feminine / Neuter grammar triple!
        const isGenderTriple =
          rows.length === 1 &&
          colCount === 3 &&
          (secKind === 'grammar' ||
            (/^ο\s+/i.test(rows[0][0]) && /^η\s+/i.test(rows[0][1]) && /^το\s+/i.test(rows[0][2])) ||
            (/ος$/i.test(rows[0][0]) && /[ηα]$/i.test(rows[0][1]) && /ο$/i.test(rows[0][2])));

        const displayRows = isGenderTriple
          ? [['♂️ 阳性 (Αρσενικό)', '♀️ 阴性 (Θηλυκό)', '⚪ 中性 (Ουδέτερο)'], ...rows]
          : rows;

        return (
          <div
            key={bIdx}
            style={{
              overflowX: 'auto',
              borderRadius: 11,
              border: isGenderTriple ? '1.5px solid #c4b5fd' : '1px solid #cbd5e1',
              background: '#ffffff',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14.5 }}>
              <tbody>
                {displayRows.map((row, rIdx) => {
                  const isHdr = rIdx === 0 && displayRows.length > 1;
                  return (
                    <tr
                      key={rIdx}
                      style={{
                        background: isHdr
                          ? isGenderTriple
                            ? '#f3e8ff'
                            : '#f1f5f9'
                          : rIdx % 2 === 1
                            ? '#ffffff'
                            : '#f8fafc',
                        borderBottom: rIdx < displayRows.length - 1 ? '1px solid #e2e8f0' : 'none',
                      }}
                    >
                      {Array.from({ length: colCount }, (_, cIdx) => {
                        const cellTxt = row[cIdx] || '';
                        return (
                          <td
                            key={cIdx}
                            style={{
                              padding: '8px 12px',
                              fontWeight: isHdr ? 800 : isGenderTriple ? 700 : 500,
                              fontSize: isHdr && isGenderTriple ? 12.5 : 14.5,
                              color: isHdr ? (isGenderTriple ? '#6b21a8' : '#1e3a8a') : '#1e293b',
                              borderRight: cIdx < colCount - 1 ? '1px solid #e2e8f0' : 'none',
                              lineHeight: 1.6,
                              verticalAlign: 'top',
                            }}
                          >
                            {isHdr && isGenderTriple
                              ? cellTxt
                              : renderInlineInteractiveText(cellTxt, cellTxt, pageNo)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }

      // 5. Multi-line block -> Poem stanza or Grammar Paradigm box
      if (blkLines.length >= 2) {
        return (
          <div
            key={bIdx}
            style={{
              padding: '9px 16px',
              borderLeft: `3.5px solid ${secKind === 'grammar' ? '#a855f7' : '#60a5fa'}`,
              borderRadius: '0 10px 10px 0',
              background: secKind === 'grammar' ? '#ffffff' : '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {blkLines.map((vLine, vIdx) => {
              const cleanV = vLine.replace(/^#{1,4}\s*/, '');
              return (
                <div
                  key={vIdx}
                  style={{
                    fontSize: 15.5,
                    color: '#1e293b',
                    lineHeight: 1.75,
                    fontWeight: 500,
                  }}
                >
                  {renderInlineInteractiveText(cleanV, cleanV, pageNo)}
                </div>
              );
            })}
          </div>
        );
      }

      // 6. Single-line blocks
      const single = blkLines[0].replace(/^#{1,4}\s*/, '');

      // 6a. Possessive enclitic strip (`μου σου του της του μας σας τους`) or 3-form comma line (`μόνος, μόνη, μόνο`)
      if (
        secKind === 'grammar' &&
        (/^(?:μου\s+σου\s+του|μόνος,\s*μόνη,\s*μόνο)/i.test(single) ||
          (single.split(/\s+/).length <= 5 && !/[.;!?]/.test(single)))
      ) {
        return (
          <div
            key={bIdx}
            style={{
              display: 'inline-flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 9,
              background: '#f3e8ff',
              border: '1px solid #d8b4fe',
              color: '#581c87',
              fontWeight: 800,
              fontSize: 15,
              alignSelf: 'flex-start',
            }}
          >
            <span>📌 词形：</span>
            {renderInlineInteractiveText(single, single, pageNo)}
          </div>
        );
      }

      // 6b. Named Speaker Dialogue (`κ. Άννα: ...`, `Σοφία: ...`)
      const speakerMatch = single.match(/^([Α-ΩΆ-ΏA-Z][\wά-ώϊϋΐΰ.\s]{0,16}):\s+(.+)$/);
      if (speakerMatch && !/^中文翻译/.test(speakerMatch[1])) {
        const [, speaker, speech] = speakerMatch;
        return (
          <div
            key={bIdx}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              fontSize: 16,
              lineHeight: 1.85,
              color: '#1e293b',
            }}
          >
            <span
              style={{
                flexShrink: 0,
                background: '#fef3c7',
                color: '#92400e',
                fontWeight: 800,
                fontSize: 13.5,
                padding: '1px 9px',
                borderRadius: 7,
                border: '1px solid #fde68a',
              }}
            >
              🗣️ {speaker}
            </span>
            <div style={{ flex: 1 }}>{renderInlineInteractiveText(speech, single, pageNo)}</div>
          </div>
        );
      }

      // 6c. Dash dialogue (`– Τον κύριο Παναγιωτίδη...` or `— Ο ίδιος.`)
      const dashDialogMatch = single.match(/^[–—-]\s+(.+)$/);
      if (dashDialogMatch) {
        return (
          <div
            key={bIdx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '5px 10px',
              borderRadius: 9,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              fontSize: 15.5,
              lineHeight: 1.75,
              color: '#1e293b',
            }}
          >
            <span style={{ flexShrink: 0, fontSize: 14 }}>💬</span>
            <div style={{ flex: 1 }}>{renderInlineInteractiveText(dashDialogMatch[1], single, pageNo)}</div>
          </div>
        );
      }

      // 6d. Exercise item / Numbered question / Bullet (`1. ...`, `• ...`, `◆ ...`)
      const itemMatch = single.match(
        /^([•◆▪❑❒▲▼❖☐✓➤*]|(?:\d{1,2}[.)]|[α-ωΑ-Ωa-zA-Z][.)])|\d{1,2}(?=\s+[Α-ΩΆ-ΏA-Z«"“]))\s+(.+)$/
      );
      if (itemMatch) {
        const rawMarker = itemMatch[1] === '*' ? '•' : itemMatch[1];
        const rest = itemMatch[2];
        const isNum = /^\d/.test(rawMarker) || /^[α-ωΑ-Ωa-zA-Z][.)]$/.test(rawMarker);
        return (
          <div
            key={bIdx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 10,
              fontSize: 15.6,
              lineHeight: 1.8,
              color: '#1e293b',
              padding: secKind === 'true_false' ? '6px 10px' : undefined,
              borderRadius: secKind === 'true_false' ? 9 : undefined,
              background: secKind === 'true_false' ? '#ffffff' : undefined,
              border: secKind === 'true_false' ? '1px solid #e0f2fe' : undefined,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, flex: 1 }}>
              <span
                style={{
                  flexShrink: 0,
                  marginTop: isNum ? 3 : 1,
                  minWidth: isNum ? 26 : 18,
                  height: isNum ? 24 : undefined,
                  padding: isNum ? '0 7px' : '0 2px',
                  borderRadius: 7,
                  background: isNum ? '#dbeafe' : 'transparent',
                  color: isNum ? '#1d4ed8' : '#2563eb',
                  fontWeight: 900,
                  fontSize: isNum ? 13 : 15,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {rawMarker}
              </span>
              <div style={{ flex: 1 }}>{renderInlineInteractiveText(rest, single, pageNo)}</div>
            </div>

            {secKind === 'true_false' && isNum && (
              <div
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  gap: 6,
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: '#64748b',
                  marginTop: 3,
                }}
              >
                <span style={{ padding: '1px 6px', borderRadius: 5, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                  ⭕ Σωστό
                </span>
                <span style={{ padding: '1px 6px', borderRadius: 5, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                  ❌ Λάθος
                </span>
              </div>
            )}
          </div>
        );
      }

      // 6e. Clean book-grade prose paragraph
      const isCitationOrCaption =
        /^(?:\d+\.\s+.+\(.+\)|.*εκδ\..*|\(.*διασκευή.*\))$/.test(single) && single.length < 140;

      return (
        <p
          key={bIdx}
          style={{
            margin: 0,
            fontSize: isCitationOrCaption ? 13.5 : 16,
            fontStyle: isCitationOrCaption ? 'italic' : 'normal',
            fontWeight: 500,
            color: isCitationOrCaption ? '#64748b' : '#1e293b',
            lineHeight: 1.86,
            letterSpacing: '0.01em',
            wordBreak: 'break-word',
          }}
        >
          {renderInlineInteractiveText(single, single, pageNo)}
        </p>
      );
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <style>{`
          .tb-word-tok { transition: background 0.14s ease, box-shadow 0.14s ease; }
          .tb-word-tok:hover { background: #e0f2fe; box-shadow: inset 0 -1.5px 0 #38bdf8; }
        `}</style>

        {sections.map((sec, secIdx) => {
          const isUnitBanner = sec.theme.kind === 'unit_banner';
          const isPlainReadingWithoutTitle = sec.theme.kind === 'reading' && !sec.headingText;

          if (isPlainReadingWithoutTitle) {
            return (
              <div key={secIdx} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {sec.blocks.map((b, bIdx) => renderBlockInsideSection(b, bIdx, sec.theme.kind))}
              </div>
            );
          }

          return (
            <div
              key={secIdx}
              style={{
                borderRadius: 14,
                background: sec.theme.bg,
                border: `1.5px solid ${sec.theme.border}`,
                overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
              }}
            >
              {/* Section Header with Emoji + Title + Friendly Chinese Explanation */}
              {sec.headingText && (
                <div
                  style={{
                    padding: isUnitBanner ? '11px 15px' : '9px 14px',
                    background: sec.theme.headerBg,
                    color: isUnitBanner ? '#ffffff' : sec.theme.accent,
                    borderBottom: sec.blocks.length > 0 ? `1px solid ${sec.theme.border}` : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: isUnitBanner ? 19 : 17 }}>{sec.theme.emoji}</span>
                    <span
                      style={{
                        fontSize: isUnitBanner ? 17.5 : sec.headingLevel === 2 ? 16.5 : 15.8,
                        fontWeight: 900,
                        letterSpacing: '-0.01em',
                        color: isUnitBanner ? '#ffffff' : sec.theme.accent,
                      }}
                    >
                      {isUnitBanner
                        ? sec.headingText.replace(/\[Unit\s*\d+\]/gi, '').trim()
                        : renderInlineInteractiveText(sec.headingText, sec.headingText, pageNo)}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: isUnitBanner ? 'rgba(255,255,255,0.22)' : '#ffffff',
                        color: isUnitBanner ? '#ffffff' : sec.theme.accent,
                        border: isUnitBanner ? 'none' : `1px solid ${sec.theme.border}`,
                      }}
                    >
                      {sec.theme.badgeLabel}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: isUnitBanner ? 'rgba(255,255,255,0.9)' : '#475569',
                      paddingLeft: 26,
                    }}
                  >
                    💡 {sec.theme.zhHint}
                  </div>
                </div>
              )}

              {sec.blocks.length > 0 && (
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sec.blocks.map((b, bIdx) => renderBlockInsideSection(b, bIdx, sec.theme.kind))}
                </div>
              )}
            </div>
          );
        })}

        {/* Dedicated Margin Glossary / Notes Card at Bottom of Page */}
        {sidebarItems.length > 0 && (
          <div
            style={{
              marginTop: 2,
              padding: '11px 14px',
              borderRadius: 12,
              background: '#fffbeb',
              border: '1.5px solid #fde68a',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 900, color: '#b45309', display: 'flex', alignItems: 'center', gap: 5 }}>
              📌 页边小词典与旁注（同样可点词听读与入库）
            </div>
            {sidebarItems.map((sb, sIdx) => (
              <div key={sIdx} style={{ fontSize: 14, color: '#451a03', lineHeight: 1.7 }}>
                {renderInlineInteractiveText(sb, sb, pageNo)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const pageNumbersList = Array.from(
    { length: clampedRange[1] - clampedRange[0] + 1 },
    (_, idx) => clampedRange[0] + idx
  );
  const allPagesExpanded =
    pageNumbersList.length > 0 && pageNumbersList.every((p) => Boolean(expandedPages[p]));

  return (
    <div
      style={{
        marginTop: 10,
        borderRadius: 18,
        background: '#ffffff',
        border: '1.5px solid #cbd5e1',
        padding: 16,
        boxShadow: '0 6px 20px rgba(15, 23, 42, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* 1. Visual Book Cover Selector */}
      {candidates.length > 1 && (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#475569', marginBottom: 8 }}>
            📚 点选当前用的是哪一册（看封面确认与手里纸质书一致，系统会自动记住）：
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {candidates.map((bk) => {
              const sel = bk.id === activeBook.id;
              return (
                <button
                  key={bk.id}
                  type="button"
                  onClick={() => handleBookPick(bk.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '6px 12px 6px 6px',
                    borderRadius: 12,
                    border: sel ? '2.5px solid #0071E3' : '1.5px solid #e2e8f0',
                    background: sel ? '#eff6ff' : '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: sel ? '0 4px 12px rgba(0, 113, 227, 0.16)' : 'none',
                  }}
                >
                  {bk.coverUrl && (
                    <img
                      src={bk.coverUrl}
                      alt={bk.shortTitle}
                      style={{
                        width: 34,
                        height: 46,
                        objectFit: 'cover',
                        borderRadius: 5,
                        border: '1px solid #cbd5e1',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: sel ? '#005bb5' : '#0f172a' }}>
                      {sel ? '✓ ' : ''}
                      {bk.shortTitle}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>共 {bk.maxPage} 页</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Prominent Active Book Cover + Gemini AI Action Buttons */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 14,
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
          border: '1px solid #bfdbfe',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {activeBook.coverUrl && (
            <img
              src={activeBook.coverUrl}
              alt={activeBook.zhTitle}
              style={{
                width: 68,
                height: 94,
                objectFit: 'cover',
                borderRadius: 8,
                border: '2px solid #fff',
                boxShadow: '0 6px 16px rgba(15, 23, 42, 0.18)',
                flexShrink: 0,
              }}
            />
          )}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 800,
                color: '#0071E3',
                background: '#dbeafe',
                padding: '2px 9px',
                borderRadius: 999,
                marginBottom: 4,
              }}
            >
              <BookOpen size={13} />
              书本第 {clampedRange[0]}
              {clampedRange[1] > clampedRange[0] ? ` – ${clampedRange[1]}` : ''} 页 · 1:1 同步互动课本
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
              {activeBook.zhTitle}
            </div>
            <div style={{ fontSize: 12.5, color: '#475569', marginTop: 2 }}>
              {activeBook.origTitle} · 👆 <strong>点开下方页码条，点任意生词右侧即刻弹出悬浮精讲卡</strong>！
            </div>
          </div>
        </div>

        {/* Clean Gemini-Branded Toggle / Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {mode === 'preview' && (
            <button
              type="button"
              onClick={() => handleToggleOrLoadPreview(false)}
              disabled={loadingPreview || !pagesData}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 15px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 13.5,
                cursor: loadingPreview ? 'wait' : 'pointer',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.26)',
              }}
            >
              {loadingPreview ? (
                <Loader2 size={15} className="qvr-spin" />
              ) : (
                <GeminiBadge variant="onDark" label="Gemini" size="sm" />
              )}
              {loadingPreview
                ? '正在生成预习指南…'
                : previewGuide
                  ? previewOpen
                    ? '收起预习导读 ▲'
                    : '✓ 已有预习导读（展开 ▼）'
                  : '生成本页预习导读 & 抄书指南'}
            </button>
          )}

          {mode === 'review' && (
            <button
              type="button"
              onClick={() => handleToggleOrLoadReview(false)}
              disabled={loadingReview || !pagesData}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 15px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 13.5,
                cursor: loadingReview ? 'wait' : 'pointer',
                boxShadow: '0 4px 12px rgba(15, 118, 110, 0.24)',
              }}
            >
              {loadingReview ? (
                <Loader2 size={15} className="qvr-spin" />
              ) : (
                <GeminiBadge variant="onDark" label="Gemini" size="sm" />
              )}
              {loadingReview
                ? '正在提炼重点与小测…'
                : reviewCoach
                  ? reviewOpen
                    ? '收起重点与小测 ▲'
                    : '✓ 已有重点与小测（展开 ▼）'
                  : '提炼本页重点 + 3道随堂小测'}
            </button>
          )}

          {(mode === 'workbook' || activeBook.isWorkbook || activeBook.id.startsWith('tutor-')) && (
            <button
              type="button"
              onClick={() =>
                handleToggleOrExplainExercises(activeBook, clampedRange, combinedPageText, false, false)
              }
              disabled={loadingExplain || !pagesData}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 15px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #0284c7 0%, #0071E3 100%)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 13.5,
                cursor: loadingExplain ? 'wait' : 'pointer',
                boxShadow: '0 4px 12px rgba(0, 113, 227, 0.24)',
              }}
            >
              {loadingExplain ? (
                <Loader2 size={15} className="qvr-spin" />
              ) : (
                <GeminiBadge variant="onDark" label="Gemini" size="sm" />
              )}
              {loadingExplain
                ? '正在解析本页题目…'
                : exerciseExplain
                  ? explainOpen
                    ? '收起题干讲解 ▲'
                    : '✓ 已有题干讲解（展开 ▼）'
                  : '翻译本页题干 & 讲讲怎么做'}
            </button>
          )}
        </div>
      </div>

      {/* Linked History Story Hall Banner */}
      {linkedStories.length > 0 && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            background: '#fffbeb',
            border: '1.5px solid #fcd34d',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 800, color: '#92400e' }}>
            <Headphones size={17} color="#d97706" />
            本页关联历史故事馆音频：{linkedStories.map((s) => `《${s.titleZh}》`).join('、')}
          </div>
          <Link
            to="/history"
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              background: '#f59e0b',
              color: '#fff',
              textDecoration: 'none',
              fontSize: 12.5,
              fontWeight: 800,
            }}
          >
            去听这课故事 →
          </Link>
        </div>
      )}

      {/* 3. COLLAPSIBLE PREVIEW MODE PANEL */}
      {previewErr && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>
          {previewErr}
        </div>
      )}
      {mode === 'preview' && previewGuide && previewOpen && (
        <div
          style={{
            padding: 16,
            borderRadius: 14,
            background: '#faf5ff',
            border: '1.5px solid #d8b4fe',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#6b21a8' }}>
                🎬 本页预习导读 &amp; 纸质书抄写启发
              </span>
              <GeminiBadge label="Gemini AI · 已云端缓存" size="sm" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={() => handleToggleOrLoadPreview(true)}
                disabled={loadingPreview}
                title="重新调用 Gemini 生成"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 9px',
                  borderRadius: 8,
                  border: '1px solid #d8b4fe',
                  background: '#fff',
                  color: '#6b21a8',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <RotateCw size={12} /> 重新生成
              </button>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 11px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#334155',
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                收起 <ChevronUp size={14} />
              </button>
            </div>
          </div>

          <div style={{ fontSize: 14.5, color: '#1e293b', lineHeight: 1.65, background: '#fff', padding: '10px 12px', borderRadius: 10, border: '1px solid #e9d5ff' }}>
            {previewGuide.storyHook}
          </div>

          {previewGuide.writeOnBookWords?.length > 0 && (
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 900, color: '#6b21a8', marginBottom: 6 }}>
                ✏️ 建议拿铅笔直接圈在纸质书旁边的关键生词（点「+入库」同时收入背词库）：
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 8 }}>
                {previewGuide.writeOnBookWords.map((w, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#fff',
                      padding: '9px 11px',
                      borderRadius: 10,
                      border: '1px solid #e9d5ff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => speakTextbookWord(w.word, isEnglishBook)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          padding: 0,
                          fontWeight: 900,
                          fontSize: 14.5,
                          color: '#1e1b4b',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Volume2 size={14} color="#7c3aed" />
                        {w.word}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleSaveWordToBankAndCircle(
                            w.word,
                            w.lemma,
                            w.chinese,
                            w.why,
                            w.word,
                            clampedRange[0]
                          )
                        }
                        style={{
                          fontSize: 11.5,
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: 999,
                          border: '1px solid #c4b5fd',
                          background: '#f5f3ff',
                          color: '#6d28d9',
                          cursor: 'pointer',
                        }}
                      >
                        + 入库
                      </button>
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#7c3aed' }}>
                      中文：{w.chinese}
                      {w.lemma && w.lemma !== w.word ? `（原形：${w.lemma}）` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{w.why}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {previewGuide.thinkPrompts?.length > 0 && (
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 900, color: '#6b21a8', marginBottom: 4 }}>
                🧭 边读边往书上做记号的小启发：
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, color: '#334155', lineHeight: 1.65 }}>
                {previewGuide.thinkPrompts.map((tp, i) => (
                  <li key={i}>{tp}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 4. REVIEW MODE: Previously Circled / Matched Vocab Self-Test Strip */}
      {mode === 'review' && matchedVocabOnPage.length > 0 && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 14,
            background: '#fffbeb',
            border: '1.5px solid #fde68a',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 13.5, fontWeight: 900, color: '#92400e' }}>
              ⭐ 本页你圈过不会的词 &amp; 笔记重点词（共 {matchedVocabOnPage.length} 个）：
            </div>
            <button
              type="button"
              onClick={() => setMaskChinese((v) => !v)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 11px',
                borderRadius: 999,
                border: '1px solid #f59e0b',
                background: maskChinese ? '#f59e0b' : '#fff',
                color: maskChinese ? '#fff' : '#b45309',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {maskChinese ? <Eye size={13} /> : <EyeOff size={13} />}
              {maskChinese ? '显示中文答案' : '🙈 遮住中文考自己'}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {matchedVocabOnPage.map((cw, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => speakTextbookWord(cw.raw || cw.lemma, isEnglishBook)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  borderRadius: 10,
                  background: '#fff',
                  border: '1px solid #fcd34d',
                  cursor: 'pointer',
                  fontSize: 13.5,
                }}
              >
                <Volume2 size={13} color="#d97706" />
                <strong style={{ color: '#0f172a' }}>{cw.lemma}</strong>
                <span
                  style={{
                    color: maskChinese ? 'transparent' : '#b45309',
                    background: maskChinese ? '#fde68a' : 'transparent',
                    borderRadius: 4,
                    padding: '0 4px',
                    fontWeight: 700,
                    userSelect: 'none',
                  }}
                >
                  {cw.chinese || '已圈重点'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. COLLAPSIBLE REVIEW MODE: Core Points + 3-Question Mini Quiz */}
      {reviewErr && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>
          {reviewErr}
        </div>
      )}
      {mode === 'review' && reviewCoach && reviewOpen && (
        <div
          style={{
            padding: 16,
            borderRadius: 14,
            background: '#f0fdfa',
            border: '1.5px solid #5eead4',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#0f766e' }}>
                🎯 本页必会核心重点 &amp; 3 道随堂小测
              </span>
              <GeminiBadge label="Gemini AI · 已云端缓存" size="sm" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={() => handleToggleOrLoadReview(true)}
                disabled={loadingReview}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 9px',
                  borderRadius: 8,
                  border: '1px solid #5eead4',
                  background: '#fff',
                  color: '#0f766e',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <RotateCw size={12} /> 重新生成
              </button>
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 11px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#334155',
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                收起 <ChevronUp size={14} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reviewCoach.corePoints?.map((pt, i) => (
              <div key={i} style={{ background: '#fff', padding: '10px 12px', borderRadius: 10, border: '1px solid #99f6e4' }}>
                <div style={{ fontWeight: 900, fontSize: 14, color: '#115e59' }}>
                  {i + 1}. {pt.title}
                </div>
                <div style={{ fontSize: 13.5, color: '#334155', marginTop: 3, lineHeight: 1.55 }}>
                  {pt.detail}
                </div>
              </div>
            ))}
          </div>

          {reviewCoach.quiz?.length > 0 && (
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 900, color: '#0f766e', marginBottom: 8 }}>
                📝 随堂小测验（选完即看中文详解）：
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reviewCoach.quiz.map((q, qIdx) => {
                  const picked = quizSelected[qIdx];
                  const answered = picked !== undefined;
                  const isCorrect = picked === q.answerIndex;
                  return (
                    <div key={qIdx} style={{ background: '#fff', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 8 }}>
                        Q{qIdx + 1}. {q.question}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 7 }}>
                        {q.options.map((opt, oIdx) => {
                          const isThisPicked = picked === oIdx;
                          const isThisRight = oIdx === q.answerIndex;
                          let bg = '#f8fafc';
                          let bd = '1px solid #cbd5e1';
                          let col = '#1e293b';
                          if (answered) {
                            if (isThisRight) {
                              bg = '#dcfce7';
                              bd = '1.5px solid #10b981';
                              col = '#065f46';
                            } else if (isThisPicked) {
                              bg = '#fee2e2';
                              bd = '1.5px solid #ef4444';
                              col = '#991b1b';
                            }
                          }
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => setQuizSelected((prev) => ({ ...prev, [qIdx]: oIdx }))}
                              style={{
                                textAlign: 'left',
                                padding: '8px 11px',
                                borderRadius: 9,
                                border: bd,
                                background: bg,
                                color: col,
                                fontSize: 13.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {answered && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: '8px 10px',
                            borderRadius: 8,
                            background: isCorrect ? '#ecfdf5' : '#fff7ed',
                            color: isCorrect ? '#065f46' : '#9a3412',
                            fontSize: 13,
                            lineHeight: 1.5,
                          }}
                        >
                          <strong>{isCorrect ? '✅ 答对啦！' : '💡 再看看解析：'}</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. COLLAPSIBLE WORKBOOK / EXERCISE EXPLANATION PANEL */}
      {explainErr && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>
          {explainErr}
        </div>
      )}
      {exerciseExplain && exerciseExplain.items?.length > 0 && explainOpen && (
        <div
          style={{
            padding: 16,
            borderRadius: 14,
            background: '#eff6ff',
            border: '1.5px solid #93c5fd',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14.5, fontWeight: 900, color: '#1d4ed8' }}>
                💡 本页题目逐题翻译与解题思路（看懂要求后自己动笔做在书上）
              </span>
              <GeminiBadge label="Gemini AI · 已云端缓存" size="sm" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={() =>
                  handleToggleOrExplainExercises(activeBook, clampedRange, combinedPageText, false, true)
                }
                disabled={loadingExplain}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 9px',
                  borderRadius: 8,
                  border: '1px solid #93c5fd',
                  background: '#fff',
                  color: '#1d4ed8',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <RotateCw size={12} /> 重新生成
              </button>
              <button
                type="button"
                onClick={() => setExplainOpen(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 11px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#334155',
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                收起 <ChevronUp size={14} />
              </button>
            </div>
          </div>

          {exerciseExplain.items.map((it, idx) => (
            <div key={idx} style={{ background: '#fff', padding: '10px 12px', borderRadius: 10, border: '1px solid #bfdbfe' }}>
              <div style={{ fontWeight: 900, fontSize: 14, color: '#1e3a8a' }}>{it.title}</div>
              <div style={{ fontSize: 13.5, color: '#0f172a', marginTop: 4 }}>
                <strong>📋 题目让你做什么：</strong>
                {it.instructionZh}
              </div>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 3 }}>
                <strong>🎯 考查重点：</strong>
                {it.grammarFocus} · <strong>🧠 怎么想：</strong>
                {it.howToSolve}
              </div>
              <div style={{ fontSize: 12.5, color: '#0369a1', marginTop: 4, background: '#f0f9ff', padding: '5px 8px', borderRadius: 6 }}>
                <strong>✨ 示范小提示：</strong>
                {it.exampleHint}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 7. TOP FULL DETAILED WORD EXPLANATION CARD (Jump target from Right-Side Floating Widget!) */}
      {selectedWordInfo && (
        <div
          ref={topWordCardRef}
          style={{
            padding: '14px 16px',
            borderRadius: 14,
            background: '#fffef5',
            border: highlightTopCard ? '2.5px solid #ea580c' : '2px solid #f59e0b',
            boxShadow: highlightTopCard
              ? '0 0 0 4px rgba(249, 115, 22, 0.25), 0 8px 24px rgba(245, 158, 11, 0.22)'
              : '0 8px 24px rgba(245, 158, 11, 0.16)',
            transition: 'all 0.25s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => speakTextbookWord(selectedWordInfo.word, isEnglishBook)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 11px',
                  borderRadius: 999,
                  border: 'none',
                  background: '#f59e0b',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <Volume2 size={15} />
                听发音
              </button>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                {selectedWordInfo.word}
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                （第 {selectedWordInfo.pageNo} 页完整精讲）
              </span>
              <GeminiBadge label="Gemini 词义精讲" size="sm" />
            </div>
            <button
              type="button"
              onClick={() => setSelectedWordInfo(null)}
              style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>

          {selectedWordInfo.loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: '#b45309', fontWeight: 700 }}>
              <Loader2 size={16} className="qvr-spin" />
              Gemini 正在结合课本原句分析准确词义与语法变形…
            </div>
          )}

          {selectedWordInfo.error && (
            <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 700 }}>{selectedWordInfo.error}</div>
          )}

          {selectedWordInfo.data && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 17, fontWeight: 900, color: '#b45309' }}>
                  意思：{selectedWordInfo.data.chinese}
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#0f766e', background: '#ccfbf1', padding: '2px 8px', borderRadius: 6 }}>
                  词典原形：{selectedWordInfo.data.lemma}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', background: '#f8fafc', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <strong>📖 所在课本原句：</strong>
                {selectedWordInfo.sentence}
              </div>
              <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.55 }}>
                <strong>🔍 词形说明：</strong>
                {selectedWordInfo.data.formNote}
              </div>
              <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.55 }}>
                <strong>💡 用法巧记：</strong>
                {selectedWordInfo.data.usageTip}
              </div>

              {mode === 'preview' && (
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#7c3aed', background: '#f5f3ff', padding: '6px 10px', borderRadius: 8 }}>
                  ✏️ 预习动笔提示：快用铅笔把「{selectedWordInfo.data.chinese}」标在纸质书第 {selectedWordInfo.pageNo} 页这个词旁边！
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 2 }}>
                <button
                  type="button"
                  onClick={() =>
                    handleSaveWordToBankAndCircle(
                      selectedWordInfo.word,
                      selectedWordInfo.data!.lemma,
                      selectedWordInfo.data!.chinese,
                      selectedWordInfo.data!.formNote,
                      selectedWordInfo.sentence,
                      selectedWordInfo.pageNo
                    )
                  }
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 16px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#10b981',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={16} />
                  圈为重点 &amp; 加入生词题库（存原形 {selectedWordInfo.data.lemma}）
                </button>
                {selectedWordInfo.addedMsg && (
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#047857' }}>
                    {selectedWordInfo.addedMsg}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* 8. COLLAPSIBLE PER-PAGE ACCORDION SHEETS (Default Folded!) */}
      {loadingBook && (
        <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
          正在打开课本第 {clampedRange[0]}–{clampedRange[1]} 页…
        </div>
      )}
      {bookErr && (
        <div style={{ padding: 12, borderRadius: 10, background: '#fef2f2', color: '#b91c1c', fontSize: 13 }}>
          {bookErr}
        </div>
      )}
      {pagesData && !loadingBook && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Accordion Master Toolbar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              borderRadius: 10,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#475569' }}>
              📑 课本页码目录（共 {pageNumbersList.length} 页 · 点开需要的页阅读选词，看完随时收起）：
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11.5, color: '#64748b' }}>
                🟢 绿底=已入库 · 🟡 黄底=本页圈出
              </span>
              <button
                type="button"
                onClick={() => {
                  if (allPagesExpanded) {
                    setExpandedPages({});
                  } else {
                    const next: Record<number, boolean> = {};
                    for (const p of pageNumbersList) next[p] = true;
                    setExpandedPages(next);
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 999,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <FolderOpen size={13} color="#0071E3" />
                {allPagesExpanded ? '全部收起 ▲' : '全部展开 ▼'}
              </button>
            </div>
          </div>

          {pageNumbersList.map((pNo) => {
            const isExpanded = Boolean(expandedPages[pNo]);
            const rawTxt = pagesData[String(pNo)] || '';
            const previewSnippet = extractPagePreviewSnippet(rawTxt);
            const pageCircledCnt = (textbookPrefs?.circledWordsByBookPage?.[`${activeBook.id}:${pNo}`] || []).length;

            return (
              <div
                key={pNo}
                style={{
                  borderRadius: 15,
                  background: '#fffefb',
                  border: isExpanded ? '1.5px solid #60a5fa' : '1px solid #cbd5e1',
                  boxShadow: isExpanded ? '0 4px 14px rgba(37, 99, 235, 0.08)' : '0 1px 4px rgba(15, 23, 42, 0.03)',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s ease',
                }}
              >
                {/* Clickable Accordion Header Bar */}
                <button
                  type="button"
                  onClick={() => setExpandedPages((prev) => ({ ...prev, [pNo]: !prev[pNo] }))}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '12px 16px',
                    border: 'none',
                    borderBottom: isExpanded ? '1px dashed #cbd5e1' : 'none',
                    background: isExpanded
                      ? 'linear-gradient(90deg, #eff6ff 0%, #f8fafc 100%)'
                      : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        flexShrink: 0,
                        padding: '3px 10px',
                        borderRadius: 8,
                        background: isExpanded ? '#2563eb' : '#e2e8f0',
                        color: isExpanded ? '#ffffff' : '#1e293b',
                        fontSize: 13,
                        fontWeight: 900,
                      }}
                    >
                      📖 第 {pNo} 页
                    </span>
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: '#334155',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {previewSnippet}
                    </span>
                    {pageCircledCnt > 0 && (
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: 11.5,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: '#fef3c7',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                        }}
                      >
                        ⭐ 圈词 {pageCircledCnt}
                      </span>
                    )}
                  </div>

                  <span
                    style={{
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12.5,
                      fontWeight: 800,
                      color: isExpanded ? '#1d4ed8' : '#0071E3',
                      background: isExpanded ? '#dbeafe' : '#f0f9ff',
                      padding: '4px 10px',
                      borderRadius: 999,
                    }}
                  >
                    {isExpanded ? (
                      <>
                        收起本页 <ChevronUp size={15} />
                      </>
                    ) : (
                      <>
                        展开阅读 <ChevronDown size={15} />
                      </>
                    )}
                  </span>
                </button>

                {isExpanded && (
                  <div style={{ padding: '16px 20px' }}>
                    {renderClickablePageText(rawTxt, pNo)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 9. PREVIEW MODE: Compare Student's Chinese Summary vs Real Textbook Key Points */}
      {mode === 'preview' && previewGuide?.keyPointsForCheck && studentSummary.trim().length >= 3 && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            background: '#ecfdf5',
            border: '1.5px solid #6ee7b7',
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 900, color: '#047857', marginBottom: 6 }}>
            ✅ 你已写完中文大意！对照看看本页真实讲的 3 个核心要点（也会同步附在今日报告里）：
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, color: '#065f46', lineHeight: 1.6 }}>
            {previewGuide.keyPointsForCheck.map((kp, i) => (
              <li key={i}>{kp}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 10. PAIRED WORKBOOK AUTO-LINK DRAWER */}
      {pairedWbInfo && effectiveWbRange && (
        <div
          style={{
            borderRadius: 14,
            border: '1.5px solid #c4b5fd',
            background: '#f5f3ff',
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            onClick={() => setShowPairedWb((v) => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '11px 14px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {pairedWbInfo.wbBook.coverUrl && (
                <img
                  src={pairedWbInfo.wbBook.coverUrl}
                  alt={pairedWbInfo.wbBook.shortTitle}
                  style={{ width: 32, height: 44, objectFit: 'cover', borderRadius: 5, border: '1px solid #cbd5e1' }}
                />
              )}
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#5b21b6' }}>
                  📒 本课自动关联练习册：{pairedWbInfo.wbBook.shortTitle}（第 {effectiveWbRange[0]}–{effectiveWbRange[1]} 页）
                </div>
                <div style={{ fontSize: 12, color: '#6d28d9' }}>
                  对应章节：{pairedWbInfo.unitTitle} · 点开直接对照练习题 &amp; 听讲题思路
                </div>
              </div>
            </div>
            {showPairedWb ? <ChevronUp size={18} color="#5b21b6" /> : <ChevronDown size={18} color="#5b21b6" />}
          </button>

          {showPairedWb && (
            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#4c1d95' }}>
                  练习册页码微调：第
                  <input
                    type="number"
                    min={pairedWbInfo.wbBook.minPage}
                    max={pairedWbInfo.wbBook.maxPage}
                    value={effectiveWbRange[0]}
                    onChange={(e) => {
                      const v = Math.max(1, Number(e.target.value) || 1);
                      setWbCustomRange([v, Math.max(v, effectiveWbRange[1])]);
                    }}
                    style={{ width: 48, padding: '3px 6px', borderRadius: 6, border: '1px solid #c4b5fd', textAlign: 'center', fontWeight: 800 }}
                  />
                  至
                  <input
                    type="number"
                    min={effectiveWbRange[0]}
                    max={pairedWbInfo.wbBook.maxPage}
                    value={effectiveWbRange[1]}
                    onChange={(e) => {
                      const v = Math.max(effectiveWbRange[0], Number(e.target.value) || effectiveWbRange[0]);
                      setWbCustomRange([effectiveWbRange[0], Math.min(effectiveWbRange[0] + 4, v)]);
                    }}
                    style={{ width: 48, padding: '3px 6px', borderRadius: 6, border: '1px solid #c4b5fd', textAlign: 'center', fontWeight: 800 }}
                  />
                  页
                </div>

                <button
                  type="button"
                  disabled={loadingWbExplain || !wbPagesData}
                  onClick={() => {
                    if (!wbPagesData) return;
                    const txts: string[] = [];
                    for (let p = effectiveWbRange[0]; p <= effectiveWbRange[1]; p++) {
                      if (wbPagesData[String(p)]) txts.push(`【练习册第 ${p} 页】\n${wbPagesData[String(p)]}`);
                    }
                    handleToggleOrExplainExercises(pairedWbInfo.wbBook, effectiveWbRange, txts.join('\n\n'), true, false);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 13px',
                    borderRadius: 9,
                    border: 'none',
                    background: '#6d28d9',
                    color: '#fff',
                    fontSize: 12.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {loadingWbExplain ? (
                    <Loader2 size={14} className="qvr-spin" />
                  ) : (
                    <GeminiBadge variant="onDark" label="Gemini" size="sm" />
                  )}
                  {wbExplain
                    ? wbExplainOpen
                      ? '收起练习册解析 ▲'
                      : '✓ 已有练习册解析（展开 ▼）'
                    : '讲讲配套练习册这几题怎么做'}
                </button>
              </div>

              {wbExplain && wbExplain.items?.length > 0 && wbExplainOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <GeminiBadge label="Gemini AI · 已云端缓存" size="sm" />
                    <button
                      type="button"
                      onClick={() => setWbExplainOpen(false)}
                      style={{
                        border: '1px solid #ddd6fe',
                        background: '#fff',
                        borderRadius: 6,
                        padding: '3px 9px',
                        fontSize: 12,
                        fontWeight: 800,
                        color: '#5b21b6',
                        cursor: 'pointer',
                      }}
                    >
                      收起 ▲
                    </button>
                  </div>
                  {wbExplain.items.map((it, i) => (
                    <div key={i} style={{ background: '#fff', padding: '9px 12px', borderRadius: 9, border: '1px solid #ddd6fe', fontSize: 13 }}>
                      <div style={{ fontWeight: 900, color: '#5b21b6' }}>{it.title}</div>
                      <div style={{ marginTop: 2 }}>
                        <strong>📋 题意：</strong>
                        {it.instructionZh}
                      </div>
                      <div style={{ marginTop: 2, color: '#475569' }}>
                        <strong>🧠 思路：</strong>
                        {it.howToSolve}（提示：{it.exampleHint}）
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {wbPagesData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Array.from(
                    { length: effectiveWbRange[1] - effectiveWbRange[0] + 1 },
                    (_, i) => effectiveWbRange[0] + i
                  ).map((wp) => (
                    <div key={wp} style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', border: '1px solid #ddd6fe' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#6d28d9', marginBottom: 6 }}>
                        📒 {pairedWbInfo.wbBook.shortTitle} · 第 {wp} 页（题干生词同样可点击查义）
                      </div>
                      {renderClickablePageText(wbPagesData[String(wp)] || '', wp)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 11. RIGHT-SIDE FLOATING WORD QUICK-WIDGET (Positioned Safely Above GlobalTimerWidget!) */}
      {selectedWordInfo && (
        <div
          style={{
            position: 'fixed',
            right: 18,
            bottom: 'calc(max(18px, env(safe-area-inset-bottom)) + 216px)',
            width: 'min(308px, calc(100vw - 36px))',
            maxHeight: 'calc(100vh - 252px)',
            overflowY: 'auto',
            zIndex: 945,
            borderRadius: 16,
            background: 'rgba(255, 254, 245, 0.98)',
            backdropFilter: 'blur(14px)',
            border: '2px solid #f59e0b',
            boxShadow: '0 14px 36px rgba(15, 23, 42, 0.22)',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <button
                type="button"
                onClick={() => speakTextbookWord(selectedWordInfo.word, isEnglishBook)}
                title="朗读单词发音"
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: 'none',
                  background: '#f59e0b',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                <Volume2 size={14} />
              </button>
              <strong
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: '#0f172a',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedWordInfo.word}
              </strong>
              <span style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>
                P.{selectedWordInfo.pageNo}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <GeminiStarIcon size={14} />
              <button
                type="button"
                onClick={() => setSelectedWordInfo(null)}
                title="关闭查词悬浮窗"
                style={{
                  border: 'none',
                  background: '#fef3c7',
                  color: '#92400e',
                  borderRadius: 6,
                  width: 24,
                  height: 24,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {selectedWordInfo.loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#b45309', fontWeight: 700, padding: '4px 0' }}>
              <Loader2 size={14} className="qvr-spin" />
              Gemini 正在解析词义与变形…
            </div>
          )}

          {selectedWordInfo.error && (
            <div style={{ fontSize: 12.5, color: '#dc2626', fontWeight: 700 }}>{selectedWordInfo.error}</div>
          )}

          {selectedWordInfo.data && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 15.5, fontWeight: 900, color: '#b45309' }}>
                  {selectedWordInfo.data.chinese}
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: '#0f766e', background: '#ccfbf1', padding: '1px 7px', borderRadius: 6 }}>
                  原形: {selectedWordInfo.data.lemma}
                </span>
              </div>

              <div
                style={{
                  fontSize: 12.5,
                  color: '#334155',
                  lineHeight: 1.5,
                  background: '#ffffff',
                  padding: '6px 9px',
                  borderRadius: 8,
                  border: '1px solid #fde68a',
                }}
              >
                <div>🔍 {selectedWordInfo.data.formNote}</div>
                {selectedWordInfo.data.usageTip && (
                  <div style={{ marginTop: 3, color: '#475569' }}>💡 {selectedWordInfo.data.usageTip}</div>
                )}
              </div>

              {selectedWordInfo.addedMsg && (
                <div style={{ fontSize: 12, fontWeight: 800, color: '#047857', background: '#ecfdf5', padding: '4px 8px', borderRadius: 6 }}>
                  {selectedWordInfo.addedMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                <button
                  type="button"
                  onClick={() =>
                    handleSaveWordToBankAndCircle(
                      selectedWordInfo.word,
                      selectedWordInfo.data!.lemma,
                      selectedWordInfo.data!.chinese,
                      selectedWordInfo.data!.formNote,
                      selectedWordInfo.sentence,
                      selectedWordInfo.pageNo
                    )
                  }
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '8px 10px',
                    borderRadius: 9,
                    border: 'none',
                    background: '#10b981',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 12.5,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
                  圈为重点并入库
                </button>

                <button
                  type="button"
                  onClick={handleJumpToTopWordCard}
                  title="平滑滚动回顶部查看完整原句对照与详细说明"
                  style={{
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: '8px 10px',
                    borderRadius: 9,
                    border: '1px solid #fcd34d',
                    background: '#fffbeb',
                    color: '#92400e',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  <ArrowUp size={13} />
                  顶部详情
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Headphones,
  HelpCircle,
  Lightbulb,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
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
  speakTextbookWord,
  type ExerciseExplainResult,
  type PreviewGuideResult,
  type ReviewCoachResult,
  type TextbookMeta,
  type WordAssistResult,
} from '../lib/textbookService';

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

  // Word popover state
  const [selectedWordInfo, setSelectedWordInfo] = useState<{
    word: string;
    sentence: string;
    pageNo: number;
    loading: boolean;
    error?: string;
    data?: WordAssistResult;
    addedMsg?: string;
  } | null>(null);

  // Mode-specific AI panels
  const [previewGuide, setPreviewGuide] = useState<PreviewGuideResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewErr, setPreviewErr] = useState<string | null>(null);

  const [reviewCoach, setReviewCoach] = useState<ReviewCoachResult | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [reviewErr, setReviewErr] = useState<string | null>(null);
  const [quizSelected, setQuizSelected] = useState<Record<number, number>>({});

  const [exerciseExplain, setExerciseExplain] = useState<ExerciseExplainResult | null>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [explainErr, setExplainErr] = useState<string | null>(null);

  // Paired Workbook drawer inside Review / Preview
  const [showPairedWb, setShowPairedWb] = useState(mode === 'review');
  const [wbPagesData, setWbPagesData] = useState<Record<string, string> | null>(null);
  const [wbCustomRange, setWbCustomRange] = useState<[number, number] | null>(null);
  const [wbExplain, setWbExplain] = useState<ExerciseExplainResult | null>(null);
  const [loadingWbExplain, setLoadingWbExplain] = useState(false);

  // Self-test mask toggle for circled / recorded words in Review mode
  const [maskChinese, setMaskChinese] = useState(false);

  // Reset per-page AI panels when book or page range changes
  useEffect(() => {
    setSelectedWordInfo(null);
    setPreviewGuide(null);
    setPreviewErr(null);
    setReviewCoach(null);
    setReviewErr(null);
    setQuizSelected({});
    setExerciseExplain(null);
    setExplainErr(null);
    setWbCustomRange(null);
    setWbExplain(null);
  }, [activeBookId, fromPage, toPage]);

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

  const clampedRange = useMemo<[number, number]>(() => {
    if (!activeBook) return [fromPage, toPage];
    const fp = Math.max(activeBook.minPage, Math.min(activeBook.maxPage, fromPage || 1));
    const tp = Math.max(fp, Math.min(activeBook.maxPage, Math.min(fp + 5, toPage || fp)));
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

  // Normalized lookup sets for highlighting words on page
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

  // Also match any customVocab words that appear on the currently displayed pages
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

  const handleTapWord = async (rawToken: string, lineText: string, pageNo: number) => {
    const cleanWord = rawToken.replace(/^[’']+|[’']+$/g, '').trim();
    if (!cleanWord) return;
    speakTextbookWord(cleanWord, isEnglishBook);

    setSelectedWordInfo({
      word: cleanWord,
      sentence: lineText,
      pageNo,
      loading: true,
    });

    // Check fast local dictionary hint while still fetching rich context usage from Gemini
    const norm = normalizeGreekKey(cleanWord);
    const localHit = findVocabSuggestions(cleanWord, 2).find(
      (s) => normalizeGreekKey(s.greek) === norm
    );

    try {
      const cacheKey = `word:${activeBook.id}:${pageNo}:${cleanWord}:${lineText.slice(0, 60)}`;
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

    // 1. Always save into circledWordsByBookPage so this page remembers Leon circled it!
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

    // 2. If it is a Greek word, also add directly into custom_vocab for the 8 practice modules & Ebbinghaus!
    const hasGreek = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(cleanLemma);
    if (!hasGreek) {
      setSelectedWordInfo((prev) =>
        prev ? { ...prev, addedMsg: '✓ 已加入本页重点生词卡（英文词不混入希腊语拼写题库）' } : null
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
        prev ? { ...prev, addedMsg: `✓「${vRes.greek}」已在生词题库中，并已标记为本页重点词！` } : null
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
            addedMsg: `🎉 已按标准原形「${vRes.greek} = ${vRes.chinese}」收入题库并圈在本页！`,
          }
        : null
    );
  };

  const handleLoadPreviewGuide = async () => {
    if (!combinedPageText.trim() || loadingPreview) return;
    setLoadingPreview(true);
    setPreviewErr(null);
    try {
      const key = `pv_guide:${activeBook.id}:${clampedRange[0]}-${clampedRange[1]}`;
      const data = await callTextbookAssist<PreviewGuideResult>(key, {
        mode: 'preview_guide',
        bookTitle: activeBook.zhTitle,
        pageRange: `书本第 ${clampedRange[0]}–${clampedRange[1]} 页`,
        pageText: combinedPageText,
      });
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

  const handleLoadReviewCoach = async () => {
    if (!combinedPageText.trim() || loadingReview) return;
    setLoadingReview(true);
    setReviewErr(null);
    try {
      let wbTxt = '';
      if (pairedWbInfo && wbPagesData && effectiveWbRange) {
        const arr: string[] = [];
        for (let p = effectiveWbRange[0]; p <= effectiveWbRange[1]; p++) {
          if (wbPagesData[String(p)]) arr.push(wbPagesData[String(p)]);
        }
        wbTxt = arr.join('\n');
      }
      const key = `rv_coach:${activeBook.id}:${clampedRange[0]}-${clampedRange[1]}`;
      const data = await callTextbookAssist<ReviewCoachResult>(key, {
        mode: 'review_coach',
        bookTitle: activeBook.zhTitle,
        pageRange: `书本第 ${clampedRange[0]}–${clampedRange[1]} 页`,
        pageText: combinedPageText,
        workbookText: wbTxt,
      });
      setReviewCoach(data);
    } catch (e: any) {
      setReviewErr(e?.message || '生成复习重点与小测失败，请重试');
    } finally {
      setLoadingReview(false);
    }
  };

  const handleExplainExercises = async (
    targetBook: TextbookMeta,
    pRange: [number, number],
    rawTxt: string,
    isPairedDrawer = false
  ) => {
    if (!rawTxt.trim()) return;
    if (isPairedDrawer) {
      setLoadingWbExplain(true);
    } else {
      setLoadingExplain(true);
      setExplainErr(null);
    }
    try {
      const key = `ex_explain:${targetBook.id}:${pRange[0]}-${pRange[1]}`;
      const data = await callTextbookAssist<ExerciseExplainResult>(key, {
        mode: 'explain_exercise',
        bookTitle: targetBook.zhTitle,
        pageRange: `第 ${pRange[0]}–${pRange[1]} 页`,
        exerciseText: rawTxt,
      });
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

  const renderClickablePageText = (pageText: string, pageNo: number) => {
    if (!pageText || pageText.includes('*(本页为空白页或纯插图页)*')) {
      return (
        <div style={{ padding: '18px 14px', color: '#94a3b8', fontStyle: 'italic', fontSize: 14 }}>
          （本页在纸质原书中为纯插图页或过渡页，请对照纸质书插图查看）
        </div>
      );
    }

    const lines = pageText.split('\n');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={lIdx} style={{ height: 4 }} />;

          const isHeaderLine =
            trimmed.startsWith('###') ||
            /^(ΕΝΟΤΗΤΑ|ΚΕΦΑΛΑΙΟ|Unit\s+\d+|Lesson\s+\d+)/i.test(trimmed);

          const tokens = trimmed.split(WORD_SPLIT_RE);
          return (
            <div
              key={lIdx}
              style={{
                fontSize: isHeaderLine ? 16 : 15.5,
                fontWeight: isHeaderLine ? 800 : 500,
                color: isHeaderLine ? '#1e3a8a' : '#1e293b',
                lineHeight: 1.75,
                wordBreak: 'break-word',
              }}
            >
              {tokens.map((tok, tIdx) => {
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
                    onClick={() => handleTapWord(tok, trimmed, pageNo)}
                    title="点一下听发音、看本句意思与用法，可一键加入生词库"
                    style={{
                      cursor: 'pointer',
                      padding: '1px 3px',
                      margin: '0 0.5px',
                      borderRadius: 5,
                      transition: 'background 0.15s',
                      background: isSelected
                        ? '#fde047'
                        : isCircled
                          ? '#fef3c7'
                          : isRecorded
                            ? '#dcfce7'
                            : 'transparent',
                      borderBottom: isCircled
                        ? '2px solid #f59e0b'
                        : isRecorded
                          ? '1.5px dashed #10b981'
                          : '1px dotted rgba(100, 116, 139, 0.35)',
                    }}
                  >
                    {tok}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

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
      {/* 1. Visual Book Cover Selector (when subject has multiple volumes like Α / Β / Γ) */}
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
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      共 {bk.maxPage} 页
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Prominent Active Book Cover + Current Page Range Banner */}
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
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#0071E3', background: '#dbeafe', padding: '2px 9px', borderRadius: 999, marginBottom: 4 }}>
              <BookOpen size={13} />
              书本第 {clampedRange[0]}
              {clampedRange[1] > clampedRange[0] ? ` – ${clampedRange[1]}` : ''} 页 · 1:1 同步互动课本
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
              {activeBook.zhTitle}
            </div>
            <div style={{ fontSize: 12.5, color: '#475569', marginTop: 2 }}>
              {activeBook.origTitle} · 👆 <strong>直接用手指点下面课文里任何不懂的词</strong>，秒看讲解并一键入库！
            </div>
          </div>
        </div>

        {/* Action Buttons per Mode */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {mode === 'preview' && (
            <button
              type="button"
              onClick={handleLoadPreviewGuide}
              disabled={loadingPreview || !pagesData}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: 12,
                border: 'none',
                background: '#7c3aed',
                color: '#fff',
                fontWeight: 800,
                fontSize: 13.5,
                cursor: loadingPreview ? 'wait' : 'pointer',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.28)',
              }}
            >
              {loadingPreview ? <Loader2 size={16} className="qvr-spin" /> : <Pencil size={16} />}
              {previewGuide ? '重新获取预习抄书指南' : '✨ 生成本页预习导读 & 抄书指南'}
            </button>
          )}

          {mode === 'review' && (
            <button
              type="button"
              onClick={handleLoadReviewCoach}
              disabled={loadingReview || !pagesData}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: 12,
                border: 'none',
                background: '#0f766e',
                color: '#fff',
                fontWeight: 800,
                fontSize: 13.5,
                cursor: loadingReview ? 'wait' : 'pointer',
                boxShadow: '0 4px 12px rgba(15, 118, 110, 0.25)',
              }}
            >
              {loadingReview ? <Loader2 size={16} className="qvr-spin" /> : <Sparkles size={16} />}
              {reviewCoach ? '刷新本页重点 & 测验' : '🎯 提炼本页重点 + 3道随堂小测'}
            </button>
          )}

          {(mode === 'workbook' || activeBook.isWorkbook || activeBook.id.startsWith('tutor-')) && (
            <button
              type="button"
              onClick={() => handleExplainExercises(activeBook, clampedRange, combinedPageText, false)}
              disabled={loadingExplain || !pagesData}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: 12,
                border: 'none',
                background: '#0071E3',
                color: '#fff',
                fontWeight: 800,
                fontSize: 13.5,
                cursor: loadingExplain ? 'wait' : 'pointer',
                boxShadow: '0 4px 12px rgba(0, 113, 227, 0.25)',
              }}
            >
              {loadingExplain ? <Loader2 size={16} className="qvr-spin" /> : <Lightbulb size={16} />}
              💡 翻译本页题干 &amp; 讲讲怎么做
            </button>
          )}
        </div>
      </div>

      {/* Linked History Story Hall Banner when viewing History Textbook */}
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

      {/* 3. PREVIEW MODE: Inspire what to write on paper book */}
      {previewErr && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>
          {previewErr}
        </div>
      )}
      {mode === 'preview' && previewGuide && (
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
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#6b21a8', marginBottom: 4 }}>
              🎬 30 秒预习导读（先看大意再读希腊语不发怵）：
            </div>
            <div style={{ fontSize: 14.5, color: '#1e293b', lineHeight: 1.6, background: '#fff', padding: '10px 12px', borderRadius: 10, border: '1px solid #e9d5ff' }}>
              {previewGuide.storyHook}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#6b21a8', marginBottom: 6 }}>
              ✏️ 建议先在纸质课本上圈出并标中文的重点词（也可点 `+` 直接收入生词库）：
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {previewGuide.writeOnBookWords.map((w, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '7px 11px',
                    borderRadius: 10,
                    background: '#fff',
                    border: '1px solid #d8b4fe',
                    fontSize: 13.5,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => speakTextbookWord(w.word, isEnglishBook)}
                    style={{ border: 'none', background: '#f3e8ff', color: '#7c3aed', borderRadius: 6, padding: 4, cursor: 'pointer', display: 'inline-flex' }}
                    title="听发音"
                  >
                    <Volume2 size={14} />
                  </button>
                  <strong>{w.word}</strong>
                  <span style={{ color: '#6b21a8', fontWeight: 800 }}>{w.chinese}</span>
                  <span style={{ fontSize: 11.5, color: '#64748b' }}>（{w.why}）</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleSaveWordToBankAndCircle(
                        w.word,
                        w.lemma || w.word,
                        w.chinese,
                        w.why,
                        w.word,
                        clampedRange[0]
                      )
                    }
                    style={{
                      border: '1px solid #7c3aed',
                      background: '#ede9fe',
                      color: '#5b21b6',
                      borderRadius: 6,
                      padding: '2px 7px',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                    title="我也还不熟，顺手加入生词库"
                  >
                    + 入库
                  </button>
                </div>
              ))}
            </div>
          </div>

          {previewGuide.thinkPrompts?.length > 0 && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#6b21a8', marginBottom: 4 }}>
                💡 边读边在书页空白处做记号 / 画 `?` 的启发线索：
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, color: '#334155', lineHeight: 1.6 }}>
                {previewGuide.thinkPrompts.map((tp, i) => (
                  <li key={i}>{tp}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 4. REVIEW MODE: Previously circled words & recorded vocab on these pages (with Mask Self-Test!) */}
      {mode === 'review' && matchedVocabOnPage.length > 0 && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 14,
            background: '#fffbeb',
            border: '1.5px solid #fde68a',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 13.5, fontWeight: 900, color: '#92400e' }}>
              📌 我在这几页圈出不会的内容 &amp; 已录生词（共 {matchedVocabOnPage.length} 处）：
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
              {maskChinese ? '显示全部中文' : '遮住中文考自己'}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {matchedVocabOnPage.map((cw, idx) => (
              <span
                key={idx}
                onClick={() => speakTextbookWord(cw.lemma || cw.raw, isEnglishBook)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  borderRadius: 9,
                  background: '#fff',
                  border: '1px solid #fcd34d',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
                title={cw.formNote || '点击听发音'}
              >
                <Volume2 size={13} color="#d97706" />
                <strong>{cw.lemma || cw.raw}</strong>
                {cw.raw !== cw.lemma && (
                  <span style={{ fontSize: 11.5, color: '#94a3b8' }}>({cw.raw})</span>
                )}
                <span
                  style={{
                    color: '#047857',
                    fontWeight: 800,
                    filter: maskChinese ? 'blur(5px)' : 'none',
                    userSelect: maskChinese ? 'none' : 'auto',
                  }}
                >
                  {cw.chinese}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 5. REVIEW MODE: Core Points + 3 Interactive Mini-Quiz Questions with Explanations */}
      {reviewErr && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>
          {reviewErr}
        </div>
      )}
      {mode === 'review' && reviewCoach && (
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
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 900, color: '#0f766e', marginBottom: 8 }}>
              🎯 本页课堂必会核心重点：
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reviewCoach.corePoints.map((pt, i) => (
                <div key={i} style={{ background: '#fff', padding: '10px 12px', borderRadius: 10, border: '1px solid #99f6e4' }}>
                  <div style={{ fontWeight: 800, fontSize: 13.5, color: '#0f766e' }}>
                    {i + 1}. {pt.title}
                  </div>
                  <div style={{ fontSize: 13.5, color: '#334155', marginTop: 3, lineHeight: 1.55 }}>
                    {pt.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {reviewCoach.quiz?.length > 0 && (
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 900, color: '#0f766e', marginBottom: 8 }}>
                📝 本页随堂小测验（检验今天真听懂没有，选完即看详解）：
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

      {/* 6. WORKBOOK EXERCISE EXPLANATION PANEL */}
      {explainErr && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>
          {explainErr}
        </div>
      )}
      {exerciseExplain && exerciseExplain.items?.length > 0 && (
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
          <div style={{ fontSize: 14.5, fontWeight: 900, color: '#1d4ed8' }}>
            💡 本页题目逐题翻译与解题思路（看懂要求后自己动笔做在练习册上！）：
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

      {/* 7. FLOATING / STICKY WORD EXPLANATION CARD (Appears when Leon taps any word!) */}
      {selectedWordInfo && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 14,
            background: '#fffef5',
            border: '2px solid #f59e0b',
            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.18)',
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
                （第 {selectedWordInfo.pageNo} 页）
              </span>
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
              正在结合课本原句分析准确词义与语法变形…
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
              <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.5 }}>
                <strong>🔍 词形说明：</strong>
                {selectedWordInfo.data.formNote}
              </div>
              <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.5 }}>
                <strong>💡 用法巧记：</strong>
                {selectedWordInfo.data.usageTip}
              </div>

              {mode === 'preview' && (
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#7c3aed', background: '#f5f3ff', padding: '6px 10px', borderRadius: 8 }}>
                  ✏️ 预习动笔提示：快用铅笔把「{selectedWordInfo.data.chinese}」标在纸质书第 {selectedWordInfo.pageNo} 页这个词旁边！如果不熟也可以直接点右边按钮加入生词库。
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

      {/* 8. ACTUAL 1:1 TEXTBOOK PAGE SHEETS */}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from(
            { length: clampedRange[1] - clampedRange[0] + 1 },
            (_, idx) => clampedRange[0] + idx
          ).map((pNo) => (
            <div
              key={pNo}
              style={{
                borderRadius: 14,
                background: '#fffdf8',
                border: '1px solid #e2e8f0',
                padding: '14px 16px',
                maxHeight: 420,
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px dashed #cbd5e1',
                  paddingBottom: 6,
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 900, color: '#475569' }}>
                  📖 {activeBook.shortTitle} · 纸质书第 {pNo} 页
                </span>
                <span style={{ fontSize: 11.5, color: '#94a3b8' }}>
                  绿底=已入题库 · 黄底=本页圈出 · 点击任意词查详解
                </span>
              </div>
              {renderClickablePageText(pagesData[String(pNo)] || '', pNo)}
            </div>
          ))}
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

      {/* 10. PAIRED WORKBOOK AUTO-LINK DRAWER (For Student Textbooks) */}
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
                    handleExplainExercises(pairedWbInfo.wbBook, effectiveWbRange, txts.join('\n\n'), true);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
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
                  {loadingWbExplain ? <Loader2 size={14} className="qvr-spin" /> : <HelpCircle size={14} />}
                  💡 讲讲配套练习册这几题怎么做
                </button>
              </div>

              {wbExplain && wbExplain.items?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {wbExplain.items.map((it, i) => (
                    <div key={i} style={{ background: '#fff', padding: '9px 12px', borderRadius: 9, border: '1px solid #ddd6fe', fontSize: 13 }}>
                      <div style={{ fontWeight: 900, color: '#5b21b6' }}>{it.title}</div>
                      <div style={{ marginTop: 2 }}><strong>题意：</strong>{it.instructionZh}</div>
                      <div style={{ marginTop: 2, color: '#475569' }}><strong>思路：</strong>{it.howToSolve}（提示：{it.exampleHint}）</div>
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
                    <div key={wp} style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', border: '1px solid #ddd6fe', maxHeight: 280, overflowY: 'auto' }}>
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
    </div>
  );
};

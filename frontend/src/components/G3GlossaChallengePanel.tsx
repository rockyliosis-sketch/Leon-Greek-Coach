import React, { useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle2, Loader2, Lock, Sparkles, Trophy } from 'lucide-react';
import type {
  G3ChallengeDailyLog,
  G3GlossaProgressState,
  TextbookPreferencesState,
} from '../dbService';
import {
  callTextbookAssist,
  computeG3ChallengeSummary,
  getBookById,
  loadBookPages,
  type ReviewCoachResult,
} from '../lib/textbookService';
import { InteractiveTextbookViewer } from './InteractiveTextbookViewer';

interface G3GlossaChallengePanelProps {
  todayStr: string;
  g3Progress?: G3GlossaProgressState;
  customVocab: any[];
  unitStudyDates: Record<string, string>;
  textbookPrefs?: TextbookPreferencesState;
  onSaveVocab: (nextCustomVocab: any[], nextUnitDates: Record<string, string>, addedCount: number) => void;
  onUpdateTextbookPrefs: (nextPrefs: TextbookPreferencesState) => void;
  onPassLesson: (
    nextG3Progress: G3GlossaProgressState,
    dailyLog: G3ChallengeDailyLog
  ) => void;
}

export const G3GlossaChallengePanel: React.FC<G3GlossaChallengePanelProps> = ({
  todayStr,
  g3Progress,
  customVocab,
  unitStudyDates,
  textbookPrefs,
  onSaveVocab,
  onUpdateTextbookPrefs,
  onPassLesson,
}) => {
  const [advanceExtra, setAdvanceExtra] = useState(false);

  const effectiveProgress = useMemo<G3GlossaProgressState | undefined>(() => {
    if (!advanceExtra || !g3Progress) return g3Progress;
    // Allow voluntarily continuing to the next uncompleted lesson after passing today's mandatory one
    const copyDaily = { ...(g3Progress.dailyCompletedLesson || {}) };
    delete copyDaily[todayStr];
    return { ...g3Progress, dailyCompletedLesson: copyDaily };
  }, [g3Progress, advanceExtra, todayStr]);

  const summary = useMemo(
    () => computeG3ChallengeSummary(effectiveProgress, todayStr),
    [effectiveProgress, todayStr]
  );

  const { currentUnit, currentLesson } = summary;
  const tbBook = getBookById(currentUnit.tbId);
  const wbBook = getBookById(currentUnit.wbId);

  const alreadyPassedToday = Boolean(g3Progress?.dailyCompletedLesson?.[todayStr]);
  const isCurrentLessonCompleted = (g3Progress?.completedLessonIds || []).includes(currentLesson.id);

  const [coachData, setCoachData] = useState<ReviewCoachResult | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [quizErr, setQuizErr] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [wordsAddedHere, setWordsAddedHere] = useState(0);

  useEffect(() => {
    setCoachData(null);
    setQuizErr(null);
    setAnswers({});
  }, [currentLesson.id]);

  // Auto-load the mandatory 3-question challenge quiz for today's Grade 3 lesson!
  const loadChallengeQuiz = async () => {
    if (loadingQuiz) return;
    setLoadingQuiz(true);
    setQuizErr(null);
    try {
      const [tbPages, wbPages] = await Promise.all([
        loadBookPages(currentUnit.tbId),
        loadBookPages(currentUnit.wbId),
      ]);
      const tbSlice: string[] = [];
      for (let p = currentLesson.tb[0]; p <= currentLesson.tb[1]; p++) {
        if (tbPages[String(p)]) tbSlice.push(`【课本第 ${p} 页】\n${tbPages[String(p)]}`);
      }
      const wbSlice: string[] = [];
      for (let p = currentLesson.wb[0]; p <= currentLesson.wb[1]; p++) {
        if (wbPages[String(p)]) wbSlice.push(`【练习册第 ${p} 页】\n${wbPages[String(p)]}`);
      }

      const cacheKey = `g3_challenge_quiz:${currentLesson.id}`;
      const res = await callTextbookAssist<ReviewCoachResult>(cacheKey, {
        mode: 'review_coach',
        bookTitle: `${tbBook?.zhTitle || '三年级语言课本'} · ${currentUnit.titleEl} · ${currentLesson.title}`,
        pageRange: `课本 P.${currentLesson.tb[0]}-${currentLesson.tb[1]} + 练习册 P.${currentLesson.wb[0]}-${currentLesson.wb[1]}`,
        pageText: tbSlice.join('\n\n'),
        workbookText: wbSlice.join('\n\n'),
      });
      setCoachData(res);
    } catch (e: any) {
      setQuizErr(e?.message || '闯关题加载失败，请点按钮重试');
    } finally {
      setLoadingQuiz(false);
    }
  };

  useEffect(() => {
    loadChallengeQuiz();
  }, [currentLesson.id]);

  const quizList = coachData?.quiz || [];
  const allCorrect =
    quizList.length > 0 &&
    quizList.every((q, idx) => answers[idx] === q.answerIndex);

  useEffect(() => {
    if (allCorrect && !isCurrentLessonCompleted) {
      const prevLessons = new Set(g3Progress?.completedLessonIds || []);
      prevLessons.add(currentLesson.id);

      const nextCompletedLessonIds = Array.from(prevLessons);
      const nextCompletedUnitIds = summary.orderedUnits
        .filter((u) => u.lessons.every((l) => prevLessons.has(l.id)))
        .map((u) => u.unitId);

      const nextProgress: G3GlossaProgressState = {
        completedLessonIds: nextCompletedLessonIds,
        completedUnitIds: nextCompletedUnitIds,
        dailyCompletedLesson: {
          ...(g3Progress?.dailyCompletedLesson || {}),
          [todayStr]: currentLesson.id,
        },
        lastCompletedDate: todayStr,
      };

      const log: G3ChallengeDailyLog = {
        unitId: currentUnit.unitId,
        unitTitle: `Ενότητα ${currentUnit.unitNo} · ${currentUnit.titleZh}`,
        lessonId: currentLesson.id,
        lessonTitle: currentLesson.title,
        tbBookId: currentUnit.tbId,
        tbPages: `P.${currentLesson.tb[0]}-${currentLesson.tb[1]}`,
        wbBookId: currentUnit.wbId,
        wbPages: `P.${currentLesson.wb[0]}-${currentLesson.wb[1]}`,
        quizPassed: true,
        wordsAdded: wordsAddedHere,
      };

      onPassLesson(nextProgress, log);
    }
  }, [allCorrect, isCurrentLessonCompleted]);

  const handleWrappedSaveVocab = (
    nextCustom: any[],
    nextDates: Record<string, string>,
    addedCount: number
  ) => {
    setWordsAddedHere((c) => c + addedCount);
    onSaveVocab(nextCustom, nextDates, addedCount);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Unit-Jump Progress Banner */}
      <div
        style={{
          padding: '16px 18px',
          borderRadius: 18,
          background: alreadyPassedToday
            ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
            : 'linear-gradient(135deg, #fef3c7 0%, #ede9fe 100%)',
          border: alreadyPassedToday ? '2px solid #10b981' : '2px solid #8b5cf6',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Trophy size={24} color={alreadyPassedToday ? '#059669' : '#7c3aed'} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                三年级《语言 + 练习册》跳单元强制闯关
                {alreadyPassedToday && (
                  <span style={{ marginLeft: 8, fontSize: 12.5, background: '#10b981', color: '#fff', padding: '2px 9px', borderRadius: 999 }}>
                    ✓ 今日必闯关已通过！
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                不按死顺序、跨册跳单元挑战！当前正在攻克：
                <strong style={{ color: '#5b21b6' }}>
                  {' '}
                  {tbBook?.volume} · Ενότητα {currentUnit.unitNo}《{currentUnit.titleZh}》
                </strong>
                （本单元第 {summary.lessonIndexInUnit + 1} / {currentUnit.lessons.length} 课）
              </div>
            </div>
          </div>

          <div style={{ fontSize: 13, fontWeight: 800, color: '#5b21b6', background: '#fff', padding: '6px 12px', borderRadius: 999, border: '1px solid #ddd6fe' }}>
            总进度：已攻克 {summary.completedUnitsCount} / {summary.totalUnits} 单元（{summary.completedLessonsCount} / {summary.totalLessons} 课）
          </div>
        </div>

        {/* Visual Shuffled Unit Trail */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {summary.orderedUnits.map((u, idx) => {
            const done = u.lessons.every((l) => (g3Progress?.completedLessonIds || []).includes(l.id));
            const isCurr = u.unitId === currentUnit.unitId;
            return (
              <span
                key={u.unitId}
                style={{
                  padding: '3px 9px',
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 800,
                  background: done ? '#10b981' : isCurr ? '#7c3aed' : 'rgba(255,255,255,0.75)',
                  color: done || isCurr ? '#fff' : '#64748b',
                  border: isCurr ? '1.5px solid #4c1d95' : '1px solid #cbd5e1',
                }}
              >
                {done ? '✓ ' : isCurr ? '🔥 ' : `${idx + 1}. `}
                Εν.{u.unitNo}
              </span>
            );
          })}
        </div>

        {/* Current Lesson Sub-Header with Both Covers */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: '#ffffff',
            padding: '10px 14px',
            borderRadius: 12,
            border: '1px solid #ddd6fe',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {tbBook?.coverUrl && (
              <img src={tbBook.coverUrl} alt="" style={{ width: 38, height: 52, objectFit: 'cover', borderRadius: 5, border: '1px solid #cbd5e1' }} />
            )}
            {wbBook?.coverUrl && (
              <img src={wbBook.coverUrl} alt="" style={{ width: 38, height: 52, objectFit: 'cover', borderRadius: 5, border: '1px solid #cbd5e1' }} />
            )}
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>
                今日关卡：{currentLesson.title}
              </div>
              <div style={{ fontSize: 12.5, color: '#64748b' }}>
                课本 {tbBook?.shortTitle} P.{currentLesson.tb[0]}–{currentLesson.tb[1]} ＋ 配套 {wbBook?.shortTitle} P.{currentLesson.wb[0]}–{currentLesson.wb[1]}
              </div>
            </div>
          </div>

          {alreadyPassedToday && !advanceExtra && !summary.allFinished && (
            <button
              type="button"
              onClick={() => setAdvanceExtra(true)}
              style={{
                padding: '7px 13px',
                borderRadius: 10,
                border: '1.5px solid #7c3aed',
                background: '#f5f3ff',
                color: '#6d28d9',
                fontWeight: 800,
                fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              🚀 状态好，再多闯一课！
            </button>
          )}
        </div>
      </div>

      {/* Interactive Grade 3 Textbook + Auto-Paired Grade 3 Workbook */}
      <InteractiveTextbookViewer
        mode="review"
        subject="希腊语 (Γλώσσα)"
        explicitBookId={currentUnit.tbId}
        fromPage={currentLesson.tb[0]}
        toPage={currentLesson.tb[1]}
        todayStr={todayStr}
        customVocab={customVocab}
        unitStudyDates={unitStudyDates}
        textbookPrefs={textbookPrefs}
        onSaveVocab={handleWrappedSaveVocab}
        onUpdateTextbookPrefs={onUpdateTextbookPrefs}
      />

      {/* Mandatory 3-Question Gate Quiz (Covers Grade 3 Grammar + Textbook + Paired Workbook) */}
      <div
        style={{
          padding: 18,
          borderRadius: 18,
          background: isCurrentLessonCompleted ? '#ecfdf5' : '#fff7ed',
          border: isCurrentLessonCompleted ? '2px solid #10b981' : '2px solid #f97316',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 900, color: isCurrentLessonCompleted ? '#065f46' : '#c2410c' }}>
            {isCurrentLessonCompleted ? <CheckCircle2 size={20} color="#10b981" /> : <Lock size={19} color="#ea580c" />}
            {isCurrentLessonCompleted
              ? '🎉 本课 3 道三年级闯关题已全部答对，成功解锁下一步预习！'
              : '🔥 必过闯关测验：3 道题全部答对（错题看懂详解后可重选），即可通关解锁下一步！'}
          </div>
          {!loadingQuiz && quizErr && (
            <button
              type="button"
              onClick={loadChallengeQuiz}
              style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#ea580c', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
            >
              重新加载闯关题
            </button>
          )}
        </div>

        {loadingQuiz && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#9a3412', fontWeight: 700, padding: '10px 0' }}>
            <Loader2 size={18} className="qvr-spin" />
            正在根据本节三年级课文与配套练习册生成必会重点与 3 道闯关题…
          </div>
        )}

        {quizErr && (
          <div style={{ fontSize: 13.5, color: '#dc2626', fontWeight: 700 }}>{quizErr}</div>
        )}

        {coachData?.corePoints && coachData.corePoints.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 13.5, fontWeight: 900, color: '#7c2d12' }}>
              💡 做题前先抓稳本课三年级基础语法/词汇重点：
            </div>
            {coachData.corePoints.map((pt, i) => (
              <div key={i} style={{ background: '#fff', padding: '9px 12px', borderRadius: 10, border: '1px solid #fed7aa', fontSize: 13.5 }}>
                <strong style={{ color: '#c2410c' }}>{i + 1}. {pt.title}：</strong>
                <span style={{ color: '#334155' }}>{pt.detail}</span>
              </div>
            ))}
          </div>
        )}

        {quizList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quizList.map((q, qIdx) => {
              const picked = answers[qIdx];
              const answered = picked !== undefined;
              const right = picked === q.answerIndex;
              return (
                <div key={qIdx} style={{ background: '#fff', padding: 14, borderRadius: 12, border: right ? '1.5px solid #10b981' : '1px solid #fdba74' }}>
                  <div style={{ fontWeight: 800, fontSize: 14.5, color: '#0f172a', marginBottom: 8 }}>
                    第 {qIdx + 1} 关：{q.question}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 }}>
                    {q.options.map((opt, oIdx) => {
                      const isSel = picked === oIdx;
                      let bg = '#f8fafc';
                      let bd = '1px solid #cbd5e1';
                      let col = '#1e293b';
                      if (isSel) {
                        if (right) {
                          bg = '#dcfce7';
                          bd = '2px solid #10b981';
                          col = '#065f46';
                        } else {
                          bg = '#fee2e2';
                          bd = '2px solid #ef4444';
                          col = '#991b1b';
                        }
                      }
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => setAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))}
                          style={{
                            textAlign: 'left',
                            padding: '9px 12px',
                            borderRadius: 10,
                            border: bd,
                            background: bg,
                            color: col,
                            fontSize: 14,
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
                        padding: '8px 11px',
                        borderRadius: 8,
                        background: right ? '#ecfdf5' : '#fef2f2',
                        color: right ? '#065f46' : '#991b1b',
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>
                        {right ? '✅ 过关！' : '❌ 还没对哦，看完解析再点正确选项订正：'}
                      </strong>{' '}
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isCurrentLessonCompleted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 900, color: '#047857' }}>
            <Award size={20} />
            太棒了！本节三年级课本与练习册已彻底拿下，可以点右下方按钮进入下一步预习明天新课啦！
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { Mic, Plus, Volume2, Trash2, CheckCircle2, Sparkles, BookOpen, X } from 'lucide-react';
import {
  findVocabSuggestions,
  getMondayDateStr,
  normalizeGreekKey,
  speakGreekWord,
  validateNewVocabEntry,
} from '../lib/dailyMissionHelpers';

export type VocabEntryCategory = 'school' | 'note';

interface DraftRow {
  uid: string;
  greek: string;
  chinese: string;
}

interface QuickVocabRecorderProps {
  todayStr: string;
  customVocab: any[];
  unitStudyDates: Record<string, string>;
  defaultCategory?: VocabEntryCategory;
  onSaveVocab: (nextCustomVocab: any[], nextUnitDates: Record<string, string>, addedCount: number) => void;
  compact?: boolean;
}

const makeEmptyRows = (count: number): DraftRow[] =>
  Array.from({ length: count }, (_, i) => ({
    uid: `row_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
    greek: '',
    chinese: '',
  }));

export const QuickVocabRecorder: React.FC<QuickVocabRecorderProps> = ({
  todayStr,
  customVocab,
  unitStudyDates,
  defaultCategory = 'school',
  onSaveVocab,
  compact = false,
}) => {
  const [rows, setRows] = useState<DraftRow[]>(() => makeEmptyRows(3));
  const [focusedRowUid, setFocusedRowUid] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const todayEntries = useMemo(() => {
    return (customVocab || []).filter((w: any) => w && w.note_date === todayStr);
  }, [customVocab, todayStr]);

  const filledRowsCount = useMemo(
    () => rows.filter((r) => r.greek.trim() || r.chinese.trim()).length,
    [rows]
  );

  const updateRow = (uid: string, field: 'greek' | 'chinese', value: string) => {
    setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, [field]: value } : r)));
    if (feedback) setFeedback(null);
  };

  const addRows = (count: number) => {
    setRows((prev) => [...prev, ...makeEmptyRows(count)]);
  };

  const removeRow = (uid: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return makeEmptyRows(1);
      return prev.filter((r) => r.uid !== uid);
    });
  };

  const handleBatchSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nonEmpty = rows.filter((r) => r.greek.trim() || r.chinese.trim());
    if (nonEmpty.length === 0) {
      setFeedback({ type: 'err', msg: '请至少在上面填写 1 个希腊语单词和中文意思哦！' });
      return;
    }

    const errors: string[] = [];
    const validPairs: Array<{ greek: string; chinese: string; uid: string }> = [];
    const seenToday = new Set(
      todayEntries.map((w: any) => normalizeGreekKey(w.word_greek || ''))
    );
    let skippedDup = 0;

    nonEmpty.forEach((r, idx) => {
      const res = validateNewVocabEntry(r.greek, r.chinese);
      if (!res.ok) {
        errors.push(`第 ${idx + 1} 行：${res.error}`);
        return;
      }
      const norm = normalizeGreekKey(res.greek);
      if (seenToday.has(norm)) {
        skippedDup++;
        return;
      }
      seenToday.add(norm);
      validPairs.push({ greek: res.greek, chinese: res.chinese, uid: r.uid });
    });

    if (errors.length > 0 && validPairs.length === 0) {
      setFeedback({ type: 'err', msg: errors[0] });
      return;
    }

    if (validPairs.length === 0 && skippedDup > 0) {
      setFeedback({ type: 'err', msg: `填写的 ${skippedDup} 个词今天都已经录过啦，没有重复添加。` });
      return;
    }

    let maxId = (customVocab || []).reduce((acc: number, w: any) => {
      const n = Number(w?.id);
      return Number.isFinite(n) && n > acc ? n : acc;
    }, 90000);

    const bookId = '今日生词笔记';
    const unitNum = 101;
    const newWords = validPairs.map((pair) => {
      maxId += 1;
      return {
        id: maxId,
        book_id: bookId,
        unit: unitNum,
        word_greek: pair.greek,
        word_chinese: pair.chinese,
        pronunciation: 'new',
        example_greek: '',
        example_chinese: '',
        note_date: todayStr,
        source: defaultCategory === 'note' ? 'student_note' : 'student_school',
      };
    });

    const nextCustom = [...(customVocab || []), ...newWords];
    const unitKey = `${bookId}_${unitNum}`;
    const nextDates = {
      ...(unitStudyDates || {}),
      [unitKey]: getMondayDateStr(todayStr),
    };

    onSaveVocab(nextCustom, nextDates, newWords.length);

    // Keep rows that had errors so Leon can fix them, reset saved rows to 3 fresh empty rows
    const savedUids = new Set(validPairs.map((p) => p.uid));
    const remaining = rows.filter((r) => !savedUids.has(r.uid) && (r.greek.trim() || r.chinese.trim()));
    setRows(remaining.length > 0 ? [...remaining, ...makeEmptyRows(2)] : makeEmptyRows(3));

    const extraNotes: string[] = [];
    if (skippedDup > 0) extraNotes.push(`自动跳过 ${skippedDup} 个重复词`);
    if (errors.length > 0) extraNotes.push(`有 ${errors.length} 行需补全中文/希腊语`);

    setFeedback({
      type: 'ok',
      msg: `成功批量入库 ${newWords.length} 个词！已自动加入单词表、7 天每日必练与今日学习报告。${extraNotes.length ? `（${extraNotes.join('，')}）` : ''}`,
    });
  };

  const handleDelete = (wordId: number | string) => {
    const nextCustom = (customVocab || []).filter((w: any) => w?.id !== wordId);
    onSaveVocab(nextCustom, unitStudyDates, 0);
    setFeedback({ type: 'ok', msg: '已删除该条生词记录。' });
  };

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #d9e6f2',
        borderRadius: 18,
        padding: compact ? 16 : 20,
        boxShadow: '0 4px 16px rgba(13, 94, 175, 0.06)',
      }}
    >
      {/* Unified Header — School words & class notes merged in one stream */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
          <BookOpen size={17} color="#0071E3" />
          今日新词 &amp; 课堂笔记（混在一起直接录入，不限数量）
        </div>

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#0071E3', fontWeight: 600 }}>
          <Mic size={14} />
          直接用 iPad 语音输入，填完一键全部入库
        </span>
      </div>

      {/* Multi-row batch form */}
      <style>{`
        .qvr-row-grid {
          display: grid;
          grid-template-columns: 28px minmax(160px, 1fr) minmax(140px, 1fr) auto;
          gap: 8px;
          align-items: center;
        }
        @media (max-width: 640px) {
          .qvr-row-grid {
            grid-template-columns: 24px 1fr auto;
          }
          .qvr-zh-input {
            grid-column: 2 / 4;
          }
        }
      `}</style>
      <form onSubmit={handleBatchSave}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((row, idx) => {
            const suggestions =
              focusedRowUid === row.uid && row.greek.trim().length >= 2
                ? findVocabSuggestions(row.greek, 4)
                : [];
            return (
              <div
                key={row.uid}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '10px 12px',
                }}
              >
                <div className="qvr-row-grid">
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textAlign: 'center' }}>
                    #{idx + 1}
                  </span>

                  <div style={{ display: 'flex', gap: 5 }}>
                    <input
                      type="text"
                      lang="el"
                      autoComplete="off"
                      autoCapitalize="none"
                      placeholder="希腊语单词（语音说出）"
                      value={row.greek}
                      onFocus={() => setFocusedRowUid(row.uid)}
                      onChange={(e) => updateRow(row.uid, 'greek', e.target.value)}
                      style={{
                        flex: 1,
                        fontSize: 16,
                        padding: '9px 11px',
                        borderRadius: 10,
                        border: '1.5px solid #cbd5e1',
                        background: '#fff',
                        outline: 'none',
                        fontWeight: 600,
                        minWidth: 0,
                      }}
                    />
                    {row.greek.trim() && (
                      <button
                        type="button"
                        onClick={() => speakGreekWord(row.greek.trim())}
                        title="试听发音"
                        style={{
                          padding: '0 9px',
                          borderRadius: 10,
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          color: '#0071E3',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        <Volume2 size={16} />
                      </button>
                    )}
                  </div>

                  <input
                    className="qvr-zh-input"
                    type="text"
                    lang="zh-CN"
                    autoComplete="off"
                    placeholder="中文意思"
                    value={row.chinese}
                    onFocus={() => setFocusedRowUid(row.uid)}
                    onChange={(e) => updateRow(row.uid, 'chinese', e.target.value)}
                    style={{
                      fontSize: 16,
                      padding: '9px 11px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      background: '#fff',
                      outline: 'none',
                      minWidth: 0,
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => removeRow(row.uid)}
                    title="移除此行"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: 6,
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Live suggestion chips for this row */}
                {suggestions.length > 0 && (
                  <div style={{ marginTop: 8, paddingLeft: 36, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Sparkles size={12} /> 点选自动填中文：
                    </span>
                    {suggestions.map((s) => (
                      <button
                        key={`${s.greek}-${s.source}`}
                        type="button"
                        onClick={() => {
                          setRows((prev) =>
                            prev.map((r) =>
                              r.uid === row.uid ? { ...r, greek: s.greek, chinese: s.chinese } : r
                            )
                          );
                        }}
                        style={{
                          fontSize: 12,
                          padding: '4px 9px',
                          borderRadius: 999,
                          border: '1px solid #bfdbfe',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        {s.greek} → {s.chinese}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add more rows + Batch submit */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => addRows(1)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '9px 14px',
                borderRadius: 10,
                border: '1.5px dashed #93c5fd',
                background: '#f0f9ff',
                color: '#0369a1',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <Plus size={15} />
              再加 1 行单词
            </button>
            <button
              type="button"
              onClick={() => addRows(3)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '9px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#475569',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              + 再加 3 行
            </button>
          </div>

          <button
            type="submit"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '11px 22px',
              borderRadius: 12,
              border: 'none',
              background: '#0071E3',
              color: '#fff',
              fontWeight: 800,
              fontSize: 15,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 113, 227, 0.25)',
            }}
          >
            <CheckCircle2 size={17} />
            一键全部入库{filledRowsCount > 0 ? `（${filledRowsCount} 词）` : ''}
          </button>
        </div>
      </form>

      {/* Feedback banner */}
      {feedback && (
        <div
          style={{
            marginTop: 12,
            padding: '9px 12px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: feedback.type === 'ok' ? '#ecfdf5' : '#fef2f2',
            color: feedback.type === 'ok' ? '#047857' : '#b91c1c',
            border: `1px solid ${feedback.type === 'ok' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          {feedback.type === 'ok' && <CheckCircle2 size={15} />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Today's entered words */}
      {todayEntries.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed #e2e8f0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
            今日已入库 {todayEntries.length} 个词（已同步至单词表 &amp; 每日训练 &amp; 今日学习报告）：
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {todayEntries.map((w: any) => {
              const isNote = w.book_id === '课堂笔记' || w.source === 'student_note';
              return (
                <div
                  key={w.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    borderRadius: 10,
                    background: isNote ? '#f5f0ff' : '#f0f9ff',
                    border: `1px solid ${isNote ? '#ddd6fe' : '#bae6fd'}`,
                    fontSize: 14,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: isNote ? '#6d28d9' : '#0369a1' }}>
                    {isNote ? '笔记' : '学校'}
                  </span>
                  <strong style={{ color: '#0f172a' }}>{w.word_greek}</strong>
                  <span style={{ color: '#475569' }}>{w.word_chinese}</span>
                  <button
                    type="button"
                    onClick={() => speakGreekWord(w.word_greek)}
                    style={{ border: 'none', background: 'transparent', color: '#0071E3', cursor: 'pointer', padding: 2 }}
                    title="发音"
                  >
                    <Volume2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(w.id)}
                    style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                    title="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

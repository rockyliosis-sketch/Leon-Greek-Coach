import React, { useMemo, useState } from 'react';
import { Mic, Plus, Volume2, Trash2, CheckCircle2, Sparkles, BookOpen, NotebookPen } from 'lucide-react';
import {
  findVocabSuggestions,
  getMondayDateStr,
  normalizeGreekKey,
  speakGreekWord,
  validateNewVocabEntry,
} from '../lib/dailyMissionHelpers';

export type VocabEntryCategory = 'school' | 'note';

interface QuickVocabRecorderProps {
  todayStr: string;
  customVocab: any[];
  unitStudyDates: Record<string, string>;
  defaultCategory?: VocabEntryCategory;
  onSaveVocab: (nextCustomVocab: any[], nextUnitDates: Record<string, string>, addedCount: number) => void;
  compact?: boolean;
}

export const QuickVocabRecorder: React.FC<QuickVocabRecorderProps> = ({
  todayStr,
  customVocab,
  unitStudyDates,
  defaultCategory = 'school',
  onSaveVocab,
  compact = false,
}) => {
  const [category, setCategory] = useState<VocabEntryCategory>(defaultCategory);
  const [greekInput, setGreekInput] = useState('');
  const [chineseInput, setChineseInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const suggestions = useMemo(() => findVocabSuggestions(greekInput, 4), [greekInput]);

  const todayEntries = useMemo(() => {
    return (customVocab || []).filter((w: any) => w && w.note_date === todayStr);
  }, [customVocab, todayStr]);

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const res = validateNewVocabEntry(greekInput, chineseInput);
    if (!res.ok) {
      setFeedback({ type: 'err', msg: res.error });
      return;
    }

    const normNew = normalizeGreekKey(res.greek);
    const dup = todayEntries.some(
      (w: any) => normalizeGreekKey(w.word_greek || '') === normNew
    );
    if (dup) {
      setFeedback({ type: 'err', msg: `「${res.greek}」今天已经录过啦，不用重复添加！` });
      return;
    }

    const maxId = (customVocab || []).reduce((acc: number, w: any) => {
      const n = Number(w?.id);
      return Number.isFinite(n) && n > acc ? n : acc;
    }, 90000);

    const bookId = category === 'school' ? '学校生词' : '课堂笔记';
    const unitNum = category === 'school' ? 101 : 102;
    const newWord = {
      id: maxId + 1,
      book_id: bookId,
      unit: unitNum,
      word_greek: res.greek,
      word_chinese: res.chinese,
      pronunciation: 'new',
      example_greek: '',
      example_chinese: '',
      note_date: todayStr,
      source: category === 'school' ? 'student_school' : 'student_note',
    };

    const nextCustom = [...(customVocab || []), newWord];
    const unitKey = `${bookId}_${unitNum}`;
    const nextDates = {
      ...(unitStudyDates || {}),
      [unitKey]: getMondayDateStr(todayStr),
    };

    onSaveVocab(nextCustom, nextDates, 1);
    setGreekInput('');
    setChineseInput('');
    setFeedback({
      type: 'ok',
      msg: `已入库「${res.greek} = ${res.chinese}」！已自动加入今日背词与 7 天每日必练。`,
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
      {/* Category selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setCategory('school')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 999,
              border: category === 'school' ? '2px solid #0071E3' : '1px solid #d2d2d7',
              background: category === 'school' ? '#eef6ff' : '#fff',
              color: category === 'school' ? '#005bb5' : '#515154',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <BookOpen size={15} />
            学校查到的生词
          </button>
          <button
            type="button"
            onClick={() => setCategory('note')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 999,
              border: category === 'note' ? '2px solid #7c3aed' : '1px solid #d2d2d7',
              background: category === 'note' ? '#f5f0ff' : '#fff',
              color: category === 'note' ? '#6d28d9' : '#515154',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <NotebookPen size={15} />
            上课课堂笔记
          </button>
        </div>

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#0071E3', fontWeight: 600 }}>
          <Mic size={14} />
          直接用 iPad 语音输入法说出单词即可
        </span>
      </div>

      {/* Input form */}
      <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#515154', marginBottom: 4 }}>
            希腊语单词 / 短语（支持语音输入）
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              lang="el"
              autoComplete="off"
              autoCapitalize="none"
              placeholder="例如：παράδειγμα"
              value={greekInput}
              onChange={(e) => {
                setGreekInput(e.target.value);
                if (feedback) setFeedback(null);
              }}
              style={{
                flex: 1,
                fontSize: 18,
                padding: '11px 14px',
                borderRadius: 12,
                border: '1.5px solid #cbd5e1',
                outline: 'none',
                fontWeight: 600,
                minWidth: 0,
              }}
            />
            {greekInput.trim() && (
              <button
                type="button"
                onClick={() => speakGreekWord(greekInput.trim())}
                title="试听发音"
                style={{
                  padding: '0 12px',
                  borderRadius: 12,
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#0071E3',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Volume2 size={18} />
              </button>
            )}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#515154', marginBottom: 4 }}>
            中文意思
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              lang="zh-CN"
              autoComplete="off"
              placeholder="例如：例子"
              value={chineseInput}
              onChange={(e) => {
                setChineseInput(e.target.value);
                if (feedback) setFeedback(null);
              }}
              style={{
                flex: 1,
                fontSize: 18,
                padding: '11px 14px',
                borderRadius: 12,
                border: '1.5px solid #cbd5e1',
                outline: 'none',
                minWidth: 0,
              }}
            />
            <button
              type="submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 18px',
                borderRadius: 12,
                border: 'none',
                background: '#0071E3',
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Plus size={18} />
              入库
            </button>
          </div>
        </div>
      </form>

      {/* Auto-suggestions from existing textbook/glossary */}
      {suggestions.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={13} /> 词库已有，点一下自动填中文：
          </span>
          {suggestions.map((s) => (
            <button
              key={`${s.greek}-${s.source}`}
              type="button"
              onClick={() => {
                setGreekInput(s.greek);
                setChineseInput(s.chinese);
                setFeedback(null);
              }}
              style={{
                fontSize: 13,
                padding: '5px 10px',
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

      {/* Feedback banner */}
      {feedback && (
        <div
          style={{
            marginTop: 10,
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
            今日已入库 {todayEntries.length} 个词（已同步至单词表 &amp; 每日训练）：
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

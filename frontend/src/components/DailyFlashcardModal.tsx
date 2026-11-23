import React, { useMemo, useState } from 'react';
import { Volume2, X, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import type { VocabSrsEntry } from '../dbService';
import { computeNextSrs, normalizeGreekKey, speakGreekWord } from '../lib/dailyMissionHelpers';
import glossaryV2Data from '../data/glossary_v2.json';

export type VocabSlot = 'morning' | 'afternoon' | 'night';

interface FlashcardItem {
  key: string;
  greek: string;
  chinese: string;
  tag: string;
}

interface DailyFlashcardModalProps {
  slot: VocabSlot;
  todayStr: string;
  customVocab: any[];
  vocabSrs: Record<string, VocabSrsEntry>;
  onUpdateSrs: (nextSrs: Record<string, VocabSrsEntry>) => void;
  onCompleteSlot: (slot: VocabSlot, reviewedCount: number) => void;
  onClose: () => void;
}

const SLOT_META: Record<VocabSlot, { title: string; subtitle: string; limit: number }> = {
  morning: { title: '🌅 早间背词（新词 + 旧词）', subtitle: '先看今天/近期新词，再快速复习到期旧词', limit: 12 },
  afternoon: { title: '☀️ 午后快刷（遮中文自测）', subtitle: '只看希腊语脱口而出中文，卡壳的点「忘了」', limit: 10 },
  night: { title: '🌙 睡前锁存（今日重点总抽查）', subtitle: '睡前过一遍今天新词与易忘词，记忆最牢', limit: 10 },
};

export const DailyFlashcardModal: React.FC<DailyFlashcardModalProps> = ({
  slot,
  todayStr,
  customVocab,
  vocabSrs,
  onUpdateSrs,
  onCompleteSlot,
  onClose,
}) => {
  const deck = useMemo<FlashcardItem[]>(() => {
    const items: FlashcardItem[] = [];
    const seen = new Set<string>();
    const targetCount = SLOT_META[slot].limit;

    const pushIfValid = (greek: string, chinese: string, tag: string) => {
      const gr = String(greek || '').trim();
      const zh = String(chinese || '').trim();
      if (!gr || !zh || /[\u4e00-\u9fa5]/.test(gr)) return;
      const key = normalizeGreekKey(gr);
      if (!key || seen.has(key)) return;
      seen.add(key);
      items.push({ key, greek: gr, chinese: zh, tag });
    };

    // 1. Today's & recent custom vocab (newest first)
    const sortedCustom = [...(customVocab || [])].sort((a, b) =>
      String(b?.note_date || '').localeCompare(String(a?.note_date || ''))
    );

    // Priority A: today's newly entered words
    for (const w of sortedCustom) {
      if (items.length >= targetCount) break;
      if (w?.note_date === todayStr) {
        const tag = w.book_id === '学校生词' || w.source === 'student_school' ? '今日学校生词' : '今日课堂笔记';
        pushIfValid(w.word_greek, w.word_chinese, tag);
      }
    }

    // Priority B: SRS due words from custom vocab
    for (const w of sortedCustom) {
      if (items.length >= targetCount) break;
      const k = normalizeGreekKey(w?.word_greek || '');
      const srs = vocabSrs?.[k];
      if (srs && srs.nextDue <= todayStr) {
        pushIfValid(w.word_greek, w.word_chinese, '到期回看');
      }
    }

    // Priority C: Unreviewed recent custom vocab
    for (const w of sortedCustom) {
      if (items.length >= targetCount) break;
      const k = normalizeGreekKey(w?.word_greek || '');
      if (!vocabSrs?.[k]) {
        const tag = w.book_id === '学校生词' ? '学校生词' : '课堂笔记';
        pushIfValid(w.word_greek, w.word_chinese, tag);
      }
    }

    // Priority D: Fill remaining with A2 official glossary
    const a2List = (((glossaryV2Data as any).lists || {}).A2 || []) as Array<{ greek?: string; zh?: string }>;
    for (let i = 0; i < a2List.length && items.length < targetCount; i++) {
      const e = a2List[(i * 17 + todayStr.charCodeAt(todayStr.length - 1)) % a2List.length];
      if (e?.greek && e?.zh) {
        pushIfValid(e.greek, e.zh, 'A2 词表');
      }
    }

    return items;
  }, [customVocab, slot, todayStr, vocabSrs]);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [localSrs, setLocalSrs] = useState<Record<string, VocabSrsEntry>>(vocabSrs || {});
  const [doneCount, setDoneCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = deck[index];
  const meta = SLOT_META[slot];

  const handleRate = (rating: 'again' | 'hard' | 'good') => {
    if (!current) return;
    const nextEntry = computeNextSrs(localSrs[current.key], rating, todayStr);
    const updatedSrs = { ...localSrs, [current.key]: nextEntry };
    setLocalSrs(updatedSrs);
    onUpdateSrs(updatedSrs);

    const nextDone = doneCount + 1;
    setDoneCount(nextDone);
    setRevealed(false);

    if (index + 1 >= deck.length) {
      setFinished(true);
      onCompleteSlot(slot, nextDone);
    } else {
      setIndex(index + 1);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.58)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          background: '#ffffff',
          borderRadius: 24,
          padding: 24,
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>{meta.title}</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{meta.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: '#f1f5f9',
              borderRadius: 999,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {finished || !current ? (
          <div style={{ textAlign: 'center', padding: '28px 12px' }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>🎉</div>
            <h4 style={{ margin: '0 0 8px', fontSize: 22, color: '#047857' }}>
              本次背词打卡完成！
            </h4>
            <p style={{ margin: '0 0 20px', fontSize: 15, color: '#475569' }}>
              刚刚一口气过了 <strong>{doneCount}</strong> 个词，系统已自动安排下次复习时间，积分 +10！
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 28px',
                borderRadius: 14,
                border: 'none',
                background: '#0071E3',
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              回到今日通关台
            </button>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
              <span>进度：{index + 1} / {deck.length}</span>
              <span style={{ color: '#0071E3', fontWeight: 700 }}>{current.tag}</span>
            </div>
            <div style={{ height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden', marginBottom: 18 }}>
              <div
                style={{
                  height: '100%',
                  width: `${((index + 1) / deck.length) * 100}%`,
                  background: '#0071E3',
                  transition: 'width 0.25s ease',
                }}
              />
            </div>

            {/* Flashcard body */}
            <div
              onClick={() => setRevealed(true)}
              style={{
                minHeight: 200,
                borderRadius: 20,
                background: revealed ? '#f0f9ff' : '#f8fafc',
                border: `2px solid ${revealed ? '#7dd3fc' : '#e2e8f0'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontSize: 34, fontWeight: 800, color: '#0f172a', marginBottom: 12, wordBreak: 'break-word' }}>
                {current.greek}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speakGreekWord(current.greek);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0071E3',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  marginBottom: 14,
                }}
              >
                <Volume2 size={16} />
                听发音
              </button>

              {revealed ? (
                <div style={{ fontSize: 24, fontWeight: 700, color: '#0369a1', marginTop: 4 }}>
                  {current.chinese}
                </div>
              ) : (
                <div style={{ fontSize: 14, color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Sparkles size={14} /> 先在心里想中文，再点卡片翻面
                </div>
              )}
            </div>

            {/* Action buttons */}
            {revealed ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => handleRate('again')}
                  style={{
                    padding: '13px 10px',
                    borderRadius: 14,
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    color: '#b91c1c',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  😅 忘了
                  <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>明天再背</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleRate('hard')}
                  style={{
                    padding: '13px 10px',
                    borderRadius: 14,
                    border: '1px solid #fde68a',
                    background: '#fffbeb',
                    color: '#b45309',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  🤔 模糊
                  <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>近期巩固</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleRate('good')}
                  style={{
                    padding: '13px 10px',
                    borderRadius: 14,
                    border: '1px solid #a7f3d0',
                    background: '#ecfdf5',
                    color: '#047857',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  ✅ 认识
                  <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>拉长间隔</div>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => onCompleteSlot(slot, 0)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#64748b',
                    fontSize: 13,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  我刚在纸质本背完了，直接打卡
                </button>
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '11px 22px',
                    borderRadius: 12,
                    border: 'none',
                    background: '#0071E3',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={15} />
                  看中文答案
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { BookOpen, CheckCircle2, Clock, Copy, Download, Headphones, Printer, Sparkles } from 'lucide-react';
import type { DailyMissionRecord } from '../dbService';
import { formatElapsedHuman } from '../lib/dailyMissionHelpers';
import { getBookFrontier } from '../lib/pageProgress';
import { exportDailyReportPdf, exportDailyReportPng } from '../lib/exportStudyReport';
import glossaryV2Data from '../data/glossary_v2.json';

interface DailyStudyReportProps {
  todayStr: string;
  mission: DailyMissionRecord;
  todayWebCompleted: string[];
  todayWords: any[];
  pageProgress: any[];
  score?: number;
  streak?: number;
  onDeleteWord?: (wordId: any) => void;
  title?: string;
}

const TUTOR_MODE_LABEL: Record<string, string> = {
  preview: '课前预习',
  review: '课后复习',
  both: '预习 + 复习',
};

export const DailyStudyReport: React.FC<DailyStudyReportProps> = ({
  todayStr,
  mission,
  todayWebCompleted,
  todayWords,
  pageProgress,
  score = 0,
  streak = 0,
  onDeleteWord,
  title = 'Leon 今日学习报告',
}) => {
  const [copied, setCopied] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);

  const blockEntries = Object.entries(mission.blocks || {});
  const totalBlockSec = blockEntries.reduce((sum, [, b]) => sum + (b.elapsedSec || 0), 0);

  const vt = mission.vocabTimers || {
    morning: { elapsedSec: 0, completed: Boolean(mission.vocabChecks?.morning) },
    afternoon: { elapsedSec: 0, completed: Boolean(mission.vocabChecks?.afternoon) },
    night: { elapsedSec: 0, completed: Boolean(mission.vocabChecks?.night) },
  };
  const totalVocabSec =
    (vt.morning?.elapsedSec || 0) +
    (vt.afternoon?.elapsedSec || 0) +
    (vt.night?.elapsedSec || 0);
  const vocabDoneCount =
    (mission.vocabChecks?.morning ? 1 : 0) +
    (mission.vocabChecks?.afternoon ? 1 : 0) +
    (mission.vocabChecks?.night ? 1 : 0);

  const a2Idx = getBookFrontier(pageProgress || [], 'glossary-a2');
  const b1Idx = getBookFrontier(pageProgress || [], 'glossary-b1');
  const a2List = (((glossaryV2Data as any).lists || {}).A2 || []) as Array<{ idx: number; word_greek: string; word_chinese: string }>;
  const a2Word = a2Idx ? a2List.find((w) => w.idx === a2Idx) : null;

  const schoolLog = mission.blockLogs?.school;
  const schoolItems = schoolLog?.items || [];
  const tutorLog = mission.blockLogs?.tutor;
  const oldNotesReview = mission.blockLogs?.oldNotesReview;
  const workbookChecks =
    mission.blockLogs?.workbookChecks && mission.blockLogs.workbookChecks.length > 0
      ? mission.blockLogs.workbookChecks
      : mission.blockLogs?.workbookCheck
        ? [{ id: 'wb_legacy', ...mission.blockLogs.workbookCheck }]
        : [];
  const previews = (mission.blockLogs?.previews || []).filter(
    (p) => p.subject || p.pages || p.summary || (p.actions && p.actions.length > 0) || p.newWordsCount > 0
  );
  const histLog = mission.historyLog;

  const buildPlainText = () => {
    const lines: string[] = [
      `【Leon 今日学习报告 · ${todayStr}】`,
      `• 总专注时长：三大区块 ${formatElapsedHuman(totalBlockSec)} + 背单词 ${formatElapsedHuman(totalVocabSec)}`,
      `• 纸质背单词：${vocabDoneCount}/3 次（A2 词表当前背到第 ${a2Idx} 词${a2Word ? ` ${a2Word.word_greek}` : ''}${b1Idx ? `，B 词表第 ${b1Idx} 词` : ''}）`,
      `• 希腊历史故事：${histLog?.listened ? `已听 ${histLog.episodesCount || 1} 集${histLog.episodeNote ? `（${histLog.episodeNote}）` : ''}` : '暂未打卡'}`,
      `• 语音入库新词：${todayWords.length} 个`,
    ];
    if (schoolLog && (schoolLog.subjects?.length || schoolLog.pages || schoolLog.summary)) {
      lines.push(
        `• 区块一（学校复习与作业）：科目 ${schoolLog.subjects?.join('、') || '未填'}｜页码 ${schoolLog.pages || '未填'}｜成果：${schoolLog.summary || '未填'}`
      );
    }
    lines.push(
      `• 区块二（网站刷题 + 私教课）：网站已完成 ${todayWebCompleted.length}/8 模块` +
        (tutorLog && (tutorLog.pages || tutorLog.summary || tutorLog.questionMarks)
          ? `；私教课【${TUTOR_MODE_LABEL[tutorLog.mode] || '备课'}】页码 ${tutorLog.pages || '未填'}，标了 ${tutorLog.questionMarks || 0} 个问号，记录：${tutorLog.summary || '无'}`
          : '')
    );
    if (previews.length > 0) {
      lines.push(`• 区块三（下节课预习 · 共 ${previews.length} 科）：`);
      previews.forEach((p, i) => {
        lines.push(
          `  ${i + 1}. ${p.subject || '未选科目'}（页码：${p.pages || '未填'}，新词 ${p.newWordsCount || 0} 个，动作：${(p.actions || []).join('/') || '无'}）— 大意：${p.summary || '未填'}`
        );
      });
    }
    if (todayWords.length > 0) {
      lines.push(
        `• 今日入库词表：${todayWords.map((w: any) => `${w.word_greek}(${w.word_chinese})`).join('；')}`
      );
    }
    return lines.join('\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildPlainText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <section
      style={{
        backgroundColor: '#f8fafc',
        backgroundImage: 'url(/images/ui/bg_card_report.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'right bottom',
        borderRadius: 22,
        padding: 22,
        border: '1.5px solid #cbd5e1',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/images/ui/icon_report.png" alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>
              {title}（{todayStr}）
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>
              实时汇总 Leon 今天的实际学习内容、页码、新词数与中文复述，家长不用懂希腊语也能一眼看清学习质量
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            disabled={exportingPng}
            onClick={async () => {
              setExportingPng(true);
              try {
                await exportDailyReportPng({
                  todayStr,
                  mission,
                  todayWebCompleted,
                  todayWords,
                  pageProgress,
                  score,
                  streak,
                });
              } finally {
                setExportingPng(false);
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 15px',
              borderRadius: 10,
              border: 'none',
              background: '#0071E3',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 13,
              cursor: exportingPng ? 'wait' : 'pointer',
              boxShadow: '0 4px 12px rgba(0, 113, 227, 0.25)',
            }}
          >
            <Download size={15} />
            {exportingPng ? '正在生成高清海报…' : '导出高清 PNG 日报'}
          </button>
          <button
            type="button"
            onClick={() =>
              exportDailyReportPdf({
                todayStr,
                mission,
                todayWebCompleted,
                todayWords,
                pageProgress,
                score,
                streak,
              })
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <Printer size={15} />
            导出 PDF / 打印
          </button>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              borderRadius: 10,
              border: '1px solid #bfdbfe',
              background: copied ? '#ecfdf5' : '#eff6ff',
              color: copied ? '#047857' : '#1d4ed8',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
            {copied ? '已复制文本' : '复制文本'}
          </button>
        </div>
      </div>

      {/* Top KPI summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 16 }}>
        <div style={{ padding: '12px 14px', borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} /> 三大区块总用时
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 3 }}>
            {formatElapsedHuman(totalBlockSec)}
          </div>
        </div>
        <div style={{ padding: '12px 14px', borderRadius: 14, background: '#fffbeb', border: '1px solid #fde68a' }}>
          <div style={{ fontSize: 11, color: '#b45309', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={12} /> 背单词（{vocabDoneCount}/3 次）
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#92400e', marginTop: 3 }}>
            {formatElapsedHuman(totalVocabSec)}
          </div>
          <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>
            A2 背到第 {a2Idx || 0} 词{a2Word ? ` (${a2Word.word_greek})` : ''}
          </div>
        </div>
        <div style={{ padding: '12px 14px', borderRadius: 14, background: '#edf5f0', border: '1px solid #c9ddd4' }}>
          <div style={{ fontSize: 11, color: '#224943', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Headphones size={12} /> 希腊历史故事
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#13312c', marginTop: 3 }}>
            {histLog?.listened ? `${histLog.episodesCount || 1} 集` : '未听'}
          </div>
          {histLog?.episodeNote && (
            <div style={{ fontSize: 11, color: '#3b645c', marginTop: 2 }}>{histLog.episodeNote}</div>
          )}
        </div>
        <div style={{ padding: '12px 14px', borderRadius: 14, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
          <div style={{ fontSize: 11, color: '#0369a1', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <BookOpen size={12} /> 语音入库新词
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0c4a6e', marginTop: 3 }}>
            {todayWords.length} 个
          </div>
          <div style={{ fontSize: 11, color: '#0369a1', marginTop: 2 }}>
            网站刷题：{todayWebCompleted.length}/8 模块
          </div>
        </div>
      </div>

      {/* Detailed Content Output per Block */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: todayWords.length > 0 ? 16 : 0 }}>
        {/* Block 1 Output */}
        <div style={{ padding: 14, borderRadius: 14, background: 'rgba(240, 253, 250, 0.92)', border: '1px solid #99f6e4' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f766e', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src="/images/ui/icon_block_school.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
            区块一 · 学校复习与作业（用时 {formatElapsedHuman(mission.blocks?.block_school?.elapsedSec || 0)}）
          </div>
          {schoolItems.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {schoolItems.map((it) => (
                <div key={it.subject} style={{ fontSize: 12.5, color: '#1e293b', background: '#fff', padding: '7px 10px', borderRadius: 10, border: '1px solid #ccfbf1' }}>
                  <div style={{ fontWeight: 800, color: '#0f766e' }}>
                    {it.subject} · P.{it.fromPage}{it.toPage > it.fromPage ? `-${it.toPage}` : ''}
                    {it.questionMarks ? ` · 画了 ${it.questionMarks} 个 ?` : ''}
                  </div>
                  {it.hwActions && it.hwActions.length > 0 && (
                    <div style={{ color: '#475569', marginTop: 2 }}>完成：{it.hwActions.join(' / ')}</div>
                  )}
                  {it.note && <div style={{ color: '#334155', marginTop: 2 }}>备注：{it.note}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.6 }}>
              <div><strong>科目：</strong>{schoolLog?.subjects?.length ? schoolLog.subjects.join('、') : '待点选'}</div>
              <div><strong>页码：</strong>{schoolLog?.pages || '待选择'}</div>
              {schoolLog?.summary && <div><strong>备注：</strong>{schoolLog.summary}</div>}
            </div>
          )}
        </div>

        {/* Block 2 Output */}
        <div style={{ padding: 14, borderRadius: 14, background: 'rgba(239, 246, 255, 0.92)', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1d4ed8', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src="/images/ui/icon_block_web.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
            区块二 · 网站刷题 + 私教课（用时 {formatElapsedHuman(mission.blocks?.block_web?.elapsedSec || 0)}）
          </div>
          <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.6 }}>
            <div><strong>网站刷题：</strong>今日已完成 {todayWebCompleted.length} / 8 个模块</div>
            <div>
              <strong>私教课：</strong>
              {tutorLog
                ? `${TUTOR_MODE_LABEL[tutorLog.mode] || '备课'} · ${tutorLog.book || 'B本'}${tutorLog.unitNo ? ` 第${tutorLog.unitNo}单元` : ''} P.${tutorLog.fromPage ?? ''}${tutorLog.toPage ? `-${tutorLog.toPage}` : ''} · 标了 ${tutorLog.questionMarks || 0} 个 ?`
                : '待记录'}
            </div>
            {tutorLog?.actions && tutorLog.actions.length > 0 && (
              <div><strong>完成动作：</strong>{tutorLog.actions.join(' / ')}</div>
            )}
            {tutorLog?.summary && <div><strong>备注：</strong>{tutorLog.summary}</div>}
          </div>
        </div>

        {/* Block 3 Output */}
        <div style={{ padding: 14, borderRadius: 14, background: 'rgba(245, 243, 255, 0.92)', border: '1px solid #ddd6fe' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#6d28d9', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src="/images/ui/icon_block_preview.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
            区块三 · 下节课多科预习 &amp; 练习册扫雷（用时 {formatElapsedHuman(mission.blocks?.block_preview?.elapsedSec || 0)}）
          </div>
          {previews.length === 0 && workbookChecks.length === 0 && !oldNotesReview ? (
            <div style={{ fontSize: 13, color: '#64748b' }}>待 Leon 填写今日旧笔记复习与预习的科目、页码与中文大意</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {oldNotesReview && (
                <div style={{ fontSize: 12.5, color: '#1e293b', background: '#fff', padding: '8px 10px', borderRadius: 10, border: '1px solid #fde68a' }}>
                  <div style={{ fontWeight: 800, color: '#b45309' }}>
                    规律复习旧笔记：{oldNotesReview.subject} P.{oldNotesReview.fromPage}{oldNotesReview.toPage > oldNotesReview.fromPage ? `-${oldNotesReview.toPage}` : ''}
                  </div>
                </div>
              )}
              {previews.map((p, idx) => (
                <div key={p.id} style={{ fontSize: 12.5, color: '#1e293b', background: '#fff', padding: '8px 10px', borderRadius: 10, border: '1px solid #ede9fe' }}>
                  <div style={{ fontWeight: 800, color: '#5b21b6' }}>
                    科目 {idx + 1}：{p.subject || '未选'} {p.pages ? `(${p.pages})` : ''} · 新学 {p.newWordsCount || 0} 词
                  </div>
                  {p.actions && p.actions.length > 0 && (
                    <div style={{ color: '#64748b', marginTop: 2 }}>动作：{p.actions.join(' / ')}</div>
                  )}
                  {p.summary && <div style={{ marginTop: 3 }}><strong>中文大意：</strong>{p.summary}</div>}
                </div>
              ))}
              {workbookChecks
                .filter((wb) => (wb.actions && wb.actions.length > 0) || wb.note)
                .map((wb, i) => (
                  <div key={wb.id || i} style={{ fontSize: 12.5, color: '#1e293b', background: '#fff', padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd6fe' }}>
                    <div style={{ fontWeight: 800, color: '#6d28d9' }}>
                      练习册扫雷 {workbookChecks.length > 1 ? i + 1 : ''}：{wb.bookName} P.{wb.fromPage}{wb.toPage > wb.fromPage ? `-${wb.toPage}` : ''}
                    </div>
                    {wb.actions?.length > 0 && (
                      <div style={{ color: '#64748b', marginTop: 2 }}>{wb.actions.join(' / ')}</div>
                    )}
                    {wb.note && <div style={{ marginTop: 2 }}>重点问题：{wb.note}</div>}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Today's entered vocab list */}
      {todayWords.length > 0 && (
        <div style={{ paddingTop: 12, borderTop: '1px dashed #cbd5e1' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src="/images/ui/icon_mic.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
            今日语音入库的学校生词 &amp; 课堂笔记（共 {todayWords.length} 词，已自动进入训练池）：
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {todayWords.map((w: any) => {
              const isNote = w.book_id === '课堂笔记' || w.source === 'student_note';
              return (
                <span
                  key={w.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: isNote ? '#f5f0ff' : '#f0f9ff',
                    border: `1px solid ${isNote ? '#ddd6fe' : '#bae6fd'}`,
                    color: '#0f172a',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: isNote ? '#6d28d9' : '#0369a1' }}>
                    {isNote ? '笔记' : '学校'}
                  </span>
                  <strong>{w.word_greek}</strong> = {w.word_chinese}
                  {onDeleteWord && (
                    <button
                      type="button"
                      onClick={() => onDeleteWord(w.id)}
                      style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: 12, padding: 0 }}
                      title="删除误录词"
                    >
                      ✕
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

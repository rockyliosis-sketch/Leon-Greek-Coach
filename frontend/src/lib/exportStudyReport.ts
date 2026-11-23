import type { DailyMissionRecord } from '../dbService';
import { formatElapsedHuman, getWeekdayLabel } from './dailyMissionHelpers';
import { getBookFrontier } from './pageProgress';
import { getScoutLevelInfo } from './levelSystem';
import glossaryV2Data from '../data/glossary_v2.json';

export interface ExportReportPayload {
  todayStr: string;
  mission: DailyMissionRecord;
  todayWebCompleted: string[];
  todayWords: any[];
  pageProgress: any[];
  score: number;
  streak: number;
}

const TUTOR_MODE_LABEL: Record<string, string> = {
  preview: '课前预习',
  review: '课后复习',
  both: '预习 + 复习',
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  const lines: string[] = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const ch of para) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line.length > 0) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/**
 * 渲染高清 2x Retina 竖版 PNG 学习日报并直接触发下载
 */
export async function exportDailyReportPng(payload: ExportReportPayload): Promise<void> {
  const { todayStr, mission, todayWebCompleted, todayWords, pageProgress, score, streak } = payload;

  const level = getScoutLevelInfo(score);
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
  const a2List = (((glossaryV2Data as any).lists || {}).A2 || []) as Array<{
    idx: number;
    word_greek: string;
    word_chinese: string;
  }>;
  const a2Word = a2Idx ? a2List.find((w) => w.idx === a2Idx) : null;

  const schoolLog = mission.blockLogs?.school;
  const schoolItems = schoolLog?.items || [];
  const tutorLog = mission.blockLogs?.tutor;
  const previews = (mission.blockLogs?.previews || []).filter(
    (p) => p.subject || p.pages || p.summary || (p.actions && p.actions.length > 0) || p.newWordsCount > 0
  );
  const workbookChecks = (
    mission.blockLogs?.workbookChecks && mission.blockLogs.workbookChecks.length > 0
      ? mission.blockLogs.workbookChecks
      : mission.blockLogs?.workbookCheck
        ? [{ id: 'wb_legacy', ...mission.blockLogs.workbookCheck }]
        : []
  ).filter((wb) => (wb.actions && wb.actions.length > 0) || wb.note);
  const histLog = mission.historyLog;

  // Load images in parallel (gracefully optional)
  const [posterBg, avatarImg, rankImg, bannerImg] = await Promise.all([
    loadImage('/images/ui/bg_report_poster.png'),
    loadImage('/leon_avatar.png'),
    loadImage(level.badgeUrl),
    loadImage('/images/ui/banner_hero_greece.jpg'),
  ]);

  // Measure layout using a scratch canvas
  const W = 1080;
  const PAD = 56;
  const INNER_W = W - PAD * 2;
  const FONT = '"Microsoft YaHei", "PingFang SC", -apple-system, BlinkMacSystemFont, sans-serif';

  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d')!;
  mctx.font = `500 24px ${FONT}`;

  // Build section rows to compute exact height
  interface SectionItem {
    title: string;
    accent: string;
    bg: string;
    border: string;
    lines: string[];
  }

  const sections: SectionItem[] = [];

  // Block 1
  const b1Lines: string[] = [];
  if (schoolItems.length > 0) {
    for (const it of schoolItems) {
      const pageStr = `P.${it.fromPage}${it.toPage > it.fromPage ? `-${it.toPage}` : ''}`;
      const qStr = it.questionMarks ? ` · 标了 ${it.questionMarks} 个问号` : '';
      b1Lines.push(`• ${it.subject}（${pageStr}${qStr}）`);
      if (it.hwActions?.length) b1Lines.push(`  完成动作：${it.hwActions.join(' / ')}`);
      if (it.note) b1Lines.push(`  备注：${it.note}`);
    }
  } else if (schoolLog?.subjects?.length || schoolLog?.pages || schoolLog?.summary) {
    b1Lines.push(`• 科目：${schoolLog.subjects?.join('、') || '未选'}   页码：${schoolLog.pages || '未填'}`);
    if (schoolLog.summary) b1Lines.push(`• 备注：${schoolLog.summary}`);
  } else {
    b1Lines.push('• 暂无记录');
  }
  sections.push({
    title: `区块一 · 学校复习与作业（用时 ${formatElapsedHuman(mission.blocks?.block_school?.elapsedSec || 0)}）`,
    accent: '#0f766e',
    bg: '#f0fdfa',
    border: '#99f6e4',
    lines: b1Lines,
  });

  // Block 2
  const b2Lines: string[] = [`• 网站日常刷题：已完成 ${todayWebCompleted.length} / 8 个模块`];
  if (tutorLog) {
    const tPage = tutorLog.fromPage
      ? `P.${tutorLog.fromPage}${tutorLog.toPage && tutorLog.toPage > tutorLog.fromPage ? `-${tutorLog.toPage}` : ''}`
      : tutorLog.pages || '未填';
    b2Lines.push(
      `• 希腊语私教课：${TUTOR_MODE_LABEL[tutorLog.mode] || '备课'} · ${tutorLog.book || 'B本'} ${tPage} · 标了 ${tutorLog.questionMarks || 0} 个问号`
    );
    if (tutorLog.actions?.length) b2Lines.push(`  完成动作：${tutorLog.actions.join(' / ')}`);
    if (tutorLog.summary) b2Lines.push(`  备注：${tutorLog.summary}`);
  } else {
    b2Lines.push('• 希腊语私教课：暂无记录');
  }
  sections.push({
    title: `区块二 · 网站刷题 + 希腊语私教课（用时 ${formatElapsedHuman(mission.blocks?.block_web?.elapsedSec || 0)}）`,
    accent: '#1d4ed8',
    bg: '#eff6ff',
    border: '#bfdbfe',
    lines: b2Lines,
  });

  // Block 3
  const b3Lines: string[] = [];
  if (previews.length > 0) {
    previews.forEach((p, idx) => {
      b3Lines.push(
        `• 预习科目 ${idx + 1}：${p.subject || '未选'} ${p.pages ? `(${p.pages})` : ''} · 新学 ${p.newWordsCount || 0} 词`
      );
      if (p.actions?.length) b3Lines.push(`  动作：${p.actions.join(' / ')}`);
      if (p.summary) b3Lines.push(`  中文大意：${p.summary}`);
    });
  }
  workbookChecks.forEach((wb, idx) => {
    const pStr = `P.${wb.fromPage}${wb.toPage > wb.fromPage ? `-${wb.toPage}` : ''}`;
    b3Lines.push(`• 练习册扫雷${workbookChecks.length > 1 ? ` ${idx + 1}` : ''}：${wb.bookName} ${pStr}`);
    if (wb.actions?.length) b3Lines.push(`  发现：${wb.actions.join(' / ')}`);
    if (wb.note) b3Lines.push(`  重点问题：${wb.note}`);
  });
  if (b3Lines.length === 0) b3Lines.push('• 暂无记录');
  sections.push({
    title: `区块三 · 学校下节课预习 & 练习册扫雷（用时 ${formatElapsedHuman(mission.blocks?.block_preview?.elapsedSec || 0)}）`,
    accent: '#6d28d9',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    lines: b3Lines,
  });

  // History Story Listening (Outside Block)
  if (histLog?.listened) {
    sections.push({
      title: `区块外日常 · 希腊语历史故事收听（共 ${histLog.episodesCount || 1} 集）`,
      accent: '#1f4b43',
      bg: '#edf5f0',
      border: '#a7d3c0',
      lines: [histLog.episodeNote || '已完成今日历史故事收听'],
    });
  }

  // Wrap every section line & measure total height
  const LINE_H = 36;
  const SEC_PAD_Y = 26;
  const SEC_TITLE_H = 44;
  const wrappedSections = sections.map((sec) => {
    const wrapped: string[] = [];
    for (const l of sec.lines) {
      wrapped.push(...wrapTextLines(mctx, l, INNER_W - 60));
    }
    const height = SEC_PAD_Y * 2 + SEC_TITLE_H + wrapped.length * LINE_H;
    return { ...sec, wrapped, height };
  });

  // Manual words section height (2 columns)
  const wordRows = Math.ceil(todayWords.length / 2);
  const wordsBoxH = todayWords.length > 0 ? 94 + wordRows * 46 : 0;

  const HEADER_H = 260;
  const KPI_H = 148;
  const FOOTER_H = 110;
  const totalSectionsH = wrappedSections.reduce((acc, s) => acc + s.height + 24, 0);
  const H = Math.max(1320, PAD + HEADER_H + 28 + KPI_H + 28 + totalSectionsH + (wordsBoxH ? wordsBoxH + 24 : 0) + FOOTER_H);

  // Create high-DPI canvas
  const SCALE = 2;
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  // 1. Background (custom poster backdrop if present, else refined ivory-gold parchment)
  ctx.fillStyle = '#fdfcf8';
  ctx.fillRect(0, 0, W, H);
  if (posterBg) {
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.drawImage(posterBg, 0, 0, W, H);
    ctx.restore();
  }

  // Outer gold decorative frame
  ctx.strokeStyle = 'rgba(217, 160, 56, 0.45)';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 22, 22, W - 44, H - 44, 28);
  ctx.stroke();

  let cursorY = PAD;

  // 2. Hero Header Banner
  ctx.save();
  drawRoundedRect(ctx, PAD, cursorY, INNER_W, HEADER_H, 28);
  ctx.clip();
  const grad = ctx.createLinearGradient(PAD, cursorY, PAD + INNER_W, cursorY + HEADER_H);
  grad.addColorStop(0, '#005bb5');
  grad.addColorStop(1, '#1d4ed8');
  ctx.fillStyle = grad;
  ctx.fillRect(PAD, cursorY, INNER_W, HEADER_H);
  if (bannerImg) {
    ctx.globalAlpha = 0.85;
    ctx.drawImage(bannerImg, PAD, cursorY, INNER_W, HEADER_H);
    const scrim = ctx.createLinearGradient(PAD, cursorY, PAD + INNER_W, cursorY);
    scrim.addColorStop(0, 'rgba(0, 72, 160, 0.78)');
    scrim.addColorStop(0.65, 'rgba(11, 79, 156, 0.45)');
    scrim.addColorStop(1, 'rgba(11, 79, 156, 0.15)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = scrim;
    ctx.fillRect(PAD, cursorY, INNER_W, HEADER_H);
  }

  // Leon real avatar
  if (avatarImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(PAD + 84, cursorY + 130, 52, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImg, PAD + 32, cursorY + 78, 104, 104);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(PAD + 84, cursorY + 130, 52, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Title & Date
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText(`${todayStr} · ${getWeekdayLabel(todayStr)} · 连续通关 ${streak} 天`, PAD + 160, cursorY + 86);

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 42px ${FONT}`;
  ctx.fillText('Leon 希腊语每日学习报告', PAD + 160, cursorY + 144);

  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.font = `600 21px ${FONT}`;
  ctx.fillText('LEON GREEK COACH · 每日学习成果单', PAD + 160, cursorY + 190);

  // Rank Badge pill on right
  const rkW = 240;
  const rkH = 110;
  const rkX = PAD + INNER_W - rkW - 28;
  const rkY = cursorY + 75;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.36)';
  drawRoundedRect(ctx, rkX, rkY, rkW, rkH, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (rankImg) {
    ctx.save();
    drawRoundedRect(ctx, rkX + 16, rkY + 19, 72, 72, 16);
    ctx.clip();
    ctx.drawImage(rankImg, rkX + 16, rkY + 19, 72, 72);
    ctx.restore();
  }
  ctx.fillStyle = '#fde047';
  ctx.font = `800 22px ${FONT}`;
  ctx.fillText(`${score} XP`, rkX + 102, rkY + 48);
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 20px ${FONT}`;
  ctx.fillText(level.name.slice(0, 8), rkX + 102, rkY + 82);
  ctx.restore();

  cursorY += HEADER_H + 28;

  // 3. 4-Card KPI Summary Row
  const kpis = [
    { label: '三大区块总用时', val: formatElapsedHuman(totalBlockSec), sub: '3×40分主学习', bg: '#f8fafc', border: '#cbd5e1', color: '#0f172a' },
    { label: `纸质背单词 (${vocabDoneCount}/3次)`, val: formatElapsedHuman(totalVocabSec), sub: `A2 第 ${a2Idx || 0} 词${a2Word ? ` ${a2Word.word_greek}` : ''}`, bg: '#fffbeb', border: '#fde68a', color: '#92400e' },
    { label: '希腊历史故事', val: histLog?.listened ? `${histLog.episodesCount || 1} 集` : '0 集', sub: '词汇已自动入训练池', bg: '#edf5f0', border: '#a7d3c0', color: '#13312c' },
    { label: '自录生词 & 刷题', val: `${todayWords.length} 词`, sub: `网站刷题 ${todayWebCompleted.length}/8 模块`, bg: '#f0f9ff', border: '#bae6fd', color: '#0c4a6e' },
  ];
  const kpiGap = 16;
  const kpiW = (INNER_W - kpiGap * 3) / 4;
  kpis.forEach((k, idx) => {
    const kx = PAD + idx * (kpiW + kpiGap);
    ctx.fillStyle = k.bg;
    drawRoundedRect(ctx, kx, cursorY, kpiW, KPI_H, 18);
    ctx.fill();
    ctx.strokeStyle = k.border;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = `700 18px ${FONT}`;
    ctx.fillText(k.label, kx + 18, cursorY + 38);

    ctx.fillStyle = k.color;
    ctx.font = `800 32px ${FONT}`;
    ctx.fillText(k.val, kx + 18, cursorY + 88);

    ctx.fillStyle = '#475569';
    ctx.font = `600 16px ${FONT}`;
    const subTrim = k.sub.length > 15 ? `${k.sub.slice(0, 15)}…` : k.sub;
    ctx.fillText(subTrim, kx + 18, cursorY + 124);
  });

  cursorY += KPI_H + 28;

  // 4. Detailed Block Cards
  for (const sec of wrappedSections) {
    ctx.fillStyle = sec.bg;
    drawRoundedRect(ctx, PAD, cursorY, INNER_W, sec.height, 20);
    ctx.fill();
    ctx.strokeStyle = sec.border;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Accent bar on left
    ctx.fillStyle = sec.accent;
    drawRoundedRect(ctx, PAD, cursorY + 18, 8, sec.height - 36, 4);
    ctx.fill();

    ctx.fillStyle = sec.accent;
    ctx.font = `800 25px ${FONT}`;
    ctx.fillText(sec.title, PAD + 28, cursorY + SEC_PAD_Y + 22);

    ctx.fillStyle = '#1e293b';
    ctx.font = `500 22px ${FONT}`;
    sec.wrapped.forEach((line, i) => {
      ctx.fillText(line, PAD + 28, cursorY + SEC_PAD_Y + SEC_TITLE_H + 20 + i * LINE_H);
    });

    cursorY += sec.height + 24;
  }

  // 5. Today's Manually Entered Words (2-column clean table)
  if (todayWords.length > 0) {
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, PAD, cursorY, INNER_W, wordsBoxH, 20);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = `800 24px ${FONT}`;
    ctx.fillText(`今日 Leon 自录学校生词 & 课堂笔记（共 ${todayWords.length} 词）`, PAD + 28, cursorY + 46);

    const colW = (INNER_W - 72) / 2;
    todayWords.forEach((w: any, idx: number) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const wx = PAD + 28 + col * (colW + 16);
      const wy = cursorY + 72 + row * 46;

      ctx.fillStyle = '#f8fafc';
      drawRoundedRect(ctx, wx, wy, colW, 38, 10);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = `700 20px ${FONT}`;
      const pair = `${w.word_greek}  =  ${w.word_chinese}`;
      ctx.fillText(pair.length > 26 ? `${pair.slice(0, 26)}…` : pair, wx + 14, wy + 26);
    });
    cursorY += wordsBoxH + 24;
  }

  // 6. Footer stamp
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD, H - 78);
  ctx.lineTo(W - PAD, H - 78);
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = `600 19px ${FONT}`;
  ctx.fillText('Leon Greek Coach · 雅典比雷埃夫斯54小学四年级专属学习日报', PAD, H - 42);
  ctx.textAlign = 'right';
  ctx.fillText(`生成日期：${todayStr}`, W - PAD, H - 42);

  // Trigger download
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `Leon学习日报_${todayStr}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * 弹出高颜值 A4 排版打印 / 另存为 PDF 窗口
 */
export function exportDailyReportPdf(payload: ExportReportPayload): void {
  const { todayStr, mission, todayWebCompleted, todayWords, pageProgress, score, streak } = payload;
  const level = getScoutLevelInfo(score);
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
  const schoolItems = mission.blockLogs?.school?.items || [];
  const tutorLog = mission.blockLogs?.tutor;
  const previews = (mission.blockLogs?.previews || []).filter(
    (p) => p.subject || p.pages || p.summary || (p.actions && p.actions.length > 0) || p.newWordsCount > 0
  );
  const workbookChecks = (
    mission.blockLogs?.workbookChecks && mission.blockLogs.workbookChecks.length > 0
      ? mission.blockLogs.workbookChecks
      : mission.blockLogs?.workbookCheck
        ? [{ id: 'wb_legacy', ...mission.blockLogs.workbookCheck }]
        : []
  ).filter((wb) => (wb.actions && wb.actions.length > 0) || wb.note);
  const histLog = mission.historyLog;

  const esc = (s: string) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>Leon 希腊语每日学习报告 - ${esc(todayStr)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; color: #0f172a; margin: 0; background: #fff; }
  .sheet { max-width: 780px; margin: 0 auto; border: 1.5px solid #e2c98d; border-radius: 18px; padding: 24px; background: #fdfcf8 url('/images/ui/bg_report_poster.png') center/cover no-repeat; }
  .hero { display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #005bb5, #1d4ed8); color: #fff; padding: 20px 24px; border-radius: 16px; margin-bottom: 18px; }
  .hero h1 { margin: 4px 0 2px; font-size: 24px; }
  .hero .sub { font-size: 12px; opacity: 0.9; }
  .rank { background: rgba(15,23,42,0.3); padding: 10px 16px; border-radius: 12px; text-align: right; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
  .kpi { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; }
  .kpi .lbl { font-size: 11px; color: #64748b; font-weight: 700; }
  .kpi .val { font-size: 18px; font-weight: 800; margin-top: 4px; }
  .sec { background: #fff; border: 1px solid #cbd5e1; border-left: 5px solid #0071e3; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; }
  .sec.s1 { border-left-color: #0f766e; }
  .sec.s3 { border-left-color: #6d28d9; }
  .sec.sh { border-left-color: #1f4b43; }
  .sec h3 { margin: 0 0 8px; font-size: 15px; }
  .sec p, .sec li { font-size: 13px; line-height: 1.6; margin: 3px 0; }
  .words { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-top: 8px; }
  .word { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px; font-size: 13px; }
  .foot { margin-top: 16px; padding-top: 10px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
  @media print { .no-print { display: none; } .sheet { border: none; padding: 0; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="hero">
      <div>
        <div class="sub">${esc(todayStr)} · ${esc(getWeekdayLabel(todayStr))} · 连续通关 ${streak} 天</div>
        <h1>Leon 希腊语每日学习报告</h1>
        <div class="sub">Leon Greek Coach · 每日学习成果单</div>
      </div>
      <div class="rank">
        <div style="font-size:18px;font-weight:800;color:#fde047;">${score} XP</div>
        <div style="font-size:13px;font-weight:700;">${esc(level.name)}</div>
      </div>
    </div>

    <div class="kpis">
      <div class="kpi"><div class="lbl">三大区块总用时</div><div class="val">${esc(formatElapsedHuman(totalBlockSec))}</div></div>
      <div class="kpi"><div class="lbl">背单词 (${vocabDoneCount}/3次)</div><div class="val">${esc(formatElapsedHuman(totalVocabSec))} · A2 #${a2Idx || 0}</div></div>
      <div class="kpi"><div class="lbl">希腊历史故事</div><div class="val">${histLog?.listened ? `${histLog.episodesCount || 1} 集` : '0 集'}</div></div>
      <div class="kpi"><div class="lbl">网站刷题 &amp; 自录词</div><div class="val">${todayWebCompleted.length}/8 · ${todayWords.length}词</div></div>
    </div>

    <div class="sec s1">
      <h3>区块一 · 学校复习与作业（用时 ${esc(formatElapsedHuman(mission.blocks?.block_school?.elapsedSec || 0))}）</h3>
      ${
        schoolItems.length > 0
          ? schoolItems
              .map(
                (it) =>
                  `<p><strong>${esc(it.subject)}</strong>（P.${it.fromPage}${it.toPage > it.fromPage ? `-${it.toPage}` : ''}${it.questionMarks ? ` · 问号 ${it.questionMarks} 个` : ''}）${it.hwActions?.length ? ` — ${esc(it.hwActions.join(' / '))}` : ''}${it.note ? `<br/>备注：${esc(it.note)}` : ''}</p>`
              )
              .join('')
          : `<p>暂无记录</p>`
      }
    </div>

    <div class="sec">
      <h3>区块二 · 网站刷题 + 希腊语私教课（用时 ${esc(formatElapsedHuman(mission.blocks?.block_web?.elapsedSec || 0))}）</h3>
      <p><strong>网站刷题：</strong>今日已完成 ${todayWebCompleted.length} / 8 个模块</p>
      ${
        tutorLog
          ? `<p><strong>希腊语私教课：</strong>${esc(TUTOR_MODE_LABEL[tutorLog.mode] || '备课')} · ${esc(tutorLog.book || 'B本')} P.${tutorLog.fromPage ?? ''}${tutorLog.toPage ? `-${tutorLog.toPage}` : ''} · 问号 ${tutorLog.questionMarks || 0} 个${tutorLog.actions?.length ? `<br/>动作：${esc(tutorLog.actions.join(' / '))}` : ''}${tutorLog.summary ? `<br/>备注：${esc(tutorLog.summary)}` : ''}</p>`
          : `<p><strong>希腊语私教课：</strong>暂无记录</p>`
      }
    </div>

    <div class="sec s3">
      <h3>区块三 · 下节课多科预习 &amp; 练习册扫雷（用时 ${esc(formatElapsedHuman(mission.blocks?.block_preview?.elapsedSec || 0))}）</h3>
      ${
        previews.length > 0
          ? previews
              .map(
                (p, i) =>
                  `<p><strong>科目 ${i + 1}：${esc(p.subject || '未选')}</strong> ${esc(p.pages || '')} · 新学 ${p.newWordsCount || 0} 词${p.actions?.length ? `（${esc(p.actions.join(' / '))}）` : ''}${p.summary ? `<br/>中文大意：${esc(p.summary)}` : ''}</p>`
              )
              .join('')
          : '<p>暂无预习记录</p>'
      }
      ${workbookChecks
        .map(
          (wb) =>
            `<p><strong>练习册扫雷：</strong>${esc(wb.bookName)} P.${wb.fromPage}${wb.toPage > wb.fromPage ? `-${wb.toPage}` : ''}${wb.actions?.length ? ` — ${esc(wb.actions.join(' / '))}` : ''}${wb.note ? `<br/>重点问题：${esc(wb.note)}` : ''}</p>`
        )
        .join('')}
    </div>

    ${
      histLog?.listened
        ? `<div class="sec sh"><h3>区块外日常 · 希腊语历史故事（共 ${histLog.episodesCount || 1} 集）</h3><p>${esc(histLog.episodeNote || '已完成今日收听')}</p></div>`
        : ''
    }

    ${
      todayWords.length > 0
        ? `<div class="sec"><h3>今日自录学校生词 &amp; 课堂笔记（共 ${todayWords.length} 词）</h3><div class="words">${todayWords
            .map((w: any) => `<div class="word"><strong>${esc(w.word_greek)}</strong> = ${esc(w.word_chinese)}</div>`)
            .join('')}</div></div>`
        : ''
    }

    <div class="foot">
      <span>Leon Greek Coach · 每日学习报告单</span>
      <span>日期：${esc(todayStr)}</span>
    </div>
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 250); };</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=1000');
  if (w) {
    w.document.open();
    w.document.write(html);
    w.document.close();
  }
}

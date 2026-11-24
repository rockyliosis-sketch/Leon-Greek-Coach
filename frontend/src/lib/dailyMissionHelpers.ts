import type { DailyMissionRecord, VocabSrsEntry } from '../dbService';
import { todayStr as greeceTodayStr } from './pageProgress';
import vocabV2Data from '../data/vocabulary_v2.json';
import glossaryV2Data from '../data/glossary_v2.json';

export type DayMode = 'weekday' | 'saturday' | 'sunday';

export function getTodayStr(): string {
  return greeceTodayStr();
}

export function getDayMode(dateStr: string): DayMode {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const dow = dt.getDay();
  if (dow === 6) return 'saturday';
  if (dow === 0) return 'sunday';
  return 'weekday';
}

export function getWeekdayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const labels = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return labels[dt.getDay()] || '';
}

export function addDaysStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function getMondayDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const dow = dt.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  dt.setDate(dt.getDate() + diff);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function normalizeGreekKey(text: string): string {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:«»"'()（）\[\]—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripLeadingArticleParens(text: string): string {
  return String(text || '')
    .replace(/^\s*[（(]\s*(οι|τα|ο|η|το|ένας|μια|μία|ένα)\s*[)）]\s*/i, '')
    .replace(/^\s*\d+[\.\s、]+/, '')
    .replace(/[()（）]/g, '')
    .trim();
}

export function validateNewVocabEntry(
  rawGreek: string,
  rawChinese: string
): { ok: true; greek: string; chinese: string } | { ok: false; error: string } {
  const greek = stripLeadingArticleParens(rawGreek);
  const chinese = String(rawChinese || '')
    .replace(/[\u0370-\u03FF\u1F00-\u1FFF]/g, '')
    .trim();

  if (!greek) {
    return { ok: false, error: '请先输入或语音说出希腊语单词' };
  }
  if (!/[\u0370-\u03FF\u1F00-\u1FFF]/.test(greek)) {
    return { ok: false, error: '希腊语框里没有检测到希腊字母哦' };
  }
  if (/[\u4e00-\u9fa5]/.test(greek)) {
    return { ok: false, error: '希腊语框里不能混入汉字，请把中文填在右边的中文框' };
  }
  if (!chinese) {
    return { ok: false, error: '请填写中文意思（也可以点上方词库联想自动填入）' };
  }
  return { ok: true, greek, chinese };
}

export interface VocabSuggestion {
  greek: string;
  chinese: string;
  source: string;
}

let cachedIndex: VocabSuggestion[] | null = null;

function getLookupIndex(): VocabSuggestion[] {
  if (cachedIndex) return cachedIndex;
  const list: VocabSuggestion[] = [];
  const seen = new Set<string>();

  const v2Entries = ((vocabV2Data as any).entries || []) as Array<{
    headword?: string;
    word_greek?: string;
    word_chinese?: string;
    book_id?: string;
  }>;
  for (const e of v2Entries) {
    const gr = String(e.headword || e.word_greek || '').trim();
    const zh = String(e.word_chinese || '').trim();
    if (!gr || !zh) continue;
    const key = normalizeGreekKey(gr);
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({ greek: gr, chinese: zh, source: String(e.book_id || '课本').toUpperCase() });
  }

  const glossLists = ((glossaryV2Data as any).lists || {}) as Record<
    string,
    Array<{ word_greek?: string; word_chinese?: string }>
  >;
  for (const [level, arr] of Object.entries(glossLists)) {
    for (const e of arr || []) {
      const gr = String(e.word_greek || '').trim();
      const zh = String(e.word_chinese || '').trim();
      if (!gr || !zh) continue;
      const key = normalizeGreekKey(gr);
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({ greek: gr, chinese: zh, source: `${level}词表` });
    }
  }

  cachedIndex = list;
  return list;
}

export function findVocabSuggestions(query: string, limit = 5): VocabSuggestion[] {
  const norm = normalizeGreekKey(query);
  if (norm.length < 2) return [];
  const idx = getLookupIndex();
  const exact: VocabSuggestion[] = [];
  const prefix: VocabSuggestion[] = [];
  const partial: VocabSuggestion[] = [];

  for (const item of idx) {
    const k = normalizeGreekKey(item.greek);
    if (k === norm) {
      exact.push(item);
    } else if (k.startsWith(norm)) {
      prefix.push(item);
    } else if (k.includes(norm)) {
      partial.push(item);
    }
    if (exact.length + prefix.length >= limit * 2) break;
  }

  return [...exact, ...prefix, ...partial].slice(0, limit);
}

const SRS_INTERVALS = [1, 2, 4, 7, 14, 30];

export function computeNextSrs(
  prev: VocabSrsEntry | undefined,
  rating: 'good' | 'hard' | 'again',
  todayStr: string
): VocabSrsEntry {
  const prevLevel = prev ? prev.level : 0;
  let nextLevel = prevLevel;
  let intervalDays = 1;

  if (rating === 'again') {
    nextLevel = 0;
    intervalDays = 1;
  } else if (rating === 'hard') {
    nextLevel = Math.max(1, prevLevel);
    intervalDays = SRS_INTERVALS[Math.min(nextLevel - 1, SRS_INTERVALS.length - 1)] || 1;
  } else {
    nextLevel = Math.min(prevLevel + 1, SRS_INTERVALS.length);
    intervalDays = SRS_INTERVALS[Math.min(nextLevel - 1, SRS_INTERVALS.length - 1)] || 1;
  }

  return {
    level: nextLevel,
    nextDue: addDaysStr(todayStr, intervalDays),
    lastReviewed: todayStr,
  };
}

export function createDefaultMissionRecord(dateStr: string): DailyMissionRecord {
  const mode = getDayMode(dateStr);
  return {
    date: dateStr,
    hasTutorClass: mode === 'weekday',
    lightPreviewMode: false,
    vocabChecks: {
      morning: false,
      afternoon: false,
      night: false,
    },
    blocks: {},
    parentApproval: {
      checkedBook: false,
      heardSummary: false,
      approved: false,
    },
  };
}

export function formatDurationMinSec(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatElapsedHuman(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  if (sec < 60) return `${sec} 秒`;
  const m = Math.floor(sec / 60);
  return `${m} 分钟`;
}

/**
 * 墙钟驱动的实时已用秒数计算：
 * baseElapsedSec（已累计落盘秒数） + （当前时间 - runningSinceMs）/ 1000。
 * 无论刷新浏览器、切换标签页、跳转到 /practice 刷题、还是 iPad 锁屏/切 App，都不会丢失一秒进度。
 * 单次连续未暂停上限保护 4 小时（14400 秒），防止忘记暂停跨天失真。
 */
export function getLiveElapsedSec(
  baseElapsedSec?: number,
  runningSinceMs?: number | null,
  nowMs: number = Date.now()
): number {
  const base = Math.max(0, Math.floor(baseElapsedSec || 0));
  if (!runningSinceMs || !Number.isFinite(runningSinceMs)) return base;
  const delta = Math.max(0, Math.floor((nowMs - runningSinceMs) / 1000));
  return base + Math.min(delta, 14400);
}

export const CORE_DRILL_MODULES = [
  'matching',
  'spelling',
  'truefalse',
  'quiz',
  'translation_gr_zh',
  'translation_zh_gr',
  'glossary_review',
  'grammar_drill',
] as const;

export interface DailyXpMilestoneItem {
  key: string;
  label: string;
  points: number;
  awarded: boolean;
  eligible: boolean;
}

export interface DailyXpBreakdown {
  items: DailyXpMilestoneItem[];
  earnedToday: number;
  maxDaily: number;
}

/**
 * 统一核算每日 20 分积分规则（每项每天限领 1 次，绝不重复加分）：
 * 1. 每日网站刷题（8 大核心模块全部完成）：+4 XP
 * 2. 希腊历史故事（听 1 集及以上）：+1 XP
 * 3. 完成 3 次背单词打卡：+4 XP
 * 4. 3 次背单词累计满 30 分钟（1800 秒）：+1 XP
 * 5. 三大攻坚区块全部完成且累计达标（平日 3×40=120 分钟）：+10 XP
 * 合计每日满分：20 XP
 */
export function evaluateDailyXpRewards(params: {
  todayStr: string;
  mission: DailyMissionRecord;
  completedModules: string[];
  dailyRewardsAwarded: Record<string, boolean> | undefined;
  blockIds: string[];
  targetBlockTotalSec: number;
  nowMs?: number;
}): {
  breakdown: DailyXpBreakdown;
  newlyEarnedXp: number;
  nextDailyRewardsAwarded: Record<string, boolean>;
} {
  const {
    todayStr,
    mission,
    completedModules,
    dailyRewardsAwarded,
    blockIds,
    targetBlockTotalSec,
    nowMs = Date.now(),
  } = params;

  const existing = { ...(dailyRewardsAwarded || {}) };

  const drillsKey = `${todayStr}:drills`;
  const historyKey = `${todayStr}:history`;
  const vocab3xKey = `${todayStr}:vocab_3x`;
  const vocab30mKey = `${todayStr}:vocab_30m`;
  const blocksKey = `${todayStr}:blocks_120m`;

  const drillsEligible = CORE_DRILL_MODULES.every((m) => completedModules.includes(m));
  const historyEligible = Boolean(
    mission.historyLog?.listened ||
      (mission.historyLog?.episodesCount || 0) >= 1 ||
      (mission.historyLog?.episodeIds?.length || 0) >= 1
  );
  const vocab3xEligible = Boolean(
    mission.vocabChecks?.morning && mission.vocabChecks?.afternoon && mission.vocabChecks?.night
  );

  const vt = mission.vocabTimers;
  const totalVocabSec =
    getLiveElapsedSec(vt?.morning?.elapsedSec, vt?.morning?.runningSinceMs, nowMs) +
    getLiveElapsedSec(vt?.afternoon?.elapsedSec, vt?.afternoon?.runningSinceMs, nowMs) +
    getLiveElapsedSec(vt?.night?.elapsedSec, vt?.night?.runningSinceMs, nowMs);
  const vocab30mEligible = vocab3xEligible && totalVocabSec >= 30 * 60;

  const allBlocksDone =
    blockIds.length > 0 && blockIds.every((id) => mission.blocks?.[id]?.status === 'done');
  const totalBlockSec = blockIds.reduce((sum, id) => {
    const b = mission.blocks?.[id];
    return sum + getLiveElapsedSec(b?.elapsedSec, b?.runningSinceMs, nowMs);
  }, 0);
  const blocksEligible = allBlocksDone && totalBlockSec >= targetBlockTotalSec;

  const specs: Array<{ key: string; label: string; points: number; eligible: boolean }> = [
    { key: drillsKey, label: '每日网站刷题（8 大核心模块全通关）', points: 4, eligible: drillsEligible },
    { key: historyKey, label: '希腊历史故事（听 1 集及以上）', points: 1, eligible: historyEligible },
    { key: vocab3xKey, label: '完成 3 次背单词打卡', points: 4, eligible: vocab3xEligible },
    { key: vocab30mKey, label: '3 次背单词累计满 30 分钟加奖', points: 1, eligible: vocab30mEligible },
    {
      key: blocksKey,
      label: `三大区块全部通关且满 ${Math.round(targetBlockTotalSec / 60)} 分钟`,
      points: 10,
      eligible: blocksEligible,
    },
  ];

  let newlyEarnedXp = 0;
  const nextDailyRewardsAwarded = { ...existing };

  const items: DailyXpMilestoneItem[] = specs.map((s) => {
    const already = Boolean(existing[s.key]);
    if (!already && s.eligible) {
      newlyEarnedXp += s.points;
      nextDailyRewardsAwarded[s.key] = true;
    }
    return {
      key: s.key,
      label: s.label,
      points: s.points,
      awarded: Boolean(nextDailyRewardsAwarded[s.key]),
      eligible: s.eligible,
    };
  });

  const earnedToday = items.reduce((sum, it) => sum + (it.awarded ? it.points : 0), 0);

  return {
    breakdown: {
      items,
      earnedToday,
      maxDaily: 20,
    },
    newlyEarnedXp,
    nextDailyRewardsAwarded,
  };
}

export function calculateMissionStreak(
  missions: Record<string, DailyMissionRecord> | undefined,
  todayStr: string
): number {
  if (!missions) return 0;
  let streak = 0;
  let cursor = todayStr;
  for (let i = 0; i < 60; i++) {
    const rec = missions[cursor];
    const doneBlocks = rec
      ? Object.values(rec.blocks || {}).filter((b) => b.status === 'done').length
      : 0;
    const isDayDone = Boolean(rec?.parentApproval?.approved || doneBlocks >= 2);
    if (isDayDone) {
      streak++;
      cursor = addDaysStr(cursor, -1);
    } else if (i === 0) {
      // Today not finished yet — check yesterday
      cursor = addDaysStr(cursor, -1);
    } else {
      break;
    }
  }
  return streak;
}

export function speakGreekWord(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'el-GR';
    const voices = window.speechSynthesis.getVoices();
    const greekVoice = voices.find((v) => v.lang.includes('el-GR') || v.lang.includes('el_GR'));
    if (greekVoice) utterance.voice = greekVoice;
    window.speechSynthesis.speak(utterance);
  } catch {
    // ignore speech synthesis errors
  }
}

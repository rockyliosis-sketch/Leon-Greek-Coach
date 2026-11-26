import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Headphones,
  Lightbulb,
  Mic,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings,
  Sparkles,
  Target,
  Trophy,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import {
  subscribeToSharedState,
  saveSharedState,
  getInitialLocalState,
  type DailyBlockLogs,
  type DailyMissionBlockState,
  type DailyMissionRecord,
  type DbConnectionStatus,
  type G3ChallengeDailyLog,
  type G3GlossaProgressState,
  type PreviewSubjectLog,
  type SchoolSubjectTaskLog,
  type SharedState,
  type TextbookPreferencesState,
  type VocabSrsEntry,
  type WorkbookCheckLog,
} from '../../dbService';
import {
  calculateMissionStreak,
  createDefaultMissionRecord,
  evaluateDailyXpRewards,
  formatDurationMinSec,
  formatElapsedHuman,
  getDayMode,
  getLiveElapsedSec,
  getMondayDateStr,
  getTodayStr,
  getWeekdayLabel,
  getWeeklyNoteUnit,
  normalizeGreekKey,
  stripLeadingArticleParens,
  type DayMode,
} from '../../lib/dailyMissionHelpers';
import { getBookFrontier, makeMarkId } from '../../lib/pageProgress';
import { getScoutLevelInfo, RANK_STAR_URL, SCOUT_LEVELS } from '../../lib/levelSystem';
import glossaryV2Data from '../../data/glossary_v2.json';
import historyCatalogData from '../../data/history_catalog.json';
import historyVocabIndexData from '../../data/history_vocab_index.json';
import { QuickVocabRecorder } from '../../components/QuickVocabRecorder';
import { DailyFlashcardModal, type VocabSlot } from '../../components/DailyFlashcardModal';
import { DailyStudyReport } from '../../components/DailyStudyReport';
import { LevelRulesModal } from '../../components/LevelRulesModal';
import { InteractiveTextbookViewer } from '../../components/InteractiveTextbookViewer';
import { G3GlossaChallengePanel } from '../../components/G3GlossaChallengePanel';
import { computeG3ChallengeSummary, getTutorBookId } from '../../lib/textbookService';

interface WizardStepDef {
  title: string;
  shortLabel: string;
  whyShort: string;
  checklist: string[];
  buttonText: string;
  kind?:
    | 'default'
    | 'school_plan'
    | 'vocab_recorder'
    | 'school_homework'
    | 'website_drills'
    | 'tutor_prep'
    | 'five_min_scan'
    | 'multi_preview'
    | 'workbook_check';
  linkTo?: string;
  linkLabel?: string;
}

const NumberStepper: React.FC<{
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  prefix?: string;
  suffix?: string;
}> = ({ value, min = 0, max = 500, onChange, prefix, suffix }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', border: '1.5px solid #cbd5e1', borderRadius: 10, padding: '2px 4px' }}>
    {prefix && <span style={{ fontSize: 12, color: '#64748b', paddingLeft: 4 }}>{prefix}</span>}
    <button
      type="button"
      onClick={() => onChange(Math.max(min, value - 1))}
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        border: 'none',
        background: '#f1f5f9',
        color: '#0f172a',
        fontWeight: 800,
        fontSize: 16,
        cursor: 'pointer',
      }}
    >
      −
    </button>
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)));
      }}
      style={{
        width: 48,
        textAlign: 'center',
        border: 'none',
        outline: 'none',
        fontSize: 15,
        fontWeight: 800,
        color: '#0f172a',
        background: 'transparent',
      }}
    />
    <button
      type="button"
      onClick={() => onChange(Math.min(max, value + 1))}
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        border: 'none',
        background: '#eff6ff',
        color: '#0071E3',
        fontWeight: 800,
        fontSize: 16,
        cursor: 'pointer',
      }}
    >
      +
    </button>
    {suffix && <span style={{ fontSize: 12, color: '#64748b', paddingRight: 4 }}>{suffix}</span>}
  </div>
);

const HW_ACTION_OPTIONS = [
  '书面作业全做完',
  '独立完成没查词',
  '查词后才做完',
  '朗读了课文',
  '抄写了生词/句子',
  '订正了上次错题',
  '整理了错题本',
  '做了数学计算题',
  '完成了阅读理解',
  '需要明天问老师',
];

const TUTOR_REVIEW_ACTIONS = [
  '口头重做了上节错题',
  '复习了语法变格',
  '复习了动词变位',
  '整理了语法笔记',
  '出声朗读了本单元课文',
  '听了配套录音',
  '复习了重点句型',
];

const TUTOR_PREVIEW_ACTIONS = [
  '未来1-2页生词全查懂',
  '每道练习题干都看懂',
  '基础题已用铅笔试填',
  '不会的已画问号待问老师',
  '提前通读了新对话',
];

const OLD_NOTES_REVIEW_ACTIONS = [
  '遮中文考了自己',
  '重读了旧课文与句子',
  '复习了旧语法笔记',
  '擦掉了已记住的标记',
  '圈出了顽固词明天入库',
];

/** 把清单中的【重点词】渲染为大一号、加粗、标红高亮 */
const renderHighlightedText = (text: string) => {
  const parts = text.split(/(【[^】]+】)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('【') && part.endsWith('】')) {
      const inner = part.slice(1, -1);
      return (
        <span
          key={idx}
          style={{
            color: '#dc2626',
            fontWeight: 900,
            fontSize: '1.14em',
            background: '#fef2f2',
            padding: '1px 6px',
            borderRadius: 6,
            margin: '0 2px',
          }}
        >
          {inner}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
};

const WORKBOOK_CHECK_OPTIONS = [
  '读懂了全部题干',
  '标出了题目指令生词',
  '看懂了选择题要求',
  '看懂了填空题要求',
  '看懂了写作/造句题',
  '发现了较难的大题',
  '提前想好了思路',
  '标记了明天重点听讲题',
];

/** 古希腊专属去 Emoji 图标组件 */
const UiIcon: React.FC<{ name: string; size?: number; style?: React.CSSProperties }> = ({
  name,
  size = 20,
  style,
}) => (
  <img
    src={`/images/ui/${name}.png`}
    alt=""
    style={{
      width: size,
      height: size,
      objectFit: 'contain',
      flexShrink: 0,
      verticalAlign: 'middle',
      ...style,
    }}
  />
);

interface MissionBlockDef {
  id: string;
  iconName: string;
  bgImage: string;
  title: string;
  subtitle: string;
  minutes: number;
  accent: string;
  bg: string;
  steps: WizardStepDef[];
}

const SCHOOL_SUBJECTS = [
  '希腊语 (Γλώσσα)',
  '历史 (Ιστορία)',
  '环境学 (Μελέτη Περιβάλλοντος)',
  '数学 (Μαθηματικά)',
  '英语/其他',
];

const PREVIEW_ACTIONS = [
  '通读了新课文',
  '查并标了重点词',
  '看懂了大概意思',
  '用中文复述了大意',
  '看了课本插图与词典框',
  '找出了难懂长句子',
  '预习了新语法点',
  '朗读了重点段落',
  '抄写了关键新词',
  '标注了课上重点提问',
];

const DEFAULT_VOCAB_SLOT_SEC = 10 * 60; // 10 minutes per vocab session (30m/day total)

const makePreviewLog = (defaultSubj = ''): PreviewSubjectLog => ({
  id: `pv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  subject: defaultSubj,
  fromPage: 1,
  toPage: 2,
  pages: 'P.1-2',
  actions: [],
  newWordsCount: 0,
  summary: '',
});

const makeWorkbookCheckLog = (defaultBook = '希腊语 (Γλώσσα)'): WorkbookCheckLog => ({
  id: `wb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  bookName: defaultBook,
  fromPage: 1,
  toPage: 2,
  actions: [],
  note: '',
});

function buildBlocksForMode(mode: DayMode, record: DailyMissionRecord): MissionBlockDef[] {
  const isLight = Boolean(record.lightPreviewMode);

  const blockSchool: MissionBlockDef = {
    id: 'block_school',
    iconName: 'icon_block_school',
    bgImage: '/images/ui/bg_block_school.png',
    title: mode === 'saturday'
      ? (isLight ? '区块一：本周课本快清盘（轻享 20 分）' : '区块一：本周课本大清盘')
      : '区块一：学校当天复习 + 生词入库 + 作业',
    subtitle: mode === 'saturday'
      ? '集中消灭本周残留的圈词和 ?'
      : '40 分钟 · 重点是当天内容排雷与生词全入库（提前做完可先做区块二私教课）',
    minutes: mode === 'saturday' ? (isLight ? 20 : 35) : 40,
    accent: '#0f766e',
    bg: '#f0fdfa',
    steps: [
      {
        title: mode === 'saturday' ? 'Step 1：本周课本旧标记清盘' : 'Step 1：学校当天课本复习排雷',
        shortLabel: mode === 'saturday' ? '翻本周旧圈词和 ?，懂了擦掉' : '选今日科目页码 + 查懂当天书上每个生词',
        whyShort: '先扫清今天课本里每一个不懂的词，写作业才不卡壳！',
        checklist: mode === 'saturday'
          ? [
              '翻开本周所有学校课本，只看留着圈和 ? 的地方',
              '遮住中文考自己：看懂的直接擦掉或打 ✓',
              '还是没记住的词，留到下一步全部录进系统',
            ]
          : [
              '下方点选今天上过的学校科目和页码',
              '逐页检查今天课文：确认【每一个单词】都看懂，不懂立刻【铅笔标中文】',
              '课本页眉【写上今天日期】（方便以后规律复习）',
              '把今天新接触的所有句子和单词，全部【出声朗读 3 遍】',
            ],
        buttonText: '当天课本排雷完成，去录生词',
        kind: 'school_plan',
      },
      {
        title: 'Step 2：把今天所有生词全部入库（本区块最核心！）',
        shortLabel: '把今天标过/记过的生词全部语音入库',
        whyShort: '录词 = 再学一遍！哪怕昨天预习标过、今天又记的词，只要不熟就全录进来。',
        checklist: [
          '翻开今天学过的课本和笔记本，找出【所有还不完全熟的生词】',
          '用 iPad 语音输入批量填进下方（不够就点【+ 再加 1 行】）',
          '点【一键全部入库】，未来 7 天网站每天自动帮你巩固',
        ],
        buttonText: '生词全部入库了，去写作业',
        kind: 'vocab_recorder',
      },
      {
        title: 'Step 3：完成今日学校书面作业',
        shortLabel: '完成各科书面作业并点选完成项',
        whyShort: '趁刚查完词一口气写完！如果提前做完，可直接去推进一部分区块二的私教课。',
        checklist: [
          '一口气认真完成今天各科的【全部书面作业】',
          '实在不会做的题目【先标出来】，全部写完后再查书或明天问老师',
          '在下方逐科点选完成项（提前做完可直接去做【区块二私教课】）',
        ],
        buttonText: '区块一全部通关！',
        kind: 'school_homework',
      },
    ],
  };

  const blockWebTutor: MissionBlockDef = {
    id: 'block_web',
    iconName: 'icon_block_web',
    bgImage: '/images/ui/bg_block_web_tutor.png',
    title: isLight && mode === 'sunday'
      ? '区块二：网站刷题 + 私教备课（轻享 25 分）'
      : '区块二：网站刷题 + 希腊语私教课',
    subtitle: '40 分钟 · 工作量较大，私教课清单可随时拆到区块一/三接力完成',
    minutes: isLight && mode === 'sunday' ? 25 : 40,
    accent: '#0071E3',
    bg: '#eff6ff',
    steps: [
      {
        title: 'Step 1：完成今日网站八大模块刷题',
        shortLabel: '完成今日网站八大模块日常刷题',
        whyShort: '听、说、拼、译四维反复提取，记忆效率比死看书高 3 倍！',
        checklist: [
          '点下方按钮进入刷题中心，完成今日八大模块',
          '卡壳时先想 3 秒再点提示，不胡乱按键',
          '刷完返回首页，继续推进私教课清单',
        ],
        buttonText: '网站刷题完成，去做私教课',
        kind: 'website_drills',
        linkTo: '/practice',
        linkLabel: '去刷题 →',
      },
      {
        title: 'Step 2：希腊语私教课（预习 / 复习专属清单）',
        shortLabel: '按私教课预习/复习清单逐项打勾并记录单元页码',
        whyShort: '自己把复习和预习做好，老师上课才不用陪你炒冷饭，全堂直接学新课、进度翻倍！',
        checklist: [
          '先选今天私教课模式（课前预习 / 课后复习 / 预习+复习）',
          '对照下方亮出的【预习清单】或【复习清单】逐条打勾完成',
          '选好教材、单元号、页码区间与问号数，记入今日学习报告',
        ],
        buttonText: '区块二全部通关！',
        kind: 'tutor_prep',
      },
    ],
  };

  const blockPreview: MissionBlockDef = {
    id: 'block_preview',
    iconName: 'icon_block_preview',
    bgImage: '/images/ui/bg_block_preview.png',
    title: isLight
      ? '区块三：旧笔记复习 + 明天预习（轻享 20 分）'
      : '区块三：旧笔记规律复习 + 明天新课/练习册预习',
    subtitle: isLight
      ? '20 分钟轻享 · 1/3 时间看旧笔记 + 重点预习 1 科'
      : '40 分钟 · 1/3 时间规律复习旧笔记 + 预习明天至少 2 科与练习册',
    minutes: isLight ? 20 : 40,
    accent: '#7c3aed',
    bg: '#f5f3ff',
    steps: [
      {
        title: 'Step 1：三年级《语言 + 练习册》跳单元强制闯关（必过解锁下一步！）',
        shortLabel: '跨册跳单元攻克三年级语言课文+练习册（答对3题通关）',
        whyShort: '把三年级漏掉的 20% 实词和基础语法地基彻底补牢，四年级听课写作业才能轻松起飞！',
        checklist: [
          '通读下方自动摊开的【三年级课文】：遇到不熟的词【直接用手指点选】看讲解并入库',
          '点开【本课自动关联的三年级练习册】：看懂题干要求与语法规律',
          '完成最下方的【3 道必过闯关题】（全部答对自动亮绿灯，解锁下一步预习！）',
        ],
        buttonText: '三年级今日闯关通过，去预习明天新课 →',
        kind: 'five_min_scan',
      },
      {
        title: 'Step 2：预习明天学校新课（至少 2 科 · 预习时不用录生词）',
        shortLabel: '预习明天至少 2 科：标生词、通读、写中文大意',
        whyShort: '预习做好了，明天听课像开卷，区块一的工作量也会越来越少！（预习不用录词，明天区块一再录）',
        checklist: [
          '选好明天要预习的【科目和页码】（建议至少 2 科）',
          '把未来 1–2 页里所有看不懂的词句【提前标中文】',
          '出声通读 1 遍，确保【看懂大概讲了什么事】',
          '合上书，在下方用语音写一句【中文大意】',
        ],
        buttonText: '新课预习完成，去扫练习册',
        kind: 'multi_preview',
      },
      {
        title: 'Step 3：预习对应练习册（和私教课方法一样！）',
        shortLabel: '把练习册每道题干读懂、标出不懂的词（支持多本）',
        whyShort: '不要求提前做完，但必须把每道题干读懂、生词标好，明天上课立刻抓住重点！',
        checklist: [
          '翻开明天对应练习册，选好书目和页码（多本可点【+ 再增加一本】）',
          '把每一道题的题目要求读一遍，看不懂的指令词【提前标中文】',
          '勾选发现情况，把最想明天听老师讲的题记一句备注',
        ],
        buttonText: '区块三全部通关！',
        kind: 'workbook_check',
      },
    ],
  };

  if (mode === 'sunday') {
    return [blockWebTutor, blockPreview];
  }
  return [blockSchool, blockWebTutor, blockPreview];
}

const DailyMissionHall: React.FC = () => {
  // Reactive Greek date (Europe/Athens): automatically flips at 00:00 Greek time even if iPad tab stays open overnight!
  const [todayStr, setTodayStr] = useState<string>(() => getTodayStr());
  const actualMode = useMemo(() => getDayMode(todayStr), [todayStr]);

  const [sharedState, setSharedState] = useState<SharedState>(() => getInitialLocalState());
  const sharedStateRef = useRef<SharedState>(sharedState);
  sharedStateRef.current = sharedState;

  const [dbStatus, setDbStatus] = useState<DbConnectionStatus>('connecting');
  const [previewModeOverride, setPreviewModeOverride] = useState<DayMode | null>(null);
  const activeMode: DayMode = previewModeOverride || actualMode;

  // Global wall-clock tick (only active when at least one timer is running)
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Active wizard state (restored across browser refresh via sessionStorage)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(`leon_active_wizard_${getTodayStr()}`) || null;
    } catch {
      return null;
    }
  });
  const [earlyFinishMsg, setEarlyFinishMsg] = useState<string | null>(null);
  const [g3GateWarn, setG3GateWarn] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const setActiveWizardBlock = (blockId: string | null) => {
    setActiveBlockId(blockId);
    try {
      const key = `leon_active_wizard_${todayStr}`;
      if (blockId) {
        sessionStorage.setItem(key, blockId);
      } else {
        sessionStorage.removeItem(key);
      }
    } catch {}
  };

  // Modals & collapsible panels
  const [showQuickRecorder, setShowQuickRecorder] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [activeFlashcardSlot, setActiveFlashcardSlot] = useState<VocabSlot | null>(null);
  const [selectedGlossaryBook, setSelectedGlossaryBook] = useState<'glossary-a2' | 'glossary-b1'>('glossary-a2');
  const [showGlossaryPicker, setShowGlossaryPicker] = useState(false);
  const [glossarySearch, setGlossarySearch] = useState('');
  const [glossarySavedMsg, setGlossarySavedMsg] = useState<string | null>(null);
  const [historyGradeFilter, setHistoryGradeFilter] = useState<3 | 4>(4);
  const [historySyncMsg, setHistorySyncMsg] = useState<string | null>(null);

  // Subscribe to Firebase shared_state
  useEffect(() => {
    const unsub = subscribeToSharedState(
      (next) => setSharedState(next),
      (status) => setDbStatus(status)
    );
    return () => unsub();
  }, []);

  // Greek Midnight (00:00 Europe/Athens) Auto-Reset:
  // Even if iPad Safari stays open overnight or wakes from sleep, clear all in-memory progress & switch to a clean 0% new day.
  useEffect(() => {
    const checkGreekDayRollover = () => {
      const currentGreekDate = getTodayStr();
      if (currentGreekDate !== todayStr) {
        try {
          sessionStorage.removeItem(`leon_active_wizard_${todayStr}`);
        } catch {}
        setTodayStr(currentGreekDate);
        setActiveBlockId(null);
        setEarlyFinishMsg(null);
        setPreviewModeOverride(null);
        setShowQuickRecorder(false);
        setActiveFlashcardSlot(null);
        setShowGlossaryPicker(false);
        setHistorySyncMsg(null);
        setNowMs(Date.now());
      }
    };
    const intervalId = window.setInterval(checkGreekDayRollover, 30_000);
    const onWake = () => {
      if (document.visibilityState === 'visible') {
        setNowMs(Date.now());
        checkGreekDayRollover();
      }
    };
    const onFocus = () => {
      setNowMs(Date.now());
      checkGreekDayRollover();
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onFocus);
    };
  }, [todayStr]);

  const todayMission: DailyMissionRecord = useMemo(() => {
    const saved = sharedState.daily_missions?.[todayStr];
    if (saved) return saved;
    return createDefaultMissionRecord(todayStr);
  }, [sharedState.daily_missions, todayStr]);

  const blocks = useMemo(
    () => buildBlocksForMode(activeMode, todayMission),
    [activeMode, todayMission]
  );

  // Compute Block Time Carry-Over (if block N finished or paused short of target, carry deficit to block N+1!)
  const blockCarryOverMap = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    let pendingCarrySec = 0;
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      map[b.id] = pendingCarrySec;
      const st = todayMission.blocks?.[b.id];
      const baseTargetSec = b.minutes * 60 + pendingCarrySec;
      // Carry over deficit only if this block was explicitly worked on & marked done (or paused with partial time)
      // Specifically: if a block is done or in_progress with elapsedSec > 0 and elapsedSec < baseTargetSec,
      // and the user moved on, carry the remaining deficit forward so total 120m stays intact!
      if (st && st.status === 'done' && st.elapsedSec > 0 && st.elapsedSec < baseTargetSec) {
        pendingCarrySec = baseTargetSec - st.elapsedSec;
      } else {
        pendingCarrySec = 0;
      }
    }
    return map;
  }, [blocks, todayMission.blocks]);

  // Compute Vocab 3x Timer Carry-Over (each default 10m; deficit from morning -> afternoon -> night!)
  const vocabTimers = useMemo(() => {
    const raw = todayMission.vocabTimers || {
      morning: { elapsedSec: 0, completed: Boolean(todayMission.vocabChecks?.morning) },
      afternoon: { elapsedSec: 0, completed: Boolean(todayMission.vocabChecks?.afternoon) },
      night: { elapsedSec: 0, completed: Boolean(todayMission.vocabChecks?.night) },
    };
    const mLive = getLiveElapsedSec(raw.morning?.elapsedSec, raw.morning?.runningSinceMs, nowMs);
    const aLive = getLiveElapsedSec(raw.afternoon?.elapsedSec, raw.afternoon?.runningSinceMs, nowMs);
    const nLive = getLiveElapsedSec(raw.night?.elapsedSec, raw.night?.runningSinceMs, nowMs);

    const mTarget = DEFAULT_VOCAB_SLOT_SEC;
    const mDeficit =
      raw.morning.completed && mLive < mTarget
        ? mTarget - mLive
        : 0;

    const aTarget = DEFAULT_VOCAB_SLOT_SEC + mDeficit;
    const aDeficit =
      raw.afternoon.completed && aLive < aTarget
        ? aTarget - aLive
        : 0;

    const nTarget = DEFAULT_VOCAB_SLOT_SEC + aDeficit;

    return {
      morning: { ...raw.morning, elapsedSec: mLive, isRunning: Boolean(raw.morning?.runningSinceMs), targetSec: mTarget, carrySec: 0 },
      afternoon: { ...raw.afternoon, elapsedSec: aLive, isRunning: Boolean(raw.afternoon?.runningSinceMs), targetSec: aTarget, carrySec: mDeficit },
      night: { ...raw.night, elapsedSec: nLive, isRunning: Boolean(raw.night?.runningSinceMs), targetSec: nTarget, carrySec: aDeficit },
    };
  }, [todayMission.vocabTimers, todayMission.vocabChecks, nowMs]);

  const activeBlock = useMemo(
    () => blocks.find((b) => b.id === activeBlockId) || null,
    [blocks, activeBlockId]
  );

  const todayWebCompleted = useMemo(() => {
    return sharedState.completed_date_modules?.[todayStr] || [];
  }, [sharedState.completed_date_modules, todayStr]);

  const todayWords = useMemo(() => {
    return (sharedState.custom_vocab || []).filter(
      (w: any) =>
        w?.note_date === todayStr &&
        w?.source !== 'history_story' &&
        w?.book_id !== '历史故事词汇'
    );
  }, [sharedState.custom_vocab, todayStr]);

  const streak = useMemo(
    () => calculateMissionStreak(sharedState.daily_missions, todayStr),
    [sharedState.daily_missions, todayStr]
  );

  const currentLevel = useMemo(
    () => getScoutLevelInfo(sharedState.score || 0),
    [sharedState.score]
  );

  // Paper glossary progress
  const glossaryList = useMemo(() => {
    const key = selectedGlossaryBook === 'glossary-b1' ? 'B1' : 'A2';
    return (((glossaryV2Data as any).lists || {})[key] || []) as Array<{
      idx: number;
      word_greek: string;
      word_chinese: string;
      unit?: number;
    }>;
  }, [selectedGlossaryBook]);

  const glossaryFrontier = useMemo(() => {
    return getBookFrontier(sharedState.page_progress || [], selectedGlossaryBook);
  }, [sharedState.page_progress, selectedGlossaryBook]);

  const b1Frontier = useMemo(() => {
    return getBookFrontier(sharedState.page_progress || [], 'b1') || 36;
  }, [sharedState.page_progress]);

  const currentFrontierWord = useMemo(() => {
    if (!glossaryFrontier) return null;
    return glossaryList.find((w) => w.idx === glossaryFrontier) || glossaryList[glossaryFrontier - 1] || null;
  }, [glossaryList, glossaryFrontier]);

  const glossaryCandidates = useMemo(() => {
    const q = glossarySearch.trim();
    if (q) {
      const normQ = normalizeGreekKey(q);
      const numQ = Number(q);
      return glossaryList
        .filter((w) => {
          if (Number.isFinite(numQ) && numQ > 0 && w.idx === numQ) return true;
          if (normQ && normalizeGreekKey(w.word_greek).includes(normQ)) return true;
          if (w.word_chinese.includes(q)) return true;
          return false;
        })
        .slice(0, 24);
    }
    const startIdx = Math.max(0, glossaryFrontier);
    return glossaryList.slice(startIdx, startIdx + 24);
  }, [glossaryList, glossaryFrontier, glossarySearch]);

  const targetBlockTotalSec = useMemo(
    () => blocks.reduce((sum, b) => sum + b.minutes * 60, 0),
    [blocks]
  );

  const dailyXpBreakdown = useMemo(() => {
    return evaluateDailyXpRewards({
      todayStr,
      mission: todayMission,
      completedModules: todayWebCompleted,
      dailyRewardsAwarded: sharedState.daily_rewards_awarded,
      blockIds: blocks.map((b) => b.id),
      targetBlockTotalSec,
      nowMs,
    }).breakdown;
  }, [todayStr, todayMission, todayWebCompleted, sharedState.daily_rewards_awarded, blocks, targetBlockTotalSec, nowMs]);

  const dailyRewardClaimed = dailyXpBreakdown.earnedToday >= dailyXpBreakdown.maxDaily;

  // Persist helper — uses sharedStateRef.current to eliminate stale-closure overwrites,
  // synchronously persists to localStorage via saveSharedState, and evaluates all 5 daily XP milestones (max 20 XP/day).
  const updateTodayMission = (
    updater: (prev: DailyMissionRecord) => DailyMissionRecord,
    extraUpdates?: Partial<SharedState>
  ) => {
    const latest = sharedStateRef.current;
    const prevRec = latest.daily_missions?.[todayStr] || createDefaultMissionRecord(todayStr);
    const nextRec = updater(prevRec);
    const nextAll = {
      ...(latest.daily_missions || {}),
      [todayStr]: nextRec,
    };

    const evalRes = evaluateDailyXpRewards({
      todayStr,
      mission: nextRec,
      completedModules: latest.completed_date_modules?.[todayStr] || [],
      dailyRewardsAwarded: latest.daily_rewards_awarded,
      blockIds: blocks.map((b) => b.id),
      targetBlockTotalSec,
      nowMs: Date.now(),
    });

    const rewardUpdates: Partial<SharedState> =
      evalRes.newlyEarnedXp > 0
        ? {
            score: (latest.score || 0) + evalRes.newlyEarnedXp,
            daily_rewards_awarded: evalRes.nextDailyRewardsAwarded,
          }
        : {};

    const nextState: SharedState = {
      ...latest,
      ...(extraUpdates || {}),
      ...rewardUpdates,
      daily_missions: nextAll,
    };
    sharedStateRef.current = nextState;
    setSharedState(nextState);
    saveSharedState({
      ...(extraUpdates || {}),
      ...rewardUpdates,
      daily_missions: nextAll,
    });
  };

  const updateBlockLogs = (updater: (prev: DailyBlockLogs) => DailyBlockLogs) => {
    updateTodayMission((prev) => ({
      ...prev,
      blockLogs: updater(prev.blockLogs || {}),
    }));
  };

  // Ensure default 2 preview subject slots exist when entering multi_preview
  const previewLogs: PreviewSubjectLog[] = useMemo(() => {
    const existing = todayMission.blockLogs?.previews;
    if (existing && existing.length >= 2) return existing;
    if (existing && existing.length === 1) return [...existing, makePreviewLog('历史 (Ιστορία)')];
    return [makePreviewLog('希腊语 (Γλώσσα)'), makePreviewLog('历史 (Ιστορία)')];
  }, [todayMission.blockLogs?.previews]);

  const updatePreviewRow = (id: string, patch: Partial<PreviewSubjectLog>) => {
    updateBlockLogs((prev) => {
      const base =
        prev.previews && prev.previews.length >= 2
          ? prev.previews
          : previewLogs;
      return {
        ...prev,
        previews: base.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      };
    });
  };

  const addPreviewRow = () => {
    updateBlockLogs((prev) => {
      const base =
        prev.previews && prev.previews.length >= 2
          ? prev.previews
          : previewLogs;
      return {
        ...prev,
        previews: [...base, makePreviewLog('环境学 (Μελέτη Περιβάλλοντος)')],
      };
    });
  };

  const removePreviewRow = (id: string) => {
    updateBlockLogs((prev) => {
      const base =
        prev.previews && prev.previews.length >= 2
          ? prev.previews
          : previewLogs;
      if (base.length <= 1) return prev;
      return {
        ...prev,
        previews: base.filter((p) => p.id !== id),
      };
    });
  };

  // Unified wall-clock ticker: runs ONLY while at least one timer has an active runningSinceMs.
  // Because all elapsed times are derived from (baseElapsedSec + (nowMs - runningSinceMs)/1000),
  // refreshing, switching tabs, jumping to /practice, or locking the iPad NEVER loses a single second.
  const hasAnyRunningTimer = useMemo(() => {
    const anyBlock = Object.values(todayMission.blocks || {}).some((b) => Boolean(b?.runningSinceMs));
    const vt = todayMission.vocabTimers;
    const anyVocab = Boolean(
      vt?.morning?.runningSinceMs || vt?.afternoon?.runningSinceMs || vt?.night?.runningSinceMs
    );
    const anyOldNotes = Boolean(todayMission.oldNotesTimer?.runningSinceMs);
    return anyBlock || anyVocab || anyOldNotes;
  }, [todayMission.blocks, todayMission.vocabTimers, todayMission.oldNotesTimer]);

  useEffect(() => {
    if (!hasAnyRunningTimer) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [hasAnyRunningTimer]);

  const handleToggleVocabTimer = (slot: 'morning' | 'afternoon' | 'night') => {
    const now = Date.now();
    setNowMs(now);
    updateTodayMission((prev) => {
      const prevTimers = prev.vocabTimers || {
        morning: { elapsedSec: 0, runningSinceMs: null, completed: Boolean(prev.vocabChecks?.morning) },
        afternoon: { elapsedSec: 0, runningSinceMs: null, completed: Boolean(prev.vocabChecks?.afternoon) },
        night: { elapsedSec: 0, runningSinceMs: null, completed: Boolean(prev.vocabChecks?.night) },
      };
      const curSlot = prevTimers[slot] || { elapsedSec: 0, runningSinceMs: null, completed: false };
      const isCurrentlyRunning = Boolean(curSlot.runningSinceMs);

      const nextTimers = { ...prevTimers };
      // Freeze any other running vocab slot first so only 1 vocab timer runs at a time
      (['morning', 'afternoon', 'night'] as const).forEach((k) => {
        const s = nextTimers[k] || { elapsedSec: 0, runningSinceMs: null, completed: false };
        if (s.runningSinceMs && k !== slot) {
          nextTimers[k] = {
            ...s,
            elapsedSec: getLiveElapsedSec(s.elapsedSec, s.runningSinceMs, now),
            runningSinceMs: null,
          };
        }
      });

      if (isCurrentlyRunning) {
        // Pause & freeze exact accumulated seconds
        nextTimers[slot] = {
          ...curSlot,
          elapsedSec: getLiveElapsedSec(curSlot.elapsedSec, curSlot.runningSinceMs, now),
          runningSinceMs: null,
        };
      } else {
        // Start / Resume from exact accumulated seconds
        nextTimers[slot] = {
          ...curSlot,
          runningSinceMs: now,
        };
      }
      return { ...prev, vocabTimers: nextTimers };
    });
  };

  const handleFinishVocabSlot = (slot: 'morning' | 'afternoon' | 'night') => {
    const now = Date.now();
    setNowMs(now);
    updateTodayMission((prev) => {
      const prevTimers = prev.vocabTimers || {
        morning: { elapsedSec: 0, runningSinceMs: null, completed: Boolean(prev.vocabChecks?.morning) },
        afternoon: { elapsedSec: 0, runningSinceMs: null, completed: Boolean(prev.vocabChecks?.afternoon) },
        night: { elapsedSec: 0, runningSinceMs: null, completed: Boolean(prev.vocabChecks?.night) },
      };
      const curSlot = prevTimers[slot] || { elapsedSec: 0, runningSinceMs: null, completed: false };
      return {
        ...prev,
        vocabChecks: {
          ...(prev.vocabChecks || { morning: false, afternoon: false, night: false }),
          [slot]: true,
        },
        vocabTimers: {
          ...prevTimers,
          [slot]: {
            elapsedSec: getLiveElapsedSec(curSlot.elapsedSec, curSlot.runningSinceMs, now),
            runningSinceMs: null,
            completed: true,
          },
        },
      };
    });
  };

  const handleSelectGlossaryProgress = (word: { idx: number; word_greek: string; word_chinese: string }) => {
    const existing = Array.isArray(sharedState.page_progress) ? sharedState.page_progress : [];
    const filtered = existing.filter(
      (m) => !(m.bookId === selectedGlossaryBook && m.date === todayStr)
    );
    const nextMarks = [
      ...filtered,
      {
        id: makeMarkId(),
        date: todayStr,
        bookId: selectedGlossaryBook,
        upToPage: word.idx,
        note: `Leon自选：背到 #${word.idx} ${word.word_greek}`,
      },
    ];
    setSharedState((prev) => ({ ...prev, page_progress: nextMarks }));
    saveSharedState({ page_progress: nextMarks });
    setGlossarySavedMsg(`✓ 已同步进度到第 ${word.idx} 词（${word.word_greek} = ${word.word_chinese}），刷题词库已自动解锁！`);
    setShowGlossaryPicker(false);
    setGlossarySearch('');
    setTimeout(() => setGlossarySavedMsg(null), 4500);
  };

  const openBlockWizard = (block: MissionBlockDef) => {
    const now = Date.now();
    setNowMs(now);
    setActiveWizardBlock(block.id);
    setEarlyFinishMsg(null);

    updateTodayMission((prev) => {
      const nextBlocks: Record<string, DailyMissionBlockState> = { ...(prev.blocks || {}) };
      // 先冻结其他正在计时的区块，避免两个区块同时计时
      Object.keys(nextBlocks).forEach((k) => {
        const b = nextBlocks[k];
        if (k !== block.id && b?.runningSinceMs) {
          nextBlocks[k] = {
            ...b,
            elapsedSec: getLiveElapsedSec(b.elapsedSec, b.runningSinceMs, now),
            runningSinceMs: null,
          };
        }
      });

      const existing = nextBlocks[block.id];
      if (!existing || existing.status === 'idle') {
        nextBlocks[block.id] = {
          status: 'in_progress',
          currentStep: 0,
          elapsedSec: existing?.elapsedSec || 0,
          runningSinceMs: now,
          extraMinutes: existing?.extraMinutes || 0,
          subject: existing?.subject,
        };
      } else if (existing.status !== 'done' && !existing.runningSinceMs) {
        // 已在进行中但此前暂停了：恢复计时，保留全部已用秒数
        nextBlocks[block.id] = {
          ...existing,
          runningSinceMs: now,
        };
      }
      // 如果已在计时（existing.runningSinceMs != null）或已通关（done），保持原样不动！
      return { ...prev, blocks: nextBlocks };
    });
  };

  const handleToggleBlockTimer = (blockId: string) => {
    const now = Date.now();
    setNowMs(now);
    updateTodayMission((prev) => {
      const nextBlocks: Record<string, DailyMissionBlockState> = { ...(prev.blocks || {}) };
      const cur = nextBlocks[blockId] || {
        status: 'in_progress' as const,
        currentStep: 0,
        elapsedSec: 0,
        runningSinceMs: null,
        extraMinutes: 0,
      };
      if (cur.runningSinceMs) {
        // 暂停：精准冻结累计秒数
        nextBlocks[blockId] = {
          ...cur,
          elapsedSec: getLiveElapsedSec(cur.elapsedSec, cur.runningSinceMs, now),
          runningSinceMs: null,
        };
      } else {
        // 恢复/开始：先暂停其他区块，再从当前累计秒数无缝续计
        Object.keys(nextBlocks).forEach((k) => {
          const b = nextBlocks[k];
          if (k !== blockId && b?.runningSinceMs) {
            nextBlocks[k] = {
              ...b,
              elapsedSec: getLiveElapsedSec(b.elapsedSec, b.runningSinceMs, now),
              runningSinceMs: null,
            };
          }
        });
        nextBlocks[blockId] = {
          ...cur,
          status: cur.status === 'idle' ? 'in_progress' : cur.status,
          runningSinceMs: now,
        };
      }
      return { ...prev, blocks: nextBlocks };
    });
  };

  const handleAddBlockExtraMinutes = (blockId: string, deltaMin: number) => {
    updateTodayMission((prev) => {
      const cur = prev.blocks?.[blockId] || {
        status: 'in_progress' as const,
        currentStep: 0,
        elapsedSec: 0,
        runningSinceMs: null,
        extraMinutes: 0,
      };
      return {
        ...prev,
        blocks: {
          ...(prev.blocks || {}),
          [blockId]: {
            ...cur,
            extraMinutes: Math.max(0, (cur.extraMinutes || 0) + deltaMin),
          },
        },
      };
    });
  };

  const handleToggleOldNotesTimer = () => {
    const now = Date.now();
    setNowMs(now);
    updateTodayMission((prev) => {
      const cur = prev.oldNotesTimer || { elapsedSec: 0, runningSinceMs: null };
      if (cur.runningSinceMs) {
        return {
          ...prev,
          oldNotesTimer: {
            elapsedSec: getLiveElapsedSec(cur.elapsedSec, cur.runningSinceMs, now),
            runningSinceMs: null,
          },
        };
      }
      return {
        ...prev,
        oldNotesTimer: {
          elapsedSec: cur.elapsedSec || 0,
          runningSinceMs: now,
        },
      };
    });
  };

  const handleResetOldNotesTimer = () => {
    const cur = todayMission.oldNotesTimer;
    const live = getLiveElapsedSec(cur?.elapsedSec, cur?.runningSinceMs, Date.now());
    if (live >= 30 && !window.confirm(`旧笔记复习已计时 ${formatElapsedHuman(live)}，确定要重置吗？`)) {
      return;
    }
    updateTodayMission((prev) => ({
      ...prev,
      oldNotesTimer: { elapsedSec: 0, runningSinceMs: null },
    }));
  };

  const handleResetBlock = (blockId: string) => {
    if (activeBlockId === blockId) {
      setEarlyFinishMsg(null);
    }
    updateTodayMission((prev) => {
      const nextBlocks = { ...(prev.blocks || {}) };
      delete nextBlocks[blockId];
      return {
        ...prev,
        blocks: nextBlocks,
        ...(blockId === 'block_preview' ? { oldNotesTimer: { elapsedSec: 0, runningSinceMs: null } } : {}),
      };
    });
  };

  const handleResetVocabSlot = (slot: 'morning' | 'afternoon' | 'night', label?: string) => {
    const cur = vocabTimers[slot];
    const msg =
      cur.elapsedSec >= 10
        ? `确定要重置「${label || slot}」吗？当前已累计 ${formatElapsedHuman(cur.elapsedSec)} 将被清空。`
        : `确定要重置「${label || slot}」的打卡状态吗？`;
    if (!window.confirm(msg)) return;
    updateTodayMission((prev) => {
      const prevTimers = prev.vocabTimers || {
        morning: { elapsedSec: 0, runningSinceMs: null, completed: Boolean(prev.vocabChecks?.morning) },
        afternoon: { elapsedSec: 0, runningSinceMs: null, completed: Boolean(prev.vocabChecks?.afternoon) },
        night: { elapsedSec: 0, runningSinceMs: null, completed: Boolean(prev.vocabChecks?.night) },
      };
      return {
        ...prev,
        vocabChecks: {
          ...(prev.vocabChecks || { morning: false, afternoon: false, night: false }),
          [slot]: false,
        },
        vocabTimers: {
          ...prevTimers,
          [slot]: { elapsedSec: 0, runningSinceMs: null, completed: false },
        },
      };
    });
  };

  const closeBlockWizard = () => {
    const now = Date.now();
    setNowMs(now);
    if (activeBlockId) {
      const blockToPause = activeBlockId;
      updateTodayMission((prev) => {
        const prevBlock = prev.blocks?.[blockToPause];
        const nextOldNotes = prev.oldNotesTimer?.runningSinceMs
          ? {
              elapsedSec: getLiveElapsedSec(
                prev.oldNotesTimer.elapsedSec,
                prev.oldNotesTimer.runningSinceMs,
                now
              ),
              runningSinceMs: null,
            }
          : prev.oldNotesTimer;

        if (!prevBlock) {
          return nextOldNotes !== prev.oldNotesTimer ? { ...prev, oldNotesTimer: nextOldNotes } : prev;
        }
        return {
          ...prev,
          oldNotesTimer: nextOldNotes,
          blocks: {
            ...(prev.blocks || {}),
            [blockToPause]: {
              ...prevBlock,
              elapsedSec: getLiveElapsedSec(prevBlock.elapsedSec, prevBlock.runningSinceMs, now),
              runningSinceMs: null,
            },
          },
        };
      });
    }
    setActiveWizardBlock(null);
  };

  const handleAdvanceStep = () => {
    if (!activeBlock) return;
    const now = Date.now();
    setNowMs(now);
    const curState: DailyMissionBlockState = todayMission.blocks?.[activeBlock.id] || {
      status: 'in_progress',
      currentStep: 0,
      elapsedSec: 0,
      runningSinceMs: null,
      extraMinutes: 0,
    };
    const liveElapsed = getLiveElapsedSec(curState.elapsedSec, curState.runningSinceMs, now);
    const curExtraMin = curState.extraMinutes || 0;
    const curStepDef = activeBlock.steps[Math.min(curState.currentStep || 0, activeBlock.steps.length - 1)];

    // Mandatory Gate for Block 3 Step 1: Grade 3 Glossa Unit-Jump Challenge!
    if (curStepDef?.kind === 'five_min_scan') {
      const g3Summary = computeG3ChallengeSummary(sharedState.g3_glossa_progress, todayStr);
      const passedToday = Boolean(sharedState.g3_glossa_progress?.dailyCompletedLesson?.[todayStr]);
      if (!passedToday && !g3Summary.allFinished) {
        setG3GateWarn('⚠️ 请先完成下方「三年级语言必过闯关测验」（3 道题全部答对亮起绿灯），才能进入下一步预习新课哦！');
        return;
      }
    }
    setG3GateWarn(null);

    const nextStep = curState.currentStep + 1;

    if (nextStep >= activeBlock.steps.length) {
      const carrySec = blockCarryOverMap[activeBlock.id] || 0;
      const targetSec = (activeBlock.minutes + curExtraMin) * 60 + carrySec;
      const deficitSec = Math.max(0, targetSec - liveElapsed);
      const deficitMin = Math.floor(deficitSec / 60);

      updateTodayMission((prev) => {
        const latestBlock = prev.blocks?.[activeBlock.id] || curState;
        const latestElapsed = getLiveElapsedSec(latestBlock.elapsedSec, latestBlock.runningSinceMs, now);
        const nextOldNotes = prev.oldNotesTimer?.runningSinceMs
          ? {
              elapsedSec: getLiveElapsedSec(
                prev.oldNotesTimer.elapsedSec,
                prev.oldNotesTimer.runningSinceMs,
                now
              ),
              runningSinceMs: null,
            }
          : prev.oldNotesTimer;
        return {
          ...prev,
          oldNotesTimer: nextOldNotes,
          blocks: {
            ...(prev.blocks || {}),
            [activeBlock.id]: {
              ...latestBlock,
              status: 'done',
              currentStep: activeBlock.steps.length - 1,
              elapsedSec: latestElapsed,
              runningSinceMs: null,
              completedAt: new Date().toISOString(),
            },
          },
        };
      });

      if (deficitMin >= 2) {
        setEarlyFinishMsg(
          `「${activeBlock.title}」已完成！本区块未足的 ${deficitMin} 分钟已自动顺延叠加到下一个区块。三大区块全部完成且满 ${Math.round(targetBlockTotalSec / 60)} 分钟自动发放 +10 XP！`
        );
      } else {
        setEarlyFinishMsg(
          `太棒了！「${activeBlock.title}」已扎实通关！三大区块全部完成且满 ${Math.round(targetBlockTotalSec / 60)} 分钟自动发放 +10 XP！`
        );
      }
    } else {
      updateTodayMission((prev) => {
        const latestBlock = prev.blocks?.[activeBlock.id] || curState;
        return {
          ...prev,
          blocks: {
            ...(prev.blocks || {}),
            [activeBlock.id]: {
              ...latestBlock,
              status: 'in_progress',
              currentStep: nextStep,
            },
          },
        };
      });
    }
  };

  const handleSaveVocab = (
    nextCustomVocab: any[],
    nextUnitDates: Record<string, string>,
    _addedCount: number
  ) => {
    const nextState: SharedState = {
      ...sharedState,
      custom_vocab: nextCustomVocab,
      unit_study_dates: nextUnitDates,
    };
    setSharedState(nextState);
    saveSharedState({
      custom_vocab: nextCustomVocab,
      unit_study_dates: nextUnitDates,
    });
  };

  const handleUpdateSrs = (nextSrs: Record<string, VocabSrsEntry>) => {
    setSharedState((prev) => ({ ...prev, vocab_srs: nextSrs }));
    saveSharedState({ vocab_srs: nextSrs });
  };

  const handleUpdateTextbookPrefs = (nextPrefs: TextbookPreferencesState) => {
    setSharedState((prev) => ({ ...prev, textbook_preferences: nextPrefs }));
    saveSharedState({ textbook_preferences: nextPrefs });
  };

  const handlePassG3Lesson = (
    nextG3Progress: G3GlossaProgressState,
    dailyLog: G3ChallengeDailyLog
  ) => {
    setG3GateWarn(null);
    setSharedState((prev) => ({ ...prev, g3_glossa_progress: nextG3Progress }));
    saveSharedState({ g3_glossa_progress: nextG3Progress });
    updateBlockLogs((prev) => ({
      ...prev,
      g3Challenge: dailyLog,
    }));
  };

  const handleCompleteFlashcardSlot = (slot: VocabSlot, reviewedCount: number) => {
    if (slot !== 'quick_scan') {
      handleFinishVocabSlot(slot);
    }
    if (reviewedCount === 0) setActiveFlashcardSlot(null);
  };

  // Overall progress
  const totalCheckUnits = 3 + 1 + blocks.length; // 3 vocab + 1 history + main blocks
  const doneCheckUnits =
    (todayMission.vocabChecks?.morning ? 1 : 0) +
    (todayMission.vocabChecks?.afternoon ? 1 : 0) +
    (todayMission.vocabChecks?.night ? 1 : 0) +
    (todayMission.historyLog?.listened ? 1 : 0) +
    blocks.filter((b) => todayMission.blocks?.[b.id]?.status === 'done').length;
  const progressPct = Math.round((doneCheckUnits / Math.max(1, totalCheckUnits)) * 100);

  // ==========================
  // ACTIVE WIZARD FOCUS VIEW
  // ==========================
  if (activeBlock) {
    const blockState: DailyMissionBlockState = todayMission.blocks?.[activeBlock.id] || {
      status: 'in_progress' as const,
      currentStep: 0,
      elapsedSec: 0,
      runningSinceMs: null,
      extraMinutes: 0,
    };
    const isBlockRunning = Boolean(blockState.runningSinceMs);
    const liveElapsedSec = getLiveElapsedSec(blockState.elapsedSec, blockState.runningSinceMs, nowMs);
    const blockExtraMinutes = blockState.extraMinutes || 0;
    const stepIndex = Math.min(blockState.currentStep || 0, activeBlock.steps.length - 1);
    const stepDef = activeBlock.steps[stepIndex];
    const carrySec = blockCarryOverMap[activeBlock.id] || 0;
    const totalTargetSec = (activeBlock.minutes + blockExtraMinutes) * 60 + carrySec;
    const remainingSec = Math.max(0, totalTargetSec - liveElapsedSec);
    const isOvertime = liveElapsedSec > totalTargetSec;

    const schoolLog = todayMission.blockLogs?.school || { subjects: [], pages: '', summary: '', items: [] };
    const schoolItems: SchoolSubjectTaskLog[] =
      schoolLog.items && schoolLog.items.length > 0
        ? schoolLog.items
        : (schoolLog.subjects || []).map((s) => ({
            subject: s,
            fromPage: 1,
            toPage: 2,
            hwActions: [],
            questionMarks: 0,
            note: '',
          }));

    const syncSchoolItems = (nextItems: SchoolSubjectTaskLog[], nextSummary?: string) => {
      const subjects = nextItems.map((i) => i.subject);
      const pagesSummary = nextItems
        .map((i) => `${i.subject.split(' ')[0]} P.${i.fromPage}${i.toPage > i.fromPage ? `-${i.toPage}` : ''}`)
        .join('、');
      updateBlockLogs((prev) => ({
        ...prev,
        school: {
          subjects,
          pages: pagesSummary,
          summary: nextSummary !== undefined ? nextSummary : (prev.school?.summary || ''),
          items: nextItems,
        },
      }));
    };

    const tutorLog = todayMission.blockLogs?.tutor || {
      mode: 'review' as const,
      book: 'B 本 (Ελληνικά Β΄)',
      unitNo: 1,
      fromPage: Math.max(1, b1Frontier - 2),
      toPage: b1Frontier,
      pages: `B本 P.${Math.max(1, b1Frontier - 2)}-${b1Frontier}`,
      questionMarks: 0,
      actions: [],
      summary: '',
      previewBook: 'B 本 (Ελληνικά Β΄)',
      previewFromPage: b1Frontier + 1,
      previewToPage: b1Frontier + 2,
      previewQuestionMarks: 0,
      previewActions: [],
      previewSummary: '',
    };
    const effectiveTutorMode: 'review' | 'both' =
      tutorLog.mode === 'both' || tutorLog.mode === 'preview' ? 'both' : 'review';

    const workbookChecks: WorkbookCheckLog[] =
      todayMission.blockLogs?.workbookChecks && todayMission.blockLogs.workbookChecks.length > 0
        ? todayMission.blockLogs.workbookChecks
        : todayMission.blockLogs?.workbookCheck
          ? [{ id: 'wb_legacy', ...todayMission.blockLogs.workbookCheck }]
          : [makeWorkbookCheckLog(previewLogs[0]?.subject || '希腊语 (Γλώσσα)')];

    const syncWorkbookChecks = (nextList: WorkbookCheckLog[]) => {
      updateBlockLogs((prev) => ({
        ...prev,
        workbookChecks: nextList,
        workbookCheck: nextList[0]
          ? {
              bookName: nextList[0].bookName,
              fromPage: nextList[0].fromPage,
              toPage: nextList[0].toPage,
              actions: nextList[0].actions,
              note: nextList[0].note,
            }
          : undefined,
      }));
    };

    const effectiveBlockMin = Math.round(totalTargetSec / 60);
    const proportionalScanMin = Math.max(8, Math.min(25, Math.round(effectiveBlockMin / 3)));
    const ot = todayMission.oldNotesTimer || { elapsedSec: 0, runningSinceMs: null };
    const oldNotesRunning = Boolean(ot.runningSinceMs);
    const oldNotesElapsed = getLiveElapsedSec(ot.elapsedSec, ot.runningSinceMs, nowMs);
    const oldNotesRemSec = Math.max(0, proportionalScanMin * 60 - oldNotesElapsed);

    const oldNotesReview = todayMission.blockLogs?.oldNotesReview || {
      subject: '希腊语 (Γλώσσα)',
      fromPage: 1,
      toPage: 5,
      actions: [],
      note: '',
    };

    const toggleChecklistKey = (key: string) => {
      setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fb', padding: '20px 16px 64px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {/* Sticky Timer Header */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: '16px 20px',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 14,
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
              border: `1.5px solid ${activeBlock.accent}33`,
            }}
          >
            <button
              type="button"
              onClick={closeBlockWizard}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 14px',
                borderRadius: 12,
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#334155',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={16} />
              保存并返回首页
            </button>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                  {isOvertime ? '已超出计划（可点右侧延时）' : isBlockRunning ? '后台持续计时中（刷新/切页不丢）' : '已暂停（进度已自动保存）'}
                  {carrySec >= 60 ? ` · 含顺延 +${Math.floor(carrySec / 60)}分` : ''}
                  {blockExtraMinutes > 0 ? ` · 延时 +${blockExtraMinutes}分` : ''}
                  （已用 {formatElapsedHuman(liveElapsedSec)}）
                </div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    color: isOvertime ? '#dc2626' : activeBlock.accent,
                    lineHeight: 1.1,
                  }}
                >
                  {formatDurationMinSec(remainingSec)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggleBlockTimer(activeBlock.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: 'none',
                  background: isBlockRunning ? '#f59e0b' : activeBlock.accent,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {isBlockRunning ? <Pause size={16} /> : <Play size={16} />}
                {isBlockRunning ? '暂停' : '继续'}
              </button>
              <button
                type="button"
                onClick={() => handleAddBlockExtraMinutes(activeBlock.id, 5)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#334155',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                +5 分
              </button>
              <button
                type="button"
                onClick={() => handleAddBlockExtraMinutes(activeBlock.id, 10)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#334155',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                +10 分
              </button>
              <button
                type="button"
                onClick={() => {
                  const msg =
                    liveElapsedSec >= 10
                      ? `确定要重置「${activeBlock.title}」吗？当前已累计 ${formatElapsedHuman(liveElapsedSec)} 的计时与完成状态将被清空！`
                      : `确定要重置「${activeBlock.title}」的计时与完成状态吗？`;
                  if (window.confirm(msg)) {
                    handleResetBlock(activeBlock.id);
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#b91c1c',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
                title="重置本区块计时与状态"
              >
                <RotateCcw size={14} />
                重置
              </button>
            </div>
          </div>

          {/* Step progress bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {activeBlock.steps.map((st, idx) => (
              <button
                key={st.title}
                type="button"
                onClick={() =>
                  updateTodayMission((prev) => {
                    const latest = prev.blocks?.[activeBlock.id] || blockState;
                    return {
                      ...prev,
                      blocks: {
                        ...(prev.blocks || {}),
                        [activeBlock.id]: {
                          ...latest,
                          currentStep: idx,
                        },
                      },
                    };
                  })
                }
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  background:
                    idx < stepIndex
                      ? '#10b981'
                      : idx === stepIndex
                        ? activeBlock.accent
                        : '#e2e8f0',
                }}
                title={st.title}
              />
            ))}
          </div>

          {earlyFinishMsg ? (
            <div
              style={{
                background: '#ffffff',
                borderRadius: 24,
                padding: '44px 28px',
                textAlign: 'center',
                boxShadow: '0 12px 32px rgba(16, 185, 129, 0.12)',
                border: '2px solid #a7f3d0',
              }}
            >
              <img src="/images/ui/icon_trophy.png" alt="" style={{ width: 64, height: 64, objectFit: "contain", marginBottom: 10 }} />
              <h2 style={{ margin: '0 0 12px', fontSize: 26, color: '#047857' }}>区块通关成功！</h2>
              <p style={{ margin: '0 0 28px', fontSize: 17, color: '#334155', lineHeight: 1.6 }}>
                {earlyFinishMsg}
              </p>
              <button
                type="button"
                onClick={() => {
                  setEarlyFinishMsg(null);
                  setActiveBlockId(null);
                }}
                style={{
                  padding: '15px 34px',
                  borderRadius: 16,
                  border: 'none',
                  background: '#10b981',
                  color: '#fff',
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                返回首页看今日学习报告
              </button>
            </div>
          ) : (
            <div
              style={{
                background: '#ffffff',
                borderRadius: 24,
                padding: '26px 24px',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)',
                border: '1px solid #e2e8f0',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 800,
                  padding: '5px 12px',
                  borderRadius: 999,
                  background: activeBlock.bg,
                  color: activeBlock.accent,
                  marginBottom: 10,
                }}
              >
                <UiIcon name={activeBlock.iconName} size={18} />
                {activeBlock.title} · 第 {stepIndex + 1} / {activeBlock.steps.length} 步
              </span>

              <h2 style={{ margin: '4px 0 16px', fontSize: 25, color: '#0f172a', lineHeight: 1.3 }}>
                {stepDef.title}
              </h2>

              {/* Crisp 1-Line Highlighted Why + High-Contrast Interactive Pilot Checklist */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 14,
                  background: '#fffbeb',
                  border: '1.5px solid #fcd34d',
                  color: '#92400e',
                  fontSize: 15,
                  fontWeight: 800,
                  lineHeight: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <Lightbulb size={18} color="#d97706" style={{ flexShrink: 0 }} />
                <span>{stepDef.whyShort}</span>
              </div>

              <div
                style={{
                  padding: '16px 18px',
                  borderRadius: 18,
                  background: '#f8fafc',
                  border: `2px solid ${activeBlock.accent}44`,
                  marginBottom: 22,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: activeBlock.accent, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Target size={15} /> 本步操作清单（做完一条点掉一条）
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stepDef.checklist.map((itemText, ci) => {
                    const ckKey = `${activeBlock.id}_${stepIndex}_${ci}`;
                    const isCk = Boolean(checkedItems[ckKey]);
                    return (
                      <button
                        key={ckKey}
                        type="button"
                        onClick={() => toggleChecklistKey(ckKey)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          textAlign: 'left',
                          padding: '12px 14px',
                          borderRadius: 12,
                          border: isCk ? '1.5px solid #10b981' : '1.5px solid #cbd5e1',
                          background: isCk ? '#ecfdf5' : '#ffffff',
                          color: isCk ? '#047857' : '#0f172a',
                          fontSize: 16,
                          fontWeight: 700,
                          lineHeight: 1.45,
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 7,
                            border: isCk ? 'none' : `2px solid ${activeBlock.accent}`,
                            background: isCk ? '#10b981' : '#fff',
                            color: '#fff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {isCk ? '✓' : ci + 1}
                        </span>
                        <span style={{ textDecoration: isCk ? 'line-through' : 'none', opacity: isCk ? 0.78 : 1 }}>
                          {renderHighlightedText(itemText)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Content Capture Widgets per Step */}
              {stepDef.kind === 'school_plan' && (
                <div style={{ marginBottom: 22, padding: 18, borderRadius: 16, background: '#f0fdfa', border: '1px solid #99f6e4' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f766e', marginBottom: 10 }}>
                    点选今天要处理的学校科目，直接点按选择每个科目的页码区间：
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                    {SCHOOL_SUBJECTS.map((subj) => {
                      const active = schoolItems.some((it) => it.subject === subj);
                      return (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => {
                            const next = active
                              ? schoolItems.filter((it) => it.subject !== subj)
                              : [...schoolItems, { subject: subj, fromPage: 1, toPage: 2, hwActions: [], questionMarks: 0, note: '' }];
                            syncSchoolItems(next);
                          }}
                          style={{
                            padding: '8px 14px',
                            borderRadius: 999,
                            border: active ? '2px solid #0f766e' : '1px solid #cbd5e1',
                            background: active ? '#ccfbf1' : '#fff',
                            color: active ? '#0f766e' : '#334155',
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer',
                          }}
                        >
                          {active ? '✓ ' : '+ '}
                          {subj}
                        </button>
                      );
                    })}
                  </div>

                  {schoolItems.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {schoolItems.map((it) => (
                        <div
                          key={it.subject}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 14,
                            background: '#ffffff',
                            border: '1px solid #99f6e4',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 10,
                            }}
                          >
                            <strong style={{ fontSize: 15, color: '#0f766e' }}>{it.subject}</strong>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                              <NumberStepper
                                prefix="第"
                                suffix="页"
                                min={1}
                                max={300}
                                value={it.fromPage}
                                onChange={(v) => {
                                  const next = schoolItems.map((x) =>
                                    x.subject === it.subject
                                      ? { ...x, fromPage: v, toPage: Math.max(v, x.toPage) }
                                      : x
                                  );
                                  syncSchoolItems(next);
                                }}
                              />
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>至</span>
                              <NumberStepper
                                prefix="第"
                                suffix="页"
                                min={it.fromPage}
                                max={300}
                                value={it.toPage}
                                onChange={(v) => {
                                  const next = schoolItems.map((x) =>
                                    x.subject === it.subject ? { ...x, toPage: Math.max(x.fromPage, v) } : x
                                  );
                                  syncSchoolItems(next);
                                }}
                              />
                            </div>
                          </div>

                          <InteractiveTextbookViewer
                            mode="review"
                            subject={it.subject}
                            explicitBookId={it.bookId || undefined}
                            fromPage={it.fromPage}
                            toPage={it.toPage}
                            todayStr={todayStr}
                            customVocab={sharedState.custom_vocab || []}
                            unitStudyDates={sharedState.unit_study_dates || {}}
                            textbookPrefs={sharedState.textbook_preferences}
                            onSelectBookId={(bkId) => {
                              const next = schoolItems.map((x) =>
                                x.subject === it.subject ? { ...x, bookId: bkId } : x
                              );
                              syncSchoolItems(next);
                            }}
                            onSaveVocab={handleSaveVocab}
                            onUpdateTextbookPrefs={handleUpdateTextbookPrefs}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: '#64748b' }}>点一下上面的科目，就会出现对应的页码选择器！</div>
                  )}
                </div>
              )}

              {stepDef.kind === 'vocab_recorder' && (
                <div style={{ marginBottom: 22 }}>
                  <QuickVocabRecorder
                    todayStr={todayStr}
                    customVocab={sharedState.custom_vocab || []}
                    unitStudyDates={sharedState.unit_study_dates || {}}
                    defaultCategory="school"
                    onSaveVocab={handleSaveVocab}
                  />
                </div>
              )}

              {stepDef.kind === 'school_homework' && (
                <div style={{ marginBottom: 22, padding: 18, borderRadius: 16, background: '#f0fdfa', border: '1px solid #99f6e4', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f766e' }}>
                    ✓ 逐科点选今天作业完成情况（点一点就行，备注选填）：
                  </div>
                  {schoolItems.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      还没有选科目，可以点「上一步」选科目，或直接在下方点选科目：
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {SCHOOL_SUBJECTS.map((subj) => (
                          <button
                            key={subj}
                            type="button"
                            onClick={() => syncSchoolItems([...schoolItems, { subject: subj, fromPage: 1, toPage: 2, hwActions: [], questionMarks: 0, note: '' }])}
                            style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid #99f6e4', background: '#fff', color: '#0f766e', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                          >
                            + {subj}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    schoolItems.map((it) => (
                      <div
                        key={it.subject}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 14,
                          background: '#ffffff',
                          border: '1px solid #99f6e4',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 9,
                        }}
                      >
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: 14.5, color: '#0f766e' }}>
                            {it.subject}（P.{it.fromPage}{it.toPage > it.fromPage ? `-${it.toPage}` : ''}）
                          </strong>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>画了几个 ?：</span>
                            <NumberStepper
                              min={0}
                              max={30}
                              value={it.questionMarks || 0}
                              onChange={(v) => {
                                syncSchoolItems(
                                  schoolItems.map((x) => (x.subject === it.subject ? { ...x, questionMarks: v } : x))
                                );
                              }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {HW_ACTION_OPTIONS.map((act) => {
                            const checked = (it.hwActions || []).includes(act);
                            return (
                              <button
                                key={act}
                                type="button"
                                onClick={() => {
                                  const nextActs = checked
                                    ? (it.hwActions || []).filter((a) => a !== act)
                                    : [...(it.hwActions || []), act];
                                  syncSchoolItems(
                                    schoolItems.map((x) => (x.subject === it.subject ? { ...x, hwActions: nextActs } : x))
                                  );
                                }}
                                style={{
                                  padding: '6px 11px',
                                  borderRadius: 999,
                                  border: checked ? '1.5px solid #0f766e' : '1px solid #cbd5e1',
                                  background: checked ? '#ccfbf1' : '#f8fafc',
                                  color: checked ? '#0f766e' : '#475569',
                                  fontSize: 12.5,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                {checked ? '✓ ' : '+ '}
                                {act}
                              </button>
                            );
                          })}
                        </div>

                        <input
                          type="text"
                          placeholder="选填一句简短备注（例如：第3题不太确定，明天问老师）"
                          value={it.note || ''}
                          onChange={(e) => {
                            syncSchoolItems(
                              schoolItems.map((x) => (x.subject === it.subject ? { ...x, note: e.target.value } : x))
                            );
                          }}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '8px 11px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13.5 }}
                        />
                      </div>
                    ))
                  )}
                </div>
              )}

              {stepDef.kind === 'website_drills' && (
                <div
                  style={{
                    marginBottom: 22,
                    padding: 20,
                    borderRadius: 18,
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 16,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, color: '#1e40af', fontWeight: 700 }}>
                      今日网站刷题实时进度
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                      已完成 {todayWebCompleted.length} / 8 个模块
                    </div>
                  </div>
                  <Link
                    to="/practice"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '13px 22px',
                      borderRadius: 14,
                      background: '#0071E3',
                      color: '#fff',
                      textDecoration: 'none',
                      fontWeight: 800,
                      fontSize: 16,
                    }}
                  >
                    进入网站刷题中心
                    <ChevronRight size={18} />
                  </Link>
                </div>
              )}

              {stepDef.kind === 'tutor_prep' && (
                <div style={{ marginBottom: 22, padding: 18, borderRadius: 16, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1d4ed8' }}>
                    私教课模式选择（后台 B 本当前已上到第 {b1Frontier} 页 · 只有「只复习」或「预习 + 复习」）：
                  </div>

                  {/* Only 2 modes: Review Only OR Preview + Review */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {(
                      [
                        { id: 'review' as const, label: '只复习（课后复习）' },
                        { id: 'both' as const, label: '预习 + 复习（两者都做）' },
                      ]
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          updateBlockLogs((prev) => ({
                            ...prev,
                            tutor: { ...tutorLog, mode: m.id },
                          }))
                        }
                        style={{
                          padding: '10px 18px',
                          borderRadius: 999,
                          border: effectiveTutorMode === m.id ? '2px solid #0071E3' : '1px solid #cbd5e1',
                          background: effectiveTutorMode === m.id ? '#dbeafe' : '#fff',
                          color: effectiveTutorMode === m.id ? '#1d4ed8' : '#334155',
                          fontWeight: 800,
                          fontSize: 14.5,
                          cursor: 'pointer',
                        }}
                      >
                        {effectiveTutorMode === m.id ? '✓ ' : ''}
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Highlighted Review Checklist (Always shown) */}
                  <div style={{ padding: '14px 16px', borderRadius: 14, background: '#fff', border: '2px solid #ea580c' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#c2410c', marginBottom: 8 }}>
                      复习必做清单（自己复习才能省出上课时间学新课！大单元可分多次）
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                      {[
                        '选好今天复习的【单元号与页码区间】（大单元分几次扎实复习完）',
                        '盖住答案，把上次老师改过的【错题口头重做一遍】',
                        '把本单元【语法笔记、变格/变位和重点句】完整过一遍',
                        '把当天或本单元的课文【出声朗读 1 遍】',
                      ].map((line, i) => {
                        const k = `tutor_rv_${i}`;
                        const ck = Boolean(checkedItems[k]);
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => toggleChecklistKey(k)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              textAlign: 'left',
                              padding: '9px 12px',
                              borderRadius: 10,
                              border: ck ? '1.5px solid #10b981' : '1px solid #fed7aa',
                              background: ck ? '#ecfdf5' : '#fff7ed',
                              color: ck ? '#047857' : '#0f172a',
                              fontSize: 14.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <span style={{ fontWeight: 800, color: ck ? '#10b981' : '#ea580c' }}>{ck ? '✓' : `${i + 1}.`}</span>
                            <span style={{ textDecoration: ck ? 'line-through' : 'none' }}>{renderHighlightedText(line)}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Review Content Recorder */}
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#c2410c', marginBottom: 8 }}>
                      记录今日私教课【复习内容】：
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                      <select
                        value={tutorLog.book || 'B 本 (Ελληνικά Β΄)'}
                        onChange={(e) => {
                          const bk = e.target.value;
                          const fp = tutorLog.fromPage ?? Math.max(1, b1Frontier - 2);
                          const tp = tutorLog.toPage ?? b1Frontier;
                          updateBlockLogs((prev) => ({
                            ...prev,
                            tutor: { ...tutorLog, mode: effectiveTutorMode, book: bk, pages: `${bk.split(' ')[0]} P.${fp}-${tp}` },
                          }));
                        }}
                        style={{ padding: '8px 10px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, fontWeight: 700, background: '#f8fafc' }}
                      >
                        <option value="B 本 (Ελληνικά Β΄)">B 本 (Ελληνικά Β΄) · 在学</option>
                        <option value="A2 (ΚΛΙΚ Α2)">A2 (ΚΛΙΚ Α2)</option>
                        <option value="私教补充讲义">私教补充讲义</option>
                      </select>

                      <NumberStepper
                        prefix="第"
                        suffix="单元"
                        min={1}
                        max={30}
                        value={tutorLog.unitNo ?? 1}
                        onChange={(v) =>
                          updateBlockLogs((prev) => ({
                            ...prev,
                            tutor: { ...tutorLog, mode: effectiveTutorMode, unitNo: v },
                          }))
                        }
                      />

                      <NumberStepper
                        prefix="第"
                        suffix="页"
                        min={1}
                        max={400}
                        value={tutorLog.fromPage ?? Math.max(1, b1Frontier - 2)}
                        onChange={(v) => {
                          const tp = Math.max(v, tutorLog.toPage ?? v);
                          const bk = (tutorLog.book || 'B本').split(' ')[0];
                          updateBlockLogs((prev) => ({
                            ...prev,
                            tutor: { ...tutorLog, mode: effectiveTutorMode, fromPage: v, toPage: tp, pages: `${bk} P.${v}-${tp}` },
                          }));
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>至</span>
                      <NumberStepper
                        prefix="第"
                        suffix="页"
                        min={tutorLog.fromPage ?? 1}
                        max={400}
                        value={tutorLog.toPage ?? b1Frontier}
                        onChange={(v) => {
                          const fp = tutorLog.fromPage ?? Math.max(1, b1Frontier - 2);
                          const bk = (tutorLog.book || 'B本').split(' ')[0];
                          updateBlockLogs((prev) => ({
                            ...prev,
                            tutor: { ...tutorLog, mode: effectiveTutorMode, toPage: Math.max(fp, v), pages: `${bk} P.${fp}-${Math.max(fp, v)}` },
                          }));
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
                      {TUTOR_REVIEW_ACTIONS.map((act) => {
                        const checked = (tutorLog.actions || []).includes(act);
                        return (
                          <button
                            key={act}
                            type="button"
                            onClick={() => {
                              const nextActs = checked
                                ? (tutorLog.actions || []).filter((a) => a !== act)
                                : [...(tutorLog.actions || []), act];
                              updateBlockLogs((prev) => ({
                                ...prev,
                                tutor: { ...tutorLog, mode: effectiveTutorMode, actions: nextActs },
                              }));
                            }}
                            style={{
                              padding: '7px 12px',
                              borderRadius: 999,
                              border: checked ? '1.5px solid #ea580c' : '1px solid #cbd5e1',
                              background: checked ? '#ffedd5' : '#fff',
                              color: checked ? '#c2410c' : '#475569',
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {checked ? '✓ ' : '+ '}
                            {act}
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="text"
                      placeholder="选填一句复习备注（例如：复习了第4单元过去时变位，错题都会做了）"
                      value={tutorLog.summary || ''}
                      onChange={(e) =>
                        updateBlockLogs((prev) => ({
                          ...prev,
                          tutor: { ...tutorLog, mode: effectiveTutorMode, summary: e.target.value },
                        }))
                      }
                      style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14, background: '#fff' }}
                    />

                    {getTutorBookId(tutorLog.book || 'B 本 (Ελληνικά Β΄)') && (
                      <InteractiveTextbookViewer
                        mode="review"
                        subject="私教希腊语"
                        explicitBookId={getTutorBookId(tutorLog.book || 'B 本 (Ελληνικά Β΄)')}
                        fromPage={tutorLog.fromPage ?? Math.max(1, b1Frontier - 2)}
                        toPage={tutorLog.toPage ?? b1Frontier}
                        todayStr={todayStr}
                        customVocab={sharedState.custom_vocab || []}
                        unitStudyDates={sharedState.unit_study_dates || {}}
                        textbookPrefs={sharedState.textbook_preferences}
                        onSaveVocab={handleSaveVocab}
                        onUpdateTextbookPrefs={handleUpdateTextbookPrefs}
                      />
                    )}
                  </div>

                  {/* Highlighted Preview Checklist + Separate Preview Recorder (Shown when '预习 + 复习' is selected) */}
                  {effectiveTutorMode === 'both' && (
                    <div style={{ padding: '14px 16px', borderRadius: 14, background: '#fff', border: '2px solid #0071E3' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#005bb5', marginBottom: 8 }}>
                        课前预习必做清单（核心：看懂未来 1–2 页所有内容和题干！）
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                        {[
                          '翻开【未来 1–2 页】：把所有看不懂的词句全部查懂【提前标中文】',
                          '看【未来 1–2 页练习题】：不求全会做，但必须【把每道题干看懂】',
                          '会做的先用铅笔试填，真不会的地方【画大 ?】上课直接问老师',
                        ].map((line, i) => {
                          const k = `tutor_pv_${i}`;
                          const ck = Boolean(checkedItems[k]);
                          return (
                            <button
                              key={k}
                              type="button"
                              onClick={() => toggleChecklistKey(k)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                textAlign: 'left',
                                padding: '9px 12px',
                                borderRadius: 10,
                                border: ck ? '1.5px solid #10b981' : '1px solid #bfdbfe',
                                background: ck ? '#ecfdf5' : '#f0f9ff',
                                color: ck ? '#047857' : '#0f172a',
                                fontSize: 14.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ fontWeight: 800, color: ck ? '#10b981' : '#0071E3' }}>{ck ? '✓' : `${i + 1}.`}</span>
                              <span style={{ textDecoration: ck ? 'line-through' : 'none' }}>{renderHighlightedText(line)}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ fontSize: 13, fontWeight: 800, color: '#005bb5', marginBottom: 8 }}>
                        记录今日私教课【预习内容】：
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                        <select
                          value={tutorLog.previewBook || tutorLog.book || 'B 本 (Ελληνικά Β΄)'}
                          onChange={(e) =>
                            updateBlockLogs((prev) => ({
                              ...prev,
                              tutor: { ...tutorLog, mode: 'both', previewBook: e.target.value },
                            }))
                          }
                          style={{ padding: '8px 10px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, fontWeight: 700, background: '#f8fafc' }}
                        >
                          <option value="B 本 (Ελληνικά Β΄)">B 本 (Ελληνικά Β΄) · 在学</option>
                          <option value="A2 (ΚΛΙΚ Α2)">A2 (ΚΛΙΚ Α2)</option>
                          <option value="私教补充讲义">私教补充讲义</option>
                        </select>

                        <NumberStepper
                          prefix="第"
                          suffix="页"
                          min={1}
                          max={400}
                          value={tutorLog.previewFromPage ?? b1Frontier + 1}
                          onChange={(v) => {
                            const tp = Math.max(v, tutorLog.previewToPage ?? v + 1);
                            updateBlockLogs((prev) => ({
                              ...prev,
                              tutor: { ...tutorLog, mode: 'both', previewFromPage: v, previewToPage: tp },
                            }));
                          }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>至</span>
                        <NumberStepper
                          prefix="第"
                          suffix="页"
                          min={tutorLog.previewFromPage ?? 1}
                          max={400}
                          value={tutorLog.previewToPage ?? b1Frontier + 2}
                          onChange={(v) => {
                            const fp = tutorLog.previewFromPage ?? b1Frontier + 1;
                            updateBlockLogs((prev) => ({
                              ...prev,
                              tutor: { ...tutorLog, mode: 'both', previewToPage: Math.max(fp, v) },
                            }));
                          }}
                        />

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>预习标了几个 ?：</span>
                          <NumberStepper
                            min={0}
                            max={50}
                            value={tutorLog.previewQuestionMarks ?? tutorLog.questionMarks ?? 0}
                            onChange={(v) =>
                              updateBlockLogs((prev) => ({
                                ...prev,
                                tutor: { ...tutorLog, mode: 'both', previewQuestionMarks: v, questionMarks: v },
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
                        {TUTOR_PREVIEW_ACTIONS.map((act) => {
                          const checked = (tutorLog.previewActions || []).includes(act);
                          return (
                            <button
                              key={act}
                              type="button"
                              onClick={() => {
                                const nextActs = checked
                                  ? (tutorLog.previewActions || []).filter((a) => a !== act)
                                  : [...(tutorLog.previewActions || []), act];
                                updateBlockLogs((prev) => ({
                                  ...prev,
                                  tutor: { ...tutorLog, mode: 'both', previewActions: nextActs },
                                }));
                              }}
                              style={{
                                padding: '7px 12px',
                                borderRadius: 999,
                                border: checked ? '1.5px solid #0071E3' : '1px solid #cbd5e1',
                                background: checked ? '#dbeafe' : '#fff',
                                color: checked ? '#1d4ed8' : '#475569',
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {checked ? '✓ ' : '+ '}
                              {act}
                            </button>
                          );
                        })}
                      </div>

                      <input
                        type="text"
                        placeholder="选填一句预习备注（例如：第97页第3道语法填空画了?，明天上课问老师）"
                        value={tutorLog.previewSummary || ''}
                        onChange={(e) =>
                          updateBlockLogs((prev) => ({
                            ...prev,
                            tutor: { ...tutorLog, mode: 'both', previewSummary: e.target.value },
                          }))
                        }
                        style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14, background: '#fff' }}
                      />

                      {getTutorBookId(tutorLog.previewBook || tutorLog.book || 'B 本 (Ελληνικά Β΄)') && (
                        <InteractiveTextbookViewer
                          mode="preview"
                          subject="私教希腊语"
                          explicitBookId={getTutorBookId(tutorLog.previewBook || tutorLog.book || 'B 本 (Ελληνικά Β΄)')}
                          fromPage={tutorLog.previewFromPage ?? b1Frontier + 1}
                          toPage={tutorLog.previewToPage ?? b1Frontier + 2}
                          todayStr={todayStr}
                          customVocab={sharedState.custom_vocab || []}
                          unitStudyDates={sharedState.unit_study_dates || {}}
                          textbookPrefs={sharedState.textbook_preferences}
                          studentSummary={tutorLog.previewSummary || ''}
                          onSaveVocab={handleSaveVocab}
                          onUpdateTextbookPrefs={handleUpdateTextbookPrefs}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {stepDef.kind === 'five_min_scan' && (
                <div style={{ marginBottom: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <G3GlossaChallengePanel
                    todayStr={todayStr}
                    g3Progress={sharedState.g3_glossa_progress}
                    customVocab={sharedState.custom_vocab || []}
                    unitStudyDates={sharedState.unit_study_dates || {}}
                    textbookPrefs={sharedState.textbook_preferences}
                    onSaveVocab={handleSaveVocab}
                    onUpdateTextbookPrefs={handleUpdateTextbookPrefs}
                    onPassLesson={handlePassG3Lesson}
                  />

                  {g3GateWarn && (
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: 12,
                        background: '#fef2f2',
                        border: '2px solid #ef4444',
                        color: '#b91c1c',
                        fontSize: 14,
                        fontWeight: 800,
                      }}
                    >
                      {g3GateWarn}
                    </div>
                  )}
                </div>
              )}

              {stepDef.kind === 'workbook_check' && (
                <div style={{ marginBottom: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#5b21b6' }}>
                    记录今天扫了哪几本练习册、第几页，以及发现了什么问题（支持添加多本，自动写入今日报告）：
                  </div>

                  {workbookChecks.map((wb, wbIdx) => (
                    <div
                      key={wb.id}
                      style={{
                        padding: 16,
                        borderRadius: 16,
                        background: '#f5f3ff',
                        border: '1.5px solid #ddd6fe',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: 14, color: '#5b21b6' }}>练习册 {wbIdx + 1}</strong>
                        {workbookChecks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => syncWorkbookChecks(workbookChecks.filter((x) => x.id !== wb.id))}
                            style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                          >
                            <Trash2 size={14} /> 移除
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: '10px 12px', borderRadius: 12, background: '#fff', border: '1px solid #ddd6fe' }}>
                        <select
                          value={wb.bookName}
                          onChange={(e) =>
                            syncWorkbookChecks(
                              workbookChecks.map((x) => (x.id === wb.id ? { ...x, bookName: e.target.value } : x))
                            )
                          }
                          style={{ padding: '8px 10px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, fontWeight: 700, background: '#f8fafc' }}
                        >
                          {SCHOOL_SUBJECTS.map((s) => (
                            <option key={s} value={s}>{s} 练习册</option>
                          ))}
                        </select>

                        <NumberStepper
                          prefix="第"
                          suffix="页"
                          min={1}
                          max={300}
                          value={wb.fromPage}
                          onChange={(v) =>
                            syncWorkbookChecks(
                              workbookChecks.map((x) =>
                                x.id === wb.id ? { ...x, fromPage: v, toPage: Math.max(v, x.toPage) } : x
                              )
                            )
                          }
                        />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>至</span>
                        <NumberStepper
                          prefix="第"
                          suffix="页"
                          min={wb.fromPage}
                          max={300}
                          value={wb.toPage}
                          onChange={(v) =>
                            syncWorkbookChecks(
                              workbookChecks.map((x) =>
                                x.id === wb.id ? { ...x, toPage: Math.max(x.fromPage, v) } : x
                              )
                            )
                          }
                        />
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {WORKBOOK_CHECK_OPTIONS.map((act) => {
                          const checked = (wb.actions || []).includes(act);
                          return (
                            <button
                              key={act}
                              type="button"
                              onClick={() => {
                                const nextActs = checked
                                  ? wb.actions.filter((a) => a !== act)
                                  : [...(wb.actions || []), act];
                                syncWorkbookChecks(
                                  workbookChecks.map((x) => (x.id === wb.id ? { ...x, actions: nextActs } : x))
                                );
                              }}
                              style={{
                                padding: '7px 12px',
                                borderRadius: 999,
                                border: checked ? '1.5px solid #7c3aed' : '1px solid #cbd5e1',
                                background: checked ? '#ede9fe' : '#fff',
                                color: checked ? '#5b21b6' : '#475569',
                                fontSize: 12.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {checked ? '✓ ' : '+ '}
                              {act}
                            </button>
                          );
                        })}
                      </div>

                      <input
                        type="text"
                        placeholder="选填一句：明天上课最想重点听老师讲哪道题 / 哪个问题？"
                        value={wb.note || ''}
                        onChange={(e) =>
                          syncWorkbookChecks(
                            workbookChecks.map((x) => (x.id === wb.id ? { ...x, note: e.target.value } : x))
                          )
                        }
                        style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14, background: '#fff' }}
                      />

                      <InteractiveTextbookViewer
                        mode="workbook"
                        subject={wb.bookName}
                        isWorkbook={true}
                        explicitBookId={wb.bookId || undefined}
                        fromPage={wb.fromPage}
                        toPage={wb.toPage}
                        todayStr={todayStr}
                        customVocab={sharedState.custom_vocab || []}
                        unitStudyDates={sharedState.unit_study_dates || {}}
                        textbookPrefs={sharedState.textbook_preferences}
                        onSelectBookId={(bkId) =>
                          syncWorkbookChecks(
                            workbookChecks.map((x) => (x.id === wb.id ? { ...x, bookId: bkId } : x))
                          )
                        }
                        onSaveVocab={handleSaveVocab}
                        onUpdateTextbookPrefs={handleUpdateTextbookPrefs}
                      />
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      syncWorkbookChecks([
                        ...workbookChecks,
                        makeWorkbookCheckLog(previewLogs[1]?.subject || '历史 (Ιστορία)'),
                      ])
                    }
                    style={{
                      alignSelf: 'flex-start',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '9px 16px',
                      borderRadius: 12,
                      border: '1.5px dashed #a78bfa',
                      background: '#f5f3ff',
                      color: '#6d28d9',
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={16} />
                    再增加一本练习册
                  </button>
                </div>
              )}

              {stepDef.kind === 'multi_preview' && (
                <div style={{ marginBottom: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {previewLogs.map((pv, idx) => (
                    <div
                      key={pv.id}
                      style={{
                        padding: 16,
                        borderRadius: 16,
                        background: '#f5f3ff',
                        border: '1.5px solid #ddd6fe',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <strong style={{ fontSize: 15, color: '#5b21b6' }}>
                          预习科目 {idx + 1}
                        </strong>
                        {previewLogs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePreviewRow(pv.id)}
                            style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                          >
                            <Trash2 size={14} /> 删除此科
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 10, padding: '10px 12px', borderRadius: 12, background: '#fff', border: '1px solid #ede9fe' }}>
                        <select
                          value={pv.subject}
                          onChange={(e) => updatePreviewRow(pv.id, { subject: e.target.value })}
                          style={{ padding: '8px 10px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, fontWeight: 700, background: '#f8fafc' }}
                        >
                          <option value="">选择科目...</option>
                          {SCHOOL_SUBJECTS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <NumberStepper
                            prefix="第"
                            suffix="页"
                            min={1}
                            max={300}
                            value={pv.fromPage ?? 1}
                            onChange={(v) => {
                              const tp = Math.max(v, pv.toPage ?? v + 1);
                              updatePreviewRow(pv.id, { fromPage: v, toPage: tp, pages: `P.${v}${tp > v ? `-${tp}` : ''}` });
                            }}
                          />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>至</span>
                          <NumberStepper
                            prefix="第"
                            suffix="页"
                            min={pv.fromPage ?? 1}
                            max={300}
                            value={pv.toPage ?? 2}
                            onChange={(v) => {
                              const fp = pv.fromPage ?? 1;
                              const tp = Math.max(fp, v);
                              updatePreviewRow(pv.id, { toPage: tp, pages: `P.${fp}${tp > fp ? `-${tp}` : ''}` });
                            }}
                          />
                        </div>

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>新学词数：</span>
                          <NumberStepper
                            min={0}
                            max={100}
                            suffix="词"
                            value={pv.newWordsCount || 0}
                            onChange={(v) => updatePreviewRow(pv.id, { newWordsCount: v })}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                        {PREVIEW_ACTIONS.map((act) => {
                          const checked = (pv.actions || []).includes(act);
                          return (
                            <button
                              key={act}
                              type="button"
                              onClick={() => {
                                const next = checked
                                  ? pv.actions.filter((a) => a !== act)
                                  : [...(pv.actions || []), act];
                                updatePreviewRow(pv.id, { actions: next });
                              }}
                              style={{
                                padding: '6px 11px',
                                borderRadius: 999,
                                border: checked ? '1.5px solid #7c3aed' : '1px solid #cbd5e1',
                                background: checked ? '#ede9fe' : '#fff',
                                color: checked ? '#5b21b6' : '#475569',
                                fontSize: 12.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {checked ? '✓ ' : '+ '}
                              {act}
                            </button>
                          );
                        })}
                      </div>

                      {pv.subject && (
                        <div style={{ marginBottom: 12 }}>
                          <InteractiveTextbookViewer
                            mode="preview"
                            subject={pv.subject}
                            explicitBookId={pv.bookId || undefined}
                            fromPage={pv.fromPage ?? 1}
                            toPage={pv.toPage ?? 2}
                            todayStr={todayStr}
                            customVocab={sharedState.custom_vocab || []}
                            unitStudyDates={sharedState.unit_study_dates || {}}
                            textbookPrefs={sharedState.textbook_preferences}
                            studentSummary={pv.summary || ''}
                            onSelectBookId={(bkId) => updatePreviewRow(pv.id, { bookId: bkId })}
                            onSaveVocab={handleSaveVocab}
                            onUpdateTextbookPrefs={handleUpdateTextbookPrefs}
                            onPreviewKeyPointsReady={(pts) => updatePreviewRow(pv.id, { aiKeyPoints: pts })}
                          />
                        </div>
                      )}

                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#5b21b6', marginBottom: 4 }}>
                          用语音/文字写一句中文大意（这篇课文大概讲了个什么事？写完即可对照课本真实要点）：
                        </label>
                        <textarea
                          rows={2}
                          placeholder="合上书，用中文讲一遍这篇课文讲了什么（会自动放进今日学习报告给爸妈看）..."
                          value={pv.summary}
                          onChange={(e) => updatePreviewRow(pv.id, { summary: e.target.value })}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, background: '#fff', resize: 'vertical' }}
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addPreviewRow}
                    style={{
                      alignSelf: 'flex-start',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '9px 16px',
                      borderRadius: 12,
                      border: '1.5px dashed #a78bfa',
                      background: '#f5f3ff',
                      color: '#6d28d9',
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={16} />
                    再增加一个预习科目
                  </button>
                </div>
              )}

              {/* Footer buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 10 }}>
                {stepIndex > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateTodayMission((prev) => {
                        const latest = prev.blocks?.[activeBlock.id] || blockState;
                        return {
                          ...prev,
                          blocks: {
                            ...(prev.blocks || {}),
                            [activeBlock.id]: {
                              ...latest,
                              currentStep: stepIndex - 1,
                            },
                          },
                        };
                      })
                    }
                    style={{
                      padding: '13px 18px',
                      borderRadius: 14,
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: 15,
                      cursor: 'pointer',
                    }}
                  >
                    上一步
                  </button>
                ) : (
                  <span />
                )}

                <button
                  type="button"
                  onClick={handleAdvanceStep}
                  style={{
                    padding: '15px 28px',
                    borderRadius: 16,
                    border: 'none',
                    background: activeBlock.accent,
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 18,
                    cursor: 'pointer',
                    boxShadow: `0 8px 20px ${activeBlock.accent}40`,
                  }}
                >
                  {stepDef.buttonText}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Allow launching 5-min Flashcard Quick Scan directly from inside Wizard */}
        {activeFlashcardSlot && (
          <DailyFlashcardModal
            slot={activeFlashcardSlot}
            todayStr={todayStr}
            customVocab={sharedState.custom_vocab || []}
            vocabSrs={sharedState.vocab_srs || {}}
            glossaryFrontier={glossaryFrontier}
            onUpdateSrs={handleUpdateSrs}
            onCompleteSlot={handleCompleteFlashcardSlot}
            onClose={() => setActiveFlashcardSlot(null)}
          />
        )}
      </div>
    );
  }

  // ==========================
  // MAIN HOMEPAGE DASHBOARD
  // ==========================
  const dotColor =
    dbStatus === 'connected-server'
      ? '#34C759'
      : dbStatus === 'connected-cache'
        ? '#FF9500'
        : dbStatus === 'connecting'
          ? '#007AFF'
          : '#FF3B30';
  const statusText =
    dbStatus === 'connected-server'
      ? '已同步'
      : dbStatus === 'connected-cache'
        ? '同步中…'
        : dbStatus === 'connecting'
          ? '连接中'
          : '离线/未同步';

  return (
    <div className="mission-root" style={{ minHeight: '100vh', background: '#f5f7fb', paddingBottom: 64 }}>
      <style>{`
        .mission-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 20px 24px 0;
          box-sizing: border-box;
        }
        .mission-navbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: nowrap;
        }
        .mission-hero {
          background-color: #0b4f9c;
          background-image: linear-gradient(90deg, rgba(0, 86, 184, 0.72) 0%, rgba(11, 79, 156, 0.35) 56%, rgba(11, 79, 156, 0.05) 100%), url('/images/ui/banner_hero_greece.jpg');
          background-size: cover;
          background-position: right center;
          border-radius: 26px;
          padding: 28px 32px 22px;
          color: #FFFFFF;
          box-shadow: 0 12px 34px rgba(0, 113, 227, 0.18);
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
        }
        .mission-entry-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        .mission-vocab-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .mission-blocks-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        .mission-rank-slot {
          margin-right: 175px;
        }
        @media (max-width: 1024px) {
          .mission-container {
            padding: 16px 18px 0;
          }
          .mission-blocks-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .mission-navbar-container .score-label {
            display: none !important;
          }
          .mission-rank-slot {
            margin-right: 110px;
          }
        }
        @media (max-width: 767px) {
          .mission-rank-slot {
            margin-right: 0;
            width: 100%;
          }
          .mission-container {
            padding: 14px 12px 0;
          }
          .mission-hero {
            padding: 20px 16px 16px;
            border-radius: 20px;
          }
          .mission-hero .welcome-banner-decor {
            display: none !important;
          }
          .mission-entry-grid,
          .mission-vocab-grid,
          .mission-blocks-grid {
            grid-template-columns: 1fr;
          }
          .mission-navbar-right {
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          .mission-navbar-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>

      {/* Classic Top Navbar — uses exact .navbar-container for crisp alignment across all widths */}
      <nav className="navbar">
        <div className="navbar-container mission-navbar-container">
          <div className="navbar-left" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="navbar-brand">Leon Greek Coach</span>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                fontWeight: 600,
                color: '#64748b',
                background: 'rgba(0,0,0,0.04)',
                padding: '4px 9px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
              }}
              title="学习进度实时云端同步状态"
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
              <span>{statusText}</span>
            </div>
          </div>

          <div className="navbar-right mission-navbar-right">
            <div className="navbar-stats-row">
              <span className="score-label">
                <span>学习总积分</span>
                <span className="score-label-gr">Συνολικοί Πόντοι</span>
              </span>
              <div className="score-badge">
                <Trophy size={13} />
                <span>{sharedState.score || 0} XP</span>
              </div>
            </div>

            <div className="mission-navbar-actions">
              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="rules-button"
                style={{
                  margin: 0,
                  background: 'rgba(245, 158, 11, 0.1)',
                  color: '#b45309',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                <Trophy size={13} />
                <span>积分规则 &amp; 十二宫</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQuickRecorder((v) => !v)}
                className="rules-button"
                style={{
                  margin: 0,
                  background: showQuickRecorder ? '#0f172a' : 'rgba(0, 113, 227, 0.1)',
                  color: showQuickRecorder ? '#fff' : '#0071E3',
                  border: '1px solid rgba(0, 113, 227, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                <Mic size={13} />
                <span>语音录词 ({todayWords.length})</span>
              </button>
              <Link
                to="/admin"
                className="rules-button"
                style={{
                  margin: 0,
                  background: 'rgba(255, 149, 0, 0.08)',
                  color: '#FF9500',
                  border: '1px solid rgba(255, 149, 0, 0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontWeight: 600,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <Settings size={13} />
                <span>家长通道</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="mission-container">
        {/* Classic Welcome Banner with Custom Greek Flag Backdrop + Leon Real Photo + Rank Card */}
        <div className="mission-hero">
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <Link to="/admin" title="点击进入家长控制后台">
                  <img
                    src="/leon_avatar.png"
                    alt="Leon Scout Avatar"
                    className="welcome-avatar"
                    style={{ width: 82, height: 82, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.85)', objectFit: 'cover' }}
                  />
                </Link>
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: 999 }}>
                      {todayStr} · {getWeekdayLabel(todayStr)}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Flame size={12} /> 连续通关 {streak} 天
                    </span>
                  </div>
                  <h1 style={{ margin: '2px 0 4px', fontSize: 28, fontWeight: 800 }}>
                    Leon 的希腊语学习通关中心
                  </h1>
                  <p style={{ margin: 0, fontSize: 13.5, opacity: 0.92 }}>
                    Κέντρο Εκμάθησης Ελληνικών του Leon · 3×40分向导攻坚 · 语音录词 · 自动生成今日学习报告
                  </p>
                </div>
              </div>

              {/* Dedicated Gold Saint / Rank Showcase Card (Reserved spacious slot for Gold Saints portraits!) */}
              {(() => {
                const scoreVal = sharedState.score || 0;
                const nextIdx = SCOUT_LEVELS.findIndex((l) => l.id === currentLevel.id) + 1;
                const nextLvl = nextIdx < SCOUT_LEVELS.length ? SCOUT_LEVELS[nextIdx] : null;
                const span = Math.max(1, currentLevel.maxPoints - currentLevel.minPoints + 1);
                const rankPct =
                  currentLevel.maxPoints >= 999999
                    ? 100
                    : Math.min(100, Math.max(5, Math.round(((scoreVal - currentLevel.minPoints) / span) * 100)));
                return (
                  <button
                    type="button"
                    className="mission-rank-slot"
                    onClick={() => setShowRulesModal(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderRadius: 18,
                      background: 'rgba(15, 23, 42, 0.28)',
                      backdropFilter: 'blur(12px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.32)',
                      color: '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      minWidth: 235,
                    }}
                    title="点击查看黄金十二宫完整天梯与积分规则"
                  >
                    <img
                      src={currentLevel.badgeUrl}
                      alt={currentLevel.name}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        objectFit: 'cover',
                        border: '2px solid #fbbf24',
                        background: 'rgba(255,255,255,0.12)',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, opacity: 0.88, fontWeight: 700 }}>
                        当前段位 · {scoreVal} XP
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span>{currentLevel.name}</span>
                        {currentLevel.stars && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                            {Array.from({ length: Math.min(currentLevel.stars, 5) }).map((_, i) => (
                              <img key={i} src={RANK_STAR_URL} alt="" style={{ width: 12, height: 12, objectFit: 'contain' }} />
                            ))}
                          </span>
                        )}
                      </div>
                      <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginTop: 5 }}>
                        <div style={{ height: '100%', width: `${rankPct}%`, background: '#fde047', borderRadius: 999 }} />
                      </div>
                      {nextLvl && (
                        <div style={{ fontSize: 10.5, opacity: 0.88, marginTop: 3 }}>
                          距下一阶还差 {Math.max(0, nextLvl.minPoints - scoreVal)} XP →
                        </div>
                      )}
                    </div>
                  </button>
                );
              })()}
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                <span>
                  今日总通关进度（满分 {dailyXpBreakdown.maxDaily} XP
                  {dailyXpBreakdown.comboMultiplier > 1
                    ? ` · 连续第 ${dailyXpBreakdown.comboDay} 天 ${dailyXpBreakdown.comboMultiplier.toFixed(1)}× Combo`
                    : ' · 连续满分次日起 1.1× 起递增至 2.0×'}
                  ）
                </span>
                <span>
                  {progressPct}%（{doneCheckUnits} / {totalCheckUnits}）· 今日已获 {dailyXpBreakdown.earnedToday} / {dailyXpBreakdown.maxDaily} XP
                </span>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.24)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${progressPct}%`,
                    background: '#34d399',
                    borderRadius: 999,
                    transition: 'width 0.35s ease',
                  }}
                />
              </div>
            </div>

            {/* Mode toggles: Light mode available ALL WEEK! */}
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: '1px solid rgba(255,255,255,0.2)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  type="button"
                  onClick={() =>
                    updateTodayMission((prev) => ({
                      ...prev,
                      lightPreviewMode: !prev.lightPreviewMode,
                    }))
                  }
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 13px',
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.45)',
                    background: todayMission.lightPreviewMode ? '#fde047' : 'rgba(255,255,255,0.14)',
                    color: todayMission.lightPreviewMode ? '#713f12' : '#fff',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  <UiIcon name="icon_bolt" size={16} />
                  {todayMission.lightPreviewMode
                    ? '已开启忙碌日轻享模式（已减负）'
                    : '忙碌日切轻享模式（外出/时间紧时点我）'}
                </button>

                {activeMode === 'weekday' && (
                  <button
                    type="button"
                    onClick={() =>
                      updateTodayMission((prev) => ({
                        ...prev,
                        hasTutorClass: !prev.hasTutorClass,
                      }))
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 13px',
                      borderRadius: 999,
                      border: '1px solid rgba(255,255,255,0.4)',
                      background: todayMission.hasTutorClass ? '#ffffff' : 'rgba(255,255,255,0.12)',
                      color: todayMission.hasTutorClass ? '#0b4f9c' : '#fff',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    <UiIcon name="icon_block_tutor" size={16} />
                    {todayMission.hasTutorClass ? '今天有私教课（90分）' : '今天无私教课'}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, opacity: 0.85 }}>视图：</span>
                {(['weekday', 'saturday', 'sunday'] as DayMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPreviewModeOverride(m === actualMode ? null : m)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      border: 'none',
                      background: activeMode === m ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.18)',
                      color: activeMode === m ? '#0b4f9c' : '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {m === 'weekday' ? '平日' : m === 'saturday' ? '周六' : '周日'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Standalone Multi-Row Voice Vocab Recorder */}
        {showQuickRecorder && (
          <div style={{ marginBottom: 20 }}>
            <QuickVocabRecorder
              todayStr={todayStr}
              customVocab={sharedState.custom_vocab || []}
              unitStudyDates={sharedState.unit_study_dates || {}}
              defaultCategory="school"
              onSaveVocab={handleSaveVocab}
            />
          </div>
        )}

        {/* Two Big Core Entry Cards: Daily Practice & History Story Hall (with Watermark Backdrops & Custom Icons) */}
        <section className="mission-entry-grid">
          <Link
            to="/practice"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '20px 22px',
              borderRadius: 20,
              backgroundColor: '#f5f9ff',
              backgroundImage: 'url(/images/ui/bg_card_practice.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'right bottom',
              border: '2px solid #93c5fd',
              color: '#0b4f9c',
              textDecoration: 'none',
              boxShadow: '0 8px 20px rgba(0, 113, 227, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <UiIcon name="icon_practice" size={44} />
              <div>
                <strong style={{ display: 'block', fontSize: 20, color: '#0f172a', marginBottom: 4 }}>
                  每日网站刷题训练
                </strong>
                <div style={{ fontSize: 13, color: '#475569' }}>
                  八大模块智能出题 · 含今日语音录入生词与 7 天必练
                </div>
                <div style={{ marginTop: 8, display: 'inline-block', fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: 'rgba(219, 234, 254, 0.92)', color: '#1d4ed8' }}>
                  今日进度：{todayWebCompleted.length} / 8 模块
                </div>
              </div>
            </div>
            <ChevronRight size={24} color="#0071E3" style={{ flexShrink: 0 }} />
          </Link>

          <Link
            to="/history"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '20px 22px',
              borderRadius: 20,
              backgroundColor: '#f1f7f4',
              backgroundImage: 'url(/images/ui/bg_card_history.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'right bottom',
              border: '2px solid #a7d3c0',
              color: '#224943',
              textDecoration: 'none',
              boxShadow: '0 8px 20px rgba(34, 73, 67, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <UiIcon name="icon_history" size={44} />
              <div>
                <strong style={{ display: 'block', fontSize: 20, color: '#13312c', marginBottom: 4 }}>
                  希腊历史故事馆
                </strong>
                <div style={{ fontSize: 13, color: '#3b645c' }}>
                  三年级神话 · 四年级古希腊 · 全 91 课双语音频与点读词卡
                </div>
                <div style={{ marginTop: 8, display: 'inline-block', fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: 'rgba(215, 235, 226, 0.92)', color: '#1f4b43' }}>
                  区块外自由收听 · 睡前磨耳朵 &amp; 历史预习
                </div>
              </div>
            </div>
            <ChevronRight size={24} color="#224943" style={{ flexShrink: 0 }} />
          </Link>
        </section>

        {/* Outside-the-3-Blocks Section A: Daily 3x Paper Vocab with Watermark Backdrop */}
        <section
          style={{
            backgroundColor: '#fffdf5',
            backgroundImage: 'url(/images/ui/bg_card_vocab.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'right bottom',
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <UiIcon name="icon_vocab_morning" size={28} />
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>
                  区块外日常 1：每日 3 次背单词（独立计时 + 未足自动顺延 + 纸质词表自选）
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>
                  默认每次 10 分钟（共 30 分钟）；如果第 1 次没背满，未足时间会自动顺延加到第 2 次、第 3 次
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveFlashcardSlot('morning')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 999,
                border: '1px solid #bfdbfe',
                background: 'rgba(239, 246, 255, 0.95)',
                color: '#1d4ed8',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <UiIcon name="icon_flashcard" size={16} />
              顺便刷生词电子闪卡
            </button>
          </div>

          <div className="mission-vocab-grid">
            {(
              [
                { slot: 'morning' as const, iconName: 'icon_vocab_morning', label: '第 1 次（早/午）', desc: '复习昨天旧词 + 开今日新词' },
                { slot: 'afternoon' as const, iconName: 'icon_vocab_afternoon', label: '第 2 次（下午）', desc: '遮中文快过一遍今日新词' },
                { slot: 'night' as const, iconName: 'icon_vocab_night', label: '第 3 次（睡前）', desc: '睡前总抽查今日新词与难词' },
              ]
            ).map((item) => {
              const vt = vocabTimers[item.slot];
              const isRunning = vt.isRunning;
              const remSec = Math.max(0, vt.targetSec - vt.elapsedSec);
              const carryMin = Math.floor(vt.carrySec / 60);

              return (
                <div
                  key={item.slot}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 16,
                    border: vt.completed ? '2px solid #10b981' : isRunning ? '2px solid #0071E3' : '1.5px solid #e2e8f0',
                    background: vt.completed ? 'rgba(236, 253, 245, 0.94)' : isRunning ? 'rgba(239, 246, 255, 0.94)' : 'rgba(255, 255, 255, 0.88)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 15, color: vt.completed ? '#047857' : '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <UiIcon name={item.iconName} size={20} />
                      {item.label}
                    </strong>
                    <span style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: isRunning ? '#0071E3' : '#334155' }}>
                      {formatDurationMinSec(remSec)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {item.desc}
                    {carryMin > 0 && (
                      <span style={{ display: 'block', color: '#d97706', fontWeight: 700, marginTop: 2 }}>
                        含上次未足顺延 +{carryMin} 分钟（本次目标 {Math.round(vt.targetSec / 60)} 分）
                      </span>
                    )}
                    {vt.elapsedSec > 0 && (
                      <span style={{ display: 'block', color: '#475569', marginTop: 2 }}>
                        已背：{formatElapsedHuman(vt.elapsedSec)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                    <button
                      type="button"
                      onClick={() => handleToggleVocabTimer(item.slot)}
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        borderRadius: 10,
                        border: 'none',
                        background: isRunning ? '#f59e0b' : '#0071E3',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 12.5,
                        cursor: 'pointer',
                      }}
                    >
                      {isRunning ? '暂停' : vt.elapsedSec > 0 ? '继续计时' : '开始计时'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFinishVocabSlot(item.slot)}
                      style={{
                        padding: '7px 10px',
                        borderRadius: 10,
                        border: '1px solid #10b981',
                        background: vt.completed ? '#10b981' : '#fff',
                        color: vt.completed ? '#fff' : '#047857',
                        fontWeight: 700,
                        fontSize: 12.5,
                        cursor: 'pointer',
                      }}
                    >
                      {vt.completed ? '已完成' : '结束打卡'}
                    </button>
                    {(vt.elapsedSec > 0 || vt.completed) && (
                      <button
                        type="button"
                        onClick={() => handleResetVocabSlot(item.slot, item.label)}
                        style={{
                          padding: '7px 8px',
                          borderRadius: 10,
                          border: '1px solid #fecaca',
                          background: '#fff',
                          color: '#dc2626',
                          cursor: 'pointer',
                        }}
                        title="重置本次背词计时与状态"
                      >
                        <RotateCcw size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paper Glossary Progress Self-Update Bar */}
          <div
            style={{
              marginTop: 14,
              padding: '14px 16px',
              borderRadius: 16,
              background: '#f8fafc',
              border: '1px solid #dbe4ef',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>纸质单词表进度：</span>
                <div style={{ display: 'inline-flex', gap: 4 }}>
                  {(
                    [
                      { id: 'glossary-a2' as const, label: 'A2 词表' },
                      { id: 'glossary-b1' as const, label: 'B 词表' },
                    ]
                  ).map((bk) => (
                    <button
                      key={bk.id}
                      type="button"
                      onClick={() => {
                        setSelectedGlossaryBook(bk.id);
                        setGlossarySearch('');
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        border: selectedGlossaryBook === bk.id ? '1.5px solid #0071E3' : '1px solid #cbd5e1',
                        background: selectedGlossaryBook === bk.id ? '#eff6ff' : '#fff',
                        color: selectedGlossaryBook === bk.id ? '#005bb5' : '#475569',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {bk.label}
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: 13, color: '#334155' }}>
                  {currentFrontierWord
                    ? <>当前已背到 <strong>第 {glossaryFrontier} 词：{currentFrontierWord.word_greek}</strong>（{currentFrontierWord.word_chinese}）</>
                    : '尚未标记进度'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowGlossaryPicker((v) => !v)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: showGlossaryPicker ? '#334155' : '#0071E3',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {showGlossaryPicker ? '收起词表选择' : '选择今天背到哪里 →'}
              </button>
            </div>

            {glossarySavedMsg && (
              <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: '#ecfdf5', color: '#047857', fontSize: 13, fontWeight: 700 }}>
                {glossarySavedMsg}
              </div>
            )}

            {showGlossaryPicker && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #cbd5e1' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <input
                    type="text"
                    placeholder="语音或输入你背到的最后一个词（希腊语 / 中文 / 序号），或直接点下方紧接的词"
                    value={glossarySearch}
                    onChange={(e) => setGlossarySearch(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: 220,
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      fontSize: 14,
                    }}
                  />
                  {glossarySearch && (
                    <button
                      type="button"
                      onClick={() => setGlossarySearch('')}
                      style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: 13 }}
                    >
                      清空
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                  {glossaryCandidates.map((w) => (
                    <button
                      key={w.idx}
                      type="button"
                      onClick={() => handleSelectGlossaryProgress(w)}
                      style={{
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 11, color: '#0071E3', fontWeight: 700 }}>#{w.idx}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{w.word_greek}</div>
                      <div style={{ fontSize: 12, color: '#475569' }}>{w.word_chinese}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Outside-the-3-Blocks Section B: Daily History Story Check-in (Multi-Select Episode Picker!) */}
        {(() => {
          const catalog = historyCatalogData as Array<{
            id: string;
            grade: number;
            unit: number;
            lesson: number;
            titleZh: string;
          }>;
          const filteredCatalog = catalog.filter((c) => c.grade === historyGradeFilter);
          const selectedIds = todayMission.historyLog?.episodeIds || [];
          const selectedEpisodes = selectedIds
            .map((id) => catalog.find((c) => c.id === id))
            .filter(Boolean) as typeof catalog;

          const updateHistoryEpisodes = (nextIds: string[], newlyAddedId?: string) => {
            const nextEps = nextIds
              .map((id) => catalog.find((c) => c.id === id))
              .filter(Boolean) as typeof catalog;
            const noteStr = nextEps
              .map((e) => `${e.grade}年级U${e.unit}L${e.lesson}《${e.titleZh}》`)
              .join('、');

            // Auto-inject that episode's history vocabulary into custom_vocab for daily training!
            let extraVocabUpdate: Partial<SharedState> | undefined = undefined;
            if (newlyAddedId) {
              const vocabIdx = historyVocabIndexData as Record<string, Array<{ el: string; zh: string }>>;
              const epWords = vocabIdx[newlyAddedId] || [];
              if (epWords.length > 0) {
                const existingCustom = sharedState.custom_vocab || [];
                const seenNorm = new Set(
                  existingCustom.map((w: any) => normalizeGreekKey(w?.word_greek || ''))
                );
                let maxId = existingCustom.reduce((acc: number, w: any) => {
                  const n = Number(w?.id);
                  return Number.isFinite(n) && n > acc ? n : acc;
                }, 90000);
                const toAdd: any[] = [];
                const histUnitNum = getWeeklyNoteUnit(todayStr, 500);
                for (const ew of epWords) {
                  const cleanEl = stripLeadingArticleParens(ew.el);
                  const cleanZh = String(ew.zh || '').replace(/[\u0370-\u03FF\u1F00-\u1FFF]/g, '').trim();
                  if (!cleanEl || !cleanZh) continue;
                  const norm = normalizeGreekKey(cleanEl);
                  if (!norm || seenNorm.has(norm)) continue;
                  seenNorm.add(norm);
                  maxId += 1;
                  toAdd.push({
                    id: maxId,
                    book_id: '历史故事词汇',
                    unit: histUnitNum,
                    word_greek: cleanEl,
                    word_chinese: cleanZh,
                    pronunciation: 'new',
                    example_greek: '',
                    example_chinese: '',
                    note_date: todayStr,
                    source: 'history_story',
                    history_lesson_id: newlyAddedId,
                  });
                }
                if (toAdd.length > 0) {
                  extraVocabUpdate = {
                    custom_vocab: [...existingCustom, ...toAdd],
                    unit_study_dates: {
                      ...(sharedState.unit_study_dates || {}),
                      [`历史故事词汇_${histUnitNum}`]: getMondayDateStr(todayStr),
                    },
                  };
                  setHistorySyncMsg(`已自动将该课 ${toAdd.length} 个希腊语历史核心词排入艾宾浩斯遗忘曲线与每日刷题词库！`);
                  setTimeout(() => setHistorySyncMsg(null), 5000);
                }
              }
            }

            updateTodayMission(
              (prev) => ({
                ...prev,
                historyLog: {
                  listened: nextIds.length > 0,
                  episodesCount: nextIds.length,
                  episodeNote: noteStr,
                  episodeIds: nextIds,
                },
              }),
              extraVocabUpdate
            );
          };

          return (
            <section
              style={{
                backgroundColor: '#eef6f2',
                backgroundImage: 'url(/images/ui/bg_card_story_daily.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'right bottom',
                borderRadius: 20,
                padding: '16px 20px',
                marginBottom: 22,
                border: '1.5px solid #c9ddd4',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#13312c', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UiIcon name="icon_history" size={24} />
                  区块外日常 2：听希腊语历史故事（直接选择今天听了哪几集）
                </div>
                <Link
                  to="/history"
                  style={{
                    padding: '7px 14px',
                    borderRadius: 10,
                    border: '1px solid #224943',
                    background: '#fff',
                    color: '#224943',
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: 'none',
                  }}
                >
                  去故事馆听故事 →
                </Link>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <div style={{ display: 'inline-flex', gap: 4 }}>
                  {([4, 3] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setHistoryGradeFilter(g)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 10,
                        border: historyGradeFilter === g ? '2px solid #224943' : '1px solid #a7d3c0',
                        background: historyGradeFilter === g ? '#224943' : '#fff',
                        color: historyGradeFilter === g ? '#fff' : '#224943',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      {g === 4 ? '四年级 (44集)' : '三年级 (47集)'}
                    </button>
                  ))}
                </div>

                <select
                  value=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id || selectedIds.includes(id)) return;
                    updateHistoryEpisodes([...selectedIds, id], id);
                  }}
                  style={{
                    flex: 1,
                    minWidth: 240,
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #a7d3c0',
                    background: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#13312c',
                  }}
                >
                  <option value="">＋ 点这里选择今天听了哪一集（可连续选多集）…</option>
                  {filteredCatalog.map((ep) => (
                    <option key={ep.id} value={ep.id} disabled={selectedIds.includes(ep.id)}>
                      {selectedIds.includes(ep.id) ? '✓ ' : ''}
                      第{ep.unit}单元 第{ep.lesson}课 · {ep.titleZh}
                    </option>
                  ))}
                </select>
              </div>

              {historySyncMsg && (
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontSize: 13, fontWeight: 700 }}>
                  {historySyncMsg}
                </div>
              )}

              {selectedEpisodes.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: '#047857' }}>
                    ✓ 今日已听 {selectedEpisodes.length} 集：
                  </span>
                  {selectedEpisodes.map((ep) => (
                    <span
                      key={ep.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 10px',
                        borderRadius: 999,
                        background: '#ffffff',
                        border: '1px solid #86efac',
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#13312c',
                      }}
                    >
                      {ep.grade}年级 U{ep.unit}L{ep.lesson} · {ep.titleZh}
                      <button
                        type="button"
                        onClick={() => updateHistoryEpisodes(selectedIds.filter((x) => x !== ep.id))}
                        style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: 12, padding: 0 }}
                        title="移除"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </section>
          );
        })()}

        {/* Main 120-Minute Blocks (3 x 40m with Auto Time Carry-Over & Visible Checklists) */}
        <section style={{ marginBottom: 24 }}>
          {(() => {
            const runningBlock = blocks.find((b) => Boolean(todayMission.blocks?.[b.id]?.runningSinceMs));
            if (!runningBlock) return null;
            const rbState = todayMission.blocks?.[runningBlock.id];
            const rbLiveSec = getLiveElapsedSec(rbState?.elapsedSec, rbState?.runningSinceMs, nowMs);
            return (
              <div
                style={{
                  marginBottom: 14,
                  padding: '12px 16px',
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  border: '2px solid #3b82f6',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#1e3a8a', fontWeight: 800, fontSize: 14.5 }}>
                  <Clock size={18} color="#2563eb" />
                  <span>
                    「{runningBlock.title}」正在后台持续计时中 · 已用 {formatDurationMinSec(rbLiveSec)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => openBlockWizard(runningBlock)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      border: 'none',
                      background: '#2563eb',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    回到该区块继续 →
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleBlockTimer(runningBlock.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1px solid #93c5fd',
                      background: '#fff',
                      color: '#1d4ed8',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    暂停计时
                  </button>
                </div>
              </div>
            );
          })()}

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={20} color="#0071E3" />
              {activeMode === 'weekday'
                ? '今日三大攻坚区块（3 × 40 分钟 = 120 分钟 · 未足时长自动顺延）'
                : activeMode === 'saturday'
                  ? '周六三大专注区块（未足时长自动顺延）'
                  : '周日轻松收心区块（未足时长自动顺延）'}
            </h2>
          </div>

          <div className="mission-blocks-grid">
            {blocks.map((block) => {
              const st = todayMission.blocks?.[block.id];
              const isDone = st?.status === 'done';
              const isInProgress = st?.status === 'in_progress';
              const isRunning = Boolean(st?.runningSinceMs);
              const elapsed = getLiveElapsedSec(st?.elapsedSec, st?.runningSinceMs, nowMs);
              const carrySec = blockCarryOverMap[block.id] || 0;
              const carryMin = Math.floor(carrySec / 60);
              const effectiveMinutes = block.minutes + carryMin + (st?.extraMinutes || 0);

              return (
                <div
                  key={block.id}
                  style={{
                    backgroundColor: '#ffffff',
                    backgroundImage: `url(${block.bgImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'right bottom',
                    borderRadius: 22,
                    padding: 20,
                    border: isDone ? '2px solid #10b981' : isRunning ? '2px solid #2563eb' : `1.5px solid ${block.accent}33`,
                    boxShadow: '0 8px 22px rgba(15, 23, 42, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          background: 'rgba(255, 255, 255, 0.9)',
                          border: `1px solid ${block.accent}33`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <UiIcon name={block.iconName} size={34} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            padding: '5px 10px',
                            borderRadius: 999,
                            background: isDone ? '#ecfdf5' : isRunning ? '#dbeafe' : isInProgress ? '#fffbeb' : 'rgba(241, 245, 249, 0.92)',
                            color: isDone ? '#047857' : isRunning ? '#1d4ed8' : isInProgress ? '#b45309' : '#64748b',
                          }}
                        >
                          {isDone
                            ? `已通关 · ${formatElapsedHuman(elapsed)}`
                            : isRunning
                              ? `计时中 · ${formatDurationMinSec(elapsed)}`
                              : isInProgress
                                ? `已暂停 · ${formatElapsedHuman(elapsed)}（第 ${(st?.currentStep || 0) + 1}/${block.steps.length} 步）`
                                : `目标 ${effectiveMinutes} 分钟`}
                        </span>
                        {(isDone || isInProgress || elapsed > 0) && (
                          <button
                            type="button"
                            onClick={() => {
                              const msg =
                                elapsed >= 10
                                  ? `确定要重置「${block.title}」吗？当前已累计 ${formatElapsedHuman(elapsed)} 的计时与完成状态将被清空！`
                                  : `确定要重置「${block.title}」的计时与完成状态吗？`;
                              if (window.confirm(msg)) {
                                handleResetBlock(block.id);
                              }
                            }}
                            style={{
                              padding: '5px 7px',
                              borderRadius: 8,
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                            title="重置本区块"
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Clear Domain Scope Tags — Zero Emoji, Custom Icons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {block.id === 'block_school' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: '#ccfbf1', color: '#0f766e' }}>
                          <UiIcon name="icon_block_school" size={14} /> 学校课业 · 复习与作业
                        </span>
                      )}
                      {block.id === 'block_web' && (
                        <>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: '#dbeafe', color: '#1d4ed8' }}>
                            <UiIcon name="icon_block_web" size={14} /> 网站刷题
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: '#ffedd5', color: '#c2410c' }}>
                            <UiIcon name="icon_block_tutor" size={14} /> 希腊语私教课
                          </span>
                        </>
                      )}
                      {block.id === 'block_preview' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: '#ede9fe', color: '#6d28d9' }}>
                          <UiIcon name="icon_block_preview" size={14} /> 学校课业 · 下节课预习与练习册
                        </span>
                      )}
                    </div>

                    <h3 style={{ margin: '0 0 6px', fontSize: 18, color: '#0f172a' }}>{block.title}</h3>
                    <p style={{ margin: '0 0 10px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{block.subtitle}</p>

                    {carryMin > 0 && (
                      <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 800, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', padding: '6px 10px', borderRadius: 10 }}>
                        已自动顺延上一区块未足的 +{carryMin} 分钟（本次总计 {effectiveMinutes} 分钟）
                      </div>
                    )}

                    {/* Visible Checklist with Direct Links — translucent card over watermark */}
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.86)',
                        backdropFilter: 'blur(4px)',
                        borderRadius: 14,
                        padding: '10px 12px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b' }}>
                        本区块详细清单（点下方按钮可看方法与原理）
                      </div>
                      {block.steps.map((step, idx) => {
                        const stepDone = isDone || (isInProgress && idx < (st?.currentStep || 0));
                        const stepActive = isInProgress && idx === (st?.currentStep || 0);
                        return (
                          <div
                            key={step.title}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'space-between',
                              gap: 8,
                              fontSize: 13,
                              lineHeight: 1.45,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, flex: 1 }}>
                              <span
                                style={{
                                  flexShrink: 0,
                                  marginTop: 1,
                                  fontWeight: 800,
                                  color: stepDone ? '#10b981' : stepActive ? block.accent : '#94a3b8',
                                }}
                              >
                                {stepDone ? <CheckCircle2 size={14} color="#10b981" style={{ verticalAlign: -2 }} /> : stepActive ? '●' : `${idx + 1}.`}
                              </span>
                              <span
                                style={{
                                  color: stepDone ? '#047857' : stepActive ? '#0f172a' : '#334155',
                                  fontWeight: stepActive ? 700 : 500,
                                  textDecoration: stepDone ? 'line-through' : 'none',
                                  opacity: stepDone ? 0.85 : 1,
                                }}
                              >
                                {step.shortLabel}
                                {step.kind === 'website_drills' && (
                                  <span style={{ marginLeft: 4, color: '#0071E3', fontWeight: 700 }}>
                                    ({todayWebCompleted.length}/8)
                                  </span>
                                )}
                                {step.kind === 'vocab_recorder' && todayWords.length > 0 && (
                                  <span style={{ marginLeft: 4, color: '#0f766e', fontWeight: 700 }}>
                                    (已录{todayWords.length}词)
                                  </span>
                                )}
                              </span>
                            </div>

                            {step.linkTo && (
                              <Link
                                to={step.linkTo}
                                style={{
                                  flexShrink: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: block.accent,
                                  background: '#ffffff',
                                  border: `1px solid ${block.accent}44`,
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  textDecoration: 'none',
                                }}
                              >
                                {step.linkLabel || '直达'}
                                <ExternalLink size={11} />
                              </Link>
                            )}
                            {step.kind === 'vocab_recorder' && (
                              <button
                                type="button"
                                onClick={() => setShowQuickRecorder(true)}
                                style={{
                                  flexShrink: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: '#0071E3',
                                  background: '#ffffff',
                                  border: '1px solid #93c5fd',
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  cursor: 'pointer',
                                }}
                              >
                                <UiIcon name="icon_mic" size={13} />
                                录词
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openBlockWizard(block)}
                    style={{
                      width: '100%',
                      padding: '13px 16px',
                      borderRadius: 14,
                      border: 'none',
                      background: isDone ? '#ecfdf5' : block.accent,
                      color: isDone ? '#047857' : '#ffffff',
                      fontWeight: 800,
                      fontSize: 15,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    {isDone ? '查看/补充本区块记录' : isInProgress ? '继续向导通关 →' : '开始计时并进入详细指导 →'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom Section: Rich Daily Study Report (with PNG & PDF Export!) */}
        <DailyStudyReport
          todayStr={todayStr}
          mission={todayMission}
          todayWebCompleted={todayWebCompleted}
          todayWords={todayWords}
          pageProgress={sharedState.page_progress || []}
          score={sharedState.score || 0}
          streak={streak}
        />
      </div>

      {/* Level & 12 Gold Saints Rules Modal */}
      {showRulesModal && (
        <LevelRulesModal
          score={sharedState.score || 0}
          dailyRewardClaimedToday={dailyRewardClaimed}
          dailyXpBreakdown={dailyXpBreakdown}
          onClose={() => setShowRulesModal(false)}
        />
      )}

      {/* Optional Electronic Flashcard Modal */}
      {activeFlashcardSlot && (
        <DailyFlashcardModal
          slot={activeFlashcardSlot}
          todayStr={todayStr}
          customVocab={sharedState.custom_vocab || []}
          vocabSrs={sharedState.vocab_srs || {}}
          glossaryFrontier={glossaryFrontier}
          onUpdateSrs={handleUpdateSrs}
          onCompleteSlot={handleCompleteFlashcardSlot}
          onClose={() => setActiveFlashcardSlot(null)}
        />
      )}
    </div>
  );
};

export default DailyMissionHall;

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
  type PreviewSubjectLog,
  type SchoolSubjectTaskLog,
  type SharedState,
  type VocabSrsEntry,
  type WorkbookCheckLog,
} from '../../dbService';
import {
  calculateMissionStreak,
  createDefaultMissionRecord,
  formatDurationMinSec,
  formatElapsedHuman,
  getDayMode,
  getMondayDateStr,
  getTodayStr,
  getWeekdayLabel,
  normalizeGreekKey,
  stripLeadingArticleParens,
  type DayMode,
} from '../../lib/dailyMissionHelpers';
import { getBookFrontier, makeMarkId } from '../../lib/pageProgress';
import { getScoutLevelInfo, SCOUT_LEVELS } from '../../lib/levelSystem';
import glossaryV2Data from '../../data/glossary_v2.json';
import historyCatalogData from '../../data/history_catalog.json';
import historyVocabIndexData from '../../data/history_vocab_index.json';
import { QuickVocabRecorder } from '../../components/QuickVocabRecorder';
import { DailyFlashcardModal, type VocabSlot } from '../../components/DailyFlashcardModal';
import { DailyStudyReport } from '../../components/DailyStudyReport';
import { LevelRulesModal } from '../../components/LevelRulesModal';

interface WizardStepDef {
  title: string;
  shortLabel: string;
  goal: string;
  howTo: string[];
  whyItWorks: string;
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

const TUTOR_ACTION_OPTIONS = [
  '查并标了新词',
  '铅笔先填了基础题',
  '朗读了课文对话',
  '口头重做了上节错题',
  '复习了语法变格',
  '复习了动词变位',
  '整理了语法笔记',
  '听了配套录音',
  '试写了造句/短文',
  '标出了课上重点提问',
];

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

/** 预留给 Codex 生图的卡片配图位（图片不存在时静默隐藏，生图放入 public/images/ui/ 后自动显示） */
const OptionalMascot: React.FC<{ src: string; alt: string; size?: number }> = ({
  src,
  alt,
  size = 64,
}) => {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHidden(true)}
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        objectFit: 'cover',
        flexShrink: 0,
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.1)',
      }}
    />
  );
};

interface MissionBlockDef {
  id: string;
  icon: string;
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
    icon: '🏫',
    title: mode === 'saturday'
      ? (isLight ? '区块一：本周课本快清盘（轻享 20 分）' : '区块一：本周课本大清盘')
      : '区块一：学校复习 + 生词入库 + 作业',
    subtitle: mode === 'saturday'
      ? '消灭本周课本与私教书遗留的圈词和 ?'
      : '40 分钟 · 先填今天要处理的科目和页码，再排雷、录词、写作业',
    minutes: mode === 'saturday' ? (isLight ? 20 : 35) : 40,
    accent: '#0f766e',
    bg: '#f0fdfa',
    steps: [
      {
        title: mode === 'saturday' ? 'Step 1：确定本周清盘范围 & 翻看旧标记' : 'Step 1：明确今日学校任务 & 课堂排雷',
        shortLabel: mode === 'saturday' ? '翻本周所有课本旧圈词和 ?，懂了擦掉' : '填今日科目与页码 + 查课堂圈词并标中文与日期',
        goal: mode === 'saturday'
          ? '把本周五天所有课本里还留着铅笔圈和 ? 的地方集中扫一遍，彻底清账。'
          : '先把今天课堂上没听懂、圈出来的词全部搞懂，再开始写作业，避免写作业时反复卡壳。',
        howTo: [
          '先在下方勾选今天要处理的学校科目，填好课本或练习册的页码（如 P.24-26）。',
          '翻开今天上课的课本，把上课圈出来没听懂的词查好，用铅笔把中文小字写在旁边。',
          '在课本这一页的右上角写上今天的日期（例如 11/23），方便过 1 天和周末回头复习。',
          '把标过生词的那几句话小声读一遍，确认整句意思通顺。',
        ],
        whyItWorks:
          '大脑如果在「词都不认识」的状态下硬写作业，会消耗双倍精力且极易走神。先花 10 分钟排雷并标上日期，既能让写作业速度翻倍，又能给大脑留下「这页是哪天学的」复习锚点。',
        buttonText: '排雷与目标填好了，下一步',
        kind: 'school_plan',
      },
      {
        title: 'Step 2：多行语音批量录入学校生词 / 课堂笔记',
        shortLabel: '语音批量录入多个学校生词与课堂笔记',
        goal: '把今天纸质课本和笔记里最常见、最容易忘的新词（不限数量）批量录进网站词库。',
        howTo: [
          '先选好类别：「学校查到的生词」或「上课课堂笔记」。',
          '点进希腊语输入框，直接用 iPad 语音输入法说出单词，可连续填多行（不够就点「+ 再加 1 行单词」）。',
          '如果词库里已经有这个词，下方会自动弹出中文建议，点一下就能自动填好中文。',
          '全部填完后点「一键全部入库」，这些词立刻进入你的单词表和 7 天每日必练！',
        ],
        whyItWorks:
          '纸上查完词如果不回头看，3 天后就会忘掉 80%（艾宾浩斯遗忘曲线）。把最核心的新词录进系统，网站会自动在接下来 7 天每天用拼写、选择、翻译等多种题型帮你考一遍，把「短期记忆」变成「永久记忆」。',
        buttonText: '生词都入库了，去做作业',
        kind: 'vocab_recorder',
      },
      {
        title: 'Step 3：专心完成学校作业 + 记录今日成果',
        shortLabel: '完成学校书面作业 + 语音写一句今日成果',
        goal: '一口气高质量完成学校今天的书面作业，并用一句话总结今天搞懂了什么。',
        howTo: [
          '把手机、玩具放到看不见的地方，趁着刚刚查完生词的热乎劲专心写作业。',
          '遇到实在不会的题目不要死磕超过 3 分钟，在题号旁画一个大大的 ?，先跳过做下一题。',
          '写完后在下方输入框用语音说一句「今天完成了什么作业 / 解决了什么难题」，系统会自动写进今日学习报告给爸妈看。',
        ],
        whyItWorks:
          '每次做完作业用自己的话总结一句「我今天学会了什么」，会强迫大脑把零散的知识点重新打包归档（元认知复盘），同时让爸爸妈妈一眼看清你的真实进步！',
        buttonText: '区块一全部通关！',
        kind: 'school_homework',
      },
    ],
  };

  const blockWebTutor: MissionBlockDef = {
    id: 'block_web',
    icon: '💻',
    title: isLight && mode === 'sunday'
      ? '区块二：网站刷题 + 私教备课（轻享 25 分）'
      : '区块二：网站刷题 + 私教课灵活预习/复习',
    subtitle: '40 分钟 · 网站八大模块刷题 + 按当天私教课时间灵活做预习或复习',
    minutes: isLight && mode === 'sunday' ? 25 : 40,
    accent: '#0071E3',
    bg: '#eff6ff',
    steps: [
      {
        title: 'Step 1：完成今日网站八大模块刷题',
        shortLabel: '完成今日网站八大模块日常刷题',
        goal: '完成系统根据遗忘曲线为你生成的今日训练题（包含你刚刚语音录入的学校生词和课堂笔记）。',
        howTo: [
          '点击下方「进入网站刷题中心」，按顺序完成今日八大训练模块。',
          '遇到拼写或翻译卡壳时，先努力在脑海里回忆 3 秒再点提示，不要胡乱按键。',
          '如果某道题真的有问题，点「跳过」先过，或者点「报错」让爸爸妈妈在后台处理。',
          '刷完后点顶部「返回今日学习通关首页」，这里的进度会自动同步更新！',
        ],
        whyItWorks:
          '网站里的拼字、听音、希译中、中译希、连连看从「听、说、读、写」四个角度刺激同一批单词。比起死盯着书本发呆，主动提取（Active Recall）的记忆效率高出 3 倍以上。',
        buttonText: '网站刷题完成，去做私教课备课',
        kind: 'website_drills',
        linkTo: '/practice',
        linkLabel: '去刷题 →',
      },
      {
        title: 'Step 2：私教课灵活预习 / 复习（倒逼老师提速）',
        shortLabel: '私教课预习下2页（标?）或复习上节错题 + 记录页码',
        goal: '根据今天私教课的时间（中午/下午/明天），灵活选择做「课前预习」或「课后复习」，并把具体页码和问号数记进今日报告。',
        howTo: [
          '先在下方选择今天私教课是做「课前预习」、「课后复习」还是「两者都做」，并填好教材页码（例如 B本 P.37-38）。',
          '如果是【课前预习】：提前看下 2 页，把新词查好标中文；能自己做的填空/选择题先用铅笔试填；真不会的地方画上大大的 ?，上课直接让老师重点讲！',
          '如果是【课后复习】：把上节课老师改错的地方和语法笔记盖住答案，口头重做一遍，再把当天课文出声读 1 遍。',
          '最后在下方记下你今天标了几个 ?，并用语音说一句最难的语法或收获。',
        ],
        whyItWorks:
          '一周只有 5 节 90 分钟的私教课，非常宝贵！如果你课前自己先把生词查好、简单题用铅笔做好、难处画上 ?，老师一上课就不用陪你查词发呆，能直接讲核心难点，整体学习进度会直接翻倍！',
        buttonText: '区块二全部通关！',
        kind: 'tutor_prep',
      },
    ],
  };

  const blockPreview: MissionBlockDef = {
    id: 'block_preview',
    icon: '🚀',
    title: isLight
      ? '区块三：学校下节课多科预习（轻享 20 分）'
      : '区块三：学校下节课深度预习（至少 2 科）',
    subtitle: isLight
      ? '20 分钟轻享 · 快速扫 1 门最难科目的生词与大意'
      : '40 分钟 · 5分扫旧词 + 深度预习 2 个科目（填页码/新词数/中文大意）',
    minutes: isLight ? 20 : 40,
    accent: '#7c3aed',
    bg: '#f5f3ff',
    steps: [
      {
        title: 'Step 1：5 分钟遮中文快扫上一课旧标记（防遗忘）',
        shortLabel: '⏱️ 5 分钟遮中文快扫上一课旧标记（记住打 ✓）',
        goal: '预习新课前，先花 5 分钟把上一课标过的生词快速过一遍，彻底杜绝「光记不看」。',
        howTo: [
          '点下方「开始 5 分钟快扫」倒计时。',
          '把课本往前翻一页，找到你上次写着日期和铅笔中文的那一课。',
          '用手遮住中文注释，只看希腊语单词：立刻想起来的在旁边打小勾 ✓；想不起来的画个小圆圈 ○ 留着周六清盘。',
        ],
        whyItWorks:
          '只记笔记不回看等于白查。神经科学研究表明：在刚要忘记的第 1–2 天花短短 2–5 分钟「遮住答案自测」，比当天死背半小时的留存率高得多！',
        buttonText: '旧标记扫完了，开始预习新课',
        kind: 'five_min_scan',
      },
      {
        title: 'Step 2：深度预习至少 2 个科目（填页码、动作与中文大意）',
        shortLabel: '预习至少 2 门学校主课（填页码/新词数/写中文大意）',
        goal: '提前扫清明天/后天学校主课（如希腊语、历史、环境学）的文字障碍，并把每科预习结果真实记录下来。',
        howTo: [
          '默认给你准备了「预习科目 1」和「预习科目 2」（还可以点按钮继续加科目），分别选好科目并填上页码。',
          '不要逐字翻译整篇文章！用铅笔圈出 10–15 个最影响理解大意的重点名词和动词，查好中文标在旁边。',
          '借着中文标注把课文出声通读 1 遍，顺手把课本里的页边词典框和插图说明也扫一遍。',
          '合上书，在下方用语音输入用【中文】说一句「这篇课文大概讲了个什么事」（费曼复述法），并选上大概学了几个新单词。',
        ],
        whyItWorks:
          '你在学校听不懂老师讲课，不是因为笨，而是因为同时要「认生词 + 听语速 + 懂背景」大脑超载了。提前在家里搞懂大意和 10 几个关键实词，明天坐进教室就像「开卷听课」，能瞬间听懂 70% 以上！而用中文写下大意（费曼学习法）是检验你到底真懂没懂的唯一金标准。',
        buttonText: '预习记录写好了，去扫练习册',
        kind: 'multi_preview',
      },
      {
        title: 'Step 3：瞄一眼对应练习册题干（不做题，只看懂问题）',
        shortLabel: '翻开练习册只看懂题目要求（先不做题）',
        goal: '提前知道明天课堂上老师会要求做什么题，带着问题去听课。',
        howTo: [
          '翻开刚才预习那两门课对应的练习册页面。',
          '不需要现在就把题做完！只花 3–5 分钟把每一道大题的「题目要求（题干）」读一遍，不认识的指令词查一下标上中文。',
          '合上书，今天的预习就大功告成啦！',
        ],
        whyItWorks:
          '大脑有一个「网状激活系统」：当你提前看懂了练习册要问哪 3 个问题，明天老师讲到对应知识点时，你的耳朵会自动竖起来抓住重点，听课效率翻倍！',
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
  const todayStr = useMemo(() => getTodayStr(), []);
  const actualMode = useMemo(() => getDayMode(todayStr), [todayStr]);

  const [sharedState, setSharedState] = useState<SharedState>(() => getInitialLocalState());
  const [dbStatus, setDbStatus] = useState<DbConnectionStatus>('connecting');
  const [previewModeOverride, setPreviewModeOverride] = useState<DayMode | null>(null);
  const activeMode: DayMode = previewModeOverride || actualMode;

  // Active wizard state
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [sessionElapsedSec, setSessionElapsedSec] = useState(0);
  const [extraMinutes, setExtraMinutes] = useState(0);
  const [fiveMinSec, setFiveMinSec] = useState(300);
  const [fiveMinRunning, setFiveMinRunning] = useState(false);
  const [earlyFinishMsg, setEarlyFinishMsg] = useState<string | null>(null);

  // Active vocab timer state (outside the 3 blocks, with carry-over!)
  const [runningVocabSlot, setRunningVocabSlot] = useState<'morning' | 'afternoon' | 'night' | null>(null);

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
    const mTarget = DEFAULT_VOCAB_SLOT_SEC;
    const mDeficit =
      raw.morning.completed && raw.morning.elapsedSec < mTarget
        ? mTarget - raw.morning.elapsedSec
        : 0;

    const aTarget = DEFAULT_VOCAB_SLOT_SEC + mDeficit;
    const aDeficit =
      raw.afternoon.completed && raw.afternoon.elapsedSec < aTarget
        ? aTarget - raw.afternoon.elapsedSec
        : 0;

    const nTarget = DEFAULT_VOCAB_SLOT_SEC + aDeficit;

    return {
      morning: { ...raw.morning, targetSec: mTarget, carrySec: 0 },
      afternoon: { ...raw.afternoon, targetSec: aTarget, carrySec: mDeficit },
      night: { ...raw.night, targetSec: nTarget, carrySec: aDeficit },
    };
  }, [todayMission.vocabTimers, todayMission.vocabChecks]);

  const activeBlock = useMemo(
    () => blocks.find((b) => b.id === activeBlockId) || null,
    [blocks, activeBlockId]
  );

  const todayWebCompleted = useMemo(() => {
    return sharedState.completed_date_modules?.[todayStr] || [];
  }, [sharedState.completed_date_modules, todayStr]);

  const todayWords = useMemo(() => {
    return (sharedState.custom_vocab || []).filter((w: any) => w?.note_date === todayStr);
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

  const dailyRewardKey = todayStr;
  const dailyRewardClaimed = Boolean(sharedState.daily_rewards_awarded?.[dailyRewardKey]);

  // Persist helper — automatically awards +10 XP ONCE per day when ALL tasks are done!
  const updateTodayMission = (
    updater: (prev: DailyMissionRecord) => DailyMissionRecord,
    extraUpdates?: Partial<SharedState>
  ) => {
    const nextRec = updater(todayMission);
    const nextAll = {
      ...(sharedState.daily_missions || {}),
      [todayStr]: nextRec,
    };

    const allVocabDone =
      Boolean(nextRec.vocabChecks?.morning) &&
      Boolean(nextRec.vocabChecks?.afternoon) &&
      Boolean(nextRec.vocabChecks?.night);
    const historyDone = Boolean(nextRec.historyLog?.listened);
    const allBlocksDone = blocks.every((b) => nextRec.blocks?.[b.id]?.status === 'done');

    const alreadyAwarded = Boolean(sharedState.daily_rewards_awarded?.[dailyRewardKey]);
    const shouldAwardDaily10 = !alreadyAwarded && allVocabDone && historyDone && allBlocksDone;

    const rewardUpdates: Partial<SharedState> = shouldAwardDaily10
      ? {
          score: (sharedState.score || 0) + 10,
          daily_rewards_awarded: {
            ...(sharedState.daily_rewards_awarded || {}),
            [dailyRewardKey]: true,
          },
        }
      : {};

    const nextState: SharedState = {
      ...sharedState,
      ...(extraUpdates || {}),
      ...rewardUpdates,
      daily_missions: nextAll,
    };
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

  // Main wizard timer tick
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (activeBlockId && timerRunning) {
      timerRef.current = window.setInterval(() => {
        setSessionElapsedSec((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [activeBlockId, timerRunning]);

  // Vocab 3x timer tick (saves every 10s to avoid spamming Firestore)
  const vocabTickCountRef = useRef(0);
  useEffect(() => {
    if (!runningVocabSlot) return;
    const id = window.setInterval(() => {
      vocabTickCountRef.current += 1;
      const shouldSave = vocabTickCountRef.current % 10 === 0;
      setSharedState((prev) => {
        const curRec = prev.daily_missions?.[todayStr] || createDefaultMissionRecord(todayStr);
        const curTimers = curRec.vocabTimers || {
          morning: { elapsedSec: 0, completed: Boolean(curRec.vocabChecks?.morning) },
          afternoon: { elapsedSec: 0, completed: Boolean(curRec.vocabChecks?.afternoon) },
          night: { elapsedSec: 0, completed: Boolean(curRec.vocabChecks?.night) },
        };
        const slotState = curTimers[runningVocabSlot];
        const nextTimers = {
          ...curTimers,
          [runningVocabSlot]: {
            ...slotState,
            elapsedSec: (slotState?.elapsedSec || 0) + 1,
          },
        };
        const nextMissions = {
          ...(prev.daily_missions || {}),
          [todayStr]: { ...curRec, vocabTimers: nextTimers },
        };
        if (shouldSave) {
          saveSharedState({ daily_missions: nextMissions });
        }
        return { ...prev, daily_missions: nextMissions };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [runningVocabSlot, todayStr]);

  // 5-minute scan mini-timer tick
  useEffect(() => {
    if (!fiveMinRunning) return;
    const id = window.setInterval(() => {
      setFiveMinSec((prev) => {
        if (prev <= 1) {
          setFiveMinRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [fiveMinRunning]);

  const handleToggleVocabTimer = (slot: 'morning' | 'afternoon' | 'night') => {
    if (runningVocabSlot === slot) {
      // Pause & persist current elapsedSec
      setRunningVocabSlot(null);
      saveSharedState({ daily_missions: sharedState.daily_missions });
    } else {
      setRunningVocabSlot(slot);
    }
  };

  const handleFinishVocabSlot = (slot: 'morning' | 'afternoon' | 'night') => {
    if (runningVocabSlot === slot) setRunningVocabSlot(null);
    const curSlot = vocabTimers[slot];

    updateTodayMission((prev) => {
      const prevTimers = prev.vocabTimers || {
        morning: { elapsedSec: 0, completed: Boolean(prev.vocabChecks?.morning) },
        afternoon: { elapsedSec: 0, completed: Boolean(prev.vocabChecks?.afternoon) },
        night: { elapsedSec: 0, completed: Boolean(prev.vocabChecks?.night) },
      };
      return {
        ...prev,
        vocabChecks: {
          ...(prev.vocabChecks || { morning: false, afternoon: false, night: false }),
          [slot]: true,
        },
        vocabTimers: {
          ...prevTimers,
          [slot]: {
            elapsedSec: curSlot.elapsedSec,
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
    setGlossarySavedMsg(`✅ 已同步进度到第 ${word.idx} 词（${word.word_greek} = ${word.word_chinese}），刷题词库已自动解锁！`);
    setShowGlossaryPicker(false);
    setGlossarySearch('');
    setTimeout(() => setGlossarySavedMsg(null), 4500);
  };

  const openBlockWizard = (block: MissionBlockDef) => {
    const existing = todayMission.blocks?.[block.id];
    const carryMin = Math.floor((blockCarryOverMap[block.id] || 0) / 60);
    const effMin = block.minutes + (existing?.extraMinutes || 0) + carryMin;
    const proportionalScanMin = Math.max(3, Math.min(15, Math.round((effMin / 40) * 5)));
    setActiveBlockId(block.id);
    setSessionElapsedSec(existing?.elapsedSec || 0);
    setExtraMinutes(existing?.extraMinutes || 0);
    setTimerRunning(existing?.status !== 'done');
    setFiveMinSec(proportionalScanMin * 60);
    setFiveMinRunning(false);
    setEarlyFinishMsg(null);

    if (!existing || existing.status === 'idle') {
      updateTodayMission((prev) => ({
        ...prev,
        blocks: {
          ...prev.blocks,
          [block.id]: {
            status: 'in_progress',
            currentStep: 0,
            elapsedSec: existing?.elapsedSec || 0,
            extraMinutes: existing?.extraMinutes || 0,
            subject: existing?.subject,
          },
        },
      }));
    }
  };

  const handleResetBlock = (blockId: string) => {
    if (activeBlockId === blockId) {
      setSessionElapsedSec(0);
      setExtraMinutes(0);
      setTimerRunning(false);
      setEarlyFinishMsg(null);
    }
    updateTodayMission((prev) => {
      const nextBlocks = { ...(prev.blocks || {}) };
      delete nextBlocks[blockId];
      return { ...prev, blocks: nextBlocks };
    });
  };

  const handleResetVocabSlot = (slot: 'morning' | 'afternoon' | 'night') => {
    if (runningVocabSlot === slot) setRunningVocabSlot(null);
    updateTodayMission((prev) => {
      const prevTimers = prev.vocabTimers || {
        morning: { elapsedSec: 0, completed: Boolean(prev.vocabChecks?.morning) },
        afternoon: { elapsedSec: 0, completed: Boolean(prev.vocabChecks?.afternoon) },
        night: { elapsedSec: 0, completed: Boolean(prev.vocabChecks?.night) },
      };
      return {
        ...prev,
        vocabChecks: {
          ...(prev.vocabChecks || { morning: false, afternoon: false, night: false }),
          [slot]: false,
        },
        vocabTimers: {
          ...prevTimers,
          [slot]: { elapsedSec: 0, completed: false },
        },
      };
    });
  };

  const closeBlockWizard = () => {
    if (activeBlockId) {
      const prevBlock = todayMission.blocks?.[activeBlockId];
      updateTodayMission((prev) => ({
        ...prev,
        blocks: {
          ...prev.blocks,
          [activeBlockId]: {
            status: prevBlock?.status || 'in_progress',
            currentStep: prevBlock?.currentStep || 0,
            elapsedSec: sessionElapsedSec,
            extraMinutes,
            subject: prevBlock?.subject,
            completedAt: prevBlock?.completedAt,
          },
        },
      }));
    }
    setTimerRunning(false);
    setFiveMinRunning(false);
    setActiveBlockId(null);
  };

  const handleAdvanceStep = () => {
    if (!activeBlock) return;
    const curState: DailyMissionBlockState = todayMission.blocks?.[activeBlock.id] || {
      status: 'in_progress',
      currentStep: 0,
      elapsedSec: sessionElapsedSec,
      extraMinutes,
    };
    const nextStep = curState.currentStep + 1;

    if (nextStep >= activeBlock.steps.length) {
      const carrySec = blockCarryOverMap[activeBlock.id] || 0;
      const targetSec = (activeBlock.minutes + extraMinutes) * 60 + carrySec;
      const deficitSec = Math.max(0, targetSec - sessionElapsedSec);
      const deficitMin = Math.floor(deficitSec / 60);
      setTimerRunning(false);
      setFiveMinRunning(false);

      updateTodayMission((prev) => ({
        ...prev,
        blocks: {
          ...prev.blocks,
          [activeBlock.id]: {
            ...curState,
            status: 'done',
            currentStep: activeBlock.steps.length - 1,
            elapsedSec: sessionElapsedSec,
            extraMinutes,
            completedAt: new Date().toISOString(),
          },
        },
      }));

      if (deficitMin >= 2) {
        setEarlyFinishMsg(
          `「${activeBlock.title}」已完成！本区块未足的 ${deficitMin} 分钟已自动顺延叠加到下一个区块。全部任务做完后将自动发放今日 +10 XP！`
        );
      } else {
        setEarlyFinishMsg(
          `太棒了！「${activeBlock.title}」已扎实通关！全部任务做完后将自动发放今日 +10 XP 🎉`
        );
      }
    } else {
      updateTodayMission((prev) => ({
        ...prev,
        blocks: {
          ...prev.blocks,
          [activeBlock.id]: {
            ...curState,
            status: 'in_progress',
            currentStep: nextStep,
            elapsedSec: sessionElapsedSec,
            extraMinutes,
          },
        },
      }));
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
    const blockState = todayMission.blocks?.[activeBlock.id] || {
      status: 'in_progress' as const,
      currentStep: 0,
      elapsedSec: sessionElapsedSec,
      extraMinutes,
    };
    const stepIndex = Math.min(blockState.currentStep || 0, activeBlock.steps.length - 1);
    const stepDef = activeBlock.steps[stepIndex];
    const carrySec = blockCarryOverMap[activeBlock.id] || 0;
    const totalTargetSec = (activeBlock.minutes + extraMinutes) * 60 + carrySec;
    const remainingSec = Math.max(0, totalTargetSec - sessionElapsedSec);
    const isOvertime = sessionElapsedSec > totalTargetSec;

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
      mode: 'preview' as const,
      book: 'B 本 (Ελληνικά Β΄)',
      fromPage: b1Frontier + 1,
      toPage: b1Frontier + 2,
      pages: `B本 P.${b1Frontier + 1}-${b1Frontier + 2}`,
      questionMarks: 0,
      actions: [],
      summary: '',
    };

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
    const proportionalScanMin = Math.max(3, Math.min(15, Math.round((effectiveBlockMin / 40) * 5)));

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
                  {isOvertime ? '已超出计划（可点右侧延时）' : '灵活倒计时'}
                  {carrySec >= 60 ? ` · 含顺延 +${Math.floor(carrySec / 60)}分` : ''}
                  {extraMinutes > 0 ? ` · 延时 +${extraMinutes}分` : ''}
                  （已用 {formatElapsedHuman(sessionElapsedSec)}）
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
                onClick={() => setTimerRunning((r) => !r)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: 'none',
                  background: timerRunning ? '#f59e0b' : activeBlock.accent,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {timerRunning ? <Pause size={16} /> : <Play size={16} />}
                {timerRunning ? '暂停' : '继续'}
              </button>
              <button
                type="button"
                onClick={() => setExtraMinutes((m) => m + 5)}
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
                onClick={() => setExtraMinutes((m) => m + 10)}
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
                  if (window.confirm('确定要重置本区块的计时与完成状态吗？')) {
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
                  updateTodayMission((prev) => ({
                    ...prev,
                    blocks: {
                      ...prev.blocks,
                      [activeBlock.id]: {
                        ...blockState,
                        currentStep: idx,
                        elapsedSec: sessionElapsedSec,
                        extraMinutes,
                      },
                    },
                  }))
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
              <div style={{ fontSize: 56, marginBottom: 12 }}>🏆</div>
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
                  display: 'inline-block',
                  fontSize: 13,
                  fontWeight: 800,
                  padding: '5px 12px',
                  borderRadius: 999,
                  background: activeBlock.bg,
                  color: activeBlock.accent,
                  marginBottom: 10,
                }}
              >
                {activeBlock.icon} {activeBlock.title} · 第 {stepIndex + 1} / {activeBlock.steps.length} 步
              </span>

              <h2 style={{ margin: '4px 0 16px', fontSize: 25, color: '#0f172a', lineHeight: 1.3 }}>
                {stepDef.title}
              </h2>

              {/* Detailed 3-part Pedagogical Guide: Goal + How-to + Why it works */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
                <div style={{ padding: '12px 15px', borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Target size={15} color={activeBlock.accent} /> 这一步的目标
                  </div>
                  <div style={{ fontSize: 15, color: '#334155', lineHeight: 1.6 }}>{stepDef.goal}</div>
                </div>

                <div style={{ padding: '14px 16px', borderRadius: 14, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1d4ed8', marginBottom: 6 }}>
                    📋 具体怎么做（跟着一步步来）
                  </div>
                  <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15, color: '#1e293b', lineHeight: 1.6 }}>
                    {stepDef.howTo.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ol>
                </div>

                <div style={{ padding: '12px 15px', borderRadius: 14, background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#b45309', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Lightbulb size={15} color="#d97706" /> 🧠 为什么要这样做（学习原理）
                  </div>
                  <div style={{ fontSize: 14, color: '#78350f', lineHeight: 1.65 }}>{stepDef.whyItWorks}</div>
                </div>
              </div>

              {/* Interactive Content Capture Widgets per Step */}
              {stepDef.kind === 'school_plan' && (
                <div style={{ marginBottom: 22, padding: 18, borderRadius: 16, background: '#f0fdfa', border: '1px solid #99f6e4' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f766e', marginBottom: 10 }}>
                    ✍️ 点选今天要处理的学校科目，直接点按选择每个科目的页码区间：
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
                          {active ? '✅ ' : '+ '}
                          {subj}
                        </button>
                      );
                    })}
                  </div>

                  {schoolItems.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {schoolItems.map((it) => (
                        <div
                          key={it.subject}
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            padding: '10px 14px',
                            borderRadius: 12,
                            background: '#ffffff',
                            border: '1px solid #99f6e4',
                          }}
                        >
                          <strong style={{ fontSize: 14, color: '#0f766e' }}>{it.subject}</strong>
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
                    ✅ 逐科点选今天作业完成情况（点一点就行，备注选填）：
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
                                {checked ? '✅ ' : '+ '}
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
                    🚀 进入网站刷题中心
                    <ChevronRight size={18} />
                  </Link>
                </div>
              )}

              {stepDef.kind === 'tutor_prep' && (
                <div style={{ marginBottom: 22, padding: 18, borderRadius: 16, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1d4ed8' }}>
                      👨‍🏫 私教课量化记录（后台 B 本当前已上到第 {b1Frontier} 页）：
                    </div>
                  </div>

                  {/* Mode buttons */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(
                      [
                        { id: 'preview' as const, label: '课前预习' },
                        { id: 'review' as const, label: '课后复习' },
                        { id: 'both' as const, label: '预习 + 复习' },
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
                          padding: '8px 14px',
                          borderRadius: 999,
                          border: tutorLog.mode === m.id ? '2px solid #0071E3' : '1px solid #cbd5e1',
                          background: tutorLog.mode === m.id ? '#dbeafe' : '#fff',
                          color: tutorLog.mode === m.id ? '#1d4ed8' : '#334155',
                          fontWeight: 700,
                          fontSize: 13.5,
                          cursor: 'pointer',
                        }}
                      >
                        {tutorLog.mode === m.id ? '✅ ' : ''}
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Book + Page Range Steppers + Question Marks Stepper */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: '#fff', border: '1px solid #bfdbfe' }}>
                    <select
                      value={tutorLog.book || 'B 本 (Ελληνικά Β΄)'}
                      onChange={(e) => {
                        const bk = e.target.value;
                        const fp = tutorLog.fromPage ?? b1Frontier + 1;
                        const tp = tutorLog.toPage ?? b1Frontier + 2;
                        updateBlockLogs((prev) => ({
                          ...prev,
                          tutor: { ...tutorLog, book: bk, pages: `${bk.split(' ')[0]} P.${fp}-${tp}` },
                        }));
                      }}
                      style={{ padding: '8px 10px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, fontWeight: 700, background: '#f8fafc' }}
                    >
                      <option value="B 本 (Ελληνικά Β΄)">B 本 (Ελληνικά Β΄) · 在学</option>
                      <option value="A2 (ΚΛΙΚ Α2)">A2 (ΚΛΙΚ Α2)</option>
                      <option value="私教补充讲义">私教补充讲义</option>
                    </select>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <NumberStepper
                        prefix="第"
                        suffix="页"
                        min={1}
                        max={400}
                        value={tutorLog.fromPage ?? b1Frontier + 1}
                        onChange={(v) => {
                          const tp = Math.max(v, tutorLog.toPage ?? v + 1);
                          const bk = (tutorLog.book || 'B本').split(' ')[0];
                          updateBlockLogs((prev) => ({
                            ...prev,
                            tutor: { ...tutorLog, fromPage: v, toPage: tp, pages: `${bk} P.${v}-${tp}` },
                          }));
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>至</span>
                      <NumberStepper
                        prefix="第"
                        suffix="页"
                        min={tutorLog.fromPage ?? 1}
                        max={400}
                        value={tutorLog.toPage ?? b1Frontier + 2}
                        onChange={(v) => {
                          const fp = tutorLog.fromPage ?? b1Frontier + 1;
                          const bk = (tutorLog.book || 'B本').split(' ')[0];
                          updateBlockLogs((prev) => ({
                            ...prev,
                            tutor: { ...tutorLog, toPage: Math.max(fp, v), pages: `${bk} P.${fp}-${Math.max(fp, v)}` },
                          }));
                        }}
                      />
                    </div>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>标了几个 ?：</span>
                      <NumberStepper
                        min={0}
                        max={50}
                        value={tutorLog.questionMarks || 0}
                        onChange={(v) =>
                          updateBlockLogs((prev) => ({
                            ...prev,
                            tutor: { ...tutorLog, questionMarks: v },
                          }))
                        }
                      />
                    </div>
                  </div>

                  {/* Quantized Tutor Action Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {TUTOR_ACTION_OPTIONS.map((act) => {
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
                              tutor: { ...tutorLog, actions: nextActs },
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
                          {checked ? '✅ ' : '+ '}
                          {act}
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    placeholder="选填一句简短备注（例如：第3题语法变格不太懂，已画?）"
                    value={tutorLog.summary || ''}
                    onChange={(e) =>
                      updateBlockLogs((prev) => ({
                        ...prev,
                        tutor: { ...tutorLog, summary: e.target.value },
                      }))
                    }
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14, background: '#fff' }}
                  />
                </div>
              )}

              {stepDef.kind === 'five_min_scan' && (
                <div style={{ marginBottom: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Option A: 5-min Paper Book Scan Timer */}
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 16,
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#b45309' }}>
                        方式 A · ⏱️ 纸质课本快扫旧标记（按本区块 {effectiveBlockMin} 分钟等比例分配：{proportionalScanMin} 分钟）
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#92400e', fontVariantNumeric: 'tabular-nums' }}>
                        {formatDurationMinSec(fiveMinSec)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setFiveMinRunning((r) => !r)}
                        style={{
                          padding: '10px 16px',
                          borderRadius: 12,
                          border: 'none',
                          background: fiveMinRunning ? '#d97706' : '#f59e0b',
                          color: '#fff',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {fiveMinRunning ? `暂停 ${proportionalScanMin} 分钟` : `开始 ${proportionalScanMin} 分钟快扫`}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFiveMinRunning(false);
                          setFiveMinSec(proportionalScanMin * 60);
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid #fcd34d',
                          background: '#fff',
                          color: '#92400e',
                          cursor: 'pointer',
                        }}
                        title="重置快扫计时"
                      >
                        <RotateCcw size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Option B: Instant System Flashcard Quick Scan (Entered words + Today's glossary words!) */}
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 16,
                      background: '#eff6ff',
                      border: '1.5px solid #93c5fd',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1d4ed8' }}>
                        方式 B · ⚡ 用系统闪卡 5 分钟极速自测（课本不好遮中文时用这个！）
                      </div>
                      <div style={{ fontSize: 12.5, color: '#475569', marginTop: 3 }}>
                        自动混入你录入的课堂生词 + 今天白天背过的词表词，点开就能刷！
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveFlashcardSlot('quick_scan')}
                      style={{
                        padding: '11px 18px',
                        borderRadius: 12,
                        border: 'none',
                        background: '#0071E3',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      🃏 启动 5 分钟闪卡快扫 →
                    </button>
                  </div>
                </div>
              )}

              {stepDef.kind === 'workbook_check' && (
                <div style={{ marginBottom: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#5b21b6' }}>
                    📘 记录今天扫了哪几本练习册、第几页，以及发现了什么问题（支持添加多本，自动写入今日报告）：
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
                              {checked ? '✅ ' : '+ '}
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
                          📖 预习科目 {idx + 1}
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
                              {checked ? '✅ ' : '+ '}
                              {act}
                            </button>
                          );
                        })}
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#5b21b6', marginBottom: 4 }}>
                          🎙️ 用语音/文字写一句中文大意（这篇课文大概讲了个什么事？）：
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
                      updateTodayMission((prev) => ({
                        ...prev,
                        blocks: {
                          ...prev.blocks,
                          [activeBlock.id]: {
                            ...blockState,
                            currentStep: stepIndex - 1,
                            elapsedSec: sessionElapsedSec,
                            extraMinutes,
                          },
                        },
                      }))
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
          background: linear-gradient(135deg, #0071E3, #2563EB);
          border-radius: 26px;
          padding: 28px 32px 22px;
          color: #FFFFFF;
          box-shadow: 0 10px 32px rgba(0, 113, 227, 0.16);
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
        {/* Classic Welcome Banner with Leon Scout Photo + Greek Flag Wave + Daily Mission Controls */}
        <div className="mission-hero">
          {/* Greek Flag Wave SVG Decor */}
          <div
            className="welcome-banner-decor"
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '42%',
              minWidth: 280,
              zIndex: 1,
              pointerEvents: 'none',
              opacity: 0.9,
            }}
          >
            <svg viewBox="0 0 500 200" width="100%" height="100%" preserveAspectRatio="none">
              <defs>
                <clipPath id="missionFlagClip">
                  <rect width="120" height="80" rx="8" />
                </clipPath>
              </defs>
              <path d="M 80,0 C 220,-20 280,120 420,30 C 470,0 520,20 500,0 L 500,200 L 80,200 Z" fill="rgba(10, 75, 143, 0.55)" />
              <g transform="translate(290, 32) rotate(-3) scale(1.15)">
                <rect width="120" height="80" rx="8" fill="rgba(0,0,0,0.2)" transform="translate(3, 4)" />
                <g clipPath="url(#missionFlagClip)">
                  <rect width="120" height="80" fill="#FFFFFF" />
                  <rect y="0" width="120" height="8.89" fill="#0D5EAF" />
                  <rect y="17.78" width="120" height="8.89" fill="#0D5EAF" />
                  <rect y="35.56" width="120" height="8.89" fill="#0D5EAF" />
                  <rect y="53.33" width="120" height="8.89" fill="#0D5EAF" />
                  <rect y="71.11" width="120" height="8.89" fill="#0D5EAF" />
                  <rect x="0" y="0" width="44.44" height="44.44" fill="#0D5EAF" />
                  <rect x="0" y="17.78" width="44.44" height="8.89" fill="#FFFFFF" />
                  <rect x="17.78" y="0" width="8.89" height="44.44" fill="#FFFFFF" />
                </g>
              </g>
            </svg>
          </div>

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
                    {currentLevel.imageUrl ? (
                      <img
                        src={currentLevel.imageUrl}
                        alt={currentLevel.name}
                        style={{ width: 54, height: 54, borderRadius: 14, objectFit: 'cover', border: '2px solid #fbbf24', flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 14,
                          background: currentLevel.gradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                          border: '2px solid rgba(255,255,255,0.6)',
                          flexShrink: 0,
                        }}
                      >
                        {currentLevel.icon.slice(0, 2)}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 700 }}>
                        当前段位 · {scoreVal} XP
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {currentLevel.name}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                <span>今日总通关进度（全部完成统一奖励 +10 XP）</span>
                <span>
                  {progressPct}%（{doneCheckUnits} / {totalCheckUnits}）
                  {dailyRewardClaimed ? ' · 🏅 今日 +10 XP 已到账' : ''}
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
                  {todayMission.lightPreviewMode
                    ? '⚡ 已开启忙碌日轻享模式（已减负）'
                    : '⚡ 忙碌日切轻享模式（外出/时间紧时点我）'}
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
                    {todayMission.hasTutorClass ? '✅ 今天有私教课（90分）' : '今天无私教课'}
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

        {/* Two Big Core Entry Cards: Daily Practice & History Story Hall */}
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
              background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
              border: '2px solid #93c5fd',
              color: '#0b4f9c',
              textDecoration: 'none',
              boxShadow: '0 8px 20px rgba(0, 113, 227, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <OptionalMascot src="/images/ui/card_practice.png" alt="每日网站刷题训练" size={62} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 22 }}>📝</span>
                  <strong style={{ fontSize: 20, color: '#0f172a' }}>每日网站刷题训练</strong>
                </div>
                <div style={{ fontSize: 13, color: '#475569' }}>
                  八大模块智能出题 · 含今日语音录入生词与 7 天必练
                </div>
                <div style={{ marginTop: 8, display: 'inline-block', fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: '#dbeafe', color: '#1d4ed8' }}>
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
              background: 'linear-gradient(135deg, #ffffff 0%, #edf5f0 100%)',
              border: '2px solid #a7d3c0',
              color: '#224943',
              textDecoration: 'none',
              boxShadow: '0 8px 20px rgba(34, 73, 67, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <OptionalMascot src="/images/ui/card_history.png" alt="希腊历史故事馆" size={62} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 22 }}>🏛️</span>
                  <strong style={{ fontSize: 20, color: '#13312c' }}>希腊历史故事馆</strong>
                </div>
                <div style={{ fontSize: 13, color: '#3b645c' }}>
                  三年级神话 · 四年级古希腊 · 全 91 课双语音频与点读词卡
                </div>
                <div style={{ marginTop: 8, display: 'inline-block', fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: '#d7ebe2', color: '#1f4b43' }}>
                  区块外自由收听 · 睡前磨耳朵 &amp; 历史预习
                </div>
              </div>
            </div>
            <ChevronRight size={24} color="#224943" style={{ flexShrink: 0 }} />
          </Link>
        </section>

        {/* Outside-the-3-Blocks Section A: Daily 3x Paper Vocab with Independent Carry-Over Timers + Self-Sync Progress */}
        <section
          style={{
            background: '#ffffff',
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="#f59e0b" />
                区块外日常 1：每日 3 次背单词（独立计时 + 未足自动顺延 + 纸质词表自选）
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>
                默认每次 10 分钟（共 30 分钟）；如果第 1 次没背满，未足时间会自动顺延加到第 2 次、第 3 次！
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveFlashcardSlot('morning')}
              style={{
                padding: '7px 12px',
                borderRadius: 999,
                border: '1px solid #bfdbfe',
                background: '#eff6ff',
                color: '#1d4ed8',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              🃏 顺便刷生词电子闪卡
            </button>
          </div>

          <div className="mission-vocab-grid">
            {(
              [
                { slot: 'morning' as const, label: '🌅 第 1 次（早/午）', desc: '复习昨天旧词 + 开今日新词' },
                { slot: 'afternoon' as const, label: '☀️ 第 2 次（下午）', desc: '遮中文快过一遍今日新词' },
                { slot: 'night' as const, label: '🌙 第 3 次（睡前）', desc: '睡前总抽查今日新词与难词' },
              ]
            ).map((item) => {
              const vt = vocabTimers[item.slot];
              const isRunning = runningVocabSlot === item.slot;
              const remSec = Math.max(0, vt.targetSec - vt.elapsedSec);
              const carryMin = Math.floor(vt.carrySec / 60);

              return (
                <div
                  key={item.slot}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 16,
                    border: vt.completed ? '2px solid #10b981' : isRunning ? '2px solid #0071E3' : '1.5px solid #e2e8f0',
                    background: vt.completed ? '#ecfdf5' : isRunning ? '#eff6ff' : '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 15, color: vt.completed ? '#047857' : '#0f172a' }}>
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
                        ⏱️ 含上次未足顺延 +{carryMin} 分钟（本次目标 {Math.round(vt.targetSec / 60)} 分）
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
                      {isRunning ? '⏸ 暂停' : vt.elapsedSec > 0 ? '▶ 继续计时' : '▶ 开始计时'}
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
                      {vt.completed ? '✅ 已完成' : '结束打卡'}
                    </button>
                    {(vt.elapsedSec > 0 || vt.completed) && (
                      <button
                        type="button"
                        onClick={() => handleResetVocabSlot(item.slot)}
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
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>📖 纸质单词表进度：</span>
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
                    unit: 103,
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
                      ['历史故事词汇_103']: getMondayDateStr(todayStr),
                    },
                  };
                  setHistorySyncMsg(`✨ 已自动将该课 ${toAdd.length} 个希腊语历史核心词同步至每日刷题词库与 7 天必练！`);
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
                background: '#edf5f0',
                borderRadius: 20,
                padding: '16px 20px',
                marginBottom: 22,
                border: '1.5px solid #c9ddd4',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#13312c', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Headphones size={18} color="#224943" />
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
                      {selectedIds.includes(ep.id) ? '✅ ' : ''}
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
                    ✅ 今日已听 {selectedEpisodes.length} 集：
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
              const elapsed = st?.elapsedSec || 0;
              const carrySec = blockCarryOverMap[block.id] || 0;
              const carryMin = Math.floor(carrySec / 60);
              const effectiveMinutes = block.minutes + carryMin;

              return (
                <div
                  key={block.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: 22,
                    padding: 20,
                    border: isDone ? '2px solid #10b981' : `1.5px solid ${block.accent}33`,
                    boxShadow: '0 8px 22px rgba(15, 23, 42, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <OptionalMascot
                          src={`/images/ui/${block.id === 'block_school' ? 'mascot_school.png' : block.id === 'block_web' ? 'mascot_practice_tutor.png' : 'mascot_preview.png'}`}
                          alt={block.title}
                          size={48}
                        />
                        <span
                          style={{
                            fontSize: 24,
                            width: 44,
                            height: 44,
                            borderRadius: 14,
                            background: block.bg,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {block.icon}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            padding: '5px 10px',
                            borderRadius: 999,
                            background: isDone ? '#ecfdf5' : isInProgress ? '#fffbeb' : '#f1f5f9',
                            color: isDone ? '#047857' : isInProgress ? '#b45309' : '#64748b',
                          }}
                        >
                          {isDone
                            ? `已通关 ✅ · ${formatElapsedHuman(elapsed)}`
                            : isInProgress
                              ? `进行中 · 第 ${(st?.currentStep || 0) + 1}/${block.steps.length} 步`
                              : `目标 ${effectiveMinutes} 分钟`}
                        </span>
                        {(isDone || isInProgress || elapsed > 0) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`确定要重置「${block.title}」的计时与完成状态吗？`)) {
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

                    {/* Clear Domain Scope Tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                      {block.id === 'block_school' && (
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#ccfbf1', color: '#0f766e' }}>
                          🏫 学校课业 · 复习与作业
                        </span>
                      )}
                      {block.id === 'block_web' && (
                        <>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#dbeafe', color: '#1d4ed8' }}>
                            💻 网站刷题
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#ffedd5', color: '#c2410c' }}>
                            👨‍🏫 希腊语私教课
                          </span>
                        </>
                      )}
                      {block.id === 'block_preview' && (
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#ede9fe', color: '#6d28d9' }}>
                          🏫 学校课业 · 下节课预习与练习册
                        </span>
                      )}
                    </div>

                    <h3 style={{ margin: '0 0 6px', fontSize: 18, color: '#0f172a' }}>{block.title}</h3>
                    <p style={{ margin: '0 0 10px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{block.subtitle}</p>

                    {carryMin > 0 && (
                      <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 800, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', padding: '6px 10px', borderRadius: 10 }}>
                        ⏱️ 已自动顺延上一区块未足的 +{carryMin} 分钟（本次总计 {effectiveMinutes} 分钟）
                      </div>
                    )}

                    {/* Visible Checklist with Direct Links */}
                    <div
                      style={{
                        background: '#f8fafc',
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
                                {stepDone ? '✅' : stepActive ? '🔵' : `${idx + 1}.`}
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
                                🎙️ 录词
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

        {/* Bottom Section: Rich Daily Study Report (Replaces 2-min Parent Stamp!) */}
        <DailyStudyReport
          todayStr={todayStr}
          mission={todayMission}
          todayWebCompleted={todayWebCompleted}
          todayWords={todayWords}
          pageProgress={sharedState.page_progress || []}
        />
      </div>

      {/* Level & 12 Gold Saints Rules Modal */}
      {showRulesModal && (
        <LevelRulesModal
          score={sharedState.score || 0}
          dailyRewardClaimedToday={dailyRewardClaimed}
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

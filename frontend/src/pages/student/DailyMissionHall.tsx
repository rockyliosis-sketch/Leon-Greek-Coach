import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  Headphones,
  Lock,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  subscribeToSharedState,
  saveSharedState,
  getInitialLocalState,
  type DailyMissionBlockState,
  type DailyMissionRecord,
  type SharedState,
  type VocabSrsEntry,
} from '../../dbService';
import {
  calculateMissionStreak,
  createDefaultMissionRecord,
  formatDurationMinSec,
  formatElapsedHuman,
  getDayMode,
  getTodayStr,
  getWeekdayLabel,
  type DayMode,
} from '../../lib/dailyMissionHelpers';
import { QuickVocabRecorder } from '../../components/QuickVocabRecorder';
import { DailyFlashcardModal, type VocabSlot } from '../../components/DailyFlashcardModal';

interface WizardStepDef {
  title: string;
  instruction: string;
  buttonText: string;
  kind?:
    | 'default'
    | 'vocab_recorder'
    | 'website_drills'
    | 'history_audio'
    | 'subject_picker'
    | 'five_min_scan';
  hint?: string;
}

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

const SUBJECT_OPTIONS = [
  { id: 'glossa', label: '希腊语 (Γλώσσα)' },
  { id: 'istoria', label: '历史 (Ιστορία)' },
  { id: 'meleti', label: '环境学 (Μελέτη Περιβάλλοντος)' },
  { id: 'other', label: '其他科目' },
];

const PARENT_PIN = '1234';

function buildBlocksForMode(mode: DayMode, record: DailyMissionRecord): MissionBlockDef[] {
  const previewMins = record.lightPreviewMode ? 20 : 40;

  const websiteBlock: MissionBlockDef = {
    id: 'block_web',
    icon: '💻',
    title: '区块二：网站刷题 + 历史故事',
    subtitle: '40 分钟 · 纳入 120 分钟主区块 · 自动同步刷题进度',
    minutes: 40,
    accent: '#0071E3',
    bg: '#eff6ff',
    steps: [
      {
        title: 'Step 1：完成今日网站刷题',
        instruction:
          '点下方按钮回到网站首页，完成今天的八大模块日常练习（你刚录入的学校生词和课堂笔记也会自动出现哦！）。',
        buttonText: '网站刷题做完了，下一步',
        kind: 'website_drills',
      },
      {
        title: 'Step 2：听 1 集希腊语历史故事',
        instruction:
          '打开「希腊历史故事馆」，听 1 集三/四年级双语历史故事（优先听学校近期要上的课），并点读片尾新词卡。',
        buttonText: '历史故事听完啦，区块通关！',
        kind: 'history_audio',
      },
    ],
  };

  if (mode === 'saturday') {
    return [
      {
        id: 'sat_cleanup',
        icon: '🧹',
        title: '周六任务 1：本周课本大清盘',
        subtitle: '30 分钟 · 消灭本周遗留圈词和问号',
        minutes: 30,
        accent: '#0f766e',
        bg: '#f0fdfa',
        steps: [
          {
            title: 'Step 1：翻看本周全部旧标记',
            instruction:
              '拿出本周所有的学校课本和私教教材，只看还留着铅笔圈和 ? 的地方。遮住中文考自己：已经看懂的直接擦掉或打勾 ✓！',
            buttonText: '旧标记都过了一遍，下一步',
          },
          {
            title: 'Step 2：顽固生词语音入库',
            instruction:
              '把还是没记住的顽固词，用 iPad 语音输入录进下面的框里，它们会自动留在每日背词和 7 天必练队列里滚动消灭！',
            buttonText: '周清盘完成，通关！',
            kind: 'vocab_recorder',
          },
        ],
      },
      {
        ...websiteBlock,
        title: '周六任务 2：网站刷题 + 历史故事',
        subtitle: '40 分钟 · 保持手感不断档',
      },
      {
        id: 'sat_preview',
        icon: '📖',
        title: '周六任务 3：下周一二重点课预习',
        subtitle: '40 分钟 · 提前扫雷，周一上课不发懵',
        minutes: 40,
        accent: '#7c3aed',
        bg: '#f5f3ff',
        steps: [
          {
            title: 'Step 1：选择下周要预习的科目',
            instruction: '看看下周一、周二的课表，选一门文字最多、最容易听不懂的重点课开始预习。',
            buttonText: '选好了，下一步',
            kind: 'subject_picker',
          },
          {
            title: 'Step 2：扫描新课重点生词',
            instruction:
              '不用逐字翻译，只把影响理解大意的 10–15 个重点名词和动词查好，用铅笔把中文写在旁边。',
            buttonText: '生词标好了，下一步',
          },
          {
            title: 'Step 3：通读 + 中文讲给爸妈听',
            instruction:
              '把课文出声通读 1 遍。然后合上书，去找爸爸或妈妈，用中文讲一遍「这篇课文大概讲了个什么事」！',
            buttonText: '我讲完啦，下一步',
          },
          {
            title: 'Step 4：瞄一眼练习册题目',
            instruction:
              '翻开对应练习册，不用做完，花 5 分钟看懂题目要求在问什么就行。',
            buttonText: '下周预习通关！',
          },
        ],
      },
    ];
  }

  if (mode === 'sunday') {
    return [
      {
        ...websiteBlock,
        title: '周日任务 1：网站刷题 + 历史故事',
        subtitle: '40 分钟 · 轻松磨耳朵 + 保持连续打卡',
      },
      {
        id: 'sun_tutor',
        icon: '👨‍🏫',
        title: '周日任务 2：周一私教课备课 & 收心',
        subtitle: '30 分钟 · 备好周一私教课，顺手理书包',
        minutes: 30,
        accent: '#ea580c',
        bg: '#fff7ed',
        steps: [
          {
            title: 'Step 1：复习上次私教课错题',
            instruction:
              '拿出希腊语私教教材，把上节课的错题和语法笔记盖住答案，口头重做一遍。',
            buttonText: '复习好了，下一步',
          },
          {
            title: 'Step 2：预习下 2 页 + 铅笔先填基础题',
            instruction:
              '翻到明天要学的新 2 页：把不认识的新词标上中文，能自己做的填空/选择题先用铅笔试填；真不会的地方画上大大的 ?，明天直接让老师讲！',
            buttonText: '备课好了，下一步',
          },
          {
            title: 'Step 3：整理周一书包',
            instruction: '按周一课表把学校课本、练习册和笔袋装进书包，今晚好好休息！',
            buttonText: '周日收心通关！',
          },
        ],
      },
    ];
  }

  // Weekday (Mon-Fri): exact 3 x 40 min = 120 min structure!
  return [
    {
      id: 'block_school',
      icon: '🏫',
      title: '区块一：学校复习 + 生词入库 + 作业',
      subtitle: '40 分钟 · 放学休整后最早完成，清空当天盲点',
      minutes: 40,
      accent: '#0f766e',
      bg: '#f0fdfa',
      steps: [
        {
          title: 'Step 1：课堂排雷（标中文）',
          instruction:
            '拿出今天的学校课本和笔记本，把上课圈出来没听懂的词查好，用铅笔把中文写在旁边，并在页眉写上今天的日期。',
          buttonText: '我都标好了，下一步',
        },
        {
          title: 'Step 2：语音录入学校生词 / 课堂笔记',
          instruction:
            '用 iPad 语音输入法，把今天查到的重要生词或上课笔记录进下面！入库后会直接进入你的单词表、每天 3 次闪卡和网站 7 天必练。',
          buttonText: '录好了，去做作业',
          kind: 'vocab_recorder',
          hint: '如果今天确实没有新词，也可以直接点下一步跳过。',
        },
        {
          title: 'Step 3：专心完成学校书面作业',
          instruction:
            '生词都排完雷啦！现在专心完成学校今天的书面作业吧。如果提前做完，省下来的时间归你自由支配！',
          buttonText: '学校作业全部完成，通关！',
        },
      ],
    },
    websiteBlock,
    {
      id: 'block_preview',
      icon: '🚀',
      title: record.lightPreviewMode
        ? '区块三：预习抢跑 + 私教备课（轻享 20 分）'
        : '区块三：学校预习 + 私教课备课',
      subtitle: record.lightPreviewMode
        ? '20 分钟轻享模式 · 今日有私教课，只抓最核心生词与问号'
        : '40 分钟 · 20 分学校下节课预习 + 20 分私教课复习/预习',
      minutes: previewMins,
      accent: '#7c3aed',
      bg: '#f5f3ff',
      steps: [
        {
          title: 'Step 1：选择今天要预习的学校科目',
          instruction: '看看明后天课表，选一门最需要提前准备的学校主课（每天专攻 1 门就够了）。',
          buttonText: '选好了，下一步',
          kind: 'subject_picker',
        },
        {
          title: 'Step 2：5 分钟快扫上一课旧标记（防遗忘）',
          instruction:
            '先往前翻一页！用手遮住铅笔写的中文，花 5 分钟扫一遍上一课标过的词：记住的打勾 ✓，忘了的留着周六清盘。',
          buttonText: '旧词扫完了，看新课',
          kind: 'five_min_scan',
        },
        {
          title: 'Step 3：预习新课 + 中文复述给爸妈听',
          instruction:
            '① 用铅笔圈出 10–15 个最妨碍理解的生词并标中文；② 出声通读 1 遍；③ 合上书用中文给爸爸或妈妈讲一遍大意；④ 瞄一眼练习册题目要求（先不做题）。',
          buttonText: '学校预习完成，下一步',
        },
        {
          title: 'Step 4：私教课教材复习与预习',
          instruction: record.hasTutorClass
            ? '今天有私教课：先盖住答案重做上次错题；再把今天/下次要讲的 2 页生词查好、简单题用铅笔先填、不会的画大 ? 让老师重点讲！'
            : '今天无私教课：趁热复习上节私教课笔记与错题，把下 2 页新词提前查好标中文，帮老师加快下次上课进度！',
          buttonText: '区块三全部通关！',
        },
      ],
    },
  ];
}

const DailyMissionHall: React.FC = () => {
  const todayStr = useMemo(() => getTodayStr(), []);
  const actualMode = useMemo(() => getDayMode(todayStr), [todayStr]);

  const [sharedState, setSharedState] = useState<SharedState>(() => getInitialLocalState());
  const [previewModeOverride, setPreviewModeOverride] = useState<DayMode | null>(null);
  const activeMode: DayMode = previewModeOverride || actualMode;

  // Active wizard state
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [sessionElapsedSec, setSessionElapsedSec] = useState(0);
  const [fiveMinSec, setFiveMinSec] = useState(300);
  const [fiveMinRunning, setFiveMinRunning] = useState(false);
  const [earlyFinishMsg, setEarlyFinishMsg] = useState<string | null>(null);

  // Modals
  const [showQuickRecorder, setShowQuickRecorder] = useState(false);
  const [activeFlashcardSlot, setActiveFlashcardSlot] = useState<VocabSlot | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [celebrationMsg, setCelebrationMsg] = useState<string | null>(null);

  // Subscribe to Firebase shared_state
  useEffect(() => {
    const unsub = subscribeToSharedState((next) => {
      setSharedState(next);
    });
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

  const activeBlock = useMemo(
    () => blocks.find((b) => b.id === activeBlockId) || null,
    [blocks, activeBlockId]
  );

  const todayWebCompleted = useMemo(() => {
    return sharedState.completed_date_modules?.[todayStr] || [];
  }, [sharedState.completed_date_modules, todayStr]);

  const todayAddedWordsCount = useMemo(() => {
    return (sharedState.custom_vocab || []).filter((w: any) => w?.note_date === todayStr).length;
  }, [sharedState.custom_vocab, todayStr]);

  const streak = useMemo(
    () => calculateMissionStreak(sharedState.daily_missions, todayStr),
    [sharedState.daily_missions, todayStr]
  );

  // Persist helper for today's mission record
  const updateTodayMission = (
    updater: (prev: DailyMissionRecord) => DailyMissionRecord,
    extraUpdates?: Partial<SharedState>
  ) => {
    const nextRec = updater(todayMission);
    const nextAll = {
      ...(sharedState.daily_missions || {}),
      [todayStr]: nextRec,
    };
    const nextState: SharedState = {
      ...sharedState,
      ...(extraUpdates || {}),
      daily_missions: nextAll,
    };
    setSharedState(nextState);
    saveSharedState({
      ...(extraUpdates || {}),
      daily_missions: nextAll,
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

  const openBlockWizard = (block: MissionBlockDef) => {
    const existing = todayMission.blocks?.[block.id];
    setActiveBlockId(block.id);
    setSessionElapsedSec(existing?.elapsedSec || 0);
    setTimerRunning(existing?.status !== 'done');
    setFiveMinSec(300);
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
            subject: existing?.subject,
          },
        },
      }));
    }
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
    };
    const nextStep = curState.currentStep + 1;

    if (nextStep >= activeBlock.steps.length) {
      // Completed the block!
      const alreadyDone = curState.status === 'done';
      const targetSec = activeBlock.minutes * 60;
      const savedMinutes = Math.floor((targetSec - sessionElapsedSec) / 60);
      setTimerRunning(false);
      setFiveMinRunning(false);

      const bonus = alreadyDone ? 0 : 20;
      updateTodayMission(
        (prev) => ({
          ...prev,
          blocks: {
            ...prev.blocks,
            [activeBlock.id]: {
              ...curState,
              status: 'done',
              currentStep: activeBlock.steps.length - 1,
              elapsedSec: sessionElapsedSec,
              completedAt: new Date().toISOString(),
            },
          },
        }),
        bonus > 0 ? { score: (sharedState.score || 0) + bonus } : undefined
      );

      if (savedMinutes >= 3) {
        setEarlyFinishMsg(
          `太高效了！你提前完成了「${activeBlock.title}」，省下来的 ${savedMinutes} 分钟归你自由支配！${bonus > 0 ? '（积分 +20）' : ''}`
        );
      } else {
        setEarlyFinishMsg(
          `太棒了！「${activeBlock.title}」已通关！${bonus > 0 ? '积分 +20 🎉' : ''}`
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
          },
        },
      }));
    }
  };

  const handleSelectSubject = (subjectLabel: string) => {
    if (!activeBlock) return;
    const curState = todayMission.blocks?.[activeBlock.id] || {
      status: 'in_progress' as const,
      currentStep: 0,
      elapsedSec: sessionElapsedSec,
    };
    updateTodayMission((prev) => ({
      ...prev,
      blocks: {
        ...prev.blocks,
        [activeBlock.id]: {
          ...curState,
          subject: subjectLabel,
        },
      },
    }));
  };

  const handleSaveVocab = (
    nextCustomVocab: any[],
    nextUnitDates: Record<string, string>,
    addedCount: number
  ) => {
    const bonus = addedCount > 0 ? 5 * addedCount : 0;
    const nextScore = (sharedState.score || 0) + bonus;
    const nextState: SharedState = {
      ...sharedState,
      custom_vocab: nextCustomVocab,
      unit_study_dates: nextUnitDates,
      score: nextScore,
    };
    setSharedState(nextState);
    saveSharedState({
      custom_vocab: nextCustomVocab,
      unit_study_dates: nextUnitDates,
      score: nextScore,
    });
  };

  const handleUpdateSrs = (nextSrs: Record<string, VocabSrsEntry>) => {
    setSharedState((prev) => ({ ...prev, vocab_srs: nextSrs }));
    saveSharedState({ vocab_srs: nextSrs });
  };

  const handleCompleteFlashcardSlot = (slot: VocabSlot, reviewedCount: number) => {
    const alreadyChecked = todayMission.vocabChecks?.[slot];
    const bonus = alreadyChecked ? 0 : 10;
    updateTodayMission(
      (prev) => ({
        ...prev,
        vocabChecks: {
          ...(prev.vocabChecks || { morning: false, afternoon: false, night: false }),
          [slot]: true,
        },
      }),
      bonus > 0 ? { score: (sharedState.score || 0) + bonus } : undefined
    );
    if (reviewedCount === 0) {
      setActiveFlashcardSlot(null);
    }
  };

  // Compute overall progress percentage
  const totalCheckUnits = 3 + blocks.length; // 3 vocab checks + main blocks
  const doneCheckUnits =
    (todayMission.vocabChecks?.morning ? 1 : 0) +
    (todayMission.vocabChecks?.afternoon ? 1 : 0) +
    (todayMission.vocabChecks?.night ? 1 : 0) +
    blocks.filter((b) => todayMission.blocks?.[b.id]?.status === 'done').length;
  const progressPct = Math.round((doneCheckUnits / Math.max(1, totalCheckUnits)) * 100);

  const handleConfirmParentStamp = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() !== PARENT_PIN) {
      setPinError('家长确认码不对哦（默认 1234）');
      return;
    }
    const alreadyApproved = todayMission.parentApproval?.approved;
    const bonus = alreadyApproved ? 0 : 30;
    updateTodayMission(
      (prev) => ({
        ...prev,
        parentApproval: {
          checkedBook: prev.parentApproval?.checkedBook ?? true,
          heardSummary: prev.parentApproval?.heardSummary ?? true,
          approved: true,
          approvedAt: new Date().toISOString(),
        },
      }),
      bonus > 0 ? { score: (sharedState.score || 0) + bonus } : undefined
    );
    setShowPinModal(false);
    setPinInput('');
    setPinError('');
    setCelebrationMsg('🎊 爸爸妈妈验收盖章成功！今日全线通关，奖励 +30 积分！');
    setTimeout(() => setCelebrationMsg(null), 5000);
  };

  // Active Wizard Full-Focus View
  if (activeBlock) {
    const blockState = todayMission.blocks?.[activeBlock.id] || {
      status: 'in_progress' as const,
      currentStep: 0,
      elapsedSec: sessionElapsedSec,
    };
    const stepIndex = Math.min(blockState.currentStep || 0, activeBlock.steps.length - 1);
    const stepDef = activeBlock.steps[stepIndex];
    const remainingSec = Math.max(0, activeBlock.minutes * 60 - sessionElapsedSec);
    const isOvertime = sessionElapsedSec > activeBlock.minutes * 60;

    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '20px 16px 60px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          {/* Top sticky bar with big timer */}
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
              marginBottom: 20,
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
              保存并返回控制台
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                  {isOvertime ? '已超过建议时长' : '区块倒计时'}（已专注 {formatElapsedHuman(sessionElapsedSec)}）
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
                  width: 46,
                  height: 46,
                  borderRadius: 999,
                  border: 'none',
                  background: timerRunning ? '#f59e0b' : activeBlock.accent,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title={timerRunning ? '暂停计时' : '继续计时'}
              >
                {timerRunning ? <Pause size={20} /> : <Play size={20} />}
              </button>
            </div>
          </div>

          {/* Step progress indicators */}
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
              <p style={{ margin: '0 0 28px', fontSize: 18, color: '#334155', lineHeight: 1.6 }}>
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
                返回今日控制台
              </button>
            </div>
          ) : (
            <div
              style={{
                background: '#ffffff',
                borderRadius: 24,
                padding: '28px 26px',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    padding: '5px 12px',
                    borderRadius: 999,
                    background: activeBlock.bg,
                    color: activeBlock.accent,
                  }}
                >
                  {activeBlock.icon} {activeBlock.title} · 第 {stepIndex + 1} / {activeBlock.steps.length} 步
                </span>
              </div>

              <h2 style={{ margin: '8px 0 14px', fontSize: 26, color: '#0f172a', lineHeight: 1.3 }}>
                {stepDef.title}
              </h2>

              <p style={{ margin: '0 0 22px', fontSize: 18, color: '#334155', lineHeight: 1.7 }}>
                {stepDef.instruction}
              </p>

              {/* Special interactive widget per step kind */}
              {stepDef.kind === 'vocab_recorder' && (
                <div style={{ marginBottom: 22 }}>
                  <QuickVocabRecorder
                    todayStr={todayStr}
                    customVocab={sharedState.custom_vocab || []}
                    unitStudyDates={sharedState.unit_study_dates || {}}
                    defaultCategory="school"
                    onSaveVocab={handleSaveVocab}
                  />
                  {stepDef.hint && (
                    <p style={{ margin: '10px 0 0', fontSize: 13, color: '#64748b' }}>
                      💡 {stepDef.hint}
                    </p>
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
                    to="/"
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
                    🚀 去首页刷题
                    <ChevronRight size={18} />
                  </Link>
                </div>
              )}

              {stepDef.kind === 'history_audio' && (
                <div
                  style={{
                    marginBottom: 22,
                    padding: 20,
                    borderRadius: 18,
                    background: '#edf5f0',
                    border: '1px solid #c9ddd4',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 16,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#224943' }}>
                      🏛️ 希腊历史故事馆（三、四年级全 91 课）
                    </div>
                    <div style={{ fontSize: 13, color: '#3b645c', marginTop: 4 }}>
                      听完 1 集双语故事 + 点读片尾新词卡即可回来通关
                    </div>
                  </div>
                  <Link
                    to="/history"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '13px 22px',
                      borderRadius: 14,
                      background: '#224943',
                      color: '#fff',
                      textDecoration: 'none',
                      fontWeight: 800,
                      fontSize: 16,
                    }}
                  >
                    <Headphones size={18} />
                    打开历史故事馆
                  </Link>
                </div>
              )}

              {stepDef.kind === 'subject_picker' && (
                <div style={{ marginBottom: 22 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {SUBJECT_OPTIONS.map((subj) => {
                      const selected = blockState.subject === subj.label;
                      return (
                        <button
                          key={subj.id}
                          type="button"
                          onClick={() => handleSelectSubject(subj.label)}
                          style={{
                            padding: '12px 18px',
                            borderRadius: 14,
                            border: selected ? '2px solid #7c3aed' : '1.5px solid #cbd5e1',
                            background: selected ? '#f5f3ff' : '#fff',
                            color: selected ? '#6d28d9' : '#334155',
                            fontWeight: 700,
                            fontSize: 16,
                            cursor: 'pointer',
                          }}
                        >
                          {selected ? '✅ ' : ''}
                          {subj.label}
                        </button>
                      );
                    })}
                  </div>
                  {blockState.subject?.includes('历史') && (
                    <div
                      style={{
                        marginTop: 14,
                        padding: '14px 16px',
                        borderRadius: 14,
                        background: '#edf5f0',
                        border: '1px solid #c9ddd4',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#224943' }}>
                        💡 历史预习捷径：先听网站里对应课次的双语故事，再扫课本快 3 倍！
                      </span>
                      <Link
                        to="/history"
                        style={{
                          padding: '8px 14px',
                          borderRadius: 10,
                          background: '#224943',
                          color: '#fff',
                          textDecoration: 'none',
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        去听历史故事 →
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {stepDef.kind === 'five_min_scan' && (
                <div
                  style={{
                    marginBottom: 22,
                    padding: 18,
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
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#b45309' }}>
                      ⏱️ 5 分钟快扫旧词专属计时器
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
                        padding: '10px 18px',
                        borderRadius: 12,
                        border: 'none',
                        background: fiveMinRunning ? '#d97706' : '#f59e0b',
                        color: '#fff',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {fiveMinRunning ? '暂停 5 分钟' : '开始 5 分钟快扫'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFiveMinRunning(false);
                        setFiveMinSec(300);
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: '1px solid #fcd34d',
                        background: '#fff',
                        color: '#92400e',
                        cursor: 'pointer',
                      }}
                      title="重置"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step navigation footer */}
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
      </div>
    );
  }

  // Main Daily Mission Dashboard View
  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fb', padding: '18px 16px 64px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Celebration Toast */}
        {celebrationMsg && (
          <div
            style={{
              marginBottom: 16,
              padding: '16px 20px',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #059669, #10b981)',
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              textAlign: 'center',
              boxShadow: '0 10px 26px rgba(16, 185, 129, 0.3)',
            }}
          >
            {celebrationMsg}
          </div>
        )}

        {/* Top Navigation Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 14px',
                borderRadius: 12,
                background: '#fff',
                border: '1px solid #dbe4ef',
                color: '#1e293b',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              <ArrowLeft size={16} />
              返回刷题首页
            </Link>
            <Link
              to="/history"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 14px',
                borderRadius: 12,
                background: '#edf5f0',
                border: '1px solid #c9ddd4',
                color: '#224943',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              🏛️ 历史故事馆
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setShowQuickRecorder((v) => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '10px 16px',
              borderRadius: 12,
              border: 'none',
              background: showQuickRecorder ? '#0f172a' : '#0071E3',
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 113, 227, 0.25)',
            }}
          >
            <Mic size={16} />
            {showQuickRecorder ? '收起语音录词' : `语音录入学校生词 / 课堂笔记（今日 ${todayAddedWordsCount}）`}
          </button>
        </div>

        {/* Collapsible Standalone Voice Vocab / Notes Recorder */}
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

        {/* Hero Status Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0b4f9c 0%, #0071e3 55%, #2563eb 100%)',
            color: '#fff',
            borderRadius: 24,
            padding: '24px 24px 20px',
            marginBottom: 20,
            boxShadow: '0 14px 36px rgba(0, 113, 227, 0.22)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.18)', padding: '4px 10px', borderRadius: 999 }}>
                  {todayStr} · {getWeekdayLabel(todayStr)}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.18)', padding: '4px 10px', borderRadius: 999 }}>
                  {activeMode === 'weekday' ? '工作日 3×40分模式' : activeMode === 'saturday' ? '周六清盘模式' : '周日收心模式'}
                </span>
              </div>
              <h1 style={{ margin: '10px 0 4px', fontSize: 28, fontWeight: 800 }}>
                🎯 Leon 今日学习通关台
              </h1>
              <p style={{ margin: 0, fontSize: 14, opacity: 0.92 }}>
                不用动脑子想方法：跟着屏幕一步步点完，做完了就是做完了！
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ background: 'rgba(255,255,255,0.16)', borderRadius: 14, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, opacity: 0.85, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                  <Flame size={13} /> 连续通关
                </div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{streak} 天</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.16)', borderRadius: 14, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, opacity: 0.85, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                  <Trophy size={13} /> 总积分
                </div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{sharedState.score || 0}</div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              <span>今日总进度</span>
              <span>{progressPct}%（{doneCheckUnits} / {totalCheckUnits}）</span>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
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

          {/* Mode toggles */}
          <div
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px solid rgba(255,255,255,0.18)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {activeMode === 'weekday' ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
                    border: '1px solid rgba(255,255,255,0.4)',
                    background: todayMission.lightPreviewMode ? '#fde047' : 'rgba(255,255,255,0.12)',
                    color: todayMission.lightPreviewMode ? '#713f12' : '#fff',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {todayMission.lightPreviewMode ? '⚡ 已开启轻享模式（区块三 20 分）' : '⚡ 忙碌日切轻享模式'}
                </button>
              </div>
            ) : (
              <span style={{ fontSize: 13, opacity: 0.9 }}>周末节奏：重清盘、保手感、留足休息时间</span>
            )}

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>切换视图：</span>
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

        {/* Fragment Section: Daily 3x Flashcard Vocab */}
        <section
          style={{
            background: '#ffffff',
            borderRadius: 20,
            padding: 20,
            marginBottom: 20,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="#f59e0b" />
                碎片背单词（每天 3 次 · 每次 5–10 分钟）
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>
                自动优先抽你语音录入的学校生词、课堂笔记词和 SRS 到期旧词
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {(
              [
                { slot: 'morning' as VocabSlot, label: '🌅 早：新词 + 旧词', desc: '早起 / 午饭前 · 12词' },
                { slot: 'afternoon' as VocabSlot, label: '☀️ 中：遮中文测新词', desc: '下午区块间隙 · 10词' },
                { slot: 'night' as VocabSlot, label: '🌙 晚：睡前总抽查', desc: '睡前锁存记忆 · 10词' },
              ]
            ).map((item) => {
              const checked = Boolean(todayMission.vocabChecks?.[item.slot]);
              return (
                <button
                  key={item.slot}
                  type="button"
                  onClick={() => setActiveFlashcardSlot(item.slot)}
                  style={{
                    textAlign: 'left',
                    padding: '14px 16px',
                    borderRadius: 16,
                    border: checked ? '2px solid #10b981' : '1.5px solid #e2e8f0',
                    background: checked ? '#ecfdf5' : '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: checked ? '#047857' : '#0f172a' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 12, color: checked ? '#059669' : '#64748b', marginTop: 3 }}>
                      {checked ? '今日已打卡 ✅（可再刷）' : item.desc}
                    </div>
                  </div>
                  {checked ? <CheckCircle2 size={22} color="#10b981" /> : <ChevronRight size={18} color="#94a3b8" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Main 120-Minute Blocks (3 x 40m on weekdays) */}
        <section style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={20} color="#0071E3" />
              {activeMode === 'weekday'
                ? '今日三大攻坚区块（3 × 40 分钟 = 120 分钟）'
                : activeMode === 'saturday'
                  ? '周六专注任务区'
                  : '周日轻松收心区'}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {blocks.map((block) => {
              const st = todayMission.blocks?.[block.id];
              const isDone = st?.status === 'done';
              const isInProgress = st?.status === 'in_progress';
              const elapsed = st?.elapsedSec || 0;

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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span
                        style={{
                          fontSize: 28,
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          background: block.bg,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {block.icon}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          padding: '5px 11px',
                          borderRadius: 999,
                          background: isDone ? '#ecfdf5' : isInProgress ? '#fffbeb' : '#f1f5f9',
                          color: isDone ? '#047857' : isInProgress ? '#b45309' : '#64748b',
                        }}
                      >
                        {isDone
                          ? `已通关 ✅ · ${formatElapsedHuman(elapsed)}`
                          : isInProgress
                            ? `进行中 · 第 ${(st?.currentStep || 0) + 1}/${block.steps.length} 步`
                            : `未开始 · ${block.minutes} 分钟`}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 6px', fontSize: 18, color: '#0f172a' }}>{block.title}</h3>
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{block.subtitle}</p>

                    {/* Live sync hint for Block 2 */}
                    {block.id === 'block_web' && (
                      <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: '#0071E3', background: '#eff6ff', padding: '6px 10px', borderRadius: 8 }}>
                        今日网站刷题已同步：{todayWebCompleted.length} / 8 模块完成
                      </div>
                    )}
                    {block.id === 'block_school' && todayAddedWordsCount > 0 && (
                      <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: '#0f766e', background: '#f0fdfa', padding: '6px 10px', borderRadius: 8 }}>
                        今日已语音入库 {todayAddedWordsCount} 个生词/笔记
                      </div>
                    )}
                    {st?.subject && (
                      <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: '#6d28d9', background: '#f5f3ff', padding: '6px 10px', borderRadius: 8 }}>
                        已选预习科目：{st.subject}
                      </div>
                    )}
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
                    {isDone ? '再看一遍步骤' : isInProgress ? '继续向导通关 →' : '开始计时并进入向导 →'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Module E: Parent 2-Minute Zero-Greek Verification */}
        <section
          style={{
            background: '#ffffff',
            borderRadius: 22,
            padding: 22,
            border: todayMission.parentApproval?.approved ? '2px solid #10b981' : '1.5px solid #e2e8f0',
            boxShadow: '0 6px 20px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 19, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={20} color="#059669" />
                家长 2 分钟无门槛验收区（不懂希腊语也能验收）
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                睡前花 2 分钟核对动作与真实用时，给 Leon 盖章加分！
              </p>
            </div>
            {todayMission.parentApproval?.approved && (
              <span style={{ padding: '6px 14px', borderRadius: 999, background: '#ecfdf5', color: '#047857', fontWeight: 800, fontSize: 14 }}>
                🏅 今日已验收盖章
              </span>
            )}
          </div>

          {/* Transparent actual elapsed time summary for parent */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            {blocks.map((b) => {
              const st = todayMission.blocks?.[b.id];
              return (
                <div
                  key={b.id}
                  style={{
                    fontSize: 13,
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#334155',
                  }}
                >
                  {b.icon} {b.title.split('：')[1] || b.title}：
                  <strong>{st?.elapsedSec ? formatElapsedHuman(st.elapsedSec) : '0 分钟'}</strong>
                </div>
              );
            })}
            <div
              style={{
                fontSize: 13,
                padding: '8px 12px',
                borderRadius: 10,
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                color: '#0369a1',
              }}
            >
              <BookOpen size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
              今日语音入库生词：<strong>{todayAddedWordsCount} 个</strong>
            </div>
          </div>

          {/* Two parent check items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: '#1e293b', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(todayMission.parentApproval?.checkedBook)}
                onChange={(e) =>
                  updateTodayMission((prev) => ({
                    ...prev,
                    parentApproval: {
                      checkedBook: e.target.checked,
                      heardSummary: Boolean(prev.parentApproval?.heardSummary),
                      approved: Boolean(prev.parentApproval?.approved),
                      approvedAt: prev.parentApproval?.approvedAt,
                    },
                  }))
                }
                style={{ width: 20, height: 20 }}
              />
              已翻看课本 / 私教书，确认有铅笔中文标注和 <strong>?</strong> 标记
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: '#1e293b', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(todayMission.parentApproval?.heardSummary)}
                onChange={(e) =>
                  updateTodayMission((prev) => ({
                    ...prev,
                    parentApproval: {
                      checkedBook: Boolean(prev.parentApproval?.checkedBook),
                      heardSummary: e.target.checked,
                      approved: Boolean(prev.parentApproval?.approved),
                      approvedAt: prev.parentApproval?.approvedAt,
                    },
                  }))
                }
                style={{ width: 20, height: 20 }}
              />
              已听 Leon 用<strong>中文</strong>讲顺了明天要预习的课文大意
            </label>
          </div>

          <button
            type="button"
            disabled={Boolean(todayMission.parentApproval?.approved)}
            onClick={() => {
              setPinInput('');
              setPinError('');
              setShowPinModal(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '13px 24px',
              borderRadius: 14,
              border: 'none',
              background: todayMission.parentApproval?.approved ? '#cbd5e1' : '#059669',
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              cursor: todayMission.parentApproval?.approved ? 'default' : 'pointer',
            }}
          >
            <Lock size={16} />
            {todayMission.parentApproval?.approved ? '今日已盖章验收 ✅' : '确认今日通关，家长盖章！（+30 分）'}
          </button>
        </section>
      </div>

      {/* Daily Flashcard Modal */}
      {activeFlashcardSlot && (
        <DailyFlashcardModal
          slot={activeFlashcardSlot}
          todayStr={todayStr}
          customVocab={sharedState.custom_vocab || []}
          vocabSrs={sharedState.vocab_srs || {}}
          onUpdateSrs={handleUpdateSrs}
          onCompleteSlot={handleCompleteFlashcardSlot}
          onClose={() => setActiveFlashcardSlot(null)}
        />
      )}

      {/* Parent PIN confirmation modal */}
      {showPinModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>🔒 家长盖章确认</h3>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#64748b' }}>
              请输入 4 位家长确认码（默认 1234），也可以直接在家长后台手机端一键盖章。
            </p>
            <form onSubmit={handleConfirmParentStamp}>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="输入 4 位确认码"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError('');
                }}
                autoFocus
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  fontSize: 22,
                  letterSpacing: 6,
                  textAlign: 'center',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1.5px solid #cbd5e1',
                  marginBottom: 10,
                }}
              />
              {pinError && <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 10 }}>{pinError}</div>}
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: 12,
                  border: 'none',
                  background: '#059669',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                确认盖章！
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyMissionHall;

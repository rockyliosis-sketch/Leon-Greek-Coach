import { doc, onSnapshot, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface DailyMissionBlockState {
  status: 'idle' | 'in_progress' | 'done';
  currentStep: number;
  elapsedSec: number;
  /** 正在计时时的墙钟起始毫秒时间戳（Date.now()）；null/undefined 表示已暂停 */
  runningSinceMs?: number | null;
  extraMinutes?: number;
  subject?: string;
  wordsAdded?: number;
  completedAt?: string;
}

export interface VocabSlotTimerState {
  elapsedSec: number;
  /** 正在计时时的墙钟起始毫秒时间戳（Date.now()）；null/undefined 表示已暂停 */
  runningSinceMs?: number | null;
  completed: boolean;
}

export interface OldNotesTimerState {
  elapsedSec: number;
  runningSinceMs?: number | null;
}

export interface PreviewSubjectLog {
  id: string;
  subject: string;
  bookId?: string;
  fromPage?: number;
  toPage?: number;
  pages: string;
  actions: string[];
  newWordsCount: number;
  summary: string;
  aiKeyPoints?: string[];
}

export interface WorkbookCheckLog {
  id: string;
  bookName: string;
  bookId?: string;
  fromPage: number;
  toPage: number;
  actions: string[];
  note: string;
}

export interface SchoolSubjectTaskLog {
  subject: string;
  bookId?: string;
  fromPage: number;
  toPage: number;
  hwActions?: string[];
  questionMarks?: number;
  note?: string;
}

export interface G3ChallengeDailyLog {
  unitId: string;
  unitTitle: string;
  lessonId: string;
  lessonTitle: string;
  tbBookId: string;
  tbPages: string;
  wbBookId: string;
  wbPages: string;
  quizPassed: boolean;
  wordsAdded: number;
}

export interface DailyBlockLogs {
  school?: {
    subjects: string[];
    pages: string;
    summary: string;
    items?: SchoolSubjectTaskLog[];
  };
  tutor?: {
    mode: 'review' | 'both' | 'preview';
    book?: string;
    unitNo?: number;
    fromPage?: number;
    toPage?: number;
    pages: string;
    questionMarks: number;
    actions?: string[];
    summary: string;
    previewBook?: string;
    previewFromPage?: number;
    previewToPage?: number;
    previewQuestionMarks?: number;
    previewActions?: string[];
    previewSummary?: string;
  };
  oldNotesReview?: {
    subject: string;
    bookId?: string;
    fromPage: number;
    toPage: number;
    actions?: string[];
    note?: string;
  };
  g3Challenge?: G3ChallengeDailyLog;
  previews?: PreviewSubjectLog[];
  workbookChecks?: WorkbookCheckLog[];
  workbookCheck?: {
    bookName: string;
    fromPage: number;
    toPage: number;
    actions: string[];
    note: string;
  };
}

export interface DailyMissionRecord {
  date: string;
  hasTutorClass: boolean;
  lightPreviewMode: boolean;
  vocabChecks: {
    morning: boolean;
    afternoon: boolean;
    night: boolean;
  };
  vocabTimers?: {
    morning: VocabSlotTimerState;
    afternoon: VocabSlotTimerState;
    night: VocabSlotTimerState;
  };
  oldNotesTimer?: OldNotesTimerState;
  historyLog?: {
    listened: boolean;
    episodesCount: number;
    episodeNote: string;
    episodeIds?: string[];
  };
  blockLogs?: DailyBlockLogs;
  blocks: Record<string, DailyMissionBlockState>;
  parentApproval?: {
    checkedBook: boolean;
    heardSummary: boolean;
    approved: boolean;
    approvedAt?: string;
  };
}

export interface VocabSrsEntry {
  level: number;
  nextDue: string;
  lastReviewed: string;
}

export interface CircledBookWord {
  raw: string;
  lemma: string;
  chinese: string;
  formNote?: string;
  sentence?: string;
  date: string;
}

export interface G3GlossaProgressState {
  completedLessonIds: string[];
  completedUnitIds: string[];
  /** 按日期记录当天已通关的三年级小课 ID，例如 { "2026-11-26": "g3_u7_l1" } */
  dailyCompletedLesson?: Record<string, string>;
  lastCompletedDate?: string;
}

export interface TextbookPreferencesState {
  /** 记住每个科目上次选中的具体册别 ID，如 { "希腊语 (Γλώσσα)": "g4-glossa-a" } */
  selectedBookBySubject?: Record<string, string>;
  /** 记住每个练习册科目上次选中的具体册别 ID */
  selectedWorkbookBySubject?: Record<string, string>;
  /** 孩子在各课本具体页码圈出/点选过的不会生词与笔记，按 `${bookId}:${page}` 索引 */
  circledWordsByBookPage?: Record<string, CircledBookWord[]>;
}

export interface SharedState {
  unit_study_dates: Record<string, string>;
  /** 按课本页码的课堂进度：每次课记一笔「上到第几页」 */
  page_progress?: Array<{
    id: string;
    date: string;
    bookId: string;
    upToPage: number;
    note?: string;
  }>;
  custom_vocab: any[];
  score: number;
  completed_date_modules: Record<string, string[]>;
  /**
   * 「今天这个模块还欠着哪几道题」——学生点了「跳过此题」才会记进来。
   * 形如 { '2026-09-06': { spelling: ['1234'], matching: ['round-2'] } }。
   * 欠账没清空, 这个模块首页就不给绿勾, 只挂一个红点 + 欠几道的数字。
   */
  skipped_date_modules?: Record<string, Record<string, string[]>>;
  daily_rewards_awarded: Record<string, boolean>;
  alternative_translations?: Record<string, string[]>;
  user_feedback?: Array<{
    id: string;
    questionId: number | string;
    greek: string;
    expected: string;
    userTyped: string;
    date: string;
    status: 'pending' | 'approved' | 'rejected';
    /** 报错原因：alt_answer=我的答案也对；bad_word=这道题/这个词有问题；other=孩子自己描述 */
    reason?: 'alt_answer' | 'bad_word' | 'other';
    /** 孩子自己写的一句话（最多 200 字），家长后台直接显示 */
    note?: string;
    /** 出问题的词（希腊语原形），家长可据此停用该词 */
    wordKey?: string;
    /** 报错时孩子页面跑的是哪一版。2026-10-04 起记: 旧页面没刷新会让已修好的题照样被报 */
    v?: string;
  }>;
  /** 家长停用的词（希腊语原形，已归一化）——不再出题 */
  disabled_words?: string[];
  /** 逐题作答记录（用于每周正确率报告）。字段刻意用短名，控制体积 */
  answer_log?: Array<{
    d: string;        // 日期 YYYY-MM-DD
    m: string;        // 模块: spelling/quiz/tf/grzh/zhgr/glossary/matching
    q: string;        // 题目标识（词或题 id）
    ok: boolean;      // 是否答对
    h: boolean;       // 是否看了提示/答案
    ms: number;       // 本题耗时（毫秒）
    v?: string;       // 当时页面的版本号（2026-10-04 起）
  }>;
  /** 每日学习通关系统记录（按 YYYY-MM-DD 索引） */
  daily_missions?: Record<string, DailyMissionRecord>;
  /** 轻量 SRS 闪卡背词进度（按归一化希腊语词索引） */
  vocab_srs?: Record<string, VocabSrsEntry>;
  /** 三年级《语言》课本+练习册跳单元强制闯关进度 */
  g3_glossa_progress?: G3GlossaProgressState;
  /** 课本册别记忆与页内圈词笔记 */
  textbook_preferences?: TextbookPreferencesState;
}

export const getInitialLocalState = (): SharedState => {
  let unit_study_dates = {};
  let custom_vocab = [];
  let score = 0;
  let completed_date_modules = {};
  let skipped_date_modules = {};
  let daily_rewards_awarded = {};
  let alternative_translations = {};
  let user_feedback = [];
  let page_progress: SharedState['page_progress'] = [];
  let disabled_words: string[] = [];
  let answer_log: SharedState['answer_log'] = [];
  let daily_missions: Record<string, DailyMissionRecord> = {};
  let vocab_srs: Record<string, VocabSrsEntry> = {};
  let g3_glossa_progress: G3GlossaProgressState = { completedLessonIds: [], completedUnitIds: {}, dailyCompletedLesson: {} } as any;
  g3_glossa_progress = { completedLessonIds: [], completedUnitIds: [], dailyCompletedLesson: {} };
  let textbook_preferences: TextbookPreferencesState = {};

  try {
    const g3p = localStorage.getItem("leon_g3_glossa_progress");
    if (g3p) g3_glossa_progress = JSON.parse(g3p);
  } catch (e) {}

  try {
    const tbp = localStorage.getItem("leon_textbook_preferences");
    if (tbp) textbook_preferences = JSON.parse(tbp);
  } catch (e) {}

  try {
    const dm = localStorage.getItem("leon_daily_missions");
    if (dm) daily_missions = JSON.parse(dm);
  } catch (e) {}

  try {
    const vs = localStorage.getItem("leon_vocab_srs");
    if (vs) vocab_srs = JSON.parse(vs);
  } catch (e) {}

  try {
    const al = localStorage.getItem("leon_answer_log");
    if (al) answer_log = JSON.parse(al);
  } catch (e) {}

  try {
    const dw = localStorage.getItem("leon_disabled_words");
    if (dw) disabled_words = JSON.parse(dw);
  } catch (e) {}

  try {
    const pp = localStorage.getItem("leon_page_progress");
    if (pp) page_progress = JSON.parse(pp);
  } catch (e) {}

  try {
    const dates = localStorage.getItem("leon_unit_study_dates");
    if (dates) unit_study_dates = JSON.parse(dates);
  } catch (e) {}

  try {
    const custom = localStorage.getItem("leon_custom_vocab");
    if (custom) custom_vocab = JSON.parse(custom);
  } catch (e) {}

  try {
    const s = localStorage.getItem("leon_score");
    if (s) score = parseInt(s, 10);
  } catch (e) {}

  try {
    const completed = localStorage.getItem("leon_completed_date_modules");
    if (completed) completed_date_modules = JSON.parse(completed);
  } catch (e) {}

  try {
    const skipped = localStorage.getItem("leon_skipped_date_modules");
    if (skipped) skipped_date_modules = JSON.parse(skipped);
  } catch (e) {}

  try {
    const rewards = localStorage.getItem("leon_daily_rewards_awarded");
    if (rewards) daily_rewards_awarded = JSON.parse(rewards);
  } catch (e) {}

  try {
    const alts = localStorage.getItem("leon_alternative_translations");
    if (alts) alternative_translations = JSON.parse(alts);
  } catch (e) {}

  try {
    const feed = localStorage.getItem("leon_user_feedback");
    if (feed) user_feedback = JSON.parse(feed);
  } catch (e) {}

  return {
    unit_study_dates,
    page_progress,
    disabled_words,
    answer_log,
    custom_vocab,
    score,
    completed_date_modules,
    skipped_date_modules,
    daily_rewards_awarded,
    alternative_translations,
    user_feedback,
    daily_missions,
    vocab_srs,
    g3_glossa_progress,
    textbook_preferences,
  };
};

export type DbConnectionStatus = 'connecting' | 'connected-server' | 'connected-cache' | 'error';

export const subscribeToSharedState = (
  onUpdate: (state: SharedState) => void,
  onStatusChange?: (status: DbConnectionStatus, error?: Error) => void
) => {
  const docRef = doc(db, "leon_greek_coach", "shared_state");

  // Call onUpdate immediately with local state to avoid blank/zero UI during connection
  const localCache = getInitialLocalState();
  onUpdate(localCache);
  if (onStatusChange) onStatusChange('connecting');

  // 上一次真正推给页面的内容指纹。
  // Firestore 每写一次就会回声一次快照(本地待写 + 服务端确认各一次),
  // 从前每回声一次就 onUpdate 一次全新对象, 页面所有 useMemo 全部重算 ——
  // 于是选择题的选项当场重新洗牌、拼字模块把已经敲进去的字母清空。
  // 内容没变就不再往上推, 这些「自己写自己触发」的重算全部消失。
  let lastSignature = '';

  const onLocalUpdate = () => {
    const next = getInitialLocalState();
    let signature = '';
    try { signature = JSON.stringify(next); } catch (e) { signature = ''; }
    if (!signature || signature !== lastSignature) {
      lastSignature = signature;
      onUpdate(next);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('leon-shared-state-updated', onLocalUpdate);
  }

  const unsubSnapshot = onSnapshot(
    docRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SharedState;
        // Sync back to localStorage as a cache/backup
        try {
          localStorage.setItem("leon_unit_study_dates", JSON.stringify(data.unit_study_dates || {}));
          localStorage.setItem("leon_page_progress", JSON.stringify(data.page_progress || []));
          localStorage.setItem("leon_disabled_words", JSON.stringify(data.disabled_words || []));
          localStorage.setItem("leon_answer_log", JSON.stringify(data.answer_log || []));
          localStorage.setItem("leon_custom_vocab", JSON.stringify(data.custom_vocab || []));
          localStorage.setItem("leon_score", (data.score || 0).toString());
          localStorage.setItem("leon_completed_date_modules", JSON.stringify(data.completed_date_modules || {}));
          localStorage.setItem("leon_skipped_date_modules", JSON.stringify(data.skipped_date_modules || {}));
          localStorage.setItem("leon_daily_rewards_awarded", JSON.stringify(data.daily_rewards_awarded || {}));
          localStorage.setItem("leon_alternative_translations", JSON.stringify(data.alternative_translations || {}));
          localStorage.setItem("leon_user_feedback", JSON.stringify(data.user_feedback || []));
          localStorage.setItem("leon_daily_missions", JSON.stringify(data.daily_missions || {}));
          localStorage.setItem("leon_vocab_srs", JSON.stringify(data.vocab_srs || {}));
          if (data.g3_glossa_progress) {
            localStorage.setItem("leon_g3_glossa_progress", JSON.stringify(data.g3_glossa_progress));
          }
          if (data.textbook_preferences) {
            localStorage.setItem("leon_textbook_preferences", JSON.stringify(data.textbook_preferences));
          }
        } catch (e) {}
        
        const next: SharedState = {
          unit_study_dates: data.unit_study_dates || {},
          page_progress: data.page_progress || [],
          disabled_words: data.disabled_words || [],
          answer_log: data.answer_log || [],
          custom_vocab: data.custom_vocab || [],
          score: data.score || 0,
          completed_date_modules: data.completed_date_modules || {},
          skipped_date_modules: data.skipped_date_modules || {},
          daily_rewards_awarded: data.daily_rewards_awarded || {},
          alternative_translations: data.alternative_translations || {},
          user_feedback: data.user_feedback || [],
          daily_missions: data.daily_missions || {},
          vocab_srs: data.vocab_srs || {},
          g3_glossa_progress: data.g3_glossa_progress || { completedLessonIds: [], completedUnitIds: [], dailyCompletedLesson: {} },
          textbook_preferences: data.textbook_preferences || {},
        };

        // 内容一模一样就不往上推(见上面 lastSignature 的说明)
        let signature = '';
        try { signature = JSON.stringify(next); } catch (e) { signature = ''; }
        if (!signature || signature !== lastSignature) {
          lastSignature = signature;
          onUpdate(next);
        }

        if (onStatusChange) {
          onStatusChange(snapshot.metadata.fromCache ? 'connected-cache' : 'connected-server');
        }
      } else {
        // If Firestore document doesn't exist, we don't automatically create it from the iPad 
        // to avoid overwriting with empty/default state.
        // Instead, we just notify that we are connected but the document is empty.
        if (onStatusChange) {
          onStatusChange(snapshot.metadata.fromCache ? 'connected-cache' : 'connected-server');
        }
      }
    },
    (err) => {
      console.error("Firestore subscription error:", err);
      if (onStatusChange) {
        onStatusChange('error', err);
      }
    }
  );

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('leon-shared-state-updated', onLocalUpdate);
    }
    unsubSnapshot();
  };
};

const persistUpdatesToLocalStorage = (updates: Partial<SharedState>) => {
  try {
    if (updates.unit_study_dates) {
      localStorage.setItem("leon_unit_study_dates", JSON.stringify(updates.unit_study_dates));
    }
    if (updates.page_progress) {
      localStorage.setItem("leon_page_progress", JSON.stringify(updates.page_progress));
    }
    if (updates.disabled_words) {
      localStorage.setItem("leon_disabled_words", JSON.stringify(updates.disabled_words));
    }
    if (updates.answer_log) {
      localStorage.setItem("leon_answer_log", JSON.stringify(updates.answer_log));
    }
    if (updates.custom_vocab) {
      localStorage.setItem("leon_custom_vocab", JSON.stringify(updates.custom_vocab));
    }
    if (updates.score !== undefined) {
      localStorage.setItem("leon_score", updates.score.toString());
    }
    if (updates.completed_date_modules) {
      localStorage.setItem("leon_completed_date_modules", JSON.stringify(updates.completed_date_modules));
    }
    if (updates.skipped_date_modules) {
      localStorage.setItem("leon_skipped_date_modules", JSON.stringify(updates.skipped_date_modules));
    }
    if (updates.daily_rewards_awarded) {
      localStorage.setItem("leon_daily_rewards_awarded", JSON.stringify(updates.daily_rewards_awarded));
    }
    if (updates.alternative_translations) {
      localStorage.setItem("leon_alternative_translations", JSON.stringify(updates.alternative_translations));
    }
    if (updates.user_feedback) {
      localStorage.setItem("leon_user_feedback", JSON.stringify(updates.user_feedback));
    }
    if (updates.daily_missions) {
      localStorage.setItem("leon_daily_missions", JSON.stringify(updates.daily_missions));
    }
    if (updates.vocab_srs) {
      localStorage.setItem("leon_vocab_srs", JSON.stringify(updates.vocab_srs));
    }
    if (updates.g3_glossa_progress) {
      localStorage.setItem("leon_g3_glossa_progress", JSON.stringify(updates.g3_glossa_progress));
    }
    if (updates.textbook_preferences) {
      localStorage.setItem("leon_textbook_preferences", JSON.stringify(updates.textbook_preferences));
    }
  } catch (e) {}
};

export const saveSharedState = async (updates: Partial<SharedState>) => {
  // 1. 同步立即写入 localStorage，防止刷新/关闭标签/切后台导致未落盘丢失
  persistUpdatesToLocalStorage(updates);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('leon-shared-state-updated'));
  }

  const docRef = doc(db, "leon_greek_coach", "shared_state");
  try {
    await updateDoc(docRef, updates as any);
  } catch (err: any) {
    // 仅当文档尚不存在时回退 setDoc
    if (err?.code === "not-found") {
      try {
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) {
          const fullState = { ...getInitialLocalState(), ...updates };
          await setDoc(docRef, fullState);
          return;
        }
      } catch (innerErr) {
        console.error("Error creating Firestore doc:", innerErr);
      }
    }
    console.error("Error updating Firestore:", err);
  }
};

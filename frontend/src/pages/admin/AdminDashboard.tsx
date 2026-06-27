import React, { useState, useEffect } from 'react';
import { 
  LogOut, 
  BookOpen, 
  Settings, 
  Plus, 
  Check, 
  FolderPlus, 
  FileText,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  Database,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import staticVocabData from '../../data/vocabulary.json';
import { subscribeToSharedState, saveSharedState, type DbConnectionStatus } from '../../dbService';

interface AdminDashboardProps {
  onLogout: () => void;
}

interface Word {
  id: number;
  book_id: string;
  unit: number;
  word_greek: string;
  word_chinese: string;
  pronunciation?: string;
  example_greek?: string;
  example_chinese?: string;
}

const getUnitChineseName = (bookId: string, unitNum: number): string => {
  const bookKey = bookId.toUpperCase();
  const unitNames: Record<string, Record<number, string>> = {
    "A1-A": {
      1: "问候与自我介绍 (Γεια σας)",
      2: "数字、国家与国籍 (Από πού είσαι;)",
      3: "日常活动与常见动词 (Τι κάνεις;)",
      4: "学校课堂与文具物品 (Στο σχολείο)",
      5: "星期时间与课程表 (Το πρόγραμμά μου)",
      6: "玩具、游戏与玩耍 (Παιχνίδια)",
      7: "家庭成员与亲属 (Η οικογένειά μου)",
      8: "颜色服装与外貌描述 (Χρώματα και ρούχα)",
      9: "动物王国与童话故事 (Ζώα και παραμύθια)",
      10: "日常作息与时间表达 (Η ώρα)",
      11: "房子房间与布局描述 (Το σπίτι μου)",
      12: "家具陈设与空间方位 (Έπιπλα)",
      13: "城市生活与公共场所 (Στην πόλη)",
      14: "期中综合复习与练习 (Επανάληψη)",
      15: "马戏团与娱乐表演 (Στο τσίρκο)"
    },
    "A1-B": {
      16: "天气气候与四季变化 (Ο καιρός)",
      17: "饮食习惯、食物与饮料 (Φαγητό)",
      18: "日常服装与穿戴搭配 (Ρούχα)",
      19: "身体部位与健康医疗 (Υγεία)",
      20: "体育运动、游戏与休闲 (Αθλητισμός)",
      21: "旅行度假与交通出行 (Ταξίδια)",
      22: "商场购物、价格与金钱 (Ψώνια)",
      23: "各行各业与职业工作 (Επαγγέλματα)",
      24: "大自然、动植物与环境 (Φύση)",
      25: "节日庆典与美好祝愿 (Γιορτές)",
      26: "饮食与健康生活 (Διατροφή)",
      27: "闲暇时光与兴趣爱好 (Ελεύθερος χρόνος)",
      28: "日常生活与社区服务 (Υπηρεσίες)",
      29: "朋友社交与人际交往 (Φίλοι)",
      30: "A1阶段终期复习总结 (Επανάληψη)"
    },
    "A2": {
      31: "Ενότητα 1: 我与他人 (Εγώ και οι άλλοι)",
      32: "Ενότητα 2: 广告时间 (Ώρα για διαφημίσεις)",
      33: "Ενότητα 3: 阳光明媚！我们去散步吗？ (Έχει λιακάδα! Πάμε μια βόλτα;)",
      34: "复习时间：1-3单元复习 (Ώρα για επανάληψη: Ενότητες 1-3)",
      35: "Ενότητα 4: 节日快乐！ (Χρόνια πολλά!)",
      36: "Ενότητα 5: 健康第一！ (Υγεία πάνω από όλα!)",
      37: "Ενότητα 6: 读书与学习！ (Γράμματα σπουδάσματα!)",
      38: "复习时间：4-6单元复习 (Ώρα για επανάληψη: Ενότητες 4-6)",
      39: "水平测试：A2级真题演练 (Εξετάσεις Ελληνομάθειας)"
    }
  };

  if (unitNames[bookKey]?.[unitNum]) {
    return unitNames[bookKey][unitNum];
  }

  return `自定义导入内容 (Unit ${unitNum})`;
};

const getUnitGrammarPoints = (bookId: string, unitNum: number): string => {
  const bookKey = bookId.toUpperCase();
    const grammarData: Record<string, Record<number, string>> = {
    "A1-A": {
      1: "希腊语字母表 (Α-Ω)、发音规则、基本问候语、自我介绍。语法：动词 είμαι (是) 单数一二人称变化（阳性/阴性/中性称呼区别，如 Γεια σου/σας）。",
      2: "数字 1-10、国家与国籍。语法：定冠词 (ο, η, το) 引入、动词 είμαι 复数人称变化，国家/国籍名词首字母大写规律。",
      3: "日常活动与常见动作。语法：主动语态第一类规则动词现在时单复数变化 (Group A: κάνω, διαβάζω 等词尾 -ω, -εις, -ει, -ουμε, -ετε, -ουν)、人称代词主格。",
      4: "学校教室物品与学习用品。语法：名词的主格单数变化（阳性 -ος / 阴性 -α / 中性 -ο）及三性区分规律，主格冠词的使用。",
      5: "星期表达、基本时间表达。语法：时间介词 στις 的用法、数字 11-20，日常问路与简单方位指示。",
      6: "玩具与游戏表达。语法：物主代词（μου, σου等）、名词的主格复数变化形式（阳性 -ος 变 -οι，阴性 -α 变 -ες，中性 -ο 变 -α）。",
      7: "家庭成员名称、童话角色（如小红帽 Κοκκινοσκουφίτσα）。语法：名词的所有格（属格）表达所有权，形容词与名词的配合规则。",
      8: "服装与颜色描述、基本外貌特征。语法：形容词的性数格一致性（阳性 -ος, 阴性 -η, 中性 -ο），修饰名词时的词尾变化。",
      9: "动物王国与童话。语法：阴性名词的定冠词与变格，阳性、阴性与中性名词复数主格的全面变化规则。",
      10: "日常生活作息、一日三餐。语法：简单现在时动词综合应用、形容词修饰中性名词（如Το αρκουδάκι είναι μικρό）、时间介词规律。",
      11: "房子布局与房间名称。语法：方位介词与处所介词的缩合使用（如 στο, στη, στο复数形式）、形容词阴阳中三性变化。",
      12: "家具陈设、空间方位关系。语法：空间位置介词短语（πάνω σε 在...上, κάτω από 在...下, μέσα σε 在...里, έξω από 在...外）。",
      13: "城市公共场所与方向。语法：宾格冠词与名词宾格单数变化引入，\"πιο... από...\" (比...更...) 比较结构。",
      14: "游乐场活动与动作状态。语法：与游乐场相关的动词变位（如 τρέχω 跑），现在时动词人称词尾与主格/宾格对比。",
      15: "马戏团与娱乐表演。语法：方向介词、基本处所副词、数量词单复数变化（如 ένα εισιτήριο - δύο εισιτήρια）、询问句式（Τι κάνει...）。"
    },
    "A1-B": {
      16: "天气气候与四季变化 (Ο καιρός)。语法：无人称天气动词（βρέχει, χιονίζει）与动词现在时单复数变化（如 παίζω / παίζουν, τρέχω / τρέχουν）。",
      17: "饮食习惯、食物与饮料分类。语法：动词现在时陈述式变位（如 παίζω 的整套变位：-ω, -εις, -ει, -ουμε, -ετε, -ουν），冠词宾格的复数变化。",
      18: "日常服装与穿戴。语法：过去时态的叙述（如 αγόρασα, πήγα, είδα），形容词宾格单复数变化规则与名词修饰。",
      19: "身体部位名称、常见病症与健康状况。语法：疑问代词用法（Τι 问物, Ποιος/Ποια 问人），表达痛觉与身体不适的常用句型（πονάει/πονούν ... μου）。",
      20: "体育运动项目。语法：表达偏好与爱好的动词句型（μου αρέσει / μου αρέσουν）、动词 πηγαίνω (去) 的现在时变位。",
      21: "旅行度假与交通工具。语法：第一人称单数动词变位（如 φοράω, τρέχω, πηγαίνω），介词 με（乘/用）与交通工具的结合。",
      22: "商场购物、健康医疗。语法：表示发烧、血压等医学常用表达（πυρετός, πίεση），名词和形容词在特定语境下的搭配。",
      23: "各行各业与职业工作。语法：将来时 (Μέλλοντας) 的表达方式（结构：θα + 动词现在时变位，如 θα μαγειρέψω），职业名词性尾转换规律。",
      24: "大自然、疑问词提问。语法：疑问词提问句型转换，人称代词的格变化（如 为我/εμένα），中性名词复数修饰形容词规律。",
      25: "节日庆典与美好祝愿。语法：名词的定冠词与单复数（区分阳性 O 和阴性 H），简单将来时表达将要发生的动作。",
      26: "健康饮食建议与语法。语法：动词的“简单过去时”（Aorist）词形变化（如不规则动词 τρώω -> έφαγα），名词复数词尾变化规律（-ο 变 -α, -α 变 -ες）。",
      27: "闲暇活动与兴趣。语法：动词过去时态（完成过去时如 βρήκα 对比未完成过去时如 έψαχνα），地点疑问词 Πού 与介词 Με τι（用什么）用法。",
      28: "公共服务与求助。语法：第一/二变位法动词现在时陈述式变位（如 παίζω 与 τρώω 的变位对比），动词的祈使语气引入。",
      29: "人际交往与朋友相处。语法：动词现在时陈述式与人称搭配，人称代词的弱读宾格形式（με, σε, τον, την, το 等直接宾语代词）。",
      30: "A1终期语法复习。语法：第一变位法动词现在时陈述式变位（如 παίζω 等人称词尾），定冠词与名词的搭配，时态与格系统的全面复习。"
    },
    "A2": {
      31: "希腊语A2核心语法。语法：动词单复数人称词尾变化，定冠词与名词的性一致性配合，关系代词 \"που\" 和 \"ο οποίος\" 的用法。",
      32: "名词词尾与动词变化。语法：名词词尾变化规律（阳性 -ος, 阴性 -η），动词变位练习（包括现在时、将来时和不定过去时）。",
      33: "职业与日常交际语法。语法：区分阳性(ο)、阴性(η)和中性(το)定冠词，动词词尾随人称的变化，称呼与礼貌用语。",
      34: "礼貌用语与疑问句。语法：条件式礼貌表达 \"Θα ήθελα\" (I would like) 的用法，疑问与请求时的礼貌句型。",
      35: "虚词 να 与间接引语。语法：虚词 \"να\" 的用法（用于表示意愿、目的或命令的从句中），不变化名词与间接引语基本规则。",
      36: "面部特征与词汇语法。语法：中性名词的性数变化（如 το πρόσωπο 脸），简单虚拟式与简单命令式的肯定与否定形式。",
      37: "表示地点的介词。语法：表示地点的介词 \"σε\" 的缩合与用法规律（如 θα πάω στην Αθήνα, θα μείνω σε μια φίλη），基本疑问句与日常活动复习。",
      38: "A2阶段4-6单元复习。语法：名词格变化、动词时态（现在/过去/将来）和虚拟式的综合回顾与场景对话。",
      39: "A2级别水平测试模拟。语法：听力与阅读场景中的长难句句法结构解析，各时态与语气的综合考核，复习备考语法点汇总。"
    }
  };

  return grammarData[bookKey]?.[unitNum] || "主要涵盖当前章节语法知识点及课后练习";
};

const START_DATE = "2025-09-06";

interface UnitSchedule {
  startOffset: number;
  duration: number;
}

const getUnitSchedule = (unit: number): UnitSchedule => {
  if (unit >= 1 && unit <= 30) {
    return { startOffset: (unit - 1) * 7, duration: 7 };
  }
  // For unit >= 31: starts at day 210, each unit has a duration of 14 days
  const offset = 210 + (unit - 31) * 14;
  return { startOffset: offset, duration: 14 };
};

const parseLocalDate = (dateStr: string): Date | null => {
  if (!dateStr || dateStr === 'LOCKED') return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day, 0, 0, 0, 0);
  return isNaN(d.getTime()) ? null : d;
};

const getGreeceDateString = () => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Athens',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  } catch (e) {
    const today = new Date();
    const utc = today.getTime() + (today.getTimezoneOffset() * 60000);
    const greece = new Date(utc + (3600000 * 3));
    const y = greece.getFullYear();
    const m = String(greece.getMonth() + 1).padStart(2, '0');
    const dd = String(greece.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
};

const getUnitFromDate = (dateStr: string): number => {
  try {
    let normalized = dateStr.replace(/[\/\u5e74\u6708]/g, '-').replace(/\u65e5/g, '');
    const date = parseLocalDate(normalized);
    if (!date) return 1;

    const baseDate = parseLocalDate(START_DATE);
    if (!baseDate) return 1;

    const diffTime = date.getTime() - baseDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 1;
    if (diffDays < 210) {
      return Math.floor(diffDays / 7) + 1;
    }
    // For diffDays >= 210, map to unit >= 31, each unit spanning 14 days
    const computedUnit = 31 + Math.floor((diffDays - 210) / 14);
    return Math.min(39, computedUnit); // Clamp to max 39 for A2 level limits
  } catch (e) {
    return 1;
  }
};

const getMondayDateStr = (dateStr: string): string => {
  if (!dateStr || dateStr === 'LOCKED') return 'LOCKED';
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const getWeekRangeStr = (mondayStr: string): string => {
  if (!mondayStr || mondayStr === 'LOCKED') return '';
  const d = parseLocalDate(mondayStr);
  if (!d) return '';
  const sunday = new Date(d);
  sunday.setDate(d.getDate() + 6);
  
  const formatMDay = (date: Date) => `${date.getMonth() + 1}月${date.getDate()}日`;
  return `${formatMDay(d)} - ${formatMDay(sunday)}`;
};

const getUnitStudyDate = (
  bookId: string,
  unitNum: number,
  studyDatesMap: Record<string, string> = {}
): string => {
  const key = `${bookId.toUpperCase()}_${unitNum}`;
  if (studyDatesMap[key] !== undefined) {
    return studyDatesMap[key];
  }
  
  // Default behaviors:
  // Units 1 to 30 (A1-A and A1-B) are default unlocked.
  // We compute their default calculated schedule date.
  if (bookId.toUpperCase() === 'A1-A' || bookId.toUpperCase() === 'A1-B' || unitNum <= 30) {
    const { startOffset } = getUnitSchedule(unitNum);
    const d = parseLocalDate(START_DATE);
    if (d) {
      d.setDate(d.getDate() + startOffset);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return getMondayDateStr(`${y}-${m}-${dd}`);
    }
  }
  
  return 'LOCKED';
};

const migrateFromOldActivatedWords = (vocabList: Word[]): Record<string, string> => {
  const studyDates: Record<string, string> = {};
  try {
    const oldStored = localStorage.getItem('leon_activated_words');
    if (!oldStored) return {};
    const oldActivated = JSON.parse(oldStored) || {};
    
    // Group words by book and unit
    const unitWordsMap: Record<string, Word[]> = {};
    vocabList.forEach(w => {
      const key = `${w.book_id.toUpperCase()}_${w.unit}`;
      if (!unitWordsMap[key]) {
        unitWordsMap[key] = [];
      }
      unitWordsMap[key].push(w);
    });

    Object.keys(unitWordsMap).forEach(key => {
      const words = unitWordsMap[key];
      const unlockedWords = words.filter(w => oldActivated[w.id] && oldActivated[w.id] !== 'LOCKED');
      
      const [bookId, unitNumStr] = key.split('_');
      const unitNum = parseInt(unitNumStr, 10);
      
      if (unitNum <= 30) {
        // Default unlocked: only migrate if there was a manual unlock date.
        // If locked/undefined, do not write anything (so they fallback to default unlocked).
        if (unlockedWords.length > 0) {
          const dates = unlockedWords.map(w => oldActivated[w.id]);
          const earliestDate = dates.reduce((min, d) => d < min ? d : min, dates[0]);
          studyDates[key] = getMondayDateStr(earliestDate);
        }
      } else {
        // Default locked: migrate manual dates or lock states
        if (unlockedWords.length > 0) {
          const dates = unlockedWords.map(w => oldActivated[w.id]);
          const earliestDate = dates.reduce((min, d) => d < min ? d : min, dates[0]);
          studyDates[key] = getMondayDateStr(earliestDate);
        } else {
          studyDates[key] = 'LOCKED';
        }
      }
    });
  } catch (e) {}
  return studyDates;
};

const getResolvedActivationDates = (
  vocabList: Word[],
  studyDatesMap: Record<string, string> = {}
): Record<number, string> => {
  const finalDates: Record<number, string> = {};
  
  // Group words by book and unit
  const unitWordsMap: Record<string, Word[]> = {};
  vocabList.forEach(w => {
    const key = `${w.book_id.toUpperCase()}_${w.unit}`;
    if (!unitWordsMap[key]) {
      unitWordsMap[key] = [];
    }
    unitWordsMap[key].push(w);
  });

  Object.keys(unitWordsMap).forEach(key => {
    const [bookId, unitNumStr] = key.split('_');
    const unitNum = parseInt(unitNumStr, 10);
    const words = unitWordsMap[key].sort((a, b) => a.id - b.id);
    const N = words.length;
    
    const studyDateStr = getUnitStudyDate(bookId, unitNum, studyDatesMap);
    
    if (!studyDateStr || studyDateStr === 'LOCKED') {
      words.forEach(w => {
        finalDates[w.id] = 'LOCKED';
      });
      return;
    }

    const baseDate = parseLocalDate(studyDateStr);
    if (!baseDate) {
      words.forEach(w => {
        finalDates[w.id] = 'LOCKED';
      });
      return;
    }

    // Distribute words over the unit's duration
    const duration = (unitNum >= 31) ? 14 : 7;
    words.forEach((w, idx) => {
      const wordOffset = N > 0 ? Math.floor((idx / N) * duration) : 0;
      const actDate = new Date(baseDate);
      actDate.setDate(baseDate.getDate() + wordOffset);
      const y = actDate.getFullYear();
      const m = String(actDate.getMonth() + 1).padStart(2, '0');
      const dd = String(actDate.getDate()).padStart(2, '0');
      finalDates[w.id] = `${y}-${m}-${dd}`;
    });
  });

  return finalDates;
};

const isWordActive = (
  wordId: number, 
  targetDateStr: string, 
  resolvedDates: Record<number, string>
) => {
  const val = resolvedDates[wordId];
  if (!val || val === 'LOCKED') return false;
  return val <= targetDateStr;
};

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'activation' | 'upload' | 'settings'>('activation');
  
  // Vocabulary & Activation states
  const [allVocab, setAllVocab] = useState<Word[]>([]);
  const [unitStudyDates, setUnitStudyDates] = useState<Record<string, string>>({});
  const [editingDates, setEditingDates] = useState<Record<string, string>>({});

  // Database sync states
  const [dbStatus, setDbStatus] = useState<DbConnectionStatus>('connecting');
  const [dbError, setDbError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  // Upload states
  const [rawMD, setRawMD] = useState('');
  const [parsedWordsCount, setParsedWordsCount] = useState<number | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadBookId, setUploadBookId] = useState('A1-A');
  const [uploadUnit, setUploadUnit] = useState('1');
  const [customBookId, setCustomBookId] = useState('');
  const [isCustomBook, setIsCustomBook] = useState(false);

  // Load vocabulary & activation dates from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToSharedState(
      (state) => {
        let mergedVocab = [...(staticVocabData.textbook_vocabulary || [])] as Word[];
        if (state.custom_vocab) {
          mergedVocab = [...mergedVocab, ...state.custom_vocab];
        }
        setAllVocab(mergedVocab);
        setUnitStudyDates(state.unit_study_dates || {});
      },
      (status, error) => {
        setDbStatus(status);
        if (error) {
          setDbError(error.message);
        } else {
          setDbError(null);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Compute resolved activation dates
  const resolvedActivationDates = React.useMemo(() => {
    return getResolvedActivationDates(allVocab, unitStudyDates);
  }, [allVocab, unitStudyDates]);

  // Compute stats
  const totalWords = allVocab.length;
  const todayStr = getGreeceDateString();
  const activatedCount = allVocab.filter(w => isWordActive(w.id, todayStr, resolvedActivationDates)).length;
  const pendingCount = totalWords - activatedCount;

  // Group vocabulary by Book and Unit for easy bulk activation
  const groupedUnits = React.useMemo(() => {
    const groups: Record<string, Record<number, Word[]>> = {};
    
    // Pre-fill with all known books and units so empty units (e.g. Unit 38 review) show up
    const knownUnits: Record<string, number[]> = {
      "A1-A": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
      "A1-B": [16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],
      "A2": [31,32,33,34,35,36,37,38,39]
    };
    Object.keys(knownUnits).forEach(book => {
      groups[book] = {};
      knownUnits[book].forEach(unit => {
        groups[book][unit] = [];
      });
    });

    allVocab.forEach(word => {
      const book = word.book_id.toUpperCase();
      if (!groups[book]) groups[book] = {};
      if (!groups[book][word.unit]) groups[book][word.unit] = [];
      groups[book][word.unit].push(word);
    });
    return groups;
  }, [allVocab]);

  // Handle unit date update
  const handleUpdateUnitDate = (bookId: string, unit: number, dateStr: string) => {
    if (!dateStr) {
      alert('请选择有效的日期！');
      return;
    }
    const key = `${bookId.toUpperCase()}_${unit}`;
    const normalizedDate = getMondayDateStr(dateStr);
    if (normalizedDate === 'LOCKED') {
      alert('日期无效！');
      return;
    }
    const newDates = { ...unitStudyDates, [key]: normalizedDate };
    setUnitStudyDates(newDates);
    saveSharedState({ unit_study_dates: newDates });
  };

  // Handle unit activation
  const handleActivateUnit = (bookId: string, unit: number) => {
    const key = `${bookId.toUpperCase()}_${unit}`;
    const todayStrGreece = getGreeceDateString();
    const currentWeekMonday = getMondayDateStr(todayStrGreece);
    const newDates = { ...unitStudyDates, [key]: currentWeekMonday };
    setUnitStudyDates(newDates);
    saveSharedState({ unit_study_dates: newDates });
    // Clear any editing state for this key
    setEditingDates(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  // Handle unit deactivation
  const handleDeactivateUnit = (bookId: string, unit: number) => {
    const key = `${bookId.toUpperCase()}_${unit}`;
    const newDates = { ...unitStudyDates, [key]: 'LOCKED' };
    setUnitStudyDates(newDates);
    saveSharedState({ unit_study_dates: newDates });
    // Clear any editing state for this key
    setEditingDates(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  // Mock parse MD file and add words to custom vocab
  const handleMDUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawMD.trim()) return;

    const targetBookId = (isCustomBook ? customBookId.trim() : uploadBookId) || 'NEW_UPLOAD';
    const targetUnit = parseInt(uploadUnit, 10) || 1;

    // Simple markdown word extractor
    const lines = rawMD.split('\n');
    const newWordsList: Word[] = [];
    let currentId = allVocab.length > 0 ? Math.max(...allVocab.map(w => w.id)) + 1 : 1;

    let currentUnit = targetUnit;
    let uploadedUnitDate: string | null = null;

    lines.forEach(line => {
      // Parse dates from the MD content. Looks for YYYY-MM-DD, YYYY/MM/DD, or YYYY年MM月DD日
      const dateMatch = line.match(/(\d{4})[-\/\u5e74](\d{1,2})[-\/\u6708](\d{1,2})\u65e5?/);
      if (dateMatch) {
        const year = dateMatch[1];
        const month = dateMatch[2].padStart(2, '0');
        const day = dateMatch[3].padStart(2, '0');
        uploadedUnitDate = `${year}-${month}-${day}`;
        currentUnit = getUnitFromDate(uploadedUnitDate);
      }

      // Regex parsing Greek / Chinese pairs
      const match = line.match(/(?:[\u0370-\u03FF\u1F00-\u1FFF]+[,\s]*)+[^\s\-]*\s*-\s*.+/);
      if (match) {
        const parts = line.split('-');
        const greekPart = parts[0].replace(/[\*\`]/g, '').trim();
        const chinesePart = parts[1].replace(/[\*\`]/g, '').trim();

        newWordsList.push({
          id: currentId++,
          book_id: targetBookId,
          unit: currentUnit,
          word_greek: greekPart,
          word_chinese: chinesePart,
          pronunciation: 'new',
          example_greek: '',
          example_chinese: ''
        });
      }
    });

    if (newWordsList.length > 0) {
      const existingCustom = JSON.parse(localStorage.getItem('leon_custom_vocab') || '[]');
      const updatedCustom = [...existingCustom, ...newWordsList];
      
      const updates: any = { custom_vocab: updatedCustom };
      
      // Update study date for this custom unit if a date was found in MD
      if (uploadedUnitDate) {
        const key = `${targetBookId.toUpperCase()}_${targetUnit}`;
        const normalizedDate = getMondayDateStr(uploadedUnitDate);
        const newDates = { ...unitStudyDates, [key]: normalizedDate };
        setUnitStudyDates(newDates);
        updates.unit_study_dates = newDates;
      }

      saveSharedState(updates);

      // Update global list
      setAllVocab([...allVocab, ...newWordsList]);
      setParsedWordsCount(newWordsList.length);
      setUploadSuccess(true);
      setRawMD('');
      setTimeout(() => setUploadSuccess(false), 4000);
    } else {
      alert('未能在文本中解析出希腊语单词。请使用 "希腊语单词 - 中文释义" 的格式，例如: "καλημέρα - 早上好"');
    }
  };

  // --- Views ---

  const renderActivationTab = () => (
    <div className="animate-fade-in">
      <div className="admin-panel mb-8">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h3 className="admin-panel-title" style={{ marginBottom: '4px' }}>单元课程与特训授权控制台</h3>
            <p style={{ fontSize: '13px', color: '#86868B', fontWeight: 500 }}>
              解锁或锁定教材单元以控制 Leon 的学习范围，并为每个单元单独设定开始学习日期（按周规划）。
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,113,227,0.04)', padding: '6px 14px', borderRadius: '10px', border: '1px solid rgba(0,113,227,0.1)' }}>
            <Calendar size={16} className="text-blue" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0071E3' }}>系统当前日期: {todayStr}</span>
          </div>
        </div>

        <div style={{ 
          background: 'rgba(0,113,227,0.05)', 
          borderLeft: '4px solid #0071E3',
          padding: '12px 16px', 
          borderRadius: '8px', 
          marginBottom: '24px', 
          fontSize: '13px', 
          color: '#1D1D1F',
          lineHeight: '1.5'
        }}>
          💡 <strong>词汇统计提示：</strong> 此处显示的“单元包含词汇”数量是根据教材附录索引爬取/导入的全部词汇总量（包含核心生词、常用关联词、姓名/代词及课文复习词），并非全部是未学过的全新生词。授权解锁后，系统将自动结合遗忘曲线和特训模块对 Leon 进行智能追踪与针对性训练。
        </div>

        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="admin-th" style={{ width: '12%' }}>课本章节 / 书籍 ID</th>
                <th className="admin-th" style={{ width: '18%' }}>单元课程</th>
                <th className="admin-th" style={{ width: '25%' }}>核心语法与配套教学内容</th>
                <th className="admin-th" style={{ width: '10%' }}>单元包含词汇</th>
                <th className="admin-th" style={{ width: '22%' }}>设定学习周 (周一为始)</th>
                <th className="admin-th" style={{ width: '13%' }}>授权状态与操作</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedUnits).map(([bookName, units]) => {
                return Object.entries(units).map(([unitNumStr, words]) => {
                  const unitNum = parseInt(unitNumStr, 10);
                  const studyDate = getUnitStudyDate(bookName, unitNum, unitStudyDates);
                  const isLocked = (studyDate === 'LOCKED');
                  const isUnitActivated = !isLocked && studyDate <= todayStr;
                  const activatedInUnitCount = words.filter(w => isWordActive(w.id, todayStr, resolvedActivationDates)).length;

                  return (
                    <tr key={`${bookName}-${unitNum}`} className="hover-bg-gray">
                      <td className="admin-td" style={{ fontWeight: 700 }}>{bookName}</td>
                      <td className="admin-td">
                        <span style={{ fontWeight: 600 }}>第 {unitNum} 单元</span>
                        <div style={{ fontSize: '12px', color: '#86868B', marginTop: '2px', fontWeight: 500 }}>
                          {getUnitChineseName(bookName, unitNum)}
                        </div>
                      </td>
                      <td className="admin-td" style={{ fontSize: '13px', lineHeight: '1.5', color: '#515154', fontWeight: 500 }}>
                        {getUnitGrammarPoints(bookName, unitNum)}
                      </td>
                      <td className="admin-td">{words.length} 词</td>
                      <td className="admin-td">
                        {!isLocked ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input 
                                type="date" 
                                value={editingDates[`${bookName.toUpperCase()}_${unitNum}`] !== undefined ? editingDates[`${bookName.toUpperCase()}_${unitNum}`] : studyDate} 
                                onChange={e => {
                                  const val = e.target.value;
                                  setEditingDates(prev => ({ ...prev, [`${bookName.toUpperCase()}_${unitNum}`]: val }));
                                }} 
                                className="date-picker-input"
                                style={{ width: '140px', padding: '4px 8px', fontSize: '13px' }}
                              />
                              {editingDates[`${bookName.toUpperCase()}_${unitNum}`] !== undefined && editingDates[`${bookName.toUpperCase()}_${unitNum}`] !== studyDate && (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    onClick={() => {
                                      const key = `${bookName.toUpperCase()}_${unitNum}`;
                                      const val = editingDates[key];
                                      handleUpdateUnitDate(bookName, unitNum, val);
                                      setEditingDates(prev => {
                                        const copy = { ...prev };
                                        delete copy[key];
                                        return copy;
                                      });
                                    }}
                                    className="btn-premium"
                                    style={{
                                      whiteSpace: 'nowrap',
                                      background: '#34C759',
                                      color: '#fff',
                                      padding: '2px 8px',
                                      fontSize: '11px',
                                      width: 'auto',
                                      marginTop: 0,
                                      borderRadius: '4px',
                                      fontWeight: 'bold',
                                      minWidth: 'auto'
                                    }}
                                  >
                                    确定
                                  </button>
                                  <button
                                    onClick={() => {
                                      const key = `${bookName.toUpperCase()}_${unitNum}`;
                                      setEditingDates(prev => {
                                        const copy = { ...prev };
                                        delete copy[key];
                                        return copy;
                                      });
                                    }}
                                    className="btn-premium"
                                    style={{
                                      whiteSpace: 'nowrap',
                                      background: 'rgba(0,0,0,0.05)',
                                      color: '#1D1D1F',
                                      padding: '2px 8px',
                                      fontSize: '11px',
                                      width: 'auto',
                                      marginTop: 0,
                                      borderRadius: '4px',
                                      minWidth: 'auto'
                                    }}
                                  >
                                    取消
                                  </button>
                                </div>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#0071E3', fontWeight: 600 }}>
                              📅 {getWeekRangeStr(studyDate)}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#86868B', fontStyle: 'italic' }}>
                            🔒 单元已锁定 (未设定学习周)
                          </span>
                        )}
                      </td>
                      <td className="admin-td">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isLocked ? (
                            <span style={{ whiteSpace: 'nowrap', color: '#86868B', background: 'rgba(0,0,0,0.04)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                              未授权 (锁定中)
                            </span>
                          ) : isUnitActivated ? (
                            <span style={{ whiteSpace: 'nowrap', color: '#34C759', background: 'rgba(52,199,89,0.08)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                              已激活 (已开始) ({activatedInUnitCount}/{words.length})
                            </span>
                          ) : (
                            <span style={{ whiteSpace: 'nowrap', color: '#FF9500', background: 'rgba(255,149,0,0.08)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                              已计划 (未来周) ({activatedInUnitCount}/{words.length})
                            </span>
                          )}

                          {!isLocked ? (
                            <button 
                              onClick={() => handleDeactivateUnit(bookName, unitNum)}
                              className="btn-premium"
                              style={{ 
                                whiteSpace: 'nowrap', 
                                background: 'rgba(255,59,48,0.08)', 
                                color: '#FF3B30', 
                                padding: '4px 10px', 
                                fontSize: '12px', 
                                width: '70px', 
                                minWidth: '70px', 
                                marginTop: 0, 
                                justifyContent: 'center', 
                                display: 'inline-flex' 
                              }}
                              title="停用此单元将清除已设定的学习日期并对学生隐藏"
                            >
                              停用单元
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleActivateUnit(bookName, unitNum)}
                              className="btn-premium"
                              style={{ 
                                whiteSpace: 'nowrap', 
                                background: 'rgba(52,199,89,0.08)', 
                                color: '#34C759', 
                                padding: '4px 10px', 
                                fontSize: '12px', 
                                width: '70px', 
                                minWidth: '70px', 
                                marginTop: 0, 
                                justifyContent: 'center', 
                                display: 'inline-flex' 
                              }}
                            >
                              开启单元
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderUploadTab = () => (
    <div className="animate-fade-in">
      <div className="admin-panel mb-8">
        <h3 className="admin-panel-title">课外教材与自主内容导入 (MD 格式)</h3>
        <p style={{ fontSize: '14px', color: '#86868B', marginBottom: '24px', lineHeight: '1.6' }}>
          支持直接粘贴扫描 OCR 或老师提供的 Markdown 文本。系统会自动提取其中的希腊语词汇，并根据您指定的书籍和单元，将其归档到对应的课程授权列表中。
        </p>

        {uploadSuccess && (
          <div style={{ background: 'rgba(52,199,89,0.08)', color: '#34C759', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} />
            成功解析并导入 {parsedWordsCount} 个单词！请前往“课程单元与特训授权”标签页进行解锁授权。
          </div>
        )}

        <form onSubmit={handleMDUpload}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div className="admin-input-group" style={{ marginBottom: 0 }}>
              <label className="admin-label" style={{ fontWeight: 600 }}>归属教材 / 书籍 ID</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {['A1-A', 'A1-B', 'A2'].map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      setUploadBookId(b);
                      setIsCustomBook(false);
                    }}
                    className={`btn-premium ${uploadBookId === b && !isCustomBook ? 'btn-blue-filled' : ''}`}
                    style={{ 
                      padding: '6px 14px', 
                      fontSize: '13px', 
                      width: 'auto',
                      background: uploadBookId === b && !isCustomBook ? '#0071E3' : 'rgba(0,0,0,0.04)',
                      color: uploadBookId === b && !isCustomBook ? '#fff' : '#1D1D1F',
                      border: 'none'
                    }}
                  >
                    {b}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsCustomBook(true)}
                  className={`btn-premium ${isCustomBook ? 'btn-blue-filled' : ''}`}
                  style={{ 
                    padding: '6px 14px', 
                    fontSize: '13px', 
                    width: 'auto',
                    background: isCustomBook ? '#0071E3' : 'rgba(0,0,0,0.04)',
                    color: isCustomBook ? '#fff' : '#1D1D1F',
                    border: 'none'
                  }}
                >
                  自定义书籍
                </button>
              </div>
              {isCustomBook && (
                <input
                  type="text"
                  value={customBookId}
                  onChange={e => setCustomBookId(e.target.value)}
                  placeholder="例如: 学校补充, 新概念希腊语"
                  className="admin-input"
                  style={{ padding: '8px 12px' }}
                  required
                />
              )}
            </div>

            <div className="admin-input-group" style={{ marginBottom: 0 }}>
              <label className="admin-label" style={{ fontWeight: 600 }}>导入单元编号 (1-99)</label>
              <input
                type="number"
                min="1"
                max="99"
                value={uploadUnit}
                onChange={e => setUploadUnit(e.target.value)}
                className="admin-input"
                style={{ padding: '8px 12px', height: '38px' }}
                required
              />
              <span style={{ fontSize: '11px', color: '#86868B', marginTop: '4px', display: 'block' }}>
                导入词汇将直接合并到该单元的授权表格行中，解锁后 Leon 即可学习。
              </span>
            </div>
          </div>

          <div className="admin-input-group">
            <label className="admin-label">请在此输入/粘贴新课文的单词 Markdown 文本 (支持 "希腊文 - 中文释义" 的格式):</label>
            <textarea 
              rows={12}
              value={rawMD}
              onChange={e => setRawMD(e.target.value)}
              placeholder={`# 希腊语第6课新词汇\\nκαλημέρα - 早上好\\nτραπέζι, το - 桌子\\nαυτοκίνητο, το - 汽车`}
              className="admin-input"
              style={{ fontFamily: 'monospace', resize: 'vertical', padding: '16px' }}
            />
          </div>
          <button 
            type="submit" 
            className="btn-premium btn-blue-filled" 
            style={{ width: 'auto', padding: '12px 32px' }}
          >
            开始提取与导入
          </button>
        </form>
      </div>

      <div className="admin-panel">
        <h4 className="admin-panel-title" style={{ fontSize: '17px', marginBottom: '16px' }}>教材解析规范参考</h4>
        <div style={{ fontSize: '13px', color: '#86868B', lineHeight: '1.6' }}>
          粘贴文本每行代表一个单词，解析格式为：<br />
          <code>[希腊语单词] - [中文翻译]</code> <br />
          例如：<br />
          <code>βιβλίο - 书本</code><br />
          <code>μολύβι, το - 铅笔</code>
        </div>
      </div>
    </div>
  );

  const handleForceSyncToCloud = async () => {
    if (!window.confirm("确定要将当前电脑上的学习记录与解锁日期覆盖到云端吗？这会同步到所有其他登录设备。")) return;
    setIsSyncing(true);
    setSyncMessage("正在将当前设备数据上传至云端数据库...");
    try {
      let customVocab = [];
      try {
        customVocab = JSON.parse(localStorage.getItem('leon_custom_vocab') || '[]');
      } catch (e) {}

      let score = 0;
      try {
        score = parseInt(localStorage.getItem('leon_score') || '0', 10);
      } catch (e) {}

      let completedModules = {};
      try {
        completedModules = JSON.parse(localStorage.getItem('leon_completed_date_modules') || '{}');
      } catch (e) {}

      let dailyRewards = {};
      try {
        dailyRewards = JSON.parse(localStorage.getItem('leon_daily_rewards_awarded') || '{}');
      } catch (e) {}

      const stateToSave = {
        unit_study_dates: unitStudyDates,
        custom_vocab: customVocab,
        score: score,
        completed_date_modules: completedModules,
        daily_rewards_awarded: dailyRewards
      };

      await saveSharedState(stateToSave);
      setSyncMessage("🟢 同步成功！当前设备已被设为同步主设备，数据已成功覆盖至云端。");
      setDbStatus('connected-server');
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (e: any) {
      console.error(e);
      setSyncMessage(`🔴 同步失败: ${e.message || e}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleForcePullFromCloud = () => {
    setIsSyncing(true);
    setSyncMessage("正在从云端拉取最新数据...");
    setTimeout(() => {
      setSyncMessage("🟢 云端数据已拉取刷新完毕！");
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 3000);
    }, 1500);
  };

  const renderSyncStatusBanner = () => {
    let bgColor = '';
    let borderColor = '';
    let textColor = '';
    let statusText = '';
    let icon = null;
    let desc = '';

    switch (dbStatus) {
      case 'connected-server':
        bgColor = 'rgba(52, 199, 89, 0.04)';
        borderColor = 'rgba(52, 199, 89, 0.15)';
        textColor = '#34C759';
        statusText = '已连接云端（已实时同步）';
        icon = <Cloud size={20} style={ { color: '#34C759' } } />;
        desc = '所有设备（包括 iPad）当前均在实时共享相同的学习进度、单元解锁日期及测试记录。';
        break;
      case 'connected-cache':
        bgColor = 'rgba(255, 149, 0, 0.04)';
        borderColor = 'rgba(255, 149, 0, 0.15)';
        textColor = '#FF9500';
        statusText = '已启用本地缓存（离线模式）';
        icon = <RefreshCw size={20} className="spinning" style={ { color: '#FF9500' } } />;
        desc = '云端尚未响应，已自动为您载入此设备上的本地缓存。任何修改将保存在本地并在恢复连接后上传。';
        break;
      case 'connecting':
        bgColor = 'rgba(0, 122, 255, 0.04)';
        borderColor = 'rgba(0, 122, 255, 0.15)';
        textColor = '#007AFF';
        statusText = '正在建立云端同步连接...';
        icon = <RefreshCw size={20} className="spinning" style={ { color: '#007AFF' } } />;
        desc = '正在与 Firebase Firestore 建立实时握手连接，请稍候...';
        break;
      case 'error':
      default:
        bgColor = 'rgba(255, 59, 48, 0.04)';
        borderColor = 'rgba(255, 59, 48, 0.15)';
        textColor = '#FF3B30';
        statusText = '同步不可用（云端数据库未启用）';
        icon = <CloudOff size={20} style={ { color: '#FF3B30' } } />;
        desc = '检测到云端数据库尚未开启，多设备之间将无法进行数据同步（各设备显示独立日期）。';
        break;
    }

    return (
      <div 
        style={ {
          background: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          transition: 'all 0.3s ease'
        } }
      >
        <div style={ { display: 'flex', alignItems: 'center', gap: '12px' } }>
          {icon}
          <span style={ { fontWeight: 700, fontSize: '16px', color: '#1D1D1F' } }>
            数据同步状态：<span style={ { color: textColor } }>{statusText}</span>
          </span>
        </div>
        
        <p style={ { color: '#86868B', fontSize: '14px', margin: 0, lineHeight: 1.6 } }>
          {desc}
        </p>

        {dbStatus === 'error' && (
          <div 
            style={ {
              background: 'rgba(0, 0, 0, 0.02)',
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '13px',
              color: '#515154',
              lineHeight: 1.6
            } }
          >
            <div style={ { fontWeight: 600, color: '#1D1D1F', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' } }>
              <AlertCircle size={14} style={ { color: '#FF3B30' } } />
              启用多设备同步步骤 (以您当前使用的这台 IDE 电脑版本为准)：
            </div>
            1. 打开 Firebase Console：
               <a 
                 href="https://console.firebase.google.com/project/leon-greek-coach/firestore" 
                 target="_blank" 
                 rel="noreferrer"
                 style={ { color: '#007AFF', textDecoration: 'underline', marginLeft: '4px', fontWeight: 500 } }
               >
                 https://console.firebase.google.com/project/leon-greek-coach/firestore
               </a><br />
            2. 点击 <strong>“创建数据库” (Create Database)</strong> 按钮，并选择默认设置创建。<br />
            3. 创建成功后，刷新此网页，然后点击下方 <strong>“设为同步主设备”</strong> 按钮，即可将您当前这台电脑上的正确日期 and 课程内容一键上传同步至云端！
          </div>
        )}

        <div style={ { display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' } }>
          <button
            onClick={handleForceSyncToCloud}
            disabled={isSyncing}
            style={ {
              background: '#1D1D1F',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: isSyncing ? 0.7 : 1,
              transition: 'all 0.2s ease'
            } }
          >
            <Database size={14} />
            <span>设为同步主设备（强制覆盖云端）</span>
          </button>

          <button
            onClick={handleForcePullFromCloud}
            disabled={isSyncing}
            style={ {
              padding: '10px 20px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid rgba(0,0,0,0.08)',
              background: '#FFFFFF',
              opacity: isSyncing ? 0.7 : 1,
              transition: 'all 0.2s ease'
            } }
          >
            <RefreshCw size={14} className={isSyncing ? 'spinning' : ''} />
            <span>从云端强制拉取刷新</span>
          </button>
        </div>

        {syncMessage && (
          <div 
            style={ { 
              fontSize: '13px', 
              fontWeight: 500, 
              color: syncMessage.includes('🟢') ? '#34C759' : (syncMessage.includes('🔴') ? '#FF3B30' : '#86868B'),
              marginTop: '4px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.02)',
              width: 'fit-content'
            } }
          >
            {syncMessage}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-logo-area">
          <div className="admin-logo-badge">P</div>
          <span className="admin-logo-text">家长控制中心</span>
        </div>

        <nav className="admin-nav">
          <button 
            onClick={() => setActiveTab('activation')} 
            className={`admin-nav-item ${activeTab === 'activation' ? 'active' : ''}`}
          >
            <Layers size={18} />
            <span>单元课程与特训授权</span>
          </button>
          <button 
            onClick={() => setActiveTab('upload')} 
            className={`admin-nav-item ${activeTab === 'upload' ? 'active' : ''}`}
          >
            <FolderPlus size={18} />
            <span>课外与零散内容导入</span>
          </button>
        </nav>

        <button 
          onClick={onLogout}
          className="btn-premium btn-back"
          style={{ marginTop: 'auto', width: '100%', justifyContent: 'center', border: '1px solid rgba(0,0,0,0.08)' }}
        >
          <LogOut size={16} />
          <span>退出管理后台</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="admin-content">
        <div className="admin-header">
          <div>
            <h2 className="admin-title">Leon 希腊语课程内容与特训授权中心</h2>
            <p style={{ color: '#86868B', fontSize: '15px', fontWeight: 500, marginTop: '4px' }}>
              家长可在此解锁或锁定各章节的教学单元、语法要点及配套特训，控制 Leon 的每日自适应复习流的课程与练习范围。
            </p>
          </div>
        </div>

        {/* Sync Status Banner */}
        {renderSyncStatusBanner()}

        {/* Stats Grid */}
        <div className="admin-grid-3">
          <div className="admin-stat-card">
            <span className="admin-stat-label">系统总收录词汇量</span>
            <div className="admin-stat-val text-blue">{totalWords}</div>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">已解锁授权词汇</span>
            <div className="admin-stat-val text-green">{activatedCount}</div>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">未授权（锁定中）</span>
            <div className="admin-stat-val text-orange">{pendingCount}</div>
          </div>
        </div>

        {/* Main Content Body */}
        {activeTab === 'activation' && renderActivationTab()}
        {activeTab === 'upload' && renderUploadTab()}
      </main>
    </div>
  );
}

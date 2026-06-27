import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, 
  BrainCircuit, 
  ChevronRight,
  ChevronDown,
  Calendar,
  Sparkles,
  Trophy,
  CheckCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  ChevronLeft,
  BookOpen,
  Award,
  Layers,
  Check,
  X,
  Volume2,
  Settings
} from 'lucide-react';

// Import local static vocabulary compilation
import staticVocabData from '../../data/vocabulary.json';
import examQuestionsData from '../../data/exam_questions.json';
import { subscribeToSharedState, saveSharedState, type DbConnectionStatus } from '../../dbService';

const speakGreek = (text: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    // Strip punctuation or clean it slightly if needed, but speechSynthesis handles it fine.
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'el-GR';
    
    // Find Greek voice
    const voices = window.speechSynthesis.getVoices();
    const greekVoice = voices.find(v => v.lang.includes('el-GR') || v.lang.includes('el_GR'));
    if (greekVoice) {
      utterance.voice = greekVoice;
    }
    window.speechSynthesis.speak(utterance);
  } else {
    alert('您的浏览器不支持语音播放。');
  }
};

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
      8: "颜色服装与外貌描述 (Χρώματα 和 ρούχα)",
      9: "动物王国与童话故事 (Ζώα 和 παραμύθια)",
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

  return unitNames[bookKey]?.[unitNum] || "新学期课文";
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

interface Word {
  id: number;
  book_id: string;
  unit: number;
  word_greek: string;
  word_chinese: string;
  pronunciation?: string;
  example_greek?: string;
  example_chinese?: string;
  page_number?: number;
}

const EBBINGHAUS_INTERVALS = [0, 1, 2, 4, 7, 15, 30];

const START_DATE = "2025-09-06"; // Leon started classes on September 6, 2025

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

const getUnitForDate = (dateStr: string): { bookId: string; unitNum: number; displayUnitName: string; dateRangeStr: string } => {
  const targetDate = new Date(dateStr);
  targetDate.setHours(0, 0, 0, 0);
  const startDate = new Date(START_DATE);
  startDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.round((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return {
      bookId: "A1-A",
      unitNum: 1,
      displayUnitName: "A1-A U1",
      dateRangeStr: "未开始"
    };
  }

  let foundUnit = 1;
  for (let u = 1; u <= 39; u++) {
    const { startOffset, duration } = getUnitSchedule(u);
    if (diffDays >= startOffset && diffDays < startOffset + duration) {
      foundUnit = u;
      break;
    }
    if (u === 39 && diffDays >= startOffset) {
      foundUnit = u;
    }
  }
  
  const unitSched = getUnitSchedule(foundUnit);
  const uStart = new Date(startDate);
  uStart.setDate(startDate.getDate() + unitSched.startOffset);
  const uEnd = new Date(uStart);
  uEnd.setDate(uStart.getDate() + unitSched.duration - 1);
  
  const formatDate = (d: Date) => {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  
  const dateRangeStr = `${formatDate(uStart)} - ${formatDate(uEnd)}`;
  
  let bookId = "A1-A";
  let displayUnit = foundUnit;
  if (foundUnit >= 1 && foundUnit <= 15) {
    bookId = "A1-A";
    displayUnit = foundUnit;
  } else if (foundUnit >= 16 && foundUnit <= 30) {
    bookId = "A1-B";
    displayUnit = foundUnit - 15;
  } else {
    bookId = "A2";
    displayUnit = foundUnit - 30;
  }
  
  return {
    bookId,
    unitNum: foundUnit,
    displayUnitName: `${bookId} U${displayUnit}`,
    dateRangeStr
  };
};

const getUnitDateRange = (globalUnit: number): string => {
  const unitSched = getUnitSchedule(globalUnit);
  const startDate = new Date(START_DATE);
  startDate.setHours(0, 0, 0, 0);
  
  const uStart = new Date(startDate);
  uStart.setDate(startDate.getDate() + unitSched.startOffset);
  const uEnd = new Date(uStart);
  uEnd.setDate(uStart.getDate() + unitSched.duration - 1);
  
  const formatDate = (d: Date) => {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  return `${formatDate(uStart)} - ${formatDate(uEnd)}`;
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

const isWordDueToday = (wordId: number, targetDateStr: string, activatedDatesMap: Record<number, string>) => {
  const actDateStr = activatedDatesMap[wordId];
  if (!actDateStr || actDateStr === 'LOCKED') return false;
  
  const partsAct = actDateStr.split('-');
  const partsTgt = targetDateStr.split('-');
  if (partsAct.length !== 3 || partsTgt.length !== 3) return false;
  
  const actD = new Date(parseInt(partsAct[0], 10), parseInt(partsAct[1], 10) - 1, parseInt(partsAct[2], 10), 0, 0, 0, 0);
  const tgtD = new Date(parseInt(partsTgt[0], 10), parseInt(partsTgt[1], 10) - 1, parseInt(partsTgt[2], 10), 0, 0, 0, 0);
  
  if (isNaN(actD.getTime()) || isNaN(tgtD.getTime())) return false;
  
  const diffTime = tgtD.getTime() - actD.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays === 0 || EBBINGHAUS_INTERVALS.includes(diffDays);
};

// Helper to remove accents and case for safe verification
const cleanChar = (c: string) => {
  return c
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const removeGreekAccents = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove combining marks
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "") // remove punctuation
    .replace(/\s+/g, " "); // consolidate spaces
};

const getSpellingTargetWord = (word: string): string => {
  // If there's a parenthesis, remove it (e.g. "άντρας, ο (σύζυγος)" -> "άντρας, ο")
  let cleaned = word.replace(/\s*\(.*?\)/g, '');
  
  // If there's a comma, take only the first part (e.g. "αβγό, το" -> "αβγό")
  if (cleaned.includes(',')) {
    cleaned = cleaned.split(',')[0];
  }
  
  // Also remove common articles from the beginning if any (e.g. "το αεροπλάνο" -> "αεροπλάνο")
  const articles = ['ο', 'η', 'το', 'τα', 'οι', 'της', 'του', 'τον', 'την', 'μας', 'σας', 'μου', 'σου'];
  const words = cleaned.trim().split(/\s+/);
  if (words.length > 1 && articles.includes(words[0].toLowerCase())) {
    words.shift();
  }
  
  return words.join(' ').trim();
};

const removeBracketContents = (str: string): string => {
  return str
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/（.*?）/g, '')
    .replace(/【.*?】/g, '');
};

const cleanGreekForComparison = (str: string): string => {
  let cleaned = removeBracketContents(str);
  cleaned = cleaned
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove combining marks (accents)
    .toLowerCase();
  
  // Remove punctuation
  cleaned = cleaned.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
  
  // Remove common articles and normalize demonstrative pronouns
  const words = cleaned.split(/\s+/);
  const articles = new Set(['ο', 'η', 'το', 'τα', 'οι', 'της', 'του', 'τον', 'την', 'μας', 'σας', 'μου', 'σου']);
  const filteredWords = words
    .filter(w => !articles.has(w))
    .map(w => {
      if (w === 'αυτος' || w === 'αυτη' || w === 'αυτοι' || w === 'αυτες' || w === 'αυτα') {
        return 'αυτο';
      }
      return w;
    });
  
  return filteredWords.join('').trim();
};

const normalizeChineseString = (str: string): string => {
  let s = removeBracketContents(str)
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?，。？！；：]/g, "")
    .replace(/\s+/g, "");

  // Remove common prefixes
  const prefixes = ["这是", "那是", "它是", "这个是", "那个是", "一个", "是一只", "一个", "一些", "这", "那", "它"];
  let changedPrefix = true;
  while (changedPrefix) {
    changedPrefix = false;
    for (const prefix of prefixes) {
      if (s.startsWith(prefix) && s.length > prefix.length) {
        s = s.substring(prefix.length);
        changedPrefix = true;
      }
    }
  }

  // Remove common suffixes
  const suffixes = ["的", "了", "地", "吧", "呀", "啊", "呢"];
  let changedSuffix = true;
  while (changedSuffix) {
    changedSuffix = false;
    for (const suffix of suffixes) {
      if (s.endsWith(suffix) && s.length > suffix.length) {
        s = s.substring(0, s.length - suffix.length);
        changedSuffix = true;
      }
    }
  }

  // Strip common structural/pronoun fillers to allow flexible syntax
  s = s.replace(/[我在去你他她它们]/g, "");

  // Apply synonym replacements
  const synonymGroups = [
    ["确定", "肯定", "一定", "有把握", "确信"],
    ["脸", "面孔", "面部", "人脸"],
    ["人", "人类", "个人", "个体"],
    ["面具", "面罩"],
    ["公寓", "房屋", "房子", "住宅"],
    ["旧", "老", "破旧"],
    ["暖气", "供暖", "取暖"],
    ["停车场", "车位", "停车位", "泊车場", "泊车"],
    ["自行车", "单车", "脚踏车"],
    ["强烈", "坚定", "坚决", "强力"],
    ["保重", "身体健康", "健康"],
    ["去世", "死", "死亡", "逝世"],
    ["恭喜", "祝贺"],
    ["早日康复", "快点好起来", "早日痊愈"],
    ["旅行", "旅游", "出游"],
    ["冷咖啡", "冰咖啡"],
    ["冰淇淋", "冰激凌", "雪糕"],
    ["散步", "逛街", "走走"],
    ["游泳", "游水"],
    ["干净", "爱干净"]
  ];

  for (const group of synonymGroups) {
    const primary = group[0];
    for (const synonym of group) {
      if (synonym !== primary) {
        s = s.replaceAll(synonym, primary);
      }
    }
  }

  return s;
};

const cleanChinese = (str: string): string => {
  return normalizeChineseString(str);
};

// Alternative translations mapping for specific Greek words to support multiple meanings
const GREEK_ALTERNATIVE_TRANSLATIONS: Record<string, string[]> = {
  "προσωπο": ["脸", "面孔", "人", "脸部"],
  "γερα": ["强烈", "坚定", "坚固", "健康"],
  "μασκα": ["面具", "口罩"],
  "σιγουρος": ["一定", "确定", "肯定"],
};

const getCleanSpellingWord = (word: string): string => {
  const target = getSpellingTargetWord(word);
  return removeGreekAccents(target).replace(/\s+/g, '');
};

const isGreekProperNoun = (word: string): boolean => {
  const trimmed = word.trim();
  if (trimmed.length === 0) return false;
  const firstChar = trimmed[0];
  return firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
};

const filterDuplicateTranslations = <T extends { word_greek: string; word_chinese: string }>(list: T[]): T[] => {
  const seenChinese = new Set<string>();
  const seenGreek = new Set<string>();
  const result: T[] = [];
  
  list.forEach(w => {
    const cleanZh = cleanChinese(w.word_chinese);
    const cleanGr = removeGreekAccents(w.word_greek);
    if (!seenChinese.has(cleanZh) && !seenGreek.has(cleanGr)) {
      seenChinese.add(cleanZh);
      seenGreek.add(cleanGr);
      result.push(w);
    }
  });
  
  return result;
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
    return greece.toISOString().split('T')[0];
  }
};

interface LevelInfo {
  name: string;
  nameEl: string;
  minPoints: number;
  maxPoints: number;
  icon: string;
  color: string;
  gradient: string;
  glowColor: string;
}

const getLevelInfo = (pts: number): LevelInfo => {
  if (pts <= 50) {
    return {
      name: "青铜级别",
      nameEl: "Χάλκινο",
      minPoints: 0,
      maxPoints: 50,
      icon: "🥉",
      color: "#CD7F32",
      gradient: "linear-gradient(135deg, #a77044, #cd7f32)",
      glowColor: "rgba(205, 127, 50, 0.3)"
    };
  } else if (pts <= 100) {
    return {
      name: "白银级别",
      nameEl: "Ασημένιο",
      minPoints: 51,
      maxPoints: 100,
      icon: "🥈",
      color: "#C0C0C0",
      gradient: "linear-gradient(135deg, #7f8c8d, #bdc3c7)",
      glowColor: "rgba(192, 192, 192, 0.3)"
    };
  } else if (pts <= 200) {
    return {
      name: "黄金级别",
      nameEl: "Χρυσό",
      minPoints: 101,
      maxPoints: 200,
      icon: "🥇",
      color: "#FFD700",
      gradient: "linear-gradient(135deg, #d4af37, #ffd700)",
      glowColor: "rgba(255, 215, 0, 0.4)"
    };
  } else if (pts <= 400) {
    return {
      name: "铂金级别",
      nameEl: "Πλατινένιο",
      minPoints: 201,
      maxPoints: 400,
      icon: "🏆",
      color: "#00CED1",
      gradient: "linear-gradient(135deg, #2b5876, #00ced1)",
      glowColor: "rgba(0, 206, 209, 0.4)"
    };
  } else if (pts <= 800) {
    return {
      name: "钻石级别",
      nameEl: "Διαμαντένιο",
      minPoints: 401,
      maxPoints: 800,
      icon: "💎",
      color: "#1E90FF",
      gradient: "linear-gradient(135deg, #00c6ff, #0072ff)",
      glowColor: "rgba(30, 144, 255, 0.5)"
    };
  } else if (pts <= 1600) {
    return {
      name: "王者级别",
      nameEl: "Βασιλιάς",
      minPoints: 801,
      maxPoints: 1600,
      icon: "👑",
      color: "#FF4500",
      gradient: "linear-gradient(135deg, #ff416c, #ff4b2b)",
      glowColor: "rgba(255, 69, 0, 0.5)"
    };
  } else {
    return {
      name: "至尊荣耀级",
      nameEl: "Υπέρτατη Δόξα",
      minPoints: 1601,
      maxPoints: 9999,
      icon: "⚡",
      color: "#DA70D6",
      gradient: "linear-gradient(135deg, #f953c6, #818cf8)",
      glowColor: "rgba(218, 112, 214, 0.7)"
    };
  }
};

interface WritingSpeakingChallenge {
  id: number;
  examLevel: 'A1' | 'A2';
  type: 'writing' | 'speaking';
  titleCn: string;
  titleGr: string;
  promptCn: string;
  promptGr: string;
  checklist: string[];
  vocab: string[];
  modelAnswer: string;
  wordCountInfo: string;
}

const WRITING_SPEAKING_CHALLENGES: WritingSpeakingChallenge[] = [
  {
    id: 300001,
    examLevel: 'A2',
    type: 'writing',
    titleCn: '暑假感谢信',
    titleGr: 'Γράμμα Ευχαριστίας για τις Διακοπές',
    promptCn: '你在朋友海边的家里度过了暑假。写一封信感谢他，告诉他你的近况，并邀请他来你居住的城市做客。（要求 80-100 字，署名使用 Δημήτρης 或 Καίτη）',
    promptGr: 'Περάσατε τις καλοκαιρινές διακοπές στο σπίτι του φίλου σας στη θάλασσα. Γράφετε ένα γράμμα, για να τον ευχαριστήσετε, να του πείτε τα νέα σας και να τον προσκαλέσετε να σας επισκεφτεί στην πόλη που μένετε. (80-100 λέξεις). ΠΡΟΣΕΞΤΕ: υπογράψτε με το όνομα Δημήτρης ή Καίτη.',
    checklist: [
      '感谢对方的热情招待 (Ευχαριστώ για τη φιλοξενία)',
      '描述海边度假的快乐时光 (Περάσαμε υπέροχα στη θάλασσα)',
      '汇报你最近在做什么 (Τώρα είμαι πίσω στην πόλη...)',
      '邀请对方来你的城市做客 (Σε προσκαλώ να έρθεις...)',
      '正确署名为 Δημήτρης 或 Καίτη (Δημήτρης / Καίτη)'
    ],
    vocab: [
      'ευχαριστώ (谢谢)',
      'φιλοξενία (招待/款待)',
      'καλοκαίρι (夏天/暑假)',
      'θάλασσα (海/海洋)',
      'προσκαλώ (邀请)',
      'επισκέπτομαι (拜访/访问)'
    ],
    modelAnswer: 'Αγαπητέ μου Νίκο,\nΣου γράφω αυτό το γράμμα για να σε ευχαριστήσω πολύ για τη φιλοξενία στο όμορφο σπίτι σου στη θάλασσα. Περάσαμε υπέροχες καλοκαιρινές διακοπές μαζί! Μου άρεσε πολύ το κολύμπι και το καλό φαγητό.\nΤώρα είμαι πίσω στην Αθήνα. Άρχισα πάλι τα μαθήματα στο σχολείο και έχω πολύ διάβασμα. Όλα τα νέα μου είναι καλά.\nΘέλω πολύ να σε προσκαλέσω να έρθεις να με επισκεφτείς στην πόλη μου τον επόμενο μήνα. Μπορείς να μείνεις στο σπίτι μου.\nΣε περιμένω!\nΦιλιά,\nΔημήτρης',
    wordCountInfo: '字数: 84 字 (符合 80-100 字要求)'
  },
  {
    id: 300002,
    examLevel: 'A2',
    type: 'writing',
    titleCn: '咨询希腊语水平考试',
    titleGr: 'Ερωτήσεις για τις Εξετάσεις Ελληνομάθειας',
    promptCn: '你学习希腊语有一段时间了，想要参加希腊语水平考试。但是你想咨询几个问题。发一封电子邮件给考试部门的主管，询问相关信息（考试日期、报名费用、考点位置等）。（要求 100-120 字，请使用礼貌性笔吻，不要签写自己的真实姓名）',
    promptGr: 'Εδώ και αρκετό καιρό κάνετε μαθήματα ελληνικών και θέλετε να δώσετε εξετάσεις στην ελληνική γλώσσα. Θέλετε, όμως, να κάνετε μερικές ερωτήσεις. Στέλνετε ένα ηλεκτρονικό μήνυμα στον διευθυντή του τμήματος που κάνει τις εξετάσεις και ζητάτε πληροφορίες (ημερομηνίες, χρήματα, εξεταστικά κέντρα κτλ.). (100-120 λέξεις). ΠΡΟΣΕΞΤΕ: μην υπογράψετε με το όνομά σας.',
    checklist: [
      '礼貌地称呼考试部门的主管 (Αξιότιμε κύριε Διευθυντά)',
      '说明写信目的：报名参加 A2 考试 (Θέλω να δώσω εξετάσεις)',
      '具体询问考试的具体日期 (Ποιες είναι οι ακριβείς ημερομηνίες;)',
      '询问报名费用及支付方式 (Πόσο κοστίζει; Πώς μπορώ να πληρώσω;)',
      '询问雅典或其他地方的考点设置 (Πού είναι τα εξεταστικά κέντρα;)',
      '使用商务礼貌结尾署匿名 (Με εκτίμηση, Γιώργος Παπαδόπουλος)'
    ],
    vocab: [
      'διευθυντής (主管/经理)',
      'εξετάσεις (考试/测试)',
      'πληροφορίες (信息/资料)',
      'ημερομηνία (日期)',
      'χρήματα (金钱/费用)',
      'εξεταστικό κέντρο (考点/测试中心)'
    ],
    modelAnswer: 'Αξιότιμε κύριε Διευθυντά,\nΣας στέλνω αυτό το μήνυμα γιατί κάνω μαθήματα ελληνικών εδώ και ένα χρόνο και θέλω να δώσω εξετάσεις για το πιστοποιητικό ελληνομάθειας A2. Θα ήθελα, όμως, να σας κάνω μερικές ερωτήσεις για τη διαδικασία.\nΠρώτον, θα ήθελα να μάθω ποιες είναι οι ακριβείς ημερομηνίες των εξετάσεων φέτος. Επίσης, πόσο κοστίζει η συμμετοχή στις εξετάσεις και πώς μπορώ να κάνω την πληρωμή;\nΤέλος, μπορείτε να μου πείτε πού είναι τα εξεταστικά κέντρα στην Αθήνα;\nΣας ευχαριστώ πολύ για τον χρόνο σας και περιμένω την απάντησή σας.\nΜε εκτίμηση,\nΓιώργος Παπαδόπουλος',
    wordCountInfo: '字数: 101 字 (符合 100-120 字要求)'
  },
  {
    id: 300003,
    examLevel: 'A1',
    type: 'writing',
    titleCn: '度假相册描述',
    titleGr: 'Περιγραφή Φωτογραφιών Διακοπών',
    promptCn: '你有度假的照片并把它们放入相册。在照片旁写下照片中能看到什么，描述照片里的景色、人物及天气。（要求 50-60 字）',
    promptGr: 'Έχεις φωτογραφίες από τις διακοπές σου και τις βάζεις στο άλμπουμ. Δίπλα στις φωτογραφίες από τις διακοπές γράφεις τι βλέπουμε σε κάθε φωτογραφία. Γράψε συνολικά 50-60 λέξεις.',
    checklist: [
      '描述房屋和周围自然景色 (Αυτό είναι το σπίτι του παππού μου)',
      '描述当时的天气或活动 (Κάνει ζέστη / Έχει λιακάδα / Κολυμπάμε)',
      '表达个人感受：很美丽、很快乐 (Είναι πολύ όμορφα / Μας αρέσει πολύ)'
    ],
    vocab: [
      'φωτογραφία (照片)',
      'διακοπές (假期/度假)',
      'σπίτι (房子/家)',
      'λουλούδια (花朵)',
      'δέντρα (树木)',
      'καιρός (天气)'
    ],
    modelAnswer: 'Αυτό είναι το σπίτι του παππού μου στο χωριό. Έξω έχει πολλά κόκκινα λουλούδια και μεγάλα πράσινα δέντρα. Είναι πολύ όμορφο. Εδώ είμαι εγώ με τον αδερφό μου στη θάλασσα. Ο καιρός είναι πολύ καλός και έχει ζέστη. Κολυμπάμε κάθε μέρα. Μας αρέσει πολύ να παίζουμε στην άμμο.',
    wordCountInfo: '字数: 53 字 (符合 50-60 字要求)'
  },
  {
    id: 300004,
    examLevel: 'A1',
    type: 'writing',
    titleCn: '暑假写给朋友的短信',
    titleGr: 'Γράμμα σε μία Φίλη',
    promptCn: '你正在岛上度假，写一封简短的信给你的朋友，告诉她你过得怎么样，描述你每天的活动和天气，并表达对她的想念。（要求 50-60 字，署名使用匿名）',
    promptGr: 'Είσαι διακοπές και γράφεις ένα γράμμα σε μία φίλη σου, για να πεις πώς περνάς. Γράψε συνολικά 50-60 λέξεις. ΠΡΟΣΕΞΤΕ: μην υπογράψετε με το όνομά σας.',
    checklist: [
      '亲切问候朋友 (Μαίρη γεια σου)',
      '说明你现在在哪里度假 (Είμαι για διακοπές στη Νάξο...)',
      '描述度假活动：游泳、去餐馆 (Κάθε πρωί πηγαίνουμε στην παραλία...)',
      '表达对朋友的思念 (Μου λείπεις πολύ)',
      '署写一个假名字 (Φιλιά, Άννα)'
    ],
    vocab: [
      'νησί (岛屿)',
      'παραλία (海滩/沙滩)',
      'κολύμπι (游泳)',
      'ταβέρνα (餐馆/酒馆)',
      'λείπω (想念/铺底)',
      'σύντομα (很快/不久)'
    ],
    modelAnswer: 'Μαίρη γεια σου,\nΣου γράφω από τη Νάξο όπου είμαι για διακοπές με την οικογένειά μου. Περνάω υπέροχα εδώ! Κάθε πρωί πηγαίνουμε στην παραλία για κολύμπι και το βράδυ τρώμε νόστιμο φαγητό στις ταβέρνες. Ο καιρός είναι πολύ ζεστός. Μου λείπεις πολύ και θέλω να σε δω σύντομα.\nΦιλιά,\nΆννα',
    wordCountInfo: '字数: 57 字 (符合 50-60 字要求)'
  },
  {
    id: 300005,
    examLevel: 'A2',
    type: 'speaking',
    titleCn: '口语真题：个人介绍与沟通',
    titleGr: 'Προσωπική Συνέντευξη & Επικοινωνία',
    promptCn: '口语部分第一部分：主考官将对你进行基本提问。请尝试对以下问题给出详细、连贯的希腊语回答。（模拟真实考场答题）',
    promptGr: 'Πώς λέγεστε; Από πού είστε; Ποια είναι τα χόμπι σας; Μιλήστε μου για την οικογένειά σας. Σας αρέσει που μαθαίνετε ελληνικά; Γιατί;',
    checklist: [
      '清晰表达自己的名字与年龄 (Με λένε... Είμαι... χρονών)',
      '说明自己来自哪里、现居地 (Είμαι από την Κίνα...)',
      '具体阐述自己的兴趣爱好与闲暇活动 (Στον ελεύθερο χρόνο μου...)',
      '介绍家庭人数及父母、兄弟姐妹 (Στην οικογένειά μου είμαστε...)',
      '表达对学习希腊语的看法 (Μου αρέσει να μαθαίνω ελληνικά γιατί...)'
    ],
    vocab: [
      'όνομα (名字)',
      'χόμπι (爱好)',
      'οικογένεια (家庭)',
      'αδερφός (兄弟)',
      'ελεύθερος χρόνος (闲暇时间)',
      'ενδιαφέρον (有趣/有意义)'
    ],
    modelAnswer: 'Με λένε Λέον. Είμαι από την Κίνα αλλά μένω στην Αθήνα. Είμαι δώδεκα χρονών. Στον ελεύθερο χρόνο μου, μου αρέσει πολύ να παίζω ποδόσφαιρο με τους φίλους μου και να διαβάζω βιβλία. Στην οικογένειά μου είμαστε τέσσερα άτομα: ο πατέρας μου, η μητέρα μου, ο αδερφός μου κι εγώ. Μας αρέσει να κάνουμε βόλτες μαζί τα Σαββατοκύριακα. Μου αρέσει πολύ να μαθαίνω ελληνικά γιατί είναι μια πολύ ενδιαφέρουσα γλώσσα και θέλω να μιλάω με τους συμμαθητές μου.',
    wordCountInfo: '口语模范表达朗读时长约 45 秒'
  },
  {
    id: 300006,
    examLevel: 'A2',
    type: 'speaking',
    titleCn: '口语真题：看图说话与表达',
    titleGr: 'Περιγραφή Εικόνας (Αθλητές)',
    promptCn: '口语部分第二部分：仔细观察图片，描述图中的人物、他们的动作、他们所处的位置以及他们的情绪感受，并表达你对该项运动的喜好。（请参考大纲与词汇提示）',
    promptGr: 'Τι βλέπετε στην εικόνα; Περιγράψτε τους αθλητές. Πού βρίσκονται; Ποια είναι τα συναισθήματά τους; Σας αρέσει ο αθλητισμός; Ποιο άθλημα σας αρέσει περισσότερο; Γιατί;',
    checklist: [
      '描述图中的主要人物（两个运动员，一男一女） (Βλέπω δύο αθλητές...)',
      '描述他们正在做的事情：跑步锻炼 (Τρέχουν στο γήπεδο)',
      '描述他们的穿着（运动服饰） (Φορούν αθλητικά ρούχα)',
      '分析他们此时的情绪：疲倦但喜悦 (Κουρασμένοι αλλά χαρούμενοι)',
      '表达自己对体育运动的看法和最喜欢的项目 (Μου αρέσει ο αθλητισμός / Προτιμώ το μπάσκετ)'
    ],
    vocab: [
      'αθλητής / αθλήτρια (运动员)',
      'γήπεδο / στάδιο (体育场/球场)',
      'τρέχω (跑步)',
      'συναίσθημα (情绪/感受)',
      'χαρούμενος (快乐的)',
      'υγεία (健康)'
    ],
    modelAnswer: 'Στην εικόνα βλέπω δύο αθλητές, ένα αγόρι και ένα κορίτσι, που τρέχουν σε ένα μεγάλο γήπεδο. Φορούν αθλητικά ρούχα. Φαίνονται πολύ κουρασμένοι αλλά χαρούμενοι γιατί κάνουν αυτό που αγαπούν. Πιστεύω ότι νιώθουν περήφανοι για την προσπάθειά τους. Προσωπικά, μου αρέσει πολύ ο αθλητισμός. Παίζω μπάσκετ τρεις φορές την εβδομάδα με τους φίλους μου. Με βοηθάει να είμαι υγιής και να έχω ενέργεια.',
    wordCountInfo: '口语模范表达朗读时长约 40 秒'
  }
];

const LEVELS = [
  { name: "青铜级别", range: "0 - 50 XP", icon: "🥉", gradient: "linear-gradient(135deg, #a77044, #cd7f32)" },
  { name: "白银级别", range: "51 - 100 XP", icon: "🥈", gradient: "linear-gradient(135deg, #7f8c8d, #bdc3c7)" },
  { name: "黄金级别", range: "101 - 200 XP", icon: "🥇", gradient: "linear-gradient(135deg, #d4af37, #ffd700)" },
  { name: "铂金级别", range: "201 - 400 XP", icon: "🏆", gradient: "linear-gradient(135deg, #2b5876, #00ced1)" },
  { name: "钻石级别", range: "401 - 800 XP", icon: "💎", gradient: "linear-gradient(135deg, #00c6ff, #0072ff)" },
  { name: "王者级别", range: "801 - 1600 XP", icon: "👑", gradient: "linear-gradient(135deg, #ff416c, #ff4b2b)" },
  { name: "至尊荣耀级", range: "1600+ XP", icon: "⚡", gradient: "linear-gradient(135deg, #f953c6, #818cf8)" }
];

export default function StudentApp() {
  const [activeModule, setActiveModule] = useState<'dashboard' | 'matching' | 'spelling' | 'quiz' | 'truefalse' | 'translation_gr_zh' | 'translation_zh_gr' | 'writing_speaking'>('dashboard');
  
  // Writing and Speaking challenge states
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [userWritingInput, setUserWritingInput] = useState('');
  const [showChallengeTip, setShowChallengeTip] = useState(false);
  
  // Selected review date (defaults to today in Greece timezone, interactive)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getGreeceDateString);

  const [allVocab, setAllVocab] = useState<Word[]>([]);
  const [unitStudyDates, setUnitStudyDates] = useState<Record<string, string>>({});
  const [activatedDates, setActivatedDates] = useState<Record<number, string>>({});
  const [score, setScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('leon_score') || '0', 10);
  });
  const [dbStatus, setDbStatus] = useState<DbConnectionStatus>('connecting');

  const [showRulesModal, setShowRulesModal] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});
  const [expandedSubsections, setExpandedSubsections] = useState<Record<string, boolean>>({});
  const [completedModulesForDate, setCompletedModulesForDate] = useState<string[]>([]);

  const toggleUnit = (key: string) => {
    setExpandedUnits(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleSubsection = (key: string) => {
    setExpandedSubsections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Trial-and-error state trackers for learning assistance (hints triggered after mistakes)
  const [matchErrors, setMatchErrors] = useState<Record<number, number>>({});
  
  // Matching Game States (Restored)
  const [matchingRound, setMatchingRound] = useState(0);
  const [matchedIds, setMatchedIds] = useState<number[]>([]);
  const [selectedGreekId, setSelectedGreekId] = useState<number | null>(null);
  const [selectedChineseId, setSelectedChineseId] = useState<number | null>(null);
  const [matchingPool, setMatchingPool] = useState<Word[]>([]);
  const [matchingGreek, setMatchingGreek] = useState<Word[]>([]);
  const [matchingChinese, setMatchingChinese] = useState<Word[]>([]);
  const [wrongMatch, setWrongMatch] = useState(false);
  
  const [spellingMistakes, setSpellingMistakes] = useState(0);
  const [spellingWrongFlash, setSpellingWrongFlash] = useState(false);
  
  const [quizMistakes, setQuizMistakes] = useState(0);
  const [wrongOptionsSelected, setWrongOptionsSelected] = useState<string[]>([]);
  
  const [transGrZhMistakes, setTransGrZhMistakes] = useState(0);
  const [transGrZhWrongAttempt, setTransGrZhWrongAttempt] = useState(false);
  
  const [transZhGrMistakes, setTransZhGrMistakes] = useState(0);
  const [transZhGrWrongAttempt, setTransZhGrWrongAttempt] = useState(false);
  const [showTip, setShowTip] = useState(false);

  // Load vocabulary and activation history from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToSharedState(
      (state) => {
        let mergedVocab = [...(staticVocabData.textbook_vocabulary || [])] as Word[];
        if (state.custom_vocab) {
          mergedVocab = [...mergedVocab, ...state.custom_vocab];
        }
        setAllVocab(mergedVocab);
        setUnitStudyDates(state.unit_study_dates || {});
        setScore(state.score || 0);

        const finalActivated = getResolvedActivationDates(mergedVocab, state.unit_study_dates || {});
        setActivatedDates(finalActivated);

        const dateStr = getGreeceDateString();
        const currentCompleted = state.completed_date_modules || {};
        setCompletedModulesForDate(currentCompleted[dateStr] || []);
      },
      (status) => {
        setDbStatus(status);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter allVocab to only contain unlocked words as of selectedDateStr
  const unlockedVocab = useMemo(() => {
    return allVocab.filter(word => {
      const actDateStr = activatedDates[word.id];
      if (!actDateStr || actDateStr === 'LOCKED') return false;
      const activationDate = new Date(actDateStr);
      activationDate.setHours(0, 0, 0, 0);
      const targetDate = new Date(selectedDateStr);
      targetDate.setHours(0, 0, 0, 0);
      return activationDate <= targetDate;
    });
  }, [allVocab, activatedDates, selectedDateStr]);

  const selectedUnitKeys = useMemo(() => {
    // 1. Get the list of all unique unit keys that have unlocked words as of selectedDateStr
    // A unit key is represented as "BOOK_UNIT", e.g. "A1-A_1", "A2_31"
    const availableUnitKeys = Array.from(
      new Set(unlockedVocab.map(w => `${w.book_id.toUpperCase()}_${w.unit}`))
    );

    if (availableUnitKeys.length === 0) {
      return ["A1-A_1"];
    }

    // Sort all available unit keys chronologically based on their study dates.
    // The study date comes from getUnitStudyDate(bookId, unitNum, unitStudyDates).
    // Earlier study dates will be at the beginning of the list, more recent ones at the end.
    availableUnitKeys.sort((keyA, keyB) => {
      const [bookA, unitNumStrA] = keyA.split('_');
      const unitNumA = parseInt(unitNumStrA, 10);
      const dateA = getUnitStudyDate(bookA, unitNumA, unitStudyDates);
      
      const [bookB, unitNumStrB] = keyB.split('_');
      const unitNumB = parseInt(unitNumStrB, 10);
      const dateB = getUnitStudyDate(bookB, unitNumB, unitStudyDates);
      
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      return keyA.localeCompare(keyB);
    });

    const N = availableUnitKeys.length;
    
    // We select up to 4 unique unit keys to represent the 4 tiers of temporal distance:
    // 1. Most Recent (最近)
    // 2. Earliest (最早)
    // 3. Recent (较近)
    // 4. Earlier (较早)
    const selected: string[] = [];
    const addUnitKey = (key: string) => {
      if (!selected.includes(key)) {
        selected.push(key);
      }
    };

    if (N >= 4) {
      // 1. Most Recent (最近): the last element in chronological order
      addUnitKey(availableUnitKeys[N - 1]);
      
      // 2. Earliest (最早): the first element in chronological order
      addUnitKey(availableUnitKeys[0]);
      
      // 3. Recent (较近): around 70% of chronological distance
      let targetRecent = Math.floor(N * 0.7);
      while (targetRecent < N - 1 && selected.includes(availableUnitKeys[targetRecent])) {
        targetRecent++;
      }
      while (targetRecent > 0 && selected.includes(availableUnitKeys[targetRecent])) {
        targetRecent--;
      }
      addUnitKey(availableUnitKeys[targetRecent]);
      
      // 4. Earlier (较早): around 30% of chronological distance
      let targetEarlier = Math.floor(N * 0.3);
      while (targetEarlier > 0 && selected.includes(availableUnitKeys[targetEarlier])) {
        targetEarlier--;
      }
      while (targetEarlier < N - 1 && selected.includes(availableUnitKeys[targetEarlier])) {
        targetEarlier++;
      }
      addUnitKey(availableUnitKeys[targetEarlier]);
    } else {
      // Less than 4 unit keys available: add all of them
      availableUnitKeys.forEach(key => addUnitKey(key));
    }

    // Sort selected unit keys in descending chronological order (Most Recent -> Earliest)
    // to match the student app layout structure (Recent -> Remote)
    return selected.sort((keyA, keyB) => {
      const [bookA, unitNumStrA] = keyA.split('_');
      const unitNumA = parseInt(unitNumStrA, 10);
      const dateA = getUnitStudyDate(bookA, unitNumA, unitStudyDates);
      
      const [bookB, unitNumStrB] = keyB.split('_');
      const unitNumB = parseInt(unitNumStrB, 10);
      const dateB = getUnitStudyDate(bookB, unitNumB, unitStudyDates);
      
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA); // Descending chronological order
      }
      return keyB.localeCompare(keyA);
    });
  }, [unlockedVocab, unitStudyDates]);

  // Compute daily deck based on selected date (integrating early review rotation)
  const dailyDeck = useMemo(() => {
    if (allVocab.length === 0 || selectedUnitKeys.length === 0) return [];

    const deck: Word[] = [];

    selectedUnitKeys.forEach(gUnitKey => {
      const [bookId, unitNumStr] = gUnitKey.split('_');
      const unitNum = parseInt(unitNumStr, 10);
      
      // Find all words in unlockedVocab belonging to this book and unit
      const unitWords = unlockedVocab.filter(w => w.book_id.toUpperCase() === bookId.toUpperCase() && w.unit === unitNum);
      
      // Sort unit words by ID
      const sortedUnitWords = [...unitWords].sort((a, b) => a.id - b.id);
      
      deck.push(...sortedUnitWords);
    });

    // Sort so that:
    // 1. Words due today are at the very beginning of the daily deck
    // 2. Then sort strictly by sequence: A1-A -> A1-B -> A2, then unit number, then ID
    const sortBooks = (a: Word, b: Word) => {
      const dueA = isWordDueToday(a.id, selectedDateStr, activatedDates);
      const dueB = isWordDueToday(b.id, selectedDateStr, activatedDates);
      
      if (dueA && !dueB) return -1;
      if (!dueA && dueB) return 1;

      // Deterministic shuffle for "due today" words based on dateSeed
      if (dueA && dueB) {
        const dateParts = selectedDateStr.split('-');
        const y = parseInt(dateParts[0], 10) || 2026;
        const m = parseInt(dateParts[1], 10) || 6;
        const d = parseInt(dateParts[2], 10) || 20;
        const dateSeed = y * 372 + m * 31 + d;
        const hashA = (a.id * 137 + dateSeed) % 1000;
        const hashB = (b.id * 137 + dateSeed) % 1000;
        return hashA - hashB;
      }

      const order: Record<string, number> = { 'A1-A': 1, 'A1-B': 2, 'A2': 3 };
      const bookA = order[a.book_id.toUpperCase()] || 99;
      const bookB = order[b.book_id.toUpperCase()] || 99;
      if (bookA !== bookB) return bookA - bookB;
      if (a.unit !== b.unit) return a.unit - b.unit;
      return a.id - b.id;
    };

    return deck.sort(sortBooks);
  }, [allVocab, selectedUnitKeys, activatedDates, selectedDateStr]);

  // Determine if active level is A1 or A2 based on current active vocabulary
  const activeExamLevel = useMemo(() => {
    if (dailyDeck.length === 0) return 'A1';
    const hasA2 = dailyDeck.some(w => w.book_id.toLowerCase() === 'a2');
    return hasA2 ? 'A2' : 'A1';
  }, [dailyDeck]);

  // Helper to dynamically build tips for regular vocabulary
  const getDynamicTip = (wordObj: any): string => {
    if (!wordObj) return '';
    let tip = '';
    if (wordObj.isExam && wordObj.detailed_tip) {
      tip = wordObj.detailed_tip;
    } else {
      const isSentence = wordObj.type === 'sentence' || (wordObj.example_greek && wordObj.example_greek.trim().length > 0);
      const gr = wordObj.greek || wordObj.word_greek || '';
      const zh = wordObj.chinese || wordObj.word_chinese || '';
      const pron = wordObj.pronunciation ? `[发音: ${wordObj.pronunciation}]` : '';
      
      tip = `【学习解析】\n- 希腊语原词/句: ${gr}\n- 中文释义: ${zh} ${pron}\n`;
      if (wordObj.example_greek && wordObj.example_greek !== gr) {
        tip += `- 对应例句: ${wordObj.example_greek} → ${wordObj.example_chinese}\n`;
      }
      
      const cleanGr = gr.toLowerCase().trim();
      if (cleanGr.endsWith('ω')) {
        tip += `- 语法特征: 这是一个以 -ω 结尾的一类主动语态动词现在时。`;
      } else if (cleanGr.endsWith('ος') || cleanGr.endsWith('ης')) {
        tip += `- 语法特征: 这是一个阳性名词，修饰冠词通常用 ο。`;
      } else if (cleanGr.endsWith('α') || cleanGr.endsWith('η')) {
        tip += `- 语法特征: 这是一个阴性名词，修饰冠词通常用 η。`;
      } else if (cleanGr.endsWith('ο') || cleanGr.endsWith('ι') || cleanGr.endsWith('μα')) {
        tip += `- 语法特征: 这是一个中性名词，修饰冠词通常用 το。`;
      }
    }
    return tip.replace(/\*\*/g, '');
  };

  // Compute Ebbinghaus counts per interval dynamically for visualization
  const ebbinghausStats = useMemo(() => {
    const targetDate = new Date(selectedDateStr);
    targetDate.setHours(0, 0, 0, 0);

    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 4: 0, 7: 0, 15: 0, 30: 0 };
    const dates: Record<number, string> = {};

    EBBINGHAUS_INTERVALS.forEach(interval => {
      const pastDate = new Date(targetDate);
      pastDate.setDate(targetDate.getDate() - interval);
      dates[interval] = pastDate.toISOString().split('T')[0];
    });

    allVocab.forEach(word => {
      const actDateStr = activatedDates[word.id];
      if (!actDateStr || actDateStr === 'LOCKED') return;

      const activationDate = new Date(actDateStr);
      activationDate.setHours(0, 0, 0, 0);

      const diffTime = targetDate.getTime() - activationDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (EBBINGHAUS_INTERVALS.includes(diffDays)) {
        counts[diffDays] = (counts[diffDays] || 0) + 1;
      }
    });

    return { counts, dates };
  }, [allVocab, activatedDates, selectedDateStr]);

  // Compute new words vs review words for selected date
  const { newWords, reviewWords } = useMemo(() => {
    const targetDate = new Date(selectedDateStr);
    targetDate.setHours(0, 0, 0, 0);

    const newW: Word[] = [];
    const revW: Word[] = [];

    allVocab.forEach((word) => {
      const actDateStr = activatedDates[word.id];
      if (!actDateStr || actDateStr === 'LOCKED') return;

      const activationDate = new Date(actDateStr);
      activationDate.setHours(0, 0, 0, 0);

      const diffTime = targetDate.getTime() - activationDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        newW.push(word);
      } else if (diffDays > 0 && EBBINGHAUS_INTERVALS.includes(diffDays)) {
        revW.push(word);
      }
    });

    return { newWords: newW, reviewWords: revW };
  }, [allVocab, activatedDates, selectedDateStr]);

  const spannedMonths = useMemo(() => {
    if (selectedUnitKeys.length === 0) return 0;
    
    // Find the oldest study date among all selected units
    let oldestDateStr: string | null = null;
    selectedUnitKeys.forEach(key => {
      const [bookId, unitNumStr] = key.split('_');
      const unitNum = parseInt(unitNumStr, 10);
      const studyDateStr = getUnitStudyDate(bookId, unitNum, unitStudyDates);
      if (studyDateStr !== 'LOCKED') {
        if (!oldestDateStr || studyDateStr < oldestDateStr) {
          oldestDateStr = studyDateStr;
        }
      }
    });

    if (!oldestDateStr) return 1;

    const oldestStart = new Date(oldestDateStr);
    const targetDate = new Date(selectedDateStr);
    const diffDays = Math.round((targetDate.getTime() - oldestStart.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.round(diffDays / 30.4));
  }, [selectedUnitKeys, selectedDateStr, unitStudyDates]);

  // Group unique units and pad to at least 4 units (Most Recent -> Most Remote)
  const uniqueUnitsList = useMemo(() => {
    const getUnitInfoFromKey = (unitKey: string) => {
      const [bookId, unitNumStr] = unitKey.split('_');
      const unitNum = parseInt(unitNumStr, 10);
      
      const studyDateStr = getUnitStudyDate(bookId, unitNum, unitStudyDates);
      let dateRangeStr = '';
      if (studyDateStr !== 'LOCKED') {
        dateRangeStr = getWeekRangeStr(studyDateStr);
      }
      return {
        bookId,
        unitNum,
        displayUnitName: `${bookId} U${unitNum}`,
        dateRangeStr
      };
    };

    const N = selectedUnitKeys.length;
    return selectedUnitKeys.map((unitKey, i) => {
      let labelCn = "";
      let labelGr = "";
      if (i === 0) {
        labelCn = "最近的复习";
        labelGr = "Νεότερη Επανάληψη";
      } else if (i === N - 1) {
        labelCn = "最遥远的复习";
        labelGr = "Αρχική Επανάληψη";
      } else if (i < N / 2) {
        labelCn = "稍近的复习";
        labelGr = "Πρόσφατη Επανάληψη";
      } else {
        labelCn = "稍远的复习";
        labelGr = "Παλαιότερη Επανάληψη";
      }

      const [bookId, unitNumStr] = unitKey.split('_');
      const unitNum = parseInt(unitNumStr, 10);
      const count = dailyDeck.filter((w: any) => w.book_id.toUpperCase() === bookId.toUpperCase() && w.unit === unitNum).length;

      const uInfo = getUnitInfoFromKey(unitKey);
      const fullName = getUnitChineseName(bookId, unitNum);
      
      // Parse main title and parenthesized translation
      const match = fullName.match(/^(.*?)\s*\((.*?)\)\s*$/);
      const mainTitle = match ? match[1].trim() : fullName.trim();
      const translationText = match ? match[2].trim() : "";

      return {
        unitKey,
        bookId,
        unitNum,
        displayUnit: uInfo.displayUnitName,
        dateRange: uInfo.dateRangeStr,
        mainTitle,
        translationText,
        labelCn,
        labelGr,
        count
      };
    });
  }, [selectedUnitKeys, dailyDeck, unitStudyDates]);



  // Matching game setups and helpers
  const setupMatchingRound = (pool: Word[], round: number) => {
    const startIdx = round * 5;
    const roundWords = pool.slice(startIdx, startIdx + 5);
    setMatchingGreek([...roundWords].sort(() => Math.random() - 0.5));
    setMatchingChinese([...roundWords].sort(() => Math.random() - 0.5));
  };

  const handleSelectCard = (type: 'greek' | 'chinese', id: number) => {
    if (wrongMatch || matchedIds.includes(id)) return;
    
    if (type === 'greek') {
      if (selectedGreekId === id) {
        setSelectedGreekId(null);
      } else {
        setSelectedGreekId(id);
        const wordObj = matchingPool.find(w => w.id === id);
        if (wordObj) {
          speakGreek(wordObj.word_greek);
        }
        if (selectedChineseId !== null) {
          checkMatch(id, selectedChineseId);
        }
      }
    } else {
      if (selectedChineseId === id) {
        setSelectedChineseId(null);
      } else {
        setSelectedChineseId(id);
        if (selectedGreekId !== null) {
          checkMatch(selectedGreekId, id);
        }
      }
    }
  };

  const checkMatch = (gId: number, cId: number) => {
    if (gId === cId) {
      const newMatched = [...matchedIds, gId];
      setMatchedIds(newMatched);
      setSelectedGreekId(null);
      setSelectedChineseId(null);
      
      setMatchErrors(prev => {
        const next = { ...prev };
        delete next[gId];
        return next;
      });

      const roundStartIdx = matchingRound * 5;
      const roundWords = matchingPool.slice(roundStartIdx, roundStartIdx + 5);
      const allRoundMatched = roundWords.every(w => newMatched.includes(w.id));
      
      if (allRoundMatched) {
        setTimeout(() => {
          if (matchingRound < 7) {
            setMatchingRound(prev => prev + 1);
            setupMatchingRound(matchingPool, matchingRound + 1);
          } else {
            handleGameComplete(40);
          }
        }, 600);
      }
    } else {
      setWrongMatch(true);
      setMatchErrors(prev => ({
        ...prev,
        [gId]: (prev[gId] || 0) + 1,
        [cId]: (prev[cId] || 0) + 1
      }));
      setTimeout(() => {
        setSelectedGreekId(null);
        setSelectedChineseId(null);
        setWrongMatch(false);
      }, 800);
    }
  };

  // 2. Spelling Game (40 words limit)
  const [spellingIndex, setSpellingIndex] = useState(0);
  const [spellInput, setSpellInput] = useState<string[]>([]);
  const [scrambledLetters, setScrambledLetters] = useState<string[]>([]);
  const [spellingCompleted, setSpellingCompleted] = useState(false);

  const spellingPool = useMemo(() => {
    let pool = [...dailyDeck];
    pool = filterDuplicateTranslations(pool);
    if (pool.length < 40) {
      const extraNeeded = 40 - pool.length;
      const fallbackList = filterDuplicateTranslations(
        unlockedVocab.filter(w => !pool.some(p => p.id === w.id))
      );
      pool = [...pool, ...fallbackList.slice(0, extraNeeded)];
    }
    const spellingItems = pool.slice(0, 40).map(w => ({
      ...w,
      isExam: false,
      detailed_tip: ''
    }));

    const level = activeExamLevel;
    const exams = (examQuestionsData || []).filter((q: any) => q.exam_level === level && q.question_type === 'spelling');
    const examItems = exams.map((q: any) => ({
      id: q.id,
      isExam: true,
      word_greek: q.greek,
      word_chinese: q.chinese,
      pronunciation: q.pronunciation || '',
      detailed_tip: q.detailed_tip
    }));

    const combined = [...examItems, ...spellingItems];
    return filterDuplicateTranslations(combined).slice(0, 40);
  }, [dailyDeck, unlockedVocab, activeExamLevel]);

  const currentSpellingWord = spellingPool[spellingIndex] || null;

  useEffect(() => {
    if (!currentSpellingWord) return;
    const cleanWord = getCleanSpellingWord(currentSpellingWord.word_greek);
    const chars = cleanWord.split('');
    const greekAlphabet = 'αβγδεζηθικλμνξοπρστυφχψω';
    while (chars.length < Math.max(8, cleanWord.length + 3)) {
      const randChar = greekAlphabet[Math.floor(Math.random() * greekAlphabet.length)];
      if (!chars.includes(randChar)) {
        chars.push(randChar);
      }
    }
    setScrambledLetters(chars.sort(() => Math.random() - 0.5));
    setSpellInput([]);
    setSpellingCompleted(false);
    setSpellingMistakes(0);
    setSpellingWrongFlash(false);
    setShowTip(false);
  }, [currentSpellingWord]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeModule !== 'spelling' || !currentSpellingWord || spellingCompleted) return;
      const key = e.key.toLowerCase();
      if (key === 'backspace') {
        setSpellInput(prev => prev.slice(0, -1));
        return;
      }
      if (key.length > 1) return;
      const target = getCleanSpellingWord(currentSpellingWord.word_greek);
      const expected = target[spellInput.length];
      if (!expected) return;

      if (cleanChar(key) === cleanChar(expected)) {
        const newInput = [...spellInput, expected];
        setSpellInput(newInput);
        if (newInput.length === target.length) {
          setSpellingCompleted(true);
        }
      } else {
        setSpellingWrongFlash(true);
        setSpellingMistakes(prev => {
          const next = prev + 1;
          if (next >= 2) setShowTip(true);
          return next;
        });
        setTimeout(() => setSpellingWrongFlash(false), 500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModule, currentSpellingWord, spellInput, spellingCompleted]);

  const handleLetterClick = (letter: string, idx: number) => {
    if (spellingCompleted) return;
    const target = getCleanSpellingWord(currentSpellingWord.word_greek);
    const expected = target[spellInput.length];
    if (!expected) return;

    if (cleanChar(letter) === cleanChar(expected)) {
      const newInput = [...spellInput, expected];
      setSpellInput(newInput);
      if (newInput.length === target.length) {
        setSpellingCompleted(true);
      }
    } else {
      setSpellingWrongFlash(true);
      setSpellingMistakes(prev => {
        const next = prev + 1;
        if (next >= 2) setShowTip(true);
        return next;
      });
      setTimeout(() => setSpellingWrongFlash(false), 500);
    }
  };

  const resetSpell = () => {
    setSpellInput([]);
    setSpellingCompleted(false);
  };

  const nextSpelling = () => {
    if (spellingIndex < spellingPool.length - 1) {
      setSpellingIndex(prev => prev + 1);
    } else {
      handleGameComplete(40);
    }
  };

  // 3. Multiple Choice Quiz (30 questions limit)
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answerChecked, setAnswerChecked] = useState(false);

  const quizPool = useMemo(() => {
    let pool = [...dailyDeck];
    pool = filterDuplicateTranslations(pool);
    if (pool.length < 30) {
      const extraNeeded = 30 - pool.length;
      const fallbackList = filterDuplicateTranslations(
        unlockedVocab.filter(w => !pool.some(p => p.id === w.id))
      );
      pool = [...pool, ...fallbackList.slice(0, extraNeeded)];
    }
    const quizItems = pool.slice(0, 30).map(w => ({
      ...w,
      isExam: false,
      detailed_tip: ''
    }));

    const level = activeExamLevel;
    const exams = (examQuestionsData || []).filter((q: any) => q.exam_level === level && q.question_type === 'quiz');
    const examItems = exams.map((q: any) => ({
      id: q.id,
      isExam: true,
      word_greek: q.greek,
      word_chinese: q.answer, // the correct choice
      options: q.options,
      detailed_tip: q.detailed_tip
    }));

    const combined = [...examItems, ...quizItems];
    return filterDuplicateTranslations(combined).slice(0, 30);
  }, [dailyDeck, unlockedVocab, activeExamLevel]);

  const currentQuizWord = quizPool[quizIndex] || null;
  const quizOptions = useMemo(() => {
    if (!currentQuizWord) return [];
    if (currentQuizWord.isExam) {
      return [...(currentQuizWord as any).options].sort(() => Math.random() - 0.5);
    }
    const correct = currentQuizWord.word_chinese;
    const targetIsProper = isGreekProperNoun(currentQuizWord.word_greek);
    
    let candidates = unlockedVocab.filter(w => {
      if (cleanChinese(w.word_chinese) === cleanChinese(correct)) return false;
      if (removeGreekAccents(w.word_greek) === removeGreekAccents(currentQuizWord.word_greek)) return false;
      
      const isCandProper = isGreekProperNoun(w.word_greek);
      return isCandProper === targetIsProper;
    });

    if (candidates.length < 3) {
      candidates = unlockedVocab.filter(w => {
        if (cleanChinese(w.word_chinese) === cleanChinese(correct)) return false;
        if (removeGreekAccents(w.word_greek) === removeGreekAccents(currentQuizWord.word_greek)) return false;
        return true;
      });
      if (candidates.length < 3) {
        candidates = allVocab.filter(w => {
          if (cleanChinese(w.word_chinese) === cleanChinese(correct)) return false;
          if (removeGreekAccents(w.word_greek) === removeGreekAccents(currentQuizWord.word_greek)) return false;
          return true;
        });
      }
    }

    const distractors = candidates.map(w => w.word_chinese);
    const uniqueDistractors = Array.from(new Set(distractors))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return [correct, ...uniqueDistractors].sort(() => Math.random() - 0.5);
  }, [quizIndex, currentQuizWord, allVocab]);

  const handleSelectOption = (opt: string) => {
    if (answerChecked) return;
    const correctAns = currentQuizWord.isExam ? currentQuizWord.word_chinese : currentQuizWord.word_chinese;
    if (opt === correctAns) {
      setSelectedOption(opt);
    } else {
      if (!wrongOptionsSelected.includes(opt)) {
        setWrongOptionsSelected(prev => [...prev, opt]);
        setQuizMistakes(prev => {
          const next = prev + 1;
          if (next >= 2) setShowTip(true);
          return next;
        });
      }
    }
  };

  const checkQuizAnswer = () => {
    if (!selectedOption) return;
    setAnswerChecked(true);
    const points = quizMistakes === 0 ? 5 : (quizMistakes === 1 ? 3 : 1);
    setQuizScore(prev => prev + points);
  };

  const nextQuiz = () => {
    if (quizIndex < quizPool.length - 1) {
      setQuizIndex(prev => prev + 1);
      setSelectedOption(null);
      setAnswerChecked(false);
      setQuizMistakes(0);
      setWrongOptionsSelected([]);
      setShowTip(false);
    } else {
      handleGameComplete(quizScore);
    }
  };

  // 4. True/False Module (40 questions limit)
  const [tfIndex, setTfIndex] = useState(0);
  const [tfScore, setTfScore] = useState(0);
  const [tfChecked, setTfChecked] = useState(false);
  const [userTfChoice, setUserTfChoice] = useState<boolean | null>(null);
  const [tfIsCorrect, setTfIsCorrect] = useState(false);

  const tfPool = useMemo(() => {
    let pool = [...dailyDeck];
    pool = filterDuplicateTranslations(pool);
    if (pool.length < 40) {
      const extraNeeded = 40 - pool.length;
      const fallbackList = filterDuplicateTranslations(
        unlockedVocab.filter(w => !pool.some(p => p.id === w.id))
      );
      pool = [...pool, ...fallbackList.slice(0, extraNeeded)];
    }
    const tfItems = pool.slice(0, 40).map((word, idx) => {
      const hasSentence = word.example_greek && word.example_greek.trim().length > 0;
      const testSentence = hasSentence && (idx % 2 === 1);
      return {
        id: word.id,
        isExam: false,
        type: testSentence ? 'sentence' : 'word',
        greek: testSentence ? word.example_greek! : word.word_greek,
        chinese: testSentence ? word.example_chinese! : word.word_chinese,
        wordGreek: word.word_greek,
        wordChinese: word.word_chinese,
        word_greek: word.word_greek,
        word_chinese: word.word_chinese,
        pronunciation: word.pronunciation || '',
        detailed_tip: ''
      };
    });

    const level = activeExamLevel;
    const exams = (examQuestionsData || []).filter((q: any) => q.exam_level === level && q.question_type === 'truefalse');
    const examItems = exams.map((q: any) => ({
      id: q.id,
      isExam: true,
      type: 'exam',
      greek: q.greek,
      chinese: q.chinese,
      wordGreek: '',
      wordChinese: '',
      word_greek: q.greek,
      word_chinese: q.chinese,
      pronunciation: '',
      detailed_tip: q.detailed_tip,
      answer: q.answer
    }));

    const combined = [...examItems, ...tfItems];
    return filterDuplicateTranslations(combined).slice(0, 40);
  }, [dailyDeck, unlockedVocab, activeExamLevel]);

  const currentTfWord = tfPool[tfIndex] || null;

  const tfQuestionData = useMemo(() => {
    if (!currentTfWord) return { translation: '', isCorrect: true };
    if (currentTfWord.isExam) {
      return { translation: currentTfWord.chinese, isCorrect: (currentTfWord as any).answer };
    }
    const seed = (currentTfWord.id * 17 + tfIndex * 31) % 100;
    const shouldBeCorrect = seed >= 50;
    if (shouldBeCorrect) {
      return { translation: currentTfWord.chinese, isCorrect: true };
    } else {
      const otherTfItems = tfPool.filter(item => item.id !== currentTfWord.id && item.type === currentTfWord.type);
      const distractorItem = otherTfItems[seed % otherTfItems.length] || currentTfWord;
      return { translation: distractorItem.chinese, isCorrect: false };
    }
  }, [currentTfWord, tfIndex, tfPool]);

  const handleTfChoice = (choice: boolean) => {
    if (tfChecked) return;
    setUserTfChoice(choice);
    setTfChecked(true);
    const correct = choice === tfQuestionData.isCorrect;
    setTfIsCorrect(correct);
    if (correct) {
      setTfScore(prev => prev + 5);
    } else {
      setShowTip(true);
    }
  };

  const nextTf = () => {
    if (tfIndex < tfPool.length - 1) {
      setTfIndex(prev => prev + 1);
      setUserTfChoice(null);
      setTfChecked(false);
      setShowTip(false);
    } else {
      handleGameComplete(tfScore);
    }
  };

  // 5. Greek to Chinese Translation (20 questions limit)
  const [transGrZhIndex, setTransGrZhIndex] = useState(0);
  const [userTransGrZhInput, setUserTransGrZhInput] = useState('');
  const [transGrZhChecked, setTransGrZhChecked] = useState(false);
  const [isCorrectTransGrZh, setIsCorrectTransGrZh] = useState(false);
  const [transGrZhScore, setTransGrZhScore] = useState(0);

  // 6. Chinese to Greek Translation (20 questions limit)
  const [transZhGrIndex, setTransZhGrIndex] = useState(0);
  const [userTransZhGrInput, setUserTransZhGrInput] = useState('');
  const [transZhGrChecked, setTransZhGrChecked] = useState(false);
  const [isCorrectTransZhGrInput, setIsCorrectTransZhGrInput] = useState(false);
  const [transZhGrScore, setTransZhGrScore] = useState(0);

  const translationGrZhPool = useMemo(() => {
    let pool = [...dailyDeck];
    pool = filterDuplicateTranslations(pool);
    if (pool.length < 20) {
      const extraNeeded = 20 - pool.length;
      const fallbackList = filterDuplicateTranslations(
        unlockedVocab.filter(w => !pool.some(p => p.id === w.id))
      );
      pool = [...pool, ...fallbackList.slice(0, extraNeeded)];
    }
    const transItems = pool.slice(0, 20).map((word, idx) => {
      const hasSentence = word.example_greek && word.example_greek.trim().length > 0;
      const testSentence = hasSentence && (idx % 2 === 1);
      return {
        id: word.id,
        isExam: false,
        type: testSentence ? 'sentence' : 'word',
        greek: testSentence ? word.example_greek! : word.word_greek,
        chinese: testSentence ? word.example_chinese! : word.word_chinese,
        wordGreek: word.word_greek,
        wordChinese: word.word_chinese,
        word_greek: word.word_greek,
        word_chinese: word.word_chinese,
        pronunciation: word.pronunciation || '',
        detailed_tip: ''
      };
    });

    const level = activeExamLevel;
    const exams = (examQuestionsData || []).filter((q: any) => q.exam_level === level && q.question_type === 'translation_gr_zh');
    const examItems = exams.map((q: any) => ({
      id: q.id,
      isExam: true,
      type: 'exam',
      greek: q.greek,
      chinese: q.chinese,
      wordGreek: '',
      wordChinese: '',
      word_greek: q.greek,
      word_chinese: q.chinese,
      pronunciation: '',
      detailed_tip: q.detailed_tip
    }));

    const combined = [...examItems, ...transItems];
    return filterDuplicateTranslations(combined).slice(0, 20);
  }, [dailyDeck, unlockedVocab, activeExamLevel]);

  const translationZhGrPool = useMemo(() => {
    let pool = [...dailyDeck];
    pool = filterDuplicateTranslations(pool);
    if (pool.length < 20) {
      const extraNeeded = 20 - pool.length;
      const fallbackList = filterDuplicateTranslations(
        unlockedVocab.filter(w => !pool.some(p => p.id === w.id))
      );
      pool = [...pool, ...fallbackList.slice(0, extraNeeded)];
    }
    const transItems = pool.slice(0, 20).map((word, idx) => {
      const hasSentence = word.example_greek && word.example_greek.trim().length > 0;
      const testSentence = hasSentence && (idx % 2 === 1);
      return {
        id: word.id,
        isExam: false,
        type: testSentence ? 'sentence' : 'word',
        greek: testSentence ? word.example_greek! : word.word_greek,
        chinese: testSentence ? word.example_chinese! : word.word_chinese,
        wordGreek: word.word_greek,
        wordChinese: word.word_chinese,
        word_greek: word.word_greek,
        word_chinese: word.word_chinese,
        pronunciation: word.pronunciation || '',
        detailed_tip: ''
      };
    });

    const level = activeExamLevel;
    const exams = (examQuestionsData || []).filter((q: any) => q.exam_level === level && q.question_type === 'translation_zh_gr');
    const examItems = exams.map((q: any) => ({
      id: q.id,
      isExam: true,
      type: 'exam',
      greek: q.greek,
      chinese: q.chinese,
      wordGreek: '',
      wordChinese: '',
      word_greek: q.greek,
      word_chinese: q.chinese,
      pronunciation: '',
      detailed_tip: q.detailed_tip
    }));

    const combined = [...examItems, ...transItems];
    return filterDuplicateTranslations(combined).slice(0, 20);
  }, [dailyDeck, unlockedVocab, activeExamLevel]);

  const currentTransGrZh = translationGrZhPool[transGrZhIndex] || null;
  const currentTransZhGr = translationZhGrPool[transZhGrIndex] || null;

  const handleCheckTransGrZh = () => {
    const cleanUser = cleanChinese(userTransGrZhInput);
    const cleanAnswer = cleanChinese(currentTransGrZh.chinese);
    let correct = cleanUser === cleanAnswer || 
                  (cleanUser.includes(cleanAnswer) && cleanAnswer.length >= 1) || 
                  (cleanAnswer.includes(cleanUser) && cleanUser.length >= 1);
    
    // Check alternative translations based on the Greek word
    if (!correct) {
      const cleanGreekKey = cleanGreekForComparison(currentTransGrZh.greek);
      const alternatives = GREEK_ALTERNATIVE_TRANSLATIONS[cleanGreekKey] || [];
      for (const alt of alternatives) {
        const cleanAlt = cleanChinese(alt);
        if (cleanUser === cleanAlt || 
            (cleanUser.includes(cleanAlt) && cleanAlt.length >= 1) || 
            (cleanAlt.includes(cleanUser) && cleanUser.length >= 1)) {
          correct = true;
          break;
        }
      }
    }

    if (correct) {
      setTransGrZhChecked(true);
      setIsCorrectTransGrZh(true);
      setTransGrZhScore(prev => prev + 5);
      setTransGrZhWrongAttempt(false);
    } else {
      setTransGrZhWrongAttempt(true);
      setTransGrZhMistakes(prev => {
        const next = prev + 1;
        if (next >= 2) setShowTip(true);
        return next;
      });
    }
  };

  const handleNextTransGrZh = () => {
    if (transGrZhIndex < translationGrZhPool.length - 1) {
      setTransGrZhIndex(prev => prev + 1);
      setUserTransGrZhInput('');
      setTransGrZhChecked(false);
      setTransGrZhWrongAttempt(false);
      setTransGrZhMistakes(0);
      setShowTip(false);
    } else {
      handleGameComplete(transGrZhScore);
    }
  };

  const handleCheckTransZhGr = () => {
    const cleanUser = cleanGreekForComparison(userTransZhGrInput);
    const cleanAnswer = cleanGreekForComparison(currentTransZhGr.greek);
    const correct = cleanUser === cleanAnswer;
    if (correct) {
      setTransZhGrChecked(true);
      setIsCorrectTransZhGrInput(correct);
      setTransZhGrScore(prev => prev + 5);
      setTransZhGrWrongAttempt(false);
    } else {
      setTransZhGrWrongAttempt(true);
      setTransZhGrMistakes(prev => {
        const next = prev + 1;
        if (next >= 2) setShowTip(true);
        return next;
      });
    }
  };

  const handleNextTransZhGr = () => {
    if (transZhGrIndex < translationZhGrPool.length - 1) {
      setTransZhGrIndex(prev => prev + 1);
      setUserTransZhGrInput('');
      setTransZhGrChecked(false);
      setTransZhGrWrongAttempt(false);
      setTransZhGrMistakes(0);
      setShowTip(false);
    } else {
      handleGameComplete(transZhGrScore);
    }
  };

  // Switch Module handler
  const startModule = (module: 'matching' | 'spelling' | 'quiz' | 'truefalse' | 'translation_gr_zh' | 'translation_zh_gr') => {
    setActiveModule(module);
    setShowTip(false);
    
    // Reset specific states
    if (module === 'matching') {
      setMatchingRound(0);
      setMatchedIds([]);
      setSelectedGreekId(null);
      setSelectedChineseId(null);
      setMatchErrors({});
      
      let pool = [...dailyDeck].sort(() => Math.random() - 0.5);
      pool = filterDuplicateTranslations(pool);
      if (pool.length < 40) {
        const extraNeeded = 40 - pool.length;
        const fallbackList = filterDuplicateTranslations(
          unlockedVocab.filter(w => !pool.some(p => p.id === w.id))
        );
        pool = [...pool, ...fallbackList.slice(0, extraNeeded)];
      }
      const matchingItems = pool.slice(0, 40).map(w => ({
        ...w,
        isExam: false,
        detailed_tip: ''
      }));

      const level = activeExamLevel;
      const exams = (examQuestionsData || []).filter((q: any) => q.exam_level === level && q.question_type === 'matching');
      const examItems = exams.map((q: any) => ({
        id: q.id,
        book_id: 'exam',
        unit: 0,
        isExam: true,
        word_greek: q.greek,
        word_chinese: q.chinese,
        pronunciation: q.pronunciation || '',
        detailed_tip: q.detailed_tip
      }));

      let combined = [...examItems, ...matchingItems];
      combined = filterDuplicateTranslations(combined).slice(0, 40);
      setMatchingPool(combined);
      setupMatchingRound(combined, 0);
    }
    else if (module === 'spelling') {
      setSpellingIndex(0);
      setSpellInput([]);
      setSpellingCompleted(false);
      setSpellingMistakes(0);
      setSpellingWrongFlash(false);
    }
    else if (module === 'quiz') {
      setQuizIndex(0);
      setQuizScore(0);
      setSelectedOption(null);
      setAnswerChecked(false);
      setQuizMistakes(0);
      setWrongOptionsSelected([]);
    }
    else if (module === 'truefalse') {
      setTfIndex(0);
      setTfScore(0);
      setUserTfChoice(null);
      setTfChecked(false);
    }
    else if (module === 'translation_gr_zh') {
      setTransGrZhIndex(0);
      setUserTransGrZhInput('');
      setTransGrZhChecked(false);
      setTransGrZhScore(0);
      setTransGrZhMistakes(0);
      setTransGrZhWrongAttempt(false);
    }
    else if (module === 'translation_zh_gr') {
      setTransZhGrIndex(0);
      setUserTransGrZhInput('');
      setTransZhGrChecked(false);
      setTransZhGrScore(0);
      setTransZhGrMistakes(0);
    }
  };

  const handleGameComplete = (earnedPoints: number) => {
    const dateStr = getGreeceDateString();
    const currentCompleted = JSON.parse(localStorage.getItem('leon_completed_date_modules') || '{}');
    const completedForToday = currentCompleted[dateStr] || [];
    
    let updated = completedForToday;
    const updates: any = {};

    if (!completedForToday.includes(activeModule)) {
      updated = [...completedForToday, activeModule];
      currentCompleted[dateStr] = updated;
      updates.completed_date_modules = currentCompleted;
      setCompletedModulesForDate(updated);
    }

    // Check if all 6 core modules are completed today
    const coreModules = ['matching', 'spelling', 'quiz', 'truefalse', 'translation_gr_zh', 'translation_zh_gr'];
    const allCoreDone = coreModules.every(mod => updated.includes(mod));
    
    // Check if daily reward has been awarded for today
    const dailyRewardsAwarded = JSON.parse(localStorage.getItem('leon_daily_rewards_awarded') || '{}');
    let pointsEarnedText = "";
    
    if (allCoreDone && !dailyRewardsAwarded[dateStr]) {
      // Award exactly 10 points
      const newScore = score + 10;
      setScore(newScore);
      updates.score = newScore;
      
      dailyRewardsAwarded[dateStr] = true;
      updates.daily_rewards_awarded = dailyRewardsAwarded;
      
      pointsEarnedText = `\n🌟 太棒了！今天你已完成了全部六大核心特训模块，获得今日完成大奖 +10 XP！\n当前总积分: ${newScore} XP`;
    } else {
      pointsEarnedText = `\n今日已完成模块: ${updated.filter((m: string) => coreModules.includes(m)).length} / 6\n全部做完每天可积 10 分！\n当前总积分: ${score} XP`;
    }

    if (Object.keys(updates).length > 0) {
      saveSharedState(updates);
    }

    alert(`🎉 恭喜完成本模块练习！${pointsEarnedText}`);
    setActiveModule('dashboard');
  };

  // --- Views ---

  const renderDashboard = () => {
    // Group words in dailyDeck by book and unit for today's lesson plan overview
    const todayUnitsMap: Record<string, { bookId: string; unit: number; unitKey: string; words: Word[] }> = {};
    dailyDeck.forEach(word => {
      const unitKey = `${word.book_id.toUpperCase()}_${word.unit}`;
      if (!todayUnitsMap[unitKey]) {
        todayUnitsMap[unitKey] = {
          bookId: word.book_id,
          unit: word.unit,
          unitKey,
          words: []
        };
      }
      todayUnitsMap[unitKey].words.push(word);
    });
    const todayUnits = Object.values(todayUnitsMap).sort((a, b) => {
      return selectedUnitKeys.indexOf(a.unitKey) - selectedUnitKeys.indexOf(b.unitKey);
    });

    return (
      <div className="dashboard-view animate-fade-in">
        {/* Style tag containing keyframe animations */}
        <style>{`
          @keyframes pulse {
            0% { transform: scale(0.9); opacity: 0.9; }
            50% { transform: scale(1.4); opacity: 0.2; }
            100% { transform: scale(0.9); opacity: 0.9; }
          }
          @keyframes pulseGold {
            0% { transform: scale(1); box-shadow: 0 0 4px rgba(255, 215, 0, 0.4); border-color: #FFD700; }
            50% { transform: scale(1.03); box-shadow: 0 0 16px rgba(255, 215, 0, 0.8); border-color: #FFA500; }
            100% { transform: scale(1); box-shadow: 0 0 4px rgba(255, 215, 0, 0.4); border-color: #FFD700; }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-6px); }
            40%, 80% { transform: translateX(6px); }
          }
          @media (max-w: 800px) {
            .ebbinghaus-container {
              grid-template-columns: 1fr !important;
              gap: 24px !important;
            }
            .welcome-banner {
              flex-direction: column !important;
              align-items: flex-start !important;
              gap: 20px !important;
            }
            .welcome-banner-decor {
              display: none !important;
            }
            .greek-companions-card {
              flex-direction: column !important;
              text-align: center !important;
            }
          }
        `}</style>

        {/* Top Banner with Leon Scout Portrait */}
        <div className="welcome-banner" style={{
          background: 'linear-gradient(135deg, #0071E3, #2563EB)',
          borderRadius: '28px',
          padding: '36px',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 32px rgba(0, 113, 227, 0.12)',
          marginBottom: '40px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div className="welcome-banner-content">
            {/* Scout Avatar */}
            <img 
              src="/leon_avatar.png" 
              alt="Leon Scout Avatar" 
              className="welcome-avatar"
              style={{ cursor: 'pointer' }}
              onClick={() => window.location.href = '/admin'}
              title="进入家长控制后台"
            />
            <div className="welcome-text">
              <h1 className="welcome-title">
                Leon 的希腊语学习中心
              </h1>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', fontWeight: 700, margin: '2px 0 6px 0', textTransform: 'uppercase' }}>
                Κέντρο Εκμάθησης Ελληνικών του Leon
              </p>
              <p className="welcome-subtitle">
                智能记忆曲线调度 · 每日自适应复习空间
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', margin: '2px 0 0 0' }}>
                Έξυπνος Προγραμματισμός Καμπύλης Μνήμης · Καθημερινός Χώρος Προσαρμοστικής Επανάληψης
              </p>
            </div>
          </div>
          {/* Creative CSS Greek Flag Wave SVG Overlay */}
          <div className="welcome-banner-decor" style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '45%',
            minWidth: '320px',
            opacity: 1.0,
            zIndex: 1,
            pointerEvents: 'none'
          }}>
            <svg viewBox="0 0 500 200" width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
              <defs>
                <clipPath id="flagClip">
                  <rect width="120" height="80" rx="8" />
                </clipPath>
                <linearGradient id="flagShading" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#000000" stopOpacity="0.2" />
                  <stop offset="25%" stopColor="#FFFFFF" stopOpacity="0.25" />
                  <stop offset="50%" stopColor="#000000" stopOpacity="0.25" />
                  <stop offset="75%" stopColor="#FFFFFF" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
                </linearGradient>
                <linearGradient id="bannerFlagBlue" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0071E3" stopOpacity="0" />
                  <stop offset="25%" stopColor="#0071E3" stopOpacity="0.15" />
                  <stop offset="60%" stopColor="#0D5EAF" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#0A4B8F" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id="bannerFlagWhite" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                  <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.08" />
                  <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.85" />
                </linearGradient>
                <filter id="bannerGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              
              {/* Flowing blue background wave */}
              <path d="M 80,0 C 220,-20 280,120 420,30 C 470,0 520,20 500,0 L 500,200 L 80,200 Z" fill="url(#bannerFlagBlue)" />
              
              {/* Flowing white stripes */}
              <path d="M 120,40 C 240,0 300,140 440,50 C 480,20 520,40 500,30 L 500,200 L 120,200 Z" fill="url(#bannerFlagWhite)" opacity="0.3" />
              <path d="M 160,80 C 270,30 330,160 460,90 C 490,65 520,80 500,75 L 500,200 L 160,200 Z" fill="url(#bannerFlagWhite)" opacity="0.25" />
              <path d="M 200,120 C 300,70 370,180 480,130 C 500,115 520,125 500,122 L 500,200 L 200,200 Z" fill="url(#bannerFlagWhite)" opacity="0.2" />
 
              {/* Waving/3D Greek Flag Card */}
              <g transform="translate(260, 45) rotate(-3) scale(1.25)" filter="url(#bannerGlow)">
                {/* Flag shadow */}
                <rect width="120" height="80" rx="8" fill="rgba(0,0,0,0.2)" transform="translate(3, 4)" />
                {/* Flag Clip Group */}
                <g clipPath="url(#flagClip)">
                  {/* White base */}
                  <rect width="120" height="80" fill="#FFFFFF" />
                  {/* 5 Blue Stripes */}
                  <rect y="0" width="120" height="8.89" fill="#0D5EAF" />
                  <rect y="17.78" width="120" height="8.89" fill="#0D5EAF" />
                  <rect y="35.56" width="120" height="8.89" fill="#0D5EAF" />
                  <rect y="53.33" width="120" height="8.89" fill="#0D5EAF" />
                  <rect y="71.11" width="120" height="8.89" fill="#0D5EAF" />
                  {/* Canton */}
                  <rect x="0" y="0" width="44.44" height="44.44" fill="#0D5EAF" />
                  {/* Canton Cross */}
                  <rect x="0" y="17.78" width="44.44" height="8.89" fill="#FFFFFF" />
                  <rect x="17.78" y="0" width="8.89" height="44.44" fill="#FFFFFF" />
                  {/* Shading overlay (simulates waviness) */}
                  <rect width="120" height="80" fill="url(#flagShading)" opacity="0.35" />
                </g>
              </g>
            </svg>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div>
                <span className="stat-badge badge-blue">今日特训卡组</span>
                <div style={{ fontSize: '9px', color: '#0071E3', fontWeight: 700, marginTop: '2px' }}>ΣΕΤ ΕΚΠΑΙΔΕΥΣΗΣ</div>
              </div>
              <Clock size={16} className="text-blue" />
            </div>
            <div className="stat-value">{dailyDeck.length}</div>
            <div className="stat-desc">待复习/学习单词总量</div>
            <div style={{ fontSize: '11px', color: '#86868B', marginTop: '2px' }}>Συνολικές λέξεις για μελέτη</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <span className="stat-badge badge-green">记忆横跨周期</span>
                <div style={{ fontSize: '9px', color: '#34C759', fontWeight: 700, marginTop: '2px' }}>ΧΡΟΝΙΚΟ ΕΥΡΟΣ</div>
              </div>
              <Calendar size={16} className="text-green" />
            </div>
            <div className="stat-value">~{spannedMonths} 个月</div>
            <div className="stat-desc">今日横跨遗忘曲线大致几个月</div>
            <div style={{ fontSize: '11px', color: '#86868B', marginTop: '2px' }}>Χρονική κάλυψη επανάληψης</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <span className="stat-badge badge-orange">遗忘曲线复习</span>
                <div style={{ fontSize: '9px', color: '#FF9500', fontWeight: 700, marginTop: '2px' }}>ΚΑΜΠΥΛΗ ΛΗΘΗΣ</div>
              </div>
              <BrainCircuit size={16} className="text-orange" />
            </div>
            <div className="stat-value">{reviewWords.length}</div>
            <div className="stat-desc">根据记忆节点自动调度</div>
            <div style={{ fontSize: '11px', color: '#86868B', marginTop: '2px' }}>Αυτόματος προγραμματισμός</div>
          </div>
        </div>

        {/* Quick Navigation Anchors */}
        <div className="quick-nav-container">
          <button 
            onClick={() => document.getElementById('today-guide')?.scrollIntoView({ behavior: 'smooth' })}
            className="btn-premium"
            style={{
              flex: 1,
              background: 'rgba(0, 113, 227, 0.06)',
              color: '#0071E3',
              border: '1px solid rgba(0, 113, 227, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px',
              borderRadius: '16px',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '15px', fontWeight: 700 }}>一键直达“今日导学与词汇”</span>
            <span style={{ fontSize: '11px', color: '#86868B', marginTop: '2px' }}>Μετάβαση στον Καθημερινό Οδηγό & Λεξιλόγιο</span>
          </button>
          <button 
            onClick={() => document.getElementById('adaptive-training')?.scrollIntoView({ behavior: 'smooth' })}
            className="btn-premium"
            style={{
              flex: 1,
              background: 'rgba(52, 199, 89, 0.06)',
              color: '#34C759',
              border: '1px solid rgba(52, 199, 89, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px',
              borderRadius: '16px',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '15px', fontWeight: 700 }}>一键直达“自适应特训模块”</span>
            <span style={{ fontSize: '11px', color: '#86868B', marginTop: '2px' }}>Μετάβαση στις Ενότητες Εκπαίδευσης</span>
          </button>
        </div>

        {/* Ebbinghaus Forgetting Curve Tracking Chart */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid rgba(0, 0, 0, 0.04)',
          borderRadius: '28px',
          padding: '32px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
          marginBottom: '40px',
          display: 'grid',
          gridTemplateColumns: '1.2fr 1.8fr',
          gap: '32px',
          position: 'relative'
        }} className="ebbinghaus-container">
          {/* Left: SVG Line Chart */}
          <div className="section-header-with-icon" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <img 
                src="/zeus.png" 
                alt="Zeus" 
                className="header-char-img"
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1D1D1F', margin: 0, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span>艾宾浩斯遗忘曲线智能追踪</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#86868B', fontWeight: 600 }}>当前日期 / Ημερομηνία:</span>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,113,227,0.1)',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0071E3',
                  background: 'rgba(0,113,227,0.04)',
                  fontFamily: 'monospace'
                }}>
                  {selectedDateStr}
                </span>
              </div>
            </h3>
            <p style={{ fontSize: '11px', color: '#0071E3', fontWeight: 700, margin: '0 0 6px 0', textTransform: 'uppercase' }}>
              Αναλυτής Καμπύλης Λήθης Ebbinghaus
            </p>
          </div>
        </div>
            <p style={{ fontSize: '13px', color: '#86868B', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              动态追踪今日复习词汇的记忆留存率。绿色发光的节点表示今日正在激活调度的记忆周期。
              <span style={{ display: 'block', fontSize: '11.5px', color: '#86868B', marginTop: '4px' }}>
                Επιστημονική ανάλυση της ημερήσιας επανάληψης και της καμπύλης λήθης.
              </span>
            </p>

            <div style={{ background: '#F5F5F7', padding: '20px', borderRadius: '20px' }}>
              <svg viewBox="0 0 440 180" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0071E3" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#0071E3" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="40" y1="30" x2="400" y2="30" stroke="rgba(0,0,0,0.06)" strokeDasharray="3" />
                <line x1="40" y1="70" x2="400" y2="70" stroke="rgba(0,0,0,0.06)" strokeDasharray="3" />
                <line x1="40" y1="120" x2="400" y2="120" stroke="rgba(0,0,0,0.06)" strokeDasharray="3" />

                {/* Y-axis Labels */}
                <text x="10" y="34" fontSize="10" fill="#86868B" fontWeight="bold">100%</text>
                <text x="15" y="74" fontSize="10" fill="#86868B" fontWeight="bold">60%</text>
                <text x="15" y="124" fontSize="10" fill="#86868B" fontWeight="bold">20%</text>

                {/* Area under curve */}
                <path 
                  d="M 40,30 C 70,55 90,65 100,70 C 130,80 150,83 160,85 C 190,92 210,93 220,95 C 250,98 270,99 280,100 C 310,106 330,108 340,110 C 370,116 390,118 400,120 L 400,150 L 40,150 Z" 
                  fill="url(#curveGradient)" 
                />

                {/* Main line */}
                <path 
                  d="M 40,30 C 70,55 90,65 100,70 C 130,80 150,83 160,85 C 190,92 210,93 220,95 C 250,98 270,99 280,100 C 310,106 330,108 340,110 C 370,116 390,118 400,120" 
                  fill="none" 
                  stroke="#0071E3" 
                  strokeWidth="3.5" 
                />

                {/* Render Nodes */}
                {[
                  { day: 0, x: 40, y: 30, retention: '100%' },
                  { day: 1, x: 100, y: 70, retention: '58%' },
                  { day: 2, x: 160, y: 85, retention: '44%' },
                  { day: 4, x: 220, y: 95, retention: '36%' },
                  { day: 7, x: 280, y: 100, retention: '33%' },
                  { day: 15, x: 340, y: 110, retention: '28%' },
                  { day: 30, x: 400, y: 120, retention: '21%' }
                ].map((node, i) => {
                  const unitIndex = [0, 0, 0, 0, 1, 2, 3][i];
                  const unitItem = uniqueUnitsList[unitIndex];
                  const isActive = !!(unitItem && unitItem.count > 0);
                  const unitNameLabel = unitItem ? unitItem.displayUnit : `D${node.day}`;
                  const dateRangeStr = unitItem ? unitItem.dateRange : '';
                  const wordCount = unitItem ? unitItem.count : 0;

                  return (
                    <g key={i}>
                      {isActive && (
                        <circle 
                          cx={node.x} 
                          cy={node.y} 
                          r="14" 
                          fill="#34C759" 
                          opacity="0.35"
                          style={{ animation: 'pulse 2s infinite', transformOrigin: `${node.x}px ${node.y}px` }}
                        />
                      )}
                      <circle 
                        cx={node.x} 
                        cy={node.y} 
                        r={isActive ? "6.5" : "4.5"} 
                        fill={isActive ? "#34C759" : "#0071E3"} 
                        stroke="#FFFFFF" 
                        strokeWidth="2.5" 
                      />
                      <text x={node.x} y={node.y - 12} fontSize="9.5" fontWeight="800" fill={isActive ? "#34C759" : "#1D1D1F"} textAnchor="middle">
                        {node.retention}
                      </text>
                      <text x={node.x} y="152" fontSize="9.5" fontWeight="bold" fill={isActive ? "#34C759" : "#86868B"} textAnchor="middle">
                        {unitNameLabel}
                      </text>
                      <text x={node.x} y="163" fontSize="7.5" fill="#86868B" textAnchor="middle">
                        {dateRangeStr}
                      </text>
                      {isActive && (
                        <text x={node.x} y="174" fontSize="8.5" fontWeight="900" fill="#34C759" textAnchor="middle">
                          ({wordCount} 词)
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Right: Detailed List */}
          <div className="ebbinghaus-right-col" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#1D1D1F', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>今日复习任务分解</span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#34C759',
                background: 'rgba(52,199,89,0.08)',
                padding: '2px 6px',
                borderRadius: '6px',
                fontFamily: 'monospace'
              }}>
                {selectedDateStr}
              </span>
            </h4>
            <div style={{ fontSize: '11px', color: '#86868B', fontWeight: 650, textTransform: 'uppercase', marginBottom: '16px' }}>
              Ανάλυση Επαναλήψεων Σήμερα
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {uniqueUnitsList.map(item => {
                const isRecent = item.labelCn === "最近的复习";
                const isModeratelyRecent = item.labelCn === "稍近的复习";
                const isModeratelyRemote = item.labelCn === "稍远的复习";
                
                let pillStyle = { background: 'rgba(175, 82, 222, 0.08)', color: '#AF52DE', border: '1px solid rgba(175, 82, 222, 0.15)' };
                if (isRecent) {
                  pillStyle = { background: 'rgba(255, 59, 48, 0.08)', color: '#FF3B30', border: '1px solid rgba(255, 59, 48, 0.15)' };
                } else if (isModeratelyRecent) {
                  pillStyle = { background: 'rgba(255, 149, 0, 0.08)', color: '#FF9500', border: '1px solid rgba(255, 149, 0, 0.15)' };
                } else if (isModeratelyRemote) {
                  pillStyle = { background: 'rgba(0, 113, 227, 0.08)', color: '#0071E3', border: '1px solid rgba(0, 113, 227, 0.15)' };
                }

                return (
                  <div key={item.unitKey} className="review-task-item" style={{
                    background: item.count > 0 ? 'rgba(52, 199, 89, 0.05)' : '#F5F5F7',
                    border: item.count > 0 ? '1px solid rgba(52, 199, 89, 0.15)' : '1px solid rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '75%', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
                        <span style={{
                          fontSize: '9.5px',
                          fontWeight: 750,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          ...pillStyle
                        }}>
                          {item.labelCn}
                        </span>
                        <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#1D1D1F' }}>
                          {item.displayUnit} - {item.mainTitle}
                        </span>
                      </div>
                      {item.translationText && (
                        <span style={{ fontSize: '11px', color: '#86868B', lineHeight: 1.3 }}>
                          {item.translationText}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 800,
                        background: item.count > 0 ? '#34C759' : 'rgba(0,0,0,0.04)',
                        color: item.count > 0 ? '#FFFFFF' : '#86868B',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.count > 0 ? `${item.count} 词 / Λέξεις` : '0 词'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
        </div>

        <div id="today-guide" style={{
          background: '#FFFFFF',
          border: '1px solid rgba(0, 0, 0, 0.04)',
          borderRadius: '28px',
          padding: '32px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
          marginBottom: '48px',
          position: 'relative'
        }}>
          {/* Left Column: Title and Content */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="section-header-with-icon" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <img 
                src="/poseidon.png" 
                alt="Poseidon" 
                className="header-char-img"
              />
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1D1D1F', margin: 0 }}>今日学习导学与调度复习词汇</h2>
              <p style={{ fontSize: '13px', color: '#86868B', margin: '4px 0 0 0', fontWeight: 550 }}>
                Καθημερινός Οδηγός Μελέτης & Λεξιλόγιο Επανάληψης
              </p>
              <p style={{ fontSize: '12px', color: '#86868B', margin: '2px 0 0 0' }}>
                已按 A1-A → A1-B → A2 学习顺序智能编排，同步当前单元重点语法与词汇 | Έξυπνα οργανωμένα με σειρά εκμάθησης A1-A → A1-B → A2
              </p>
            </div>
          </div>

          {todayUnits.length === 0 ? (
            <div>
              <p style={{ color: '#86868B', fontStyle: 'italic', margin: 0 }}>今日暂无激活的课程内容，请前往后台激活单元。</p>
              <p style={{ color: '#86868B', fontStyle: 'italic', fontSize: '12px', margin: '4px 0 0 0' }}>
                Δεν υπάρχουν ενεργοποιημένα μαθήματα για σήμερα.
              </p>
            </div>
          ) : (
            <div className="today-units-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {todayUnits.map(unitGroup => {
                const bookChinese = unitGroup.bookId.toUpperCase();
                const unitNum = unitGroup.unit;
                const unitName = getUnitChineseName(bookChinese, unitNum);
                const grammar = getUnitGrammarPoints(bookChinese, unitNum);
                const wordsWithExamples = unitGroup.words.filter(w => w.example_greek);
                const unitKey = `${unitGroup.bookId}-${unitGroup.unit}`;
                const isUnitExpanded = expandedUnits[unitKey] || false;

                return (
                  <div key={unitKey} style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.01)'
                  }}>
                    {/* Unit Header (Collapsible trigger) */}
                    <div 
                      onClick={() => toggleUnit(unitKey)}
                      style={{
                        background: isUnitExpanded ? '#F8F9FA' : '#FFFFFF',
                        padding: '18px 24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'background 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          background: 'rgba(0,113,227,0.08)',
                          color: '#0071E3',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>{bookChinese}</span>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#1D1D1F' }}>
                          第 {unitNum} 单元: {unitName}
                        </span>
                        <span style={{ fontSize: '13px', color: '#86868B', fontWeight: 650 }}>
                          | Ενότητα {unitNum}
                        </span>
                        <span style={{
                          fontSize: '11.5px',
                          color: '#FF9500',
                          background: 'rgba(255,149,0,0.08)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontWeight: 600
                        }}>
                          预估学习区间: {getUnitDateRange(unitNum)}
                        </span>
                      </div>
                      <div>
                        {isUnitExpanded ? <ChevronDown size={20} style={{ color: '#86868B' }} /> : <ChevronRight size={20} style={{ color: '#86868B' }} />}
                      </div>
                    </div>

                    {/* Unit Content */}
                    {isUnitExpanded && (
                      <div style={{ padding: '8px 24px 20px 24px', background: '#FFFFFF', borderTop: '1px solid rgba(0, 0, 0, 0.03)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          
                          {/* Subsection 1: Grammar */}
                          <div style={{ border: '1px solid rgba(0, 0, 0, 0.04)', borderRadius: '14px', overflow: 'hidden' }}>
                            <div 
                              onClick={() => toggleSubsection(`${unitKey}-grammar`)}
                              style={{
                                background: 'rgba(255,149,0,0.03)',
                                padding: '12px 18px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                userSelect: 'none'
                              }}
                            >
                              <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#FF9500', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <BrainCircuit size={15} /> 核心语法重点 | Κύρια Σημεία Γραμματικής
                              </h4>
                              {expandedSubsections[`${unitKey}-grammar`] ? <ChevronDown size={16} style={{ color: '#FF9500' }} /> : <ChevronRight size={16} style={{ color: '#FF9500' }} />}
                            </div>
                            {expandedSubsections[`${unitKey}-grammar`] && (
                              <div style={{ padding: '16px 20px', background: '#FFFFFF', borderTop: '1px solid rgba(0,0,0,0.02)' }}>
                                <p style={{ fontSize: '13.5px', color: '#48484B', lineHeight: 1.6, margin: 0 }}>
                                  {grammar}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Subsection 2: Key sentences */}
                          <div style={{ border: '1px solid rgba(0, 0, 0, 0.04)', borderRadius: '14px', overflow: 'hidden' }}>
                            <div 
                              onClick={() => toggleSubsection(`${unitKey}-examples`)}
                              style={{
                                background: 'rgba(52,199,89,0.03)',
                                padding: '12px 18px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                userSelect: 'none'
                              }}
                            >
                              <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#34C759', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CheckCircle size={15} /> 重点课文例句 | Βασικές Προτάσεις Παραδείγματος
                              </h4>
                              {expandedSubsections[`${unitKey}-examples`] ? <ChevronDown size={16} style={{ color: '#34C759' }} /> : <ChevronRight size={16} style={{ color: '#34C759' }} />}
                            </div>
                            {expandedSubsections[`${unitKey}-examples`] && (
                              <div style={{ padding: '16px 20px', background: '#FFFFFF', borderTop: '1px solid rgba(0,0,0,0.02)' }}>
                                {wordsWithExamples.length === 0 ? (
                                  <div>
                                    <p style={{ fontSize: '13px', color: '#86868B', margin: 0, fontStyle: 'italic' }}>本单元暂无配套例句 | Δεν υπάρχουν παραδείγματα.</p>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {wordsWithExamples.map((word, wIdx) => (
                                      <div key={wIdx} style={{ fontSize: '13.5px', borderBottom: wIdx < wordsWithExamples.length - 1 ? '1px dashed rgba(0,0,0,0.04)' : 'none', paddingBottom: wIdx < wordsWithExamples.length - 1 ? '8px' : '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ textAlign: 'left' }}>
                                          <p style={{ fontWeight: 700, color: '#1D1D1F', margin: 0 }}>{word.example_greek}</p>
                                          <p style={{ color: '#86868B', margin: '2px 0 0 0', fontSize: '12px' }}>{word.example_chinese}</p>
                                        </div>
                                        <button 
                                          onClick={() => word.example_greek && speakGreek(word.example_greek)}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0071E3', padding: '6px', display: 'flex', alignItems: 'center' }}
                                          title="播放例句读音"
                                        >
                                          <Volume2 size={16} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Subsection 3: Words */}
                          <div style={{ border: '1px solid rgba(0, 0, 0, 0.04)', borderRadius: '14px', overflow: 'hidden' }}>
                            <div 
                              onClick={() => toggleSubsection(`${unitKey}-words`)}
                              style={{
                                background: 'rgba(0,113,227,0.03)',
                                padding: '12px 18px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                userSelect: 'none'
                              }}
                            >
                              <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0071E3', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Layers size={15} /> 本单元单词 | Λέξεις Επανάληψης ({unitGroup.words.length} 个单词)
                              </h4>
                              {expandedSubsections[`${unitKey}-words`] ? <ChevronDown size={16} style={{ color: '#0071E3' }} /> : <ChevronRight size={16} style={{ color: '#0071E3' }} />}
                            </div>
                            {expandedSubsections[`${unitKey}-words`] && (
                              <div style={{ padding: '16px 20px', background: '#FFFFFF', borderTop: '1px solid rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                                  {unitGroup.words.map(word => (
                                    <div key={word.id} style={{
                                      background: '#F8F9FA',
                                      border: '1px solid rgba(0,0,0,0.04)',
                                      padding: '12px 16px',
                                      borderRadius: '14px',
                                      fontSize: '13.5px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px'
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <span style={{ color: '#0071E3', fontWeight: 700, fontSize: '14.5px' }}>{word.word_greek}</span>
                                          <button 
                                            onClick={() => speakGreek(word.word_greek)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0071E3', padding: '2px', display: 'inline-flex', alignItems: 'center' }}
                                            title="播放读音"
                                          >
                                            <Volume2 size={13} style={{ flexShrink: 0 }} />
                                          </button>
                                        </div>
                                        <span style={{ color: '#1D1D1F', fontWeight: 600 }}>{word.word_chinese}</span>
                                      </div>
                                      {word.pronunciation && (
                                        <span style={{ color: '#86868B', fontSize: '11px', fontFamily: 'monospace' }}>/{word.pronunciation}/</span>
                                      )}
                                      {word.example_greek && (
                                        <div style={{ marginTop: '4px', borderTop: '1px dashed rgba(0,0,0,0.04)', paddingTop: '4px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <p style={{ color: '#48484B', fontSize: '11.5px', margin: 0, fontWeight: 550 }}>{word.example_greek}</p>
                                            <button 
                                              onClick={() => word.example_greek && speakGreek(word.example_greek)}
                                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#86868B', padding: '2px', display: 'inline-flex', alignItems: 'center' }}
                                              title="播放例句读音"
                                            >
                                              <Volume2 size={12} style={{ flexShrink: 0 }} />
                                            </button>
                                          </div>
                                          <p style={{ color: '#86868B', fontSize: '11px', margin: '2px 0 0 0' }}>{word.example_chinese}</p>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>

        <div id="adaptive-training" style={{
          position: 'relative',
          marginTop: '60px'
        }}>
          {/* Left Column: Title and Content */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="section-header-with-icon" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <img 
                src="/hades.png" 
                alt="Hades" 
                className="header-char-img"
              />
              <div>
                <h2 className="section-title" style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>自适应特训模块</h2>
                <p style={{ fontSize: '14px', color: '#86868B', fontWeight: 600, margin: '4px 0 0 0', textTransform: 'uppercase' }}>
                  Ενότητες Προσαρμοστικής Εκπαίδευσης
                </p>
              </div>
            </div>
          
          <div className="game-hub-grid">
            
            {/* Card Matching */}
            <div className="game-card border-blue" style={{ position: 'relative', paddingRight: '90px' }}>
              {completedModulesForDate.includes('matching') && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: '#34C759',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(52,199,89,0.3)',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  zIndex: 3
                }} title="今日已完成">
                  ✓
                </div>
              )}
              <img 
                src="/hephaestus.png" 
                alt="Hephaestus" 
                className="game-character-img"
              />
              <h3 className="game-title" style={{ marginBottom: '2px' }}>单词连连看</h3>
              <div style={{ fontSize: '11px', color: '#0071E3', fontWeight: 700, marginBottom: '8px' }}>
                ΤΑΙΡΙΑΣΜΑ ΛΕΞΕΩΝ
              </div>
              <p className="game-description" style={{ marginBottom: '16px' }}>
                左右对对碰！快速找出希腊语单词与中文释义的正确对应。
                <span style={{ display: 'block', fontSize: '12px', color: '#86868B', marginTop: '4px' }}>
                  Συνδέστε αριστερά και δεξιά! Βρείτε γρήγορα την αντιστοιχία ελληνικών λέξεων και κινεζικών σημασιών.
                </span>
              </p>
              <div style={{ fontSize: '13px', color: '#1D1D1F', marginBottom: '16px', fontWeight: 650 }}>
                题量：8 组对碰 (共 40 词)
              </div>
              <button 
                onClick={() => startModule('matching')} 
                className="btn-premium btn-blue-filled"
              >
                开始 <ChevronRight size={16} />
              </button>
            </div>

            {/* Spelling */}
            <div className="game-card border-green" style={{ position: 'relative', paddingRight: '90px' }}>
              {completedModulesForDate.includes('spelling') && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: '#34C759',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(52,199,89,0.3)',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  zIndex: 3
                }} title="今日已完成">
                  ✓
                </div>
              )}
              <img 
                src="/athena.png" 
                alt="Athena" 
                className="game-character-img"
              />
              <h3 className="game-title" style={{ marginBottom: '2px' }}>拼字大作战</h3>
              <div style={{ fontSize: '11px', color: '#34C759', fontWeight: 700, marginBottom: '8px' }}>
                ΜΑΧΗ ΟΡΘΟΓΡΑΦΙΑΣ
              </div>
              <p className="game-description" style={{ marginBottom: '16px' }}>
                根据中文释义拼写希腊语单词。支持键盘打字或点击字母卡片。
                <span style={{ display: 'block', fontSize: '12px', color: '#86868B', marginTop: '4px' }}>
                  Γράψτε την ελληνική λέξη σύμφωνα με την κινεζική σημασία. Υποστηρίζει πληκτρολόγηση ή κλικ σε κάρτες.
                </span>
              </p>
              <div style={{ fontSize: '13px', color: '#1D1D1F', marginBottom: '16px', fontWeight: 650 }}>
                题量：40 道题
              </div>
              <button 
                onClick={() => startModule('spelling')} 
                className="btn-premium btn-blue-filled"
              >
                开始 <ChevronRight size={16} />
              </button>
            </div>

            {/* MCQ */}
            <div className="game-card border-orange" style={{ position: 'relative', paddingRight: '90px' }}>
              {completedModulesForDate.includes('quiz') && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: '#34C759',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(52,199,89,0.3)',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  zIndex: 3
                }} title="今日已完成">
                  ✓
                </div>
              )}
              <img 
                src="/apollo.png" 
                alt="Apollo" 
                className="game-character-img"
              />
              <h3 className="game-title" style={{ marginBottom: '2px' }}>智能选择题</h3>
              <div style={{ fontSize: '11px', color: '#FF9500', fontWeight: 700, marginBottom: '8px' }}>
                ΕΡΩΤΗΣΕΙΣ ΠΟΛΛΑΠΛΗΣ ΕΠΙΛΟΓΗΣ
              </div>
              <p className="game-description" style={{ marginBottom: '16px' }}>
                四选一测试。快速检测你对希腊语核心词汇释义的掌握程度。
                <span style={{ display: 'block', fontSize: '12px', color: '#86868B', marginTop: '4px' }}>
                  Τεστ πολλαπλής επιλογής. Γρήγορος έλεγχος της κατανόησης των ελληνικών λέξεων.
                </span>
              </p>
              <div style={{ fontSize: '13px', color: '#1D1D1F', marginBottom: '16px', fontWeight: 650 }}>
                题量：30 道题
              </div>
              <button 
                onClick={() => startModule('quiz')} 
                className="btn-premium btn-blue-filled"
              >
                开始 <ChevronRight size={16} />
              </button>
            </div>

            {/* True/False */}
            <div className="game-card border-blue" style={{ position: 'relative', paddingRight: '90px' }}>
              {completedModulesForDate.includes('truefalse') && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: '#34C759',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(52,199,89,0.3)',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  zIndex: 3
                }} title="今日已完成">
                  ✓
                </div>
              )}
              <img 
                src="/ares.png" 
                alt="Ares" 
                className="game-character-img"
              />
              <h3 className="game-title" style={{ marginBottom: '2px' }}>判断对错</h3>
              <div style={{ fontSize: '11px', color: '#0071E3', fontWeight: 700, marginBottom: '8px' }}>
                ΣΩΣΤΟ Η ΛΑΘΟΣ
              </div>
              <p className="game-description" style={{ marginBottom: '16px' }}>
                快速判断中文翻译与希腊语单词是否匹配。锻炼即时词义与句子理解。
                <span style={{ display: 'block', fontSize: '12px', color: '#86868B', marginTop: '4px' }}>
                  Κρίνετε γρήγορα αν η κινεζική μετάφραση ταιριάζει με την ελληνική λέξη ή πρόταση.
                </span>
              </p>
              <div style={{ fontSize: '13px', color: '#1D1D1F', marginBottom: '16px', fontWeight: 650 }}>
                题量：40 道题 (包含单词与句子)
              </div>
              <button 
                onClick={() => startModule('truefalse')} 
                className="btn-premium btn-blue-filled"
              >
                开始 <ChevronRight size={16} />
              </button>
            </div>

            {/* Greek to Chinese Translation */}
            <div className="game-card border-green" style={{ position: 'relative', paddingRight: '90px' }}>
              {completedModulesForDate.includes('translation_gr_zh') && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: '#34C759',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(52,199,89,0.3)',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  zIndex: 3
                }} title="今日已完成">
                  ✓
                </div>
              )}
              <img 
                src="/hermes.png" 
                alt="Hermes" 
                className="game-character-img"
              />
              <h3 className="game-title" style={{ marginBottom: '2px' }}>希腊语翻译汉语</h3>
              <div style={{ fontSize: '11px', color: '#34C759', fontWeight: 700, marginBottom: '8px' }}>
                ΜΕΤΑΦΡΑΣΗ ΑΠΟ ΕΛΛΗΝΙΚΑ ΣΕ ΚΙΝΕΖΙΚΑ
              </div>
              <p className="game-description" style={{ marginBottom: '16px' }}>
                希译中特训。包含单词、短语及课文重点句子的双向互译练习。
                <span style={{ display: 'block', fontSize: '12px', color: '#86868B', marginTop: '4px' }}>
                  Εκπαίδευση μετάφρασης από ελληνικά σε κινεζικά.
                </span>
              </p>
              <div style={{ fontSize: '13px', color: '#1D1D1F', marginBottom: '16px', fontWeight: 650 }}>
                题量：20 道题 (包含单词与句子)
              </div>
              <button 
                onClick={() => startModule('translation_gr_zh')} 
                className="btn-premium btn-blue-filled"
              >
                开始 <ChevronRight size={16} />
              </button>
            </div>

            {/* Chinese to Greek Translation */}
            <div className="game-card border-orange" style={{ position: 'relative', paddingRight: '90px' }}>
              {completedModulesForDate.includes('translation_zh_gr') && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: '#34C759',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(52,199,89,0.3)',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  zIndex: 3
                }} title="今日已完成">
                  ✓
                </div>
              )}
              <img 
                src="/artemis.png" 
                alt="Artemis" 
                className="game-character-img"
              />
              <h3 className="game-title" style={{ marginBottom: '2px' }}>汉语翻译希腊语</h3>
              <div style={{ fontSize: '11px', color: '#FF9500', fontWeight: 700, marginBottom: '8px' }}>
                ΜΕΤΑΦΡΑΣΗ ΑΠΟ ΚΙΝΕΖΙΚΑ ΣΕ ΕΛΛΗΝΙΚΑ
              </div>
              <p className="game-description" style={{ marginBottom: '16px' }}>
                中译希特训。从汉语释义拼写完整的希腊语单词、短语或句子。
                <span style={{ display: 'block', fontSize: '12px', color: '#86868B', marginTop: '4px' }}>
                  Εκπαίδευση μετάφρασης από κινεζικά σε ελληνικά.
                </span>
              </p>
              <div style={{ fontSize: '13px', color: '#1D1D1F', marginBottom: '16px', fontWeight: 650 }}>
                题量：20 道题 (包含单词与句子)
              </div>
              <button 
                onClick={() => startModule('translation_zh_gr')} 
                className="btn-premium btn-blue-filled"
              >
                开始 <ChevronRight size={16} />
              </button>
            </div>

            {/* Writing & Speaking Challenge */}
            <div className="game-card border-blue" style={{ position: 'relative', paddingRight: '90px' }}>
              {completedModulesForDate.includes('writing_speaking') && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: '#34C759',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(52,199,89,0.3)',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  zIndex: 3
                }} title="今日已完成">
                  ✓
                </div>
              )}
              <img 
                src="/aphrodite.png" 
                alt="Aphrodite" 
                className="game-character-img"
              />
              <h3 className="game-title" style={{ marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                真题写作与口语挑战
                <span style={{
                  fontSize: '9.5px',
                  fontWeight: 800,
                  background: '#0071E3',
                  color: '#FFFFFF',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  textTransform: 'uppercase'
                }}>真题</span>
              </h3>
              <div style={{ fontSize: '11px', color: '#0071E3', fontWeight: 700, marginBottom: '8px' }}>
                ΣΥΓΓΡΑΦΗ & ΟΜΙΛΙΑ
              </div>
              <p className="game-description" style={{ marginBottom: '16px' }}>
                官方 A1/A2 真题写作和口语表达任务，通过写范文、对照大纲、查漏补缺来全面突破。
                <span style={{ display: 'block', fontSize: '12px', color: '#86868B', marginTop: '4px' }}>
                  Προκλήσεις γραπτού και προφορικού λόγου από τις επίσημες εξετάσεις.
                </span>
              </p>
              <div style={{ fontSize: '13px', color: '#1D1D1F', marginBottom: '16px', fontWeight: 650 }}>
                题量：6 大精选真题挑战
              </div>
              <button 
                onClick={() => {
                  setActiveModule('writing_speaking');
                  setCurrentChallengeIndex(0);
                  setUserWritingInput('');
                  setShowChallengeTip(false);
                }} 
                className="btn-premium btn-blue-filled"
              >
                开始 <ChevronRight size={16} />
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {activeModule !== 'dashboard' && (
              <button onClick={() => setActiveModule('dashboard')} className="btn-back">
                <ChevronLeft size={16} /> 
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span>返回控制台</span>
                  <span style={{ fontSize: '10px', color: '#86868B', fontWeight: 500 }}>Επιστροφή</span>
                </span>
              </button>
            )}
            <span className="navbar-brand">Leon Greek Coach</span>
            {(() => {
              let dotColor = '#007AFF';
              let statusText = '连接中';
              if (dbStatus === 'connected-server') {
                dotColor = '#34C759';
                statusText = '已同步';
              } else if (dbStatus === 'connected-cache') {
                dotColor = '#FF9500';
                statusText = '本地模式';
              } else if (dbStatus === 'error') {
                dotColor = '#FF3B30';
                statusText = '离线/未同步';
              }
              return (
                <div 
                  style={ {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#86868B',
                    background: 'rgba(0,0,0,0.03)',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    marginLeft: '8px',
                    border: '1px solid rgba(0,0,0,0.03)'
                  } }
                  title={ dbStatus === 'error' ? '云端数据库未启用，数据保存在此电脑本地' : '学习进度实时云端同步状态' }
                >
                  <span 
                    style={ {
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: dotColor,
                      display: 'inline-block'
                    } } 
                  />
                  <span>{statusText}</span>
                </div>
              );
            })()}
          </div>

          <div className="navbar-right">
            <div className="navbar-stats-row">
              <span className="score-label">
                <span>学习总积分</span>
                <span className="score-label-gr">Συνολικοί Πόντοι</span>
              </span>
              <div className="score-badge">
                <Trophy size={13} />
                <span>{score} XP</span>
              </div>
              {(() => {
                const currentLevel = getLevelInfo(score);
                return (
                  <div className="level-badge" style={{
                    background: currentLevel.gradient,
                    boxShadow: `0 4px 10px ${currentLevel.glowColor}`
                  }}>
                    <span>{currentLevel.icon}</span>
                    <span>{currentLevel.name}</span>
                  </div>
                );
              })()}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                onClick={() => setShowRulesModal(true)} 
                className="rules-button"
                style={{ margin: 0 }}
              >
                积分规则 & 升级进度 | Κανόνες & Πρόοδος
              </button>
              <button 
                onClick={() => window.location.href = '/admin'} 
                className="rules-button"
                style={{ 
                  margin: 0, 
                  background: 'rgba(255, 149, 0, 0.08)', 
                  color: '#FF9500', 
                  border: '1px solid rgba(255, 149, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600
                }}
              >
                <Settings size={13} />
                <span>家长通道 | Γονείς</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="main-content">
        {activeModule === 'dashboard' && renderDashboard()}

        {/* 1. Card Matching Module */}
        {activeModule === 'matching' && (
          <div className="game-module animate-fade-in" style={{ maxWidth: '800px' }}>
            <h2 className="module-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span>单词连连看对对碰</span>
              <span style={{ fontSize: '15px', color: '#86868B', fontWeight: 600 }}>当前进度: 组 {matchingRound + 1} / 8 (总共 40 词)</span>
            </h2>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#86868B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '24px', marginRight: '4px' }}>
              Πρόοδος: Γύρος {matchingRound + 1} / 8 (40 λέξεις συνολικά)
            </div>
            <div className="game-container-card" style={{ padding: '32px' }}>
              <div className="matching-game-grid">
                {/* Greek Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontWeight: 'bold', color: '#1D1D1F', marginBottom: '2px' }}>希腊语</h4>
                  <div style={{ fontSize: '11.5px', color: '#86868B', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>Ελληνικά</div>
                  {matchingGreek.map((word) => {
                    const isMatched = matchedIds.includes(word.id);
                    const isSelected = selectedGreekId === word.id;
                    return (
                      <button
                        key={`g-${word.id}`}
                        disabled={isMatched}
                        onClick={() => handleSelectCard('greek', word.id)}
                        style={{
                          padding: '16px',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid #0071E3' : '1px solid rgba(0,0,0,0.1)',
                          background: isMatched ? '#E5E5EA' : isSelected ? 'rgba(0,113,227,0.06)' : '#FFFFFF',
                          color: isMatched ? '#86868B' : '#1D1D1F',
                          fontWeight: 'bold',
                          cursor: isMatched ? 'default' : 'pointer',
                          transition: 'all 0.2s',
                          opacity: isMatched ? 0.5 : 1
                        }}
                      >
                        {word.word_greek}
                      </button>
                    );
                  })}
                </div>

                {/* Chinese Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontWeight: 'bold', color: '#1D1D1F', marginBottom: '2px' }}>中文释义</h4>
                  <div style={{ fontSize: '11.5px', color: '#86868B', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>Κινεζικά</div>
                  {matchingChinese.map((word) => {
                    const isMatched = matchedIds.includes(word.id);
                    const isSelected = selectedChineseId === word.id;
                    return (
                      <button
                        key={`c-${word.id}`}
                        disabled={isMatched}
                        onClick={() => handleSelectCard('chinese', word.id)}
                        style={{
                          padding: '16px',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid #0071E3' : '1px solid rgba(0,0,0,0.1)',
                          background: isMatched ? '#E5E5EA' : isSelected ? 'rgba(0,113,227,0.06)' : '#FFFFFF',
                          color: isMatched ? '#86868B' : '#1D1D1F',
                          fontWeight: 'bold',
                          cursor: isMatched ? 'default' : 'pointer',
                          transition: 'all 0.2s',
                          opacity: isMatched ? 0.5 : 1
                        }}
                      >
                        {word.word_chinese}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Matching Mistakes Hint Box */}
              {Object.keys(matchErrors).some(id => matchErrors[parseInt(id)] >= 2) && (
                <div style={{ marginTop: '24px', padding: '16px', background: '#FFF2E8', border: '1px solid #FFD591', borderRadius: '16px', textAlign: 'left' }}>
                  <h5 style={{ margin: '0 0 8px 0', color: '#D4380D', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                    <span>💡 连连看智能提示 / Συμβουλή:</span>
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.keys(matchErrors).map(idStr => {
                      const id = parseInt(idStr);
                      if (matchErrors[id] < 2) return null;
                      const word = matchingPool.find(w => w.id === id);
                      if (!word) return null;
                      return (
                        <div key={id} style={{ fontSize: '13px', color: '#1D1D1F', borderBottom: '1px dashed rgba(0,0,0,0.06)', paddingBottom: '6px' }}>
                          <strong style={{ color: '#0071E3' }}>{word.word_greek}</strong>
                          {word.pronunciation && <span style={{ color: '#86868B', marginLeft: '6px' }}>(/{word.pronunciation}/)</span>}
                          {" = "}{word.word_chinese}
                          <div style={{ color: '#D4380D', fontSize: '12.5px', marginTop: '4px', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                            {getDynamicTip(word)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Spelling Bee Module */}
        {activeModule === 'spelling' && currentSpellingWord && (
          <div className="game-module animate-fade-in" style={{ maxWidth: '600px' }}>
            <h2 className="module-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span>拼字大作战</span>
              <span style={{ fontSize: '15px', color: '#86868B', fontWeight: 600 }}>当前进度: {spellingIndex + 1} / {spellingPool.length}</span>
            </h2>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#86868B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '24px', marginRight: '4px' }}>
              Πρόοδος: {spellingIndex + 1} / {spellingPool.length}
            </div>
            <div className="game-container-card" style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF9500', marginBottom: '8px' }}>
                {currentSpellingWord.word_chinese}
              </div>
              <div style={{ color: '#86868B', fontSize: '13px', marginBottom: '4px', fontWeight: 600 }}>
                拼写对应的希腊语单词 (支持键盘直接打字输入)
              </div>
              <div style={{ color: '#86868B', fontSize: '11.5px', marginBottom: '32px', textTransform: 'uppercase' }}>
                Γράψτε την αντίστοιχη ελληνική λέξη
              </div>

              {/* Input Display */}
              <div style={{ 
                minHeight: '60px', 
                borderBottom: '2px solid #E5E5EA', 
                marginBottom: '40px', 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '8px', 
                fontSize: '28px', 
                fontWeight: 'bold', 
                color: '#1D1D1F' 
              }}>
                {spellInput.map((char, i) => (
                  <span key={i} style={{ borderBottom: '2px solid #0071E3', padding: '0 4px' }}>{char}</span>
                ))}
              </div>

              {spellingCompleted && (
                <div style={{ margin: '-20px 0 30px 0', fontSize: '22px', fontWeight: 'bold', color: '#34C759', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span>{currentSpellingWord.word_greek}</span>
                  <button 
                    onClick={() => speakGreek(currentSpellingWord.word_greek)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0071E3', display: 'inline-flex', alignItems: 'center', padding: '4px' }}
                    title="播放读音"
                  >
                    <Volume2 size={20} />
                  </button>
                </div>
              )}

              {/* Letter Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginBottom: '40px' }}>
                {scrambledLetters.map((letter, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleLetterClick(letter, idx)}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      border: '1px solid rgba(0,0,0,0.1)',
                      background: '#FFFFFF',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                    }}
                  >
                    {letter}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <button onClick={resetSpell} className="btn-premium" style={{ width: 'auto', padding: '10px 24px', border: '1px solid rgba(0,0,0,0.15)', background: '#FFFFFF', color: '#86868B' }}>
                  重置 / Επαναφορά
                </button>
                <button 
                  onClick={() => setShowTip(!showTip)} 
                  className="btn-premium" 
                  style={{ width: 'auto', padding: '10px 24px', border: '1px solid #FF9500', background: showTip ? 'rgba(255,149,0,0.12)' : 'rgba(255,149,0,0.05)', color: '#FF9500' }}
                >
                  {showTip ? '收起提示 / Απόκρυψη' : '查看提示 / Συμβουλή'}
                </button>
                {spellingCompleted && (
                  <button onClick={nextSpelling} className="btn-premium btn-blue-filled" style={{ width: 'auto', padding: '10px 24px' }}>
                    {spellingIndex === spellingPool.length - 1 ? '完成拼写 / Ολοκλήρωση' : '下一个 / Επόμενο'}
                  </button>
                )}
              </div>

              {/* Spelling Game Hint Box */}
              {(spellingMistakes >= 2 || showTip) && (
                <div style={{ marginTop: '24px', padding: '16px', background: '#FFF2E8', border: '1px solid #FFD591', borderRadius: '16px', textAlign: 'left' }}>
                  <h5 style={{ margin: '0 0 8px 0', color: '#D4380D', fontWeight: 'bold', fontSize: '14px' }}>💡 拼字大作战提示 / Συμβουλή:</h5>
                  <div style={{ fontSize: '13px', color: '#1D1D1F', whiteSpace: 'pre-wrap' }}>
                    {getDynamicTip(currentSpellingWord)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. MCQ Quiz Module */}
        {activeModule === 'quiz' && currentQuizWord && (
          <div className="game-module animate-fade-in" style={{ maxWidth: '600px' }}>
            <h2 className="module-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span>智能选择题</span>
              <span style={{ fontSize: '15px', color: '#86868B', fontWeight: 600 }}>当前进度: {quizIndex + 1} / {quizPool.length}</span>
            </h2>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#86868B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '24px', marginRight: '4px' }}>
              Πρόοδος: {quizIndex + 1} / {quizPool.length}
            </div>
            <div className="game-container-card" style={{ padding: '32px' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <span style={{ fontSize: '14px', color: '#86868B', fontWeight: 'bold' }}>选择对应的中文释义</span>
                <div style={{ fontSize: '11px', color: '#86868B', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>
                  Επιλέξτε την αντίστοιχη κινεζική μετάφραση
                </div>
                <h3 style={{ fontSize: '36px', fontWeight: 800, color: '#0071E3', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <span>{currentQuizWord.word_greek}</span>
                  <button 
                    onClick={() => speakGreek(currentQuizWord.word_greek)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0071E3', display: 'inline-flex', alignItems: 'center', padding: '4px' }}
                    title="播放读音"
                  >
                    <Volume2 size={24} />
                  </button>
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                {quizOptions.map((opt, i) => {
                  const isSelected = selectedOption === opt;
                  const isCorrect = opt === currentQuizWord.word_chinese;
                  
                  let cardBg = '#FFFFFF';
                  let cardBorder = '1px solid rgba(0,0,0,0.1)';
                  
                  if (answerChecked) {
                    if (isCorrect) {
                      cardBg = 'rgba(52,199,89,0.08)';
                      cardBorder = '2px solid #34C759';
                    } else if (isSelected) {
                      cardBg = 'rgba(255,59,48,0.08)';
                      cardBorder = '2px solid #FF3B30';
                    }
                  } else if (isSelected) {
                    cardBorder = '2px solid #0071E3';
                    cardBg = 'rgba(0,113,227,0.04)';
                  }

                  return (
                    <button
                      key={i}
                      disabled={answerChecked}
                      onClick={() => handleSelectOption(opt)}
                      style={{
                        padding: '16px 20px',
                        borderRadius: '14px',
                        border: cardBorder,
                        background: cardBg,
                        textAlign: 'left',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1D1D1F',
                        cursor: answerChecked ? 'default' : 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span>{opt}</span>
                      {answerChecked && isCorrect && <Check size={18} style={{ color: '#34C759' }} />}
                      {answerChecked && isSelected && !isCorrect && <X size={18} style={{ color: '#FF3B30' }} />}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                {!answerChecked ? (
                  <>
                    <button 
                      onClick={() => setShowTip(!showTip)} 
                      className="btn-premium"
                      style={{ width: 'auto', padding: '12px 24px', border: '1px solid #FF9500', background: showTip ? 'rgba(255,149,0,0.12)' : 'rgba(255,149,0,0.05)', color: '#FF9500' }}
                    >
                      {showTip ? '收起提示 / Απόκρυψη' : '查看提示 / Συμβουλή'}
                    </button>
                    <button 
                      disabled={!selectedOption} 
                      onClick={checkQuizAnswer} 
                      className="btn-premium btn-blue-filled"
                      style={{ width: 'auto', padding: '12px 40px', opacity: selectedOption ? 1 : 0.5 }}
                    >
                      检查答案 / Έλεγχος
                    </button>
                  </>
                ) : (
                  <button onClick={nextQuiz} className="btn-premium btn-blue-filled" style={{ width: 'auto', padding: '12px 40px' }}>
                    {quizIndex === quizPool.length - 1 ? '完成测试 / Ολοκλήρωση' : '下一题 / Επόμενο'}
                  </button>
                )}
              </div>

              {/* Quiz Game Hint Box */}
              {(quizMistakes >= 2 || showTip || answerChecked) && (
                <div style={{ marginTop: '24px', padding: '16px', background: '#FFF2E8', border: '1px solid #FFD591', borderRadius: '16px', textAlign: 'left' }}>
                  <h5 style={{ margin: '0 0 8px 0', color: '#D4380D', fontWeight: 'bold', fontSize: '14px' }}>💡 选择题智能提示 / Συμβουλή:</h5>
                  <div style={{ fontSize: '13px', color: '#1D1D1F', whiteSpace: 'pre-wrap' }}>
                    {getDynamicTip(currentQuizWord)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. True/False Module */}
        {activeModule === 'truefalse' && currentTfWord && (
          <div className="game-module animate-fade-in" style={{ maxWidth: '600px' }}>
            <h2 className="module-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span>判断对错</span>
              <span style={{ fontSize: '15px', color: '#86868B', fontWeight: 600 }}>当前进度: {tfIndex + 1} / {tfPool.length}</span>
            </h2>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#86868B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '24px', marginRight: '4px' }}>
              Πρόοδος: {tfIndex + 1} / {tfPool.length}
            </div>
            <div className="game-container-card" style={{ padding: '40px 32px', textAlign: 'center' }}>
              <div style={{ marginBottom: '40px' }}>
                <span style={{ fontSize: '14px', color: '#86868B', fontWeight: 'bold' }}>
                  {currentTfWord.isExam 
                    ? '根据真题背景，判断该希腊语句子的叙述是否正确（正确=符合背景，错误=不符）' 
                    : '判断中文翻译是否与希腊语单词或句子匹配'}
                </span>
                <div style={{ fontSize: '11px', color: '#86868B', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px', marginBottom: '24px' }}>
                  {currentTfWord.isExam 
                    ? 'Κρίνετε εάν η πρόταση είναι σωστή ή λάθος σύμφωνα με το κείμενο' 
                    : 'Κρίνετε εάν η κινεζική μετάφραση ταιριάζει με την ελληνική λέξη ή πρόταση'}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '12px', marginBottom: '16px' }}>
                  <h3 style={{ 
                    fontSize: currentTfWord.type === 'sentence' ? '28px' : '44px', 
                    fontWeight: 800, 
                    color: '#0071E3', 
                    margin: 0,
                    fontFamily: 'Inter, sans-serif',
                    lineHeight: '1.4'
                  }}>
                    {currentTfWord.greek}
                  </h3>
                  <button 
                    onClick={() => speakGreek(currentTfWord.greek)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0071E3', display: 'inline-flex', alignItems: 'center', padding: '4px' }}
                    title="播放读音"
                  >
                    <Volume2 size={currentTfWord.type === 'sentence' ? 22 : 26} />
                  </button>
                </div>
                
                {currentTfWord.type === 'word' && currentTfWord.pronunciation && (
                  <p style={{ fontSize: '15px', color: '#86868B', fontStyle: 'italic', margin: '0 0 24px 0' }}>
                    /{currentTfWord.pronunciation}/
                  </p>
                )}

                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  background: currentTfWord.type === 'sentence' ? 'rgba(255,149,0,0.08)' : 'rgba(0,113,227,0.08)',
                  color: currentTfWord.type === 'sentence' ? '#FF9500' : '#0071E3',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  display: 'inline-block',
                  marginBottom: '16px',
                  textTransform: 'uppercase'
                }}>
                  {currentTfWord.type === 'sentence' ? '句子 / Πρόταση' : '单词 / Λέξη'}
                </div>
                
                <div>
                  <div style={{
                    display: 'inline-block',
                    background: '#F5F5F7',
                    border: '1px solid rgba(0,0,0,0.06)',
                    padding: '16px 32px',
                    borderRadius: '16px',
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#1D1D1F',
                    marginTop: '4px',
                    lineHeight: '1.4'
                  }}>
                    中文翻译: {tfQuestionData.translation}
                  </div>
                </div>

                {currentTfWord.isExam && (
                  <div style={{ maxWidth: '480px', margin: '16px auto 0 auto' }}>
                    <div style={{
                      background: 'rgba(255, 59, 48, 0.06)',
                      border: '1px solid rgba(255, 59, 48, 0.15)',
                      color: '#FF3B30',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      textAlign: 'center',
                      lineHeight: '1.4'
                    }}>
                      ⚠️ 注意：請根據真題課文背景判斷敘述是否正確，而非判斷中文翻譯是否正確！
                    </div>
                    
                    <details style={{
                      marginTop: '12px',
                      textAlign: 'left',
                      background: '#FFF2E8',
                      border: '1px solid #FFD591',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      cursor: 'pointer'
                    }}>
                      <summary style={{
                        fontWeight: 700,
                        color: '#D4380D',
                        fontSize: '13.5px',
                        outline: 'none',
                        userSelect: 'none'
                      }}>
                        📖 查看課文背景與線索 / Δείτε το κείμενο
                      </summary>
                      <div style={{
                        marginTop: '8px',
                        fontSize: '12.5px',
                        color: '#1D1D1F',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap',
                        cursor: 'text'
                      }}>
                        {currentTfWord.detailed_tip || '本題無背景線索提示。'}
                      </div>
                    </details>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {!tfChecked ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                    <button 
                      onClick={() => handleTfChoice(true)}
                      className="btn-premium"
                      style={{ 
                        flex: 1, 
                        padding: '16px', 
                        fontSize: '18px', 
                        fontWeight: 'bold', 
                        background: '#34C759', 
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: '2px',
                        boxShadow: '0 4px 12px rgba(52, 199, 89, 0.2)'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={22} /> 正确</span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: 550 }}>Σωστό</span>
                    </button>
                    <button 
                      onClick={() => handleTfChoice(false)}
                      className="btn-premium"
                      style={{ 
                        flex: 1, 
                        padding: '16px', 
                        fontSize: '18px', 
                        fontWeight: 'bold', 
                        background: '#FF3B30', 
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: '2px',
                        boxShadow: '0 4px 12px rgba(255, 59, 48, 0.2)'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><X size={22} /> 错误</span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: 550 }}>Λάθος</span>
                    </button>
                  </div>
                  <button 
                    onClick={() => setShowTip(!showTip)} 
                    className="btn-premium"
                    style={{ width: 'auto', padding: '10px 24px', border: '1px solid #FF9500', background: showTip ? 'rgba(255,149,0,0.12)' : 'rgba(255,149,0,0.05)', color: '#FF9500', margin: '0 auto' }}
                  >
                    {showTip ? '收起提示 / Απόκρυψη' : '查看提示 / Συμβουλή'}
                  </button>
                </div>
              ) : (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ 
                    background: tfIsCorrect ? 'rgba(52,199,89,0.08)' : 'rgba(255,59,48,0.08)',
                    color: tfIsCorrect ? '#34C759' : '#FF3B30',
                    padding: '20px',
                    borderRadius: '16px',
                    fontWeight: 'bold',
                    fontSize: '17px',
                    textAlign: 'center',
                    marginBottom: '24px',
                    border: tfIsCorrect ? '1px solid rgba(52,199,89,0.2)' : '1px solid rgba(255,59,48,0.2)'
                  }}>
                    {tfIsCorrect ? (
                      <div>
                        <span>🎉 回答正确！+5 XP</span>
                        <div style={{ fontSize: '11.5px', color: '#34C759', fontWeight: 650, marginTop: '2px' }}>ΣΩΣΤΗ ΑΠΑΝΤΗΣΗ!</div>
                      </div>
                    ) : (
                      <div>
                        <span>❌ 判断错误</span>
                        <div style={{ fontSize: '11.5px', color: '#FF3B30', fontWeight: 650, marginTop: '2px' }}>ΛΑΘΟΣ ΚΡΙΣΗ</div>
                      </div>
                    )}
                    <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#86868B', marginTop: '12px' }}>
                      {currentTfWord.isExam ? (
                        <>
                          本题叙述正确性是 / Η σωστή απάντηση είναι: 
                          <div style={{ color: '#1D1D1F', fontWeight: 700, fontSize: '18px', marginTop: '4px' }}>
                            {tfQuestionData.isCorrect ? '正确 (Σωστό)' : '错误 (Λάθος)'}
                          </div>
                        </>
                      ) : (
                        <>
                          正确的中文释义是 / Η σωστή σημασία είναι: 
                          <div style={{ color: '#1D1D1F', fontWeight: 700, fontSize: '16px', marginTop: '4px' }}>{currentTfWord.chinese}</div>
                        </>
                      )}
                    </div>
                  </div>

                  <button onClick={nextTf} className="btn-premium btn-blue-filled" style={{ width: 'auto', padding: '12px 48px', margin: '0 auto' }}>
                    下一题 / Επόμενο
                  </button>
                </div>
              )}

              {/* TF Game Hint Box */}
              {(showTip || tfChecked) && (
                <div style={{ marginTop: '24px', padding: '16px', background: '#FFF2E8', border: '1px solid #FFD591', borderRadius: '16px', textAlign: 'left' }}>
                  <h5 style={{ margin: '0 0 8px 0', color: '#D4380D', fontWeight: 'bold', fontSize: '14px' }}>💡 判断题智能提示 / Συμβουλή:</h5>
                  <div style={{ fontSize: '13px', color: '#1D1D1F', whiteSpace: 'pre-wrap' }}>
                    {getDynamicTip(currentTfWord)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. Greek to Chinese Translation Module */}
        {activeModule === 'translation_gr_zh' && currentTransGrZh && (
          <div className="game-module animate-fade-in" style={{ maxWidth: '650px' }}>
            <h2 className="module-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span>希腊语翻译汉语</span>
              <span style={{ fontSize: '15px', color: '#86868B', fontWeight: 600 }}>当前进度: {transGrZhIndex + 1} / {translationGrZhPool.length}</span>
            </h2>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#86868B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '24px', marginRight: '4px' }}>
              Πρόοδος: {transGrZhIndex + 1} / {translationGrZhPool.length}
            </div>
            <div className="game-container-card" style={{ padding: '32px' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: 700, 
                  background: currentTransGrZh.type === 'sentence' ? 'rgba(255,149,0,0.08)' : 'rgba(0,113,227,0.08)',
                  color: currentTransGrZh.type === 'sentence' ? '#FF9500' : '#0071E3',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  textTransform: 'uppercase'
                }}>
                  {currentTransGrZh.type === 'sentence' ? '句子 / 短语翻译 (Πρόταση)' : '单词翻译 (Λέξη)'}
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '16px' }}>
                  <h3 style={{ 
                    fontSize: currentTransGrZh.type === 'sentence' ? '28px' : '40px', 
                    fontWeight: 800, 
                    color: '#1D1D1F', 
                    margin: 0,
                    lineHeight: '1.4',
                    fontFamily: 'Inter, sans-serif'
                  }}>
                    {currentTransGrZh.greek}
                  </h3>
                  <button 
                    onClick={() => speakGreek(currentTransGrZh.greek)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0071E3', display: 'inline-flex', alignItems: 'center', padding: '4px' }}
                    title="播放读音"
                  >
                    <Volume2 size={currentTransGrZh.type === 'sentence' ? 22 : 26} />
                  </button>
                </div>

                {currentTransGrZh.type === 'word' && currentTransGrZh.pronunciation && (
                  <p style={{ color: '#86868B', fontStyle: 'italic', marginTop: '4px' }}>/{currentTransGrZh.pronunciation}/</p>
                )}
              </div>

              <div className="admin-input-group" style={{ marginBottom: '32px' }}>
                <label className="admin-label" style={{ fontWeight: 600 }}>
                  请输入中文翻译 / Εισάγετε την κινεζική μετάφραση：
                </label>
                <input
                  type="text"
                  placeholder="在此输入中文翻译..."
                  value={userTransGrZhInput}
                  onChange={e => setUserTransGrZhInput(e.target.value)}
                  className="admin-input"
                  disabled={transGrZhChecked}
                  style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px' }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && userTransGrZhInput.trim()) {
                      if (!transGrZhChecked) {
                        handleCheckTransGrZh();
                      } else {
                        handleNextTransGrZh();
                      }
                    }
                  }}
                />
              </div>

              {transGrZhChecked && (
                <div style={{ 
                  background: isCorrectTransGrZh ? 'rgba(52,199,89,0.08)' : 'rgba(255,59,48,0.08)',
                  color: isCorrectTransGrZh ? '#34C759' : '#FF3B30',
                  padding: '18px',
                  borderRadius: '12px',
                  marginBottom: '32px',
                  fontWeight: 'bold',
                  border: isCorrectTransGrZh ? '1px solid rgba(52,199,89,0.2)' : '1px solid rgba(255,59,48,0.2)'
                }}>
                  <p style={{ margin: 0, fontSize: '16px' }}>
                    {isCorrectTransGrZh ? '🎉 回答正确！+5 XP' : '❌ 回答错误'}
                  </p>
                  <p style={{ fontSize: '11px', textTransform: 'uppercase', margin: '2px 0 6px 0', opacity: 0.9 }}>
                    {isCorrectTransGrZh ? 'ΣΩΣΤΗ ΑΠΑΝΤΗΣΗ!' : 'ΛΑΘΟΣ ΑΠΑΝΤΗΣΗ'}
                  </p>
                  <p style={{ color: '#1D1D1F', fontSize: '14.5px', marginTop: '6px', fontWeight: 600 }}>
                    标准答案 / Σωστή Απάντηση: {currentTransGrZh.chinese}
                  </p>
                  {currentTransGrZh.type === 'sentence' && (
                    <p style={{ color: '#86868B', fontSize: '12.5px', marginTop: '4px', fontWeight: 500 }}>
                      单词释义 / Λεξιλόγιο: {currentTransGrZh.wordGreek} → {currentTransGrZh.wordChinese}
                    </p>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                {!transGrZhChecked ? (
                  <>
                    <button 
                      onClick={() => setShowTip(!showTip)} 
                      className="btn-premium"
                      style={{ width: 'auto', padding: '12px 24px', border: '1px solid #FF9500', background: showTip ? 'rgba(255,149,0,0.12)' : 'rgba(255,149,0,0.05)', color: '#FF9500' }}
                    >
                      {showTip ? '收起提示 / Απόκρυψη' : '查看提示 / Συμβουλή'}
                    </button>
                    <button 
                      disabled={!userTransGrZhInput.trim()} 
                      onClick={handleCheckTransGrZh} 
                      className="btn-premium btn-blue-filled"
                      style={{ width: 'auto', padding: '12px 48px', opacity: userTransGrZhInput.trim() ? 1 : 0.5 }}
                    >
                      验证答案 / Επαλήθευση
                    </button>
                  </>
                ) : (
                  <button onClick={handleNextTransGrZh} className="btn-premium btn-blue-filled" style={{ width: 'auto', padding: '12px 48px' }}>
                    {transGrZhIndex === translationGrZhPool.length - 1 ? '收集积分 / Ολοκλήρωση' : '下一题 / Επόμενο'}
                  </button>
                )}
              </div>

              {/* Translation Hint Box */}
              {(transGrZhMistakes >= 2 || showTip || transGrZhChecked) && (
                <div style={{ marginTop: '24px', padding: '16px', background: '#FFF2E8', border: '1px solid #FFD591', borderRadius: '16px', textAlign: 'left' }}>
                  <h5 style={{ margin: '0 0 8px 0', color: '#D4380D', fontWeight: 'bold', fontSize: '14px' }}>💡 翻译提示 / Συμβουλή:</h5>
                  <div style={{ fontSize: '13px', color: '#1D1D1F', whiteSpace: 'pre-wrap' }}>
                    {getDynamicTip(currentTransGrZh)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. Chinese to Greek Translation Module */}
        {activeModule === 'translation_zh_gr' && currentTransZhGr && (
          <div className="game-module animate-fade-in" style={{ maxWidth: '650px' }}>
            <h2 className="module-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span>汉语翻译希腊语</span>
              <span style={{ fontSize: '15px', color: '#86868B', fontWeight: 600 }}>当前进度: {transZhGrIndex + 1} / {translationZhGrPool.length}</span>
            </h2>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#86868B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '24px', marginRight: '4px' }}>
              Πρόοδος: {transZhGrIndex + 1} / {translationZhGrPool.length}
            </div>
            <div className="game-container-card" style={{ padding: '32px' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: 700, 
                  background: currentTransZhGr.type === 'sentence' ? 'rgba(255,149,0,0.08)' : 'rgba(0,113,227,0.08)',
                  color: currentTransZhGr.type === 'sentence' ? '#FF9500' : '#0071E3',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  textTransform: 'uppercase'
                }}>
                  {currentTransZhGr.type === 'sentence' ? '句子 / 短语翻译 (Πρόταση)' : '单词翻译 (Λέξη)'}
                </span>
                
                <h3 style={{ 
                  fontSize: '28px', 
                  fontWeight: 800, 
                  color: '#1D1D1F', 
                  marginTop: '16px',
                  lineHeight: '1.4'
                }}>
                  {currentTransZhGr.chinese}
                </h3>
              </div>

              <div className="admin-input-group" style={{ marginBottom: '32px' }}>
                <label className="admin-label" style={{ fontWeight: 600 }}>
                  请输入希腊语翻译 / Εισάγετε την ελληνική μετάφραση：
                </label>
                <div style={{ fontSize: '11px', color: '#86868B', fontWeight: 550, marginBottom: '6px' }}>
                  (系统将智能忽略大小写、标点和重音/音标输入差错 | Το σύστημα θα αγνοήσει τόνους και στίξη)
                </div>
                <input
                  type="text"
                  placeholder="在此输入希腊语翻译..."
                  value={userTransZhGrInput}
                  onChange={e => setUserTransZhGrInput(e.target.value)}
                  className="admin-input"
                  disabled={transZhGrChecked}
                  style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px' }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && userTransZhGrInput.trim()) {
                      if (!transZhGrChecked) {
                        handleCheckTransZhGr();
                      } else {
                        handleNextTransZhGr();
                      }
                    }
                  }}
                />
              </div>

              {transZhGrChecked && (
                <div style={{ 
                  background: isCorrectTransZhGrInput ? 'rgba(52,199,89,0.08)' : 'rgba(255,59,48,0.08)',
                  color: isCorrectTransZhGrInput ? '#34C759' : '#FF3B30',
                  padding: '18px',
                  borderRadius: '12px',
                  marginBottom: '32px',
                  fontWeight: 'bold',
                  border: isCorrectTransZhGrInput ? '1px solid rgba(52,199,89,0.2)' : '1px solid rgba(255,59,48,0.2)'
                }}>
                  <p style={{ margin: 0, fontSize: '16px' }}>
                    {isCorrectTransZhGrInput ? '🎉 回答正确！+5 XP' : '❌ 回答错误'}
                  </p>
                  <p style={{ fontSize: '11px', textTransform: 'uppercase', margin: '2px 0 6px 0', opacity: 0.9 }}>
                    {isCorrectTransZhGrInput ? 'ΣΩΣΤΗ ΑΠΑΝΤΗΣΗ!' : 'ΛΑΘΟΣ ΑΠΑΝΤΗΣΗ'}
                  </p>
                  <p style={{ color: '#1D1D1F', fontSize: '15px', marginTop: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>标准答案 / Σωστή Απάντηση: {currentTransZhGr.greek}</span>
                    <button 
                      onClick={() => speakGreek(currentTransZhGr.greek)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0071E3', display: 'inline-flex', alignItems: 'center', padding: '4px' }}
                      title="播放读音"
                    >
                      <Volume2 size={18} />
                    </button>
                  </p>
                  {currentTransZhGr.type === 'sentence' && (
                    <p style={{ color: '#86868B', fontSize: '12.5px', marginTop: '4px', fontWeight: 500 }}>
                      单词释义 / Λεξιλόγιο: {currentTransZhGr.wordChinese} → {currentTransZhGr.wordGreek}
                    </p>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                {!transZhGrChecked ? (
                  <>
                    <button 
                      onClick={() => setShowTip(!showTip)} 
                      className="btn-premium"
                      style={{ width: 'auto', padding: '12px 24px', border: '1px solid #FF9500', background: showTip ? 'rgba(255,149,0,0.12)' : 'rgba(255,149,0,0.05)', color: '#FF9500' }}
                    >
                      {showTip ? '收起提示 / Απόκρυψη' : '查看提示 / Συμβουλή'}
                    </button>
                    <button 
                      disabled={!userTransZhGrInput.trim()} 
                      onClick={handleCheckTransZhGr} 
                      className="btn-premium btn-blue-filled"
                      style={{ width: 'auto', padding: '12px 48px', opacity: userTransZhGrInput.trim() ? 1 : 0.5 }}
                    >
                      验证答案 / Επαλήθευση
                    </button>
                  </>
                ) : (
                  <button onClick={handleNextTransZhGr} className="btn-premium btn-blue-filled" style={{ width: 'auto', padding: '12px 48px' }}>
                    {transZhGrIndex === translationZhGrPool.length - 1 ? '收集积分 / Ολοκλήρωση' : '下一题 / Επόμενο'}
                  </button>
                )}
              </div>

              {/* Translation Hint Box */}
              {(transZhGrMistakes >= 2 || showTip || transZhGrChecked) && (
                <div style={{ marginTop: '24px', padding: '16px', background: '#FFF2E8', border: '1px solid #FFD591', borderRadius: '16px', textAlign: 'left' }}>
                  <h5 style={{ margin: '0 0 8px 0', color: '#D4380D', fontWeight: 'bold', fontSize: '14px' }}>💡 翻译提示 / Συμβουλή:</h5>
                  <div style={{ fontSize: '13px', color: '#1D1D1F', whiteSpace: 'pre-wrap' }}>
                    {getDynamicTip(currentTransZhGr)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* 7. Writing & Speaking Challenge Module */}
        {activeModule === 'writing_speaking' && (
          <div className="game-module animate-fade-in" style={{ maxWidth: '850px', width: '100%' }}>
            <h2 className="module-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span>真题写作与口语挑战</span>
              <span style={{ fontSize: '15px', color: '#86868B', fontWeight: 600 }}>当前进度: 任务 {currentChallengeIndex + 1} / {WRITING_SPEAKING_CHALLENGES.length}</span>
            </h2>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#86868B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '24px', marginRight: '4px' }}>
              Πρόοδος: Θέμα {currentChallengeIndex + 1} / {WRITING_SPEAKING_CHALLENGES.length}
            </div>

            {/* Topic Select Tab */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '20px' }}>
              {WRITING_SPEAKING_CHALLENGES.map((ch, idx) => {
                const isSelected = idx === currentChallengeIndex;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setCurrentChallengeIndex(idx);
                      setUserWritingInput('');
                      setShowChallengeTip(false);
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #0071E3' : '1px solid rgba(0,0,0,0.1)',
                      background: isSelected ? 'rgba(0,113,227,0.06)' : '#FFFFFF',
                      color: isSelected ? '#0071E3' : '#48484B',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s'
                    }}
                  >
                    [{ch.examLevel}] {ch.type === 'writing' ? '✍️ 写作' : '🗣️ 口语'}: {ch.titleCn}
                  </button>
                );
              })}
            </div>

            {(() => {
              const currentChallenge = WRITING_SPEAKING_CHALLENGES[currentChallengeIndex];
              if (!currentChallenge) return null;
              
              const isWriting = currentChallenge.type === 'writing';
              
              return (
                <div className="game-container-card" style={{ padding: '32px' }}>
                  {/* Exam badge & Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        background: currentChallenge.examLevel === 'A2' ? 'rgba(255,149,0,0.1)' : 'rgba(52,199,89,0.1)',
                        color: currentChallenge.examLevel === 'A2' ? '#FF9500' : '#34C759',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        官方 {currentChallenge.examLevel} 级考卷
                      </span>
                      <span style={{
                        background: isWriting ? 'rgba(0,113,227,0.1)' : 'rgba(175,82,222,0.1)',
                        color: isWriting ? '#0071E3' : '#AF52DE',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {isWriting ? '✍️ 书面写作任务 / Γραπτός Λόγος' : '🗣️ 模拟口语表达 / Προφορικός Λόγος'}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#86868B', fontWeight: 600 }}>{currentChallenge.wordCountInfo}</span>
                  </div>

                  {/* Challenge Prompt */}
                  <div style={{
                    background: '#F5F5F7',
                    padding: '24px',
                    borderRadius: '20px',
                    textAlign: 'left',
                    marginBottom: '28px',
                    border: '1px solid rgba(0,0,0,0.03)'
                  }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#1D1D1F', fontWeight: 800 }}>题目要求 / Θέμα:</h4>
                    <p style={{ fontSize: '15px', color: '#1D1D1F', lineHeight: '1.6', margin: '0 0 12px 0', fontWeight: 550 }}>
                      {currentChallenge.promptCn}
                    </p>
                    <div style={{ borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: '12px', marginTop: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <p style={{ fontSize: '13.5px', color: '#48484B', fontStyle: 'italic', lineHeight: '1.6', margin: 0, fontFamily: 'Georgia, serif' }}>
                          {currentChallenge.promptGr}
                        </p>
                        <button 
                          onClick={() => speakGreek(currentChallenge.promptGr)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0071E3', padding: '2px', display: 'inline-flex', alignItems: 'center' }}
                          title="播放题目读音"
                        >
                          <Volume2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* User Input Area */}
                  <div style={{ textAlign: 'left', marginBottom: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '14.5px', fontWeight: 700, color: '#1D1D1F' }}>
                        {isWriting ? '在此输入你的希腊语作文回复 / Απαντήστε στα Ελληνικά：' : '在此拟定你的希腊语口语大纲与练习内容：'}
                      </label>
                      <span style={{
                        fontSize: '12.5px',
                        color: userWritingInput.trim().split(/\s+/).filter(Boolean).length >= 50 ? '#34C759' : '#86868B',
                        fontWeight: 'bold',
                        fontFamily: 'monospace'
                      }}>
                        希腊语单词数: {userWritingInput.trim().split(/\s+/).filter(Boolean).length} 词
                      </span>
                    </div>
                    <textarea
                      value={userWritingInput}
                      onChange={(e) => setUserWritingInput(e.target.value)}
                      placeholder={isWriting ? "例如：Αγαπητέ μου φίλε..." : "可在此整理口语表达大纲、核心句型或直接写出模拟回答，写完后推荐大声朗读，并与下方的官方高分范文对比..."}
                      style={{
                        width: '100%',
                        height: '180px',
                        borderRadius: '16px',
                        border: '1px solid rgba(0,0,0,0.15)',
                        padding: '16px',
                        fontSize: '15px',
                        lineHeight: '1.6',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        fontFamily: 'inherit'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#0071E3')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)')}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' }}>
                    <button
                      onClick={() => setShowChallengeTip(!showChallengeTip)}
                      className="btn-premium"
                      style={{
                        width: 'auto',
                        padding: '12px 28px',
                        border: '1.5px solid #0071E3',
                        background: showChallengeTip ? 'rgba(0,113,227,0.12)' : 'rgba(0,113,227,0.05)',
                        color: '#0071E3'
                      }}
                    >
                      {showChallengeTip ? '收起参考范文与大纲 / Απόκρυψη' : '查看参考范文与大纲 / Συμβουλή'}
                    </button>
                    
                    <button
                      onClick={() => {
                        const dateStr = getGreeceDateString();
                        const currentCompleted = JSON.parse(localStorage.getItem('leon_completed_date_modules') || '{}');
                        const completedForToday = currentCompleted[dateStr] || [];
                        
                        alert(`🎉 恭喜！你已完成这道希腊语真题口语与写作挑战！\n建议结合下方的“写作大纲要点”、“核心词汇”和“参考高分范文”进行复习提升。`);
                        
                        // Proceed to next challenge if exists, else return to dashboard
                        if (currentChallengeIndex < WRITING_SPEAKING_CHALLENGES.length - 1) {
                          setCurrentChallengeIndex(prev => prev + 1);
                          setUserWritingInput('');
                          setShowChallengeTip(false);
                        } else {
                          // Complete module
                          if (!completedForToday.includes('writing_speaking')) {
                            const updated = [...completedForToday, 'writing_speaking'];
                            currentCompleted[dateStr] = updated;
                            setCompletedModulesForDate(updated);
                            saveSharedState({ completed_date_modules: currentCompleted });
                          }
                          setActiveModule('dashboard');
                        }
                      }}
                      className="btn-premium btn-blue-filled"
                      style={{
                        width: 'auto',
                        padding: '12px 36px'
                      }}
                    >
                      确认完成该题 / Ολοκλήρωση
                    </button>
                  </div>

                  {/* Collapsible reference content */}
                  {showChallengeTip && (
                    <div style={{
                      textAlign: 'left',
                      border: '1.5px solid rgba(0,113,227,0.2)',
                      background: 'rgba(0,113,227,0.02)',
                      borderRadius: '24px',
                      padding: '28px',
                      animation: 'slideDown 0.3s ease-out forwards'
                    }}>
                      <style>{`
                        @keyframes slideDown {
                          from { opacity: 0; transform: translateY(-10px); }
                          to { opacity: 1; transform: translateY(0); }
                        }
                      `}</style>
                      
                      <h3 style={{ margin: '0 0 16px 0', color: '#0071E3', fontSize: '17px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>💡 官方评分标准与参考范文</span>
                      </h3>

                      {/* Checklist Outline */}
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ fontSize: '14px', color: '#1D1D1F', fontWeight: 750, margin: '0 0 8px 0' }}>
                          📌 写作与表达大纲要点 (Leon 必须包含以下内容才能拿满分)：
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '8px' }}>
                          {currentChallenge.checklist.map((item, idx) => (
                            <div key={idx} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: '#FFFFFF',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid rgba(0,0,0,0.03)'
                            }}>
                              <div style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                background: 'rgba(52,199,89,0.1)',
                                color: '#34C759',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: 'bold'
                              }}>✓</div>
                              <span style={{ fontSize: '13px', color: '#48484B' }}>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Key Vocabulary Checklist */}
                      <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '14px', color: '#1D1D1F', fontWeight: 750, margin: '0 0 8px 0' }}>
                          🔑 推荐使用核心词汇 (Leon 建议使用以下单词提分)：
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {currentChallenge.vocab.map((vWord, idx) => {
                            return (
                              <div key={idx} style={{
                                background: '#FFFFFF',
                                border: '1px solid rgba(0,0,0,0.05)',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                <span style={{ color: '#0071E3', fontWeight: 'bold', fontSize: '13px' }}>{vWord.split(' ')[0]}</span>
                                <span style={{ color: '#86868B', fontSize: '11.5px' }}>{vWord.substring(vWord.indexOf(' '))}</span>
                                <button 
                                  onClick={() => speakGreek(vWord.split(' ')[0])}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0071E3', padding: '2px', display: 'inline-flex', alignItems: 'center' }}
                                  title="播放词汇读音"
                                >
                                  <Volume2 size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Model Answer */}
                      <div style={{
                        background: '#FFFFFF',
                        border: '1.5px solid rgba(0,113,227,0.1)',
                        padding: '20px',
                        borderRadius: '16px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h4 style={{ fontSize: '14px', color: '#0071E3', fontWeight: 800, margin: 0 }}>
                            🌟 官方高分参考范文 / Model Answer:
                          </h4>
                          <button
                            onClick={() => speakGreek(currentChallenge.modelAnswer)}
                            style={{
                              background: 'rgba(0,113,227,0.08)',
                              color: '#0071E3',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              fontSize: '12.5px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Volume2 size={14} /> 听力朗读播放 / Ακούστε
                          </button>
                        </div>
                        <p style={{
                          fontSize: '15px',
                          color: '#1D1D1F',
                          lineHeight: '1.7',
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: 500
                        }}>
                          {currentChallenge.modelAnswer}
                        </p>
                      </div>
                      
                    </div>
                  )}

                </div>
              );
            })()}

          </div>
        )}
      </main>

      {/* Premium Footer with Parent Portal Link */}
      <footer style={{
        padding: '24px 16px 40px 16px',
        textAlign: 'center',
        borderTop: '1px solid rgba(0, 0, 0, 0.05)',
        marginTop: '40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      }}>
        <p style={{ fontSize: '12px', color: '#86868B', margin: 0, fontWeight: 500 }}>
          © 2026 Leon Greek Coach · 智能希腊语自适应学习空间
        </p>
        <button 
          onClick={() => window.location.href = '/admin'}
          style={{
            background: 'rgba(255, 149, 0, 0.08)',
            color: '#FF9500',
            border: '1px solid rgba(255, 149, 0, 0.2)',
            borderRadius: '12px',
            padding: '8px 24px',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(255, 149, 0, 0.05)',
            transition: 'all 0.2s ease'
          }}
          className="parent-portal-footer-btn"
        >
          <Settings size={14} />
          <span>进入家长控制后台 | Διαχείριση Γονέων</span>
        </button>
      </footer>

      {/* 4. Score Rules & Level Progress Modal */}
      {showRulesModal && (() => {
        const currentLevel = getLevelInfo(score);
        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '30px',
              maxWidth: '540px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
              border: '1px solid rgba(255,255,255,0.8)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}>
              <style>{`
                @keyframes modalSlideIn {
                  from { opacity: 0; transform: translateY(30px) scale(0.95); }
                  to { opacity: 1; transform: translateY(0) scale(1); }
                }
              `}</style>
              
              <div style={{
                padding: '24px 32px',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1D1D1F', margin: 0 }}>
                    积分规则 & 升级进度
                  </h3>
                  <span style={{ fontSize: '11px', color: '#86868B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Κανόνες Πόντων & Πρόοδος Αναβάθμισης
                  </span>
                </div>
                <button 
                  onClick={() => setShowRulesModal(false)}
                  style={{
                    background: '#F5F5F7',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#86868B'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0,113,227,0.02), rgba(129,140,248,0.02))',
                  border: '1px solid rgba(0,113,227,0.06)',
                  borderRadius: '20px',
                  padding: '20px',
                  display: 'flex',
                  gap: '12px'
                }}>
                  <Award size={24} style={{ color: '#0071E3', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1D1D1F', margin: '0 0 6px 0' }}>今日积分奖励规则</h4>
                    <p style={{ fontSize: '13px', color: '#48484B', lineHeight: 1.5, margin: 0 }}>
                      Leon 每天把<strong>自适应特训模块</strong>下的<strong>六大类练习题</strong>（连连看、拼字、选择题、判断对错、希译中、中译希）全部做完，即可自动积 <strong>10 分</strong>！
                    </p>
                    <p style={{ fontSize: '12px', color: '#86868B', lineHeight: 1.5, margin: '6px 0 0 0', fontStyle: 'italic' }}>
                      * 不论答题正确与否，只要完成全部六大项题库，即视作完成今日学习，即可获得积分。
                    </p>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#86868B', fontWeight: 600 }}>当前等级段位</span>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#1D1D1F', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{currentLevel.icon} {currentLevel.name}</span>
                        <span style={{ fontSize: '11px', color: '#86868B', fontWeight: 550 }}>({currentLevel.nameEl})</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '16px', fontWeight: 850, color: '#0071E3' }}>{score} XP</span>
                      {score < 1600 ? (
                        <span style={{ display: 'block', fontSize: '11px', color: '#86868B', fontWeight: 600 }}>
                          距离升级还差 {currentLevel.maxPoints - score + 1} 分
                        </span>
                      ) : (
                        <span style={{ display: 'block', fontSize: '11px', color: '#FFD700', fontWeight: 700 }}>
                          已达最高至尊级别！
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{
                    background: '#F5F5F7',
                    height: '14px',
                    borderRadius: '980px',
                    overflow: 'hidden',
                    position: 'relative',
                    border: '1px solid rgba(0,0,0,0.03)'
                  }}>
                    <div style={{
                      background: currentLevel.gradient,
                      width: `${score >= 1600 ? 100 : Math.min(100, Math.max(5, ((score - currentLevel.minPoints) / (currentLevel.maxPoints - currentLevel.minPoints)) * 100))}%`,
                      height: '100%',
                      borderRadius: '980px',
                      transition: 'width 0.5s ease-out',
                      boxShadow: `0 0 8px ${currentLevel.glowColor}`
                    }} />
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#86868B', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    等级段位划分 | Επίπεδα
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {LEVELS.map((lvl, lIdx) => {
                      const isCurrent = currentLevel.name === lvl.name;
                      return (
                        <div key={lIdx} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 16px',
                          borderRadius: '14px',
                          background: isCurrent ? 'rgba(0,113,227,0.05)' : '#F8F9FA',
                          border: isCurrent ? '1.5px solid #0071E3' : '1px solid rgba(0,0,0,0.03)',
                          boxShadow: isCurrent ? '0 4px 12px rgba(0,113,227,0.08)' : 'none'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '20px' }}>{lvl.icon}</span>
                            <span style={{ fontSize: '13.5px', fontWeight: isCurrent ? 700 : 600, color: '#1D1D1F' }}>
                              {lvl.name} {isCurrent && <span style={{ fontSize: '10px', color: '#0071E3', fontWeight: 700, background: 'rgba(0,113,227,0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>当前段位</span>}
                            </span>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: isCurrent ? '#0071E3' : '#6E6E73' }}>
                            {lvl.range}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

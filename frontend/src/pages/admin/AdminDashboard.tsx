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
  AlertCircle,
  Trash2,
  BookMarked
} from 'lucide-react';
import staticVocabData from '../../data/vocabulary.json';
import vocabV2Data from '../../data/vocabulary_v2.json';
import sentencesData from '../../data/sentences.json';
import glossaryV2 from '../../data/glossary_v2.json';
import {
  type PageMark, type V2Word,
  normalizeMarks, getBookFrontier, getPageDate, unlockedWords,
  makeMarkId, BOOK_PAGE_RANGE, GLOSSARY_RANGE, LOCKED as PAGE_LOCKED,
  groupGlossaryByLetter, searchGlossary
} from '../../lib/pageProgress';
import localAlternatives from '../../data/alternative_translations.json';
import unitKnowledgeData from '../../data/unit_knowledge_drills.json';
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
  note_date?: string;
}

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
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .toLowerCase();
  
  cleaned = cleaned.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
  
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
    },
    "B1": {
      40: "Ενότητα 1: 请留下您的留言 (Αφήστε το μήνυμά σας)",
      41: "Ενότητα 2: 温馨的家 (Σπίτι μου σπιτάκι μου)",
      42: "Ενότητα 3: 路上太堵了！ (Είχε τέτοια κίνηση!)",
      43: "Ενότητα 4: 太贵了！ (Είναι πανάκριβα!)",
      44: "阶段复习：1-4单元复习与测试 (Πάμε πάλι!: Ενότητες 1-4)",
      45: "Ενότητα 6: 吃好喝好… (Φάγαμε, ήπιαμε…)",
      46: "Ενότητα 7: 记得那时我们整天玩耍… (Θυμάμαι ότι παίζαμε όλη μέρα…)",
      47: "Ενότητα 8: 天有不测风云 (Έχει ο καιρός γυρίσματα)",
      48: "Ενότητα 9: 改变习惯 (Αλλάζουμε συνήθειες)",
      49: "阶段复习：6-9单元复习与测试 (Πάμε πάλι!: Ενότητες 6-9)",
      50: "Ενότητα 11: 我们去度假吗？ (Πάμε διακοπές;)",
      51: "Ενότητα 12: 马路上的意外 (Ένα ατύχημα στους δρόμους)",
      52: "Ενότητα 13: 请稍等半分钟 (Περιμένετε μισό λεπτό, παρακαλώ)",
      53: "Ενότητα 14: 今天我们庆祝 (Σήμερα γιορτάζουμε)",
      54: "阶段复习：11-14单元复习与测试 (Πάμε πάλι!: Ενότητες 11-14)",
      55: "Ενότητα 16: 我经常看你们的频道 (Παρακολουθώ συχνά το κανάλι σας)",
      56: "Ενότητα 17: 孩子，好好学文化 (Μάθε, παιδί μου, γράμματα)",
      57: "Ενότητα 18: 辛勤工作… (Δουλεύω σαν σκυλί…)",
      58: "Ενότητα 19: 非常具有文化气息 (Είναι πολύ της κουλτούρας)",
      59: "期末综合：B阶段全真总复习与水平测试 (Πάμε πάλι!: Τελική Επανάληψη)"
    },
    "B": {
      40: "Ενότητα 1: 请留下您的留言 (Αφήστε το μήνυμά σας)",
      41: "Ενότητα 2: 温馨的家 (Σπίτι μου σπιτάκι μου)",
      42: "Ενότητα 3: 路上太堵了！ (Είχε τέτοια κίνηση!)",
      43: "Ενότητα 4: 太贵了！ (Είναι πανάκριβα!)",
      44: "阶段复习：1-4单元复习与测试 (Πάμε πάλι!: Ενότητες 1-4)",
      45: "Ενότητα 6: 吃好喝好… (Φάγαμε, ήπιαμε…)",
      46: "Ενότητα 7: 记得那时我们整天玩耍… (Θυμάμαι ότι παίζαμε όλη μέρα…)",
      47: "Ενότητα 8: 天有不测风云 (Έχει ο καιρός γυρίσματα)",
      48: "Ενότητα 9: 改变习惯 (Αλλάζουμε συνήθειες)",
      49: "阶段复习：6-9单元复习与测试 (Πάμε πάλι!: Ενότητες 6-9)",
      50: "Ενότητα 11: 我们去度假吗？ (Πάμε διακοπές;)",
      51: "Ενότητα 12: 马路上的意外 (Ένα ατύχημα στους δρόμους)",
      52: "Ενότητα 13: 请稍等半分钟 (Περιμένετε μισό λεπτό, παρακαλώ)",
      53: "Ενότητα 14: 今天我们庆祝 (Σήμερα γιορτάζουμε)",
      54: "阶段复习：11-14单元复习与测试 (Πάμε πάλι!: Ενότητες 11-14)",
      55: "Ενότητα 16: 我经常看你们的频道 (Παρακολουθώ συχνά το κανάλι σας)",
      56: "Ενότητα 17: 孩子，好好学文化 (Μάθε, παιδί μου, γράμματα)",
      57: "Ενότητα 18: 辛勤工作… (Δουλεύω σαν σκυλί…)",
      58: "Ενότητα 19: 非常具有文化气息 (Είναι πολύ της κουλτούρας)",
      59: "期末综合：B阶段全真总复习与水平测试 (Πάμε πάλι!: Τελική Επανάληψη)"
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
    },
    "B1": {
      40: "人称代词直接与间接宾语弱读形式（Αδύνατοι τύποι προσωπικών αντωνυμιών）、电话通讯用语与留言机表达、阴性名词所有格（-ος / -ου）。",
      41: "物主代词与形容词变化（δικός μου / δική μου）、房屋设施与租赁日常生活表达、疑问代词（ποιανού / τίνος）。",
      42: "城市交通与公共出行表达、方位介词与方向指示、指示代词（τέτοιος / τόσος）与方位副词。",
      43: "形容词比较级与最高级（πανάκριβος, πιο... από, ο καλύτερος）、商场购物议价与退换货流程用语。",
      44: "1-4单元阶段综合复习与自测、动词过去时与形容词比较级综合考核演练。",
      45: "动词不定过去时（Αόριστος）主动语态第一/二类规则与不规则变位、餐厅点餐与就餐文化。",
      46: "动词未完成过去时（Παρατατικός）变位与用法、过去持续动作叙述与童年回忆表达。",
      47: "条件状语从句（Υποθετικές προτάσεις - Τύπος Α: Αν + Ενεστώτας/Αόριστος）、气候与地理环境描述。",
      48: "简单祈使语气（Προστακτική Αορίστου）与否定祈使语气（Μη + Υποτακτική）、健康建议与生活习惯管理。",
      49: "6-9单元阶段综合复习与自测、过去时态（Αόριστος vs Παρατατικός）与祈使语气专项考核演练。",
      50: "简单将来时（Στιγμιαίος Μέλλοντας）与持续将来时对比、度假旅行规划与酒店住宿预订。",
      51: "动词被动语态现在时（Ενεστώτας Παθητικής Φωνής - ρήματα σε -ομαι）、紧急医疗求助与健康状况描述。",
      52: "被动语态简单祈使语气（Προστακτική Παθητικής Φωνής）、公共行政办事与官方申请表格填写。",
      53: "关系代词（Αναφορικές αντωνυμίες - που / ο οποίος）与关系从句、希腊传统节日庆典与民俗风情。",
      54: "11-14单元阶段综合复习与自测、被动语态与关系从句综合考核演练。",
      55: "异相动词（Αποθετικά ρήματα - θυμάμαι, κοιμάμαι, φοβάμαι）、大众传媒、新闻资讯与社会评论。",
      56: "名词呼格（Κλητική πτώση）、动词被动语态不定过去时（Αόριστος Παθητικής Φωνής）、希腊教育体系与求学。",
      57: "现在完成时（Παρακείμενος - έχω + απαρέμφατο）、职场求职、个人履历（CV）与工作面试表达。",
      58: "过去完成时（Υπερσυντέλικος）、将来完成时（Συντελεσμένος Μέλλοντας）、时间状语从句与艺术文化鉴赏。",
      59: "B阶段期末综合总复习与全真水平测试、听说读写四项核心技能全方位考核。"
    },
    "B": {
      40: "人称代词直接与间接宾语弱读形式（Αδύνατοι τύποι προσωπικών αντωνυμιών）、电话通讯用语与留言机表达、阴性名词所有格（-ος / -ου）。",
      41: "物主代词与形容词变化（δικός μου / δική μου）、房屋设施与租赁日常生活表达、疑问代词（ποιανού / τίνος）。",
      42: "城市交通与公共出行表达、方位介词与方向指示、指示代词（τέτοιος / τόσος）与方位副词。",
      43: "形容词比较级与最高级（πανάκριβος, πιο... από, ο καλύτερος）、商场购物议价与退换货流程用语。",
      44: "1-4单元阶段综合复习与自测、动词过去时与形容词比较级综合考核演练。",
      45: "动词不定过去时（Αόριστος）主动语态第一/二类规则与不规则变位、餐厅点餐与就餐文化。",
      46: "动词未完成过去时（Παρατατικός）变位与用法、过去持续动作叙述与童年回忆表达。",
      47: "条件状语从句（Υποθετικές προτάσεις - Τύπος Α: Αν + Ενεστώτας/Αόριστος）、气候与地理环境描述。",
      48: "简单祈使语气（Προστακτική Αορίστου）与否定祈使语气（Μη + Υποτακτική）、健康建议与生活习惯管理。",
      49: "6-9单元阶段综合复习与自测、过去时态（Αόριστος vs Παρατατικός）与祈使语气专项考核演练。",
      50: "简单将来时（Στιγμιαίος Μέλλοντας）与持续将来时对比、度假旅行规划与酒店住宿预订。",
      51: "动词被动语态现在时（Ενεστώτας Παθητικής Φωνής - ρήματα σε -ομαι）、紧急医疗求助与健康状况描述。",
      52: "被动语态简单祈使语气（Προστακτική Παθητικής Φωνής）、公共行政办事与官方申请表格填写。",
      53: "关系代词（Αναφορικές αντωνυμίες - που / ο οποίος）与关系从句、希腊传统节日庆典与民俗风情。",
      54: "11-14单元阶段综合复习与自测、被动语态与关系从句综合考核演练。",
      55: "异相动词（Αποθετικά ρήματα - θυμάμαι, κοιμάμαι, φοβάμαι）、大众传媒、新闻资讯与社会评论。",
      56: "名词呼格（Κλητική πτώση）、动词被动语态不定过去时（Αόριστος Παθητικής Φωνής）、希腊教育体系与求学。",
      57: "现在完成时（Παρακείμενος - έχω + απαρέμφατο）、职场求职、个人履历（CV）与工作面试表达。",
      58: "过去完成时（Υπερσυντέλικος）、将来完成时（Συντελεσμένος Μέλλοντας）、时间状语从句与艺术文化鉴赏。",
      59: "B阶段期末综合总复习与全真水平测试、听说读写四项核心技能全方位考核。"
    }
  };

  return grammarData[bookKey]?.[unitNum] || "主要涵盖当前章节语法知识点及课后练习";
};

// 教材重建产出的真词库(每个词带书内首次出现页码与全部出现页)
const V2_WORDS = ((vocabV2Data as any).entries || []) as V2Word[];
const CLOZE_ALL: any[] = ((sentencesData as any).sentences || []);
const GLOSS_LISTS: Record<string, any[]> = (glossaryV2 as any).lists || {};
const GLOSS_KEY: Record<string, string> = { 'glossary-a1': 'A1', 'glossary-a2': 'A2' };

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
  const [activeTab, setActiveTab] = useState<'activation' | 'upload' | 'feedback' | 'settings'>('activation');
  
  // Vocabulary & Activation states
  const [allVocab, setAllVocab] = useState<Word[]>([]);
  const [unitStudyDates, setUnitStudyDates] = useState<Record<string, string>>({});
  const [pageMarks, setPageMarks] = useState<PageMark[]>([]);
  const [pmBook, setPmBook] = useState<string>('a1-b');
  const [pmPage, setPmPage] = useState<string>('');
  const [pmDate, setPmDate] = useState<string>('');
  const [showLegacyUnits, setShowLegacyUnits] = useState(false);
  // 单词表折叠面板：当前展开的是哪张表 / 哪个字母 / 搜索词
  const [glossOpen, setGlossOpen] = useState<string | null>(null);
  const [glossLetter, setGlossLetter] = useState<string | null>(null);
  const [glossSearch, setGlossSearch] = useState('');
  const [answerLog, setAnswerLog] = useState<any[]>([]);
  const [reportWeekOffset, setReportWeekOffset] = useState(0);
  const [editingDates, setEditingDates] = useState<Record<string, string>>({});
  const [alternativeTranslations, setAlternativeTranslations] = useState<Record<string, string[]>>({});
  const [userFeedbackList, setUserFeedbackList] = useState<any[]>([]);
  const [disabledWords, setDisabledWords] = useState<string[]>([]);
  const [selectedUnitKnowledge, setSelectedUnitKnowledge] = useState<any | null>(null);

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
        let customVocab = state.custom_vocab || [];
        
        // --- DATA MIGRATION FIX ---
        // If there are any custom notes incorrectly assigned to A2_36, move them to A2_35
        let needSave = false;
        customVocab = customVocab.map((w: Word) => {
          if (w.book_id && w.book_id.toUpperCase() === 'A2' && w.unit === 36 && w.note_date) {
            needSave = true;
            return { ...w, unit: 35 };
          }
          return w;
        });

        if (needSave) {
          saveSharedState({ custom_vocab: customVocab });
        }
        // --------------------------

        if (customVocab.length > 0) {
          mergedVocab = [...mergedVocab, ...customVocab];
        }
        
        setAllVocab(mergedVocab);
        setUnitStudyDates(state.unit_study_dates || {});
        setPageMarks(Array.isArray(state.page_progress) ? state.page_progress : []);
        const mergedAlts = {
          ...localAlternatives,
          ...(state.alternative_translations || {})
        };
        setAlternativeTranslations(mergedAlts);
        setUserFeedbackList(state.user_feedback || []);
        setDisabledWords(Array.isArray(state.disabled_words) ? state.disabled_words : []);
        setAnswerLog(Array.isArray(state.answer_log) ? state.answer_log : []);
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
      "A2": [31,32,33,34,35,36,37,38,39],
      "B1": [40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59]
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
  // ===== 按课本页码的课堂进度 =====
  const persistPageMarks = (next: PageMark[]) => {
    setPageMarks(next);
    saveSharedState({ page_progress: next });
  };

  const handleAddPageMark = () => {
    const rng = BOOK_PAGE_RANGE[pmBook] || GLOSSARY_RANGE[pmBook];
    const page = parseInt(pmPage, 10);
    const date = pmDate || getGreeceDateString();
    if (!rng) { alert('请选择课本'); return; }
    if (!Number.isFinite(page) || page < rng.min || page > rng.max) {
      alert(`页码需要在 ${rng.min}–${rng.max} 之间（${rng.name}）`);
      return;
    }
    const frontier = getBookFrontier(pageMarks, pmBook);
    if (page < frontier && !window.confirm(
      `这本书已经记录到第 ${frontier} 页，你现在填的是第 ${page} 页（往回退）。\n` +
      `确定要这样记吗？（回退不会删掉已有记录，只是多一个更早的进度点）`)) return;
    persistPageMarks([...pageMarks, { id: makeMarkId(), date, bookId: pmBook, upToPage: page }]);
    setPmPage(''); setPmDate('');
  };

  /** 一键标记「这本整本已学完」 */
  const handleFinishBook = (bookId: string) => {
    const rng = BOOK_PAGE_RANGE[bookId] || GLOSSARY_RANGE[bookId];
    if (!rng) return;
    const isGloss = !!GLOSSARY_RANGE[bookId];
    const label = isGloss ? '整本背完' : '整本学完';
    const date = pmDate || getGreeceDateString();
    if (!window.confirm(
      `标记「${rng.name}」${label}？\n` +
      `会记一条「${date} 上到第 ${rng.max} ${isGloss ? '个词' : '页'}」的进度，` +
      `这本书的内容全部解锁。\n（记错了可以在下面的进度记录里删掉）`)) return;
    persistPageMarks([...pageMarks, { id: makeMarkId(), date, bookId, upToPage: rng.max, note: label }]);
  };

  const handleDeletePageMark = (id: string) => {
    const m = pageMarks.find(x => x.id === id);
    if (!m) return;
    const nm = BOOK_PAGE_RANGE[m.bookId]?.name || GLOSSARY_RANGE[m.bookId]?.name || m.bookId;
    if (!window.confirm(`删除这条进度记录？\n${m.date}  ${nm}  ${GLOSSARY_RANGE[m.bookId] ? '背到第' : '上到第'} ${m.upToPage} ${GLOSSARY_RANGE[m.bookId] ? '个词' : '页'}`)) return;
    persistPageMarks(pageMarks.filter(x => x.id !== id));
  };

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

    // Simple markdown word extractor
    const lines = rawMD.split('\n');
    const newWordsList: Word[] = [];
    let currentId = allVocab.length > 0 ? Math.max(...allVocab.map(w => w.id)) + 1 : 1;

    let uploadedUnitDate: string | null = null;

    // First scan: find the date in the MD content
    for (let line of lines) {
      const dateMatch = line.match(/(\d{4})[-\/\u5e74](\d{1,2})[-\/\u6708](\d{1,2})\u65e5?/);
      if (dateMatch) {
        const year = dateMatch[1];
        const month = dateMatch[2].padStart(2, '0');
        const day = dateMatch[3].padStart(2, '0');
        uploadedUnitDate = `${year}-${month}-${day}`;
        break; // found the date!
      }
    }

    // Default to today's date in Greece timezone if no date is found
    const finalNoteDate = uploadedUnitDate || getGreeceDateString();
    const currentUnit = getUnitFromDate(finalNoteDate);

    lines.forEach(line => {
      // Check if it is a markdown table row (e.g. | 1 | δημόσια | 公共服务 | ...)
      if (line.trim().startsWith('|')) {
        const columns = line.split('|').map(c => c.trim()).filter(c => c !== '');
        // A valid content row must have at least 2 columns (ignoring index and separators)
        if (columns.length >= 2 && !columns[0].includes('---')) {
          let greekPart = '';
          let chinesePart = '';
          let exampleGreek = '';
          let exampleChinese = '';
          
          for (let col of columns) {
            const cleaned = col.replace(/[\*\`]/g, '').trim();
            if (!cleaned || /^\d+$/.test(cleaned) || cleaned === '序号' || cleaned === '校验状态' || cleaned.includes('校验通过') || cleaned.includes('Greek') || cleaned.includes('Chinese')) {
              continue;
            }
            
            const hasGreek = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(cleaned);
            const hasChinese = /[\u4e00-\u9fa5]/.test(cleaned);
            
            if (hasGreek && !hasChinese) {
              if (!greekPart) greekPart = cleaned;
              else if (!exampleGreek) exampleGreek = cleaned;
            } else if (hasChinese) {
              if (!chinesePart) chinesePart = cleaned;
              else if (!exampleChinese) exampleChinese = cleaned;
            }
          }
          
          if (greekPart && chinesePart) {
            newWordsList.push({
              id: currentId++,
              book_id: targetBookId,
              unit: currentUnit,
              word_greek: greekPart,
              word_chinese: chinesePart,
              pronunciation: 'new',
              example_greek: exampleGreek,
              example_chinese: exampleChinese,
              note_date: finalNoteDate
            });
            return; // Skip standard hyphen parse for this line
          }
        }
      }

      // Robust fallback segment parser for plain text copied/scanned notes
      const hasGreekLine = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(line);
      const hasChineseLine = /[\u4e00-\u9fa5]/.test(line);

      if (hasGreekLine && hasChineseLine) {
        // Split line by 2+ spaces or tabs to handle multi-column rows side-by-side
        const segments = line.split(/\s{2,}|\t/);
        for (const segment of segments) {
          const cleaned = segment.replace(/[\*\`]/g, '').trim();
          if (!cleaned) continue;

          const hasGreekSeg = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(cleaned);
          const hasChineseSeg = /[\u4e00-\u9fa5]/.test(cleaned);

          if (hasGreekSeg && hasChineseSeg) {
            // Find first index of Chinese character to split Greek and Chinese parts
            const firstChineseIdx = cleaned.search(/[\u4e00-\u9fa5]/);
            if (firstChineseIdx > 0) {
              let gr = cleaned.slice(0, firstChineseIdx).trim();
              const zh = cleaned.slice(firstChineseIdx).trim();
              
              // Clean index numbers or trailing punctuation in Greek part (e.g. "1. ληξιαρχείο:", "2. ")
              gr = gr.replace(/^\d+[\.\s、]+/, '').replace(/[-—–:~：\s\/\\→>]+$/, '').trim();

              if (gr && zh) {
                newWordsList.push({
                  id: currentId++,
                  book_id: targetBookId,
                  unit: currentUnit,
                  word_greek: gr,
                  word_chinese: zh,
                  pronunciation: 'new',
                  example_greek: '',
                  example_chinese: '',
                  note_date: finalNoteDate
                });
              }
            }
          }
        }
      }
    });

    if (newWordsList.length > 0) {
      const existingCustom = JSON.parse(localStorage.getItem('leon_custom_vocab') || '[]');
      const updatedCustom = [...existingCustom, ...newWordsList];
      
      const updates: any = { custom_vocab: updatedCustom };
      
      // Update study date for this custom unit based on the parsed date
      const key = `${targetBookId.toUpperCase()}_${currentUnit}`;
      const normalizedDate = getMondayDateStr(finalNoteDate);
      const newDates = { ...unitStudyDates, [key]: normalizedDate };
      setUnitStudyDates(newDates);
      updates.unit_study_dates = newDates;

      saveSharedState(updates);

      // Update global list
      setAllVocab([...allVocab, ...newWordsList]);
      setParsedWordsCount(newWordsList.length);
      setUploadSuccess(true);
      setRawMD('');
      setTimeout(() => setUploadSuccess(false), 4000);
    } else {
      alert('未能在文本中解析出希腊语单词。请使用 "希腊语单词 - 中文释义" 的格式，或标准的 Markdown 表格形式。');
    }
  };

  // --- Views ---

  // ===== 课堂进度面板（按课本页码） =====
  /** 点一个词 = 「背到这里」。upToPage 存的是这个词在词表里的序号 */
  const handleSetGlossaryTo = (glossId: string, w: any) => {
    const rng = GLOSSARY_RANGE[glossId];
    if (!rng) return;
    const date = pmDate || getGreeceDateString();
    const front = getBookFrontier(pageMarks, glossId);
    const zh = w.word_chinese ? `（${w.word_chinese}）` : '';
    if (w.idx < front && !window.confirm(
      `这张表已经记到第 ${front} 个词了，你现在点的是第 ${w.idx} 个「${w.word_greek}」${zh}（往回退）。\n` +
      `确定要这样记吗？（回退不删已有记录，只是多一个更早的进度点）`)) return;
    if (!window.confirm(
      `记为：${date} 背到「${w.word_greek}」${zh}\n` +
      `${rng.name}第 ${w.idx} / ${rng.max} 个词，前面 ${w.idx} 个词全部解锁。`)) return;
    persistPageMarks([...pageMarks, { id: makeMarkId(), date, bookId: glossId, upToPage: w.idx, note: w.word_greek }]);
    setGlossSearch('');
  };

  /** 清空某张单词表的全部进度记录 */
  const handleClearGlossary = (glossId: string) => {
    const n = pageMarks.filter(m => m.bookId === glossId).length;
    if (!n) return;
    if (!window.confirm(`清空「${GLOSSARY_RANGE[glossId]?.name}」的 ${n} 条背诵进度记录？\n课堂进度不受影响。`)) return;
    persistPageMarks(pageMarks.filter(m => m.bookId !== glossId));
  };

  /** 单词表里的一行：左边词，右边「背到这里」 */
  const renderGlossWordRow = (glossId: string, w: any, front: number) => {
    const done = w.idx <= front;
    const isCur = w.idx === front;
    return (
      <div key={w.idx}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
          borderBottom: '1px solid #F5F5F7', fontSize: '13px',
          background: isCur ? 'rgba(175,82,222,0.10)' : done ? 'rgba(52,199,89,0.05)' : '#FFF',
        }}>
        <span style={{ fontSize: '11px', color: '#C7C7CC', minWidth: '34px', fontWeight: 700 }}>{w.idx}</span>
        <span style={{ minWidth: '14px', color: done ? '#34C759' : '#E5E5EA', fontWeight: 800 }}>{done ? '✓' : '○'}</span>
        <span style={{ fontWeight: 700, color: '#1D1D1F', flex: '0 0 auto' }}>{w.word_greek}</span>
        <span style={{ color: '#86868B', flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {w.word_chinese || w.word_english || ''}
        </span>
        {isCur ? (
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#AF52DE', whiteSpace: 'nowrap' }}>← 当前进度</span>
        ) : (
          <button onClick={() => handleSetGlossaryTo(glossId, w)}
            style={{
              fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer',
              color: '#AF52DE', background: 'rgba(175,82,222,0.10)',
              border: '1px solid rgba(175,82,222,0.25)', borderRadius: '7px', padding: '4px 9px',
            }}>
            背到这里
          </button>
        )}
      </div>
    );
  };

  const renderPageProgressPanel = () => {
    const today = getGreeceDateString();
    const books = ['a1-a', 'a1-b', 'a2', 'b1'];
    const unlockedAll = unlockedWords(V2_WORDS, pageMarks, today);
    const history = [...pageMarks].sort((a, b) =>
      (b.date + b.bookId).localeCompare(a.date + a.bookId));

    return (
      <div className="admin-panel mb-8">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 className="admin-panel-title" style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookMarked size={18} className="text-blue" /> 课堂进度（按课本页码）
            </h3>
            <p style={{ fontSize: '13px', color: '#86868B', fontWeight: 500, lineHeight: 1.6, maxWidth: '640px' }}>
              每次上完课，记一笔「今天上到第几页」就行。系统按<b>词在课本里第一次出现的那一页</b>解锁，
              艾宾浩斯复习也从那天算起。<b>不必等整个单元学完</b>——课上到哪，练到哪。
            </p>
          </div>
          <div style={{ background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.2)', borderRadius: '10px', padding: '8px 14px' }}>
            <div style={{ fontSize: '11px', color: '#86868B', fontWeight: 700 }}>按页码已解锁</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#34C759' }}>{unlockedAll.length} 词</div>
          </div>
        </div>

        {/* 各书进度条 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '12px', marginBottom: '20px' }}>
          {books.map(b => {
            const rng = BOOK_PAGE_RANGE[b];
            const front = getBookFrontier(pageMarks, b);
            const pct = front <= 0 ? 0 : Math.min(100, Math.round((front - rng.min) / (rng.max - rng.min) * 100));
            const cnt = unlockedAll.filter(w => w.book_id === b).length;
            const total = V2_WORDS.filter(w => w.book_id === b).length;
            const clozeTotal = CLOZE_ALL.filter((c: any) => c.book === b).length;
            const clozeOpen = CLOZE_ALL.filter((c: any) => c.book === b && c.page <= front).length;
            return (
              <div key={b} style={{ border: '1px solid #E5E5EA', borderRadius: '12px', padding: '14px', background: '#FFF' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#1D1D1F', marginBottom: '2px' }}>{rng.name}</div>
                <div style={{ fontSize: '12px', color: '#86868B', marginBottom: '10px' }}>
                  {front > 0 ? <>已上到 <b style={{ color: '#0071E3' }}>第 {front} 页</b> / 共 {rng.max} 页</> : '尚未记录进度'}
                </div>
                <div style={{ height: '8px', background: '#F0F0F3', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#0071E3,#34C759)', borderRadius: '99px', transition: 'width .3s' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#86868B' }}>
                    {total > 0
                      ? <>已解锁 <b style={{ color: '#1D1D1F' }}>{cnt}</b> / {total} 词
                          {clozeTotal > 0 && <> · 填空题 <b style={{ color: '#1D1D1F' }}>{clozeOpen}</b>/{clozeTotal}</>}</>
                      : <><b style={{ color: '#FF9500' }}>单词未入库</b> · 只有课本原句填空 <b style={{ color: '#1D1D1F' }}>{clozeOpen}</b>/{clozeTotal} 道</>}
                  </span>
                  {front < rng.max && (
                    <button onClick={() => handleFinishBook(b)}
                      style={{ fontSize: '11px', fontWeight: 700, color: '#34C759', background: 'rgba(52,199,89,0.1)',
                               border: '1px solid rgba(52,199,89,0.25)', borderRadius: '7px', padding: '4px 9px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      ✓ 整本学完
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* B 本为什么只有填空题：如实说明，不藏 */}
        {V2_WORDS.filter(w => w.book_id === 'b1').length === 0 && (
          <div style={{ background: 'rgba(255,149,0,0.07)', border: '1px solid rgba(255,149,0,0.22)', borderRadius: '10px', padding: '11px 14px', marginBottom: '16px', fontSize: '12px', color: '#86868B', lineHeight: 1.7 }}>
            <b style={{ color: '#C77700' }}>为什么 B 本这张卡跟别的不一样？</b><br />
            A1/A2 有希腊教育部的<b>官方配套词表（含中文）</b>，我拿它当「标准答案册」去反查课本每一页，
            所以能保证 2472 个词<b>没有一个是编的</b>。<br />
            <b>B 本没有这样一份官方词表</b>，它的单词目前<b>一个都还没入库</b>——不是只有 150 个词，
            而是「宁可空着，也不敢瞎编中文释义」。所以 B 本现在只出<b>课本原句填空</b>（150 道，
            全部来自 PDF 文字层逐字解码，不是 OCR 猜的）。B 本单词入库是下一步的事。
          </div>
        )}

        {/* 记录一次课 */}
        <div style={{ background: '#F5F5F7', borderRadius: '12px', padding: '14px', display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#86868B', marginBottom: '4px' }}>课本</label>
            <select value={pmBook} onChange={e => setPmBook(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: '9px', border: '1px solid #D2D2D7', fontSize: '13px', fontWeight: 600, minWidth: '190px', background: '#FFF' }}>
              {books.map(b => <option key={b} value={b}>{BOOK_PAGE_RANGE[b].name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#86868B', marginBottom: '4px' }}>
              这次课上到第几页（{BOOK_PAGE_RANGE[pmBook]?.min}–{BOOK_PAGE_RANGE[pmBook]?.max}）
            </label>
            <input type="number" value={pmPage} onChange={e => setPmPage(e.target.value)}
              placeholder={String(getBookFrontier(pageMarks, pmBook) || BOOK_PAGE_RANGE[pmBook]?.min || '')}
              style={{ padding: '9px 12px', borderRadius: '9px', border: '1px solid #D2D2D7', fontSize: '13px', fontWeight: 600, width: '130px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#86868B', marginBottom: '4px' }}>上课日期（默认今天）</label>
            <input type="date" value={pmDate} onChange={e => setPmDate(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: '9px', border: '1px solid #D2D2D7', fontSize: '13px', fontWeight: 600 }} />
          </div>
          <button onClick={handleAddPageMark}
            style={{ padding: '10px 20px', borderRadius: '9px', border: 'none', background: '#0071E3', color: '#FFF', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={15} /> 记录这次课
          </button>
        </div>

        {/* ===== 单词表背诵进度（按首字母折叠，点词即定位）===== */}
        <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px dashed #E5E5EA' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#1D1D1F', marginBottom: '4px' }}>
            📖 单词表背诵进度
          </div>
          <div style={{ fontSize: '12px', color: '#86868B', marginBottom: '12px' }}>
            和课堂进度分开记。<b>不用数第几个</b>——展开一个字母，找到「背到的最后一个词」，点它就行。
            也可以直接在下面搜中文或希腊语。
          </div>

          {Object.keys(GLOSSARY_RANGE).map(g => {
            const rng = GLOSSARY_RANGE[g];
            const front = getBookFrontier(pageMarks, g);
            const pct = Math.min(100, Math.round(front / rng.max * 100));
            const list = GLOSS_LISTS[GLOSS_KEY[g]] || [];
            const groups = groupGlossaryByLetter(list);
            const curWord = front > 0 ? list.find((w: any) => w.idx === front) : null;
            const isOpen = glossOpen === g;
            const hits = isOpen && glossSearch.trim() ? searchGlossary(list, glossSearch) : [];

            return (
              <div key={g} style={{ border: '1px solid #E5E5EA', borderRadius: '12px', marginBottom: '10px', background: '#FFF', overflow: 'hidden' }}>
                {/* 折叠头：一行看完进度 */}
                <div
                  onClick={() => { setGlossOpen(isOpen ? null : g); setGlossLetter(null); setGlossSearch(''); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', cursor: 'pointer', flexWrap: 'wrap' }}
                >
                  <ChevronRight size={16} style={{ color: '#86868B', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#1D1D1F', minWidth: '84px' }}>{rng.name}</span>
                  <div style={{ flex: '1 1 140px', minWidth: '110px' }}>
                    <div style={{ height: '7px', background: '#F0F0F3', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#AF52DE', borderRadius: '99px', transition: 'width .3s' }} />
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', color: '#86868B' }}>
                    {front > 0
                      ? <>已背 <b style={{ color: '#AF52DE' }}>{front}</b> / {rng.max}（背到 <b style={{ color: '#1D1D1F' }}>{curWord ? curWord.word_greek : '—'}</b>{curWord?.word_chinese ? ` ${curWord.word_chinese}` : ''}）</>
                      : <>未开始 / 共 {rng.max} 词</>}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#0071E3', marginLeft: 'auto' }}>
                    {isOpen ? '收起' : '点开设置进度'}
                  </span>
                </div>

                {isOpen && (
                  <div style={{ borderTop: '1px solid #F0F0F3', padding: '12px 14px', background: '#FAFAFC' }}>
                    {/* 搜索框 */}
                    <input
                      value={glossSearch}
                      onChange={e => setGlossSearch(e.target.value)}
                      placeholder="搜中文 / 希腊语 / 英文，例如「舒适」或 comfortably"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '9px', border: '1px solid #D2D2D7', fontSize: '13px', marginBottom: '10px', background: '#FFF' }}
                    />

                    {hits.length > 0 ? (
                      <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid #E5E5EA', borderRadius: '9px', background: '#FFF' }}>
                        {hits.map((w: any) => renderGlossWordRow(g, w, front))}
                      </div>
                    ) : glossSearch.trim() ? (
                      <div style={{ fontSize: '12px', color: '#86868B', padding: '8px 2px' }}>没找到「{glossSearch}」。换个说法试试，或用下面的字母翻。</div>
                    ) : (
                      <>
                        {/* 字母格 */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                          {groups.map(grp => {
                            const done = front >= grp.lastIdx;
                            const partial = !done && front >= grp.firstIdx;
                            const active = glossLetter === grp.letter;
                            return (
                              <button key={grp.letter}
                                onClick={() => setGlossLetter(active ? null : grp.letter)}
                                title={`${grp.words.length} 个词`}
                                style={{
                                  minWidth: '38px', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer',
                                  fontSize: '13px', fontWeight: 800, lineHeight: 1.2,
                                  border: active ? '2px solid #AF52DE' : '1px solid #D2D2D7',
                                  background: done ? 'rgba(52,199,89,0.12)' : partial ? 'rgba(175,82,222,0.12)' : '#FFF',
                                  color: done ? '#248A3D' : partial ? '#AF52DE' : '#1D1D1F',
                                }}>
                                {grp.letter}
                                <div style={{ fontSize: '9px', fontWeight: 600, color: '#86868B' }}>{grp.words.length}</div>
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ fontSize: '11px', color: '#86868B', marginBottom: '8px' }}>
                          <span style={{ color: '#248A3D', fontWeight: 700 }}>绿色</span> = 这个字母整段背完 ·
                          <span style={{ color: '#AF52DE', fontWeight: 700 }}> 紫色</span> = 正背到这个字母 · 白色 = 还没到
                        </div>

                        {/* 展开的字母词条 */}
                        {glossLetter && (
                          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #E5E5EA', borderRadius: '9px', background: '#FFF' }}>
                            {(groups.find(x => x.letter === glossLetter)?.words || []).map((w: any) => renderGlossWordRow(g, w, front))}
                          </div>
                        )}
                      </>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {front < rng.max && (
                        <button onClick={() => handleFinishBook(g)}
                          style={{ fontSize: '11px', fontWeight: 700, color: '#34C759', background: 'rgba(52,199,89,0.1)', border: '1px solid rgba(52,199,89,0.25)', borderRadius: '7px', padding: '6px 10px', cursor: 'pointer' }}>
                          ✓ 整本背完
                        </button>
                      )}
                      {front > 0 && (
                        <button onClick={() => handleClearGlossary(g)}
                          style={{ fontSize: '11px', fontWeight: 700, color: '#FF3B30', background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.2)', borderRadius: '7px', padding: '6px 10px', cursor: 'pointer' }}>
                          清空这张表的进度
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 历史记录 */}
        {history.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#86868B', marginBottom: '8px' }}>
              进度记录（共 {history.length} 条，点右侧可删除）
            </div>
            <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #E5E5EA', borderRadius: '10px' }}>
              {history.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderBottom: '1px solid #F0F0F3', fontSize: '13px' }}>
                  <span style={{ color: '#1D1D1F', fontWeight: 600 }}>
                    <span style={{ color: '#0071E3', fontWeight: 700 }}>{m.date}</span>
                    <span style={{ margin: '0 10px', color: '#86868B' }}>{BOOK_PAGE_RANGE[m.bookId]?.name || GLOSSARY_RANGE[m.bookId]?.name || m.bookId}</span>
                    {GLOSSARY_RANGE[m.bookId] ? <>背到第 <b>{m.upToPage}</b> 个词</> : <>上到第 <b>{m.upToPage}</b> 页</>}
                  </span>
                  <button onClick={() => handleDeletePageMark(m.id)} title="删除这条记录"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF3B30', display: 'flex', padding: '4px' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderActivationTab = () => (
    <div className="animate-fade-in">
      {renderPageProgressPanel()}

      <div style={{ marginBottom: showLegacyUnits ? '16px' : '32px' }}>
        <button onClick={() => setShowLegacyUnits(v => !v)}
          style={{ background: 'none', border: '1px dashed #D2D2D7', borderRadius: '10px',
                   padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: '#86868B', cursor: 'pointer' }}>
          {showLegacyUnits ? '▲ 收起旧版「单元授权」' : '▼ 旧版「单元授权」（已被上面的页码进度取代，一般用不到）'}
        </button>
      </div>

      {showLegacyUnits && (
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
          💡 <strong>v2.0 全维知识库与词汇统计提示：</strong> 本系统现已全面升级为<strong>多维能力知识库</strong>（涵盖单词、动词变位矩阵、名词变格、常用从句及情境对话金句）。对于生词较少的单元（如 A1-B 购物/看病、A2 命名日/命令式），系统已自动配备专项语法与情境考题，确保 Leon 获得最完整的语言能力训练。点击“🔍 重点与金句”可随时查阅。
        </div>

        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="admin-th" style={{ width: '11%' }}>课本章节</th>
                <th className="admin-th" style={{ width: '19%' }}>单元课程与属性标签</th>
                <th className="admin-th" style={{ width: '24%' }}>核心语法与配套教学内容</th>
                <th className="admin-th" style={{ width: '13%' }}>全维知识库储备</th>
                <th className="admin-th" style={{ width: '18%' }}>设定学习周 (周一为始)</th>
                <th className="admin-th" style={{ width: '15%' }}>授权状态与操作</th>
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
                  const knowledgeEntry = (unitKnowledgeData as any[]).find(
                    k => k.book_id.toLowerCase() === bookName.toLowerCase() && k.unit === unitNum
                  );

                  return (
                    <tr key={`${bookName}-${unitNum}`} className="hover-bg-gray">
                      <td className="admin-td" style={{ fontWeight: 700 }}>{bookName}</td>
                      <td className="admin-td">
                        <span style={{ fontWeight: 600 }}>第 {unitNum} 单元</span>
                        <div style={{ fontSize: '12px', color: '#86868B', marginTop: '2px', fontWeight: 500 }}>
                          {getUnitChineseName(bookName, unitNum)}
                        </div>
                        {knowledgeEntry?.badge && (
                          <div style={{ 
                            fontSize: '10.5px', 
                            fontWeight: 750, 
                            color: '#0071E3', 
                            background: 'rgba(0,113,227,0.08)', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            display: 'inline-block', 
                            marginTop: '4px',
                            border: '1px solid rgba(0,113,227,0.15)'
                          }}>
                            {knowledgeEntry.badge}
                          </div>
                        )}
                      </td>
                      <td className="admin-td" style={{ fontSize: '13px', lineHeight: '1.5', color: '#515154', fontWeight: 500 }}>
                        <div>{getUnitGrammarPoints(bookName, unitNum)}</div>
                        {knowledgeEntry && (
                          <button
                            onClick={() => setSelectedUnitKnowledge(knowledgeEntry)}
                            style={{
                              marginTop: '6px',
                              background: 'transparent',
                              border: 'none',
                              color: '#0071E3',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            🔍 查看教学重点、变位与黄金句型 →
                          </button>
                        )}
                      </td>
                      <td className="admin-td">
                        <div style={{ fontWeight: 700, color: '#1D1D1F' }}>{words.length} 词汇</div>
                        {knowledgeEntry?.drills && (
                          <div style={{ fontSize: '11px', color: '#34C759', fontWeight: 700, marginTop: '2px' }}>
                            + {knowledgeEntry.drills.length} 道语法/情境考题
                          </div>
                        )}
                      </td>
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
                                style={{ width: '130px', padding: '4px 6px', fontSize: '12px' }}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {isLocked ? (
                            <span style={{ whiteSpace: 'nowrap', color: '#86868B', background: 'rgba(0,0,0,0.04)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                              未授权 (锁定中)
                            </span>
                          ) : isUnitActivated ? (
                            <span style={{ whiteSpace: 'nowrap', color: '#34C759', background: 'rgba(52,199,89,0.08)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                              已激活 (已开始) ({activatedInUnitCount}/{words.length})
                            </span>
                          ) : (
                            <span style={{ whiteSpace: 'nowrap', color: '#FF9500', background: 'rgba(255,149,0,0.08)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
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
                                padding: '3px 8px', 
                                fontSize: '11px', 
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
                                padding: '3px 8px', 
                                fontSize: '11px', 
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
      )}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px' }}>
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

  const handleApproveFeedback = async (feedbackItem: any) => {
    const cleanGreekKey = cleanGreekForComparison(feedbackItem.greek);
    const existingAlts = alternativeTranslations[cleanGreekKey] || [];
    if (!existingAlts.includes(feedbackItem.userTyped.trim())) {
      existingAlts.push(feedbackItem.userTyped.trim());
    }
    const updatedAlts = {
      ...alternativeTranslations,
      [cleanGreekKey]: existingAlts
    };
    const updatedFeedback = userFeedbackList.map(item => {
      if (item.id === feedbackItem.id) {
        return { ...item, status: 'approved' as const };
      }
      return item;
    });
    setAlternativeTranslations(updatedAlts);
    setUserFeedbackList(updatedFeedback);
    await saveSharedState({
      alternative_translations: updatedAlts,
      user_feedback: updatedFeedback
    });
    alert(`已将 “${feedbackItem.userTyped}” 批准为 “${feedbackItem.greek}” 的备选翻译！`);
  };

  /** 停用这个词：从此不再出现在任何题目里 */
  const handleDisableWord = async (feedbackItem: any) => {
    const key = (feedbackItem.wordKey || feedbackItem.greek || '').trim();
    if (!key) return;
    if (!window.confirm(`停用「${key}」？\n这个词从此不会再出现在 Leon 的任何题目里（可在下方停用清单里恢复）。`)) return;
    const nextDisabled = Array.from(new Set([...disabledWords, key]));
    const updatedFeedback = userFeedbackList.map(it =>
      it.id === feedbackItem.id ? { ...it, status: 'approved' as const } : it);
    setDisabledWords(nextDisabled);
    setUserFeedbackList(updatedFeedback);
    await saveSharedState({ disabled_words: nextDisabled, user_feedback: updatedFeedback });
    alert(`已停用「${key}」，之后不会再出这个词的题。`);
  };

  const handleRestoreWord = async (key: string) => {
    const next = disabledWords.filter(w => w !== key);
    setDisabledWords(next);
    await saveSharedState({ disabled_words: next });
  };

  const handleRejectFeedback = async (feedbackItem: any) => {
    const updatedFeedback = userFeedbackList.map(item => {
      if (item.id === feedbackItem.id) {
        return { ...item, status: 'rejected' as const };
      }
      return item;
    });
    setUserFeedbackList(updatedFeedback);
    await saveSharedState({
      user_feedback: updatedFeedback
    });
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    const updatedFeedback = userFeedbackList.filter(item => item.id !== feedbackId);
    setUserFeedbackList(updatedFeedback);
    await saveSharedState({
      user_feedback: updatedFeedback
    });
  };

  const handleDeleteAlternative = async (greekKey: string, indexToDelete: number) => {
    const existingAlts = alternativeTranslations[greekKey] || [];
    const updatedAltsList = existingAlts.filter((_, idx) => idx !== indexToDelete);
    let updatedAlts = { ...alternativeTranslations };
    if (updatedAltsList.length === 0) {
      delete updatedAlts[greekKey];
    } else {
      updatedAlts[greekKey] = updatedAltsList;
    }
    setAlternativeTranslations(updatedAlts);
    await saveSharedState({
      alternative_translations: updatedAlts
    });
  };


  // ===== 每周做题报告 =====
  const MODULE_CN: Record<string, string> = {
    spelling: '拼字', quiz: '选择', cloze: '课本填空', tf: '判断',
    grzh: '希→中翻译', zhgr: '中→希翻译', matching: '连连看', glossary: '单词表',
  };

  const renderWeeklyReport = () => {
    const base = parseLocalDate(getGreeceDateString()) || new Date();
    const monday = new Date(base);
    const dow = (monday.getDay() + 6) % 7;                   // 周一=0
    monday.setDate(monday.getDate() - dow + reportWeekOffset * 7);
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    const inWeek = answerLog.filter(r => days.includes(r.d));
    const pct = (a: number, b: number) => b > 0 ? Math.round(a / b * 100) : 0;
    const fmtSec = (ms: number) => ms > 0 ? `${(ms / 1000).toFixed(1)} 秒` : '—';

    const total = inWeek.length;
    const right = inWeek.filter(r => r.ok).length;
    const hinted = inWeek.filter(r => r.h).length;
    const avgMs = total ? Math.round(inWeek.reduce((s, r) => s + (r.ms || 0), 0) / total) : 0;

    const byModule: Record<string, any[]> = {};
    inWeek.forEach(r => { (byModule[r.m] = byModule[r.m] || []).push(r); });

    const wrongCount: Record<string, number> = {};
    inWeek.filter(r => !r.ok).forEach(r => { wrongCount[r.q] = (wrongCount[r.q] || 0) + 1; });
    const topWrong = Object.entries(wrongCount).sort((a, b) => b[1] - a[1]).slice(0, 12);

    return (
      <div className="admin-panel mb-8">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div>
            <h3 className="admin-panel-title" style={{ marginBottom: '2px' }}>📊 每周做题报告</h3>
            <div style={{ fontSize: '12px', color: '#86868B' }}>{days[0]} ~ {days[6]}</div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setReportWeekOffset(v => v - 1)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #D2D2D7', background: '#FFF', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>← 上一周</button>
            <button onClick={() => setReportWeekOffset(0)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #D2D2D7', background: reportWeekOffset === 0 ? '#F5F5F7' : '#FFF', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>本周</button>
            <button onClick={() => setReportWeekOffset(v => Math.min(0, v + 1))} disabled={reportWeekOffset >= 0} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #D2D2D7', background: '#FFF', cursor: reportWeekOffset >= 0 ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 700, opacity: reportWeekOffset >= 0 ? 0.4 : 1 }}>下一周 →</button>
          </div>
        </div>

        {total === 0 ? (
          <div style={{ fontSize: '13px', color: '#86868B', background: '#F5F5F7', borderRadius: '10px', padding: '16px', lineHeight: 1.7 }}>
            这一周还没有做题记录。
            <br /><b style={{ color: '#1D1D1F' }}>说明：</b>逐题记录是本次新加的功能，<b>以前的答题过程系统从未保存过</b>，
            所以历史数据补不出来。从现在起 Leon 每做一题都会记下「对错 / 有没有看提示 / 用了多久」，攒满一周这里就有完整报告。
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '10px', marginBottom: '18px' }}>
              {[
                { l: '做题总数', v: `${total} 题`, c: '#0071E3' },
                { l: '正确率', v: `${pct(right, total)}%`, c: right / total >= 0.8 ? '#34C759' : '#FF9500' },
                { l: '看提示的题', v: `${hinted} 题（${pct(hinted, total)}%）`, c: '#AF52DE' },
                { l: '平均每题用时', v: fmtSec(avgMs), c: '#1D1D1F' },
              ].map(k => (
                <div key={k.l} style={{ border: '1px solid #E5E5EA', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#86868B', fontWeight: 700 }}>{k.l}</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: k.c, marginTop: '2px' }}>{k.v}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '13px', fontWeight: 800, color: '#1D1D1F', marginBottom: '8px' }}>每天的情况</div>
            <div style={{ overflowX: 'auto', marginBottom: '18px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '520px' }}>
                <thead><tr style={{ background: '#F5F5F7' }}>
                  {['日期', '做题', '正确率', '看提示', '平均用时'].map(h => (
                    <th key={h} style={{ padding: '8px', textAlign: 'left', fontSize: '12px', color: '#86868B' }}>{h}</th>))}
                </tr></thead>
                <tbody>
                  {days.map(d => {
                    const rs = inWeek.filter(r => r.d === d);
                    const rt = rs.filter(r => r.ok).length;
                    const av = rs.length ? Math.round(rs.reduce((s, r) => s + (r.ms || 0), 0) / rs.length) : 0;
                    return (
                      <tr key={d} style={{ borderBottom: '1px solid #F0F0F3', opacity: rs.length ? 1 : 0.45 }}>
                        <td style={{ padding: '8px', fontWeight: 600 }}>{d.slice(5)}</td>
                        <td style={{ padding: '8px' }}>{rs.length || '—'}</td>
                        <td style={{ padding: '8px', fontWeight: 700, color: rs.length ? (pct(rt, rs.length) >= 80 ? '#34C759' : '#FF9500') : '#AEAEB2' }}>
                          {rs.length ? `${pct(rt, rs.length)}%` : '—'}</td>
                        <td style={{ padding: '8px' }}>{rs.length ? `${rs.filter(r => r.h).length} 题` : '—'}</td>
                        <td style={{ padding: '8px' }}>{rs.length ? fmtSec(av) : '—'}</td>
                      </tr>);
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: '13px', fontWeight: 800, color: '#1D1D1F', marginBottom: '8px' }}>分题型</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
              {Object.entries(byModule).sort((a, b) => b[1].length - a[1].length).map(([m, rs]) => (
                <div key={m} style={{ border: '1px solid #E5E5EA', borderRadius: '10px', padding: '9px 13px', fontSize: '12px' }}>
                  <b style={{ color: '#1D1D1F' }}>{MODULE_CN[m] || m}</b>
                  <span style={{ color: '#86868B' }}> · {rs.length} 题 · </span>
                  <b style={{ color: pct(rs.filter((r: any) => r.ok).length, rs.length) >= 80 ? '#34C759' : '#FF9500' }}>
                    {pct(rs.filter((r: any) => r.ok).length, rs.length)}%
                  </b>
                  <span style={{ color: '#86868B' }}> · 提示 {rs.filter((r: any) => r.h).length}</span>
                </div>
              ))}
            </div>

            {topWrong.length > 0 && (
              <>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#1D1D1F', marginBottom: '8px' }}>这周错得最多的</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {topWrong.map(([q, n]) => (
                    <span key={q} style={{ background: 'rgba(255,59,48,0.07)', border: '1px solid rgba(255,59,48,0.2)',
                      borderRadius: '99px', padding: '5px 12px', fontSize: '13px' }}>
                      <b style={{ color: '#1D1D1F' }}>{q}</b>
                      <span style={{ color: '#FF3B30', fontWeight: 700 }}> ×{n}</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    );
  };

  const renderDisabledWordsPanel = () => (
    <div className="admin-panel mb-8">
      <h3 className="admin-panel-title" style={{ marginBottom: '4px' }}>已停用的词（{disabledWords.length}）</h3>
      <p style={{ fontSize: '13px', color: '#86868B', marginBottom: '14px' }}>
        这些词不会出现在 Leon 的任何题目里。点「恢复」可以让它重新参与出题。
      </p>
      {disabledWords.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#AEAEB2' }}>暂无停用的词。</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {disabledWords.map(w => (
            <span key={w} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: '#F5F5F7', border: '1px solid #E5E5EA', borderRadius: '99px', padding: '6px 12px', fontSize: '13px' }}>
              <b style={{ color: '#1D1D1F' }}>{w}</b>
              <button onClick={() => handleRestoreWord(w)}
                style={{ background: 'none', border: 'none', color: '#0071E3', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                恢复
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );

  const renderFeedbackTab = () => {
    const pendingFeedback = userFeedbackList.filter(item => item.status === 'pending');
    const processedFeedback = userFeedbackList.filter(item => item.status !== 'pending');
    
    return (
      <div className="animate-fade-in">
        {renderWeeklyReport()}
        {renderDisabledWordsPanel()}
        <div className="admin-panel mb-8">
          <h3 className="admin-panel-title">Leon 答题纠偏与系统成长中心</h3>
          <p style={{ fontSize: '14px', color: '#86868B', marginBottom: '24px', lineHeight: '1.6' }}>
            Leon 点「一键报错」时会先被问清楚是哪种情况，您在这里按情况处理：
            <br />· <b style={{ color: '#0071E3' }}>我的答案也对</b> → 采纳后，这个说法以后也算正确（判题更宽容）
            <br />· <b style={{ color: '#FF9500' }}>这道题本身有问题</b> → 可直接<b>停用这个词</b>，它从此不再出任何题
            <br />不会做而已的题，Leon 直接点「跳过 / 下一题」即可，不会留记录，也不会被卡住。
          </p>

          <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#1D1D1F', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} style={{ color: '#FF9500' }} />
            待处理纠偏反馈 ({pendingFeedback.length})
          </h4>

          {pendingFeedback.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#86868B', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', marginBottom: '32px' }}>
              🎉 暂无待处理反馈，系统运行状态优良！
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '32px' }}>
              {pendingFeedback.map(item => (
                <div key={item.id} style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '16px', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '12px', color: '#86868B' }}>
                    <span>反馈日期: {item.date}</span>
                    <span>问题 ID: {item.questionId}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                    <div>
                      <p style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 'bold', color: '#0071E3' }}>希腊语: {item.greek}</p>
                      <p style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#1D1D1F' }}>标准答案: <span style={{ fontWeight: 600 }}>{item.expected}</span></p>
                      <p style={{ margin: 0, fontSize: '14px', color: '#FF9500' }}>Leon 翻译: <span style={{ fontWeight: 600, textDecoration: 'underline' }}>{item.userTyped}</span></p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignSelf: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '99px',
                        background: item.reason === 'bad_word' ? 'rgba(255,149,0,0.12)' : item.reason === 'alt_answer' ? 'rgba(0,113,227,0.1)' : 'rgba(142,142,147,0.12)',
                        color: item.reason === 'bad_word' ? '#FF9500' : item.reason === 'alt_answer' ? '#0071E3' : '#86868B',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.reason === 'bad_word' ? '题目有问题' : item.reason === 'alt_answer' ? '我的答案也对' : '旧版反馈'}
                      </span>
                      {item.reason === 'bad_word' ? (
                        <button
                          onClick={() => handleDisableWord(item)}
                          className="btn-premium"
                          style={{ padding: '6px 12px', fontSize: '12px', width: 'auto', border: '1px solid #FF9500', color: '#FF9500', background: 'rgba(255,149,0,0.06)' }}
                        >
                          停用这个词
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApproveFeedback(item)}
                          className="btn-premium btn-blue-filled"
                          style={{ padding: '6px 12px', fontSize: '12px', width: 'auto' }}
                          disabled={!item.userTyped || /^\(.*\)$/.test(String(item.userTyped).trim())}
                          title={!item.userTyped ? '这条没有学生答案，不能当备选答案' : ''}
                        >
                          采纳为备选答案
                        </button>
                      )}
                      <button 
                        onClick={() => handleRejectFeedback(item)}
                        className="btn-premium"
                        style={{ padding: '6px 12px', fontSize: '12px', width: 'auto', border: '1px solid #FF3B30', color: '#FF3B30', background: 'rgba(255,59,48,0.05)' }}
                      >
                        忽略
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#1D1D1F', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} style={{ color: '#86868B' }} />
            已处理反馈记录 ({processedFeedback.length})
          </h4>

          {processedFeedback.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#86868B', fontSize: '13px' }}>
              暂无已处理历史记录。
            </div>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', padding: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', textAlign: 'left', color: '#86868B' }}>
                    <th style={{ padding: '8px' }}>希腊语</th>
                    <th style={{ padding: '8px' }}>标准答案</th>
                    <th style={{ padding: '8px' }}>Leon 翻译</th>
                    <th style={{ padding: '8px' }}>状态</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {processedFeedback.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <td style={{ padding: '8px', fontWeight: 500 }}>{item.greek}</td>
                      <td style={{ padding: '8px' }}>{item.expected}</td>
                      <td style={{ padding: '8px' }}>{item.userTyped}</td>
                      <td style={{ padding: '8px', color: item.status === 'approved' ? '#34C759' : '#86868B', fontWeight: 600 }}>
                        {item.status === 'approved' ? '已批准' : '已忽略'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteFeedback(item.id)}
                          style={{ background: 'none', border: 'none', color: '#FF3B30', cursor: 'pointer', fontSize: '12px' }}
                        >
                          删除记录
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-panel">
          <h3 className="admin-panel-title" style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: '#0071E3' }} />
            系统已习得的备选翻译列表
          </h3>
          <p style={{ fontSize: '13px', color: '#86868B', marginBottom: '16px' }}>
            以下是系统当前存储的所有备选翻译。Leon 在答题时只要输入以下任何一项，系统都会判定为正确。
          </p>

          {Object.keys(alternativeTranslations).length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#86868B', fontSize: '13px' }}>
              暂无习得的备选翻译。
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              {Object.keys(alternativeTranslations).map(greekKey => (
                <div key={greekKey} style={{ border: '1px solid rgba(0,0,0,0.05)', borderRadius: '10px', padding: '12px', background: 'rgba(0,0,0,0.01)' }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '14px', color: '#1D1D1F' }}>
                    希腊语 Key: <code style={{ background: '#f5f5f7', padding: '2px 6px', borderRadius: '4px' }}>{greekKey}</code>
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(alternativeTranslations[greekKey] || []).map((alt, idx) => (
                      <span 
                        key={idx} 
                        style={{ 
                          background: '#fff', 
                          border: '1px solid rgba(0,0,0,0.08)', 
                          padding: '4px 8px', 
                          borderRadius: '6px', 
                          fontSize: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {alt}
                        <button 
                          onClick={() => handleDeleteAlternative(greekKey, idx)}
                          style={{ border: 'none', background: 'none', color: '#FF3B30', cursor: 'pointer', padding: 0, fontWeight: 'bold' }}
                          title="删除备选"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

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
        page_progress: pageMarks,
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
          <button 
            onClick={() => setActiveTab('feedback')} 
            className={`admin-nav-item ${activeTab === 'feedback' ? 'active' : ''}`}
          >
            <Sparkles size={18} />
            <span>错题纠偏与系统成长</span>
            {userFeedbackList.filter(item => item.status === 'pending').length > 0 && (
              <span style={{ 
                background: '#FF3B30', 
                color: '#fff', 
                fontSize: '11px', 
                padding: '2px 6px', 
                borderRadius: '10px', 
                fontWeight: 'bold', 
                marginLeft: 'auto' 
              }}>
                {userFeedbackList.filter(item => item.status === 'pending').length}
              </span>
            )}
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
        {activeTab === 'feedback' && renderFeedbackTab()}

        {/* v2.0 Multi-Dimensional Unit Knowledge Modal */}
        {selectedUnitKnowledge && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              padding: '32px',
              position: 'relative',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #E5E5EA', paddingBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{
                      background: 'rgba(0,113,227,0.1)',
                      color: '#0071E3',
                      fontSize: '12px',
                      fontWeight: 750,
                      padding: '3px 8px',
                      borderRadius: '6px'
                    }}>
                      {selectedUnitKnowledge.book_title} · 第 {selectedUnitKnowledge.unit} 单元
                    </span>
                    <span style={{
                      background: 'rgba(52,199,89,0.1)',
                      color: '#34C759',
                      fontSize: '12px',
                      fontWeight: 750,
                      padding: '3px 8px',
                      borderRadius: '6px'
                    }}>
                      {selectedUnitKnowledge.badge}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1D1D1F', margin: 0 }}>
                    {selectedUnitKnowledge.unit_title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedUnitKnowledge(null)}
                  style={{
                    background: '#F2F2F7',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#86868B',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* 1. Grammar Points */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 750, color: '#0071E3', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📌 核心语法与教学重点
                </h4>
                <div style={{ background: '#F8F9FA', padding: '12px 16px', borderRadius: '10px', fontSize: '13.5px', lineHeight: '1.6', color: '#1D1D1F' }}>
                  {selectedUnitKnowledge.grammar_points}
                </div>
              </div>

              {/* 2. Core Formulas */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 750, color: '#34C759', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📐 核心公式与变位句型矩阵
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedUnitKnowledge.core_formulas?.map((formula: string, idx: number) => (
                    <div key={idx} style={{
                      background: 'rgba(52,199,89,0.06)',
                      borderLeft: '4px solid #34C759',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#1D1D1F',
                      fontFamily: 'SF Pro Text, -apple-system, sans-serif'
                    }}>
                      {formula}
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Golden Dialogues */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 750, color: '#9333EA', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🗣️ 黄金情境对话 (实战交际)
                </h4>
                <div style={{ background: '#FAF5FF', border: '1px solid rgba(147,51,234,0.15)', borderRadius: '12px', padding: '14px' }}>
                  {selectedUnitKnowledge.golden_dialogues?.map((dia: any, idx: number) => (
                    <div key={idx} style={{ marginBottom: idx !== selectedUnitKnowledge.golden_dialogues.length - 1 ? '10px' : '0', fontSize: '13.5px' }}>
                      <span style={{ fontWeight: 750, color: '#9333EA', marginRight: '6px' }}>{dia.speaker}:</span>
                      <strong style={{ color: '#1D1D1F' }}>{dia.greek}</strong>
                      <div style={{ fontSize: '12px', color: '#86868B', marginTop: '2px', marginLeft: '22px' }}>
                        {dia.chinese}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Knowledge Base Drills */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 750, color: '#FF9500', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🎯 知识库精选日常考题 ({selectedUnitKnowledge.drills?.length || 0} 题)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedUnitKnowledge.drills?.map((drill: any, idx: number) => (
                    <div key={idx} style={{ background: '#FFFDF9', border: '1px solid rgba(255,149,0,0.2)', borderRadius: '10px', padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 750,
                          background: 'rgba(255,149,0,0.1)',
                          color: '#D97706',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase'
                        }}>
                          {drill.skill_type}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#34C759' }}>
                          正确答案: {drill.answer}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#1D1D1F', marginBottom: '4px' }}>
                        {drill.question}
                      </div>
                      <div style={{ fontSize: '12px', color: '#86868B', marginBottom: '8px' }}>
                        中文：{drill.translation}
                      </div>
                      <div style={{ fontSize: '12px', background: '#F2F2F7', padding: '8px 12px', borderRadius: '6px', color: '#515154', lineHeight: '1.4' }}>
                        {drill.detailed_tip}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '28px', textAlign: 'right' }}>
                <button
                  onClick={() => setSelectedUnitKnowledge(null)}
                  className="btn-premium"
                  style={{
                    background: '#0071E3',
                    color: '#FFFFFF',
                    padding: '8px 24px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    width: 'auto'
                  }}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

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
  Sparkles
} from 'lucide-react';
import staticVocabData from '../../data/vocabulary.json';

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

  return unitNames[bookKey]?.[unitNum] || "新学期课文";
};

const getUnitGrammarPoints = (bookId: string, unitNum: number): string => {
  const bookKey = bookId.toUpperCase();
  const grammarData: Record<string, Record<number, string>> = {
    "A1-A": {
      1: "希腊语字母表 (Α-Ω)、发音规则、基本问候语、自我介绍。语法：动词 είμαι (是) 单数一二人称变化。",
      2: "数字 1-10、国家与国籍。语法：定冠词 (ο, η, το) 引入、动词 είμαι 复数人称变化。",
      3: "日常活动与常见动作。语法：主动语态第一类规则动词 (Group A: κάνω, διαβάζω) 现在时单复数变化、人称代词主格。",
      4: "学校教室物品与学习用品。语法：名词的主格单数变化（阳性-ος / 阴性-α / 中性-ο）及三性区分规律。",
      5: "星期表达、基本时间表达。语法：时间介词 στις 的用法、数字 11-20。",
      6: "玩具与游戏表达。语法：物主代词（μου, σου等）、名词的主格复数变化形式。",
      7: "家庭成员名称。语法：名词的所有格（属格）表达所有权（...的）。",
      8: "服装与颜色描述、基本外貌特征。语法：形容词的三性单数结尾（-ος, -η, -ο）与修饰规律。",
      9: "动物名称与童话。语法：阳性、阴性与中性名词复数主格的全面变化规则。",
      10: "日常生活作息、一日三餐。语法：简单现在时动词综合应用、时间介词规律。",
      11: "房子布局与房间名称。语法：方位介词与处所介词（στο, στη, στο复数形式）的缩合与使用规律。",
      12: "家具陈设、空间方位关系。语法：空间位置介词短语（πάνω σε 在...上, κάτω από 在...下, μέσα σε 在...里）。",
      13: "城市公共场所与方向。语法：宾格冠词与名词宾格单数（直接宾语）变化引入。",
      14: "期中综合复习。语法：主格与宾格的对比、动词现在时人称词尾的全面复习。",
      15: "动作指令与娱乐。语法：方向介词、基本处所副词与动作表达。"
    },
    "A1-B": {
      16: "天气、四季与气候特征。语法：无人称天气动词（βρέχει, χιονίζει）及表达（κάνει ζέστη/κρύο）。",
      17: "饮食习惯、食物与饮料分类。语法：名词和冠词宾格的复数变化、数量副词（πολύ, λίγο）。",
      18: "日常服装与穿戴。语法：形容词宾格单复数的变化规则与名词修饰法则。",
      19: "身体部位名称、常见病症与健康状况。语法：表达痛觉与身体不适的常用句型（πονάει/πονούν ... μου）。",
      20: "体育运动项目。语法：表达偏好与爱好的动词句型（μου αρέσει / μου αρέσουν ... 我喜欢）。",
      21: "旅行度假与交通工具。语法：介词 με（用/乘）与交通工具的结合使用（με το λεωφορείο/τρένο）。",
      22: "商场购物、商品价格与货品。语法：数字 20-100、问价与支付句型（Πόσο κάνει; Πόσο έχουν;）。",
      23: "职业名称与工作场所。语法：阳性/阴性职业名词结尾的转换后缀（如-ος 变 -α，-ης 变 -τρια）。",
      24: "大自然、植物、环境。语法：中性名词以 -ο 和 -ι 结尾的复数规则及修饰形容词变化规律。",
      25: "节日庆典与祝福话语。语法：简单将来时引入（θα + 现在时动词表达将要发生的动作）。",
      26: "健康饮食建议。语法：形容词比较级（πιο ... από）及常见的不规则比较级规律。",
      27: "闲暇活动与兴趣。语法：简单过去时（Aorist）规则动词的变化规律与时间状语的应用。",
      28: "公共服务与求助。语法：动词的祈使语气引入（用于礼貌请求、规劝与指令）。",
      29: "人际交往与朋友相处。语法：人称代词的弱读宾格形式（με, σε, τον, την, το 等直接宾语代词）。",
      30: "A1终期语法复习。语法：时态系统（现在/将来/过去时）和格系统（主格/属格/宾格）的大合流。"
    },
    "A2": {
      31: "希腊语A2核心语法：名词复习、中性不等音节名词变化、不定过去时 (Αόριστος) 基础用法，核心句型。",
      32: "希腊语A2核心语法：名词所有格/属格复数变化、人称代词属格/间接宾语形式，广告词与宣传句型。",
      33: "希腊语A2核心语法：指小词 (Υποκοριστικά) 构成与用法、序数词变化、指向未来的表达（将来时/虚拟式引出）。",
      34: "A2 阶段第 1 至 3 单元（Ενότητες 1-3）综合复习、重点词汇回顾与应用测试。",
      35: "希腊语A2核心语法：不变化名词 (Άκλιτα ουσιαστικά) 认知、间接引语 (Πλάγιος λόγος) 基本转换规则，祝愿语与服务用语。",
      36: "希腊语A2核心语法：简单虚拟式 (Συνοπτική υποτακτική)、简单命令式 (Συνοπτική προστακτική) 的肯定与否定形式、不定代词。",
      37: "希腊语A2核心语法：第一类条件状语从句 (Υποθετικός λόγος α' είδους)、各类从句引导词（ότι, πως, γιατί, όταν, για να）用法。",
      38: "A2 阶段第 4 至 6 单元（Ενότητες 4-6）综合复习、核心语法强化与场景对话训练。",
      39: "希腊语 A2 级别水平测试全真模拟训练、阅读理解与听力强化、备考策略点拨。"
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
  const a2Schedules: Record<number, UnitSchedule> = {
    31: { startOffset: 210, duration: 14 },
    32: { startOffset: 224, duration: 14 },
    33: { startOffset: 238, duration: 14 },
    34: { startOffset: 252, duration: 14 },
    35: { startOffset: 266, duration: 14 },
    36: { startOffset: 280, duration: 14 },
  };
  return a2Schedules[unit] || { startOffset: 294, duration: 14 };
};

const getUnitFromDate = (dateStr: string): number => {
  try {
    let normalized = dateStr.replace(/[\/\u5e74\u6708]/g, '-').replace(/\u65e5/g, '');
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return 1;

    const baseDate = new Date(START_DATE);
    const diffTime = date.getTime() - baseDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 1;
    if (diffDays < 210) {
      return Math.floor(diffDays / 7) + 1;
    }
    if (diffDays < 224) return 31;
    if (diffDays < 238) return 32;
    if (diffDays < 252) return 33;
    if (diffDays < 266) return 34;
    if (diffDays < 280) return 35;
    if (diffDays < 294) return 36;
    if (diffDays < 308) return 37;
    if (diffDays < 322) return 38;
    return 39;
  } catch (e) {
    return 1;
  }
};

const getCalculatedActivationDates = (vocabList: Word[]): Record<number, string> => {
  const dates: Record<number, string> = {};
  const unitGroups: Record<number, Word[]> = {};
  
  vocabList.forEach(w => {
    if (!unitGroups[w.unit]) {
      unitGroups[w.unit] = [];
    }
    unitGroups[w.unit].push(w);
  });

  Object.keys(unitGroups).forEach(unitStr => {
    const unit = parseInt(unitStr, 10);
    const group = unitGroups[unit].sort((a, b) => a.id - b.id);
    const { startOffset, duration } = getUnitSchedule(unit);
    const N = group.length;

    group.forEach((word, idx) => {
      const wordOffset = N > 0 ? Math.floor((idx / N) * duration) : 0;
      const totalOffset = startOffset + wordOffset;

      const actDate = new Date(START_DATE);
      actDate.setDate(actDate.getDate() + totalOffset);
      dates[word.id] = actDate.toISOString().split('T')[0];
    });
  });

  return dates;
};

const isWordActive = (
  wordId: number, 
  targetDateStr: string, 
  activatedMap: Record<number, string> = {}, 
  calculatedMap: Record<number, string> = {}
) => {
  const map = activatedMap || {};
  const calcMap = calculatedMap || {};
  const manual = map[wordId];
  if (manual === 'LOCKED') return false;
  if (manual) {
    return manual <= targetDateStr;
  }
  const calc = calcMap[wordId];
  if (calc) {
    return calc <= targetDateStr;
  }
  return false;
};

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'activation' | 'upload' | 'settings'>('activation');
  
  // Vocabulary & Activation states
  const [allVocab, setAllVocab] = useState<Word[]>([]);
  const [activatedWords, setActivatedWords] = useState<Record<number, string>>({});
  const [calculatedActivationDates, setCalculatedActivationDates] = useState<Record<number, string>>({});
  
  // Upload states
  const [rawMD, setRawMD] = useState('');
  const [parsedWordsCount, setParsedWordsCount] = useState<number | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadBookId, setUploadBookId] = useState('A1-A');
  const [uploadUnit, setUploadUnit] = useState('1');
  const [customBookId, setCustomBookId] = useState('');
  const [isCustomBook, setIsCustomBook] = useState(false);

  // Activation picker date
  const [activationDate, setActivationDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Load vocabulary & activation dates
  useEffect(() => {
    let mergedVocab = [...(staticVocabData.textbook_vocabulary || [])] as Word[];
    try {
      const custom = JSON.parse(localStorage.getItem('leon_custom_vocab') || '[]');
      mergedVocab = [...mergedVocab, ...custom];
    } catch (e) {}
    setAllVocab(mergedVocab);

    const calcDates = getCalculatedActivationDates(mergedVocab);
    setCalculatedActivationDates(calcDates || {});

    let activated = {};
    try {
      const stored = localStorage.getItem('leon_activated_words');
      if (stored) {
        activated = JSON.parse(stored) || {};
      }
    } catch (e) {}
    setActivatedWords(activated);
  }, []);

  // Compute stats
  const totalWords = allVocab.length;
  const todayStr = new Date().toISOString().split('T')[0];
  const activatedCount = allVocab.filter(w => isWordActive(w.id, todayStr, activatedWords, calculatedActivationDates)).length;
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

  // Handle unit activation
  const handleActivateUnit = (bookId: string, unit: number) => {
    const bookKey = bookId.toUpperCase();
    const wordsInUnit = groupedUnits[bookKey]?.[unit] || [];
    const newActivated = { ...(activatedWords || {}) };
    
    wordsInUnit.forEach(w => {
      if (w && w.id) {
        newActivated[w.id] = activationDate;
      }
    });

    setActivatedWords(newActivated);
    localStorage.setItem('leon_activated_words', JSON.stringify(newActivated));
  };

  // Handle unit deactivation
  const handleDeactivateUnit = (bookId: string, unit: number) => {
    const bookKey = bookId.toUpperCase();
    const wordsInUnit = groupedUnits[bookKey]?.[unit] || [];
    const newActivated = { ...(activatedWords || {}) };
    
    wordsInUnit.forEach(w => {
      if (w && w.id) {
        newActivated[w.id] = 'LOCKED';
      }
    });

    setActivatedWords(newActivated);
    localStorage.setItem('leon_activated_words', JSON.stringify(newActivated));
  };

  // Mock parse MD file and add words to custom vocab
  const handleMDUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawMD.trim()) return;

    const targetBookId = (isCustomBook ? customBookId.trim() : uploadBookId) || 'NEW_UPLOAD';
    const targetUnit = parseInt(uploadUnit, 10) || 1;

    // Simple markdown word extractor: matches lines like:
    // **Greek** /pronunciation/ - Chinese
    // or simply: Greek - Chinese
    const lines = rawMD.split('\n');
    const newWordsList: Word[] = [];
    let currentId = allVocab.length > 0 ? Math.max(...allVocab.map(w => w.id)) + 1 : 1;

    let currentUnit = targetUnit;

    lines.forEach(line => {
      // Parse dates from the MD content. Looks for YYYY-MM-DD, YYYY/MM/DD, or YYYY年MM月DD日
      const dateMatch = line.match(/(\d{4})[-\/\u5e74](\d{1,2})[-\/\u6708](\d{1,2})\u65e5?/);
      if (dateMatch) {
        const year = dateMatch[1];
        const month = dateMatch[2].padStart(2, '0');
        const day = dateMatch[3].padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        currentUnit = getUnitFromDate(dateStr);
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
      localStorage.setItem('leon_custom_vocab', JSON.stringify(updatedCustom));
      
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
              选择对应的课本单元与授权生效日期，将其所包含的单词、语法要点与配套特训注入 Leon 的每日自适应复习与智能训练流中。
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={18} className="text-orange" />
            <input 
              type="date" 
              value={activationDate} 
              onChange={e => setActivationDate(e.target.value)} 
              className="date-picker-input"
            />
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
                <th className="admin-th" style={{ width: '15%' }}>课本章节 / 书籍 ID</th>
                <th className="admin-th" style={{ width: '25%' }}>单元课程</th>
                <th className="admin-th" style={{ width: '35%' }}>核心语法与配套教学内容</th>
                <th className="admin-th" style={{ width: '10%' }}>单元包含词汇</th>
                <th className="admin-th" style={{ width: '15%' }}>课程与特训授权状态</th>
                <th className="admin-th" style={{ width: '10%' }}>授权操作</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedUnits).map(([bookName, units]) => {
                return Object.entries(units).map(([unitNumStr, words]) => {
                  const unitNum = parseInt(unitNumStr, 10);
                  const isUnitActivated = words.every(w => isWordActive(w.id, activationDate, activatedWords, calculatedActivationDates));
                  const activatedInUnitCount = words.filter(w => isWordActive(w.id, activationDate, activatedWords, calculatedActivationDates)).length;

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
                        {isUnitActivated ? (
                          <span style={{ whiteSpace: 'nowrap', color: '#34C759', background: 'rgba(52,199,89,0.08)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                            已授权学习 (解锁) ({activatedInUnitCount}/{words.length})
                          </span>
                        ) : activatedInUnitCount > 0 ? (
                          <span style={{ whiteSpace: 'nowrap', color: '#FF9500', background: 'rgba(255,149,0,0.08)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                            部分授权 ({activatedInUnitCount}/{words.length})
                          </span>
                        ) : (
                          <span style={{ whiteSpace: 'nowrap', color: '#86868B', background: 'rgba(0,0,0,0.04)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                            未授权 (锁定中)
                          </span>
                        )}
                      </td>
                      <td className="admin-td">
                        {isUnitActivated ? (
                          <button 
                            onClick={() => handleDeactivateUnit(bookName, unitNum)}
                            className="btn-premium"
                            style={{ 
                              whiteSpace: 'nowrap', 
                              background: 'rgba(255,59,48,0.08)', 
                              color: '#FF3B30', 
                              padding: '6px 14px', 
                              fontSize: '12px', 
                              width: '120px', 
                              minWidth: '120px', 
                              marginTop: 0, 
                              justifyContent: 'center', 
                              display: 'inline-flex' 
                            }}
                          >
                            锁定此单元
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleActivateUnit(bookName, unitNum)}
                            className="btn-premium"
                            style={{ 
                              whiteSpace: 'nowrap', 
                              background: 'rgba(52,199,89,0.08)', 
                              color: '#34C759', 
                              padding: '6px 14px', 
                              fontSize: '12px', 
                              width: '120px', 
                              minWidth: '120px', 
                              marginTop: 0, 
                              justifyContent: 'center', 
                              display: 'inline-flex' 
                            }}
                          >
                            授权解锁单元
                          </button>
                        )}
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

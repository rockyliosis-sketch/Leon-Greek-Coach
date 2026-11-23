export interface LevelInfo {
  id: string;
  name: string;
  nameEl: string;
  range: string;
  minPoints: number;
  maxPoints: number;
  icon: string;
  gradient: string;
  color: string;
  glowColor: string;
  tier: 'standard' | 'gold_saint';
  stars?: number;
  badgeUrl: string;
  palaceNo?: number;
  saintTitle?: string;
  imageUrl?: string;
}

export const RANK_STAR_URL = '/images/ranks/rank_star.png';

export const SCOUT_LEVELS: LevelInfo[] = [
  // 基础段位 (0 - 1600 XP)
  { id: 'bronze_1', tier: 'standard', stars: 1, badgeUrl: '/images/ranks/rank_bronze.png', name: '青铜 1 星', nameEl: 'Χάλκινο 1★', range: '0 - 100 XP', minPoints: 0, maxPoints: 100, icon: 'I', gradient: 'linear-gradient(135deg, #cd7f32, #8c5218)', color: '#CD7F32', glowColor: 'rgba(205, 127, 50, 0.4)' },
  { id: 'silver_1', tier: 'standard', stars: 1, badgeUrl: '/images/ranks/rank_silver.png', name: '白银 1 星', nameEl: 'Ασημένιο 1★', range: '101 - 200 XP', minPoints: 101, maxPoints: 200, icon: 'II', gradient: 'linear-gradient(135deg, #bdc3c7, #7f8c8d)', color: '#7F8C8D', glowColor: 'rgba(127, 140, 141, 0.4)' },
  { id: 'gold_1', tier: 'standard', stars: 1, badgeUrl: '/images/ranks/rank_gold.png', name: '黄金 1 星', nameEl: 'Χρυσό 1★', range: '201 - 400 XP', minPoints: 201, maxPoints: 400, icon: 'III', gradient: 'linear-gradient(135deg, #f7971e, #ffd200)', color: '#F39C12', glowColor: 'rgba(243, 156, 18, 0.45)' },
  { id: 'diamond_1', tier: 'standard', stars: 1, badgeUrl: '/images/ranks/rank_diamond.png', name: '钻石 1 星', nameEl: 'Διαμάντι 1★', range: '401 - 533 XP', minPoints: 401, maxPoints: 533, icon: 'IV', gradient: 'linear-gradient(135deg, #00c6ff, #0072ff)', color: '#0072FF', glowColor: 'rgba(0, 114, 255, 0.45)' },
  { id: 'diamond_2', tier: 'standard', stars: 2, badgeUrl: '/images/ranks/rank_diamond.png', name: '钻石 2 星', nameEl: 'Διαμάντι 2★', range: '534 - 666 XP', minPoints: 534, maxPoints: 666, icon: 'IV', gradient: 'linear-gradient(135deg, #2193b0, #6dd5ed)', color: '#2193B0', glowColor: 'rgba(33, 147, 176, 0.45)' },
  { id: 'diamond_3', tier: 'standard', stars: 3, badgeUrl: '/images/ranks/rank_diamond.png', name: '钻石 3 星', nameEl: 'Διαμάντι 3★', range: '667 - 800 XP', minPoints: 667, maxPoints: 800, icon: 'IV', gradient: 'linear-gradient(135deg, #4a00e0, #8e2de2)', color: '#8E2DE2', glowColor: 'rgba(142, 45, 226, 0.5)' },
  { id: 'king_1', tier: 'standard', stars: 1, badgeUrl: '/images/ranks/rank_king.png', name: '王者 1 星', nameEl: 'Βασιλιάς 1★', range: '801 - 960 XP', minPoints: 801, maxPoints: 960, icon: 'V', gradient: 'linear-gradient(135deg, #ff416c, #ff4b2b)', color: '#FF4500', glowColor: 'rgba(255, 69, 0, 0.4)' },
  { id: 'king_2', tier: 'standard', stars: 2, badgeUrl: '/images/ranks/rank_king.png', name: '王者 2 星', nameEl: 'Βασιλιάς 2★', range: '961 - 1120 XP', minPoints: 961, maxPoints: 1120, icon: 'V', gradient: 'linear-gradient(135deg, #f857a6, #ff5858)', color: '#FF5858', glowColor: 'rgba(248, 87, 166, 0.5)' },
  { id: 'king_3', tier: 'standard', stars: 3, badgeUrl: '/images/ranks/rank_king.png', name: '王者 3 星', nameEl: 'Βασιλιάς 3★', range: '1121 - 1280 XP', minPoints: 1121, maxPoints: 1280, icon: 'V', gradient: 'linear-gradient(135deg, #eb3349, #f45c43)', color: '#EB3349', glowColor: 'rgba(235, 51, 73, 0.5)' },
  { id: 'king_4', tier: 'standard', stars: 4, badgeUrl: '/images/ranks/rank_king.png', name: '王者 4 星', nameEl: 'Βασιλιάς 4★', range: '1281 - 1440 XP', minPoints: 1281, maxPoints: 1440, icon: 'V', gradient: 'linear-gradient(135deg, #e65c00, #f9d423)', color: '#E65C00', glowColor: 'rgba(230, 92, 0, 0.5)' },
  { id: 'king_5', tier: 'standard', stars: 5, badgeUrl: '/images/ranks/rank_king.png', name: '王者 5 星', nameEl: 'Βασιλιάς 5★', range: '1441 - 1600 XP', minPoints: 1441, maxPoints: 1600, icon: 'V', gradient: 'linear-gradient(135deg, #b20a2c, #f9d423)', color: '#B20A2C', glowColor: 'rgba(178, 10, 44, 0.6)' },

  // 至尊荣耀 1-9 星 (1601 - 3400 XP)
  { id: 'glory_1', tier: 'standard', stars: 1, badgeUrl: '/images/ranks/rank_glory.png', name: '至尊荣耀 1 星', nameEl: 'Υπέρτατη Δόξα 1★', range: '1601 - 1800 XP', minPoints: 1601, maxPoints: 1800, icon: 'VI', gradient: 'linear-gradient(135deg, #f953c6, #b91d73)', color: '#F953C6', glowColor: 'rgba(249, 83, 198, 0.5)' },
  { id: 'glory_2', tier: 'standard', stars: 2, badgeUrl: '/images/ranks/rank_glory.png', name: '至尊荣耀 2 星', nameEl: 'Υπέρτατη Δόξα 2★', range: '1801 - 2000 XP', minPoints: 1801, maxPoints: 2000, icon: 'VI', gradient: 'linear-gradient(135deg, #da22ff, #9733ee)', color: '#DA22FF', glowColor: 'rgba(218, 34, 255, 0.5)' },
  { id: 'glory_3', tier: 'standard', stars: 3, badgeUrl: '/images/ranks/rank_glory.png', name: '至尊荣耀 3 星', nameEl: 'Υπέρτατη Δόξα 3★', range: '2001 - 2200 XP', minPoints: 2001, maxPoints: 2200, icon: 'VI', gradient: 'linear-gradient(135deg, #7f00ff, #e100ff)', color: '#7F00FF', glowColor: 'rgba(127, 0, 255, 0.5)' },
  { id: 'glory_4', tier: 'standard', stars: 4, badgeUrl: '/images/ranks/rank_glory.png', name: '至尊荣耀 4 星', nameEl: 'Υπέρτατη Δόξα 4★', range: '2201 - 2400 XP', minPoints: 2201, maxPoints: 2400, icon: 'VI', gradient: 'linear-gradient(135deg, #833ab4, #fd1d1d)', color: '#FD1D1D', glowColor: 'rgba(253, 29, 29, 0.5)' },
  { id: 'glory_5', tier: 'standard', stars: 5, badgeUrl: '/images/ranks/rank_glory.png', name: '至尊荣耀 5 星', nameEl: 'Υπέρτατη Δόξα 5★', range: '2401 - 2600 XP', minPoints: 2401, maxPoints: 2600, icon: 'VI', gradient: 'linear-gradient(135deg, #fc00ff, #00dbde)', color: '#FC00FF', glowColor: 'rgba(252, 0, 255, 0.6)' },
  { id: 'glory_6', tier: 'standard', stars: 6, badgeUrl: '/images/ranks/rank_glory.png', name: '至尊荣耀 6 星', nameEl: 'Υπέρτατη Δόξα 6★', range: '2601 - 2800 XP', minPoints: 2601, maxPoints: 2800, icon: 'VI', gradient: 'linear-gradient(135deg, #11998e, #38ef7d)', color: '#11998E', glowColor: 'rgba(17, 153, 142, 0.6)' },
  { id: 'glory_7', tier: 'standard', stars: 7, badgeUrl: '/images/ranks/rank_glory.png', name: '至尊荣耀 7 星', nameEl: 'Υπέρτατη Δόξα 7★', range: '2801 - 3000 XP', minPoints: 2801, maxPoints: 3000, icon: 'VI', gradient: 'linear-gradient(135deg, #3a1c71, #d76d77, #ffaf7b)', color: '#D76D77', glowColor: 'rgba(215, 109, 119, 0.6)' },
  { id: 'glory_8', tier: 'standard', stars: 8, badgeUrl: '/images/ranks/rank_glory.png', name: '至尊荣耀 8 星', nameEl: 'Υπέρτατη Δόξα 8★', range: '3001 - 3200 XP', minPoints: 3001, maxPoints: 3200, icon: 'VI', gradient: 'linear-gradient(135deg, #20002c, #cbb4d4)', color: '#CBB4D4', glowColor: 'rgba(203, 180, 212, 0.6)' },
  { id: 'glory_9', tier: 'standard', stars: 9, badgeUrl: '/images/ranks/rank_glory.png', name: '至尊荣耀 9 星', nameEl: 'Υπέρτατη Δόξα 9★', range: '3201 - 3400 XP', minPoints: 3201, maxPoints: 3400, icon: 'VI', gradient: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', color: '#302B63', glowColor: 'rgba(48, 43, 99, 0.7)' },

  // =========================================================================
  // 圣斗士星矢 · 黄金十二宫殿堂（按经典战斗力从低到高排）
  // =========================================================================
  { id: 'gold_01_pisces', tier: 'gold_saint', palaceNo: 1, saintTitle: '双鱼座 · 阿布罗狄', name: '黄金十二宫 · 双鱼阿布罗狄', nameEl: 'Ιχθύες · Αφροδίτη', range: '3,401 - 3,900 XP', minPoints: 3401, maxPoints: 3900, icon: '♓', gradient: 'linear-gradient(135deg, #b8860b, #f5af19)', color: '#D97706', glowColor: 'rgba(245, 175, 25, 0.65)', badgeUrl: '/images/ranks/gold_01_pisces.png', imageUrl: '/images/ranks/gold_01_pisces.png' },
  { id: 'gold_02_cancer', tier: 'gold_saint', palaceNo: 2, saintTitle: '巨蟹座 · 迪斯马斯克', name: '黄金十二宫 · 巨蟹迪斯马斯克', nameEl: 'Καρκίνος · Ντέθμασκ', range: '3,901 - 4,400 XP', minPoints: 3901, maxPoints: 4400, icon: '♋', gradient: 'linear-gradient(135deg, #a16207, #eab308)', color: '#CA8A04', glowColor: 'rgba(234, 179, 8, 0.65)', badgeUrl: '/images/ranks/gold_02_cancer.png', imageUrl: '/images/ranks/gold_02_cancer.png' },
  { id: 'gold_03_taurus', tier: 'gold_saint', palaceNo: 3, saintTitle: '金牛座 · 阿鲁迪巴', name: '黄金十二宫 · 金牛阿鲁迪巴', nameEl: 'Ταύρος · Αλντεμπαράν', range: '4,401 - 5,000 XP', minPoints: 4401, maxPoints: 5000, icon: '♉', gradient: 'linear-gradient(135deg, #92400e, #f59e0b)', color: '#D97706', glowColor: 'rgba(245, 158, 11, 0.65)', badgeUrl: '/images/ranks/gold_03_taurus.png', imageUrl: '/images/ranks/gold_03_taurus.png' },
  { id: 'gold_04_capricorn', tier: 'gold_saint', palaceNo: 4, saintTitle: '摩羯座 · 修罗', name: '黄金十二宫 · 摩羯修罗', nameEl: 'Αιγόκερως · Σούρα', range: '5,001 - 5,600 XP', minPoints: 5001, maxPoints: 5600, icon: '♑', gradient: 'linear-gradient(135deg, #b45309, #fbbf24)', color: '#B45309', glowColor: 'rgba(251, 191, 36, 0.7)', badgeUrl: '/images/ranks/gold_04_capricorn.png', imageUrl: '/images/ranks/gold_04_capricorn.png' },
  { id: 'gold_05_aquarius', tier: 'gold_saint', palaceNo: 5, saintTitle: '水瓶座 · 卡妙', name: '黄金十二宫 · 水瓶卡妙', nameEl: 'Υδροχόος · Κάμους', range: '5,601 - 6,300 XP', minPoints: 5601, maxPoints: 6300, icon: '♒', gradient: 'linear-gradient(135deg, #0284c7, #eab308)', color: '#0284C7', glowColor: 'rgba(2, 132, 199, 0.65)', badgeUrl: '/images/ranks/gold_05_aquarius.png', imageUrl: '/images/ranks/gold_05_aquarius.png' },
  { id: 'gold_06_scorpio', tier: 'gold_saint', palaceNo: 6, saintTitle: '天蝎座 · 米罗', name: '黄金十二宫 · 天蝎米罗', nameEl: 'Σκορπιός · Μίλο', range: '6,301 - 7,000 XP', minPoints: 6301, maxPoints: 7000, icon: '♏', gradient: 'linear-gradient(135deg, #dc2626, #f59e0b)', color: '#DC2626', glowColor: 'rgba(220, 38, 38, 0.65)', badgeUrl: '/images/ranks/gold_06_scorpio.png', imageUrl: '/images/ranks/gold_06_scorpio.png' },
  { id: 'gold_07_leo', tier: 'gold_saint', palaceNo: 7, saintTitle: '狮子座 · 艾欧里亚', name: '黄金十二宫 · 狮子艾欧里亚', nameEl: 'Λέων · Αιόλια', range: '7,001 - 7,800 XP', minPoints: 7001, maxPoints: 7800, icon: '♌', gradient: 'linear-gradient(135deg, #ea580c, #facc15)', color: '#EA580C', glowColor: 'rgba(234, 88, 12, 0.7)', badgeUrl: '/images/ranks/gold_07_leo.png', imageUrl: '/images/ranks/gold_07_leo.png' },
  { id: 'gold_08_aries', tier: 'gold_saint', palaceNo: 8, saintTitle: '白羊座 · 穆', name: '黄金十二宫 · 白羊穆', nameEl: 'Κριός · Μου', range: '7,801 - 8,600 XP', minPoints: 7801, maxPoints: 8600, icon: '♈', gradient: 'linear-gradient(135deg, #7c3aed, #f59e0b)', color: '#7C3AED', glowColor: 'rgba(124, 58, 237, 0.65)', badgeUrl: '/images/ranks/gold_08_aries.png', imageUrl: '/images/ranks/gold_08_aries.png' },
  { id: 'gold_09_sagittarius', tier: 'gold_saint', palaceNo: 9, saintTitle: '射手座 · 艾俄洛斯', name: '黄金十二宫 · 射手艾俄洛斯', nameEl: 'Τοξότης · Αίολος', range: '8,601 - 9,500 XP', minPoints: 8601, maxPoints: 9500, icon: '♐', gradient: 'linear-gradient(135deg, #d97706, #fde047)', color: '#D97706', glowColor: 'rgba(253, 224, 71, 0.75)', badgeUrl: '/images/ranks/gold_09_sagittarius.png', imageUrl: '/images/ranks/gold_09_sagittarius.png' },
  { id: 'gold_10_libra', tier: 'gold_saint', palaceNo: 10, saintTitle: '天秤座 · 童虎', name: '黄金十二宫 · 天秤童虎', nameEl: 'Ζυγός · Ντόκο', range: '9,501 - 10,500 XP', minPoints: 9501, maxPoints: 10500, icon: '♎', gradient: 'linear-gradient(135deg, #0f766e, #f59e0b)', color: '#0F766E', glowColor: 'rgba(15, 118, 110, 0.7)', badgeUrl: '/images/ranks/gold_10_libra.png', imageUrl: '/images/ranks/gold_10_libra.png' },
  { id: 'gold_11_virgo', tier: 'gold_saint', palaceNo: 11, saintTitle: '处女座 · 沙加', name: '黄金十二宫 · 处女沙加', nameEl: 'Παρθένος · Σάκα', range: '10,501 - 11,800 XP', minPoints: 10501, maxPoints: 11800, icon: '♍', gradient: 'linear-gradient(135deg, #b45309, #fef08a, #d97706)', color: '#B45309', glowColor: 'rgba(254, 240, 138, 0.85)', badgeUrl: '/images/ranks/gold_11_virgo.png', imageUrl: '/images/ranks/gold_11_virgo.png' },
  { id: 'gold_12_gemini', tier: 'gold_saint', palaceNo: 12, saintTitle: '双子座 · 撒加（圣域巅峰）', name: '黄金十二宫 · 双子撒加', nameEl: 'Δίδυμοι · Σάγκα', range: '11,801+ XP', minPoints: 11801, maxPoints: 999999, icon: '♊', gradient: 'linear-gradient(135deg, #1e1b4b, #d97706, #fde047)', color: '#F59E0B', glowColor: 'rgba(245, 158, 11, 0.9)', badgeUrl: '/images/ranks/gold_12_gemini.png', imageUrl: '/images/ranks/gold_12_gemini.png' },
];

export function getScoutLevelInfo(pts: number): LevelInfo {
  for (const lvl of SCOUT_LEVELS) {
    if (pts >= lvl.minPoints && pts <= lvl.maxPoints) return lvl;
  }
  return SCOUT_LEVELS[SCOUT_LEVELS.length - 1];
}

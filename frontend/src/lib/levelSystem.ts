export interface LevelInfo {
  name: string;
  nameEl: string;
  range: string;
  minPoints: number;
  maxPoints: number;
  icon: string;
  gradient: string;
  color: string;
  glowColor: string;
}

export const SCOUT_LEVELS: LevelInfo[] = [
  { name: '青铜 1 星', nameEl: 'Χάλκινο 1★', range: '0 - 100 XP', minPoints: 0, maxPoints: 100, icon: '🥉🌟', gradient: 'linear-gradient(135deg, #cd7f32, #8c5218)', color: '#CD7F32', glowColor: 'rgba(205, 127, 50, 0.4)' },
  { name: '白银 1 星', nameEl: 'Ασημένιο 1★', range: '101 - 200 XP', minPoints: 101, maxPoints: 200, icon: '🥈🌟', gradient: 'linear-gradient(135deg, #bdc3c7, #7f8c8d)', color: '#7F8C8D', glowColor: 'rgba(127, 140, 141, 0.4)' },
  { name: '黄金 1 星', nameEl: 'Χρυσό 1★', range: '201 - 400 XP', minPoints: 201, maxPoints: 400, icon: '🥇🌟', gradient: 'linear-gradient(135deg, #f7971e, #ffd200)', color: '#F39C12', glowColor: 'rgba(243, 156, 18, 0.45)' },
  { name: '钻石 1 星', nameEl: 'Διαμάντι 1★', range: '401 - 533 XP', minPoints: 401, maxPoints: 533, icon: '💎🌟', gradient: 'linear-gradient(135deg, #00c6ff, #0072ff)', color: '#0072FF', glowColor: 'rgba(0, 114, 255, 0.45)' },
  { name: '钻石 2 星', nameEl: 'Διαμάντι 2★', range: '534 - 666 XP', minPoints: 534, maxPoints: 666, icon: '💎🌟🌟', gradient: 'linear-gradient(135deg, #2193b0, #6dd5ed)', color: '#2193B0', glowColor: 'rgba(33, 147, 176, 0.45)' },
  { name: '钻石 3 星', nameEl: 'Διαμάντι 3★', range: '667 - 800 XP', minPoints: 667, maxPoints: 800, icon: '💎🌟🌟🌟', gradient: 'linear-gradient(135deg, #4a00e0, #8e2de2)', color: '#8E2DE2', glowColor: 'rgba(142, 45, 226, 0.5)' },
  { name: '王者 1 星', nameEl: 'Βασιλιάς 1★', range: '801 - 960 XP', minPoints: 801, maxPoints: 960, icon: '👑🌟', gradient: 'linear-gradient(135deg, #ff416c, #ff4b2b)', color: '#FF4500', glowColor: 'rgba(255, 69, 0, 0.4)' },
  { name: '王者 2 星', nameEl: 'Βασιλιάς 2★', range: '961 - 1120 XP', minPoints: 961, maxPoints: 1120, icon: '👑🌟🌟', gradient: 'linear-gradient(135deg, #f857a6, #ff5858)', color: '#FF5858', glowColor: 'rgba(248, 87, 166, 0.5)' },
  { name: '王者 3 星', nameEl: 'Βασιλιάς 3★', range: '1121 - 1280 XP', minPoints: 1121, maxPoints: 1280, icon: '👑🌟🌟🌟', gradient: 'linear-gradient(135deg, #eb3349, #f45c43)', color: '#EB3349', glowColor: 'rgba(235, 51, 73, 0.5)' },
  { name: '王者 4 星', nameEl: 'Βασιλιάς 4★', range: '1281 - 1440 XP', minPoints: 1281, maxPoints: 1440, icon: '👑🌟🌟🌟🌟', gradient: 'linear-gradient(135deg, #e65c00, #f9d423)', color: '#E65C00', glowColor: 'rgba(230, 92, 0, 0.5)' },
  { name: '王者 5 星', nameEl: 'Βασιλιάς 5★', range: '1441 - 1600 XP', minPoints: 1441, maxPoints: 1600, icon: '👑🌟🌟🌟🌟🌟', gradient: 'linear-gradient(135deg, #b20a2c, #f9d423)', color: '#B20A2C', glowColor: 'rgba(178, 10, 44, 0.6)' },
  { name: '至尊荣耀 1 星', nameEl: 'Υπέρτατη Δόξα 1★', range: '1601 - 1800 XP', minPoints: 1601, maxPoints: 1800, icon: '🔱🌟', gradient: 'linear-gradient(135deg, #f953c6, #b91d73)', color: '#F953C6', glowColor: 'rgba(249, 83, 198, 0.5)' },
  { name: '至尊荣耀 2 星', nameEl: 'Υπέρτατη Δόξα 2★', range: '1801 - 2000 XP', minPoints: 1801, maxPoints: 2000, icon: '🔱🌟🌟', gradient: 'linear-gradient(135deg, #da22ff, #9733ee)', color: '#DA22FF', glowColor: 'rgba(218, 34, 255, 0.5)' },
  { name: '至尊荣耀 3 星', nameEl: 'Υπέρτατη Δόξα 3★', range: '2001 - 2200 XP', minPoints: 2001, maxPoints: 2200, icon: '🔱🌟🌟🌟', gradient: 'linear-gradient(135deg, #7f00ff, #e100ff)', color: '#7F00FF', glowColor: 'rgba(127, 0, 255, 0.5)' },
  { name: '至尊荣耀 4 星', nameEl: 'Υπέρτατη Δόξα 4★', range: '2201 - 2400 XP', minPoints: 2201, maxPoints: 2400, icon: '🔱🌟🌟🌟🌟', gradient: 'linear-gradient(135deg, #833ab4, #fd1d1d)', color: '#FD1D1D', glowColor: 'rgba(253, 29, 29, 0.5)' },
  { name: '至尊荣耀 5 星', nameEl: 'Υπέρτατη Δόξα 5★', range: '2401 - 2600 XP', minPoints: 2401, maxPoints: 2600, icon: '🔱🌟🌟🌟🌟🌟', gradient: 'linear-gradient(135deg, #fc00ff, #00dbde)', color: '#FC00FF', glowColor: 'rgba(252, 0, 255, 0.6)' },
  { name: '至尊荣耀 6 星', nameEl: 'Υπέρτατη Δόξα 6★', range: '2601 - 2800 XP', minPoints: 2601, maxPoints: 2800, icon: '🔱🌟🌟🌟🌟🌟🌟', gradient: 'linear-gradient(135deg, #11998e, #38ef7d)', color: '#11998E', glowColor: 'rgba(17, 153, 142, 0.6)' },
  { name: '至尊荣耀 7 星', nameEl: 'Υπέρτατη Δόξα 7★', range: '2801 - 3000 XP', minPoints: 2801, maxPoints: 3000, icon: '🔱🌟🌟🌟🌟🌟🌟🌟', gradient: 'linear-gradient(135deg, #3a1c71, #d76d77, #ffaf7b)', color: '#D76D77', glowColor: 'rgba(215, 109, 119, 0.6)' },
  { name: '至尊荣耀 8 星', nameEl: 'Υπέρτατη Δόξα 8★', range: '3001 - 3200 XP', minPoints: 3001, maxPoints: 3200, icon: '🔱🌟🌟🌟🌟🌟🌟🌟🌟', gradient: 'linear-gradient(135deg, #20002c, #cbb4d4)', color: '#CBB4D4', glowColor: 'rgba(203, 180, 212, 0.6)' },
  { name: '至尊荣耀 9 星', nameEl: 'Υπέρτατη Δόξα 9★', range: '3201 - 3400 XP', minPoints: 3201, maxPoints: 3400, icon: '🔱🌟🌟🌟🌟🌟🌟🌟🌟🌟', gradient: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', color: '#302B63', glowColor: 'rgba(48, 43, 99, 0.7)' },
  { name: '至尊荣耀 10 星 · 终极星耀', nameEl: 'Υπέρτατη Δόξα 10★', range: '3401+ XP', minPoints: 3401, maxPoints: 99999, icon: '🔱🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟', gradient: 'linear-gradient(135deg, #f12711, #f5af19)', color: '#F5AF19', glowColor: 'rgba(245, 175, 25, 0.8)' },
];

export function getScoutLevelInfo(pts: number): LevelInfo {
  for (const lvl of SCOUT_LEVELS) {
    if (pts >= lvl.minPoints && pts <= lvl.maxPoints) return lvl;
  }
  return SCOUT_LEVELS[SCOUT_LEVELS.length - 1];
}

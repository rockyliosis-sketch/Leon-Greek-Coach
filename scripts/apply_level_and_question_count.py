import os
import re

file_path = "Projects/Leon-Greek-Coach/frontend/src/pages/student/StudentApp.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update LevelInfo, LEVELS, and getLevelInfo
old_level_block = """interface LevelInfo {
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
};"""

new_level_block = """interface LevelInfo {
  name: string;
  nameEl: string;
  range: string;
  minPoints: number;
  maxPoints: number;
  icon: string;
  color: string;
  gradient: string;
  glowColor: string;
}

const LEVELS: LevelInfo[] = [
  { name: "青铜级别", nameEl: "Χάλκινο", range: "0 - 50 XP", minPoints: 0, maxPoints: 50, icon: "🥉", gradient: "linear-gradient(135deg, #a77044, #cd7f32)", color: "#CD7F32", glowColor: "rgba(205, 127, 50, 0.3)" },
  { name: "白银级别", nameEl: "Ασημένιο", range: "51 - 100 XP", minPoints: 51, maxPoints: 100, icon: "🥈", gradient: "linear-gradient(135deg, #7f8c8d, #bdc3c7)", color: "#C0C0C0", glowColor: "rgba(192, 192, 192, 0.3)" },
  { name: "黄金级别", nameEl: "Χρυσό", range: "101 - 200 XP", minPoints: 101, maxPoints: 200, icon: "🥇", gradient: "linear-gradient(135deg, #d4af37, #ffd700)", color: "#FFD700", glowColor: "rgba(255, 215, 0, 0.4)" },
  { name: "铂金级别", nameEl: "Πλατινένιο", range: "201 - 400 XP", minPoints: 201, maxPoints: 400, icon: "🏆", gradient: "linear-gradient(135deg, #2b5876, #00ced1)", color: "#00CED1", glowColor: "rgba(0, 206, 209, 0.4)" },
  
  // 钻石 1-3星 (401 - 800 XP, 跨度400分, 每星约133分)
  { name: "钻石 1 星", nameEl: "Διαμάντι 1★", range: "401 - 533 XP", minPoints: 401, maxPoints: 533, icon: "💎", gradient: "linear-gradient(135deg, #00c6ff, #0072ff)", color: "#1E90FF", glowColor: "rgba(30, 144, 255, 0.4)" },
  { name: "钻石 2 星", nameEl: "Διαμάντι 2★", range: "534 - 666 XP", minPoints: 534, maxPoints: 666, icon: "💎✨", gradient: "linear-gradient(135deg, #00b4db, #0083b0)", color: "#0083B0", glowColor: "rgba(0, 180, 219, 0.5)" },
  { name: "钻石 3 星", nameEl: "Διαμάντι 3★", range: "667 - 800 XP", minPoints: 667, maxPoints: 800, icon: "🔷👑", gradient: "linear-gradient(135deg, #4a00e0, #8e2de2)", color: "#8E2DE2", glowColor: "rgba(142, 45, 226, 0.5)" },
  
  // 王者 1-5星 (801 - 1600 XP, 跨度800分, 每星160分)
  { name: "王者 1 星", nameEl: "Βασιλιάς 1★", range: "801 - 960 XP", minPoints: 801, maxPoints: 960, icon: "👑", gradient: "linear-gradient(135deg, #ff416c, #ff4b2b)", color: "#FF4500", glowColor: "rgba(255, 69, 0, 0.4)" },
  { name: "王者 2 星", nameEl: "Βασιλιάς 2★", range: "961 - 1120 XP", minPoints: 961, maxPoints: 1120, icon: "👑✨", gradient: "linear-gradient(135deg, #f857a6, #ff5858)", color: "#FF5858", glowColor: "rgba(248, 87, 166, 0.5)" },
  { name: "王者 3 星", nameEl: "Βασιλιάς 3★", range: "1121 - 1280 XP", minPoints: 1121, maxPoints: 1280, icon: "👑🔥", gradient: "linear-gradient(135deg, #eb3349, #f45c43)", color: "#EB3349", glowColor: "rgba(235, 51, 73, 0.5)" },
  { name: "王者 4 星", nameEl: "Βασιλιάς 4★", range: "1281 - 1440 XP", minPoints: 1281, maxPoints: 1440, icon: "👑⚡", gradient: "linear-gradient(135deg, #e65c00, #f9d423)", color: "#E65C00", glowColor: "rgba(230, 92, 0, 0.5)" },
  { name: "王者 5 星", nameEl: "Βασιλιάς 5★", range: "1441 - 1600 XP", minPoints: 1441, maxPoints: 1600, icon: "👑🌟", gradient: "linear-gradient(135deg, #b20a2c, #fffbd5)", color: "#B20A2C", glowColor: "rgba(178, 10, 44, 0.6)" },
  
  // 至尊荣耀 1-10星 (1601 - 3600+ XP, 每星200分)
  { name: "至尊荣耀 1 星", nameEl: "Υπέρτατη Δόξα 1★", range: "1601 - 1800 XP", minPoints: 1601, maxPoints: 1800, icon: "⚡", gradient: "linear-gradient(135deg, #f953c6, #b91d73)", color: "#F953C6", glowColor: "rgba(249, 83, 198, 0.5)" },
  { name: "至尊荣耀 2 星", nameEl: "Υπέρτατη Δόξα 2★", range: "1801 - 2000 XP", minPoints: 1801, maxPoints: 2000, icon: "⚡✨", gradient: "linear-gradient(135deg, #da22ff, #9733ee)", color: "#DA22FF", glowColor: "rgba(218, 34, 255, 0.5)" },
  { name: "至尊荣耀 3 星", nameEl: "Υπέρτατη Δόξα 3★", range: "2001 - 2200 XP", minPoints: 2001, maxPoints: 2200, icon: "⚡🔥", gradient: "linear-gradient(135deg, #7f00ff, #e100ff)", color: "#7F00FF", glowColor: "rgba(127, 0, 255, 0.5)" },
  { name: "至尊荣耀 4 星", nameEl: "Υπέρτατη Δόξα 4★", range: "2201 - 2400 XP", minPoints: 2201, maxPoints: 2400, icon: "⚡⚔️", gradient: "linear-gradient(135deg, #833ab4, #fd1d1d)", color: "#FD1D1D", glowColor: "rgba(253, 29, 29, 0.5)" },
  { name: "至尊荣耀 5 星", nameEl: "Υπέρτατη Δόξα 5★", range: "2401 - 2600 XP", minPoints: 2401, maxPoints: 2600, icon: "⚡🛡️", gradient: "linear-gradient(135deg, #fc00ff, #00dbde)", color: "#FC00FF", glowColor: "rgba(252, 0, 255, 0.6)" },
  { name: "至尊荣耀 6 星", nameEl: "Υπέρτατη Δόξα 6★", range: "2601 - 2800 XP", minPoints: 2601, maxPoints: 2800, icon: "⚡🌌", gradient: "linear-gradient(135deg, #11998e, #38ef7d)", color: "#11998E", glowColor: "rgba(17, 153, 142, 0.6)" },
  { name: "至尊荣耀 7 星", nameEl: "Υπέρτατη Δόξα 7★", range: "2801 - 3000 XP", minPoints: 2801, maxPoints: 3000, icon: "⚡🪐", gradient: "linear-gradient(135deg, #3a1c71, #d76d77, #ffaf7b)", color: "#D76D77", glowColor: "rgba(215, 109, 119, 0.6)" },
  { name: "至尊荣耀 8 星", nameEl: "Υπέρτατη Δόξα 8★", range: "3001 - 3200 XP", minPoints: 3001, maxPoints: 3200, icon: "⚡🌠", gradient: "linear-gradient(135deg, #20002c, #cbb4d4)", color: "#CBB4D4", glowColor: "rgba(203, 180, 212, 0.6)" },
  { name: "至尊荣耀 9 星", nameEl: "Υπέρτατη Δόξα 9★", range: "3201 - 3400 XP", minPoints: 3201, maxPoints: 3400, icon: "⚡🔱", gradient: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)", color: "#302B63", glowColor: "rgba(48, 43, 99, 0.7)" },
  { name: "至尊荣耀 10 星 · 终极星耀", nameEl: "Υπέρτατη Δόξα 10★ (Ultimate)", range: "3401+ XP", minPoints: 3401, maxPoints: 99999, icon: "👑⚡🌌", gradient: "linear-gradient(135deg, #f12711, #f5af19)", color: "#F5AF19", glowColor: "rgba(245, 175, 25, 0.8)" }
];

const getLevelInfo = (pts: number): LevelInfo => {
  for (const lvl of LEVELS) {
    if (pts >= lvl.minPoints && pts <= lvl.maxPoints) {
      return lvl;
    }
  }
  return LEVELS[LEVELS.length - 1];
};"""

assert old_level_block in code, "Failed to match old_level_block"
code = code.replace(old_level_block, new_level_block, 1)

# Remove the redundant second LEVELS array definition if present
old_levels_redundant = """const LEVELS = [
  { name: "青铜级别", range: "0 - 50 XP", icon: "🥉", gradient: "linear-gradient(135deg, #a77044, #cd7f32)" },
  { name: "白银级别", range: "51 - 100 XP", icon: "🥈", gradient: "linear-gradient(135deg, #7f8c8d, #bdc3c7)" },
  { name: "黄金级别", range: "101 - 200 XP", icon: "🥇", gradient: "linear-gradient(135deg, #d4af37, #ffd700)" },
  { name: "铂金级别", range: "201 - 400 XP", icon: "🏆", gradient: "linear-gradient(135deg, #2b5876, #00ced1)" },
  { name: "钻石级别", range: "401 - 800 XP", icon: "💎", gradient: "linear-gradient(135deg, #00c6ff, #0072ff)" },
  { name: "王者级别", range: "801 - 1600 XP", icon: "👑", gradient: "linear-gradient(135deg, #ff416c, #ff4b2b)" },
  { name: "至尊荣耀级", range: "1600+ XP", icon: "⚡", gradient: "linear-gradient(135deg, #f953c6, #818cf8)" }
];"""

if old_levels_redundant in code:
    code = code.replace(old_levels_redundant, "", 1)

# 2. Update glossaryReviewPool question limit to 40
old_pool_limit = """    if (pool.length < 20) {
      const fallbackWords = allMaster.filter((w: any) => w.status === 'mastered' || (w.day_assigned && w.day_assigned <= 5));
      const seed = selectedDateStr.split('-').reduce((acc, v) => acc + (parseInt(v, 10) || 0), 0);
      const shuffled = [...fallbackWords].sort((a: any, b: any) => ((a.id * 31 + seed) % 97) - ((b.id * 31 + seed) % 97));
      pool = [...pool, ...shuffled];
    }

    const seen = new Set<number>();
    const uniquePool: any[] = [];
    for (const item of pool) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        uniquePool.push(item);
        if (uniquePool.length >= 20) break;
      }
    }"""

new_pool_limit = """    if (pool.length < 40) {
      const fallbackWords = allMaster.filter((w: any) => w.status === 'mastered' || (w.day_assigned && w.day_assigned <= 5));
      const seed = selectedDateStr.split('-').reduce((acc, v) => acc + (parseInt(v, 10) || 0), 0);
      const shuffled = [...fallbackWords].sort((a: any, b: any) => ((a.id * 31 + seed) % 97) - ((b.id * 31 + seed) % 97));
      pool = [...pool, ...shuffled];
    }

    const seen = new Set<number>();
    const uniquePool: any[] = [];
    for (const item of pool) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        uniquePool.push(item);
        if (uniquePool.length >= 40) break;
      }
    }"""

assert old_pool_limit in code, "Failed to match old_pool_limit"
code = code.replace(old_pool_limit, new_pool_limit, 1)

# 3. Update dashboard card text
old_card_count = "题量：20 道词汇填空题 (智能记忆排期)"
new_card_count = "题量：40 道词汇填空题 (智能记忆排期)"
if old_card_count in code:
    code = code.replace(old_card_count, new_card_count, 1)

# 4. Update rules modal text & progress bar
old_rules_progress = """                      {score < 1600 ? (
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
                      width: `${score >= 1600 ? 100 : Math.min(100, Math.max(5, ((score - currentLevel.minPoints) / (currentLevel.maxPoints - currentLevel.minPoints)) * 100))}%`,"""

new_rules_progress = """                      {score <= currentLevel.maxPoints && currentLevel.maxPoints < 99999 ? (
                        <span style={{ display: 'block', fontSize: '11px', color: '#86868B', fontWeight: 600 }}>
                          距离升星还差 {currentLevel.maxPoints - score + 1} 分
                        </span>
                      ) : (
                        <span style={{ display: 'block', fontSize: '11px', color: '#FFD700', fontWeight: 700 }}>
                          已达终极至尊星耀段位！
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
                      width: `${currentLevel.maxPoints >= 99999 ? 100 : Math.min(100, Math.max(5, ((score - currentLevel.minPoints) / Math.max(1, currentLevel.maxPoints - currentLevel.minPoints + 1)) * 100))}%`,"""

assert old_rules_progress in code, "Failed to match old_rules_progress"
code = code.replace(old_rules_progress, new_rules_progress, 1)

# 5. Update daily modules rule description in modal
old_rule_desc = "Leon 每天把<strong>自适应特训模块</strong>下的<strong>六大类练习题</strong>（连连看、拼字、选择题、判断对错、希译中、中译希）全部做完，即可自动积 <strong>10 分</strong>！"
new_rule_desc = "Leon 每天把<strong>自适应特训模块</strong>下的<strong>七大必做特训题</strong>（连连看、拼字、选择题、判断对错、希译中、中译希、单词表复习）全部做完，即可自动积 <strong>10 分</strong>！"
if old_rule_desc in code:
    code = code.replace(old_rule_desc, new_rule_desc, 1)

old_rule_desc2 = "* 不论答题正确与否，只要完成全部六大项题库，即视作完成今日学习，即可获得积分。"
new_rule_desc2 = "* 不论答题正确与否，只要完成全部七大项题库，即视作完成今日学习，即可获得积分奖励。"
if old_rule_desc2 in code:
    code = code.replace(old_rule_desc2, new_rule_desc2, 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Successfully applied level expansion and question count increase to StudentApp.tsx!")

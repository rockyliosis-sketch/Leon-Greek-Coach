import React from 'react';
import { X, Shield, CheckCircle2, Clock } from 'lucide-react';
import { getScoutLevelInfo, RANK_STAR_URL, SCOUT_LEVELS } from '../lib/levelSystem';

interface LevelRulesModalProps {
  score: number;
  dailyRewardClaimedToday?: boolean;
  onClose: () => void;
}

export const LevelRulesModal: React.FC<LevelRulesModalProps> = ({
  score,
  dailyRewardClaimedToday = false,
  onClose,
}) => {
  const currentLevel = getScoutLevelInfo(score);
  const nextIndex = SCOUT_LEVELS.findIndex((l) => l.id === currentLevel.id) + 1;
  const nextLevel = nextIndex < SCOUT_LEVELS.length ? SCOUT_LEVELS[nextIndex] : null;
  const span = Math.max(1, currentLevel.maxPoints - currentLevel.minPoints + 1);
  const progressPct =
    currentLevel.maxPoints >= 999999
      ? 100
      : Math.min(100, Math.max(4, Math.round(((score - currentLevel.minPoints) / span) * 100)));

  const goldSaints = SCOUT_LEVELS.filter((l) => l.tier === 'gold_saint');
  const standardLevels = SCOUT_LEVELS.filter((l) => l.tier === 'standard');

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(6px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 820,
          maxHeight: '88vh',
          overflowY: 'auto',
          background: '#ffffff',
          borderRadius: 24,
          padding: 24,
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.28)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/images/ui/icon_trophy.png" alt="积分规则" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>
                积分规则 &amp; 黄金十二宫升级天梯
              </h2>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Κανόνες Πόντων &amp; Οι 12 Χρυσοί Ιππότες
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              border: 'none',
              background: '#f1f5f9',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Rank Card */}
        <div
          style={{
            padding: 18,
            borderRadius: 18,
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img
                src={currentLevel.badgeUrl}
                alt={currentLevel.name}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  objectFit: 'cover',
                  border: '2px solid #f59e0b',
                  background: '#fff',
                }}
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>当前段位</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span>{currentLevel.name}</span>
                  {currentLevel.stars && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                      {Array.from({ length: currentLevel.stars }).map((_, i) => (
                        <img key={i} src={RANK_STAR_URL} alt="" style={{ width: 15, height: 15, objectFit: 'contain' }} />
                      ))}
                    </span>
                  )}
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>({currentLevel.nameEl})</span>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0071E3' }}>{score} XP</div>
              {nextLevel && (
                <div style={{ fontSize: 12, color: '#d97706', fontWeight: 700 }}>
                  距离「{nextLevel.name}」还差 {Math.max(0, nextLevel.minPoints - score)} XP
                </div>
              )}
            </div>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                background: currentLevel.gradient,
                borderRadius: 999,
              }}
            />
          </div>
        </div>

        {/* Strict 10 XP / Day Rule */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 16,
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <img src="/images/ui/icon_bolt.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
            新版积分获取规则（严控水分，每一分都超值）
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: '#1e293b', lineHeight: 1.7 }}>
            <li>
              <strong>每日全通关统一奖励：+10 XP / 天</strong>（当天完成：3 次背单词 + 听历史故事 + 全部攻坚区块后自动发放，每天限领 1 次）。
            </li>
            <li>
              单项打卡、录生词、听故事不再重复加分，确保升级节奏扎实稳健，一路挑战圣域黄金十二宫。
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 6, listStyle: 'none', marginLeft: -18, marginTop: 4 }}>
              {dailyRewardClaimedToday ? (
                <CheckCircle2 size={15} color="#047857" />
              ) : (
                <Clock size={15} color="#d97706" />
              )}
              <span>今日奖励状态：</span>
              <strong style={{ color: dailyRewardClaimedToday ? '#047857' : '#d97706' }}>
                {dailyRewardClaimedToday ? '今日 +10 XP 已到账' : '完成今日全部任务后自动发放 +10 XP'}
              </strong>
            </li>
          </ul>
        </div>

        {/* Saint Seiya 12 Gold Saints Hall (Combat Power Order) */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <Shield size={18} color="#d97706" />
            <h3 style={{ margin: 0, fontSize: 17, color: '#92400e' }}>
              圣域殿堂 · 圣斗士星矢黄金十二宫（按经典战斗力从低到高排）
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
            {goldSaints.map((lvl) => {
              const isCurrent = lvl.id === currentLevel.id;
              const unlocked = score >= lvl.minPoints;
              return (
                <div
                  key={lvl.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 14,
                    background: isCurrent ? '#fffbeb' : unlocked ? '#fefce8' : '#f8fafc',
                    border: isCurrent
                      ? '2px solid #f59e0b'
                      : unlocked
                        ? '1px solid #fde047'
                        : '1px solid #e2e8f0',
                  }}
                >
                  <img
                    src={lvl.badgeUrl}
                    alt={lvl.saintTitle || lvl.name}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      objectFit: 'cover',
                      border: unlocked ? '2px solid #f59e0b' : '1.5px solid #cbd5e1',
                      filter: unlocked ? 'none' : 'grayscale(0.35) opacity(0.88)',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: unlocked ? '#b45309' : '#94a3b8' }}>
                      第 {lvl.palaceNo} 阶 · {lvl.range}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: unlocked ? '#0f172a' : '#64748b' }}>
                      {lvl.saintTitle}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{lvl.nameEl}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Standard Ranks — Zero Emoji, all custom sanctuary badges + rank_star.png */}
        <div>
          <h3 style={{ margin: '0 0 10px', fontSize: 15, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src="/images/ranks/rank_gold.png" alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
            圣域进阶前基础段位（0 – 3,400 XP）
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {standardLevels.map((lvl) => {
              const isCurrent = lvl.id === currentLevel.id;
              return (
                <span
                  key={lvl.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    padding: '6px 11px',
                    borderRadius: 999,
                    background: isCurrent ? lvl.gradient : '#f8fafc',
                    color: isCurrent ? '#fff' : '#334155',
                    fontWeight: isCurrent ? 800 : 600,
                    border: isCurrent ? 'none' : '1px solid #e2e8f0',
                  }}
                >
                  <img
                    src={lvl.badgeUrl}
                    alt=""
                    style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }}
                  />
                  {lvl.stars && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                      {Array.from({ length: Math.min(lvl.stars, 5) }).map((_, i) => (
                        <img key={i} src={RANK_STAR_URL} alt="" style={{ width: 12, height: 12, objectFit: 'contain' }} />
                      ))}
                      {lvl.stars > 5 && <span style={{ fontSize: 10, fontWeight: 800 }}>×{lvl.stars}</span>}
                    </span>
                  )}
                  <span>{lvl.name} ({lvl.range})</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

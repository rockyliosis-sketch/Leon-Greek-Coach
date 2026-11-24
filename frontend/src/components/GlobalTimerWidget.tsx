import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  ArrowUpRight,
  Clock,
  Minimize2,
  Maximize2,
  Pause,
  Play,
} from 'lucide-react';
import {
  getInitialLocalState,
  saveSharedState,
  subscribeToSharedState,
  type DailyMissionBlockState,
  type DailyMissionRecord,
  type SharedState,
} from '../dbService';
import {
  createDefaultMissionRecord,
  formatDurationMinSec,
  getLiveElapsedSec,
  getTodayStr,
} from '../lib/dailyMissionHelpers';

type ActiveTimerKind =
  | { kind: 'block'; id: string; label: string; elapsedSec: number; runningSinceMs?: number | null }
  | { kind: 'vocab'; slot: 'morning' | 'afternoon' | 'night'; label: string; elapsedSec: number; runningSinceMs?: number | null }
  | { kind: 'old_notes'; label: string; elapsedSec: number; runningSinceMs?: number | null };

const BLOCK_LABELS: Record<string, string> = {
  block_school: '区块一 · 学校复习与作业',
  block_web: '区块二 · 网站刷题与私教课',
  block_preview: '区块三 · 下节课深度预习',
};

const VOCAB_LABELS: Record<'morning' | 'afternoon' | 'night', string> = {
  morning: '背单词 · 第 1 次（早/午）',
  afternoon: '背单词 · 第 2 次（下午）',
  night: '背单词 · 第 3 次（睡前）',
};

export const GlobalTimerWidget: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [todayStr, setTodayStr] = useState<string>(() => getTodayStr());
  const [sharedState, setSharedState] = useState<SharedState>(() => getInitialLocalState());
  const sharedStateRef = useRef<SharedState>(sharedState);
  sharedStateRef.current = sharedState;

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [collapsed, setCollapsed] = useState(false);
  const [dockSide, setDockSide] = useState<'right' | 'left'>('right');
  // Remember last interacted timer in this tab so if user pauses from widget it stays visible in Paused state
  const [lastInteractedKey, setLastInteractedKey] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToSharedState((next) => setSharedState(next));
    return () => unsub();
  }, []);

  // Watch Greek midnight rollover & wake from sleep
  useEffect(() => {
    const checkDate = () => {
      const cur = getTodayStr();
      if (cur !== todayStr) {
        setTodayStr(cur);
        setLastInteractedKey(null);
      }
      setNowMs(Date.now());
    };
    const id = window.setInterval(checkDate, 30_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') checkDate();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', checkDate);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', checkDate);
    };
  }, [todayStr]);

  const todayMission: DailyMissionRecord = useMemo(() => {
    return sharedState.daily_missions?.[todayStr] || createDefaultMissionRecord(todayStr);
  }, [sharedState.daily_missions, todayStr]);

  // Collect all currently running timers + paused in-progress timers
  const { primaryTimer, secondaryRunning } = useMemo<{
    primaryTimer: ActiveTimerKind | null;
    secondaryRunning: ActiveTimerKind | null;
  }>(() => {
    const running: ActiveTimerKind[] = [];
    const paused: ActiveTimerKind[] = [];

    // 1. Blocks
    for (const [id, st] of Object.entries(todayMission.blocks || {})) {
      if (!st) continue;
      const item: ActiveTimerKind = {
        kind: 'block',
        id,
        label: BLOCK_LABELS[id] || '学习区块',
        elapsedSec: st.elapsedSec || 0,
        runningSinceMs: st.runningSinceMs,
      };
      if (st.runningSinceMs) {
        running.push(item);
      } else if (st.status === 'in_progress' && (st.elapsedSec || 0) > 0) {
        paused.push(item);
      }
    }

    // 2. Vocab 3x slots
    const vt = todayMission.vocabTimers;
    if (vt) {
      (['morning', 'afternoon', 'night'] as const).forEach((slot) => {
        const s = vt[slot];
        if (!s) return;
        const item: ActiveTimerKind = {
          kind: 'vocab',
          slot,
          label: VOCAB_LABELS[slot],
          elapsedSec: s.elapsedSec || 0,
          runningSinceMs: s.runningSinceMs,
        };
        if (s.runningSinceMs) {
          running.push(item);
        } else if (!s.completed && (s.elapsedSec || 0) > 0) {
          paused.push(item);
        }
      });
    }

    // 3. Old notes 1/3 review timer
    const ot = todayMission.oldNotesTimer;
    if (ot) {
      const item: ActiveTimerKind = {
        kind: 'old_notes',
        label: '区块三 · 旧笔记规律复习',
        elapsedSec: ot.elapsedSec || 0,
        runningSinceMs: ot.runningSinceMs,
      };
      if (ot.runningSinceMs) {
        running.push(item);
      } else if ((ot.elapsedSec || 0) > 0 && lastInteractedKey === 'old_notes') {
        paused.push(item);
      }
    }

    if (running.length > 0) {
      return {
        primaryTimer: running[0],
        secondaryRunning: running[1] || null,
      };
    }

    // Prefer the timer user just paused in this tab
    if (lastInteractedKey) {
      const matched = paused.find((p) => {
        if (p.kind === 'block') return `block:${p.id}` === lastInteractedKey;
        if (p.kind === 'vocab') return `vocab:${p.slot}` === lastInteractedKey;
        return lastInteractedKey === 'old_notes';
      });
      if (matched) return { primaryTimer: matched, secondaryRunning: null };
    }

    if (paused.length > 0) {
      return { primaryTimer: paused[0], secondaryRunning: null };
    }

    return { primaryTimer: null, secondaryRunning: null };
  }, [todayMission, lastInteractedKey]);

  const isRunning = Boolean(primaryTimer?.runningSinceMs);

  // Tick every 1s ONLY while running
  useEffect(() => {
    if (!isRunning && !secondaryRunning) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isRunning, secondaryRunning]);

  // Hide on admin pages or when there is no active/paused timer at all
  if (location.pathname.startsWith('/admin') || !primaryTimer) {
    return null;
  }

  const liveSec = getLiveElapsedSec(
    primaryTimer.elapsedSec,
    primaryTimer.runningSinceMs,
    nowMs
  );
  const secondaryLiveSec = secondaryRunning
    ? getLiveElapsedSec(secondaryRunning.elapsedSec, secondaryRunning.runningSinceMs, nowMs)
    : 0;

  const updateMission = (updater: (prev: DailyMissionRecord) => DailyMissionRecord) => {
    const latest = sharedStateRef.current;
    const prevRec = latest.daily_missions?.[todayStr] || createDefaultMissionRecord(todayStr);
    const nextRec = updater(prevRec);
    const nextAll = {
      ...(latest.daily_missions || {}),
      [todayStr]: nextRec,
    };
    const nextState: SharedState = { ...latest, daily_missions: nextAll };
    sharedStateRef.current = nextState;
    setSharedState(nextState);
    saveSharedState({ daily_missions: nextAll });
  };

  const handleTogglePrimary = () => {
    const now = Date.now();
    setNowMs(now);

    if (primaryTimer.kind === 'block') {
      const blockId = primaryTimer.id;
      setLastInteractedKey(`block:${blockId}`);
      updateMission((prev) => {
        const nextBlocks: Record<string, DailyMissionBlockState> = { ...(prev.blocks || {}) };
        const cur = nextBlocks[blockId];
        if (!cur) return prev;
        if (cur.runningSinceMs) {
          nextBlocks[blockId] = {
            ...cur,
            elapsedSec: getLiveElapsedSec(cur.elapsedSec, cur.runningSinceMs, now),
            runningSinceMs: null,
          };
        } else {
          Object.keys(nextBlocks).forEach((k) => {
            const b = nextBlocks[k];
            if (k !== blockId && b?.runningSinceMs) {
              nextBlocks[k] = {
                ...b,
                elapsedSec: getLiveElapsedSec(b.elapsedSec, b.runningSinceMs, now),
                runningSinceMs: null,
              };
            }
          });
          nextBlocks[blockId] = {
            ...cur,
            status: cur.status === 'idle' ? 'in_progress' : cur.status,
            runningSinceMs: now,
          };
        }
        return { ...prev, blocks: nextBlocks };
      });
    } else if (primaryTimer.kind === 'vocab') {
      const slot = primaryTimer.slot;
      setLastInteractedKey(`vocab:${slot}`);
      updateMission((prev) => {
        const prevTimers = prev.vocabTimers || {
          morning: { elapsedSec: 0, runningSinceMs: null, completed: Boolean(prev.vocabChecks?.morning) },
          afternoon: { elapsedSec: 0, runningSinceMs: null, completed: Boolean(prev.vocabChecks?.afternoon) },
          night: { elapsedSec: 0, runningSinceMs: null, completed: Boolean(prev.vocabChecks?.night) },
        };
        const cur = prevTimers[slot];
        const nextTimers = { ...prevTimers };
        if (cur.runningSinceMs) {
          nextTimers[slot] = {
            ...cur,
            elapsedSec: getLiveElapsedSec(cur.elapsedSec, cur.runningSinceMs, now),
            runningSinceMs: null,
          };
        } else {
          (['morning', 'afternoon', 'night'] as const).forEach((k) => {
            const s = nextTimers[k];
            if (k !== slot && s?.runningSinceMs) {
              nextTimers[k] = {
                ...s,
                elapsedSec: getLiveElapsedSec(s.elapsedSec, s.runningSinceMs, now),
                runningSinceMs: null,
              };
            }
          });
          nextTimers[slot] = { ...cur, runningSinceMs: now };
        }
        return { ...prev, vocabTimers: nextTimers };
      });
    } else {
      setLastInteractedKey('old_notes');
      updateMission((prev) => {
        const cur = prev.oldNotesTimer || { elapsedSec: 0, runningSinceMs: null };
        if (cur.runningSinceMs) {
          return {
            ...prev,
            oldNotesTimer: {
              elapsedSec: getLiveElapsedSec(cur.elapsedSec, cur.runningSinceMs, now),
              runningSinceMs: null,
            },
          };
        }
        return {
          ...prev,
          oldNotesTimer: { elapsedSec: cur.elapsedSec || 0, runningSinceMs: now },
        };
      });
    }
  };

  const handleGoToMission = () => {
    if (primaryTimer.kind === 'block') {
      try {
        sessionStorage.setItem(`leon_active_wizard_${todayStr}`, primaryTimer.id);
      } catch {}
    }
    navigate('/');
  };

  const isOnHome = location.pathname === '/' || location.pathname === '/mission';

  const posStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 'max(18px, env(safe-area-inset-bottom))',
    ...(dockSide === 'right' ? { right: 18 } : { left: 18 }),
    zIndex: 950,
    fontFamily: 'inherit',
  };

  // Collapsed compact pill (always clearly shows live ticking status!)
  if (collapsed) {
    return (
      <div style={posStyle}>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 999,
            border: isRunning ? '2px solid #2563eb' : '2px solid #f59e0b',
            background: isRunning
              ? 'rgba(15, 23, 42, 0.94)'
              : 'rgba(255, 251, 235, 0.96)',
            color: isRunning ? '#ffffff' : '#92400e',
            boxShadow: '0 10px 28px rgba(15, 23, 42, 0.24)',
            backdropFilter: 'blur(12px)',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: 15,
            fontVariantNumeric: 'tabular-nums',
          }}
          title="展开悬浮计时钟表"
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: isRunning ? '#22c55e' : '#f59e0b',
              boxShadow: isRunning ? '0 0 0 4px rgba(34, 197, 94, 0.28)' : 'none',
              flexShrink: 0,
            }}
          />
          <Clock size={15} />
          <span>{formatDurationMinSec(liveSec)}</span>
          <span style={{ fontSize: 11, opacity: 0.85 }}>
            {isRunning ? '计时中' : '已暂停'}
          </span>
          <Maximize2 size={13} style={{ opacity: 0.75 }} />
        </button>
      </div>
    );
  }

  return (
    <div style={posStyle}>
      <div
        style={{
          width: 282,
          borderRadius: 18,
          background: isRunning
            ? 'rgba(15, 23, 42, 0.95)'
            : 'rgba(255, 255, 255, 0.96)',
          color: isRunning ? '#f8fafc' : '#0f172a',
          border: isRunning ? '2px solid #3b82f6' : '2px solid #f59e0b',
          boxShadow: '0 14px 36px rgba(15, 23, 42, 0.26)',
          backdropFilter: 'blur(14px)',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* Top bar: live status dot + label + dock switch + collapse */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: isRunning ? '#22c55e' : '#f59e0b',
                boxShadow: isRunning ? '0 0 0 4px rgba(34, 197, 94, 0.28)' : 'none',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                color: isRunning ? '#86efac' : '#d97706',
                whiteSpace: 'nowrap',
              }}
            >
              {isRunning ? '正在计时' : '已暂停'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              onClick={() => setDockSide((s) => (s === 'right' ? 'left' : 'right'))}
              style={{
                border: 'none',
                background: isRunning ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
                color: isRunning ? '#cbd5e1' : '#475569',
                borderRadius: 8,
                width: 26,
                height: 26,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title={dockSide === 'right' ? '移到左下角' : '移到右下角'}
            >
              <ArrowLeftRight size={13} />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              style={{
                border: 'none',
                background: isRunning ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
                color: isRunning ? '#cbd5e1' : '#475569',
                borderRadius: 8,
                width: 26,
                height: 26,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="收起为迷你挂件"
            >
              <Minimize2 size={13} />
            </button>
          </div>
        </div>

        {/* Task name + big clock */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: isRunning ? '#cbd5e1' : '#475569',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {primaryTimer.label}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.02em',
                lineHeight: 1.1,
                marginTop: 2,
                color: isRunning ? '#ffffff' : '#0f172a',
              }}
            >
              {formatDurationMinSec(liveSec)}
            </div>
          </div>

          <button
            type="button"
            onClick={handleTogglePrimary}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '10px 14px',
              borderRadius: 12,
              border: 'none',
              background: isRunning ? '#f59e0b' : '#2563eb',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 13.5,
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
            }}
          >
            {isRunning ? <Pause size={15} /> : <Play size={15} />}
            {isRunning ? '暂停' : '继续'}
          </button>
        </div>

        {/* Optional secondary running timer indicator */}
        {secondaryRunning && (
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: '#93c5fd',
              background: 'rgba(37, 99, 235, 0.22)',
              padding: '5px 8px',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span>同时计时：{secondaryRunning.label}</span>
            <span>{formatDurationMinSec(secondaryLiveSec)}</span>
          </div>
        )}

        {/* Quick jump back to Mission Hall when on /practice or /history */}
        {!isOnHome && (
          <button
            type="button"
            onClick={handleGoToMission}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: '7px 10px',
              borderRadius: 10,
              border: isRunning ? '1px solid rgba(148, 163, 184, 0.3)' : '1px solid #cbd5e1',
              background: isRunning ? 'rgba(255, 255, 255, 0.08)' : '#f8fafc',
              color: isRunning ? '#e2e8f0' : '#1e293b',
              fontWeight: 700,
              fontSize: 12.5,
              cursor: 'pointer',
            }}
          >
            <ArrowUpRight size={14} />
            回到今日通关台继续任务
          </button>
        )}
      </div>
    </div>
  );
};

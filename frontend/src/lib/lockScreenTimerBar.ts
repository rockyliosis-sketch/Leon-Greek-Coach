/**
 * iPad / 移动端锁屏「正在计时」系统级通知条引擎
 *
 * 原理：
 * iPadOS Safari / PWA 不开放原生 ActivityKit (Live Activities)，但支持 Media Session API。
 * 通过在用户手动点击「开始计时」的手势同步栈内启动一段极轻量静音循环 WAV 音轨，并绑定
 * `navigator.mediaSession.metadata` + `pause` 动作回调，可以在 iPad 锁屏界面与控制中心
 * 显示醒目的「⏱️ 正在计时 · MM:SS」媒体通知条，且孩子在锁屏上直接点「⏸️ 暂停」即可停掉云端计时。
 *
 * 安全机制：
 * - 自动避让 `/history` 历史故事馆或其他正在播放音频的场景，绝不抢占故事播放。
 * - 计时暂停后立即停止静音音轨并清空 `mediaSession.playbackState = 'none'`，锁屏条自动消失。
 */

let silentAudioEl: HTMLAudioElement | null = null;
let silentWavUrl: string | null = null;
let lastArtworkKey = '';
let lastArtworkDataUrl = '';
let activePauseCallback: (() => void) | null = null;
let activePlayCallback: (() => void) | null = null;
let isAudioRunning = false;

/** 动态生成 1 秒 8kHz 单声道纯静音 WAV（约 16KB），零网络请求、零噪音 */
function getSilentWavUrl(): string {
  if (silentWavUrl) return silentWavUrl;
  const sampleRate = 8000;
  const numSamples = sampleRate; // 1 second
  const dataSize = numSamples * 2; // 16-bit PCM
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  // PCM samples default to 0 (pure silence)

  const blob = new Blob([buffer], { type: 'audio/wav' });
  silentWavUrl = URL.createObjectURL(blob);
  return silentWavUrl;
}

function getOrCreateSilentAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
  if (!silentAudioEl) {
    const audio = new Audio(getSilentWavUrl());
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0.01;
    (audio as any).playsInline = true;
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('data-leon-timer-keepalive', '1');
    silentAudioEl = audio;
  }
  return silentAudioEl;
}

/** 检测当前页面是否有其他真实音频（如历史故事馆、单词点读）正在播放 */
export function hasOtherMediaPlaying(): boolean {
  if (typeof document === 'undefined') return false;
  if (window.location.pathname.startsWith('/history')) return true;
  const audios = document.querySelectorAll('audio, video');
  for (let i = 0; i < audios.length; i++) {
    const el = audios[i] as HTMLMediaElement;
    if (el.getAttribute('data-leon-timer-keepalive') === '1') continue;
    if (!el.paused && !el.ended && el.readyState > 0) return true;
  }
  return false;
}

/** 用 Canvas 生成高对比度深蓝锁屏计时封面图（把当前 MM:SS 画上去，锁屏一眼看清） */
function renderTimerArtwork(timeText: string, shortTag: string): string {
  const key = `${timeText}|${shortTag}`;
  if (key === lastArtworkKey && lastArtworkDataUrl) return lastArtworkDataUrl;
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Deep slate gradient background
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle glowing ring
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.35)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(256, 256, 212, 0, Math.PI * 2);
    ctx.stroke();

    // Live green badge dot + status
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(178, 148, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#86efac';
    ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('正在计时', 202, 150);

    // Big MM:SS readout
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 124px -apple-system, BlinkMacSystemFont, ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeText, 256, 272);

    // Short task label
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(shortTag.slice(0, 14), 256, 386);

    lastArtworkKey = key;
    lastArtworkDataUrl = canvas.toDataURL('image/png');
    return lastArtworkDataUrl;
  } catch {
    return '';
  }
}

/**
 * 必须在用户手动点击「开始 / 继续计时」的同步手势中调用，才能解锁 iPadOS 锁屏媒体条。
 */
export function primeLockScreenTimerBar(): boolean {
  if (hasOtherMediaPlaying()) return false;
  const audio = getOrCreateSilentAudio();
  if (!audio) return false;
  try {
    const p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        isAudioRunning = true;
      }).catch(() => {
        isAudioRunning = false;
      });
    } else {
      isAudioRunning = true;
    }
    return true;
  } catch {
    isAudioRunning = false;
    return false;
  }
}

export function isLockScreenTimerBarActive(): boolean {
  return Boolean(silentAudioEl && !silentAudioEl.paused && isAudioRunning);
}

/**
 * 同步更新锁屏媒体通知条的标题、时间和按钮回调。
 * 当 `running` 为 false 或页面有历史故事等真实音频在播放时自动让出。
 */
export function syncLockScreenTimerBar(opts: {
  running: boolean;
  label: string;
  timeText: string;
  onPause: () => void;
  onPlay?: () => void;
}) {
  activePauseCallback = opts.onPause;
  activePlayCallback = opts.onPlay || null;

  if (!opts.running || hasOtherMediaPlaying()) {
    stopLockScreenTimerBar(!opts.running);
    return;
  }

  // 若音频已在运行，则持续刷新锁屏 MediaSession 元数据
  const audio = getOrCreateSilentAudio();
  if (audio && audio.paused) {
    // 尝试自动启动（桌面浏览器或已解锁过的标签可直接成功；iPad 若未手势解锁会静默失败，UI 会展示一键开启按钮）
    audio
      .play()
      .then(() => {
        isAudioRunning = true;
      })
      .catch(() => {
        isAudioRunning = false;
      });
  }

  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const session = navigator.mediaSession;
  try {
    const art = renderTimerArtwork(opts.timeText, opts.label);
    if (typeof MediaMetadata !== 'undefined') {
      session.metadata = new MediaMetadata({
        title: `⏱️ 正在计时 · ${opts.timeText}`,
        artist: opts.label,
        album: 'Leon 希腊语 · 点暂停可停止计时',
        artwork: art ? [{ src: art, sizes: '512x512', type: 'image/png' }] : [],
      });
    }
    session.playbackState = 'playing';

    session.setActionHandler('pause', () => {
      activePauseCallback?.();
    });
    session.setActionHandler('stop', () => {
      activePauseCallback?.();
    });
    session.setActionHandler('play', () => {
      if (activePlayCallback) {
        activePlayCallback();
      } else {
        primeLockScreenTimerBar();
      }
    });
  } catch {
    // 忽略部分旧版浏览器不支持的 MediaSession 动作
  }
}

export function stopLockScreenTimerBar(clearMediaSession = true) {
  if (silentAudioEl && !silentAudioEl.paused) {
    try {
      silentAudioEl.pause();
    } catch {}
  }
  isAudioRunning = false;

  if (clearMediaSession && !hasOtherMediaPlaying() && typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
    const session = navigator.mediaSession;
    try {
      session.playbackState = 'none';
      session.metadata = null;
      session.setActionHandler('pause', null);
      session.setActionHandler('stop', null);
      session.setActionHandler('play', null);
    } catch {}
  }
}

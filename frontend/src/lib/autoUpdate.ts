/**
 * 网站更新后, 让已经开着的页面自己换成新版 (2026-10-04)。
 *
 * 起因: v2.9.2 / v2.9.3 在 10/1 上线, 可孩子平板上的网页从没关过 ——
 * 平板锁屏再解锁、切出去再切回来, 页面都还是那一份旧代码。
 * 9/28–10/4 的做题记录每一天都只符合旧判题(写「记得」「开心的」「纸巾」照样判错),
 * 他因此又报了一批「我的答案也对」。服务器上早就修好了, 只是没送到他手上。
 *
 * 做法: 构建时生成唯一编号 __BUILD_ID__, 同一个编号写进 /version.json。
 * 页面每次回到前台、以及每 10 分钟, 去取一次 /version.json(不走缓存), 编号不同 = 有新版。
 * 什么时候真刷新, 交给页面自己判断「现在安不安全」(学生端: 回到首页时, 或离开超过 30 分钟)。
 */
declare const __BUILD_ID__: string;
declare const __APP_VERSION__: string;

export const BUILD_ID: string = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';
export const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

const CHECK_EVERY_MS = 10 * 60 * 1000;
/** 离开这么久再回来, 视为「新的一次学习」, 可以直接刷新 */
export const LONG_AWAY_MS = 30 * 60 * 1000;

/** 去服务器问一次: 有没有比我新的版本。有就返回服务器上的编号, 没有返回 null */
export const fetchNewerBuild = async (): Promise<string | null> => {
  if (import.meta.env.DEV) return null;
  try {
    const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j?.build || j.build === BUILD_ID) return null;
    // 防死循环: 为同一个新编号已经刷新过一次、回来还是旧代码(比如中间某层缓存没更新),
    // 就别再刷了, 等下一个版本或下次手动打开。
    if (safeGet(RELOAD_KEY) === j.build) return null;
    return j.build;
  } catch {
    return null;   // 断网之类, 下次再问
  }
};

const RELOAD_KEY = 'leon_reloaded_for_build';
const safeGet = (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } };

/** 真刷新。先记下「为哪个编号刷的」, 防止反复刷 */
export const reloadToBuild = (build: string) => {
  try { sessionStorage.setItem(RELOAD_KEY, build); } catch { /* 隐私模式之类, 不影响 */ }
  window.location.reload();
};

/**
 * 盯着新版本。onReady(build, hiddenForMs) 在发现新版时调用:
 * build = 服务器上的新编号; hiddenForMs = 刚从后台回来时离开了多久(定时检查时为 0)。
 * 刷不刷、什么时候刷由调用方决定。返回一个取消函数。
 */
export const watchForNewVersion = (onReady: (build: string, hiddenForMs: number) => void): (() => void) => {
  if (import.meta.env.DEV) return () => {};
  let hiddenAt = document.visibilityState === 'hidden' ? Date.now() : 0;
  let busy = false;
  const check = async (hiddenForMs: number) => {
    if (busy) return;
    busy = true;
    try {
      const build = await fetchNewerBuild();
      if (build) onReady(build, hiddenForMs);
    } finally {
      busy = false;
    }
  };
  const onVis = () => {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    const away = hiddenAt ? Date.now() - hiddenAt : 0;
    hiddenAt = 0;
    check(away);
  };
  // iPad 从「后退缓存」里恢复页面时不一定发 visibilitychange
  const onShow = (e: PageTransitionEvent) => { if (e.persisted) check(LONG_AWAY_MS); };
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('pageshow', onShow);
  const timer = setInterval(() => { if (document.visibilityState === 'visible') check(0); }, CHECK_EVERY_MS);
  check(0);
  return () => {
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('pageshow', onShow);
    clearInterval(timer);
  };
};

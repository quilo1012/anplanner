// Lightweight client-side telemetry for the mobile drawer's scroll-lock behavior.
// Records one record per drawer open/close session, kept in sessionStorage so QA
// can copy-paste them when reporting an iOS regression. No network calls.

const KEY = 'drawerTelemetry';
const MAX = 25;

export type DrawerLockMethod = 'position-fixed' | 'overflow-hidden';

export interface DrawerSession {
  ts: string;              // ISO timestamp of open
  method: DrawerLockMethod;
  durationMs: number;
  blockedTouches: number;
  blockedGestures: number;
  scrollDriftPx: number;   // scrollY before lock vs after unlock (should be 0)
  ua: string;
  iosVersion: string | null;
}

function detectIosVersion(ua: string): string | null {
  const m = ua.match(/OS (\d+)[_.](\d+)(?:[_.](\d+))? like Mac OS X/);
  if (!m) return null;
  return [m[1], m[2], m[3]].filter(Boolean).join('.');
}

export function recordDrawerSession(s: Omit<DrawerSession, 'ua' | 'iosVersion' | 'ts'> & { ts?: string }) {
  if (typeof window === 'undefined') return;
  const ua = navigator.userAgent;
  const entry: DrawerSession = {
    ts: s.ts ?? new Date().toISOString(),
    method: s.method,
    durationMs: s.durationMs,
    blockedTouches: s.blockedTouches,
    blockedGestures: s.blockedGestures,
    scrollDriftPx: s.scrollDriftPx,
    ua,
    iosVersion: detectIosVersion(ua),
  };
  try {
    const raw = sessionStorage.getItem(KEY);
    const list: DrawerSession[] = raw ? JSON.parse(raw) : [];
    list.push(entry);
    if (list.length > MAX) list.splice(0, list.length - MAX);
    sessionStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage may be unavailable (private mode); ignore */
  }
  // Always expose for in-session inspection.
  (window as any).__drawerTelemetry = (window as any).__drawerTelemetry || [];
  (window as any).__drawerTelemetry.push(entry);
}

export function readDrawerTelemetry(): DrawerSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearDrawerTelemetry() {
  try { sessionStorage.removeItem(KEY); } catch { /* noop */ }
  (window as any).__drawerTelemetry = [];
}

// DevTools helper: window.drawerTelemetry() prints the current log.
if (typeof window !== 'undefined') {
  (window as any).drawerTelemetry = () => console.table(readDrawerTelemetry());
}

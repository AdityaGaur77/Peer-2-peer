/**
 * First-party analytics: who visits, how they found the site, what they
 * look at and click. Events go to the `events` table in Supabase (only
 * admins can read it). With no Supabase configured they're kept in this
 * browser instead, so the console's Analytics tab still works locally.
 *
 * Identity: a random visitor id kept in localStorage (same person coming
 * back), and a session id that starts fresh after 30 minutes of inactivity.
 * No IP address or fingerprinting. If someone is signed in, the database
 * attaches their email itself.
 */

export type EventKind =
  | 'pageview'
  | 'click'
  | 'leave'
  | 'signin'
  | 'rsvp'
  | 'apply'
  | 'tutoring'
  | 'kudos'
  | 'request';

export interface AnalyticsEvent {
  at?: string;
  visitor_id: string;
  session_id: string;
  kind: EventKind;
  path?: string;
  label?: string;
  href?: string;
  referrer?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  landing?: string;
  device?: string;
  browser?: string;
  os?: string;
  screen?: string;
  lang?: string;
  tz?: string;
  duration_ms?: number;
  user_email?: string | null;
}

const VID = 'p2p.vid';
const SESSION = 'p2p.session';
const LOCAL_EVENTS = 'p2p.events';
const SESSION_IDLE_MS = 30 * 60_000;

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
const live = !!url && !!key;

let accessToken: string | null = null;
/** The store tells us when someone signs in, so their events carry who they are. */
export function setAnalyticsToken(token: string | null) {
  accessToken = token;
}

const clip = (s: string | null | undefined, n: number) => (s ? String(s).slice(0, n) : undefined);

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function store(kind: 'local' | 'session') {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function visitorId(): string {
  const ls = store('local');
  let v = ls?.getItem(VID);
  if (!v) {
    v = randomId();
    ls?.setItem(VID, v);
  }
  return v;
}

// ── where the visitor came from ──────────────────────────────

const SEARCH = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|baidu|yandex|brave)\./i;
const SOCIAL =
  /(^|\.)(instagram|facebook|fb|t|twitter|x|tiktok|snapchat|linkedin|reddit|youtube|discord|whatsapp|pinterest|threads)\.(com|co|me|gg|net)$/i;

function readUtm(): Record<string, string> {
  // with hash routing, tags can be before the # or inside it
  const out: Record<string, string> = {};
  const parts = [window.location.search, window.location.hash.split('?')[1] ?? ''];
  for (const part of parts) {
    const q = new URLSearchParams(part.startsWith('?') ? part.slice(1) : part);
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'ref']) {
      const v = q.get(k);
      if (v && !out[k]) out[k] = v;
    }
  }
  return out;
}

function attribution() {
  const utm = readUtm();
  let refHost = '';
  try {
    if (document.referrer) {
      const r = new URL(document.referrer);
      if (r.host !== window.location.host) refHost = r.host.replace(/^www\./, '');
    }
  } catch {
    /* unreadable referrer */
  }
  const source = utm.utm_source || utm.ref || refHost || 'direct';
  const medium =
    utm.utm_medium ||
    (refHost ? (SEARCH.test(refHost) ? 'search' : SOCIAL.test(refHost) ? 'social' : 'referral') : utm.ref ? 'link' : 'none');
  return {
    source: clip(source, 100),
    medium: clip(medium, 100),
    campaign: clip(utm.utm_campaign, 100),
    referrer: clip(document.referrer, 500),
  };
}

// ── device ───────────────────────────────────────────────────

function device() {
  const ua = navigator.userAgent;
  const w = window.screen?.width ?? window.innerWidth;
  const kind = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))
    ? 'tablet'
    : /Mobi|iPhone|Android/i.test(ua) || w < 600
      ? 'phone'
      : 'desktop';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /SamsungBrowser/.test(ua)
        ? 'Samsung'
        : /CriOS|Chrome\//.test(ua)
          ? 'Chrome'
          : /FxiOS|Firefox\//.test(ua)
            ? 'Firefox'
            : /Safari\//.test(ua)
              ? 'Safari'
              : 'Other';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /iPhone|iPad|iPod/.test(ua)
      ? 'iOS'
      : /Mac OS X/.test(ua)
        ? 'macOS'
        : /Android/.test(ua)
          ? 'Android'
          : /CrOS/.test(ua)
            ? 'ChromeOS'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'Other';
  return {
    device: kind,
    browser,
    os,
    screen: `${window.screen?.width ?? 0}x${window.screen?.height ?? 0}`,
    lang: clip(navigator.language, 20),
    tz: clip(Intl.DateTimeFormat().resolvedOptions().timeZone, 60),
  };
}

// ── session: new after 30 minutes idle, keeps its first-touch source ──

interface SessionInfo {
  id: string;
  last: number;
  landing: string;
  source?: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
}

function session(path: string): SessionInfo {
  const ss = store('session');
  const now = Date.now();
  let s: SessionInfo | null = null;
  try {
    s = JSON.parse(ss?.getItem(SESSION) ?? 'null') as SessionInfo | null;
  } catch {
    s = null;
  }
  if (!s || now - s.last > SESSION_IDLE_MS) {
    s = { id: randomId(), last: now, landing: path, ...attribution() };
  }
  s.last = now;
  ss?.setItem(SESSION, JSON.stringify(s));
  return s;
}

// ── sending ──────────────────────────────────────────────────

// what the visitor sends; the time and email are filled in by the database
const COLUMNS: Array<keyof AnalyticsEvent> = [
  'visitor_id', 'session_id', 'kind', 'path', 'label', 'href', 'referrer', 'source', 'medium',
  'campaign', 'landing', 'device', 'browser', 'os', 'screen', 'lang', 'tz', 'duration_ms',
];

let queue: AnalyticsEvent[] = [];
let timer: number | undefined;

function flush(unloading = false) {
  window.clearTimeout(timer);
  timer = undefined;
  if (queue.length === 0) return;
  const batch = queue;
  queue = [];
  if (!live) {
    const ls = store('local');
    try {
      const prev = JSON.parse(ls?.getItem(LOCAL_EVENTS) ?? '[]') as AnalyticsEvent[];
      const stamped = batch.map((e) => ({ ...e, at: new Date().toISOString() }));
      ls?.setItem(LOCAL_EVENTS, JSON.stringify([...prev, ...stamped].slice(-3000)));
    } catch {
      /* storage full or blocked: drop it */
    }
    return;
  }
  // The API takes a batch only if every row has the same fields, so fill
  // the gaps with nulls (a click has a label, a page view doesn't).
  const rows = batch.map((e) => {
    const row: Record<string, unknown> = {};
    for (const k of COLUMNS) row[k] = e[k] ?? null;
    return row;
  });
  // keepalive lets the request finish while the tab is closing
  void fetch(`${url}/rest/v1/events`, {
    method: 'POST',
    keepalive: unloading || batch.length < 20,
    headers: {
      apikey: key,
      Authorization: `Bearer ${accessToken ?? key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(rows),
  }).catch(() => {
    /* analytics must never break the site */
  });
}

export function track(kind: EventKind, extra: Partial<AnalyticsEvent> = {}) {
  if (typeof window === 'undefined') return;
  try {
    const path = clip(window.location.hash.replace(/^#/, '').split('?')[0] || '/', 300) ?? '/';
    const s = session(path);
    queue.push({
      visitor_id: visitorId(),
      session_id: s.id,
      kind,
      path,
      landing: clip(s.landing, 300),
      source: s.source,
      medium: s.medium,
      campaign: s.campaign,
      referrer: kind === 'pageview' && path === s.landing ? s.referrer : undefined,
      ...device(),
      ...extra,
    });
    if (!timer) timer = window.setTimeout(() => flush(), 4000);
  } catch {
    /* never let tracking throw */
  }
}

// ── page views, time on page, clicks ─────────────────────────

let pageStart = 0;
let pagePath = '';

/** Called on every route change. */
export function trackPageview() {
  sendLeave();
  pageStart = Date.now();
  pagePath = window.location.hash;
  track('pageview');
}

function sendLeave() {
  if (!pageStart) return;
  const ms = Math.min(Date.now() - pageStart, 86_400_000);
  if (ms > 500) track('leave', { duration_ms: ms, path: clip(pagePath.replace(/^#/, '').split('?')[0] || '/', 300) });
  pageStart = 0;
}

/** Text that describes a clicked element, without anything typed into forms. */
function describe(el: Element): { label?: string; href?: string } {
  const explicit = el.getAttribute('data-track') ?? el.getAttribute('aria-label');
  const text = (explicit ?? (el as HTMLElement).innerText ?? el.textContent ?? '').replace(/\s+/g, ' ').trim();
  let href: string | undefined;
  const raw = el.getAttribute('href');
  if (raw) {
    try {
      const u = new URL(raw, window.location.href);
      // keep where an outside link goes, not its full address (meeting links
      // and invite links carry private details)
      href =
        u.host === window.location.host
          ? u.hash.split('?')[0] || u.pathname
          : u.protocol === 'mailto:'
            ? 'mailto'
            : u.host;
    } catch {
      href = undefined;
    }
  }
  return { label: clip(text, 200), href: clip(href, 500) };
}

let started = false;

/** Turn on click and exit tracking. Safe to call more than once. */
export function startAnalytics() {
  if (started || typeof window === 'undefined') return;
  started = true;
  document.addEventListener(
    'click',
    (e) => {
      const el = (e.target as Element | null)?.closest?.('a, button, [role="button"], summary, [data-track]');
      if (!el) return;
      track('click', describe(el));
    },
    { capture: true, passive: true },
  );
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      sendLeave();
      flush(true);
    } else if (!pageStart) {
      pageStart = Date.now();
      pagePath = window.location.hash;
    }
  });
  window.addEventListener('pagehide', () => {
    sendLeave();
    flush(true);
  });
}

/** For the offline console: events saved in this browser. */
export function localEvents(): AnalyticsEvent[] {
  try {
    return JSON.parse(store('local')?.getItem(LOCAL_EVENTS) ?? '[]') as AnalyticsEvent[];
  } catch {
    return [];
  }
}

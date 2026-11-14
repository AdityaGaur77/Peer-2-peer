/**
 * First-party error reporting. Without it, a page that breaks on a
 * student's phone is invisible — nobody files a bug, and you never know why
 * the board is empty after launch night.
 *
 * Everything is scrubbed of anything personal before it leaves the
 * browser: emails become "[email]", digit runs that look like phone numbers
 * become "#", and nothing is sent with the user's session — a crash can
 * happen before sign-in. The team reads these in the console's Analytics tab.
 */

import { supabase } from './backend';

const LOCAL = 'p2p.errors';
const MAX_LOCAL = 50;
const MAX_PER_SESSION = 15;

export interface ErrorReport {
  message: string;
  stack?: string;
  path?: string;
  ua?: string;
  at?: string;
}

const clip = (s: string | null | undefined, n: number): string | undefined =>
  s ? Array.from(String(s)).slice(0, n).join('') : undefined;
export const scrub = (s: unknown): string =>
  String(s ?? '').replace(/\S+@\S+/g, '[email]').replace(/\d[\d\s()-]{2,}\d/g, '#');

let reported = 0;
const seen = new Set<string>();

function report(message: string, error?: unknown): void {
  if (typeof window === 'undefined' || reported >= MAX_PER_SESSION) return;
  try {
    const msg = clip(scrub(message), 500) || 'Unknown error';
    const key = msg;
    if (seen.has(key)) return;
    seen.add(key);
    reported += 1;

    const entry: ErrorReport = {
      message: msg,
      stack: error instanceof Error ? clip(scrub(error.stack ?? ''), 2000) : undefined,
      path: typeof window.location !== 'undefined'
        ? clip(window.location.hash.replace(/^#/, '').split('?')[0] || '/', 300)
        : undefined,
      ua: clip(scrub(navigator.userAgent), 300),
      at: new Date().toISOString(),
    };

    if (!supabase) {
      // offline mode: keep what happened in this browser for the console
      try {
        const prev = JSON.parse(window.localStorage.getItem(LOCAL) ?? '[]') as ErrorReport[];
        window.localStorage.setItem(LOCAL, JSON.stringify([...prev, entry].slice(-MAX_LOCAL)));
      } catch {
        /* storage full or blocked */
      }
      return;
    }

    const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
    const keyName = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
    void fetch(`${url}/rest/v1/errors`, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: keyName,
        Authorization: `Bearer ${keyName}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(entry),
    }).catch(() => {
      /* reporting must never break the page it reports about */
    });
  } catch {
    /* never let reporting throw */
  }
}

/** Errors saved in this browser (offline mode), newest first. */
export function localErrors(): ErrorReport[] {
  try {
    return (JSON.parse(window.localStorage.getItem(LOCAL) ?? '[]') as ErrorReport[]).reverse();
  } catch {
    return [];
  }
}

/** Turn on error capture. Safe to call once at boot. */
export function startErrorReporting(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => {
    report(e.message || 'An error occurred', e.error);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string } | string | null | undefined;
    report(
      typeof r === 'string' ? r : r?.message ? String(r.message) : 'Something failed to load',
      r instanceof Error ? r : undefined,
    );
  });
}

import type { Session } from './types';

/**
 * Meeting links are pasted in by teachers and opened by students, so only
 * accept https links to video services we recognise. That stops a typo,
 * and stops anyone pointing a class at a page that isn't a meeting.
 */
const PROVIDERS: Array<{ name: string; hosts: RegExp }> = [
  { name: 'Google Meet', hosts: /^meet\.google\.com$/ },
  { name: 'Zoom', hosts: /(^|\.)zoom\.(us|com)$/ },
  { name: 'Microsoft Teams', hosts: /^teams\.(microsoft|live)\.com$/ },
  { name: 'Jitsi', hosts: /^meet\.jit\.si$/ },
  { name: 'Discord', hosts: /^(discord\.gg|discord\.com)$/ },
];

export function meetingProvider(link: string): string | null {
  try {
    const u = new URL(link);
    if (u.protocol !== 'https:') return null;
    return PROVIDERS.find((p) => p.hosts.test(u.hostname.toLowerCase()))?.name ?? null;
  } catch {
    return null;
  }
}

/** Null when the link is fine, otherwise what to tell the teacher. */
export function meetingLinkError(link: string): string | null {
  const l = link.trim();
  if (!l) return 'Paste the meeting link.';
  if (!/^https:\/\//i.test(l)) return 'The link should start with https://';
  if (!meetingProvider(l)) {
    return 'Use a Google Meet, Zoom, Teams, Jitsi or Discord link.';
  }
  return null;
}

/** Students can join from 15 minutes before the start until it ends. */
export const JOIN_EARLY_MIN = 15;

export function joinWindow(s: Session, now = Date.now()): 'before' | 'open' | 'over' {
  const start = new Date(s.startISO).getTime();
  const end = start + s.durationMin * 60_000;
  if (now < start - JOIN_EARLY_MIN * 60_000) return 'before';
  if (now > end) return 'over';
  return 'open';
}

/** The link changed in the last few hours, which is worth shouting about. */
export function linkRecentlyUpdated(s: Session, now = Date.now()): boolean {
  if (!s.linkUpdatedISO) return false;
  return now - new Date(s.linkUpdatedISO).getTime() < 6 * 3_600_000;
}

export const DEFAULT_MIN_AGE = 13;

export function ago(iso: string, now = Date.now()): string {
  const min = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

/**
 * A free Jitsi room for a class posted without a link. The random part
 * matters: a room named only after the class title could be guessed by
 * anyone who can see the title, which is everyone.
 */
export function freshJitsiLink(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'class';
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `https://meet.jit.si/peer2peer-${slug}-${rand}`;
}

/**
 * The same local time every week. Adding 7 x 24 hours drifts by an hour
 * across a daylight-saving change; stepping the calendar date doesn't.
 */
export function weeklyStarts(firstLocal: Date, weeks: number): string[] {
  return Array.from({ length: Math.max(1, weeks) }, (_, w) => {
    const d = new Date(firstLocal);
    d.setDate(d.getDate() + 7 * w);
    return d.toISOString();
  });
}

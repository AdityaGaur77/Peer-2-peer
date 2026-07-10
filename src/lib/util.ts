import type { Session } from './types';

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

export function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

// ── dates ────────────────────────────────────────────────────

export function sessionEnd(s: Session): number {
  return new Date(s.startISO).getTime() + s.durationMin * 60_000;
}

export function isPastSession(s: Session): boolean {
  return sessionEnd(s) < Date.now();
}

export function fmtWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short' });
}

export function fmtDayNum(iso: string): string {
  return String(new Date(iso).getDate()).padStart(2, '0');
}

export function fmtMonth(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short' });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function fmtLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "Today", "Tomorrow", or "Sat, Jul 11" */
export function fmtRelativeDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const strip = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((strip(d) - strip(today)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return fmtDate(iso);
}

export function minutesToHours(min: number): string {
  const h = min / 60;
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

// ── files ────────────────────────────────────────────────────

export function downloadText(filename: string, text: string, mime = 'text/plain'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

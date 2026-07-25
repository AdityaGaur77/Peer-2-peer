import type { Level, Session, SubjectId, Tutor } from './types';

/**
 * Invite links carry a whole session inside the URL.
 *
 * Relay has no backend — every visitor gets their own copy of the board in
 * localStorage — so a session you publish is invisible to everyone else.
 * Encoding the session into the link closes that gap: you send a link, they
 * open it, the class lands on their board. No server, no accounts.
 *
 * Payload keys are single letters and the timestamp is epoch-ms, because the
 * whole thing has to survive being pasted into a text message.
 */

interface Payload {
  v: 1;
  t: string; // title
  d: string; // description
  s: SubjectId;
  l: Level;
  w: number; // start, epoch ms
  m: number; // duration minutes
  c: number; // capacity
  k: string; // room link
  n: string; // tutor name
  g: string; // tutor grade
  h: number; // tutor hue
  e: string; // tutor email
}

// ── base64url over bytes ─────────────────────────────────────

function bytesToB64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ── optional deflate (native, no dependency) ─────────────────
// Prefix marks which path was used so old links keep working.

async function squeeze(text: string): Promise<string> {
  const raw = new TextEncoder().encode(text);
  if (typeof CompressionStream === 'undefined') return `u${bytesToB64url(raw)}`;
  try {
    const cs = new CompressionStream('deflate-raw');
    const stream = new Blob([raw as BlobPart]).stream().pipeThrough(cs);
    const buf = new Uint8Array(await new Response(stream).arrayBuffer());
    return `z${bytesToB64url(buf)}`;
  } catch {
    return `u${bytesToB64url(raw)}`;
  }
}

async function unsqueeze(payload: string): Promise<string> {
  const mode = payload[0];
  const bytes = b64urlToBytes(payload.slice(1));
  if (mode === 'u') return new TextDecoder().decode(bytes);
  if (mode !== 'z') throw new Error('unknown invite format');
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(ds);
  return new Response(stream).text();
}

// ── public API ───────────────────────────────────────────────

export async function encodeInvite(session: Session, tutor: Tutor | undefined): Promise<string> {
  const p: Payload = {
    v: 1,
    t: session.title,
    d: session.description,
    s: session.subject,
    l: session.level,
    w: new Date(session.startISO).getTime(),
    m: session.durationMin,
    c: session.capacity,
    k: session.link,
    n: tutor?.name ?? 'A Relay tutor',
    g: tutor?.grade ?? 'Student',
    h: tutor?.hue ?? 200,
    e: tutor?.email ?? '',
  };
  return squeeze(JSON.stringify(p));
}

export interface DecodedInvite {
  session: Omit<Session, 'id' | 'attendees' | 'waitlist' | 'status'>;
  tutor: Omit<Tutor, 'id'>;
}

export async function decodeInvite(payload: string): Promise<DecodedInvite> {
  const p = JSON.parse(await unsqueeze(payload)) as Payload;
  if (p?.v !== 1 || !p.t || !p.w) throw new Error('not a Relay invite');
  return {
    session: {
      title: String(p.t),
      description: String(p.d ?? ''),
      subject: (p.s === 'ai' ? 'ai' : 'python') as SubjectId,
      level: (['intro', 'intermediate', 'all'] as Level[]).includes(p.l) ? p.l : 'intro',
      startISO: new Date(Number(p.w)).toISOString(),
      durationMin: Number(p.m) || 60,
      capacity: Number(p.c) || 10,
      tutorId: '', // filled in when the invite is accepted
      link: String(p.k ?? ''),
    },
    tutor: {
      name: String(p.n ?? 'A Relay tutor'),
      email: String(p.e ?? ''),
      grade: String(p.g ?? 'Student'),
      tagline: 'Joined your board through a session invite.',
      subjects: [(p.s === 'ai' ? 'ai' : 'python') as SubjectId],
      joinedISO: new Date().toISOString(),
      hue: Number(p.h) || 200,
    },
  };
}

/** Full shareable URL for a session, safe to paste anywhere. */
export async function inviteUrl(session: Session, tutor: Tutor | undefined): Promise<string> {
  const payload = await encodeInvite(session, tutor);
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/join?i=${payload}`;
}

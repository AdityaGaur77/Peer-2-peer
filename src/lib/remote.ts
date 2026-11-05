import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Application, Attendee, Certification, Course, Kudos, Profile, RelayState, Session,
  StudentRecord, SubjectId, TopicRequest, Tutor,
} from './types';

/**
 * Everything that talks to Supabase. The store calls these and keeps the
 * same RelayState shape it always had, so pages don't need to know whether
 * the data came from the database or from this browser.
 */

// ── rows as they come back from the database ─────────────────

interface TutorRow {
  id: string; name: string; grade: string; tagline: string; subjects: string[];
  joined_at: string; hue: number; courses: Course[] | null; availability: string | null;
  is_founder: boolean; active: boolean;
}
interface SessionRow {
  id: string; title: string; subject: string; level: Session['level']; description: string;
  tutor_id: string; start_at: string; duration_min: number; capacity: number; min_age: number; price: number;
  status: Session['status'];
}
interface RoomRow {
  session_id: string; link: string; meeting_id: string | null; passcode: string | null;
  updated_at: string | null;
}
interface SignupRow { session_id: string; email: string; name: string; waitlist: boolean; created_at: string }
interface CountRow {
  session_id: string; going: number; waiting: number;
  my_status: 'going' | 'waiting' | null; my_wait_pos: number | null;
}
interface AppRow {
  id: string; email: string; name: string; grade: string; subjects: string[]; why: string;
  availability: string[]; course_title: string | null; course_summary: string | null;
  times: string | null; status: Application['status']; submitted_at: string;
}
interface ProfileRow {
  email: string; name: string; age: number | null; role: 'student' | 'tutor'; blocked: boolean;
  created_at: string;
}

export interface LiveSnapshot {
  state: RelayState;
  isAdmin: boolean;
  me: ProfileRow | null;
}

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/**
 * Seats a student can't see the names behind. Each placeholder gets its own
 * email so counts that de-duplicate by email still add up.
 */
function hidden(sessionId: string, kind: string, n: number): Attendee[] {
  return Array.from({ length: Math.max(0, n) }, (_, i) => ({
    name: '',
    email: `hidden:${sessionId}:${kind}:${i}`,
  }));
}

/**
 * For the extras (kudos, requests, applications...): if one of them fails,
 * log it and carry on with an empty list rather than blanking the whole
 * board. Teachers, classes and seat counts still have to load.
 */
function soft<T>(
  q: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  what: string,
): PromiseLike<{ data: T | null; error: { message: string } | null }> {
  return q.then((r) => {
    if (r.error) {
      console.warn(`Couldn't load ${what}:`, r.error.message);
      return { data: [] as unknown as T, error: null };
    }
    return r;
  });
}

export async function fetchState(sb: SupabaseClient, myEmail: string | null): Promise<LiveSnapshot> {
  const [tutors, emails, sessions, rooms, counts, signups, apps, certs, kudos, reqs, admin, profiles, votes] =
    await Promise.all([
      sb.from('tutors').select('*'),
      soft(sb.from('tutor_emails').select('*'), 'login emails'),
      sb.from('sessions').select('*'),
      soft(sb.from('session_rooms').select('*'), 'meeting links'),
      sb.rpc('session_counts'),
      soft(sb.from('signups').select('*').order('created_at'), 'signups'),
      soft(sb.from('applications').select('*').order('submitted_at'), 'applications'),
      soft(sb.from('certifications').select('*'), 'certifications'),
      soft(sb.from('kudos').select('*').order('at', { ascending: false }), 'kudos'),
      soft(
        sb.from('requests').select('id, topic, subject, by_name, votes, at').order('at', { ascending: false }),
        'topic requests',
      ),
      sb.rpc('is_admin'),
      soft(sb.from('profiles').select('*'), 'profiles'),
      myEmail ? soft(sb.rpc('my_votes'), 'your votes') : Promise.resolve({ data: [] as string[], error: null }),
    ]);

  const isAdmin = !!must(admin);
  // who voted is private; the database only tells each person their own votes
  const myVotes = new Set((must(votes) as unknown as Array<string | { my_votes: string }>).map((v) =>
    typeof v === 'string' ? v : v.my_votes,
  ));
  const emailOf = new Map(
    (must(emails) as Array<{ tutor_id: string; email: string }>).map((e) => [e.tutor_id, e.email]),
  );
  const tutorRows = must(tutors) as TutorRow[];
  const myTutorId = myEmail
    ? [...emailOf.entries()].find(([, e]) => e === myEmail)?.[0]
    : undefined;

  const roomOf = new Map((must(rooms) as RoomRow[]).map((r) => [r.session_id, r]));
  const countOf = new Map((must(counts) as CountRow[]).map((c) => [c.session_id, c]));
  const signupRows = must(signups) as SignupRow[];

  const mapped: Session[] = (must(sessions) as SessionRow[]).map((s) => {
    const room = roomOf.get(s.id);
    const c = countOf.get(s.id);
    const rows = signupRows.filter((r) => r.session_id === s.id);
    const seesAll = isAdmin || (!!myTutorId && s.tutor_id === myTutorId);
    let attendees: Attendee[];
    let waitlist: Attendee[];
    if (seesAll) {
      attendees = rows.filter((r) => !r.waitlist).map(({ name, email }) => ({ name, email }));
      waitlist = rows.filter((r) => r.waitlist).map(({ name, email }) => ({ name, email }));
    } else {
      // A student only sees their own row, plus the counts.
      const me = myEmail ? { name: '', email: myEmail } : null;
      attendees = hidden(s.id, 'g', (c?.going ?? 0) - (c?.my_status === 'going' ? 1 : 0));
      if (me && c?.my_status === 'going') attendees.push(me);
      waitlist = hidden(s.id, 'w', (c?.waiting ?? 0) - (c?.my_status === 'waiting' ? 1 : 0));
      if (me && c?.my_status === 'waiting') waitlist.splice((c.my_wait_pos ?? 1) - 1, 0, me);
    }
    return {
      id: s.id,
      title: s.title,
      subject: s.subject as SubjectId,
      level: s.level,
      description: s.description,
      tutorId: s.tutor_id,
      startISO: s.start_at,
      durationMin: s.duration_min,
      capacity: s.capacity,
      minAge: s.min_age,
      price: s.price ?? 0,
      status: s.status,
      attendees,
      waitlist,
      // only filled in for people allowed to see it
      link: room?.link ?? '',
      meetingId: room?.meeting_id ?? undefined,
      passcode: room?.passcode ?? undefined,
      linkUpdatedISO: room?.updated_at ?? undefined,
    };
  });

  const profileRows = must(profiles) as ProfileRow[];
  const me = myEmail ? profileRows.find((p) => p.email === myEmail) ?? null : null;

  const state: RelayState = {
    tutors: tutorRows.map(
      (t): Tutor => ({
        id: t.id,
        name: t.name,
        email: emailOf.get(t.id) ?? '',
        grade: t.grade,
        tagline: t.tagline,
        subjects: t.subjects as SubjectId[],
        joinedISO: t.joined_at,
        hue: t.hue,
        courses: t.courses ?? [],
        availability: t.availability ?? undefined,
        isFounder: t.is_founder,
        active: t.active,
      }),
    ),
    sessions: mapped,
    applications: (must(apps) as AppRow[]).map(
      (a): Application => ({
        id: a.id,
        name: a.name,
        email: a.email,
        grade: a.grade,
        subjects: a.subjects as SubjectId[],
        why: a.why,
        availability: a.availability,
        courseTitle: a.course_title ?? undefined,
        courseSummary: a.course_summary ?? undefined,
        times: a.times ?? undefined,
        status: a.status,
        submittedISO: a.submitted_at,
      }),
    ),
    certifications: (
      must(certs) as Array<{ email: string; subject: string; score: number; total: number; earned_at: string }>
    ).map((c): Certification => ({
      email: c.email,
      subject: c.subject as SubjectId,
      score: c.score,
      total: c.total,
      earnedISO: c.earned_at,
    })),
    kudos: (
      must(kudos) as Array<{ id: string; tutor_id: string; from_name: string; message: string; at: string }>
    ).map((k): Kudos => ({ id: k.id, tutorId: k.tutor_id, from: k.from_name, message: k.message, atISO: k.at })),
    requests: (
      must(reqs) as Array<{
        id: string; topic: string; subject: string; by_name: string; votes: number; at: string;
      }>
    ).map((r): TopicRequest => ({
      id: r.id,
      topic: r.topic,
      subject: r.subject as TopicRequest['subject'],
      by: r.by_name,
      votes: r.votes,
      votedBy: myEmail && myVotes.has(r.id) ? [myEmail] : [],
      atISO: r.at,
    })),
    students: isAdmin
      ? profileRows.map(
          (p): StudentRecord => ({
            email: p.email,
            name: p.name,
            age: p.age ?? undefined,
            role: p.role,
            blocked: p.blocked,
            joinedISO: p.created_at,
          }),
        )
      : undefined,
  };

  return { state, isAdmin, me };
}

// ── writes ───────────────────────────────────────────────────
// Each throws with the database's message, which is written to be shown
// to people as-is ("That class is full. Join the waitlist instead.").

async function ok(p: PromiseLike<{ error: { message: string } | null }>): Promise<void> {
  const { error } = await p;
  if (error) throw new Error(error.message);
}

export const remote = {
  saveProfile: (sb: SupabaseClient, p: Profile) =>
    ok(
      sb.from('profiles').upsert(
        { email: p.email, name: p.name, age: p.age ?? null, role: p.role ?? 'student' },
        { onConflict: 'email' },
      ),
    ),

  joinClass: (sb: SupabaseClient, sessionId: string, p: Profile, waitlist = false) =>
    ok(sb.from('signups').insert({ session_id: sessionId, email: p.email, name: p.name, waitlist })),

  leaveClass: (sb: SupabaseClient, sessionId: string, email: string) =>
    ok(sb.from('signups').delete().match({ session_id: sessionId, email })),

  createSession: async (sb: SupabaseClient, s: Session) => {
    await ok(
      sb.from('sessions').insert({
        id: s.id,
        title: s.title,
        subject: s.subject,
        level: s.level,
        description: s.description,
        tutor_id: s.tutorId,
        start_at: s.startISO,
        duration_min: s.durationMin,
        capacity: s.capacity,
        min_age: s.minAge ?? 13,
        price: s.price ?? 0,
      }),
    );
    await ok(
      sb.from('session_rooms').insert({
        session_id: s.id,
        link: s.link,
        meeting_id: s.meetingId || null,
        passcode: s.passcode || null,
      }),
    );
  },

  // An upsert, so a class that somehow has no room row yet still gets one
  // instead of the change silently matching nothing.
  updateMeeting: (
    sb: SupabaseClient,
    sessionIds: string[],
    m: { link: string; meetingId?: string; passcode?: string },
  ) =>
    ok(
      sb.from('session_rooms').upsert(
        sessionIds.map((id) => ({
          session_id: id,
          link: m.link,
          meeting_id: m.meetingId || null,
          passcode: m.passcode || null,
        })),
        { onConflict: 'session_id' },
      ),
    ),

  cancelSession: (sb: SupabaseClient, id: string) =>
    ok(sb.from('sessions').update({ status: 'canceled' }).eq('id', id)),

  submitApplication: async (
    sb: SupabaseClient,
    a: Omit<Application, 'id' | 'status' | 'submittedISO'>,
    id: string,
    existingPendingId?: string,
  ) => {
    const row = {
      email: a.email,
      name: a.name,
      grade: a.grade,
      subjects: a.subjects,
      why: a.why,
      availability: a.availability,
      course_title: a.courseTitle || null,
      course_summary: a.courseSummary || null,
      times: a.times || null,
    };
    if (existingPendingId) {
      await ok(sb.from('applications').update(row).eq('id', existingPendingId));
    } else {
      await ok(sb.from('applications').insert({ ...row, id }));
    }
  },

  setApplicationStatus: (sb: SupabaseClient, id: string, status: Application['status']) =>
    ok(sb.from('applications').update({ status }).eq('id', id)),

  addTutor: async (sb: SupabaseClient, t: Tutor) => {
    await ok(
      sb.from('tutors').insert({
        id: t.id,
        name: t.name,
        grade: t.grade,
        tagline: t.tagline,
        subjects: t.subjects,
        joined_at: t.joinedISO,
        hue: t.hue,
        courses: t.courses ?? [],
        availability: t.availability ?? null,
      }),
    );
    if (t.email) await remote.setTutorEmail(sb, t.id, t.email);
  },

  updateTutor: (sb: SupabaseClient, id: string, patch: Partial<Tutor>) => {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.grade !== undefined) row.grade = patch.grade;
    if (patch.tagline !== undefined) row.tagline = patch.tagline;
    if (patch.subjects !== undefined) row.subjects = patch.subjects;
    if (patch.availability !== undefined) row.availability = patch.availability || null;
    if (patch.courses !== undefined) row.courses = patch.courses;
    if (patch.active !== undefined) row.active = patch.active;
    return ok(sb.from('tutors').update(row).eq('id', id));
  },

  setTutorEmail: async (sb: SupabaseClient, tutorId: string, email: string) => {
    const e = email.trim().toLowerCase();
    if (!e) {
      await ok(sb.from('tutor_emails').delete().eq('tutor_id', tutorId));
      return;
    }
    await ok(sb.from('tutor_emails').upsert({ tutor_id: tutorId, email: e }, { onConflict: 'tutor_id' }));
  },

  /** A teacher leaving: hidden from the site, upcoming classes canceled, history kept. */
  retireTutor: async (sb: SupabaseClient, tutorId: string) => {
    await ok(sb.from('tutors').update({ active: false }).eq('id', tutorId));
    await ok(
      sb
        .from('sessions')
        .update({ status: 'canceled' })
        .eq('tutor_id', tutorId)
        .gt('start_at', new Date().toISOString()),
    );
    await ok(sb.from('tutor_emails').delete().eq('tutor_id', tutorId));
  },

  saveCertification: (sb: SupabaseClient, c: Omit<Certification, 'earnedISO'>) =>
    ok(
      sb.from('certifications').upsert(
        { email: c.email, subject: c.subject, score: c.score, total: c.total, earned_at: new Date().toISOString() },
        { onConflict: 'email,subject' },
      ),
    ),

  addKudos: (sb: SupabaseClient, k: Kudos) =>
    ok(sb.from('kudos').insert({ id: k.id, tutor_id: k.tutorId, from_name: k.from, message: k.message })),

  addRequest: (sb: SupabaseClient, r: TopicRequest, email: string) =>
    ok(
      sb.from('requests').insert({
        id: r.id,
        topic: r.topic,
        subject: r.subject,
        by_name: r.by,
        votes: 1,
        voted_by: [email],
      }),
    ),

  voteRequest: (sb: SupabaseClient, id: string) => ok(sb.rpc('vote_request', { rid: id })),

  setBlocked: (sb: SupabaseClient, email: string, blocked: boolean) =>
    ok(sb.from('profiles').update({ blocked }).eq('email', email)),
};

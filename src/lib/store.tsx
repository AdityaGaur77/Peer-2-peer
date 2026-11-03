/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from './backend';
import { SEED_VERSION } from './config';
import type { DecodedInvite } from './invite';
import { fetchState, remote } from './remote';
import { ROSTER, ROSTER_IDS } from './roster';
import { buildSeed } from './seed';
import type {
  Application,
  Certification,
  Level,
  Profile,
  RelayState,
  Role,
  Session,
  SubjectId,
  TopicRequest,
  Tutor,
} from './types';
import { isPastSession, uid } from './util';

const DB_KEY = 'relay.db';
const PROFILE_KEY = 'relay.profile';

interface ToastItem {
  id: string;
  message: string;
}

interface StoreValue {
  db: RelayState;
  profile: Profile | null;
  toasts: ToastItem[];
  signInOpen: boolean;
  openSignIn: (after?: (p: Profile) => void) => void;
  closeSignIn: () => void;
  completeSignIn: (p: Profile) => void;
  signOut: () => void;
  requireProfile: (fn: (p: Profile) => void) => void;
  toast: (message: string) => void;

  toggleRsvp: (sessionId: string, p: Profile) => void;
  toggleWaitlist: (sessionId: string, p: Profile) => void;
  submitApplication: (a: Omit<Application, 'id' | 'status' | 'submittedISO'>) => void;
  receiveApplication: (
    a: Omit<Application, 'id' | 'status' | 'submittedISO'>,
    submittedISO: string,
  ) => 'added' | 'updated' | 'duplicate';
  saveCertification: (c: Omit<Certification, 'earnedISO'>) => void;
  addKudos: (tutorId: string, from: string, message: string) => void;
  addRequest: (topic: string, subject: TopicRequest['subject'], by: string) => void;
  voteRequest: (id: string, email: string) => void;
  approveApplication: (id: string) => void;
  declineApplication: (id: string) => void;
  createSession: (s: Omit<Session, 'id' | 'attendees' | 'waitlist' | 'status'>) => string;
  cancelSession: (id: string) => void;
  updateTutor: (
    id: string,
    patch: Partial<Pick<Tutor, 'tagline' | 'grade' | 'subjects' | 'availability'>>,
  ) => void;
  removeTutor: (id: string) => void;
  addTutor: (t: { name: string; email: string; grade: string; subjects: SubjectId[] }) => void;
  importData: (state: RelayState) => void;
  resetData: () => void;
  acceptInvite: (d: DecodedInvite) => string;
  setRole: (role: Role) => void;

  /** True when the site is running on the shared Supabase database. */
  live: boolean;
  /** Signed in with an email listed in the admins table. Always false offline. */
  isAdmin: boolean;
  refresh: () => void;
  /** Live mode: email a sign-in code. The details are saved once it's confirmed. */
  sendSignInCode: (p: Profile) => Promise<void>;
  verifySignInCode: (email: string, code: string) => Promise<void>;
  saveProfile: (p: Profile) => void;
  updateMeeting: (
    sessionId: string,
    m: { link: string; meetingId?: string; passcode?: string },
    alsoLaterWeeks: boolean,
  ) => void;
  setTutorEmail: (tutorId: string, email: string) => void;
  setStudentBlocked: (email: string, blocked: boolean) => void;
  removeFromClass: (sessionId: string, email: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

/**
 * The published roster always wins: its tutors are added to every board and
 * refreshed from source on load, so editing roster.ts and redeploying is how
 * a tutor's public profile changes. Tutors added locally are left alone.
 */
function withRoster(tutors: Tutor[]): Tutor[] {
  return [...tutors.filter((t) => !ROSTER_IDS.has(t.id)), ...ROSTER];
}

/**
 * Backfill fields added after a user's data was first saved. The roster is
 * only merged in offline; on the live database the teachers table is the
 * source of truth (seeded from the roster by supabase/seed.sql).
 */
export function normalizeState(s: RelayState, live = false): RelayState {
  return {
    ...s,
    tutors: live ? s.tutors : withRoster(s.tutors),
    sessions: s.sessions.map((x) => ({
      ...x,
      attendees: Array.isArray(x.attendees) ? x.attendees : [],
      waitlist: Array.isArray(x.waitlist) ? x.waitlist : [],
    })),
  };
}

function loadDb(): RelayState {
  if (supabase) return normalizeState(buildSeed(), true);
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { version: number; state: RelayState };
      if (parsed.version === SEED_VERSION && parsed.state?.tutors?.length) {
        return normalizeState(parsed.state);
      }
    }
  } catch {
    /* fall through to fresh seed */
  }
  return normalizeState(buildSeed());
}

const PENDING_KEY = 'relay.pendingProfile';

function loadProfile(): Profile | null {
  if (supabase) return null; // comes from the signed-in session instead
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<RelayState>(loadDb);
  const [profile, setProfile] = useState<Profile | null>(loadProfile);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [signInOpen, setSignInOpen] = useState(false);
  const pendingAction = useRef<((p: Profile) => void) | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const live = supabase !== null;
  const myEmail = useRef<string | null>(null);

  useEffect(() => {
    if (live) return;
    localStorage.setItem(DB_KEY, JSON.stringify({ version: SEED_VERSION, state: db }));
  }, [db, live]);

  useEffect(() => {
    if (live) return;
    if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(PROFILE_KEY);
  }, [profile, live]);

  const toast = useCallback((message: string) => {
    const id = uid('toast');
    setToasts((t) => [...t, { id, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  // ── live database ──────────────────────────────────────────

  const reload = useCallback(async () => {
    if (!supabase) return;
    try {
      const snap = await fetchState(supabase, myEmail.current);
      setDb(normalizeState(snap.state, true));
      setIsAdmin(snap.isAdmin);
      return snap;
    } catch (e) {
      console.error(e);
      toast("Couldn't reach the database. Check your connection.");
    }
  }, [toast]);

  /** Run a write, then pull fresh data so every screen shows the truth. */
  const sync = useCallback(
    (work: (sb: NonNullable<typeof supabase>) => Promise<unknown>) => {
      if (!supabase) return;
      work(supabase)
        .catch((e: Error) => toast(e.message || 'That didn\'t save. Try again.'))
        .finally(() => void reload());
    },
    [reload, toast],
  );

  // Who is signed in, kept in step with Supabase's session.
  useEffect(() => {
    if (!supabase) return;
    const sb = supabase;
    const adopt = async (email: string | null, meta?: Record<string, unknown>) => {
      myEmail.current = email;
      const snap = await reload();
      if (!email) {
        setProfile(null);
        return;
      }
      let me = snap?.me;
      if (!me) {
        // first sign-in: save what they typed before the code was sent
        let pending: Partial<Profile> = {};
        try {
          pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? '{}') as Partial<Profile>;
        } catch {
          /* nothing saved */
        }
        const fresh: Profile = {
          email,
          name: String(pending.name ?? meta?.name ?? email.split('@')[0]),
          age: Number(pending.age ?? meta?.age) || undefined,
          role: (pending.role ?? meta?.role ?? 'student') as Role,
        };
        try {
          await remote.saveProfile(sb, fresh);
        } catch (e) {
          toast((e as Error).message);
        }
        localStorage.removeItem(PENDING_KEY);
        setProfile(fresh);
        void reload();
        return;
      }
      setProfile({ email, name: me.name, age: me.age ?? undefined, role: me.role });
    };

    sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      void adopt(u?.email?.toLowerCase() ?? null, u?.user_metadata);
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        const u = session?.user;
        const email = u?.email?.toLowerCase() ?? null;
        if (email === myEmail.current && event !== 'SIGNED_OUT') return;
        void adopt(email, u?.user_metadata);
      }
    });

    // Hear about changed links and new signups as they happen; a slow poll
    // and a refresh on focus cover anything the live channel misses.
    let timer: number | undefined;
    const soon = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void reload(), 400);
    };
    const channel = sb
      .channel('relay-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, soon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_rooms' }, soon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signups' }, soon)
      .subscribe();
    const poll = window.setInterval(() => void reload(), 60_000);
    const onFocus = () => void reload();
    window.addEventListener('focus', onFocus);

    return () => {
      sub.subscription.unsubscribe();
      void sb.removeChannel(channel);
      window.clearInterval(poll);
      window.clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [reload, toast]);

  const sendSignInCode = useCallback(async (p: Profile) => {
    if (!supabase) return;
    localStorage.setItem(PENDING_KEY, JSON.stringify(p));
    const { error } = await supabase.auth.signInWithOtp({
      email: p.email,
      options: {
        emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
        data: { name: p.name, age: p.age, role: p.role },
      },
    });
    if (error) throw new Error(error.message);
  }, []);

  const verifySignInCode = useCallback(async (email: string, code: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    if (error) throw new Error(error.message);
  }, []);

  const saveProfile = useCallback(
    (p: Profile) => {
      setProfile(p);
      sync((sb) => remote.saveProfile(sb, p));
    },
    [sync],
  );

  const openSignIn = useCallback((after?: (p: Profile) => void) => {
    pendingAction.current = after ?? null;
    setSignInOpen(true);
  }, []);

  const closeSignIn = useCallback(() => {
    pendingAction.current = null;
    setSignInOpen(false);
  }, []);

  const completeSignIn = useCallback(
    (p: Profile) => {
      setProfile(p);
      setSignInOpen(false);
      const after = pendingAction.current;
      pendingAction.current = null;
      toast(`You're in, ${p.name.split(' ')[0]}.`);
      if (after) after(p);
    },
    [toast],
  );

  const signOut = useCallback(() => {
    setProfile(null);
    if (supabase) void supabase.auth.signOut();
    toast('Signed out.');
  }, [toast]);

  // A profile from before ages were asked has none, so it gets finished first.
  const requireProfile = useCallback(
    (fn: (p: Profile) => void) => {
      if (profile && profile.age != null) fn(profile);
      else openSignIn(fn);
    },
    [profile, openSignIn],
  );

  // NOTE: decisions + toasts happen OUTSIDE setDb updaters — updaters must
  // stay pure (StrictMode runs them twice).
  const toggleRsvp = useCallback(
    (sessionId: string, p: Profile) => {
      const session = db.sessions.find((s) => s.id === sessionId);
      if (!session) return;
      const going = session.attendees.some((a) => a.email === p.email);
      if (!going && session.attendees.length >= session.capacity) {
        toast("That one's full. You can join the waitlist instead.");
        return;
      }
      if (!going && session.minAge && (p.age ?? 0) < session.minAge) {
        toast(`This class is for ages ${session.minAge} and up.`);
        return;
      }
      const promoted = going ? session.waitlist[0] : undefined;
      setDb((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) => {
          if (s.id !== sessionId) return s;
          const isGoing = s.attendees.some((a) => a.email === p.email);
          if (!isGoing) {
            return { ...s, attendees: [...s.attendees, { name: p.name, email: p.email }] };
          }
          // leaving: the first waitlisted learner inherits the spot
          const [next, ...rest] = s.waitlist;
          return {
            ...s,
            attendees: next
              ? [...s.attendees.filter((a) => a.email !== p.email), next]
              : s.attendees.filter((a) => a.email !== p.email),
            waitlist: next ? rest : s.waitlist,
          };
        }),
      }));
      toast(
        going
          ? promoted?.name
            ? `Spot released. ${promoted.name.split(' ')[0]} moves up from the waitlist.`
            : 'Spot released.'
          : `You're going: ${session.title}`,
      );
      sync((sb) =>
        going ? remote.leaveClass(sb, sessionId, p.email) : remote.joinClass(sb, sessionId, p),
      );
    },
    [db.sessions, toast, sync],
  );

  const toggleWaitlist = useCallback(
    (sessionId: string, p: Profile) => {
      const session = db.sessions.find((s) => s.id === sessionId);
      if (!session) return;
      if (session.attendees.some((a) => a.email === p.email)) return;
      const on = session.waitlist.some((a) => a.email === p.email);
      if (!on && session.minAge && (p.age ?? 0) < session.minAge) {
        toast(`This class is for ages ${session.minAge} and up.`);
        return;
      }
      setDb((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.id !== sessionId
            ? s
            : {
                ...s,
                waitlist: s.waitlist.some((a) => a.email === p.email)
                  ? s.waitlist.filter((a) => a.email !== p.email)
                  : [...s.waitlist, { name: p.name, email: p.email }],
              },
        ),
      }));
      toast(
        on
          ? 'Off the waitlist.'
          : `You're #${session.waitlist.length + 1} on the waitlist. Spots do open up.`,
      );
      sync((sb) =>
        on ? remote.leaveClass(sb, sessionId, p.email) : remote.joinClass(sb, sessionId, p, true),
      );
    },
    [db.sessions, toast, sync],
  );

  const submitApplication = useCallback(
    (a: Omit<Application, 'id' | 'status' | 'submittedISO'>) => {
      const id = uid('app');
      const pending = db.applications.find(
        (x) => x.email.toLowerCase() === a.email.toLowerCase() && x.status === 'pending',
      );
      sync((sb) => remote.submitApplication(sb, a, id, pending?.id));
      setDb((prev) => ({
        ...prev,
        applications: [
          ...prev.applications.filter((x) => x.email !== a.email),
          { ...a, id, status: 'pending', submittedISO: new Date().toISOString() },
        ],
      }));
      toast('Application sent.');
    },
    [db.applications, toast, sync],
  );

  /** An application that arrived as a link from someone else's browser. */
  const receiveApplication = useCallback(
    (a: Omit<Application, 'id' | 'status' | 'submittedISO'>, submittedISO: string) => {
      const prior = db.applications.find((x) => x.email.toLowerCase() === a.email.toLowerCase());
      if (prior?.submittedISO === submittedISO) return 'duplicate' as const;
      setDb((prev) => ({
        ...prev,
        applications: [
          ...prev.applications.filter((x) => x.email.toLowerCase() !== a.email.toLowerCase()),
          { ...a, id: uid('app'), status: 'pending', submittedISO },
        ],
      }));
      return prior ? ('updated' as const) : ('added' as const);
    },
    [db.applications],
  );

  const saveCertification = useCallback((c: Omit<Certification, 'earnedISO'>) => {
    sync((sb) => remote.saveCertification(sb, c));
    setDb((prev) => ({
      ...prev,
      certifications: [
        ...prev.certifications.filter((x) => !(x.email === c.email && x.subject === c.subject)),
        { ...c, earnedISO: new Date().toISOString() },
      ],
    }));
  }, [sync]);

  const addKudos = useCallback(
    (tutorId: string, from: string, message: string) => {
      const k = { id: uid('kudos'), tutorId, from, message, atISO: new Date().toISOString() };
      setDb((prev) => ({ ...prev, kudos: [k, ...prev.kudos] }));
      sync((sb) => remote.addKudos(sb, k));
      toast("Sent. That will make their day.");
    },
    [toast, sync],
  );

  const addRequest = useCallback(
    (topic: string, subject: TopicRequest['subject'], by: string) => {
      const r: TopicRequest = {
        id: uid('req'),
        topic,
        subject,
        by,
        votes: 1,
        votedBy: myEmail.current ? [myEmail.current] : [],
        atISO: new Date().toISOString(),
      };
      setDb((prev) => ({ ...prev, requests: [r, ...prev.requests] }));
      sync((sb) => remote.addRequest(sb, r, myEmail.current ?? ''));
      toast('Requested. Tutors build sessions from this list.');
    },
    [toast, sync],
  );

  const voteRequest = useCallback(
    (id: string, email: string) => {
      const req = db.requests.find((r) => r.id === id);
      if (!req) return;
      if (req.votedBy.includes(email)) {
        toast("You already +1'd that one.");
        return;
      }
      setDb((prev) => ({
        ...prev,
        requests: prev.requests.map((r) =>
          r.id === id && !r.votedBy.includes(email)
            ? { ...r, votes: r.votes + 1, votedBy: [...r.votedBy, email] }
            : r,
        ),
      }));
      sync((sb) => remote.voteRequest(sb, id));
    },
    [db.requests, toast, sync],
  );

  const approveApplication = useCallback(
    (id: string) => {
      const app = db.applications.find((a) => a.id === id);
      if (!app) return;
      const tutor: Tutor = {
        id: uid('tutor'),
        name: app.name,
        email: app.email,
        grade: app.grade,
        tagline: 'New tutor — grab a spot in their first session and say hi.',
        subjects: app.subjects,
        joinedISO: new Date().toISOString(),
        hue: Math.floor(Math.random() * 360),
        availability: app.times || app.availability.join(', ') || undefined,
        courses: app.courseTitle
          ? [{ title: app.courseTitle, subject: app.subjects[0], summary: app.courseSummary ?? '' }]
          : undefined,
      };
      setDb((prev) => ({
        ...prev,
        tutors: prev.tutors.some((t) => t.email === tutor.email)
          ? prev.tutors
          : [...prev.tutors, tutor],
        applications: prev.applications.map((a) =>
          a.id === id ? { ...a, status: 'approved' as const } : a,
        ),
      }));
      const exists = db.tutors.some((t) => t.email.toLowerCase() === app.email.toLowerCase());
      sync(async (sb) => {
        if (!exists) await remote.addTutor(sb, tutor);
        await remote.setApplicationStatus(sb, id, 'approved');
      });
      toast("Approved. They are a tutor now.");
    },
    [db.applications, db.tutors, toast, sync],
  );

  const declineApplication = useCallback((id: string) => {
    sync((sb) => remote.setApplicationStatus(sb, id, 'declined'));
    setDb((prev) => ({
      ...prev,
      applications: prev.applications.map((a) =>
        a.id === id ? { ...a, status: 'declined' as const } : a,
      ),
    }));
  }, [sync]);

  const createSession = useCallback(
    (s: Omit<Session, 'id' | 'attendees' | 'waitlist' | 'status'>) => {
      const id = uid('session');
      const full: Session = { ...s, id, attendees: [], waitlist: [], status: 'scheduled' };
      setDb((prev) => ({ ...prev, sessions: [...prev.sessions, full] }));
      sync((sb) => remote.createSession(sb, full));
      toast("Published. It is on the board.");
      return id;
    },
    [toast, sync],
  );

  const cancelSession = useCallback(
    (id: string) => {
      setDb((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) => (s.id === id ? { ...s, status: 'canceled' as const } : s)),
      }));
      sync((sb) => remote.cancelSession(sb, id));
      toast('Session canceled.');
    },
    [toast, sync],
  );

  const updateTutor = useCallback(
    (id: string, patch: Partial<Pick<Tutor, 'tagline' | 'grade' | 'subjects' | 'availability'>>) => {
      setDb((prev) => ({
        ...prev,
        tutors: prev.tutors.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
      sync((sb) => remote.updateTutor(sb, id, patch));
      toast('Tutor updated.');
    },
    [toast, sync],
  );

  /** Put a friend straight on the crew, no application round-trip. */
  const addTutor = useCallback(
    (t: { name: string; email: string; grade: string; subjects: SubjectId[] }) => {
      const email = t.email.trim().toLowerCase();
      if (db.tutors.some((x) => x.email.toLowerCase() === email)) {
        toast('Someone already uses that email.');
        return;
      }
      const tutor: Tutor = {
        id: uid('tutor'),
        name: t.name.trim(),
        email,
        grade: t.grade.trim() || 'Student',
        tagline: 'New tutor. Come to their first session and say hello.',
        subjects: t.subjects,
        joinedISO: new Date().toISOString(),
        hue: Math.floor(Math.random() * 360),
      };
      setDb((prev) =>
        prev.tutors.some((x) => x.email.toLowerCase() === email)
          ? prev
          : { ...prev, tutors: [...prev.tutors, tutor] },
      );
      sync((sb) => remote.addTutor(sb, tutor));
      toast(`${t.name.trim().split(' ')[0]} is on the crew.`);
    },
    [db.tutors, toast, sync],
  );

  const removeTutor = useCallback(
    (id: string) => {
      const tutor = db.tutors.find((t) => t.id === id);
      if (!tutor) return;
      if (supabase) {
        sync((sb) => remote.retireTutor(sb, id));
        toast(`${tutor.name} removed. Their past classes and hours are kept.`);
        return;
      }
      setDb((prev) => ({
        ...prev,
        tutors: prev.tutors.filter((t) => t.id !== id),
        // their upcoming sessions come off the board; the past log stays
        sessions: prev.sessions.map((s) =>
          s.tutorId === id && !isPastSession(s) && s.status === 'scheduled'
            ? { ...s, status: 'canceled' as const }
            : s,
        ),
        kudos: prev.kudos.filter((k) => k.tutorId !== id),
        certifications: prev.certifications.filter(
          (c) => c.email.toLowerCase() !== tutor.email.toLowerCase(),
        ),
      }));
      toast(`${tutor.name} removed from the crew.`);
    },
    [db.tutors, toast, sync],
  );

  const importData = useCallback(
    (state: RelayState) => {
      if (supabase) {
        toast('Import is for the offline version. The live site keeps its data in Supabase.');
        return;
      }
      setDb(normalizeState(state));
      toast('Imported.');
    },
    [toast],
  );

  const resetData = useCallback(() => {
    if (supabase) {
      toast('Clearing is for the offline version. Delete rows in Supabase instead.');
      return;
    }
    setDb(normalizeState(buildSeed()));
    toast('Board cleared.');
  }, [toast]);

  /**
   * Take a session out of an invite link and put it on this board. The tutor
   * comes along so their name and avatar render; matching is by email so the
   * same tutor's second invite doesn't create a duplicate.
   */
  const acceptInvite = useCallback(
    (d: DecodedInvite) => {
      // the live board already has every class; old invite links just land there
      if (supabase) return '';
      const newId = uid('session');
      setDb((prev) => {
        const existing = d.tutor.email
          ? prev.tutors.find((t) => t.email.toLowerCase() === d.tutor.email.toLowerCase())
          : undefined;
        const tutorId = existing?.id ?? uid('tutor');
        const tutors = existing ? prev.tutors : [...prev.tutors, { ...d.tutor, id: tutorId }];

        // same class arriving twice (forwarded link) — don't double it up
        const dupe = prev.sessions.find(
          (s) => s.title === d.session.title && s.startISO === d.session.startISO,
        );
        if (dupe) return { ...prev, tutors };

        return {
          ...prev,
          tutors,
          sessions: [
            ...prev.sessions,
            { ...d.session, tutorId, id: newId, attendees: [], waitlist: [], status: 'scheduled' },
          ],
        };
      });
      return newId;
    },
    [],
  );

  /** Students and tutors see a slightly different site; this is the switch. */
  const setRole = useCallback(
    (role: Role) => {
      setProfile((p) => (p ? { ...p, role } : p));
      if (profile) sync((sb) => remote.saveProfile(sb, { ...profile, role }));
      toast(role === 'tutor' ? 'Switched to the tutor view.' : 'Switched to the student view.');
    },
    [toast, profile, sync],
  );

  /**
   * A teacher swapping the meeting link, e.g. after a free plan's time limit
   * cut the call. Students in the class see it marked as updated.
   */
  const updateMeeting = useCallback(
    (
      sessionId: string,
      m: { link: string; meetingId?: string; passcode?: string },
      alsoLaterWeeks: boolean,
    ) => {
      const base = db.sessions.find((s) => s.id === sessionId);
      if (!base) return;
      const ids = db.sessions
        .filter(
          (s) =>
            s.id === sessionId ||
            (alsoLaterWeeks &&
              s.tutorId === base.tutorId &&
              s.title === base.title &&
              s.status === 'scheduled' &&
              s.startISO > base.startISO),
        )
        .map((s) => s.id);
      const now = new Date().toISOString();
      setDb((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) =>
          ids.includes(s.id)
            ? { ...s, link: m.link, meetingId: m.meetingId, passcode: m.passcode, linkUpdatedISO: now }
            : s,
        ),
      }));
      sync((sb) => remote.updateMeeting(sb, ids, m));
      toast(
        ids.length > 1
          ? `Link updated for ${ids.length} classes. Students will see the change.`
          : 'Link updated. Students will see the change.',
      );
    },
    [db.sessions, sync, toast],
  );

  const setTutorEmail = useCallback(
    (tutorId: string, email: string) => {
      const e = email.trim().toLowerCase();
      setDb((prev) => ({
        ...prev,
        tutors: prev.tutors.map((t) => (t.id === tutorId ? { ...t, email: e } : t)),
      }));
      sync((sb) => remote.setTutorEmail(sb, tutorId, e));
      toast(e ? 'Login email saved. They can sign in with it now.' : 'Login email removed.');
    },
    [sync, toast],
  );

  const setStudentBlocked = useCallback(
    (email: string, blocked: boolean) => {
      setDb((prev) => ({
        ...prev,
        students: prev.students?.map((x) => (x.email === email ? { ...x, blocked } : x)),
      }));
      sync((sb) => remote.setBlocked(sb, email, blocked));
      toast(blocked ? 'Blocked. They can no longer save spots.' : 'Unblocked.');
    },
    [sync, toast],
  );

  /** Admin or the class's teacher taking someone off a class. */
  const removeFromClass = useCallback(
    (sessionId: string, email: string) => {
      setDb((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) => {
          if (s.id !== sessionId) return s;
          const wasSeated = s.attendees.some((a) => a.email === email);
          const attendees = s.attendees.filter((a) => a.email !== email);
          const waitlist = s.waitlist.filter((a) => a.email !== email);
          // same rule as the database: a freed seat goes to the first person waiting
          if (wasSeated && waitlist.length > 0) {
            return { ...s, attendees: [...attendees, waitlist[0]], waitlist: waitlist.slice(1) };
          }
          return { ...s, attendees, waitlist };
        }),
      }));
      sync((sb) => remote.leaveClass(sb, sessionId, email));
      toast('Removed from the class.');
    },
    [sync, toast],
  );

  const value = useMemo<StoreValue>(
    () => ({
      db,
      profile,
      toasts,
      signInOpen,
      openSignIn,
      closeSignIn,
      completeSignIn,
      signOut,
      requireProfile,
      toast,
      toggleRsvp,
      toggleWaitlist,
      submitApplication,
      receiveApplication,
      saveCertification,
      addKudos,
      addRequest,
      voteRequest,
      approveApplication,
      declineApplication,
      createSession,
      cancelSession,
      updateTutor,
      removeTutor,
      addTutor,
      importData,
      resetData,
      acceptInvite,
      setRole,
      live,
      isAdmin,
      refresh: () => void reload(),
      sendSignInCode,
      verifySignInCode,
      saveProfile,
      updateMeeting,
      setTutorEmail,
      setStudentBlocked,
      removeFromClass,
    }),
    [
      db, profile, toasts, signInOpen,
      openSignIn, closeSignIn, completeSignIn, signOut, requireProfile, toast,
      toggleRsvp, toggleWaitlist, submitApplication, receiveApplication, saveCertification, addKudos, addRequest,
      voteRequest, approveApplication, declineApplication, createSession,
      cancelSession, updateTutor, removeTutor, addTutor, importData, resetData, acceptInvite, setRole,
      live, isAdmin, reload, sendSignInCode, verifySignInCode, saveProfile, updateMeeting,
      setTutorEmail, setStudentBlocked, removeFromClass,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

// ── selectors ────────────────────────────────────────────────

export function upcomingSessions(db: RelayState): Session[] {
  return db.sessions
    .filter((s) => s.status === 'scheduled' && !isPastSession(s))
    .sort((a, b) => a.startISO.localeCompare(b.startISO));
}

export function pastSessions(db: RelayState): Session[] {
  return db.sessions
    .filter((s) => s.status === 'scheduled' && isPastSession(s))
    .sort((a, b) => b.startISO.localeCompare(a.startISO));
}

export function tutorById(db: RelayState, id: string): Tutor | undefined {
  return db.tutors.find((t) => t.id === id);
}

export function tutorByEmail(db: RelayState, email: string): Tutor | undefined {
  const e = email.trim().toLowerCase();
  return db.tutors.find((t) => t.email.toLowerCase() === e);
}

export function certsFor(db: RelayState, email: string): Certification[] {
  const e = email.trim().toLowerCase();
  return db.certifications.filter((c) => c.email.toLowerCase() === e);
}

export function attendedSessions(db: RelayState, email: string): Session[] {
  return pastSessions(db).filter((s) => s.attendees.some((a) => a.email === email));
}

export function applicationFor(db: RelayState, email: string): Application | undefined {
  const e = email.trim().toLowerCase();
  return db.applications.find((a) => a.email.toLowerCase() === e);
}

export interface TutorStats {
  hours: number;
  taught: number;
  learners: number;
  kudosCount: number;
  upcoming: Session[];
  past: Session[];
  firstISO: string | null;
  lastISO: string | null;
}

export function tutorStats(db: RelayState, tutorId: string): TutorStats {
  const past = pastSessions(db).filter((s) => s.tutorId === tutorId);
  const upcoming = upcomingSessions(db).filter((s) => s.tutorId === tutorId);
  const minutes = past.reduce((acc, s) => acc + s.durationMin, 0);
  const emails = new Set(past.flatMap((s) => s.attendees.map((a) => a.email)));
  const dates = past.map((s) => s.startISO).sort();
  return {
    hours: Math.round((minutes / 60) * 10) / 10,
    taught: past.length,
    learners: emails.size,
    kudosCount: db.kudos.filter((k) => k.tutorId === tutorId).length,
    upcoming,
    past,
    firstISO: dates[0] ?? null,
    lastISO: dates[dates.length - 1] ?? null,
  };
}

export interface GlobalStats {
  sessionsHosted: number;
  learnersHelped: number;
  volunteerHours: number;
  tutorCount: number;
}

export function globalStats(db: RelayState): GlobalStats {
  const past = pastSessions(db);
  const emails = new Set(past.flatMap((s) => s.attendees.map((a) => a.email)));
  const minutes = past.reduce((acc, s) => acc + s.durationMin, 0);
  return {
    sessionsHosted: past.length,
    learnersHelped: emails.size,
    volunteerHours: Math.round(minutes / 60),
    tutorCount: db.tutors.filter((t) => t.active !== false).length,
  };
}

/** No real history yet — used to keep day-one copy honest. */
export function isDayOne(db: RelayState): boolean {
  return pastSessions(db).length === 0;
}

export function levelLabel(l: Level): string {
  return l === 'intro' ? 'Intro friendly' : l === 'intermediate' ? 'Intermediate' : 'All levels';
}

export function subjectSessions(db: RelayState, subject: SubjectId): Session[] {
  return upcomingSessions(db).filter((s) => s.subject === subject);
}

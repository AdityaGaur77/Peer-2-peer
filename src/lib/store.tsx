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
import { excludeThisBrowser, setAnalyticsToken, track } from './analytics';
import { supabase } from './backend';
import { SEED_VERSION } from './config';
import type { DecodedInvite } from './invite';
import { countsForHours } from './price';
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
  TutoringRequest,
  TutoringStatus,
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
  /** Self-service: delete your profile and everything the site stores about you. */
  deleteMyAccount: () => void;
  requireProfile: (fn: (p: Profile) => void) => void;
  toast: (message: string) => void;

  toggleRsvp: (sessionId: string, p: Profile) => void;
  /** Drop every remaining week of a weekly series at once. */
  leaveSeries: (sessionId: string, p: Profile) => void;
  /** A teacher (or admin) posting the notes/slides for a class they run. */
  setMaterials: (sessionId: string, materials: string) => void;
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
  createSession: (s: Omit<Session, 'id' | 'attendees' | 'waitlist' | 'status'>, quiet?: boolean | string) => string;
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
  /** Live mode: email a sign-in code. Name and age are asked after, first time only. */
  sendSignInCode: (email: string) => Promise<void>;
  verifySignInCode: (email: string, code: string) => Promise<void>;
  saveProfile: (p: Profile) => Promise<void>;
  updateMeeting: (
    sessionId: string,
    m: { link: string; meetingId?: string; passcode?: string },
    alsoLaterWeeks: boolean,
  ) => void;
  setTutorEmail: (tutorId: string, email: string) => void;
  setStudentBlocked: (email: string, blocked: boolean) => void;
  removeFromClass: (sessionId: string, email: string) => void;
  /** Teacher or admin ticks whether someone actually came to a class. */
  markAttendance: (sessionId: string, email: string, attended: boolean) => void;
  /** Admin takes a thank-you off the wall (spam, or someone being unkind). */
  removeKudos: (id: string) => void;
  /** Admin takes a topic request off the list. */
  removeRequest: (id: string) => void;
  /** A teacher editing the parts of their own card they can change. */
  setMyProfile: (tagline: string, grade: string, availability: string) => void;
  /** A signed-in student asking a teacher for 1-on-1 tutoring. */
  requestTutoring: (tutorId: string, message: string, times: string, parentEmail: string, p: Profile) => void;
  setTutoringStatus: (id: string, status: TutoringStatus) => void;
  /** Turn a teacher's 1-on-1 tutoring on (price $1-$20) or off (null). */
  setTutoring: (tutorId: string, price: number | null, note: string) => void;
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
    tutoringRequests: Array.isArray(s.tutoringRequests) ? s.tutoringRequests : [],
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
      if (snap.isAdmin) excludeThisBrowser();
      return snap;
    } catch (e) {
      console.error(e);
      toast("Couldn't reach the database. Check your connection.");
    }
  }, [toast]);

  /**
   * Run a write, then pull fresh data so every screen shows the truth.
   * `ok` runs only once the database has accepted it (straight away in the
   * offline version), so success messages and analytics never get ahead of
   * a refusal.
   */
  const sync = useCallback(
    (work: (sb: NonNullable<typeof supabase>) => Promise<unknown>, ok?: () => void) => {
      if (!supabase) {
        ok?.();
        return;
      }
      work(supabase)
        .then(() => ok?.())
        .catch((e: Error) => toast(e.message || 'That didn\'t save. Try again.'))
        .finally(() => void reload());
    },
    [reload, toast],
  );

  // Who is signed in, kept in step with Supabase's session.
  useEffect(() => {
    if (!supabase) return;
    const sb = supabase;
    const adopt = async (email: string | null) => {
      myEmail.current = email;
      const snap = await reload();
      if (!email) {
        setProfile(null);
        return;
      }
      const me = snap?.me;
      if (!me) {
        // First sign-in. Nothing is saved until they give a name and age:
        // a profile without an age makes the sign-in box ask for them.
        setProfile({ email, name: email.split('@')[0], role: 'student' });
        return;
      }
      setProfile({ email, name: me.name, age: me.age ?? undefined, role: me.role });
    };

    sb.auth.getSession().then(({ data }) => {
      setAnalyticsToken(data.session?.access_token ?? null);
      const u = data.session?.user;
      void adopt(u?.email?.toLowerCase() ?? null);
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      setAnalyticsToken(session?.access_token ?? null);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        const u = session?.user;
        const email = u?.email?.toLowerCase() ?? null;
        if (email === myEmail.current && event !== 'SIGNED_OUT') return;
        void adopt(email);
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

  const sendSignInCode = useCallback(async (email: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    if (error) throw new Error(error.message);
  }, []);

  const verifySignInCode = useCallback(async (email: string, code: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    if (error) throw new Error(error.message);
  }, []);

  /**
   * Resolves once the profile is in the database. Callers that go on to save
   * a spot must wait for it: the database checks the age on the signup, and
   * would otherwise see no age yet and turn the student away.
   */
  const saveProfile = useCallback(
    async (p: Profile) => {
      setProfile(p);
      if (!supabase) return;
      try {
        await remote.saveProfile(supabase, p);
      } finally {
        void reload();
      }
    },
    [reload],
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
      track('signin', { label: p.role ?? 'student' });
      // whatever they were doing gives its own message; one toast is enough
      if (after) after(p);
      else toast(`You're signed in, ${p.name.split(' ')[0]}.`);
    },
    [toast],
  );

  const signOut = useCallback(() => {
    setProfile(null);
    if (supabase) void supabase.auth.signOut();
    toast('Signed out.');
  }, [toast]);

  /**
   * Self-service deletion promised on the privacy page. On the live site the
   * database removes the profile, signups, 1-on-1 requests and applications,
   * and strips the email from analytics. Offline, it wipes this browser's
   * copy. Team accounts can't use it from the site.
   */
  const deleteMyAccount = useCallback(() => {
    if (!supabase) {
      try {
        localStorage.removeItem(DB_KEY);
        localStorage.removeItem(PROFILE_KEY);
      } catch {
        /* storage blocked */
      }
      setDb(normalizeState(buildSeed()));
      setProfile(null);
      toast('Your account is deleted.');
      return;
    }
    sync(
      (sb) => remote.deleteMyAccount(sb),
      () => {
        setProfile(null);
        if (supabase) void supabase.auth.signOut();
        toast('Your account is deleted. Your profile and signups are gone.');
      },
    );
  }, [sync, toast]);

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
        toast(`This class is for ages ${session.minAge} and up. If you're younger, a parent can email us to ask.`);
        return;
      }
      const promoted = going ? session.waitlist[0] : undefined;
      // A weekly series posts as separate classes sharing one room, so saving a
      // spot adds the student to every week they can still make, not just this one.
      const siblings =
        !going
          ? db.sessions.filter(
              (s) =>
                s.id !== sessionId &&
                s.tutorId === session.tutorId &&
                s.title === session.title &&
                // same series = same room (a blank link means a roomless series)
                s.link === session.link &&
                s.status === 'scheduled' &&
                !isPastSession(s),
            )
          : [];
      // leaving is one week at a time, so say what they're still in
      const otherWeeks = going
        ? db.sessions.filter(
            (s) =>
              s.id !== sessionId &&
              s.tutorId === session.tutorId &&
              s.title === session.title &&
              s.link === session.link &&
              s.status === 'scheduled' &&
              !isPastSession(s) &&
              s.attendees.some((a) => a.email === p.email),
          ).length
        : 0;
      const joinTargets = going
        ? [session]
        : [session, ...siblings].filter(
            (s) => s.attendees.length < s.capacity && !(s.minAge && (p.age ?? 0) < s.minAge),
          );
      const skipped = going ? [] : [session, ...siblings].filter((s) => !joinTargets.includes(s));
      let seriesFailed: typeof joinTargets = [];
      const joinIds = new Set(joinTargets.map((s) => s.id));
      setDb((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) => {
          if (!going && joinIds.has(s.id)) {
            const isGoing = s.attendees.some((a) => a.email === p.email);
            return isGoing
              ? s
              : { ...s, attendees: [...s.attendees, { name: p.name, email: p.email }] };
          }
          if (going && s.id === sessionId) {
            // leaving one week at a time: the first learner waiting takes the seat
            const [next, ...rest] = s.waitlist;
            return {
              ...s,
              attendees: next
                ? [...s.attendees.filter((a) => a.email !== p.email), next]
                : s.attendees.filter((a) => a.email !== p.email),
              waitlist: next ? rest : s.waitlist,
            };
          }
          return s;
        }),
      }));
      sync(
        going
          ? (sb) => remote.leaveClass(sb, sessionId, p.email)
          : async (sb) => {
              const results = await Promise.allSettled(
                joinTargets.map((t) => remote.joinClass(sb, t.id, p)),
              );
              seriesFailed = joinTargets.filter((_, i) => results[i].status === 'rejected');
              if (joinTargets.length > 0 && seriesFailed.length === joinTargets.length) {
                const first = results[0];
                throw first.status === 'rejected'
                  ? (first.reason as Error)
                  : new Error("Couldn't save a spot.");
              }
            },
        () => {
          if (going) {
            const still = otherWeeks > 0
              ? ` You're still in ${otherWeeks} more ${otherWeeks === 1 ? 'week' : 'weeks'} of this series.`
              : '';
            toast(
              promoted?.name
                ? `Spot released. ${promoted.name.split(' ')[0]} moves up from the waitlist.${still}`
                : `Spot released.${still}`,
            );
            return;
          }
          const total = joinTargets.length + skipped.length;
          const got = joinTargets.length - seriesFailed.length;
          toast(
            total > 1
              ? got < total
                ? `You're going — ${got} of ${total} weeks of "${session.title}". ${got === 1 ? 'The other week is' : 'The rest are'} full.`
                : `You're going — all ${total} weeks of "${session.title}".`
              : `You're going: ${session.title}`,
          );
          track('rsvp', { label: session.title });
        },
      );
    },
    [db, toast, sync],
  );

  /**
   * One signup covers a whole weekly series, so leaving should be able to
   * cover it too — otherwise a student who quits in week one holds a seat in
   * every later week they never attend.
   */
  const leaveSeries = useCallback(
    (sessionId: string, p: Profile) => {
      const session = db.sessions.find((s) => s.id === sessionId);
      if (!session) return;
      const ids = db.sessions
        .filter(
          (s) =>
            (s.id === session.id ||
              (s.tutorId === session.tutorId &&
                s.title === session.title &&
                s.link === session.link)) &&
            s.status === 'scheduled' &&
            !isPastSession(s) &&
            s.attendees.some((a) => a.email === p.email),
        )
        .map((s) => s.id);
      if (ids.length === 0) return;
      const inSeries = new Set(ids);
      setDb((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) =>
          inSeries.has(s.id)
            ? { ...s, attendees: s.attendees.filter((a) => a.email !== p.email) }
            : s,
        ),
      }));
      sync(
        async (sb) => {
          const results = await Promise.allSettled(
            ids.map((id) => remote.leaveClass(sb, id, p.email)),
          );
          if (results.every((r) => r.status === 'rejected')) {
            throw new Error("Couldn't leave the series. Try again.");
          }
        },
        () =>
          toast(
            ids.length > 1
              ? `You're out of all ${ids.length} remaining weeks of "${session.title}".`
              : 'Spot released.',
          ),
      );
    },
    [db, sync, toast],
  );

  const setMaterials = useCallback(
    (sessionId: string, materials: string) => {
      const session = db.sessions.find((s) => s.id === sessionId);
      const t = session ? tutorById(db, session.tutorId) : undefined;
      const mine =
        !!profile &&
        !!t &&
        !!t.email &&
        t.email.toLowerCase() === profile.email.toLowerCase();
      if (!mine && !isAdmin) {
        toast('Only the teacher running the class, or the team, can add materials.');
        return;
      }
      const m = materials.trim();
      setDb((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.id === sessionId ? { ...s, materials: m || undefined } : s,
        ),
      }));
      sync(
        (sb) => remote.setMaterials(sb, sessionId, m),
        () =>
          toast(
            m
              ? 'Class materials posted — everyone in the class sees them.'
              : 'Class materials cleared.',
          ),
      );
    },
    [db, profile, isAdmin, sync, toast],
  );

  const toggleWaitlist = useCallback(
    (sessionId: string, p: Profile) => {
      const session = db.sessions.find((s) => s.id === sessionId);
      if (!session) return;
      if (session.attendees.some((a) => a.email === p.email)) return;
      const on = session.waitlist.some((a) => a.email === p.email);
      if (!on && session.minAge && (p.age ?? 0) < session.minAge) {
        toast(`This class is for ages ${session.minAge} and up. If you're younger, a parent can email us to ask.`);
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
      sync(
        (sb) => (on ? remote.leaveClass(sb, sessionId, p.email) : remote.joinClass(sb, sessionId, p, true)),
        () =>
          toast(
            on
              ? 'Off the waitlist.'
              : `You're #${session.waitlist.length + 1} on the waitlist. We'll move you up if a spot opens.`,
          ),
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
      sync(
        (sb) => remote.submitApplication(sb, a, id, pending?.id),
        () => {
          track('apply', { label: a.subjects.join(', ') });
          toast('Application sent.');
        },
      );
      setDb((prev) => ({
        ...prev,
        applications: [
          ...prev.applications.filter((x) => x.email !== a.email),
          { ...a, id, status: 'pending', submittedISO: new Date().toISOString() },
        ],
      }));
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
          {
            ...a,
            id: uid('app'),
            status: prior?.status === 'approved' ? ('approved' as const) : ('pending' as const),
            submittedISO,
          },
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
      sync(
        (sb) => remote.addKudos(sb, k),
        () => {
          track('kudos');
          toast('Thank-you sent.');
        },
      );
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
        votedBy: myEmail.current ? [myEmail.current] : profile ? [profile.email] : [],
        atISO: new Date().toISOString(),
      };
      setDb((prev) => ({ ...prev, requests: [r, ...prev.requests] }));
      sync(
        (sb) => remote.addRequest(sb, r, myEmail.current ?? ''),
        () => {
          track('request', { label: subject });
          toast('Request added. Teachers check this list when they plan classes.');
        },
      );
    },
    [toast, sync, profile],
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
      sync(
        async (sb) => {
          if (!exists) await remote.addTutor(sb, tutor);
          await remote.setApplicationStatus(sb, id, 'approved');
        },
        () => toast("Approved. They can teach now."),
      );
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
    (s: Omit<Session, 'id' | 'attendees' | 'waitlist' | 'status'>, quiet: boolean | string = false) => {
      const id = uid('session');
      const full: Session = { ...s, id, attendees: [], waitlist: [], status: 'scheduled' };
      setDb((prev) => ({ ...prev, sessions: [...prev.sessions, full] }));
      sync(
        (sb) => remote.createSession(sb, full),
        quiet === true ? undefined : () => toast(typeof quiet === 'string' ? quiet : 'Class posted.'),
      );
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
      sync((sb) => remote.cancelSession(sb, id), () => toast('Class canceled.'));
    },
    [toast, sync],
  );

  const updateTutor = useCallback(
    (id: string, patch: Partial<Pick<Tutor, 'tagline' | 'grade' | 'subjects' | 'availability'>>) => {
      setDb((prev) => ({
        ...prev,
        tutors: prev.tutors.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
      sync((sb) => remote.updateTutor(sb, id, patch), () => toast('Teacher updated.'));
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
      sync(
        (sb) => remote.addTutor(sb, tutor),
        () => toast(`${t.name.trim().split(' ')[0]} added as a teacher.`),
      );
    },
    [db.tutors, toast, sync],
  );

  const removeTutor = useCallback(
    (id: string) => {
      const tutor = db.tutors.find((t) => t.id === id);
      if (!tutor) return;
      if (supabase) {
        sync((sb) => remote.retireTutor(sb, id), () => toast(`${tutor.name} removed. Their past classes and hours are kept.`));
        return;
      }
      // Same as the live database: hidden from the site and upcoming classes
      // canceled, but the tutor, their past classes, kudos and certificate stay.
      setDb((prev) => ({
        ...prev,
        tutors: prev.tutors.map((t) => (t.id === id ? { ...t, active: false } : t)),
        sessions: prev.sessions.map((s) =>
          s.tutorId === id && !isPastSession(s) && s.status === 'scheduled'
            ? { ...s, status: 'canceled' as const }
            : s,
        ),
      }));
      toast(`${tutor.name} removed.`);
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
    toast('All data cleared.');
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
      const already = db.sessions.find(
        (s) => s.title === d.session.title && s.startISO === d.session.startISO,
      );
      const newId = already?.id ?? uid('session');
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
    [db.sessions],
  );

  /** Students and tutors see a slightly different site; this is the switch. */
  const setRole = useCallback(
    (role: Role) => {
      setProfile((p) => (p ? { ...p, role } : p));
      if (profile) sync((sb) => remote.saveProfile(sb, { ...profile, role }));
      toast(role === 'tutor' ? 'Switched to the teacher view.' : 'Switched to the student view.');
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
      sync(
        (sb) => remote.updateMeeting(sb, ids, m),
        () =>
          toast(
            ids.length > 1
              ? `Link updated for ${ids.length} classes. Students will see the change.`
              : 'Link updated. Students will see the change.',
          ),
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
      sync(
        (sb) => remote.setTutorEmail(sb, tutorId, e),
        () => toast(e ? 'Login email saved. They can sign in with it now.' : 'Login email removed.'),
      );
    },
    [sync, toast],
  );

  const setStudentBlocked = useCallback(
    (email: string, blocked: boolean) => {
      setDb((prev) => ({
        ...prev,
        students: prev.students?.map((x) => (x.email === email ? { ...x, blocked } : x)),
      }));
      sync(
        (sb) => remote.setBlocked(sb, email, blocked),
        () =>
          toast(
            blocked
              ? "Blocked. They're out of their upcoming classes and can't post or message anyone."
              : 'Unblocked.',
          ),
      );
    },
    [sync, toast],
  );

  const requestTutoring = useCallback(
    (tutorId: string, message: string, times: string, parentEmail: string, p: Profile) => {
      const r: TutoringRequest = {
        id: uid('tutreq'),
        tutorId,
        studentEmail: p.email,
        studentName: p.name,
        message: message.trim().slice(0, 1000),
        times: times.trim().slice(0, 200),
        parentEmail: parentEmail.trim().slice(0, 200) || undefined,
        status: 'new',
        createdISO: new Date().toISOString(),
      };
      setDb((prev) => ({ ...prev, tutoringRequests: [r, ...(prev.tutoringRequests ?? [])] }));
      const t = tutorById(db, tutorId);
      const first = t?.name.split(' ')[0] ?? 'the teacher';
      sync(
        (sb) => remote.requestTutoring(sb, r),
        () => {
          track('tutoring', { label: t?.name });
          toast(
            supabase
              ? `Sent to ${first}. They'll email you to pick a time.`
              : `Saved in this browser only. This demo version can't send it to ${first}.`,
          );
        },
      );
    },
    [db, sync, toast],
  );

  const setTutoringStatus = useCallback(
    (id: string, status: TutoringStatus) => {
      setDb((prev) => ({
        ...prev,
        tutoringRequests: (prev.tutoringRequests ?? []).map((r) => (r.id === id ? { ...r, status } : r)),
      }));
      sync((sb) => remote.setTutoringStatus(sb, id, status));
    },
    [sync],
  );

  const setTutoring = useCallback(
    (tutorId: string, price: number | null, note: string) => {
      const clean = price === null ? null : Math.min(20, Math.max(1, Math.round(price)));
      setDb((prev) => ({
        ...prev,
        tutors: prev.tutors.map((t) =>
          t.id === tutorId ? { ...t, tutoringPrice: clean ?? undefined, tutoringNote: note.trim() || undefined } : t,
        ),
      }));
      const mine = tutorById(db, tutorId)?.email === myEmail.current && !!myEmail.current;
      sync((sb) =>
        mine
          ? remote.setMyTutoring(sb, clean, note.trim())
          : remote.updateTutor(sb, tutorId, { tutoringPrice: clean ?? 0, tutoringNote: note.trim() }),
      );
      toast(clean ? `1-on-1 tutoring is on, at $${clean} a lesson.` : '1-on-1 tutoring is off.');
    },
    [db, sync, toast],
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
      sync((sb) => remote.leaveClass(sb, sessionId, email), () => toast('Removed from the class.'));
    },
    [sync, toast],
  );

  /**
   * A teacher or admin ticks whether someone actually came. This is what
   * volunteer hours count now — saving a spot is not attendance.
   */
  const markAttendance = useCallback(
    (sessionId: string, email: string, attended: boolean) => {
      setDb((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.id !== sessionId
            ? s
            : {
                ...s,
                attendees: s.attendees.map((a) => (a.email === email ? { ...a, attended } : a)),
              },
        ),
      }));
      sync((sb) => remote.markAttendance(sb, sessionId, email, attended));
    },
    [sync],
  );

  const removeKudos = useCallback(
    (id: string) => {
      setDb((prev) => ({ ...prev, kudos: prev.kudos.filter((k) => k.id !== id) }));
      sync((sb) => remote.deleteKudos(sb, id), () => toast('Thank-you removed.'));
    },
    [toast, sync],
  );

  const removeRequest = useCallback(
    (id: string) => {
      setDb((prev) => ({ ...prev, requests: prev.requests.filter((r) => r.id !== id) }));
      sync((sb) => remote.deleteRequest(sb, id), () => toast('Request removed.'));
    },
    [toast, sync],
  );

  const setMyProfile = useCallback(
    (tagline: string, grade: string, availability: string) => {
      const mine = profile ? tutorByEmail(db, profile.email) : undefined;
      if (!mine) {
        toast('Only teachers can edit a teacher card.');
        return;
      }
      setDb((prev) => ({
        ...prev,
        tutors: prev.tutors.map((x) =>
          x.id === mine.id
            ? {
                ...x,
                tagline: tagline.trim() || x.tagline,
                grade: grade.trim() || x.grade,
                availability: availability.trim() || undefined,
              }
            : x,
        ),
      }));
      sync(
        (sb) => remote.setMyProfile(sb, tagline.trim(), grade.trim(), availability.trim()),
        () => toast('Your card is updated.'),
      );
    },
    [db, profile, sync, toast],
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
      deleteMyAccount,
      requireProfile,
      toast,
      toggleRsvp,
      leaveSeries,
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
      markAttendance,
      removeKudos,
      removeRequest,
      setMyProfile,
      setMaterials,
      requestTutoring,
      setTutoringStatus,
      setTutoring,
    }),
    [
      db, profile, toasts, signInOpen,
      openSignIn, closeSignIn, completeSignIn, signOut, requireProfile, toast, deleteMyAccount,
      toggleRsvp, toggleWaitlist, leaveSeries, submitApplication, receiveApplication, saveCertification, addKudos, addRequest,
      voteRequest, approveApplication, declineApplication, createSession,
      cancelSession, updateTutor, removeTutor, addTutor, importData, resetData, acceptInvite, setRole,
      live, isAdmin, reload, sendSignInCode, verifySignInCode, saveProfile, updateMeeting,
      setTutorEmail, setStudentBlocked, removeFromClass, requestTutoring, setTutoringStatus,
      markAttendance, removeKudos, removeRequest, setMyProfile, setMaterials,
      setTutoring,
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

/**
 * `volunteerOnly` limits everything to classes that count as service (free,
 * and someone came), which is what the certificate reports.
 */
export function tutorStats(db: RelayState, tutorId: string, volunteerOnly = false): TutorStats {
  const past = pastSessions(db).filter(
    (s) => s.tutorId === tutorId && (!volunteerOnly || countsForHours(s)),
  );
  const upcoming = upcomingSessions(db).filter((s) => s.tutorId === tutorId);
  // volunteering means unpaid, and only classes someone came to count
  const minutes = past.filter(countsForHours).reduce((acc, s) => acc + s.durationMin, 0);
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
  const minutes = past.filter(countsForHours).reduce((acc, s) => acc + s.durationMin, 0);
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

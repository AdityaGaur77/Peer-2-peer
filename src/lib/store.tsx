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
import { SEED_VERSION } from './config';
import { buildSeed } from './seed';
import type {
  Application,
  Certification,
  Level,
  Profile,
  RelayState,
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
  saveCertification: (c: Omit<Certification, 'earnedISO'>) => void;
  addKudos: (tutorId: string, from: string, message: string) => void;
  addRequest: (topic: string, subject: TopicRequest['subject'], by: string) => void;
  voteRequest: (id: string, email: string) => void;
  approveApplication: (id: string) => void;
  declineApplication: (id: string) => void;
  createSession: (s: Omit<Session, 'id' | 'attendees' | 'waitlist' | 'status'>) => string;
  cancelSession: (id: string) => void;
  updateTutor: (id: string, patch: Partial<Pick<Tutor, 'tagline' | 'grade' | 'subjects'>>) => void;
  removeTutor: (id: string) => void;
  importData: (state: RelayState) => void;
  resetData: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

/** Backfill fields added after a user's data was first saved. */
export function normalizeState(s: RelayState): RelayState {
  return {
    ...s,
    sessions: s.sessions.map((x) => ({
      ...x,
      attendees: Array.isArray(x.attendees) ? x.attendees : [],
      waitlist: Array.isArray(x.waitlist) ? x.waitlist : [],
    })),
  };
}

function loadDb(): RelayState {
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
  return buildSeed();
}

function loadProfile(): Profile | null {
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

  useEffect(() => {
    localStorage.setItem(DB_KEY, JSON.stringify({ version: SEED_VERSION, state: db }));
  }, [db]);

  useEffect(() => {
    if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(PROFILE_KEY);
  }, [profile]);

  const toast = useCallback((message: string) => {
    const id = uid('toast');
    setToasts((t) => [...t, { id, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

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
      toast(`Hey ${p.name.split(' ')[0]} — you're in.`);
      if (after) after(p);
    },
    [toast],
  );

  const signOut = useCallback(() => {
    setProfile(null);
    toast('Signed out. The baton awaits your return.');
  }, [toast]);

  const requireProfile = useCallback(
    (fn: (p: Profile) => void) => {
      if (profile) fn(profile);
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
        toast("That one's full — grab a waitlist spot instead.");
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
          ? promoted
            ? `Spot released — ${promoted.name.split(' ')[0]} moves in from the waitlist.`
            : 'Spot released — someone else will thank you.'
          : `You're going: ${session.title}`,
      );
    },
    [db.sessions, toast],
  );

  const toggleWaitlist = useCallback(
    (sessionId: string, p: Profile) => {
      const session = db.sessions.find((s) => s.id === sessionId);
      if (!session) return;
      if (session.attendees.some((a) => a.email === p.email)) return;
      const on = session.waitlist.some((a) => a.email === p.email);
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
          : `You're #${session.waitlist.length + 1} on the waitlist — spots open up more often than you'd think.`,
      );
    },
    [db.sessions, toast],
  );

  const submitApplication = useCallback(
    (a: Omit<Application, 'id' | 'status' | 'submittedISO'>) => {
      setDb((prev) => ({
        ...prev,
        applications: [
          ...prev.applications.filter((x) => x.email !== a.email),
          { ...a, id: uid('app'), status: 'pending', submittedISO: new Date().toISOString() },
        ],
      }));
      toast('Application in. A founder reviews every single one.');
    },
    [toast],
  );

  const saveCertification = useCallback((c: Omit<Certification, 'earnedISO'>) => {
    setDb((prev) => ({
      ...prev,
      certifications: [
        ...prev.certifications.filter((x) => !(x.email === c.email && x.subject === c.subject)),
        { ...c, earnedISO: new Date().toISOString() },
      ],
    }));
  }, []);

  const addKudos = useCallback(
    (tutorId: string, from: string, message: string) => {
      setDb((prev) => ({
        ...prev,
        kudos: [
          { id: uid('kudos'), tutorId, from, message, atISO: new Date().toISOString() },
          ...prev.kudos,
        ],
      }));
      toast("Kudos delivered. You just made someone's week.");
    },
    [toast],
  );

  const addRequest = useCallback(
    (topic: string, subject: TopicRequest['subject'], by: string) => {
      setDb((prev) => ({
        ...prev,
        requests: [
          {
            id: uid('req'),
            topic,
            subject,
            by,
            votes: 1,
            votedBy: [],
            atISO: new Date().toISOString(),
          },
          ...prev.requests,
        ],
      }));
      toast('Topic requested — tutors pick sessions from this list.');
    },
    [toast],
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
    },
    [db.requests, toast],
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
      toast("Approved — they're officially a Relay tutor.");
    },
    [db.applications, toast],
  );

  const declineApplication = useCallback((id: string) => {
    setDb((prev) => ({
      ...prev,
      applications: prev.applications.map((a) =>
        a.id === id ? { ...a, status: 'declined' as const } : a,
      ),
    }));
  }, []);

  const createSession = useCallback(
    (s: Omit<Session, 'id' | 'attendees' | 'waitlist' | 'status'>) => {
      const id = uid('session');
      setDb((prev) => ({
        ...prev,
        sessions: [
          ...prev.sessions,
          { ...s, id, attendees: [], waitlist: [], status: 'scheduled' },
        ],
      }));
      toast("Session published — it's live on the board.");
      return id;
    },
    [toast],
  );

  const cancelSession = useCallback(
    (id: string) => {
      setDb((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) => (s.id === id ? { ...s, status: 'canceled' as const } : s)),
      }));
      toast('Session canceled.');
    },
    [toast],
  );

  const updateTutor = useCallback(
    (id: string, patch: Partial<Pick<Tutor, 'tagline' | 'grade' | 'subjects'>>) => {
      setDb((prev) => ({
        ...prev,
        tutors: prev.tutors.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
      toast('Tutor updated.');
    },
    [toast],
  );

  const removeTutor = useCallback(
    (id: string) => {
      const tutor = db.tutors.find((t) => t.id === id);
      if (!tutor) return;
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
    [db.tutors, toast],
  );

  const importData = useCallback(
    (state: RelayState) => {
      setDb(normalizeState(state));
      toast('Data imported — the board is restored.');
    },
    [toast],
  );

  const resetData = useCallback(() => {
    setDb(buildSeed());
    toast('Fresh demo data seeded.');
  }, [toast]);

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
      importData,
      resetData,
    }),
    [
      db, profile, toasts, signInOpen,
      openSignIn, closeSignIn, completeSignIn, signOut, requireProfile, toast,
      toggleRsvp, toggleWaitlist, submitApplication, saveCertification, addKudos, addRequest,
      voteRequest, approveApplication, declineApplication, createSession,
      cancelSession, updateTutor, removeTutor, importData, resetData,
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
    tutorCount: db.tutors.length,
  };
}

export function levelLabel(l: Level): string {
  return l === 'intro' ? 'Intro friendly' : l === 'intermediate' ? 'Intermediate' : 'All levels';
}

export function subjectSessions(db: RelayState, subject: SubjectId): Session[] {
  return upcomingSessions(db).filter((s) => s.subject === subject);
}

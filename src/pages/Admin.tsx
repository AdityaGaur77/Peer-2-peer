import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MeetingFields } from '../components/MeetingPanel';
import { AllTutoringRequests } from '../components/Tutoring';
import { AnalyticsPanel } from './AnalyticsPanel';
import { Reveal } from '../components/Reveal';
import { DEFAULT_MIN_AGE, freshJitsiLink, meetingLinkError, weeklyStarts } from '../lib/meeting';
import {
  AttentionPanel, ClassesPanel, StatsPanel, StudentsPanel, TeacherTable,
} from './AdminPanels';
import {
  ADMIN_CODE, ADMIN_CODE_FROM_ENV, CONTACT_EMAIL, IS_PLACEHOLDER_EMAIL, SEED_VERSION,
} from '../lib/config';
import { LIVE } from '../lib/backend';
import { decodeApplication } from '../lib/invite';
import { onboardingGaps, rosterSnippet } from '../lib/roster';
import {
  tutorById, tutorStats, upcomingSessions, useStore,
} from '../lib/store';
import {
  SUBJECTS, subjectMeta, subjectShort, type Level, type RelayState, type Session, type SubjectId,
  type Tutor,
} from '../lib/types';
import { cx, downloadText, initials, plural } from '../lib/util';

type Tab =
  | 'overview' | 'analytics' | 'applications' | 'sessions' | 'students' | 'tutoring' | 'schedule' | 'crew'
  | 'data';

function looksLikeState(x: unknown): x is RelayState {
  if (!x || typeof x !== 'object') return false;
  const s = x as Record<string, unknown>;
  const lists = ['tutors', 'sessions', 'applications', 'certifications', 'kudos', 'requests'];
  if (!lists.every((k) => Array.isArray(s[k]))) return false;
  // a backup that only has the right lists but broken entries would crash
  // every page after import, so check the fields pages rely on
  const str = (o: unknown, ...keys: string[]) =>
    !!o && typeof o === 'object' && keys.every((k) => typeof (o as Record<string, unknown>)[k] === 'string');
  const tutors = s.tutors as unknown[];
  const sessions = s.sessions as unknown[];
  return (
    tutors.length > 0 &&
    tutors.every((t) => str(t, 'id', 'name', 'email', 'grade', 'tagline') && Array.isArray((t as Tutor).subjects)) &&
    sessions.every(
      (x) =>
        str(x, 'id', 'title', 'subject', 'tutorId', 'startISO', 'description') &&
        typeof (x as Session).durationMin === 'number' &&
        typeof (x as Session).capacity === 'number',
    )
  );
}

export function Admin() {
  const store = useStore();
  const {
    db, approveApplication, declineApplication, toast,
    updateTutor, removeTutor, addTutor, importData, resetData,
  } = store;
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('relay.admin') === '1');
  const [code, setCode] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [params, setParams] = useSearchParams();
  const appPayload = params.get('app');

  // An application link (from the Teach page's "send it" step) lands here.
  // Wait for the passcode, then file it and clear the link.
  const handledApp = useRef<string | null>(null);
  const { receiveApplication } = store;
  useEffect(() => {
    if (!authed || !appPayload || handledApp.current === appPayload) return;
    handledApp.current = appPayload;
    decodeApplication(appPayload)
      .then(({ draft, submittedISO }) => {
        const result = receiveApplication(draft, submittedISO);
        toast(
          result === 'duplicate'
            ? `Already have ${draft.name}'s application.`
            : result === 'updated'
              ? `${draft.name} updated their application.`
              : `Application from ${draft.name} added.`,
        );
        setTab('applications');
      })
      .catch(() => toast('That application link is broken or cut off.'))
      .finally(() => setParams({}, { replace: true }));
  }, [authed, appPayload, receiveApplication, toast, setParams]);

  const pending = db.applications.filter((a) => a.status === 'pending');

  if (!authed) {
    const tryCode = (e: FormEvent) => {
      e.preventDefault();
      if (!code.trim()) {
        toast('Type the passcode first.');
        return;
      }
      if (ADMIN_CODE && code.trim() === ADMIN_CODE) {
        sessionStorage.setItem('relay.admin', '1');
        setAuthed(true);
        toast('Welcome back.');
      } else {
        toast('Nope — wrong passcode.');
      }
    };
    return (
      <div className="section" style={{ paddingTop: 'clamp(120px, 16vw, 160px)' }}>
        <div className="container" style={{ maxWidth: 420 }}>
          <div className="card card-pad stack" style={{ gap: 16 }}>
            <div>
              <h1 className="h3" style={{ marginTop: 12 }}>
                Team login
              </h1>
            </div>
            <p className="muted" style={{ fontSize: 14.5 }}>
              This is where applications get reviewed and sessions get published. Enter the
              team passcode to continue.
            </p>
            {appPayload && (
              <p className="hint">an application is waiting in this link — unlock to file it</p>
            )}
            <form className="stack" style={{ gap: 12 }} onSubmit={tryCode}>
              <input
                className="input"
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="passcode"
                autoFocus
              />
              <button className="btn btn-primary" type="submit">
                Enter console
              </button>
            </form>
            {!ADMIN_CODE && (
              <p className="hint">
                The console is locked until VITE_ADMIN_CODE is set in Vercel (Settings →
                Environment Variables), followed by a redeploy.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // On the live database the passcode only opens the door; the data itself
  // is locked to emails in the admins table, so you also sign in.
  if (store.live && !store.isAdmin) {
    return (
      <div className="section" style={{ paddingTop: 'clamp(120px, 16vw, 160px)' }}>
        <div className="container" style={{ maxWidth: 460 }}>
          <div className="card card-pad stack" style={{ gap: 14 }}>
            <h1 className="h3">Sign in with a team email</h1>
            {store.profile ? (
              <p className="muted" style={{ fontSize: 14.5 }}>
                You're signed in as <b>{store.profile.email}</b>, which isn't on the team list. Add
                it in Supabase (Table Editor → admins), or sign out and use your team email.
              </p>
            ) : (
              <p className="muted" style={{ fontSize: 14.5 }}>
                The console shows students' names and emails, so it needs the sign-in code as
                well as the passcode.
              </p>
            )}
            <div className="row">
              {store.profile ? (
                <button className="btn btn-ghost" onClick={store.signOut}>
                  Sign out
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => store.openSignIn()}>
                  Sign in
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const TABS: Array<{ id: Tab; label: string; badge?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'sessions', label: 'Classes' },
    { id: 'students', label: 'Students' },
    {
      id: 'tutoring',
      label: '1-on-1',
      badge: (db.tutoringRequests ?? []).filter((r) => r.status === 'new').length,
    },
    { id: 'crew', label: 'Teachers' },
    { id: 'applications', label: 'Applications', badge: pending.length },
    { id: 'schedule', label: 'Publish' },
    { id: 'data', label: 'Data' },
  ];

  return (
    <div className="section" style={{ paddingTop: 'clamp(110px, 15vw, 150px)' }}>
      <div className="container">
        <Reveal>
          <div className="row between" style={{ marginBottom: 24 }}>
            <div>
              <h1 className="h2" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.1rem)', marginTop: 10 }}>
                Team console
              </h1>
            </div>
            <button
              className="btn-quiet"
              onClick={() => {
                sessionStorage.removeItem('relay.admin');
                setAuthed(false);
              }}
            >
              lock console
            </button>
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="tabs" style={{ marginBottom: 24 }}>
            {TABS.map((t) => (
              <button key={t.id} className={cx('tab', tab === t.id && 'on')} onClick={() => setTab(t.id)}>
                {t.label}
                {t.badge ? ` · ${t.badge}` : ''}
              </button>
            ))}
          </div>
        </Reveal>

        {tab === 'overview' && (
          <Reveal>
            <div className="stack" style={{ gap: 20 }}>
              <LaunchChecklist db={db} onPublish={() => setTab('schedule')} />

              <StatsPanel db={db} />
              <AttentionPanel db={db} live={store.live} />
              <TeacherTable db={db} />

              <div className="grid-2">
                <div className="card card-pad">
                  <h3 className="h3" style={{ marginBottom: 12 }}>
                    Top topic requests
                  </h3>
                  <p className="muted small" style={{ marginBottom: 12 }}>
                    What learners are voting for — build sessions around these.
                  </p>
                  {[...db.requests]
                    .sort((a, b) => b.votes - a.votes)
                    .slice(0, 5)
                    .map((r) => (
                      <div key={r.id} className="line-item" style={{ padding: '10px 0' }}>
                        <span style={{ fontSize: 14.5 }}>{r.topic}</span>
                        <span className="chip" style={{ flex: 'none' }}>
                          ▲ {r.votes}
                        </span>
                      </div>
                    ))}
                </div>

                <div className="card card-pad">
                  <h3 className="h3" style={{ marginBottom: 12 }}>
                    Recent kudos
                  </h3>
                  <p className="muted small" style={{ marginBottom: 12 }}>
                    The stuff that makes it worth it.
                  </p>
                  {db.kudos.slice(0, 4).map((k) => (
                    <div key={k.id} style={{ padding: '10px 0', borderBottom: '1.5px dashed var(--border)' }}>
                      <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>“{k.message}”</p>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {k.from} → {tutorById(db, k.tutorId)?.name ?? 'a former tutor'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {tab === 'applications' && (
          <Reveal>
            <div className="card card-pad">
              {db.applications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <span className="serif-i" style={{ fontSize: 22, color: 'var(--ink-2)' }}>
                    No applications yet.
                  </span>
                  <p className="muted small" style={{ marginTop: 8, maxWidth: '56ch', marginInline: 'auto' }}>
                    Applications are saved in the applicant's browser. They show up here when
                    the applicant emails you their application link and you open it on this
                    device. Share the <b>/teach</b> page to get them coming.
                  </p>
                </div>
              ) : (
                db.applications
                  .slice()
                  .reverse()
                  .map((a) => (
                    <div key={a.id} className="line-item" style={{ alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="row" style={{ gap: 10 }}>
                          <strong style={{ fontSize: 15.5 }}>{a.name}</strong>
                          <span className={cx('status-pill', `status-${a.status}`)}>{a.status}</span>
                        </div>
                        <div className="mono" style={{ fontSize: 11.5, color: 'var(--muted)', margin: '4px 0 8px' }}>
                          {[
                            a.email,
                            a.grade,
                            a.subjects.length
                              ? `teaches ${a.subjects.map((s) => SUBJECTS.find((x) => x.id === s)?.name).join(', ')}`
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                        {a.courseTitle && (
                          <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>{a.courseTitle}</div>
                        )}
                        {a.courseSummary && (
                          <p className="small muted" style={{ maxWidth: '62ch', marginBottom: 6 }}>{a.courseSummary}</p>
                        )}
                        {a.times && (
                          <div className="small" style={{ marginBottom: 6 }}>
                            <span className="mono muted">free:</span> {a.times}
                          </div>
                        )}
                        {a.why && (
                          <p style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: '58ch' }}>“{a.why}”</p>
                        )}
                        {a.availability.length > 0 && (
                          <div className="row" style={{ gap: 6, marginTop: 8 }}>
                            {a.availability.map((av) => (
                              <span key={av} className="chip chip-ghost" style={{ fontSize: 11 }}>
                                {av}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {a.status === 'approved' && !store.live && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ flex: 'none' }}
                          onClick={() =>
                            navigator.clipboard
                              .writeText(rosterSnippet(a))
                              .then(
                                () => toast('Copied. Paste it into ROSTER in src/lib/roster.ts and redeploy.'),
                                () => toast("Couldn't reach the clipboard."),
                              )
                          }
                        >
                          Copy roster entry
                        </button>
                      )}
                      {a.status === 'pending' && (
                        <div className="row" style={{ flex: 'none' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => approveApplication(a.id)}>
                            Approve
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => declineApplication(a.id)}>
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </Reveal>
        )}

        {tab === 'sessions' && (
          <Reveal>
            <ClassesPanel db={db} />
          </Reveal>
        )}

        {tab === 'analytics' && (
          <Reveal>
            <AnalyticsPanel />
          </Reveal>
        )}

        {tab === 'tutoring' && (
          <Reveal>
            <AllTutoringRequests />
          </Reveal>
        )}

        {tab === 'students' && (
          <Reveal>
            <StudentsPanel db={db} live={store.live} />
          </Reveal>
        )}

        {tab === 'schedule' && (
          <Reveal>
            <ScheduleForm
              onCreate={store.createSession}
              tutors={db.tutors.filter((t) => t.active !== false)}
            />
          </Reveal>
        )}

        {tab === 'crew' && (
          <Reveal>
            <CrewPanel
              db={db}
              updateTutor={updateTutor}
              removeTutor={removeTutor}
              addTutor={addTutor}
            />
          </Reveal>
        )}

        {tab === 'data' && (
          <Reveal>
            <DataPanel db={db} importData={importData} resetData={resetData} toast={toast} />
          </Reveal>
        )}
      </div>
    </div>
  );
}

// ── launch readiness ─────────────────────────────────────────

function LaunchChecklist({ db, onPublish }: { db: RelayState; onPublish: () => void }) {
  const items = [
    {
      ok: LIVE,
      label: 'Connected to Supabase',
      detail: LIVE
        ? 'Classes, signups and applications are shared by everyone through the database.'
        : 'Not connected, so everything is saved in each visitor\'s own browser. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel and redeploy (see SUPABASE.md).',
      action: null,
    },
    {
      ok: ADMIN_CODE_FROM_ENV,
      label: 'Passcode set outside the repo',
      detail: ADMIN_CODE_FROM_ENV
        ? 'Read from VITE_ADMIN_CODE, so it never appears in the source.'
        : 'Using the local "dev" passcode. Set VITE_ADMIN_CODE in Vercel (Settings → Environment Variables), then redeploy.',
      action: null,
    },
    {
      ok: !IS_PLACEHOLDER_EMAIL,
      label: 'Real contact email',
      detail: IS_PLACEHOLDER_EMAIL
        ? `${CONTACT_EMAIL} is a placeholder — mail sent there vanishes. Set CONTACT_EMAIL in src/lib/config.ts.`
        : `${CONTACT_EMAIL} is live in the footer and on About.`,
      action: null,
    },
    {
      ok: upcomingSessions(db).length > 0,
      label: 'At least one session on the board',
      detail:
        upcomingSessions(db).length > 0
          ? `${plural(upcomingSessions(db).length, 'session')} scheduled, so visitors have something to join.`
          : 'An empty board on launch day is a bounce. Publish one before you share the link.',
      action: upcomingSessions(db).length > 0 ? null : { label: 'Publish one', run: onPublish },
    },
  ];
  const blocking = items.filter((i) => !i.ok).length;

  return (
    <div className="card card-pad">
      <div className="row between" style={{ marginBottom: 6 }}>
        <h3 className="h3">Launch readiness</h3>
        <span className={cx('status-pill', blocking === 0 ? 'status-approved' : 'status-pending')}>
          {blocking === 0 ? 'ready to publish' : `${blocking} to fix`}
        </span>
      </div>
      <p className="muted small" style={{ marginBottom: 12 }}>
        Checked live against the site as it stands right now.
      </p>
      {items.map((i) => (
        <div key={i.label} className="line-item" style={{ alignItems: 'flex-start' }}>
          <div className="row" style={{ gap: 11, minWidth: 0, flex: 1, alignItems: 'flex-start' }}>
            <span
              className="mono"
              style={{
                flex: 'none',
                fontWeight: 800,
                color: i.ok ? 'var(--ember-deep)' : 'var(--hot-deep)',
              }}
            >
              {i.ok ? '✓' : '!'}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>{i.label}</div>
              <div className="small muted" style={{ maxWidth: '62ch' }}>
                {i.detail}
              </div>
            </div>
          </div>
          {i.action && (
            <button className="btn btn-ghost btn-sm" style={{ flex: 'none' }} onClick={i.action.run}>
              {i.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── crew management ──────────────────────────────────────────

function CrewPanel({
  db,
  updateTutor,
  removeTutor,
  addTutor,
}: {
  db: RelayState;
  updateTutor: ReturnType<typeof useStore>['updateTutor'];
  removeTutor: ReturnType<typeof useStore>['removeTutor'];
  addTutor: ReturnType<typeof useStore>['addTutor'];
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState('');
  const [gradeDraft, setGradeDraft] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [whenDraft, setWhenDraft] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { setTutorEmail, live, toast } = useStore();

  // add-a-friend form
  const [nName, setNName] = useState('');
  const [nEmail, setNEmail] = useState('');
  const [nGrade, setNGrade] = useState('');
  const [nSubjects, setNSubjects] = useState<SubjectId[]>([]);
  const canAdd =
    nName.trim().length > 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nEmail.trim()) &&
    nSubjects.length > 0;

  const submitNew = (e: FormEvent) => {
    e.preventDefault();
    if (!canAdd) return;
    addTutor({ name: nName, email: nEmail, grade: nGrade, subjects: nSubjects });
    setNName('');
    setNEmail('');
    setNGrade('');
    setNSubjects([]);
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <OnboardingTracker db={db} />

      <form className="card card-pad stack" style={{ gap: 14 }} onSubmit={submitNew}>
        <div>
          <h3 className="h3">Add a tutor</h3>
          <p className="muted small" style={{ marginTop: 4 }}>
            For friends who told you what they want to teach. They do not need to sign up
            themselves.{' '}
            {live
              ? 'They show up on the site straight away.'
              : 'This adds them on this device only; to show them to everyone, add them to src/lib/roster.ts.'}
          </p>
        </div>
        <div className="grid-2">
          <label className="field">
            <span className="label">Name</span>
            <input
              className="input"
              value={nName}
              onChange={(e) => setNName(e.target.value)}
              placeholder="Maya Krishnan"
            />
          </label>
          <label className="field">
            <span className="label">Email</span>
            <input
              className="input"
              type="email"
              value={nEmail}
              onChange={(e) => setNEmail(e.target.value)}
              placeholder="maya@school.org"
            />
          </label>
        </div>
        <label className="field">
          <span className="label">
            Grade <span className="muted">(optional)</span>
          </span>
          <input
            className="input"
            value={nGrade}
            onChange={(e) => setNGrade(e.target.value)}
            placeholder="11th grade"
          />
        </label>
        <div className="field">
          <span className="label">Subjects they can teach</span>
          <div className="optchips">
            {SUBJECTS.map((sub) => (
              <button
                type="button"
                key={sub.id}
                className={cx('optchip', nSubjects.includes(sub.id) && 'on')}
                onClick={() =>
                  setNSubjects((cur) =>
                    cur.includes(sub.id) ? cur.filter((x) => x !== sub.id) : [...cur, sub.id],
                  )
                }
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>
        <div className="row between">
          <span className="hint">
            {canAdd ? 'ready' : 'name, a valid email and one subject are required'}
          </span>
          <button className="btn btn-primary btn-sm" type="submit" disabled={!canAdd}>
            Add tutor
          </button>
        </div>
      </form>

    <div className="card card-pad">
      <p className="muted small" style={{ marginBottom: 10 }}>
        Taglines show on tutor cards — keep them human. Removing a tutor cancels their upcoming
        sessions; the past log (and everyone's hours) stays intact.
      </p>
      {db.tutors.filter((t) => t.active !== false).map((t) => {
        const s = tutorStats(db, t.id);
        const editing = editId === t.id;
        const removing = removingId === t.id;
        return (
          <div key={t.id} className="line-item" style={{ alignItems: 'flex-start' }}>
            <div className="row" style={{ gap: 12, minWidth: 0, flex: 1, alignItems: 'flex-start' }}>
              <span className="avatar" style={{ '--h': t.hue } as CSSProperties}>
                {initials(t.name)}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="row" style={{ gap: 8 }}>
                  <strong style={{ fontSize: 15.5 }}>{t.name}</strong>
                  {t.subjects.map((sub) => (
                    <span
                      key={sub}
                      className="chip"
                      data-subject={sub}
                      style={{ fontSize: 10.5, '--sub-h': subjectMeta(sub).hue } as CSSProperties}
                    >
                      {subjectShort(sub)}
                    </span>
                  ))}
                </div>
                <div className="mono" style={{ fontSize: 11.5, color: 'var(--muted)', margin: '3px 0 6px' }}>
                  {t.email ? `${t.email} · ` : ''}{s.hours}h · {plural(s.taught, 'session')} · {plural(s.kudosCount, 'kudo', 'kudos')}
                </div>
                {editing ? (
                  <div className="stack" style={{ gap: 8, maxWidth: 480 }}>
                    <input
                      className="input"
                      value={tagDraft}
                      onChange={(e) => setTagDraft(e.target.value)}
                      placeholder="Tagline"
                    />
                    <input
                      className="input"
                      value={gradeDraft}
                      onChange={(e) => setGradeDraft(e.target.value)}
                      placeholder="Grade / year"
                    />
                    <input
                      className="input"
                      value={whenDraft}
                      onChange={(e) => setWhenDraft(e.target.value)}
                      placeholder="When they're free, e.g. Tuesdays 6–8pm"
                    />
                    <input
                      className="input"
                      type="email"
                      value={emailDraft}
                      onChange={(e) => setEmailDraft(e.target.value)}
                      placeholder="Login email (private)"
                    />
                    <span className="hint">
                      the email they sign in with to post classes and change links. Never shown on
                      the site.
                    </span>
                    <div className="row">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          updateTutor(t.id, {
                            tagline: tagDraft.trim() || t.tagline,
                            grade: gradeDraft.trim() || t.grade,
                            availability: whenDraft.trim(),
                          });
                          const newEmail = emailDraft.trim().toLowerCase();
                          if (newEmail !== t.email.toLowerCase()) {
                            if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
                              toast("That login email doesn't look right, so it wasn't saved.");
                            } else if (
                              newEmail &&
                              db.tutors.some((x) => x.id !== t.id && x.email.toLowerCase() === newEmail)
                            ) {
                              toast('Another teacher already uses that login email.');
                            } else {
                              setTutorEmail(t.id, newEmail);
                            }
                          }
                          setEditId(null);
                        }}
                      >
                        Save
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="serif-i" style={{ fontSize: 15, color: 'var(--ink-2)' }}>
                    “{t.tagline}”
                  </p>
                )}
              </div>
            </div>
            {t.onRoster && !live && (
              <span className="hint" style={{ flex: 'none' }}>edit in roster.ts</span>
            )}
            {!editing && !t.onRoster && (
              <div className="row" style={{ flex: 'none' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setEditId(t.id);
                    setTagDraft(t.tagline);
                    setGradeDraft(t.grade);
                    setEmailDraft(t.email);
                    setWhenDraft(t.availability ?? '');
                    setRemovingId(null);
                  }}
                >
                  Edit
                </button>
                {removing ? (
                  <>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'var(--hot)', color: '#fff' }}
                      onClick={() => {
                        removeTutor(t.id);
                        setRemovingId(null);
                      }}
                    >
                      Confirm remove
                    </button>
                    <button className="btn-quiet" onClick={() => setRemovingId(null)}>
                      keep
                    </button>
                  </>
                ) : (
                  <button className="btn-quiet" onClick={() => setRemovingId(t.id)}>
                    remove
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

// ── onboarding tracker ───────────────────────────────────────

function OnboardingTracker({ db }: { db: RelayState }) {
  const { live } = useStore();
  const rows = db.tutors.filter((t) => t.active !== false && !t.isFounder).map((t) => {
    const s = tutorStats(db, t.id);
    const gaps = onboardingGaps(t);
    if (live && !t.email) gaps.push('login email');
    const stage =
      s.taught > 0
        ? 'teaching'
        : s.upcoming.length > 0
          ? 'first class posted'
          : gaps.length > 0
            ? 'needs info'
            : 'ready to schedule';
    return { t, gaps, stage };
  });

  return (
    <div className="card card-pad">
      <div className="row between" style={{ marginBottom: 6 }}>
        <h3 className="h3">Onboarding</h3>
        <span className="mono small muted">
          {rows.filter((r) => r.stage === 'teaching').length}/{rows.length} teaching
        </span>
      </div>
      <p className="muted small" style={{ marginBottom: 10, maxWidth: '64ch' }}>
        Everyone on the published roster and what they still need. A tutor is ready once we
        know what they are teaching, when they are free and what grade they are in. Then post
        their first class from Publish and send them the invite link.
      </p>
      {rows.map(({ t, gaps, stage }) => (
        <div key={t.id} className="line-item" style={{ alignItems: 'flex-start' }}>
          <div className="row" style={{ gap: 12, minWidth: 0, flex: 1, alignItems: 'flex-start' }}>
            <span className="avatar avatar-sm" style={{ '--h': t.hue } as CSSProperties}>
              {initials(t.name)}
            </span>
            <div style={{ minWidth: 0 }}>
              <strong style={{ fontSize: 15 }}>{t.name}</strong>
              <div className="small muted">
                {gaps.length > 0 ? `still need: ${gaps.join(', ')}` : t.availability}
              </div>
            </div>
          </div>
          <span
            className={cx(
              'status-pill',
              stage === 'needs info' ? 'status-pending' : 'status-approved',
            )}
            style={{ flex: 'none' }}
          >
            {stage}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── data backup / restore ────────────────────────────────────

function DataPanel({
  db,
  importData,
  resetData,
  toast,
}: {
  db: RelayState;
  importData: ReturnType<typeof useStore>['importData'];
  resetData: ReturnType<typeof useStore>['resetData'];
  toast: ReturnType<typeof useStore>['toast'];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const onExport = () => {
    downloadText(
      `peer2peer-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ version: SEED_VERSION, state: db }, null, 2),
      'application/json',
    );
    toast('Backup downloaded — keep it somewhere safe.');
  };

  const onImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const state = looksLikeState(parsed)
        ? parsed
        : looksLikeState((parsed as { state?: unknown })?.state)
          ? (parsed as { state: RelayState }).state
          : null;
      if (!state) {
        toast("That file doesn't look like a Peer 2 Peer backup.");
        return;
      }
      importData(state);
    } catch {
      toast("Couldn't read that file — is it the exported JSON?");
    }
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <p className="muted small">
        {LIVE ? (
          <>
            Everything lives in Supabase — {db.tutors.length} tutors, {db.sessions.length} sessions,{' '}
            {db.kudos.length} kudos, {db.applications.length} applications. Export downloads a copy
            for safekeeping; import and clearing only work in the offline version.
          </>
        ) : (
          <>
            The offline version keeps everything in <b>this browser's storage</b> — {db.tutors.length}{' '}
            tutors, {db.sessions.length} sessions, {db.kudos.length} kudos, {db.applications.length}{' '}
            applications. Export before switching devices or clearing the browser; import to restore.
          </>
        )}
      </p>

      <div className="grid-3">
        <div className="card card-pad stack" style={{ gap: 10 }}>
          <h3 className="h3">Export</h3>
          <p className="muted" style={{ fontSize: 13.5 }}>
            Download the whole board as a JSON backup.
          </p>
          <div>
            <button className="btn btn-primary btn-sm" onClick={onExport}>
              Download backup
            </button>
          </div>
        </div>

        <div className="card card-pad stack" style={{ gap: 10 }}>
          <h3 className="h3">Import</h3>
          <p className="muted" style={{ fontSize: 13.5 }}>
            Restore from a backup file. Replaces what's here now.
          </p>
          <div>
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
              Choose backup file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportFile(f);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        <div className="card card-pad stack" style={{ gap: 10 }}>
          <h3 className="h3">Start over</h3>
          <p className="muted" style={{ fontSize: 13.5 }}>
            Clear every tutor, session and note, back to an empty board.
          </p>
          <div className="row">
            {confirmReset ? (
              <>
                <button
                  className="btn btn-sm"
                  style={{ background: 'var(--hot)', color: '#fff' }}
                  onClick={() => {
                    resetData();
                    setConfirmReset(false);
                  }}
                >
                  Yes, clear it
                </button>
                <button className="btn-quiet" onClick={() => setConfirmReset(false)}>
                  keep
                </button>
              </>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmReset(true)}>
                Clear the board
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── publish form ─────────────────────────────────────────────

function ScheduleForm({
  onCreate,
  tutors,
}: {
  onCreate: ReturnType<typeof useStore>['createSession'];
  tutors: ReturnType<typeof useStore>['db']['tutors'];
}) {
  const { toast } = useStore();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<SubjectId>('python');
  const [level, setLevel] = useState<Level>('intro');
  const [tutorId, setTutorId] = useState(tutors[0]?.id ?? '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('17:00');
  const [duration, setDuration] = useState(60);
  const [capacity, setCapacity] = useState(12);
  const [link, setLink] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [minAge, setMinAge] = useState(DEFAULT_MIN_AGE);
  const [description, setDescription] = useState('');
  const [repeatWeeks, setRepeatWeeks] = useState(8);
  const linkErr = link.trim() ? meetingLinkError(link) : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 4 || !date || !tutorId || linkErr) return;
    const first = new Date(`${date}T${time}`);
    if (Number.isNaN(first.getTime()) || first.getTime() < Date.now()) {
      toast('Pick a date and time in the future.');
      return;
    }
    // one room for the whole series, so students keep the same link each week
    const room = link.trim() || freshJitsiLink(title);
    // same local time every week, for however many weeks were picked
    for (const startISO of weeklyStarts(first, repeatWeeks)) {
      onCreate({
        title: title.trim(),
        subject,
        level,
        description: description.trim() || 'A live session. Book a seat.',
        tutorId,
        startISO,
        durationMin: duration,
        capacity,
        link: room,
        meetingId: meetingId.trim() || undefined,
        passcode: passcode.trim() || undefined,
        minAge,
      });
    }
    setTitle('');
    setDescription('');
    setLink('');
    setMeetingId('');
    setPasscode('');
  };

  return (
    <div className="card card-pad">
      <h3 className="h3" style={{ marginBottom: 16 }}>
        Publish a session to the board
      </h3>
      <form className="stack" style={{ gap: 16 }} onSubmit={submit}>
        <label className="field">
          <span className="label">Title</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Loops that finally click" />
        </label>

        <div className="grid-2">
          <label className="field">
            <span className="label">Subject</span>
            <select className="select" value={subject} onChange={(e) => setSubject(e.target.value as SubjectId)}>
              {SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Level</span>
            <select className="select" value={level} onChange={(e) => setLevel(e.target.value as Level)}>
              <option value="intro">Intro friendly</option>
              <option value="intermediate">Intermediate</option>
              <option value="all">All levels</option>
            </select>
          </label>
        </div>

        <label className="field">
          <span className="label">Tutor</span>
          <select className="select" value={tutorId} onChange={(e) => setTutorId(e.target.value)}>
            {tutors.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid-2">
          <label className="field">
            <span className="label">Date</span>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Start time</span>
            <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span className="label">How often</span>
          <select className="select" value={repeatWeeks} onChange={(e) => setRepeatWeeks(Number(e.target.value))}>
            <option value={1}>Just once</option>
            <option value={2}>Every week, for 2 weeks</option>
            <option value={4}>Every week, for 4 weeks</option>
            <option value={6}>Every week, for 6 weeks</option>
            <option value={8}>Every week, for 8 weeks</option>
          </select>
        </label>

        <div className="grid-2">
          <label className="field">
            <span className="label">Duration (min)</span>
            <input className="input" type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </label>
          <label className="field">
            <span className="label">Capacity</span>
            <input className="input" type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
          </label>
        </div>

        <MeetingFields
          link={link}
          meetingId={meetingId}
          passcode={passcode}
          onLink={setLink}
          onMeetingId={setMeetingId}
          onPasscode={setPasscode}
        />

        <label className="field">
          <span className="label">Minimum age</span>
          <input
            className="input"
            type="number"
            min={5}
            max={25}
            value={minAge}
            onChange={(e) => setMinAge(Number(e.target.value) || DEFAULT_MIN_AGE)}
          />
          <span className="hint">students younger than this can't save a spot</span>
        </label>



        <label className="field">
          <span className="label">Description</span>
          <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will you cover? Keep it warm and beginner-friendly." />
        </label>

        <div className="row between">
          <span className="hint">blank link = a free Jitsi room is generated</span>
          <button className="btn btn-primary" type="submit" disabled={title.trim().length < 4 || !date || !!linkErr}>
            Publish session
          </button>
        </div>
      </form>
    </div>
  );
}

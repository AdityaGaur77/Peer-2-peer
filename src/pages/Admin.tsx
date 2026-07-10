import { useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { Reveal } from '../components/Reveal';
import { ADMIN_CODE, SEED_VERSION } from '../lib/config';
import {
  globalStats, pastSessions, tutorById, tutorStats, upcomingSessions, useStore,
} from '../lib/store';
import { SUBJECTS, type Level, type RelayState, type SubjectId } from '../lib/types';
import { cx, downloadText, fmtDate, fmtTime, initials, plural } from '../lib/util';

type Tab = 'overview' | 'applications' | 'sessions' | 'schedule' | 'crew' | 'data';

function looksLikeState(x: unknown): x is RelayState {
  if (!x || typeof x !== 'object') return false;
  const s = x as Record<string, unknown>;
  return ['tutors', 'sessions', 'applications', 'certifications', 'kudos', 'requests'].every(
    (k) => Array.isArray(s[k]),
  );
}

export function Admin() {
  const store = useStore();
  const {
    db, approveApplication, declineApplication, cancelSession, toast,
    updateTutor, removeTutor, importData, resetData,
  } = store;
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('relay.admin') === '1');
  const [code, setCode] = useState('');
  const [tab, setTab] = useState<Tab>('overview');

  const stats = globalStats(db);
  const pending = db.applications.filter((a) => a.status === 'pending');
  const upcoming = useMemo(() => upcomingSessions(db), [db]);
  const past = useMemo(() => pastSessions(db), [db]);

  if (!authed) {
    const tryCode = (e: FormEvent) => {
      e.preventDefault();
      if (code.trim() === ADMIN_CODE) {
        sessionStorage.setItem('relay.admin', '1');
        setAuthed(true);
        toast('Welcome back, founder.');
      } else {
        toast('Nope — wrong passcode.');
      }
    };
    return (
      <div className="section" style={{ paddingTop: 'clamp(120px, 16vw, 160px)' }}>
        <div className="container" style={{ maxWidth: 420 }}>
          <div className="card card-pad stack" style={{ gap: 16 }}>
            <div>
              <span className="eyebrow">founder console</span>
              <h2 className="h3" style={{ marginTop: 12 }}>
                Restricted to founders
              </h2>
            </div>
            <p className="muted" style={{ fontSize: 14.5 }}>
              This is where applications get reviewed and sessions get published. Enter the
              founder passcode to continue.
            </p>
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
            <p className="hint">demo passcode: {ADMIN_CODE} — change it in src/lib/config.ts</p>
          </div>
        </div>
      </div>
    );
  }

  const TABS: Array<{ id: Tab; label: string; badge?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'applications', label: 'Applications', badge: pending.length },
    { id: 'sessions', label: 'Live board' },
    { id: 'schedule', label: 'Publish' },
    { id: 'crew', label: 'Crew' },
    { id: 'data', label: 'Data' },
  ];

  return (
    <div className="section" style={{ paddingTop: 'clamp(110px, 15vw, 150px)' }}>
      <div className="container">
        <Reveal>
          <div className="row between" style={{ marginBottom: 24 }}>
            <div>
              <span className="eyebrow">founder console</span>
              <h2 className="h2" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.1rem)', marginTop: 10 }}>
                Mission control
              </h2>
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
              <div className="card" style={{ overflow: 'hidden' }}>
                <div className="stat-strip" style={{ borderBlock: 'none' }}>
                  <div className="stat">
                    <span className="stat-num">{stats.tutorCount}</span>
                    <span className="stat-label">tutors</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num">{upcoming.length}</span>
                    <span className="stat-label">upcoming sessions</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num">{stats.learnersHelped}</span>
                    <span className="stat-label">learners helped</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num">{pending.length}</span>
                    <span className="stat-label">pending applications</span>
                  </div>
                </div>
              </div>

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
                  <p className="muted small" style={{ marginTop: 8 }}>
                    Share the <b>/teach</b> page with your friends to get the founding crew rolling.
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
                          {a.email} · {a.grade} · teaches{' '}
                          {a.subjects.map((s) => SUBJECTS.find((x) => x.id === s)?.name).join(', ')}
                        </div>
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
            <div className="stack" style={{ gap: 12 }}>
              <p className="muted small">
                {plural(upcoming.length, 'upcoming session')} · {past.length} completed
              </p>
              {upcoming.map((s) => {
                const tutor = tutorById(db, s.tutorId);
                return (
                  <div key={s.id} className="card card-pad line-item" style={{ border: '1.5px solid var(--border)' }}>
                    <div className="row" style={{ gap: 12, minWidth: 0 }}>
                      {tutor && (
                        <span className="avatar avatar-sm" style={{ '--h': tutor.hue } as CSSProperties}>
                          {initials(tutor.name)}
                        </span>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{s.title}</div>
                        <div className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                          {fmtDate(s.startISO)} · {fmtTime(s.startISO)} · {tutor?.name ?? 'unassigned'} ·{' '}
                          {s.attendees.length}/{s.capacity} saved
                          {s.waitlist.length > 0 && ` · ${s.waitlist.length} waitlisted`}
                        </div>
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => cancelSession(s.id)}>
                      Cancel
                    </button>
                  </div>
                );
              })}
            </div>
          </Reveal>
        )}

        {tab === 'schedule' && (
          <Reveal>
            <ScheduleForm onCreate={store.createSession} tutors={db.tutors} />
          </Reveal>
        )}

        {tab === 'crew' && (
          <Reveal>
            <CrewPanel
              db={db}
              updateTutor={updateTutor}
              removeTutor={removeTutor}
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

// ── crew management ──────────────────────────────────────────

function CrewPanel({
  db,
  updateTutor,
  removeTutor,
}: {
  db: RelayState;
  updateTutor: ReturnType<typeof useStore>['updateTutor'];
  removeTutor: ReturnType<typeof useStore>['removeTutor'];
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState('');
  const [gradeDraft, setGradeDraft] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  return (
    <div className="card card-pad">
      <p className="muted small" style={{ marginBottom: 10 }}>
        Taglines show on tutor cards — keep them human. Removing a tutor cancels their upcoming
        sessions; the past log (and everyone's hours) stays intact.
      </p>
      {db.tutors.map((t) => {
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
                  {t.isFounder && <span className="chip chip-founder">Founder</span>}
                  {t.subjects.map((sub) => (
                    <span key={sub} className="chip" data-subject={sub} style={{ fontSize: 10.5 }}>
                      {sub === 'python' ? 'Python' : 'AI'}
                    </span>
                  ))}
                </div>
                <div className="mono" style={{ fontSize: 11.5, color: 'var(--muted)', margin: '3px 0 6px' }}>
                  {t.email} · {s.hours}h · {plural(s.taught, 'session')} · {plural(s.kudosCount, 'kudo', 'kudos')}
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
                    <div className="row">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          updateTutor(t.id, {
                            tagline: tagDraft.trim() || t.tagline,
                            grade: gradeDraft.trim() || t.grade,
                          });
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
            {!editing && (
              <div className="row" style={{ flex: 'none' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setEditId(t.id);
                    setTagDraft(t.tagline);
                    setGradeDraft(t.grade);
                    setRemovingId(null);
                  }}
                >
                  Edit
                </button>
                {removing ? (
                  <>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'var(--ember)', color: '#fff' }}
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
      `relay-backup-${new Date().toISOString().slice(0, 10)}.json`,
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
        toast("That file doesn't look like a Relay backup.");
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
        Relay's pilot keeps everything in <b>this browser's storage</b> — {db.tutors.length} tutors,{' '}
        {db.sessions.length} sessions, {db.kudos.length} kudos, {db.applications.length} applications.
        Export before switching devices or clearing the browser; import to restore.
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
          <h3 className="h3">Reset</h3>
          <p className="muted" style={{ fontSize: 13.5 }}>
            Wipe everything and reseed the demo data.
          </p>
          <div className="row">
            {confirmReset ? (
              <>
                <button
                  className="btn btn-sm"
                  style={{ background: 'var(--ember)', color: '#fff' }}
                  onClick={() => {
                    resetData();
                    setConfirmReset(false);
                  }}
                >
                  Yes, wipe it
                </button>
                <button className="btn-quiet" onClick={() => setConfirmReset(false)}>
                  keep
                </button>
              </>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmReset(true)}>
                Reset demo data
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
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<SubjectId>('python');
  const [level, setLevel] = useState<Level>('intro');
  const [tutorId, setTutorId] = useState(tutors[0]?.id ?? '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('17:00');
  const [duration, setDuration] = useState(60);
  const [capacity, setCapacity] = useState(12);
  const [link, setLink] = useState('');
  const [description, setDescription] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 4 || !date || !tutorId) return;
    const startISO = new Date(`${date}T${time}`).toISOString();
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32);
    onCreate({
      title: title.trim(),
      subject,
      level,
      description: description.trim() || 'A free live session — save your spot.',
      tutorId,
      startISO,
      durationMin: duration,
      capacity,
      link: link.trim() || `https://meet.jit.si/relay-${slug}`,
    });
    setTitle('');
    setDescription('');
    setLink('');
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

        <label className="field">
          <span className="label">
            Room link <span className="muted">(optional)</span>
          </span>
          <input
            className="input"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="paste a Meet/Zoom link, or leave blank for a free Jitsi room"
          />
        </label>

        <label className="field">
          <span className="label">Description</span>
          <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will you cover? Keep it warm and beginner-friendly." />
        </label>

        <div className="row between">
          <span className="hint">blank link = a free Jitsi room is generated</span>
          <button className="btn btn-primary" type="submit" disabled={title.trim().length < 4 || !date}>
            Publish session
          </button>
        </div>
      </form>
    </div>
  );
}

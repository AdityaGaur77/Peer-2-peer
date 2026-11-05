/* eslint-disable react-refresh/only-export-components */
import { Fragment, useMemo, useState, type CSSProperties } from 'react';
import { LinkEditor } from '../components/MeetingPanel';
import { ago, meetingProvider } from '../lib/meeting';
import { countsForHours } from '../lib/price';
import { pastSessions, tutorById, tutorStats, upcomingSessions, useStore } from '../lib/store';
import type { RelayState, Session, StudentRecord } from '../lib/types';
import { cx, fmtDate, fmtTime, initials, plural } from '../lib/util';

const DAY = 86_400_000;

/** Seats a student can't see the names behind (see lib/remote.ts). */
const isHidden = (email: string) => email.startsWith('hidden:');

// ── numbers ──────────────────────────────────────────────────

export function siteStats(db: RelayState, now = Date.now()) {
  const upcoming = upcomingSessions(db);
  const past = pastSessions(db);
  const thisWeek = upcoming.filter((s) => new Date(s.startISO).getTime() - now < 7 * DAY);
  const seats = upcoming.reduce((n, s) => n + s.attendees.length, 0);
  const capacity = upcoming.reduce((n, s) => n + s.capacity, 0);
  const learners = new Set(
    past.flatMap((s) => s.attendees.map((a) => a.email)).filter((e) => !isHidden(e)),
  );
  const everyone = new Set(
    db.sessions.flatMap((s) => [...s.attendees, ...s.waitlist].map((a) => a.email)).filter((e) => !isHidden(e)),
  );
  return {
    students: db.students
      ? db.students.filter((s) => s.role !== 'tutor').length
      : everyone.size,
    teachers: db.tutors.filter((t) => t.active !== false).length,
    upcoming: upcoming.length,
    thisWeek: thisWeek.length,
    seats,
    fill: capacity ? Math.round((seats / capacity) * 100) : 0,
    waitlisted: upcoming.reduce((n, s) => n + s.waitlist.length, 0),
    completed: past.length,
    hours: Math.round(past.filter(countsForHours).reduce((n, s) => n + s.durationMin, 0) / 6) / 10,
    learners: learners.size,
    pendingApps: db.applications.filter((a) => a.status === 'pending').length,
    linkChanges: db.sessions.filter(
      (s) => s.linkUpdatedISO && now - new Date(s.linkUpdatedISO).getTime() < 7 * DAY,
    ).length,
  };
}

export function StatsPanel({ db }: { db: RelayState }) {
  const st = siteStats(db);
  const tiles: Array<[string | number, string]> = [
    [st.students, 'students signed up'],
    [st.teachers, 'active teachers'],
    [st.thisWeek, 'classes this week'],
    [`${st.fill}%`, 'of upcoming seats filled'],
    [st.seats, 'spots saved'],
    [st.waitlisted, 'on a waitlist'],
    [st.completed, 'classes taught'],
    [st.hours, 'volunteer hours'],
  ];
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="stat-grid">
        {tiles.map(([n, label]) => (
          <div className="stat" key={label}>
            <span className="stat-num">{n}</span>
            <span className="stat-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Things someone on the team should look at today. */
export function AttentionPanel({ db, live }: { db: RelayState; live: boolean }) {
  const now = Date.now();
  const upcoming = upcomingSessions(db);
  const items: Array<{ tone: 'hot' | 'warn' | 'ok'; text: string }> = [];

  for (const s of upcoming) {
    const t = tutorById(db, s.tutorId);
    const soon = new Date(s.startISO).getTime() - now;
    const when = `${fmtDate(s.startISO)} ${fmtTime(s.startISO)}`;
    if (!s.link && soon < 7 * DAY) {
      items.push({ tone: 'hot', text: `"${s.title}" (${when}) has no meeting link yet.` });
    }
    if (soon < 2 * DAY && s.attendees.length === 0) {
      items.push({
        tone: 'warn',
        text: `"${s.title}" (${when}) has nobody signed up. Share it, or ask ${t?.name ?? 'the teacher'} whether to move it.`,
      });
    }
    if (s.waitlist.length > 0) {
      items.push({
        tone: 'ok',
        text: `"${s.title}" is full with ${plural(s.waitlist.length, 'person', 'people')} waiting. Worth adding a second time slot.`,
      });
    }
  }

  const pending = db.applications.filter((a) => a.status === 'pending').length;
  if (pending > 0) items.push({ tone: 'warn', text: `${plural(pending, 'teacher application')} waiting for a decision.` });

  for (const t of db.tutors.filter((x) => x.active !== false && !x.isFounder)) {
    if (live && !t.email) {
      items.push({
        tone: 'warn',
        text: `${t.name} has no login email, so they can't sign in to post classes or change links. Add it under Teachers.`,
      });
    } else if (!upcoming.some((s) => s.tutorId === t.id)) {
      items.push({ tone: 'ok', text: `${t.name} has no classes scheduled.` });
    }
  }

  return (
    <div className="card card-pad">
      <div className="row between" style={{ marginBottom: 6 }}>
        <h3 className="h3">Needs attention</h3>
        <span className={cx('status-pill', items.some((i) => i.tone === 'hot') ? 'status-declined' : items.length ? 'status-pending' : 'status-approved')}>
          {items.length ? plural(items.length, 'item') : 'all clear'}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="muted small">Nothing right now. Every class has a link and people signed up.</p>
      ) : (
        items.slice(0, 12).map((i, n) => (
          <div key={n} className="line-item" style={{ padding: '10px 0', alignItems: 'flex-start' }}>
            <span
              className="mono"
              style={{
                flex: 'none',
                fontWeight: 800,
                color: i.tone === 'hot' ? 'var(--hot-deep)' : i.tone === 'warn' ? 'var(--ink-2)' : 'var(--ember-deep)',
              }}
            >
              {i.tone === 'hot' ? '!' : i.tone === 'warn' ? '•' : '+'}
            </span>
            <span style={{ fontSize: 14.5, flex: 1 }}>{i.text}</span>
          </div>
        ))
      )}
    </div>
  );
}

export function TeacherTable({ db }: { db: RelayState }) {
  const rows = db.tutors
    .filter((t) => t.active !== false)
    .map((t) => {
      const s = tutorStats(db, t.id);
      const seats = s.upcoming.reduce((n, x) => n + x.attendees.length, 0);
      const cap = s.upcoming.reduce((n, x) => n + x.capacity, 0);
      const avg = s.past.length
        ? Math.round((s.past.reduce((n, x) => n + x.attendees.length, 0) / s.past.length) * 10) / 10
        : 0;
      return { t, s, fill: cap ? Math.round((seats / cap) * 100) : null, avg };
    });

  return (
    <div className="card card-pad" style={{ overflowX: 'auto' }}>
      <h3 className="h3" style={{ marginBottom: 12 }}>
        How each teacher is doing
      </h3>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Teacher</th>
            <th>Upcoming</th>
            <th>Seats filled</th>
            <th>Taught</th>
            <th>Avg. students</th>
            <th>Hours</th>
            <th>Thanks</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ t, s, fill, avg }) => (
            <tr key={t.id}>
              <td>
                <span className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                  <span className="avatar avatar-sm" style={{ '--h': t.hue } as CSSProperties}>
                    {initials(t.name)}
                  </span>
                  {t.name}
                </span>
              </td>
              <td>{s.upcoming.length}</td>
              <td>{fill === null ? '—' : `${fill}%`}</td>
              <td>{s.taught}</td>
              <td>{avg || '—'}</td>
              <td>{s.hours}</td>
              <td>{s.kudosCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── classes ──────────────────────────────────────────────────

function ClassRow({ s, db }: { s: Session; db: RelayState }) {
  const { cancelSession, removeFromClass } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const tutor = tutorById(db, s.tutorId);
  const provider = s.link ? meetingProvider(s.link) : null;

  return (
    <div className="card card-pad" style={{ display: 'grid', gap: 10 }}>
      <div className="line-item" style={{ padding: 0, border: 0, alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 12, minWidth: 0, flex: 1, alignItems: 'flex-start' }}>
          {tutor && (
            <span className="avatar avatar-sm" style={{ '--h': tutor.hue } as CSSProperties}>
              {initials(tutor.name)}
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{s.title}</div>
            <div className="small muted">
              {fmtDate(s.startISO)} · {fmtTime(s.startISO)} · {tutor?.name ?? 'no teacher'} ·{' '}
              {s.attendees.length}/{s.capacity} signed up
              {s.waitlist.length > 0 && ` · ${s.waitlist.length} waiting`}
              {s.minAge ? ` · ages ${s.minAge}+` : ''}
            </div>
            <div className="small" style={{ marginTop: 3 }}>
              {s.link ? (
                <>
                  {provider ?? 'link'} link
                  {s.meetingId && ` · ID ${s.meetingId}`}
                  {s.passcode && ' · has passcode'}
                  {s.linkUpdatedISO && (
                    <span style={{ color: 'var(--hot-deep)' }}> · changed {ago(s.linkUpdatedISO)}</span>
                  )}
                </>
              ) : (
                <span style={{ color: 'var(--hot-deep)' }}>no meeting link</span>
              )}
            </div>
          </div>
        </div>
        <div className="row" style={{ flex: 'none' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide list' : 'Who signed up'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
            Link
          </button>
          {confirmCancel ? (
            <>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--hot)', color: '#fff' }}
                onClick={() => cancelSession(s.id)}
              >
                Confirm cancel
              </button>
              <button className="btn-quiet" onClick={() => setConfirmCancel(false)}>
                keep
              </button>
            </>
          ) : (
            <button className="btn-quiet" onClick={() => setConfirmCancel(true)}>
              cancel class
            </button>
          )}
        </div>
      </div>
      {open && (
        <div className="stack" style={{ gap: 4, paddingLeft: 4 }}>
          {s.attendees.length + s.waitlist.length === 0 && (
            <span className="small muted">Nobody yet.</span>
          )}
          {[...s.attendees.map((a) => ({ ...a, wait: false })), ...s.waitlist.map((a) => ({ ...a, wait: true }))]
            .filter((a) => !isHidden(a.email))
            .map((a) => (
              <div key={a.email} className="row between" style={{ fontSize: 14 }}>
                <span>
                  {a.name || a.email} <span className="muted small">{a.email}</span>
                  {a.wait && <span className="chip chip-ghost" style={{ marginLeft: 6 }}>waiting</span>}
                </span>
                <button className="btn-quiet" onClick={() => removeFromClass(s.id, a.email)}>
                  remove
                </button>
              </div>
            ))}
        </div>
      )}
      {editing && <LinkEditor session={s} onClose={() => setEditing(false)} />}
    </div>
  );
}

export function ClassesPanel({ db }: { db: RelayState }) {
  const upcoming = useMemo(() => upcomingSessions(db), [db]);
  const past = useMemo(() => pastSessions(db), [db]);
  return (
    <div className="stack" style={{ gap: 12 }}>
      <p className="muted small">
        {plural(upcoming.length, 'upcoming class', 'upcoming classes')} · {past.length} completed.
        Open a class to see who signed up.
      </p>
      {upcoming.map((s) => (
        <ClassRow key={s.id} s={s} db={db} />
      ))}
    </div>
  );
}

// ── students ─────────────────────────────────────────────────

export function StudentsPanel({ db, live }: { db: RelayState; live: boolean }) {
  const { setStudentBlocked, removeFromClass } = useStore();
  const [q, setQ] = useState('');
  const [openEmail, setOpenEmail] = useState<string | null>(null);
  const now = Date.now();

  const people: StudentRecord[] = useMemo(() => {
    if (db.students) return db.students;
    // offline: everyone who has saved a spot on this board
    const seen = new Map<string, StudentRecord>();
    for (const s of db.sessions) {
      for (const a of [...s.attendees, ...s.waitlist]) {
        if (!isHidden(a.email) && !seen.has(a.email)) seen.set(a.email, { email: a.email, name: a.name });
      }
    }
    return [...seen.values()];
  }, [db]);

  const rows = people
    .filter((p) => !q || `${p.name} ${p.email}`.toLowerCase().includes(q.toLowerCase()))
    .map((p) => {
      const mine = db.sessions.filter(
        (s) => s.status === 'scheduled' && [...s.attendees, ...s.waitlist].some((a) => a.email === p.email),
      );
      const upcoming = mine.filter((s) => new Date(s.startISO).getTime() > now);
      const attended = mine.filter(
        (s) => new Date(s.startISO).getTime() <= now && s.attendees.some((a) => a.email === p.email),
      );
      return { p, upcoming, attended };
    })
    .sort((a, b) => (b.p.joinedISO ?? '').localeCompare(a.p.joinedISO ?? ''));

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="row between">
        <input
          className="input"
          style={{ maxWidth: 320 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email"
        />
        <span className="small muted">{plural(people.length, 'person', 'people')}</span>
      </div>
      {!live && (
        <p className="hint">
          Offline mode only knows about people who saved a spot on this device. Connect Supabase to
          see everyone.
        </p>
      )}
      <div className="card card-pad" style={{ overflowX: 'auto' }}>
        {rows.length === 0 ? (
          <p className="muted small">No students yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
                <th>Joined</th>
                <th>Upcoming</th>
                <th>Attended</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, upcoming, attended }) => (
                <Fragment key={p.email}>
                  <tr className={cx(p.blocked && 'row-blocked')}>
                    <td>
                      <button className="link-btn" onClick={() => setOpenEmail(openEmail === p.email ? null : p.email)}>
                        {p.name || p.email}
                      </button>
                      <div className="small muted">{p.email}</div>
                      {p.role === 'tutor' && <span className="chip chip-ghost">teacher</span>}
                      {p.blocked && <span className="chip chip-ghost">blocked</span>}
                    </td>
                    <td>{p.age ?? '—'}</td>
                    <td>{p.joinedISO ? fmtDate(p.joinedISO) : '—'}</td>
                    <td>{upcoming.length}</td>
                    <td>{attended.length}</td>
                    <td>
                      {live && (
                        <button className="btn-quiet" onClick={() => setStudentBlocked(p.email, !p.blocked)}>
                          {p.blocked ? 'unblock' : 'block'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {openEmail === p.email && (
                    <tr>
                      <td colSpan={6}>
                        {upcoming.length === 0 ? (
                          <span className="small muted">No upcoming classes.</span>
                        ) : (
                          upcoming.map((s) => (
                            <div key={s.id} className="row between" style={{ fontSize: 14, padding: '4px 0' }}>
                              <span>
                                {s.title} <span className="muted small">{fmtDate(s.startISO)} {fmtTime(s.startISO)}</span>
                              </span>
                              <button className="btn-quiet" onClick={() => removeFromClass(s.id, p.email)}>
                                take off this class
                              </button>
                            </div>
                          ))
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

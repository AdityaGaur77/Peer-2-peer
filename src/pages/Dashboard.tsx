import { useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KudosModal } from '../components/KudosModal';
import { Reveal } from '../components/Reveal';
import { SessionCard } from '../components/SessionCard';
import {
  attendedSessions, certsFor, tutorByEmail, tutorById, tutorStats, upcomingSessions, useStore,
} from '../lib/store';
import type { Tutor } from '../lib/types';
import { subjectMeta } from '../lib/types';
import { fmtDate, fmtLongDate, initials, plural } from '../lib/util';

export function Dashboard() {
  const { db, profile, openSignIn, signOut } = useStore();
  const navigate = useNavigate();
  const [thanking, setThanking] = useState<Tutor | null>(null);

  const tutor = profile ? tutorByEmail(db, profile.email) : undefined;
  const certs = profile ? certsFor(db, profile.email) : [];
  const stats = useMemo(() => (tutor ? tutorStats(db, tutor.id) : null), [db, tutor]);

  const myRsvps = useMemo(
    () =>
      profile
        ? upcomingSessions(db).filter((s) => s.attendees.some((a) => a.email === profile.email))
        : [],
    [db, profile],
  );

  const attended = useMemo(
    () => (profile ? attendedSessions(db, profile.email) : []),
    [db, profile],
  );

  if (!profile) {
    return (
      <div className="section" style={{ paddingTop: 'clamp(120px, 16vw, 160px)', textAlign: 'center' }}>
        <div className="container stack" style={{ gap: 18, maxWidth: 440, margin: '0 auto' }}>
          <h2 className="h2">Your dashboard</h2>
          <p className="lede" style={{ margin: '0 auto' }}>
            Sign in to see your saved sessions, certifications, and — if you're a tutor — your
            volunteer hours.
          </p>
          <div>
            <button className="btn btn-primary" onClick={() => openSignIn()}>
              Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section" style={{ paddingTop: 'clamp(110px, 15vw, 150px)' }}>
      <div className="container">
        {/* header */}
        <Reveal>
          <div className="row between" style={{ marginBottom: 30 }}>
            <div className="row" style={{ gap: 16 }}>
              <span className="avatar avatar-lg" style={{ '--h': tutor?.hue ?? 30 } as CSSProperties}>
                {initials(profile.name)}
              </span>
              <div>
                <h2 className="h2" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.1rem)' }}>
                  Hey, {profile.name.split(' ')[0]}.
                </h2>
                <p className="mono small muted">
                  {tutor ? `${tutor.grade} · Relay tutor` : 'Relay learner'} · {profile.email}
                </p>
              </div>
            </div>
            <button className="btn-quiet" onClick={signOut}>
              sign out
            </button>
          </div>
        </Reveal>

        {/* tutor stats band */}
        {tutor && stats && (
          <Reveal delay={0.06}>
            <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
              <div className="stat-strip" style={{ borderBlock: 'none' }}>
                <div className="stat">
                  <span className="stat-num">{stats.hours}</span>
                  <span className="stat-label">volunteer hours</span>
                </div>
                <div className="stat">
                  <span className="stat-num">{stats.taught}</span>
                  <span className="stat-label">sessions taught</span>
                </div>
                <div className="stat">
                  <span className="stat-num">{stats.learners}</span>
                  <span className="stat-label">learners reached</span>
                </div>
                <div className="stat">
                  <span className="stat-num">{stats.kudosCount}</span>
                  <span className="stat-label">kudos received</span>
                </div>
              </div>
              <div className="row between" style={{ padding: '16px 22px', borderTop: '1.5px dashed var(--border-strong)' }}>
                <span className="mono small muted">
                  {stats.firstISO
                    ? `tutoring since ${fmtLongDate(stats.firstISO)}`
                    : 'your teaching journey starts with your first session'}
                </span>
                <Link to="/certificate" className="btn btn-primary btn-sm">
                  Get volunteer certificate
                </Link>
              </div>
            </div>
          </Reveal>
        )}

        {/* certifications */}
        <Reveal delay={0.1}>
          <div className="card card-pad" style={{ marginBottom: 24 }}>
            <div className="row between" style={{ marginBottom: 14 }}>
              <h3 className="h3">Your certifications</h3>
              <Link to="/teach" className="btn-quiet">
                {certs.length > 0 ? 'certify in more →' : 'get certified →'}
              </Link>
            </div>
            {certs.length === 0 ? (
              <p className="muted" style={{ fontSize: 15 }}>
                No certifications yet. Pass a subject quiz on the{' '}
                <Link to="/teach" style={{ color: 'var(--ember-deep)', borderBottom: '1.5px dotted' }}>
                  Teach
                </Link>{' '}
                page and you're cleared to tutor it.
              </p>
            ) : (
              <div className="row" style={{ gap: 10 }}>
                {certs.map((c) => (
                  <div key={c.subject} className="chip chip-cert" data-subject={c.subject} style={{ padding: '9px 16px' }}>
                    {subjectMeta(c.subject).name} · {c.score}/{c.total}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {/* my saved sessions */}
        <Reveal delay={0.14}>
          <div style={{ marginBottom: 24 }}>
            <div className="row between" style={{ marginBottom: 14 }}>
              <h3 className="h3">Sessions you're going to</h3>
              <Link to="/sessions" className="btn-quiet">
                browse all →
              </Link>
            </div>
            {myRsvps.length === 0 ? (
              <div className="card card-pad" style={{ textAlign: 'center' }}>
                <p className="muted" style={{ fontSize: 15 }}>
                  You haven't saved a spot yet. The board is full of free sessions —{' '}
                  <Link to="/sessions" style={{ color: 'var(--ember-deep)', borderBottom: '1.5px dotted' }}>
                    go grab one
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div className="stack" style={{ gap: 14 }}>
                {myRsvps.map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {/* where you've been — with a thank-you loop */}
        {attended.length > 0 && (
          <Reveal delay={0.16}>
            <div className="card card-pad" style={{ marginBottom: 24 }}>
              <div className="row between" style={{ marginBottom: 6 }}>
                <h3 className="h3">Sessions you attended</h3>
                <span className="mono small muted">{plural(attended.length, 'session')}</span>
              </div>
              <p className="muted small" style={{ marginBottom: 10 }}>
                Got something out of one? A thank-you note is the only payment tutors get.
              </p>
              {attended.slice(0, 6).map((s) => {
                const t = tutorById(db, s.tutorId);
                return (
                  <div key={s.id} className="line-item" style={{ padding: '11px 0' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 580 }}>{s.title}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {fmtDate(s.startISO)}
                        {t ? ` · with ${t.name}` : ''}
                      </div>
                    </div>
                    {t && (
                      <button className="btn btn-soft btn-sm" onClick={() => setThanking(t)}>
                        ♥ thank {t.name.split(' ')[0]}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Reveal>
        )}

        {/* tutor's own upcoming */}
        {tutor && stats && stats.upcoming.length > 0 && (
          <Reveal delay={0.18}>
            <div style={{ marginBottom: 24 }}>
              <h3 className="h3" style={{ marginBottom: 14 }}>
                Sessions you're teaching
              </h3>
              <div className="stack" style={{ gap: 14 }}>
                {stats.upcoming.map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* not-a-tutor nudge */}
        {!tutor && (
          <Reveal delay={0.2}>
            <div className="cta-band">
              <span className="eyebrow" style={{ color: '#a29b87' }}>
                ready for the next leg?
              </span>
              <h3 className="h3" style={{ maxWidth: 480 }}>
                You've learned something here. Teaching it is how it sticks — and it's how you log
                real volunteer hours.
              </h3>
              <button className="btn btn-band-light" onClick={() => navigate('/teach')}>
                Become a tutor
              </button>
            </div>
          </Reveal>
        )}
      </div>

      {thanking && <KudosModal tutor={thanking} onClose={() => setThanking(null)} />}
    </div>
  );
}

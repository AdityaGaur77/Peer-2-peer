import { Link } from 'react-router-dom';
import { Reveal } from '../components/Reveal';
import { Wordmark } from '../components/Logo';
import { FOUNDER_NAME } from '../lib/config';
import { certsFor, tutorByEmail, tutorStats, useStore } from '../lib/store';
import { subjectMeta } from '../lib/types';
import { fmtLongDate, plural } from '../lib/util';

export function Certificate() {
  const { db, profile, openSignIn } = useStore();
  const tutor = profile ? tutorByEmail(db, profile.email) : undefined;
  const stats = tutor ? tutorStats(db, tutor.id, true) : null;
  const certs = profile ? certsFor(db, profile.email) : [];

  if (!profile) {
    return (
      <div className="section" style={{ paddingTop: 'clamp(120px, 16vw, 160px)', textAlign: 'center' }}>
        <div className="container stack" style={{ gap: 18, maxWidth: 440, margin: '0 auto' }}>
          <h1 className="h2">Volunteer certificate</h1>
          <p className="lede" style={{ margin: '0 auto' }}>
            Sign in with your teacher email to get a certificate of your volunteer hours.
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

  if (!tutor || !stats || stats.taught === 0) {
    return (
      <div className="section" style={{ paddingTop: 'clamp(120px, 16vw, 160px)', textAlign: 'center' }}>
        <div className="container stack" style={{ gap: 18, maxWidth: 480, margin: '0 auto' }}>
          <h1 className="h2">No hours yet</h1>
          <p className="lede" style={{ margin: '0 auto' }}>
            Your certificate fills in once you've taught your first class. Apply to teach, get
            approved, and post a class. We count the hours for you.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link to="/teach" className="btn btn-primary">
              Teach a class
            </Link>
            <Link to="/dashboard" className="btn btn-ghost">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const range =
    stats.firstISO && stats.lastISO
      ? `${fmtLongDate(stats.firstISO)} — ${fmtLongDate(stats.lastISO)}`
      : 'ongoing';

  return (
    <div className="section" style={{ paddingTop: 'clamp(110px, 15vw, 150px)' }}>
      <div className="container">
        <h1 className="sr-only">Volunteer certificate for {profile.name}</h1>
        <Reveal>
          <div className="row between no-print" style={{ marginBottom: 24 }}>
            <div>
              <p className="muted small" style={{ marginTop: 8 }}>
                Generated live from your logged sessions. Print it or save as PDF.
              </p>
            </div>
            <div className="row">
              <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
                Print / Save PDF
              </button>
              <Link to="/dashboard" className="btn-quiet">
                back
              </Link>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="cert">
            <div className="stack" style={{ gap: 26 }}>
              <div className="row between">
                <Wordmark size={24} />
                <span className="mono small muted">no. {tutor.id.slice(-6).toUpperCase()}</span>
              </div>

              <div className="stack" style={{ gap: 6 }}>
                <span className="mono" style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  This certifies that
                </span>
                <div className="cert-name">{profile.name}</div>
                <div className="cert-rule" />
              </div>

              <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--ink-2)', maxWidth: '54ch' }}>
                volunteered as a tutor with Peer 2 Peer, a free tutoring program run by students,
                contributing{' '}
                <b style={{ color: 'var(--ink)' }}>{plural(stats.hours, 'hour')}</b> of instruction
                across <b style={{ color: 'var(--ink)' }}>{plural(stats.taught, 'online class', 'online classes')}</b>{' '}
                and reaching <b style={{ color: 'var(--ink)' }}>{plural(stats.learners, 'student')}</b>
                {certs.length > 0 && (
                  <>
                    {' '}in{' '}
                    <b style={{ color: 'var(--ink)' }}>
                      {certs.map((c) => subjectMeta(c.subject).name.split(' ')[0]).join(' & ')}
                    </b>
                  </>
                )}
                . All hours were volunteered.
              </p>

              <div className="stat-strip" style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 12, overflow: 'hidden' }}>
                <div className="stat">
                  <span className="stat-num" style={{ fontSize: '1.8rem' }}>
                    {stats.hours}
                  </span>
                  <span className="stat-label">hours</span>
                </div>
                <div className="stat">
                  <span className="stat-num" style={{ fontSize: '1.8rem' }}>
                    {stats.taught}
                  </span>
                  <span className="stat-label">classes</span>
                </div>
                <div className="stat">
                  <span className="stat-num" style={{ fontSize: '1.8rem' }}>
                    {stats.learners}
                  </span>
                  <span className="stat-label">students</span>
                </div>
                <div className="stat">
                  <span className="stat-num" style={{ fontSize: '1.8rem' }}>
                    {stats.kudosCount}
                  </span>
                  <span className="stat-label">thank-yous</span>
                </div>
              </div>

              <div className="row between" style={{ marginTop: 10, alignItems: 'flex-end' }}>
                <div className="sig-line">
                  <span className="serif-i" style={{ fontSize: 22 }}>
                    {FOUNDER_NAME}
                  </span>
                  <div className="mono small muted" style={{ marginTop: 2 }}>
                    Peer 2 Peer
                  </div>
                </div>
                <div className="mono small muted" style={{ textAlign: 'right' }}>
                  <div>Dates</div>
                  <div style={{ color: 'var(--ink-2)' }}>{range}</div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="muted small no-print" style={{ textAlign: 'center', marginTop: 20, maxWidth: '52ch', marginInline: 'auto' }}>
            This certificate comes from Peer 2 Peer's class records. If you need a signed copy for
            a college or scholarship application, email the team.
          </p>
        </Reveal>
      </div>
    </div>
  );
}

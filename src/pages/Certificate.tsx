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
  const stats = tutor ? tutorStats(db, tutor.id) : null;
  const certs = profile ? certsFor(db, profile.email) : [];

  if (!profile) {
    return (
      <div className="section" style={{ paddingTop: 'clamp(120px, 16vw, 160px)', textAlign: 'center' }}>
        <div className="container stack" style={{ gap: 18, maxWidth: 440, margin: '0 auto' }}>
          <h2 className="h2">Volunteer certificate</h2>
          <p className="lede" style={{ margin: '0 auto' }}>
            Sign in with your tutor email to generate a service certificate backed by your logged
            session hours.
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
          <span className="serif-i" style={{ fontSize: 26, color: 'var(--ink-2)' }}>
            No hours logged yet.
          </span>
          <p className="lede" style={{ margin: '0 auto' }}>
            Your certificate fills in automatically once you've taught your first session. Certify
            in a subject, get approved, and host a session — Relay tracks the rest.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link to="/teach" className="btn btn-primary">
              Become a tutor
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
        <Reveal>
          <div className="row between no-print" style={{ marginBottom: 24 }}>
            <div>
              <span className="eyebrow">certificate of service</span>
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
                volunteered as a peer tutor with Relay, a free student-run tutoring community,
                contributing{' '}
                <b style={{ color: 'var(--ink)' }}>{plural(stats.hours, 'hour')}</b> of instruction
                across <b style={{ color: 'var(--ink)' }}>{plural(stats.taught, 'live session')}</b>{' '}
                and reaching <b style={{ color: 'var(--ink)' }}>{plural(stats.learners, 'student')}</b>
                {certs.length > 0 && (
                  <>
                    {' '}in{' '}
                    <b style={{ color: 'var(--ink)' }}>
                      {certs.map((c) => subjectMeta(c.subject).name.split(' ')[0]).join(' & ')}
                    </b>
                  </>
                )}
                . Every hour was given freely, in the spirit of passing knowledge on.
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
                  <span className="stat-label">sessions</span>
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
                  <span className="stat-label">kudos</span>
                </div>
              </div>

              <div className="row between" style={{ marginTop: 10, alignItems: 'flex-end' }}>
                <div className="sig-line">
                  <span className="serif-i" style={{ fontSize: 22 }}>
                    {FOUNDER_NAME}
                  </span>
                  <div className="mono small muted" style={{ marginTop: 2 }}>
                    Founder, Relay
                  </div>
                </div>
                <div className="mono small muted" style={{ textAlign: 'right' }}>
                  <div>service period</div>
                  <div style={{ color: 'var(--ink-2)' }}>{range}</div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="muted small no-print" style={{ textAlign: 'center', marginTop: 20, maxWidth: '52ch', marginInline: 'auto' }}>
            This certificate is generated from Relay's live session log. For an official
            countersigned copy for college or scholarship applications, mention it to a founder.
          </p>
        </Reveal>
      </div>
    </div>
  );
}

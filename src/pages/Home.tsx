import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { KudosMarquee } from '../components/KudosMarquee';
import { RelayChain } from '../components/RelayChain';
import { Reveal } from '../components/Reveal';
import { globalStats, isDayOne, subjectSessions, upcomingSessions, useStore } from '../lib/store';
import { SUBJECTS, subjectShort } from '../lib/types';
import { fmtRelativeDay, fmtTime, plural } from '../lib/util';

export function Home() {
  const { db } = useStore();
  const stats = globalStats(db);
  const dayOne = isDayOne(db);
  const upcomingCount = upcomingSessions(db).length;
  const withSessions = SUBJECTS.filter((s) => subjectSessions(db, s.id).length > 0);
  const [toured, setToured] = useState(() => localStorage.getItem('relay.toured') === '1');
  const dismissTour = () => {
    localStorage.setItem('relay.toured', '1');
    setToured(true);
  };

  return (
    <>
      {/* ── hero ── */}
      <header className="hero">
        <div className="container">
          <div className="hero-inner">
            <Reveal>
              <span className="eyebrow">free · peer-to-peer · student-run</span>
            </Reveal>
            <Reveal delay={0.07}>
              <h1 className="display">
                Learn from a student who <em className="em-ember">just figured it out.</em>
              </h1>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="lede">
                Relay is free tutoring run by students. Book a live session, get help from
                someone a year or two ahead of you, and teach it forward once it clicks. Nothing
                to pay, nothing to upgrade to.
              </p>
            </Reveal>
            <Reveal delay={0.21}>
              <div className="row">
                <Link to="/sessions" className="btn btn-primary">
                  Find a free session
                </Link>
                <Link to="/teach" className="btn btn-ghost">
                  Become a tutor
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.28}>
              <p className="hero-foot">
                I used to charge $15 a class for this.{' '}
                <Link to="/about">here's why I stopped</Link>
              </p>
            </Reveal>
            {!toured && (
              <Reveal delay={0.32}>
                <div className="welcome-card">
                  <span>
                    <b>New here?</b> There is a{' '}
                    <Link to="/guide/student">two-minute walkthrough</Link>, or you can{' '}
                    <Link to="/guide/tutor">set up a class</Link> if you would rather teach.
                  </span>
                  <button className="welcome-x" onClick={dismissTour} aria-label="Dismiss">
                    ✕ dismiss
                  </button>
                </div>
              </Reveal>
            )}
          </div>

          <Reveal delay={0.3}>
            <RelayChain />
          </Reveal>
        </div>
      </header>

      {/* ── live stats — real counts, or honest day-one framing ── */}
      <section className="section-tight">
        <div className="container">
          <Reveal>
            <div className="stat-strip">
              {dayOne ? (
                <>
                  <div className="stat">
                    <span className="stat-num">{upcomingCount}</span>
                    <span className="stat-label">sessions on the board</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num">{stats.tutorCount}</span>
                    <span className="stat-label">
                      {plural(stats.tutorCount, 'tutor')} ready to teach
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-num">
                      $0<sup>*</sup>
                    </span>
                    <span className="stat-label">no fees, ever</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num">day 01</span>
                    <span className="stat-label">and you're early</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="stat">
                    <span className="stat-num">{stats.sessionsHosted}</span>
                    <span className="stat-label">sessions hosted</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num">{stats.learnersHelped}</span>
                    <span className="stat-label">learners helped</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num">{stats.volunteerHours}h</span>
                    <span className="stat-label">hours volunteered</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num">
                      $0<sup>*</sup>
                    </span>
                    <span className="stat-label">no fees, ever</span>
                  </div>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── subjects ── */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <Reveal>
              <span className="eyebrow">subjects</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="h2">
                Pick a subject. <em>More get added as tutors join.</em>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="lede">
                We started with Python and AI because that is what the first tutors knew. The
                list grows whenever someone shows up who can teach something else.
              </p>
            </Reveal>
          </div>

          {withSessions.length > 0 && (
            <div className="grid-2" style={{ marginBottom: 20 }}>
              {withSessions.slice(0, 4).map((s, i) => {
                const next = subjectSessions(db, s.id);
                return (
                  <Reveal key={s.id} delay={i * 0.07}>
                    <article
                      className="card card-hover subject-card"
                      data-subject={s.id}
                      style={{ '--sub-h': s.hue } as CSSProperties}
                    >
                      <span
                        className="chip"
                        data-subject={s.id}
                        style={{ '--sub-h': s.hue } as CSSProperties}
                      >
                        {plural(next.length, 'session')} coming up
                      </span>
                      <h3 className="h3">{s.name}</h3>
                      <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>{s.blurb}</p>
                      {next[0] && (
                        <div className="next-session">
                          <span className="mono">next up</span>
                          <span>
                            {next[0].title} — {fmtRelativeDay(next[0].startISO)},{' '}
                            {fmtTime(next[0].startISO)}
                          </span>
                        </div>
                      )}
                      <div>
                        <Link to={`/sessions?subject=${s.id}`} className="btn btn-primary btn-sm">
                          See {subjectShort(s.id)} sessions
                        </Link>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          )}

          <Reveal delay={0.14}>
            <div className="subject-grid">
              {SUBJECTS.map((s) => {
                const count = subjectSessions(db, s.id).length;
                return (
                  <Link
                    key={s.id}
                    to={`/sessions?subject=${s.id}`}
                    className="subject-pill"
                    style={{ '--sub-h': s.hue } as CSSProperties}
                  >
                    <span className="subject-pill-name">{s.name}</span>
                    <span className="subject-pill-count">
                      {count > 0 ? `${count} scheduled` : 'none scheduled yet'}
                    </span>
                  </Link>
                );
              })}
            </div>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="row" style={{ marginTop: 20 }}>
              <span className="mono small muted">don't see yours?</span>
              <Link to="/sessions#requests" className="btn-quiet">
                request a topic →
              </Link>
              <Link to="/teach" className="btn-quiet">
                or teach it yourself →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="container">
        <hr className="track-hr" />
      </div>

      {/* ── how it works ── */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <Reveal>
              <span className="eyebrow">how it works</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="h2">
                How it works, <em>start to finish.</em>
              </h2>
            </Reveal>
          </div>

          <div className="bento-grid">
            <Reveal className="b-7" delay={0}>
              <div className="card bento" style={{ height: '100%' }}>
                <span className="step-no">01 — BOOK A SEAT</span>
                <h3 className="h3">Find a session and sign up</h3>
                <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
                  Sessions are small, run on video, and led by a student who has already been
                  through the material. Book a seat and the room link is yours. No card, no trial,
                  nothing to cancel later.
                </p>
              </div>
            </Reveal>
            <Reveal className="b-5" delay={0.07}>
              <div className="card bento" style={{ height: '100%' }}>
                <span className="step-no">02 — ASK ANYTHING</span>
                <h3 className="h3">Small groups, no judgement</h3>
                <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
                  Your tutor was stuck on the same thing not long ago. Whatever you feel stupid
                  asking, half the room is wondering it too.
                </p>
              </div>
            </Reveal>
            <Reveal className="b-5" delay={0.07}>
              <div className="card bento" style={{ height: '100%' }}>
                <span className="step-no">03 — GET CLEARED</span>
                <h3 className="h3">A short quiz, not a résumé</h3>
                <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
                  Tutors take a quick quiz on their subject before they teach it. About ten
                  minutes, and you can retake it as many times as you need.
                </p>
              </div>
            </Reveal>
            <Reveal className="b-7" delay={0.14}>
              <div className="card bento" style={{ height: '100%' }}>
                <span className="step-no">04 — TEACH IT FORWARD</span>
                <h3 className="h3">Your hours get counted</h3>
                <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
                  Every session you run is added up automatically. Print a service certificate
                  with your hours on it whenever a school or application asks for one.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── kudos — the whole band waits until there's something real to show ── */}
      {db.kudos.length > 0 && (
        <section className="section paper-2" style={{ overflow: 'hidden' }}>
          <div className="container section-head" style={{ marginBottom: 26 }}>
            <Reveal>
              <span className="eyebrow">passed back down the track</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="h2">
                The wall of <em>thank you.</em>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <KudosMarquee />
          </Reveal>
        </section>
      )}

      {/* ── the story ── */}
      <section className="section">
        <div className="container" style={{ display: 'grid', gap: 40, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'center' }}>
          <div className="stack" style={{ gap: 18 }}>
            <Reveal>
              <span className="eyebrow">why it's free</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="h2">
                Why it is <em>free.</em>
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="lede" style={{ fontSize: '1.05rem' }}>
                This started as Peer2Peer, where I charged $8 to $20 a class. It worked well
                enough, but the students who needed help most were the ones least likely to pay
                for it. Dropping the price fixed that, and it turns out plenty of people will
                teach for free if you make it easy and count their hours.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div>
                <Link to="/about" className="btn btn-ghost">
                  Read the longer version
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div className="card card-pad" style={{ maxWidth: 380, justifySelf: 'center' }}>
              <span className="mono small muted">the old price list</span>
              <div className="stack" style={{ gap: 12, marginTop: 16 }}>
                {[
                  ['Intro to Python', '$15'],
                  ['Calculus Made Easy', '$18'],
                  ['Creative Writing', '$12'],
                ].map(([name, price]) => (
                  <div key={name} className="row between" style={{ borderBottom: '1.5px dashed var(--border)', paddingBottom: 10 }}>
                    <span style={{ fontSize: 15 }}>{name}</span>
                    <span className="mono" style={{ fontSize: 14 }}>
                      <s className="muted">{price}</s>{' '}
                      <b style={{ color: 'var(--ember-deep)' }}>$0</b>
                    </span>
                  </div>
                ))}
                <span className="serif-i" style={{ fontSize: 19, color: 'var(--ember-deep)' }}>
                  now zero, for everyone.
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── cta ── */}
      <section className="section-tight">
        <div className="container">
          <Reveal>
            <div className="cta-band">
              <span className="eyebrow" style={{ color: '#90a0bc' }}>
                two ways in
              </span>
              <h2 className="h2" style={{ maxWidth: 560 }}>
                Learn something, or <em>teach something.</em>
              </h2>
              <div className="row" style={{ justifyContent: 'center' }}>
                <Link to="/sessions" className="btn btn-band-light">
                  Find a session
                </Link>
                <Link to="/teach" className="btn btn-band-ghost">
                  Become a tutor
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

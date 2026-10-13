import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { KudosMarquee } from '../components/KudosMarquee';
import { RelayChain } from '../components/RelayChain';
import { Reveal } from '../components/Reveal';
import { CONTACT_EMAIL } from '../lib/config';
import { globalStats, isDayOne, subjectSessions, useStore } from '../lib/store';
import { SUBJECTS, subjectMeta, subjectShort } from '../lib/types';
import { fmtRelativeDay, fmtTime, initials, plural } from '../lib/util';

export function Home() {
  const { db } = useStore();
  const stats = globalStats(db);
  const dayOne = isDayOne(db);
  // Every class a listed teacher has said they'll run. Real content for the
  // page even before the first session is on the calendar.
  const classes = db.tutors.flatMap((t) => (t.courses ?? []).map((c) => ({ ...c, tutor: t })));
  const subjectsTaught = new Set(db.tutors.flatMap((t) => t.subjects)).size;
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
              <span className="eyebrow">Free tutoring, taught by high school students</span>
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
                    <span className="stat-num">{stats.tutorCount}</span>
                    <span className="stat-label">student teachers</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num">{classes.length}</span>
                    <span className="stat-label">classes starting this fall</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num">{subjectsTaught}</span>
                    <span className="stat-label">subjects covered</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num">$0</span>
                    <span className="stat-label">to join any class</span>
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
                    <span className="stat-num">$0</span>
                    <span className="stat-label">to join any class</span>
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
              <span className="eyebrow">Classes</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="h2">What you can learn</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="lede">
                Each class is run by one of our teachers, on a weekly schedule, over video. New
                subjects get added whenever someone joins who can teach them.
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

          {classes.length > 0 && (
            <div className="grid-3">
              {classes.map((c, i) => {
                const sub = subjectMeta(c.subject);
                return (
                  <Reveal key={`${c.tutor.id}-${c.title}`} delay={Math.min(i * 0.04, 0.24)}>
                    <article className="card card-hover class-card">
                      <span
                        className="chip"
                        data-subject={sub.id}
                        style={{ '--sub-h': sub.hue, justifySelf: 'start' } as CSSProperties}
                      >
                        {subjectShort(sub.id)}
                      </span>
                      <h3 className="h3" style={{ fontSize: '1.12rem' }}>{c.title}</h3>
                      <p>{c.summary}</p>
                      <div className="class-teacher">
                        <span className="avatar avatar-sm" style={{ '--h': c.tutor.hue } as CSSProperties}>
                          {initials(c.tutor.name)}
                        </span>
                        <span>
                          <b>{c.tutor.name}</b>
                          {c.tutor.availability ? ` · ${c.tutor.availability.split(' · ')[0]}` : ''}
                        </span>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          )}

          <Reveal delay={0.18}>
            <div className="row" style={{ marginTop: 24 }}>
              <Link to="/tutors" className="btn btn-ghost btn-sm">
                Meet the teachers
              </Link>
              <span className="small muted">Don't see your subject?</span>
              <Link to="/sessions#requests" className="btn-quiet">
                Request it →
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
              <span className="eyebrow">How it works</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="h2">From signing up to your first class</h2>
            </Reveal>
          </div>

          <div className="bento-grid">
            <Reveal className="b-7" delay={0}>
              <div className="card bento" style={{ height: '100%' }}>
                <span className="step-no">Step 1</span>
                <h3 className="h3">Find a session and sign up</h3>
                <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
                  Classes are small, run on a video call, and led by a student who has already
                  taken the course. Save a spot and you get the call link. No card, no trial,
                  nothing to cancel later.
                </p>
              </div>
            </Reveal>
            <Reveal className="b-5" delay={0.07}>
              <div className="card bento" style={{ height: '100%' }}>
                <span className="step-no">Step 2</span>
                <h3 className="h3">Small groups, no judgement</h3>
                <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
                  Your tutor was stuck on the same thing not long ago. Whatever you feel stupid
                  asking, half the room is wondering it too.
                </p>
              </div>
            </Reveal>
            <Reveal className="b-5" delay={0.07}>
              <div className="card bento" style={{ height: '100%' }}>
                <span className="step-no">Step 3</span>
                <h3 className="h3">Every teacher is reviewed</h3>
                <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
                  Teachers apply with what they want to teach and when. We read every
                  application before they are listed here.
                </p>
              </div>
            </Reveal>
            <Reveal className="b-7" delay={0.14}>
              <div className="card bento" style={{ height: '100%' }}>
                <span className="step-no">Step 4</span>
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
              <span className="eyebrow">From students</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="h2">Notes left for our teachers</h2>
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
              <span className="eyebrow">Why it's free</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="h2">Why it's free</h2>
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
              <span className="small muted">What Peer2Peer used to charge</span>
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
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ember-deep)' }}>
                  Now free for everyone.
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── for parents ── */}
      <section className="section paper-2">
        <div className="container">
          <div className="section-head">
            <Reveal>
              <span className="eyebrow">For parents</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="h2">What to know before your kid joins</h2>
            </Reveal>
          </div>
          <div className="faq-grid">
            {[
              [
                'Who teaches?',
                'High school students we know personally. Each one applies, tells us what they will cover, and is listed only after we have reviewed it. Their names and classes are on the Tutors page.',
              ],
              [
                'How do classes run?',
                'Small groups on a video call, at the same time each week. Students get the call link when they save a spot. There is no homework unless the teacher says so up front.',
              ],
              [
                'What does it cost?',
                'Nothing. We never ask for card details, and there is no paid tier to upgrade to.',
              ],
              [
                'Who do I contact?',
                `Email ${CONTACT_EMAIL}. One of the founders reads every message.`,
              ],
            ].map(([q, a], i) => (
              <Reveal key={q} delay={i * 0.05}>
                <div className="card faq-item">
                  <h3>{q}</h3>
                  <p>{a}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── cta ── */}
      <section className="section-tight">
        <div className="container">
          <Reveal>
            <div className="cta-band">
              <h2 className="h2" style={{ maxWidth: 560 }}>
                Learn something, or teach something.
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

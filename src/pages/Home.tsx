import { Link } from 'react-router-dom';
import { KudosMarquee } from '../components/KudosMarquee';
import { RelayChain } from '../components/RelayChain';
import { Reveal } from '../components/Reveal';
import { globalStats, subjectSessions, useStore } from '../lib/store';
import { SUBJECTS, UPCOMING_SUBJECTS } from '../lib/types';
import { fmtRelativeDay, fmtTime, plural } from '../lib/util';

export function Home() {
  const { db } = useStore();
  const stats = globalStats(db);

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
                Relay is free, live tutoring in Python and AI — taught by students, for students.
                No fees, no ads, no premium tier. When something finally clicks for you, you teach
                it to the next person. That's the whole business model.
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
                $0.00 since relaunch — we used to charge $15 a class.{' '}
                <Link to="/about">here's why we stopped</Link>
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.3}>
            <RelayChain />
          </Reveal>
        </div>
      </header>

      {/* ── live stats ── */}
      <section className="section-tight">
        <div className="container">
          <Reveal>
            <div className="stat-strip">
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
                <span className="stat-label">*ever. that's the point</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── subjects ── */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <Reveal>
              <span className="eyebrow">what's on the track</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="h2">
                Two subjects live. <em>More on the baton.</em>
              </h2>
            </Reveal>
          </div>

          <div className="grid-2">
            {SUBJECTS.map((s, i) => {
              const next = subjectSessions(db, s.id);
              return (
                <Reveal key={s.id} delay={i * 0.08}>
                  <article
                    className="card card-hover subject-card"
                    data-subject={s.id}
                    data-glyph={s.id === 'python' ? '>>>' : 'AI'}
                  >
                    <span className="chip" data-subject={s.id}>
                      {plural(next.length, 'upcoming session')}
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
                        Browse {s.name.split(' ')[0]} sessions
                      </Link>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={0.16}>
            <div className="row" style={{ marginTop: 22 }}>
              <span className="mono small muted">opening next:</span>
              {UPCOMING_SUBJECTS.map((s) => (
                <span key={s} className="chip chip-ghost">
                  {s}
                </span>
              ))}
              <Link to="/sessions#requests" className="btn-quiet">
                +1 a topic to speed it up →
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
              <span className="eyebrow">how the relay works</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="h2">
                Four legs. <em>One baton.</em>
              </h2>
            </Reveal>
          </div>

          <div className="bento-grid">
            <Reveal className="b-7" delay={0}>
              <div className="card bento" style={{ height: '100%' }}>
                <span className="step-no">LEG 01 — SHOW UP</span>
                <h3 className="h3">Join a live session. That's it.</h3>
                <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
                  Small live video sessions, capped around twelve people, run by a certified
                  student tutor. RSVP, get the room link, show up in sweatpants. No trial period
                  — there's nothing to trial into.
                </p>
              </div>
            </Reveal>
            <Reveal className="b-5" delay={0.07}>
              <div className="card bento" style={{ height: '100%' }}>
                <span className="step-no">LEG 02 — GET IT</span>
                <h3 className="h3">Small groups, zero judgement.</h3>
                <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
                  Your tutor was confused by this exact thing eight weeks ago. Ask the
                  "embarrassing" question — it's the one everyone has.
                </p>
              </div>
            </Reveal>
            <Reveal className="b-5" delay={0.07}>
              <div className="card bento" style={{ height: '100%' }}>
                <span className="step-no">LEG 03 — CERTIFY</span>
                <h3 className="h3">Prove it with a quiz, not a résumé.</h3>
                <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
                  Borrowed straight from schoolhouse.world: pass the subject quiz and you're
                  certified to teach it. Retakes are unlimited, because learning is the point.
                </p>
              </div>
            </Reveal>
            <Reveal className="b-7" delay={0.14}>
              <div className="card bento" style={{ height: '100%' }}>
                <span className="step-no">LEG 04 — PASS IT ON</span>
                <h3 className="h3">Teach. Every hour is logged.</h3>
                <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
                  Host sessions and Relay tracks your volunteer hours automatically — with a
                  printable service certificate backed by the actual session log. Colleges love
                  it. Your students will love you more.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── kudos ── */}
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

      {/* ── the story ── */}
      <section className="section">
        <div className="container" style={{ display: 'grid', gap: 40, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'center' }}>
          <div className="stack" style={{ gap: 18 }}>
            <Reveal>
              <span className="eyebrow">why it's free</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="h2">
                We used to <em>charge</em> for this.
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="lede" style={{ fontSize: '1.05rem' }}>
                Relay started as Peer2Peer — $8 to $20 a class. It worked, kind of. But the
                students who needed help most were exactly the ones a price tag turned away.
                Then we found schoolhouse.world and realized tutoring can run on a better
                currency: you pay for your education by helping with someone else's.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div>
                <Link to="/about" className="btn btn-ghost">
                  Read the whole story
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div className="card card-pad" style={{ maxWidth: 380, justifySelf: 'center' }}>
              <span className="mono small muted">our old pricing page, retired</span>
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
                      <b style={{ color: 'var(--py)' }}>$0</b>
                    </span>
                  </div>
                ))}
                <span className="serif-i" style={{ fontSize: 19, color: 'var(--ember-deep)' }}>
                  forever, for everyone.
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
              <span className="eyebrow" style={{ color: '#a29b87' }}>
                the anchor leg is yours
              </span>
              <h2 className="h2" style={{ maxWidth: 560 }}>
                Take the baton — <em>either way.</em>
              </h2>
              <div className="row" style={{ justifyContent: 'center' }}>
                <Link to="/sessions" className="btn btn-band-light">
                  Learn something free
                </Link>
                <Link to="/teach" className="btn btn-band-ghost">
                  Teach something free
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

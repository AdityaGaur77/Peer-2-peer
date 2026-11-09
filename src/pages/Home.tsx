import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { KudosMarquee } from '../components/KudosMarquee';
import { RelayChain } from '../components/RelayChain';
import { Reveal } from '../components/Reveal';
import { CountUp } from '../components/ScrollFx';
import { CONTACT_EMAIL } from '../lib/config';
import { MAX_PRICE } from '../lib/price';
import { globalStats, isDayOne, subjectSessions, useStore } from '../lib/store';
import { SUBJECTS } from '../lib/types';
import { plural } from '../lib/util';

export function Home() {
  const { db } = useStore();
  const stats = globalStats(db);
  const dayOne = isDayOne(db);
  const teachers = db.tutors.filter((t) => t.active !== false);
  // subjects someone on the team can teach right now
  const taught = new Set(teachers.flatMap((t) => t.subjects));
  const subjects = SUBJECTS.filter((s) => taught.has(s.id));
  const [toured, setToured] = useState(() => {
    try {
      return localStorage.getItem('relay.toured') === '1';
    } catch {
      return false;
    }
  });
  const dismissTour = () => {
    try {
      localStorage.setItem('relay.toured', '1');
    } catch {
      /* private mode: it just shows again next time */
    }
    setToured(true);
  };

  return (
    <>
      <header className="hero">
        <div className="container">
          <div className="hero-inner">
            <Reveal delay={0.07}>
              <h1 className="display">Free tutoring from high school students</h1>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="lede">
                Small online classes in math, English, Spanish and more. Each one is taught by a
                high school student who took the class recently and remembers the hard parts.
                Group classes are free.
              </p>
            </Reveal>
            <Reveal delay={0.21}>
              <div className="row">
                <Link to="/sessions" className="btn btn-primary">
                  See classes
                </Link>
                <Link to="/teach" className="btn btn-ghost">
                  Teach a class
                </Link>
              </div>
            </Reveal>
            {!toured && (
              <Reveal delay={0.3}>
                <div className="welcome-card">
                  <span>
                    <b>First time here?</b> <Link to="/guide/student">See how it works</Link> in
                    two minutes.
                  </span>
                  <button className="welcome-x" onClick={dismissTour} aria-label="Dismiss">
                    ✕
                  </button>
                </div>
              </Reveal>
            )}
          </div>

          <Reveal delay={0.3}>
            <div className="parallax">
              <RelayChain />
            </div>
          </Reveal>
        </div>
      </header>

      <section className="section-tight">
        <div className="container">
          <Reveal>
            <div className="stat-strip">
              {dayOne ? (
                <>
                  <div className="stat">
                    <span className="stat-num"><CountUp to={stats.tutorCount} /></span>
                    <span className="stat-label">teachers</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num"><CountUp to={subjects.length} /></span>
                    <span className="stat-label">subjects</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num">1</span>
                    <span className="stat-label">class a week per teacher</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num">$0</span>
                    <span className="stat-label">for group classes</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="stat">
                    <span className="stat-num"><CountUp to={stats.sessionsHosted} /></span>
                    <span className="stat-label">classes taught</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num"><CountUp to={stats.learnersHelped} /></span>
                    <span className="stat-label">students helped</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num"><CountUp to={stats.volunteerHours} /></span>
                    <span className="stat-label">volunteer hours</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num">$0</span>
                    <span className="stat-label">for group classes</span>
                  </div>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <Reveal>
              <h2 className="h2">What you can learn</h2>
            </Reveal>
            <Reveal delay={0.06}>
              <p className="lede">
                These are the subjects our teachers cover right now. We add more as new teachers
                join.
              </p>
            </Reveal>
          </div>

          <div className="grid-3">
            {subjects.map((s, i) => {
              const upcoming = subjectSessions(db, s.id).length;
              return (
                <Reveal key={s.id} delay={Math.min(i * 0.05, 0.25)}>
                  <Link
                    to={`/sessions?subject=${s.id}`}
                    className="card card-hover subject-tile"
                    style={{ '--sub-h': s.hue } as CSSProperties}
                  >
                    <h3 className="h3">{s.name}</h3>
                    <p>{s.blurb}</p>
                    <span className="small muted">
                      {upcoming > 0 ? `${plural(upcoming, 'class', 'classes')} coming up` : 'Classes starting soon'}
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={0.18}>
            <p className="small muted" style={{ marginTop: 20 }}>
              Don't see your subject?{' '}
              <Link to="/sessions#requests" style={{ color: 'var(--ember-deep)' }}>
                Ask for it
              </Link>{' '}
              and we'll try to find a teacher.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="container">
        <hr className="track-hr" />
      </div>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <Reveal>
              <h2 className="h2">How it works</h2>
            </Reveal>
          </div>

          <div className="bento-grid">
            <Reveal className="b-7" delay={0} from="left">
              <div className="card bento" style={{ height: '100%' }}>
                <span className="step-no">1</span>
                <h3 className="h3">Pick a class</h3>
                <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
                  Look through the classes and save a spot in one that fits your schedule. Each
                  class meets once a week on a video call, like Google Meet or Zoom.
                </p>
              </div>
            </Reveal>
            <Reveal className="b-5" delay={0.07} from="right">
              <div className="card bento" style={{ height: '100%' }}>
                <span className="step-no">2</span>
                <h3 className="h3">Join the call</h3>
                <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
                  The link shows up on your dashboard. Classes are small, so it's easy to ask
                  questions.
                </p>
              </div>
            </Reveal>
            <Reveal className="b-5" delay={0.07} from="left">
              <div className="card bento" style={{ height: '100%' }}>
                <span className="step-no">3</span>
                <h3 className="h3">Want more help?</h3>
                <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
                  Some teachers also tutor 1-on-1, for up to ${MAX_PRICE} a session. You can ask
                  for that from the Tutors page.
                </p>
              </div>
            </Reveal>
            <Reveal className="b-7" delay={0.14} from="right">
              <div className="card bento" style={{ height: '100%' }}>
                <span className="step-no">4</span>
                <h3 className="h3">Teach later</h3>
                <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
                  Once you know a subject well, you can teach a class yourself. Teachers get
                  volunteer hours and a printable certificate.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {db.kudos.length > 0 && (
        <section className="section paper-2" style={{ overflow: 'hidden' }}>
          <div className="container section-head" style={{ marginBottom: 26 }}>
            <Reveal>
              <h2 className="h2">What students say</h2>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <KudosMarquee />
          </Reveal>
        </section>
      )}

      <section className="section paper-2">
        <div className="container">
          <div className="section-head">
            <Reveal>
              <h2 className="h2">For parents</h2>
            </Reveal>
          </div>
          <div className="faq-grid">
            {[
              [
                'Who teaches?',
                'High school students we know. Each one applies, tells us what they will teach, and is only listed after we review it. You can see every teacher on the Tutors page.',
              ],
              [
                'How do classes work?',
                'Small groups on a video call, at the same time every week. Your child gets the call link after they save a spot. There is no homework unless the teacher says so first.',
              ],
              [
                'What does it cost?',
                `Group classes are free. Some teachers also offer 1-on-1 tutoring for up to $${MAX_PRICE} a session, which you arrange and pay for directly with the teacher. This site never asks for card details.`,
              ],
              [
                'Who do I contact?',
                `Email ${CONTACT_EMAIL}. We read every message.`,
              ],
            ].map(([q, a], i) => (
              <Reveal key={q} delay={i * 0.06} from="zoom">
                <div className="card faq-item">
                  <h3>{q}</h3>
                  <p>{a}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container">
          <Reveal>
            <div className="cta-band">
              <h2 className="h2" style={{ maxWidth: 560 }}>
                Ready to start?
              </h2>
              <div className="row" style={{ justifyContent: 'center' }}>
                <Link to="/sessions" className="btn btn-band-light">
                  See classes
                </Link>
                <Link to="/teach" className="btn btn-band-ghost">
                  Teach a class
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

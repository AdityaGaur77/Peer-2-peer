import { Link } from 'react-router-dom';
import { Reveal } from '../components/Reveal';
import { globalStats, useStore } from '../lib/store';

const FAQ = [
  {
    q: "It's really free? What's the catch?",
    a: "Really free. No card, no trial, no 'premium' tier waiting to upsell you. Tutors are students volunteering their time, and the whole thing runs on the idea that you repay your education by helping someone else. The only catch is we hope you'll pass it on someday.",
  },
  {
    q: 'How do you make sure tutors actually know their stuff?',
    a: 'Every tutor passes a certification quiz for each subject they teach — the same idea schoolhouse.world uses. It tests the concepts you actually teach in intro sessions, not trivia. And because these are peers who learned it recently, they remember exactly what was confusing.',
  },
  {
    q: 'Is this safe for younger students?',
    a: 'Sessions are small and run on video with a certified tutor. Founders review every tutor application by hand. This is a pilot built by students — as it grows, parental-consent flows and background checks are the first things on the roadmap.',
  },
  {
    q: 'I only just learned Python. Can I really tutor?',
    a: "Yes — that's the whole point. You don't need a degree, you need to be one solid step ahead and willing to be patient. Some of our best tutors certified two months after writing their first line of code.",
  },
  {
    q: 'What do tutors get out of it?',
    a: 'Logged volunteer hours with a printable service certificate, the deep understanding that only comes from teaching, and a community of people doing the same thing. Also, genuinely, the kudos wall is addictive.',
  },
  {
    q: 'When are other subjects coming?',
    a: 'Math, Physics, and Web Dev are next. The fastest way to speed one up is to request it on the session board — tutors build the schedule around what people vote for.',
  },
];

const TIMELINE = [
  { when: 'the start', title: 'Peer2Peer, $8–$20 a class', body: 'A marketplace where high schoolers taught younger kids for a small fee. It worked — but the price quietly filtered out the students who needed help most.' },
  { when: 'the turn', title: 'We found schoolhouse.world', body: 'A free, peer-to-peer tutoring nonprofit built on one idea: education you pay for by passing it on. It reframed everything. The fee wasn\'t the feature — it was the friction.' },
  { when: 'now', title: 'Relay — free, forever', body: 'Same tutors, same care, zero dollars. We started with the two things we know cold — Python and AI — and a handful of friends as the founding crew.' },
  { when: 'next', title: 'STEM, one baton at a time', body: 'Math, Physics, Web Dev, and whatever the request board demands. Every new learner is a future tutor, and the track keeps extending.' },
];

export function About() {
  const { db } = useStore();
  const stats = globalStats(db);

  return (
    <div className="section" style={{ paddingTop: 'clamp(110px, 15vw, 150px)' }}>
      <div className="container">
        <div className="section-head" style={{ maxWidth: 780 }}>
          <Reveal>
            <span className="eyebrow">the story</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="display" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)' }}>
              We deleted our prices <em className="em-ember">on purpose.</em>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lede">
              Relay is a free, student-run tutoring community — built on a simple trade: someone
              helped you understand something hard, so you help the next person. No money changes
              hands, ever. Here's how we got here.
            </p>
          </Reveal>
        </div>

        {/* timeline */}
        <div className="stack" style={{ gap: 0, marginBottom: 'clamp(40px, 7vw, 72px)' }}>
          {TIMELINE.map((t, i) => (
            <Reveal key={t.title} delay={i * 0.06}>
              <div
                className="row"
                style={{
                  gap: 24,
                  alignItems: 'flex-start',
                  padding: '22px 0',
                  borderBottom: i < TIMELINE.length - 1 ? '1.5px dashed var(--border-strong)' : 'none',
                  flexWrap: 'nowrap',
                }}
              >
                <span
                  className="mono"
                  style={{
                    flex: 'none',
                    width: 72,
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--ember-deep)',
                    paddingTop: 4,
                  }}
                >
                  {t.when}
                </span>
                <div style={{ minWidth: 0 }}>
                  <h3 className="h3" style={{ marginBottom: 6 }}>
                    {t.title}
                  </h3>
                  <p style={{ color: 'var(--ink-2)', fontSize: 15.5, maxWidth: '60ch' }}>{t.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* schoolhouse credit */}
        <Reveal>
          <div className="card card-pad" style={{ marginBottom: 'clamp(40px, 7vw, 72px)', background: 'var(--paper-2)' }}>
            <div className="row between" style={{ alignItems: 'flex-start', gap: 20 }}>
              <div style={{ maxWidth: '58ch' }}>
                <span className="eyebrow" style={{ marginBottom: 10 }}>
                  standing on shoulders
                </span>
                <p style={{ fontSize: 16.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                  We owe the model to{' '}
                  <a
                    href="https://schoolhouse.world"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--ember-deep)', borderBottom: '1.5px dotted var(--ember)' }}
                  >
                    schoolhouse.world
                  </a>
                  , the free peer-tutoring nonprofit that proved this works at scale. Relay is our
                  small, Python-and-AI-shaped take on the same idea, built for our own community.
                </p>
              </div>
              <span className="serif-i" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'var(--hot)', flex: 'none' }}>
                ♥
              </span>
            </div>
          </div>
        </Reveal>

        {/* stats */}
        <Reveal>
          <div className="stat-strip" style={{ marginBottom: 'clamp(40px, 7vw, 72px)' }}>
            <div className="stat">
              <span className="stat-num">{stats.tutorCount}</span>
              <span className="stat-label">volunteer tutors</span>
            </div>
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
              <span className="stat-label">hours given back</span>
            </div>
          </div>
        </Reveal>

        {/* faq */}
        <div className="section-head" style={{ marginBottom: 20 }}>
          <Reveal>
            <span className="eyebrow">questions, answered</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="h2">The honest FAQ</h2>
          </Reveal>
        </div>
        <Reveal delay={0.08}>
          <div style={{ maxWidth: 760 }}>
            {FAQ.map((f) => (
              <details className="faq" key={f.q}>
                <summary>{f.q}</summary>
                <p className="faq-a">{f.a}</p>
              </details>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="cta-band" style={{ marginTop: 'clamp(40px, 7vw, 72px)' }}>
            <h2 className="h2" style={{ maxWidth: 520 }}>
              Ready to <em>grab the baton?</em>
            </h2>
            <div className="row" style={{ justifyContent: 'center' }}>
              <Link to="/sessions" className="btn btn-band-light">
                Learn for free
              </Link>
              <Link to="/teach" className="btn btn-band-ghost">
                Teach for free
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Reveal } from '../components/Reveal';
import { globalStats, useStore } from '../lib/store';

const FAQ = [
  {
    q: "It's actually free? What's the catch?",
    a: "No catch. There's no card, no trial, and no paid tier waiting behind the free one. Tutors are students volunteering an hour of their time, and they get volunteer hours out of it. The only thing we ask is that you consider teaching something yourself once you're further along.",
  },
  {
    q: 'How do you know the tutors are any good?',
    a: "For subjects that have a quiz, tutors have to pass it before they can teach. Everything else gets read by a person before the tutor is approved. Beyond that, these are peers who learned the material recently, which usually means they remember what was confusing about it.",
  },
  {
    q: 'Is this safe for younger students?',
    a: "Sessions are small and run on video with a tutor who has been approved by hand. This is a student-run pilot rather than a company, so it doesn't have background checks or parental consent flows yet. If your school or family wants to sit in on a session, that's completely fine.",
  },
  {
    q: 'I only just learned this myself. Can I really tutor?',
    a: "Yes, and you might be better at it than someone who learned it years ago. You still remember which part was confusing. You don't need to be an expert, just a step or two ahead and willing to be patient.",
  },
  {
    q: 'What do tutors get out of it?',
    a: "Volunteer hours that get logged automatically, a printable service certificate, and the fact that teaching something forces you to actually understand it. Also, the thank-you notes are genuinely nice to receive.",
  },
  {
    q: 'What subjects can I get help with?',
    a: "Python and AI have the most going on, since that's what the first tutors knew. Math, physics, chemistry, biology, English, history, Spanish, web development and test prep are all open too. If nothing is scheduled in your subject, request it on the session board and a tutor can pick it up.",
  },
];


const TIMELINE = [
  {
    when: 'before',
    title: 'Peer2Peer, $8 to $20 a class',
    body: 'I ran a small tutoring marketplace where high schoolers taught younger kids for a fee. It worked well enough. The problem was who it quietly turned away: the students who needed the help most were the ones least likely to pay for it.',
  },
  {
    when: 'now',
    title: 'Relay, free',
    body: 'Same idea, no money. Tutors volunteer an hour, students book a seat, nobody pays anything. It turns out plenty of people will teach for free if you make it easy and give them credit for the hours.',
  },
  {
    when: 'next',
    title: 'Whatever people show up to teach',
    body: 'Python and AI came first because that is what the first tutors knew. Math, chemistry, essay writing, Spanish, test prep are all on the list. If you can teach it and someone wants to learn it, it belongs here.',
  },
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
              I deleted the prices <em className="em-ember">on purpose.</em>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lede">
              Relay is free tutoring run by students. Someone helps you understand something
              hard, and later you do the same for somebody else. No money changes hands. Here is
              how it ended up that way.
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

        {/* stats — only once there's a real record to show */}
        {stats.sessionsHosted > 0 && (
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
        )}

        {/* faq */}
        <div className="section-head" style={{ marginBottom: 20 }}>
          <Reveal>
            <span className="eyebrow">faq</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="h2">Questions people ask</h2>
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
              Want to <em>join in?</em>
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
    </div>
  );
}

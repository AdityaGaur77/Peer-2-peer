import { Link } from 'react-router-dom';
import { Reveal } from '../components/Reveal';
import { globalStats, useStore } from '../lib/store';

const FAQ = [
  {
    q: 'Does it cost anything?',
    a: 'Group classes are free. Some teachers also offer 1-on-1 tutoring for up to $20 a lesson. You arrange and pay for that directly with the teacher. This site never asks for card details.',
  },
  {
    q: 'Who are the teachers?',
    a: "High school students. Each one applies and tells us what they want to teach, and we review every application before they're listed. They took these classes recently, so they remember which parts were confusing.",
  },
  {
    q: 'Is it safe for younger students?',
    a: "Classes are small group video calls with a teacher we've approved. We're a student-run group, not a company, so we don't run background checks. Parents are always welcome to sit in on a class.",
  },
  {
    q: 'How often are classes?',
    a: 'Each teacher runs one class a week, at the same time every week. Save a spot in each class you want to go to.',
  },
  {
    q: 'Can I teach if I only just learned this?',
    a: "Yes. You don't need to be an expert, just a step ahead and patient. Teachers get volunteer hours for their group classes and a printable certificate.",
  },
  {
    q: "What if my subject isn't listed?",
    a: "Ask for it on the Classes page. When a teacher who can cover it joins, we'll add it.",
  },
];

const TIMELINE = [
  {
    when: 'before',
    title: 'It started as paid tutoring',
    body: 'We first ran tutoring that cost $8 to $20 a class. It worked, but the students who needed help most were often the ones who couldn\'t pay.',
  },
  {
    when: 'now',
    title: 'Now group classes are free',
    body: 'Teachers volunteer an hour a week for a group class, and it counts as service hours. Students who want extra help can book 1-on-1 tutoring with a teacher, for up to $20 a lesson.',
  },
  {
    when: 'next',
    title: 'More subjects as we grow',
    body: 'Right now we teach math, English, Spanish and engineering. We add a subject whenever someone joins who can teach it.',
  },
];

export function About() {
  const { db } = useStore();
  const stats = globalStats(db);

  return (
    <div className="section" style={{ paddingTop: 'clamp(110px, 15vw, 150px)' }}>
      <div className="container">
        <div className="section-head" style={{ maxWidth: 780 }}>
          <Reveal delay={0.05}>
            <h1 className="display" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)' }}>
              About Peer 2 Peer
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lede">
              Peer 2 Peer is a tutoring group run by high school students. Older students teach
              small online classes, and younger students get help with subjects they find hard.
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
                <h3 className="h3" style={{ marginBottom: 10 }}>Where the idea came from</h3>
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
                  , the free peer-tutoring nonprofit that proved this works at scale. Peer 2 Peer is our
                  small take on the same idea, built for our own community.
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
              Want to join in?
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
    </div>
  );
}

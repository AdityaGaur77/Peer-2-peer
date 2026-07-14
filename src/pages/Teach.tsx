import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QuizEngine } from '../components/QuizEngine';
import { Modal } from '../components/Modal';
import { Reveal } from '../components/Reveal';
import { QUIZZES } from '../lib/quiz-data';
import { applicationFor, certsFor, tutorByEmail, useStore } from '../lib/store';
import { SUBJECTS, type SubjectId } from '../lib/types';
import { cx, fmtDate } from '../lib/util';

const AVAIL = ['Weekday afternoons', 'Weekday evenings', 'Weekend mornings', 'Weekend afternoons'];

export function Teach() {
  const { db, profile, requireProfile, submitApplication } = useStore();
  const navigate = useNavigate();
  const [quizSubject, setQuizSubject] = useState<SubjectId | null>(null);

  // application form
  const [name, setName] = useState(profile?.name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [grade, setGrade] = useState('');
  const [subjects, setSubjects] = useState<SubjectId[]>([]);
  const [why, setWhy] = useState('');
  const [availability, setAvailability] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const [editing, setEditing] = useState(false);

  const myCerts = profile ? certsFor(db, profile.email) : [];
  const existing = profile ? applicationFor(db, profile.email) : undefined;
  const alreadyTutor = profile ? !!tutorByEmail(db, profile.email) : false;

  const startEditing = () => {
    if (existing) {
      setName(existing.name);
      setEmail(existing.email);
      setGrade(existing.grade);
      setSubjects(existing.subjects);
      setWhy(existing.why);
      setAvailability(existing.availability);
    }
    setSent(false);
    setEditing(true);
  };

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const apply = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || subjects.length === 0)
      return;
    submitApplication({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      grade: grade.trim() || 'Student',
      subjects,
      why: why.trim(),
      availability,
    });
    setSent(true);
    setEditing(false);
  };

  // What lives inside the Step-02 card, depending on where this person is.
  const renderStepTwo = () => {
    if (alreadyTutor) {
      return (
        <div className="stack" style={{ gap: 14, textAlign: 'center', padding: '20px 0' }}>
          <span className="serif-i" style={{ fontSize: 26, color: 'var(--ember-deep)' }}>
            You're already on the crew.
          </span>
          <p className="muted">
            Your tutor profile is live. Head to your dashboard for your schedule, hours, and
            certificate.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link to="/dashboard" className="btn btn-primary">
              Open dashboard
            </Link>
            <Link to="/tutors" className="btn btn-ghost">
              See the crew
            </Link>
          </div>
        </div>
      );
    }

    if (sent || (existing && !editing)) {
      const status = existing?.status ?? 'pending';
      return (
        <div className="stack" style={{ gap: 14, textAlign: 'center', padding: '20px 0' }}>
          {status === 'pending' && (
            <>
              <span className={cx('status-pill', 'status-pending')} style={{ margin: '0 auto' }}>
                in review
              </span>
              <span className="serif-i" style={{ fontSize: 26, color: 'var(--ember-deep)' }}>
                Application in. Welcome to the track.
              </span>
              <p className="muted">
                A founder reviews every application by hand
                {existing ? ` — yours arrived ${fmtDate(existing.submittedISO)}` : ''}. In the
                meantime, the best prep is joining a session as a learner.
              </p>
              <div className="row" style={{ justifyContent: 'center' }}>
                <Link to="/sessions" className="btn btn-primary">
                  Browse sessions
                </Link>
                <button className="btn btn-ghost" onClick={startEditing}>
                  Edit application
                </button>
              </div>
            </>
          )}
          {status === 'approved' && (
            <>
              <span className={cx('status-pill', 'status-approved')} style={{ margin: '0 auto' }}>
                approved
              </span>
              <span className="serif-i" style={{ fontSize: 26, color: 'var(--ember-deep)' }}>
                You're in — welcome to the crew.
              </span>
              <p className="muted">
                Your tutor profile is live. Sign in with this email and your dashboard unlocks
                teaching tools.
              </p>
              <div className="row" style={{ justifyContent: 'center' }}>
                <Link to="/dashboard" className="btn btn-primary">
                  Open dashboard
                </Link>
              </div>
            </>
          )}
          {status === 'declined' && (
            <>
              <span className={cx('status-pill', 'status-declined')} style={{ margin: '0 auto' }}>
                not this time
              </span>
              <span className="serif-i" style={{ fontSize: 26, color: 'var(--ink-2)' }}>
                Not yet — and that's okay.
              </span>
              <p className="muted">
                Usually this just means "join a few sessions first so we know you." Learn with us
                for a bit, then run it back.
              </p>
              <div className="row" style={{ justifyContent: 'center' }}>
                <Link to="/sessions" className="btn btn-primary">
                  Join sessions
                </Link>
                <button className="btn btn-ghost" onClick={startEditing}>
                  Reapply
                </button>
              </div>
            </>
          )}
        </div>
      );
    }

    return null; // fall through to the form
  };

  return (
    <div className="section" style={{ paddingTop: 'clamp(110px, 15vw, 150px)' }}>
      <div className="container">
        <div className="section-head">
          <Reveal>
            <span className="eyebrow">become a tutor</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="h2">
              You learned it. <em className="em-ember">Now pass it on.</em>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lede">
              Teaching is how you actually master something — and here it's also how you rack up
              real, logged volunteer hours. Two steps: certify in a subject, then apply. A founder
              reviews every application personally.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.11}>
          <div className="welcome-card" style={{ marginBottom: 20 }}>
            <span>
              <b>Prefer a guided walkthrough?</b> Build your first class step by step — name it,
              shape it, schedule it, post it.
            </span>
            <Link to="/guide/tutor">open the class builder →</Link>
          </div>
        </Reveal>

        {/* step 1 — certify */}
        <Reveal delay={0.12}>
          <div className="card card-pad" style={{ marginBottom: 20 }}>
            <div className="row between" style={{ marginBottom: 18 }}>
              <div className="row" style={{ gap: 12 }}>
                <span className="step-no" style={{ fontSize: 13 }}>
                  STEP 01
                </span>
                <h3 className="h3">Certify — prove you know it</h3>
              </div>
              <span className="mono small muted">unlimited retakes</span>
            </div>

            <div className="grid-2">
              {SUBJECTS.map((s) => {
                const cert = myCerts.find((c) => c.subject === s.id);
                const quiz = QUIZZES[s.id];
                return (
                  <div key={s.id} className="card card-pad" style={{ background: 'var(--paper)' }}>
                    <div className="row between">
                      <span className="chip" data-subject={s.id}>
                        {s.name}
                      </span>
                      {cert && (
                        <span className="chip chip-cert" data-subject={s.id}>
                          {cert.score}/{cert.total}
                        </span>
                      )}
                    </div>
                    <p className="muted" style={{ fontSize: 13.5, margin: '12px 0 14px' }}>
                      {quiz.questions.length} questions · ~{quiz.minutes} min · pass at{' '}
                      {quiz.passNeeded}
                    </p>
                    <button
                      className={cx('btn btn-sm', cert ? 'btn-ghost' : 'btn-primary')}
                      onClick={() => requireProfile(() => setQuizSubject(s.id))}
                    >
                      {cert ? 'Retake quiz' : `Take the ${s.name.split(' ')[0]} quiz`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* step 2 — apply */}
        <Reveal delay={0.16}>
          <div className="card card-pad">
            <div className="row" style={{ gap: 12, marginBottom: 18 }}>
              <span className="step-no" style={{ fontSize: 13 }}>
                STEP 02
              </span>
              <h3 className="h3">Apply to join the crew</h3>
            </div>

            {renderStepTwo() ?? (
              <form className="stack" style={{ gap: 16 }} onSubmit={apply}>
                <div className="grid-2">
                  <label className="field">
                    <span className="label">Your name</span>
                    <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maya K" />
                  </label>
                  <label className="field">
                    <span className="label">Email</span>
                    <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.org" />
                  </label>
                </div>

                <label className="field">
                  <span className="label">Grade / year</span>
                  <input className="input" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="11th grade" />
                </label>

                <div className="field">
                  <span className="label">What can you teach?</span>
                  <div className="optchips">
                    {SUBJECTS.map((s) => {
                      const on = subjects.includes(s.id);
                      const certified = myCerts.some((c) => c.subject === s.id);
                      return (
                        <button
                          type="button"
                          key={s.id}
                          className={cx('optchip', on && 'on')}
                          onClick={() => toggle(subjects, s.id, setSubjects)}
                        >
                          {s.name} {certified && '✓'}
                        </button>
                      );
                    })}
                  </div>
                  <span className="hint">the ✓ means you've already certified — nice</span>
                </div>

                <div className="field">
                  <span className="label">When are you usually free?</span>
                  <div className="optchips">
                    {AVAIL.map((a) => (
                      <button
                        type="button"
                        key={a}
                        className={cx('optchip', availability.includes(a) && 'on')}
                        onClick={() => toggle(availability, a, setAvailability)}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="field">
                  <span className="label">Why do you want to tutor? <span className="muted">(optional)</span></span>
                  <textarea
                    className="textarea"
                    value={why}
                    onChange={(e) => setWhy(e.target.value)}
                    placeholder="Someone helped me when I was stuck, and I want to be that person for the next kid."
                  />
                </label>

                <div className="row between">
                  <span className="hint">
                    {subjects.length === 0 ? 'pick at least one subject' : 'a founder reviews every application'}
                  </span>
                  <button className="btn btn-primary" type="submit" disabled={subjects.length === 0}>
                    Submit application
                  </button>
                </div>
              </form>
            )}
          </div>
        </Reveal>

        {profile && myCerts.length > 0 && (
          <Reveal delay={0.2}>
            <div className="row" style={{ marginTop: 20, justifyContent: 'center' }}>
              <button className="btn-quiet" onClick={() => navigate('/certificate')}>
                already tutoring? get your volunteer certificate →
              </button>
            </div>
          </Reveal>
        )}
      </div>

      {quizSubject && (
        <Modal onClose={() => setQuizSubject(null)} wide labelledBy="quiz-title">
          <h2 id="quiz-title" className="h3">
            {QUIZZES[quizSubject].title}
          </h2>
          <p className="muted" style={{ fontSize: 14, marginTop: -8 }}>
            {QUIZZES[quizSubject].intro}
          </p>
          <QuizEngine quiz={QUIZZES[quizSubject]} onExit={() => setQuizSubject(null)} />
        </Modal>
      )}
    </div>
  );
}

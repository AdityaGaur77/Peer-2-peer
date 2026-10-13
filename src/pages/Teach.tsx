import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QuizEngine } from '../components/QuizEngine';
import { Modal } from '../components/Modal';
import { Reveal } from '../components/Reveal';
import { CONTACT_EMAIL } from '../lib/config';
import { applicationUrl } from '../lib/invite';
import { QUIZZES } from '../lib/quiz-data';
import { applicationFor, certsFor, tutorByEmail, useStore } from '../lib/store';
import { SUBJECTS, subjectMeta, subjectShort, type Application, type SubjectId } from '../lib/types';
import { cx, fmtDate } from '../lib/util';

const AVAIL = ['Weekday afternoons', 'Weekday evenings', 'Weekend mornings', 'Weekend afternoons'];

export function Teach() {
  const { db, profile, requireProfile, submitApplication, setRole } = useStore();
  const navigate = useNavigate();
  const [quizSubject, setQuizSubject] = useState<SubjectId | null>(null);

  // application form
  const [name, setName] = useState(profile?.name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [grade, setGrade] = useState('');
  const [subjects, setSubjects] = useState<SubjectId[]>([]);
  const [why, setWhy] = useState('');
  const [availability, setAvailability] = useState<string[]>([]);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseSummary, setCourseSummary] = useState('');
  const [times, setTimes] = useState('');
  const [sent, setSent] = useState(false);
  const [editing, setEditing] = useState(false);

  const myCerts = profile ? certsFor(db, profile.email) : [];
  // Signed-out applicants are found by the email they just typed.
  const existing = profile
    ? applicationFor(db, profile.email)
    : sent
      ? applicationFor(db, email)
      : undefined;
  const alreadyTutor = profile ? !!tutorByEmail(db, profile.email) : false;

  const startEditing = () => {
    if (existing) {
      setName(existing.name);
      setEmail(existing.email);
      setGrade(existing.grade);
      setSubjects(existing.subjects);
      setWhy(existing.why);
      setAvailability(existing.availability);
      setCourseTitle(existing.courseTitle ?? '');
      setCourseSummary(existing.courseSummary ?? '');
      setTimes(existing.times ?? '');
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
      courseTitle: courseTitle.trim(),
      courseSummary: courseSummary.trim(),
      times: times.trim(),
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
You are already a tutor.
          </span>
          <p className="muted">
Your profile is live. Your dashboard has your schedule, hours and certificate.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link to="/dashboard" className="btn btn-primary">
              Open dashboard
            </Link>
            <Link to="/tutors" className="btn btn-ghost">
See the tutors
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
One more step: send it to us.
              </span>
              <p className="muted" style={{ maxWidth: '54ch', margin: '0 auto' }}>
                Your application is saved
                {existing ? ` (${fmtDate(existing.submittedISO)})` : ''}, but only on this device.
                Send it with one of the buttons below so it reaches the team. We usually reply
                within a few days.
              </p>
              {existing && <SendApplication app={existing} />}
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
You are in.
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
Not this time.
              </span>
              <p className="muted">
Usually it just means come to a few sessions first so we know you. Try again after
                that.
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

  // Signed in as a student: this page is hidden from their nav, so they only
  // get here from a direct link. Offer the switch rather than a dead end.
  if (profile?.role === 'student') {
    return (
      <div className="section" style={{ paddingTop: 'clamp(120px, 16vw, 160px)', textAlign: 'center' }}>
        <div className="container stack" style={{ gap: 18, maxWidth: 460, margin: '0 auto' }}>
          <span className="eyebrow" style={{ justifyContent: 'center' }}>for tutors</span>
          <h2 className="h2">Want to teach as well?</h2>
          <p className="lede" style={{ margin: '0 auto' }}>
            You signed up to learn, so we keep the tutor pages out of your way. You can change
            that whenever you like — plenty of people do both.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => setRole('tutor')}>
              Show me the tutor side
            </button>
            <Link to="/sessions" className="btn btn-ghost">
              Back to sessions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section" style={{ paddingTop: 'clamp(110px, 15vw, 150px)' }}>
      <div className="container">
        <div className="section-head">
          <Reveal>
            <span className="eyebrow">become a tutor</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="h2">
              You learned it. <em className="em-ember">Now teach it.</em>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lede">
Teaching something is the fastest way to properly learn it, and the hours count
              toward service requirements. Two steps: take a short quiz if your subject has one,
              then send a short application.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.11}>
          <div className="welcome-card" style={{ marginBottom: 20 }}>
            <span>
              <b>Want it walked through?</b> The class builder takes you from a blank page to a
              posted session in a few minutes.
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
                <h3 className="h3">Take the quiz for your subject</h3>
              </div>
              <span className="mono small muted">retake as often as you like</span>
            </div>

            <p className="muted" style={{ fontSize: 13.5, marginBottom: 14, maxWidth: '62ch' }}>
              Only these two have a quiz so far. For every other subject there is nothing to pass
              — just fill in the application below and someone will read it.
            </p>

            <div className="grid-3">
              {SUBJECTS.filter((s) => s.hasQuiz).map((s) => {
                const cert = myCerts.find((c) => c.subject === s.id);
                const quiz = QUIZZES[s.id]!;
                return (
                  <div key={s.id} className="card card-pad" style={{ background: 'var(--paper)' }}>
                    <div className="row between">
                      <span className="chip" data-subject={s.id} style={{ '--sub-h': s.hue } as CSSProperties}>
                        {s.name}
                      </span>
                      {cert && (
                        <span
                          className="chip chip-cert"
                          data-subject={s.id}
                          style={{ '--sub-h': s.hue } as CSSProperties}
                        >
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
                      {cert ? 'Retake quiz' : `Take the ${subjectShort(s.id)} quiz`}
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
                  <span className="label">
                    Specific days and times <span className="muted">(optional)</span>
                  </span>
                  <input
                    className="input"
                    value={times}
                    onChange={(e) => setTimes(e.target.value)}
                    placeholder="Tuesdays and Wednesdays, 6–8pm"
                  />
                  <span className="hint">
                    classes repeat weekly, so tell us when you are usually free, not a single date
                  </span>
                </label>

                <label className="field">
                  <span className="label">
                    What would you call your class? <span className="muted">(optional)</span>
                  </span>
                  <input
                    className="input"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="Foundational English Skills"
                  />
                </label>

                <label className="field">
                  <span className="label">
                    What will you cover? <span className="muted">(optional)</span>
                  </span>
                  <textarea
                    className="textarea"
                    value={courseSummary}
                    onChange={(e) => setCourseSummary(e.target.value)}
                    placeholder="Two or three sentences a student would read before signing up. What topics, how a class runs, any homework."
                  />
                </label>

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
                    {subjects.length === 0
                      ? 'pick at least one subject'
                      : 'next you will send this to the team'}
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
            {QUIZZES[quizSubject]!.title}
          </h2>
          <p className="muted" style={{ fontSize: 14, marginTop: -8 }}>
            {QUIZZES[quizSubject]!.intro}
          </p>
          <QuizEngine quiz={QUIZZES[quizSubject]!} onExit={() => setQuizSubject(null)} />
        </Modal>
      )}
    </div>
  );
}

/**
 * Applications are saved in the applicant's browser, which the team can't
 * see. This packs one into a link that opens in the founder console.
 */
function SendApplication({ app }: { app: Application }) {
  const { toast } = useStore();
  const [url, setUrl] = useState('');

  useEffect(() => {
    let live = true;
    const { id: _id, status: _status, submittedISO, ...draft } = app;
    applicationUrl(draft, submittedISO).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [app]);

  const subjects = app.subjects.map((s) => subjectMeta(s).name).join(', ');
  const body = [
    `Name: ${app.name}`,
    `Grade: ${app.grade}`,
    `Subjects: ${subjects}`,
    app.courseTitle && `Class: ${app.courseTitle}`,
    app.courseSummary && `What I'll cover: ${app.courseSummary}`,
    (app.times || app.availability.length > 0) &&
      `When I'm free: ${app.times || app.availability.join(', ')}`,
    app.why && `Why: ${app.why}`,
    '',
    'Open my application in the console:',
    url,
  ]
    .filter((x) => x !== false && x !== undefined)
    .join('\n');
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    `Tutor application: ${app.name}`,
  )}&body=${encodeURIComponent(body)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      toast('Copied. Paste it to us in a message.');
    } catch {
      toast('Could not copy. Use the email button instead.');
    }
  };

  return (
    <div className="row" style={{ justifyContent: 'center' }}>
      <a
        className="btn btn-primary"
        href={url ? mailto : undefined}
        aria-disabled={!url}
        style={url ? undefined : { opacity: 0.5, pointerEvents: 'none' }}
      >
        Email it to the team
      </a>
      <button className="btn btn-ghost" onClick={copy} disabled={!url}>
        Copy to send another way
      </button>
    </div>
  );
}

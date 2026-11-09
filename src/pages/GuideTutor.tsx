import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GuideShell, type GuideStepDef } from '../components/GuideShell';
import { MeetingFields } from '../components/MeetingPanel';
import { SessionCard } from '../components/SessionCard';
import { DEFAULT_MIN_AGE, freshJitsiLink, meetingLinkError, weeklyStarts } from '../lib/meeting';
import { MAX_PRICE } from '../lib/price';
import {
  applicationFor, certsFor, tutorByEmail, upcomingSessions, useStore,
} from '../lib/store';
import { SUBJECTS, subjectMeta, type Level, type Session, type SubjectId } from '../lib/types';
import { cx, fmtDate, fmtTime } from '../lib/util';

const DRAFT_KEY = 'relay.classdraft';

/** Today as YYYY-MM-DD in the teacher's own timezone (toISOString is UTC). */
function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface ClassDraft {
  subject: SubjectId | null;
  title: string;
  description: string;
  level: Level;
  durationMin: number;
  capacity: number;
  date: string;
  time: string;
  link: string;
  meetingId: string;
  passcode: string;
  minAge: number;
  /** Whole dollars, 0 (free) to MAX_PRICE. */
  price: number;
  /** 1 = one class. 4 = the same slot four weeks running. */
  repeatWeeks: number;
}

const EMPTY_DRAFT: ClassDraft = {
  subject: null,
  title: '',
  description: '',
  level: 'intro',
  durationMin: 60,
  capacity: 8,
  date: '',
  time: '17:00',
  link: '',
  meetingId: '',
  passcode: '',
  minAge: DEFAULT_MIN_AGE,
  price: 0,
  repeatWeeks: 8,
};

function loadDraft(): { draft: ClassDraft; step: number } {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { draft: ClassDraft; step: number };
      if (parsed?.draft) return { draft: { ...EMPTY_DRAFT, ...parsed.draft }, step: parsed.step ?? 0 };
    }
  } catch {
    /* fresh draft */
  }
  return { draft: EMPTY_DRAFT, step: 0 };
}

const STEPS: GuideStepDef[] = [
  { id: 'subject', label: 'Subject' },
  { id: 'name', label: 'Class name' },
  { id: 'pitch', label: 'Description' },
  { id: 'shape', label: 'Size and length' },
  { id: 'price', label: 'Free classes' },
  { id: 'when', label: 'Date and time' },
  { id: 'post', label: 'Meeting link' },
];

/**
 * Starter classes. A blank page is the main reason a new tutor stalls, so we
 * offer three proven shapes per subject — they're editable the moment they land.
 */
interface Template {
  label: string;
  title: string;
  description: string;
  level: Level;
  durationMin: number;
  capacity: number;
}

const TEMPLATES: Partial<Record<SubjectId, Template[]>> = {
  python: [
    {
      label: 'Absolute beginners',
      title: 'Python from zero — your first program',
      description:
        "We'll write a short program in the browser that asks your name and answers back. Nothing to install. We'll cover variables and print(). No experience needed.",
      level: 'intro',
      durationMin: 60,
      capacity: 8,
    },
    {
      label: 'Build-along',
      title: 'Build a number-guessing game, start to finish',
      description:
        "In one class we build a small game you can share with friends. We'll use loops, if statements and random numbers. Bring a laptop.",
      level: 'intro',
      durationMin: 90,
      capacity: 8,
    },
    {
      label: 'Open clinic',
      title: 'Debugging clinic — bring your broken code',
      description:
        "Bring code that isn't working. We put it on the shared screen and fix it together, so everyone learns from each other's mistakes. No prep needed.",
      level: 'all',
      durationMin: 75,
      capacity: 6,
    },
  ],
  ai: [
    {
      label: 'No-math intro',
      title: 'What *is* AI, actually?',
      description:
        "A plain-language intro to AI: what machine learning is, what it can't do, and how apps use it to pick what you see. No math. Basic questions welcome.",
      level: 'intro',
      durationMin: 60,
      capacity: 12,
    },
    {
      label: 'Hands-on',
      title: 'Train your first model — no math required',
      description:
        "We'll train a simple image model together, see where it gets things wrong, and improve it with better examples. No math or coding needed. You leave with a model that works.",
      level: 'intro',
      durationMin: 75,
      capacity: 10,
    },
    {
      label: 'Discussion',
      title: "AI ethics: when the model is wrong, who's responsible?",
      description:
        'A discussion, not a lecture. We look at real cases, like unfair hiring tools, made-up citations and deepfakes, and talk about what should have happened instead.',
      level: 'all',
      durationMin: 60,
      capacity: 14,
    },
  ],
};

export function GuideTutor() {
  const { db, profile, requireProfile, createSession, toast } = useStore();
  const navigate = useNavigate();
  const [{ draft: initialDraft, step: initialStep }] = useState(loadDraft);
  const [draft, setDraft] = useState<ClassDraft>(initialDraft);
  const [step, setStep] = useState(initialStep);
  const [maxVisited, setMaxVisited] = useState(initialStep);

  const tutor = profile ? tutorByEmail(db, profile.email) : undefined;
  const myCerts = profile ? certsFor(db, profile.email) : [];
  const myApp = profile ? applicationFor(db, profile.email) : undefined;

  // autosave the draft so it survives reloads and waits on the dashboard
  // (an untouched form isn't a draft, so nothing is saved for it)
  useEffect(() => {
    try {
      if (JSON.stringify(draft) === JSON.stringify(EMPTY_DRAFT)) localStorage.removeItem(DRAFT_KEY);
      else localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, step }));
    } catch {
      /* storage blocked: the draft just won't survive a reload */
    }
  }, [draft, step]);

  const patch = (p: Partial<ClassDraft>) => setDraft((d) => ({ ...d, ...p }));

  const go = (i: number) => {
    setStep(i);
    setMaxVisited((m) => Math.max(m, i));
  };

  const startMs = useMemo(() => {
    if (!draft.date || !draft.time) return null;
    const t = new Date(`${draft.date}T${draft.time}`).getTime();
    return Number.isNaN(t) ? null : t;
  }, [draft.date, draft.time]);

  const conflicts = useMemo(() => {
    if (!startMs) return [];
    const end = startMs + draft.durationMin * 60_000;
    return upcomingSessions(db).filter((s) => {
      const sStart = new Date(s.startISO).getTime();
      const sEnd = sStart + s.durationMin * 60_000;
      return startMs < sEnd && sStart < end;
    });
  }, [db, startMs, draft.durationMin]);

  const stepValid = [
    draft.subject !== null,
    draft.title.trim().length >= 8,
    draft.description.trim().length >= 30,
    true,
    true,
    startMs !== null && startMs > Date.now(),
    // a pasted link has to be a real meeting link; blank means a Jitsi room
    !draft.link.trim() || !meetingLinkError(draft.link),
  ][step];

  // Every rule a class has to meet, checked again at post time: the step
  // rail lets people jump around, and a draft can be resumed weeks later.
  const problem = useMemo((): { step: number; msg: string } | null => {
    if (!draft.subject) return { step: 0, msg: 'Pick a subject first.' };
    if (draft.title.trim().length < 8) return { step: 1, msg: 'The class name needs at least 8 characters.' };
    if (draft.description.trim().length < 30)
      return { step: 2, msg: 'The pitch needs a couple of sentences (30+ characters).' };
    if (!startMs || startMs <= Date.now()) return { step: 5, msg: 'Pick a date and time in the future.' };
    // one class a week to start: no week of the series within six days of
    // another class of theirs
    if (tutor) {
      const mine = upcomingSessions(db).filter((x) => x.tutorId === tutor.id);
      for (const iso of weeklyStarts(new Date(startMs), Math.max(1, draft.repeatWeeks || 1))) {
        const at = new Date(iso).getTime();
        const clash = mine.find((x) => Math.abs(new Date(x.startISO).getTime() - at) < 6 * 86_400_000);
        if (clash)
          return {
            step: 5,
            msg: `Teachers run one class a week to start. You already have a class on ${fmtDate(clash.startISO)}, so pick a different day${draft.repeatWeeks > 1 ? ' or fewer weeks' : ''}.`,
          };
      }
    }
    if (draft.link.trim() && meetingLinkError(draft.link))
      return { step: 6, msg: meetingLinkError(draft.link) ?? 'Check the meeting link.' };
    return null;
  }, [draft, startMs, tutor, db]);
  const posting = useRef(false);

  // live preview built from the draft
  const previewSession: Session = useMemo(() => {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 5);
    fallback.setHours(17, 0, 0, 0);
    return {
      id: 'draft',
      title: draft.title.trim() || 'Your class title goes here',
      subject: draft.subject ?? 'python',
      level: draft.level,
      description:
        draft.description.trim() ||
        'Your pitch goes here — what you\'ll do together, who it\'s for, what they leave with.',
      tutorId: tutor?.id ?? '',
      startISO: startMs ? new Date(startMs).toISOString() : fallback.toISOString(),
      durationMin: draft.durationMin,
      capacity: draft.capacity,
      attendees: [],
      waitlist: [],
      link: draft.link || 'https://meet.jit.si/peer2peer-your-class',
      minAge: draft.minAge,
      status: 'scheduled',
    };
  }, [draft, startMs, tutor?.id]);

  const publish = () => {
    if (problem) {
      go(problem.step);
      toast(problem.msg);
      return;
    }
    if (posting.current) return; // a double click would post everything twice
    requireProfile((p) => {
      const me = tutorByEmail(db, p.email);
      if (!me || !draft.subject || !startMs || posting.current) return;
      posting.current = true;
      const weeks = Math.max(1, draft.repeatWeeks || 1);
      let id = '';
      // same slot every week; the first one is where we land afterwards
      const room = draft.link.trim() || freshJitsiLink(draft.title);
      const starts = weeklyStarts(new Date(startMs), weeks);
      for (let w = 0; w < starts.length; w++) {
        const made = createSession({
          title: draft.title.trim(),
          subject: draft.subject,
          level: draft.level,
          description: draft.description.trim(),
          tutorId: me.id,
          startISO: starts[w],
          durationMin: draft.durationMin,
          capacity: draft.capacity,
          link: room,
          meetingId: draft.meetingId.trim() || undefined,
          passcode: draft.passcode.trim() || undefined,
          minAge: draft.minAge,
        }, true);
        if (w === 0) id = made;
      }
      toast(starts.length > 1 ? `Posted ${starts.length} classes, one a week.` : 'Your class is posted.');
      localStorage.removeItem(DRAFT_KEY);
      navigate(`/sessions?s=${id}`);
    });
  };

  const next = () => {
    if (step < STEPS.length - 1) go(step + 1);
  };

  const footer = (
    <>
      <button className="btn btn-ghost btn-sm" disabled={step === 0} onClick={() => go(step - 1)}>
        ← Back
      </button>
      {step < STEPS.length - 1 ? (
        <button className="btn btn-primary btn-sm" disabled={!stepValid} onClick={next}>
          {step === 0 && !stepValid ? 'Pick a subject first' : 'Next →'}
        </button>
      ) : tutor ? (
        <button className="btn btn-primary" disabled={!!problem} onClick={publish} title={problem?.msg}>
          Post my class
        </button>
      ) : (
        <span className="hint">You can post once you're approved to teach.</span>
      )}
    </>
  );

  const aside = (
    <>
      <span className="aside-note">Preview</span>
      <SessionCard session={previewSession} preview />
      <p className="hint">This is how your class will look to students.</p>
    </>
  );

  return (
    <GuideShell
      title={
        <>
          Set up your class
        </>
      }
      intro="Answer a few questions and your class goes on the Classes page. The preview shows what students will see."
      steps={STEPS}
      current={step}
      maxVisited={maxVisited}
      onStep={go}
      aside={aside}
      footer={footer}
    >
      {step === 0 && (
        <div className="stack" style={{ gap: 16 }}>
          <h3 className="h3">What are you teaching?</h3>
          <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
            Pick one subject. A class works best when it covers one idea, not the whole subject.
          </p>
          <div className="row" style={{ gap: 10 }}>
            {SUBJECTS.map((s) => (
              <button
                key={s.id}
                className={cx('optchip', draft.subject === s.id && 'on')}
                onClick={() => patch({ subject: s.id })}
              >
                {s.name}
              </button>
            ))}
          </div>
          {draft.subject && (
            <div className="guide-tip">
              {!profile ? (
                <>You can draft the whole thing now and sign in when you post it.</>
              ) : myCerts.some((c) => c.subject === draft.subject) ? (
                <>
                  <b>You are cleared to teach {subjectMeta(draft.subject).name}.</b> Keep going.
                </>
              ) : subjectMeta(draft.subject).hasQuiz ? (
                <>
                  <b>One thing:</b> {subjectMeta(draft.subject).name} has a short quiz you need to
                  pass first. Draft this now and take it on the{' '}
                  <Link to="/teach" style={{ color: 'var(--ember-deep)', borderBottom: '1.5px dotted' }}>
                    Teach page
                  </Link>
                  . It takes about ten minutes and you can retake it.
                </>
              ) : (
                <>
                  {subjectMeta(draft.subject).name} has no quiz yet, so your application gets read
                  by a person instead. Draft the class now and send it from the{' '}
                  <Link to="/teach" style={{ color: 'var(--ember-deep)', borderBottom: '1.5px dotted' }}>
                    Teach page
                  </Link>
                  .
                </>
              )}
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="stack" style={{ gap: 16 }}>
          <h3 className="h3">What's your class called?</h3>
          <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
Good names say what students will be able to do after the class.
          </p>

          {draft.subject && TEMPLATES[draft.subject] && (
            <div className="stack" style={{ gap: 8 }}>
              <span className="mono small muted">
                Or start from an example and change it:
              </span>
              <div className="row" style={{ gap: 8 }}>
                {TEMPLATES[draft.subject]!.map((t) => (
                  <button
                    key={t.label}
                    className="optchip"
                    onClick={() => {
                      patch({
                        title: t.title,
                        description: t.description,
                        level: t.level,
                        durationMin: t.durationMin,
                        capacity: t.capacity,
                      });
                      toast(`Example added. Change anything you like.`);
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label className="field">
            <span className="label">Class title</span>
            <input
              className="input"
              value={draft.title}
              maxLength={70}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Loops that finally click"
              autoFocus
            />
            <span className="hint">
              {draft.title.trim().length}/70 characters
            </span>
          </label>
          <div className="eg-row">
            <div className="eg good">
              <span className="verdict">Good</span>
              <span>"Build a number-guessing game, start to finish"</span>
            </div>
            <div className="eg good">
              <span className="verdict">YES</span>
              <span>"Debugging clinic: bring your broken code"</span>
            </div>
            <div className="eg bad">
              <span className="verdict">Avoid</span>
              <span>"Python lesson 3" (doesn't say what you'll learn)</span>
            </div>
            <div className="eg bad">
              <span className="verdict">NO</span>
              <span>"Tutoring session" (too vague)</span>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="stack" style={{ gap: 16 }}>
          <h3 className="h3">Describe your class</h3>
          <div className="guide-tip">
            Two or three sentences: <b>1)</b> what you'll do together, <b>2)</b> who it's for,{' '}
            <b>3)</b> what they'll be able to do afterwards.
          </div>
          <label className="field">
            <span className="label">Description</span>
            <textarea
              className="textarea"
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="We'll practice solving two-step equations with lots of examples. Good for grades 6 to 8. You'll leave knowing how to check your own answers."
              style={{ minHeight: 130 }}
              autoFocus
            />
            <span className="hint">
              {draft.description.trim().length < 30
                ? `${30 - draft.description.trim().length} more characters needed`
                : '✓ Looks good'}
            </span>
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="stack" style={{ gap: 18 }}>
          <h3 className="h3">Level, length and size</h3>
          <div className="field">
            <span className="label">Level</span>
            <div className="optchips">
              {(['intro', 'intermediate', 'all'] as Level[]).map((l) => (
                <button key={l} className={cx('optchip', draft.level === l && 'on')} onClick={() => patch({ level: l })}>
                  {l === 'intro' ? 'Intro friendly' : l === 'intermediate' ? 'Intermediate' : 'All levels'}
                </button>
              ))}
            </div>
            <span className="hint">For a first class, Intro friendly is a good choice.</span>
          </div>
          <div className="field">
            <span className="label">Duration</span>
            <div className="optchips">
              {[45, 60, 75, 90].map((d) => (
                <button key={d} className={cx('optchip', draft.durationMin === d && 'on')} onClick={() => patch({ durationMin: d })}>
                  {d} min
                </button>
              ))}
            </div>
            <span className="hint">Most classes are 60 minutes.</span>
          </div>
          <div className="field">
            <span className="label">Capacity</span>
            <div className="optchips">
              {[4, 6, 8, 10, 12].map((c) => (
                <button key={c} className={cx('optchip', draft.capacity === c && 'on')} onClick={() => patch({ capacity: c })}>
                  {c} spots
                </button>
              ))}
            </div>
            <span className="hint">
              Small groups make it easier to ask questions. 8 is a good size for a first class.
            </span>
          </div>
          <div className="field">
            <span className="label">Minimum age</span>
            <div className="optchips">
              {[10, 12, 13, 14, 16].map((a) => (
                <button key={a} className={cx('optchip', draft.minAge === a && 'on')} onClick={() => patch({ minAge: a })}>
                  {a}+
                </button>
              ))}
            </div>
            <span className="hint">Students younger than this can't save a spot.</span>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="stack" style={{ gap: 16 }}>
          <h3 className="h3">Group classes are free</h3>
          <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
            Anyone can join your class without paying. That's what makes it count as volunteer
            hours.
          </p>
          <div className="eg-row">
            <div className="eg good"><span className="verdict">1</span><span><b>Your hours add up on their own.</b> Each class someone comes to is logged, and you can print a certificate of your hours any time.</span></div>
            <div className="eg good"><span className="verdict">2</span><span><b>Want to tutor someone 1-on-1?</b> You can offer private lessons for up to ${MAX_PRICE} each. Set that up on your dashboard after you post this class.</span></div>
            <div className="eg good"><span className="verdict">3</span><span><b>One class a week to start.</b> Pick a time you can keep every week.</span></div>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="stack" style={{ gap: 16 }}>
          <h3 className="h3">When is it?</h3>
          <div className="guide-tip">
            <b>Tip:</b> weekdays 4 to 7pm and weekends 10am to 4pm work best. Post at least 3 days
            ahead so students have time to sign up.
          </div>
          <div className="grid-2">
            <label className="field">
              <span className="label">Date</span>
              <input
                className="input"
                type="date"
                min={localToday()}
                value={draft.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </label>
            <label className="field">
              <span className="label">Start time</span>
              <input
                className="input"
                type="time"
                value={draft.time}
                onChange={(e) => patch({ time: e.target.value })}
              />
            </label>
          </div>
          <label className="field">
            <span className="label">How often</span>
            <select
              className="select"
              value={draft.repeatWeeks}
              onChange={(e) => patch({ repeatWeeks: Number(e.target.value) })}
            >
              <option value={1}>Just once</option>
              <option value={2}>Every week, for 2 weeks</option>
              <option value={4}>Every week, for 4 weeks</option>
              <option value={6}>Every week, for 6 weeks</option>
              <option value={8}>Every week, for 8 weeks</option>
            </select>
            <span className="hint">
              {draft.repeatWeeks > 1
                ? `This posts ${draft.repeatWeeks} classes, one week apart.`
                : 'One class on this date.'}
            </span>
          </label>
          {startMs && startMs <= Date.now() && (
            <span className="conflict-warn">That time has already passed. Pick a future date.</span>
          )}
          {problem?.step === 5 && startMs && startMs > Date.now() && (
            <span className="conflict-warn">⚠ {problem.msg}</span>
          )}
          {startMs && startMs > Date.now() && problem?.step !== 5 && (
            conflicts.length === 0 ? (
              <span className="conflict-ok">✓ No other class at that time</span>
            ) : (
              <div className="stack" style={{ gap: 6 }}>
                {conflicts.slice(0, 2).map((c) => (
                  <span key={c.id} className="conflict-warn">
                    ⚠ Same time as "{c.title}" ({fmtDate(c.startISO)}, {fmtTime(c.startISO)}). A
                    different time may get more students.
                  </span>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {step === 6 && (
        <div className="stack" style={{ gap: 16 }}>
          <h3 className="h3">Last step: the meeting link</h3>
          <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
            Check the preview. That's what students will see.
          </p>
          <MeetingFields
            link={draft.link}
            meetingId={draft.meetingId}
            passcode={draft.passcode}
            onLink={(v) => patch({ link: v })}
            onMeetingId={(v) => patch({ meetingId: v })}
            onPasscode={(v) => patch({ passcode: v })}
          />
          <span className="hint">
            No link yet? Leave it blank and we'll make a free Jitsi room. You can change the link
            later from the class card.
          </span>

          {tutor && problem ? (
            <div className="guide-tip">
              <b>One thing to fix first:</b> {problem.msg}{' '}
              <button className="btn-quiet" onClick={() => go(problem.step)}>
                Go to that step
              </button>
            </div>
          ) : tutor ? (
            <div className="guide-tip">
              <b>Ready to post.</b> Students can save a spot as soon as you post it.
            </div>
          ) : (
            <div className="stack" style={{ gap: 12 }}>
              <div className="guide-tip">
                <b>Your draft is saved.</b> You can post it once you're approved to teach.
                {profile ? (
                  myApp?.status === 'pending' ? (
                    <> We're reviewing your application. Once it's approved, come back and post.</>
                  ) : myCerts.length > 0 ? (
                    <> You've passed the quiz. Now send the short application.</>
                  ) : (
                    <> Take the quiz if your subject has one, then send a short application.</>
                  )
                ) : (
                  <> Sign in and send a short application. Python and AI also have a 10-minute quiz. The team reviews applications within a few days.</>
                )}
              </div>
              <div className="row">
                <Link to="/teach" className="btn btn-primary btn-sm">
                  {myCerts.length > 0 ? 'Send the application' : 'Take the quiz'}
                </Link>
                <button className="btn-quiet" onClick={() => toast('Draft saved. You can find it on your dashboard.')}>
                  Finish later
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </GuideShell>
  );
}

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GuideShell, type GuideStepDef } from '../components/GuideShell';
import { KudosModal } from '../components/KudosModal';
import { subjectSessions, useStore } from '../lib/store';
import { SUBJECTS, type SubjectId, type Tutor } from '../lib/types';
import { cx, fmtRelativeDay, fmtTime } from '../lib/util';

const STEPS: GuideStepDef[] = [
  { id: 'track', label: 'Pick your track' },
  { id: 'spot', label: 'Grab a spot' },
  { id: 'show', label: 'Show up' },
  { id: 'steer', label: 'Steer the schedule' },
  { id: 'loop', label: 'Close the loop' },
];

/** A sandbox ticket — RSVP mechanics with zero consequences. */
function DemoTicket() {
  const [mode, setMode] = useState<'open' | 'full'>('open');
  const [going, setGoing] = useState(false);
  const [waitPos, setWaitPos] = useState(0);

  const demoDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d;
  }, []);

  const reset = () => {
    setGoing(false);
    setWaitPos(0);
  };

  const spotsLeft = mode === 'open' ? (going ? 1 : 2) : 0;

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 8 }}>
        <button className={cx('chip chip-btn', mode === 'open' && 'on')} onClick={() => { setMode('open'); reset(); }}>
          scenario: spots open
        </button>
        <button className={cx('chip chip-btn', mode === 'full' && 'on')} onClick={() => { setMode('full'); reset(); }}>
          scenario: class is full
        </button>
      </div>

      <article className="card ticket" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="ticket-stub">
          <span className="ticket-wd">{demoDate.toLocaleDateString(undefined, { weekday: 'short' })}</span>
          <span className="ticket-day">{String(demoDate.getDate()).padStart(2, '0')}</span>
          <span className="ticket-mo">{demoDate.toLocaleDateString(undefined, { month: 'short' })}</span>
        </div>
        <div className="ticket-body">
          <div className="row between">
            <div className="row" style={{ gap: 8 }}>
              <span className="chip" data-subject="python">Python</span>
              <span className="chip chip-ghost">Practice card</span>
            </div>
            {going && <span className="mono small going-tag">✓ going</span>}
          </div>
          <h3 className="ticket-title">Loops that finally click — sandbox edition</h3>
          <p className="ticket-desc">
            This card is fake. Click things. Nothing you do here touches the real board.
          </p>
          <div className="spots">
            <div className="spots-bar">
              <div
                className="spots-fill"
                style={{ width: mode === 'full' ? '100%' : going ? '92%' : '83%' }}
              />
            </div>
            <span className={cx('spots-label', mode === 'open' && !going && 'tight')}>
              {mode === 'full'
                ? `full — every spot passed on${waitPos ? ' · 3 waiting' : ' · 2 waiting'}`
                : `${spotsLeft} of 12 spots left — almost gone`}
            </span>
          </div>
          <div className="row">
            {mode === 'open' ? (
              going ? (
                <>
                  <a className="btn btn-soft btn-sm" href="#demo" onClick={(e) => e.preventDefault()}>
                    Join the room ↗
                  </a>
                  <button className="btn btn-ghost btn-sm" onClick={(e) => e.preventDefault()}>
                    Add to calendar
                  </button>
                  <button className="btn-quiet" onClick={() => setGoing(false)}>
                    can't make it?
                  </button>
                </>
              ) : (
                <button className="btn btn-primary btn-sm" onClick={() => setGoing(true)}>
                  Save my spot — free
                </button>
              )
            ) : waitPos ? (
              <>
                <span className="chip chip-founder">waitlist #{waitPos}</span>
                <button className="btn-quiet" onClick={() => setWaitPos(0)}>
                  leave waitlist
                </button>
              </>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => setWaitPos(3)}>
                Join the waitlist
              </button>
            )}
          </div>
        </div>
      </article>

      <p className="guide-tip" aria-live="polite">
        {mode === 'open' ? (
          going ? (
            <>
              <b>That's genuinely all it is.</b> The room link appears the moment you're in, and
              "Add to calendar" drops an invite file into your phone. Changed your mind? "can't
              make it?" frees the spot for someone else — no guilt, no fee, obviously.
            </>
          ) : (
            <>
              <b>Try it — save the spot.</b> No card, no account wall, no "free trial." The
              button means what it says.
            </>
          )
        ) : waitPos ? (
          <>
            <b>You're #{waitPos} in line.</b> When someone releases a spot, the first person
            waiting is promoted automatically — it happens more often than you'd think.
          </>
        ) : (
          <>
            <b>Full class? Join the waitlist.</b> Spots free up all the time, and promotion is
            automatic — first in line gets it, instantly.
          </>
        )}
      </p>
    </div>
  );
}

export function GuideStudent() {
  const { db, profile, requireProfile, voteRequest } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [subject, setSubject] = useState<SubjectId | null>(null);
  const [thanking, setThanking] = useState<Tutor | null>(null);

  const go = (i: number) => {
    setStep(i);
    setMaxVisited((m) => Math.max(m, i));
  };

  const nextSessions = subject ? subjectSessions(db, subject).slice(0, 2) : [];
  const topRequests = [...db.requests].sort((a, b) => b.votes - a.votes).slice(0, 3);
  const founder = db.tutors.find((t) => t.isFounder) ?? db.tutors[0];

  const finish = () => {
    localStorage.setItem('relay.toured', '1');
    navigate(subject ? `/sessions?subject=${subject}` : '/sessions');
  };

  const stepValid = [subject !== null, true, true, true, true][step];

  const footer = (
    <>
      <button className="btn btn-ghost btn-sm" disabled={step === 0} onClick={() => go(step - 1)}>
        ← Back
      </button>
      {step < STEPS.length - 1 ? (
        <button className="btn btn-primary btn-sm" disabled={!stepValid} onClick={() => go(step + 1)}>
          {step === 0 && !stepValid ? 'Pick a track first' : 'Next →'}
        </button>
      ) : (
        <button className="btn btn-primary" onClick={finish}>
          Find my first session →
        </button>
      )}
    </>
  );

  return (
    <>
      <GuideShell
        eyebrow="student starter guide · ~2 minutes"
        title={
          <>
            How Relay works — <em className="em-ember">by doing it.</em>
          </>
        }
        intro="Five short legs: pick a subject, practice grabbing a spot on a sandbox card, learn what sessions feel like, vote on what gets taught next, and see how the whole thing pays for itself."
        steps={STEPS}
        current={step}
        maxVisited={maxVisited}
        onStep={go}
        footer={footer}
      >
        {step === 0 && (
          <div className="stack" style={{ gap: 16 }}>
            <h3 className="h3">What do you want to get good at?</h3>
            <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
              Two tracks are live right now — Math, Physics, and Web Dev are on the way. Pick one
              and we'll show you what's actually coming up.
            </p>
            <div className="row" style={{ gap: 10 }}>
              {SUBJECTS.map((s) => (
                <button
                  key={s.id}
                  className={cx('optchip', subject === s.id && 'on')}
                  onClick={() => setSubject(s.id)}
                >
                  {s.name}
                </button>
              ))}
            </div>
            {subject && (
              <div className="stack" style={{ gap: 8 }}>
                <span className="mono small muted">next on the board — real sessions, real seats:</span>
                {nextSessions.length === 0 ? (
                  <div className="guide-tip">
                    Nothing scheduled this second — that's what topic requests are for (leg 04).
                  </div>
                ) : (
                  nextSessions.map((s) => (
                    <div key={s.id} className="next-session">
                      <span className="mono">{fmtRelativeDay(s.startISO)} · {fmtTime(s.startISO)}</span>
                      <span>{s.title}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="stack" style={{ gap: 16 }}>
            <h3 className="h3">Grab a spot — practice here</h3>
            <DemoTicket />
          </div>
        )}

        {step === 2 && (
          <div className="stack" style={{ gap: 14 }}>
            <h3 className="h3">Showing up is the whole assignment</h3>
            <div className="eg-row" style={{ gap: 12 }}>
              <div className="eg good">
                <span className="verdict">01</span>
                <span>
                  <b>The room link is yours after you RSVP</b> — it lives on the session card and
                  your dashboard. When a session is live, the card literally says so and the join
                  button lights up.
                </span>
              </div>
              <div className="eg good">
                <span className="verdict">02</span>
                <span>
                  <b>Cameras optional, questions mandatory-ish.</b> Groups are capped small on
                  purpose. The "embarrassing" question is the one half the room has.
                </span>
              </div>
              <div className="eg good">
                <span className="verdict">03</span>
                <span>
                  <b>Your tutor was you, about eight weeks ago.</b> That's not a bug — recent
                  learners remember exactly which part was confusing.
                </span>
              </div>
              <div className="eg good">
                <span className="verdict">04</span>
                <span>
                  <b>Life happens.</b> "Can't make it?" releases your spot — the first person on
                  the waitlist gets it automatically.
                </span>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="stack" style={{ gap: 16 }}>
            <h3 className="h3">The schedule is a democracy</h3>
            <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
              Tutors build classes from the request board. These +1 buttons are <b>real</b> — go
              ahead, steer the curriculum:
            </p>
            <div className="stack" style={{ gap: 4 }}>
              {topRequests.map((r) => {
                const voted = !!profile && r.votedBy.includes(profile.email);
                return (
                  <div key={r.id} className="line-item" style={{ padding: '11px 0' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 580 }}>{r.topic}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {r.subject} · asked by {r.by}
                      </div>
                    </div>
                    <button
                      className={cx('chip chip-btn', voted && 'on')}
                      onClick={() => requireProfile((p) => voteRequest(r.id, p.email))}
                    >
                      ▲ {r.votes}
                    </button>
                  </div>
                );
              })}
            </div>
            <span className="hint">
              want something that isn't listed? the request form lives on the{' '}
              <Link to="/sessions#requests" style={{ color: 'var(--ember-deep)' }}>session board</Link>
            </span>
          </div>
        )}

        {step === 4 && (
          <div className="stack" style={{ gap: 16 }}>
            <h3 className="h3">This is how it stays free</h3>
            <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
              Nobody pays money — ever. The economy runs on two things you can give instead:
            </p>
            <div className="eg-row" style={{ gap: 12 }}>
              <div className="eg good">
                <span className="verdict">♥</span>
                <span>
                  <b>Kudos.</b> A thank-you note is the only payment tutors get, and it lands on
                  the public wall.{' '}
                  {founder && (
                    <button className="btn-quiet" onClick={() => setThanking(founder)}>
                      try it — thank {founder.name.split(' ')[0]} for building this →
                    </button>
                  )}
                </span>
              </div>
              <div className="eg good">
                <span className="verdict">⟳</span>
                <span>
                  <b>The baton.</b> When something finally clicks for you, you teach it to the
                  next person. Pass a 10-minute quiz, apply, host a session — your hours get
                  logged on a real volunteer certificate. That's the whole loop.{' '}
                  <Link to="/guide/tutor" style={{ color: 'var(--ember-deep)', borderBottom: '1.5px dotted' }}>
                    peek at the tutor guide
                  </Link>
                </span>
              </div>
            </div>
            <div className="guide-tip">
              <b>That's the tour.</b> The button below drops you on the live board, filtered to{' '}
              {subject ? SUBJECTS.find((s) => s.id === subject)?.name : 'your subject'} — first
              spot's on us. (They're all on us.)
            </div>
          </div>
        )}
      </GuideShell>

      {thanking && <KudosModal tutor={thanking} onClose={() => setThanking(null)} />}
    </>
  );
}

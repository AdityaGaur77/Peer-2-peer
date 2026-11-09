import { useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GuideShell, type GuideStepDef } from '../components/GuideShell';
import { KudosModal } from '../components/KudosModal';
import { subjectSessions, useStore } from '../lib/store';
import { SUBJECTS, subjectMeta, type SubjectId, type Tutor } from '../lib/types';
import { cx, fmtRelativeDay, fmtTime } from '../lib/util';

const STEPS: GuideStepDef[] = [
  { id: 'track', label: 'Pick a subject' },
  { id: 'spot', label: 'Save a spot' },
  { id: 'show', label: 'Join the class' },
  { id: 'steer', label: 'Ask for a class' },
  { id: 'loop', label: 'Say thanks' },
];

/** A practice class card: nothing on it is saved. */
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
          Example: spots open
        </button>
        <button className={cx('chip chip-btn', mode === 'full' && 'on')} onClick={() => { setMode('full'); reset(); }}>
          Example: class is full
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
              <span className="chip" data-subject="python" style={{ '--sub-h': 212 } as CSSProperties}>
                Python
              </span>
              <span className="chip chip-ghost">Practice card</span>
            </div>
            {going && <span className="small going-tag">✓ You're going</span>}
          </div>
          <h3 className="ticket-title">Practice class: Python loops</h3>
          <p className="ticket-desc">
            Practice card: try saving a spot. Nothing here is real.
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
                ? `Full · ${waitPos ? 3 : 2} on the waitlist`
                : `${spotsLeft} of 12 spots left`}
            </span>
          </div>
          <div className="row">
            {mode === 'open' ? (
              going ? (
                <>
                  <a className="btn btn-soft btn-sm" href="#demo" onClick={(e) => e.preventDefault()}>
                    Join class ↗
                  </a>
                  <button className="btn btn-ghost btn-sm" onClick={(e) => e.preventDefault()}>
                    Add to calendar
                  </button>
                  <button className="btn-quiet" onClick={() => setGoing(false)}>
                    Can't make it?
                  </button>
                </>
              ) : (
                <button className="btn btn-primary btn-sm" onClick={() => setGoing(true)}>
                  Save my spot (free)
                </button>
              )
            ) : waitPos ? (
              <>
                <span className="chip chip-founder">Waitlist #{waitPos}</span>
                <button className="btn-quiet" onClick={() => setWaitPos(0)}>
                  Leave waitlist
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
              <b>That's it.</b> Once you've saved a spot, the class link shows up on the card
              and on your dashboard. If you can't make it, tap "Can't make it?" and the next
              person on the waitlist gets your spot.
            </>
          ) : (
            <>
              <b>Try it.</b> Tap "Save my spot". On the real site you sign in with your email
              first. It's free.
            </>
          )
        ) : waitPos ? (
          <>
            <b>You're #{waitPos} on the waitlist.</b> If someone drops out, the first person
            on the waitlist gets their spot automatically.
          </>
        ) : (
          <>
            <b>Class full? Join the waitlist.</b> If a spot opens, the first person waiting
            gets it automatically.
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
          {step === 0 && !stepValid ? 'Pick a subject first' : 'Next →'}
        </button>
      ) : (
        <button className="btn btn-primary" onClick={finish}>
          See classes →
        </button>
      )}
    </>
  );

  return (
    <>
      <GuideShell
        title={
          <>
            How Peer 2 Peer works
          </>
        }
intro="Five quick steps: pick a subject, practice saving a spot, see what a class is like, and ask for the classes you want."
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
              Pick a subject and we'll show you the next classes in it.
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
                <span className="small muted">Coming up:</span>
                {nextSessions.length === 0 ? (
                  <div className="guide-tip">
                    Nothing is scheduled in this subject yet. You can ask for it in step 4.
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
            <h3 className="h3">Practice saving a spot</h3>
            <DemoTicket />
          </div>
        )}

        {step === 2 && (
          <div className="stack" style={{ gap: 14 }}>
            <h3 className="h3">What a class is like</h3>
            <div className="eg-row" style={{ gap: 12 }}>
              <div className="eg good">
                <span className="verdict">1</span>
                <span>
                  <b>You get the class link after you save a spot.</b> It's on the class card and
                  your dashboard. When the class starts, the card shows a "Join class" button.
                </span>
              </div>
              <div className="eg good">
                <span className="verdict">2</span>
                <span>
                  <b>Cameras are optional.</b> Classes are small, so it's easy to ask questions.
                  If you're confused, others probably are too.
                </span>
              </div>
              <div className="eg good">
                <span className="verdict">3</span>
                <span>
                  <b>Your teacher is a high school student</b> who learned this recently, so they
                  remember which parts are confusing.
                </span>
              </div>
              <div className="eg good">
                <span className="verdict">4</span>
                <span>
                  <b>Can't come?</b> Tap "Can't make it?" so someone on the waitlist can have your
                  spot.
                </span>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="stack" style={{ gap: 16 }}>
            <h3 className="h3">Ask for the classes you want</h3>
            <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
              Teachers look at this list when they plan new classes. Tap ▲ to vote for a topic
              you'd like (you'll need to sign in):
            </p>
            <div className="stack" style={{ gap: 4 }}>
              {topRequests.length === 0 && (
                <p className="muted small">No requests yet. Yours could be the first.</p>
              )}
              {topRequests.map((r) => {
                const voted = !!profile && r.votedBy.includes(profile.email);
                return (
                  <div key={r.id} className="line-item" style={{ padding: '11px 0' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 580 }}>{r.topic}</div>
                      <div className="small muted">
                        {r.subject === 'other' ? 'Other' : subjectMeta(r.subject).name} · asked by {r.by}
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
              Want something that isn't listed? Ask for it at the bottom of the{' '}
              <Link to="/sessions#requests" style={{ color: 'var(--ember-deep)', textDecoration: 'underline' }}>Classes page</Link>.
            </span>
          </div>
        )}

        {step === 4 && (
          <div className="stack" style={{ gap: 16 }}>
            <h3 className="h3">Group classes are free</h3>
            <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
              Our teachers volunteer an hour a week for their group class. If you want extra
              help, some of them also tutor 1-on-1 for up to $20 a lesson. Two ways to help it
              going:
            </p>
            <div className="eg-row" style={{ gap: 12 }}>
              <div className="eg good">
                <span className="verdict">♥</span>
                <span>
                  <b>Saying thanks.</b> You can send a teacher a thank-you note after a class.
                  It shows up on the home page.{' '}
                  {founder && (
                    <button className="btn-quiet" onClick={() => setThanking(founder)}>
                      Send {founder.name.split(' ')[0]} a thank-you →
                    </button>
                  )}
                </span>
              </div>
              <div className="eg good">
                <span className="verdict">⟳</span>
                <span>
                  <b>Teaching later.</b> Once you know a subject well, you can apply to teach
                  it. Teachers get volunteer hours and a certificate.{' '}
                  <Link to="/guide/tutor" style={{ color: 'var(--ember-deep)', borderBottom: '1.5px dotted' }}>
                    See how teaching works
                  </Link>
                </span>
              </div>
            </div>
            <div className="guide-tip">
              <b>That's it.</b> The button below shows you the real{' '}
              {subject ? SUBJECTS.find((s) => s.id === subject)?.name : ''} classes. Every group
              class is free.
            </div>
          </div>
        )}
      </GuideShell>

      {thanking && <KudosModal tutor={thanking} onClose={() => setThanking(null)} />}
    </>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GuideShell, type GuideStepDef } from '../components/GuideShell';
import { SessionCard } from '../components/SessionCard';
import {
  applicationFor, certsFor, tutorByEmail, upcomingSessions, useStore,
} from '../lib/store';
import { SUBJECTS, type Level, type Session, type SubjectId } from '../lib/types';
import { cx, fmtDate, fmtTime, uid } from '../lib/util';

const DRAFT_KEY = 'relay.classdraft';

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
  { id: 'subject', label: 'The subject' },
  { id: 'name', label: 'The name' },
  { id: 'pitch', label: 'The pitch' },
  { id: 'shape', label: 'The shape' },
  { id: 'price', label: 'The price' },
  { id: 'when', label: 'The when' },
  { id: 'post', label: 'Post it' },
];

const QUIPS = [
  'nice try.',
  "we don't do that here.",
  'the slider is decorative.',
  "$0. it's kind of our whole thing.",
];

export function GuideTutor() {
  const { db, profile, requireProfile, createSession, toast } = useStore();
  const navigate = useNavigate();
  const [{ draft: initialDraft, step: initialStep }] = useState(loadDraft);
  const [draft, setDraft] = useState<ClassDraft>(initialDraft);
  const [step, setStep] = useState(initialStep);
  const [maxVisited, setMaxVisited] = useState(initialStep);
  const [priceVal, setPriceVal] = useState(0);
  const [quip, setQuip] = useState('');

  const tutor = profile ? tutorByEmail(db, profile.email) : undefined;
  const myCerts = profile ? certsFor(db, profile.email) : [];
  const myApp = profile ? applicationFor(db, profile.email) : undefined;

  // autosave the draft — it survives reloads and waits on the dashboard
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, step }));
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
    true,
  ][step];

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
      link: draft.link || 'https://meet.jit.si/relay-your-class',
      status: 'scheduled',
    };
  }, [draft, startMs, tutor?.id]);

  const wigglePrice = (v: number) => {
    setPriceVal(v);
    if (v > 0) {
      setQuip(QUIPS[Math.floor(Math.random() * QUIPS.length)]);
      window.setTimeout(() => setPriceVal(0), 380);
    }
  };

  const publish = () => {
    requireProfile((p) => {
      const me = tutorByEmail(db, p.email);
      if (!me || !draft.subject || !startMs) return;
      const slug = draft.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32) || uid('class');
      const id = createSession({
        title: draft.title.trim(),
        subject: draft.subject,
        level: draft.level,
        description: draft.description.trim(),
        tutorId: me.id,
        startISO: new Date(startMs).toISOString(),
        durationMin: draft.durationMin,
        capacity: draft.capacity,
        link: draft.link.trim() || `https://meet.jit.si/relay-${slug}`,
      });
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
        <button className="btn btn-primary" disabled={!draft.subject || !startMs} onClick={publish}>
          Post it to the board
        </button>
      ) : (
        <span className="hint">finish the tutor steps below and this button unlocks</span>
      )}
    </>
  );

  const aside = (
    <>
      <span className="aside-note">live preview — updates as you type</span>
      <SessionCard session={previewSession} preview />
      <p className="hint">this is exactly the ticket learners will see on the board</p>
    </>
  );

  return (
    <GuideShell
      eyebrow="tutor onboarding · ~5 minutes"
      title={
        <>
          Build your first class, <em className="em-ember">step by step.</em>
        </>
      }
      intro="This isn't a tour — it's the real thing. Each leg fills in a piece of your actual class, the preview builds as you go, and the last step posts it to the board."
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
            Pick the subject you're certified in — or the one you're about to certify in. One
            class, one subject, one idea. Resist the urge to teach everything at once.
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
                <>You'll sign in before posting — no account needed to draft.</>
              ) : myCerts.some((c) => c.subject === draft.subject) ? (
                <>
                  <b>✓ You're certified in {SUBJECTS.find((s) => s.id === draft.subject)?.name}.</b>{' '}
                  Clear runway — keep going.
                </>
              ) : (
                <>
                  <b>Heads up:</b> you haven't passed the{' '}
                  {SUBJECTS.find((s) => s.id === draft.subject)?.name} quiz yet. Draft now, then
                  take it on the <Link to="/teach" style={{ color: 'var(--ember-deep)', borderBottom: '1.5px dotted' }}>Teach page</Link> — 10 minutes, unlimited retakes.
                </>
              )}
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="stack" style={{ gap: 16 }}>
          <h3 className="h3">Name the outcome, not the topic</h3>
          <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
            Learners scroll past topics. They stop for the thing they'll walk away with.
          </p>
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
              {draft.title.trim().length}/70 — watch it appear on the ticket →
            </span>
          </label>
          <div className="eg-row">
            <div className="eg good">
              <span className="verdict">YES</span>
              <span>"Build a number-guessing game, start to finish" — a promise</span>
            </div>
            <div className="eg good">
              <span className="verdict">YES</span>
              <span>"Debugging clinic — bring your broken code" — an invitation</span>
            </div>
            <div className="eg bad">
              <span className="verdict">NO</span>
              <span>"Python lesson 3" — a chore with a number on it</span>
            </div>
            <div className="eg bad">
              <span className="verdict">NO</span>
              <span>"Tutoring session" — the beige of titles</span>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="stack" style={{ gap: 16 }}>
          <h3 className="h3">Pitch it in three sentences</h3>
          <div className="guide-tip">
            The formula: <b>1)</b> what you'll actually do together, <b>2)</b> who it's for,{' '}
            <b>3)</b> what they leave with. Write like you're texting a friend, because
            functionally you are.
          </div>
          <label className="field">
            <span className="label">Description</span>
            <textarea
              className="textarea"
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="We'll train an image classifier live, watch it fail, feed it better data, and watch it get smart. No math needed — if you can drag files into a folder, you're qualified. You leave with a working model."
              style={{ minHeight: 130 }}
              autoFocus
            />
            <span className="hint">
              {draft.description.trim().length < 30
                ? `${30 - draft.description.trim().length} more characters — one honest sentence gets you there`
                : '✓ that reads like a real person — nice'}
            </span>
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="stack" style={{ gap: 18 }}>
          <h3 className="h3">Shape the room</h3>
          <div className="field">
            <span className="label">Level</span>
            <div className="optchips">
              {(['intro', 'intermediate', 'all'] as Level[]).map((l) => (
                <button key={l} className={cx('optchip', draft.level === l && 'on')} onClick={() => patch({ level: l })}>
                  {l === 'intro' ? 'Intro friendly' : l === 'intermediate' ? 'Intermediate' : 'All levels'}
                </button>
              ))}
            </div>
            <span className="hint">first class? intro-friendly fills fastest and forgives everything</span>
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
            <span className="hint">60 is the sweet spot — 90 only for build-alongs with a finished thing at the end</span>
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
              small enough that asking a "dumb" question feels safe — 8 is perfect for a first class
            </span>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="stack" style={{ gap: 16 }}>
          <h3 className="h3">Set your price</h3>
          <div className="price-gag">
            <span className="price-read">${priceVal}</span>
            <input
              type="range"
              min={0}
              max={20}
              value={priceVal}
              onChange={(e) => wigglePrice(Number(e.target.value))}
              aria-label="Price — locked at zero dollars, permanently"
            />
            <span className="price-quip">{priceVal === 0 ? quip : '…'}</span>
          </div>
          <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
            Relay classes cost <b>$0, forever</b> — that's the deal that makes this place work.
            Learners "pay" by teaching the next person once something clicks. You get paid too,
            just not in dollars:
          </p>
          <div className="eg-row">
            <div className="eg good"><span className="verdict">01</span><span><b>Logged volunteer hours</b> — every session lands on your printable service certificate</span></div>
            <div className="eg good"><span className="verdict">02</span><span><b>Actual mastery</b> — teaching something is the final boss of learning it</span></div>
            <div className="eg good"><span className="verdict">03</span><span><b>The kudos wall</b> — dangerously addictive, you've been warned</span></div>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="stack" style={{ gap: 16 }}>
          <h3 className="h3">Pick the moment</h3>
          <div className="guide-tip">
            <b>What works:</b> weekday 4–7pm or weekend 10am–4pm. Post at least 3 days out so the
            board has time to find your people.
          </div>
          <div className="grid-2">
            <label className="field">
              <span className="label">Date</span>
              <input
                className="input"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
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
          {startMs && startMs <= Date.now() && (
            <span className="conflict-warn">that moment already happened — pick a future one</span>
          )}
          {startMs && startMs > Date.now() && (
            conflicts.length === 0 ? (
              <span className="conflict-ok">✓ clear runway — nothing else on the board overlaps</span>
            ) : (
              <div className="stack" style={{ gap: 6 }}>
                {conflicts.slice(0, 2).map((c) => (
                  <span key={c.id} className="conflict-warn">
                    ⚠ overlaps "{c.title}" ({fmtDate(c.startISO)}, {fmtTime(c.startISO)}) — different
                    time = both classes fill
                  </span>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {step === 6 && (
        <div className="stack" style={{ gap: 16 }}>
          <h3 className="h3">The final handoff</h3>
          <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
            Check the preview one last time — that ticket is exactly what goes on the board.
          </p>
          <label className="field">
            <span className="label">
              Video room link <span className="muted">(optional)</span>
            </span>
            <input
              className="input"
              value={draft.link}
              onChange={(e) => patch({ link: e.target.value })}
              placeholder="paste a Meet/Zoom link, or leave blank for a free Jitsi room"
            />
            <span className="hint">blank = we generate a free Jitsi room, no account needed</span>
          </label>

          {tutor ? (
            <div className="guide-tip">
              <b>You're cleared to post.</b> The button below publishes for real — learners can
              RSVP the second it lands. See you on the track.
            </div>
          ) : (
            <div className="stack" style={{ gap: 12 }}>
              <div className="guide-tip">
                <b>Your draft is saved.</b> One thing left: you need a tutor badge before posting.
                {profile ? (
                  myApp?.status === 'pending' ? (
                    <> Your application is in review — the moment a founder approves it, come back and hit post.</>
                  ) : myCerts.length > 0 ? (
                    <> You've passed a quiz already — just send the 2-minute application.</>
                  ) : (
                    <> The path: pass the {draft.subject === 'ai' ? 'AI' : 'Python'} quiz (~10 min), then a 2-minute application.</>
                  )
                ) : (
                  <> Sign in, pass the subject quiz (~10 min), send a 2-minute application — a founder reviews it fast.</>
                )}
              </div>
              <div className="row">
                <Link to="/teach" className="btn btn-primary btn-sm">
                  {myCerts.length > 0 ? 'Send the application' : 'Take the quiz'}
                </Link>
                <button className="btn-quiet" onClick={() => toast('Draft saved — it\'s waiting on your dashboard.')}>
                  finish later
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </GuideShell>
  );
}

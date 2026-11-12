import { useState, type FormEvent } from 'react';
import { MAX_PRICE } from '../lib/price';
import { tutorById, useStore } from '../lib/store';
import type { Tutor, TutoringRequest, TutoringStatus } from '../lib/types';
import { cx, fmtDate } from '../lib/util';
import { Modal } from './Modal';

/**
 * 1-on-1 tutoring. Group classes are always free; a teacher can also offer
 * private sessions at a price they set (up to $20). Students send a request
 * here, and the teacher emails them to agree a time and how to pay.
 *
 * Students under 18 need a parent's email on the request: the teacher's
 * emails and any payment happen off the site, so an adult is on the thread.
 */
export function RequestTutoring({ tutor, onClose }: { tutor: Tutor; onClose: () => void }) {
  const { requireProfile, requestTutoring, profile } = useStore();
  const [message, setMessage] = useState('');
  const [times, setTimes] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [err, setErr] = useState('');
  const first = tutor.name.split(' ')[0];
  const knownAdult = profile?.age != null && profile.age >= 18;
  const parentRequired = !knownAdult;
  const validEmail = (em: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 10) {
      setErr('Tell them a little about what you need help with.');
      return;
    }
    const pe = parentEmail.trim().toLowerCase();
    if (parentRequired && !validEmail(pe)) {
      setErr("We need a parent's email so they can be on the thread (students under 18).");
      return;
    }
    if (pe && !validEmail(pe)) {
      setErr("That parent email doesn't look right.");
      return;
    }
    // close first, so the sign-in box (if needed) isn't stacked on top of this one
    onClose();
    requireProfile((p) => requestTutoring(tutor.id, message, times, pe, p));
  };

  return (
    <Modal onClose={onClose} labelledBy="tutoring-title">
      <div className="stack" style={{ gap: 6 }}>
        <h2 id="tutoring-title" className="h3">
          Ask {first} for 1-on-1 tutoring
        </h2>
        <p className="muted" style={{ fontSize: 14.5 }}>
          ${tutor.tutoringPrice} a lesson, paid to {first} directly. {first} will email you to pick a
          time. Nothing is charged here — and a parent or guardian is on the thread for students under
          18.
        </p>
      </div>
      <form className="stack" style={{ gap: 14 }} onSubmit={send}>
        <label className="field">
          <span className="label">What do you need help with?</span>
          <textarea
            className="textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="I have a geometry test next Friday and I'm stuck on proofs."
            maxLength={1000}
          />
        </label>
        <label className="field">
          <span className="label">
            When are you free? <span className="muted">(optional)</span>
          </span>
          <input
            className="input"
            value={times}
            onChange={(e) => setTimes(e.target.value)}
            placeholder="Weekdays after 4pm"
            maxLength={200}
          />
        </label>
        <label className="field">
          <span className="label">
            Parent's email{' '}
            {knownAdult ? (
              <span className="muted">(only if you'd like them copied)</span>
            ) : (
              <span className="muted">(required under 18)</span>
            )}
          </span>
          <input
            className="input"
            type="email"
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
            placeholder="parent@example.com"
            maxLength={200}
            autoComplete="email"
            required={parentRequired}
          />
        </label>
        {err && (
          <p className="small" style={{ color: 'var(--hot-deep)' }}>
            {err}
          </p>
        )}
        <button className="btn btn-primary" type="submit">
          Send request
        </button>
        <p className="hint">
          {parentRequired
            ? "The teacher emails your parent directly to set up the time and payment. 1-on-1 sessions are private arrangements between your family and the teacher — the site doesn't handle the money."
            : "The teacher will email you to pick a time and how to pay. The site doesn't handle payments."}
        </p>
      </form>
    </Modal>
  );
}

const STATUS_TEXT: Record<TutoringStatus, string> = {
  new: 'waiting for a reply',
  accepted: 'accepted',
  declined: 'declined',
  done: 'finished',
};

function RequestRow({ r, asTeacher }: { r: TutoringRequest; asTeacher: boolean }) {
  const { db, setTutoringStatus } = useStore();
  const tutor = tutorById(db, r.tutorId);
  return (
    <div className="line-item" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
      <div style={{ minWidth: 0, flex: '1 1 240px' }}>
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>
          {asTeacher ? r.studentName : `1-on-1 with ${tutor?.name ?? 'a teacher'}`}
          <span className={cx('status-pill', r.status === 'new' ? 'status-pending' : r.status === 'declined' ? 'status-declined' : 'status-approved')} style={{ marginLeft: 8 }}>
            {STATUS_TEXT[r.status]}
          </span>
        </div>
        {asTeacher && (
          <div className="small">
            <a href={`mailto:${r.studentEmail}`} data-track="Email student" style={{ color: 'var(--ember-deep)', overflowWrap: 'anywhere' }}>
              {r.studentEmail}
            </a>{' '}
            · sent {fmtDate(r.createdISO)}
            {r.parentEmail && (
              <>
                {' '}
                · parent:{' '}
                <a
                  href={`mailto:${r.parentEmail}`}
                  data-track="Email parent"
                  style={{ color: 'var(--ember-deep)', overflowWrap: 'anywhere' }}
                >
                  {r.parentEmail}
                </a>
              </>
            )}
          </div>
        )}
        <p className="small" style={{ color: 'var(--ink-2)', marginTop: 4 }}>
          {r.message}
        </p>
        {r.times && <p className="small muted">Free: {r.times}</p>}
      </div>
      {asTeacher && (
        <div className="row" style={{ flex: 'none' }}>
          {r.status === 'new' && (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => setTutoringStatus(r.id, 'accepted')}>
                Accept
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setTutoringStatus(r.id, 'declined')}>
                Decline
              </button>
            </>
          )}
          {r.status === 'accepted' && (
            <button className="btn btn-ghost btn-sm" onClick={() => setTutoringStatus(r.id, 'done')}>
              Mark finished
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** On a teacher's dashboard: their 1-on-1 offer and the requests they've had. */
export function TeacherTutoringPanel({ tutor }: { tutor: Tutor }) {
  const { db, setTutoring } = useStore();
  const [on, setOn] = useState(!!tutor.tutoringPrice);
  const [price, setPrice] = useState(tutor.tutoringPrice ?? 10);
  const [note, setNote] = useState(tutor.tutoringNote ?? '');
  const requests = (db.tutoringRequests ?? []).filter((r) => r.tutorId === tutor.id);
  const waiting = requests.filter((r) => r.status === 'new').length;
  const open = requests.filter((r) => r.status === 'new' || r.status === 'accepted');
  const past = requests.filter((r) => r.status === 'done' || r.status === 'declined');

  return (
    <div className="card card-pad stack" style={{ gap: 14, marginBottom: 24 }}>
      <div className="row between">
        <h3 className="h3">1-on-1 tutoring</h3>
        {waiting > 0 && <span className="status-pill status-pending">{waiting} new</span>}
      </div>
      <p className="muted small" style={{ maxWidth: '62ch' }}>
        Your group class is always free. You can also offer private sessions for a price you
        choose, up to ${MAX_PRICE}. Students send you a request here and you email them to set a
        time and how they pay. Paid sessions don't count toward volunteer hours.
      </p>
      <label className="row" style={{ gap: 8, fontSize: 14.5 }}>
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} />
        Offer 1-on-1 tutoring
      </label>
      {on && (
        <div className="grid-2">
          <label className="field">
            <span className="label">Price per lesson: ${price}</span>
            <input
              type="range"
              min={1}
              max={MAX_PRICE}
              step={1}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span className="label">
              What you can help with <span className="muted">(optional)</span>
            </span>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Test prep, homework help, catching up"
              maxLength={300}
            />
          </label>
        </div>
      )}
      <div>
        <button className="btn btn-primary btn-sm" onClick={() => setTutoring(tutor.id, on ? price : null, note)}>
          Save
        </button>
      </div>
      {open.length > 0 && (
        <div>
          <h4 style={{ fontSize: 15, marginBottom: 6 }}>Requests</h4>
          {open.map((r) => (
            <RequestRow key={r.id} r={r} asTeacher />
          ))}
        </div>
      )}
      {past.length > 0 && (
        <details>
          <summary className="small muted" style={{ cursor: 'pointer' }}>
            Finished and declined ({past.length})
          </summary>
          {past.map((r) => (
            <RequestRow key={r.id} r={r} asTeacher />
          ))}
        </details>
      )}
    </div>
  );
}

/** On a student's dashboard: the 1-on-1 requests they've sent. */
export function MyTutoringRequests({ email }: { email: string }) {
  const { db } = useStore();
  const mine = (db.tutoringRequests ?? []).filter(
    (r) => r.studentEmail.toLowerCase() === email.toLowerCase(),
  );
  if (mine.length === 0) return null;
  return (
    <div className="card card-pad" style={{ marginBottom: 24 }}>
      <h3 className="h3" style={{ marginBottom: 8 }}>
        Your 1-on-1 requests
      </h3>
      {mine.map((r) => (
        <RequestRow key={r.id} r={r} asTeacher={false} />
      ))}
    </div>
  );
}

/** For the admin console: every request, with the teacher's controls. */
export function AllTutoringRequests() {
  const { db } = useStore();
  const all = db.tutoringRequests ?? [];
  if (all.length === 0) {
    return <p className="muted small">No 1-on-1 requests yet.</p>;
  }
  return (
    <div className="card card-pad">
      {all.map((r) => (
        <div key={r.id}>
          <div className="small muted" style={{ marginTop: 8 }}>
            to {tutorById(db, r.tutorId)?.name ?? 'a former teacher'}
          </div>
          <RequestRow r={r} asTeacher />
        </div>
      ))}
    </div>
  );
}

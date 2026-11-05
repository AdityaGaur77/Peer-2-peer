import { useState, type FormEvent } from 'react';
import { ago, joinWindow, linkRecentlyUpdated, meetingLinkError, meetingProvider } from '../lib/meeting';
import { useStore } from '../lib/store';
import type { Session } from '../lib/types';
import { cx } from '../lib/util';
import { Modal } from './Modal';

function CopyChip({ label, value }: { label: string; value: string }) {
  const { toast } = useStore();
  return (
    <button
      type="button"
      className="meet-copy"
      onClick={() =>
        navigator.clipboard.writeText(value).then(
          () => toast(`${label} copied.`),
          () => toast(`${label}: ${value}`),
        )
      }
      title={`Copy ${label.toLowerCase()}`}
    >
      <span className="meet-copy-label">{label}</span>
      <span className="meet-copy-value">{value}</span>
      <span className="meet-copy-icon" aria-hidden>
        copy
      </span>
    </button>
  );
}

/**
 * Everything a student needs to get into the call, in one place: the join
 * button, the meeting ID and passcode if there are any, and a loud notice
 * when the teacher changed the link.
 */
export function MeetingPanel({ session, canEdit }: { session: Session; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  if (!session.link) {
    if (!canEdit) return null;
    return (
      <div className="meet meet-fresh">
        <div className="meet-row">
          <span className="small">This class has no meeting link yet.</span>
          <button className="btn btn-soft btn-sm" onClick={() => setEditing(true)}>
            Add the meeting link
          </button>
        </div>
        {editing && <LinkEditor session={session} onClose={() => setEditing(false)} />}
      </div>
    );
  }
  const state = joinWindow(session);
  const provider = meetingProvider(session.link) ?? 'the meeting';
  const fresh = linkRecentlyUpdated(session);

  return (
    <div className={cx('meet', state === 'open' && 'meet-open', fresh && 'meet-fresh')}>
      {fresh && session.linkUpdatedISO && (
        <div className="meet-updated" role="status">
          <b>New link.</b> The teacher changed it {ago(session.linkUpdatedISO)}. Use this one.
        </div>
      )}
      <div className="meet-row">
        <a
          className={cx('btn btn-sm', state === 'open' ? 'btn-primary' : 'btn-soft')}
          href={session.link}
          target="_blank"
          rel="noreferrer"
        >
          {state === 'open' ? `Join now on ${provider} ↗` : `Join on ${provider} ↗`}
        </a>
        {session.meetingId && <CopyChip label="Meeting ID" value={session.meetingId} />}
        {session.passcode && <CopyChip label="Passcode" value={session.passcode} />}
        {canEdit && (
          <button className="btn-quiet" onClick={() => setEditing(true)}>
            update link
          </button>
        )}
      </div>
      {state === 'before' && (
        <span className="hint">the call opens 15 minutes before class starts</span>
      )}
      {editing && <LinkEditor session={session} onClose={() => setEditing(false)} />}
    </div>
  );
}

export function LinkEditor({ session, onClose }: { session: Session; onClose: () => void }) {
  const { updateMeeting, db } = useStore();
  const [link, setLink] = useState(session.link);
  const [meetingId, setMeetingId] = useState(session.meetingId ?? '');
  const [passcode, setPasscode] = useState(session.passcode ?? '');
  const laterWeeks = db.sessions.filter(
    (s) =>
      s.id !== session.id &&
      s.tutorId === session.tutorId &&
      s.title === session.title &&
      s.status === 'scheduled' &&
      s.startISO > session.startISO,
  ).length;
  const [alsoLater, setAlsoLater] = useState(false);
  const error = meetingLinkError(link);

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (error) return;
    updateMeeting(
      session.id,
      { link: link.trim(), meetingId: meetingId.trim(), passcode: passcode.trim() },
      alsoLater,
    );
    onClose();
  };

  return (
    <Modal onClose={onClose} labelledBy="link-title">
      <div className="stack" style={{ gap: 6 }}>
        <h2 id="link-title" className="h3">
          Update the meeting link
        </h2>
        <p className="muted" style={{ fontSize: 14.5 }}>
          If the call hit its time limit, start a new one and paste its link here. Everyone in the
          class sees it straight away, marked as a new link.
        </p>
      </div>
      <form className="stack" style={{ gap: 14 }} onSubmit={save}>
        <MeetingFields
          link={link}
          meetingId={meetingId}
          passcode={passcode}
          onLink={setLink}
          onMeetingId={setMeetingId}
          onPasscode={setPasscode}
        />
        {laterWeeks > 0 && (
          <label className="row" style={{ gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={alsoLater} onChange={(e) => setAlsoLater(e.target.checked)} />
            Also use it for the {laterWeeks} later week{laterWeeks === 1 ? '' : 's'} of this class
          </label>
        )}
        <div className="row between">
          <span className="hint">{error ?? 'ready'}</span>
          <button className="btn btn-primary btn-sm" type="submit" disabled={!!error}>
            Save new link
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Shared by the class builder, the console's Publish tab and the editor above. */
export function MeetingFields({
  link, meetingId, passcode, onLink, onMeetingId, onPasscode,
}: {
  link: string;
  meetingId: string;
  passcode: string;
  onLink: (v: string) => void;
  onMeetingId: (v: string) => void;
  onPasscode: (v: string) => void;
}) {
  const err = link.trim() ? meetingLinkError(link) : null;
  return (
    <>
      <label className="field">
        <span className="label">Meeting link</span>
        <input
          className="input"
          value={link}
          onChange={(e) => onLink(e.target.value)}
          placeholder="https://meet.google.com/abc-defg-hij or a Zoom link"
        />
        <span className="hint" style={err ? { color: 'var(--hot-deep)' } : undefined}>
          {err ?? 'Google Meet, Zoom, Teams, Jitsi or Discord. Only students in the class see it.'}
        </span>
      </label>
      <div className="grid-2">
        <label className="field">
          <span className="label">
            Meeting ID <span className="muted">(if it has one)</span>
          </span>
          <input
            className="input"
            value={meetingId}
            onChange={(e) => onMeetingId(e.target.value)}
            placeholder="812 3456 7890"
          />
        </label>
        <label className="field">
          <span className="label">
            Passcode <span className="muted">(if it has one)</span>
          </span>
          <input
            className="input"
            value={passcode}
            onChange={(e) => onPasscode(e.target.value)}
            placeholder="leave blank if none"
          />
        </label>
      </div>
    </>
  );
}

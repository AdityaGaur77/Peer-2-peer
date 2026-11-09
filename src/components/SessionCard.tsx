import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { downloadSessionICS, googleCalUrl } from '../lib/ics';
import { inviteUrl } from '../lib/invite';
import { countsForHours } from '../lib/price';
import { MeetingPanel } from './MeetingPanel';
import { levelLabel, tutorById, useStore } from '../lib/store';
import type { Session } from '../lib/types';
import { subjectMeta, subjectShort } from '../lib/types';
import {
  cx, fmtDayNum, fmtMonth, fmtRelativeDay, fmtTime, fmtWeekday, initials, isPastSession,
  sessionEnd,
} from '../lib/util';

export function SessionCard({
  session,
  preview,
  previewNote,
}: {
  session: Session;
  preview?: boolean;
  /** Overrides the preview footer — an invite recipient isn't drafting. */
  previewNote?: string;
}) {
  const { db, profile, requireProfile, toggleRsvp, toggleWaitlist, toast, live: liveDb, isAdmin } = useStore();
  const tutor = tutorById(db, session.tutorId);
  const past = isPastSession(session);
  const now = Date.now();
  const live =
    !preview && !past && new Date(session.startISO).getTime() <= now && now <= sessionEnd(session);
  const going = !!profile && session.attendees.some((a) => a.email === profile.email);
  const waitPos = profile
    ? session.waitlist.findIndex((a) => a.email === profile.email) + 1
    : 0;
  const spotsLeft = session.capacity - session.attendees.length;
  const full = spotsLeft <= 0;
  const meta = subjectMeta(session.subject);
  // the tutor running it gets the recruiting tools
  const isMine =
    !!profile && !!tutor && !!tutor.email && tutor.email.toLowerCase() === profile.email.toLowerCase();
  const canEditLink = isMine || isAdmin;

  // An invite link carries the whole class inside the URL, so it works even
  // for someone who has never opened Peer 2 Peer before (see lib/invite.ts).
  // On the live database every class is already on everyone's board, so a
  // plain link will do, and it never carries the meeting link.
  const share = async () => {
    const plain = `${window.location.origin}${window.location.pathname}#/sessions?s=${session.id}`;
    let url = plain;
    if (!liveDb) {
      try {
        url = await inviteUrl(session, tutor);
      } catch {
        url = plain;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast('Link copied. Send it to a friend.');
  };

  return (
    <article className={cx('card card-hover ticket', past && 'ticket-past')}>
      <div className="ticket-stub">
        <span className="ticket-wd">{fmtWeekday(session.startISO)}</span>
        <span className="ticket-day">{fmtDayNum(session.startISO)}</span>
        <span className="ticket-mo">{fmtMonth(session.startISO)}</span>
      </div>

      <div className="ticket-body">
        <div className="row between">
          <div className="row" style={{ gap: 8 }}>
            <span
              className="chip"
              data-subject={session.subject}
              style={{ '--sub-h': meta.hue } as CSSProperties}
            >
              {subjectShort(session.subject)}
            </span>
            <span className="chip chip-ghost">{levelLabel(session.level)}</span>
            {session.minAge ? <span className="chip chip-ghost">ages {session.minAge}+</span> : null}
            <span className="chip chip-ghost">Free</span>
            {live && <span className="chip chip-live">Happening now</span>}
          </div>
          {going && !past && <span className="small going-tag">✓ You're going</span>}
        </div>

        <h3 className="ticket-title">{session.title}</h3>
        <p className="ticket-desc">{session.description}</p>

        <div className="ticket-meta">
          <span style={live ? { color: 'var(--hot-deep)', fontWeight: 700 } : undefined}>
            {live
              ? `Happening now, until ${fmtTime(new Date(sessionEnd(session)).toISOString())}`
              : `${fmtRelativeDay(session.startISO)} · ${fmtTime(session.startISO)} · ${session.durationMin} min`}
          </span>
          {tutor && (
            <span className="row" style={{ gap: 7 }}>
              <span className="avatar avatar-sm" style={{ '--h': tutor.hue } as CSSProperties}>
                {initials(tutor.name)}
              </span>
              {tutor.name}
            </span>
          )}
        </div>

        {preview ? (
          <div className="spots-label">
            {previewNote ??
              `Preview · ${session.capacity} spots`}
          </div>
        ) : past ? (
          <div className="spots-label">
            Finished · {session.attendees.length} {session.attendees.length === 1 ? 'student' : 'students'}
            {countsForHours(session) ? ' · counts toward volunteer hours' : ''}
          </div>
        ) : (
          <>
            <div className="spots">
              <div className="spots-bar">
                <div
                  className="spots-fill"
                  style={{
                    width: `${Math.min(100, (session.attendees.length / session.capacity) * 100)}%`,
                  }}
                />
              </div>
              <span className={cx('spots-label', spotsLeft <= 3 && !full && 'tight')}>
                {full
                  ? `Full${session.waitlist.length ? ` · ${session.waitlist.length} on the waitlist` : ''}`
                  : `${spotsLeft} of ${session.capacity} spots left`}
              </span>
            </div>

            {(going || canEditLink) && <MeetingPanel session={session} canEdit={canEditLink} />}

            {canEditLink && <Roster session={session} />}

            <div className="row">
              {isMine ? null : going ? (
                <>
                  <button className="btn btn-ghost btn-sm" onClick={() => downloadSessionICS(session, tutor)}>
                    Download calendar file
                  </button>
                  <a
                    className="btn-quiet"
                    href={googleCalUrl(session, tutor)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Add to Google Calendar
                  </a>
                  <button
                    className="btn-quiet"
                    onClick={() => requireProfile((p) => toggleRsvp(session.id, p))}
                  >
                    Can't make it?
                  </button>
                </>
              ) : full ? (
                waitPos > 0 ? (
                  <>
                    <span className="chip chip-founder">Waitlist #{waitPos}</span>
                    <button
                      className="btn-quiet"
                      onClick={() => requireProfile((p) => toggleWaitlist(session.id, p))}
                    >
                      Leave waitlist
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => requireProfile((p) => toggleWaitlist(session.id, p))}
                  >
                    Join the waitlist
                  </button>
                )
              ) : (
                <>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => requireProfile((p) => toggleRsvp(session.id, p))}
                  >
                    Save my spot
                  </button>
                  {!canEditLink && <span className="hint">You get the class link after you save a spot.</span>}
                </>
              )}
              <button className="btn-quiet" onClick={share} title="Copies a link to this class">
                Copy link to share
              </button>
              {isMine && (
                <Link className="btn-quiet" to={`/flyer/${session.id}`}>
                  Flyer
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}

/** For the class's teacher (and admins): who is coming and who is waiting. */
function Roster({ session }: { session: Session }) {
  const people = [
    ...session.attendees.map((a) => ({ ...a, waiting: false })),
    ...session.waitlist.map((a) => ({ ...a, waiting: true })),
  ].filter((a) => !a.email.startsWith('hidden:'));
  return (
    <details className="roster">
      <summary>
        Who's coming ({session.attendees.length}
        {session.waitlist.length ? `, ${session.waitlist.length} waiting` : ''})
      </summary>
      {people.length === 0 ? (
        <p className="small muted">Nobody yet. Share the class link to fill it.</p>
      ) : (
        <ul>
          {people.map((a) => (
            <li key={a.email}>
              <span>{a.name || a.email}</span>
              <span className="small muted">
                {a.email}
                {a.waiting ? ' · waiting' : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

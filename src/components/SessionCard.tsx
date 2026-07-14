import type { CSSProperties } from 'react';
import { downloadSessionICS } from '../lib/ics';
import { levelLabel, tutorById, useStore } from '../lib/store';
import type { Session } from '../lib/types';
import { subjectMeta } from '../lib/types';
import {
  cx, fmtDayNum, fmtMonth, fmtRelativeDay, fmtTime, fmtWeekday, initials, isPastSession,
  sessionEnd,
} from '../lib/util';

export function SessionCard({ session, preview }: { session: Session; preview?: boolean }) {
  const { db, profile, requireProfile, toggleRsvp, toggleWaitlist, toast } = useStore();
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

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/sessions?s=${session.id}`;
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
    toast('Link copied — bring a friend.');
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
            <span className="chip" data-subject={session.subject}>
              {meta.name.split(' ')[0]}
            </span>
            <span className="chip chip-ghost">{levelLabel(session.level)}</span>
            {live && <span className="chip chip-live">live now</span>}
          </div>
          {going && !past && <span className="mono small going-tag">✓ going</span>}
        </div>

        <h3 className="ticket-title">{session.title}</h3>
        <p className="ticket-desc">{session.description}</p>

        <div className="ticket-meta">
          <span style={live ? { color: 'var(--hot-deep)', fontWeight: 700 } : undefined}>
            {live
              ? `happening now — until ${fmtTime(new Date(sessionEnd(session)).toISOString())}`
              : `${fmtRelativeDay(session.startISO)} · ${fmtTime(session.startISO)} · ${session.durationMin}min`}
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
            draft preview · {session.capacity} spots · goes live on the board when you post it
          </div>
        ) : past ? (
          <div className="spots-label">
            completed · {session.attendees.length} learners · counts toward volunteer hours
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
                  ? `full — every spot passed on${session.waitlist.length ? ` · ${session.waitlist.length} waiting` : ''}`
                  : `${spotsLeft} of ${session.capacity} spots left${spotsLeft <= 3 ? ' — almost gone' : ''}`}
              </span>
            </div>

            <div className="row">
              {going ? (
                <>
                  <a className="btn btn-soft btn-sm" href={session.link} target="_blank" rel="noreferrer">
                    {live ? 'Join now — it\'s on ↗' : 'Join the room ↗'}
                  </a>
                  <button className="btn btn-ghost btn-sm" onClick={() => downloadSessionICS(session, tutor)}>
                    Add to calendar
                  </button>
                  <button
                    className="btn-quiet"
                    onClick={() => requireProfile((p) => toggleRsvp(session.id, p))}
                  >
                    can't make it?
                  </button>
                </>
              ) : full ? (
                waitPos > 0 ? (
                  <>
                    <span className="chip chip-founder">waitlist #{waitPos}</span>
                    <button
                      className="btn-quiet"
                      onClick={() => requireProfile((p) => toggleWaitlist(session.id, p))}
                    >
                      leave waitlist
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
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => requireProfile((p) => toggleRsvp(session.id, p))}
                >
                  Save my spot — free
                </button>
              )}
              <button className="btn-quiet" onClick={share}>
                copy link
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

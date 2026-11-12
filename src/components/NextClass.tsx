/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { joinWindow } from '../lib/meeting';
import { tutorById, useStore } from '../lib/store';
import type { Profile, RelayState, Session } from '../lib/types';
import { fmtRelativeDay, fmtTime, fmtTz, initials, sessionEnd } from '../lib/util';
import { MeetingPanel } from './MeetingPanel';

/** Classes this person is in or teaches that haven't finished, soonest first. */
export function myClasses(db: RelayState, profile: Profile | null, now = Date.now()): Session[] {
  if (!profile) return [];
  const me = profile.email.toLowerCase();
  const myTutorIds = new Set(
    db.tutors.filter((t) => t.email && t.email.toLowerCase() === me).map((t) => t.id),
  );
  return db.sessions
    .filter(
      (s) =>
        s.status === 'scheduled' &&
        sessionEnd(s) > now &&
        (myTutorIds.has(s.tutorId) || s.attendees.some((a) => a.email.toLowerCase() === me)),
    )
    .sort((a, b) => a.startISO.localeCompare(b.startISO));
}

function useNow(everyMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(t);
  }, [everyMs]);
  return now;
}

/** Top of the dashboard: the one class that matters next, with the way in. */
export function NextClass() {
  const { db, profile, isAdmin } = useStore();
  const now = useNow();
  const next = myClasses(db, profile, now)[0];
  if (!next) return null;
  const tutor = tutorById(db, next.tutorId);
  const teaching = !!tutor?.email && tutor.email.toLowerCase() === profile?.email.toLowerCase();
  const state = joinWindow(next, now);

  return (
    <div className="card card-pad stack" style={{ gap: 12, marginBottom: 24 }}>
      <div className="row between">
        <span className="next-label">{teaching ? 'Your next class to teach' : 'Your next class'}</span>
        <span className="small muted">
          {state === 'open' && new Date(next.startISO).getTime() <= now
            ? 'happening now'
            : `${fmtRelativeDay(next.startISO)} at ${fmtTime(next.startISO)} ${fmtTz(next.startISO)}`}
        </span>
      </div>
      <div className="row" style={{ gap: 12 }}>
        {tutor && (
          <span className="avatar" style={{ '--h': tutor.hue } as CSSProperties}>
            {initials(tutor.name)}
          </span>
        )}
        <div style={{ minWidth: 0 }}>
          <h3 className="h3">{next.title}</h3>
          <span className="small muted">
            {tutor ? `with ${tutor.name} · ` : ''}
            {next.durationMin} min
          </span>
        </div>
      </div>
      {next.link ? (
        <MeetingPanel session={next} canEdit={teaching || isAdmin} />
      ) : (
        <span className="hint">The class link will show up here once the teacher adds it.</span>
      )}
    </div>
  );
}

/** Pinned to the bottom of every page while one of your classes is about to start. */
export function ClassBanner() {
  const { db, profile } = useStore();
  const now = useNow(20_000);
  const [hidden, setHidden] = useState<string | null>(null);
  const next = myClasses(db, profile, now)[0];
  const visible =
    !!next && !!next.link && joinWindow(next, now) === 'open' && hidden !== next.id;

  // lets the page make room for the bar on phones (and lift toasts above it)
  useEffect(() => {
    document.body.classList.toggle('has-class-banner', visible);
    return () => document.body.classList.remove('has-class-banner');
  }, [visible]);

  if (!visible || !next) return null;
  const started = new Date(next.startISO).getTime() <= now;

  return (
    <div className="class-banner" role="status">
      <span className="class-banner-title">
        <b>{next.title}</b> {started ? 'has started' : `starts at ${fmtTime(next.startISO)}`}
      </span>
      <a className="btn btn-sm" href={next.link} target="_blank" rel="noreferrer">
        Join ↗
      </a>
      <Link to="/dashboard" className="btn-quiet class-banner-details" style={{ color: 'inherit' }}>
        details
      </Link>
      <button
        className="btn-quiet"
        style={{ color: 'inherit' }}
        onClick={() => setHidden(next.id)}
        aria-label="Hide"
      >
        ✕
      </button>
    </div>
  );
}

import { useState, type CSSProperties, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { RequestTutoring } from './Tutoring';
import { certsFor, tutorStats, useStore } from '../lib/store';
import type { Tutor } from '../lib/types';
import { subjectMeta, subjectShort } from '../lib/types';
import { gradeLabel, initials } from '../lib/util';

interface TutorCardProps {
  tutor: Tutor;
  onThank: (tutor: Tutor) => void;
}

export function TutorCard({ tutor, onThank }: TutorCardProps) {
  const { db, profile } = useStore();
  const isMe = !!profile && !!tutor.email && profile.email.toLowerCase() === tutor.email.toLowerCase();
  const [asking, setAsking] = useState(false);
  const stats = tutorStats(db, tutor.id);
  const certs = certsFor(db, tutor.email);

  const onMove = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <article className="card card-hover spot-card tutor-card" onPointerMove={onMove}>
      <div className="tutor-head">
        <span className="avatar avatar-lg" style={{ '--h': tutor.hue } as CSSProperties}>
          {initials(tutor.name)}
        </span>
        <div>
          <div className="tutor-name">{tutor.name}</div>
          {gradeLabel(tutor.grade) && <div className="tutor-grade">{gradeLabel(tutor.grade)}</div>}
        </div>
      </div>

      {tutor.tagline && <p className="tutor-tagline">“{tutor.tagline}”</p>}

      <div className="row" style={{ gap: 7 }}>
        {tutor.subjects.map((s) => {
          const certified = certs.some((c) => c.subject === s);
          return (
            <span
              key={s}
              className={certified ? 'chip chip-cert' : 'chip'}
              data-subject={s}
              style={{ '--sub-h': subjectMeta(s).hue } as CSSProperties}
            >
              {subjectShort(s)}
            </span>
          );
        })}
      </div>

      {tutor.courses && tutor.courses.length > 0 && (
        <ul className="tutor-courses">
          {tutor.courses.map((c) => (
            <li key={c.title}>
              <span className="tutor-course-title">{c.title}</span>
              {c.summary && <span className="tutor-course-sum">{c.summary}</span>}
            </li>
          ))}
        </ul>
      )}

      {tutor.availability && (
        <div className="tutor-when">
          <b>Usually free:</b> {tutor.availability}
        </div>
      )}

      {tutor.tutoringPrice ? (
        <div className="tutor-one">
          <div>
            <b>1-on-1 tutoring</b> · ${tutor.tutoringPrice} a lesson
          </div>
          {tutor.tutoringNote && <div className="small muted">{tutor.tutoringNote}</div>}
          {isMe ? (
            <span className="small muted">This is your offer. Requests show up on your dashboard.</span>
          ) : (
            <button className="btn btn-soft btn-sm" onClick={() => setAsking(true)}>
              Ask for 1-on-1
            </button>
          )}
        </div>
      ) : null}

      {stats.taught === 0 && stats.upcoming.length === 0 ? (
        <div className="tutor-stats">
          <span>First class being scheduled</span>
        </div>
      ) : (
      <div className="tutor-stats">
        <span>
          <b>{stats.hours}</b> hrs volunteered
        </span>
        <span>
          <b>{stats.taught}</b> classes
        </span>
        <span>
          <b>{stats.kudosCount}</b> thank-yous
        </span>
      </div>
      )}

      <div className="row">
        <button className="btn btn-soft btn-sm" onClick={() => onThank(tutor)}>
          ♥ Thank them
        </button>
        <Link className="btn btn-ghost btn-sm" to={`/sessions?tutor=${tutor.id}`}>
          Their classes
        </Link>
      </div>
      {asking && <RequestTutoring tutor={tutor} onClose={() => setAsking(false)} />}
    </article>
  );
}

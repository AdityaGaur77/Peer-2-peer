import type { CSSProperties, PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { certsFor, tutorStats, useStore } from '../lib/store';
import type { Tutor } from '../lib/types';
import { subjectMeta } from '../lib/types';
import { initials } from '../lib/util';

interface TutorCardProps {
  tutor: Tutor;
  onThank: (tutor: Tutor) => void;
}

export function TutorCard({ tutor, onThank }: TutorCardProps) {
  const { db } = useStore();
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
          <div className="tutor-grade">{tutor.grade}</div>
        </div>
      </div>

      <p className="tutor-tagline">“{tutor.tagline}”</p>

      <div className="row" style={{ gap: 7 }}>
        {tutor.isFounder && <span className="chip chip-founder">Founder</span>}
        {tutor.subjects.map((s) => {
          const certified = certs.some((c) => c.subject === s);
          return (
            <span key={s} className={certified ? 'chip chip-cert' : 'chip'} data-subject={s}>
              {subjectMeta(s).name.split(' ')[0]}
            </span>
          );
        })}
      </div>

      <div className="tutor-stats">
        <span>
          <b>{stats.hours}</b> hrs volunteered
        </span>
        <span>
          <b>{stats.taught}</b> sessions
        </span>
        <span>
          <b>{stats.kudosCount}</b> kudos
        </span>
      </div>

      <div className="row">
        <button className="btn btn-soft btn-sm" onClick={() => onThank(tutor)}>
          ♥ Thank them
        </button>
        <Link className="btn btn-ghost btn-sm" to={`/sessions?tutor=${tutor.id}`}>
          Their sessions
        </Link>
      </div>
    </article>
  );
}

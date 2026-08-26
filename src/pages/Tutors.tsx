import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { KudosModal } from '../components/KudosModal';
import { Reveal } from '../components/Reveal';
import { TutorCard } from '../components/TutorCard';
import { globalStats, useStore } from '../lib/store';
import { SUBJECTS, type SubjectId, type Tutor } from '../lib/types';

export function Tutors() {
  const { db } = useStore();
  const [filter, setFilter] = useState<'all' | SubjectId>('all');
  const [thanking, setThanking] = useState<Tutor | null>(null);
  const stats = globalStats(db);

  const tutors = useMemo(() => {
    const list = filter === 'all' ? db.tutors : db.tutors.filter((t) => t.subjects.includes(filter));
    return [...list].sort((a, b) => Number(!!b.isFounder) - Number(!!a.isFounder));
  }, [db.tutors, filter]);

  return (
    <div className="section" style={{ paddingTop: 'clamp(110px, 15vw, 150px)' }}>
      <div className="container">
        <div className="section-head">
          <Reveal>
            <span className="eyebrow">the founding crew</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="h2">
              Students who <em className="em-ember">volunteer their time.</em>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lede">
              Everyone here teaches for free.{' '}
              {stats.sessionsHosted > 0 ? (
                <>
                  So far that is <b>{stats.volunteerHours} hours</b> across{' '}
                  <b>{stats.sessionsHosted} sessions</b>. A thank-you note is the only payment
                  they get.
                </>
              ) : (
                <>
                  Once you have been to a session, leave a note. It is the only payment they
                  get.
                </>
              )}
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <div className="row between" style={{ marginBottom: 24 }}>
            <select
              className="select"
              style={{ width: 'auto', padding: '8px 14px', borderRadius: 999, fontSize: 13.5 }}
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | SubjectId)}
              aria-label="Filter tutors by subject"
            >
              <option value="all">Everyone</option>
              {SUBJECTS.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
            <Link to="/teach" className="btn btn-primary btn-sm">
              Join them →
            </Link>
          </div>
        </Reveal>

        {tutors.length === 0 ? (
          <div className="card card-pad" style={{ textAlign: 'center', padding: 48 }}>
            <p className="serif-i" style={{ fontSize: 22, color: 'var(--ink-2)' }}>
              {filter === 'all'
                ? 'No tutors yet.'
                : 'Nobody is teaching that one yet.'}
            </p>
            <p className="muted small" style={{ marginTop: 8 }}>
It takes about ten minutes to get started.{' '}
              <Link to="/teach" style={{ color: 'var(--ember-deep)', borderBottom: '1.5px dotted' }}>
                Be the first
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid-3">
            {tutors.map((t, i) => (
              <Reveal key={t.id} delay={Math.min(i * 0.05, 0.3)}>
                <TutorCard tutor={t} onThank={setThanking} />
              </Reveal>
            ))}
          </div>
        )}
      </div>

      {thanking && <KudosModal tutor={thanking} onClose={() => setThanking(null)} />}
    </div>
  );
}

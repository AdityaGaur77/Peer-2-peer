import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { KudosModal } from '../components/KudosModal';
import { Reveal } from '../components/Reveal';
import { TutorCard } from '../components/TutorCard';
import { globalStats, useStore } from '../lib/store';
import type { SubjectId, Tutor } from '../lib/types';
import { cx } from '../lib/util';

const FILTERS: Array<{ id: 'all' | SubjectId; label: string }> = [
  { id: 'all', label: 'Everyone' },
  { id: 'python', label: 'Python' },
  { id: 'ai', label: 'AI & ML' },
];

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
              Real students, <em className="em-ember">volunteering their time.</em>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lede">
              Every tutor here passed a certification quiz and shows up for free. Together they've
              volunteered <b>{stats.volunteerHours} hours</b> across <b>{stats.sessionsHosted} sessions</b>.
              Say thanks — it's the only payment they get.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <div className="row between" style={{ marginBottom: 24 }}>
            <div className="row" style={{ gap: 8 }}>
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  className={cx('chip chip-btn', filter === f.id && 'on')}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <Link to="/teach" className="btn btn-primary btn-sm">
              Join them →
            </Link>
          </div>
        </Reveal>

        <div className="grid-3">
          {tutors.map((t, i) => (
            <Reveal key={t.id} delay={Math.min(i * 0.05, 0.3)}>
              <TutorCard tutor={t} onThank={setThanking} />
            </Reveal>
          ))}
        </div>
      </div>

      {thanking && <KudosModal tutor={thanking} onClose={() => setThanking(null)} />}
    </div>
  );
}

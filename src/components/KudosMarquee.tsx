import { tutorById, useStore } from '../lib/store';

export function KudosMarquee() {
  const { db } = useStore();
  if (db.kudos.length === 0) return null;

  const items = db.kudos.slice(0, 10).map((k) => ({
    id: k.id,
    message: k.message,
    from: k.from,
    tutorName: tutorById(db, k.tutorId)?.name ?? 'a Relay tutor',
  }));

  const half = (prefix: string, hidden: boolean) =>
    items.map((k) => (
      <figure
        key={`${prefix}-${k.id}`}
        className="card kudos-card"
        style={{ margin: 0 }}
        aria-hidden={hidden || undefined}
      >
        <blockquote className="kudos-msg" style={{ margin: 0 }}>
          “{k.message}”
        </blockquote>
        <figcaption className="kudos-meta">
          {k.from} → {k.tutorName}
        </figcaption>
      </figure>
    ));

  return (
    <div className="marquee" aria-label="Thank-you notes from learners">
      <div className="marquee-track">
        {half('a', false)}
        {half('b', true)}
      </div>
    </div>
  );
}

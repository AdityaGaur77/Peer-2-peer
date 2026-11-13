import { tutorById, useStore } from '../lib/store';
import { CONTACT_EMAIL } from '../lib/config';

export function KudosMarquee() {
  const { db } = useStore();
  if (db.kudos.length === 0) return null;

  const items = db.kudos.slice(0, 10).map((k) => ({
    id: k.id,
    message: k.message,
    from: k.from,
    tutorName: tutorById(db, k.tutorId)?.name ?? 'a Peer 2 Peer tutor',
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
          {k.from} → {k.tutorName}{' · '}
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Report a thank-you on Peer 2 Peer')}&body=${encodeURIComponent(`From: ${k.from}\nTo: ${k.tutorName}\nMessage: ${k.message}`)}`}
            style={{ color: 'inherit', textDecoration: 'underline' }}
            tabIndex={hidden ? -1 : undefined}
            aria-label={`Report this thank-you from ${k.from}`}
          >
            report
          </a>
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

import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Wordmark } from '../components/Logo';
import { inviteUrl } from '../lib/invite';
import { levelLabel, tutorById, useStore } from '../lib/store';
import { subjectMeta } from '../lib/types';
import { fmtLongDate, gradeLabel, fmtTime, fmtWeekday } from '../lib/util';

/**
 * A print-first poster for a session. School launches run on paper — this is
 * the thing you tape to a hallway wall or a library noticeboard.
 */
export function Flyer() {
  const { id } = useParams();
  const { db, live } = useStore();
  const session = db.sessions.find((s) => s.id === id);
  const tutor = session ? tutorById(db, session.tutorId) : undefined;
  const [link, setLink] = useState('');

  useEffect(() => {
    if (!session) return;
    const plain = `${window.location.origin}${window.location.pathname}#/sessions?s=${session.id}`;
    if (live) {
      setLink(plain);
      return;
    }
    inviteUrl(session, tutor)
      .then(setLink)
      .catch(() => setLink(`${window.location.origin}${window.location.pathname}`));
  }, [session, tutor, live]);

  if (!session) {
    return (
      <div className="section" style={{ paddingTop: 'clamp(120px, 16vw, 160px)', textAlign: 'center' }}>
        <div className="container stack" style={{ gap: 16, maxWidth: 420, margin: '0 auto' }}>
          <h2 className="h2">No such session</h2>
          <p className="lede" style={{ margin: '0 auto' }}>
            Flyers are generated from a session on your board. Pick one from the board and hit
            "flyer".
          </p>
          <div>
            <Link to="/sessions" className="btn btn-primary">
              Back to the board
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const meta = subjectMeta(session.subject);
  const siteRoot = `${window.location.origin}${window.location.pathname}`.replace(/\/$/, '');

  return (
    <div className="section" style={{ paddingTop: 'clamp(100px, 14vw, 140px)' }}>
      <div className="container">
        <div className="row between no-print" style={{ marginBottom: 20 }}>
          <div>
            <p className="muted small" style={{ marginTop: 8, maxWidth: '52ch' }}>
              Print it, tape it up. The QR-free version on purpose — the short link is easier to
              type than a code is to scan across a hallway.
            </p>
          </div>
          <div className="row">
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
              Print this flyer
            </button>
            <Link to="/sessions" className="btn-quiet">
              back to board
            </Link>
          </div>
        </div>

        <div className="flyer">
          <div className="flyer-top">
            <Wordmark size={22} />
            <span
              className="chip"
              data-subject={session.subject}
              style={{ '--sub-h': meta.hue } as CSSProperties}
            >
              {meta.name}
            </span>
          </div>

          <div className="flyer-free">
            FREE<span>·</span>CLASS
          </div>

          <h1 className="flyer-title">{session.title}</h1>

          <p className="flyer-desc">{session.description}</p>

          <div className="flyer-when">
            <div>
              <span className="flyer-k">when</span>
              <span className="flyer-v">
                {fmtWeekday(session.startISO)}, {fmtLongDate(session.startISO)}
              </span>
              <span className="flyer-v2">
                {fmtTime(session.startISO)} · {session.durationMin} minutes
              </span>
            </div>
            <div>
              <span className="flyer-k">who</span>
              <span className="flyer-v">{tutor?.name ?? 'A Peer 2 Peer tutor'}</span>
              <span className="flyer-v2">
                {gradeLabel(tutor?.grade) || 'Student teacher'} · {levelLabel(session.level)} ·{' '}
                {session.capacity} spots
              </span>
            </div>
          </div>

          <div className="flyer-join">
            <span className="flyer-k">save a spot</span>
            <span className="flyer-url">{siteRoot}</span>
            <span className="flyer-v2">
              online, on video — no account, no card, nothing to install
            </span>
          </div>

          <p className="flyer-foot">
            Taught by a student who learned it recently and remembers exactly which part was
            confusing. When it clicks for you, you can teach the next person.
          </p>
        </div>

        {link && (
          <p className="hint no-print" style={{ marginTop: 16, wordBreak: 'break-all', maxWidth: '70ch' }}>
            direct invite link (for messages, not posters):{' '}
            <span className="flyer-link">{link}</span>
          </p>
        )}
      </div>
    </div>
  );
}

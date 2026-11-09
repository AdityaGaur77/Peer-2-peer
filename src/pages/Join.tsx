import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Reveal } from '../components/Reveal';
import { SessionCard } from '../components/SessionCard';
import { decodeInvite, type DecodedInvite } from '../lib/invite';
import { useStore } from '../lib/store';
import type { Session } from '../lib/types';
import { firstName, gradeLabel, fmtLongDate, fmtTime, isPastSession, plural } from '../lib/util';

/**
 * Landing page for an invite link. Shows the class the way the board would,
 * then drops it onto this visitor's board.
 */
export function Join() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { acceptInvite, toast, live, db } = useStore();
  const [invite, setInvite] = useState<DecodedInvite | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payload = params.get('i');

  useEffect(() => {
    let alive = true;
    // /join stays mounted across invites, so clear the last result first —
    // otherwise a stale error outlives a perfectly good second link.
    setInvite(null);
    setError(null);
    if (!payload) {
      setError('This link is missing the class details.');
      return;
    }
    decodeInvite(payload)
      .then((d) => alive && setInvite(d))
      .catch(() => alive && setError('This link looks broken. Ask whoever sent it for a new one.'));
    return () => {
      alive = false;
    };
  }, [payload]);

  if (error) {
    return (
      <div className="section" style={{ paddingTop: 'clamp(120px, 16vw, 160px)', textAlign: 'center' }}>
        <div className="container stack" style={{ gap: 18, maxWidth: 440, margin: '0 auto' }}>
          <h1 className="h2">Couldn't read that invite</h1>
          <p className="lede" style={{ margin: '0 auto' }}>
            {error} Long links sometimes get cut off when they're forwarded.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link to="/sessions" className="btn btn-primary">
              See all classes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="section" style={{ paddingTop: 'clamp(120px, 16vw, 160px)', textAlign: 'center' }}>
        <div className="container">
          <span className="muted">Loading…</span>
        </div>
      </div>
    );
  }

  const preview: Session = {
    ...invite.session,
    id: 'invite',
    tutorId: '',
    attendees: [],
    waitlist: [],
    status: 'scheduled',
  };
  const stale = isPastSession(preview);
  const who = firstName(invite.tutor.name);

  const accept = () => {
    if (live) {
      // every class is already on the shared board; find this one there
      const match = db.sessions.find(
        (s) =>
          s.title === invite.session.title &&
          new Date(s.startISO).getTime() === new Date(invite.session.startISO).getTime(),
      );
      navigate(match ? `/sessions?s=${match.id}` : '/sessions');
      return;
    }
    const id = acceptInvite(invite);
    toast(`Added ${who}'s class. You can save a spot now.`);
    navigate(`/sessions?s=${id}`);
  };

  return (
    <div className="section" style={{ paddingTop: 'clamp(110px, 15vw, 150px)' }}>
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="section-head">
          <Reveal delay={0.05}>
            <h1 className="h2">
              {who} invited you to a free class.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lede">
              {invite.tutor.name}
              {gradeLabel(invite.tutor.grade) ? ` (${gradeLabel(invite.tutor.grade)})` : ''} is running
              this on{' '}
              {fmtLongDate(invite.session.startISO)} at {fmtTime(invite.session.startISO)}.{' '}
              It's free.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.14}>
          <SessionCard
            session={preview}
            preview
            previewNote={`${plural(preview.capacity, 'spot')} · free`}
          />
        </Reveal>

        <Reveal delay={0.18}>
          <div className="stack" style={{ gap: 14, marginTop: 20 }}>
            {stale ? (
              <div className="guide-tip">
                <b>This class already happened.</b> See what's coming up on the Classes page.
              </div>
            ) : (
              <div className="guide-tip">
                {live
                  ? 'Open the class to save a spot. You get the class link after you save one.'
                  : 'Add the class, then save a spot to get the class link.'}
              </div>
            )}
            <div className="row">
              {!stale && (
                <button className="btn btn-primary" onClick={accept}>
                  Add this class
                </button>
              )}
              <Link to="/sessions" className="btn btn-ghost">
                See all classes
              </Link>
              <Link to="/guide/student" className="btn-quiet">
                New here? Take the 2-minute tour →
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

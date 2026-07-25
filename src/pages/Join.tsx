import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Reveal } from '../components/Reveal';
import { SessionCard } from '../components/SessionCard';
import { decodeInvite, type DecodedInvite } from '../lib/invite';
import { useStore } from '../lib/store';
import type { Session } from '../lib/types';
import { firstName, fmtLongDate, fmtTime, isPastSession } from '../lib/util';

/**
 * Landing page for an invite link. Shows the class the way the board would,
 * then drops it onto this visitor's board.
 */
export function Join() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { acceptInvite, toast } = useStore();
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
      setError('This link is missing its invite code.');
      return;
    }
    decodeInvite(payload)
      .then((d) => alive && setInvite(d))
      .catch(() => alive && setError('This invite link looks damaged — ask for a fresh one.'));
    return () => {
      alive = false;
    };
  }, [payload]);

  if (error) {
    return (
      <div className="section" style={{ paddingTop: 'clamp(120px, 16vw, 160px)', textAlign: 'center' }}>
        <div className="container stack" style={{ gap: 18, maxWidth: 440, margin: '0 auto' }}>
          <span className="mono muted" style={{ letterSpacing: '0.2em' }}>
            BATON MISSED
          </span>
          <h2 className="h2">Couldn't read that invite</h2>
          <p className="lede" style={{ margin: '0 auto' }}>
            {error} Links can get chopped short when they're forwarded — the full one is long on
            purpose, since it carries the whole class inside it.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link to="/sessions" className="btn btn-primary">
              Browse the open board
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
          <span className="mono muted">unpacking the invite…</span>
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
    const id = acceptInvite(invite);
    toast(`Added to your board — ${who}'s class is yours to join.`);
    navigate(`/sessions?s=${id}`);
  };

  return (
    <div className="section" style={{ paddingTop: 'clamp(110px, 15vw, 150px)' }}>
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="section-head">
          <Reveal>
            <span className="eyebrow">you've been handed the baton</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="h2">
              {who} invited you to a <em className="em-ember">free class.</em>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lede">
              {invite.tutor.name} ({invite.tutor.grade}) is running this on{' '}
              {fmtLongDate(invite.session.startISO)} at {fmtTime(invite.session.startISO)}. No fee,
              no account, no catch — that's the entire model.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.14}>
          <SessionCard
            session={preview}
            preview
            previewNote={`${preview.capacity} spots · free · add it to your board to save one`}
          />
        </Reveal>

        <Reveal delay={0.18}>
          <div className="stack" style={{ gap: 14, marginTop: 20 }}>
            {stale ? (
              <div className="guide-tip">
                <b>This one already happened.</b> Invites carry a fixed date, so this link has
                aged out — the live board has what's coming up next.
              </div>
            ) : (
              <div className="guide-tip">
                Adding it puts the class on <b>your</b> copy of the board, where you can save a
                spot and grab the room link. Relay keeps everything in your own browser — nothing
                about you gets sent anywhere.
              </div>
            )}
            <div className="row">
              {!stale && (
                <button className="btn btn-primary" onClick={accept}>
                  Add it to my board
                </button>
              )}
              <Link to="/sessions" className="btn btn-ghost">
                See what else is on
              </Link>
              <Link to="/guide/student" className="btn-quiet">
                new to Relay? 2-minute tour →
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div
      className="section"
      style={{ paddingTop: 'clamp(140px, 20vw, 200px)', textAlign: 'center', minHeight: '70vh' }}
    >
      <div className="container stack" style={{ gap: 18, maxWidth: 440, margin: '0 auto' }}>
        <span className="mono muted" style={{ letterSpacing: '0.2em' }}>
          ERROR 404
        </span>
        <h2 className="display" style={{ fontSize: 'clamp(2.4rem, 6vw, 3.6rem)' }}>
          Dropped the <em className="em-ember">baton.</em>
        </h2>
        <p className="lede" style={{ margin: '0 auto' }}>
          That page ran off the track. Let's get you back to somewhere useful.
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link to="/" className="btn btn-primary">
            Back to home
          </Link>
          <Link to="/sessions" className="btn btn-ghost">
            Find a session
          </Link>
        </div>
      </div>
    </div>
  );
}

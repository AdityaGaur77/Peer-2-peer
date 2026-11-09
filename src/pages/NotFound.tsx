import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div
      className="section"
      style={{ paddingTop: 'clamp(140px, 20vw, 200px)', textAlign: 'center', minHeight: '70vh' }}
    >
      <div className="container stack" style={{ gap: 18, maxWidth: 440, margin: '0 auto' }}>
        <h1 className="display" style={{ fontSize: 'clamp(2.4rem, 6vw, 3.6rem)' }}>
          Page not found
        </h1>
        <p className="lede" style={{ margin: '0 auto' }}>
          We couldn't find that page. The link may be old or mistyped.
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link to="/" className="btn btn-primary">
            Back to home
          </Link>
          <Link to="/sessions" className="btn btn-ghost">
            See classes
          </Link>
        </div>
      </div>
    </div>
  );
}

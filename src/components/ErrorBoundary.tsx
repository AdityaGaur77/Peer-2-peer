import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches render crashes so a bad state never means a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Relay crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        className="section"
        style={{ paddingTop: 'clamp(140px, 20vw, 200px)', textAlign: 'center', minHeight: '70vh' }}
      >
        <div className="container stack" style={{ gap: 18, maxWidth: 500, margin: '0 auto' }}>
          <span className="mono muted" style={{ letterSpacing: '0.2em' }}>
            SOMETHING TRIPPED
          </span>
          <h2 className="display" style={{ fontSize: 'clamp(2.2rem, 6vw, 3.4rem)' }}>
            Fell mid-<em className="em-ember">stride.</em>
          </h2>
          <p className="lede" style={{ margin: '0 auto' }}>
            Something broke while rendering. A reload usually fixes it — if it keeps happening,
            clear the saved data (your browser's copy of the demo board) and start fresh.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                localStorage.removeItem('relay.db');
                localStorage.removeItem('relay.profile');
                window.location.reload();
              }}
            >
              Clear data & reload
            </button>
          </div>
          <p className="mono small muted">{String(this.state.error)}</p>
        </div>
      </div>
    );
  }
}

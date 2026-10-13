import { Link } from 'react-router-dom';
import { CONTACT_EMAIL } from '../lib/config';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-mark">
          Relay<span className="dot">.</span>
        </div>

        <div className="footer-cols">
          <div className="footer-col" style={{ maxWidth: 300 }}>
            <h4>Relay</h4>
            <p style={{ fontSize: 14.5, lineHeight: 1.6 }}>
              Free live classes taught by high school students, for students who want a little
              more help than school gives them.
            </p>
          </div>
          <div className="footer-col">
            <h4>Explore</h4>
            <Link to="/sessions">Upcoming sessions</Link>
            <Link to="/tutors">Meet the tutors</Link>
            <Link to="/guide/student">New here? Start guide</Link>
            <Link to="/about">Why it's free</Link>
          </div>
          <div className="footer-col">
            <h4>For tutors</h4>
            <Link to="/teach">Become a tutor</Link>
            <Link to="/guide/tutor">Post your first class</Link>
            <Link to="/dashboard">Your dashboard</Link>
            <Link to="/certificate">Volunteer certificate</Link>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <Link to="/admin">Founder console</Link>
            <span style={{ fontSize: 14.5 }}>Inspired by schoolhouse.world</span>
          </div>
        </div>

        <div className="footer-base">
          <span>© 2026 Relay. Run by students.</span>
          <span>No ads. No fees.</span>
        </div>
      </div>
    </footer>
  );
}

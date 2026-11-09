import { Link } from 'react-router-dom';
import { CONTACT_EMAIL } from '../lib/config';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-mark">
          Peer 2 Peer<span className="dot">.</span>
        </div>

        <div className="footer-cols">
          <div className="footer-col" style={{ maxWidth: 300 }}>
            <h4>Peer 2 Peer</h4>
            <p style={{ fontSize: 14.5, lineHeight: 1.6 }}>
              Live classes taught by high school students, for students who want a little more
              help than school gives them. Group classes are free.
            </p>
          </div>
          <div className="footer-col">
            <h4>Explore</h4>
            <Link to="/sessions">Classes</Link>
            <Link to="/tutors">Teachers</Link>
            <Link to="/guide/student">How it works</Link>
            <Link to="/about">Our story</Link>
          </div>
          <div className="footer-col">
            <h4>For teachers</h4>
            <Link to="/teach">Teach a class</Link>
            <Link to="/guide/tutor">Set up your class</Link>
            <Link to="/dashboard">Your dashboard</Link>
            <Link to="/certificate">Volunteer certificate</Link>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <Link to="/admin">Team login</Link>
            <span style={{ fontSize: 14.5 }}>Inspired by schoolhouse.world</span>
          </div>
        </div>

        <div className="footer-base">
          <span>© 2026 Peer 2 Peer. Run by students.</span>
          <span>No ads. Group classes are free.</span>
        </div>
      </div>
    </footer>
  );
}

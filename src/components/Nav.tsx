import { useEffect, useState, type CSSProperties } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { cx, firstName, hashHue, initials } from '../lib/util';
import { Wordmark } from './Logo';

const LINKS = [
  { to: '/sessions', label: 'Sessions' },
  { to: '/tutors', label: 'Tutors' },
  { to: '/teach', label: 'Teach' },
  { to: '/about', label: 'About' },
];

export function Nav() {
  const { profile, openSignIn } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'light');
  const location = useLocation();
  const navigate = useNavigate();

  const flipTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('relay.theme', next);
    } catch {
      /* private mode — theme just won't persist */
    }
    setTheme(next);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  const links = LINKS.map((l) => (
    <NavLink key={l.to} to={l.to} className={({ isActive }) => cx('nav-link', isActive && 'active')}>
      {l.label}
    </NavLink>
  ));

  return (
    <div className={cx('island-wrap', open && 'open')}>
      <nav className={cx('island', scrolled && 'scrolled')} aria-label="Main">
        <NavLink to="/" aria-label="Relay home">
          <Wordmark />
        </NavLink>

        <div className="island-links">{links}</div>

        <button
          className="theme-btn"
          onClick={flipTheme}
          aria-label={theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
          title={theme === 'dark' ? 'day mode' : 'night mode'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>

        {profile ? (
          <button className="nav-user nav-cta" onClick={() => navigate('/dashboard')}>
            <span
              className="avatar avatar-sm"
              style={{ '--h': hashHue(profile.email) } as CSSProperties}
            >
              {initials(profile.name)}
            </span>
            {firstName(profile.name)}
          </button>
        ) : (
          <button className="btn btn-primary btn-sm nav-cta" onClick={() => openSignIn()}>
            Sign in
          </button>
        )}

        <button className="burger" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? 'CLOSE' : 'MENU'}
        </button>
      </nav>

      {/* lives outside the pill — backdrop-filter would otherwise trap it */}
      <div className="island-sheet">
        {links}
        <button className="nav-link" onClick={flipTheme} style={{ textAlign: 'left' }}>
          {theme === 'dark' ? '☀ Day mode' : '☾ Night mode'}
        </button>
        {profile ? (
          <NavLink to="/dashboard" className="nav-link">
            Dashboard — {firstName(profile.name)}
          </NavLink>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() => {
              setOpen(false);
              openSignIn();
            }}
          >
            Sign in
          </button>
        )}
      </div>
    </div>
  );
}

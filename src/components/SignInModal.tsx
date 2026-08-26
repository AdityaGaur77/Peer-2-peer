import { useState, type FormEvent } from 'react';
import { useStore } from '../lib/store';
import type { Role } from '../lib/types';
import { cx } from '../lib/util';
import { Modal } from './Modal';

export function SignInModal() {
  const { signInOpen, closeSignIn, completeSignIn } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [err, setErr] = useState('');

  if (!signInOpen) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const em = email.trim().toLowerCase();
    if (n.length < 2) {
      setErr('We need a name so tutors know who is coming.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setErr("That email doesn't look right.");
      return;
    }
    completeSignIn({ name: n, email: em, role });
    setName('');
    setEmail('');
    setErr('');
  };

  return (
    <Modal onClose={closeSignIn} labelledBy="signin-title">
      <div className="stack" style={{ gap: 6 }}>
        <h2 id="signin-title" className="h3">
          Sign in
        </h2>
        <p className="muted" style={{ fontSize: 14.5 }}>
          No password. Your details stay in this browser and are only used so
          tutors know who booked a spot.
        </p>
      </div>

      <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
        <div className="field">
          <span className="label">What brings you here?</span>
          <div className="role-pick">
            <button
              type="button"
              className={cx('role-opt', role === 'student' && 'on')}
              onClick={() => setRole('student')}
              aria-pressed={role === 'student'}
            >
              <span className="role-title">I want to learn</span>
              <span className="role-sub">Book free sessions</span>
            </button>
            <button
              type="button"
              className={cx('role-opt', role === 'tutor' && 'on')}
              onClick={() => setRole('tutor')}
              aria-pressed={role === 'tutor'}
            >
              <span className="role-title">I want to tutor</span>
              <span className="role-sub">Teach and log hours</span>
            </button>
          </div>
          <span className="hint">you can switch later from your dashboard</span>
        </div>

        <label className="field">
          <span className="label">Name</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Riya N"
          />
        </label>
        <label className="field">
          <span className="label">Email</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.org"
          />
          <span className="hint">
            already a tutor? use the same email as your tutor profile
          </span>
        </label>
        {err && (
          <p className="small" style={{ color: 'var(--hot-deep)' }}>
            {err}
          </p>
        )}
        <button className="btn btn-primary" type="submit">
          {role === 'tutor' ? 'Start tutoring' : 'Find a session'}
        </button>
      </form>
    </Modal>
  );
}

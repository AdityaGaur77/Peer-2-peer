import { useState, type FormEvent } from 'react';
import { useStore } from '../lib/store';
import { Modal } from './Modal';

export function SignInModal() {
  const { signInOpen, closeSignIn, completeSignIn } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');

  if (!signInOpen) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const em = email.trim().toLowerCase();
    if (n.length < 2) {
      setErr('Tell us your name — tutors like knowing who\'s coming.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setErr('That email doesn\'t look right.');
      return;
    }
    completeSignIn({ name: n, email: em });
    setName('');
    setEmail('');
    setErr('');
  };

  return (
    <Modal onClose={closeSignIn} labelledBy="signin-title">
      <div className="stack" style={{ gap: 6 }}>
        <h2 id="signin-title" className="h3">
          Grab the baton
        </h2>
        <p className="muted" style={{ fontSize: 14.5 }}>
          No passwords, no tracking. Your name stays in this browser — it just lets tutors know
          who's coming.
        </p>
      </div>

      <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
        <label className="field">
          <span className="label">Name</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Riya N"
            autoFocus
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
          <span className="hint">tutors: use the email on your tutor card to unlock your dashboard</span>
        </label>
        {err && (
          <p className="small" style={{ color: 'var(--hot-deep)' }}>
            {err}
          </p>
        )}
        <button className="btn btn-primary" type="submit">
          Sign in — it's free, obviously
        </button>
      </form>
    </Modal>
  );
}

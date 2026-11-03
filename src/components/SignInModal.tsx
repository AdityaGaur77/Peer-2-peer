import { useEffect, useState, type FormEvent } from 'react';
import { useStore } from '../lib/store';
import type { Role } from '../lib/types';
import { cx } from '../lib/util';
import { Modal } from './Modal';

/**
 * Offline: name, email and age are saved in this browser, no password.
 * Live (Supabase): the same details, then a 6-digit code emailed to them,
 * so nobody can sign in as someone else.
 * Signed in already but missing an age (older profiles): just asks for it.
 */
export function SignInModal() {
  const {
    signInOpen, closeSignIn, completeSignIn, profile, live, sendSignInCode, verifySignInCode,
    saveProfile, toast,
  } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [err, setErr] = useState('');
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const finishing = !!profile && profile.age == null;

  useEffect(() => {
    if (!signInOpen) return;
    setErr('');
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
      setRole(profile.role ?? 'student');
    }
  }, [signInOpen, profile]);

  // Once Supabase confirms the code, the store sets the profile and we're done.
  useEffect(() => {
    if (codeSentTo && profile?.email === codeSentTo && profile.age != null) {
      setCodeSentTo(null);
      setCode('');
      completeSignIn(profile);
    }
  }, [codeSentTo, profile, completeSignIn]);

  if (!signInOpen) return null;

  const details = () => {
    const n = name.trim();
    const em = email.trim().toLowerCase();
    const a = Number(age);
    if (n.length < 2) return setErr('We need a name so teachers know who is coming.'), null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return setErr("That email doesn't look right."), null;
    if (!Number.isInteger(a) || a < 5 || a > 120) return setErr('Enter your age in years.'), null;
    setErr('');
    return { name: n, email: em, age: a, role };
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const d = details();
    if (!d) return;
    if (finishing && profile) {
      const p = { ...profile, age: d.age, name: d.name };
      if (live) saveProfile(p);
      completeSignIn(p);
      return;
    }
    if (!live) {
      completeSignIn(d);
      return;
    }
    setBusy(true);
    try {
      await sendSignInCode(d);
      setCodeSentTo(d.email);
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (!codeSentTo) return;
    setBusy(true);
    try {
      await verifySignInCode(codeSentTo, code);
      toast('Checking your code…');
    } catch (x) {
      setErr((x as Error).message || 'That code did not work. Check it and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (codeSentTo) {
    return (
      <Modal onClose={closeSignIn} labelledBy="signin-title">
        <div className="stack" style={{ gap: 6 }}>
          <h2 id="signin-title" className="h3">
            Check your email
          </h2>
          <p className="muted" style={{ fontSize: 14.5 }}>
            We sent a 6-digit code to <b>{codeSentTo}</b>. Type it here, or tap the link in the
            email on this device.
          </p>
        </div>
        <form className="stack" style={{ gap: 14 }} onSubmit={verify}>
          <label className="field">
            <span className="label">Code</span>
            <input
              className="input"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="123456"
              autoFocus
            />
          </label>
          {err && (
            <p className="small" style={{ color: 'var(--hot-deep)' }}>
              {err}
            </p>
          )}
          <button className="btn btn-primary" type="submit" disabled={busy || code.length < 6}>
            {busy ? 'Checking…' : 'Sign in'}
          </button>
          <button
            type="button"
            className="btn-quiet"
            onClick={() => {
              setCodeSentTo(null);
              setCode('');
            }}
          >
            use a different email
          </button>
        </form>
      </Modal>
    );
  }

  return (
    <Modal onClose={closeSignIn} labelledBy="signin-title">
      <div className="stack" style={{ gap: 6 }}>
        <h2 id="signin-title" className="h3">
          {finishing ? 'One more thing' : 'Sign in'}
        </h2>
        <p className="muted" style={{ fontSize: 14.5 }}>
          {finishing
            ? 'Classes have a minimum age now, so we need yours before you save a spot.'
            : live
              ? "No password. We'll email you a code to sign in."
              : 'No password. Your details stay in this browser and are only used so teachers know who booked a spot.'}
        </p>
      </div>

      <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
        {!finishing && (
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
                <span className="role-sub">Book classes</span>
              </button>
              <button
                type="button"
                className={cx('role-opt', role === 'tutor' && 'on')}
                onClick={() => setRole('tutor')}
                aria-pressed={role === 'tutor'}
              >
                <span className="role-title">I want to teach</span>
                <span className="role-sub">Run classes and log hours</span>
              </button>
            </div>
            <span className="hint">you can switch later from your dashboard</span>
          </div>
        )}

        <div className="grid-2">
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
            <span className="label">Age</span>
            <input
              className="input"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 3))}
              placeholder="15"
            />
          </label>
        </div>
        {!finishing && (
          <label className="field">
            <span className="label">Email</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.org"
            />
            <span className="hint">teachers: use the email the team has on file for you</span>
          </label>
        )}
        {err && (
          <p className="small" style={{ color: 'var(--hot-deep)' }}>
            {err}
          </p>
        )}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Sending…' : finishing ? 'Save' : live ? 'Email me a code' : 'Continue'}
        </button>
      </form>
    </Modal>
  );
}

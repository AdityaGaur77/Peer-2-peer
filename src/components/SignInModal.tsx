import { useEffect, useState, type FormEvent } from 'react';
import { useStore } from '../lib/store';
import type { Role } from '../lib/types';
import { cx } from '../lib/util';
import { Modal } from './Modal';

/**
 * Live (Supabase): just an email, then the 6-digit code we send to it.
 * Only someone signing in for the first time is then asked their name, age
 * and whether they're here to learn or teach.
 *
 * Offline: name, email and age in one go, saved in this browser.
 *
 * Either way, a profile missing an age (older accounts, or a brand-new live
 * account) gets the "finish your profile" step before anything else.
 */
export function SignInModal() {
  const {
    signInOpen, closeSignIn, completeSignIn, profile, live, sendSignInCode, verifySignInCode,
    saveProfile,
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
      // a brand-new account's name is just the start of its email; don't prefill that
      const placeholderName = profile.age == null && profile.name === profile.email.split('@')[0];
      setName(placeholderName ? '' : profile.name);
      setEmail(profile.email);
      setRole(profile.role ?? 'student');
    }
  }, [signInOpen, profile]);

  // Once Supabase confirms the code the store sets the profile. Someone we
  // already know is done; someone new still needs to finish their profile.
  useEffect(() => {
    if (!codeSentTo || profile?.email !== codeSentTo) return;
    setCodeSentTo(null);
    setCode('');
    if (profile.age != null) completeSignIn(profile);
  }, [codeSentTo, profile, completeSignIn]);

  if (!signInOpen) return null;

  const validEmail = (em: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);

  /** Name, age and role, checked. Null (with an error shown) if something's off. */
  const details = () => {
    const n = name.trim();
    const a = Number(age);
    if (n.length < 2) return setErr('We need a name so teachers know who is coming.'), null;
    if (!Number.isInteger(a) || a < 5 || a > 120) return setErr('Enter your age in years.'), null;
    setErr('');
    return { name: n, age: a, role };
  };

  const finish = (e: FormEvent) => {
    e.preventDefault();
    const d = details();
    if (!d || !profile) return;
    const p = { ...profile, ...d };
    if (live) saveProfile(p);
    completeSignIn(p);
  };

  const sendCode = async (e: FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!validEmail(em)) {
      setErr("That email doesn't look right.");
      return;
    }
    setErr('');
    setBusy(true);
    try {
      await sendSignInCode(em);
      setCodeSentTo(em);
    } catch (x) {
      setErr((x as Error).message || "Couldn't send the code. Try again in a minute.");
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
    } catch (x) {
      setErr((x as Error).message || 'That code did not work. Check it and try again.');
    } finally {
      setBusy(false);
    }
  };

  const offlineSubmit = (e: FormEvent) => {
    e.preventDefault();
    const d = details();
    if (!d) return;
    const em = email.trim().toLowerCase();
    if (!validEmail(em)) {
      setErr("That email doesn't look right.");
      return;
    }
    completeSignIn({ ...d, email: em });
  };

  const errLine = err && (
    <p className="small" style={{ color: 'var(--hot-deep)' }}>
      {err}
    </p>
  );

  const rolePicker = (
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
  );

  const nameAndAge = (
    <div className="grid-2">
      <label className="field">
        <span className="label">Name</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Riya N" />
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
  );

  // ── signed in, but we don't know their name and age yet ──
  if (finishing) {
    return (
      <Modal onClose={closeSignIn} labelledBy="signin-title">
        <div className="stack" style={{ gap: 6 }}>
          <h2 id="signin-title" className="h3">
            Welcome! One quick thing
          </h2>
          <p className="muted" style={{ fontSize: 14.5 }}>
            You're signed in as <b>{profile.email}</b>. Classes have a minimum age, so we need your
            name and age. You'll only be asked once.
          </p>
        </div>
        <form className="stack" style={{ gap: 14 }} onSubmit={finish}>
          {rolePicker}
          {nameAndAge}
          {errLine}
          <button className="btn btn-primary" type="submit">
            Save
          </button>
        </form>
      </Modal>
    );
  }

  // ── live: waiting for the code ──
  if (codeSentTo) {
    return (
      <Modal onClose={closeSignIn} labelledBy="signin-title">
        <div className="stack" style={{ gap: 6 }}>
          <h2 id="signin-title" className="h3">
            Check your email
          </h2>
          <p className="muted" style={{ fontSize: 14.5 }}>
            We sent a 6-digit code to <b>{codeSentTo}</b>. Type it here, or tap the link in the
            email on this device. It can take a minute, and sometimes lands in spam.
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
          {errLine}
          <button className="btn btn-primary" type="submit" disabled={busy || code.length < 6}>
            {busy ? 'Checking…' : 'Sign in'}
          </button>
          <button
            type="button"
            className="btn-quiet"
            onClick={() => {
              setCodeSentTo(null);
              setCode('');
              setErr('');
            }}
          >
            use a different email
          </button>
        </form>
      </Modal>
    );
  }

  // ── live: just the email ──
  if (live) {
    return (
      <Modal onClose={closeSignIn} labelledBy="signin-title">
        <div className="stack" style={{ gap: 6 }}>
          <h2 id="signin-title" className="h3">
            Sign in
          </h2>
          <p className="muted" style={{ fontSize: 14.5 }}>
            No password. Enter your email and we'll send you a code. New here? The same box
            creates your account.
          </p>
        </div>
        <form className="stack" style={{ gap: 14 }} onSubmit={sendCode}>
          <label className="field">
            <span className="label">Email</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.org"
              autoFocus
            />
            <span className="hint">teachers: use the email the team has on file for you</span>
          </label>
          {errLine}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Email me a code'}
          </button>
        </form>
      </Modal>
    );
  }

  // ── offline: everything at once, saved in this browser ──
  return (
    <Modal onClose={closeSignIn} labelledBy="signin-title">
      <div className="stack" style={{ gap: 6 }}>
        <h2 id="signin-title" className="h3">
          Sign in
        </h2>
        <p className="muted" style={{ fontSize: 14.5 }}>
          No password. Your details stay in this browser and are only used so teachers know who
          booked a spot.
        </p>
      </div>
      <form className="stack" style={{ gap: 14 }} onSubmit={offlineSubmit}>
        {rolePicker}
        {nameAndAge}
        <label className="field">
          <span className="label">Email</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.org"
          />
        </label>
        {errLine}
        <button className="btn btn-primary" type="submit">
          Continue
        </button>
      </form>
    </Modal>
  );
}

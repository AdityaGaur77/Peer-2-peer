import { useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KudosModal } from '../components/KudosModal';
import { Reveal } from '../components/Reveal';
import { NextClass } from '../components/NextClass';
import { MyTutoringRequests, TeacherTutoringPanel } from '../components/Tutoring';
import { SessionCard } from '../components/SessionCard';
import {
  attendedSessions, certsFor, tutorByEmail, tutorById, tutorStats, upcomingSessions, useStore,
} from '../lib/store';
import type { Tutor } from '../lib/types';
import { subjectMeta } from '../lib/types';
import { fmtDate, gradeLabel, fmtLongDate, initials, plural } from '../lib/util';

export function Dashboard() {
  const { db, profile, openSignIn, signOut, setRole } = useStore();
  const navigate = useNavigate();
  const [thanking, setThanking] = useState<Tutor | null>(null);
  const hasDraft = useMemo(() => {
    try {
      const raw = localStorage.getItem('relay.classdraft');
      return !!raw && !!(JSON.parse(raw) as { draft?: { title?: string } })?.draft;
    } catch {
      return false;
    }
  }, []);

  const tutor = profile ? tutorByEmail(db, profile.email) : undefined;
  const certs = profile ? certsFor(db, profile.email) : [];
  const stats = useMemo(() => (tutor ? tutorStats(db, tutor.id) : null), [db, tutor]);
  // past classes with students whose attendance hasn't been ticked yet
  const unmarked = useMemo(
    () =>
      stats
        ? stats.past.filter((s) => s.attendees.some((a) => a.attended !== true)).length
        : 0,
    [stats],
  );

  const myRsvps = useMemo(
    () =>
      profile
        ? upcomingSessions(db).filter((s) =>
            [...s.attendees, ...s.waitlist].some((a) => a.email === profile.email),
          )
        : [],
    [db, profile],
  );

  const attended = useMemo(
    () => (profile ? attendedSessions(db, profile.email) : []),
    [db, profile],
  );

  if (!profile) {
    return (
      <div className="section" style={{ paddingTop: 'clamp(120px, 16vw, 160px)', textAlign: 'center' }}>
        <div className="container stack" style={{ gap: 18, maxWidth: 440, margin: '0 auto' }}>
          <h1 className="h2">Your dashboard</h1>
          <p className="lede" style={{ margin: '0 auto' }}>
            Sign in to see your classes. Teachers can also see their volunteer hours here.
          </p>
          <div>
            <button className="btn btn-primary" onClick={() => openSignIn()}>
              Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section" style={{ paddingTop: 'clamp(110px, 15vw, 150px)' }}>
      <div className="container">
        {/* header */}
        <Reveal>
          <div className="row between" style={{ marginBottom: 30 }}>
            <div className="row" style={{ gap: 16 }}>
              <span className="avatar avatar-lg" style={{ '--h': tutor?.hue ?? 30 } as CSSProperties}>
                {initials(profile.name)}
              </span>
              <div>
                <h1 className="h2" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.1rem)' }}>
                  Hey, {profile.name.split(' ')[0]}.
                </h1>
                <p className="small muted">
                  {tutor ? `${['Teacher', gradeLabel(tutor.grade)].filter(Boolean).join(' · ')}` : profile.role === 'tutor' ? 'Applying to teach' : 'Student'} · {profile.email}
                </p>
              </div>
            </div>
            <div className="row">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setRole(profile.role === 'tutor' ? 'student' : 'tutor')}
              >
                {profile.role === 'tutor' ? 'Switch to student view' : 'Switch to teacher view'}
              </button>
              <button className="btn-quiet" onClick={signOut}>
                Sign out
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.02}>
          <NextClass />
        </Reveal>

        {/* unfinished class draft */}
        {hasDraft && (
          <Reveal delay={0.04}>
            <div className="welcome-card" style={{ marginBottom: 24 }}>
              <span>
                <b>You have a class you haven't posted yet.</b> It's saved where you left off.
              </span>
              <Link to="/guide/tutor">Finish and post it →</Link>
            </div>
          </Reveal>
        )}

        {/* tutor stats band */}
        {tutor && stats && (
          <Reveal delay={0.06}>
            <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
              <div className="stat-strip" style={{ borderBlock: 'none' }}>
                <div className="stat">
                  <span className="stat-num">{stats.hours}</span>
                  <span className="stat-label">volunteer hours</span>
                </div>
                <div className="stat">
                  <span className="stat-num">{stats.taught}</span>
                  <span className="stat-label">classes taught</span>
                </div>
                <div className="stat">
                  <span className="stat-num">{stats.learners}</span>
                  <span className="stat-label">students taught</span>
                </div>
                <div className="stat">
                  <span className="stat-num">{stats.kudosCount}</span>
                  <span className="stat-label">thank-yous</span>
                </div>
              </div>
              <div className="row between" style={{ padding: '16px 22px', borderTop: '1.5px dashed var(--border-strong)' }}>
                <span className="small muted">
                  {stats.firstISO
                    ? `Teaching since ${fmtLongDate(stats.firstISO)}`
                    : 'Your hours start counting after your first class.'}
                  {unmarked > 0 && (
                    <>
                      {' '}
                      <Link to="/sessions?showPast=1" style={{ color: 'var(--ember-deep)', borderBottom: '1.5px dotted' }}>
                        Mark who came in {unmarked === 1 ? '1 class' : `${unmarked} classes`} →
                      </Link>
                    </>
                  )}
                </span>
                <div className="row">
                  <Link to="/guide/tutor" className="btn btn-primary btn-sm">
                    Post a class
                  </Link>
                  <Link to="/certificate" className="btn btn-ghost btn-sm">
                    Volunteer certificate
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {tutor && (
          <Reveal delay={0.07}>
            <EditMyCard tutor={tutor} />
          </Reveal>
        )}

        {tutor && (
          <Reveal delay={0.08}>
            <TeacherTutoringPanel tutor={tutor} />
          </Reveal>
        )}

        <MyTutoringRequests email={profile.email} />

        {/* quizzes passed: only for people who teach or want to */}
        {(tutor || certs.length > 0 || profile.role === 'tutor') && (
        <Reveal delay={0.1}>
          <div className="card card-pad" style={{ marginBottom: 24 }}>
            <div className="row between" style={{ marginBottom: 14 }}>
              <h3 className="h3">Quizzes passed</h3>
              <Link to="/teach" className="btn-quiet">
                Take a quiz →
              </Link>
            </div>
            {certs.length === 0 ? (
              <p className="muted" style={{ fontSize: 15 }}>
                None yet. To teach Python or AI, pass the short quiz on the{' '}
                <Link to="/teach" style={{ color: 'var(--ember-deep)', borderBottom: '1.5px dotted' }}>
                  Teach
                </Link>{' '}
                page. Other subjects don't need one.
              </p>
            ) : (
              <div className="row" style={{ gap: 10 }}>
                {certs.map((c) => (
                  <div
                    key={c.subject}
                    className="chip chip-cert"
                    data-subject={c.subject}
                    style={{ padding: '9px 16px', '--sub-h': subjectMeta(c.subject).hue } as CSSProperties}
                  >
                    {subjectMeta(c.subject).name} · {c.score}/{c.total}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Reveal>
        )}

        {/* my saved sessions */}
        <Reveal delay={0.14}>
          <div style={{ marginBottom: 24 }}>
            <div className="row between" style={{ marginBottom: 14 }}>
              <h3 className="h3">Your classes</h3>
              <Link to="/sessions" className="btn-quiet">
                See all classes →
              </Link>
            </div>
            {myRsvps.length === 0 ? (
              <div className="card card-pad" style={{ textAlign: 'center' }}>
                <p className="muted" style={{ fontSize: 15 }}>
                  You haven't saved a spot in a class yet.{' '}
                  <Link to="/sessions" style={{ color: 'var(--ember-deep)', borderBottom: '1.5px dotted' }}>
                    See classes
                  </Link>
                </p>
              </div>
            ) : (
              <div className="stack" style={{ gap: 14 }}>
                {myRsvps.map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {/* where you've been — with a thank-you loop */}
        {attended.length > 0 && (
          <Reveal delay={0.16}>
            <div className="card card-pad" style={{ marginBottom: 24 }}>
              <div className="row between" style={{ marginBottom: 6 }}>
                <h3 className="h3">Classes you went to</h3>
                <span className="small muted">{plural(attended.length, 'class', 'classes')}</span>
              </div>
              <p className="muted small" style={{ marginBottom: 10 }}>
                Did a class help? Teachers volunteer their time, so a thank-you note means a lot.
              </p>
              {attended.slice(0, 6).map((s) => {
                const t = tutorById(db, s.tutorId);
                return (
                  <div key={s.id} className="line-item" style={{ padding: '11px 0' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 580 }}>{s.title}</div>
                      <div className="small muted">
                        {fmtDate(s.startISO)}
                        {t ? ` · with ${t.name}` : ''}
                      </div>
                    </div>
                    {t && (
                      <button className="btn btn-soft btn-sm" onClick={() => setThanking(t)}>
                        ♥ Thank {t.name.split(' ')[0]}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Reveal>
        )}

        {/* tutor's own upcoming */}
        {tutor && stats && stats.upcoming.length > 0 && (
          <Reveal delay={0.18}>
            <div style={{ marginBottom: 24 }}>
              <h3 className="h3" style={{ marginBottom: 14 }}>
                Classes you teach
              </h3>
              <div className="stack" style={{ gap: 14 }}>
                {stats.upcoming.map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* not-a-tutor nudge */}
        {!tutor && (
          <Reveal delay={0.2}>
            <div className="cta-band">
              <h3 className="h3" style={{ maxWidth: 480 }}>
                Good at a subject? Teach a free class and earn volunteer hours.
              </h3>
              <button className="btn btn-band-light" onClick={() => navigate('/teach')}>
                Teach a class
              </button>
            </div>
          </Reveal>
        )}
      </div>

      {thanking && <KudosModal tutor={thanking} onClose={() => setThanking(null)} />}
    </div>
  );
}

/** A teacher editing their own card: tagline, grade and availability. */
function EditMyCard({ tutor }: { tutor: Tutor }) {
  const { setMyProfile } = useStore();
  const [editing, setEditing] = useState(false);
  const [tagline, setTagline] = useState(tutor.tagline);
  const [grade, setGrade] = useState(tutor.grade);
  const [availability, setAvailability] = useState(tutor.availability ?? '');

  if (!editing) {
    return (
      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <div className="row between" style={{ gap: 12, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <h3 className="h3">Your teacher card</h3>
            <p className="serif-i" style={{ fontSize: 15, color: 'var(--ink-2)', margin: '6px 0 0' }}>
              “{tutor.tagline}”
            </p>
            <div className="small muted" style={{ marginTop: 6 }}>
              {[tutor.grade, tutor.availability && `free ${tutor.availability}`].filter(Boolean).join(' · ')}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ flex: 'none' }} onClick={() => setEditing(true)}>
            Edit your card
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card card-pad stack" style={{ gap: 12, marginBottom: 24 }}>
      <h3 className="h3">Your teacher card</h3>
      <p className="muted small">
        This is what students see on the Teachers page. Name and subjects are set by the team; the
        rest is yours.
      </p>
      <label className="field">
        <span className="label">Tagline</span>
        <input
          className="input"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={140}
          placeholder="One line about you as a teacher"
        />
      </label>
      <div className="grid-2">
        <label className="field">
          <span className="label">Grade</span>
          <input
            className="input"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            maxLength={40}
            placeholder="11th grade"
          />
        </label>
        <label className="field">
          <span className="label">When you're free</span>
          <input
            className="input"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            maxLength={80}
            placeholder="Tue & Thu, 6–8pm"
          />
        </label>
      </div>
      <div className="row">
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setMyProfile(tagline, grade, availability);
            setEditing(false);
          }}
        >
          Save
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

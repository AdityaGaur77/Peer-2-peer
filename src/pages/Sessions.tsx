import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Reveal } from '../components/Reveal';
import { SessionCard } from '../components/SessionCard';
import { pastSessions, tutorById, upcomingSessions, useStore } from '../lib/store';
import type { Level, SubjectId } from '../lib/types';
import { cx } from '../lib/util';

const SUBJECT_FILTERS: Array<{ id: 'all' | SubjectId; label: string }> = [
  { id: 'all', label: 'All subjects' },
  { id: 'python', label: 'Python' },
  { id: 'ai', label: 'AI & ML' },
];

const LEVEL_FILTERS: Array<{ id: 'all' | Level; label: string }> = [
  { id: 'all', label: 'Any level' },
  { id: 'intro', label: 'Intro friendly' },
  { id: 'intermediate', label: 'Intermediate' },
];

export function Sessions() {
  const { db, profile, requireProfile, addRequest, voteRequest } = useStore();
  const [params, setParams] = useSearchParams();
  const [level, setLevel] = useState<'all' | Level>('all');
  const [showPast, setShowPast] = useState(false);
  // a shared link may point past the first page — show everything in that case
  const [showAll, setShowAll] = useState(() => !!params.get('s'));
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('');
  const [topicSubject, setTopicSubject] = useState<'python' | 'ai' | 'other'>('python');

  const subject = (params.get('subject') as SubjectId | null) ?? 'all';
  const tutorFilter = params.get('tutor');
  const tutor = tutorFilter ? tutorById(db, tutorFilter) : undefined;

  const setSubject = (s: 'all' | SubjectId) => {
    const next = new URLSearchParams(params);
    if (s === 'all') next.delete('subject');
    else next.set('subject', s);
    setParams(next, { replace: true });
  };

  const clearTutor = () => {
    const next = new URLSearchParams(params);
    next.delete('tutor');
    setParams(next, { replace: true });
  };

  const upcoming = useMemo(() => {
    const q = query.trim().toLowerCase();
    return upcomingSessions(db).filter((s) => {
      if (subject !== 'all' && s.subject !== subject) return false;
      if (level !== 'all' && s.level !== level && s.level !== 'all') return false;
      if (tutorFilter && s.tutorId !== tutorFilter) return false;
      if (!q) return true;
      const tutorName = tutorById(db, s.tutorId)?.name ?? '';
      return `${s.title} ${s.description} ${tutorName}`.toLowerCase().includes(q);
    });
  }, [db, subject, level, tutorFilter, query]);

  const past = useMemo(
    () =>
      showPast
        ? pastSessions(db).filter((s) => !tutorFilter || s.tutorId === tutorFilter).slice(0, 8)
        : [],
    [db, showPast, tutorFilter],
  );

  const requests = [...db.requests].sort((a, b) => b.votes - a.votes);

  // shared links: /#/sessions?s=<id> scrolls to + highlights that session
  const shared = params.get('s');
  useEffect(() => {
    if (!shared) return;
    const el = document.getElementById(`session-${shared}`);
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ticket-target');
    }, 350);
    const off = window.setTimeout(() => el.classList.remove('ticket-target'), 3600);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(off);
    };
  }, [shared]);

  const submitTopic = (e: FormEvent) => {
    e.preventDefault();
    const t = topic.trim();
    if (t.length < 4) return;
    requireProfile((p) => {
      addRequest(t, topicSubject, p.name.split(' ')[0]);
      setTopic('');
    });
  };

  return (
    <div className="section" style={{ paddingTop: 'clamp(110px, 15vw, 150px)' }}>
      <div className="container">
        <div className="section-head">
          <Reveal>
            <span className="eyebrow">the session board</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="h2">
              Every spot is <em className="em-ember">free.</em> Grab one.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lede">
              Live group sessions on video — small, casual, taught by certified student tutors.
              RSVP and the room link is yours.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <div className="row" style={{ marginBottom: 26, gap: 8 }}>
            <input
              className="input"
              style={{ width: 210, padding: '8px 14px', borderRadius: 999, fontSize: 13.5 }}
              placeholder="search the board…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search sessions"
            />
            <span style={{ width: 6 }} />
            {SUBJECT_FILTERS.map((f) => (
              <button
                key={f.id}
                className={cx('chip chip-btn', subject === f.id && 'on')}
                onClick={() => setSubject(f.id)}
              >
                {f.label}
              </button>
            ))}
            <span style={{ width: 10 }} />
            {LEVEL_FILTERS.map((f) => (
              <button
                key={f.id}
                className={cx('chip chip-btn', level === f.id && 'on')}
                onClick={() => setLevel(f.id)}
              >
                {f.label}
              </button>
            ))}
            <span style={{ width: 10 }} />
            <button
              className={cx('chip chip-btn', showPast && 'on')}
              onClick={() => setShowPast((v) => !v)}
            >
              {showPast ? 'Hide past sessions' : 'Show past sessions'}
            </button>
            {tutor && (
              <button className="chip chip-btn on" onClick={clearTutor}>
                by {tutor.name} ✕
              </button>
            )}
          </div>
        </Reveal>

        <div className="sessions-layout">
          <div className="stack" style={{ gap: 16 }}>
            {upcoming.length === 0 && (
              <div className="card card-pad" style={{ textAlign: 'center', padding: 48 }}>
                <p className="serif-i" style={{ fontSize: 22, color: 'var(--ink-2)' }}>
                  Nothing on the board for that filter — yet.
                </p>
                <p className="muted small" style={{ marginTop: 8 }}>
                  Request the topic on the right and a tutor will pick it up.
                </p>
              </div>
            )}
            {(showAll ? upcoming : upcoming.slice(0, 30)).map((s, i) => (
              <div key={s.id} id={`session-${s.id}`}>
                <Reveal delay={Math.min(i * 0.05, 0.3)}>
                  <SessionCard session={s} />
                </Reveal>
              </div>
            ))}
            {!showAll && upcoming.length > 30 && (
              <button className="btn btn-ghost" onClick={() => setShowAll(true)}>
                Show all {upcoming.length} sessions
              </button>
            )}

            {showPast && past.length > 0 && (
              <>
                <div className="row" style={{ margin: '18px 0 4px' }}>
                  <span className="eyebrow">recently completed</span>
                </div>
                {past.map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </>
            )}
          </div>

          <aside className="stack" style={{ gap: 16 }} id="requests">
            <div className="card card-pad stack" style={{ gap: 14 }}>
              <h3 className="h3">Request a topic</h3>
              <p className="muted" style={{ fontSize: 13.5 }}>
                Tutors build the schedule from this list. Most-wanted goes first.
              </p>
              <form className="stack" style={{ gap: 10 }} onSubmit={submitTopic}>
                <input
                  className="input"
                  placeholder="e.g. recursion, but slowly"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <div className="row between">
                  <select
                    className="select"
                    style={{ width: 'auto' }}
                    value={topicSubject}
                    onChange={(e) => setTopicSubject(e.target.value as typeof topicSubject)}
                  >
                    <option value="python">Python</option>
                    <option value="ai">AI & ML</option>
                    <option value="other">Something new</option>
                  </select>
                  <button className="btn btn-primary btn-sm" type="submit" disabled={topic.trim().length < 4}>
                    Request
                  </button>
                </div>
              </form>
            </div>

            <div className="card card-pad stack" style={{ gap: 4 }}>
              <h3 className="h3" style={{ marginBottom: 8 }}>
                Most wanted
              </h3>
              {requests.slice(0, 7).map((r) => {
                const voted = !!profile && r.votedBy.includes(profile.email);
                return (
                  <div key={r.id} className="line-item" style={{ padding: '11px 0' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 580 }}>{r.topic}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {r.subject} · asked by {r.by}
                      </div>
                    </div>
                    <button
                      className={cx('chip chip-btn', voted && 'on')}
                      onClick={() => requireProfile((p) => voteRequest(r.id, p.email))}
                      title={voted ? 'you +1’d this' : '+1 this topic'}
                    >
                      ▲ {r.votes}
                    </button>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

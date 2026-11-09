import { Fragment, useEffect, useMemo, useState } from 'react';
import { localEvents, type AnalyticsEvent } from '../lib/analytics';
import { supabase } from '../lib/backend';
import { remote } from '../lib/remote';
import { cx, downloadText, fmtDate, fmtTime, plural } from '../lib/util';

const RANGES: Array<[string, number]> = [
  ['Today', 1],
  ['7 days', 7],
  ['30 days', 30],
  ['90 days', 90],
];

const KEY_ACTIONS: Array<[AnalyticsEvent['kind'], string]> = [
  ['signin', 'signed in'],
  ['rsvp', 'saved a spot'],
  ['tutoring', 'asked for 1-on-1'],
  ['apply', 'applied to teach'],
  ['request', 'requested a topic'],
  ['kudos', 'thanked a teacher'],
];

function countBy<T>(items: T[], key: (t: T) => string | undefined | null) {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it) || '(none)';
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function uniqueBy<T>(items: T[], group: (t: T) => string | undefined | null, who: (t: T) => string) {
  const m = new Map<string, Set<string>>();
  for (const it of items) {
    const k = group(it) || '(none)';
    if (!m.has(k)) m.set(k, new Set());
    m.get(k)!.add(who(it));
  }
  return [...m.entries()].map(([k, s]) => [k, s.size] as [string, number]).sort((a, b) => b[1] - a[1]);
}

/** The visitor's calendar day in the admin's own time zone. */
function localDay(iso: string | undefined): string {
  const d = new Date(iso ?? '');
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const mins = (ms: number) =>
  ms < 60_000 ? `${Math.round(ms / 1000)}s` : `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;

function Table({ title, rows, unit, limit = 10 }: { title: string; rows: Array<[string, number]>; unit: string; limit?: number }) {
  const max = rows[0]?.[1] ?? 0;
  return (
    <div className="card card-pad">
      <h3 className="h3" style={{ marginBottom: 10, fontSize: '1.05rem' }}>
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="small muted">Nothing yet.</p>
      ) : (
        <div className="stack" style={{ gap: 6 }}>
          {rows.slice(0, limit).map(([k, n]) => (
            <div key={k} className="bar-row">
              <span className="bar-fill" style={{ width: `${max ? (n / max) * 100 : 0}%` }} aria-hidden />
              <span className="bar-label">{k}</span>
              <span className="bar-num">
                {n} <span className="muted">{n === 1 ? unit.replace(/s$/, '') : unit}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Who visited, how they found us, what they did. Everything is worked out
 * here from the raw events, so any new question is a few lines away.
 */
export function AnalyticsPanel() {
  const [days, setDays] = useState(7);
  const [raw, setEvents] = useState<AnalyticsEvent[] | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let alive = true;
    setEvents(null);
    setErr('');
    const since = new Date(Date.now() - days * 86_400_000);
    if (days === 1) since.setHours(0, 0, 0, 0);
    const load = supabase
      ? remote.fetchEvents(supabase, since.toISOString())
      : Promise.resolve(localEvents().filter((e) => (e.at ?? '') >= since.toISOString())); // oldest first, sorted below
    load
      .then((e) => alive && setEvents(e))
      .catch((x: Error) => alive && setErr(x.message));
    return () => {
      alive = false;
    };
  }, [days, reloads]);

  const r = useMemo(() => {
    if (!raw) return null;
    // oldest first. A batch of events shares one server time, so the row id
    // (given out in the order they were sent) breaks ties.
    const asc = raw
      .map((e, i) => ({ e, k: e.id ?? i }))
      .sort((a, b) => (a.e.at ?? '').localeCompare(b.e.at ?? '') || a.k - b.k)
      .map((x) => x.e);
    const events = [...asc].reverse();
    const views = events.filter((e) => e.kind === 'pageview');
    const visitors = new Set(events.map((e) => e.visitor_id));
    const sessions = new Map<string, AnalyticsEvent[]>();
    for (const e of asc) {
      if (!sessions.has(e.session_id)) sessions.set(e.session_id, []);
      sessions.get(e.session_id)!.push(e);
    }
    // a visit starts with a page view; stray events on their own aren't one
    const sessionList = [...sessions.entries()].flatMap(([id, evs]) => {
      const pv = evs.filter((e) => e.kind === 'pageview');
      if (pv.length === 0) return [];
      const dur = evs.filter((e) => e.kind === 'leave').reduce((n, e) => n + (e.duration_ms ?? 0), 0);
      const first = pv[0];
      return [{
        id,
        first,
        start: first.at ?? '',
        pages: pv.length,
        duration: dur,
        email: evs.find((e) => e.user_email)?.user_email ?? null,
        actions: evs.filter((e) => KEY_ACTIONS.some(([k]) => k === e.kind)),
        events: evs,
      }];
    });
    const returning = new Set<string>();
    const firstSeen = new Map<string, string>();
    for (const e of asc) {
      if (e.kind !== 'pageview') continue;
      if (!firstSeen.has(e.visitor_id)) firstSeen.set(e.visitor_id, e.session_id);
      else if (firstSeen.get(e.visitor_id) !== e.session_id) returning.add(e.visitor_id);
    }
    const bounced = sessionList.filter((s) => s.pages <= 1 && s.actions.length === 0).length;
    const totalTime = sessionList.reduce((n, s) => n + s.duration, 0);
    const signedIn = new Set(events.filter((e) => e.user_email).map((e) => e.user_email as string));

    // visitors per day
    const perDay = new Map<string, Set<string>>();
    for (const e of events) {
      const d = localDay(e.at);
      if (!perDay.has(d)) perDay.set(d, new Set());
      perDay.get(d)!.add(e.visitor_id);
    }
    const daily = [...perDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([d, s]) => [d, s.size] as [string, number]);

    const firsts = sessionList.map((s) => s.first);
    return {
      views,
      visitors: visitors.size,
      sessions: sessionList.length,
      returning: returning.size,
      bounceRate: sessionList.length ? Math.round((bounced / sessionList.length) * 100) : 0,
      avgTime: sessionList.length ? totalTime / sessionList.length : 0,
      pagesPerSession: sessionList.length ? views.length / sessionList.length : 0,
      signedIn,
      daily,
      pages: uniqueBy(views, (e) => e.path, (e) => e.visitor_id),
      landings: countBy(firsts, (e) => e.landing),
      sources: countBy(firsts, (e) => `${e.source ?? 'direct'} / ${e.medium ?? 'none'}`),
      campaigns: countBy(firsts.filter((e) => e.campaign), (e) => e.campaign),
      referrers: countBy(firsts.filter((e) => e.referrer), (e) => {
        try {
          return new URL(e.referrer!).host.replace(/^www\./, '');
        } catch {
          return e.referrer;
        }
      }),
      devices: countBy(firsts, (e) => e.device),
      browsers: countBy(firsts, (e) => `${e.browser ?? '?'} on ${e.os ?? '?'}`),
      places: countBy(firsts, (e) => e.tz),
      clicks: countBy(events.filter((e) => e.kind === 'click'), (e) => `${e.label || e.href || '?'}  ·  ${e.path}`),
      actions: KEY_ACTIONS.map(([k, label]) => {
        const n = new Set(events.filter((e) => e.kind === k).map((e) => e.session_id)).size;
        return { k, label, n, rate: sessionList.length ? Math.round((n / sessionList.length) * 100) : 0 };
      }),
      recent: sessionList.sort((a, b) => b.start.localeCompare(a.start)).slice(0, 60),
    };
  }, [raw]);

  const exportCsv = () => {
    if (!raw) return;
    const cols: Array<keyof AnalyticsEvent> = [
      'at', 'kind', 'path', 'label', 'href', 'source', 'medium', 'campaign', 'referrer', 'landing',
      'device', 'browser', 'os', 'screen', 'lang', 'tz', 'duration_ms', 'user_email', 'visitor_id', 'session_id',
    ];
    // a cell starting with = + - @ would run as a formula in Excel or Sheets
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
    };
    downloadText(
      `peer2peer-analytics-${new Date().toISOString().slice(0, 10)}.csv`,
      [cols.join(','), ...raw.map((e) => cols.map((c) => esc(e[c])).join(','))].join('\n'),
      'text/csv',
    );
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row between">
        <div className="tabs">
          {RANGES.map(([label, d]) => (
            <button key={d} className={cx('tab', days === d && 'on')} onClick={() => setDays(d)}>
              {label}
            </button>
          ))}
        </div>
        <div className="row">
          <button className="btn-quiet" onClick={() => setReloads((n) => n + 1)}>
            refresh
          </button>
          <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!raw?.length}>
            Download CSV
          </button>
        </div>
      </div>

      {!supabase && (
        <p className="hint">
          Offline mode: these are only the visits made in this browser. With Supabase connected
          you see every visitor.
        </p>
      )}
      {err && <p className="small" style={{ color: 'var(--hot-deep)' }}>Couldn't load analytics: {err}</p>}
      {!raw && !err && <p className="small muted">Loading…</p>}

      {r && (
        <>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="stat-grid">
              {([
                [r.visitors, 'visitors'],
                [r.sessions, 'visits'],
                [r.views.length, 'pages viewed'],
                [r.returning, 'came back'],
                [mins(r.avgTime), 'avg. time per visit'],
                [r.pagesPerSession.toFixed(1), 'pages per visit'],
                [`${r.bounceRate}%`, 'left after one page'],
                [r.signedIn.size, 'signed-in people'],
              ] as Array<[string | number, string]>).map(([n, label]) => (
                <div className="stat" key={label}>
                  <span className="stat-num">{n}</span>
                  <span className="stat-label">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h3" style={{ marginBottom: 10, fontSize: '1.05rem' }}>
              Visitors per day
            </h3>
            {r.daily.length === 0 ? (
              <p className="small muted">No visits in this period.</p>
            ) : (
              <div className="day-bars">
                {r.daily.map(([d, n]) => {
                  const max = Math.max(...r.daily.map((x) => x[1]));
                  return (
                    <div key={d} className="day-bar" title={`${d}: ${n}`}>
                      <span className="day-bar-num">{n}</span>
                      <span className="day-bar-fill" style={{ height: `${(n / max) * 100}%` }} />
                      <span className="day-bar-label">{d.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card card-pad">
            <h3 className="h3" style={{ marginBottom: 10, fontSize: '1.05rem' }}>
              What visitors did
            </h3>
            <div className="stack" style={{ gap: 6 }}>
              {r.actions.map((a) => (
                <div key={a.k} className="line-item" style={{ padding: '6px 0' }}>
                  <span>{plural(a.n, 'visit')} {a.label}</span>
                  <span className="small muted">{a.rate}% of visits</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid-2">
            <Table title="How people found us" rows={r.sources} unit="visits" />
            <Table title="Sites that sent visitors" rows={r.referrers} unit="visits" />
            <Table title="Pages viewed" rows={r.pages} unit="people" />
            <Table title="First page of the visit" rows={r.landings} unit="visits" />
            <Table title="Most clicked" rows={r.clicks} unit="clicks" limit={15} />
            <Table title="Campaign tags (utm_campaign)" rows={r.campaigns} unit="visits" />
            <Table title="Devices" rows={r.devices} unit="visits" />
            <Table title="Browser and system" rows={r.browsers} unit="visits" />
            <Table title="Time zone (roughly where they are)" rows={r.places} unit="visits" />
          </div>

          <div className="card card-pad" style={{ overflowX: 'auto' }}>
            <h3 className="h3" style={{ marginBottom: 10, fontSize: '1.05rem' }}>
              Recent visits
            </h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>From</th>
                  <th>First page</th>
                  <th>Pages</th>
                  <th>Time</th>
                  <th>Device</th>
                </tr>
              </thead>
              <tbody>
                {r.recent.map((s) => (
                  <Fragment key={s.id}>
                    <tr>
                      <td>
                        <button className="link-btn" onClick={() => setOpen(open === s.id ? null : s.id)}>
                          {s.start ? `${fmtDate(s.start)} ${fmtTime(s.start)}` : '—'}
                        </button>
                      </td>
                      <td>{s.email ?? <span className="muted">visitor</span>}</td>
                      <td>
                        {s.first.source}
                        {s.first.campaign ? ` · ${s.first.campaign}` : ''}
                      </td>
                      <td>{s.first.landing}</td>
                      <td>{s.pages}</td>
                      <td>{mins(s.duration)}</td>
                      <td>
                        {s.first.device} · {s.first.browser}
                      </td>
                    </tr>
                    {open === s.id && (
                      <tr>
                        <td colSpan={7}>
                          <ol className="journey">
                            {s.events
                              .filter((e) => e.kind !== 'leave')
                              .map((e, i) => (
                                <li key={i}>
                                  <span className="muted small">{e.at ? fmtTime(e.at) : ''}</span>{' '}
                                  {e.kind === 'pageview'
                                    ? `opened ${e.path}`
                                    : e.kind === 'click'
                                      ? `clicked "${e.label || e.href}"`
                                      : `${KEY_ACTIONS.find(([k]) => k === e.kind)?.[1] ?? e.kind}${e.label ? `: ${e.label}` : ''}`}
                                </li>
                              ))}
                          </ol>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">
            Tip: add <code>?utm_source=instagram&amp;utm_campaign=fall-launch</code> to links you post
            and they show up under "How people found us" and "Campaign tags".
          </p>
        </>
      )}
    </div>
  );
}

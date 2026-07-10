import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from '../lib/util';

// The signature piece: one baton travelling through the people it changed.
// Everything Relay is, in one loop.

interface Beat {
  frac: number;
  initials: string;
  name: string;
  when: string;
  dashed?: boolean;
  caption: ReactNode;
}

const BEATS: Beat[] = [
  {
    frac: 0.04, initials: 'AG', name: 'Aditya', when: 'may',
    caption: <><strong>Aditya</strong> hosts the first free session — five kids, one video call.</>,
  },
  {
    frac: 0.28, initials: 'MK', name: 'Maya', when: 'may',
    caption: <><strong>Maya</strong> learns loops, passes the tutor quiz, starts teaching.</>,
  },
  {
    frac: 0.52, initials: 'R', name: 'Riya', when: 'jun',
    caption: <><strong>Riya</strong> joins Maya's session and ships her first game.</>,
  },
  {
    frac: 0.75, initials: '9+', name: 'her students', when: 'jul',
    caption: <>Riya certifies — <strong>nine students</strong> show up to her first session.</>,
  },
  {
    frac: 0.97, initials: '?', name: 'you', when: 'next', dashed: true,
    caption: <>The baton doesn't stop here. <strong>It's your turn.</strong></>,
  },
];

const PATH_D =
  'M 28 132 C 160 44, 310 40, 480 100 C 620 148, 720 152, 810 118 C 880 92, 935 76, 972 60';
const LOOP_MS = 19000;

const smooth = (u: number) => u * u * (3 - 2 * u);

export function RelayChain() {
  const measureRef = useRef<SVGPathElement>(null);
  const trailRef = useRef<SVGPathElement>(null);
  const batonRef = useRef<SVGCircleElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pts, setPts] = useState<Array<{ x: number; y: number }>>([]);
  const [active, setActive] = useState(-1);
  const [capIdx, setCapIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const [reduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  // node coordinates from the path itself
  useEffect(() => {
    const path = measureRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    setPts(
      BEATS.map((b) => {
        const p = path.getPointAtLength(b.frac * total);
        return { x: p.x, y: p.y };
      }),
    );
  }, []);

  // caption swap with a soft fade
  useEffect(() => {
    if (active < 0 || active === capIdx) return;
    setFading(true);
    const t = window.setTimeout(() => {
      setCapIdx(active);
      setFading(false);
    }, 220);
    return () => window.clearTimeout(t);
  }, [active, capIdx]);

  // drive the baton
  useEffect(() => {
    const path = measureRef.current;
    const trail = trailRef.current;
    const baton = batonRef.current;
    const glow = glowRef.current;
    if (!path || !trail || !baton || !glow) return;
    const total = path.getTotalLength();

    if (reduced) {
      const p = path.getPointAtLength(total * 0.97);
      baton.setAttribute('cx', String(p.x));
      baton.setAttribute('cy', String(p.y));
      glow.setAttribute('cx', String(p.x));
      glow.setAttribute('cy', String(p.y));
      trail.setAttribute('stroke-dasharray', `${total} 0`);
      setActive(BEATS.length - 1);
      return;
    }

    // ease into each handoff: piecewise smoothstep between beat fractions
    const stops = [0, ...BEATS.map((b) => b.frac), 1];
    const eased = (t: number) => {
      for (let i = 0; i < stops.length - 1; i++) {
        if (t <= stops[i + 1]) {
          const u = (t - stops[i]) / (stops[i + 1] - stops[i]);
          return stops[i] + (stops[i + 1] - stops[i]) * smooth(u);
        }
      }
      return t;
    };

    let raf = 0;
    let running = true;
    const start = performance.now();

    const frame = (now: number) => {
      if (!running) return;
      const t = ((now - start) % LOOP_MS) / LOOP_MS;
      const f = eased(t);
      const len = f * total;
      const p = path.getPointAtLength(len);
      baton.setAttribute('cx', String(p.x));
      baton.setAttribute('cy', String(p.y));
      glow.setAttribute('cx', String(p.x));
      glow.setAttribute('cy', String(p.y));
      trail.setAttribute('stroke-dasharray', `${len} ${total - len + 4}`);

      let idx = -1;
      for (let i = 0; i < BEATS.length; i++) {
        if (f >= BEATS[i].frac - 0.004) idx = i;
      }
      setActive((prev) => (prev === idx ? prev : idx));
      raf = requestAnimationFrame(frame);
    };

    // only animate while on screen
    const io = new IntersectionObserver((entries) => {
      const vis = entries[0].isIntersecting;
      if (vis && !running) {
        running = true;
        raf = requestAnimationFrame(frame);
      } else if (!vis) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    if (wrapRef.current) io.observe(wrapRef.current);
    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [reduced]);

  return (
    <div className="chain" ref={wrapRef} aria-label="How the relay works: each learner becomes a tutor">
      <svg viewBox="0 0 1000 208" role="img">
        <defs>
          <linearGradient id="batonGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#f2a03d" />
            <stop offset="1" stopColor="#e4572e" />
          </linearGradient>
        </defs>

        <path ref={measureRef} className="chain-track" d={PATH_D} />
        <path ref={trailRef} className="chain-trail" d={PATH_D} strokeDasharray="0 2000" />

        {pts.length === BEATS.length &&
          BEATS.map((b, i) => (
            <g
              key={b.name}
              className={cx('chain-node', active >= i && 'lit')}
              transform={`translate(${pts[i].x}, ${pts[i].y})`}
            >
              <circle className="halo" r="19" />
              <circle
                className="face"
                r="19"
                strokeDasharray={b.dashed ? '4 5' : undefined}
              />
              <text textAnchor="middle" dy="4.5">
                {b.initials}
              </text>
              <text className="when" textAnchor="middle" y="-30">
                {b.when}
              </text>
              <text className="who" textAnchor="middle" y="42">
                {b.name}
              </text>
            </g>
          ))}

        <circle ref={glowRef} className="baton-glow" r="15" cx="-20" cy="-20" />
        <circle ref={batonRef} className="baton-dot" r="6.5" cx="-20" cy="-20" />
      </svg>

      <p className={cx('chain-cap', fading && 'fading')} aria-live="polite">
        {BEATS[capIdx].caption}
      </p>
    </div>
  );
}

import type { ReactNode } from 'react';
import { Reveal } from './Reveal';
import { cx } from '../lib/util';

export interface GuideStepDef {
  id: string;
  label: string;
}

interface GuideShellProps {
  eyebrow: string;
  title: ReactNode;
  intro: string;
  steps: GuideStepDef[];
  current: number;
  maxVisited: number;
  onStep: (i: number) => void;
  children: ReactNode; // the current step's content
  aside?: ReactNode; // sticky preview column (optional)
  footer: ReactNode; // back / next controls
}

export function GuideShell({
  eyebrow, title, intro, steps, current, maxVisited, onStep, children, aside, footer,
}: GuideShellProps) {
  return (
    <div className="section" style={{ paddingTop: 'clamp(110px, 15vw, 150px)' }}>
      <div className="container">
        <div className="section-head" style={{ marginBottom: 28 }}>
          <Reveal>
            <span className="eyebrow">{eyebrow}</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="h2">{title}</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lede">{intro}</p>
          </Reveal>
        </div>

        <div className={cx('guide-layout', !!aside && 'has-aside')}>
          <nav className="guide-rail" aria-label="Guide steps">
            {steps.map((s, i) => {
              const done = i < current;
              const reachable = i <= Math.min(maxVisited + 1, steps.length - 1);
              return (
                <button
                  key={s.id}
                  className={cx('rail-item', done && 'done', i === current && 'on')}
                  onClick={() => reachable && onStep(i)}
                  disabled={!reachable}
                  aria-current={i === current ? 'step' : undefined}
                >
                  <span className="rail-dot">{done ? '✓' : String(i + 1).padStart(2, '0')}</span>
                  <span className="rail-label">{s.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="guide-main card card-pad">
            <div className="mono small muted" style={{ marginBottom: 14 }}>
              leg {String(current + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
            </div>
            {children}
            <div className="row between" style={{ marginTop: 26, gap: 12 }}>
              {footer}
            </div>
          </div>

          {aside && <aside className="guide-aside">{aside}</aside>}
        </div>
      </div>
    </div>
  );
}

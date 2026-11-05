import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../lib/util';

interface RevealProps {
  children: ReactNode;
  delay?: number; // seconds
  className?: string;
  /** Which way it arrives from. Default is a short rise. */
  from?: 'up' | 'left' | 'right' | 'zoom';
}

/** Calm entrance when the element first scrolls into view. */
export function Reveal({ children, delay = 0, className, from = 'up' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cx('reveal', from !== 'up' && `reveal-${from}`, inView && 'in', className)}
      style={{ '--rd': `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}

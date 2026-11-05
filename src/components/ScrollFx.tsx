import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

// useLayoutEffect warns during server rendering (the smoke test does that)
const useBrowserLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * A thin progress line across the top of the page, plus the slow drift of
 * anything marked `.parallax` (the hero's relay chain). One passive scroll
 * listener, batched to animation frames. Does nothing with reduced motion.
 */
export function ScrollFx() {
  const bar = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    if (reducedMotion()) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      // only near the top, where the hero is; cheaper and avoids drift elsewhere
      if (y < 1200) {
        document.querySelectorAll<HTMLElement>('.parallax').forEach((el) => {
          el.style.transform = `translate3d(0, ${(y * 0.12).toFixed(1)}px, 0)`;
        });
      }
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return <div ref={bar} className="scroll-progress" aria-hidden="true" />;
}

/**
 * A number that counts up from zero the first time it scrolls into view.
 * Renders the real value first, so it's right without JavaScript, for
 * screen readers, and with reduced motion.
 */
export function CountUp({ to, suffix = '', prefix = '' }: { to: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(to);
  const animate = useRef(false);

  // Start from zero before the first paint, so there's no flash of the final
  // number followed by a jump back to 0.
  useBrowserLayoutEffect(() => {
    animate.current = !reducedMotion() && to > 0;
    setShown(animate.current ? 0 : to);
  }, [to]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !animate.current) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const dur = 900;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - t, 3);
          setShown(Math.round(to * eased));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);

  return (
    <span ref={ref} aria-label={`${prefix}${to}${suffix}`}>
      <span aria-hidden="true">
        {prefix}
        {shown}
        {suffix}
      </span>
    </span>
  );
}

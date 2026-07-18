"use client";

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Entrance delay in ms (kept small for snappy feel). */
  delay?: number;
  /** Vertical travel distance. */
  y?: number;
};

/**
 * Lightweight scroll-reveal wrapper.
 * - Animates only `transform` + `opacity` (GPU-friendly, no layout thrash).
 * - Fires once via IntersectionObserver, then disconnects (no scroll listeners).
 * - Fully skipped when the user prefers reduced motion (content shows instantly).
 */
export function Reveal({ children, className, delay = 0, y = 20 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: shown ? `${delay}ms` : '0ms',
        transform: shown ? 'translateY(0)' : `translateY(${y}px)`,
        opacity: shown ? 1 : 0,
        willChange: shown ? 'auto' : 'transform, opacity',
      }}
      className={cn(
        'transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
        className
      )}
    >
      {children}
    </div>
  );
}

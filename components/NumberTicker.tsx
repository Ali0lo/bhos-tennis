'use client';

import React, { useEffect, useRef } from 'react';
import { useInView } from 'framer-motion';

interface NumberTickerProps {
  value: number;
  startValue?: number;
  durationMs?: number;
  direction?: 'up' | 'down';
  delay?: number;
  className?: string;
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
}

export default function NumberTicker({
  value,
  startValue = 0,
  durationMs = 850,
  direction = 'up',
  delay = 0,
  className = '',
  decimalPlaces = 0,
  prefix = '',
  suffix = '',
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const currentRef = useRef<number>(direction === 'down' ? value : startValue);
  const isInView = useInView(ref, { once: true, margin: '0px' });

  useEffect(() => {
    if (!isInView) return;

    const from = currentRef.current;
    const to = direction === 'down' ? startValue : value;
    let rafId: number | null = null;
    let startTime: number | null = null;

    const timer = setTimeout(() => {
      const tick = (now: number) => {
        if (startTime === null) startTime = now;
        const elapsed = now - startTime;
        const progress = Math.min(1, durationMs > 0 ? elapsed / durationMs : 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = from + (to - from) * eased;
        currentRef.current = current;

        if (ref.current) {
          ref.current.textContent = `${prefix}${current.toFixed(decimalPlaces)}${suffix}`;
        }

        if (progress < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          currentRef.current = to;
          if (ref.current) {
            ref.current.textContent = `${prefix}${to.toFixed(decimalPlaces)}${suffix}`;
          }
        }
      };

      rafId = requestAnimationFrame(tick);
    }, delay * 1000);

    return () => {
      clearTimeout(timer);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isInView, value, startValue, durationMs, delay, direction, decimalPlaces, prefix, suffix]);

  return (
    <span
      ref={ref}
      className={`inline-block tabular-nums font-mono ${className}`}
    >
      {prefix}
      {(direction === 'down' ? value : startValue).toFixed(decimalPlaces)}
      {suffix}
    </span>
  );
}

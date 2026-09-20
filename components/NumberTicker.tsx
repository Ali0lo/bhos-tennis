'use client';

import React, { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, useTransform, motion } from 'framer-motion';

export interface NumberTickerProps {
  value: number;
  direction?: 'up' | 'down';
  className?: string;
  delay?: number;
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
}

export default function NumberTicker({
  value,
  direction = 'up',
  className = '',
  delay = 0,
  decimalPlaces = 0,
  prefix = '',
  suffix = '',
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(direction === 'down' ? value : 0);
  const springVal = useSpring(motionVal, {
    damping: 30,
    stiffness: 100,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      motionVal.set(direction === 'down' ? 0 : value);
    }, delay * 1000);
    return () => clearTimeout(timer);
  }, [motionVal, value, delay, direction]);

  const displayVal = useTransform(springVal, (current) => {
    return `${prefix}${Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(Number(current.toFixed(decimalPlaces)))}${suffix}`;
  });

  return (
    <motion.span className={`inline-block tabular-nums tracking-normal ${className}`}>
      {displayVal}
    </motion.span>
  );
}

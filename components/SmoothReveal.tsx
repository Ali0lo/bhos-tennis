'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SmoothRevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  className?: string;
  duration?: number;
}

export default function SmoothReveal({
  children,
  delay = 0,
  direction = 'up',
  className = '',
  duration = 0.65,
}: SmoothRevealProps) {
  const offset = 24;
  const initialMap = {
    up: { opacity: 0, y: offset, x: 0 },
    down: { opacity: 0, y: -offset, x: 0 },
    left: { opacity: 0, x: offset, y: 0 },
    right: { opacity: 0, x: -offset, y: 0 },
    none: { opacity: 0, x: 0, y: 0 },
  };

  return (
    <motion.div
      initial={initialMap[direction]}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

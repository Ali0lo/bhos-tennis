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
  const offset = 28;
  const initialX = direction === 'left' ? offset : direction === 'right' ? -offset : 0;
  const initialY = direction === 'up' ? offset : direction === 'down' ? -offset : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: initialX, y: initialY }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
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

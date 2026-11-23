'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';

interface SmoothRevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  scale?: boolean;
  staggerChildren?: number;
  className?: string;
}

// Fast, crisp exponential ease-out for broadcast-grade transitions
const EDITORIAL_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function SmoothReveal({
  children,
  delay = 0,
  direction = 'up',
  scale = false,
  staggerChildren,
  className = '',
}: SmoothRevealProps) {
  const initialOffset = {
    up: { y: 12, x: 0 },
    down: { y: -12, x: 0 },
    left: { x: 14, y: 0 },
    right: { x: -14, y: 0 },
    none: { x: 0, y: 0 },
  }[direction];

  if (staggerChildren) {
    const containerVariants: Variants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          delayChildren: Math.min(delay, 0.08),
          staggerChildren: Math.min(staggerChildren, 0.06),
        },
      },
    };

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: initialOffset.y,
        x: initialOffset.x,
        scale: scale ? 0.985 : 1,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
      }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{
        duration: 0.36,
        delay: Math.min(delay, 0.12),
        ease: EDITORIAL_EASE,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface SmoothRevealItemProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  scale?: boolean;
  className?: string;
}

export function SmoothRevealItem({
  children,
  direction = 'up',
  scale = false,
  className = '',
}: SmoothRevealItemProps) {
  const initialOffset = {
    up: { y: 12, x: 0 },
    down: { y: -12, x: 0 },
    left: { x: 14, y: 0 },
    right: { x: -14, y: 0 },
    none: { x: 0, y: 0 },
  }[direction];

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      y: initialOffset.y,
      x: initialOffset.x,
      scale: scale ? 0.985 : 1,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.34,
        ease: EDITORIAL_EASE,
      },
    },
  };

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}

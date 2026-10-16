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

const SMOOTH_EASE: [number, number, number, number] = [0.21, 0.47, 0.32, 0.98];

export default function SmoothReveal({
  children,
  delay = 0,
  direction = 'up',
  scale = false,
  staggerChildren,
  className = '',
}: SmoothRevealProps) {
  const initialOffset = {
    up: { y: 32, x: 0 },
    down: { y: -32, x: 0 },
    left: { x: 32, y: 0 },
    right: { x: -32, y: 0 },
    none: { x: 0, y: 0 },
  }[direction];

  if (staggerChildren) {
    const containerVariants: Variants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          delayChildren: delay,
          staggerChildren,
        },
      },
    };

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
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
        scale: scale ? 0.96 : 1,
        filter: 'blur(6px)',
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        filter: 'blur(0px)',
      }}
      viewport={{ once: true, margin: '-60px' }}
      transition={
        scale
          ? {
              type: 'spring',
              stiffness: 180,
              damping: 22,
              delay,
            }
          : {
              duration: 0.65,
              delay,
              ease: SMOOTH_EASE,
            }
      }
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
    up: { y: 32, x: 0 },
    down: { y: -32, x: 0 },
    left: { x: 32, y: 0 },
    right: { x: -32, y: 0 },
    none: { x: 0, y: 0 },
  }[direction];

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      y: initialOffset.y,
      x: initialOffset.x,
      scale: scale ? 0.96 : 1,
      filter: 'blur(6px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        duration: 0.65,
        ease: SMOOTH_EASE,
      },
    },
  };

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface EloToastBadgeProps {
  delta: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function EloToastBadge({ delta, className = '', size = 'md' }: EloToastBadgeProps) {
  const isPositive = delta >= 0;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size];

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.08 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={`inline-flex items-center font-mono font-bold rounded-full border shadow-lg ${
        isPositive
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-emerald-500/20'
          : 'bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-rose-500/20'
      } ${sizeClasses} ${className}`}
    >
      <span>
        {isPositive ? `+${delta}` : delta} ELO
      </span>
      {isPositive ? (
        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <TrendingDown className="w-3.5 h-3.5 shrink-0" />
      )}
    </motion.span>
  );
}

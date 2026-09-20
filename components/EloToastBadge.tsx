'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface EloToastBadgeProps {
  delta: number;
  className?: string;
  size?: 'sm' | 'md';
}

export default function EloToastBadge({ delta, className = '', size = 'md' }: EloToastBadgeProps) {
  const isPositive = delta >= 0;
  return (
    <span className={`inline-flex items-center gap-1 font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'} ${className}`}>
      {isPositive ? `+${delta}` : delta} ELO
    </span>
  );
}

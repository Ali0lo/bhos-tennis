'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface EloToastBadgeProps {
  delta: number;
  className?: string;
  size?: 'sm' | 'md';
}

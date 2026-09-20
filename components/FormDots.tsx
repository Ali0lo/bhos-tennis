'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface MatchFormItem {
  id: string;
  result: 'W' | 'L';
  opponentName?: string;
  score: string;
  eloDelta?: number;
  date?: string;
}

interface FormDotsProps {
  form: MatchFormItem[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function FormDots({ form, className = '', size = 'md' }: FormDotsProps) {
  return <div className={`flex items-center gap-1.5 ${className}`} />;
}

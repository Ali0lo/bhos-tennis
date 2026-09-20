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
  const dotSize = size === 'sm' ? 'w-2 h-2 text-[9px]' : size === 'lg' ? 'w-4 h-4 text-xs' : 'w-3 h-3 text-[10px]';

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {form.map((item) => (
        <span
          key={item.id}
          className={`rounded-full ${dotSize} ${item.result === 'W' ? 'bg-emerald-500' : 'bg-rose-500'}`}
        />
      ))}
    </div>
  );
}

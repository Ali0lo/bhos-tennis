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
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const dotSize = size === 'sm' ? 'w-2 h-2 text-[9px]' : size === 'lg' ? 'w-4 h-4 text-xs' : 'w-3 h-3 text-[10px]';

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {form.map((item, idx) => {
        const isWin = item.result === 'W';
        return (
          <div
            key={item.id || idx}
            className="relative"
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <motion.span
              whileHover={{ scale: 1.4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className={`block rounded-full cursor-pointer shadow-sm ${dotSize} ${
                isWin
                  ? 'bg-emerald-500 shadow-emerald-500/50'
                  : 'bg-rose-500 shadow-rose-500/50'
              }`}
            />

            {/* Hover Tooltip */}
            <AnimatePresence>
              {hoveredIdx === idx && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-xl bg-slate-950/95 border border-white/15 text-white shadow-2xl backdrop-blur-md z-50 whitespace-nowrap pointer-events-none"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                        isWin ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {item.result}
                    </span>
                    <span className="font-mono text-slate-200">{item.score}</span>
                    {item.opponentName && (
                      <span className="text-slate-400 font-sans">vs {item.opponentName}</span>
                    )}
                  </div>
                  {item.eloDelta !== undefined && (
                    <div className="text-[10px] text-right font-mono text-cyan-400 mt-0.5">
                      {item.eloDelta > 0 ? `+${item.eloDelta}` : item.eloDelta} ELO
                    </div>
                  )}
                  {/* Tooltip caret */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-950" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// FormDots with full score and opponent tooltip

'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface TableCardData {
  number: number;
  label: string;
  group: string;
  isWomen: boolean;
  usage: string;
  surface: string;
  statusLabel?: string;
}

interface TableCardProps {
  table: TableCardData;
}

export default function TableCard({ table }: TableCardProps) {
  const isMasa1 = table.number === 1 || table.isWomen;
  const statusText = table.statusLabel || 'Mövcuddur';

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className="rounded-2xl bg-[#0F1623]/90 backdrop-blur-md p-5 shadow-xl flex flex-col justify-between transition-all relative overflow-hidden will-change-transform"
      style={
        isMasa1
          ? {
              background:
                'linear-gradient(#0F1623, #0F1623) padding-box, linear-gradient(135deg, rgba(234, 179, 8, 0.45), rgba(244, 63, 94, 0.3)) border-box',
              border: '1px solid transparent',
              boxShadow: '0 10px 30px -12px rgba(244, 63, 94, 0.22)',
            }
          : {
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }
      }
    >
      {isMasa1 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-30"
          style={{
            background:
              'linear-gradient(135deg, rgba(234, 179, 8, 0.4), rgba(244, 63, 94, 0.25))',
          }}
        />
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-8 h-8 rounded-xl font-display font-black text-xs flex items-center justify-center ${
                isMasa1
                  ? 'bg-gradient-to-br from-amber-500/25 to-rose-500/25 text-amber-200 border border-amber-400/40'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              }`}
            >
              #{table.number}
            </span>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                isMasa1
                  ? 'bg-rose-500/15 text-rose-200 border-rose-500/30'
                  : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
              }`}
            >
              {table.group}
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-bold text-emerald-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>{statusText}</span>
          </div>
        </div>

        <div className="my-3 py-3.5 px-3 rounded-xl bg-[#131C2B] border border-white/5 relative flex items-center justify-center">
          <div
            className={`w-full h-14 rounded-lg border-2 relative flex items-center justify-center ${
              isMasa1
                ? 'bg-rose-950/40 border-rose-400/50'
                : 'bg-blue-950/50 border-cyan-400/50'
            }`}
          >
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white/25" />
            <div className="absolute inset-y-0 left-1/2 w-[2px] bg-white/60 -translate-x-1/2" />
            <span className="relative z-10 px-2 py-0.5 rounded bg-slate-950/90 text-[10px] font-mono font-bold text-white border border-white/10">
              {table.label}
            </span>
          </div>
        </div>

        <h4 className="font-display font-bold text-white text-sm">{table.label}</h4>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{table.usage}</p>
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 text-[11px] font-mono text-slate-400 relative z-10">
        {table.surface}
      </div>
    </motion.div>
  );
}

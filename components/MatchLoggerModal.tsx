'use client';

import React from 'react';
import { X } from 'lucide-react';
import MatchLogger from './MatchLogger';

interface MatchLoggerModalProps {
  onClose: () => void;
}

export default function MatchLoggerModal({ onClose }: MatchLoggerModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-3 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-slate-950/85 overflow-y-auto overscroll-contain">
      <div className="relative w-full max-w-3xl my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
        <MatchLogger onMatchLogged={onClose} />
      </div>
    </div>
  );
}

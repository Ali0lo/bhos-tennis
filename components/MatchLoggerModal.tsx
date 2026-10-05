'use client';

import React from 'react';
import { X } from 'lucide-react';
import MatchLogger from './MatchLogger';

interface MatchLoggerModalProps {
  onClose: () => void;
}

export default function MatchLoggerModal({ onClose }: MatchLoggerModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
        <MatchLogger onMatchLogged={onClose} />
      </div>
    </div>
  );
}

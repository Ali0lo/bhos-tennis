'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import RallyMiniGame from '../../components/RallyMiniGame';
import SmoothReveal from '../../components/SmoothReveal';

export default function MiniGamePage() {
  return (
    <SmoothReveal>
      <div className="max-w-3xl mx-auto py-4 sm:py-6 space-y-5">
        <div className="flex items-center justify-between max-w-[520px] mx-auto">
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Reytinq Cədvəlinə Qayıt</span>
          </Link>
          <span className="text-[11px] font-mono text-slate-400">
            BANM Stolüstü Tennis Klubu
          </span>
        </div>

        <RallyMiniGame />
      </div>
    </SmoothReveal>
  );
}


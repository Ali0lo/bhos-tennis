'use client';

import React from 'react';
import Link from 'next/link';
import SmoothReveal from '../../components/SmoothReveal';
import { Trophy, CalendarClock, ArrowLeft, Sparkles } from 'lucide-react';

export default function TournamentsPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 pt-20 pb-16">
      <SmoothReveal delay={0.05} scale>
        <div className="relative w-full max-w-2xl mx-auto rounded-3xl bg-slate-900 border border-slate-800 p-8 sm:p-12 shadow-sm overflow-hidden text-center">
          <div className="relative flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-blue-600/30 flex items-center justify-center shadow-sm">
              <Trophy className="w-8 h-8 text-amber-400" />
            </div>

            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-700/15 border border-blue-600/30 text-blue-400 text-[11px] font-bold uppercase tracking-widest">
              <CalendarClock className="w-3.5 h-3.5" />
              Turnirlər • Fevral – Mart
            </span>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
              Coming Soon
            </h1>

            <div className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-6 space-y-4">
              <p className="text-sm sm:text-base leading-relaxed text-slate-300">
                Universitet çempionatı ikinci semestrdə (Fevral - Mart aylarında) keçiriləcək. Dəqiq tarixlər tezliklə elan olunacaq.
              </p>

              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-xs font-bold text-amber-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Məşqlərə davam edin və böyük çempionata hazır olun!</span>
              </div>
            </div>

            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Reytinq Cədvəlinə Qayıt</span>
            </Link>
          </div>
        </div>
      </SmoothReveal>
    </div>
  );
}

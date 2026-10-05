'use client';

import React from 'react';
import Link from 'next/link';
import SmoothReveal from '../../components/SmoothReveal';
import { Trophy, CalendarClock, ArrowLeft } from 'lucide-react';

export default function TournamentsPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 pt-20 pb-16">
      <SmoothReveal delay={0.05}>
        <div className="relative w-full max-w-2xl mx-auto rounded-3xl bg-[#0F1623]/90 backdrop-blur-xl border border-white/10 p-8 sm:p-12 shadow-2xl shadow-black/60 overflow-hidden text-center">
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[#3B82F6]/20 blur-3xl" />

          <div className="relative flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-[#131C2B] border border-[#3B82F6]/30 flex items-center justify-center shadow-lg shadow-blue-500/10">
              <Trophy className="w-8 h-8 text-amber-400" />
            </div>

            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#3B82F6] text-[11px] font-bold uppercase tracking-widest">
              <CalendarClock className="w-3.5 h-3.5" />
              Turnirlər
            </span>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
              Coming Soon
            </h1>

            <div className="w-full rounded-2xl bg-[#131C2B] border border-white/5 p-6">
              <p className="text-sm sm:text-base leading-relaxed text-slate-300">
                Universitet çempionatı ikinci semestrdə (Fevral - Mart aylarında) keçiriləcək. Dəqiq tarixlər tezliklə elan olunacaq.
              </p>
            </div>

            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition"
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

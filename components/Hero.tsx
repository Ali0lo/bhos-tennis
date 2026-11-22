'use client';

import React from 'react';
import Link from 'next/link';
import { Swords } from 'lucide-react';
import { PlayerProfile } from '../lib/data/types';
import { useTranslation, useTranslations } from '../lib/i18n';
import NumberTicker from './NumberTicker';
import CourtBackground from './CourtBackground';
import SmoothReveal, { SmoothRevealItem } from './SmoothReveal';

interface HeroProps {
  currentUser: PlayerProfile | null;
  totalPlayersCount: number;
  matchesCount: number;
  leaderElo: number;
}

export default function Hero({
  currentUser,
  totalPlayersCount,
  matchesCount,
  leaderElo,
}: HeroProps) {
  const t = useTranslations('home');
  const { t: rootT } = useTranslation();

  const tablesSubCaption = rootT('hero.tables_distribution', '(1 Xanımlar / 3 Ümumi)');

  return (
    <section className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-lg min-h-[400px] md:min-h-[440px] flex flex-col justify-between p-5 sm:p-7 lg:p-8">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-100"
        style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}
      />

      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-slate-950/65" />
      <CourtBackground />

      <div className="relative z-20 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-slate-700 bg-slate-900/90 text-xs font-semibold text-white shadow-sm">
          <img
            src="/images/bhos-crest.png"
            alt="BHOS"
            className="w-4 h-4 object-contain"
          />
          <span className="text-blue-400 font-bold tracking-wide">BHOS TABLE TENNIS</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-300">{t('badge')}</span>
        </div>
      </div>

      <SmoothReveal staggerChildren={0.1} className="relative z-20 max-w-2xl space-y-4 pt-6 sm:pt-8 pb-2">
        <SmoothRevealItem className="space-y-3">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-white tracking-tight leading-[1.08]">
            <span className="block text-white">{t('hero_title_1')}</span>
            <span className="block text-blue-400">{t('hero_title_2')}</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans max-w-xl">
            {t('hero_desc')}
          </p>
        </SmoothRevealItem>

        <SmoothRevealItem className="flex flex-wrap items-center gap-2.5 pt-1">
          <Link
            href={currentUser ? '/log-match' : '/login'}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition"
          >
            <span>{t('cta_join') || 'Qoşul və Reytinq Qazan'} →</span>
          </Link>

          <Link
            href="/leaderboard"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition"
          >
            <span>{t('cta_view_leaderboard') || 'Liderlər Cədvəli'}</span>
          </Link>

          <Link
            href="/challenges"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-900/75 hover:bg-slate-800 text-amber-200 border border-amber-500/30 hover:border-amber-400/50 transition"
          >
            <Swords className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{t('cta_challenges') || rootT('nav.challenges', 'Meydan Oxu')}</span>
          </Link>
        </SmoothRevealItem>
      </SmoothReveal>

      <div className="relative z-20 pt-4 mt-2 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 items-stretch">
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl py-2.5 px-3.5 text-center flex flex-col items-center justify-start">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight leading-none min-h-[2rem] sm:min-h-[2.25rem] flex items-center justify-center">
            <NumberTicker value={totalPlayersCount} startValue={0} durationMs={850} />
          </div>
          <div className="text-xs uppercase font-medium text-slate-400 mt-1.5 leading-snug">
            {t('hero_stats.players') || 'Aktiv Oyunçu'}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl py-2.5 px-3.5 text-center flex flex-col items-center justify-start">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight leading-none min-h-[2rem] sm:min-h-[2.25rem] flex items-center justify-center">
            <NumberTicker value={matchesCount} startValue={0} durationMs={850} />
          </div>
          <div className="text-xs uppercase font-medium text-slate-400 mt-1.5 leading-snug">
            {t('hero_stats.matches') || 'Oynanılmış Matç'}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl py-2.5 px-3.5 text-center flex flex-col items-center justify-start">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight leading-none min-h-[2rem] sm:min-h-[2.25rem] flex items-center justify-center">
            4
          </div>
          <div className="text-xs uppercase font-medium text-slate-400 mt-1.5 leading-snug">
            {t('hero_stats.tables') || 'İdman Zalı Masaları'}
          </div>
          <div className="text-[11px] text-slate-400 font-normal mt-0.5 leading-tight sm:whitespace-nowrap text-balance">
            {tablesSubCaption}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl py-2.5 px-3.5 text-center flex flex-col items-center justify-start">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight leading-none min-h-[2rem] sm:min-h-[2.25rem] flex items-center justify-center">
            <NumberTicker
              value={leaderElo}
              startValue={Math.min(500, leaderElo)}
              durationMs={850}
            />
          </div>
          <div className="text-xs uppercase font-medium text-slate-400 mt-1.5 leading-snug">
            {rootT('hero.stats_leader') || '#1 ELO Lideri'}
          </div>
        </div>
      </div>
    </section>
  );
}

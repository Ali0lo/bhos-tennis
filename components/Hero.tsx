'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Swords } from 'lucide-react';
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
  const primaryCtaHref = currentUser ? '/log-match' : '/login';
  const primaryCtaLabel = currentUser
    ? t('cta_log_match') || 'Oyun Qeyd Et'
    : t('cta_join') || 'Qoşul və Reytinq Qazan';

  return (
    <section className="relative rounded-2xl overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-surface)] min-h-[410px] md:min-h-[455px] flex flex-col justify-between shadow-2xl shadow-black/40">
      {/* Editorial Sports Photography Layer */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-[1.01]"
        style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}
      />

      {/* Directional Broadcast Contrast Scrims */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#070A11] via-[#070A11]/82 to-[#070A11]/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#070A11] via-[#070A11]/25 to-[#070A11]/60" />
      <CourtBackground className="opacity-70" />

      {/* Main Editorial Content Region */}
      <div className="relative z-20 flex flex-col justify-between flex-1 p-5 sm:p-8 lg:p-10 gap-8">
        {/* Top Institutional Mark */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-white/15 bg-[#070A11]/80 backdrop-blur-sm text-xs font-medium text-slate-200">
            <img
              src="/images/bhos-crest.png"
              alt="BHOS"
              className="w-4 h-4 object-contain"
            />
            <span className="font-display font-extrabold tracking-[0.08em] uppercase text-white text-[13px]">
              BHOS TABLE TENNIS
            </span>
            <span className="h-3 w-px bg-white/20" aria-hidden="true" />
            <span className="text-slate-300 text-[11px]">{t('badge')}</span>
          </div>
        </div>

        {/* High-Contrast Display Typography & Context-Aware CTAs */}
        <SmoothReveal staggerChildren={0.05} className="max-w-2xl space-y-5">
          <SmoothRevealItem className="space-y-3">
            <h1 className="font-display font-black uppercase tracking-[-0.02em] leading-[0.96] text-4xl sm:text-5xl lg:text-[3.5rem] text-balance">
              <span className="block text-white">{t('hero_title_1')}</span>
              <span className="block text-slate-300 mt-1">{t('hero_title_2')}</span>
            </h1>
            <p className="text-sm sm:text-[15px] text-slate-300 leading-relaxed max-w-xl">
              {t('hero_desc')}
            </p>
          </SmoothRevealItem>

          <SmoothRevealItem className="flex flex-wrap items-center gap-2.5 pt-1">
            <Link
              href={primaryCtaHref}
              className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#E11D48] hover:bg-[#F43F5E] text-white shadow-sm shadow-black/30 active:scale-[0.98] transition"
            >
              <span>{primaryCtaLabel}</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>

            <Link
              href="/leaderboard"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-white/[0.06] hover:bg-white/[0.12] text-slate-100 border border-white/15 transition"
            >
              <span>{t('cta_view_leaderboard') || 'Liderlər Cədvəli'}</span>
            </Link>

            <Link
              href="/challenges"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-[#070A11]/70 hover:bg-white/[0.09] text-slate-200 border border-white/15 hover:border-amber-400/40 transition"
            >
              <Swords className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{t('cta_challenges') || rootT('nav.challenges', 'Meydan Oxu')}</span>
            </Link>
          </SmoothRevealItem>
        </SmoothReveal>
      </div>

      {/* Architectural 4-Column Hairline KPI Bar */}
      <div className="relative z-20 border-t border-white/10 bg-[#070A11]/85 backdrop-blur-md grid grid-cols-2 lg:grid-cols-4">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col items-center justify-start text-center border-r border-b lg:border-b-0 border-white/10">
          <div className="font-display text-3xl sm:text-[2.1rem] font-black text-white tracking-tight leading-none tabular-nums min-h-[2.1rem] flex items-center justify-center">
            <NumberTicker value={totalPlayersCount} startValue={0} durationMs={750} />
          </div>
          <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-400 mt-1.5 leading-snug">
            {t('hero_stats.players') || 'Aktiv Oyunçu'}
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col items-center justify-start text-center border-b lg:border-b-0 lg:border-r border-white/10">
          <div className="font-display text-3xl sm:text-[2.1rem] font-black text-white tracking-tight leading-none tabular-nums min-h-[2.1rem] flex items-center justify-center">
            <NumberTicker value={matchesCount} startValue={0} durationMs={750} />
          </div>
          <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-400 mt-1.5 leading-snug">
            {t('hero_stats.matches') || 'Oynanılmış Matç'}
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col items-center justify-start text-center border-r border-white/10">
          <div className="font-display text-3xl sm:text-[2.1rem] font-black text-white tracking-tight leading-none tabular-nums min-h-[2.1rem] flex items-center justify-center">
            4
          </div>
          <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-400 mt-1.5 leading-snug">
            {t('hero_stats.tables') || 'İdman Zalı Masaları'}
          </div>
          <div className="text-[11px] text-slate-400 font-normal mt-0.5 leading-tight sm:whitespace-nowrap text-balance">
            {tablesSubCaption}
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col items-center justify-start text-center">
          <div className="font-display text-3xl sm:text-[2.1rem] font-black text-amber-400 tracking-tight leading-none tabular-nums min-h-[2.1rem] flex items-center justify-center">
            <NumberTicker
              value={leaderElo}
              startValue={Math.min(500, leaderElo)}
              durationMs={750}
            />
          </div>
          <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-400 mt-1.5 leading-snug">
            {rootT('hero.stats_leader') || '#1 ELO Lideri'}
          </div>
        </div>
      </div>
    </section>
  );
}

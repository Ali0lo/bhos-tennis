'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '../lib/i18n';
import { X, ArrowRight, Trophy } from 'lucide-react';

const DISMISS_STORAGE_KEY = 'bhos_foundation_tournament_banner_dismissed_v2';

export default function FoundationTournamentBanner() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_STORAGE_KEY) === '1') {
        setDismissed(true);
      }
    } catch {}
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_STORAGE_KEY, '1');
    } catch {}
  };

  if (dismissed) {
    return null;
  }

  return (
    <section
      aria-label={`${t('tournaments.foundation_title', '"Zəfər Günü" Foundation Kuboku')} — ${t('tournaments.podium_title', 'Rəsmi Yekun Nəticələr')}`}
      className="relative w-full rounded-3xl bg-slate-900 border-2 border-amber-500/60 p-5 sm:p-7 shadow-xl overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-blue-600 to-emerald-500"
      />

      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('tournaments.dismiss_banner', 'Elanı bağla')}
        title={t('common.cancel', 'Bağla')}
        className="absolute top-3.5 right-3.5 z-20 inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative z-10 flex flex-col gap-5 pr-6 sm:pr-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/50 text-amber-300 text-[11px] font-display font-extrabold uppercase tracking-wider">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('tournaments.foundation_banner_tag', '🏆 RƏSMİ YEKUN NƏTİCƏLƏR • TURNİR BAŞA ÇATDI')}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/15 border border-emerald-600/40 text-emerald-300 text-[11px] font-bold">
                <span>{t('tournaments.foundation_banner_stats', '✓ 38 Oyun • 7 Noyabr 2026')}</span>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-black text-white tracking-tight leading-snug">
              {t('tournaments.foundation_banner_title', '“Zəfər Günü” Foundation Kuboku — Fəxri Kürsü')}
            </h2>
          </div>

          <Link
            href="/tournaments/foundation-kuboku-2026"
            className="group inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-xs sm:text-sm shadow-md active:scale-95 transition whitespace-nowrap self-start lg:self-center"
          >
            <span>{t('tournaments.foundation_banner_cta', 'Tam Turnir Cədvəli və Oyunlar →')}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Podium Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/players/yusif-xanlarov"
            className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/50 hover:border-amber-300 transition group"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 font-display font-black text-xl flex items-center justify-center shrink-0 shadow-md">
              🥇
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold">
                {t('tournaments.first_place')}
              </div>
              <div className="text-sm sm:text-base font-display font-black text-white truncate group-hover:text-amber-300 transition">
                Yusif Xanlarov
              </div>
              <div className="text-[11px] font-mono text-amber-200/80">
                462 ELO • 7{t('leaderboard.win_abbr', 'Q')} - 1{t('leaderboard.loss_abbr', 'M')} ({t('tournaments.final', 'Final')}: 3-0)
              </div>
            </div>
          </Link>

          <Link
            href="/players/maharat-karimli"
            className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-800/70 border border-slate-600/50 hover:border-slate-400 transition group"
          >
            <div className="w-11 h-11 rounded-xl bg-slate-300 text-slate-950 font-display font-black text-xl flex items-center justify-center shrink-0 shadow-md">
              🥈
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-bold">
                {t('tournaments.second_place')}
              </div>
              <div className="text-sm sm:text-base font-display font-black text-white truncate group-hover:text-blue-300 transition">
                Məharət Kərimli
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                441 ELO • 6{t('leaderboard.win_abbr', 'Q')} - 2{t('leaderboard.loss_abbr', 'M')} ({t('tournaments.finalist', 'Finalçı')})
              </div>
            </div>
          </Link>

          <Link
            href="/players/ahad-zamanli"
            className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-orange-950/40 border border-orange-500/40 hover:border-orange-400 transition group"
          >
            <div className="w-11 h-11 rounded-xl bg-orange-400 text-slate-950 font-display font-black text-xl flex items-center justify-center shrink-0 shadow-md">
              🥉
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-orange-300 font-bold">
                {t('tournaments.third_place_podium')}
              </div>
              <div className="text-sm sm:text-base font-display font-black text-white truncate group-hover:text-orange-300 transition">
                Əhəd Zamanlı
              </div>
              <div className="text-[11px] font-mono text-orange-200/80">
                458 ELO • 7{t('leaderboard.win_abbr', 'Q')} - 1{t('leaderboard.loss_abbr', 'M')} ({t('tournaments.third_place_stat', '3-cü yer')}: 3-2)
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

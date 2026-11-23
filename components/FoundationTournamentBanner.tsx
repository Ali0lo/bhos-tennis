'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '../lib/i18n';
import { X, ArrowRight, Trophy, CheckCircle2, Crown } from 'lucide-react';

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
      className="relative w-full rounded-2xl bg-[var(--bg-surface)] border border-amber-500/30 p-4 sm:p-5 overflow-hidden"
    >
      {/* Subtle championship top hairline */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400/90 via-amber-500/35 to-transparent"
      />

      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('tournaments.dismiss_banner', 'Elanı bağla')}
        title={t('common.cancel', 'Bağla')}
        className="absolute top-3 right-3 z-20 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#070A11]/85 border border-[var(--border-hairline)] text-slate-400 hover:text-white hover:border-[var(--border-strong)] transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="relative z-10 flex flex-col gap-3.5">
        {/* Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div className="space-y-1.5 max-w-3xl flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 pr-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-400/30 text-amber-300 text-[10px] font-semibold uppercase tracking-[0.08em]">
                <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                <span>{t('tournaments.foundation_banner_tag', 'RƏSMİ YEKUN NƏTİCƏLƏR • TURNİR BAŞA ÇATDI')}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[10px] font-semibold">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="tabular-nums">{t('tournaments.foundation_banner_stats', '38 Oyun • 7 Noyabr 2026')}</span>
              </span>
            </div>

            <h2 className="font-display text-xl sm:text-2xl lg:text-[1.7rem] font-black text-white tracking-tight leading-tight text-balance">
              {t('tournaments.foundation_banner_title', '“Zəfər Günü” Foundation Kuboku — Fəxri Kürsü')}
            </h2>
          </div>

          <Link
            href="/tournaments/foundation-kuboku-2026"
            className="group inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs active:scale-[0.98] transition whitespace-nowrap self-start lg:self-end shrink-0"
          >
            <span>{t('tournaments.foundation_banner_cta', 'Tam Turnir Cədvəli və Oyunlar')}</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Architectural Hairline-Divided Podium Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 rounded-xl border border-[var(--border-hairline)] bg-[#070A11]/70 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-hairline)] overflow-hidden">
          <Link
            href="/players/yusif-xanlarov"
            className="flex items-center gap-3 px-3.5 py-3 hover:bg-amber-500/[0.06] transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-400 text-slate-950 font-display font-black text-base flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                #1 · {t('tournaments.first_place')}
              </div>
              <div className="text-sm font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                Yusif Xanlarov
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-300">
                462 ELO • 7{t('leaderboard.win_abbr', 'Q')}–1{t('leaderboard.loss_abbr', 'M')} ({t('tournaments.final', 'Final')}: 3–0)
              </div>
            </div>
          </Link>

          <Link
            href="/players/maharat-karimli"
            className="flex items-center gap-3 px-3.5 py-3 hover:bg-white/[0.03] transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-300 text-slate-950 font-display font-black text-lg tabular-nums flex items-center justify-center shrink-0">
              2
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-bold">
                #2 · {t('tournaments.second_place')}
              </div>
              <div className="text-sm font-bold text-white truncate group-hover:text-slate-200 transition-colors">
                Məharət Kərimli
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-300">
                441 ELO • 6{t('leaderboard.win_abbr', 'Q')}–2{t('leaderboard.loss_abbr', 'M')} ({t('tournaments.finalist', 'Finalçı')})
              </div>
            </div>
          </Link>

          <Link
            href="/players/ahad-zamanli"
            className="flex items-center gap-3 px-3.5 py-3 hover:bg-amber-700/[0.07] transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-700/90 text-amber-100 border border-amber-500/40 font-display font-black text-lg tabular-nums flex items-center justify-center shrink-0">
              3
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-500 font-bold">
                #3 · {t('tournaments.third_place_podium')}
              </div>
              <div className="text-sm font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                Əhəd Zamanlı
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-300">
                458 ELO • 7{t('leaderboard.win_abbr', 'Q')}–1{t('leaderboard.loss_abbr', 'M')} ({t('tournaments.third_place_stat', '3-cü yer')}: 3–2)
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

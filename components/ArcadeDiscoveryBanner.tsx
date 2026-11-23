'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Crown, Flame, Gamepad2 } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase/client';
import { useTranslation } from '../lib/i18n';

interface TopScorer {
  full_name: string;
  score: number;
}

export default function ArcadeDiscoveryBanner() {
  const { t } = useTranslation();
  const [topScorer, setTopScorer] = useState<TopScorer | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchTopLeader = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;
        const { data, error } = await supabase.rpc('get_arcade_leaderboard', {
          p_mode: 'infinity',
          p_limit: 1,
        });
        if (error) throw error;
        if (mounted && Array.isArray(data) && data.length > 0) {
          const leader = data[0];
          const score = Number(leader.score);
          if (score > 0 && score < 700) {
            setTopScorer({
              full_name: leader.full_name || t('roles.player', 'Oyunçu'),
              score,
            });
          }
        }
      } catch {
        // Graceful fallback if offline
      }
    };

    fetchTopLeader();
    return () => {
      mounted = false;
    };
  }, [t]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-4 sm:px-5 sm:py-4 hover:border-[var(--border-strong)] transition-colors duration-200">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left / Info Section */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/25 text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-300">
              <Gamepad2 className="w-3 h-3 text-rose-400" />
              <span>{t('arcade.discovery_tag', 'BHOS Arcade • Sonsuz Ralli')}</span>
            </span>

            {topScorer ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-400/30 text-[11px] font-medium text-amber-300">
                <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="tabular-nums">
                  #1 {t('arcade.record', 'Rekord')}:{' '}
                  <strong className="text-white font-semibold">{topScorer.full_name}</strong> (
                  {topScorer.score} {t('arcade.rallies', 'Ralli')})
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-[var(--border-hairline)] text-[10px] font-medium text-slate-300">
                <Flame className="w-3 h-3 text-rose-400" />
                <span>{t('arcade.online_ranking', 'Onlayn Reytinq')}</span>
              </span>
            )}
          </div>

          <h3 className="font-display text-lg sm:text-xl font-extrabold text-white tracking-tight leading-snug">
            {t('arcade.discovery_title', 'Masaüstü Ralli: Sonsuz rejimdə rekordu qır və profil nişanları qazan!')}
          </h3>

          <p className="text-xs text-slate-300 max-w-4xl leading-relaxed text-pretty">
            {t('arcade.discovery_desc', 'Bot rəqiblə sonsuz rallidə reflekslərini sına, sürətlənən topu masada saxla və BANM liderlər lövhəsində 1-ci pilləyə yüksəl!')}
          </p>
        </div>

        {/* Right / CTA Button */}
        <div className="shrink-0 flex items-center">
          <Link
            href="/minigame"
            className="group inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#E11D48] hover:bg-[#F43F5E] text-white font-semibold text-xs transition active:scale-[0.98] whitespace-nowrap w-full sm:w-auto"
          >
            <span>{t('arcade.play_and_compete', 'Oyna və Yarış')}</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

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
              full_name: leader.full_name || 'Oyunçu',
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
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-rose-500/25 bg-gradient-to-r from-slate-900 via-slate-900/90 to-rose-950/25 p-4 sm:p-5 shadow-sm group hover:border-rose-500/40 transition-all duration-300">
      {/* Background ambient decorative glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-rose-600/10 blur-3xl transition-opacity group-hover:opacity-100"
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left / Info Section */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600/20 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider text-rose-300">
              <Gamepad2 className="w-3 h-3 text-rose-400" />
              <span>{t('arcade.discovery_tag', 'BHOS Arcade • Sonsuz Ralli')}</span>
            </span>

            {topScorer ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-semibold text-amber-300">
                <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                <span>
                  #1 {t('arcade.record', 'Rekord')}: <strong className="text-white font-bold">{topScorer.full_name}</strong> ({topScorer.score} {t('arcade.rallies', 'Ralli')})
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-[10px] font-medium text-slate-400">
                <Flame className="w-3 h-3 text-rose-400" />
                <span>{t('arcade.online_ranking', 'Onlayn Reytinq')}</span>
              </span>
            )}
          </div>

          <h3 className="text-sm sm:text-base font-display font-bold text-white flex items-center gap-1.5">
            <span>{t('arcade.discovery_title', '🏓 Masaüstü Ralli: Sonsuz rejimdə rekordu qır və profil nişanları qazan!')}</span>
          </h3>

          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            {t('arcade.discovery_desc', 'Bot rəqiblə sonsuz rallidə reflekslərini sına, sürətlənən topu masada saxla və BANM liderlər lövhəsində 1-ci pilləyə yüksəl!')}
          </p>
        </div>

        {/* Right / CTA Button */}
        <div className="shrink-0 flex items-center">
          <Link
            href="/minigame"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-display font-bold text-xs shadow-md shadow-rose-950/40 transition active:scale-95 whitespace-nowrap group/btn w-full sm:w-auto"
          >
            <span>{t('arcade.play_and_compete', 'Oyna və Yarış')}</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Swords,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import { PlayerProfile } from '../lib/data/types';
import {
  calculateDuelProjection,
  MAX_ELO,
  MIN_ELO,
} from '../lib/elo/calculator';
import MagneticButton from './MagneticButton';

export interface DuelPlayerSummary {
  id: string;
  full_name: string;
  current_elo: number;
  avatar_url?: string | null;
}

interface HeadToHeadDuelProps {
  currentUser: PlayerProfile | DuelPlayerSummary;
  targetPlayer: PlayerProfile | DuelPlayerSummary;
}

export default function HeadToHeadDuel({
  currentUser,
  targetPlayer,
}: HeadToHeadDuelProps) {
  const safeUserElo = Math.min(
    MAX_ELO,
    Math.max(MIN_ELO, Number(currentUser.current_elo) || 0)
  );
  const safeTargetElo = Math.min(
    MAX_ELO,
    Math.max(MIN_ELO, Number(targetPlayer.current_elo) || 0)
  );

  const projection = useMemo(() => {
    return calculateDuelProjection(safeUserElo, safeTargetElo, 32);
  }, [safeUserElo, safeTargetElo]);

  const userBarWidth = Math.max(4, Math.min(96, projection.userWinPercent));
  const targetBarWidth = 100 - userBarWidth;
  const userIsDominant = userBarWidth >= targetBarWidth;

  const eloDiff = safeUserElo - safeTargetElo;
  const formattedLossText =
    projection.lossDelta === 0 ? '0 PTS' : `${projection.lossDelta} PTS`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl bg-[#0F1623]/90 backdrop-blur-md p-6 shadow-xl space-y-6 relative overflow-hidden"
      style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-[#3B82F6]">
              <Zap className="w-3.5 h-3.5" />
              DUEL PROQNOZU
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#131C2B] text-slate-400 border border-white/10">
              K=32 • 0–{MAX_ELO} ELO
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-display font-black text-white tracking-tight">
            Siz vs. {targetPlayer.full_name}
          </h3>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto px-3.5 py-2 rounded-xl bg-[#131C2B] border border-white/[0.06]">
          <div className="flex items-center gap-2">
            {currentUser.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.full_name}
                className="w-7 h-7 rounded-lg object-cover border border-[#3B82F6]/40"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-xs font-bold text-[#3B82F6]">
                {currentUser.full_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-xs">
              <span className="text-slate-400 block text-[10px] leading-none">
                Siz
              </span>
              <span className="font-mono font-bold text-white">
                {safeUserElo}
              </span>
            </div>
          </div>

          <span className="text-[10px] font-mono font-bold uppercase text-slate-500 px-1">
            VS
          </span>

          <div className="flex items-center gap-2">
            <div className="text-xs text-right">
              <span className="text-slate-400 block text-[10px] leading-none truncate max-w-[90px]">
                {targetPlayer.full_name.split(' ')[0]}
              </span>
              <span className="font-mono font-bold text-[#A855F7]">
                {safeTargetElo}
              </span>
            </div>
            {targetPlayer.avatar_url ? (
              <img
                src={targetPlayer.avatar_url}
                alt={targetPlayer.full_name}
                className="w-7 h-7 rounded-lg object-cover border border-[#A855F7]/40"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-[#A855F7]/20 border border-[#A855F7]/40 flex items-center justify-center text-xs font-bold text-[#A855F7]">
                {targetPlayer.full_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[#131C2B] border border-white/[0.06] space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] shadow-[0_0_8px_#3B82F6] shrink-0" />
            <span className="font-bold text-white truncate">
              Siz ({currentUser.full_name.split(' ')[0]})
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 shrink-0">
            ELO Fərqi: {eloDiff >= 0 ? `+${eloDiff}` : eloDiff}
          </span>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-white truncate">
              {targetPlayer.full_name}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7] shadow-[0_0_8px_#A855F7] shrink-0" />
          </div>
        </div>

        <div className="relative h-3.5 w-full rounded-full bg-[#080D16] overflow-hidden flex p-0.5 gap-1 border border-white/5">
          <motion.div
            initial={{ width: '50%' }}
            animate={{ width: `${userBarWidth}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className={`h-full rounded-l-full shadow-[0_0_12px_rgba(59,130,246,0.6)] ${
              userIsDominant
                ? 'bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 bg-[length:200%_100%] animate-shimmer'
                : 'bg-[#3B82F6]'
            }`}
          />
          <motion.div
            initial={{ width: '50%' }}
            animate={{ width: `${targetBarWidth}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className={`h-full rounded-r-full shadow-[0_0_12px_rgba(168,85,247,0.5)] ${
              !userIsDominant
                ? 'bg-gradient-to-r from-purple-600 via-fuchsia-400 to-purple-600 bg-[length:200%_100%] animate-shimmer'
                : 'bg-[#A855F7]'
            }`}
          />
        </div>

        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-[#3B82F6]">
            {projection.userWinPercent}% Ehtimal
          </span>
          <span className="font-bold text-[#A855F7]">
            {projection.targetWinPercent}% Ehtimal
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#22C55E]" />
              Qələbə Qazansanız
            </span>
            {projection.projectedWinElo >= MAX_ELO && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {MAX_ELO} Maksimum
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-mono font-black text-[#22C55E]">
              +{projection.winDelta} PTS
            </span>
            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-400 block">
                Yeni Reytinq
              </span>
              <span className="text-sm font-mono font-bold text-white">
                {safeUserElo} &rarr;{' '}
                <span className="text-[#22C55E]">
                  {projection.projectedWinElo}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-300 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-[#EF4444]" />
              Məğlub Olsanız
            </span>
            {projection.projectedLossElo === MIN_ELO && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />0 Minimum
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-mono font-black text-[#EF4444]">
              {formattedLossText}
            </span>
            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-400 block">
                Yeni Reytinq
              </span>
              <span className="text-sm font-mono font-bold text-white">
                {safeUserElo} &rarr;{' '}
                <span className="text-[#EF4444]">
                  {projection.projectedLossElo}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <MagneticButton className="w-full">
        <Link
          href={`/log-match?opponentId=${encodeURIComponent(targetPlayer.id)}`}
          className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-display font-bold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35"
        >
          <Swords className="w-4 h-4" />
          <span>Meydan Oxu / Matç Qeyd Et</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </MagneticButton>
    </motion.div>
  );
}


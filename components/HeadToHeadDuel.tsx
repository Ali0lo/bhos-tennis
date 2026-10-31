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
import { BHOSDataStore } from '../lib/data/store';

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
      className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-sm space-y-6 relative overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-blue-400">
              <Zap className="w-3.5 h-3.5" />
              DUEL PROQNOZU
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-950 text-slate-400 border border-slate-800">
              K=32 • 0–{MAX_ELO} ELO
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-display font-black text-white tracking-tight">
            Siz vs. {targetPlayer.full_name}
          </h3>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex items-center gap-2">
            {currentUser.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.full_name}
                className="w-7 h-7 rounded-lg object-cover border border-blue-600/40"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-blue-700/20 border border-blue-600/40 flex items-center justify-center text-xs font-bold text-blue-400">
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
              <span className="font-mono font-bold text-rose-400">
                {safeTargetElo}
              </span>
            </div>
            {targetPlayer.avatar_url ? (
              <img
                src={targetPlayer.avatar_url}
                alt={targetPlayer.full_name}
                className="w-7 h-7 rounded-lg object-cover border border-rose-600/40"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-rose-600/20 border border-rose-600/40 flex items-center justify-center text-xs font-bold text-rose-400">
                {targetPlayer.full_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
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
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
          </div>
        </div>

        <div className="relative h-3.5 w-full rounded-full bg-slate-900 overflow-hidden flex p-0.5 gap-1 border border-slate-800">
          <motion.div
            initial={{ width: '50%' }}
            animate={{ width: `${userBarWidth}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className={`h-full rounded-l-full ${
              userIsDominant
                ? 'bg-blue-600'
                : 'bg-blue-700'
            }`}
          />
          <motion.div
            initial={{ width: '50%' }}
            animate={{ width: `${targetBarWidth}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className={`h-full rounded-r-full ${
              !userIsDominant
                ? 'bg-rose-500'
                : 'bg-rose-600'
            }`}
          />
        </div>

        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-blue-400">
            {projection.userWinPercent}% Ehtimal
          </span>
          <span className="font-bold text-rose-400">
            {projection.targetWinPercent}% Ehtimal
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="p-4 rounded-xl bg-emerald-600/10 border border-emerald-600/25 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Qələbə Qazansanız
            </span>
            {projection.projectedWinElo >= MAX_ELO && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {MAX_ELO} Maksimum
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-500">
              +{projection.winDelta} PTS
            </span>
            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-400 block">
                Yeni Reytinq
              </span>
              <span className="text-sm font-mono font-bold text-white">
                {safeUserElo} &rarr;{' '}
                <span className="text-emerald-500">
                  {projection.projectedWinElo}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-rose-600/10 border border-rose-600/25 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-500" />
              Məğlub Olsanız
            </span>
            {projection.projectedLossElo === MIN_ELO && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />0 Minimum
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-mono font-black text-rose-500">
              {formattedLossText}
            </span>
            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-400 block">
                Yeni Reytinq
              </span>
              <span className="text-sm font-mono font-bold text-white">
                {safeUserElo} &rarr;{' '}
                <span className="text-rose-500">
                  {projection.projectedLossElo}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <MagneticButton className="w-full">
        <Link
          href={`/log-match?opponent=${encodeURIComponent(BHOSDataStore.getInstance().getPlayerSlug(targetPlayer.id))}`}
          className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-sm"
        >
          <Swords className="w-4 h-4" />
          <span>Meydan Oxu / Matç Qeyd Et</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </MagneticButton>
    </motion.div>
  );
}


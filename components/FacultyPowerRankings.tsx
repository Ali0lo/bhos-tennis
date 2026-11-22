'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Crown, Trophy, Users, Zap, ArrowRight, Sparkles } from 'lucide-react';
import { PlayerProfile } from '../lib/data/types';
import { getPlayerHref } from '../lib/data/store';
import {
  CanonicalDepartmentKey,
  CANONICAL_DEPARTMENT_DISPLAY,
  getCanonicalDepartments,
  getProfileDepartment,
} from '../lib/utils/department';
import { isStaffMember } from './LeaderboardTable';
import HoloCard from './HoloCard';
import AnimatedCounter from './AnimatedCounter';
import { useTranslation } from '../lib/i18n';

export interface FacultyPowerRow {
  key: CanonicalDepartmentKey;
  canonicalName: string;
  filterValue: string;
  activePlayers: number;
  totalWins: number;
  totalMatches: number;
  top5AvgElo: number;
  topPlayers: PlayerProfile[];
}

const FILTER_VALUE_OVERRIDE: Partial<Record<CanonicalDepartmentKey, string>> = {
  PAE: 'Process Automation',
};

function resolvePlayerFacultyKey(player: PlayerProfile): CanonicalDepartmentKey | null {
  if (isStaffMember(player)) return null;

  const isFoundation =
    player.is_foundation === true ||
    Number(player.admission_year) === 2026 ||
    Number(player.year_of_study) === 2026;

  if (isFoundation) return 'FOUNDATION';

  const rawDept = getProfileDepartment(player);
  const depts = getCanonicalDepartments(rawDept);
  for (const key of Array.from(depts)) {
    if (key !== 'SPORTS') {
      return key;
    }
  }
  return null;
}

export function computeFacultyPowerRankings(players: PlayerProfile[]): FacultyPowerRow[] {
  const buckets = new Map<CanonicalDepartmentKey, PlayerProfile[]>();

  for (const player of players) {
    const key = resolvePlayerFacultyKey(player);
    if (!key) continue;
    const list = buckets.get(key) || [];
    list.push(player);
    buckets.set(key, list);
  }

  const rows: FacultyPowerRow[] = [];

  buckets.forEach((roster, key) => {
    const sortedRoster = [...roster].sort(
      (a, b) => Number(b.current_elo || 0) - Number(a.current_elo || 0)
    );
    const top5 = sortedRoster.slice(0, 5);
    const top5AvgElo =
      top5.length > 0
        ? Math.round(top5.reduce((sum, p) => sum + Number(p.current_elo || 0), 0) / top5.length)
        : 0;
    const totalWins = sortedRoster.reduce((sum, p) => sum + Number(p.wins || 0), 0);
    const totalMatches = sortedRoster.reduce((sum, p) => sum + Number(p.matches_played || 0), 0);
    const canonicalName = CANONICAL_DEPARTMENT_DISPLAY[key];

    rows.push({
      key,
      canonicalName,
      filterValue: FILTER_VALUE_OVERRIDE[key] || canonicalName,
      activePlayers: sortedRoster.length,
      totalWins,
      totalMatches,
      top5AvgElo,
      topPlayers: sortedRoster.slice(0, 3),
    });
  });

  rows.sort((a, b) => {
    if (b.top5AvgElo !== a.top5AvgElo) return b.top5AvgElo - a.top5AvgElo;
    if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
    return b.activePlayers - a.activePlayers;
  });

  return rows;
}

interface FacultyPowerRankingsProps {
  players: PlayerProfile[];
  loading?: boolean;
  onSelectFaculty?: (facultyFilterValue: string) => void;
}

export default function FacultyPowerRankings({
  players,
  loading = false,
  onSelectFaculty,
}: FacultyPowerRankingsProps) {
  const { t } = useTranslation();

  const rankings = useMemo(() => computeFacultyPowerRankings(players), [players]);

  const translateFaculty = (canonicalName: string) => {
    return t(`faculties.${canonicalName}`, canonicalName);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-40 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (rankings.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center space-y-2">
        <Sparkles className="w-8 h-8 text-slate-500 mx-auto" />
        <p className="text-sm font-bold text-white">
          {t('leaderboard.no_faculties', 'Fakültə statistikası mövcud deyil.')}
        </p>
      </div>
    );
  }

  const maxAvgElo = Math.max(1, rankings[0]?.top5AvgElo || 1);
  const top3 = rankings.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-lg sm:text-xl font-display font-black text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>{t('leaderboard.faculty_power_title', 'Fakültə Güc Reytinqi')}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t(
              'leaderboard.faculty_power_subtitle',
              'BANM ixtisasları üzrə Top-5 orta ELO, təsdiqlənmiş qələbə sayı və aktiv oyunçu reytinqi'
            )}
          </p>
        </div>
      </div>

      {/* Top-3 Faculty Podium */}
      {top3.length >= 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {top3.map((fac, idx) => {
            const rank = idx + 1;
            const style =
              rank === 1
                ? 'border-2 border-amber-500/80 bg-gradient-to-b from-amber-500/10 to-slate-900'
                : rank === 2
                ? 'border border-slate-300/40 bg-gradient-to-b from-slate-800/70 to-slate-900'
                : 'border border-amber-800/70 bg-slate-900';

            const rankBadge =
              rank === 1
                ? 'bg-amber-400 text-slate-950'
                : rank === 2
                ? 'bg-slate-200 text-slate-950'
                : 'bg-amber-800 text-amber-100 border border-amber-600';

            const leadPlayer = fac.topPlayers[0];

            return (
              <HoloCard key={fac.key} className={`rounded-3xl p-5 shadow-md flex flex-col justify-between gap-4 ${style}`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-display font-black ${rankBadge}`}
                    >
                      {rank === 1 && <Crown className="w-3.5 h-3.5" />}
                      <span>#{rank}</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {fac.activePlayers} {t('leaderboard.active_players', 'Aktiv Oyunçu')}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-display font-black text-white leading-snug">
                      {translateFaculty(fac.canonicalName)}
                    </h3>
                    {leadPlayer && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        {t('leaderboard.top_athlete', 'Fakültə Lideri')}:{' '}
                        <Link
                          href={getPlayerHref(leadPlayer.id, leadPlayer.full_name)}
                          className="text-blue-400 hover:text-blue-300 font-semibold transition"
                        >
                          {leadPlayer.full_name}
                        </Link>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-end justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                      {t('leaderboard.top5_avg_elo', 'Top-5 Orta ELO')}
                    </span>
                    <span className="text-2xl sm:text-3xl font-mono font-black text-white">
                      <AnimatedCounter value={fac.top5AvgElo} />
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                      {t('leaderboard.total_verified_wins', 'Ümumi Qələbə')}
                    </span>
                    <span className="text-base font-mono font-bold text-emerald-400">
                      {fac.totalWins}
                    </span>
                  </div>
                </div>
              </HoloCard>
            );
          })}
        </div>
      )}

      {/* Full Rankings Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-800/80">
          {rankings.map((fac, idx) => {
            const rank = idx + 1;
            const barPercent = Math.max(8, Math.round((fac.top5AvgElo / maxAvgElo) * 100));

            return (
              <motion.div
                key={fac.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="p-4 sm:p-5 hover:bg-slate-800/40 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-mono font-black text-xs shrink-0 ${
                      rank === 1
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : rank === 2
                        ? 'bg-slate-300/15 text-slate-200 border border-slate-400/40'
                        : rank === 3
                        ? 'bg-orange-700/20 text-orange-300 border border-orange-500/40'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    #{rank}
                  </span>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-bold text-sm sm:text-base text-white">
                        {translateFaculty(fac.canonicalName)}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {fac.topPlayers.map((p) => (
                          <Link
                            key={p.id}
                            href={getPlayerHref(p.id, p.full_name)}
                            className="px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 hover:border-blue-500/40 text-[10px] text-slate-300 hover:text-white transition truncate max-w-[140px]"
                          >
                            {p.full_name.split(' ')[0]} ({p.current_elo})
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="h-1.5 w-full max-w-md rounded-full bg-slate-950 overflow-hidden border border-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                        style={{ width: `${barPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4 sm:gap-6 shrink-0">
                  <div className="flex items-center gap-5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-bold block">
                        {t('leaderboard.top5_avg_elo', 'Top-5 Orta ELO')}
                      </span>
                      <span className="font-mono font-black text-base text-blue-400 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        {fac.top5AvgElo}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-bold block">
                        {t('leaderboard.total_verified_wins', 'Ümumi Qələbə')}
                      </span>
                      <span className="font-mono font-bold text-sm text-emerald-400">
                        {fac.totalWins}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-bold block">
                        {t('leaderboard.active_players', 'Aktiv Oyunçu')}
                      </span>
                      <span className="font-mono font-bold text-sm text-white flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {fac.activePlayers}
                      </span>
                    </div>
                  </div>

                  {onSelectFaculty && (
                    <button
                      type="button"
                      onClick={() => onSelectFaculty(fac.filterValue)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-blue-600/20 border border-slate-800 hover:border-blue-500/40 text-xs font-semibold text-slate-300 hover:text-blue-300 transition"
                    >
                      <span>{t('leaderboard.view_faculty_players', 'Oyunçulara bax')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

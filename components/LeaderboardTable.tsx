'use client';

import ClickableAvatar from './ClickableAvatar';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerProfile, isPresidentBadgeHolder } from '../lib/data/types';
import {
  normalizeDepartment,
  foldDepartmentAscii,
  getProfileDepartment,
  resolveCanonicalDepartment,
  matchesDepartmentFilter,
  isAllDepartmentsFilter,
} from '../lib/utils/department';
import AnimatedCounter from './AnimatedCounter';
import { getPlayerHref } from '../lib/data/store';
import { useTranslation } from '../lib/i18n';
import {
  Crown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export {
  normalizeDepartment,
  foldDepartmentAscii,
  getProfileDepartment,
  resolveCanonicalDepartment,
  matchesDepartmentFilter,
  isAllDepartmentsFilter,
};

export const normalize = (str?: string | null): string =>
  str?.toLowerCase().replace(/[\s_-]+/g, '') || '';

interface LeaderboardTableProps {
  players: PlayerProfile[];
  currentUser?: PlayerProfile | null;
  defaultPageSize?: 25 | 50;
  enablePagination?: boolean;
  departmentFilter?: string;
}

export function isStaffMember(player: PlayerProfile): boolean {
  if (
    player.user_type === 'teacher' ||
    player.user_type === 'staff' ||
    player.role === 'coach'
  ) {
    return true;
  }
  if (player.user_type === 'student') {
    return false;
  }
  const dept = getProfileDepartment(player);
  if (resolveCanonicalDepartment(dept) === 'İdman Klubu') {
    return true;
  }
  return false;
}

const ROW_TRANSITION = {
  duration: 0.22,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

export default function LeaderboardTable({
  players,
  currentUser,
  defaultPageSize = 25,
  enablePagination = true,
  departmentFilter,
}: LeaderboardTableProps) {
  const { t } = useTranslation();
  const [pageSize, setPageSize] = useState<25 | 50>(defaultPageSize);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const departmentFilteredPlayers = useMemo(() => {
    if (!departmentFilter || isAllDepartmentsFilter(departmentFilter)) {
      return players;
    }
    return players.filter((p) => matchesDepartmentFilter(p, departmentFilter));
  }, [players, departmentFilter]);

  const filterSignature = useMemo(
    () =>
      `${departmentFilter ?? 'ALL'}:${departmentFilteredPlayers.length}:${departmentFilteredPlayers
        .map((p) => p.id)
        .join(',')}`,
    [departmentFilteredPlayers, departmentFilter]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filterSignature, departmentFilter, pageSize]);

  const totalPlayers = departmentFilteredPlayers.length;
  const totalPages = enablePagination ? Math.max(1, Math.ceil(totalPlayers / pageSize)) : 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = enablePagination ? (safePage - 1) * pageSize : 0;
  const endIndex = enablePagination ? Math.min(startIndex + pageSize, totalPlayers) : totalPlayers;
  const displayedPlayers = useMemo(
    () =>
      enablePagination
        ? departmentFilteredPlayers.slice(startIndex, endIndex)
        : departmentFilteredPlayers,
    [departmentFilteredPlayers, enablePagination, startIndex, endIndex]
  );

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | 'ellipsis')[] = [1];
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);

    if (start > 2) {
      pages.push('ellipsis');
    }
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    if (end < totalPages - 1) {
      pages.push('ellipsis');
    }
    pages.push(totalPages);
    return pages;
  }, [totalPages, safePage]);

  return (
    <div className="space-y-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-hairline)] bg-[#070A11]/85 text-[10px] uppercase font-semibold tracking-[0.08em] text-slate-400">
              <th className="py-3.5 px-4 sm:px-5 w-20">{t('leaderboard.rank', 'Sıra')}</th>
              <th className="py-3.5 px-4">{t('leaderboard.player', 'Oyunçu')}</th>
              <th className="py-3.5 px-4 hidden md:table-cell">{t('leaderboard.faculty', 'Fakültə / İxtisas')}</th>
              <th className="py-3.5 px-4 text-center">{t('leaderboard.matches', 'Oyunlar')}</th>
              <th className="py-3.5 px-4 text-center hidden sm:table-cell">{t('leaderboard.win_rate', 'Qələbə faizi')}</th>
              <th className="py-3.5 px-4 sm:px-5 text-right">{t('leaderboard.points', 'Xal')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-hairline)]">
            <AnimatePresence mode="popLayout" initial={false}>
              {displayedPlayers.map((player, idx) => {
              const rank = player.rank ?? startIndex + idx + 1;
              const isMe = currentUser?.id === player.id;
              const matchesPlayed =
                (player.wins || 0) + (player.losses || 0) > 0
                  ? Math.max(player.matches_played || 0, (player.wins || 0) + (player.losses || 0))
                  : player.matches_played || 0;
              const winRate =
                matchesPlayed > 0 ? Math.round(((player.wins || 0) / matchesPlayed) * 100) : 0;
              const rankChange = player.rank_change ?? 0;
              const staff = isStaffMember(player);
              const isFoundationPlayer =
                Number(player.year_of_study) === 2026 ||
                Number(player.admission_year) === 2026 ||
                player.department?.toLowerCase().includes('foundation') ||
                player.department?.toLowerCase().includes('hazirliq');
              const rawDeptLabel = getProfileDepartment(player);
              const departmentLabel =
                departmentFilter?.toLowerCase() === 'foundation' && isFoundationPlayer
                  ? rawDeptLabel && !rawDeptLabel.toLowerCase().includes('foundation')
                    ? `Foundation (${rawDeptLabel})`
                    : 'Foundation'
                  : rawDeptLabel;
              const yearSuffix = player.admission_year ? ` • ${player.admission_year}` : '';
              const localizedDept = departmentLabel
                ? t(`faculties.${departmentLabel}`, departmentLabel)
                : '';
              const facultySubtitle = staff
                ? `${localizedDept || t('faculties.Sports Club', 'İdman Klubu')} • ${t('roles.teacher', 'Müəllim')}`
                : `${localizedDept || t('faculties.Engineering', 'Mühəndislik')}${yearSuffix}`;

              return (
                <motion.tr
                  key={player.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  transition={ROW_TRANSITION}
                  className={`group transition-colors ${
                    isMe
                      ? 'bg-blue-500/[0.08] hover:bg-blue-500/[0.12]'
                      : rank === 1
                      ? 'bg-amber-400/[0.03] hover:bg-amber-400/[0.06]'
                      : 'bg-[var(--bg-surface)] hover:bg-white/[0.035]'
                  }`}
                >
                  <td className="py-3.5 px-4 sm:px-5 font-mono tabular-nums font-bold">
                    <div className="flex items-center gap-2">
                      {rank === 1 ? (
                        <span className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                          <Crown className="w-4 h-4 stroke-[2.5]" />
                        </span>
                      ) : rank === 2 ? (
                        <span className="w-8 h-8 rounded-lg bg-slate-200 text-slate-950 flex items-center justify-center font-display font-black text-base">
                          2
                        </span>
                      ) : rank === 3 ? (
                        <span className="w-8 h-8 rounded-lg bg-amber-700 text-amber-100 border border-amber-500/40 flex items-center justify-center font-display font-black text-base">
                          3
                        </span>
                      ) : (
                        <span className="w-8 h-8 rounded-lg bg-[#070A11]/80 border border-[var(--border-hairline)] text-slate-300 text-xs flex items-center justify-center">
                          {rank}
                        </span>
                      )}

                      {rankChange > 0 ? (
                        <span className="inline-flex items-center text-[10px] text-emerald-400 font-mono tabular-nums">
                          <ArrowUpRight className="w-3 h-3" />
                          {rankChange}
                        </span>
                      ) : rankChange < 0 ? (
                        <span className="inline-flex items-center text-[10px] text-rose-400 font-mono tabular-nums">
                          <ArrowDownRight className="w-3 h-3" />
                          {Math.abs(rankChange)}
                        </span>
                      ) : (
                        <Minus className="w-3 h-3 text-slate-600 hidden sm:inline" />
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-sm shrink-0 border overflow-hidden ${
                          isMe
                            ? 'bg-blue-600 text-white border-blue-400'
                            : staff
                            ? 'bg-blue-950 text-blue-300 border-blue-800/80'
                            : 'bg-[#070A11] text-slate-200 border-[var(--border-hairline)]'
                        }`}
                      >
                        <ClickableAvatar
                          avatarUrl={player.avatar_url}
                          name={player.full_name}
                          department={player.department || player.major_faculty}
                          rating={player.current_elo}
                          fallback={<>{player.full_name.charAt(0)}</>}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={getPlayerHref(player.id)}
                            className="font-semibold text-white group-hover:text-blue-400 transition-colors truncate"
                          >
                            {player.full_name}
                          </Link>

                          {isMe && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-600 text-white">
                              <UserCheck className="w-2.5 h-2.5" />
                              <span>{t('leaderboard.you', 'Siz')}</span>
                            </span>
                          )}

                          {staff && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/25">
                              {t('roles.staff_badge', 'Müəllim / Əməkdaş')}
                            </span>
                          )}

                          {(isPresidentBadgeHolder(player) || player.role === 'coach') && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                                isPresidentBadgeHolder(player)
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                              }`}
                            >
                              {isPresidentBadgeHolder(player) ? t('roles.president_badge', 'Prezident') : t('roles.coach', 'Məşqçi')}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 md:hidden truncate">
                          {facultySubtitle}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 hidden md:table-cell">
                    <span className="text-xs text-slate-300 font-medium">
                      {facultySubtitle}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-center font-mono tabular-nums">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#070A11]/85 border border-[var(--border-hairline)] text-xs">
                      <span className="text-emerald-400 font-semibold">{player.wins}{t('leaderboard.win_abbr', 'Q')}</span>
                      <span className="text-slate-600">–</span>
                      <span className="text-rose-400 font-semibold">{player.losses}{t('leaderboard.loss_abbr', 'M')}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-center hidden sm:table-cell">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`font-mono tabular-nums text-xs font-semibold ${
                          winRate >= 60
                            ? 'text-emerald-400'
                            : winRate >= 40
                            ? 'text-slate-200'
                            : 'text-slate-400'
                        }`}
                      >
                        {winRate}%
                      </span>
                      <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            winRate >= 60 ? 'bg-emerald-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${winRate}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 sm:px-5 text-right">
                    <div className="inline-flex items-baseline gap-1 font-display text-xl font-black tabular-nums text-white leading-none">
                      <AnimatedCounter value={player.current_elo} />
                      <span className="text-[10px] font-mono font-semibold text-slate-400 tracking-wider">
                        {t('leaderboard.points_abbr', 'XAL')}
                      </span>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>
      </div>

      {enablePagination && totalPlayers > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-t border-[var(--border-hairline)] bg-[#070A11]/65">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 tabular-nums">
            <span>
              {t('leaderboard.showing_count', 'Cəmi {total} oyunçudan {start}–{end} göstərilir')
                .replace('{total}', String(totalPlayers))
                .replace('{start}', String(startIndex + 1))
                .replace('{end}', String(endIndex))}
            </span>

            <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
              {([25, 50] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPageSize(size)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono tabular-nums font-semibold transition-colors ${
                    pageSize === size
                      ? 'bg-white/[0.12] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {size} {t('leaderboard.per_page', '/ səhifə')}
                </button>
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-white/[0.06] border border-[var(--border-hairline)] text-xs font-semibold text-slate-300 hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{t('leaderboard.prev', 'Əvvəlki')}</span>
              </button>

              <div className="flex items-center gap-1">
                {pageNumbers.map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-1.5 text-xs font-mono text-slate-500"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCurrentPage(item)}
                      className={`w-8 h-8 rounded-lg text-xs font-mono tabular-nums font-semibold transition-colors ${
                        safePage === item
                          ? 'bg-white/[0.14] text-white border border-white/25'
                          : 'bg-[var(--bg-surface)] text-slate-400 hover:text-white border border-[var(--border-hairline)]'
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-white/[0.06] border border-[var(--border-hairline)] text-xs font-semibold text-slate-300 hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <span>{t('leaderboard.next', 'Növbəti')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayerProfile,
  normalizeDepartment,
  foldDepartmentAscii,
  getProfileDepartment,
  resolveCanonicalDepartment,
  matchesDepartmentFilter,
  isAllDepartmentsFilter,
  isPresidentBadgeHolder,
} from '../lib/data/types';
import AnimatedCounter from './AnimatedCounter';
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

const ROW_SPRING = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 25,
};

export default function LeaderboardTable({
  players,
  currentUser,
  defaultPageSize = 25,
  enablePagination = true,
  departmentFilter,
}: LeaderboardTableProps) {
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
    <div className="space-y-3">
      <div className="overflow-x-auto px-2 sm:px-3 py-2">
        <table className="w-full text-left border-separate border-spacing-y-1.5">
          <thead>
            <tr className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
              <th className="py-3 px-4 sm:px-5 w-20">Sıra</th>
              <th className="py-3 px-4">Oyunçu</th>
              <th className="py-3 px-4 hidden md:table-cell">Fakültə / İxtisas</th>
              <th className="py-3 px-4 text-center">Oyunlar</th>
              <th className="py-3 px-4 text-center hidden sm:table-cell">Qələbə faizi</th>
              <th className="py-3 px-4 sm:px-5 text-right">Xal</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout" initial={false}>
              {displayedPlayers.map((player, idx) => {
                const rank = player.rank ?? startIndex + idx + 1;
              const isMe = currentUser?.id === player.id;
              const totalGames = player.matches_played || player.wins + player.losses;
              const winRate =
                totalGames > 0 ? Math.round((player.wins / totalGames) * 100) : 0;
              const rankChange = player.rank_change ?? 0;
              const staff = isStaffMember(player);
              const departmentLabel = getProfileDepartment(player);
              const yearSuffix = player.admission_year ? ` • ${player.admission_year}` : '';
              const facultySubtitle = staff
                ? `${departmentLabel || 'İdman Klubu'} • Müəllim`
                : `${departmentLabel || 'Mühəndislik'}${yearSuffix}`;

              return (
                <motion.tr
                  key={player.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                  whileHover={{
                    scale: 1.01,
                    y: -2,
                    boxShadow:
                      '0 10px 30px -10px rgba(59, 130, 246, 0.2), inset 0 0 0 1px rgba(59, 130, 246, 0.25)',
                  }}
                  transition={ROW_SPRING}
                  className={`group rounded-2xl will-change-transform ${
                    isMe
                      ? 'bg-[#3B82F6]/15'
                      : rank === 1
                      ? 'bg-gradient-to-r from-amber-500/[0.08] via-[#131C2B] to-[#131C2B]'
                      : 'bg-[#131C2B]/85 hover:bg-[#131C2B]'
                  }`}
                  style={{
                    boxShadow: isMe
                      ? 'inset 0 0 0 1px rgba(59, 130, 246, 0.45)'
                      : 'inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <td className="py-3.5 px-4 sm:px-5 font-mono font-bold rounded-l-2xl">
                    <div className="flex items-center gap-2">
                      {rank === 1 ? (
                        <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
                          <Crown className="w-4 h-4" />
                        </span>
                      ) : rank === 2 ? (
                        <span className="w-8 h-8 rounded-xl bg-slate-300 text-slate-950 flex items-center justify-center font-black">
                          2
                        </span>
                      ) : rank === 3 ? (
                        <span className="w-8 h-8 rounded-xl bg-amber-700 text-amber-100 flex items-center justify-center font-black">
                          3
                        </span>
                      ) : (
                        <span className="w-8 h-8 rounded-xl bg-[#0F1623] border border-white/10 text-slate-300 flex items-center justify-center">
                          {rank}
                        </span>
                      )}

                      {rankChange > 0 ? (
                        <span className="inline-flex items-center text-[10px] text-[#22C55E] font-mono">
                          <ArrowUpRight className="w-3 h-3" />
                          {rankChange}
                        </span>
                      ) : rankChange < 0 ? (
                        <span className="inline-flex items-center text-[10px] text-[#EF4444] font-mono">
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
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm shrink-0 border overflow-hidden ${
                          isMe
                            ? 'bg-[#3B82F6] text-white border-white/20'
                            : staff
                            ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                            : 'bg-[#0F1623] text-slate-200 border-white/10'
                        }`}
                      >
                        {player.avatar_url ? (
                          <img
                            src={player.avatar_url}
                            alt={player.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          player.full_name.charAt(0)
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/players/${player.id}`}
                            className="font-bold text-white group-hover:text-[#3B82F6] transition truncate"
                          >
                            {player.full_name}
                          </Link>

                          {isMe && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3B82F6] text-white">
                              <UserCheck className="w-2.5 h-2.5" />
                              <span>Siz</span>
                            </span>
                          )}

                          {staff && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              Müəllim / Əməkdaş
                            </span>
                          )}

                          {(isPresidentBadgeHolder(player) || player.role === 'coach') && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                isPresidentBadgeHolder(player)
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                              }`}
                            >
                              {isPresidentBadgeHolder(player) ? 'Prezident' : 'Məşqçi'}
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

                  <td className="py-3.5 px-4 text-center font-mono">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0F1623] border border-white/5 text-xs">
                      <span className="text-[#22C55E] font-bold">{player.wins}Q</span>
                      <span className="text-slate-600">/</span>
                      <span className="text-[#EF4444] font-bold">{player.losses}M</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-center hidden sm:table-cell">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`font-mono text-xs font-bold ${
                          winRate >= 60
                            ? 'text-[#22C55E]'
                            : winRate >= 40
                            ? 'text-slate-200'
                            : 'text-slate-400'
                        }`}
                      >
                        {winRate}%
                      </span>
                      <div className="w-16 h-1.5 rounded-full bg-[#0F1623] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            winRate >= 60 ? 'bg-[#22C55E]' : 'bg-[#3B82F6]'
                          }`}
                          style={{ width: `${winRate}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 sm:px-5 text-right rounded-r-2xl">
                    <div className="inline-flex items-baseline gap-1 font-mono text-base sm:text-lg font-black text-white">
                      <AnimatedCounter value={player.current_elo} />
                      <span className="text-[10px] font-sans font-semibold text-[#3B82F6]">
                        XAL
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-t border-white/5 bg-[#0F1623]/60">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span>
              Cəmi <strong className="text-white font-mono">{totalPlayers}</strong> oyunçudan{' '}
              <strong className="text-white font-mono">
                {startIndex + 1}–{endIndex}
              </strong>{' '}
              göstərilir
            </span>

            <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-[#131C2B] border border-white/10">
              {([25, 50] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPageSize(size)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition ${
                    pageSize === size
                      ? 'bg-[#3B82F6] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {size} / səhifə
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
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#131C2B] hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Əvvəlki</span>
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
                      className={`w-8 h-8 rounded-xl text-xs font-mono font-bold transition ${
                        safePage === item
                          ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/20'
                          : 'bg-[#131C2B] text-slate-400 hover:text-white border border-white/5'
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
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#131C2B] hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition disabled:opacity-40 disabled:pointer-events-none"
              >
                <span>Növbəti</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


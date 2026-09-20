'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { BHOSDataStore } from '../../lib/data/store';
import { PlayerProfile } from '../../lib/data/types';
import { useTranslation } from '../../lib/i18n';
import { 
  Trophy, 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ChevronRight, 
  ArrowUpDown, 
  ShieldCheck 
} from 'lucide-react';
import NumberTicker from '../../components/NumberTicker';
import FormDots, { MatchFormItem } from '../../components/FormDots';
import { MatchRecord } from '../../lib/data/types';

export default function LeaderboardPage() {
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedStyle, setSelectedStyle] = useState('ALL');
  const [sortBy, setSortBy] = useState<'elo' | 'wins' | 'winrate'>('elo');

  useEffect(() => {
    const update = () => {
      setProfiles(store.getProfiles());
      setMatches(store.getMatches());
    };
    update();
    return store.subscribe(update);
  }, [store]);

  const getPlayerForm = (playerId: string): MatchFormItem[] => {
    const playerMatches = matches
      .filter((m) => m.player1_id === playerId || m.player2_id === playerId)
      .slice(0, 5);

    return playerMatches.map((m) => {
      const isP1 = m.player1_id === playerId;
      const won = isP1 ? m.player1_score > m.player2_score : m.player2_score > m.player1_score;
      const oppName = (isP1 ? m.player2_name : m.player1_name) || 'Opponent';
      const score = isP1 ? `${m.player1_score}-${m.player2_score}` : `${m.player2_score}-${m.player1_score}`;
      return {
        id: m.id,
        result: won ? 'W' : 'L',
        opponentName: oppName,
        score,
        eloDelta: isP1 ? m.elo_delta : -m.elo_delta,
        date: new Date(m.match_date).toLocaleDateString(),
      };
    });
  };

  const faculties = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach((p) => {
      if (p.major_faculty) set.add(p.major_faculty);
    });
    return Array.from(set);
  }, [profiles]);

  const years = useMemo(() => {
    const set = new Set<number>();
    profiles.forEach((p) => {
      if (p.admission_year) set.add(p.admission_year);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [profiles]);

  const playstyles = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach((p) => {
      if (p.playing_style) set.add(p.playing_style);
    });
    return Array.from(set);
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    return profiles
      .filter((p) => {
        const matchesSearch =
          p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.major_faculty.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.blade_equipment?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFaculty = selectedFaculty === 'ALL' || p.major_faculty === selectedFaculty;
        const matchesYear = selectedYear === 'ALL' || String(p.admission_year) === selectedYear;
        const matchesStyle = selectedStyle === 'ALL' || p.playing_style === selectedStyle;

        return matchesSearch && matchesFaculty && matchesYear && matchesStyle;
      })
      .sort((a, b) => {
        if (sortBy === 'wins') return b.wins - a.wins;
        if (sortBy === 'winrate') {
          const rateA = a.wins / (a.matches_played || 1);
          const rateB = b.wins / (b.matches_played || 1);
          return rateB - rateA;
        }
        return b.current_elo - a.current_elo;
      });
  }, [profiles, searchQuery, selectedFaculty, selectedYear, selectedStyle, sortBy]);

  const getRankBadge = (rank?: number) => {
    if (rank === 1) {
      return (
        <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-bhos-navy font-black text-xs flex items-center justify-center shadow-md shadow-amber-500/20">
          1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-7 h-7 rounded-full bg-slate-300 text-bhos-navy font-black text-xs flex items-center justify-center shadow">
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-7 h-7 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow">
          3
        </span>
      );
    }
    return (
      <span className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 font-mono text-xs flex items-center justify-center border border-slate-700">
        {rank}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shadow-md overflow-hidden shrink-0">
            <img src="/images/bhos-logo.png" alt="BHOS Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-bhos-gold" />
              <h1 className="text-2xl md:text-3xl font-display font-black text-white">
                {t('leaderboard.title')}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t('leaderboard.subtitle')}
            </p>
          </div>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
          </span>
          <div className="bg-bhos-darkCard p-1 rounded-xl border border-bhos-border flex items-center gap-1">
            <button
              onClick={() => setSortBy('elo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                sortBy === 'elo' ? 'bg-bhos-cyan text-bhos-navy' : 'text-slate-300 hover:text-white'
              }`}
            >
              ELO
            </button>
            <button
              onClick={() => setSortBy('winrate')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                sortBy === 'winrate' ? 'bg-bhos-cyan text-bhos-navy' : 'text-slate-300 hover:text-white'
              }`}
            >
              Win Rate %
            </button>
            <button
              onClick={() => setSortBy('wins')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                sortBy === 'wins' ? 'bg-bhos-cyan text-bhos-navy' : 'text-slate-300 hover:text-white'
              }`}
            >
              Wins
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl border border-bhos-border bg-bhos-midnight/90 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shadow-lg">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('leaderboard.search_placeholder')}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-bhos-darkCard border border-bhos-border text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-bhos-cyan"
          />
        </div>

        {/* Faculty */}
        <div>
          <select
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-bhos-darkCard border border-bhos-border text-white text-xs focus:outline-none focus:border-bhos-cyan"
          >
            <option value="ALL">{t('leaderboard.filter_faculty')}</option>
            {faculties.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-bhos-darkCard border border-bhos-border text-white text-xs focus:outline-none focus:border-bhos-cyan"
          >
            <option value="ALL">{t('leaderboard.filter_year')}</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                Class of {y}
              </option>
            ))}
          </select>
        </div>

        {/* Style */}
        <div>
          <select
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-bhos-darkCard border border-bhos-border text-white text-xs focus:outline-none focus:border-bhos-cyan"
          >
            <option value="ALL">{t('leaderboard.filter_style')}</option>
            {playstyles.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Leaderboard Table */}
      <div className="rounded-2xl border border-bhos-border bg-bhos-midnight/90 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-bhos-border bg-bhos-darkCard/90 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-16 text-center">{t('leaderboard.rank')}</th>
                <th className="py-3.5 px-4">{t('leaderboard.player')}</th>
                <th className="py-3.5 px-4 hidden md:table-cell">{t('leaderboard.faculty')}</th>
                <th className="py-3.5 px-4 hidden sm:table-cell">{t('leaderboard.year')}</th>
                <th className="py-3.5 px-4 hidden lg:table-cell">{t('leaderboard.style')}</th>
                <th className="py-3.5 px-4 text-center">{t('leaderboard.elo')}</th>
                <th className="py-3.5 px-4 text-center hidden sm:table-cell">{t('leaderboard.matches')}</th>
                <th className="py-3.5 px-4 text-center">{t('leaderboard.wins')} / {t('leaderboard.losses')}</th>
                <th className="py-3.5 px-4 text-center">{t('leaderboard.winrate')}</th>
                <th className="py-3.5 px-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bhos-border/60">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No players found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((player, idx) => {
                  const winRate = Math.round(
                    (player.wins / (player.matches_played || 1)) * 100
                  );

                  return (
                    <tr
                      key={player.id}
                      className="hover:bg-bhos-darkCard/50 transition-colors group"
                    >
                      {/* Rank & Trend */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {getRankBadge(player.rank || idx + 1)}
                          {(player.rank_change ?? 0) > 0 ? (
                            <TrendingUp className="w-3 h-3 text-emerald-400" />
                          ) : (player.rank_change ?? 0) < 0 ? (
                            <TrendingDown className="w-3 h-3 text-crimson" />
                          ) : (
                            <Minus className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </td>

                      {/* Player Name & Role */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/players/${player.id}`}
                          className="font-bold text-white group-hover:text-bhos-cyan transition flex items-center gap-1.5"
                        >
                          <span>{player.full_name}</span>
                          {player.role === 'president' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              President
                            </span>
                          )}
                          {player.role === 'coach' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Coach
                            </span>
                          )}
                        </Link>
                        <div className="mt-1 flex items-center gap-2">
                          <FormDots form={getPlayerForm(player.id)} size="sm" />
                          <span className="text-[10px] text-slate-500 hidden sm:inline">
                            (Recent Form)
                          </span>
                        </div>
                        <div className="md:hidden text-[10px] text-slate-400 mt-0.5">
                          {player.major_faculty} • {player.admission_year}
                        </div>
                      </td>

                      {/* Faculty */}
                      <td className="py-3.5 px-4 text-slate-300 hidden md:table-cell">
                        {player.major_faculty}
                      </td>

                      {/* Year */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono hidden sm:table-cell">
                        {player.admission_year}
                      </td>

                      {/* Playstyle */}
                      <td className="py-3.5 px-4 text-slate-400 hidden lg:table-cell">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 border border-slate-700">
                          {player.playing_style}
                        </span>
                      </td>

                      {/* ELO Rating */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        <span className="font-extrabold text-sm text-cyan-400">
                          <NumberTicker value={player.current_elo} />
                        </span>
                      </td>

                      {/* Matches */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300 hidden sm:table-cell">
                        {player.matches_played}
                      </td>

                      {/* Wins / Losses */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        <span className="text-emerald-400 font-bold">{player.wins}</span>
                        <span className="text-slate-600 mx-1">/</span>
                        <span className="text-red-400 font-bold">{player.losses}</span>
                      </td>

                      {/* Win Rate % */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-mono font-bold text-xs ${
                            winRate >= 60
                              ? 'text-emerald-400'
                              : winRate >= 45
                              ? 'text-slate-300'
                              : 'text-amber-400'
                          }`}
                        >
                          <NumberTicker value={winRate} suffix="%" />
                        </span>
                      </td>

                      {/* Profile Arrow */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/players/${player.id}`}
                          className="p-1 text-slate-500 hover:text-bhos-cyan transition"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


// Opponent name fallback

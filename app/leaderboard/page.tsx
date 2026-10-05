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
          p.major_faculty.toLowerCase().includes(searchQuery.toLowerCase());
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

      {/* Main Leaderboard List */}
      <div className="rounded-2xl border border-white/10 bg-[#0F1623] p-4 sm:p-6 shadow-2xl space-y-3">
        {/* Header Grid */}
        <div className="hidden md:grid grid-cols-12 gap-3 sm:gap-4 px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/5 bg-[#131C2B]/50 rounded-xl">
          <div className="col-span-1 text-center">Rank</div>
          <div className="col-span-4">Player</div>
          <div className="col-span-3">Faculty / Major</div>
          <div className="col-span-2 text-center">Matches</div>
          <div className="col-span-2 text-right pr-2">Points</div>
        </div>

        {/* Player Rows */}
        <div className="space-y-2">
          {filteredProfiles.length === 0 ? (
            <div className="py-12 text-center text-slate-500 bg-[#131C2B] rounded-xl border border-white/5 text-xs">
              No players found matching current filters.
            </div>
          ) : (
            filteredProfiles.map((player, idx) => {
              const winRate = Math.round(
                (player.wins / (player.matches_played || 1)) * 100
              );

              return (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="block bg-[#131C2B] border border-white/5 rounded-xl p-3.5 sm:p-4 hover:bg-white/[0.04] hover:border-white/10 hover:-translate-y-[1px] transition-all cursor-pointer group shadow-sm"
                >
                  <div className="grid grid-cols-12 gap-3 sm:gap-4 items-center">
                    {/* Rank & Trend */}
                    <div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5">
                      {getRankBadge(player.rank || idx + 1)}
                      {(player.rank_change ?? 0) > 0 ? (
                        <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (player.rank_change ?? 0) < 0 ? (
                        <TrendingDown className="w-3 h-3 text-red-400 shrink-0" />
                      ) : (
                        <Minus className="w-3 h-3 text-slate-600 shrink-0" />
                      )}
                    </div>

                    {/* Name & Role */}
                    <div className="col-span-6 sm:col-span-5 md:col-span-4 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white group-hover:text-[#3B82F6] transition truncate text-xs sm:text-sm">
                          {player.full_name}
                        </span>
                        {player.role === 'president' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                            President
                          </span>
                        )}
                        {player.role === 'coach' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                            Coach
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-2">
                        <FormDots form={getPlayerForm(player.id)} size="sm" />
                        <span className="text-[10px] text-slate-500 hidden sm:inline">
                          (Recent Form)
                        </span>
                      </div>

                      <div className="md:hidden text-[10px] text-slate-400 mt-1 truncate">
                        {player.major_faculty} • Class of {player.admission_year}
                      </div>
                    </div>

                    {/* Faculty */}
                    <div className="hidden md:block md:col-span-3 min-w-0">
                      <div className="text-xs text-slate-200 font-medium truncate">
                        {player.major_faculty || 'Faculty of Engineering'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Class of {player.admission_year || 2024}
                      </div>
                    </div>

                    {/* Matches */}
                    <div className="hidden md:block md:col-span-2 text-center">
                      <div className="text-xs font-mono font-semibold text-slate-300">
                        <span className="text-emerald-400">{player.wins}W</span>
                        <span className="text-slate-600 mx-1">-</span>
                        <span className="text-red-400">{player.losses}L</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {winRate}% win rate ({player.matches_played || 0} played)
                      </div>
                    </div>

                    {/* Points (ELO) & Chevron */}
                    <div className="col-span-4 sm:col-span-6 md:col-span-2 flex items-center justify-end gap-2.5 text-right">
                      <div>
                        <div className="font-mono font-black text-sm sm:text-base text-cyan-400 group-hover:text-blue-400 transition">
                          <NumberTicker value={player.current_elo} />
                          <span className="text-[10px] font-bold text-slate-500 ml-1">PTS</span>
                        </div>
                        <div className="text-[10px] text-slate-500 hidden sm:block">
                          Official Rating
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}


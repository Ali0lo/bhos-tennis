'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { BHOSDataStore } from '../../lib/data/store';
import { PlayerProfile, MatchRecord } from '../../lib/data/types';
import { useTranslation } from '../../lib/i18n';
import NumberTicker from '../../components/NumberTicker';
import PendingApprovals from '../../components/PendingApprovals';
import { 
  Trophy, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Medal, 
  ChevronRight, 
  ArrowUpDown
} from 'lucide-react';

export default function LeaderboardPage() {
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedStyle, setSelectedStyle] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'elo' | 'winrate' | 'wins'>('elo');

  const loadData = () => {
    setProfiles(store.getProfiles());
    setMatches(store.getMatches());
  };

  useEffect(() => {
    loadData();
    const unsub = store.subscribe(loadData);
    return unsub;
  }, [store]);

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
        if (sortBy === 'elo') return b.current_elo - a.current_elo;
        if (sortBy === 'winrate') {
          const aRate = a.matches_played > 0 ? a.wins / a.matches_played : 0;
          const bRate = b.matches_played > 0 ? b.wins / b.matches_played : 0;
          return bRate - aRate;
        }
        if (sortBy === 'wins') return b.wins - a.wins;
        return 0;
      });
  }, [profiles, searchQuery, selectedFaculty, selectedYear, selectedStyle, sortBy]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg shadow-amber-500/30">
          <Medal className="w-3.5 h-3.5" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-7 h-7 rounded-full bg-slate-300 text-slate-950 font-black text-xs flex items-center justify-center shadow">
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shadow-md overflow-hidden shrink-0">
            <img src="/images/bhos-logo.png" alt="BHOS Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-bhos-gold" />
              <h1 className="text-2xl md:text-3xl font-display font-black text-white">
                {t('leaderboard.title') || 'Reytinq Cədvəli'}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t('leaderboard.subtitle') || 'Bakı Ali Neft Məktəbi rəsmi canlı ELO reytinq cədvəli'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" /> Sıralama:
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
              Qələbə faizi %
            </button>
            <button
              onClick={() => setSortBy('wins')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                sortBy === 'wins' ? 'bg-bhos-cyan text-bhos-navy' : 'text-slate-300 hover:text-white'
              }`}
            >
              Qələbələr
            </button>
          </div>
        </div>
      </div>

      <PendingApprovals onMatchUpdated={loadData} />

      <div className="p-4 rounded-2xl border border-bhos-border bg-bhos-midnight/90 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shadow-lg">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Oyunçu və ya fakültə axtarışı..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-bhos-darkCard border border-bhos-border text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-bhos-cyan"
          />
        </div>

        <div>
          <select
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-bhos-darkCard border border-bhos-border text-white text-xs focus:outline-none focus:border-bhos-cyan"
          >
            <option value="ALL">{t('leaderboard.filter_faculty') || 'Bütün Fakültələr'}</option>
            {faculties.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-bhos-darkCard border border-bhos-border text-white text-xs focus:outline-none focus:border-bhos-cyan"
          >
            <option value="ALL">{t('leaderboard.filter_year') || 'Bütün İllər'}</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y} Qəbul ili
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-bhos-darkCard border border-bhos-border text-white text-xs focus:outline-none focus:border-bhos-cyan"
          >
            <option value="ALL">{t('leaderboard.filter_style') || 'Bütün Stillər'}</option>
            {playstyles.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0F1623] p-4 sm:p-6 shadow-2xl space-y-3">
        <div className="hidden md:grid grid-cols-12 gap-3 sm:gap-4 px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/5 bg-[#131C2B]/50 rounded-xl">
          <div className="col-span-1 text-center">Sıra</div>
          <div className="col-span-4">Oyunçu</div>
          <div className="col-span-3">Fakültə / İxtisas</div>
          <div className="col-span-2 text-center">Oyunlar</div>
          <div className="col-span-2 text-right pr-2">Xal</div>
        </div>

        <div className="space-y-2">
          {filteredProfiles.length === 0 ? (
            <div className="py-12 text-center text-slate-500 bg-[#131C2B] rounded-xl border border-white/5 text-xs">
              Cari filtrlərə uyğun oyunçu tapılmadı.
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

                    <div className="col-span-6 sm:col-span-5 md:col-span-4 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white group-hover:text-[#3B82F6] transition truncate text-xs sm:text-sm">
                          {player.full_name}
                        </span>
                        {player.role === 'president' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                            Prezident
                          </span>
                        )}
                        {player.role === 'coach' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                            Məşqçi
                          </span>
                        )}
                      </div>

                      <div className="md:hidden text-[10px] text-slate-400 mt-1 truncate">
                        {player.major_faculty} • {player.admission_year || 2024} Qəbul ili
                      </div>
                    </div>

                    <div className="hidden md:block md:col-span-3 min-w-0">
                      <div className="text-xs text-slate-200 font-medium truncate">
                        {player.major_faculty || 'Mühəndislik Fakültəsi'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {player.admission_year || 2024} Qəbul ili
                      </div>
                    </div>

                    <div className="hidden md:block md:col-span-2 text-center">
                      <div className="text-xs font-mono font-semibold text-slate-300">
                        <span className="text-emerald-400">{player.wins}Q</span>
                        <span className="text-slate-600 mx-1">-</span>
                        <span className="text-red-400">{player.losses}M</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {winRate}% qələbə ({player.matches_played || 0} oyun)
                      </div>
                    </div>

                    <div className="col-span-4 sm:col-span-6 md:col-span-2 flex items-center justify-end gap-2.5 text-right">
                      <div>
                        <div className="font-mono font-black text-sm sm:text-base text-cyan-400 group-hover:text-blue-400 transition">
                          <NumberTicker value={player.current_elo} />
                          <span className="text-[10px] font-bold text-slate-500 ml-1">XAL</span>
                        </div>
                        <div className="text-[10px] text-slate-500 hidden sm:block">
                          Rəsmi Reytinq
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

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import {
  Calculator,
  Zap,
  Search,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Swords,
  Check,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { PlayerProfile } from '../lib/data/types';
import { BHOSDataStore } from '../lib/data/store';
import { getSupabaseClient } from '../lib/supabase/client';
import { calculateWhatIf } from '../lib/elo/calculator';

interface WhatIfSimulatorProps {
  player: PlayerProfile;
}

function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
}: {
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  const spring = useSpring(value, {
    stiffness: 140,
    damping: 22,
    mass: 0.7,
  });

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  const display = useTransform(spring, (current) => {
    const rounded = Math.round(current);
    return `${prefix}${rounded}${suffix}`;
  });

  return <motion.span>{display}</motion.span>;
}

export default function WhatIfSimulator({ player }: WhatIfSimulatorProps) {
  const store = BHOSDataStore.getInstance();
  const [roster, setRoster] = useState<PlayerProfile[]>([]);
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isActive = true;

    const loadRoster = async () => {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .neq('is_verified', false)
            .order('current_elo', { ascending: false });

          if (!error && data && isActive) {
            const validOpponents = (data as PlayerProfile[]).filter(
              (p) => p.id !== player.id
            );
            setRoster(validOpponents);
            return;
          }
        } catch (err) {
          console.error(err);
        }
      }

      if (isActive) {
        const fallback = store
          .getVerifiedProfiles()
          .filter((p) => p.id !== player.id)
          .sort((a, b) => b.current_elo - a.current_elo);
        setRoster(fallback);
      }
    };

    loadRoster();

    return () => {
      isActive = false;
    };
  }, [player.id, store]);

  useEffect(() => {
    if (roster.length > 0 && !selectedOpponentId) {
      const closest = [...roster].sort(
        (a, b) =>
          Math.abs(a.current_elo - player.current_elo) -
          Math.abs(b.current_elo - player.current_elo)
      )[0];
      if (closest) {
        setSelectedOpponentId(closest.id);
      }
    }
  }, [roster, selectedOpponentId, player.current_elo]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOpponents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (op) =>
        op.full_name.toLowerCase().includes(q) ||
        (op.major_faculty && op.major_faculty.toLowerCase().includes(q)) ||
        String(op.current_elo).includes(q)
    );
  }, [roster, searchQuery]);

  const selectedOpponent = useMemo(() => {
    return roster.find((op) => op.id === selectedOpponentId) || null;
  }, [roster, selectedOpponentId]);

  const prediction = useMemo(() => {
    if (!selectedOpponent) return null;
    return calculateWhatIf(player.current_elo, selectedOpponent.current_elo, 32);
  }, [player.current_elo, selectedOpponent]);

  const playerWinPctRaw = prediction ? prediction.winProbability * 100 : 50;
  const opponentWinPctRaw = prediction ? (1 - prediction.winProbability) * 100 : 50;

  const playerBarWidth = Math.max(4, Math.min(96, playerWinPctRaw));
  const opponentBarWidth = 100 - playerBarWidth;

  const formatProbabilityDisplay = (pct: number) => {
    if (pct > 0 && pct < 1) return '<1%';
    if (pct > 99 && pct < 100) return '>99%';
    return `${Math.round(pct)}%`;
  };

  const projectedPlayerWinElo = prediction
    ? player.current_elo + prediction.winEloGain
    : player.current_elo;
  const projectedPlayerLossElo = prediction
    ? Math.max(0, player.current_elo + prediction.lossEloDrop)
    : player.current_elo;
  const projectedOpponentWinElo =
    prediction && selectedOpponent
      ? selectedOpponent.current_elo + prediction.opponentWinEloGain
      : 0;
  const projectedOpponentLossElo =
    prediction && selectedOpponent
      ? Math.max(0, selectedOpponent.current_elo + prediction.opponentLossEloDrop)
      : 0;

  return (
    <div
      className="rounded-2xl bg-[#0F1623] p-6 shadow-xl space-y-6 relative"
      style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6] shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-display font-bold text-white">
                Rəqib Seç &amp; ELO Proqnozu
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30">
                <Zap className="w-2.5 h-2.5" />
                K=32
              </span>
            </div>
            <p className="text-xs text-slate-400">
              İstənilən klub üzvünə qarşı ehtimal olunan qələbə şansı və ELO dəyişikliyini hesablayın
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-80" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#131C2B] hover:bg-[#182336] border border-white/10 hover:border-[#3B82F6]/40 transition-all text-left"
          >
            {selectedOpponent ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-pink-500/30 flex items-center justify-center text-xs font-bold text-pink-300 shrink-0 overflow-hidden">
                  {selectedOpponent.avatar_url ? (
                    <img
                      src={selectedOpponent.avatar_url}
                      alt={selectedOpponent.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    selectedOpponent.full_name.charAt(0)
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {selectedOpponent.full_name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {selectedOpponent.major_faculty || 'BANM'} •{' '}
                    <span className="font-mono font-bold text-pink-400">
                      {selectedOpponent.current_elo} ELO
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-xs text-slate-400">Rəqib seçin...</span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180 text-[#3B82F6]' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="absolute right-0 mt-2 w-full rounded-xl bg-[#0B111D] border border-white/15 shadow-2xl z-40 overflow-hidden"
              >
                <div className="p-2.5 border-b border-white/10 bg-[#0F1623]">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ad, fakültə və ya ELO axtar..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#131C2B] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6]"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-white/5">
                  {filteredOpponents.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Uyğun oyunçu tapılmadı
                    </div>
                  ) : (
                    filteredOpponents.map((op) => {
                      const isSelected = op.id === selectedOpponentId;
                      return (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => {
                            setSelectedOpponentId(op.id);
                            setIsDropdownOpen(false);
                            setSearchQuery('');
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left transition-colors ${
                            isSelected
                              ? 'bg-[#3B82F6]/15 text-white'
                              : 'hover:bg-white/5 text-slate-200'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                              <span>{op.full_name}</span>
                              {op.role === 'coach' && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Məşqçi
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {op.major_faculty || 'BANM Üzvü'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-mono font-bold text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-0.5 rounded-md border border-[#3B82F6]/20">
                              {op.current_elo}
                            </span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-[#3B82F6]" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {selectedOpponent && prediction ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedOpponent.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="space-y-5"
          >
            <div className="p-4 rounded-xl bg-[#080D16] border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]" />
                  <span className="font-bold text-white truncate max-w-[140px] sm:max-w-none">
                    {player.full_name}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    ({player.current_elo} ELO)
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                  Qələbə Ehtimalı
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">
                    ({selectedOpponent.current_elo} ELO)
                  </span>
                  <span className="font-bold text-white truncate max-w-[140px] sm:max-w-none">
                    {selectedOpponent.full_name}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-[0_0_8px_#EC4899]" />
                </div>
              </div>

              <div className="relative h-3.5 w-full rounded-full bg-[#131C2B] overflow-hidden flex p-0.5 gap-1">
                <motion.div
                  initial={false}
                  animate={{ width: `${playerBarWidth}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  className="h-full rounded-l-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6] shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                />
                <motion.div
                  initial={false}
                  animate={{ width: `${opponentBarWidth}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  className="h-full rounded-r-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.5)]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg sm:text-xl font-mono font-black text-[#3B82F6]">
                    {formatProbabilityDisplay(playerWinPctRaw)}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Şans
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-400">
                  ELO Fərqi:{' '}
                  <span
                    className={`font-bold ${
                      player.current_elo - selectedOpponent.current_elo >= 0
                        ? 'text-[#3B82F6]'
                        : 'text-pink-400'
                    }`}
                  >
                    {player.current_elo - selectedOpponent.current_elo >= 0
                      ? `+${player.current_elo - selectedOpponent.current_elo}`
                      : player.current_elo - selectedOpponent.current_elo}
                  </span>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Şans
                  </span>
                  <span className="text-lg sm:text-xl font-mono font-black text-pink-400">
                    {formatProbabilityDisplay(opponentWinPctRaw)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Qələbə Qazansanız
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {player.full_name.split(' ')[0]} Qalib
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl sm:text-3xl font-mono font-black text-[#22C55E]">
                    <AnimatedNumber
                      value={prediction.winEloGain}
                      prefix="+"
                      suffix=" PTS"
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-400 block">
                      Yeni ELO Reytinqi
                    </span>
                    <span className="text-sm font-mono font-bold text-white">
                      {player.current_elo} →{' '}
                      <span className="text-[#22C55E]">
                        <AnimatedNumber value={projectedPlayerWinElo} />
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-rose-500/[0.05] border border-rose-500/20 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                    Məğlub Olsanız
                  </span>
                  {player.current_elo === 0 || projectedPlayerLossElo === 0 ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />0 Minimum Həddi
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                      {player.full_name.split(' ')[0]} Məğlub
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl sm:text-3xl font-mono font-black text-rose-400">
                    <AnimatedNumber
                      value={Math.abs(prediction.lossEloDrop)}
                      prefix={prediction.lossEloDrop === 0 ? '-' : '-'}
                      suffix=" PTS"
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-400 block">
                      Yeni ELO Reytinqi
                    </span>
                    <span className="text-sm font-mono font-bold text-white">
                      {player.current_elo} →{' '}
                      <span className="text-rose-400">
                        <AnimatedNumber value={projectedPlayerLossElo} />
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#080D16] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Rəqib Qalib Gəlsə ({selectedOpponent.full_name.split(' ')[0]})
                  </span>
                  <span className="text-xs font-mono text-slate-300">
                    {selectedOpponent.current_elo} →{' '}
                    <span className="text-pink-400 font-bold">
                      <AnimatedNumber value={projectedOpponentWinElo} /> ELO
                    </span>
                  </span>
                </div>
                <span className="text-base font-mono font-black text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2.5 py-1 rounded-lg">
                  <AnimatedNumber
                    value={prediction.opponentWinEloGain}
                    prefix="+"
                    suffix=" PTS"
                  />
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#080D16] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Rəqib Məğlub Olsa ({selectedOpponent.full_name.split(' ')[0]})
                  </span>
                  <span className="text-xs font-mono text-slate-300">
                    {selectedOpponent.current_elo} →{' '}
                    <span className="text-slate-200 font-bold">
                      <AnimatedNumber value={projectedOpponentLossElo} /> ELO
                    </span>
                  </span>
                </div>
                <span className="text-base font-mono font-black text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                  <AnimatedNumber
                    value={Math.abs(prediction.opponentLossEloDrop)}
                    prefix="-"
                    suffix=" PTS"
                  />
                </span>
              </div>
            </div>

            <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />
                <span>
                  Rəsmi ITTF loqistik ELO düsturu (K=32, 0 minimum reytinq qorunması)
                </span>
              </div>

              <Link
                href={`/log-match?opponentId=${encodeURIComponent(selectedOpponent.id)}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B82F6]/15 hover:bg-[#3B82F6] text-[#3B82F6] hover:text-white border border-[#3B82F6]/30 font-display font-bold text-xs transition-all shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] shrink-0"
              >
                <Swords className="w-3.5 h-3.5" />
                Bu Oyunçu ilə Matç Qeyd Et
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="p-8 rounded-xl bg-[#080D16] border border-white/5 text-center text-xs text-slate-500">
          ELO proqnozunu görmək üçün siyahıdan rəqib seçin.
        </div>
      )}
    </div>
  );
}

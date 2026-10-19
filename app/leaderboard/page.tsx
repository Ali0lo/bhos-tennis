'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BHOSDataStore } from '../../lib/data/store';
import { PlayerProfile } from '../../lib/data/types';
import { getSupabaseClient } from '../../lib/supabase/client';
import NumberTicker from '../../components/NumberTicker';
import SmoothReveal from '../../components/SmoothReveal';
import {
  Search,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  SlidersHorizontal,
  Medal,
  Crown,
  Sparkles,
  UserCheck,
  Briefcase,
  GraduationCap,
} from 'lucide-react';

const FACULTIES = [
  'Hamısı',
  'Information Security',
  'Computer Engineering',
  'Computer Science',
  'Data Analytics',
  'Chemical Engineering',
  'Petroleum Engineering',
  'Process Automation',
  'Business Administration',
  'Finance',
  'İdman Klubu',
  'Riyaziyyat və Təbii Elmlər',
  'İnformasiya Texnologiyaları',
];

const COHORT_PILLS: { id: string; label: string }[] = [
  { id: 'ALL', label: 'Hamısı' },
  { id: 'STAFF', label: 'Müəllim / Əməkdaş' },
  { id: '2026', label: '2026' },
  { id: '2025', label: '2025' },
  { id: '2024', label: '2024' },
  { id: '2023', label: '2023' },
  { id: '2022', label: '2022' },
  { id: '2021', label: '2021' },
  { id: '2020', label: '2020' },
];

const SMOOTH_EASE: [number, number, number, number] = [0.21, 0.47, 0.32, 0.98];

function isStaffMember(player: PlayerProfile): boolean {
  return (
    player.user_type === 'teacher' ||
    player.user_type === 'staff' ||
    player.role === 'coach' ||
    !player.admission_year
  );
}

export default function LeaderboardPage() {
  const store = BHOSDataStore.getInstance();

  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('Hamısı');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'male' | 'female'>('ALL');
  const [cohortFilter, setCohortFilter] = useState<string>('ALL');

  useEffect(() => {
    let isMounted = true;

    async function loadLeaderboard() {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const sessionEmail = sessionData?.session?.user?.email;

          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('current_elo', { ascending: false });

          if (!error && data && data.length > 0 && isMounted) {
            const verifiedList = (data as PlayerProfile[])
              .filter((p) => p.is_verified !== false)
              .map((p, idx) => ({
                ...p,
                rank: idx + 1,
              }));

            setProfiles(verifiedList);

            if (sessionEmail) {
              const found = (data as PlayerProfile[]).find(
                (p) => p.email?.toLowerCase() === sessionEmail.toLowerCase()
              );
              if (found) setCurrentUser(found);
            } else {
              setCurrentUser(store.getCurrentUser());
            }

            setLoading(false);
            return;
          }
        } catch {
        }
      }

      if (isMounted) {
        setProfiles(store.getVerifiedProfiles());
        setCurrentUser(store.getCurrentUser());
        setLoading(false);
      }
    }

    loadLeaderboard();

    const unsub = store.subscribe(() => {
      if (isMounted) {
        setProfiles(store.getVerifiedProfiles());
        setCurrentUser(store.getCurrentUser());
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [store]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.full_name.toLowerCase().includes(q) ||
        (p.major_faculty && p.major_faculty.toLowerCase().includes(q)) ||
        (p.blade_equipment && p.blade_equipment.toLowerCase().includes(q));

      const matchesFaculty =
        selectedFaculty === 'Hamısı' ||
        (p.major_faculty &&
          p.major_faculty.toLowerCase().includes(selectedFaculty.toLowerCase()));

      const matchesGender =
        genderFilter === 'ALL' ||
        (p.gender && p.gender.toLowerCase() === genderFilter);

      const staff = isStaffMember(p);
      const matchesCohort =
        cohortFilter === 'ALL'
          ? true
          : cohortFilter === 'STAFF'
          ? staff
          : !staff && String(p.admission_year) === cohortFilter;

      return matchesSearch && matchesFaculty && matchesGender && matchesCohort;
    });
  }, [profiles, searchQuery, selectedFaculty, genderFilter, cohortFilter]);

  const filterKey = `${selectedFaculty}-${genderFilter}-${cohortFilter}-${searchQuery}`;

  return (
    <SmoothReveal>
      <div className="space-y-8 pb-12">
        <div className="relative rounded-2xl border border-white/10 bg-[#0F1623] p-6 sm:p-8 shadow-2xl overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#3B82F6]/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#131C2B] border border-white/10 text-[#3B82F6] text-xs font-bold uppercase tracking-wider">
                <Trophy className="w-3.5 h-3.5" />
                <span>Rəsmi Universitet Reytinqi</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-display font-black text-white tracking-tight">
                BANM Canlı ELO Reytinq Cədvəli
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
                Bakı Ali Neft Məktəbinin təsdiqlənmiş stolüstü tennis oyunçularının rəsmi reytinq siyahısı. Dinamik ELO hesablama sistemi (K=32).
              </p>
            </div>

            {currentUser && (
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#131C2B] border border-[#3B82F6]/30 shadow-lg shrink-0">
                <div className="w-11 h-11 rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-[#3B82F6] font-display font-black text-base">
                  {currentUser.full_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#3B82F6]">
                      Sizin Reytinqiniz
                    </span>
                    {currentUser.rank && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#3B82F6]/20 text-white">
                        #{currentUser.rank}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-white">{currentUser.full_name}</div>
                  <div className="text-xs font-mono text-slate-400">
                    <strong className="text-white">{currentUser.current_elo}</strong> ELO •{' '}
                    <span className="text-[#22C55E]">{currentUser.wins}Q</span> -{' '}
                    <span className="text-[#EF4444]">{currentUser.losses}M</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Oyunçu adı və ya ixtisas üzrə axtarış..."
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0F1623] border border-white/10 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#3B82F6] transition shadow-lg"
              />
            </div>

            <div className="md:col-span-4 relative">
              <SlidersHorizontal className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0F1623] border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#3B82F6] transition shadow-lg appearance-none"
              >
                {FACULTIES.map((fac) => (
                  <option key={fac} value={fac} className="bg-[#0F1623] text-white">
                    {fac === 'Hamısı' ? 'Bütün Fakültələr / Kafedralar' : fac}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 flex p-1 rounded-xl bg-[#0F1623] border border-white/10 shadow-lg">
              {(['ALL', 'male', 'female'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenderFilter(g)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                    genderFilter === g
                      ? 'bg-[#3B82F6] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {g === 'ALL' ? 'Hamısı' : g === 'male' ? 'Oğlan' : 'Qız'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {COHORT_PILLS.map((pill) => {
              const active = cohortFilter === pill.id;
              const isStaffPill = pill.id === 'STAFF';
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setCohortFilter(pill.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                    active
                      ? isStaffPill
                        ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400/50 shadow-lg shadow-indigo-500/10'
                        : 'bg-[#3B82F6] text-white border-[#3B82F6] shadow-lg shadow-blue-500/20'
                      : isStaffPill
                      ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20'
                      : 'bg-[#0F1623] text-slate-400 border-white/10 hover:text-white hover:border-white/20'
                  }`}
                >
                  {isStaffPill ? (
                    <Briefcase className="w-3.5 h-3.5" />
                  ) : pill.id !== 'ALL' ? (
                    <GraduationCap className="w-3.5 h-3.5" />
                  ) : null}
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0F1623] shadow-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="h-14 rounded-xl bg-[#131C2B] animate-pulse border border-white/5"
                />
              ))}
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-slate-500 mx-auto" />
              <div className="text-sm font-bold text-white">Uyğun oyunçu tapılmadı</div>
              <p className="text-xs text-slate-400">
                Axtarış sorğusunu və ya filtrləri dəyişərək yenidən yoxlayın.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-[#131C2B]/80 text-[11px] uppercase font-bold tracking-wider text-slate-400">
                    <th className="py-4 px-4 sm:px-6 w-20">Sıra</th>
                    <th className="py-4 px-4">Oyunçu</th>
                    <th className="py-4 px-4 hidden md:table-cell">Fakültə / İxtisas</th>
                    <th className="py-4 px-4 text-center">Oyunlar</th>
                    <th className="py-4 px-4 text-center hidden sm:table-cell">Qələbə faizi</th>
                    <th className="py-4 px-4 sm:px-6 text-right">Xal</th>
                  </tr>
                </thead>
                <tbody key={filterKey} className="divide-y divide-white/5 text-xs sm:text-sm">
                  {filteredProfiles.map((player, idx) => {
                    const rank = player.rank ?? idx + 1;
                    const isMe = currentUser?.id === player.id;
                    const totalGames = player.matches_played || player.wins + player.losses;
                    const winRate =
                      totalGames > 0 ? Math.round((player.wins / totalGames) * 100) : 0;
                    const rankChange = player.rank_change ?? 0;
                    const staff = isStaffMember(player);
                    const facultySubtitle = staff
                      ? `${player.major_faculty || 'İdman Klubu'} • Müəllim`
                      : `${player.major_faculty || 'Mühəndislik'} • ${player.admission_year}`;

                    return (
                      <motion.tr
                        key={player.id}
                        initial={{ opacity: 0, y: 18, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{
                          duration: 0.5,
                          delay: Math.min(idx * 0.04, 0.4),
                          ease: SMOOTH_EASE,
                        }}
                        className={`transition-colors group ${
                          isMe
                            ? 'bg-[#3B82F6]/15 hover:bg-[#3B82F6]/20 border-l-4 border-l-[#3B82F6]'
                            : rank === 1
                            ? 'bg-amber-500/[0.04] hover:bg-white/[0.04]'
                            : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <td className="py-4 px-4 sm:px-6 font-mono font-bold">
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
                              <span className="w-8 h-8 rounded-xl bg-[#131C2B] border border-white/10 text-slate-300 flex items-center justify-center">
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

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm shrink-0 border ${
                                isMe
                                  ? 'bg-[#3B82F6] text-white border-white/20'
                                  : staff
                                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                  : 'bg-[#131C2B] text-slate-200 border-white/10'
                              }`}
                            >
                              {player.full_name.charAt(0)}
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

                                {player.role !== 'player' && (
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                      player.role === 'president'
                                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                        : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                    }`}
                                  >
                                    {player.role === 'president' ? 'Prezident' : 'Məşqçi'}
                                  </span>
                                )}
                              </div>

                              <div className="text-[11px] text-slate-400 md:hidden truncate">
                                {facultySubtitle}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 hidden md:table-cell">
                          <span className="text-xs text-slate-300 font-medium">
                            {facultySubtitle}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center font-mono">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#131C2B] border border-white/5 text-xs">
                            <span className="text-[#22C55E] font-bold">{player.wins}Q</span>
                            <span className="text-slate-600">/</span>
                            <span className="text-[#EF4444] font-bold">{player.losses}M</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-center hidden sm:table-cell">
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
                            <div className="w-16 h-1.5 rounded-full bg-[#131C2B] overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  winRate >= 60 ? 'bg-[#22C55E]' : 'bg-[#3B82F6]'
                                }`}
                                style={{ width: `${winRate}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 sm:px-6 text-right">
                          <div className="inline-flex items-baseline gap-1 font-mono text-base sm:text-lg font-black text-white">
                            <NumberTicker value={player.current_elo} />
                            <span className="text-[10px] font-sans font-semibold text-[#3B82F6]">
                              XAL
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SmoothReveal>
  );
}

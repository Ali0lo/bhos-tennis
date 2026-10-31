'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BHOSDataStore } from '../../lib/data/store';
import { PlayerProfile } from '../../lib/data/types';
import SmoothReveal from '../../components/SmoothReveal';
import CourtBackground from '../../components/CourtBackground';
import LeaderboardTable, {
  isStaffMember,
  getProfileDepartment,
  matchesDepartmentFilter,
} from '../../components/LeaderboardTable';
import LeaderboardSkeleton from '../../components/LeaderboardSkeleton';
import AnimatedCounter from '../../components/AnimatedCounter';
import HoloCard from '../../components/HoloCard';
import FacultyFilterTabs from '../../components/FacultyFilterTabs';
import {
  Search,
  Trophy,
  SlidersHorizontal,
  Sparkles,
  Briefcase,
  GraduationCap,
  Crown,
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
];

const FACULTY_TABS: { id: string; label: string }[] = [
  { id: 'Hamısı', label: 'Hamısı' },
  { id: 'Information Security', label: 'İnformasiya təhlükəsizliyi' },
  { id: 'Computer Engineering', label: 'Kompüter müh.' },
  { id: 'Process Automation', label: 'Proseslərin avtomatlaşdırılması' },
  { id: 'Chemical Engineering', label: 'Kimya müh.' },
  { id: 'Petroleum Engineering', label: 'Neft-qaz müh.' },
  { id: 'Business Administration', label: 'Biznesin idarə edilməsi' },
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

export default function LeaderboardPage() {
  const store = BHOSDataStore.getInstance();

  const [profiles, setProfiles] = useState<PlayerProfile[]>(() => store.getCachedLeaderboard());
  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(() => store.getCurrentUser());
  const [loading, setLoading] = useState<boolean>(() => store.getCachedLeaderboard().length === 0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('Hamısı');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'male' | 'female'>('ALL');
  const [cohortFilter, setCohortFilter] = useState<string>('ALL');

  useEffect(() => {
    let isMounted = true;

    const cached = store.getCachedLeaderboard();
    if (cached.length > 0) {
      setProfiles(cached);
      setCurrentUser(store.getCurrentUser());
      setLoading(false);
    }

    store.fetchLeaderboardStandings().then((standings) => {
      if (!isMounted) return;
      if (standings.length > 0) {
        setProfiles(standings);
      } else {
        setProfiles(store.getVerifiedProfiles());
      }
      setCurrentUser(store.getCurrentUser());
      setLoading(false);
    });

    const unsub = store.subscribe(() => {
      if (isMounted) {
        const latest = store.getCachedLeaderboard();
        setProfiles(latest.length > 0 ? latest : store.getVerifiedProfiles());
        setCurrentUser(store.getCurrentUser());
        setLoading(false);
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
      const dept = getProfileDepartment(p);
      const matchesSearch =
        !q ||
        p.full_name.toLowerCase().includes(q) ||
        (dept && dept.toLowerCase().includes(q)) ||
        matchesDepartmentFilter(p, q) ||
        (p.blade_equipment && p.blade_equipment.toLowerCase().includes(q));

      const matchesFaculty = matchesDepartmentFilter(p, selectedFaculty);

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

  const top3Podium = useMemo(() => profiles.slice(0, 3), [profiles]);

  return (
    <SmoothReveal>
      <div className="relative space-y-8 pb-12">
        <div className="relative rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-sm overflow-hidden">
          <CourtBackground className="opacity-20" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-blue-400 text-xs font-bold uppercase tracking-wider">
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
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950 border border-blue-600/40 shadow-sm shrink-0">
                <div className="w-11 h-11 rounded-xl bg-blue-700/20 border border-blue-600/40 flex items-center justify-center text-blue-400 font-display font-black text-base">
                  {currentUser.full_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400">
                      Sizin Reytinqiniz
                    </span>
                    {currentUser.rank && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-700 text-white">
                        #{currentUser.rank}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-white">{currentUser.full_name}</div>
                  <div className="text-xs font-mono text-slate-400">
                    <strong className="text-white">
                      <AnimatedCounter value={currentUser.current_elo} />
                    </strong>{' '}
                    ELO • <span className="text-emerald-500">{currentUser.wins}Q</span> -{' '}
                    <span className="text-rose-500">{currentUser.losses}M</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {top3Podium.length >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
            <HoloCard className="order-2 md:order-1 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-slate-300 text-slate-950 border-2 border-white flex items-center justify-center font-display font-black text-base absolute -top-4 left-6 shadow-sm z-30">
                2
              </div>
              <div className="pt-2 relative z-10">
                <Link
                  href={`/players/${top3Podium[1].id}`}
                  className="font-display font-bold text-base text-white hover:text-blue-400 transition"
                >
                  {top3Podium[1].full_name}
                </Link>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {top3Podium[1].major_faculty || 'BANM'}
                </p>
                <div className="mt-4 flex items-baseline justify-between">
                  <div className="font-mono text-2xl font-extrabold text-white flex items-baseline gap-1">
                    <AnimatedCounter value={top3Podium[1].current_elo} />
                    <span className="text-xs text-slate-400 font-sans">ELO</span>
                  </div>
                  <span className="text-xs text-emerald-500 font-semibold">
                    {top3Podium[1].matches_played > 0
                      ? Math.round((top3Podium[1].wins / top3Podium[1].matches_played) * 100)
                      : 0}
                    % Qələbə
                  </span>
                </div>
              </div>
            </HoloCard>

            <HoloCard className="order-1 md:order-2 rounded-3xl border-2 border-amber-500/80 bg-slate-900 p-7 shadow-md md:-translate-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-display font-black text-xl absolute -top-6 left-1/2 -translate-x-1/2 shadow-sm z-30">
                <Crown className="w-6 h-6" />
              </div>
              <div className="pt-4 text-center relative z-10">
                <span className="inline-block px-3 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-2 border border-amber-500/30">
                  Lider • #1
                </span>
                <Link
                  href={`/players/${top3Podium[0].id}`}
                  className="block font-display font-black text-xl text-white hover:text-blue-400 transition"
                >
                  {top3Podium[0].full_name}
                </Link>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {top3Podium[0].major_faculty || 'BANM'}
                </p>
                <div className="mt-4 font-mono text-3xl font-black text-amber-400 flex items-baseline justify-center gap-1">
                  <AnimatedCounter value={top3Podium[0].current_elo} />
                  <span className="text-xs text-slate-300 font-sans">ELO</span>
                </div>
              </div>
            </HoloCard>

            <HoloCard className="order-3 rounded-3xl border border-amber-800/80 bg-slate-900 p-6 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-amber-800 text-amber-200 border-2 border-amber-600 flex items-center justify-center font-display font-black text-base absolute -top-4 right-6 shadow-sm z-30">
                3
              </div>
              <div className="pt-2 relative z-10">
                <Link
                  href={`/players/${top3Podium[2].id}`}
                  className="font-display font-bold text-base text-white hover:text-blue-400 transition"
                >
                  {top3Podium[2].full_name}
                </Link>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {top3Podium[2].major_faculty || 'BANM'}
                </p>
                <div className="mt-4 flex items-baseline justify-between">
                  <div className="font-mono text-2xl font-extrabold text-white flex items-baseline gap-1">
                    <AnimatedCounter value={top3Podium[2].current_elo} />
                    <span className="text-xs text-slate-400 font-sans">ELO</span>
                  </div>
                  <span className="text-xs text-emerald-500 font-semibold">
                    {top3Podium[2].matches_played > 0
                      ? Math.round((top3Podium[2].wins / top3Podium[2].matches_played) * 100)
                      : 0}
                    % Qələbə
                  </span>
                </div>
              </div>
            </HoloCard>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Oyunçu adı və ya ixtisas üzrə axtarış..."
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-600 transition shadow-sm"
              />
            </div>

            <div className="md:col-span-4 relative">
              <SlidersHorizontal className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-600 transition shadow-sm appearance-none"
              >
                {FACULTIES.map((fac) => (
                  <option key={fac} value={fac} className="bg-slate-900 text-white">
                    {fac === 'Hamısı' ? 'Bütün Fakültələr / Kafedralar' : fac}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 flex p-1 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
              {(['ALL', 'male', 'female'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenderFilter(g)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                    genderFilter === g
                      ? 'bg-blue-700 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {g === 'ALL' ? 'Hamısı' : g === 'male' ? 'Oğlan' : 'Qız'}
                </button>
              ))}
            </div>
          </div>

          <FacultyFilterTabs
            tabs={FACULTY_TABS}
            selectedFaculty={selectedFaculty}
            onSelect={setSelectedFaculty}
          />

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
                        ? 'bg-blue-800 text-white border-blue-600 shadow-sm'
                        : 'bg-blue-700 text-white border-blue-600 shadow-sm'
                      : isStaffPill
                      ? 'bg-slate-900 text-blue-300 border-blue-800/50 hover:bg-slate-800'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
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

        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <LeaderboardSkeleton rows={5} />
          ) : filteredProfiles.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-slate-500 mx-auto" />
              <div className="text-sm font-bold text-white">Uyğun oyunçu tapılmadı</div>
              <p className="text-xs text-slate-400">
                Axtarış sorğusunu və ya filtrləri dəyişərək yenidən yoxlayın.
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <LeaderboardTable
                players={filteredProfiles}
                currentUser={currentUser}
                departmentFilter={selectedFaculty}
              />
            </motion.div>
          )}
        </div>
      </div>
    </SmoothReveal>
  );
}

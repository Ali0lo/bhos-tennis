'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BHOSDataStore, getPlayerHref } from '../../lib/data/store';
import { PlayerProfile } from '../../lib/data/types';
import SmoothReveal from '../../components/SmoothReveal';
import CourtBackground from '../../components/CourtBackground';
import LeaderboardTable, { isStaffMember } from '../../components/LeaderboardTable';
import {
  getProfileDepartment,
  matchesDepartmentFilter,
  isAllDepartmentsFilter,
} from '../../lib/utils/department';
import LeaderboardSkeleton from '../../components/LeaderboardSkeleton';
import AnimatedCounter from '../../components/AnimatedCounter';
import FacultyFilterTabs from '../../components/FacultyFilterTabs';
import FacultyPowerRankings from '../../components/FacultyPowerRankings';
import { useTranslation } from '../../lib/i18n';
import {
  Search,
  Trophy,
  SlidersHorizontal,
  Sparkles,
  Briefcase,
  GraduationCap,
  Crown,
  Medal,
  Users,
  Building2,
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
  'Foundation',
  'İdman Klubu',
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
  const { t, locale } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const [profiles, setProfiles] = useState<PlayerProfile[]>(() => store.getCachedLeaderboard());
  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(() => store.getCurrentUser());
  const [loading, setLoading] = useState<boolean>(() => store.getCachedLeaderboard().length === 0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('Hamısı');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'male' | 'female'>('ALL');
  const [cohortFilter, setCohortFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'players' | 'faculties'>('players');

  const facultyTabs = useMemo(() => [
    { id: 'Hamısı', label: t('leaderboard.all', 'Hamısı') },
    { id: 'Information Security', label: t('faculties.Information Security', 'İnformasiya təhlükəsizliyi') },
    { id: 'Computer Engineering', label: t('faculties.Computer Engineering', 'Kompüter müh.') },
    { id: 'Process Automation', label: t('faculties.Process Automation', 'Proseslərin avtomatlaşdırılması') },
    { id: 'Chemical Engineering', label: t('faculties.Chemical Engineering', 'Kimya müh.') },
    { id: 'Petroleum Engineering', label: t('faculties.Petroleum Engineering', 'Neft-qaz müh.') },
    { id: 'Business Administration', label: t('faculties.Business Administration', 'Biznesin idarə edilməsi') },
    { id: 'Foundation', label: t('faculties.Foundation', 'Hazırlıq (Foundation)') },
  ], [t]);

  useEffect(() => {
    let isMounted = true;

    const syncFromStore = () => {
      if (!isMounted) return;
      const latest = store.getCachedLeaderboard();
      const verified = store.getVerifiedProfiles();
      const source = latest.length > 0 ? latest : verified;
      setProfiles(
        source.map((p) => {
          const total =
            (p.wins || 0) + (p.losses || 0) > 0
              ? Math.max(p.matches_played || 0, (p.wins || 0) + (p.losses || 0))
              : p.matches_played || 0;
          return {
            ...p,
            matches_played: total,
            win_rate: total > 0 ? Math.round(((p.wins || 0) / total) * 100) : 0,
          };
        })
      );
      setCurrentUser(store.getCurrentUser());
      setLoading(false);
    };

    syncFromStore();

    const revalidateStandings = (force = false) => {
      store.fetchLeaderboardStandings({ force }).then((standings) => {
        if (!isMounted) return;
        const source = standings.length > 0 ? standings : store.getVerifiedProfiles();
        setProfiles(
          source.map((p) => {
            const total =
              (p.wins || 0) + (p.losses || 0) > 0
                ? Math.max(p.matches_played || 0, (p.wins || 0) + (p.losses || 0))
                : p.matches_played || 0;
            return {
              ...p,
              matches_played: total,
              win_rate: total > 0 ? Math.round(((p.wins || 0) / total) * 100) : 0,
            };
          })
        );
        setCurrentUser(store.getCurrentUser());
        setLoading(false);
      });
    };

    revalidateStandings(false);

    const unsub = store.subscribe(() => {
      syncFromStore();
    });

    const handleFocus = () => {
      revalidateStandings(true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        revalidateStandings(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      unsub();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
        (p.racket && p.racket.toLowerCase().includes(q)) ||
        (p.blade_equipment && p.blade_equipment.toLowerCase().includes(q));

      const matchesFaculty = isAllDepartmentsFilter(selectedFaculty)
        ? true
        : matchesDepartmentFilter(p, selectedFaculty);

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
      <div className="relative space-y-7 pb-12">
        <div className="relative rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-6 sm:p-8 overflow-hidden">
          <CourtBackground className="opacity-30" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#070A11]/85 border border-[var(--border-hairline)] text-amber-300 text-[11px] font-semibold uppercase tracking-[0.08em]">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('leaderboard.official_title', 'Rəsmi Universitet Reytinqi')}</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-black uppercase text-white tracking-[-0.02em] leading-tight">
                {t('leaderboard.page_title', 'BANM Canlı ELO Reytinq Cədvəli')}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                {t('leaderboard.page_subtitle', 'Bakı Ali Neft Məktəbinin təsdiqlənmiş masaüstü tennis oyunçularının rəsmi reytinq siyahısı. Dinamik ELO hesablama sistemi (K=32).')}
              </p>
            </div>

            {currentUser && (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#070A11]/85 border border-[var(--border-strong)] shrink-0">
                <div className="w-11 h-11 rounded-lg bg-white/[0.06] border border-[var(--border-hairline)] flex items-center justify-center text-white font-display font-black text-lg">
                  {currentUser.full_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-semibold tracking-[0.08em] text-slate-400">
                      {t('leaderboard.your_rank', 'Sizin Reytinqiniz')}
                    </span>
                    {currentUser.rank && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono tabular-nums font-bold bg-[#E11D48] text-white">
                        #{currentUser.rank}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">{currentUser.full_name}</div>
                  <div className="text-xs font-mono tabular-nums text-slate-400">
                    <strong className="text-white">
                      <AnimatedCounter value={currentUser.current_elo} />
                    </strong>{' '}
                    {t('leaderboard.points_abbr', 'ELO')} • <span className="text-emerald-400">{currentUser.wins}{t('leaderboard.win_abbr', 'Q')}</span> –{' '}
                    <span className="text-rose-400">{currentUser.losses}{t('leaderboard.loss_abbr', 'M')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Players vs Faculties View Switcher */}
        <div className="inline-flex p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <button
            type="button"
            onClick={() => setActiveTab('players')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
              activeTab === 'players'
                ? 'bg-white/[0.11] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t('leaderboard.tab_players', 'Oyunçular')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('faculties')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
              activeTab === 'faculties'
                ? 'bg-white/[0.11] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{t('leaderboard.tab_faculties', 'Fakültələr')}</span>
          </button>
        </div>

        {activeTab === 'faculties' ? (
          <FacultyPowerRankings
            players={profiles}
            loading={loading}
            onSelectFaculty={(facFilter) => {
              setSelectedFaculty(facFilter);
              setActiveTab('players');
            }}
          />
        ) : (
          <>
            {top3Podium.length >= 3 && (() => {
              const wr1 =
                top3Podium[0].matches_played > 0
                  ? Math.round((top3Podium[0].wins / top3Podium[0].matches_played) * 100)
                  : 0;
              const wr2 =
                top3Podium[1].matches_played > 0
                  ? Math.round((top3Podium[1].wins / top3Podium[1].matches_played) * 100)
                  : 0;
              const wr3 =
                top3Podium[2].matches_played > 0
                  ? Math.round((top3Podium[2].wins / top3Podium[2].matches_played) * 100)
                  : 0;

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end pt-5">
                  {/* #2 Silver */}
                  <div className="order-2 md:order-1 relative rounded-2xl border border-slate-400/35 bg-[var(--bg-surface)] p-5 sm:p-6 transition-all duration-200 hover:border-slate-300/65 hover:-translate-y-1 shadow-lg shadow-black/30">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute top-0 inset-x-4 h-[2px] bg-gradient-to-r from-transparent via-slate-300/70 to-transparent"
                    />
                    <div className="h-8 px-3 gap-1.5 rounded-full bg-slate-200 text-slate-950 font-display font-black text-sm leading-none flex items-center justify-center absolute -top-4 left-5 ring-4 ring-[#070A11] z-20">
                      <Medal className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span className="tabular-nums">#2</span>
                    </div>
                    <div className="pt-2 space-y-4">
                      <div>
                        <Link
                          href={getPlayerHref(top3Podium[1].id)}
                          className="block font-display font-extrabold text-xl text-white hover:text-slate-200 transition-colors truncate"
                        >
                          {top3Podium[1].full_name}
                        </Link>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {top3Podium[1].major_faculty || 'BANM'}
                        </p>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="font-display text-3xl font-black text-slate-100 tabular-nums leading-none flex items-baseline gap-1.5">
                          <AnimatedCounter value={top3Podium[1].current_elo} />
                          <span className="text-[11px] font-mono font-semibold text-slate-400 tracking-wider">ELO</span>
                        </div>
                        <span className="font-mono text-xs text-emerald-400 font-semibold tabular-nums">
                          {wr2} {t('leaderboard.win_rate_label')}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full bg-slate-300" style={{ width: `${wr2}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* #1 Championship Gold */}
                  <div className="order-1 md:order-2 md:-translate-y-2 relative rounded-2xl border border-amber-400/55 bg-[var(--bg-surface)] p-6 sm:p-7 transition-all duration-200 hover:border-amber-400/85 hover:-translate-y-1 shadow-2xl shadow-black/50">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute top-0 inset-x-4 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent"
                    />
                    <div className="h-9 min-w-[4.5rem] px-3.5 gap-1.5 rounded-full bg-amber-400 text-slate-950 font-display font-black text-base leading-none flex items-center justify-center absolute -top-[18px] left-1/2 -translate-x-1/2 shadow-md ring-4 ring-[#070A11] z-20">
                      <Crown className="w-4 h-4 stroke-[2.5] shrink-0" />
                      <span className="tabular-nums">#1</span>
                    </div>
                    <div className="pt-3 text-center space-y-3.5">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-amber-400/12 text-amber-300 text-[10px] font-semibold uppercase tracking-[0.08em] mb-2 border border-amber-400/30">
                          {t('leaderboard.leader')}
                        </span>
                        <Link
                          href={getPlayerHref(top3Podium[0].id)}
                          className="block font-display font-black text-2xl sm:text-[1.65rem] text-white hover:text-amber-300 transition-colors tracking-tight"
                        >
                          {top3Podium[0].full_name}
                        </Link>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {top3Podium[0].major_faculty || 'BANM'}
                        </p>
                      </div>
                      <div className="font-display text-4xl sm:text-[2.6rem] font-black text-amber-400 tabular-nums leading-none flex items-baseline justify-center gap-1.5">
                        <AnimatedCounter value={top3Podium[0].current_elo} />
                        <span className="text-xs font-mono font-semibold text-slate-300 tracking-wider">ELO</span>
                      </div>
                      <div className="space-y-2">
                        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${wr1}%` }} />
                        </div>
                        <div className="text-xs font-mono tabular-nums text-emerald-400 font-semibold">
                          {wr1} {t('leaderboard.win_rate_label')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* #3 Bronze */}
                  <div className="order-3 relative rounded-2xl border border-amber-700/45 bg-[var(--bg-surface)] p-5 sm:p-6 transition-all duration-200 hover:border-amber-600/75 hover:-translate-y-1 shadow-lg shadow-black/30">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute top-0 inset-x-4 h-[2px] bg-gradient-to-r from-transparent via-amber-600/75 to-transparent"
                    />
                    <div className="h-8 px-3 gap-1.5 rounded-full bg-amber-700 text-amber-100 border border-amber-500/40 font-display font-black text-sm leading-none flex items-center justify-center absolute -top-4 left-5 ring-4 ring-[#070A11] z-20">
                      <Medal className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span className="tabular-nums">#3</span>
                    </div>
                    <div className="pt-2 space-y-4">
                      <div>
                        <Link
                          href={getPlayerHref(top3Podium[2].id)}
                          className="block font-display font-extrabold text-xl text-white hover:text-amber-300 transition-colors truncate"
                        >
                          {top3Podium[2].full_name}
                        </Link>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {top3Podium[2].major_faculty || 'BANM'}
                        </p>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="font-display text-3xl font-black text-white tabular-nums leading-none flex items-baseline gap-1.5">
                          <AnimatedCounter value={top3Podium[2].current_elo} />
                          <span className="text-[11px] font-mono font-semibold text-slate-400 tracking-wider">ELO</span>
                        </div>
                        <span className="font-mono text-xs text-emerald-400 font-semibold tabular-nums">
                          {wr3} {t('leaderboard.win_rate_label')}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full bg-amber-600" style={{ width: `${wr3}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('leaderboard.search_placeholder')}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="md:col-span-4 relative">
              <SlidersHorizontal className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
              >
                {FACULTIES.map((fac) => (
                  <option key={fac} value={fac} className="bg-[#0D121E] text-white">
                    {fac === 'Hamısı' ? t('leaderboard.all_faculties') : t(`faculties.${fac}`, fac)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 flex p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
              {(['ALL', 'male', 'female'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenderFilter(g)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    genderFilter === g
                      ? 'bg-white/[0.12] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {g === 'ALL' ? t('leaderboard.all') : g === 'male' ? t('leaderboard.male') : t('leaderboard.female')}
                </button>
              ))}
            </div>
          </div>

          <FacultyFilterTabs
            tabs={facultyTabs}
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
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                    active
                      ? 'bg-white/[0.12] text-white border-white/25'
                      : isStaffPill
                      ? 'bg-[var(--bg-surface)] text-blue-300 border-blue-500/25 hover:bg-white/[0.05]'
                      : 'bg-[var(--bg-surface)] text-slate-400 border-[var(--border-hairline)] hover:text-white hover:border-[var(--border-strong)]'
                  }`}
                >
                  {isStaffPill ? (
                    <Briefcase className="w-3.5 h-3.5" />
                  ) : pill.id !== 'ALL' ? (
                    <GraduationCap className="w-3.5 h-3.5" />
                  ) : null}
                  <span className="tabular-nums">{pill.id === 'ALL' ? t('leaderboard.all') : pill.id === 'STAFF' ? t('leaderboard.staff') : pill.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-hidden">
          {loading ? (
            <LeaderboardSkeleton rows={5} />
          ) : filteredProfiles.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-slate-500 mx-auto" />
              <div className="text-sm font-bold text-white">{t('leaderboard.no_players_found')}</div>
              <p className="text-xs text-slate-400">
                {t('leaderboard.no_players_hint')}
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18 }}
            >
              <LeaderboardTable
                players={filteredProfiles}
                currentUser={currentUser}
                departmentFilter={selectedFaculty}
              />
            </motion.div>
          )}
        </div>
          </>
        )}
      </div>
    </SmoothReveal>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BHOSDataStore } from '../../lib/data/store';
import { PlayerProfile } from '../../lib/data/types';
import { getSupabaseClient } from '../../lib/supabase/client';
import SmoothReveal from '../../components/SmoothReveal';
import CourtBackground from '../../components/CourtBackground';
import LeaderboardTable, { isStaffMember } from '../../components/LeaderboardTable';
import AnimatedCounter from '../../components/AnimatedCounter';
import {
  Search,
  Trophy,
  SlidersHorizontal,
  Sparkles,
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
        } catch {}
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

  return (
    <SmoothReveal>
      <div className="relative space-y-8 pb-12">
        <div
          className="relative rounded-2xl bg-[#0F1623]/90 backdrop-blur-md p-6 sm:p-8 shadow-2xl overflow-hidden"
          style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <CourtBackground className="opacity-35" />
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
                    <strong className="text-white">
                      <AnimatedCounter value={currentUser.current_elo} />
                    </strong>{' '}
                    ELO • <span className="text-[#22C55E]">{currentUser.wins}Q</span> -{' '}
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
            {FACULTY_TABS.map((tab) => {
              const active = selectedFaculty === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedFaculty(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                    active
                      ? 'bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/50 shadow-md shadow-blue-500/10'
                      : 'bg-[#0F1623] text-slate-400 border-white/[0.06] hover:text-white hover:border-white/20'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
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

        <div
          className="rounded-2xl bg-[#0F1623]/90 backdrop-blur-md shadow-2xl overflow-hidden"
          style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
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
            <LeaderboardTable players={filteredProfiles} currentUser={currentUser} />
          )}
        </div>
      </div>
    </SmoothReveal>
  );
}

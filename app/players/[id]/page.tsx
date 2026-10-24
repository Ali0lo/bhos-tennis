'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '../../../lib/supabase/client';
import {
  BHOSDataStore,
  fetchPlayerProfile,
  getCachedPlayerProfile,
} from '../../../lib/data/store';
import { PlayerProfile, MatchRecord, isDefaultMember, isAutoApprovedMatch } from '../../../lib/data/types';
import SmoothReveal from '../../../components/SmoothReveal';
import NumberTicker from '../../../components/NumberTicker';
import EditProfileModal from '../../../components/EditProfileModal';
import WhatIfSimulator from '../../../components/WhatIfSimulator';
import HeadToHeadDuel from '../../../components/HeadToHeadDuel';
import PlayerProfileSkeleton from '../../../components/PlayerProfileSkeleton';
import { evaluatePlayerAchievements } from '../../../lib/types/achievements';
import {
  Trophy,
  ArrowLeft,
  ShieldAlert,
  Award,
  Calendar,
  Activity,
  Swords,
  Flame,
  Target,
  Skull,
  Briefcase,
  GraduationCap,
  Edit3,
  Camera,
  Clock,
  CheckCheck,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface ChartPoint {
  date: string;
  elo: number;
  fullDate?: string;
  opponent?: string | null;
  delta?: number;
  score?: string;
  won?: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data: ChartPoint = payload[0].payload;
    return (
      <div className="rounded-xl border border-white/10 bg-[#0F1623] p-3.5 shadow-2xl backdrop-blur-md min-w-[150px]">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
          {data.fullDate || data.date}
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-mono font-black text-white">
            {data.elo}
          </span>
          <span className="text-[11px] font-bold text-[#3B82F6]">XAL</span>
        </div>
        {data.opponent && (
          <div className="mt-2 pt-2 border-t border-white/10 text-xs">
            <span className="text-slate-400">qarşı </span>
            <span className="font-semibold text-white">{data.opponent}</span>
            {data.delta !== undefined && (
              <span
                className={`ml-2 font-mono font-bold ${
                  data.delta >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                }`}
              >
                {data.delta >= 0 ? `+${data.delta}` : data.delta}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function PlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const store = BHOSDataStore.getInstance();
  const rawId = params.id as string;
  const playerId = rawId ? decodeURIComponent(rawId) : '';

  const initialCached = useMemo(() => getCachedPlayerProfile(playerId), [playerId]);

  const [profile, setProfile] = useState<PlayerProfile | null>(
    () => initialCached?.profile ?? null
  );
  const [roster, setRoster] = useState<PlayerProfile[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>(
    () => initialCached?.recent_matches ?? []
  );
  const [dbAchievements, setDbAchievements] = useState<Record<string, string>>(
    () => initialCached?.achievements ?? {}
  );
  const [loading, setLoading] = useState<boolean>(() => !initialCached?.profile);
  const [isMounted, setIsMounted] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<PlayerProfile | null>(
    () => store.getCurrentUser()
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const existingUser = store.getCurrentUser();
    if (existingUser) {
      setCurrentProfile(existingUser);
    }

    const unsub = store.subscribe(() => {
      setCurrentProfile(store.getCurrentUser());
    });

    if (!existingUser) {
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase.auth
          .getSession()
          .then(async ({ data }) => {
            const email = data?.session?.user?.email;
            if (email) {
              const linked = await store.linkProfileByEmail(email);
              if (linked) {
                setCurrentProfile(linked);
              }
            }
          })
          .catch(() => {});
      }
    }

    return unsub;
  }, [store]);

  const isOwnProfile = useMemo(() => {
    if (!currentProfile || !profile) return false;
    return (
      currentProfile.id === profile.id ||
      (Boolean(currentProfile.email) &&
        Boolean(profile.email) &&
        currentProfile.email.toLowerCase() === profile.email.toLowerCase())
    );
  }, [currentProfile, profile]);

  useEffect(() => {
    if (!isOwnProfile) return;
    let active = true;
    const timer = setTimeout(() => {
      if (!active) return;
      const cachedStandings = store.getCachedLeaderboard();
      if (cachedStandings.length > 0) {
        setRoster(cachedStandings);
      }
      void store.fetchLeaderboardStandings().then((standings) => {
        if (active && standings.length > 0) {
          setRoster(standings);
        }
      });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOwnProfile, store]);

  const isLoggedIn = Boolean(currentProfile?.id);

  const canEditProfile = useMemo(() => {
    if (!currentProfile || !profile) return false;
    return isOwnProfile || currentProfile.role === 'president';
  }, [currentProfile, profile, isOwnProfile]);

  const fetchPlayerData = async (force = false) => {
    if (!playerId) return;

    try {
      const summary = await fetchPlayerProfile(playerId, { force });
      if (!summary.profile || summary.profile.is_verified === false) {
        setProfile(null);
        setMatches([]);
        setLoading(false);
        return;
      }

      setProfile(summary.profile);
      setMatches(summary.recent_matches);
      setDbAchievements(summary.achievements || {});
      setLoading(false);

      const supabase = getSupabaseClient();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        summary.profile.id
      );
      if (supabase && isUuid) {
        const evaluated = evaluatePlayerAchievements(
          summary.profile,
          summary.recent_matches,
          summary.achievements || {}
        );
        const newlyUnlocked = evaluated.filter(
          (b) => b.unlocked && !(summary.achievements && summary.achievements[b.id])
        );
        if (newlyUnlocked.length > 0) {
          void supabase
            .from('profile_achievements')
            .upsert(
              newlyUnlocked.map((b) => ({
                profile_id: summary.profile!.id,
                badge_id: b.id,
                unlocked_at: b.unlockedAt || new Date().toISOString(),
              })),
              { onConflict: 'profile_id,badge_id', ignoreDuplicates: true }
            )
            .then(() => {});
        }
      }
    } catch {
      setProfile(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = getCachedPlayerProfile(playerId);
    if (cached?.profile) {
      setProfile(cached.profile);
      setMatches(cached.recent_matches);
      setDbAchievements(cached.achievements || {});
      setLoading(false);
    } else {
      setLoading(true);
    }

    void fetchPlayerData(false);

    const supabase = getSupabaseClient();
    let channel: any = null;
    if (supabase) {
      channel = supabase
        .channel(`player-detail-${playerId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches' },
          () => {
            void fetchPlayerData(true);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${playerId}` },
          () => {
            void fetchPlayerData(true);
          }
        )
        .subscribe();
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [playerId]);

  const validMatches = useMemo(() => {
    return matches.filter((m) => m.status === 'confirmed' || !m.status);
  }, [matches]);

  const achievements = useMemo(() => {
    if (!profile) return [];
    return evaluatePlayerAchievements(profile, validMatches, dbAchievements);
  }, [profile, validMatches, dbAchievements]);

  const unlockedCount = useMemo(() => {
    return achievements.filter((a) => a.unlocked).length;
  }, [achievements]);

  const chartData: ChartPoint[] = useMemo(() => {
    if (!profile) return [];

    let baselineElo = 0;

    if (validMatches.length === 0) {
      return [
        {
          date: 'Başlanğıc',
          elo: baselineElo,
          fullDate: 'İlkin Qeydiyyat',
          opponent: null,
        },
        {
          date: 'Hazırkı',
          elo: profile.current_elo,
          fullDate: 'Hazırkı Aktiv Reytinq',
          opponent: null,
        },
      ];
    }

    const firstMatch = validMatches[0];
    const isFirstP1 =
      firstMatch.player1_id === playerId ||
      firstMatch.player1_id === profile.id ||
      (profile.full_name
        ? firstMatch.player1_name?.trim().toLowerCase() === profile.full_name.trim().toLowerCase()
        : false);
    const firstEloBefore = isFirstP1
      ? firstMatch.player1_elo_before
      : firstMatch.player2_elo_before;

    const initialElo =
      typeof firstEloBefore === 'number' && !isNaN(firstEloBefore)
        ? firstEloBefore
        : baselineElo;

    const points: ChartPoint[] = [
      {
        date: 'Başlanğıc',
        elo: initialElo,
        fullDate: 'İlkin Reytinq',
        opponent: null,
      },
    ];

    validMatches.forEach((m, idx) => {
      const isPlayer1 =
        m.player1_id === playerId ||
        m.player1_id === profile.id ||
        (profile.full_name
          ? m.player1_name?.trim().toLowerCase() === profile.full_name.trim().toLowerCase()
          : false);
      const eloAfter = isPlayer1 ? m.player1_elo_after : m.player2_elo_after;
      const opponentName = isPlayer1 ? (m.player2_name || 'Rəqib') : (m.player1_name || 'Rəqib');
      const won = isPlayer1
        ? m.player1_score > m.player2_score
        : m.player2_score > m.player1_score;
      const delta = isPlayer1 ? m.elo_delta : -m.elo_delta;

      const dateObj = new Date(m.match_date);
      const formattedDate = isNaN(dateObj.getTime())
        ? `M${idx + 1}`
        : dateObj.toLocaleDateString('az-AZ', { month: 'short', day: 'numeric' });

      points.push({
        date: formattedDate,
        elo: eloAfter,
        fullDate: isNaN(dateObj.getTime()) ? m.match_date : dateObj.toLocaleDateString(),
        opponent: opponentName,
        delta,
        score: `${m.player1_score}-${m.player2_score}`,
        won,
      });
    });

    return points;
  }, [profile, validMatches, playerId]);

  const minElo = useMemo(() => {
    if (!chartData.length) return 0;
    const values = chartData.map((d) => d.elo);
    const min = Math.max(0, Math.min(...values) - 40);
    return Math.floor(min / 50) * 50;
  }, [chartData]);

  const maxElo = useMemo(() => {
    if (!chartData.length) return 100;
    const values = chartData.map((d) => d.elo);
    const max = Math.max(...values) + 40;
    return Math.ceil(max / 50) * 50;
  }, [chartData]);

  const peakElo = useMemo(() => {
    if (!profile) return 0;
    if (!validMatches.length) return profile.current_elo;
    const elos = validMatches.map((m) => {
      const isPlayer1 =
        m.player1_id === playerId ||
        m.player1_id === profile.id ||
        (profile.full_name
          ? m.player1_name?.trim().toLowerCase() === profile.full_name.trim().toLowerCase()
          : false);
      return isPlayer1 ? m.player1_elo_after : m.player2_elo_after;
    });
    return Math.max(profile.current_elo, ...elos, 0);
  }, [profile, validMatches, playerId]);

  const actualWins = useMemo(() => {
    return matches.filter((m) => {
      const isP1 =
        m.player1_id === playerId ||
        m.player1_id === profile?.id ||
        (profile?.full_name
          ? m.player1_name?.trim().toLowerCase() === profile.full_name.trim().toLowerCase()
          : false);
      return isP1 ? m.player1_score > m.player2_score : m.player2_score > m.player1_score;
    }).length;
  }, [matches, playerId, profile]);

  const totalMatchesCount = Math.max(profile?.matches_played || 0, matches.length);
  const effectiveWins = Math.max(profile?.wins || 0, actualWins);
  const winRatePercent =
    totalMatchesCount > 0
      ? Math.round((effectiveWins / totalMatchesCount) * 100)
      : 0;

  const rivalries = useMemo(() => {
    if (!validMatches.length) return [];

    const statsMap: Record<
      string,
      {
        opponentId: string;
        opponentName: string;
        totalEncounters: number;
        wins: number;
        losses: number;
      }
    > = {};

    validMatches.forEach((m) => {
      const isP1 =
        m.player1_id === playerId ||
        m.player1_id === profile?.id ||
        (profile?.full_name
          ? m.player1_name?.trim().toLowerCase() === profile.full_name.trim().toLowerCase()
          : false);
      const oppId = isP1 ? m.player2_id : m.player1_id;
      const oppName = isP1
        ? m.player2_name || 'Rəqib'
        : m.player1_name || 'Rəqib';
      const won = isP1
        ? m.player1_score > m.player2_score
        : m.player2_score > m.player1_score;

      if (!statsMap[oppId]) {
        statsMap[oppId] = {
          opponentId: oppId,
          opponentName: oppName,
          totalEncounters: 0,
          wins: 0,
          losses: 0,
        };
      }

      statsMap[oppId].totalEncounters += 1;
      if (won) statsMap[oppId].wins += 1;
      else statsMap[oppId].losses += 1;
    });

    const list = Object.values(statsMap).map((r) => ({
      ...r,
      winRate: Math.round((r.wins / r.totalEncounters) * 100),
    }));

    list.sort((a, b) => b.totalEncounters - a.totalEncounters);

    let maxLosses = 0;
    let nemesisId: string | null = null;
    let maxWins = 0;
    let topTargetId: string | null = null;

    list.forEach((r) => {
      if (r.losses > maxLosses) {
        maxLosses = r.losses;
        nemesisId = r.opponentId;
      }
      if (r.wins > maxWins) {
        maxWins = r.wins;
        topTargetId = r.opponentId;
      }
    });

    return list.map((r) => ({
      ...r,
      isNemesis: r.losses > 0 && r.opponentId === nemesisId,
      isTopTarget: r.wins > 0 && r.opponentId === topTargetId && r.opponentId !== nemesisId,
      isFavorable: r.winRate >= 60 && r.totalEncounters >= 2,
    }));
  }, [validMatches, playerId, profile]);

  const recentMatchesFeed = useMemo(() => {
    return [...matches].sort(
      (a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
    );
  }, [matches]);

  if (loading) {
    return <PlayerProfileSkeleton />;
  }

  if (!profile || profile.is_verified === false) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4 shadow-lg shadow-red-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-display font-black text-white mb-2">Oyunçu Tapılmadı</h1>
        <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          Axtarılan oyunçu mövcud deyil və ya hesabı hazırda rəsmi Admin təsdiqi gözləyir.
        </p>
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold text-xs transition shadow-lg shadow-blue-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Reytinq Cədvəlinə Qayıt</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Reytinqə Qayıt</span>
        </button>
      </div>

      <SmoothReveal delay={0.05}>
        <div className="rounded-3xl border border-white/10 bg-[#0F1623] p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="relative group shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-white/10 shadow-xl"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] flex items-center justify-center text-white font-display font-black text-3xl sm:text-4xl shadow-xl shadow-blue-500/20 border-2 border-white/10">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                {canEditProfile && (
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition rounded-2xl flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1 cursor-pointer"
                    title="Şəkli dəyiş"
                  >
                    <Camera className="w-4 h-4 text-cyan-400" />
                    <span>Dəyiş</span>
                  </button>
                )}
                {profile.role === 'coach' && (
                  <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-1 rounded-lg border-2 border-[#0F1623] shadow-md pointer-events-none">
                    <Award className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
                    {profile.full_name}
                  </h1>

                  {canEditProfile && (
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-[#3B82F6]/15 hover:bg-[#3B82F6]/25 text-[#3B82F6] hover:text-blue-300 border border-[#3B82F6]/30 transition shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Profili Redaktə Et</span>
                    </button>
                  )}

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                      profile.role === 'coach'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : profile.role === 'president'
                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                        : 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30'
                    }`}
                  >
                    {profile.role === 'president' ? 'Prezident' : profile.role === 'coach' ? 'Məşqçi' : 'Oyunçu'}
                  </span>

                  {(!profile.admission_year || profile.user_type === 'teacher' || profile.user_type === 'staff' || profile.role === 'coach') ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      <Briefcase className="w-3 h-3" />
                      <span>Müəllim / Əməkdaş</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      <GraduationCap className="w-3 h-3" />
                      <span>Tələbə • {profile.admission_year}</span>
                    </span>
                  )}

                  {profile.playing_level && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {profile.playing_level === 'Beginner' ? 'Başlanğıc' : profile.playing_level === 'Intermediate' ? 'Orta' : profile.playing_level === 'Advanced' ? 'Yüksək' : profile.playing_level}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  {(!profile.admission_year || profile.user_type === 'teacher' || profile.user_type === 'staff' || profile.role === 'coach')
                    ? `${profile.major_faculty || 'İdman Klubu'} • ${profile.user_type === 'staff' ? 'Əməkdaş' : 'Müəllim'}`
                    : `${profile.major_faculty || 'Mühəndislik Fakültəsi'} • ${profile.admission_year} Qəbul ili`}
                </p>
                <div className="flex items-center gap-2.5 text-xs text-slate-400 font-medium flex-wrap pt-0.5">
                  <span className="text-xs text-slate-500 font-mono">{profile.email}</span>
                  {profile.created_at && (
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>
                        Qoşulub: {new Date(profile.created_at).toLocaleDateString('az-AZ', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </span>
                  )}
                  {isDefaultMember(profile.id, profile.email) ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">
                      İlkin Heyət
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                      Rəsmi Qeydiyyat
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#131C2B] border border-white/10 text-center min-w-[140px] shadow-lg">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Rəsmi ELO
              </span>
              <div className="text-3xl font-mono font-black text-[#3B82F6] flex items-center justify-center gap-1">
                <NumberTicker value={profile.current_elo} />
              </div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                BANM Təsdiqli
              </span>
            </div>
          </div>
        </div>
      </SmoothReveal>

      <SmoothReveal delay={0.1}>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#0F1623] p-5 backdrop-blur-md shadow-xl hover:border-white/20 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Hazırkı ELO
              </span>
              <Activity className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-white">
              <NumberTicker value={profile.current_elo} />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Canlı portal reytinqi</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0F1623] p-5 backdrop-blur-md shadow-xl hover:border-white/20 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Zirvə ELO
              </span>
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-amber-400">
              <NumberTicker value={peakElo} />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Tarixin ən yüksək xalı</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0F1623] p-5 backdrop-blur-md shadow-xl hover:border-white/20 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Ümumi Oyunlar
              </span>
              <Swords className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-white">
              <NumberTicker value={totalMatchesCount} />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {profile.wins}Q - {profile.losses}M Nəticə
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0F1623] p-5 backdrop-blur-md shadow-xl hover:border-white/20 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Qələbə faizi
              </span>
              <Flame className="w-4 h-4 text-[#22C55E]" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-[#22C55E]">
              <NumberTicker value={winRatePercent} suffix="%" />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Rəsmi oyun nisbəti</p>
          </div>

          <div className="col-span-2 lg:col-span-1 rounded-2xl border border-white/10 bg-[#0F1623] p-5 backdrop-blur-md shadow-xl hover:border-white/20 transition">
            {(!profile.admission_year || profile.user_type === 'teacher' || profile.user_type === 'staff' || profile.role === 'coach') ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                    Status / Vəzifə
                  </span>
                  <Briefcase className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-xl sm:text-2xl font-display font-black text-indigo-300">
                  {profile.user_type === 'staff' ? 'Əməkdaş' : 'Müəllim'}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 truncate">
                  {profile.major_faculty || 'BANM Heyəti'}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                    Qəbul İli
                  </span>
                  <GraduationCap className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-black text-cyan-400">
                  {profile.admission_year}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 truncate">
                  {profile.major_faculty || 'Tələbə'}
                </p>
              </>
            )}
          </div>
        </div>
      </SmoothReveal>

      <SmoothReveal delay={0.11}>
        <div className="rounded-2xl border border-white/10 bg-[#0F1623] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EAB308]/15 border border-[#EAB308]/30 flex items-center justify-center text-[#EAB308]">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-white">
                  Nailiyyətlər və Nişanlar
                </h3>
                <p className="text-[11px] text-slate-400">
                  Rəsmi matç nəticələri ilə avtomatik qazanılan klub mükafatları
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#131C2B] text-[#EAB308] border border-[#EAB308]/30">
              {unlockedCount} / {achievements.length} Aktiv
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {achievements.map((badge) => {
              const isGold = badge.accentColor === 'gold';
              const unlockedBorder = isGold
                ? 'border-[#EAB308]/30 shadow-[0_0_22px_rgba(234,179,8,0.16)] bg-gradient-to-br from-[#131C2B] to-[#0F1623]'
                : 'border-[#3B82F6]/30 shadow-[0_0_22px_rgba(59,130,246,0.16)] bg-gradient-to-br from-[#131C2B] to-[#0F1623]';

              return (
                <div
                  key={badge.id}
                  title={`Şərt: ${badge.descriptionAz}`}
                  className={`group relative rounded-xl p-4 border transition-all duration-200 ${
                    badge.unlocked
                      ? unlockedBorder
                      : 'border-white/[0.06] bg-[#080D16]/80 opacity-60 hover:opacity-85'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 border ${
                          badge.unlocked
                            ? isGold
                              ? 'bg-[#EAB308]/15 border-[#EAB308]/40 shadow-[0_0_14px_rgba(234,179,8,0.25)]'
                              : 'bg-[#3B82F6]/15 border-[#3B82F6]/40 shadow-[0_0_14px_rgba(59,130,246,0.25)]'
                            : 'bg-[#131C2B] border-white/10 grayscale'
                        }`}
                      >
                        <span>{badge.emoji}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-display font-bold text-white truncate">
                            {badge.titleAz}
                          </h4>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400 block">
                          {badge.titleEn}
                        </span>
                      </div>
                    </div>

                    {badge.unlocked ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          isGold
                            ? 'bg-[#EAB308]/15 text-[#EAB308] border border-[#EAB308]/30'
                            : 'bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Qazanılıb
                      </span>
                    ) : (
                      <span
                        title={badge.descriptionAz}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-slate-400 border border-white/10 shrink-0"
                      >
                        <Lock className="w-3 h-3 text-slate-400" />
                        Kilidli
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                    {badge.descriptionAz}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </SmoothReveal>

      <SmoothReveal delay={0.12}>
        {isOwnProfile ? (
          <WhatIfSimulator athlete={profile} roster={roster} />
        ) : isLoggedIn && currentProfile ? (
          <HeadToHeadDuel currentUser={currentProfile} targetPlayer={profile} />
        ) : (
          <div className="p-6 rounded-2xl bg-[#0F1623] border border-white/5 text-center">
            <p className="text-sm text-slate-400 mb-3">
              Bu oyunçu ilə potensial ELO dəyişikliklərini görmək və meydan oxumaq üçün daxil olun.
            </p>
            <Link
              className="inline-flex items-center px-4 py-2 rounded-xl bg-[#131C2B] hover:bg-[#1A263B] text-blue-400 text-sm font-semibold border border-blue-500/20 transition-colors"
              href="/login"
            >
              Giriş Edin &rarr;
            </Link>
          </div>
        )}
      </SmoothReveal>

      <SmoothReveal delay={0.15}>
        <div className="rounded-2xl border border-white/10 bg-[#0F1623] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-[#3B82F6]" />
              <h3 className="text-base font-display font-bold text-white">
                Üzbəüz Rəqabətlər
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {rivalries.length} Rəqiblə Qarşılaşma
            </span>
          </div>

          {rivalries.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#131C2B] border border-white/5 text-center text-xs text-slate-500">
              Bu oyunçu üçün üzbəüz oyun qeydləri tapılmadı.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rivalries.map((rival) => {
                const cardBorderClass = rival.isNemesis
                  ? 'border-[#EF4444]/60 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                  : rival.isFavorable
                  ? 'border-[#22C55E]/60 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                  : rival.isTopTarget
                  ? 'border-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.15)]'
                  : 'border-white/10 hover:border-white/20 shadow-xl';

                return (
                  <div
                    key={rival.opponentId}
                    className={`rounded-2xl bg-[#0F1623] p-4.5 border backdrop-blur-md transition-all duration-300 flex flex-col justify-between gap-3.5 ${cardBorderClass}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/players/${rival.opponentId}`}
                          className="font-bold text-white text-sm hover:text-[#3B82F6] transition truncate block"
                        >
                          {rival.opponentName}
                        </Link>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {rival.totalEncounters} oyun
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                        {rival.isNemesis && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                            <Skull className="w-3 h-3" />
                            <span>Əsas Rəqib</span>
                          </span>
                        )}
                        {rival.isTopTarget && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/15 text-amber-300 border border-amber-400/30">
                            <Target className="w-3 h-3" />
                            <span>Ən Çox Məğlub Etdiyi</span>
                          </span>
                        )}
                        {!rival.isNemesis && !rival.isTopTarget && rival.isFavorable && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                            <span>Müsbət Balans</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#131C2B] border border-white/5 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                        Üzbəüz Hesab
                      </span>
                      <span className="text-base font-mono font-black text-white">
                        <span className="text-[#22C55E]">{rival.wins}</span>
                        <span className="text-slate-500 mx-2">-</span>
                        <span className="text-[#EF4444]">{rival.losses}</span>
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Qələbə faizi</span>
                        <span
                          className={`font-bold ${
                            rival.isNemesis
                              ? 'text-[#EF4444]'
                              : rival.isFavorable
                              ? 'text-[#22C55E]'
                              : 'text-white'
                          }`}
                        >
                          {rival.winRate}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#131C2B] overflow-hidden border border-white/5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            rival.isNemesis
                              ? 'bg-[#EF4444]'
                              : rival.isFavorable
                              ? 'bg-[#22C55E]'
                              : 'bg-[#3B82F6]'
                          }`}
                          style={{ width: `${rival.winRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SmoothReveal>

      <SmoothReveal delay={0.2}>
        <div className="rounded-2xl border border-white/10 bg-[#0F1623] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#3B82F6]" />
              <h3 className="text-base font-display font-bold text-white">
                ELO Reytinq Dinamikası
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {chartData.length} Məlumat Nöqtəsi
            </span>
          </div>

          <div className="w-full h-72 sm:h-80 pt-2">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="#ffffff10"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#ffffff10' }}
                  />
                  <YAxis
                    stroke="#64748B"
                    fontSize={11}
                    domain={[minElo, maxElo]}
                    tickLine={false}
                    axisLine={{ stroke: '#ffffff10' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="elo"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{
                      fill: '#3B82F6',
                      strokeWidth: 2,
                      r: 4,
                      stroke: '#080D16',
                    }}
                    activeDot={{
                      r: 6,
                      fill: '#60A5FA',
                      stroke: '#ffffff',
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Göstəricilər yüklənir...
              </div>
            )}
          </div>
        </div>
      </SmoothReveal>

      <SmoothReveal delay={0.25}>
        <div className="rounded-2xl border border-white/10 bg-[#0F1623] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#3B82F6]" />
              <h3 className="text-base font-display font-bold text-white">
                Oyun Tarixçəsi və Nəticələr
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {recentMatchesFeed.length} Qeydə Alınmış Oyun
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1 divide-y divide-transparent">
            {recentMatchesFeed.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#131C2B] border border-white/5 text-center text-xs text-slate-500">
                Bu oyunçu üçün hələ rəsmi oyun qeydə alınmayıb.
              </div>
            ) : (
              recentMatchesFeed.map((m) => {
                const isPlayer1 =
                  m.player1_id === playerId ||
                  m.player1_id === profile?.id ||
                  (profile?.full_name
                    ? m.player1_name?.trim().toLowerCase() === profile.full_name.trim().toLowerCase()
                    : false);
                const opponentName = isPlayer1
                  ? (m.player2_name || 'Rəqib')
                  : (m.player1_name || 'Rəqib');
                const opponentId = isPlayer1 ? m.player2_id : m.player1_id;
                const myScore = isPlayer1 ? m.player1_score : m.player2_score;
                const opScore = isPlayer1 ? m.player2_score : m.player1_score;
                const won = myScore > opScore;
                const isPending = m.status === 'pending';
                const delta = isPlayer1 ? m.elo_delta : -m.elo_delta;
                const absDelta = Math.abs(delta);

                return (
                  <div
                    key={m.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-[#131C2B] border border-white/5 hover:border-white/15 transition"
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`inline-flex items-center justify-center min-w-[70px] px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          isPending
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : won
                            ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
                            : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                        }`}
                      >
                        {isPending ? 'TƏSDİQ GÖZLƏYİR' : won ? 'QƏLƏBƏ' : 'MƏĞLUBİYYƏT'}
                      </span>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-400">qarşı</span>
                          <Link
                            href={`/players/${opponentId}`}
                            className="text-sm font-bold text-white hover:text-[#3B82F6] transition"
                          >
                            {opponentName}
                          </Link>
                          {!isPending && (
                            isAutoApprovedMatch(m) ? (
                              <span
                                title="Rəqib 48 saat ərzində təsdiqləmədiyi üçün avtomatik təsdiqlənib"
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              >
                                <Clock className="w-3 h-3" />
                                <span>Avto-təsdiq (48 saat)</span>
                              </span>
                            ) : (
                              <span
                                title="Oyunçu tərəfindən rəsmi təsdiqlənib"
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/25"
                              >
                                <CheckCheck className="w-3 h-3" />
                                <span>Təsdiqlənib</span>
                              </span>
                            )
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {new Date(m.match_date).toLocaleDateString('az-AZ', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <div className="text-left sm:text-right">
                        <div className="text-sm font-mono font-bold text-white">
                          {myScore} <span className="text-slate-500">-</span> {opScore}
                        </div>
                        {m.set_scores && (
                          <div className="text-[11px] font-mono text-slate-400">
                            {m.set_scores}
                          </div>
                        )}
                      </div>

                      <div className="text-right min-w-[60px]">
                        {isPending ? (
                          <span className="font-mono text-xs font-semibold text-amber-400">
                            Gözləmədə
                          </span>
                        ) : (
                          <>
                            <span
                              className={`font-mono text-sm font-black ${
                                won ? 'text-[#22C55E]' : 'text-[#EF4444]'
                              }`}
                            >
                              {won ? `+${absDelta}` : `-${absDelta}`}
                            </span>
                            <span className="block text-[9px] uppercase font-bold text-slate-500">
                              XAL
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </SmoothReveal>

      {profile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={profile}
          onProfileUpdated={(updated) => {
            setProfile(updated);
          }}
        />
      )}
    </div>
  );
}

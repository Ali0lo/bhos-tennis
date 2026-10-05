'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '../../../lib/supabase/client';
import { BHOSDataStore } from '../../../lib/data/store';
import { PlayerProfile, MatchRecord } from '../../../lib/data/types';
import SmoothReveal from '../../../components/SmoothReveal';
import NumberTicker from '../../../components/NumberTicker';
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

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchPlayerData = async () => {
    if (!playerId) return;

    try {
      let fetchedProfile: PlayerProfile | null = null;
      const supabase = getSupabaseClient();

      if (supabase) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', playerId)
          .single();

        if (!error && data) {
          fetchedProfile = data as PlayerProfile;
        }
      }

      if (!fetchedProfile) {
        const local = store.getProfile(playerId);
        if (local) fetchedProfile = local;
      }

      if (!fetchedProfile || fetchedProfile.is_verified === false) {
        setProfile(null);
        setMatches([]);
        setLoading(false);
        return;
      }

      setProfile(fetchedProfile);

      let fetchedMatches: MatchRecord[] = [];

      if (supabase) {
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('*')
          .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
          .order('match_date', { ascending: true });

        if (!matchError && matchData) {
          fetchedMatches = matchData as MatchRecord[];
        }
      }

      if (fetchedMatches.length === 0) {
        const localMatches = store.getPlayerMatches(playerId).sort(
          (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
        );
        if (localMatches.length > 0) {
          fetchedMatches = localMatches;
        }
      }

      setMatches(fetchedMatches);
    } catch (err) {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchPlayerData();

    const supabase = getSupabaseClient();
    let channel: any = null;
    if (supabase) {
      channel = supabase
        .channel(`player-detail-${playerId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches' },
          () => fetchPlayerData()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${playerId}` },
          () => fetchPlayerData()
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

  const chartData: ChartPoint[] = useMemo(() => {
    if (!profile) return [];

    let baselineElo = 0;
    if (profile.playing_level === 'Advanced') baselineElo = 1000;
    else if (profile.playing_level === 'Intermediate') baselineElo = 500;

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
    const firstEloBefore =
      firstMatch.player1_id === playerId
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
      const isPlayer1 = m.player1_id === playerId;
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
    if (!chartData.length) return 1500;
    const values = chartData.map((d) => d.elo);
    const max = Math.max(...values) + 40;
    return Math.ceil(max / 50) * 50;
  }, [chartData]);

  const peakElo = useMemo(() => {
    if (!profile) return 0;
    if (!validMatches.length) return profile.current_elo;
    const elos = validMatches.map((m) =>
      m.player1_id === playerId ? m.player1_elo_after : m.player2_elo_after
    );
    return Math.max(profile.current_elo, ...elos, 0);
  }, [profile, validMatches, playerId]);

  const totalMatchesCount = profile?.matches_played || 0;
  const winRatePercent =
    totalMatchesCount > 0
      ? Math.round(((profile?.wins || 0) / totalMatchesCount) * 100)
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
      const isP1 = m.player1_id === playerId;
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
  }, [validMatches, playerId]);

  const recentMatchesFeed = useMemo(() => {
    return [...validMatches].reverse();
  }, [validMatches]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-8">
        <div className="h-6 w-24 bg-white/5 rounded animate-pulse" />
        <div className="h-44 w-full bg-[#0F1623] border border-white/10 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-[#0F1623] border border-white/10 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-[#0F1623] border border-white/10 rounded-2xl animate-pulse" />
      </div>
    );
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
              <div className="relative">
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
                {profile.role === 'coach' && (
                  <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-1 rounded-lg border-2 border-[#0F1623] shadow-md">
                    <Award className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
                    {profile.full_name}
                  </h1>

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

                  {profile.playing_level && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {profile.playing_level === 'Beginner' ? 'Başlanğıc' : profile.playing_level === 'Intermediate' ? 'Orta' : profile.playing_level === 'Advanced' ? 'Yüksək' : profile.playing_level}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  {profile.major_faculty || 'Mühəndislik Fakültəsi'} • {profile.admission_year || 2024} Qəbul ili
                </p>
                <p className="text-xs text-slate-500 font-mono">{profile.email}</p>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
        </div>
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
                const isPlayer1 = m.player1_id === playerId;
                const opponentName = isPlayer1
                  ? (m.player2_name || 'Rəqib')
                  : (m.player1_name || 'Rəqib');
                const opponentId = isPlayer1 ? m.player2_id : m.player1_id;
                const myScore = isPlayer1 ? m.player1_score : m.player2_score;
                const opScore = isPlayer1 ? m.player2_score : m.player1_score;
                const won = myScore > opScore;
                const delta = isPlayer1 ? m.elo_delta : -m.elo_delta;
                const absDelta = Math.abs(delta);

                return (
                  <div
                    key={m.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-[#131C2B] border border-white/5 hover:border-white/15 transition"
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`inline-flex items-center justify-center w-14 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          won
                            ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
                            : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                        }`}
                      >
                        {won ? 'QƏLƏBƏ' : 'MƏĞLUBİYYƏT'}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">qarşı</span>
                          <Link
                            href={`/players/${opponentId}`}
                            className="text-sm font-bold text-white hover:text-[#3B82F6] transition"
                          >
                            {opponentName}
                          </Link>
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
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </SmoothReveal>
    </div>
  );
}

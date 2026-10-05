'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase/client';
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

// Custom dark-mode Tooltip component with #0F1623 background and subtle border
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
          <span className="text-[11px] font-bold text-[#3B82F6]">PTS</span>
        </div>
        {data.opponent && (
          <div className="mt-2 pt-2 border-t border-white/10 text-xs">
            <span className="text-slate-400">vs </span>
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
  const playerId = (params.id as string) ? decodeURIComponent(params.id as string) : '';

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Main data fetching logic from Supabase
  const fetchPlayerData = async () => {
    if (!playerId) return;

    try {
      let fetchedProfile: PlayerProfile | null = null;

      // 1. Fetch Profile from profiles table
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

      // Local store fallback if offline or not found in cloud
      if (!fetchedProfile) {
        const local = store.getProfile(playerId);
        if (local) fetchedProfile = local;
      }

      // 404 Check: Handle if player not found or is_verified is false
      if (!fetchedProfile || fetchedProfile.is_verified === false) {
        setProfile(null);
        setMatches([]);
        setLoading(false);
        return;
      }

      setProfile(fetchedProfile);

      // 2. Fetch all matches where player is player1_id or player2_id ordered by match_date ASC
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

      // Fallback to local store matches if none returned
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
      console.error('Error fetching player profile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchPlayerData();

    // Set up Realtime subscription on matches and profiles table
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

  // Transform raw match data into chronological time-series array for Recharts
  const chartData: ChartPoint[] = useMemo(() => {
    if (!profile) return [];

    // Determine baseline ELO according to playing level
    let baselineElo = 0;
    if (profile.playing_level === 'Advanced') baselineElo = 1000;
    else if (profile.playing_level === 'Intermediate') baselineElo = 500;

    if (matches.length === 0) {
      return [
        {
          date: 'Baseline',
          elo: baselineElo,
          fullDate: 'Initial Registration',
          opponent: null,
        },
        {
          date: 'Current',
          elo: profile.current_elo,
          fullDate: 'Current Active Rating',
          opponent: null,
        },
      ];
    }

    // Match 0 starting ELO
    const firstMatch = matches[0];
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
        date: 'Start',
        elo: initialElo,
        fullDate: 'Initial Rating Baseline',
        opponent: null,
      },
    ];

    matches.forEach((m, idx) => {
      const isPlayer1 = m.player1_id === playerId;
      const eloAfter = isPlayer1 ? m.player1_elo_after : m.player2_elo_after;
      const opponentName = isPlayer1 ? (m.player2_name || 'Opponent') : (m.player1_name || 'Opponent');
      const won = isPlayer1
        ? m.player1_score > m.player2_score
        : m.player2_score > m.player1_score;
      const delta = isPlayer1 ? m.elo_delta : -m.elo_delta;

      const dateObj = new Date(m.match_date);
      const formattedDate = isNaN(dateObj.getTime())
        ? `M${idx + 1}`
        : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      points.push({
        date: formattedDate,
        elo: eloAfter,
        fullDate: isNaN(dateObj.getTime()) ? `Match ${idx + 1}` : dateObj.toLocaleDateString(),
        opponent: opponentName,
        delta: won ? Math.abs(delta) : -Math.abs(delta),
        score: `${m.player1_score} - ${m.player2_score}`,
        won,
      });
    });

    return points;
  }, [profile, matches, playerId]);

  // Dynamic Y-Axis scale domain
  const { minElo, maxElo } = useMemo(() => {
    if (chartData.length === 0) return { minElo: 0, maxElo: 1000 };
    const values = chartData.map((d) => d.elo);
    const min = Math.max(0, Math.min(...values) - 40);
    const max = Math.max(...values) + 40;
    return { minElo: min, maxElo: max };
  }, [chartData]);

  // Peak ELO calculated from chart data and current rating
  const peakElo = useMemo(() => {
    if (!profile) return 0;
    const elos = chartData.map((d) => d.elo);
    return Math.max(profile.current_elo, ...elos, 0);
  }, [profile, chartData]);

  // Total matches & win rate
  const totalMatchesCount = profile ? (profile.matches_played || matches.length || 0) : 0;
  const winRatePercent = useMemo(() => {
    if (!profile || totalMatchesCount === 0) return 0;
    return Math.round((profile.wins / totalMatchesCount) * 100);
  }, [profile, totalMatchesCount]);

  // Recent matches feed (reverse chronological: newest first)
  const recentMatchesFeed = useMemo(() => {
    return [...matches].reverse();
  }, [matches]);

  // Loading Skeleton State
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

  // 404 Not Found or Unverified Player Screen
  if (!profile || profile.is_verified === false) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4 shadow-lg shadow-red-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-display font-black text-white mb-2">Player Not Found</h1>
        <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          The requested player does not exist, or their membership is currently pending official Admin verification.
        </p>
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold text-xs transition shadow-lg shadow-blue-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Leaderboard</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Rankings</span>
        </button>
      </div>

      {/* SECTION 1: HEADER BANNER (SmoothReveal) */}
      <SmoothReveal delay={0.05}>
        <div className="rounded-3xl border border-white/10 bg-[#0F1623] p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              {/* Player Avatar with Fallback */}
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

              {/* Player Info */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
                    {profile.full_name}
                  </h1>

                  {/* Role Badge */}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                      profile.role === 'coach'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : profile.role === 'president'
                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                        : 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30'
                    }`}
                  >
                    {profile.role}
                  </span>

                  {/* Playing Level Badge */}
                  {profile.playing_level && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {profile.playing_level}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  {profile.major_faculty || 'Faculty of Engineering'} • Class of {profile.admission_year || 2024}
                </p>
                <p className="text-xs text-slate-500 font-mono">{profile.email}</p>
              </div>
            </div>

            {/* Current ELO Showcase Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#131C2B] border border-white/10 text-center min-w-[140px] shadow-lg">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Official ELO
              </span>
              <div className="text-3xl font-mono font-black text-[#3B82F6] flex items-center justify-center gap-1">
                <NumberTicker value={profile.current_elo} />
              </div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                BHOS Certified
              </span>
            </div>
          </div>
        </div>
      </SmoothReveal>

      {/* SECTION 2: KPI STATS GRID (SmoothReveal) */}
      <SmoothReveal delay={0.1}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Current ELO */}
          <div className="rounded-2xl border border-white/10 bg-[#0F1623] p-5 backdrop-blur-md shadow-xl hover:border-white/20 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Current ELO
              </span>
              <Activity className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-white">
              <NumberTicker value={profile.current_elo} />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Live portal rating</p>
          </div>

          {/* 2. Peak ELO */}
          <div className="rounded-2xl border border-white/10 bg-[#0F1623] p-5 backdrop-blur-md shadow-xl hover:border-white/20 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Peak ELO
              </span>
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-amber-400">
              <NumberTicker value={peakElo} />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">All-time maximum</p>
          </div>

          {/* 3. Total Matches */}
          <div className="rounded-2xl border border-white/10 bg-[#0F1623] p-5 backdrop-blur-md shadow-xl hover:border-white/20 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Total Matches
              </span>
              <Swords className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-white">
              <NumberTicker value={totalMatchesCount} />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {profile.wins}W - {profile.losses}L Record
            </p>
          </div>

          {/* 4. Win Rate */}
          <div className="rounded-2xl border border-white/10 bg-[#0F1623] p-5 backdrop-blur-md shadow-xl hover:border-white/20 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Win Rate
              </span>
              <Flame className="w-4 h-4 text-[#22C55E]" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-[#22C55E]">
              <NumberTicker value={winRatePercent} suffix="%" />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Official match ratio</p>
          </div>
        </div>
      </SmoothReveal>

      {/* SECTION 3: RECHARTS ELO PROGRESSION FULL-WIDTH (SmoothReveal) */}
      <SmoothReveal delay={0.15}>
        <div className="rounded-2xl border border-white/10 bg-[#0F1623] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#3B82F6]" />
              <h3 className="text-base font-display font-bold text-white">
                ELO Rating Progression
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {chartData.length} Data Points
            </span>
          </div>

          {/* Recharts LineChart Full-Width */}
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
                Loading performance metrics...
              </div>
            )}
          </div>
        </div>
      </SmoothReveal>

      {/* SECTION 4: MATCH FEED (SmoothReveal) */}
      <SmoothReveal delay={0.2}>
        <div className="rounded-2xl border border-white/10 bg-[#0F1623] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#3B82F6]" />
              <h3 className="text-base font-display font-bold text-white">
                Match Feed & Head-to-Head History
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {recentMatchesFeed.length} Logged Encounters
            </span>
          </div>

          {/* Scrollable list of recent matches */}
          <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1 divide-y divide-transparent">
            {recentMatchesFeed.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#131C2B] border border-white/5 text-center text-xs text-slate-500">
                No official matches logged yet for this player.
              </div>
            ) : (
              recentMatchesFeed.map((m) => {
                const isPlayer1 = m.player1_id === playerId;
                const opponentName = isPlayer1
                  ? (m.player2_name || 'Opponent')
                  : (m.player1_name || 'Opponent');
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
                    {/* Left: Win/Loss Indicator + Opponent + Date */}
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`inline-flex items-center justify-center w-12 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          won
                            ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
                            : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                        }`}
                      >
                        {won ? 'WIN' : 'LOSS'}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">vs</span>
                          <Link
                            href={`/players/${opponentId}`}
                            className="text-sm font-bold text-white hover:text-[#3B82F6] transition"
                          >
                            {opponentName}
                          </Link>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {new Date(m.match_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Right: Scores & ELO Delta */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      {/* Set score breakdown */}
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

                      {/* ELO Delta */}
                      <div className="text-right min-w-[60px]">
                        <span
                          className={`font-mono text-sm font-black ${
                            won ? 'text-[#22C55E]' : 'text-[#EF4444]'
                          }`}
                        >
                          {won ? `+${absDelta}` : `-${absDelta}`}
                        </span>
                        <span className="block text-[9px] uppercase font-bold text-slate-500">
                          PTS
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

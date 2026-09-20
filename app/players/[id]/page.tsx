'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BHOSDataStore } from '../../../lib/data/store';
import { PlayerProfile, MatchRecord } from '../../../lib/data/types';
import { useTranslation } from '../../../lib/i18n';
import EloChart from '../../../components/EloChart';
import { calculateWinProbability, calculateMatchElo } from '../../../lib/elo';
import { 
  Trophy, 
  ArrowLeft, 
  ShieldCheck, 
  Award, 
  Calendar, 
  Activity, 
  Edit3, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Zap, 
  X, 
  Check 
} from 'lucide-react';
import NumberTicker from '../../../components/NumberTicker';
import FormDots, { MatchFormItem } from '../../../components/FormDots';
import EloToastBadge from '../../../components/EloToastBadge';
import TiltCard from '../../../components/TiltCard';

export default function PlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();
  const playerId = params.id as string;

  const [profile, setProfile] = useState<PlayerProfile | undefined>(undefined);
  const [allProfiles, setAllProfiles] = useState<PlayerProfile[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<PlayerProfile>(store.getCurrentUser());

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [blade, setBlade] = useState('');
  const [fhRubber, setFhRubber] = useState('');
  const [bhRubber, setBhRubber] = useState('');
  const [style, setStyle] = useState('');

  // Head-to-Head Opponent Selection
  const [opponentId, setOpponentId] = useState<string>('');

  const loadData = () => {
    const p = store.getProfile(playerId);
    setProfile(p);
    setAllProfiles(store.getProfiles());
    setMatches(store.getPlayerMatches(playerId));
    setCurrentUser(store.getCurrentUser());

    if (p) {
      setBlade(p.blade_equipment || '');
      setFhRubber(p.forehand_rubber || '');
      setBhRubber(p.backhand_rubber || '');
      setStyle(p.playing_style || '');
    }
  };

  useEffect(() => {
    loadData();
    const unsub = store.subscribe(loadData);
    return unsub;
  }, [playerId, store]);

  // Generate ELO progression chart points
  const eloHistoryPoints = useMemo(() => {
    if (!profile) return [];
    const points: { date: string; elo: number; label?: string }[] = [];

    // Chronological sorted matches
    const sorted = [...matches].sort(
      (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    );

    if (sorted.length > 0) {
      // First starting point before 1st match
      const first = sorted[0];
      const startingElo = first.player1_id === playerId ? first.player1_elo_before : first.player2_elo_before;
      points.push({
        date: 'Start',
        elo: startingElo,
      });

      sorted.forEach((m, idx) => {
        const after = m.player1_id === playerId ? m.player1_elo_after : m.player2_elo_after;
        points.push({
          date: new Date(m.match_date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          elo: after,
        });
      });
    } else {
      points.push({
        date: 'Current',
        elo: profile.current_elo,
      });
    }

    return points;
  }, [profile, matches, playerId]);

  const recentForm: MatchFormItem[] = useMemo(() => {
    return matches.slice(0, 5).map((m) => {
      const isPlayer1 = m.player1_id === playerId;
      const opponentName = isPlayer1 ? m.player2_name : m.player1_name;
      const myScore = isPlayer1 ? m.player1_score : m.player2_score;
      const opScore = isPlayer1 ? m.player2_score : m.player1_score;
      const won = myScore > opScore;
      return {
        id: m.id,
        result: won ? 'W' : 'L',
        opponentName,
        score: `${myScore}-${opScore}`,
        eloDelta: isPlayer1 ? m.elo_delta : -m.elo_delta,
        date: new Date(m.match_date).toLocaleDateString(),
      };
    });
  }, [matches, playerId]);

  // Head to Head calculations
  const opponent = useMemo(() => {
    return allProfiles.find((p) => p.id === opponentId);
  }, [allProfiles, opponentId]);

  const h2hMatches = useMemo(() => {
    if (!opponent) return [];
    return matches.filter(
      (m) =>
        (m.player1_id === playerId && m.player2_id === opponent.id) ||
        (m.player2_id === playerId && m.player1_id === opponent.id)
    );
  }, [matches, playerId, opponent]);

  const h2hStats = useMemo(() => {
    if (!profile || !opponent) return null;
    let p1Wins = 0;
    let p2Wins = 0;

    h2hMatches.forEach((m) => {
      const p1Won = m.player1_score > m.player2_score;
      if (m.player1_id === playerId) {
        if (p1Won) p1Wins++;
        else p2Wins++;
      } else {
        if (p1Won) p2Wins++;
        else p1Wins++;
      }
    });

    const p1Prob = calculateWinProbability(profile.current_elo, opponent.current_elo);
    const winEloGain = calculateMatchElo({
      player1Elo: profile.current_elo,
      player2Elo: opponent.current_elo,
      player1Won: true,
    }).winnerGained;

    return {
      p1Wins,
      p2Wins,
      total: h2hMatches.length,
      p1Probability: Math.round(p1Prob * 100),
      p2Probability: Math.round((1 - p1Prob) * 100),
      winEloGain,
    };
  }, [profile, opponent, h2hMatches, playerId]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      store.updateProfile(profile.id, {
        blade_equipment: blade,
        forehand_rubber: fhRubber,
        backhand_rubber: bhRubber,
        playing_style: style,
      });
      setEditModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    }
  };

  if (!profile) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Player Not Found</h2>
        <Link href="/leaderboard" className="text-sm text-bhos-cyan hover:underline">
          Return to Leaderboard
        </Link>
      </div>
    );
  }

  const canEdit = currentUser.id === profile.id || currentUser.role === 'president';
  const winRate = Math.round((profile.wins / (profile.matches_played || 1)) * 100);

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Profile Header Banner */}
      <div className="rounded-3xl border border-bhos-border bg-gradient-to-br from-bhos-midnight to-bhos-navy p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-bhos-cyan to-bhos-blue flex items-center justify-center text-bhos-navy font-display font-black text-2xl sm:text-3xl shadow-lg shadow-cyan-500/20">
              {profile.full_name.charAt(0)}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-display font-black text-white">
                  {profile.full_name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-bhos-cyan/10 text-bhos-cyan border border-bhos-cyan/30">
                  {profile.role}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Rank #{profile.rank || 1}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                {profile.major_faculty} • Class of {profile.admission_year}
              </p>
              <p className="text-xs text-slate-500 font-mono">{profile.email}</p>
            </div>
          </div>

          {/* Right Action & Primary Rating Stat */}
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-bhos-darkCard/80 border border-bhos-border text-center min-w-[120px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Current ELO
              </span>
              <span className="text-3xl font-mono font-black text-cyan-400">
                <NumberTicker value={profile.current_elo} />
              </span>
            </div>

            {canEdit && (
              <button
                onClick={() => setEditModalOpen(true)}
                className="px-4 py-2.5 rounded-xl border border-bhos-border bg-bhos-darkCard hover:bg-slate-800 text-xs font-semibold text-slate-200 hover:text-white transition flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-bhos-cyan" />
                <span>{t('profile.edit_profile')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Matches</span>
            <div className="text-xl font-mono font-bold text-white flex items-baseline gap-1">
              <NumberTicker value={profile.matches_played} />
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Record (W - L)</span>
            <div className="text-xl font-mono font-bold text-emerald-400">
              {profile.wins}W <span className="text-slate-500 font-normal">-</span> {profile.losses}L
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Win Rate</span>
            <div className="text-xl font-mono font-bold text-white">
              <NumberTicker value={winRate} suffix="%" />
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Recent Form (Last 5)</span>
            <div className="mt-1.5 flex items-center">
              <FormDots form={recentForm} size="md" />
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Specs Card */}
      <div className="rounded-2xl border border-bhos-border bg-bhos-midnight/90 p-6 shadow-xl space-y-4">
        <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-bhos-cyan" />
          <span>{t('profile.equipment')}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-bhos-darkCard/80 border border-bhos-border">
            <span className="text-slate-400 block mb-1 font-semibold">{t('profile.blade')}</span>
            <span className="font-bold text-white text-sm">
              {profile.blade_equipment || 'Standard ITTF Blade'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-bhos-darkCard/80 border border-bhos-border">
            <span className="text-slate-400 block mb-1 font-semibold">{t('profile.fh_rubber')}</span>
            <span className="font-bold text-white text-sm">
              {profile.forehand_rubber || 'Standard Rubber'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-bhos-darkCard/80 border border-bhos-border">
            <span className="text-slate-400 block mb-1 font-semibold">{t('profile.bh_rubber')}</span>
            <span className="font-bold text-white text-sm">
              {profile.backhand_rubber || 'Standard Rubber'}
            </span>
          </div>
        </div>
      </div>

      {/* ELO Rating Progression Chart (Recharts) */}
      <div className="rounded-2xl border border-bhos-border bg-bhos-midnight/90 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-bhos-cyan" />
            <span>{t('profile.elo_history')}</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {eloHistoryPoints.length} Recorded Checkpoints
          </span>
        </div>

        <EloChart data={eloHistoryPoints} playerName={profile.full_name} />
      </div>

      {/* Head-to-Head Comparison Tool */}
      <div className="rounded-2xl border border-bhos-border bg-bhos-midnight/90 p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>{t('profile.head_to_head')}</span>
            </h3>
            <p className="text-xs text-slate-400">
              Select any club member to analyze historical encounters and win probability
            </p>
          </div>

          {/* Opponent Selector */}
          <select
            value={opponentId}
            onChange={(e) => setOpponentId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-bhos-darkCard border border-bhos-border text-white text-xs focus:outline-none focus:border-bhos-cyan"
          >
            <option value="">{t('profile.compare_with')}</option>
            {allProfiles
              .filter((p) => p.id !== profile.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.current_elo} ELO - {p.major_faculty})
                </option>
              ))}
          </select>
        </div>

        {opponent && h2hStats ? (
          <div className="p-5 rounded-2xl border border-bhos-border bg-bhos-darkCard/50 space-y-4">
            {/* Visual Head-to-Head Balance */}
            <div className="flex items-center justify-between gap-4">
              <div className="text-center flex-1">
                <div className="font-bold text-white text-base">{profile.full_name}</div>
                <div className="font-mono text-sm text-bhos-cyan font-bold">{profile.current_elo} ELO</div>
                <div className="text-xs text-slate-400 mt-1">{h2hStats.p1Probability}% Expected Win</div>
              </div>

              <div className="text-center px-4">
                <div className="text-xl font-mono font-black text-amber-400">
                  {h2hStats.p1Wins} : {h2hStats.p2Wins}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                  H2H Score ({h2hStats.total} Matches)
                </div>
              </div>

              <div className="text-center flex-1">
                <div className="font-bold text-white text-base">{opponent.full_name}</div>
                <div className="font-mono text-sm text-bhos-cyan font-bold">{opponent.current_elo} ELO</div>
                <div className="text-xs text-slate-400 mt-1">{h2hStats.p2Probability}% Expected Win</div>
              </div>
            </div>

            {/* Probability Progress Bar */}
            <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden flex">
              <div
                className="bg-bhos-cyan h-full transition-all duration-500"
                style={{ width: `${h2hStats.p1Probability}%` }}
              />
              <div
                className="bg-amber-400 h-full transition-all duration-500"
                style={{ width: `${h2hStats.p2Probability}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
            Choose a player from the dropdown above to view head-to-head metrics.
          </div>
        )}
      </div>

      {/* Match History Table */}
      <div className="rounded-2xl border border-bhos-border bg-bhos-midnight/90 overflow-hidden shadow-xl space-y-4 p-6">
        <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-bhos-cyan" />
          <span>{t('profile.match_history')}</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-bhos-border bg-bhos-darkCard text-[11px] font-semibold text-slate-400 uppercase">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Opponent</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4">Sets</th>
                <th className="py-3 px-4 text-center">Result</th>
                <th className="py-3 px-4 text-right">ELO Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {matches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No official matches logged yet for this player.
                  </td>
                </tr>
              ) : (
                matches.map((m) => {
                  const isPlayer1 = m.player1_id === playerId;
                  const opponentName = isPlayer1 ? m.player2_name : m.player1_name;
                  const opponentId = isPlayer1 ? m.player2_id : m.player1_id;
                  const myScore = isPlayer1 ? m.player1_score : m.player2_score;
                  const opScore = isPlayer1 ? m.player2_score : m.player1_score;
                  const won = myScore > opScore;

                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(m.match_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        <Link href={`/players/${opponentId}`} className="hover:text-bhos-cyan">
                          {opponentName}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-white">
                        {myScore} - {opScore}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {m.set_scores}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            won
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-red-500/20 text-red-400 border border-red-500/40'
                          }`}
                        >
                          {won ? 'WIN' : 'LOSS'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={won ? 'text-emerald-400' : 'text-crimson'}>
                          {won ? `+${m.elo_delta}` : `-${m.elo_delta}`}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-bhos-border bg-bhos-midnight p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-bhos-border">
              <h4 className="font-display font-bold text-white text-base">
                {t('profile.edit_profile')}
              </h4>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {t('profile.blade')}
                </label>
                <input
                  type="text"
                  value={blade}
                  onChange={(e) => setBlade(e.target.value)}
                  placeholder="e.g. Butterfly Viscaria ALC"
                  className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white focus:outline-none focus:border-bhos-cyan"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {t('profile.fh_rubber')}
                </label>
                <input
                  type="text"
                  value={fhRubber}
                  onChange={(e) => setFhRubber(e.target.value)}
                  placeholder="e.g. Butterfly Dignics 09C"
                  className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white focus:outline-none focus:border-bhos-cyan"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {t('profile.bh_rubber')}
                </label>
                <input
                  type="text"
                  value={bhRubber}
                  onChange={(e) => setBhRubber(e.target.value)}
                  placeholder="e.g. Butterfly Tenergy 05"
                  className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white focus:outline-none focus:border-bhos-cyan"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {t('profile.playstyle')}
                </label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white focus:outline-none focus:border-bhos-cyan"
                >
                  <option value="Shakehand Offensive">Shakehand Offensive</option>
                  <option value="Shakehand All-round">Shakehand All-round</option>
                  <option value="Shakehand Defensive">Shakehand Defensive</option>
                  <option value="Penhold Offensive">Penhold Offensive</option>
                  <option value="Penhold All-round">Penhold All-round</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
                >
                  {t('profile.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-bhos-cyan text-bhos-navy font-bold hover:opacity-95 shadow-md shadow-cyan-500/20"
                >
                  {t('profile.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


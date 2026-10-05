'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';
import { BHOSDataStore } from '../lib/data/store';
import { PlayerProfile } from '../lib/data/types';
import { 
  Trophy, 
  Swords, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Zap, 
  TrendingUp, 
  TrendingDown,
  Sparkles
} from 'lucide-react';

interface MatchLoggerProps {
  onMatchLogged?: () => void;
}

/**
 * Standard ELO rating calculation using K-factor of 32
 */
export function calculateStandardElo(
  p1Elo: number,
  p2Elo: number,
  kFactor: number = 32
): {
  delta: number;
  p1After: number;
  p2After: number;
  expectedP1: number;
} {
  // Expected probability of Player 1 winning
  const exponent = (p2Elo - p1Elo) / 400;
  const expectedP1 = 1 / (1 + Math.pow(10, exponent));

  // Since Player 1 is the winner (Actual = 1)
  let delta = Math.round(kFactor * (1 - expectedP1));

  // Ensure winner gains at least 1 point
  if (delta < 1) delta = 1;

  const p1After = p1Elo + delta;
  const p2After = Math.max(0, p2Elo - delta);

  return {
    delta,
    p1After,
    p2After,
    expectedP1,
  };
}

export default function MatchLogger({ onMatchLogged }: MatchLoggerProps) {
  const store = BHOSDataStore.getInstance();
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  // Form State
  const [winnerId, setWinnerId] = useState<string>('');
  const [loserId, setLoserId] = useState<string>('');
  const [p1SetsWon, setP1SetsWon] = useState<number>(3);
  const [p2SetsWon, setP2SetsWon] = useState<number>(1);
  const [detailedScores, setDetailedScores] = useState<string>('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<{
    winnerName: string;
    loserName: string;
    points: number;
    winnerBefore: number;
    winnerAfter: number;
    loserBefore: number;
    loserAfter: number;
    scoreSummary: string;
  } | null>(null);

  // 1. Fetch active players from Supabase profiles table
  const fetchActivePlayers = async () => {
    setLoadingPlayers(true);
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('full_name', { ascending: true });

        if (!error && data) {
          setPlayers(data as PlayerProfile[]);
          setLoadingPlayers(false);
          return;
        }
      } catch (err) {
        console.warn('[MatchLogger] Supabase profiles fetch error:', err);
      }
    }

    // Fallback to local store profiles
    setPlayers(store.getProfiles());
    setLoadingPlayers(false);
  };

  useEffect(() => {
    fetchActivePlayers();
  }, []);

  // Selected player objects
  const winner = useMemo(() => players.find((p) => p.id === winnerId), [players, winnerId]);
  const loser = useMemo(() => players.find((p) => p.id === loserId), [players, loserId]);

  // Live ELO preview calculation
  const eloPreview = useMemo(() => {
    if (!winner || !loser || winner.id === loser.id) return null;
    return calculateStandardElo(winner.current_elo, loser.current_elo, 32);
  }, [winner, loser]);

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!winnerId || !loserId) {
      setErrorMessage('Please select both Player 1 (Winner) and Player 2 (Loser).');
      return;
    }

    if (winnerId === loserId) {
      setErrorMessage('Player 1 and Player 2 cannot be the same person.');
      return;
    }

    if (p1SetsWon <= p2SetsWon) {
      setErrorMessage('Player 1 (Winner) must have won more sets than Player 2.');
      return;
    }

    if (!winner || !loser) {
      setErrorMessage('Selected player data could not be found.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 2. Calculate ELO with K=32
      const { delta, p1After, p2After } = calculateStandardElo(
        winner.current_elo,
        loser.current_elo,
        32
      );

      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client connection is unavailable.');
      }

      const currentUser = store.getCurrentUser();
      const matchId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `m-${Date.now()}`;

      const finalSetScores = detailedScores.trim() || `${p1SetsWon}-${p2SetsWon}`;

      // 3. Insert new record into Supabase `matches` table
      const { error: matchInsertError } = await supabase.from('matches').insert([
        {
          id: matchId,
          player1_id: winner.id,
          player1_name: winner.full_name,
          player2_id: loser.id,
          player2_name: loser.full_name,
          logged_by: currentUser?.id || 'admin',
          logged_by_name: currentUser?.full_name || 'Club Admin',
          player1_score: p1SetsWon,
          player2_score: p2SetsWon,
          set_scores: finalSetScores,
          player1_elo_before: winner.current_elo,
          player2_elo_before: loser.current_elo,
          player1_elo_after: p1After,
          player2_elo_after: p2After,
          elo_delta: delta,
          match_date: new Date().toISOString(),
        },
      ]);

      if (matchInsertError) {
        throw new Error(`Match record failed: ${matchInsertError.message}`);
      }

      // 4. Update Player 1 (Winner) in profiles table
      const { error: winnerUpdateError } = await supabase
        .from('profiles')
        .update({
          current_elo: p1After,
          matches_played: (winner.matches_played || 0) + 1,
          wins: (winner.wins || 0) + 1,
        })
        .eq('id', winner.id);

      if (winnerUpdateError) {
        throw new Error(`Winner profile update failed: ${winnerUpdateError.message}`);
      }

      // 5. Update Player 2 (Loser) in profiles table
      const { error: loserUpdateError } = await supabase
        .from('profiles')
        .update({
          current_elo: p2After,
          matches_played: (loser.matches_played || 0) + 1,
          losses: (loser.losses || 0) + 1,
        })
        .eq('id', loser.id);

      if (loserUpdateError) {
        throw new Error(`Loser profile update failed: ${loserUpdateError.message}`);
      }

      // 6. Sync store to reflect updates immediately
      await Promise.allSettled([
        store.fetchProfilesFromCloud(),
        store.fetchMatchesFromCloud(),
      ]);

      // 7. Show success toast with points exchanged
      setSuccessToast({
        winnerName: winner.full_name,
        loserName: loser.full_name,
        points: delta,
        winnerBefore: winner.current_elo,
        winnerAfter: p1After,
        loserBefore: loser.current_elo,
        loserAfter: p2After,
        scoreSummary: `${p1SetsWon}-${p2SetsWon}`,
      });

      // 8. Reset form
      setWinnerId('');
      setLoserId('');
      setP1SetsWon(3);
      setP2SetsWon(1);
      setDetailedScores('');

      // Refresh player list with fresh ratings
      await fetchActivePlayers();

      // Trigger parent callback
      onMatchLogged?.();
    } catch (err: any) {
      console.error('[MatchLogger] Submit error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred while logging the match.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0F1623] p-6 shadow-2xl space-y-5 relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute -top-20 -right-20 w-44 h-44 bg-[#3B82F6]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6] shadow-md shadow-[#3B82F6]/10">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-display font-bold text-white tracking-tight">
                Record Official Ranked Match
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#3B82F6] font-bold">
                K=32 ELO
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Select players, set scores, and mutate Supabase cloud tables with live rating calibration.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold self-start sm:self-auto">
          Supabase Live Sync
        </span>
      </div>

      {/* Success Toast / Banner */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Match Recorded Successfully!</span>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-slate-300">
            <strong>{successToast.winnerName}</strong> defeated <strong>{successToast.loserName}</strong> ({successToast.scoreSummary}).
          </p>
          <div className="flex items-center gap-4 pt-1 font-mono text-[11px]">
            <span className="text-emerald-400 flex items-center gap-1 font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              {successToast.winnerName}: {successToast.winnerBefore} → {successToast.winnerAfter} (+{successToast.points} PTS)
            </span>
            <span className="text-rose-400 flex items-center gap-1 font-bold">
              <TrendingDown className="w-3.5 h-3.5" />
              {successToast.loserName}: {successToast.loserBefore} → {successToast.loserAfter} (-{successToast.points} PTS)
            </span>
          </div>
        </div>
      )}

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Player Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Player 1 (Winner) */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Player 1 (Winner)</span>
              <span className="text-[#3B82F6]">*</span>
            </label>
            <select
              value={winnerId}
              onChange={(e) => setWinnerId(e.target.value)}
              required
              disabled={isSubmitting || loadingPlayers}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#131C2B] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#3B82F6] transition disabled:opacity-50"
            >
              <option value="">Choose winner...</option>
              {players.map((p) => (
                <option key={`w-${p.id}`} value={p.id} disabled={p.id === loserId}>
                  {p.full_name} ({p.current_elo.toLocaleString()} PTS) - {p.major_faculty}
                </option>
              ))}
            </select>
          </div>

          {/* Player 2 (Loser) */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Swords className="w-3.5 h-3.5 text-slate-400" />
              <span>Player 2 (Loser)</span>
              <span className="text-[#3B82F6]">*</span>
            </label>
            <select
              value={loserId}
              onChange={(e) => setLoserId(e.target.value)}
              required
              disabled={isSubmitting || loadingPlayers}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#131C2B] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#3B82F6] transition disabled:opacity-50"
            >
              <option value="">Choose opponent...</option>
              {players.map((p) => (
                <option key={`l-${p.id}`} value={p.id} disabled={p.id === winnerId}>
                  {p.full_name} ({p.current_elo.toLocaleString()} PTS) - {p.major_faculty}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live ELO Impact Forecast */}
        {eloPreview && winner && loser && (
          <div className="p-3.5 rounded-xl bg-[#131C2B]/80 border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-300">
                Win Expectancy: <strong>{Math.round(eloPreview.expectedP1 * 100)}%</strong> for {winner.full_name.split(' ')[0]}
              </span>
            </div>
            <div className="flex items-center gap-4 font-mono font-bold">
              <div className="text-emerald-400">
                Winner: +{eloPreview.delta} PTS ({eloPreview.p1After})
              </div>
              <div className="text-rose-400">
                Loser: -{eloPreview.delta} PTS ({eloPreview.p2After})
              </div>
            </div>
          </div>
        )}

        {/* Row 2: Set Score Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Winner Sets Won */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Winner Sets Won <span className="text-[#3B82F6]">*</span>
            </label>
            <input
              type="number"
              min={1}
              max={7}
              value={p1SetsWon}
              onChange={(e) => setP1SetsWon(parseInt(e.target.value, 10) || 0)}
              required
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#131C2B] border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:border-[#3B82F6] transition disabled:opacity-50"
            />
          </div>

          {/* Loser Sets Won */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Loser Sets Won <span className="text-[#3B82F6]">*</span>
            </label>
            <input
              type="number"
              min={0}
              max={p1SetsWon > 0 ? p1SetsWon - 1 : 6}
              value={p2SetsWon}
              onChange={(e) => setP2SetsWon(parseInt(e.target.value, 10) || 0)}
              required
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#131C2B] border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:border-[#3B82F6] transition disabled:opacity-50"
            />
          </div>

          {/* Optional Detailed Set Scores */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Set Breakdown <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={detailedScores}
              onChange={(e) => setDetailedScores(e.target.value)}
              placeholder="e.g. 11-9, 9-11, 11-8, 11-7"
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#131C2B] border border-white/[0.08] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#3B82F6] transition disabled:opacity-50"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !winnerId || !loserId || winnerId === loserId}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#3B82F6]/25 transition-all duration-200 active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mutating Cloud Database...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Submit & Calculate ELO</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

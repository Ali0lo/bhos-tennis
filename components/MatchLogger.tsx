'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Sparkles,
  Clock,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface MatchLoggerProps {
  onMatchLogged?: () => void;
}

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
  const exponent = (p2Elo - p1Elo) / 400;
  const expectedP1 = 1 / (1 + Math.pow(10, exponent));
  let delta = Math.round(kFactor * (1 - expectedP1));
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
  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(store.getCurrentUser());

  const [playerOutcome, setPlayerOutcome] = useState<'won' | 'lost'>('won');
  const [opponentId, setOpponentId] = useState<string>('');
  const [adminWinnerId, setAdminWinnerId] = useState<string>('');
  const [adminLoserId, setAdminLoserId] = useState<string>('');
  const [p1SetsWon, setP1SetsWon] = useState<number>(3);
  const [p2SetsWon, setP2SetsWon] = useState<number>(1);
  const [detailedScores, setDetailedScores] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<{
    message: string;
    points?: number;
    winnerName: string;
    loserName: string;
    winnerBefore?: number;
    winnerAfter?: number;
    loserBefore?: number;
    loserAfter?: number;
    scoreSummary: string;
    isPending?: boolean;
  } | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', user.email)
            .single();
          if (profile) {
            setCurrentUser(profile as PlayerProfile);
            return profile as PlayerProfile;
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    const local = store.getCurrentUser();
    setCurrentUser(local);
    return local;
  }, [store]);

  const fetchActivePlayers = async () => {
    setLoadingPlayers(true);
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('is_verified', false)
          .order('full_name', { ascending: true });

        if (!error && data) {
          setPlayers(data as PlayerProfile[]);
          setLoadingPlayers(false);
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }

    setPlayers(store.getVerifiedProfiles());
    setLoadingPlayers(false);
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchActivePlayers();
  }, [fetchCurrentUser]);

  const isAdminOrCoach = useMemo(() => {
    return currentUser?.role === 'coach' || currentUser?.role === 'president';
  }, [currentUser]);

  const effectiveWinner = useMemo(() => {
    if (isAdminOrCoach) {
      return players.find((p) => p.id === adminWinnerId);
    }
    if (!currentUser) return undefined;
    return playerOutcome === 'won' ? currentUser : players.find((p) => p.id === opponentId);
  }, [isAdminOrCoach, adminWinnerId, playerOutcome, currentUser, players, opponentId]);

  const effectiveLoser = useMemo(() => {
    if (isAdminOrCoach) {
      return players.find((p) => p.id === adminLoserId);
    }
    if (!currentUser) return undefined;
    return playerOutcome === 'won' ? players.find((p) => p.id === opponentId) : currentUser;
  }, [isAdminOrCoach, adminLoserId, playerOutcome, currentUser, players, opponentId]);

  const eloPreview = useMemo(() => {
    if (!effectiveWinner || !effectiveLoser || effectiveWinner.id === effectiveLoser.id) return null;
    return calculateStandardElo(effectiveWinner.current_elo, effectiveLoser.current_elo, 32);
  }, [effectiveWinner, effectiveLoser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentUser) {
      setErrorMessage('You must be signed in to log a match.');
      return;
    }

    if (currentUser.is_verified === false) {
      setErrorMessage('Your profile is pending admin verification. Only verified members can log matches.');
      return;
    }

    if (!effectiveWinner || !effectiveLoser) {
      setErrorMessage('Please specify both the winner and loser of the match.');
      return;
    }

    if (effectiveWinner.id === effectiveLoser.id) {
      setErrorMessage('Player 1 and Player 2 cannot be the same person.');
      return;
    }

    if (p1SetsWon <= p2SetsWon) {
      setErrorMessage('Player 1 (Winner) must have won more sets than Player 2.');
      return;
    }

    if (!isAdminOrCoach) {
      if (effectiveWinner.id !== currentUser.id && effectiveLoser.id !== currentUser.id) {
        setErrorMessage('You must be either Player 1 (Winner) or Player 2 (Loser) to submit this match.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client connection is unavailable.');
      }

      const matchId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `m-${Date.now()}`;

      const finalSetScores = detailedScores.trim() || `${p1SetsWon}-${p2SetsWon}`;

      if (isAdminOrCoach) {
        const { delta, p1After, p2After } = calculateStandardElo(
          effectiveWinner.current_elo,
          effectiveLoser.current_elo,
          32
        );

        const { error: matchInsertError } = await supabase.from('matches').insert([
          {
            id: matchId,
            player1_id: effectiveWinner.id,
            player1_name: effectiveWinner.full_name,
            player2_id: effectiveLoser.id,
            player2_name: effectiveLoser.full_name,
            logged_by: currentUser.id,
            logged_by_name: currentUser.full_name,
            player1_score: p1SetsWon,
            player2_score: p2SetsWon,
            set_scores: finalSetScores,
            player1_elo_before: effectiveWinner.current_elo,
            player2_elo_before: effectiveLoser.current_elo,
            player1_elo_after: p1After,
            player2_elo_after: p2After,
            elo_delta: delta,
            status: 'confirmed',
            match_date: new Date().toISOString(),
          },
        ]);

        if (matchInsertError) throw matchInsertError;

        const { error: winnerError } = await supabase
          .from('profiles')
          .update({
            current_elo: p1After,
            matches_played: (effectiveWinner.matches_played || 0) + 1,
            wins: (effectiveWinner.wins || 0) + 1,
          })
          .eq('id', effectiveWinner.id);

        if (winnerError) throw winnerError;

        const { error: loserError } = await supabase
          .from('profiles')
          .update({
            current_elo: p2After,
            matches_played: (effectiveLoser.matches_played || 0) + 1,
            losses: (effectiveLoser.losses || 0) + 1,
          })
          .eq('id', effectiveLoser.id);

        if (loserError) throw loserError;

        await Promise.allSettled([
          store.fetchProfilesFromCloud(),
          store.fetchMatchesFromCloud(),
        ]);

        setSuccessToast({
          message: 'Match confirmed and ratings updated immediately!',
          winnerName: effectiveWinner.full_name,
          loserName: effectiveLoser.full_name,
          points: delta,
          winnerBefore: effectiveWinner.current_elo,
          winnerAfter: p1After,
          loserBefore: effectiveLoser.current_elo,
          loserAfter: p2After,
          scoreSummary: `${p1SetsWon}-${p2SetsWon}`,
          isPending: false,
        });
      } else {
        const { error: matchInsertError } = await supabase.from('matches').insert([
          {
            id: matchId,
            player1_id: effectiveWinner.id,
            player1_name: effectiveWinner.full_name,
            player2_id: effectiveLoser.id,
            player2_name: effectiveLoser.full_name,
            logged_by: currentUser.id,
            logged_by_name: currentUser.full_name,
            player1_score: p1SetsWon,
            player2_score: p2SetsWon,
            set_scores: finalSetScores,
            player1_elo_before: effectiveWinner.current_elo,
            player2_elo_before: effectiveLoser.current_elo,
            player1_elo_after: 0,
            player2_elo_after: 0,
            elo_delta: 0,
            status: 'pending',
            match_date: new Date().toISOString(),
          },
        ]);

        if (matchInsertError) throw matchInsertError;

        await store.fetchMatchesFromCloud();

        setSuccessToast({
          message: 'Match submitted! Waiting for opponent confirmation.',
          winnerName: effectiveWinner.full_name,
          loserName: effectiveLoser.full_name,
          scoreSummary: `${p1SetsWon}-${p2SetsWon}`,
          isPending: true,
        });
      }

      setOpponentId('');
      setAdminWinnerId('');
      setAdminLoserId('');
      setP1SetsWon(3);
      setP2SetsWon(1);
      setDetailedScores('');

      await fetchActivePlayers();
      onMatchLogged?.();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while logging the match.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="p-8 rounded-2xl border border-white/10 bg-[#0F1623] text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
        <h3 className="text-base font-display font-bold text-white">Sign In Required</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          You must be logged in with your BHOS account to submit or verify match results.
        </p>
      </div>
    );
  }

  if (currentUser.is_verified === false) {
    return (
      <div className="p-8 rounded-2xl border border-amber-500/30 bg-[#0F1623] text-center space-y-3">
        <Clock className="w-8 h-8 text-amber-400 mx-auto" />
        <h3 className="text-base font-display font-bold text-white">Verification Pending</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Your account is awaiting approval by the President or Coach. Once verified, you can log matches.
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-white/10 bg-[#0F1623] p-6 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6]">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-display font-black text-white flex items-center gap-2">
              Official Match Logger
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                K=32 Engine
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAdminOrCoach
                ? 'Coach/Admin Authority: Scores are verified and ratings update immediately.'
                : 'Player Submission: Results require 2-Factor confirmation from your opponent.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#131C2B] border border-white/5 text-xs text-slate-300">
          <UserCheck className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span>Logged as: <strong>{currentUser.full_name}</strong></span>
          <span className="uppercase text-[9px] font-bold text-[#3B82F6]">({currentUser.role})</span>
        </div>
      </div>

      {successToast && (
        <div className={`mt-6 p-4 rounded-xl border flex items-start gap-3 ${
          successToast.isPending
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }`}>
          {successToast.isPending ? (
            <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1 text-xs">
            <div className="font-bold text-white text-sm">
              {successToast.message}
            </div>
            <div className="text-slate-300">
              <strong>{successToast.winnerName}</strong> defeated <strong>{successToast.loserName}</strong> ({successToast.scoreSummary})
            </div>
            {!successToast.isPending && successToast.points && (
              <div className="font-mono text-emerald-400 font-semibold pt-1">
                +{successToast.points} PTS awarded to winner / -{successToast.points} PTS deducted from loser
              </div>
            )}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mt-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {!isAdminOrCoach ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Your Match Result
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPlayerOutcome('won')}
                  className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                    playerOutcome === 'won'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10'
                      : 'bg-[#131C2B] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-4 h-4 text-emerald-400" />
                  <span>I Won This Match</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlayerOutcome('lost')}
                  className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                    playerOutcome === 'lost'
                      ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-lg shadow-red-500/10'
                      : 'bg-[#131C2B] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span>I Lost This Match</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Select Opponent ({playerOutcome === 'won' ? 'Loser' : 'Winner'})
              </label>
              <select
                required
                value={opponentId}
                onChange={(e) => setOpponentId(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl bg-[#131C2B] border border-white/10 text-white text-xs focus:outline-none focus:border-[#3B82F6]"
              >
                <option value="">Choose your opponent...</option>
                {players
                  .filter((p) => p.id !== currentUser.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.current_elo} PTS) - {p.major_faculty}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Player 1 (Winner)
              </label>
              <select
                required
                value={adminWinnerId}
                onChange={(e) => setAdminWinnerId(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl bg-[#131C2B] border border-white/10 text-white text-xs focus:outline-none focus:border-[#3B82F6]"
              >
                <option value="">Select winner...</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === adminLoserId}>
                    {p.full_name} ({p.current_elo} PTS) - {p.major_faculty}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Player 2 (Loser)
              </label>
              <select
                required
                value={adminLoserId}
                onChange={(e) => setAdminLoserId(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl bg-[#131C2B] border border-white/10 text-white text-xs focus:outline-none focus:border-[#3B82F6]"
              >
                <option value="">Select loser...</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === adminWinnerId}>
                    {p.full_name} ({p.current_elo} PTS) - {p.major_faculty}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Winner Sets Won
            </label>
            <input
              type="number"
              min={1}
              max={7}
              value={p1SetsWon}
              onChange={(e) => setP1SetsWon(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3.5 py-3 rounded-xl bg-[#131C2B] border border-white/10 text-white text-xs font-mono font-bold focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Loser Sets Won
            </label>
            <input
              type="number"
              min={0}
              max={6}
              value={p2SetsWon}
              onChange={(e) => setP2SetsWon(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3.5 py-3 rounded-xl bg-[#131C2B] border border-white/10 text-white text-xs font-mono font-bold focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Set Breakdown (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 11-9, 8-11, 11-6, 12-10"
              value={detailedScores}
              onChange={(e) => setDetailedScores(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl bg-[#131C2B] border border-white/10 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
        </div>

        {eloPreview && effectiveWinner && effectiveLoser && (
          <div className="p-4 rounded-xl bg-[#131C2B] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                {isAdminOrCoach ? 'Immediate ELO Calibration' : 'Estimated Calibration Upon Opponent Confirmation'}
              </span>
              <span className="font-mono text-[#3B82F6] font-bold">±{eloPreview.delta} PTS</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5 text-xs">
              <div>
                <span className="text-slate-400 block">{effectiveWinner.full_name} (Winner)</span>
                <span className="font-mono text-white font-bold">
                  {effectiveWinner.current_elo} <ArrowRight className="inline w-3 h-3 text-slate-500 mx-1" />
                  <span className="text-emerald-400">{eloPreview.p1After}</span>
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">{effectiveLoser.full_name} (Loser)</span>
                <span className="font-mono text-white font-bold">
                  {effectiveLoser.current_elo} <ArrowRight className="inline w-3 h-3 text-slate-500 mx-1" />
                  <span className="text-red-400">{eloPreview.p2After}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSubmitting || loadingPlayers}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-display font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Recording Match...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>{isAdminOrCoach ? 'Verify & Commit Match' : 'Submit Match for Confirmation'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

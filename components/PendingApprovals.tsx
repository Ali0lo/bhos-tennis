'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';
import { BHOSDataStore } from '../lib/data/store';
import { MatchRecord, PlayerProfile } from '../lib/data/types';
import { Check, X, ShieldAlert, Clock, Loader2, CheckCircle2 } from 'lucide-react';

interface PendingApprovalsProps {
  onMatchUpdated?: () => void;
}

export default function PendingApprovals({ onMatchUpdated }: PendingApprovalsProps) {
  const store = BHOSDataStore.getInstance();
  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(store.getCurrentUser());
  const [pendingMatches, setPendingMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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

  const fetchPendingMatches = useCallback(async (user: PlayerProfile | null) => {
    if (!user) {
      setPendingMatches([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('matches')
          .select('*')
          .eq('status', 'pending')
          .neq('logged_by', user.id)
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .order('match_date', { ascending: false });

        if (!error && data) {
          setPendingMatches(data as MatchRecord[]);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }

    const localMatches = store.getMatches().filter(
      (m) =>
        m.status === 'pending' &&
        m.logged_by !== user.id &&
        (m.player1_id === user.id || m.player2_id === user.id)
    );
    setPendingMatches(localMatches);
    setLoading(false);
  }, [store]);

  useEffect(() => {
    let isMounted = true;
    fetchCurrentUser().then((u) => {
      if (isMounted) fetchPendingMatches(u);
    });

    const supabase = getSupabaseClient();
    let channel: any = null;
    if (supabase) {
      channel = supabase
        .channel('pending-approvals-feed')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches' },
          () => {
            fetchCurrentUser().then((u) => {
              if (isMounted) fetchPendingMatches(u);
            });
          }
        )
        .subscribe();
    }

    return () => {
      isMounted = false;
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchCurrentUser, fetchPendingMatches]);

  const handleConfirm = async (match: MatchRecord) => {
    setProcessingId(match.id);
    setFeedback(null);
    const supabase = getSupabaseClient();

    try {
      if (!supabase) throw new Error('Supabase client connection unavailable.');

      const { data: p1, error: p1Error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', match.player1_id)
        .single();

      const { data: p2, error: p2Error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', match.player2_id)
        .single();

      if (p1Error || !p1 || p2Error || !p2) {
        throw new Error('Could not retrieve latest player rating profiles.');
      }

      const p1Elo = p1.current_elo;
      const p2Elo = p2.current_elo;
      const exponent = (p2Elo - p1Elo) / 400;
      const expectedP1 = 1 / (1 + Math.pow(10, exponent));
      let delta = Math.round(32 * (1 - expectedP1));
      if (delta < 1) delta = 1;

      const p1After = p1Elo + delta;
      const p2After = Math.max(0, p2Elo - delta);

      const { error: matchUpdateError } = await supabase
        .from('matches')
        .update({
          player1_elo_before: p1Elo,
          player2_elo_before: p2Elo,
          player1_elo_after: p1After,
          player2_elo_after: p2After,
          elo_delta: delta,
          status: 'confirmed',
        })
        .eq('id', match.id);

      if (matchUpdateError) throw matchUpdateError;

      const { error: p1UpdateError } = await supabase
        .from('profiles')
        .update({
          current_elo: p1After,
          matches_played: (p1.matches_played || 0) + 1,
          wins: (p1.wins || 0) + 1,
        })
        .eq('id', p1.id);

      if (p1UpdateError) throw p1UpdateError;

      const { error: p2UpdateError } = await supabase
        .from('profiles')
        .update({
          current_elo: p2After,
          matches_played: (p2.matches_played || 0) + 1,
          losses: (p2.losses || 0) + 1,
        })
        .eq('id', p2.id);

      if (p2UpdateError) throw p2UpdateError;

      await Promise.allSettled([
        store.fetchProfilesFromCloud(),
        store.fetchMatchesFromCloud(),
      ]);

      setPendingMatches((prev) => prev.filter((m) => m.id !== match.id));
      setFeedback({
        type: 'success',
        message: `Match confirmed! Ratings updated (${p1.full_name} +${delta} PTS, ${p2.full_name} -${delta} PTS).`,
      });

      onMatchUpdated?.();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to confirm match.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (match: MatchRecord) => {
    setProcessingId(match.id);
    setFeedback(null);
    const supabase = getSupabaseClient();

    try {
      if (!supabase) throw new Error('Supabase client connection unavailable.');

      const { error } = await supabase
        .from('matches')
        .update({ status: 'rejected' })
        .eq('id', match.id);

      if (error) throw error;

      await store.fetchMatchesFromCloud();
      setPendingMatches((prev) => prev.filter((m) => m.id !== match.id));
      setFeedback({
        type: 'success',
        message: 'Match result rejected and removed from pending queue.',
      });

      onMatchUpdated?.();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to reject match.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading || !currentUser || pendingMatches.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-[#0F1623] p-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
              Action Required: Pending Match Confirmations
              <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {pendingMatches.length}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              An opponent submitted a match with you. Please review and confirm or reject the score.
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`mb-3 p-3 rounded-xl text-xs flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="space-y-2.5">
        {pendingMatches.map((m) => {
          const submitterName =
            m.logged_by_name ||
            (m.logged_by === m.player1_id ? m.player1_name : m.player2_name) ||
            'Opponent';

          const isWinner = m.player1_id === currentUser.id;
          const userScore = isWinner ? m.player1_score : m.player2_score;
          const oppScore = isWinner ? m.player2_score : m.player1_score;
          const outcomeText = isWinner ? 'Reported You Won' : 'Reported You Lost';

          return (
            <div
              key={m.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#131C2B] border border-white/5 hover:border-white/15 transition"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${
                    isWinner
                      ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
                      : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                  }`}
                >
                  {outcomeText}
                </span>

                <div>
                  <div className="text-xs font-bold text-white">
                    Logged by <span className="text-[#3B82F6]">{submitterName}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                    <span>Score: <strong className="text-white">{userScore} - {oppScore}</strong></span>
                    {m.set_scores && <span>({m.set_scores})</span>}
                    <span>•</span>
                    <span>{new Date(m.match_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  disabled={processingId === m.id}
                  onClick={() => handleReject(m)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 hover:text-red-300 text-xs font-semibold transition disabled:opacity-50"
                >
                  {processingId === m.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  <span>Reject</span>
                </button>

                <button
                  type="button"
                  disabled={processingId === m.id}
                  onClick={() => handleConfirm(m)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#22C55E] hover:bg-emerald-600 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {processingId === m.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  ) : (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                  <span>Confirm</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

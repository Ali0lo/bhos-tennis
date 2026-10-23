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
    const isAdminOrCoach = user.role === 'president' || user.role === 'coach';

    if (supabase) {
      try {
        let query = supabase
          .from('matches')
          .select('*')
          .eq('status', 'pending');

        if (!isAdminOrCoach) {
          query = query
            .neq('logged_by', user.id)
            .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`);
        } else {
          query = query.neq('logged_by', user.id);
        }

        const { data, error } = await query.order('match_date', { ascending: false });

        if (!error && data) {
          const resolved = store.getResolvedMatchIds();
          const filtered = (data as MatchRecord[]).filter(
            (m) => !resolved[m.id]
          );
          setPendingMatches(filtered);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }

    const resolved = store.getResolvedMatchIds();
    const localMatches = store.getMatches().filter((m) => {
      if (m.status !== 'pending') return false;
      if (resolved[m.id]) return false;
      if (isAdminOrCoach) {
        return m.logged_by !== user.id;
      }
      return (
        m.logged_by !== user.id &&
        (m.player1_id === user.id || m.player2_id === user.id)
      );
    });
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
      let p1 = null;
      let p2 = null;

      if (supabase) {
        const { data: p1Data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', match.player1_id)
          .maybeSingle();

        const { data: p2Data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', match.player2_id)
          .maybeSingle();

        p1 = p1Data;
        p2 = p2Data;
      }

      const p1Profile = p1 || store.getProfile(match.player1_id);
      const p2Profile = p2 || store.getProfile(match.player2_id);

      const p1Elo = p1Profile?.current_elo ?? 0;
      const p2Elo = p2Profile?.current_elo ?? 0;
      const exponent = (p2Elo - p1Elo) / 400;
      const expectedP1 = 1 / (1 + Math.pow(10, exponent));
      let delta = Math.round(32 * (1 - expectedP1));
      if (delta < 1) delta = 1;

      const p1After = Math.max(0, p1Elo + delta);
      const p2After = Math.max(0, p2Elo - delta);
      const winnerId = match.player1_score >= match.player2_score ? match.player1_id : match.player2_id;

      store.confirmMatch(match.id, {
        tournament_id: match.tournament_id,
        round_number: match.round_number,
        bracket_node_index: match.bracket_node_index,
        winner_id: winnerId,
        player1_id: match.player1_id,
        player1_name: match.player1_name || p1Profile?.full_name || 'Player 1',
        player2_id: match.player2_id,
        player2_name: match.player2_name || p2Profile?.full_name || 'Player 2',
        player1_score: match.player1_score,
        player2_score: match.player2_score,
        set_scores: match.set_scores,
        player1_elo_before: p1Elo,
        player2_elo_before: p2Elo,
        player1_elo_after: p1After,
        player2_elo_after: p2After,
        elo_delta: delta,
        status: 'confirmed',
      });

      if (match.player1_id) {
        store.updateProfile(match.player1_id, {
          current_elo: p1After,
          matches_played: ((p1Profile?.matches_played || 0) + 1),
          wins: ((p1Profile?.wins || 0) + 1),
        });
      }
      if (match.player2_id) {
        store.updateProfile(match.player2_id, {
          current_elo: p2After,
          matches_played: ((p2Profile?.matches_played || 0) + 1),
          losses: ((p2Profile?.losses || 0) + 1),
        });
      }

      if (supabase) {
        await supabase
          .from('matches')
          .update({
            winner_id: winnerId,
            player1_elo_before: p1Elo,
            player2_elo_before: p2Elo,
            player1_elo_after: p1After,
            player2_elo_after: p2After,
            elo_delta: delta,
            status: 'confirmed',
          })
          .eq('id', match.id);

        if (match.player1_id) {
          await supabase
            .from('profiles')
            .update({
              current_elo: p1After,
              matches_played: ((p1Profile?.matches_played || 0) + 1),
              wins: ((p1Profile?.wins || 0) + 1),
            })
            .eq('id', match.player1_id);
        }

        if (match.player2_id) {
          await supabase
            .from('profiles')
            .update({
              current_elo: p2After,
              matches_played: ((p2Profile?.matches_played || 0) + 1),
              losses: ((p2Profile?.losses || 0) + 1),
            })
            .eq('id', match.player2_id);
        }

        await Promise.allSettled([
          store.fetchProfilesFromCloud(),
          store.fetchMatchesFromCloud(),
          store.fetchTournamentsFromCloud(),
        ]);
      }

      setPendingMatches((prev) => prev.filter((m) => m.id !== match.id));
      setFeedback({
        type: 'success',
        message: `Oyun təsdiqləndi! Reytinqlər yeniləndi (${p1Profile?.full_name || match.player1_name || 'Qalib'} +${delta} XAL, ${p2Profile?.full_name || match.player2_name || 'Məğlub'} -${delta} XAL).`,
      });

      onMatchUpdated?.();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Oyunu təsdiqləmək mümkün olmadı.',
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
      store.rejectMatch(match.id);

      if (supabase) {
        await supabase
          .from('matches')
          .update({ status: 'rejected' })
          .eq('id', match.id);

        await store.fetchMatchesFromCloud();
      }

      setPendingMatches((prev) => prev.filter((m) => m.id !== match.id));
      setFeedback({
        type: 'success',
        message: 'Oyun nəticəsi rədd edildi və növbədən silindi.',
      });

      onMatchUpdated?.();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Oyunu rədd etmək mümkün olmadı.',
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
              Təsdiq Gözləyən Oyunlar
              <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {pendingMatches.length}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {currentUser.role === 'president' || currentUser.role === 'coach'
                ? 'Klub üzvləri tərəfindən qeyd olunmuş və təsdiq gözləyən oyunlar. Nəticəni yoxlayıb rəsmi təsdiq verə və ya rədd edə bilərsiniz.'
                : 'Rəqibiniz sizinlə olan oyun nəticəsini təqdim edib. Zəhmət olmasa hesabı yoxlayın və təsdiq və ya rədd edin.'}
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
            'Klub Üzvü';

          const isPlayerInMatch = m.player1_id === currentUser.id || m.player2_id === currentUser.id;
          const isWinner = m.player1_id === currentUser.id;
          const userScore = isWinner ? m.player1_score : m.player2_score;
          const oppScore = isWinner ? m.player2_score : m.player1_score;

          let outcomeText = '';
          if (isPlayerInMatch) {
            outcomeText = isWinner ? 'Qələbəniz qeyd olunub' : 'Məğlubiyyətiniz qeyd olunub';
          } else {
            outcomeText = `${m.player1_name} qələbəsi (${m.player1_score} - ${m.player2_score})`;
          }

          return (
            <div
              key={m.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#131C2B] border border-white/5 hover:border-white/15 transition"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${
                    isPlayerInMatch
                      ? isWinner
                        ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
                        : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {outcomeText}
                </span>

                <div>
                  <div className="text-xs font-bold text-white">
                    {isPlayerInMatch ? (
                      <>Qeyd edən: <span className="text-[#3B82F6]">{submitterName}</span></>
                    ) : (
                      <>Oyunçular: <span className="text-emerald-400 font-bold">{m.player1_name}</span> vs <span className="text-rose-400 font-bold">{m.player2_name}</span> (Qeyd edən: {submitterName})</>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                    {isPlayerInMatch ? (
                      <span>Hesab: <strong className="text-white">{userScore} - {oppScore}</strong></span>
                    ) : (
                      <span>Hesab: <strong className="text-white">{m.player1_score} - {m.player2_score}</strong></span>
                    )}
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
                  <span>Rədd et</span>
                </button>

                <button
                  type="button"
                  disabled={processingId === m.id}
                  onClick={() => handleConfirm(m)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22C55E] hover:bg-emerald-600 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {processingId === m.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  ) : (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                  <span>Təsdiqlə</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

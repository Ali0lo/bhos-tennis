'use client';

import React, { useState } from 'react';
import { Tournament, BracketMatch } from '../lib/data/types';
import { BHOSDataStore } from '../lib/data/store';
import { getSupabaseClient } from '../lib/supabase/client';
import { Trophy, Award, Check, X, Loader2, Sparkles } from 'lucide-react';

interface BracketTreeProps {
  tournament: Tournament;
  onUpdate?: () => void;
  isAdmin?: boolean;
}

export default function BracketTree({ tournament, onUpdate, isAdmin }: BracketTreeProps) {
  const store = BHOSDataStore.getInstance();
  const [activeMatchModal, setActiveMatchModal] = useState<{
    roundIndex: number;
    matchIndex: number;
    match: BracketMatch;
  } | null>(null);

  const [selectedWinnerId, setSelectedWinnerId] = useState<string>('');
  const [p1Games, setP1Games] = useState<number>(3);
  const [p2Games, setP2Games] = useState<number>(0);
  const [setScores, setSetScores] = useState<string>('11-8, 11-9, 11-7');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!tournament.bracket_data || !tournament.bracket_data.rounds || tournament.bracket_data.rounds.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl border border-white/10 bg-[#0F1623]">
        <p className="text-slate-400 text-sm">Bracket has not been generated yet for this tournament.</p>
      </div>
    );
  }

  const rounds = tournament.bracket_data.rounds;

  const handleOpenScoreModal = (roundIndex: number, matchIndex: number, match: BracketMatch) => {
    if (!isAdmin || !match.player1 || !match.player2) return;
    setActiveMatchModal({ roundIndex, matchIndex, match });
    setSelectedWinnerId(match.winner_id || match.player1.id);
    if (match.player1_score !== undefined && match.player2_score !== undefined) {
      setP1Games(match.player1_score);
      setP2Games(match.player2_score);
      setSetScores(match.set_scores || '11-8, 11-9, 11-7');
    } else {
      setP1Games(3);
      setP2Games(0);
      setSetScores('11-8, 11-9, 11-7');
    }
    setErrorMsg(null);
  };

  const applyPreset = (winner: 1 | 2, p1G: number, p2G: number, sets: string) => {
    if (!activeMatchModal) return;
    const { match } = activeMatchModal;
    setSelectedWinnerId(winner === 1 ? match.player1!.id : match.player2!.id);
    setP1Games(p1G);
    setP2Games(p2G);
    setSetScores(sets);
  };

  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMatchModal) return;

    const { roundIndex, matchIndex, match } = activeMatchModal;
    if (!match.player1 || !match.player2) {
      setErrorMsg('Both players must be assigned');
      return;
    }

    if (!selectedWinnerId) {
      setErrorMsg('Please select the winning player');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const updatedTourn = store.updateTournamentBracketMatch(
        tournament.id,
        roundIndex,
        matchIndex,
        selectedWinnerId,
        {
          p1Score: p1Games,
          p2Score: p2Games,
          setScores,
        }
      );

      const supabase = getSupabaseClient();
      if (supabase && updatedTourn.bracket_data) {
        await supabase
          .from('tournaments')
          .update({ bracket_data: updatedTourn.bracket_data })
          .eq('id', tournament.id);
      }

      setActiveMatchModal(null);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update bracket match');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-8 pt-4 flex items-stretch gap-10 sm:gap-14 min-w-[720px]">
        {rounds.map((round, rIndex) => {
          const isFinal = rIndex === rounds.length - 1;
          const matchCount = round.matches.length;

          return (
            <div key={round.name || `r-${rIndex}`} className="flex-1 flex flex-col min-w-[240px] max-w-[280px]">
              <div className="text-center pb-3 mb-6 border-b border-white/10">
                <span className="font-display font-black text-xs uppercase tracking-wider text-[#3B82F6]">
                  {round.name}
                </span>
                <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                  {matchCount} {matchCount === 1 ? 'Match' : 'Matches'}
                </span>
              </div>

              <div className="flex flex-col justify-around gap-8 h-full">
                {round.matches.map((match, mIndex) => {
                  const isCompleted = match.status === 'completed';
                  const isReady = match.status === 'ready' && match.player1 && match.player2;
                  const p1Won = isCompleted && match.winner_id === match.player1?.id;
                  const p2Won = isCompleted && match.winner_id === match.player2?.id;
                  const isClickable = Boolean(isAdmin && match.player1 && match.player2);

                  const isEven = mIndex % 2 === 0;
                  const pairHasWinner = isCompleted;

                  return (
                    <div key={match.id} className="relative group">
                      <div
                        onClick={() => isClickable && handleOpenScoreModal(rIndex, mIndex, match)}
                        className={`rounded-2xl p-3.5 bg-[#131C2B] border transition-all duration-300 relative z-10 shadow-xl ${
                          isCompleted
                            ? 'border-[#3B82F6]/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                            : isReady
                            ? 'border-white/20 hover:border-[#3B82F6]/60'
                            : 'border-white/5 opacity-60'
                        } ${isClickable ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.99]' : ''}`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-2 pb-1.5 border-b border-white/5">
                          <span>Match #{mIndex + 1}</span>
                          {isCompleted ? (
                            <span className="text-[#3B82F6] font-bold uppercase tracking-wider flex items-center gap-1">
                              <Check className="w-3 h-3 stroke-[3]" /> Completed
                            </span>
                          ) : isReady ? (
                            <span className="text-amber-400 font-semibold uppercase tracking-wider">
                              Ready
                            </span>
                          ) : (
                            <span className="text-slate-600 uppercase tracking-wider">
                              Pending
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <div
                            className={`flex items-center justify-between p-2 rounded-xl text-xs transition ${
                              p1Won
                                ? 'bg-[#3B82F6]/20 text-white font-bold border border-[#3B82F6]/50 shadow-[0_0_10px_rgba(59,130,246,0.25)]'
                                : isCompleted
                                ? 'text-slate-500 opacity-70'
                                : 'text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 pr-2">
                              {p1Won && <Award className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />}
                              <span className="truncate font-semibold">
                                {match.player1?.full_name || 'TBD'}
                              </span>
                            </div>
                            <span className="font-mono font-black text-sm shrink-0">
                              {match.player1_score !== undefined ? match.player1_score : '-'}
                            </span>
                          </div>

                          <div
                            className={`flex items-center justify-between p-2 rounded-xl text-xs transition ${
                              p2Won
                                ? 'bg-[#3B82F6]/20 text-white font-bold border border-[#3B82F6]/50 shadow-[0_0_10px_rgba(59,130,246,0.25)]'
                                : isCompleted
                                ? 'text-slate-500 opacity-70'
                                : 'text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 pr-2">
                              {p2Won && <Award className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />}
                              <span className="truncate font-semibold">
                                {match.player2?.full_name || 'TBD'}
                              </span>
                            </div>
                            <span className="font-mono font-black text-sm shrink-0">
                              {match.player2_score !== undefined ? match.player2_score : '-'}
                            </span>
                          </div>
                        </div>

                        {isAdmin && isReady && (
                          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-end">
                            <span className="text-[10px] text-[#3B82F6] font-semibold flex items-center gap-1">
                              Click to log score
                            </span>
                          </div>
                        )}
                      </div>

                      {!isFinal && (
                        <div
                          className={`hidden md:block absolute -right-10 sm:-right-14 top-1/2 w-10 sm:w-14 h-[2px] transition-colors ${
                            pairHasWinner
                              ? 'bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                              : 'bg-white/15'
                          }`}
                        />
                      )}

                      {!isFinal && isEven && (
                        <div
                          className={`hidden md:block absolute -right-10 sm:-right-14 top-1/2 w-[2px] h-[calc(100%+2rem)] transition-colors ${
                            pairHasWinner
                              ? 'bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                              : 'bg-white/15'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {activeMatchModal && activeMatchModal.match.player1 && activeMatchModal.match.player2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F1623] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="font-display font-bold text-white text-base">
                  Bracket Match Score Logger
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveMatchModal(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveScore} className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="block font-semibold text-slate-300">
                  Select Winner
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWinnerId(activeMatchModal.match.player1!.id);
                      setP1Games(3);
                      setP2Games(p2Games >= 3 ? 0 : p2Games);
                    }}
                    className={`p-3 rounded-xl border text-left transition ${
                      selectedWinnerId === activeMatchModal.match.player1!.id
                        ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-white font-bold'
                        : 'border-white/10 bg-[#131C2B] text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="truncate font-bold text-sm">
                      {activeMatchModal.match.player1!.full_name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {activeMatchModal.match.player1!.current_elo} ELO
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWinnerId(activeMatchModal.match.player2!.id);
                      setP2Games(3);
                      setP1Games(p1Games >= 3 ? 0 : p1Games);
                    }}
                    className={`p-3 rounded-xl border text-left transition ${
                      selectedWinnerId === activeMatchModal.match.player2!.id
                        ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-white font-bold'
                        : 'border-white/10 bg-[#131C2B] text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="truncate font-bold text-sm">
                      {activeMatchModal.match.player2!.full_name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {activeMatchModal.match.player2!.current_elo} ELO
                    </div>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">
                  Quick Score Presets
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset(1, 3, 0, '11-7, 11-8, 11-9')}
                    className="p-2 rounded-lg bg-[#131C2B] border border-white/5 hover:border-white/20 text-slate-300 hover:text-white text-center font-mono"
                  >
                    P1 (3 - 0)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(1, 3, 1, '11-8, 9-11, 11-7, 11-9')}
                    className="p-2 rounded-lg bg-[#131C2B] border border-white/5 hover:border-white/20 text-slate-300 hover:text-white text-center font-mono"
                  >
                    P1 (3 - 1)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(1, 3, 2, '11-9, 8-11, 11-8, 9-11, 12-10')}
                    className="p-2 rounded-lg bg-[#131C2B] border border-white/5 hover:border-white/20 text-slate-300 hover:text-white text-center font-mono"
                  >
                    P1 (3 - 2)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(2, 0, 3, '7-11, 8-11, 9-11')}
                    className="p-2 rounded-lg bg-[#131C2B] border border-white/5 hover:border-white/20 text-slate-300 hover:text-white text-center font-mono"
                  >
                    P2 (0 - 3)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(2, 1, 3, '8-11, 11-9, 7-11, 9-11')}
                    className="p-2 rounded-lg bg-[#131C2B] border border-white/5 hover:border-white/20 text-slate-300 hover:text-white text-center font-mono"
                  >
                    P2 (1 - 3)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(2, 2, 3, '9-11, 11-8, 8-11, 11-9, 10-12')}
                    className="p-2 rounded-lg bg-[#131C2B] border border-white/5 hover:border-white/20 text-slate-300 hover:text-white text-center font-mono"
                  >
                    P2 (2 - 3)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] text-slate-400 font-semibold truncate">
                    {activeMatchModal.match.player1!.full_name} Sets
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={4}
                    value={p1Games}
                    onChange={(e) => setP1Games(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-[#131C2B] border border-white/10 text-white font-mono text-center focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] text-slate-400 font-semibold truncate">
                    {activeMatchModal.match.player2!.full_name} Sets
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={4}
                    value={p2Games}
                    onChange={(e) => setP2Games(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-[#131C2B] border border-white/10 text-white font-mono text-center focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-slate-400 font-semibold">
                  Detailed Set Scores
                </label>
                <input
                  type="text"
                  value={setScores}
                  onChange={(e) => setSetScores(e.target.value)}
                  placeholder="11-8, 11-9, 11-7"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#131C2B] border border-white/10 text-white font-mono focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveMatchModal(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-bold transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Advance Winner</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

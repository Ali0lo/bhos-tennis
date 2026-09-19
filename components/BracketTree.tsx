'use client';

import React, { useState } from 'react';
import { Tournament, BracketMatch } from '../lib/data/types';
import { BHOSDataStore } from '../lib/data/store';
import { useTranslation } from '../lib/i18n';
import { Trophy, CheckCircle, Award, PlayCircle, Edit3, X } from 'lucide-react';
import { parseSetScores } from '../lib/elo';

interface BracketTreeProps {
  tournament: Tournament;
  onUpdate?: () => void;
}

export default function BracketTree({ tournament, onUpdate }: BracketTreeProps) {
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();
  const currentUser = store.getCurrentUser();
  const isOfficial = currentUser.role === 'president' || currentUser.role === 'coach';

  const [activeMatchModal, setActiveMatchModal] = useState<{
    roundIndex: number;
    matchIndex: number;
    match: BracketMatch;
  } | null>(null);

  const [setScoresInput, setSetScoresInput] = useState('11-8, 11-9, 11-7');
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!tournament.bracket_data || !tournament.bracket_data.rounds.length) {
    return (
      <div className="p-8 text-center rounded-xl border border-bhos-border bg-bhos-darkCard/40">
        <p className="text-slate-400 text-sm">Bracket has not been generated yet for this tournament.</p>
      </div>
    );
  }

  const handleOpenScoreModal = (roundIndex: number, matchIndex: number, match: BracketMatch) => {
    setActiveMatchModal({ roundIndex, matchIndex, match });
    setSelectedWinnerId(match.player1?.id || '');
    setErrorMsg(null);
  };

  const handleSaveScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMatchModal) return;

    const { roundIndex, matchIndex, match } = activeMatchModal;
    const parsed = parseSetScores(setScoresInput);

    if (!parsed.isValid) {
      setErrorMsg(parsed.errorMessage || 'Invalid set scores');
      return;
    }

    if (!match.player1 || !match.player2) {
      setErrorMsg('Both players must be assigned');
      return;
    }

    const winnerId = parsed.player1Games > parsed.player2Games ? match.player1.id : match.player2.id;

    try {
      store.updateTournamentBracketMatch(
        tournament.id,
        roundIndex,
        matchIndex,
        winnerId,
        {
          p1Score: parsed.player1Games,
          p2Score: parsed.player2Games,
          setScores: setScoresInput,
        }
      );

      setActiveMatchModal(null);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update bracket match');
    }
  };

  const rounds = tournament.bracket_data.rounds;

  return (
    <div className="w-full overflow-x-auto py-6">
      <div className="flex items-start gap-8 min-w-[750px]">
        {rounds.map((round, rIndex) => (
          <div key={rIndex} className="flex-1 min-w-[240px] space-y-4">
            {/* Round Title */}
            <div className="text-center pb-2 border-b border-bhos-border">
              <span className="text-xs font-display font-bold uppercase tracking-wider text-bhos-cyan">
                {round.name}
              </span>
              <span className="block text-[11px] text-slate-500">
                {round.matches.length} {round.matches.length === 1 ? 'Match' : 'Matches'}
              </span>
            </div>

            {/* Matches List */}
            <div className="flex flex-col justify-around gap-6 h-full">
              {round.matches.map((match, mIndex) => {
                const isCompleted = match.status === 'completed';
                const isReady = match.status === 'ready';
                const p1IsWinner = isCompleted && match.winner_id === match.player1?.id;
                const p2IsWinner = isCompleted && match.winner_id === match.player2?.id;

                return (
                  <div
                    key={match.id}
                    className={`relative rounded-xl border transition-all p-3 shadow-md ${
                      isCompleted
                        ? 'border-bhos-border bg-bhos-midnight/90'
                        : isReady
                        ? 'border-cyan-500/40 bg-bhos-darkCard/90 ring-1 ring-cyan-500/20'
                        : 'border-slate-800 bg-bhos-midnight/40 opacity-60'
                    }`}
                  >
                    {/* Header: Match status / number */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                      <span className="font-mono">M#{mIndex + 1}</span>
                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <CheckCircle className="w-3 h-3" />
                          Final
                        </span>
                      ) : isReady ? (
                        <span className="text-bhos-cyan font-semibold flex items-center gap-1">
                          <PlayCircle className="w-3 h-3" />
                          Ready
                        </span>
                      ) : (
                        <span className="text-slate-600">Pending</span>
                      )}
                    </div>

                    {/* Player 1 Slot */}
                    <div
                      className={`flex items-center justify-between p-2 rounded-lg text-xs transition ${
                        p1IsWinner
                          ? 'bg-emerald-500/15 text-white font-bold border border-emerald-500/30'
                          : 'text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {p1IsWinner && <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        <span className="truncate">
                          {match.player1?.full_name || 'TBD'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono shrink-0">
                        {match.player1 && (
                          <span className="text-[10px] text-slate-500">
                            {match.player1.current_elo}
                          </span>
                        )}
                        {isCompleted && (
                          <span
                            className={`w-5 text-center text-sm font-bold ${
                              p1IsWinner ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          >
                            {match.player1_score ?? '-'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Separator / VS */}
                    <div className="h-px bg-bhos-border my-1" />

                    {/* Player 2 Slot */}
                    <div
                      className={`flex items-center justify-between p-2 rounded-lg text-xs transition ${
                        p2IsWinner
                          ? 'bg-emerald-500/15 text-white font-bold border border-emerald-500/30'
                          : 'text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {p2IsWinner && <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        <span className="truncate">
                          {match.player2?.full_name || 'TBD'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono shrink-0">
                        {match.player2 && (
                          <span className="text-[10px] text-slate-500">
                            {match.player2.current_elo}
                          </span>
                        )}
                        {isCompleted && (
                          <span
                            className={`w-5 text-center text-sm font-bold ${
                              p2IsWinner ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          >
                            {match.player2_score ?? '-'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Set score text detail */}
                    {isCompleted && match.set_scores && (
                      <div className="mt-2 pt-1 border-t border-bhos-border/60 text-[10px] font-mono text-slate-400 text-center">
                        Sets: {match.set_scores}
                      </div>
                    )}

                    {/* Admin/Coach Score Logger Action */}
                    {isOfficial && isReady && (
                      <button
                        onClick={() => handleOpenScoreModal(rIndex, mIndex, match)}
                        className="mt-2.5 w-full py-1 rounded bg-bhos-blue/20 hover:bg-bhos-blue/40 border border-bhos-blue/40 text-[11px] font-medium text-bhos-cyan flex items-center justify-center gap-1 transition"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isCompleted ? 'Edit Score' : t('tournaments.enter_score')}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bracket Match Score Input Modal */}
      {activeMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-bhos-border bg-bhos-midnight p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-bhos-border">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-bhos-cyan" />
                <span>Log Bracket Match Result</span>
              </h4>
              <button
                onClick={() => setActiveMatchModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveScore} className="mt-4 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-2.5 rounded bg-red-500/10 border border-red-500/30 text-red-400">
                  {errorMsg}
                </div>
              )}

              <div className="p-3 rounded-xl bg-bhos-darkCard/60 border border-bhos-border flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="font-bold text-white text-sm">
                    {activeMatchModal.match.player1?.full_name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {activeMatchModal.match.player1?.current_elo} ELO
                  </div>
                </div>
                <div className="font-bold text-bhos-cyan px-2">VS</div>
                <div className="text-center flex-1">
                  <div className="font-bold text-white text-sm">
                    {activeMatchModal.match.player2?.full_name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {activeMatchModal.match.player2?.current_elo} ELO
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Set Scores (Format: 11-9, 8-11, 11-7)
                </label>
                <input
                  type="text"
                  value={setScoresInput}
                  onChange={(e) => setSetScoresInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white font-mono focus:border-bhos-cyan focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveMatchModal(null)}
                  className="px-3 py-1.5 rounded text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-bhos-cyan text-bhos-navy font-bold hover:opacity-95 shadow-md shadow-cyan-500/20"
                >
                  Confirm & Advance Winner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


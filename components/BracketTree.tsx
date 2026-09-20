'use client';

import React, { useState } from 'react';
import { Tournament, BracketMatch } from '../lib/data/types';
import { BHOSDataStore } from '../lib/data/store';
import { useTranslation } from '../lib/i18n';
import { Trophy, CheckCircle, Award, PlayCircle, Edit3, X, Sparkles } from 'lucide-react';
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
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);

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
      setErrorMsg(err.message || 'Error updating bracket match');
    }
  };

  return (
    <div className="space-y-4">
      {/* Visual Journey Tracker Hint */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-2">
        <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Hover over any player to trace their tournament journey</span>
        </span>
        {hoveredPlayerId && (
          <span className="text-cyan-300 font-mono text-[11px] animate-pulse">
            Tracing bracket path...
          </span>
        )}
      </div>

      <div className="overflow-x-auto pb-6 pt-2 flex items-stretch gap-8 min-w-[680px]">
        {tournament.bracket_data.rounds.map((round, rIndex) => (
          <div key={round.name || `round-${rIndex}`} className="flex-1 flex flex-col min-w-[220px]">
            {/* Round Title Header */}
            <div className="text-center pb-4 mb-4 border-b border-white/10">
              <span className="font-display font-bold text-xs uppercase tracking-wider text-cyan-400">
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

                const hasHoveredPlayer = Boolean(
                  hoveredPlayerId &&
                  (match.player1?.id === hoveredPlayerId || match.player2?.id === hoveredPlayerId)
                );

                return (
                  <div
                    key={match.id}
                    className={`relative rounded-2xl border transition-all duration-300 p-3 shadow-lg ${
                      hasHoveredPlayer
                        ? 'border-cyan-400 ring-2 ring-cyan-400/40 bg-cyan-950/40 shadow-cyan-500/20 scale-[1.02]'
                        : isCompleted
                        ? 'border-white/10 bg-slate-900/90'
                        : isReady
                        ? 'border-cyan-500/40 bg-slate-900/90 ring-1 ring-cyan-500/20'
                        : 'border-slate-800/80 bg-slate-950/60 opacity-60'
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
                        <span className="text-cyan-400 font-semibold flex items-center gap-1">
                          <PlayCircle className="w-3 h-3" />
                          Ready
                        </span>
                      ) : (
                        <span className="text-slate-600">Pending</span>
                      )}
                    </div>

                    {/* Player 1 Slot */}
                    <div
                      onMouseEnter={() => match.player1?.id && setHoveredPlayerId(match.player1.id)}
                      onMouseLeave={() => setHoveredPlayerId(null)}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs transition cursor-pointer ${
                        match.player1?.id === hoveredPlayerId
                          ? 'bg-cyan-500/25 text-white font-bold ring-1 ring-cyan-400'
                          : p1IsWinner
                          ? 'bg-emerald-500/15 text-white font-bold border border-emerald-500/30'
                          : 'text-slate-300 hover:bg-white/5'
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
                    <div className="h-px bg-white/10 my-1" />

                    {/* Player 2 Slot */}
                    <div
                      onMouseEnter={() => match.player2?.id && setHoveredPlayerId(match.player2.id)}
                      onMouseLeave={() => setHoveredPlayerId(null)}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs transition cursor-pointer ${
                        match.player2?.id === hoveredPlayerId
                          ? 'bg-cyan-500/25 text-white font-bold ring-1 ring-cyan-400'
                          : p2IsWinner
                          ? 'bg-emerald-500/15 text-white font-bold border border-emerald-500/30'
                          : 'text-slate-300 hover:bg-white/5'
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
                      <div className="mt-2 pt-1 border-t border-white/10 text-[10px] font-mono text-slate-400 text-center">
                        Sets: {match.set_scores}
                      </div>
                    )}

                    {/* Admin/Coach Score Logger Action */}
                    {isOfficial && isReady && (
                      <button
                        onClick={() => handleOpenScoreModal(rIndex, mIndex, match)}
                        className="mt-2.5 w-full py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-[11px] font-medium text-cyan-300 flex items-center justify-center gap-1 transition active:scale-95"
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
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-cyan-400" />
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
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  Matchup:
                </label>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium flex items-center justify-between">
                  <span>{activeMatchModal.match.player1?.full_name}</span>
                  <span className="text-slate-500">VS</span>
                  <span>{activeMatchModal.match.player2?.full_name}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  {t('matches.set_scores')}
                </label>
                <input
                  type="text"
                  value={setScoresInput}
                  onChange={(e) => setSetScoresInput(e.target.value)}
                  placeholder="e.g., 11-9, 9-11, 11-7, 11-5"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white font-mono focus:outline-none focus:border-cyan-400"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {t('matches.set_scores_help')}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveMatchModal(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 font-semibold"
                >
                  {t('profile.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold shadow-md shadow-cyan-500/20 active:scale-95 transition"
                >
                  {t('matches.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Winner checkmark

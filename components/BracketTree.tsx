'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Tournament, BracketMatch } from '../lib/data/types';
import { BHOSDataStore } from '../lib/data/store';
import { getSupabaseClient } from '../lib/supabase/client';
import { canAdvanceBracketMatch } from '../lib/tournament';
import { parseSetScores, validateMatchSetSummary } from '../lib/elo';
import { sanitizeTextInput } from '../lib/security/sanitize';
import {
  Trophy,
  Award,
  Check,
  X,
  Loader2,
  Sparkles,
  Radio,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';

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
  const submittingRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pulsingSlots, setPulsingSlots] = useState<Record<string, boolean>>({});
  const [selectedStartRound, setSelectedStartRound] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevSlotsRef = useRef<Record<string, { p1?: string; p2?: string }>>({});
  const initializedRef = useRef(false);

  useEffect(() => {
    const rounds = tournament.bracket_data?.rounds;
    if (!rounds) return;

    const nextSnapshot: Record<string, { p1?: string; p2?: string }> = {};
    const newlyPulsing: Record<string, boolean> = {};
    const now = Date.now();

    rounds.forEach((round, rIdx) => {
      round.matches.forEach((m, mIdx) => {
        const key = `${rIdx}-${mIdx}`;
        const p1Id = m.player1?.id;
        const p2Id = m.player2?.id;
        nextSnapshot[key] = { p1: p1Id, p2: p2Id };

        if (initializedRef.current) {
          const prev = prevSlotsRef.current[key];
          if (prev && !prev.p1 && p1Id) {
            newlyPulsing[`${key}-1`] = true;
          }
          if (prev && !prev.p2 && p2Id) {
            newlyPulsing[`${key}-2`] = true;
          }
        }

        if (m.advancedAt && now - m.advancedAt < 6000 && m.advancedSlot) {
          newlyPulsing[`${key}-${m.advancedSlot}`] = true;
        }
      });
    });

    prevSlotsRef.current = nextSnapshot;
    initializedRef.current = true;

    if (Object.keys(newlyPulsing).length > 0) {
      setPulsingSlots((prev) => ({ ...prev, ...newlyPulsing }));
      const timer = setTimeout(() => {
        setPulsingSlots((prev) => {
          const copy = { ...prev };
          Object.keys(newlyPulsing).forEach((k) => {
            delete copy[k];
          });
          return copy;
        });
      }, 3800);
      return () => clearTimeout(timer);
    }
  }, [tournament.bracket_data]);

  if (!tournament.bracket_data || !tournament.bracket_data.rounds || tournament.bracket_data.rounds.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl border border-white/10 bg-[#0F1623]">
        <p className="text-slate-400 text-sm">Bracket has not been generated yet for this tournament.</p>
      </div>
    );
  }

  const rounds = tournament.bracket_data.rounds;
  const finalRound = rounds[rounds.length - 1];
  const finalMatch = finalRound?.matches?.[0];
  const championProfile =
    finalMatch?.status === 'completed' && finalMatch.winner_id
      ? finalMatch.player1?.id === finalMatch.winner_id
        ? finalMatch.player1
        : finalMatch.player2
      : null;

  const handleOpenScoreModal = (roundIndex: number, matchIndex: number, match: BracketMatch) => {
    if (!isAdmin || !match.player1 || !match.player2 || match.is_bye) return;
    if (tournament.bracket_data) {
      const check = canAdvanceBracketMatch(tournament.bracket_data, roundIndex, matchIndex);
      if (!check.allowed) return;
    }
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
    if (!activeMatchModal || submitting || submittingRef.current) return;

    const { roundIndex, matchIndex, match } = activeMatchModal;
    if (!match.player1 || !match.player2) {
      setErrorMsg('Both players must be assigned');
      return;
    }

    if (match.player1.id === match.player2.id) {
      setErrorMsg('A player cannot play against themselves');
      return;
    }

    if (!selectedWinnerId || (selectedWinnerId !== match.player1.id && selectedWinnerId !== match.player2.id)) {
      setErrorMsg('Please select a valid winning player');
      return;
    }

    const summaryValidation = validateMatchSetSummary(p1Games, p2Games);
    if (!summaryValidation.isValid) {
      setErrorMsg(summaryValidation.errorMessage || 'Invalid match set scores');
      return;
    }

    const p1WonBySets = p1Games > p2Games;
    if ((selectedWinnerId === match.player1.id && !p1WonBySets) || (selectedWinnerId === match.player2.id && p1WonBySets)) {
      setErrorMsg('Selected winner must have the higher set count');
      return;
    }

    const cleanSetScores = sanitizeTextInput(setScores, 120);
    if (!cleanSetScores) {
      setErrorMsg('Detailed set scores are required');
      return;
    }

    const parsedSets = parseSetScores(cleanSetScores, p1Games, p2Games);
    if (!parsedSets.isValid) {
      setErrorMsg(parsedSets.errorMessage || 'Invalid table tennis game scores');
      return;
    }

    submittingRef.current = true;
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
          setScores: cleanSetScores,
        }
      );

      if (roundIndex + 1 < rounds.length) {
        const nextMatchIdx = Math.floor(matchIndex / 2);
        const targetSlot = matchIndex % 2 === 0 ? 1 : 2;
        const pulseKey = `${roundIndex + 1}-${nextMatchIdx}-${targetSlot}`;
        setPulsingSlots((prev) => ({ ...prev, [pulseKey]: true }));
        setTimeout(() => {
          setPulsingSlots((prev) => {
            const next = { ...prev };
            delete next[pulseKey];
            return next;
          });
        }, 3800);
      }

      const supabase = getSupabaseClient();
      if (supabase && updatedTourn.bracket_data) {
        await supabase
          .from('tournaments')
          .update({
            bracket_data: updatedTourn.bracket_data,
            status: updatedTourn.status,
            winner_id: updatedTourn.winner_id || null,
          })
          .eq('id', tournament.id);
      }

      setActiveMatchModal(null);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update bracket match');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const safeStartRound = Math.min(selectedStartRound, Math.max(0, rounds.length - 1));
  const visibleRounds = rounds
    .map((round, originalIndex) => ({ ...round, originalIndex }))
    .slice(safeStartRound);
  const isLargeBracket = (rounds[0]?.matches.length || 0) >= 8;

  const handleHorizontalScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const offset = direction === 'left' ? -320 : 320;
    scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <div className="space-y-5">
      {championProfile && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl border border-amber-500/40 bg-slate-900 flex items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                Tournament Champion
              </span>
              <span className="text-base sm:text-lg font-display font-black text-white">
                {championProfile.full_name}
              </span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
            {championProfile.current_elo} ELO
          </span>
        </motion.div>
      )}

      {rounds.length > 2 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#131C2B]/80 border border-white/10">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              <Layers className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Mərhələ:</span>
            </span>
            {rounds.map((r, idx) => {
              const active = safeStartRound === idx;
              return (
                <button
                  key={r.name || `tab-${idx}`}
                  type="button"
                  onClick={() => setSelectedStartRound(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    active
                      ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/20'
                      : 'bg-[#0F1623] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {idx === 0 ? `Hamısı (${r.name})` : r.name}
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleHorizontalScroll('left')}
              className="p-1.5 rounded-xl bg-[#0F1623] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleHorizontalScroll('right')}
              className="p-1.5 rounded-xl bg-[#0F1623] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className={`w-full min-w-0 overflow-x-auto overscroll-x-contain pb-8 pt-2 ${
          isLargeBracket ? 'max-h-[82vh] overflow-y-auto overscroll-y-contain pr-2' : ''
        }`}
      >
        <div className="flex w-max min-w-[720px] items-stretch gap-10 sm:gap-14">
        {visibleRounds.map((round) => {
          const rIndex = round.originalIndex;
          const isFinal = rIndex === rounds.length - 1;
          const matchCount = round.matches.length;

          return (
            <div key={round.name || `r-${rIndex}`} className="flex-1 flex flex-col min-w-[240px] max-w-[280px]">
              <div className="sticky top-0 z-20 bg-[#0F1623]/95 backdrop-blur-md text-center py-2.5 mb-6 border-b border-white/10 rounded-t-xl">
                <span className="font-display font-black text-xs uppercase tracking-wider text-[#3B82F6]">
                  {round.name}
                </span>
                <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                  {matchCount} {matchCount === 1 ? 'Match' : 'Matches'}
                </span>
              </div>

              <div className="flex flex-col justify-around gap-8 h-full">
                {round.matches.map((match, mIndex) => {
                  const isCompleted = match.status === 'completed' || match.status === 'approved';
                  const isReady =
                    !isCompleted &&
                    (match.status === 'ready' || match.status === 'scheduled') &&
                    Boolean(match.player1 && match.player2);
                  const p1Won = isCompleted && Boolean(match.winner_id && match.winner_id === match.player1?.id);
                  const p2Won = isCompleted && Boolean(match.winner_id && match.winner_id === match.player2?.id);
                  const canAdvanceNode =
                    tournament.bracket_data
                      ? canAdvanceBracketMatch(tournament.bracket_data, rIndex, mIndex).allowed
                      : false;
                  const isClickable = Boolean(isAdmin && match.player1 && match.player2 && !match.is_bye && canAdvanceNode);

                  const isEven = mIndex % 2 === 0;
                  const pairHasWinner = isCompleted;
                  const siblingHasWinner = Boolean(round.matches[mIndex + 1]?.winner_id);
                  const branchActive = pairHasWinner || siblingHasWinner;
                  const slot1Pulsing = Boolean(pulsingSlots[`${rIndex}-${mIndex}-1`]);
                  const slot2Pulsing = Boolean(pulsingSlots[`${rIndex}-${mIndex}-2`]);

                  return (
                    <div key={match.id} className="relative group">
                      <div
                        onClick={() => isClickable && handleOpenScoreModal(rIndex, mIndex, match)}
                        className={`rounded-2xl p-3.5 bg-slate-900 border transition-all duration-300 relative z-10 ${
                          isFinal
                            ? 'border-amber-500/70 bg-slate-900 shadow-md ring-1 ring-amber-500/30'
                            : isCompleted
                            ? 'border-slate-800 bg-slate-900 shadow-sm'
                            : isReady
                            ? 'border-blue-600/70 shadow-sm ring-1 ring-blue-600/30 hover:border-blue-500'
                            : 'border-slate-800/70 bg-slate-900/60 opacity-70'
                        } ${isClickable ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.99]' : ''}`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-2 pb-1.5 border-b border-slate-800">
                          <span className="flex items-center gap-1.5">
                            {isFinal && <Trophy className="w-3 h-3 text-amber-400 animate-pulse" />}
                            <span className={isFinal ? 'text-amber-400 font-bold' : ''}>
                              {isFinal ? 'Championship' : `Match #${mIndex + 1}`}
                            </span>
                          </span>
                          {isCompleted ? (
                            <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-500 stroke-[3]" /> Completed
                            </span>
                          ) : isReady ? (
                            <span className="text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                              <Radio className="w-3 h-3" />
                              <span>Live / Ready</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 uppercase tracking-wider">
                              Awaiting
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          {match.player1 ? (
                            <motion.div
                              animate={
                                slot1Pulsing
                                  ? {
                                      scale: [1, 1.03, 1],
                                    }
                                  : undefined
                              }
                              transition={{ duration: 1.1, repeat: slot1Pulsing ? 2 : 0 }}
                              className={`flex items-center justify-between p-2 rounded-xl text-xs transition ${
                                p1Won
                                  ? 'bg-blue-700/20 text-white font-bold border border-blue-600/50 shadow-sm'
                                  : isCompleted
                                  ? 'text-slate-500 opacity-60 bg-slate-950/50'
                                  : slot1Pulsing
                                  ? 'bg-blue-700/15 text-white border border-blue-600/60 animate-pulse'
                                  : 'text-slate-200 bg-slate-950/60 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                {p1Won && <Award className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                                {slot1Pulsing && !p1Won && (
                                  <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-bounce" />
                                )}
                                <span className="truncate font-semibold">
                                  {match.player1.full_name}
                                </span>
                              </div>
                              <span
                                className={`font-mono font-black text-sm shrink-0 ${
                                  p1Won ? 'text-blue-400' : ''
                                }`}
                              >
                                {match.player1_score !== undefined ? match.player1_score : '-'}
                              </span>
                            </motion.div>
                          ) : (
                            <div className="flex items-center justify-between p-2 rounded-xl text-xs border border-dashed border-slate-800 bg-slate-950/40 opacity-55">
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] font-mono uppercase tracking-wider text-slate-500">
                                  {match.is_bye ? 'BYE' : 'TBD'}
                                </span>
                                <span className="text-slate-600 font-mono tracking-widest text-[11px]">
                                  {match.is_bye ? 'Avto-keçid' : '— — — —'}
                                </span>
                              </div>
                              <span className="font-mono text-slate-600 text-xs">--</span>
                            </div>
                          )}

                          {match.player2 ? (
                            <motion.div
                              animate={
                                slot2Pulsing
                                  ? {
                                      scale: [1, 1.03, 1],
                                    }
                                  : undefined
                              }
                              transition={{ duration: 1.1, repeat: slot2Pulsing ? 2 : 0 }}
                              className={`flex items-center justify-between p-2 rounded-xl text-xs transition ${
                                p2Won
                                  ? 'bg-blue-700/20 text-white font-bold border border-blue-600/50 shadow-sm'
                                  : isCompleted
                                  ? 'text-slate-500 opacity-60 bg-slate-950/50'
                                  : slot2Pulsing
                                  ? 'bg-blue-700/15 text-white border border-blue-600/60 animate-pulse'
                                  : 'text-slate-200 bg-slate-950/60 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                {p2Won && <Award className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                                {slot2Pulsing && !p2Won && (
                                  <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-bounce" />
                                )}
                                <span className="truncate font-semibold">
                                  {match.player2.full_name}
                                </span>
                              </div>
                              <span
                                className={`font-mono font-black text-sm shrink-0 ${
                                  p2Won ? 'text-blue-400' : ''
                                }`}
                              >
                                {match.player2_score !== undefined ? match.player2_score : '-'}
                              </span>
                            </motion.div>
                          ) : (
                            <div className="flex items-center justify-between p-2 rounded-xl text-xs border border-dashed border-white/10 bg-white/[0.01] opacity-55">
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono uppercase tracking-wider text-slate-500">
                                  {match.is_bye ? 'BYE' : 'TBD'}
                                </span>
                                <span className="text-slate-600 font-mono tracking-widest text-[11px]">
                                  {match.is_bye ? 'Avto-keçid' : '— — — —'}
                                </span>
                              </div>
                              <span className="font-mono text-slate-600 text-xs">--</span>
                            </div>
                          )}
                        </div>

                        {isCompleted && match.set_scores && (
                          <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <span>Sets</span>
                            <span className="text-slate-400">{match.set_scores}</span>
                          </div>
                        )}

                        {isAdmin && isReady && (
                          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-end">
                            <span className="text-[10px] text-[#3B82F6] font-semibold flex items-center gap-1">
                              Click to verify & advance
                            </span>
                          </div>
                        )}
                      </div>

                      {!isFinal && (
                        <svg
                          className="hidden md:block absolute -right-10 sm:-right-14 top-1/2 -translate-y-1/2 w-10 sm:w-14 h-4 overflow-visible pointer-events-none"
                          viewBox="0 0 56 16"
                          preserveAspectRatio="none"
                        >
                          <motion.path
                            d="M 0 8 L 56 8"
                            fill="none"
                            stroke={pairHasWinner ? '#3B82F6' : 'rgba(255, 255, 255, 0.16)'}
                            strokeWidth="2"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{
                              duration: 0.75,
                              delay: rIndex * 0.18 + mIndex * 0.08,
                              ease: 'easeOut',
                            }}
                            style={{
                              filter: pairHasWinner ? 'drop-shadow(0px 0px 6px #3B82F6)' : undefined,
                            }}
                          />
                        </svg>
                      )}

                      {!isFinal && isEven && (
                        <svg
                          className="hidden md:block absolute -right-10 sm:-right-14 top-1/2 w-4 h-[calc(100%+2rem)] overflow-visible pointer-events-none"
                          viewBox="0 0 16 100"
                          preserveAspectRatio="none"
                        >
                          <motion.path
                            d="M 16 0 L 16 100"
                            fill="none"
                            stroke={branchActive ? '#3B82F6' : 'rgba(255, 255, 255, 0.16)'}
                            strokeWidth="2"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{
                              duration: 0.85,
                              delay: rIndex * 0.2 + mIndex * 0.1,
                              ease: 'easeOut',
                            }}
                            style={{
                              filter: branchActive ? 'drop-shadow(0px 0px 6px #3B82F6)' : undefined,
                            }}
                          />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        </div>
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

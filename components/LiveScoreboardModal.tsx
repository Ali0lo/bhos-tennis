'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import ScrollLock from './ScrollLock';
import { useTranslation } from '../lib/i18n';
import {
  RotateCcw,
  ArrowLeftRight,
  RefreshCw,
  X,
  Trophy,
  CheckCircle2,
  Sun,
} from 'lucide-react';

export interface LiveScoreboardResult {
  scoreA: number;
  scoreB: number;
  detailedScores: string;
  sets: Array<{ a: number; b: number }>;
}

interface LiveScoreboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerAName: string;
  playerBName: string;
  onApplyScores: (result: LiveScoreboardResult) => void;
}

interface ScoreSnapshot {
  pointsA: number;
  pointsB: number;
  completedSets: Array<{ a: number; b: number }>;
}

export default function LiveScoreboardModal({
  isOpen,
  onClose,
  playerAName,
  playerBName,
  onApplyScores,
}: LiveScoreboardModalProps) {
  const { t } = useTranslation();

  const [bestOf, setBestOf] = useState<3 | 5>(5);
  const [pointsA, setPointsA] = useState(0);
  const [pointsB, setPointsB] = useState(0);
  const [completedSets, setCompletedSets] = useState<Array<{ a: number; b: number }>>([]);
  const [history, setHistory] = useState<ScoreSnapshot[]>([]);
  const [initialServer, setInitialServer] = useState<'A' | 'B'>('A');
  const [swapped, setSwapped] = useState(false);
  const [setNotice, setSetNotice] = useState<string | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setsToWin = bestOf === 3 ? 2 : 3;
  const setsA = completedSets.filter((s) => s.a > s.b).length;
  const setsB = completedSets.filter((s) => s.b > s.a).length;
  const matchWinner: 'A' | 'B' | null =
    setsA >= setsToWin ? 'A' : setsB >= setsToWin ? 'B' : null;
  const isDeuce = !matchWinner && pointsA >= 10 && pointsB >= 10;
  const canSwitchToBo3 = Math.max(setsA, setsB) < 2 && !matchWinner;
  const canToggleFirstServer =
    completedSets.length === 0 && pointsA === 0 && pointsB === 0 && !matchWinner;

  // ITTF serve rule: 2 serves each, alternating; at 10-10 switches to 1 serve each.
  // First server alternates each set.
  const setFirstServer: 'A' | 'B' =
    completedSets.length % 2 === 0
      ? initialServer
      : initialServer === 'A'
      ? 'B'
      : 'A';
  const totalPoints = pointsA + pointsB;
  const inDeuceServeMode = pointsA >= 10 && pointsB >= 10;
  const currentServer: 'A' | 'B' = inDeuceServeMode
    ? (totalPoints - 20) % 2 === 0
      ? setFirstServer
      : setFirstServer === 'A'
      ? 'B'
      : 'A'
    : Math.floor(totalPoints / 2) % 2 === 0
    ? setFirstServer
    : setFirstServer === 'A'
    ? 'B'
    : 'A';
  const servesLeft = inDeuceServeMode ? 1 : totalPoints % 2 === 0 ? 2 : 1;

  // Set Point / Match Point detection
  const aOnSetPoint = !matchWinner && pointsA >= 10 && pointsA > pointsB;
  const aOnMatchPoint = aOnSetPoint && setsA + 1 >= setsToWin;
  const bOnSetPoint = !matchWinner && pointsB >= 10 && pointsB > pointsA;
  const bOnMatchPoint = bOnSetPoint && setsB + 1 >= setsToWin;

  // Keep screen awake via Wake Lock API while modal is open
  useEffect(() => {
    if (!isOpen || typeof navigator === 'undefined') {
      setWakeLockActive(false);
      return;
    }

    let cancelled = false;
    let sentinel: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      try {
        if (!('wakeLock' in navigator) || typeof navigator.wakeLock?.request !== 'function') {
          return;
        }
        const acquired = await navigator.wakeLock.request('screen');
        if (cancelled) {
          await acquired.release().catch(() => {});
          return;
        }
        sentinel = acquired;
        setWakeLockActive(true);
        acquired.addEventListener('release', () => {
          if (!cancelled) setWakeLockActive(false);
        });
      } catch {
        if (!cancelled) setWakeLockActive(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        void requestWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (sentinel) {
        void sentinel.release().catch(() => {});
        sentinel = null;
      }
      setWakeLockActive(false);
    };
  }, [isOpen]);

  // Close with Escape when open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    };
  }, []);

  const showTransientNotice = useCallback((msg: string) => {
    setSetNotice(msg);
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = setTimeout(() => {
      setSetNotice(null);
    }, 2500);
  }, []);

  const handleScorePoint = useCallback(
    (side: 'A' | 'B') => {
      if (matchWinner) return;

      setHistory((prev) => [...prev, { pointsA, pointsB, completedSets }]);

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate?.(15);
        } catch {
          // Ignore unsupported vibrate errors
        }
      }

      const nextA = side === 'A' ? pointsA + 1 : pointsA;
      const nextB = side === 'B' ? pointsB + 1 : pointsB;

      if (Math.max(nextA, nextB) >= 11 && Math.abs(nextA - nextB) >= 2) {
        const nextSets = [...completedSets, { a: nextA, b: nextB }];
        setCompletedSets(nextSets);
        setPointsA(0);
        setPointsB(0);
        const noticeText = t('scoreboard.set_won_notice', 'Set {set} bitdi: {score}')
          .replace('{set}', String(nextSets.length))
          .replace('{score}', `${nextA}–${nextB}`);
        showTransientNotice(noticeText);
      } else {
        setPointsA(nextA);
        setPointsB(nextB);
      }
    },
    [matchWinner, pointsA, pointsB, completedSets, t, showTransientNotice]
  );

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const snapshot = prev[prev.length - 1];
      setPointsA(snapshot.pointsA);
      setPointsB(snapshot.pointsB);
      setCompletedSets(snapshot.completedSets);
      setSetNotice(null);
      return prev.slice(0, -1);
    });
  }, []);

  const handleReset = useCallback(() => {
    setPointsA(0);
    setPointsB(0);
    setCompletedSets([]);
    setHistory([]);
    setSetNotice(null);
  }, []);

  const handleApplyToMatch = useCallback(() => {
    if (!matchWinner) return;
    const aWonMatch = setsA > setsB;
    const detailedScores = completedSets
      .map((s) => (aWonMatch ? `${s.a}-${s.b}` : `${s.b}-${s.a}`))
      .join(', ');
    onApplyScores({
      scoreA: setsA,
      scoreB: setsB,
      detailedScores,
      sets: completedSets,
    });
  }, [matchWinner, setsA, setsB, completedSets, onApplyScores]);

  if (!isOpen) return null;

  const orderedSides: Array<'A' | 'B'> = swapped ? ['B', 'A'] : ['A', 'B'];
  const currentSetNumber = Math.min(bestOf, completedSets.length + 1);
  const winnerName = matchWinner === 'A' ? playerAName : playerBName;

  return (
    <div
      className="fixed inset-0 z-[80] bg-[#060911] text-white flex flex-col select-none touch-manipulation overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={t('scoreboard.title', 'Canlı Hakim Tablosu')}
    >
      <ScrollLock />

      {/* Top Control Bar */}
      <header className="pt-[max(0.625rem,env(safe-area-inset-top))] px-3 sm:px-5 pb-2.5 border-b border-white/10 bg-[#0B0F19]/95 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-900 border border-white/10 p-0.5">
            <button
              type="button"
              disabled={!canSwitchToBo3}
              onClick={() => setBestOf(3)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                bestOf === 3
                  ? 'bg-[#3B82F6] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('scoreboard.best_of_3', 'BO3')}
            </button>
            <button
              type="button"
              disabled={Boolean(matchWinner)}
              onClick={() => setBestOf(5)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                bestOf === 5
                  ? 'bg-[#3B82F6] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('scoreboard.best_of_5', 'BO5')}
            </button>
          </div>

          {wakeLockActive && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-semibold text-emerald-300">
              <Sun className="w-3 h-3" />
              <span>{t('scoreboard.screen_awake', 'Ekran Açıq')}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            disabled={history.length === 0}
            onClick={handleUndo}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-200 disabled:opacity-35 disabled:cursor-not-allowed transition active:scale-95"
            title={t('scoreboard.undo', 'Geri al')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">{t('scoreboard.undo', 'Geri al')}</span>
          </button>

          <button
            type="button"
            onClick={() => setSwapped((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition active:scale-95 ${
              swapped
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                : 'bg-slate-900 hover:bg-slate-800 border-white/10 text-slate-200'
            }`}
            title={t('scoreboard.swap_sides', 'Tərəfləri Dəyiş')}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('scoreboard.swap_sides', 'Tərəfləri Dəyiş')}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-200 transition active:scale-95"
            title={t('scoreboard.reset', 'Sıfırla')}
            aria-label={t('scoreboard.reset', 'Sıfırla')}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-900 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-slate-300 hover:text-white transition"
            title={t('scoreboard.close', 'Bağla')}
            aria-label={t('scoreboard.close', 'Bağla')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Compact Sets & Status Strip */}
      <div className="px-3 sm:px-5 py-2 bg-[#090D16] border-b border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 font-mono font-bold text-slate-200">
            {t('scoreboard.set_label', 'Set')} {currentSetNumber} / {bestOf}
          </span>

          {isDeuce && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-bold tracking-wider text-[11px] animate-pulse">
              {t('scoreboard.deuce', 'DEUCE • 2 XAL FƏRQ')}
            </span>
          )}

          {setNotice && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-semibold text-[11px]">
              {setNotice}
            </span>
          )}

          {completedSets.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {completedSets.map((s, idx) => (
                <span
                  key={`set-${idx}`}
                  className="px-2 py-0.5 rounded-md bg-slate-900 border border-white/10 font-mono text-[11px] text-slate-300"
                >
                  {s.a}–{s.b}
                </span>
              ))}
            </div>
          )}
        </div>

        {canToggleFirstServer && (
          <button
            type="button"
            onClick={() => setInitialServer((prev) => (prev === 'A' ? 'B' : 'A'))}
            className="px-2.5 py-0.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-semibold text-amber-300 transition"
          >
            🏓 {t('scoreboard.tap_to_switch_server', 'İlk servisi dəyiş')}
          </button>
        )}
      </div>

      {/* Two Large Tap-to-Score Halves */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 landscape:grid-cols-2 gap-2.5 sm:gap-4 p-2.5 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] min-h-0">
        {orderedSides.map((side) => {
          const isA = side === 'A';
          const name = isA ? playerAName : playerBName;
          const points = isA ? pointsA : pointsB;
          const setsWon = isA ? setsA : setsB;
          const isServing = !matchWinner && currentServer === side;
          const isMatchPoint = isA ? aOnMatchPoint : bOnMatchPoint;
          const isSetPoint = isA ? aOnSetPoint : bOnSetPoint;

          const cardTheme = isA
            ? 'from-blue-950/80 via-[#0F1B33] to-[#090F1D] border-blue-500/35 active:border-blue-400 active:from-blue-900/80'
            : 'from-rose-950/75 via-[#29101E] to-[#0D0A12] border-rose-500/35 active:border-rose-400 active:from-rose-900/75';

          const setBadgeTheme = isA
            ? 'bg-blue-500/20 border-blue-400/40 text-blue-200'
            : 'bg-rose-500/20 border-rose-400/40 text-rose-200';

          return (
            <button
              key={side}
              type="button"
              disabled={Boolean(matchWinner)}
              onClick={() => handleScorePoint(side)}
              className={`relative rounded-3xl border-2 bg-gradient-to-br ${cardTheme} p-4 sm:p-6 flex flex-col items-center justify-between text-center transition-transform active:scale-[0.985] disabled:cursor-default overflow-hidden min-h-0 ${
                isServing ? 'ring-2 ring-amber-400/40' : ''
              }`}
            >
              {/* Top Row: Name + Sets Won + Serve Pill */}
              <div className="w-full flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`inline-flex items-center justify-center min-w-[2.25rem] h-9 px-2 rounded-xl border font-mono text-lg font-black shrink-0 ${setBadgeTheme}`}
                  >
                    {setsWon}
                  </span>
                  <span className="font-display font-bold text-base sm:text-xl text-white truncate">
                    {name}
                  </span>
                </div>

                {isServing && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-300 text-[11px] font-black tracking-wider shrink-0">
                    <span>🏓 {t('scoreboard.serve', 'SERVİS')}</span>
                    <span className="inline-flex items-center gap-0.5">
                      {Array.from({ length: servesLeft }).map((_, dotIdx) => (
                        <span
                          key={dotIdx}
                          className="w-1.5 h-1.5 rounded-full bg-amber-300"
                        />
                      ))}
                    </span>
                  </span>
                )}
              </div>

              {/* Center: Giant Point Counter */}
              <div className="my-auto flex items-center justify-center">
                <span className="text-[18vh] sm:text-[24vh] landscape:text-[26vh] leading-none font-mono font-black tracking-tighter tabular-nums drop-shadow-lg">
                  {points}
                </span>
              </div>

              {/* Bottom Status */}
              <div className="h-6 flex items-center justify-center">
                {isMatchPoint ? (
                  <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 text-[11px] font-black tracking-wider uppercase animate-pulse">
                    {t('scoreboard.match_point', 'MATÇ XALI')}
                  </span>
                ) : isSetPoint ? (
                  <span className="px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[11px] font-black tracking-wider uppercase">
                    {t('scoreboard.set_point', 'SET XALI')}
                  </span>
                ) : totalPoints === 0 ? (
                  <span className="text-[11px] font-medium text-white/40">
                    {t('scoreboard.tap_to_score', '+1 xal üçün toxunun')}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Match Complete Overlay */}
      {matchWinner && (
        <div className="fixed inset-0 z-[90] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-amber-500/40 bg-[#0F1623] p-6 sm:p-7 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-widest font-bold text-amber-300">
                {t('scoreboard.match_complete', 'Matç Başa Çatdı')}
              </span>
              <h2 className="text-2xl font-display font-black text-white">
                {winnerName}
              </h2>
              <p className="text-xs text-slate-400">
                {t('scoreboard.winner_label', 'Qalib')} •{' '}
                <span className="font-mono font-bold text-white">
                  {setsA} – {setsB}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 py-2 border-y border-white/10">
              {completedSets.map((s, idx) => (
                <span
                  key={`final-set-${idx}`}
                  className="px-3 py-1 rounded-xl bg-slate-900 border border-white/10 font-mono text-xs font-bold text-slate-200"
                >
                  {s.a}–{s.b}
                </span>
              ))}
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleApplyToMatch}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#22C55E] hover:bg-emerald-500 text-slate-950 font-display font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {t('scoreboard.use_scores_button', 'Nəticəni Rəsmi Matçda İstifadə Et')}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleUndo}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('scoreboard.undo_last_point', 'Son Xalı Geri Al')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('scoreboard.new_match', 'Yeni Oyun')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

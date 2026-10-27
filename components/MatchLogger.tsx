'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getSupabaseClient } from '../lib/supabase/client';
import { BHOSDataStore } from '../lib/data/store';
import { PlayerProfile, isProfilePending } from '../lib/data/types';
import { getSetDominanceMultiplier, MAX_ELO, MIN_ELO } from '../lib/elo/calculator';
import AthleteCombobox from './AthleteCombobox';
import {
  Swords,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldCheck,
  UserCheck,
  Plus,
  Minus,
} from 'lucide-react';

interface MatchLoggerProps {
  onMatchLogged?: () => void;
  initialOpponentId?: string | null;
}

export function calculateStandardElo(
  p1Elo: number,
  p2Elo: number,
  kFactor: number = 32,
  setsWon?: number,
  setsLost?: number
): {
  delta: number;
  p1After: number;
  p2After: number;
  expectedP1: number;
  setMultiplier: number;
} {
  const safeP1 = Math.min(MAX_ELO, Math.max(MIN_ELO, p1Elo));
  const safeP2 = Math.min(MAX_ELO, Math.max(MIN_ELO, p2Elo));
  const exponent = (safeP2 - safeP1) / 400;
  const expectedP1 = 1 / (1 + Math.pow(10, exponent));
  const setMultiplier = getSetDominanceMultiplier(setsWon, setsLost);
  let delta = Math.round(kFactor * (1 - expectedP1) * setMultiplier);
  if (delta < 1) delta = 1;
  const p1After = Math.min(MAX_ELO, Math.max(MIN_ELO, safeP1 + delta));
  const p2After = Math.min(MAX_ELO, Math.max(MIN_ELO, safeP2 - delta));
  return {
    delta,
    p1After,
    p2After,
    expectedP1,
    setMultiplier,
  };
}

const WIN_PRESETS: Array<[number, number]> = [
  [3, 0],
  [3, 1],
  [3, 2],
];

const LOSS_PRESETS: Array<[number, number]> = [
  [0, 3],
  [1, 3],
  [2, 3],
];

const MAX_SETS = 7;

function isApprovedAthlete(p: PlayerProfile): boolean {
  return p.is_verified !== false && !isProfilePending(p);
}

function ScoreStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex-1 p-3 rounded-xl bg-[#131C2B] border border-white/5">
      <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2 truncate">
        {label}
      </span>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={`${label} azalt`}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 transition active:scale-95"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="font-mono text-2xl font-black text-white w-8 text-center">{value}</span>
        <button
          type="button"
          aria-label={`${label} artır`}
          onClick={() => onChange(Math.min(MAX_SETS, value + 1))}
          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 transition active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function MatchLogger({
  onMatchLogged,
  initialOpponentId,
}: MatchLoggerProps) {
  const store = BHOSDataStore.getInstance();
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(store.getCurrentUser());

  const [opponentId, setOpponentId] = useState<string>(initialOpponentId || '');
  const [adminP1Id, setAdminP1Id] = useState<string>('');
  const [adminP2Id, setAdminP2Id] = useState<string>(initialOpponentId || '');
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [detailedScores, setDetailedScores] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<{
    message: string;
    points?: number;
    winnerName: string;
    loserName: string;
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

  const fetchActivePlayers = useCallback(async () => {
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
          setPlayers((data as PlayerProfile[]).filter(isApprovedAthlete));
          setLoadingPlayers(false);
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }

    setPlayers(store.getVerifiedProfiles().filter(isApprovedAthlete));
    setLoadingPlayers(false);
  }, [store]);

  useEffect(() => {
    fetchCurrentUser();
    fetchActivePlayers();
    const resolvedOpponentId =
      initialOpponentId ||
      (typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('opponentId')
        : null);
    if (resolvedOpponentId) {
      setOpponentId(resolvedOpponentId);
      setAdminP2Id(resolvedOpponentId);
    }
  }, [fetchCurrentUser, fetchActivePlayers, initialOpponentId]);

  useEffect(() => {
    if (currentUser?.id && adminP2Id && !adminP1Id && currentUser.id !== adminP2Id) {
      setAdminP1Id(currentUser.id);
    }
  }, [currentUser, adminP2Id, adminP1Id]);

  useEffect(() => {
    if (currentUser?.id && opponentId === currentUser.id) {
      setOpponentId('');
    }
  }, [currentUser, opponentId]);

  const isAdminOrCoach = useMemo(() => {
    return currentUser?.role === 'coach' || currentUser?.role === 'president';
  }, [currentUser]);

  const isPendingApproval = useMemo(() => isProfilePending(currentUser), [currentUser]);

  const sideA = useMemo<PlayerProfile | undefined>(() => {
    if (isAdminOrCoach) return players.find((p) => p.id === adminP1Id);
    return currentUser || undefined;
  }, [isAdminOrCoach, players, adminP1Id, currentUser]);

  const sideB = useMemo<PlayerProfile | undefined>(() => {
    if (isAdminOrCoach) return players.find((p) => p.id === adminP2Id);
    return players.find((p) => p.id === opponentId);
  }, [isAdminOrCoach, players, adminP2Id, opponentId]);

  const scoresValid = scoreA !== scoreB && Math.max(scoreA, scoreB) > 0;
  const aWins = scoreA > scoreB;

  const effectiveWinner = scoresValid ? (aWins ? sideA : sideB) : undefined;
  const effectiveLoser = scoresValid ? (aWins ? sideB : sideA) : undefined;
  const setsWon = Math.max(scoreA, scoreB);
  const setsLost = Math.min(scoreA, scoreB);

  const eloPreview = useMemo(() => {
    if (!effectiveWinner || !effectiveLoser || effectiveWinner.id === effectiveLoser.id) return null;
    return calculateStandardElo(
      effectiveWinner.current_elo,
      effectiveLoser.current_elo,
      32,
      setsWon,
      setsLost
    );
  }, [effectiveWinner, effectiveLoser, setsWon, setsLost]);

  const winProbabilityA = useMemo(() => {
    if (!sideA || !sideB) return null;
    const a = Math.min(MAX_ELO, Math.max(MIN_ELO, sideA.current_elo));
    const b = Math.min(MAX_ELO, Math.max(MIN_ELO, sideB.current_elo));
    return 1 / (1 + Math.pow(10, (b - a) / 400));
  }, [sideA, sideB]);

  const canSubmit =
    Boolean(sideA && sideB && sideA.id !== sideB.id) &&
    scoresValid &&
    !isSubmitting &&
    !loadingPlayers &&
    !isPendingApproval;

  const applyPreset = (a: number, b: number) => {
    setScoreA(a);
    setScoreB(b);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    if (!currentUser) {
      setErrorMessage('Matç qeyd etmək üçün daxil olmalısınız.');
      return;
    }

    if (isPendingApproval) {
      setErrorMessage(
        'Hesabınız təsdiq gözləyir. Yalnız rəhbərlik təsdiqindən sonra rəsmi matç qeyd edə bilərsiniz.'
      );
      return;
    }

    if (!sideA || !sideB) {
      setErrorMessage('Zəhmət olmasa hər iki oyunçunu seçin.');
      return;
    }

    if (sideA.id === sideB.id) {
      setErrorMessage('Oyunçu özü ilə oynaya bilməz.');
      return;
    }

    if (!scoresValid || !effectiveWinner || !effectiveLoser) {
      setErrorMessage('Etibarlı set hesabı seçin (bərabər hesab ola bilməz).');
      return;
    }

    if (!isAdminOrCoach && effectiveWinner.id !== currentUser.id && effectiveLoser.id !== currentUser.id) {
      setErrorMessage('Yalnız iştirak etdiyiniz matçı qeyd edə bilərsiniz.');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase bağlantısı mövcud deyil.');
      }

      const matchId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `m-${Date.now()}`;

      const finalSetScores = detailedScores.trim() || `${setsWon}-${setsLost}`;

      if (isAdminOrCoach) {
        const { delta, p1After, p2After } = calculateStandardElo(
          effectiveWinner.current_elo,
          effectiveLoser.current_elo,
          32,
          setsWon,
          setsLost
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
            player1_score: setsWon,
            player2_score: setsLost,
            set_scores: finalSetScores,
            player1_elo_before: effectiveWinner.current_elo,
            player2_elo_before: effectiveLoser.current_elo,
            player1_elo_after: p1After,
            player2_elo_after: p2After,
            elo_delta: delta,
            winner_id: effectiveWinner.id,
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

        store.clearMatchAndPlayerCaches();
        await Promise.allSettled([
          store.fetchProfilesFromCloud(),
          store.fetchMatchesFromCloud(),
        ]);

        setSuccessToast({
          message: 'Matç təsdiqləndi və reytinqlər dərhal yeniləndi!',
          winnerName: effectiveWinner.full_name,
          loserName: effectiveLoser.full_name,
          points: delta,
          scoreSummary: `${setsWon}-${setsLost}`,
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
            player1_score: setsWon,
            player2_score: setsLost,
            set_scores: finalSetScores,
            player1_elo_before: effectiveWinner.current_elo,
            player2_elo_before: effectiveLoser.current_elo,
            player1_elo_after: effectiveWinner.current_elo,
            player2_elo_after: effectiveLoser.current_elo,
            elo_delta: 0,
            status: 'pending',
            match_date: new Date().toISOString(),
          },
        ]);

        if (matchInsertError) throw matchInsertError;

        await store.fetchMatchesFromCloud();

        setSuccessToast({
          message: 'Matç göndərildi! Rəqibinizin təsdiqi gözlənilir.',
          winnerName: effectiveWinner.full_name,
          loserName: effectiveLoser.full_name,
          scoreSummary: `${setsWon}-${setsLost}`,
          isPending: true,
        });
      }

      setOpponentId('');
      setAdminP1Id('');
      setAdminP2Id('');
      setScoreA(0);
      setScoreB(0);
      setDetailedScores('');

      await fetchActivePlayers();
      onMatchLogged?.();
    } catch (err: any) {
      setErrorMessage(err.message || 'Matç qeyd edilərkən xəta baş verdi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="p-8 rounded-2xl border border-white/10 bg-[#0F1623] text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
        <h3 className="text-base font-display font-bold text-white">Giriş Tələb Olunur</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Matç nəticəsi göndərmək və ya təsdiqləmək üçün BANM hesabınızla daxil olmalısınız.
        </p>
      </div>
    );
  }

  const labelA = isAdminOrCoach ? sideA?.full_name || 'Oyunçu 1' : 'Siz';
  const labelB = isAdminOrCoach ? sideB?.full_name || 'Oyunçu 2' : sideB?.full_name || 'Rəqib';
  const userIsWinner = !isAdminOrCoach && scoresValid && aWins;

  const presetChip = (a: number, b: number, tone: 'win' | 'loss') => {
    const active = scoreA === a && scoreB === b;
    const toneClasses =
      tone === 'win'
        ? active
          ? 'bg-[#22C55E]/20 border-[#22C55E]/60 text-[#22C55E] shadow-[0_0_14px_rgba(34,197,94,0.25)]'
          : 'bg-[#131C2B] border-white/10 text-slate-300 hover:border-[#22C55E]/40 hover:text-[#22C55E]'
        : active
        ? 'bg-[#EF4444]/20 border-[#EF4444]/60 text-[#EF4444] shadow-[0_0_14px_rgba(239,68,68,0.25)]'
        : 'bg-[#131C2B] border-white/10 text-slate-300 hover:border-[#EF4444]/40 hover:text-[#EF4444]';
    return (
      <motion.button
        key={`${a}-${b}`}
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => applyPreset(a, b)}
        className={`flex-1 py-2.5 rounded-xl border font-mono text-sm font-black transition ${toneClasses}`}
      >
        {a}–{b}
      </motion.button>
    );
  };

  return (
    <div className="relative rounded-2xl border border-white/10 bg-[#0F1623] p-6 shadow-2xl backdrop-blur-xl">
      {isPendingApproval && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-300">
          <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-200 block">Hesabınız təsdiq gözləyir</span>
            <span>
              Yalnız rəhbərlik təsdiqindən sonra rəsmi matç qeyd edə bilərsiniz.
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6]">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-display font-black text-white flex items-center gap-2">
              Matç Qeydiyyatı
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                K=32
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAdminOrCoach
                ? 'Məşqçi/Admin: nəticə dərhal təsdiqlənir və reytinqlər yenilənir.'
                : 'Oyunçu: nəticə rəqibinizin təsdiqindən sonra rəsmiləşir.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#131C2B] border border-white/5 text-xs text-slate-300">
          <UserCheck className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span><strong>{currentUser.full_name}</strong></span>
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
            <div className="font-bold text-white text-sm">{successToast.message}</div>
            <div className="text-slate-300">
              <strong>{successToast.winnerName}</strong> qalib gəldi — <strong>{successToast.loserName}</strong> ({successToast.scoreSummary})
            </div>
            {!successToast.isPending && successToast.points && (
              <div className="font-mono text-emerald-400 font-semibold pt-1">
                Qalibə +{successToast.points} XAL / Məğluba -{successToast.points} XAL
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
        {isAdminOrCoach ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AthleteCombobox
              label="Oyunçu 1"
              players={players}
              value={adminP1Id}
              onChange={setAdminP1Id}
              excludeIds={adminP2Id ? [adminP2Id] : []}
              disabled={loadingPlayers}
            />
            <AthleteCombobox
              label="Oyunçu 2"
              players={players}
              value={adminP2Id}
              onChange={setAdminP2Id}
              excludeIds={adminP1Id ? [adminP1Id] : []}
              disabled={loadingPlayers}
            />
          </div>
        ) : (
          <AthleteCombobox
            label="Rəqib"
            players={players}
            value={opponentId}
            onChange={setOpponentId}
            excludeIds={[currentUser.id]}
            disabled={loadingPlayers}
            placeholder={loadingPlayers ? 'Oyunçular yüklənir...' : 'Rəqibin adı və ya fakültəsi üzrə axtar...'}
          />
        )}

        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Set Hesabı ({labelA} – {labelB})
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#22C55E]">
                {isAdminOrCoach ? 'Oyunçu 1 qalib' : 'Qələbə'}
              </span>
              <div className="flex gap-2">
                {WIN_PRESETS.map(([a, b]) => presetChip(a, b, 'win'))}
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#EF4444]">
                {isAdminOrCoach ? 'Oyunçu 2 qalib' : 'Məğlubiyyət'}
              </span>
              <div className="flex gap-2">
                {LOSS_PRESETS.map(([a, b]) => presetChip(a, b, 'loss'))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <ScoreStepper label={labelA} value={scoreA} onChange={setScoreA} />
            <ScoreStepper label={labelB} value={scoreB} onChange={setScoreB} />
          </div>

          {scoreA === scoreB && Math.max(scoreA, scoreB) > 0 && (
            <p className="text-[11px] text-amber-300">Hesab bərabər ola bilməz.</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Set Detalları (İstəyə bağlı)
          </label>
          <input
            type="text"
            placeholder="məs. 11-9, 8-11, 11-6, 12-10"
            value={detailedScores}
            onChange={(e) => setDetailedScores(e.target.value)}
            className="w-full px-3.5 py-3 rounded-xl bg-[#131C2B] border border-white/10 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-[#3B82F6]"
          />
        </div>

        <AnimatePresence mode="wait">
          {eloPreview && effectiveWinner && effectiveLoser && (
            <motion.div
              key={`${effectiveWinner.id}-${effectiveLoser.id}-${setsWon}-${setsLost}`}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="p-4 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/10 space-y-3"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  {isAdminOrCoach ? 'Dərhal ELO Kalibrasiyası' : 'Təsdiqdən Sonra Gözlənilən ELO'}
                </span>
                {winProbabilityA !== null && (
                  <span className="font-mono text-[11px] text-slate-400">
                    Qələbə ehtimalı ({isAdminOrCoach ? labelA : 'Siz'}):{' '}
                    <strong className="text-white">{Math.round(winProbabilityA * 100)}%</strong>
                  </span>
                )}
              </div>

              {isAdminOrCoach ? (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30">
                    <span className="text-slate-300 block truncate">{effectiveWinner.full_name}</span>
                    <span className="font-mono text-white font-bold flex items-center gap-1 mt-1">
                      {effectiveWinner.current_elo}
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="text-[#22C55E]">{eloPreview.p1After}</span>
                      <span className="text-[#22C55E] text-[11px]">(+{eloPreview.delta})</span>
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30">
                    <span className="text-slate-300 block truncate">{effectiveLoser.full_name}</span>
                    <span className="font-mono text-white font-bold flex items-center gap-1 mt-1">
                      {effectiveLoser.current_elo}
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="text-[#EF4444]">{eloPreview.p2After}</span>
                      <span className="text-[#EF4444] text-[11px]">(-{eloPreview.delta})</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border ${
                    userIsWinner
                      ? 'bg-[#22C55E]/10 border-[#22C55E]/40'
                      : 'bg-[#EF4444]/10 border-[#EF4444]/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {userIsWinner ? (
                      <TrendingUp className="w-5 h-5 text-[#22C55E]" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-[#EF4444]" />
                    )}
                    <span
                      className={`font-mono text-lg font-black ${
                        userIsWinner ? 'text-[#22C55E]' : 'text-[#EF4444]'
                      }`}
                    >
                      {userIsWinner ? '+' : '-'}{eloPreview.delta} ELO
                    </span>
                  </div>
                  <div className="font-mono text-xs text-slate-300 flex items-center gap-1.5">
                    <span>{currentUser.current_elo}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <strong className="text-white text-sm">
                      {userIsWinner ? eloPreview.p1After : eloPreview.p2After}
                    </strong>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {isPendingApproval ? (
            <span className="text-xs text-amber-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              Matç göndərmək üçün hesabınız Klub Prezidenti tərəfindən təsdiqlənməlidir.
            </span>
          ) : !canSubmit && !isSubmitting ? (
            <span className="text-[11px] text-slate-500">
              {!sideA || !sideB ? 'Rəqib seçin' : 'Etibarlı set hesabı seçin'}
            </span>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-display font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:bg-[#3B82F6] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Qeyd edilir...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>{isAdminOrCoach ? 'Təsdiqlə və Qeyd Et' : 'Təsdiqə Göndər'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Tournament, TournamentGroup, GroupMatch, PlayerProfile } from '../lib/data/types';
import { BHOSDataStore, getPlayerHref } from '../lib/data/store';
import { computeGroupStandings } from '../lib/tournament';
import Link from 'next/link';
import {
  Users,
  Trophy,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Shuffle,
  ShieldCheck,
  Award,
  PlayCircle,
  X,
  AlertCircle,
  Crown,
  ChevronDown,
  ArrowRightLeft,
} from 'lucide-react';

interface TournamentGroupsStageProps {
  tournament: Tournament;
  isAdmin: boolean;
  onUpdate: () => void;
}

export default function TournamentGroupsStage({
  tournament,
  isAdmin,
  onUpdate,
}: TournamentGroupsStageProps) {
  const store = BHOSDataStore.getInstance();
  const groups: TournamentGroup[] = tournament.bracket_data?.groups || [];
  const advanceCount =
    tournament.advance_per_group ||
    tournament.bracket_data?.settings?.advance_per_group ||
    2;

  const [activeGroupId, setActiveGroupId] = useState<string>(
    groups[0]?.id || ''
  );
  const [matchModal, setMatchModal] = useState<{
    groupId: string;
    match: GroupMatch;
  } | null>(null);
  const [p1Score, setP1Score] = useState<number>(3);
  const [p2Score, setP2Score] = useState<number>(1);
  const [setScores, setSetScores] = useState<string>('11-8, 9-11, 11-7, 11-6');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // Setup / Seeding modal state
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [numGroups, setNumGroups] = useState<number>(2);
  const [advancePerGroupChoice, setAdvancePerGroupChoice] = useState<number>(4);
  const [seed1Id, setSeed1Id] = useState<string>('');
  const [seed2Id, setSeed2Id] = useState<string>('');
  const [seed3Id, setSeed3Id] = useState<string>('');
  const [seed4Id, setSeed4Id] = useState<string>('');
  const [movingPlayerId, setMovingPlayerId] = useState<string | null>(null);

  const activeGroup =
    groups.find((g) => g.id === activeGroupId) || groups[0] || null;

  // Registered players for the tournament (excluding tournament organizer)
  const registeredPlayers: PlayerProfile[] = (tournament.participants || [])
    .map((pid) => store.getProfile(pid))
    .filter((p): p is PlayerProfile => Boolean(p))
    .filter((p) => {
      const email = (p.email || '').trim().toLowerCase();
      const name = (p.full_name || '').toLowerCase().replace(/[^a-z]/g, '');
      return (
        email !== 'ali.iskandarli.std@bhos.edu.az' &&
        email !== 'ali.iskandarli@bhos.edu.az' &&
        name !== 'aliiskandarli' &&
        name !== 'eliisgenderli'
      );
    });

  const sortedCandidates = [...registeredPlayers].sort(
    (a, b) => (b.current_elo ?? 1200) - (a.current_elo ?? 1200)
  );

  const handleAutoFillTopSeeds = () => {
    setSeed1Id(sortedCandidates[0]?.id || '');
    setSeed2Id(sortedCandidates[1]?.id || '');
    setSeed3Id(sortedCandidates[2]?.id || '');
    setSeed4Id(sortedCandidates[3]?.id || '');
  };

  const handleNumGroupsChange = (val: number) => {
    setNumGroups(val);
    if (val === 2) {
      setAdvancePerGroupChoice(4); // 2 groups x 4 = 8 players in 1/4 Final
    } else if (val === 4) {
      setAdvancePerGroupChoice(2); // 4 groups x 2 = 8 players in 1/4 Final
    }
  };

  const handleOpenSetupModal = () => {
    // If existing top seeds were saved, restore them
    const existingTopSeeds = tournament.bracket_data?.settings?.top_seed_ids || [];
    if (existingTopSeeds.length > 0) {
      setSeed1Id(existingTopSeeds[0] || '');
      setSeed2Id(existingTopSeeds[1] || '');
      setSeed3Id(existingTopSeeds[2] || '');
      setSeed4Id(existingTopSeeds[3] || '');
    } else if (sortedCandidates.length >= 2) {
      setSeed1Id(sortedCandidates[0]?.id || '');
      setSeed2Id(sortedCandidates[1]?.id || '');
      setSeed3Id(sortedCandidates[2]?.id || '');
      setSeed4Id(sortedCandidates[3]?.id || '');
    }

    if (groups.length > 0) {
      setNumGroups(groups.length);
      setAdvancePerGroupChoice(advanceCount);
    } else {
      // 14 players default: 2 groups of 7, 4 pass each to 1/4 Final
      setNumGroups(2);
      setAdvancePerGroupChoice(4);
    }
    setSetupModalOpen(true);
  };

  const handleConfirmGenerateGroups = () => {
    if (!isAdmin) return;
    try {
      setLoadingAction(true);
      const topSeedPlayerIds = [seed1Id, seed2Id, seed3Id, seed4Id].filter(Boolean);
      const calculatedGroupSize = Math.max(3, Math.ceil(registeredPlayers.length / numGroups));

      store.generateTournamentGroupsAction(tournament.id, calculatedGroupSize, advancePerGroupChoice, {
        numGroups,
        topSeedPlayerIds,
      });
      setSetupModalOpen(false);
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Qruplar yaradılarkən xəta baş verdi.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleMovePlayer = (playerId: string, targetGroupId: string) => {
    if (!isAdmin) return;
    try {
      setLoadingAction(true);
      store.movePlayerBetweenGroups(tournament.id, playerId, targetGroupId);
      setMovingPlayerId(null);
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Oyunçu köçürülərkən xəta baş verdi.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAdvanceToPlayoffs = () => {
    if (!isAdmin) return;
    const confirmMsg =
      'Bütün qrupların nəticələri əsasında Olimpiya (Pley-off) səbəti yaradılsın?\n\n' +
      'Təminat: Qrup qalibləri (1-ci və 2-ci səbət başçıları) yalnız FİNALDA, digər səbət başçıları isə YARIMFİNALDA üz-üzə gələcəklər.';
    if (!confirm(confirmMsg)) return;

    try {
      setLoadingAction(true);
      store.advanceGroupWinnersToPlayoffs(tournament.id);
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Pley-off səbəti yaradılarkən xəta baş verdi.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleOpenScoreModal = (groupId: string, match: GroupMatch) => {
    if (!isAdmin) return;
    setMatchModal({ groupId, match });
    setP1Score(match.player1_score ?? 3);
    setP2Score(match.player2_score ?? 1);
    setSetScores(match.set_scores || '11-8, 9-11, 11-7, 11-6');
    setErrorMsg(null);
  };

  const handleSaveMatchScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchModal) return;
    if (p1Score === p2Score) {
      setErrorMsg('Heç-heçə mümkün deyil, qalib seçilməlidir.');
      return;
    }

    try {
      store.updateGroupMatchScore(
        tournament.id,
        matchModal.groupId,
        matchModal.match.id,
        p1Score,
        p2Score,
        setScores
      );
      setMatchModal(null);
      onUpdate();
    } catch (err: any) {
      setErrorMsg(err.message || 'Xəta baş verdi.');
    }
  };

  if (groups.length === 0) {
    return (
      <div className="p-8 sm:p-10 rounded-3xl border border-blue-500/20 bg-gradient-to-b from-[#0F1623] via-[#0B101B] to-slate-950 text-center space-y-5 shadow-2xl relative overflow-hidden">
        <div className="w-16 h-16 rounded-3xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mx-auto shadow-lg shadow-blue-500/10">
          <Shuffle className="w-8 h-8 text-blue-400 animate-pulse" />
        </div>

        <div className="space-y-2 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
            <span>🔒 Qeydiyyat Bağlanıb • Püşkatma Mərhələsi (Draft)</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-display font-black text-white">
            Qrup Püşkatmasına (Draft) Keçin
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Qeydiyyat müddəti başa çatıb. 14 iştirakçı <strong>2 qrupa (Qrup A: 7 nəfər, Qrup B: 7 nəfər)</strong> bölünəcək. Hər qrupdan ən yaxşı 4 oyunçu 1/4 Final (Olimpiya) mərhələsinə yüksələcək.
          </p>
        </div>

        {isAdmin ? (
          <div className="pt-2">
            <button
              type="button"
              disabled={loadingAction}
              onClick={handleOpenSetupModal}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-sm shadow-xl shadow-rose-600/25 transition active:scale-95"
            >
              <Crown className="w-4 h-4 text-amber-300" />
              <span>🎲 Püşkatmaya Başla (2 Qrup x 7 Oyunçu)</span>
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            Təşkilatçı qrupların püşkatmasını apardıqdan sonra cədvəl burada görünəcək.
          </p>
        )}

        {/* Modal when groups is 0 */}
        {setupModalOpen && renderSetupModal()}
      </div>
    );
  }

  function renderSetupModal() {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
      >
        <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border-2 border-blue-700/80 p-6 shadow-2xl space-y-6 text-left">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-white">
                  Qrup Mərhələsi & Səbət Başçılarının Seçimi
                </h3>
                <p className="text-xs text-slate-400">
                  Güclü oyunçuları fərqli qruplara və pley-offun əks qollarına yerləşdirin
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSetupModalOpen(false)}
              className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Guarantee Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-transparent border border-amber-500/30 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>1/4 FİNAL, YARIMFİNAL VƏ FİNAL TƏMİNATI (ITTF Seeding)</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {numGroups === 2 ? (
                <>
                  14 oyunçu <strong>2 qrupa (Qrup A: 7 nəfər, Qrup B: 7 nəfər)</strong> bölünəcək. Hər qrupdan <strong>4 nəfər</strong> vəsiqə qazanır və 8 nəfərlik <strong>1/4 Final (Çərək final)</strong> başlayır.
                  1/4 Finalda A1 vs B4, B2 vs A3, A2 vs B3, B1 vs A4 çarpaz qarşılaşır.
                  <strong> 1-ci və 2-ci güclü oyunçular yalnız FİNALDA</strong>, 3-cü və 4-cü güclü oyunçular isə <strong>YARIMFİNALDA</strong> üz-üzə gələ bilərlər!
                </>
              ) : (
                <>
                  Seçdiyiniz 3–4 güclü oyunçu <strong>ayrı-ayrı qruplara (A, B, C, D)</strong> səbət başçısı kimi düşəcək və pley-off cədvəlinin əks tərəflərinə yerləşdiriləcək.
                  Beləliklə, onlar <strong>yalnız YARIMFİNAL və FİNALDA</strong> üz-üzə gələ bilərlər!
                </>
              )}
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Format Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-bold">
                  Qrup Sayı
                </label>
                <select
                  value={numGroups}
                  onChange={(e) => handleNumGroupsChange(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value={2}>2 Qrup (Qrup A, B) — 14 oyunçu üçün hər qrupda 7 nəfər (Tövsiyə olunur)</option>
                  <option value={4}>4 Qrup (Qrup A, B, C, D)</option>
                  <option value={6}>6 Qrup (Qrup A — F)</option>
                  <option value={8}>8 Qrup (Qrup A — H)</option>
                </select>
                <p className="text-[10px] text-slate-400">
                  {registeredPlayers.length} oyunçu / {numGroups} qrup ≈ {Math.ceil(registeredPlayers.length / numGroups)} nəfər/qrup
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-bold">
                  Pley-offa Vəsiqə Qazananlar
                </label>
                <select
                  value={advancePerGroupChoice}
                  onChange={(e) => setAdvancePerGroupChoice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value={4}>Hər qrupdan 4 nəfər (2 qrup üçün 8 nəfərlik 1/4 Final — Tövsiyə olunur)</option>
                  <option value={2}>Hər qrupdan 2 nəfər (4 qrup üçün 8 nəfərlik 1/4 Final və ya 2 qrup üçün 4 nəfərlik Yarımfinal)</option>
                  <option value={1}>Hər qrupdan 1 nəfər (Final və ya Yarımfinal)</option>
                </select>
                <p className="text-[10px] text-slate-400">
                  Cəmi {numGroups * advancePerGroupChoice} oyunçu pley-off (Olimpiya) mərhələsinə yüksələcək
                </p>
              </div>
            </div>

            {/* Top Seeds Header & Auto Button */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white text-xs">
                  Səbət Başçıları / 3–4 Güclü Oyunçu
                </span>
              </div>
              <button
                type="button"
                onClick={handleAutoFillTopSeeds}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-[11px] font-semibold transition"
              >
                ⚡ Ən Yüksək ELO-luları Doldur
              </button>
            </div>

            {/* Seed Pickers */}
            <div className="space-y-3">
              {/* Seed 1 */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 text-[11px] flex items-center gap-1.5">
                    <span>👑 1-ci Səbət {numGroups === 2 ? '(Qrup A 1-ci Başçı)' : '(Qrup A Başçısı)'}</span>
                    <span className="text-[10px] text-slate-500 font-normal">→ Pley-off Yuxarı Qol</span>
                  </span>
                </div>
                <select
                  value={seed1Id}
                  onChange={(e) => setSeed1Id(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Oyunçu seçin --</option>
                  {sortedCandidates.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.admission_year || 'BHOS'} • ELO {p.current_elo ?? 1200})
                    </option>
                  ))}
                </select>
              </div>

              {/* Seed 2 */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-400 text-[11px] flex items-center gap-1.5">
                    <span>👑 2-ci Səbət {numGroups === 2 ? '(Qrup B 1-ci Başçı)' : '(Qrup B Başçısı)'}</span>
                    <span className="text-[10px] text-emerald-400 font-bold">→ Əks Aşağı Qol (Yalnız Finalda görüşə bilərlər!)</span>
                  </span>
                </div>
                <select
                  value={seed2Id}
                  onChange={(e) => setSeed2Id(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-500"
                >
                  <option value="">-- Oyunçu seçin --</option>
                  {sortedCandidates.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.admission_year || 'BHOS'} • ELO {p.current_elo ?? 1200})
                    </option>
                  ))}
                </select>
              </div>

              {/* Seed 3 */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-400 text-[11px] flex items-center gap-1.5">
                    <span>👑 3-cü Səbət {numGroups === 2 ? '(Qrup A 2-ci Güclü)' : '(Qrup C Başçısı)'}</span>
                    <span className="text-[10px] text-slate-500 font-normal">→ 2-ci Yarımfinal Qolu</span>
                  </span>
                </div>
                <select
                  value={seed3Id}
                  onChange={(e) => setSeed3Id(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Oyunçu seçin (İstəyə bağlı) --</option>
                  {sortedCandidates.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.admission_year || 'BHOS'} • ELO {p.current_elo ?? 1200})
                    </option>
                  ))}
                </select>
              </div>

              {/* Seed 4 */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 text-[11px] flex items-center gap-1.5">
                    <span>👑 4-cü Səbət {numGroups === 2 ? '(Qrup B 2-ci Güclü)' : '(Qrup D Başçısı)'}</span>
                    <span className="text-[10px] text-slate-500 font-normal">→ 1-ci Yarımfinal Qolu</span>
                  </span>
                </div>
                <select
                  value={seed4Id}
                  onChange={(e) => setSeed4Id(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Oyunçu seçin (İstəyə bağlı) --</option>
                  {sortedCandidates.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.admission_year || 'BHOS'} • ELO {p.current_elo ?? 1200})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setSetupModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs transition"
            >
              Ləğv et
            </button>
            <button
              type="button"
              disabled={loadingAction}
              onClick={handleConfirmGenerateGroups}
              className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-display font-bold text-xs shadow-md transition active:scale-95 disabled:opacity-50"
            >
              {loadingAction ? 'Formalaşdırılır...' : '✨ Qrupları Formalaşdır və Püşkat'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-blue-700/20 border border-blue-600/30 text-blue-400 font-mono text-[11px] font-black uppercase">
              Mərhələ 1
            </span>
            <h2 className="text-xl font-display font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span>Qrup Mərhələsi</span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Hər qrupdan ən yaxşı <strong>{advanceCount} oyunçu</strong> pley-off (Olimpiya) mərhələsinə vəsiqə qazanır
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={loadingAction}
              onClick={handleOpenSetupModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition"
              title="Qrupları və səbət başçılarını tənzimlə"
            >
              <Shuffle className="w-3.5 h-3.5 text-blue-400" />
              <span>Qrupları & Səbətləri Tənzimlə</span>
            </button>
            <button
              type="button"
              disabled={loadingAction}
              onClick={handleAdvanceToPlayoffs}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm active:scale-95"
              title="Qrup qaliblərini pley-off səbətinə keçir"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Qalibləri Pley-offa Keçir</span>
            </button>
          </div>
        )}
      </div>

      {/* Seeding Protection Live Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-purple-950/20 to-slate-900 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Crown className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white flex items-center gap-2">
              <span>🛡️ Güclü Oyunçular Qorunması Aktivdir</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                Yalnız Yarımfinal & Final
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Səbət başçıları ayrı-ayrı qruplara salınıb. Qrup qalibləri kimi onlar yalnız <strong>YARIMFİNAL</strong> və <strong>FİNALDA</strong> qarşılaşacaqlar.
            </p>
          </div>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenSetupModal}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-white/10 shrink-0 self-start sm:self-auto transition"
          >
            ⚙️ Səbətləri Yenidən Qur
          </button>
        )}
      </div>

      {/* Group Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {groups.map((group) => {
          const active = group.id === (activeGroup?.id || '');
          const totalMatches = group.matches.length;
          const completedMatches = group.matches.filter(
            (m) => m.status === 'completed'
          ).length;

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => setActiveGroupId(group.id)}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap border shrink-0 ${
                active
                  ? 'bg-blue-700 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <span>{group.name}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                  active
                    ? 'bg-blue-900/60 text-blue-200'
                    : 'bg-slate-900 text-slate-400'
                }`}
              >
                {completedMatches}/{totalMatches}
              </span>
            </button>
          );
        })}
      </div>

      {activeGroup && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Group Standings Table */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>{activeGroup.name} Cədvəli</span>
              </h3>
              <span className="text-[11px] font-mono text-emerald-400">
                Top {advanceCount} vəsiqə qazanır
              </span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0F1623] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-slate-950 text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Oyunçu</th>
                      <th className="py-2.5 px-2 text-center" title="Oyun sayı">O</th>
                      <th className="py-2.5 px-2 text-center" title="Qələbə">Q</th>
                      <th className="py-2.5 px-2 text-center" title="Məğlubiyyət">M</th>
                      <th className="py-2.5 px-2 text-center" title="Set Fərqi">+/-</th>
                      <th className="py-2.5 px-3 text-right font-black" title="Xal">XAL</th>
                      {isAdmin && <th className="py-2.5 px-2 text-right">Admin</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {computeGroupStandings(activeGroup).map((row, idx) => {
                      const qualifies = idx < advanceCount;
                      const isTopSeed =
                        activeGroup.top_seed_id === row.player.id ||
                        (tournament.bracket_data?.settings?.top_seed_ids || []).includes(row.player.id);

                      return (
                        <tr
                          key={row.player.id}
                          className={`hover:bg-white/5 transition ${
                            qualifies ? 'bg-blue-950/20' : ''
                          }`}
                        >
                          <td className="py-3 px-3 font-mono font-bold">
                            <span
                              className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] ${
                                qualifies
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white/5 text-slate-400'
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={getPlayerHref(row.player.id)}
                                className="font-semibold text-white hover:text-blue-400 transition"
                              >
                                {row.player.full_name}
                              </Link>
                              {isTopSeed && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                                  <Crown className="w-2.5 h-2.5" />
                                  <span>Səbət Başçısı</span>
                                </span>
                              )}
                              {qualifies && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-600/30">
                                  Pley-off
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-300">
                            {row.played}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-emerald-400 font-bold">
                            {row.wins}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-rose-400 font-bold">
                            {row.losses}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-400">
                            {row.setDiff > 0 ? `+${row.setDiff}` : row.setDiff}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-amber-400 text-sm">
                            {row.points}
                          </td>

                          {/* Admin: Move player to another group */}
                          {isAdmin && (
                            <td className="py-3 px-2 text-right relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setMovingPlayerId(
                                    movingPlayerId === row.player.id ? null : row.player.id
                                  )
                                }
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium border border-white/10 transition"
                                title="Bu oyunçunu başqa qrupa köçür"
                              >
                                Qrup ▾
                              </button>

                              {movingPlayerId === row.player.id && (
                                <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-xl bg-slate-900 border border-slate-700 shadow-xl p-1 text-left">
                                  <div className="text-[9px] uppercase tracking-wider text-slate-400 px-2 py-1 font-bold">
                                    Qrupa köçür:
                                  </div>
                                  {groups.map((g) => {
                                    if (g.id === activeGroup.id) return null;
                                    return (
                                      <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => handleMovePlayer(row.player.id, g.id)}
                                        className="w-full text-left px-2 py-1 rounded hover:bg-blue-600 hover:text-white text-slate-200 text-xs font-medium transition"
                                      >
                                        → {g.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Group Matches */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-rose-500" />
                <span>Oyunlar ({activeGroup.matches.length})</span>
              </h3>
              {isAdmin && (
                <span className="text-[11px] font-mono text-slate-400">
                  Nəticə daxil etmək üçün oyuna klikləyin
                </span>
              )}
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {activeGroup.matches.map((m) => {
                const isCompleted = m.status === 'completed';
                const p1Won = isCompleted && m.winner_id === m.player1.id;
                const p2Won = isCompleted && m.winner_id === m.player2.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => isAdmin && handleOpenScoreModal(activeGroup.id, m)}
                    className={`p-3 rounded-2xl border transition ${
                      isAdmin ? 'cursor-pointer hover:border-blue-500/60' : ''
                    } ${
                      isCompleted
                        ? 'bg-slate-950/70 border-white/10'
                        : 'bg-[#131C2B] border-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`truncate ${
                              p1Won ? 'font-bold text-white' : 'text-slate-300'
                            }`}
                          >
                            {m.player1.full_name}
                          </span>
                          <span className="font-mono font-black text-white shrink-0">
                            {isCompleted ? m.player1_score : '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`truncate ${
                              p2Won ? 'font-bold text-white' : 'text-slate-300'
                            }`}
                          >
                            {m.player2.full_name}
                          </span>
                          <span className="font-mono font-black text-white shrink-0">
                            {isCompleted ? m.player2_score : '-'}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {isCompleted ? (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-600/40">
                              Bitdi
                            </span>
                            {m.set_scores && (
                              <div className="text-[10px] font-mono text-slate-500 max-w-[100px] truncate">
                                {m.set_scores}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                            Gözləyir
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Match Score Modal */}
      {matchModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80"
        >
          <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border-2 border-blue-700/80 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-display font-bold text-white">
                Qrup Oyunu Nəticəsi
              </h3>
              <button
                type="button"
                onClick={() => setMatchModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-600/15 border border-rose-600/40 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveMatchScore} className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold truncate">
                  {matchModal.match.player1.full_name} (Setlər)
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={p1Score}
                  onChange={(e) => setP1Score(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold truncate">
                  {matchModal.match.player2.full_name} (Setlər)
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={p2Score}
                  onChange={(e) => setP2Score(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold">
                  Fərdi Set Hesabları (istəyə bağlı)
                </label>
                <input
                  type="text"
                  value={setScores}
                  onChange={(e) => setSetScores(e.target.value)}
                  placeholder="Məs: 11-8, 9-11, 11-7"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMatchModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold shadow-sm"
                >
                  Yadda saxla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Setup Modal */}
      {setupModalOpen && renderSetupModal()}
    </div>
  );
}

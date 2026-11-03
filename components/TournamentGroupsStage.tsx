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

  const activeGroup =
    groups.find((g) => g.id === activeGroupId) || groups[0] || null;

  const handleGenerateGroups = () => {
    if (!isAdmin) return;
    try {
      setLoadingAction(true);
      const groupSize = tournament.group_size || 4;
      store.generateTournamentGroupsAction(tournament.id, groupSize, advanceCount);
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Qruplar yaradılarkən xəta baş verdi.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAdvanceToPlayoffs = () => {
    if (!isAdmin) return;
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
      <div className="p-8 rounded-3xl border border-white/10 bg-[#0F1623] text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-700/20 border border-blue-600/30 flex items-center justify-center text-blue-400 mx-auto">
          <Users className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-display font-bold text-white">
            Qrup Mərhələsi Hələ Tərtib Edilməyib
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Hər qrupda 4–5 oyunçu olmaqla dairəvi oyunlar keçirilir və ilk {advanceCount} yer pley-offa yüksəlir.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            disabled={loadingAction}
            onClick={handleGenerateGroups}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-display font-bold text-xs shadow-sm transition active:scale-95"
          >
            <Shuffle className="w-4 h-4" />
            <span>Qrupları Avtomatik Püşkat ({tournament.group_size || 4} nəfərlik)</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              onClick={handleGenerateGroups}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition"
              title="Qrupları yenidən püşkat"
            >
              <Shuffle className="w-3.5 h-3.5 text-blue-400" />
              <span>Qrupları Yenidən Püşkat</span>
            </button>
            <button
              type="button"
              disabled={loadingAction}
              onClick={handleAdvanceToPlayoffs}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm active:scale-95"
              title="İlk 2 yeri tutanları pley-off səbətinə keçir"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Qalibləri Pley-offa Keçir</span>
            </button>
          </div>
        )}
      </div>

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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {computeGroupStandings(activeGroup).map((row, idx) => {
                      const qualifies = idx < advanceCount;
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
                            <div className="flex items-center gap-2">
                              <Link
                                href={getPlayerHref(row.player.id)}
                                className="font-semibold text-white hover:text-blue-400 transition"
                              >
                                {row.player.full_name}
                              </Link>
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

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
    </div>
  );
}


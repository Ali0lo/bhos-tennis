'use client';

import React, { useState } from 'react';
import { BHOSDataStore } from '../../lib/data/store';
import { MatchRecord } from '../../lib/data/types';
import PendingApprovals from '../PendingApprovals';
import ScrollLock from '../ScrollLock';
import {
  History,
  Search,
  Trash2,
  Pencil,
  Ban,
  X,
  Loader2,
} from 'lucide-react';

interface MatchesTabProps {
  matchesList: MatchRecord[];
  onMatchesChange: React.Dispatch<React.SetStateAction<MatchRecord[]>>;
  showToast: (msg: string) => void;
}

export default function MatchesTab({
  matchesList,
  onMatchesChange,
  showToast,
}: MatchesTabProps) {
  const store = BHOSDataStore.getInstance();

  const [matchSearch, setMatchSearch] = useState('');
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<MatchRecord | null>(null);
  const [isVoiding, setIsVoiding] = useState<boolean>(false);
  const [editingMatch, setEditingMatch] = useState<MatchRecord | null>(null);
  const [editP1Score, setEditP1Score] = useState<number>(0);
  const [editP2Score, setEditP2Score] = useState<number>(0);
  const [editSetScores, setEditSetScores] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('confirmed');
  const [editTournament, setEditTournament] = useState<string>('');
  const [editMatchDate, setEditMatchDate] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [displayLimit, setDisplayLimit] = useState<number>(25);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  const handleDeleteMatch = async (match: MatchRecord) => {
    const matchLabel = `${match.player1_name} (${match.player1_score}) vs ${match.player2_name} (${match.player2_score})`;
    const confirmed = window.confirm(
      `"${matchLabel}" oyun qeydini sistemdən və bazadan tamamilə silmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarılmır.`
    );
    if (!confirmed) return;

    setDeletingMatchId(match.id);
    try {
      const ok = await store.deleteMatch(match.id);
      if (ok) {
        showToast('Oyun qeydi uğurla silindi.');
      } else {
        showToast('Oyun tapılmadı.');
      }
    } catch (err: any) {
      showToast(err.message || 'Oyun silinərkən xəta baş verdi.');
    } finally {
      setDeletingMatchId(null);
    }
  };

  const handleConfirmVoid = async () => {
    if (!voidTarget) return;
    const target = voidTarget;
    setIsVoiding(true);
    try {
      await store.voidMatch(target.id);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('bhos_tt_leaderboard_cache_v1');
      }
      onMatchesChange((prev) => prev.filter((m) => m.id !== target.id));
      setSelectedMatchIds((prev) => prev.filter((id) => id !== target.id));
      setVoidTarget(null);
      showToast(
        `Matç ləğv edildi. ${target.elo_delta || 0} ELO xalı hər iki oyunçuya geri qaytarıldı.`
      );
    } catch (err: any) {
      showToast(err.message || 'Matç ləğv edilərkən xəta baş verdi.');
    } finally {
      setIsVoiding(false);
    }
  };

  const handleOpenEditModal = (m: MatchRecord) => {
    setEditingMatch(m);
    setEditP1Score(m.player1_score);
    setEditP2Score(m.player2_score);
    setEditSetScores(m.set_scores || '');
    setEditStatus(m.status || 'confirmed');
    setEditTournament(m.tournament_title || '');
    setEditMatchDate(
      m.match_date ? m.match_date.slice(0, 10) : new Date().toISOString().slice(0, 10)
    );
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;
    setIsSavingEdit(true);
    try {
      const updates: Partial<MatchRecord> = {
        player1_score: Number(editP1Score),
        player2_score: Number(editP2Score),
        set_scores: editSetScores.trim(),
        status: editStatus,
        tournament_title: editTournament.trim() || undefined,
        match_date: editMatchDate
          ? new Date(editMatchDate).toISOString()
          : editingMatch.match_date,
      };
      await store.updateMatch(editingMatch.id, updates);
      showToast('Oyun məlumatları uğurla yeniləndi.');
      setEditingMatch(null);
    } catch (err: any) {
      showToast(err.message || 'Oyun yenilənərkən xəta baş verdi.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const filteredMatches = matchesList.filter((m) => {
    if (!matchSearch.trim()) return true;
    const q = matchSearch.toLowerCase();
    return (
      m.player1_name?.toLowerCase().includes(q) ||
      m.player2_name?.toLowerCase().includes(q) ||
      m.tournament_title?.toLowerCase().includes(q) ||
      m.logged_by_name?.toLowerCase().includes(q) ||
      m.set_scores?.toLowerCase().includes(q)
    );
  });

  const displayedMatches = filteredMatches.slice(0, displayLimit);

  const toggleSelectMatch = (id: string) => {
    setSelectedMatchIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearMatchSelection = () => {
    setSelectedMatchIds([]);
  };

  const handleDeleteSelectedMatches = async () => {
    if (selectedMatchIds.length === 0) return;
    const count = selectedMatchIds.length;
    const confirmed = window.confirm(
      `Seçilmiş ${count} oyunu sistemdən və bazadan tamamilə silmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarılmır.`
    );
    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      await store.deleteMatches(selectedMatchIds);
      setSelectedMatchIds([]);
      showToast(`${count} oyun uğurla silindi.`);
    } catch (err: any) {
      showToast(err.message || 'Oyunlar silinərkən xəta baş verdi.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const allDisplayedSelected =
    displayedMatches.length > 0 &&
    displayedMatches.every((m) => selectedMatchIds.includes(m.id));

  const toggleSelectAllDisplayed = () => {
    if (allDisplayedSelected) {
      const displayedIdSet = new Set(displayedMatches.map((m) => m.id));
      setSelectedMatchIds((prev) => prev.filter((id) => !displayedIdSet.has(id)));
    } else {
      const newIds = new Set([...selectedMatchIds, ...displayedMatches.map((m) => m.id)]);
      setSelectedMatchIds(Array.from(newIds));
    }
  };

  return (
    <div className="space-y-6">
      <PendingApprovals />

      <div className="p-6 rounded-3xl border border-white/10 bg-slate-900/80 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-white">
                Qeydə Alınmış Oyunlar & Nəticələrin İdarə Edilməsi
              </h2>
              <p className="text-xs text-slate-400">
                Sistemdə qeydə alınmış oyunların siyahısı, düzəliş edilməsi və silinməsi
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setDisplayLimit(25)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  displayLimit === 25
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Son 25 oyun
              </button>
              <button
                type="button"
                onClick={() => setDisplayLimit(50)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  displayLimit === 50
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Son 50 oyun
              </button>
              <button
                type="button"
                onClick={() => setDisplayLimit(10000)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  displayLimit >= 10000
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Bütün oyunlar ({filteredMatches.length})
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Oyunçu və ya turnir axtar..."
                value={matchSearch}
                onChange={(e) => setMatchSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-52 sm:w-60"
              />
            </div>
          </div>
        </div>

        {selectedMatchIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs animate-fade-in">
            <div className="flex items-center gap-2.5 text-rose-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              <span>{selectedMatchIds.length} oyun seçildi</span>
              <button
                type="button"
                onClick={clearMatchSelection}
                className="text-[11px] underline text-slate-400 hover:text-white transition"
              >
                Seçimi təmizlə
              </button>
            </div>
            <button
              type="button"
              onClick={handleDeleteSelectedMatches}
              disabled={isBulkDeleting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-500/20 transition disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {isBulkDeleting
                  ? 'Silinir...'
                  : `Seçilmişləri Sil (${selectedMatchIds.length})`}
              </span>
            </button>
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase text-slate-400 bg-white/[0.02]">
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allDisplayedSelected}
                    onChange={toggleSelectAllDisplayed}
                    title={
                      allDisplayedSelected
                        ? 'Bütün seçimləri ləğv et'
                        : 'Hamısını seç'
                    }
                    className="rounded accent-cyan-400 cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3">Tarix</th>
                <th className="py-2.5 px-3">Qarşılaşma</th>
                <th className="py-2.5 px-3 text-center">Hesab</th>
                <th className="py-2.5 px-3">Setlər</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Əməliyyatlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {displayedMatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    Heç bir oyun qeydi tapılmadı.
                  </td>
                </tr>
              ) : (
                displayedMatches.map((m) => {
                  const isPending = m.status === 'pending';
                  const isDeleting = deletingMatchId === m.id;
                  const isSelected = selectedMatchIds.includes(m.id);

                  return (
                    <tr
                      key={m.id}
                      className={`transition ${
                        isSelected
                          ? 'bg-cyan-500/10 hover:bg-cyan-500/15'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectMatch(m.id)}
                          className="rounded accent-cyan-400 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(m.match_date).toLocaleDateString('az-AZ', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${m.player1_score > m.player2_score ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                            {m.player1_name}
                          </span>
                          <span className="text-slate-500 text-[10px]">vs</span>
                          <span className={`font-semibold ${m.player2_score > m.player1_score ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                            {m.player2_name}
                          </span>
                        </div>
                        {m.tournament_title && (
                          <div className="text-[10px] text-slate-500 truncate max-w-xs">
                            {m.tournament_title}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-white/5">
                          {m.player1_score} - {m.player2_score}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {m.set_scores || '—'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPending
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isPending ? 'Gözləmədə' : 'Təsdiqlənib'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(m)}
                            title="Oyunu redaktə et"
                            className="p-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {(m.status === 'confirmed' || m.status === 'approved' || !m.status) && (
                            <button
                              type="button"
                              onClick={() => setVoidTarget(m)}
                              title="Matçı ləğv et və ELO xallarını geri qaytar"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#EF4444]/50 text-[#EF4444] hover:bg-[#EF4444]/10 text-[11px] font-bold transition"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Ləğv Et</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteMatch(m)}
                            disabled={isDeleting}
                            title="Bu oyunu sil"
                            className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredMatches.length > displayLimit && (
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => setDisplayLimit((prev) => prev + 25)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-cyan-400 font-semibold border border-white/10 transition"
            >
              Daha 25 oyun göstər (qalan: {filteredMatches.length - displayLimit})
            </button>
          </div>
        )}
      </div>

      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/80 backdrop-blur-sm">
          <ScrollLock />
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-[#0F1623] border border-[#EF4444]/30 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444]">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-white">Matçı Ləğv Et</h3>
                <p className="text-[11px] text-slate-400">Bu əməliyyat geri qaytarılmır</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#131C2B] border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">{voidTarget.player1_name}</span>
                <span className="font-mono font-black text-white">
                  {voidTarget.player1_score} - {voidTarget.player2_score}
                </span>
                <span className="font-semibold text-white">{voidTarget.player2_name}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono text-center">
                ELO dəyişikliyi: ±{voidTarget.elo_delta || 0}
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Bu matçı ləğv etmək istədiyinizə əminsiniz? Qazanılmış ELO xalları hər iki oyunçudan avtomatik geri qaytarılacaq.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isVoiding}
                onClick={() => setVoidTarget(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 border border-white/10 transition disabled:opacity-50"
              >
                İmtina
              </button>
              <button
                type="button"
                disabled={isVoiding}
                onClick={handleConfirmVoid}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EF4444] hover:bg-red-600 text-white text-xs font-bold transition shadow-lg shadow-red-500/20 disabled:opacity-60"
              >
                {isVoiding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Ban className="w-3.5 h-3.5" />
                )}
                <span>{isVoiding ? 'Ləğv edilir...' : 'Bəli, Ləğv Et'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {editingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/80 backdrop-blur-sm animate-fade-in">
          <ScrollLock />
          <div className="relative w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-white">
                    Oyunu Redaktə Et
                  </h3>
                  <p className="text-xs text-slate-400">
                    Oyun nəticəsini, set xallarını və statusunu dəyişin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMatch(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                <span className="text-[11px] uppercase font-bold text-slate-400">Qarşılaşma</span>
                <div className="flex items-center justify-center gap-3 mt-1">
                  <span className="font-bold text-sm text-cyan-300">{editingMatch.player1_name}</span>
                  <span className="text-xs text-slate-500 font-bold">VS</span>
                  <span className="font-bold text-sm text-amber-300">{editingMatch.player2_name}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {editingMatch.player1_name} Hesabı
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={7}
                    value={editP1Score}
                    onChange={(e) => setEditP1Score(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono font-bold text-cyan-400 focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {editingMatch.player2_name} Hesabı
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={7}
                    value={editP2Score}
                    onChange={(e) => setEditP2Score(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Set Hesabları
                </label>
                <input
                  type="text"
                  value={editSetScores}
                  onChange={(e) => setEditSetScores(e.target.value)}
                  placeholder="Məs: 11-8, 9-11, 11-7, 11-9"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="confirmed">Təsdiqlənib</option>
                    <option value="pending">Təsdiq Gözləyir</option>
                    <option value="rejected">Ləğv Edilib</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Oyun Tarixi
                  </label>
                  <input
                    type="date"
                    value={editMatchDate}
                    onChange={(e) => setEditMatchDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Turnir / Tədbir
                </label>
                <input
                  type="text"
                  value={editTournament}
                  onChange={(e) => setEditTournament(e.target.value)}
                  placeholder="Turnir adı və ya boş buraxın"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition"
                >
                  Ləğv Et
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs shadow-lg shadow-cyan-400/20 transition disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saxlanılır...' : 'Yadda Saxla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

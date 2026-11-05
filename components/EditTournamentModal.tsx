'use client';

import React, { useState, useMemo } from 'react';
import { Tournament, TournamentFormat, TournamentStatus, PlayerProfile } from '../lib/data/types';
import { BHOSDataStore } from '../lib/data/store';
import { isTournamentRosterLocked } from '../lib/tournament';
import {
  X,
  Settings,
  Calendar,
  Users,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Trophy,
  RefreshCw,
  Search,
  UserPlus,
  Trash2,
  Shield,
  GraduationCap,
} from 'lucide-react';

interface EditTournamentModalProps {
  tournament: Tournament;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditTournamentModal({
  tournament,
  onClose,
  onSaved,
}: EditTournamentModalProps) {
  const store = BHOSDataStore.getInstance();
  const [activeTab, setActiveTab] = useState<'settings' | 'roster'>('settings');

  // Form states
  const [title, setTitle] = useState(tournament.title || '');
  const [description, setDescription] = useState(tournament.description || '');
  const [format, setFormat] = useState<TournamentFormat>(
    tournament.format || 'single_elimination'
  );
  const [status, setStatus] = useState<TournamentStatus>(
    tournament.status || 'upcoming'
  );
  const [maxParticipants, setMaxParticipants] = useState<number>(
    tournament.max_participants || 16
  );
  const [groupSize, setGroupSize] = useState<number>(
    tournament.group_size || tournament.bracket_data?.settings?.group_size || 4
  );
  const [advancePerGroup, setAdvancePerGroup] = useState<number>(
    tournament.advance_per_group ||
      tournament.bracket_data?.settings?.advance_per_group ||
      2
  );
  const [location, setLocation] = useState(
    tournament.location || tournament.bracket_data?.settings?.location || 'Bibiheybət Kampusu'
  );
  const [registrationUrl, setRegistrationUrl] = useState(
    tournament.registration_url ||
      tournament.bracket_data?.settings?.registration_url ||
      ''
  );
  const [allowedAdmissionYear, setAllowedAdmissionYear] = useState<string>(
    tournament.allowed_admission_year ? String(tournament.allowed_admission_year) : 'all'
  );
  const [startDate, setStartDate] = useState(
    tournament.start_date
      ? new Date(tournament.start_date).toISOString().slice(0, 16)
      : '2026-11-07T10:00'
  );
  const [customRules, setCustomRules] = useState(tournament.custom_rules || '');

  // Roster states
  const [participantIds, setParticipantIds] = useState<string[]>(
    tournament.participants || []
  );
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const currentUser = useMemo(() => store.getCurrentUser(), [store]);
  const isCurrentUserEnrolled = currentUser ? participantIds.includes(currentUser.id) : false;

  const allProfiles = useMemo(() => store.getProfiles(), [store]);

  const participantProfiles = useMemo(() => {
    return participantIds
      .map((id) => allProfiles.find((p) => p.id === id) || store.getProfile(id))
      .filter((p): p is PlayerProfile => Boolean(p));
  }, [participantIds, allProfiles, store]);

  const availableToAddProfiles = useMemo(() => {
    const existingSet = new Set(participantIds);
    const query = playerSearchQuery.trim().toLowerCase();
    return allProfiles
      .filter((p) => !existingSet.has(p.id))
      .filter((p) => {
        if (!query) return true;
        return (
          p.full_name?.toLowerCase().includes(query) ||
          p.faculty?.toLowerCase().includes(query) ||
          p.department?.toLowerCase().includes(query) ||
          String(p.admission_year || '').includes(query)
        );
      })
      .slice(0, 8);
  }, [allProfiles, participantIds, playerSearchQuery]);

  const isLocked = isTournamentRosterLocked(status);

  const handleAddPlayer = (playerId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (participantIds.length >= maxParticipants) {
      setErrorMsg(`Maksimum tutuma çatılıb (${maxParticipants} nəfər).`);
      return;
    }
    if (participantIds.includes(playerId)) return;

    try {
      store.addTournamentParticipant(tournament.id, playerId);
      setParticipantIds((prev) => [...prev, playerId]);
      setSuccessMsg('Oyunçu turnirə əlavə edildi.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Xəta baş verdi.');
    }
  };

  const handleRemovePlayer = (playerId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      store.removeTournamentParticipant(tournament.id, playerId);
      setParticipantIds((prev) => prev.filter((id) => id !== playerId));
      setSuccessMsg('Oyunçu turnirdən çıxarıldı.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Xəta baş verdi.');
    }
  };

  const handleRegenerateBracket = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (participantIds.length < 2) {
      setErrorMsg('Cədvəl (bracket) qurmaq üçün ən azı 2 iştirakçı lazımdır.');
      return;
    }

    try {
      setIsRegenerating(true);
      store.regenerateTournamentBracket(tournament.id);
      setSuccessMsg('Turnir cədvəli ELO reytinqinə əsasən uğurla yenidən quruldu!');
      onSaved();
    } catch (err: any) {
      setErrorMsg(err.message || 'Cədvəli qurarkən xəta baş verdi.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!title.trim() || title.trim().length < 2) {
      setErrorMsg('Turnirin adı ən azı 2 simvol olmalıdır.');
      return;
    }

    try {
      setIsSubmitting(true);
      store.updateTournamentSettings(tournament.id, {
        title: title.trim(),
        description: description.trim(),
        format,
        status,
        max_participants: Number(maxParticipants),
        group_size: groupSize,
        advance_per_group: advancePerGroup,
        location: location.trim(),
        registration_url: registrationUrl.trim() || undefined,
        allowed_admission_year:
          allowedAdmissionYear === 'all' ? null : Number(allowedAdmissionYear),
        start_date: new Date(startDate).toISOString(),
        custom_rules: customRules.trim(),
        participants: participantIds,
        bracket_data: {
          ...(tournament.bracket_data || { rounds: [] }),
          settings: {
            ...(tournament.bracket_data?.settings || {}),
            group_size: groupSize,
            group_size_label: `${groupSize} nəfər`,
            advance_per_group: advancePerGroup,
            location: location.trim(),
            registration_url: registrationUrl.trim() || undefined,
            allowed_admission_year:
              allowedAdmissionYear === 'all' ? null : Number(allowedAdmissionYear),
          },
        },
      });

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Tənzimləmələri yadda saxlayarkən xəta baş verdi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border-2 border-blue-700/80 p-5 sm:p-7 shadow-2xl space-y-5 my-8">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-700/20 border border-blue-600/30 flex items-center justify-center text-blue-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-display font-black text-white">
                Turnir Tənzimləmələri & İştirakçı Redaktoru
              </h2>
              <p className="text-xs text-slate-400">
                Parametrləri sazlayın, qeydiyyatı idarə edin və ELO əsaslı cədvəli yeniləyin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-display font-bold transition ${
              activeTab === 'settings'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>⚙️ Əsas Tənzimləmələr</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-display font-bold transition ${
              activeTab === 'roster'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>👥 İştirakçı Siyahısı ({participantIds.length} / {maxParticipants})</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-600/15 border border-rose-600/40 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-600/15 border border-emerald-600/40 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {activeTab === 'settings' && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-slate-300 font-semibold">
                  Turnirin Adı
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">
                  Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as TournamentFormat)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="groups_and_knockout">
                    Qrup Mərhələsi + Pley-off (Knockout)
                  </option>
                  <option value="single_elimination">
                    Yalnız Olimpiya Sistemi (Single Elimination)
                  </option>
                  <option value="round_robin">
                    Dairəvi Sistem (Round Robin)
                  </option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">
                  Turnir Statusu
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TournamentStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="upcoming">Gözləyir / Qeydiyyat Açıqdır (Upcoming)</option>
                  <option value="ongoing">Canlı Gedir — Roster Kilidli (In Progress)</option>
                  <option value="completed">Başa çatıb (Completed)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">
                  Səbət Tutumu (Maksimum Oyunçu)
                </label>
                <select
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value={8}>8 Slot (Mini Bracket)</option>
                  <option value={16}>16 Slot (Standart Səbət)</option>
                  <option value={20}>20 Slot (4-5 Nəfərlik Qruplar)</option>
                  <option value={32}>32 Slot (Böyük Səbət)</option>
                  <option value={64}>64 Slot (Böyük Çempionat)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">
                  İştirakçı Uyğunluğu (Məhdudiyyət)
                </label>
                <select
                  value={allowedAdmissionYear}
                  onChange={(e) => setAllowedAdmissionYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="all">🌐 Hamı üçün açıq (Bütün tələbələr və heyət)</option>
                  <option value="2026">🎓 Yalnız Foundation (2026 Qəbul Tələbələri)</option>
                  <option value="2025">2025 Qəbul (1-ci kurs)</option>
                  <option value="2024">2024 Qəbul (2-ci kurs)</option>
                </select>
              </div>

              {format === 'groups_and_knockout' && (
                <>
                  <div className="space-y-1.5 p-3 rounded-2xl bg-slate-950/70 border border-blue-700/30">
                    <label className="block text-blue-300 font-bold">
                      Qrup Ölçüsü (Nəfər)
                    </label>
                    <select
                      value={groupSize}
                      onChange={(e) => setGroupSize(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none focus:border-blue-500"
                    >
                      <option value={3}>Hər qrupda 3 nəfər</option>
                      <option value={4}>Hər qrupda 4 nəfər (Tövsiyə olunan)</option>
                      <option value={5}>Hər qrupda 5 nəfər</option>
                      <option value={6}>Hər qrupda 6 nəfər</option>
                    </select>
                    <p className="text-[10px] text-slate-400">
                      4–5 nəfərlik qrup sistemi
                    </p>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-2xl bg-slate-950/70 border border-blue-700/30">
                    <label className="block text-blue-300 font-bold">
                      Pley-offa Keçən (Hər qrupdan)
                    </label>
                    <select
                      value={advancePerGroup}
                      onChange={(e) => setAdvancePerGroup(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none focus:border-blue-500"
                    >
                      <option value={1}>1 nəfər (Yalnız lider)</option>
                      <option value={2}>2 nəfər (Top 2 • Standart)</option>
                      <option value={3}>3 nəfər</option>
                    </select>
                    <p className="text-[10px] text-slate-400">
                      2 oyunçu pley-off mərhələsinə vəsiqə qazanır
                    </p>
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">
                  Məkan
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Məs: Bibiheybət Kampusu"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">
                  Başlama Tarixi və Saatı
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-slate-300 font-semibold">
                  Qısa Təsvir
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-slate-300 font-semibold">
                  Xüsusi Qaydalar (Markdown)
                </label>
                <textarea
                  rows={4}
                  value={customRules}
                  onChange={(e) => setCustomRules(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white font-semibold transition"
              >
                Ləğv et
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-display font-bold shadow-md transition active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Yadda saxlanılır...' : 'Tənzimləmələri Yadda Saxla'}</span>
              </button>
            </div>
          </form>
        )}

        {activeTab === 'roster' && (
          <div className="space-y-5 text-xs">
            {/* Header / Actions bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-white text-sm">
                    Qeydiyyatdan Keçən Oyunçular
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-700/20 text-blue-300 border border-blue-600/30">
                    {participantIds.length} / {maxParticipants}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isLocked
                    ? '⚠️ Turnir aktiv vəziyyətdədir. İştirakçı siyahısı kilidlənib.'
                    : 'Qeydiyyat açıqdır. Oyunçuları əlavə edə, silə və cədvəli qura bilərsiniz.'}
                </p>
              </div>

              <button
                type="button"
                disabled={isRegenerating || participantIds.length < 2}
                onClick={handleRegenerateBracket}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-display font-bold text-xs shadow-sm active:scale-95 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                <span>🔄 Cədvəli (Bracket) Yenidən Qur</span>
              </button>
            </div>

            {/* Search & Add Player */}
            {!isLocked && (
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                {currentUser && !isCurrentUserEnrolled && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <span className="text-amber-300 font-semibold text-xs">
                      👑 Təşkilatçı kimi bu turnirə qatılmaq istəyirsiniz?
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddPlayer(currentUser.id)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition active:scale-95"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Özünü ({currentUser.full_name || 'Təşkilatçı'}) Əlavə Et</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={playerSearchQuery}
                    onChange={(e) => setPlayerSearchQuery(e.target.value)}
                    placeholder="Klub oyunçularını ada və ya ixtisasa görə axtar və əlavə et..."
                    className="w-full bg-transparent border-none text-white text-xs placeholder:text-slate-500 focus:outline-none"
                  />
                  {playerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPlayerSearchQuery('')}
                      className="text-slate-400 hover:text-white text-[11px]"
                    >
                      Təmizlə
                    </button>
                  )}
                </div>

                {playerSearchQuery && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5 max-h-48 overflow-y-auto">
                    {availableToAddProfiles.length === 0 ? (
                      <p className="text-[11px] text-slate-500 py-1 text-center">
                        Uyğun oyunçu tapılmadı və ya artıq turnirə qeydiyyatdan keçib.
                      </p>
                    ) : (
                      availableToAddProfiles.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-blue-700/20 border border-blue-600/30 flex items-center justify-center text-[11px] font-bold text-blue-300 shrink-0">
                              {p.full_name?.charAt(0) || '?'}
                            </div>
                            <div className="truncate">
                              <span className="font-semibold text-white truncate block">
                                {p.full_name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {p.faculty || p.department || 'BANM'} • {p.admission_year ? `${p.admission_year} Qəbul` : ''} • ELO: {p.current_elo || 1200}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddPlayer(p.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-bold text-[11px] transition shrink-0 ml-2"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>Əlavə Et</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Current Enrolled Roster */}
            <div className="space-y-2">
              <span className="text-slate-300 font-semibold block">
                Cari İştirakçılar ({participantProfiles.length})
              </span>

              {participantProfiles.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                  <Users className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-slate-400 font-medium">Hələ heç bir iştirakçı qeydiyyatdan keçməyib.</p>
                  <p className="text-[11px] text-slate-500">
                    Yuxarıdakı axtarış paneli ilə klub oyunçularını əlavə edə bilərsiniz.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {participantProfiles.map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[11px] font-mono font-bold text-slate-500 w-4 text-center">
                          {idx + 1}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-blue-700/20 border border-blue-600/30 flex items-center justify-center text-xs font-bold text-blue-300 shrink-0">
                          {p.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-white truncate text-xs">
                            {p.full_name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {p.faculty || p.department || 'BANM'} • ELO: <span className="text-amber-400 font-bold">{p.current_elo || 1200}</span>
                          </p>
                        </div>
                      </div>

                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => handleRemovePlayer(p.id)}
                          title="İştirakçını çıxar"
                          className="p-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white transition shrink-0 ml-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <span className="text-[11px] text-slate-400">
                Dəyişikliklər avtomatik sinxronizasiya edilir.
              </span>
              <button
                type="button"
                onClick={() => {
                  onSaved();
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs shadow-sm transition active:scale-95"
              >
                Tamamla
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BHOSDataStore } from '../../lib/data/store';
import {
  PlayerProfile,
  Tournament,
  TournamentFormat,
} from '../../lib/data/types';
import { sanitizeTextInput, sanitizeMultilineText } from '../../lib/security/sanitize';
import { useTranslation } from '../../lib/i18n';
import EditTournamentModal from '../EditTournamentModal';
import {
  Trophy,
  Sliders,
  AlertCircle,
  Settings,
  MapPin,
  ExternalLink,
} from 'lucide-react';

interface TournamentsTabProps {
  profiles: PlayerProfile[];
  tournamentsList: Tournament[];
  currentUser: PlayerProfile | null;
  onTournamentsUpdated: (updated: Tournament[]) => void;
  showToast: (msg: string) => void;
}

export default function TournamentsTab({
  profiles,
  tournamentsList,
  currentUser,
  onTournamentsUpdated,
  showToast,
}: TournamentsTabProps) {
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const [tTitle, setTTitle] = useState('');
  const [tDesc, setTDesc] = useState('');
  const [tFormat, setTFormat] = useState<TournamentFormat>('groups_and_knockout');
  const [tGroupSize, setTGroupSize] = useState<number>(4);
  const [tAdvanceCount, setTAdvanceCount] = useState<number>(2);
  const [tLocation, setTLocation] = useState<string>('Bibiheybət Kampusu');
  const [tAllowedYear, setTAllowedYear] = useState<number | ''>(2026);
  const [tRegistrationUrl, setTRegistrationUrl] = useState<string>('https://forms.gle/ULNedGr1LFzyafRe9');
  const [tRules, setTRules] = useState(
    '### Turnir Qaydaları\n- Qrup mərhələsi: 4-5 nəfərlik qruplar (hər qrupdan 2 nəfər pley-offa çıxır).\n- Pley-off: Olimpiya sistemi (uduzan çıxır), 5 setdən ən yaxşısı.\n- ITTF standartlı servis qaydası (16 sm açıq ovucdan atış).'
  );
  const [tStartDate, setTStartDate] = useState('2026-11-07T10:00');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingTournamentState, setEditingTournamentState] = useState<Tournament | null>(null);

  useEffect(() => {
    if (selectedParticipants.length === 0 && profiles.length >= 4) {
      setSelectedParticipants(profiles.slice(0, 4).map((p) => p.id));
    }
  }, [profiles, selectedParticipants.length]);

  const toggleParticipant = (id: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanTitle = sanitizeTextInput(tTitle, 100);
    if (!cleanTitle || cleanTitle.length < 2) {
      setFormError('Zəhmət olmasa turnirin adını daxil edin (ən azı 2 hərf).');
      return;
    }

    const uniqueParticipants = Array.from(new Set(selectedParticipants.filter(Boolean)));
    if (uniqueParticipants.length < 2) {
      setFormError('Olimpiya səbəti yaratmaq üçün ən azı 2 fərqli iştirakçı seçin.');
      return;
    }

    const cleanDesc =
      sanitizeMultilineText(tDesc, 600) || 'Rəsmi BANM Masaüstü Tennis Klubu turniri.';
    const cleanRules = sanitizeMultilineText(tRules, 1500);
    const maxParticipants =
      uniqueParticipants.length <= 2
        ? 2
        : uniqueParticipants.length <= 4
        ? 4
        : uniqueParticipants.length <= 8
        ? 8
        : uniqueParticipants.length <= 16
        ? 16
        : uniqueParticipants.length <= 24
        ? 24
        : uniqueParticipants.length <= 32
        ? 32
        : uniqueParticipants.length <= 40
        ? 40
        : uniqueParticipants.length <= 48
        ? 48
        : 64;

    try {
      const created = store.createTournament({
        title: cleanTitle,
        description: cleanDesc,
        custom_rules: cleanRules,
        format: tFormat,
        group_size: tFormat === 'groups_and_knockout' ? tGroupSize : undefined,
        advance_per_group: tFormat === 'groups_and_knockout' ? tAdvanceCount : undefined,
        location: tLocation.trim() || undefined,
        allowed_admission_year: typeof tAllowedYear === 'number' ? tAllowedYear : undefined,
        registration_url: tRegistrationUrl.trim() || undefined,
        max_participants: maxParticipants,
        start_date: new Date(tStartDate).toISOString(),
        created_by: currentUser?.id || 'p-1',
        participant_ids: uniqueParticipants,
      });

      setTTitle('');
      setTDesc('');
      onTournamentsUpdated(store.getTournaments());
      showToast(`"${created.title}" turniri uğurla yaradıldı!`);
    } catch (err: any) {
      setFormError(err.message || 'Turnir yaradılarkən xəta baş verdi.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-6">
        <form
          onSubmit={handleCreateTournament}
          className="p-6 rounded-3xl border border-white/10 bg-slate-900/80 shadow-xl space-y-4"
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-display font-bold text-white">
              {t('tournaments.create_btn')}
            </h2>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Turnirin Adı
            </label>
            <input
              type="text"
              value={tTitle}
              onChange={(e) => setTTitle(e.target.value)}
              placeholder="Məs: Foundation Kuboku 2026"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Turnir Formatı
            </label>
            <select
              value={tFormat}
              onChange={(e) => {
                const val = e.target.value as TournamentFormat;
                setTFormat(val);
                if (val === 'groups_and_knockout') {
                  setTRules(
                    '### Turnir Qaydaları\n- Qrup mərhələsi: 4-5 nəfərlik qruplar (hər qrupdan 2 nəfər pley-offa çıxır).\n- Pley-off: Olimpiya sistemi (uduzan çıxır), 5 setdən ən yaxşısı.\n- ITTF standartlı servis qaydası (16 sm açıq ovucdan atış).'
                  );
                } else if (val === 'single_elimination') {
                  setTRules(
                    '### Turnir Qaydaları\n- Olimpiya sistemi (uduzan çıxır), 5 setdən ən yaxşısı.\n- ITTF standartlı servis qaydası (16 sm açıq ovucdan atış).'
                  );
                } else {
                  setTRules(
                    '### Turnir Qaydaları\n- Dairəvi sistem (bütün iştirakçılar bir-biri ilə oynayır).\n- 5 setdən ən yaxşısı.'
                  );
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="groups_and_knockout">Qrup Mərhələsi + Pley-off (4-5 nəfərlik qrup, 2 vəsiqə)</option>
              <option value="single_elimination">Birbaşa Olimpiya Sistemi (Knockout)</option>
              <option value="round_robin">Dairəvi Sistem (Round Robin)</option>
            </select>
          </div>

          {tFormat === 'groups_and_knockout' && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-cyan-950/20 border border-cyan-800/30">
              <div>
                <label className="block text-[11px] font-semibold text-cyan-300 mb-1">
                  Qrup Başına Nəfər
                </label>
                <select
                  value={tGroupSize}
                  onChange={(e) => setTGroupSize(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-cyan-800/50 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value={3}>3 nəfər</option>
                  <option value={4}>4 nəfər (Standart)</option>
                  <option value={5}>5 nəfər (Geniş)</option>
                  <option value={6}>6 nəfər</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-cyan-300 mb-1">
                  Qrupdan Pley-offa
                </label>
                <select
                  value={tAdvanceCount}
                  onChange={(e) => setTAdvanceCount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-cyan-800/50 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value={1}>İlk 1 nəfər</option>
                  <option value={2}>İlk 2 nəfər (Tövsiyə)</option>
                  <option value={3}>İlk 3 nəfər</option>
                </select>
              </div>
              <p className="col-span-2 text-[10px] text-cyan-400/80">
                ℹ️ Hər qrupda 4-5 nəfər mübarizə aparacaq və ilk 2 yeri tutan pley-offa vəsiqə qazanacaq.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Keçirilmə Məkanı
              </label>
              <input
                type="text"
                value={tLocation}
                onChange={(e) => setTLocation(e.target.value)}
                placeholder="Məs: Bibiheybət Kampusu"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Uyğun Qəbul İli
              </label>
              <select
                value={tAllowedYear}
                onChange={(e) => setTAllowedYear(e.target.value === 'all' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value={2026}>2026 (Yalnız Foundation)</option>
                <option value={2025}>2025 (1-ci kurslar)</option>
                <option value={2024}>2024 (2-ci kurslar)</option>
                <option value="all">Bütün Tələbələr & Müəllimlər</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Qeydiyyat Formu Linki (Google Forms)
            </label>
            <input
              type="url"
              value={tRegistrationUrl}
              onChange={(e) => setTRegistrationUrl(e.target.value)}
              placeholder="https://forms.gle/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Başlama Tarixi & Vaxtı
            </label>
            <input
              type="datetime-local"
              value={tStartDate}
              onChange={(e) => setTStartDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Təsvir
            </label>
            <input
              type="text"
              value={tDesc}
              onChange={(e) => setTDesc(e.target.value)}
              placeholder="Qısa turnir icmalı..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Xüsusi Qaydalar (Markdown)
            </label>
            <textarea
              rows={3}
              value={tRules}
              onChange={(e) => setTRules(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                İştirakçıları Seçin ({selectedParticipants.length} seçilib)
              </label>
              <span className="text-[10px] text-slate-400">Avtomatik ELO səpələnməsi</span>
            </div>
            <div className="max-h-40 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              {profiles.map((p) => {
                const checked = selectedParticipants.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition ${
                      checked
                        ? 'bg-cyan-500/15 text-white border border-cyan-500/30'
                        : 'text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleParticipant(p.id)}
                        className="rounded accent-cyan-400"
                      />
                      <span className="font-medium">{p.full_name}</span>
                    </div>
                    <span className="font-mono text-[11px] text-cyan-400">
                      {p.current_elo} ELO
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-xs shadow-lg shadow-amber-500/20 transition"
          >
            Turnir və Səbət Yarat
          </button>
        </form>
      </div>

      <div className="lg:col-span-6">
        <div className="p-6 rounded-3xl border border-white/10 bg-slate-900/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-display font-bold text-white">
                Aktiv & Mövcud Turnirlər
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              {tournamentsList.length} turnir
            </span>
          </div>

          {tournamentsList.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Hələ heç bir turnir yaradılmayıb.
            </p>
          ) : (
            <div className="space-y-3">
              {tournamentsList.map((tr) => {
                const groupCount = tr.bracket_data?.groups?.length || 0;
                return (
                  <div
                    key={tr.id}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 hover:border-cyan-500/30 transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-display font-bold text-white">
                          {tr.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                              tr.status === 'ongoing'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : tr.status === 'completed'
                                ? 'bg-slate-800 text-slate-300 border-slate-700'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {tr.status === 'ongoing'
                              ? 'Davam Edir'
                              : tr.status === 'completed'
                              ? 'Başa Çatıb'
                              : 'Planlaşdırılır'}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            {tr.format === 'groups_and_knockout'
                              ? `Qrup + Pley-off (${groupCount} qrup)`
                              : tr.format === 'round_robin'
                              ? 'Dairəvi'
                              : 'Olimpiya'}
                          </span>
                          {tr.location && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              {tr.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => setEditingTournamentState(tr)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Tənzimləmələri Redaktə Et
                      </button>
                      <Link
                        href={`/tournaments/${tr.slug || tr.id}`}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Turnirə Bax
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editingTournamentState && (
        <EditTournamentModal
          tournament={editingTournamentState}
          onClose={() => setEditingTournamentState(null)}
          onSaved={() => {
            setEditingTournamentState(null);
            onTournamentsUpdated(store.getTournaments());
            showToast('Turnir tənzimləmələri uğurla yeniləndi!');
          }}
        />
      )}
    </div>
  );
}

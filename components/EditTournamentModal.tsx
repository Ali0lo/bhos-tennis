'use client';

import React, { useState } from 'react';
import { Tournament, TournamentFormat, TournamentStatus } from '../lib/data/types';
import { BHOSDataStore } from '../lib/data/store';
import {
  X,
  Settings,
  Calendar,
  Users,
  MapPin,
  Link as LinkIcon,
  FileText,
  AlertCircle,
  CheckCircle2,
  Trophy,
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

  const [title, setTitle] = useState(tournament.title || '');
  const [description, setDescription] = useState(tournament.description || '');
  const [format, setFormat] = useState<TournamentFormat>(
    tournament.format || 'single_elimination'
  );
  const [status, setStatus] = useState<TournamentStatus>(
    tournament.status || 'upcoming'
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
      : '2026-11-07T14:00'
  );
  const [customRules, setCustomRules] = useState(tournament.custom_rules || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

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
        group_size: groupSize,
        advance_per_group: advancePerGroup,
        location: location.trim(),
        registration_url: registrationUrl.trim() || undefined,
        allowed_admission_year:
          allowedAdmissionYear === 'all' ? null : Number(allowedAdmissionYear),
        start_date: new Date(startDate).toISOString(),
        custom_rules: customRules.trim(),
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
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border-2 border-blue-700/80 p-6 sm:p-8 shadow-2xl space-y-6 my-8">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-700/20 border border-blue-600/30 flex items-center justify-center text-blue-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-display font-black text-white">
                Turnir Tənzimləmələri
              </h2>
              <p className="text-xs text-slate-400">
                Format, qrup strukturu, tarixlər və qaydaları redaktə edin
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

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-600/15 border border-rose-600/40 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

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
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TournamentStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="upcoming">Gözləyir (Upcoming)</option>
                <option value="ongoing">Davam edir (In Progress)</option>
                <option value="completed">Başa çatıb (Completed)</option>
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
                İcazə Verilən Qəbul İli
              </label>
              <select
                value={allowedAdmissionYear}
                onChange={(e) => setAllowedAdmissionYear(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="all">Bütün tələbələr və heyət</option>
                <option value="2026">Yalnız 2026 (Foundation tələbələri)</option>
                <option value="2025">2025 Qəbul</option>
                <option value="2024">2024 Qəbul</option>
              </select>
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

            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold">
                Qeydiyyat Formu Linki (Google Forms)
              </label>
              <input
                type="url"
                value={registrationUrl}
                onChange={(e) => setRegistrationUrl(e.target.value)}
                placeholder="https://forms.gle/..."
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
      </div>
    </div>
  );
}

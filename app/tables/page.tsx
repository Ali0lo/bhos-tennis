'use client';

import React, { useState, useEffect } from 'react';
import HallRulesSection from '../../components/HallRulesSection';
import { BHOSDataStore } from '../../lib/data/store';
import {
  PlayerProfile,
  TableReservation,
  isProfilePending,
  isProfileApproved,
} from '../../lib/data/types';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sparkles,
} from 'lucide-react';

export default function TablesPage() {
  const store = BHOSDataStore.getInstance();
  const [currentProfile, setCurrentProfile] = useState<PlayerProfile | null>(null);
  const [reservations, setReservations] = useState<TableReservation[]>([]);
  const [selectedTable, setSelectedTable] = useState<number>(2);
  const [slotDate, setSlotDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [startTime, setStartTime] = useState<string>('12:00');
  const [endTime, setEndTime] = useState<string>('13:00');
  const [notes, setNotes] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      setCurrentProfile(store.getCurrentUser());
      setReservations(store.getReservations(slotDate));
    };
    update();
    return store.subscribe(update);
  }, [store, slotDate]);

  const isPending = isProfilePending(currentProfile);
  const isApproved = isProfileApproved(currentProfile);

  const handleReservationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setToastMsg(null);

    if (!currentProfile) {
      setErrorMsg('Masa rezerv etmək üçün hesabınıza daxil olmalısınız.');
      return;
    }

    if (!isApproved) {
      setErrorMsg(
        'Hesabınız təsdiq gözləyir. Yalnız rəhbərlik təsdiqindən sonra matç qeyd edə və masa rezerv edə bilərsiniz.'
      );
      return;
    }

    try {
      store.createReservation({
        table_number: selectedTable,
        reserved_by: currentProfile.id,
        slot_date: slotDate,
        start_time: startTime,
        end_time: endTime,
        purpose: 'free_play',
        notes: notes.trim() || undefined,
      });
      setReservations(store.getReservations(slotDate));
      setNotes('');
      setToastMsg(`Masa #${selectedTable} (${startTime} – ${endTime}) uğurla rezerv edildi!`);
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Rezervasiya zamanı xəta baş verdi.');
    }
  };

  return (
    <div className="space-y-8 pt-14 pb-16">
      {isPending && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-xs shadow-lg">
          <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-200 block">
              Təsdiq Gözləyir (Pending Approval)
            </span>
            <span>
              Hesabınız təsdiq gözləyir. Yalnız rəhbərlik təsdiqindən sonra matç qeyd edə və masa rezerv edə bilərsiniz.
            </span>
          </div>
        </div>
      )}

      <HallRulesSection />

      <div className="rounded-3xl bg-[#0F1623] border border-white/10 p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6] shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-display font-black text-white">
                Masa Rezervasiyası
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Təsdiqlənmiş klub üzvləri üçün idman zalı masa vaxtının qeydiyyatı
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#3B82F6] text-[11px] font-bold uppercase tracking-wider w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            Masalar #1 – #4
          </span>
        </div>

        {toastMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleReservationSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Masa Seçimi
              </label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#131C2B] border border-white/10 text-xs text-white focus:outline-none focus:border-[#3B82F6]"
              >
                <option value={1}>Masa 1 — Xanımlar üçün Masa</option>
                <option value={2}>Masa 2 — Bəylər Liqa Masası</option>
                <option value={3}>Masa 3 — Bəylər Məşq Masası</option>
                <option value={4}>Masa 4 — Bəylər Sərbəst Masa</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tarix
              </label>
              <input
                type="date"
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#131C2B] border border-white/10 text-xs text-white focus:outline-none focus:border-[#3B82F6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Başlama Saatı
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#131C2B] border border-white/10 text-xs text-white focus:outline-none focus:border-[#3B82F6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Bitmə Saatı
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#131C2B] border border-white/10 text-xs text-white focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10">
            {!currentProfile ? (
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                Masa rezerv etmək üçün hesabınıza daxil olun.
              </span>
            ) : !isApproved ? (
              <span className="text-xs text-amber-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                Hesabınız Klub Prezidenti tərəfindən təsdiqləndikdən sonra masa rezerv edə bilərsiniz.
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                Aktiv rezervasiyalar: {reservations.length}
              </span>
            )}

            <button
              type="submit"
              disabled={!isApproved}
              title={
                !currentProfile
                  ? 'Əvvəlcə hesabınıza daxil olun.'
                  : !isApproved
                  ? 'Hesabınız Klub Prezidenti tərəfindən təsdiqləndikdən sonra masa rezerv edə bilərsiniz.'
                  : undefined
              }
              className="px-6 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-display font-bold text-xs shadow-lg shadow-[#3B82F6]/20 transition flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Masa Rezerv Et</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

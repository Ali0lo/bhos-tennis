'use client';

import React, { useState, useEffect } from 'react';
import { BHOSDataStore } from '../lib/data/store';
import { TableReservation, TablePurpose } from '../lib/data/types';
import { useTranslation } from '../lib/i18n';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Check, 
  X, 
  AlertCircle, 
  Lock, 
  User, 
  Users, 
  Trash2 
} from 'lucide-react';

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', 
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

export default function TableScheduler() {
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();
  const currentUser = store.getCurrentUser();

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reservations, setReservations] = useState<TableReservation[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Booking Form State
  const [targetTable, setTargetTable] = useState<number>(1);
  const [startTime, setStartTime] = useState<string>('16:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [purpose, setPurpose] = useState<TablePurpose>('free_play');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadReservations = () => {
    setReservations(store.getReservations(selectedDate));
  };

  useEffect(() => {
    loadReservations();
    const unsub = store.subscribe(() => {
      loadReservations();
    });
    return unsub;
  }, [selectedDate, store]);

  const handleOpenBooking = (tableNum?: number, slotTime?: string) => {
    if (tableNum) setTargetTable(tableNum);
    if (slotTime) {
      setStartTime(slotTime);
      // Auto set end time +1 hour
      const nextHour = parseInt(slotTime.split(':')[0], 10) + 1;
      setEndTime(`${nextHour < 10 ? '0' : ''}${nextHour}:00`);
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setModalOpen(true);
  };

  const handleCreateReservation = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (startTime >= endTime) {
      setErrorMsg('End time must be later than start time');
      return;
    }

    try {
      store.createReservation({
        table_number: targetTable,
        reserved_by: currentUser.id,
        slot_date: selectedDate,
        start_time: startTime,
        end_time: endTime,
        purpose,
        notes: notes.trim() || undefined,
      });

      setSuccessMsg('Reservation confirmed successfully!');
      setTimeout(() => {
        setModalOpen(false);
        setSuccessMsg(null);
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reserve table');
    }
  };

  const handleCancelReservation = (resId: string) => {
    if (confirm('Are you sure you want to cancel this reservation?')) {
      try {
        store.cancelReservation(resId);
      } catch (err: any) {
        alert(err.message || 'Error cancelling reservation');
      }
    }
  };

  const getPurposeBadge = (p: TablePurpose) => {
    switch (p) {
      case 'coaching':
        return { label: 'Coaching', style: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'tournament':
        return { label: 'Tournament', style: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'free_play':
      default:
        return { label: 'Free Play', style: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
    }
  };

  // Date buttons helper
  const getRelativeDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      {/* Date Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-bhos-border bg-bhos-darkCard/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-bhos-cyan" />
          <div className="flex items-center gap-1.5 bg-bhos-midnight p-1 rounded-xl border border-bhos-border">
            <button
              onClick={() => setSelectedDate(getRelativeDate(0))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedDate === getRelativeDate(0)
                  ? 'bg-bhos-cyan text-bhos-navy'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDate(getRelativeDate(1))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedDate === getRelativeDate(1)
                  ? 'bg-bhos-cyan text-bhos-navy'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Tomorrow
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 rounded-lg bg-bhos-darkCard border border-bhos-border text-xs text-slate-200 focus:outline-none focus:border-bhos-cyan"
            />
          </div>
        </div>

        <button
          onClick={() => handleOpenBooking()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-bhos-cyan to-bhos-blue text-bhos-navy hover:opacity-95 shadow-md shadow-cyan-500/20 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          <span>{t('tables.book_slot')}</span>
        </button>
      </div>

      {/* 6 Visual Table Tennis Court Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((tableNum) => {
          const tableResList = reservations.filter((r) => r.table_number === tableNum);

          return (
            <div
              key={tableNum}
              className="rounded-2xl border border-bhos-border bg-bhos-midnight/90 overflow-hidden shadow-lg transition-all hover:border-bhos-blue/60"
            >
              {/* Table Header: Realistic stylized table tennis top visual */}
              <div className="relative p-4 bg-gradient-to-r from-blue-900/60 via-slate-900 to-blue-900/60 border-b border-bhos-border">
                {/* Center Net White Line */}
                <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/20 -translate-x-1/2" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-bhos-cyan/20 text-bhos-cyan flex items-center justify-center font-display font-bold text-xs border border-bhos-cyan/40">
                      #{tableNum}
                    </span>
                    <div>
                      <h4 className="font-display font-bold text-white text-sm">
                        {t('tables.table')} {tableNum}
                      </h4>
                      <p className="text-[10px] text-slate-400">Donic Waldner Classic 25mm</p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {tableResList.length} {tableResList.length === 1 ? 'Booking' : 'Bookings'}
                  </span>
                </div>
              </div>

              {/* Table Schedule Slots List */}
              <div className="p-4 space-y-2.5">
                {tableResList.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    No reservations for this table on this date.
                    <button
                      onClick={() => handleOpenBooking(tableNum, '15:00')}
                      className="block mx-auto mt-2 text-bhos-cyan hover:underline text-xs"
                    >
                      + Reserve a practice slot
                    </button>
                  </div>
                ) : (
                  tableResList.map((res) => {
                    const badge = getPurposeBadge(res.purpose);
                    const canCancel =
                      currentUser.role === 'president' || currentUser.id === res.reserved_by;

                    return (
                      <div
                        key={res.id}
                        className="p-3 rounded-xl border border-bhos-border bg-bhos-darkCard/70 flex items-start justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 font-mono text-xs font-bold text-white">
                              <Clock className="w-3.5 h-3.5 text-bhos-cyan" />
                              {res.start_time} - {res.end_time}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold uppercase ${badge.style}`}
                            >
                              {badge.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-300">
                            <User className="w-3 h-3 text-slate-500" />
                            <span>{res.reserved_by_name}</span>
                            <span className="text-[10px] text-slate-500">
                              ({res.reserved_by_role})
                            </span>
                          </div>

                          {res.notes && (
                            <p className="text-[11px] text-slate-400 italic">"{res.notes}"</p>
                          )}
                        </div>

                        {canCancel && (
                          <button
                            onClick={() => handleCancelReservation(res.id)}
                            title="Cancel reservation"
                            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}

                <button
                  onClick={() => handleOpenBooking(tableNum)}
                  className="w-full mt-2 py-2 rounded-xl border border-dashed border-slate-700 hover:border-bhos-cyan hover:bg-bhos-cyan/5 text-[11px] text-slate-400 hover:text-bhos-cyan transition flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Book Slot on Table {tableNum}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Booking Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-bhos-border bg-bhos-midnight p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-bhos-border">
              <h4 className="font-display font-bold text-white text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-bhos-cyan" />
                <span>{t('tables.book_slot')}</span>
              </h4>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-400">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateReservation} className="mt-4 space-y-4 text-xs">
              {/* Table Number */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {t('tables.table')} (1 - 6)
                </label>
                <select
                  value={targetTable}
                  onChange={(e) => setTargetTable(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white focus:outline-none focus:border-bhos-cyan"
                >
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <option key={num} value={num}>
                      Table #{num} (BHOS Hall)
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {t('tables.select_date')}
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white focus:outline-none focus:border-bhos-cyan"
                />
              </div>

              {/* Time Slots */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Start Time
                  </label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white font-mono focus:outline-none focus:border-bhos-cyan"
                  >
                    {TIME_SLOTS.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    End Time
                  </label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white font-mono focus:outline-none focus:border-bhos-cyan"
                  >
                    {TIME_SLOTS.slice(1).concat('22:00').map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {t('tables.purpose')}
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as TablePurpose)}
                  className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white focus:outline-none focus:border-bhos-cyan"
                >
                  <option value="free_play">{t('tables.purpose_free')}</option>
                  {(currentUser.role === 'coach' || currentUser.role === 'president') && (
                    <option value="coaching">{t('tables.purpose_coaching')}</option>
                  )}
                  {currentUser.role === 'president' && (
                    <option value="tournament">{t('tables.purpose_tournament')}</option>
                  )}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Notes / Partner Name (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Practicing backhand loop against underspin"
                  className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white focus:outline-none focus:border-bhos-cyan"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
                >
                  {t('profile.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-bhos-cyan to-bhos-blue text-bhos-navy font-bold hover:opacity-95 shadow-lg shadow-cyan-500/20"
                >
                  Confirm Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


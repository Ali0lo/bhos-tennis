'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';
import { BHOSDataStore } from '../lib/data/store';
import { PlayerProfile } from '../lib/data/types';
import { useTranslation } from '../lib/i18n';
import {
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  GraduationCap,
  Award,
  Briefcase,
  Trash2,
  Calendar,
} from 'lucide-react';

export default function PendingVerificationQueue() {
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const [pendingPlayers, setPendingPlayers] = useState<PlayerProfile[]>([]);
  const [eloInputs, setEloInputs] = useState<Record<string, string>>({});
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchUnverifiedPlayers = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('is_verified', false)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setPendingPlayers(data as PlayerProfile[]);
          setEloInputs((prev) => {
            const next = { ...prev };
            (data as PlayerProfile[]).forEach((p) => {
              if (next[p.id] === undefined) {
                next[p.id] = '0';
              }
            });
            return next;
          });
          return;
        }
      } catch {
      }
    }

    const localUnverified = store.getUnverifiedProfiles();
    setPendingPlayers(localUnverified);
    setEloInputs((prev) => {
      const next = { ...prev };
      localUnverified.forEach((p) => {
        if (next[p.id] === undefined) {
          next[p.id] = '0';
        }
      });
      return next;
    });
  }, [store]);

  useEffect(() => {
    fetchUnverifiedPlayers();
    const unsub = store.subscribe(() => {
      fetchUnverifiedPlayers();
    });
    return unsub;
  }, [fetchUnverifiedPlayers, store]);

  const handleApprove = async (player: PlayerProfile) => {
    setErrorMsg(null);
    setToastMsg(null);

    const parsedElo = parseInt(eloInputs[player.id] || '0', 10);
    if (isNaN(parsedElo) || parsedElo < 0 || parsedElo > 9999) {
      setErrorMsg('Zəhmət olmasa düzgün ELO daxil edin.');
      return;
    }

    setApprovingId(player.id);

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await supabase
          .from('profiles')
          .update({
            is_verified: true,
            current_elo: parsedElo,
          })
          .eq('id', player.id);

        if (error) {
          throw new Error(error.message);
        }
      }

      await store.verifyPlayer(player.id, parsedElo, player);
      await store.fetchProfilesFromCloud();

      setPendingPlayers((prev) => prev.filter((p) => p.id !== player.id));
      setToastMsg(`${player.full_name} təsdiqləndi (Başlanğıc ELO: ${parsedElo})!`);
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Oyunçunu təsdiqləmək mümkün olmadı.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (player: PlayerProfile) => {
    const confirmed = window.confirm(
      `"${player.full_name}" adlı istifadəçinin qeydiyyat müraciətini ləğv edib silmək istədiyinizdən əminsiniz?`
    );
    if (!confirmed) return;

    setRejectingId(player.id);
    try {
      await store.deleteProfile(player.id);
      setPendingPlayers((prev) => prev.filter((p) => p.id !== player.id));
      setToastMsg(`"${player.full_name}" müraciəti ləğv edildi və silindi.`);
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Müraciəti silərkən xəta baş verdi.');
    } finally {
      setRejectingId(null);
    }
  };

  return (
    <div className="p-6 rounded-3xl border border-amber-500/30 bg-slate-900/80 backdrop-blur-xl shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <span>{t('admin.pending_title')}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {pendingPlayers.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400">{t('admin.pending_sub')}</p>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {pendingPlayers.length === 0 ? (
        <div className="p-6 rounded-2xl border border-white/5 bg-slate-950/60 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{t('admin.no_pending')}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingPlayers.map((player) => {
            const isStaff =
              player.user_type === 'teacher' ||
              player.user_type === 'staff' ||
              player.role === 'coach' ||
              !player.admission_year;

            return (
              <div
                key={player.id}
                className="p-4 rounded-2xl border border-white/10 bg-slate-950/80 flex flex-col justify-between gap-4 hover:border-amber-500/40 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display font-bold text-white text-sm">
                          {player.full_name}
                        </h3>
                        {isStaff ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            <Briefcase className="w-3 h-3" />
                            <span>Müəllim / Əməkdaş</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            <GraduationCap className="w-3 h-3" />
                            <span>Tələbə • {player.admission_year}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{player.email}</p>
                      {player.created_at && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-0.5">
                          <Calendar className="w-3 h-3 text-cyan-400" />
                          <span>
                            Müraciət: {new Date(player.created_at).toLocaleDateString('az-AZ', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                    {player.gender && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                          player.gender === 'female'
                            ? 'bg-pink-500/15 text-pink-300 border-pink-500/30'
                            : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                        }`}
                      >
                        {player.gender === 'female' ? t('auth.gender_female') : t('auth.gender_male')}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-300">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10">
                      {isStaff ? (
                        <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      <span>
                        {t(`faculties.${player.major_faculty}`) !== `faculties.${player.major_faculty}`
                          ? t(`faculties.${player.major_faculty}`)
                          : player.major_faculty}
                      </span>
                    </span>

                    {player.playing_level && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                        <Award className="w-3.5 h-3.5" />
                        <span>
                          {t(`levels.${player.playing_level}`) !== `levels.${player.playing_level}`
                            ? t(`levels.${player.playing_level}`)
                            : player.playing_level}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <label className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                      {t('admin.initial_elo')}:
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={9999}
                      value={eloInputs[player.id] ?? '0'}
                      onChange={(e) =>
                        setEloInputs((prev) => ({
                          ...prev,
                          [player.id]: e.target.value,
                        }))
                      }
                      className="w-24 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-cyan-400 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleReject(player)}
                      disabled={rejectingId === player.id || approvingId === player.id}
                      title="Müraciəti İmtina Et və Sil"
                      className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{rejectingId === player.id ? '...' : 'İmtina et'}</span>
                    </button>

                    <button
                      onClick={() => handleApprove(player)}
                      disabled={approvingId === player.id || rejectingId === player.id}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-display font-bold text-xs shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {approvingId === player.id ? '...' : t('admin.approve_assign_btn')}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

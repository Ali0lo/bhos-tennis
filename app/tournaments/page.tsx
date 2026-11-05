'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import SmoothReveal from '../../components/SmoothReveal';
import FoundationTournamentBanner from '../../components/FoundationTournamentBanner';
import EditTournamentModal from '../../components/EditTournamentModal';
import { BHOSDataStore } from '../../lib/data/store';
import {
  Tournament,
  PlayerProfile,
  isTournamentOrganizerOrAdmin,
  formatTournamentDateAz,
} from '../../lib/data/types';
import TournamentParticipantsRoster from '../../components/TournamentParticipantsRoster';
import { getProfileDepartment } from '../../lib/utils/department';
import { getSupabaseClient } from '../../lib/supabase/client';
import { isTournamentRosterLocked } from '../../lib/tournament';
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  Settings,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

function getInitials(name?: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function TournamentsPage() {
  const store = BHOSDataStore.getInstance();

  const [tournaments, setTournaments] = useState<Tournament[]>(() => store.getTournaments());
  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(() => store.getCurrentUser());
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [participantsByTournament, setParticipantsByTournament] = useState<Record<string, PlayerProfile[]>>({});
  const [expandedRosterId, setExpandedRosterId] = useState<string | null>(null);

  const fetchParticipants = useCallback(async (tourns: Tournament[]) => {
    const map: Record<string, PlayerProfile[]> = {};
    for (const t of tourns) {
      if (t.participants && t.participants.length > 0) {
        map[t.id] = await store.fetchParticipantProfiles(t.participants);
      } else {
        map[t.id] = [];
      }
    }
    setParticipantsByTournament(map);
  }, [store]);

  const loadData = useCallback(() => {
    const currentTournaments = [...store.getTournaments()];
    setTournaments(currentTournaments);
    setCurrentUser(store.getCurrentUser());
    fetchParticipants(currentTournaments);
  }, [store, fetchParticipants]);

  useEffect(() => {
    loadData();
    store.fetchTournamentsFromCloud().then(() => {
      const currentTournaments = [...store.getTournaments()];
      setTournaments(currentTournaments);
      fetchParticipants(currentTournaments);
    });

    const unsub = store.subscribe(() => {
      loadData();
    });

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.email) {
          supabase
            .from('profiles')
            .select('*')
            .eq('email', user.email)
            .single()
            .then(({ data }) => {
              if (data) setCurrentUser(data as PlayerProfile);
            });
        }
      });
    }

    return () => {
      unsub();
    };
  }, [loadData, store]);

  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    return isTournamentOrganizerOrAdmin(currentUser);
  }, [currentUser]);

  const handleRegister = async (t: Tournament) => {
    if (!currentUser) return;
    setNotification(null);
    setActionLoadingId(t.id);

    try {
      await store.registerForTournament(t.id, currentUser.id);
      setNotification({
        type: 'success',
        message: `"${t.title}" turnirinə uğurla qeydiyyatdan keçdiniz!`,
      });
      loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Qeydiyyat zamanı xəta baş verdi.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleWithdraw = async (t: Tournament) => {
    if (!currentUser) return;
    setNotification(null);
    setActionLoadingId(t.id);

    try {
      await store.withdrawFromTournament(t.id, currentUser.id);
      setNotification({
        type: 'success',
        message: `"${t.title}" turnirindən qeydiyyatınız ləğv edildi.`,
      });
      loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Xəta baş verdi.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const checkEligibility = (t: Tournament, user: PlayerProfile | null) => {
    if (!user) return { eligible: true }; // will prompt login first
    if (isTournamentOrganizerOrAdmin(user, t)) {
      return { eligible: true, isOrganizer: true };
    }
    if (!t.allowed_admission_year) return { eligible: true };

    if (user.user_type === 'teacher' || user.user_type === 'staff') {
      return {
        eligible: false,
        reason: `Yalnız ${t.allowed_admission_year} qəbul ili (Foundation) tələbələri üçün`,
      };
    }
    if (user.admission_year && user.admission_year !== t.allowed_admission_year) {
      return {
        eligible: false,
        reason: `Yalnız ${t.allowed_admission_year} qəbul ili (Foundation) tələbələri üçün (Siz: ${user.admission_year})`,
      };
    }
    return { eligible: true };
  };

  const formatStatus = (status?: string) => {
    if (status === 'ongoing' || status === 'in_progress' || status === 'active') {
      return {
        label: 'Canlı Gedir',
        color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      };
    }
    if (status === 'completed') {
      return {
        label: 'Başa Çatıb',
        color: 'bg-emerald-600/15 text-emerald-400 border-emerald-600/30',
      };
    }
    return {
      label: 'Qeydiyyat Açıqdır',
      color: 'bg-blue-600/15 text-blue-300 border-blue-600/30',
    };
  };

  const formatFormat = (fmt?: string) => {
    if (fmt === 'groups_and_knockout') return 'Qrup Mərhələsi + Pley-off';
    if (fmt === 'round_robin') return 'Dairəvi Sistem';
    return 'Olimpiya Sistemi';
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 pt-4 pb-16">
      {/* Featured Nov 7 Foundation Banner */}
      <SmoothReveal delay={0.02} className="w-full">
        <FoundationTournamentBanner />
      </SmoothReveal>

      {/* Notification Toast Banner */}
      {notification && (
        <SmoothReveal delay={0.03} className="w-full">
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold ${
              notification.type === 'success'
                ? 'bg-emerald-600/15 border-emerald-600/40 text-emerald-300'
                : 'bg-rose-600/15 border-rose-600/40 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg"
            >
              Bağla
            </button>
          </div>
        </SmoothReveal>
      )}

      {/* Header section */}
      <SmoothReveal delay={0.04} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-700/15 border border-blue-600/30 text-blue-400 text-[11px] font-display font-extrabold uppercase tracking-widest">
              <Trophy className="w-3.5 h-3.5" />
              BANM Stolüstü Tennis Çempionatı
            </span>
            <h1 className="text-3xl sm:text-4xl font-display font-black text-white tracking-tight">
              Turnirlər & Yarışlar
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Rəsmi universitet çempionatları, hazırlıq (Foundation) kubokları və olimpiya sistemli turnirlərə birbaşa buradan qoşulun.
            </p>
          </div>

          {isAdmin && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-700/20 text-blue-300 border border-blue-600/40 text-xs font-bold font-mono self-start sm:self-auto">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Admin Rejimi</span>
            </span>
          )}
        </div>
      </SmoothReveal>

      {/* Tournaments List */}
      <div className="space-y-6">
        {tournaments.length === 0 ? (
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
            <Trophy className="w-10 h-10 text-amber-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Bu semestr üçün turnir</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Bu semestr üçün yeganə rəsmi yarış Foundation Tələbələri Üçün Stolüstü Tennis Turniridir (7 Noyabr).
            </p>
          </div>
        ) : (
          tournaments.map((t, index) => {
          const participantCount = t.participants?.length || 0;
          const maxCapacity = t.max_participants || 16;
          const isFull = participantCount >= maxCapacity;
          const statusConfig = formatStatus(t.status);
          const isLocked = isTournamentRosterLocked(t.status);
          const isRegistered = currentUser
            ? store.isPlayerRegistered(t, currentUser.id)
            : false;
          const eligibility = checkEligibility(t, currentUser);
          const isLoading = actionLoadingId === t.id;
          const resolvedParts = participantsByTournament[t.id] || [];

          return (
            <SmoothReveal key={t.id} delay={0.05 + index * 0.03} className="w-full">
              <div className="rounded-3xl bg-slate-900 border-2 border-slate-800 hover:border-blue-700/60 p-6 sm:p-7 shadow-xl transition-all space-y-5">
                {/* Top Badges & Admin Trigger */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${statusConfig.color}`}
                    >
                      <span>{statusConfig.label}</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-700/20 border border-blue-600/30 text-blue-300 text-[11px] font-bold">
                      {formatFormat(t.format)}
                    </span>

                    {t.allowed_admission_year ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/15 border border-rose-600/40 text-rose-300 text-[11px] font-bold">
                        🎓 Yalnız {t.allowed_admission_year} Qəbul (Foundation)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300 text-[11px] font-medium">
                        🌐 Bütün Tələbələr və Heyət
                      </span>
                    )}
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setEditingTournament(t)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-700/30 hover:bg-blue-700/50 text-blue-300 border border-blue-600/40 text-xs font-bold transition shadow-sm self-start sm:self-auto"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>⚙️ Turniri Redaktə Et (Təşkilatçı)</span>
                    </button>
                  )}
                </div>

                {/* Tournament Main Info */}
                <div className="space-y-3">
                  <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight">
                    {t.title}
                  </h2>

                  {t.description && (
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                      {t.description}
                    </p>
                  )}

                  {/* Metadata Pills */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-300 font-mono">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span>
                        {formatTournamentDateAz(t.start_date)}
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>{t.location || 'Bibiheybət Kampusu'}</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>
                        {participantCount} / {maxCapacity} Oyunçu
                      </span>
                    </span>
                  </div>
                </div>

                {/* Registered Students Section on Card */}
                <div className="pt-3 border-t border-white/5 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs font-display font-bold text-white">
                        Qeydiyyatdan Keçən Tələbələr ({participantCount} / {maxCapacity})
                      </span>
                    </div>

                    {participantCount > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRosterId((prev) => (prev === t.id ? null : t.id))
                        }
                        className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{expandedRosterId === t.id ? 'Siyahını Yığcamlaşdır ▲' : 'Bütün Tələbələri Göstər ▼'}</span>
                      </button>
                    )}
                  </div>

                  {participantCount === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-400 flex items-center justify-between gap-3">
                      <span>Hələ heç bir tələbə qeydiyyatdan keçməyib. İlk qoşulan siz olun!</span>
                      <span className="text-[11px] font-mono text-emerald-400 font-semibold">{maxCapacity} yer açıqdır</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {/* Avatars Stack Preview */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex -space-x-2 overflow-hidden py-0.5">
                          {resolvedParts.slice(0, 8).map((player, pIdx) => (
                            <div
                              key={player.id || pIdx}
                              title={`${player.full_name} (${getProfileDepartment(player) || 'Foundation'})`}
                              className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-900 bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-[11px] font-display font-black flex items-center justify-center shrink-0 shadow-sm"
                            >
                              {player.avatar_url ? (
                                <img
                                  src={player.avatar_url}
                                  alt={player.full_name}
                                  className="h-full w-full rounded-full object-cover"
                                />
                              ) : (
                                getInitials(player.full_name)
                              )}
                            </div>
                          ))}
                        </div>

                        {participantCount > 8 && (
                          <span className="text-xs font-mono text-slate-400 font-bold">
                            +{participantCount - 8} digər
                          </span>
                        )}

                        <span className="text-xs text-slate-400 font-mono">
                          • {resolvedParts.map((p) => p.full_name.split(' ')[0]).slice(0, 3).join(', ')}
                          {participantCount > 3 ? '...' : ''}
                        </span>
                      </div>

                      {/* Detailed Expanded Roster */}
                      {expandedRosterId === t.id && (
                        <div className="pt-2">
                          <TournamentParticipantsRoster
                            tournament={t}
                            participants={resolvedParts}
                            currentUser={currentUser}
                            isAdmin={isAdmin}
                            showAdminControls={false}
                            compact={true}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Registration CTA & Actions Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Logged Out */}
                    {!currentUser && (
                      <Link
                        href="/login?redirect=/tournaments"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-display font-bold text-xs shadow-md transition active:scale-95"
                      >
                        <span>Daxil Ol və Turnirə Qoşul →</span>
                      </Link>
                    )}

                    {/* Logged in, Already Registered */}
                    {currentUser && isRegistered && (
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500 text-emerald-400 font-display font-bold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Qeydiyyatdan Keçmisiniz ✓</span>
                        </span>

                        {!isLocked && (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleWithdraw(t)}
                            className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 font-semibold text-xs transition"
                          >
                            {isLoading ? 'Ləğv edilir...' : 'Qeydiyyatı Ləğv Et'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Logged in, Not Registered */}
                    {currentUser && !isRegistered && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-semibold">
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                            <span>Qeydiyyat Bağlanıb</span>
                          </span>
                        ) : !eligibility.eligible ? (
                          <span
                            title={eligibility.reason}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-semibold"
                          >
                            <Lock className="w-3.5 h-3.5 text-rose-400" />
                            <span>{eligibility.reason}</span>
                          </span>
                        ) : isFull ? (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-semibold">
                            Yerlər Dolub (Maksimum {maxCapacity})
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleRegister(t)}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-xs shadow-md transition active:scale-95"
                          >
                            <span>{isLoading ? 'Qeydiyyat aparılır...' : 'Turnirə Qoşul (1-Klik)'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {eligibility.isOrganizer && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                            👑 Təşkilatçı kimi iştirak
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tournament Detail Link */}
                  <Link
                    href={`/tournaments/${t.slug || t.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-display font-semibold text-xs border border-white/10 transition self-start sm:self-auto"
                  >
                    <span>Turnir Cədvəlinə Bax</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>
              </div>
            </SmoothReveal>
          );
        }))}
      </div>

      {/* Admin Tournament Settings Modal */}
      {editingTournament && (
        <EditTournamentModal
          tournament={editingTournament}
          onClose={() => setEditingTournament(null)}
          onSaved={() => {
            loadData();
            setEditingTournament(null);
            setNotification({
              type: 'success',
              message: 'Turnir tənzimləmələri uğurla yeniləndi!',
            });
          }}
        />
      )}
    </div>
  );
}

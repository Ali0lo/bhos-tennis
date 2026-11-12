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
import { useTranslation } from '../../lib/i18n';
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
  const { t } = useTranslation();
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
      map[t.id] = await store.fetchParticipantProfiles(t.participants || [], t);
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

  const handleRegister = async (tourn: Tournament) => {
    if (!currentUser) return;
    setNotification(null);
    setActionLoadingId(tourn.id);

    try {
      await store.registerForTournament(tourn.id, currentUser.id);
      setNotification({
        type: 'success',
        message: t('tournaments.toast_registered', 'Turnirə uğurla qeydiyyatdan keçdiniz!'),
      });
      loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || t('common.error', 'Qeydiyyat zamanı xəta baş verdi.'),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleWithdraw = async (tourn: Tournament) => {
    if (!currentUser) return;
    setNotification(null);
    setActionLoadingId(tourn.id);

    try {
      await store.withdrawFromTournament(tourn.id, currentUser.id);
      setNotification({
        type: 'success',
        message: t('tournaments.toast_cancelled', 'Turnir qeydiyyatınız ləğv edildi.'),
      });
      loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || t('common.error', 'Xəta baş verdi.'),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const checkEligibility = (tourn: Tournament, user: PlayerProfile | null) => {
    if (!user) return { eligible: true }; // will prompt login first
    if (isTournamentOrganizerOrAdmin(user, tourn)) {
      return { eligible: true, isOrganizer: true };
    }
    if (!tourn.allowed_admission_year) return { eligible: true };

    if (user.user_type === 'teacher' || user.user_type === 'staff') {
      return {
        eligible: false,
        reason: `${t('tournaments.filter_foundation', 'Foundation')} (${tourn.allowed_admission_year})`,
      };
    }
    if (user.admission_year && user.admission_year !== tourn.allowed_admission_year) {
      return {
        eligible: false,
        reason: `${t('tournaments.filter_foundation', 'Foundation')} (${tourn.allowed_admission_year})`,
      };
    }
    return { eligible: true };
  };

  const formatStatus = (status?: string) => {
    if (status === 'ongoing' || status === 'in_progress' || status === 'active') {
      return {
        label: t('tournaments.status_ongoing', 'Canlı Gedir'),
        color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      };
    }
    if (status === 'completed') {
      return {
        label: t('tournaments.status_completed', 'Başa Çatıb'),
        color: 'bg-emerald-600/15 text-emerald-400 border-emerald-600/30',
      };
    }
    return {
      label: t('tournaments.status_upcoming', 'Qeydiyyat Açıqdır'),
      color: 'bg-blue-600/15 text-blue-300 border-blue-600/30',
    };
  };

  const formatFormat = (fmt?: string) => {
    if (fmt === 'groups_and_knockout') return `${t('tournaments.group', 'Qrup')} + ${t('tournaments.playoff', 'Pley-off')}`;
    if (fmt === 'round_robin') return t('tournaments.format_round_robin', 'Dairəvi Sistem');
    return t('tournaments.format_single', 'Olimpiya Sistemi');
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
              {t('common.close', 'Bağla')}
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
              <span>{t('brand.title', 'BANM Stolüstü Tennis Klubu')}</span>
            </span>
            <h1 className="text-3xl sm:text-4xl font-display font-black text-white tracking-tight">
              {t('tournaments.title')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              {t('tournaments.subtitle')}
            </p>
          </div>

          {isAdmin && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-700/20 text-blue-300 border border-blue-600/40 text-xs font-bold font-mono self-start sm:self-auto">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>{t('admin.title', 'Admin Rejimi')}</span>
            </span>
          )}
        </div>
      </SmoothReveal>

      {/* Tournaments List */}
      <div className="space-y-6">
        {tournaments.length === 0 ? (
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
            <Trophy className="w-10 h-10 text-amber-400 mx-auto" />
            <h3 className="text-base font-bold text-white">{t('tournaments.upcoming_tournament', 'Bu semestr üçün turnir')}</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {t('tournaments.foundation_banner_stats', 'Bu semestr üçün rəsmi yarış Foundation Tələbələri Üçün Stolüstü Tennis Turniridir.')}
            </p>
          </div>
        ) : (
          tournaments.map((tourn, index) => {
          const resolvedParts = participantsByTournament[tourn.id] || [];
          const participantCount = resolvedParts.length > 0 ? resolvedParts.length : (tourn.participants?.length || 0);
          const maxCapacity = tourn.max_participants || 12;
          const isFull = participantCount >= maxCapacity;
          const statusConfig = formatStatus(tourn.status);
          const isLocked = isTournamentRosterLocked(tourn.status);
          const isRegistered = currentUser
            ? store.isPlayerRegistered(tourn, currentUser.id)
            : false;
          const eligibility = checkEligibility(tourn, currentUser);
          const isLoading = actionLoadingId === tourn.id;

          return (
            <SmoothReveal key={tourn.id} delay={0.05 + index * 0.03} className="w-full">
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
                      {formatFormat(tourn.format)}
                    </span>

                    {tourn.allowed_admission_year ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/15 border border-rose-600/40 text-rose-300 text-[11px] font-bold">
                        {t('tournaments.eligibility_foundation', '🎓 Yalnız Foundation (2026 Qəbul Tələbələri)')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300 text-[11px] font-medium">
                        {t('tournaments.eligibility_open_all', '🌐 Bütün Tələbələr və Heyət')}
                      </span>
                    )}
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setEditingTournament(tourn)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-700/30 hover:bg-blue-700/50 text-blue-300 border border-blue-600/40 text-xs font-bold transition shadow-sm self-start sm:self-auto"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>⚙️ {t('tournaments.edit_btn', 'Turniri Redaktə Et')}</span>
                    </button>
                  )}
                </div>

                {/* Tournament Main Info */}
                <div className="space-y-3">
                  <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight">
                    {tourn.title}
                  </h2>

                  {tourn.description && (
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                      {tourn.description}
                    </p>
                  )}

                  {/* Metadata Pills */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-300 font-mono">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span>
                        {formatTournamentDateAz(tourn.start_date)}
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>{tourn.location || t('tournaments.field_location_placeholder', 'Bibiheybət Kampusu')}</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>
                        {participantCount} {t('tournaments.participants_badge', 'İştirakçı')}
                      </span>
                    </span>
                  </div>

                  {/* Official Podium Banner for Completed Tournaments */}
                  {tourn.status === 'completed' && (
                    <div className="mt-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-950 to-amber-500/5 border border-amber-500/30 p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-display font-black uppercase tracking-wider text-amber-300">
                            {t('tournaments.podium_title', 'Rəsmi Fəxri Kürsü (Podium) — Yekun Nəticələr')}
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold">
                          38 {t('tournaments.matches_completed', 'Rəsmi Oyun Tamamlandı')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* 1st Place */}
                        {(() => {
                          const p1 =
                            tourn.bracket_data?.podium?.first ||
                            (tourn.winner_id ? store.getProfile(tourn.winner_id) : undefined);
                          const name1 = p1?.full_name || 'Yusif Xanlarov';
                          const elo1 = p1?.current_elo ?? 462;
                          return (
                            <Link
                              href={store.getPlayerHref(p1?.id || 'p-f-yusif-xanlarov', name1)}
                              className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/15 border border-amber-400/40 hover:border-amber-400 transition group"
                            >
                              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-display font-black text-base flex items-center justify-center shrink-0 shadow-md">
                                🥇
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold">
                                  1-ci Yer • Çempion
                                </div>
                                <div className="text-sm font-display font-black text-white truncate group-hover:text-amber-300 transition">
                                  {name1}
                                </div>
                                <div className="text-[11px] font-mono text-amber-200/80">
                                  {elo1} ELO • Final: 3-0
                                </div>
                              </div>
                            </Link>
                          );
                        })()}

                        {/* 2nd Place */}
                        {(() => {
                          const p2 =
                            tourn.bracket_data?.podium?.second ||
                            (tourn.runner_up_id ? store.getProfile(tourn.runner_up_id) : undefined);
                          const name2 = p2?.full_name || 'Məharət Kərimli';
                          const elo2 = p2?.current_elo ?? 441;
                          return (
                            <Link
                              href={store.getPlayerHref(p2?.id || 'p-f-meharet-kerimli', name2)}
                              className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/70 border border-slate-600/50 hover:border-slate-400 transition group"
                            >
                              <div className="w-10 h-10 rounded-xl bg-slate-300 text-slate-950 font-display font-black text-base flex items-center justify-center shrink-0 shadow-md">
                                🥈
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-bold">
                                  {t('tournaments.second_place', '2-ci Yer • Gümüş')}
                                </div>
                                <div className="text-sm font-display font-black text-white truncate group-hover:text-blue-300 transition">
                                  {name2}
                                </div>
                                <div className="text-[11px] font-mono text-slate-400">
                                  {elo2} ELO • {t('tournaments.finalist', 'Finalçı')}
                                </div>
                              </div>
                            </Link>
                          );
                        })()}

                        {/* 3rd Place */}
                        {(() => {
                          const p3 =
                            tourn.bracket_data?.podium?.third ||
                            (tourn.third_place_id ? store.getProfile(tourn.third_place_id) : undefined);
                          const name3 = p3?.full_name || 'Əhəd Zamanlı';
                          const elo3 = p3?.current_elo ?? 458;
                          return (
                            <Link
                              href={store.getPlayerHref(p3?.id || 'p-f-ehed-zamanli', name3)}
                              className="flex items-center gap-3 p-3 rounded-xl bg-orange-950/40 border border-orange-500/40 hover:border-orange-400 transition group"
                            >
                              <div className="w-10 h-10 rounded-xl bg-orange-400 text-slate-950 font-display font-black text-base flex items-center justify-center shrink-0 shadow-md">
                                🥉
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[10px] font-mono uppercase tracking-wider text-orange-300 font-bold">
                                  {t('tournaments.third_place_podium', '3-cü Yer • Bürünc')}
                                </div>
                                <div className="text-sm font-display font-black text-white truncate group-hover:text-orange-300 transition">
                                  {name3}
                                </div>
                                <div className="text-[11px] font-mono text-orange-200/80">
                                  {elo3} ELO • {t('tournaments.third_place_stat', '3-cü yer')}: 3-2
                                </div>
                              </div>
                            </Link>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Registered Students Section on Card */}
                <div className="pt-3 border-t border-white/5 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs font-display font-bold text-white">
                        {t('tournaments.registered_students', 'Qeydiyyatdan Keçən Tələbələr')} ({participantCount} {t('tournaments.participants_badge', 'İştirakçı')})
                      </span>
                    </div>

                    {participantCount > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRosterId((prev) => (prev === tourn.id ? null : tourn.id))
                        }
                        className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{expandedRosterId === tourn.id ? t('tournaments.collapse_roster', 'Siyahını Yığcamlaşdır ▲') : t('tournaments.expand_roster', 'Bütün Tələbələri Göstər ▼')}</span>
                      </button>
                    )}
                  </div>

                  {participantCount === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-400 flex items-center justify-between gap-3">
                      <span>{t('tournaments.no_students_yet', 'Hələ heç bir tələbə qeydiyyatdan keçməyib. İlk qoşulan siz olun!')}</span>
                      <span className="text-[11px] font-mono text-emerald-400 font-semibold">{maxCapacity} {t('tournaments.spots_open', 'yer açıqdır')}</span>
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
                            +{participantCount - 8} {t('tournaments.and_others', 'digər')}
                          </span>
                        )}

                        <span className="text-xs text-slate-400 font-mono">
                          • {resolvedParts.map((p) => p.full_name.split(' ')[0]).slice(0, 3).join(', ')}
                          {participantCount > 3 ? '...' : ''}
                        </span>
                      </div>

                      {/* Detailed Expanded Roster */}
                      {expandedRosterId === tourn.id && (
                        <div className="pt-2">
                          <TournamentParticipantsRoster
                            tournament={tourn}
                            participants={resolvedParts}
                            currentUser={currentUser}
                            isAdmin={isAdmin}
                            showAdminControls={isAdmin}
                            onAddParticipant={async (pid) => {
                              await store.addTournamentParticipant(tourn.id, pid);
                              loadData();
                            }}
                            onRemoveParticipant={async (pid) => {
                              await store.withdrawFromTournament(tourn.id, pid);
                              loadData();
                            }}
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
                        <span>{t('tournaments.register_now_btn', 'Daxil Ol və Turnirə Qoşul →')}</span>
                      </Link>
                    )}

                    {/* Logged in, Already Registered */}
                    {currentUser && isRegistered && (
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500 text-emerald-400 font-display font-bold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t('tournaments.registered', 'Qeydiyyatdan Keçmisiniz')} ✓</span>
                        </span>

                        {!isLocked && (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleWithdraw(tourn)}
                            className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 font-semibold text-xs transition"
                          >
                            {isLoading ? t('common.loading', 'Ləğv edilir...') : t('tournaments.cancel_registration', 'Qeydiyyatı Ləğv Et')}
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
                            <span>{t('tournaments.registration_closed', 'Qeydiyyat Bağlanıb')}</span>
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
                            {t('tournaments.roster_full', 'Yerlər Dolub')} ({t('whatif.maximum', 'Maksimum')} {maxCapacity})
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleRegister(tourn)}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-xs shadow-md transition active:scale-95"
                          >
                            <span>{isLoading ? t('tournaments.registering', 'Qeydiyyat aparılır...') : t('tournaments.register_now_btn', 'Turnirə Qoşul (1-Klik)')}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {eligibility.isOrganizer && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                            👑 {t('tournaments.organizer', 'Təşkilatçı')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tournament Detail Link */}
                  <Link
                    href={`/tournaments/${tourn.slug || tourn.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-display font-semibold text-xs border border-white/10 transition self-start sm:self-auto"
                  >
                    <span>{t('tournaments.bracket', 'Turnir Cədvəlinə Bax')}</span>
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
              message: t('tournaments.toast_settings_saved', 'Turnir tənzimləmələri uğurla yeniləndi!'),
            });
          }}
        />
      )}
    </div>
  );
}

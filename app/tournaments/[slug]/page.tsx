'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '../../../lib/supabase/client';
import { BHOSDataStore, getPlayerHref } from '../../../lib/data/store';
import {
  Tournament,
  PlayerProfile,
  isTournamentOrganizerOrAdmin,
  formatTournamentDateAz,
} from '../../../lib/data/types';
import SmoothReveal from '../../../components/SmoothReveal';
import BracketTree from '../../../components/BracketTree';
import TournamentGroupsStage from '../../../components/TournamentGroupsStage';
import EditTournamentModal from '../../../components/EditTournamentModal';
import TournamentRulesViewer from '../../../components/TournamentRulesViewer';
import TournamentParticipantsRoster from '../../../components/TournamentParticipantsRoster';
import { INITIAL_TOURNAMENTS } from '../../../lib/data/mockData';
import { 
  Trophy, 
  ArrowLeft, 
  Calendar, 
  Users, 
  FileText, 
  Award, 
  ShieldCheck,
  Loader2,
  Settings,
  MapPin,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { isTournamentRosterLocked } from '../../../lib/tournament';
import { useTranslation } from '../../../lib/i18n';

export default function TournamentDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const store = BHOSDataStore.getInstance();
  const rawSlug = params.slug as string;
  const slug = rawSlug ? decodeURIComponent(rawSlug) : '';

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<PlayerProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(store.getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = useCallback(async (silent: boolean = false) => {
    if (!slug) return;
    if (!silent) {
      setLoading(true);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', user.email)
            .single();
          if (profile) setCurrentUser(profile as PlayerProfile);
        }

        const { data, error } = await supabase
          .from('tournaments')
          .select('*')
          .eq('slug', slug)
          .single();

        if (!error && data) {
          let regIds: string[] = [];
          try {
            const { data: regRows } = await supabase
              .from('tournament_registrations')
              .select('player_id')
              .eq('tournament_slug', slug);
            if (regRows && Array.isArray(regRows)) {
              regIds = regRows.map((r: any) => r.player_id).filter(Boolean);
            }
          } catch {}

          const local = store.getTournament(slug);
          const init = INITIAL_TOURNAMENTS.find((it) => it.slug === slug || it.id === data.id);
          const cachedBracket = store.getBracketDataFromCache(slug) || store.getBracketDataFromCache(data.id);

          const cloudHasGroups = Boolean(data.bracket_data?.groups && data.bracket_data.groups.length > 0);
          const localHasGroups = Boolean(local?.bracket_data?.groups && local.bracket_data.groups.length > 0);
          const cachedHasGroups = Boolean(cachedBracket?.groups && cachedBracket.groups.length > 0);
          const initHasGroups = Boolean(init?.bracket_data?.groups && init.bracket_data.groups.length > 0);

          const isFoundation =
            slug === 'foundation-kuboku-2026' ||
            slug === 'tourn-foundation-2026' ||
            data.slug === 'foundation-kuboku-2026' ||
            data.id === 'tourn-foundation-2026';

          if (isFoundation && init) {
            data.status = 'completed';
            data.title = init.title;
            data.winner_id = data.winner_id || init.winner_id;
            data.runner_up_id = data.runner_up_id || init.runner_up_id;
            data.third_place_id = data.third_place_id || init.third_place_id;
            data.max_participants = 12;
            data.group_size = 6;
            data.advance_per_group = 4;
            data.custom_rules = init.custom_rules;
            data.description = init.description;
            const cloudHasCompletedBracket = Boolean(
              data.bracket_data?.rounds &&
                data.bracket_data.rounds.length >= 3 &&
                data.bracket_data.third_place_match
            );
            if (!cloudHasCompletedBracket) {
              data.bracket_data = init.bracket_data;
            }
            store.saveBracketDataToCache(slug, data.bracket_data);
            store.saveBracketDataToCache(data.id, data.bracket_data);
          } else if (!cloudHasGroups) {
            if (cachedHasGroups) {
              data.bracket_data = cachedBracket;
            } else if (localHasGroups) {
              data.bracket_data = local!.bracket_data;
            } else if (initHasGroups) {
              data.bracket_data = init!.bracket_data;
            }
          } else {
            store.saveBracketDataToCache(slug, data.bracket_data);
            store.saveBracketDataToCache(data.id, data.bracket_data);
          }

          const candidateParticipantIds = isFoundation
            ? (Array.isArray(data.participants) ? data.participants : [])
            : Array.from(
                new Set([
                  ...(Array.isArray(data.participants) ? data.participants : []),
                  ...regIds,
                ])
              ).filter(Boolean) as string[];

          const rawParts = await store.fetchParticipantProfiles(candidateParticipantIds, data as Tournament);
          let actualPlayers = rawParts.filter((p) => {
            const email = (p.email || '').trim().toLowerCase();
            const nameLower = (p.full_name || '').toLowerCase();
            const name = nameLower.replace(/[^a-z]/g, '');
            return (
              email !== 'ali.iskandarli.std@bhos.edu.az' &&
              email !== 'ali.iskandarli@bhos.edu.az' &&
              name !== 'aliiskandarli' &&
              name !== 'eliisgenderli' &&
              !nameLower.includes('adəm rəhimli') &&
              !nameLower.includes('adem rehimli')
            );
          });

          if (actualPlayers.length === 0 && data.bracket_data?.groups) {
            const groupPlayers = data.bracket_data.groups.flatMap((g: any) => g.players || []);
            const seen = new Set<string>();
            for (const gp of groupPlayers) {
              if (gp && gp.id && !seen.has(gp.id)) {
                seen.add(gp.id);
                actualPlayers.push(gp);
              }
            }
          }

          data.participants = actualPlayers.map((p) => p.id);
          setTournament(data as Tournament);
          setParticipants(actualPlayers);
          setLoading(false);
          return;
        }
      } catch (err) {
      }
    }

    const local = store.getTournament(slug);
    const init = INITIAL_TOURNAMENTS.find((it) => it.slug === slug || it.id === local?.id);
    const cachedBracket = store.getBracketDataFromCache(slug) || (local?.id ? store.getBracketDataFromCache(local.id) : null);

    if (local) {
      if (!local.bracket_data?.groups || local.bracket_data.groups.length === 0) {
        if (cachedBracket?.groups && cachedBracket.groups.length > 0) {
          local.bracket_data = cachedBracket;
        } else if (init?.bracket_data?.groups && init.bracket_data.groups.length > 0) {
          local.bracket_data = init.bracket_data;
        }
      }

      setTournament({ ...local });
      let actualPlayers = await store.fetchParticipantProfiles(local.participants || [], local);
      if (actualPlayers.length === 0 && local.bracket_data?.groups) {
        const groupPlayers = local.bracket_data.groups.flatMap((g) => g.players || []);
        const seen = new Set<string>();
        for (const gp of groupPlayers) {
          if (gp && gp.id && !seen.has(gp.id)) {
            seen.add(gp.id);
            actualPlayers.push(gp);
          }
        }
      }
      local.participants = actualPlayers.map((p) => p.id);
      setParticipants(actualPlayers);
    } else if (init) {
      setTournament({ ...init });
      setParticipants(init.bracket_data?.groups?.flatMap((g) => g.players) || []);
    } else {
      setTournament(null);
    }
    setCurrentUser(store.getCurrentUser());
    setLoading(false);
  }, [slug, store]);

  useEffect(() => {
    loadData(false);
    const unsub = store.subscribe(async () => {
      const local = store.getTournament(slug);
      const init = INITIAL_TOURNAMENTS.find((it) => it.slug === slug || it.id === local?.id);
      const cachedBracket = store.getBracketDataFromCache(slug) || (local?.id ? store.getBracketDataFromCache(local.id) : null);

      if (local) {
        if (!local.bracket_data?.groups || local.bracket_data.groups.length === 0) {
          if (cachedBracket?.groups && cachedBracket.groups.length > 0) {
            local.bracket_data = cachedBracket;
          } else if (init?.bracket_data?.groups && init.bracket_data.groups.length > 0) {
            local.bracket_data = init.bracket_data;
          }
        }

        setTournament({ ...local });
        let actualPlayers = await store.fetchParticipantProfiles(local.participants || [], local);
        if (actualPlayers.length === 0 && local.bracket_data?.groups) {
          const groupPlayers = local.bracket_data.groups.flatMap((g) => g.players || []);
          const seen = new Set<string>();
          for (const gp of groupPlayers) {
            if (gp && gp.id && !seen.has(gp.id)) {
              seen.add(gp.id);
              actualPlayers.push(gp);
            }
          }
        }
        local.participants = actualPlayers.map((p) => p.id);
        setParticipants(actualPlayers);
      }
      setCurrentUser(store.getCurrentUser());
    });

    const supabase = getSupabaseClient();
    let channel: any = null;
    if (supabase) {
      channel = supabase
        .channel(`tournament-live-${slug}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tournaments' },
          () => loadData(true)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches' },
          () => loadData(true)
        )
        .subscribe();
    }

    return () => {
      unsub();
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadData, slug, store]);

  const isAdmin = isTournamentOrganizerOrAdmin(currentUser, tournament);

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-8">
        <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
        <div className="h-48 w-full bg-[#0F1623] border border-white/10 rounded-3xl animate-pulse" />
        <div className="h-96 w-full bg-[#0F1623] border border-white/10 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-display font-black text-white mb-2">Tournament Not Found</h1>
        <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          The requested championship event does not exist or has been archived.
        </p>
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold text-xs transition shadow-lg shadow-blue-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Tournaments</span>
        </Link>
      </div>
    );
  }

  const formatStatus = (status?: string) => {
    if (status === 'ongoing' || status === 'In Progress' || status === 'in_progress') {
      return { label: t('tournaments.status_ongoing', 'Canlı Gedir (Püşkatma / Qruplar)'), color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    }
    if (status === 'completed' || status === 'Completed') {
      return { label: t('tournaments.status_completed', 'Başa çatıb'), color: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30' };
    }
    return { label: t('tournaments.status_upcoming', 'Qeydiyyat Açıqdır'), color: 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30' };
  };

  const formatLabel = (fmt?: string) => {
    if (fmt === 'groups_and_knockout') return `${t('tournaments.group', 'Qrup')} + ${t('tournaments.playoff', 'Pley-off')}`;
    if (fmt === 'round_robin') return t('tournaments.format_round_robin', 'Dairəvi Sistem');
    return t('tournaments.format_single', 'Single Elimination');
  };

  const statusConfig = formatStatus(tournament.status);
  const participantCount = participants.length > 0 ? participants.length : (tournament.max_participants || 8);
  const isGroupStage =
    tournament.format === 'groups_and_knockout' ||
    Boolean(tournament.bracket_data?.groups && tournament.bracket_data.groups.length > 0);
  const hasPlayoffRounds = Boolean(
    tournament.bracket_data?.rounds && tournament.bracket_data.rounds.length > 0
  );
  const isLocked = isTournamentRosterLocked(tournament.status);
  const isRegistered = currentUser ? store.isPlayerRegistered(tournament, currentUser.id) : false;
  const isEligible =
    !tournament.allowed_admission_year ||
    isAdmin ||
    (currentUser?.admission_year === tournament.allowed_admission_year &&
      currentUser?.user_type !== 'teacher' &&
      currentUser?.user_type !== 'staff');

  const handleRegister = async () => {
    if (!currentUser || !tournament) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      await store.registerForTournament(tournament.id, currentUser.id);
      setFeedback(t('tournaments.toast_registered', 'Turnirə uğurla qeydiyyatdan keçdiniz!'));
      await loadData(true);
    } catch (e: any) {
      setFeedback(e.message || t('common.error', 'Xəta baş verdi'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!currentUser || !tournament) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      await store.withdrawFromTournament(tournament.id, currentUser.id);
      setFeedback(t('tournaments.toast_cancelled', 'Qeydiyyatınız ləğv edildi.'));
      await loadData(true);
    } catch (e: any) {
      setFeedback(e.message || t('common.error', 'Xəta baş verdi'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveParticipant = async (pid: string) => {
    if (!tournament) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      await store.withdrawFromTournament(tournament.id, pid);
      setFeedback(t('tournaments.remove_participant', 'İştirakçı turnir siyahısından çıxarıldı.'));
      await loadData(true);
    } catch (e: any) {
      setFeedback(e.message || t('common.error', 'Xəta baş verdi'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddParticipant = async (pid: string) => {
    if (!tournament) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      await store.addTournamentParticipant(tournament.id, pid);
      setFeedback(t('tournaments.auto_sync', 'Tələbə turnir siyahısına əlavə edildi!'));
      await loadData(true);
    } catch (e: any) {
      setFeedback(e.message || t('common.error', 'Xəta baş verdi'));
      throw e;
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => router.push('/tournaments')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('tournaments.back_to_tournaments', 'Turnirlər Siyahısına Qayıt')}</span>
        </button>

        {isAdmin && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold transition shadow-sm active:scale-95"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{t('tournaments.edit_btn', 'Tənzimləmələri Redaktə Et (Təşkilatçı)')}</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30 text-xs font-bold font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t('tournaments.organizer', 'Turnir Təşkilatçısı')}</span>
            </span>
          </div>
        )}
      </div>

      <SmoothReveal delay={0.05}>
        <div className="rounded-3xl border border-white/10 bg-[#0F1623] p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-700/20 text-blue-300 border border-blue-600/30">
                {formatLabel(tournament.format)}
              </span>
              {tournament.format === 'groups_and_knockout' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {tournament.group_size || 4} {t('tournaments.group_size_label', 'nəfərlik qruplar')} • Top {tournament.advance_per_group || 2} {t('tournaments.top_advancing', 'pley-offa')}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-display font-black text-white tracking-tight">
              {tournament.title}
            </h1>

            {tournament.description && (
              <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
                {tournament.description}
              </p>
            )}

            <div className="pt-2 flex items-center gap-6 text-xs text-slate-400 font-mono flex-wrap">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#3B82F6]" />
                <span>
                  {formatTournamentDateAz(tournament.start_date)}
                </span>
              </span>
              {tournament.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>{t('tournaments.location', 'Məkan')}: {tournament.location}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#3B82F6]" />
                <span>{participants.length} {t('tournaments.participants_badge', 'İştirakçı')} ({participants.length} / {tournament.max_participants || 12})</span>
              </span>
            </div>

            {tournament.status === 'completed' && (
              <div className="mt-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-950/90 to-amber-500/5 border border-amber-500/40 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-display font-black uppercase tracking-wider text-amber-300">
                      {t('tournaments.podium_title', 'Rəsmi Turnir Fəxri Kürsüsü (Podium)')}
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
                      tournament.bracket_data?.podium?.first ||
                      (tournament.winner_id ? store.getProfile(tournament.winner_id) : undefined);
                    const name1 = p1?.full_name || 'Yusif Xanlarov';
                    const elo1 = p1?.current_elo ?? 462;
                    return (
                      <Link
                        href={store.getPlayerHref(p1?.id || 'p-f-yusif-xanlarov', name1)}
                        className="flex items-center gap-3.5 p-3.5 rounded-xl bg-amber-500/15 border border-amber-400/50 hover:border-amber-300 transition group"
                      >
                        <div className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 font-display font-black text-xl flex items-center justify-center shrink-0 shadow-md">
                          🥇
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold">
                            1-ci Yer • Çempion
                          </div>
                          <div className="text-sm sm:text-base font-display font-black text-white truncate group-hover:text-amber-300 transition">
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
                      tournament.bracket_data?.podium?.second ||
                      (tournament.runner_up_id ? store.getProfile(tournament.runner_up_id) : undefined);
                    const name2 = p2?.full_name || 'Məharət Kərimli';
                    const elo2 = p2?.current_elo ?? 441;
                    return (
                      <Link
                        href={store.getPlayerHref(p2?.id || 'p-f-meharet-kerimli', name2)}
                        className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-800/70 border border-slate-600/50 hover:border-slate-400 transition group"
                      >
                        <div className="w-11 h-11 rounded-xl bg-slate-300 text-slate-950 font-display font-black text-xl flex items-center justify-center shrink-0 shadow-md">
                          🥈
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-bold">
                            {t('tournaments.second_place', '2-ci Yer • Gümüş')}
                          </div>
                          <div className="text-sm sm:text-base font-display font-black text-white truncate group-hover:text-blue-300 transition">
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
                      tournament.bracket_data?.podium?.third ||
                      (tournament.third_place_id ? store.getProfile(tournament.third_place_id) : undefined);
                    const name3 = p3?.full_name || 'Əhəd Zamanlı';
                    const elo3 = p3?.current_elo ?? 458;
                    return (
                      <Link
                        href={store.getPlayerHref(p3?.id || 'p-f-ehed-zamanli', name3)}
                        className="flex items-center gap-3.5 p-3.5 rounded-xl bg-orange-950/40 border border-orange-500/40 hover:border-orange-400 transition group"
                      >
                        <div className="w-11 h-11 rounded-xl bg-orange-400 text-slate-950 font-display font-black text-xl flex items-center justify-center shrink-0 shadow-md">
                          🥉
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-orange-300 font-bold">
                            {t('tournaments.third_place_podium', '3-cü Yer • Bürünc')}
                          </div>
                          <div className="text-sm sm:text-base font-display font-black text-white truncate group-hover:text-orange-300 transition">
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

            {/* Native 1-Click Registration / Withdraw Bar */}
            <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                {!currentUser ? (
                  <Link
                    href={`/login?redirect=/tournaments/${slug}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-display font-bold text-xs shadow-md transition active:scale-95"
                  >
                    <span>{t('auth.signin_btn', 'Daxil Ol')} →</span>
                  </Link>
                ) : isAdmin ? (
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-display font-bold text-xs">
                      👑 {t('tournaments.organizer', 'Turnir Təşkilatçısı')}
                    </span>
                  </div>
                ) : isRegistered ? (
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500 text-emerald-400 font-display font-bold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t('tournaments.registered', 'Qeydiyyatdan Keçmisiniz')} ✓</span>
                    </span>
                    {!isLocked && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={handleWithdraw}
                        className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 font-semibold text-xs transition"
                      >
                        {actionLoading ? t('common.loading', 'Ləğv edilir...') : t('tournaments.cancel_registration', 'Qeydiyyatı Ləğv Et')}
                      </button>
                    )}
                  </div>
                ) : isLocked ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('tournaments.registration_closed_draft', 'Qeydiyyat Bağlanıb • Püşkatma Mərhələsi (Draft)')}</span>
                  </span>
                ) : !isEligible ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-semibold">
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    <span>{t('tournaments.eligibility_foundation', 'Yalnız 2026 Qəbul Tələbələri')}</span>
                  </span>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleRegister}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-xs shadow-md transition active:scale-95"
                    >
                      <span>{actionLoading ? t('tournaments.registering', 'Qeydiyyat aparılır...') : t('tournaments.register_now_btn', 'Turnirə Qoşul (1-Klik)')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {isAdmin && !isLocked && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={async () => {
                      if (
                        confirm(
                          t('tournaments.confirm_create_playoffs', 'Turnir üçün qeydiyyat rəsmi olaraq bağlansın və Püşkatma (Draft) mərhələsinə keçilsin?')
                        )
                      ) {
                        setActionLoading(true);
                        try {
                          store.closeRegistrationAndLockRoster(tournament.id);
                          setFeedback(t('tournaments.proceed_draft', 'Qeydiyyat bağlandı. Püşkatma mərhələsi başladı!'));
                          await loadData(true);
                        } catch (err: any) {
                          setFeedback(err.message || t('common.error', 'Xəta baş verdi'));
                        } finally {
                          setActionLoading(false);
                        }
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-amber-500/40 hover:bg-amber-500/15 text-amber-300 text-xs font-bold transition shadow-sm"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('tournaments.proceed_draft', 'Qeydiyyatı Bağla və Püşkatmaya Keç (Draft)')}</span>
                  </button>
                )}

                {feedback && (
                  <span className="text-xs font-semibold text-blue-300 animate-pulse">
                    {feedback}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </SmoothReveal>

      {isGroupStage && (
        <SmoothReveal delay={0.08}>
          <div className="rounded-3xl border border-white/10 bg-[#0F1623] p-6 sm:p-8 shadow-2xl space-y-6">
            <TournamentGroupsStage
              tournament={tournament}
              isAdmin={Boolean(isAdmin)}
              onUpdate={() => loadData(true)}
            />
          </div>
        </SmoothReveal>
      )}

      <SmoothReveal delay={0.1}>
        <div className="rounded-3xl border border-white/10 bg-[#0F1623] p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-display font-black text-white">
                  {isGroupStage ? t('tournaments.playoff', 'Pley-off (Olimpiya) Mərhələsi') : t('tournaments.bracket', 'Çempionat Səbəti (Bracket Draw)')}
                </h2>
                <p className="text-xs text-slate-400">
                  {isGroupStage
                    ? t('tournaments.group_stage_desc', 'Qrup mərhələsinin ilk 2 yer sahibləri arasında Olimpiya sistemi üzrə final oyunları')
                    : t('tournaments.playoff_qualification_info', 'Olimpiya sistemi üzrə turnir ağacı və canlı oyun nəticələri')}
                </p>
              </div>
            </div>

            {isAdmin && hasPlayoffRounds && (
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block">
                {t('tournaments.click_to_enter_score', 'Nəticə daxil etmək üçün oyuna klikləyin')}
              </span>
            )}
          </div>

          {hasPlayoffRounds ? (
            <BracketTree tournament={tournament} onUpdate={() => loadData(true)} isAdmin={isAdmin} />
          ) : isGroupStage ? (
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
              <p className="text-sm font-semibold text-white">
                {t('tournaments.playoff_after_groups', 'Pley-off səbəti qrup mərhələsindən sonra formalaşacaq')}
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {t('tournaments.playoff_qualification_info', 'Hər qrupdan ən yaxşı oyunçular pley-off mərhələsinə vəsiqə qazanacaq.')}
              </p>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
              <p className="text-sm font-semibold text-white">
                {t('tournaments.bracket_not_formed', 'Səbət hələ formalaşdırılmayıb')}
              </p>
            </div>
          )}
        </div>
      </SmoothReveal>

      {/* Registered Students Section */}
      <SmoothReveal delay={0.12}>
        <div className="rounded-3xl border border-white/10 bg-[#0F1623] p-6 sm:p-8 shadow-2xl space-y-6">
          <TournamentParticipantsRoster
            tournament={tournament}
            participants={participants}
            currentUser={currentUser}
            isAdmin={isAdmin}
            showAdminControls={isAdmin}
            onRegister={handleRegister}
            onRemoveParticipant={handleRemoveParticipant}
            onAddParticipant={handleAddParticipant}
            actionLoading={actionLoading}
          />
        </div>
      </SmoothReveal>

      {/* Official Tournament Rules */}
      <SmoothReveal delay={0.15}>
        <div className="rounded-3xl border border-white/10 bg-[#0F1623] p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
            <div className="w-8 h-8 rounded-xl bg-blue-700/20 border border-blue-600/40 flex items-center justify-center text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-display font-black text-white">
                {t('tournaments.rules', 'Rəsmi Turnir Reqlamenti & Qaydalar')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('tournaments.rules_ittf_bhos', 'ITTF standartları və BANM Stolüstü Tennis Klubu daxili nizamnaməsi')}
              </p>
            </div>
          </div>

          <TournamentRulesViewer rules={tournament.custom_rules} />
        </div>
      </SmoothReveal>

      {showEditModal && tournament && (
        <EditTournamentModal
          tournament={tournament}
          onClose={() => setShowEditModal(false)}
          onSaved={() => loadData(true)}
        />
      )}
    </div>
  );
}

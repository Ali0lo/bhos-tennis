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

export default function TournamentDetailPage() {
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
          setTournament(data as Tournament);
          if (data.participants && Array.isArray(data.participants)) {
            const parts = await store.fetchParticipantProfiles(data.participants);
            setParticipants(parts);
          } else {
            setParticipants([]);
          }
          setLoading(false);
          return;
        }
      } catch (err) {
      }
    }

    const local = store.getTournament(slug);
    if (local) {
      setTournament({ ...local });
      if (local.participants && Array.isArray(local.participants)) {
        const parts = await store.fetchParticipantProfiles(local.participants);
        setParticipants(parts);
      } else {
        setParticipants([]);
      }
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
      if (local) {
        setTournament({ ...local });
        if (local.participants && Array.isArray(local.participants)) {
          const parts = await store.fetchParticipantProfiles(local.participants);
          setParticipants(parts);
        } else {
          setParticipants([]);
        }
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
      return { label: 'Davam edir', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    }
    if (status === 'completed' || status === 'Completed') {
      return { label: 'Başa çatıb', color: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30' };
    }
    return { label: 'Gözləyir', color: 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30' };
  };

  const formatLabel = (fmt?: string) => {
    if (fmt === 'groups_and_knockout') return 'Qrup Mərhələsi + Pley-off';
    if (fmt === 'round_robin') return 'Dairəvi Sistem (Round Robin)';
    return 'Single Elimination';
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
      setFeedback('Turnirə uğurla qeydiyyatdan keçdiniz!');
      await loadData(true);
    } catch (e: any) {
      setFeedback(e.message || 'Xəta baş verdi');
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
      setFeedback('Qeydiyyatınız ləğv edildi.');
      await loadData(true);
    } catch (e: any) {
      setFeedback(e.message || 'Xəta baş verdi');
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
      setFeedback('İştirakçı turnir siyahısından çıxarıldı.');
      await loadData(true);
    } catch (e: any) {
      setFeedback(e.message || 'Xəta baş verdi');
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
          <span>Turnirlər Siyahısına Qayıt</span>
        </button>

        {isAdmin && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold transition shadow-sm active:scale-95"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Tənzimləmələri Redaktə Et (Təşkilatçı)</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30 text-xs font-bold font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Turnir Təşkilatçısı</span>
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
                  {tournament.group_size || 4} nəfərlik qruplar • Top {tournament.advance_per_group || 2} pley-offa
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
                  <span>Məkan: {tournament.location}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#3B82F6]" />
                <span>İştirakçılar: {participants.length} / {tournament.max_participants || 16} Oyunçu</span>
              </span>
            </div>

            {/* Native 1-Click Registration / Withdraw Bar */}
            <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                {!currentUser ? (
                  <Link
                    href={`/login?redirect=/tournaments/${slug}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-display font-bold text-xs shadow-md transition active:scale-95"
                  >
                    <span>Daxil Ol və Turnirə Qoşul →</span>
                  </Link>
                ) : isRegistered ? (
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500 text-emerald-400 font-display font-bold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Qeydiyyatdan Keçmisiniz ✓</span>
                    </span>
                    {!isLocked && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={handleWithdraw}
                        className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 font-semibold text-xs transition"
                      >
                        {actionLoading ? 'Ləğv edilir...' : 'Qeydiyyatı Ləğv Et'}
                      </button>
                    )}
                  </div>
                ) : isLocked ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-semibold">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Turnir Aktivdir • Qeydiyyat Bağlanıb</span>
                  </span>
                ) : !isEligible ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-semibold">
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    <span>Yalnız {tournament.allowed_admission_year} Qəbul Tələbələri</span>
                  </span>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleRegister}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-xs shadow-md transition active:scale-95"
                    >
                      <span>{actionLoading ? 'Qeydiyyat aparılır...' : 'Turnirə Qoşul (1-Klik)'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                        👑 Təşkilatçı kimi iştirak
                      </span>
                    )}
                  </div>
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
                  {isGroupStage ? 'Pley-off (Olimpiya) Mərhələsi' : 'Çempionat Səbəti (Bracket Draw)'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isGroupStage
                    ? 'Qrup mərhələsinin ilk 2 yer sahibləri arasında Olimpiya sistemi üzrə final oyunları'
                    : 'Olimpiya sistemi üzrə turnir ağacı və canlı oyun nəticələri'}
                </p>
              </div>
            </div>

            {isAdmin && hasPlayoffRounds && (
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block">
                Nəticə daxil etmək üçün oyuna klikləyin
              </span>
            )}
          </div>

          {hasPlayoffRounds ? (
            <BracketTree tournament={tournament} onUpdate={() => loadData(true)} isAdmin={isAdmin} />
          ) : isGroupStage ? (
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
              <p className="text-sm font-semibold text-white">
                Pley-off səbəti qrup mərhələsindən sonra formalaşacaq
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Hər qrupdan ən yaxşı {tournament.advance_per_group || 2} oyunçu qrup oyunları tamamlandıqdan sonra avtomatik pley-off mərhələsinə keçəcək.
              </p>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
              <p className="text-sm font-semibold text-white">
                Səbət hələ formalaşdırılmayıb
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
                Rəsmi Turnir Reqlamenti & Qaydalar
              </h2>
              <p className="text-xs text-slate-400">
                ITTF standartları və BANM Stolüstü Tennis Klubu daxili nizamnaməsi
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

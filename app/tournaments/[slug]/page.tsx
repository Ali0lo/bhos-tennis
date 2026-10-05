'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '../../../lib/supabase/client';
import { BHOSDataStore } from '../../../lib/data/store';
import { Tournament, PlayerProfile } from '../../../lib/data/types';
import SmoothReveal from '../../../components/SmoothReveal';
import BracketTree from '../../../components/BracketTree';
import { 
  Trophy, 
  ArrowLeft, 
  Calendar, 
  Users, 
  FileText, 
  Award, 
  ShieldCheck,
  Loader2
} from 'lucide-react';

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

  const loadData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);

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
            const parts = data.participants
              .map((pid: string) => store.getProfile(pid))
              .filter((p: any): p is PlayerProfile => Boolean(p));
            setParticipants(parts);
          }
          setLoading(false);
          return;
        }
      } catch (err) {
      }
    }

    const local = store.getTournament(slug);
    if (local) {
      setTournament(local);
      if (local.participants) {
        const parts = local.participants
          .map((pid) => store.getProfile(pid))
          .filter((p): p is PlayerProfile => Boolean(p));
        setParticipants(parts);
      }
    } else {
      setTournament(null);
    }
    setCurrentUser(store.getCurrentUser());
    setLoading(false);
  }, [slug, store]);

  useEffect(() => {
    loadData();
    const unsub = store.subscribe(() => {
      const local = store.getTournament(slug);
      if (local) {
        setTournament(local);
        if (local.participants) {
          const parts = local.participants
            .map((pid) => store.getProfile(pid))
            .filter((p): p is PlayerProfile => Boolean(p));
          setParticipants(parts);
        }
      }
      setCurrentUser(store.getCurrentUser());
    });
    return unsub;
  }, [loadData, slug, store]);

  const isAdmin = currentUser?.role === 'president' || currentUser?.role === 'coach';

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
      return { label: 'In Progress', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    }
    if (status === 'completed' || status === 'Completed') {
      return { label: 'Completed', color: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30' };
    }
    return { label: 'Upcoming', color: 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30' };
  };

  const statusConfig = formatStatus(tournament.status);
  const participantCount = participants.length > 0 ? participants.length : (tournament.max_participants || 8);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/tournaments')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tournaments</span>
        </button>

        {isAdmin && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30 text-xs font-bold font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Bracket Controls Active</span>
          </span>
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
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-slate-300 border border-white/10">
                Single Elimination
              </span>
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
                <span>Starts: {new Date(tournament.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#3B82F6]" />
                <span>Field: {participantCount} Players</span>
              </span>
            </div>
          </div>
        </div>
      </SmoothReveal>

      <SmoothReveal delay={0.1}>
        <div className="rounded-3xl border border-white/10 bg-[#0F1623] p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-display font-black text-white">
                  Championship Bracket Draw
                </h2>
                <p className="text-xs text-slate-400">
                  Visual single-elimination tournament tree with live match results and winner progression
                </p>
              </div>
            </div>

            {isAdmin && (
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block">
                Click any match to log game sets
              </span>
            )}
          </div>

          <BracketTree tournament={tournament} onUpdate={loadData} isAdmin={isAdmin} />
        </div>
      </SmoothReveal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SmoothReveal delay={0.15}>
            <div className="rounded-2xl border border-white/10 bg-[#0F1623] p-6 shadow-xl space-y-4 h-full">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#3B82F6]" />
                <h3 className="text-base font-display font-bold text-white">
                  Official Tournament Rules
                </h3>
              </div>
              <div className="p-4 rounded-xl bg-[#131C2B] border border-white/5 text-xs text-slate-300 leading-relaxed whitespace-pre-line font-mono">
                {tournament.custom_rules || 'Standard ITTF and BHOS Table Tennis club tournament regulations apply.'}
              </div>
            </div>
          </SmoothReveal>
        </div>

        <div className="lg:col-span-1">
          <SmoothReveal delay={0.2}>
            <div className="rounded-2xl border border-white/10 bg-[#0F1623] p-6 shadow-xl space-y-4 h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#3B82F6]" />
                  <h3 className="text-base font-display font-bold text-white">
                    Seed Roster
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {participants.length} Seeding Slots
                </span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {participants.length === 0 ? (
                  <div className="p-4 text-center rounded-xl bg-[#131C2B] text-xs text-slate-500">
                    Seeding pending confirmation
                  </div>
                ) : (
                  participants.map((player, idx) => (
                    <div
                      key={player.id}
                      className="p-2.5 rounded-xl bg-[#131C2B] border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-5 h-5 rounded-full bg-white/5 text-slate-400 flex items-center justify-center text-[10px] font-mono shrink-0">
                          #{idx + 1}
                        </span>
                        <Link
                          href={`/players/${player.id}`}
                          className="font-bold text-white hover:text-[#3B82F6] transition truncate"
                        >
                          {player.full_name}
                        </Link>
                      </div>
                      <span className="font-mono text-[#3B82F6] font-bold text-[11px] shrink-0">
                        {player.current_elo} ELO
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </SmoothReveal>
        </div>
      </div>
    </div>
  );
}

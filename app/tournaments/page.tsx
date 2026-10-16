'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SmoothReveal from '../../components/SmoothReveal';
import { getSupabaseClient } from '../../lib/supabase/client';
import { BHOSDataStore } from '../../lib/data/store';
import { PlayerProfile } from '../../lib/data/types';
import {
  Trophy,
  CalendarClock,
  ArrowLeft,
  UserPlus,
  CheckCircle2,
  Users,
  Loader2,
} from 'lucide-react';

const TOURNAMENT_SLUG = 'bhos-spring-championship-2026';
const LOCAL_STORAGE_KEY = 'bhos_tt_tournament_regs_v1';

function getLocalRegs(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalRegs(playerIds: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(playerIds));
  } catch {
  }
}

export default function TournamentsPage() {
  const router = useRouter();
  const store = BHOSDataStore.getInstance();

  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(store.getCurrentUser());
  const [registeredPlayerIds, setRegisteredPlayerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toggling, setToggling] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadRegistrations = useCallback(async () => {
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
          if (profile) {
            setCurrentUser(profile as PlayerProfile);
          }
        }

        const { data, error } = await supabase
          .from('tournament_registrations')
          .select('player_id')
          .eq('tournament_slug', TOURNAMENT_SLUG);

        if (!error && data) {
          const ids = data.map((row: { player_id: string }) => row.player_id);
          setRegisteredPlayerIds(ids);
          setLocalRegs(ids);
          setLoading(false);
          return;
        }
      } catch {
      }
    }

    setCurrentUser(store.getCurrentUser());
    setRegisteredPlayerIds(getLocalRegs());
    setLoading(false);
  }, [store]);

  useEffect(() => {
    loadRegistrations();

    const unsubStore = store.subscribe(() => {
      setCurrentUser(store.getCurrentUser());
    });

    const supabase = getSupabaseClient();
    let channel: any = null;

    if (supabase) {
      channel = supabase
        .channel('tournament-registrations-live')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tournament_registrations',
          },
          () => {
            loadRegistrations();
          }
        )
        .subscribe();
    }

    return () => {
      unsubStore();
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadRegistrations, store]);

  const isRegistered = Boolean(
    currentUser && registeredPlayerIds.includes(currentUser.id)
  );

  const handleToggleRegistration = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    setToggling(true);
    setStatusMessage(null);

    const supabase = getSupabaseClient();

    if (isRegistered) {
      const updatedLocal = registeredPlayerIds.filter((id) => id !== currentUser.id);
      setRegisteredPlayerIds(updatedLocal);
      setLocalRegs(updatedLocal);

      if (supabase) {
        try {
          await supabase
            .from('tournament_registrations')
            .delete()
            .eq('tournament_slug', TOURNAMENT_SLUG)
            .eq('player_id', currentUser.id);
        } catch {
        }
      }
      setStatusMessage('Turnir qeydiyyatınız ləğv edildi.');
    } else {
      const updatedLocal = Array.from(new Set([...registeredPlayerIds, currentUser.id]));
      setRegisteredPlayerIds(updatedLocal);
      setLocalRegs(updatedLocal);

      if (supabase) {
        try {
          await supabase.from('tournament_registrations').upsert(
            {
              player_id: currentUser.id,
              tournament_slug: TOURNAMENT_SLUG,
            },
            { onConflict: 'tournament_slug,player_id' }
          );
        } catch {
        }
      }
      setStatusMessage('Turnirə ilkin qeydiyyatınız uğurla tamamlandı!');
    }

    setToggling(false);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 pt-20 pb-16">
      <SmoothReveal delay={0.05} scale>
        <div className="relative w-full max-w-2xl mx-auto rounded-3xl bg-[#0F1623]/90 backdrop-blur-xl border border-white/10 p-8 sm:p-12 shadow-2xl shadow-black/60 overflow-hidden text-center">
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[#3B82F6]/20 blur-3xl" />

          <div className="relative flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-[#131C2B] border border-[#3B82F6]/30 flex items-center justify-center shadow-lg shadow-blue-500/10">
              <Trophy className="w-8 h-8 text-amber-400" />
            </div>

            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#3B82F6] text-[11px] font-bold uppercase tracking-widest">
              <CalendarClock className="w-3.5 h-3.5" />
              Turnirlər • Fevral – Mart
            </span>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
              Coming Soon
            </h1>

            <div className="w-full rounded-2xl bg-[#131C2B] border border-white/5 p-6 space-y-5">
              <p className="text-sm sm:text-base leading-relaxed text-slate-300">
                Universitet çempionatı ikinci semestrdə (Fevral - Mart aylarında) keçiriləcək. Dəqiq tarixlər tezliklə elan olunacaq.
              </p>

              <div className="flex flex-col items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleToggleRegistration}
                  disabled={toggling || loading}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-lg disabled:opacity-60 ${
                    isRegistered
                      ? 'bg-emerald-500/20 hover:bg-rose-500/20 border border-emerald-500/40 hover:border-rose-500/40 text-emerald-300 hover:text-rose-300 shadow-emerald-500/10'
                      : 'bg-[#3B82F6] hover:bg-blue-600 text-white shadow-blue-500/25'
                  }`}
                >
                  {toggling ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isRegistered ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>
                    {isRegistered
                      ? 'Qeydiyyatdan Keçmisiniz (Ləğv et)'
                      : 'Turnirə Qeydiyyatdan Keç'}
                  </span>
                </button>

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0F1623] border border-white/10 text-xs font-semibold text-cyan-400">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    Qeydiyyatdan keçən iştirakçılar: {registeredPlayerIds.length} nəfər
                  </span>
                </div>

                {statusMessage && (
                  <p className="text-xs font-medium text-emerald-400">
                    {statusMessage}
                  </p>
                )}
              </div>
            </div>

            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#131C2B] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Reytinq Cədvəlinə Qayıt</span>
            </Link>
          </div>
        </div>
      </SmoothReveal>
    </div>
  );
}

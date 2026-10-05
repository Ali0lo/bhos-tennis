'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '../../lib/supabase/client';
import { BHOSDataStore } from '../../lib/data/store';
import { Tournament, PlayerProfile } from '../../lib/data/types';
import SmoothReveal from '../../components/SmoothReveal';
import { 
  Trophy, 
  Plus, 
  Calendar, 
  Users, 
  ArrowRight, 
  X, 
  Loader2 
} from 'lucide-react';

export default function TournamentsPage() {
  const store = BHOSDataStore.getInstance();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(store.getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
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
          .order('start_date', { ascending: false });

        if (!error && data && data.length > 0) {
          setTournaments(data as Tournament[]);
          setLoading(false);
          return;
        }
      } catch (err) {
      }
    }

    setTournaments(store.getTournaments());
    setCurrentUser(store.getCurrentUser());
    setLoading(false);
  }, [store]);

  useEffect(() => {
    loadData();
    const unsub = store.subscribe(() => {
      setTournaments(store.getTournaments());
      setCurrentUser(store.getCurrentUser());
    });
    return unsub;
  }, [loadData, store]);

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Please enter a tournament title');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const allPlayers = store.getProfiles();
      const initialParticipantIds = allPlayers.slice(0, 8).map((p) => p.id);

      const created = store.createTournament({
        title,
        description,
        custom_rules: '1. Single Elimination format.\n2. Best of 5 sets.\n3. Official ITTF service and rubber regulations apply.',
        format: 'single_elimination',
        max_participants: 8,
        start_date: startDate,
        created_by: currentUser?.id || 'admin',
        participant_ids: initialParticipantIds,
      });

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('tournaments').upsert([created]);
      }

      setCreateModalOpen(false);
      setTitle('');
      setDescription('');
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create tournament');
    } finally {
      setSubmitting(false);
    }
  };

  const isAdmin = currentUser?.role === 'president' || currentUser?.role === 'coach';

  const formatStatus = (status?: string) => {
    if (status === 'ongoing' || status === 'In Progress' || status === 'in_progress') {
      return { label: 'In Progress', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    }
    if (status === 'completed' || status === 'Completed') {
      return { label: 'Completed', color: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30' };
    }
    return { label: 'Upcoming', color: 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30' };
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      <SmoothReveal delay={0.05}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-md">
                <Trophy className="w-5 h-5" />
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-black text-white">
                Tournament Hub
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Official BHOS Table Tennis Club tournaments, knockout draws, and championship brackets
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-display font-bold text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Tournament</span>
            </button>
          )}
        </div>
      </SmoothReveal>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-[#0F1623] border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <SmoothReveal delay={0.1}>
          <div className="p-12 rounded-2xl bg-[#0F1623] border border-white/10 text-center space-y-3">
            <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No Tournaments Scheduled</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Check back soon for upcoming inter-faculty and club championships.
            </p>
          </div>
        </SmoothReveal>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t, idx) => {
            const statusConfig = formatStatus(t.status);
            const participantCount = t.participants ? t.participants.length : (t.max_participants || 8);

            return (
              <SmoothReveal key={t.id} delay={0.08 * (idx + 1)}>
                <Link
                  href={`/tournaments/${t.slug}`}
                  className="group block rounded-2xl bg-[#0F1623] border border-white/10 p-6 shadow-xl hover:border-[#3B82F6]/50 hover:shadow-[0_0_25px_rgba(59,130,246,0.15)] transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-full"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#3B82F6]" />
                        <span>{participantCount} Players</span>
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-display font-bold text-white group-hover:text-[#3B82F6] transition-colors leading-snug">
                        {t.title}
                      </h3>
                      {t.description && (
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                          {t.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(t.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 text-[#3B82F6] font-bold group-hover:translate-x-1 transition-transform">
                      <span>View Bracket</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              </SmoothReveal>
            );
          })}
        </div>
      )}

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0F1623] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="font-display font-bold text-white text-base">
                  Create New Tournament
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTournament} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">
                  Tournament Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. BHOS Winter Invitational 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#131C2B] border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details, prize, eligible faculties..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#131C2B] border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#131C2B] border border-white/10 text-white focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-bold transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Generate Tournament & Bracket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';
import { BHOSDataStore } from '../lib/data/store';
import { PlayerProfile } from '../lib/data/types';
import { 
  UserCheck, 
  ShieldAlert, 
  CheckCircle2, 
  Loader2, 
  Calendar, 
  GraduationCap, 
  Gauge, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface PendingVerificationQueueProps {
  onVerificationComplete?: () => void;
}

export default function PendingVerificationQueue({ onVerificationComplete }: PendingVerificationQueueProps) {
  const store = BHOSDataStore.getInstance();
  const [pendingPlayers, setPendingPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [assignedElos, setAssignedElos] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Helper to suggest starting ELO based on playing level
  const getDefaultEloForLevel = (level?: string): number => {
    switch (level) {
      case 'Advanced':
        return 1000;
      case 'Intermediate':
        return 500;
      case 'Beginner':
      default:
        return 0;
    }
  };

  const fetchPendingPlayers = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('is_verified', false)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const players = data as PlayerProfile[];
          setPendingPlayers(players);

          // Initialize default ELO inputs for new items
          const initialMap: Record<string, number> = {};
          players.forEach((p) => {
            initialMap[p.id] = getDefaultEloForLevel(p.playing_level);
          });
          setAssignedElos((prev) => ({ ...initialMap, ...prev }));
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('[PendingQueue] Supabase fetch error:', err);
      }
    }

    // Local store fallback
    const localPending = store.getUnverifiedProfiles();
    setPendingPlayers(localPending);
    const initialMap: Record<string, number> = {};
    localPending.forEach((p) => {
      initialMap[p.id] = getDefaultEloForLevel(p.playing_level);
    });
    setAssignedElos((prev) => ({ ...initialMap, ...prev }));
    setLoading(false);
  };

  useEffect(() => {
    fetchPendingPlayers();
  }, []);

  const handleEloChange = (id: string, value: number) => {
    setAssignedElos((prev) => ({
      ...prev,
      [id]: isNaN(value) ? 0 : value,
    }));
  };

  const handleApprove = async (player: PlayerProfile) => {
    setApprovingId(player.id);
    setFeedback(null);

    const initialElo = assignedElos[player.id] !== undefined 
      ? assignedElos[player.id] 
      : getDefaultEloForLevel(player.playing_level);

    try {
      // 1. Mutate Supabase
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await supabase
          .from('profiles')
          .update({
            is_verified: true,
            current_elo: initialElo,
          })
          .eq('id', player.id);

        if (error) throw error;
      }

      // 2. Update local store
      await store.verifyPlayer(player.id, initialElo);

      // 3. Remove from local pending queue
      setPendingPlayers((prev) => prev.filter((p) => p.id !== player.id));
      setFeedback({
        type: 'success',
        message: `Approved ${player.full_name} with ${initialElo} starting ELO. Profile is now unlocked on the leaderboard!`,
      });

      // 4. Trigger parent callback
      onVerificationComplete?.();
    } catch (err: any) {
      console.error('[PendingQueue] Approve error:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to verify player in database.',
      });
    } finally {
      setApprovingId(null);
    }
  };

  const getLevelBadge = (level?: string) => {
    switch (level) {
      case 'Advanced':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'Intermediate':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Beginner':
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0F1623] p-6 shadow-2xl space-y-4 relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute -top-20 -right-20 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-display font-bold text-white tracking-tight">
                Pending Verifications Queue
              </h3>
              <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase ${
                pendingPlayers.length > 0 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {pendingPlayers.length} Pending
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Review new athlete registrations, calibrate starting ELO ratings, and activate leaderboard profiles.
            </p>
          </div>
        </div>

        <button
          onClick={fetchPendingPlayers}
          disabled={loading}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 self-start sm:self-auto py-1 px-2 rounded-lg bg-white/5 border border-white/10"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>Refresh Queue</span>}
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Queue Body */}
      {loading ? (
        <div className="py-8 flex items-center justify-center gap-2 text-slate-400 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-[#3B82F6]" />
          <span>Loading verification queue...</span>
        </div>
      ) : pendingPlayers.length === 0 ? (
        <div className="py-8 text-center space-y-2 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
          <p className="text-xs font-semibold text-white">No Pending Registrations</p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            All registered BHOS athletes have been approved and calibrated. New student registrations will appear here for verification.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingPlayers.map((player) => (
            <div
              key={player.id}
              className="p-4 rounded-xl border border-white/[0.08] bg-[#131C2B]/80 hover:bg-[#131C2B] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              {/* Player Info */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-white">{player.full_name}</span>
                  <span className="text-xs font-mono text-cyan-400">({player.email})</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold ${getLevelBadge(player.playing_level)}`}>
                    {player.playing_level || 'Beginner'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                    <span>{player.major_faculty}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Class of {player.admission_year}</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Registered: {new Date(player.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Initial ELO & Approve Action */}
              <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-300 font-semibold whitespace-nowrap">
                    Initial ELO:
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={3000}
                    value={assignedElos[player.id] !== undefined ? assignedElos[player.id] : 0}
                    onChange={(e) => handleEloChange(player.id, parseInt(e.target.value, 10))}
                    disabled={approvingId === player.id}
                    className="w-24 px-3 py-1.5 rounded-lg bg-[#080D16] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#3B82F6] transition disabled:opacity-50"
                  />
                </div>

                <button
                  onClick={() => handleApprove(player)}
                  disabled={approvingId === player.id}
                  className="px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/25 active:scale-95 transition"
                >
                  {approvingId === player.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Verify & Approve</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BHOSDataStore } from '../../lib/data/store';
import { PlayerProfile, UserRole } from '../../lib/data/types';
import { useTranslation } from '../../lib/i18n';
import { getSupabaseClient } from '../../lib/supabase/client';
import { 
  ShieldCheck, 
  Users, 
  Zap, 
  Activity, 
  Trophy, 
  Check, 
  AlertCircle, 
  RotateCcw, 
  Edit3, 
  UserCheck, 
  Sliders,
  Clock,
  CheckCircle2
} from 'lucide-react';

export default function AdminPage() {
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(store.getCurrentUser());
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [unverifiedProfiles, setUnverifiedProfiles] = useState<PlayerProfile[]>([]);
  const [matches, setMatches] = useState(store.getMatches());
  const [tournaments, setTournaments] = useState(store.getTournaments());

  const [targetPlayerId, setTargetPlayerId] = useState<string>('');
  const [newEloInput, setNewEloInput] = useState<string>('');
  const [overrideNote, setOverrideNote] = useState<string>('');
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null);

  const [pendingEloInputs, setPendingEloInputs] = useState<Record<string, string>>({});
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);

  const getRecommendedElo = (level?: string): number => {
    switch (level) {
      case 'Beginner':
        return 1000;
      case 'Intermediate':
        return 1300;
      case 'Advanced':
        return 1600;
      default:
        return 1200;
    }
  };

  const loadData = async () => {
    setCurrentUser(store.getCurrentUser());
    setProfiles(store.getProfiles());
    setMatches(store.getMatches());
    setTournaments(store.getTournaments());

    const localUnverified = store.getUnverifiedProfiles();
    setUnverifiedProfiles(localUnverified);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('is_verified', false)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setUnverifiedProfiles(data as PlayerProfile[]);
        }
      } catch (err) {
        console.warn('Pending verification query note:', err);
      }
    }
  };

  useEffect(() => {
    loadData();
    const unsub = store.subscribe(loadData);
    return unsub;
  }, [store]);

  const isPresident = currentUser?.role === 'president' || currentUser?.role === 'coach';

  const handleRoleChange = (playerId: string, newRole: UserRole) => {
    try {
      store.updateUserRole(playerId, newRole);
    } catch (err: any) {
      alert(err.message || 'Failed to update user role');
    }
  };

  const handleApplyEloOverride = (e: React.FormEvent) => {
    e.preventDefault();
    setOverrideSuccess(null);

    const val = parseInt(newEloInput, 10);
    if (isNaN(val) || val < 100 || val > 3000) {
      alert('Please provide a valid ELO rating between 100 and 3000');
      return;
    }

    try {
      const updated = store.overrideElo(targetPlayerId, val, overrideNote);
      setOverrideSuccess(`Successfully updated ${updated.full_name}'s ELO to ${val}.`);
      setNewEloInput('');
      setOverrideNote('');
    } catch (err: any) {
      alert(err.message || 'Failed to update ELO');
    }
  };

  const handleVerifyPlayer = async (player: PlayerProfile) => {
    const customElo = pendingEloInputs[player.id];
    const eloVal = parseInt(customElo || String(getRecommendedElo(player.playing_level)), 10);

    if (isNaN(eloVal) || eloVal < 100 || eloVal > 3000) {
      alert('Please provide a valid starting ELO between 100 and 3000');
      return;
    }

    setVerifyingId(player.id);
    setVerificationSuccess(null);

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase
          .from('profiles')
          .update({
            is_verified: true,
            current_elo: eloVal,
          })
          .eq('id', player.id);
      }

      await store.verifyPlayer(player.id, eloVal);
      setVerificationSuccess(`Successfully verified ${player.full_name} with initial rating of ${eloVal} ELO.`);
      setUnverifiedProfiles((prev) => prev.filter((p) => p.id !== player.id));
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to verify member.');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleResetData = () => {
    if (confirm('Reset all club data to default sample fixtures?')) {
      store.resetToDefault();
    }
  };

  if (!isPresident) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">President Access Only</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          The Club Management Panel requires President privileges. You are currently browsing as <strong>{currentUser ? `${currentUser.full_name} (${currentUser.role})` : 'Guest'}</strong>.
        </p>
        <button
          onClick={() => store.setCurrentUser('p-1')}
          className="px-4 py-2 rounded-xl bg-bhos-cyan text-bhos-navy font-bold text-xs hover:opacity-95 shadow-lg shadow-cyan-500/20"
        >
          Switch to President (Ali Iskandarli)
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shadow-md overflow-hidden shrink-0">
            <img src="/images/bhos-logo.png" alt="BHOS Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <h1 className="text-2xl md:text-3xl font-display font-black text-white">
                {t('admin.title')}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t('admin.subtitle')}
            </p>
          </div>
        </div>

        <button
          onClick={handleResetData}
          className="px-3.5 py-2 rounded-xl border border-slate-700 bg-bhos-darkCard hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Sample Fixtures</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-bhos-border bg-bhos-midnight/90 space-y-1 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            {t('admin.total_players')}
          </span>
          <div className="text-2xl md:text-3xl font-mono font-bold text-white">
            {profiles.length}
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-bhos-border bg-bhos-midnight/90 space-y-1 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            {t('admin.total_matches')}
          </span>
          <div className="text-2xl md:text-3xl font-mono font-bold text-bhos-cyan">
            {matches.length}
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-bhos-border bg-bhos-midnight/90 space-y-1 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            {t('admin.active_tournaments')}
          </span>
          <div className="text-2xl md:text-3xl font-mono font-bold text-amber-400">
            {tournaments.length}
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-bhos-border bg-bhos-midnight/90 space-y-1 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            Pending Verifications
          </span>
          <div className={`text-2xl md:text-3xl font-mono font-bold ${unverifiedProfiles.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {unverifiedProfiles.length}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-bhos-border bg-bhos-midnight/90 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-bhos-border">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-display font-bold text-white">
              Pending Verifications
            </h3>
          </div>
          {unverifiedProfiles.length > 0 ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
              {unverifiedProfiles.length} Pending
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Queue Clear
            </span>
          )}
        </div>

        {verificationSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{verificationSuccess}</span>
          </div>
        )}

        {unverifiedProfiles.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <Check className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-white">All member registrations are verified</p>
            <p className="text-[11px] text-slate-400">New player registrations through the portal will appear here for initial rating calibration.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {unverifiedProfiles.map((p) => {
              const recElo = getRecommendedElo(p.playing_level);
              const currentVal = pendingEloInputs[p.id] ?? String(recElo);
              const isVerifying = verifyingId === p.id;

              return (
                <div key={p.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{p.full_name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {p.playing_level || 'Beginner'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>{p.email}</span>
                      <span>•</span>
                      <span>{p.major_faculty}</span>
                      <span>•</span>
                      <span>Admission Year: {p.admission_year}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        Starting ELO (Rec: {recElo})
                      </span>
                      <input
                        type="number"
                        min={100}
                        max={3000}
                        value={currentVal}
                        onChange={(e) =>
                          setPendingEloInputs((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                        className="w-28 px-3 py-1.5 rounded-lg bg-bhos-darkCard border border-bhos-border text-white text-xs font-mono font-bold focus:outline-none focus:border-bhos-cyan"
                      />
                    </div>

                    <button
                      onClick={() => handleVerifyPlayer(p)}
                      disabled={isVerifying}
                      className="mt-4 md:mt-4 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
                    >
                      {isVerifying ? 'Verifying...' : 'Verify & Activate'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-bhos-border bg-bhos-midnight/90 p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-bhos-border">
          <Sliders className="w-5 h-5 text-bhos-cyan" />
          <h3 className="text-base font-display font-bold text-white">
            {t('admin.elo_override')}
          </h3>
        </div>

        {overrideSuccess && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{overrideSuccess}</span>
          </div>
        )}

        <form onSubmit={handleApplyEloOverride} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Select Player
            </label>
            <select
              value={targetPlayerId}
              onChange={(e) => {
                setTargetPlayerId(e.target.value);
                const p = profiles.find((prof) => prof.id === e.target.value);
                if (p) setNewEloInput(String(p.current_elo));
              }}
              required
              className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white focus:outline-none focus:border-bhos-cyan"
            >
              <option value="">Choose player...</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.current_elo} ELO - {p.major_faculty})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              {t('admin.new_elo')}
            </label>
            <input
              type="number"
              value={newEloInput}
              onChange={(e) => setNewEloInput(e.target.value)}
              placeholder="e.g. 1550"
              required
              min={100}
              max={3000}
              className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white font-mono focus:outline-none focus:border-bhos-cyan"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              {t('admin.override_reason')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
                placeholder="e.g. National cup calibration"
                className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white focus:outline-none focus:border-bhos-cyan"
              />
              <button
                type="submit"
                disabled={!targetPlayerId || !newEloInput}
                className="px-4 py-2 rounded-lg bg-bhos-cyan text-bhos-navy font-bold hover:opacity-95 disabled:opacity-50 transition shrink-0"
              >
                {t('admin.apply_override')}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-bhos-border bg-bhos-midnight/90 overflow-hidden shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-bhos-border">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-bhos-cyan" />
            <h3 className="text-base font-display font-bold text-white">
              {t('admin.user_management')}
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {profiles.length} Active Members
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-bhos-border bg-bhos-darkCard text-[11px] font-semibold text-slate-400 uppercase">
              <tr>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Faculty & Year</th>
                <th className="py-3 px-4">Current Role</th>
                <th className="py-3 px-4 text-center">ELO</th>
                <th className="py-3 px-4 text-center">Record</th>
                <th className="py-3 px-4 text-right">Assign Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {profiles.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-semibold text-white">
                    <Link href={`/players/${p.id}`} className="hover:text-bhos-cyan">
                      {p.full_name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {p.major_faculty} ({p.admission_year})
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.role === 'president'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : p.role === 'coach'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {p.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-bhos-cyan">
                    {p.current_elo}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-400">
                    {p.wins}W - {p.losses}L
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1 bg-bhos-darkCard p-0.5 rounded-lg border border-slate-700">
                      <button
                        onClick={() => handleRoleChange(p.id, 'player')}
                        className={`px-2 py-1 rounded text-[10px] transition ${
                          p.role === 'player'
                            ? 'bg-cyan-500 text-bhos-navy font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Player
                      </button>
                      <button
                        onClick={() => handleRoleChange(p.id, 'coach')}
                        className={`px-2 py-1 rounded text-[10px] transition ${
                          p.role === 'coach'
                            ? 'bg-emerald-500 text-bhos-navy font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Coach
                      </button>
                      <button
                        onClick={() => handleRoleChange(p.id, 'president')}
                        className={`px-2 py-1 rounded text-[10px] transition ${
                          p.role === 'president'
                            ? 'bg-amber-500 text-bhos-navy font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        President
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

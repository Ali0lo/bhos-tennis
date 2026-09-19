'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BHOSDataStore } from '../../lib/data/store';
import { PlayerProfile, UserRole } from '../../lib/data/types';
import { useTranslation } from '../../lib/i18n';
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
  Sliders 
} from 'lucide-react';

export default function AdminPage() {
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const [currentUser, setCurrentUser] = useState<PlayerProfile>(store.getCurrentUser());
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [matches, setMatches] = useState(store.getMatches());
  const [tournaments, setTournaments] = useState(store.getTournaments());

  // ELO Override Form
  const [targetPlayerId, setTargetPlayerId] = useState<string>('');
  const [newEloInput, setNewEloInput] = useState<string>('');
  const [overrideNote, setOverrideNote] = useState<string>('');
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null);

  const loadData = () => {
    setCurrentUser(store.getCurrentUser());
    setProfiles(store.getProfiles());
    setMatches(store.getMatches());
    setTournaments(store.getTournaments());
  };

  useEffect(() => {
    loadData();
    const unsub = store.subscribe(loadData);
    return unsub;
  }, [store]);

  const isPresident = currentUser.role === 'president';

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
          The Club Management Panel requires President privileges. You are currently browsing as <strong>{currentUser.full_name} ({currentUser.role})</strong>.
        </p>
        <button
          onClick={() => store.setCurrentUser('p-1')}
          className="px-4 py-2 rounded-xl bg-bhos-cyan text-bhos-navy font-bold text-xs hover:opacity-95 shadow-lg shadow-cyan-500/20"
        >
          Switch to President (Elvin Məmmədov)
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl md:text-3xl font-display font-black text-white">
              {t('admin.title')}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t('admin.subtitle')}
          </p>
        </div>

        <button
          onClick={handleResetData}
          className="px-3.5 py-2 rounded-xl border border-slate-700 bg-bhos-darkCard hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Sample Fixtures</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
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
            Hall Tables Status
          </span>
          <div className="text-2xl md:text-3xl font-mono font-bold text-emerald-400">
            6 / 6 Online
          </div>
        </div>
      </div>

      {/* Manual ELO Override Section */}
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

      {/* Member Roster & Role Promotion */}
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


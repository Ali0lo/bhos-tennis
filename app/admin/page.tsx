'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BHOSDataStore } from '../../lib/data/store';
import { PlayerProfile, UserRole } from '../../lib/data/types';
import { useTranslation } from '../../lib/i18n';
import { getSupabaseClient } from '../../lib/supabase/client';
import MatchLogger from '../../components/MatchLogger';
import PendingVerificationQueue from '../../components/PendingVerificationQueue';
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
  UserPlus,
  Loader2,
  CheckCircle2
} from 'lucide-react';

export default function AdminPage() {
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(store.getCurrentUser());
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [matches, setMatches] = useState(store.getMatches());
  const [tournaments, setTournaments] = useState(store.getTournaments());

  // Add New Player Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [faculty, setFaculty] = useState('Information Security');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [playerAddSuccess, setPlayerAddSuccess] = useState<string | null>(null);
  const [playerAddError, setPlayerAddError] = useState<string | null>(null);

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

  const isAuthorized = currentUser?.role === 'president' || currentUser?.role === 'coach';

  const handleAddNewPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlayerAddSuccess(null);
    setPlayerAddError(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setPlayerAddError('Full name is required.');
      return;
    }

    if (!trimmedEmail) {
      setPlayerAddError('Email is required.');
      return;
    }

    if (!trimmedEmail.endsWith('@bhos.edu.az')) {
      setPlayerAddError('Email must end with @bhos.edu.az (BHOS institutional email).');
      return;
    }

    // Check duplicate email locally
    if (profiles.some((p) => p.email.toLowerCase() === trimmedEmail)) {
      setPlayerAddError(`A player with email ${trimmedEmail} already exists.`);
      return;
    }

    setIsAddingPlayer(true);

    try {
      // Generate unique text ID
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `p-${Date.now()}`;

      const newPlayer: PlayerProfile = {
        id: newId,
        full_name: trimmedName,
        email: trimmedEmail,
        major_faculty: faculty,
        admission_year: new Date().getFullYear(),
        gender: 'male',
        role: 'player',
        playing_style: 'Shakehand Offensive',
        blade_equipment: 'Not listed',
        forehand_rubber: 'Not listed',
        backhand_rubber: 'Not listed',
        current_elo: 0,
        matches_played: 0,
        wins: 0,
        losses: 0,
        is_verified: true, // Directly added by Admin -> verified
        is_active: true,
        created_at: new Date().toISOString(),
      };

      // 1. Insert into Supabase if connected
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await supabase.from('profiles').insert([newPlayer]);
        if (error) {
          throw new Error(error.message);
        }
      }

      // 2. Optimistically update local store (realtime will also confirm)
      store.addProfile(newPlayer);

      // 3. Feedback & Form Reset
      setPlayerAddSuccess(`Successfully added ${trimmedName} (${trimmedEmail}) to the BHOS roster.`);
      setFullName('');
      setEmail('');
      setFaculty('Information Security');
    } catch (err: any) {
      setPlayerAddError(err.message || 'Failed to add player to Supabase.');
    } finally {
      setIsAddingPlayer(false);
    }
  };

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
    if (isNaN(val) || val < 0 || val > 10000) {
      alert('Please provide a valid ELO rating between 0 and 10000');
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

  if (!isAuthorized) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">President & Coach Access Only</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          The Club Management Panel requires President or Coach privileges.
          {currentUser ? (
            <> You are currently browsing as <strong>{currentUser.full_name} ({currentUser.role})</strong>.</>
          ) : (
            <> Please sign in with an authorized account.</>
          )}
        </p>
        <Link
          href="/login?redirect=/admin"
          className="inline-block px-5 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
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
          className="px-3.5 py-2 rounded-xl border border-white/[0.08] bg-[#0F1623] hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Sample Fixtures</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0F1623] space-y-1 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {t('admin.total_players')}
          </span>
          <div className="text-2xl md:text-3xl font-mono font-bold text-white">
            {profiles.length}
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0F1623] space-y-1 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {t('admin.total_matches')}
          </span>
          <div className="text-2xl md:text-3xl font-mono font-bold text-[#3B82F6]">
            {matches.length}
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0F1623] space-y-1 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {t('admin.active_tournaments')}
          </span>
          <div className="text-2xl md:text-3xl font-mono font-bold text-amber-400">
            {tournaments.length}
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0F1623] space-y-1 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Hall Tables Status
          </span>
          <div className="text-2xl md:text-3xl font-mono font-bold text-emerald-400">
            6 / 6 Online
          </div>
        </div>
      </div>

      {/* PENDING VERIFICATIONS QUEUE (Admin Review & Initial ELO Assignment) */}
      <PendingVerificationQueue onVerificationComplete={loadData} />

      {/* MATCH LOGGER COMPONENT (K=32 Standard ELO & Cloud Mutation) */}
      <MatchLogger onMatchLogged={loadData} />

      {/* ADD NEW PLAYER FORM (Cloud Database Connected) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0F1623] p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#3B82F6]" />
            <h3 className="text-base font-display font-bold text-white">
              Add New Player to Cloud Roster
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">
            Supabase Live
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Directly register a student athlete into the official BHOS Table Tennis database with immediate verification. All connected clients update in real time.
        </p>

        {playerAddSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{playerAddSuccess}</span>
          </div>
        )}

        {playerAddError && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{playerAddError}</span>
          </div>
        )}

        <form onSubmit={handleAddNewPlayer} className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Full Name <span className="text-[#3B82F6]">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Murad Gasimov"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#131C2B] border border-white/[0.08] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#3B82F6] transition"
            />
          </div>

          {/* Institutional Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              BHOS Email <span className="text-[#3B82F6]">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name.surname@bhos.edu.az"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#131C2B] border border-white/[0.08] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#3B82F6] transition"
            />
          </div>

          {/* Major / Faculty */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Major / Faculty <span className="text-[#3B82F6]">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#131C2B] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#3B82F6] transition"
              >
                <option value="Information Security">Information Security</option>
                <option value="Computer Engineering">Computer Engineering</option>
                <option value="Petroleum Engineering">Petroleum Engineering</option>
                <option value="Chemical Engineering">Chemical Engineering</option>
                <option value="Process Automation">Process Automation</option>
                <option value="Sports & Physical Education">Sports & Physical Education</option>
                <option value="Faculty Staff">Faculty Staff</option>
              </select>

              <button
                type="submit"
                disabled={isAddingPlayer || !fullName || !email}
                className="px-5 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-[#3B82F6]/25 transition-all duration-200 active:scale-95 shrink-0"
              >
                {isAddingPlayer ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Player</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Manual ELO Override Section */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0F1623] p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
          <Sliders className="w-5 h-5 text-[#3B82F6]" />
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
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#131C2B] border border-white/[0.08] text-white focus:outline-none focus:border-[#3B82F6] transition"
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
              min={0}
              max={10000}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#131C2B] border border-white/[0.08] text-white font-mono focus:outline-none focus:border-[#3B82F6] transition"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#131C2B] border border-white/[0.08] text-white focus:outline-none focus:border-[#3B82F6] transition"
              />
              <button
                type="submit"
                disabled={!targetPlayerId || !newEloInput}
                className="px-4 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold hover:opacity-95 disabled:opacity-50 transition shrink-0 shadow-lg shadow-[#3B82F6]/20"
              >
                {t('admin.apply_override')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Member Roster & Role Promotion */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0F1623] overflow-hidden shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#3B82F6]" />
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
            <thead className="border-b border-white/[0.08] bg-[#131C2B] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Faculty & Year</th>
                <th className="py-3 px-4">Current Role</th>
                <th className="py-3 px-4 text-center">ELO</th>
                <th className="py-3 px-4 text-center">Record</th>
                <th className="py-3 px-4 text-right">Assign Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {profiles.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition">
                  <td className="py-3 px-4 font-semibold text-white">
                    <Link href={`/players/${p.id}`} className="hover:text-[#3B82F6] transition">
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
                          : 'bg-[#3B82F6]/20 text-blue-300 border border-[#3B82F6]/30'
                      }`}
                    >
                      {p.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-[#3B82F6]">
                    {p.current_elo}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-400">
                    {p.wins}W - {p.losses}L
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1 bg-[#131C2B] p-0.5 rounded-lg border border-white/[0.08]">
                      <button
                        onClick={() => handleRoleChange(p.id, 'player')}
                        className={`px-2 py-1 rounded text-[10px] transition ${
                          p.role === 'player'
                            ? 'bg-[#3B82F6] text-white font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Player
                      </button>
                      <button
                        onClick={() => handleRoleChange(p.id, 'coach')}
                        className={`px-2 py-1 rounded text-[10px] transition ${
                          p.role === 'coach'
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Coach
                      </button>
                      <button
                        onClick={() => handleRoleChange(p.id, 'president')}
                        className={`px-2 py-1 rounded text-[10px] transition ${
                          p.role === 'president'
                            ? 'bg-amber-500 text-slate-950 font-bold'
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

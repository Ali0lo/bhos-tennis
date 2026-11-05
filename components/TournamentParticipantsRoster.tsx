'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { PlayerProfile, Tournament, isTournamentOrganizerOrAdmin } from '../lib/data/types';
import { getPlayerHref } from '../lib/data/store';
import { getProfileDepartment } from '../lib/utils/department';
import {
  Users,
  Trophy,
  Search,
  CheckCircle2,
  Trash2,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  GraduationCap,
} from 'lucide-react';

interface TournamentParticipantsRosterProps {
  tournament: Tournament;
  participants: PlayerProfile[];
  currentUser?: PlayerProfile | null;
  isAdmin?: boolean;
  onRegister?: () => void;
  onRemoveParticipant?: (playerId: string) => Promise<void> | void;
  actionLoading?: boolean;
  showAdminControls?: boolean;
  compact?: boolean;
}

function getInitials(name?: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_GRADIENTS = [
  'from-blue-600 to-indigo-700',
  'from-rose-600 to-amber-600',
  'from-emerald-600 to-teal-700',
  'from-purple-600 to-indigo-600',
  'from-cyan-600 to-blue-700',
  'from-amber-600 to-rose-600',
];

export default function TournamentParticipantsRoster({
  tournament,
  participants,
  currentUser,
  isAdmin = false,
  onRegister,
  onRemoveParticipant,
  actionLoading = false,
  showAdminControls = false,
  compact = false,
}: TournamentParticipantsRosterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const maxCapacity = tournament.max_participants || 16;
  const count = participants.length;
  const percentFilled = Math.min(100, Math.round((count / maxCapacity) * 100));

  const filteredParticipants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter((p) => {
      const name = (p.full_name || '').toLowerCase();
      const email = (p.email || '').toLowerCase();
      const dept = (getProfileDepartment(p) || '').toLowerCase();
      const group = (p.group || '').toLowerCase();
      return name.includes(q) || email.includes(q) || dept.includes(q) || group.includes(q);
    });
  }, [participants, searchQuery]);

  const handleRemove = async (pid: string) => {
    if (!onRemoveParticipant) return;
    if (window.confirm('Bu tələbəni turnir iştirakçı siyahısından çıxarmaq istədiyinizə əminsiniz?')) {
      setRemovingId(pid);
      try {
        await onRemoveParticipant(pid);
      } finally {
        setRemovingId(null);
      }
    }
  };

  const isUserRegistered = currentUser
    ? participants.some((p) => p.id === currentUser.id)
    : false;

  return (
    <div className="space-y-5">
      {/* Roster Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-700/20 border border-blue-600/40 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-lg sm:text-xl font-display font-black text-white tracking-tight">
              Qeydiyyatdan Keçən Tələbələr
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-700/20 border border-blue-600/30 text-blue-300 font-mono text-xs font-bold">
              {count} / {maxCapacity} Oyunçu
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Rəsmi çempionatda iştirakı təsdiqlənmiş tələbələr və onların ELO reytinqi
          </p>
        </div>

        {/* Search filter if more than 5 participants */}
        {participants.length > 5 && (
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tələbə adı və ya ixtisas..."
              className="w-full bg-[#131C2B] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-600"
            />
          </div>
        )}
      </div>

      {/* Progress Capacity Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Qeydiyyat Tutumu: {count} yer dolub</span>
          <span>{maxCapacity - count > 0 ? `${maxCapacity - count} boş yer qalır` : 'Siyahı dolub'}</span>
        </div>
        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
          <div
            className={`h-full transition-all duration-500 ${
              percentFilled >= 100
                ? 'bg-rose-500'
                : percentFilled >= 75
                ? 'bg-amber-500'
                : 'bg-gradient-to-r from-blue-600 to-indigo-500'
            }`}
            style={{ width: `${percentFilled}%` }}
          />
        </div>
      </div>

      {/* Empty State */}
      {participants.length === 0 ? (
        <div className="p-8 sm:p-10 rounded-2xl bg-[#0F1623] border border-white/10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-700/10 border border-blue-600/30 flex items-center justify-center text-blue-400 mx-auto shadow-inner">
            <Trophy className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h4 className="text-base font-display font-bold text-white">
              Hələ heç bir tələbə qeydiyyatdan keçməyib
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Turnir <strong>7 Noyabr 2026 (Şənbə) saat 10:00-da</strong> Bibiheybət kampusunda keçiriləcək.
              İlk qeydiyyatdan keçən tələbə siz olun!
            </p>
          </div>

          {!isUserRegistered && onRegister && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={onRegister}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-xs shadow-md transition active:scale-95"
            >
              <span>{actionLoading ? 'Qeydiyyat aparılır...' : 'İlk Qeydiyyatdan Keçən Siz Olun →'}</span>
            </button>
          )}
        </div>
      ) : (
        /* Participants Cards Grid */
        <div
          className={`grid gap-3 ${
            compact
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {filteredParticipants.map((player, index) => {
            const isSelf = currentUser?.id === player.id;
            const isOrganizer = isTournamentOrganizerOrAdmin(player, tournament);
            const dept = getProfileDepartment(player);
            const gradientIndex = index % AVATAR_GRADIENTS.length;
            const gradient = AVATAR_GRADIENTS[gradientIndex];

            return (
              <div
                key={player.id}
                className={`group relative p-3.5 rounded-2xl border transition-all ${
                  isSelf
                    ? 'bg-blue-950/40 border-blue-600/60 shadow-lg shadow-blue-500/10'
                    : 'bg-[#0F1623] hover:bg-[#131C2B] border-white/10 hover:border-blue-600/30 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Seed Rank Badge */}
                    <span className="w-6 h-6 rounded-lg bg-slate-950 border border-white/10 text-slate-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                      #{index + 1}
                    </span>

                    {/* Avatar */}
                    {player.avatar_url ? (
                      <img
                        src={player.avatar_url}
                        alt={player.full_name}
                        className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-display font-black text-xs shrink-0 shadow-sm`}
                      >
                        {getInitials(player.full_name)}
                      </div>
                    )}

                    {/* Player Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          href={getPlayerHref(player.id)}
                          className="font-display font-bold text-sm text-white hover:text-blue-400 transition truncate"
                          title={player.full_name}
                        >
                          {player.full_name}
                        </Link>

                        {isSelf && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold">
                            Siz ✓
                          </span>
                        )}

                        {isOrganizer && (
                          <span
                            title="Turnir Təşkilatçısı"
                            className="px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold"
                          >
                            👑 Təşkilatçı
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 flex-wrap">
                        {dept && (
                          <span className="truncate max-w-[140px] text-slate-300">
                            {dept}
                          </span>
                        )}
                        {player.admission_year && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-slate-400">
                            {player.admission_year}
                          </span>
                        )}
                        {player.group && (
                          <span className="text-[10px] font-mono text-blue-400 font-semibold">
                            {player.group}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ELO & Actions */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded-lg bg-blue-700/20 border border-blue-600/30 text-blue-300 font-mono text-xs font-black">
                      {player.current_elo || 1000} ELO
                    </span>

                    {/* Admin remove button */}
                    {isAdmin && showAdminControls && onRemoveParticipant && (
                      <button
                        type="button"
                        disabled={removingId === player.id}
                        onClick={() => handleRemove(player.id)}
                        title="İştirakçını xaric et"
                        className="p-1 rounded-lg hover:bg-rose-600/20 text-slate-500 hover:text-rose-400 transition text-[10px]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BHOSDataStore } from '../../lib/data/store';
import { Tournament, PlayerProfile } from '../../lib/data/types';
import { useTranslation } from '../../lib/i18n';
import { 
  Trophy, 
  Plus, 
  Calendar, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  X, 
  ShieldCheck, 
  FileText 
} from 'lucide-react';

export default function TournamentsPage() {
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [currentUser, setCurrentUser] = useState<PlayerProfile>(store.getCurrentUser());
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Tournament Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customRules, setCustomRules] = useState(
    '### Rules & Regulations\n1. Best of 5 sets (Final Best of 7).\n2. ITTF service rules apply.\n3. Rackets must have approved rubbers.'
  );
  const [format, setFormat] = useState<Tournament['format']>('single_elimination');
  const [maxParticipants, setMaxParticipants] = useState<number>(8);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const loadData = () => {
    setTournaments(store.getTournaments());
    setCurrentUser(store.getCurrentUser());
  };

  useEffect(() => {
    loadData();
    const unsub = store.subscribe(loadData);
    return unsub;
  }, [store]);

  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const allPlayers = store.getProfiles();
      const initialParticipantIds = allPlayers.slice(0, maxParticipants).map((p) => p.id);

      store.createTournament({
        title,
        description,
        custom_rules: customRules,
        format,
        max_participants: maxParticipants,
        start_date: startDate,
        created_by: currentUser.id,
        participant_ids: initialParticipantIds,
      });

      setCreateModalOpen(false);
      setTitle('');
      setDescription('');
    } catch (err: any) {
      alert(err.message || 'Failed to create tournament');
    }
  };

  const isPresident = currentUser.role === 'president';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl md:text-3xl font-display font-black text-white">
              {t('tournaments.title')}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t('tournaments.subtitle')}
          </p>
        </div>

        {isPresident && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-bhos-cyan to-bhos-blue text-bhos-navy font-display font-bold text-xs hover:opacity-95 shadow-lg shadow-cyan-500/20 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t('tournaments.create_tournament')}</span>
          </button>
        )}
      </div>

      {/* Tournaments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tournaments.map((tourn) => {
          const isOngoing = tourn.status === 'ongoing';
          const isUpcoming = tourn.status === 'upcoming';

          return (
            <div
              key={tourn.id}
              className="rounded-2xl border border-bhos-border bg-bhos-midnight/90 p-6 shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                      isOngoing
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : isUpcoming
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {tourn.status}
                  </span>

                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Max {tourn.max_participants} Players</span>
                  </span>
                </div>

                <Link
                  href={`/tournaments/${tourn.slug}`}
                  className="block font-display font-black text-xl text-white hover:text-bhos-cyan transition"
                >
                  {tourn.title}
                </Link>

                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {tourn.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(tourn.start_date).toLocaleDateString()}
                </span>

                <Link
                  href={`/tournaments/${tourn.slug}`}
                  className="px-4 py-2 rounded-xl bg-bhos-darkCard hover:bg-slate-800 border border-bhos-border text-xs font-semibold text-bhos-cyan hover:text-white transition flex items-center gap-1.5"
                >
                  <span>{t('tournaments.bracket')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* President Tournament Creator Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-bhos-border bg-bhos-midnight p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-bhos-border">
              <h4 className="font-display font-bold text-white text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-bhos-cyan" />
                <span>{t('tournaments.create_tournament')}</span>
              </h4>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTournament} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Tournament Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. BHOS Winter Cup 2024"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white focus:outline-none focus:border-bhos-cyan"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief summary of the championship..."
                  className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white focus:outline-none focus:border-bhos-cyan"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as Tournament['format'])}
                    className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white focus:outline-none focus:border-bhos-cyan"
                  >
                    <option value="single_elimination">{t('tournaments.format_single')}</option>
                    <option value="round_robin">{t('tournaments.format_round_robin')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Max Participants
                  </label>
                  <select
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white focus:outline-none focus:border-bhos-cyan"
                  >
                    <option value={4}>4 Players (Semifinals)</option>
                    <option value={8}>8 Players (Quarterfinals)</option>
                    <option value={16}>16 Players (Round of 16)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white focus:outline-none focus:border-bhos-cyan"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Custom Rules (Markdown)</span>
                  <span className="text-[10px] text-slate-500">ITTF / President Regulations</span>
                </label>
                <textarea
                  value={customRules}
                  onChange={(e) => setCustomRules(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white font-mono text-[11px] focus:outline-none focus:border-bhos-cyan"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
                >
                  {t('profile.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-bhos-cyan to-bhos-blue text-bhos-navy font-bold hover:opacity-95 shadow-md shadow-cyan-500/20"
                >
                  Create & Seed Bracket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


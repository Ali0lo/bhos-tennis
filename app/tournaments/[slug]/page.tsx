'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BHOSDataStore } from '../../../lib/data/store';
import { Tournament, PlayerProfile } from '../../../lib/data/types';
import { useTranslation } from '../../../lib/i18n';
import BracketTree from '../../../components/BracketTree';
import { 
  Trophy, 
  ArrowLeft, 
  Calendar, 
  Users, 
  FileText, 
  ShieldCheck, 
  CheckCircle, 
  Award 
} from 'lucide-react';

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();
  const slug = params.slug as string;

  const [tournament, setTournament] = useState<Tournament | undefined>(undefined);
  const [participants, setParticipants] = useState<PlayerProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<PlayerProfile>(store.getCurrentUser());

  const loadData = () => {
    const tourn = store.getTournament(slug);
    setTournament(tourn);
    setCurrentUser(store.getCurrentUser());

    if (tourn && tourn.participants) {
      const parts = tourn.participants
        .map((pid) => store.getProfile(pid))
        .filter((p): p is PlayerProfile => Boolean(p));
      setParticipants(parts);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = store.subscribe(loadData);
    return unsub;
  }, [slug, store]);

  if (!tournament) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Tournament Not Found</h2>
        <Link href="/tournaments" className="text-sm text-bhos-cyan hover:underline">
          Return to Tournaments
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back navigation */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Tournaments</span>
      </button>

      {/* Tournament Banner */}
      <div className="rounded-3xl border border-bhos-border bg-gradient-to-br from-bhos-midnight to-bhos-navy p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                tournament.status === 'ongoing'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : tournament.status === 'upcoming'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {tournament.status}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {tournament.format === 'single_elimination' ? t('tournaments.format_single') : t('tournaments.format_round_robin')}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-display font-black text-white">
            {tournament.title}
          </h1>

          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            {tournament.description}
          </p>

          <div className="pt-2 flex items-center gap-6 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-bhos-cyan" />
              <span>Starts: {new Date(tournament.start_date).toLocaleDateString()}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-bhos-cyan" />
              <span>Participants: {participants.length} / {tournament.max_participants}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Tournament Bracket Tree Section */}
      <div className="rounded-2xl border border-bhos-border bg-bhos-midnight/90 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-bhos-border">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-bhos-gold" />
            <h2 className="text-lg font-display font-bold text-white">
              {t('tournaments.bracket')}
            </h2>
          </div>
          {(currentUser.role === 'president' || currentUser.role === 'coach') && (
            <span className="text-[11px] px-2.5 py-1 rounded bg-bhos-blue/20 text-bhos-cyan border border-bhos-blue/30 font-medium">
              Official Bracket Management Mode Active
            </span>
          )}
        </div>

        <BracketTree tournament={tournament} onUpdate={loadData} />
      </div>

      {/* Two Columns: Custom Rules & Registered Participants */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Custom Rules & Regulations (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-bhos-border bg-bhos-midnight/90 p-6 shadow-xl space-y-4">
          <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-bhos-cyan" />
            <span>{t('tournaments.rules')}</span>
          </h3>

          <div className="p-5 rounded-xl bg-bhos-darkCard/60 border border-bhos-border text-xs text-slate-300 leading-relaxed space-y-2 whitespace-pre-line font-sans">
            {tournament.custom_rules}
          </div>
        </div>

        {/* Participants Seed Roster (1 col) */}
        <div className="rounded-2xl border border-bhos-border bg-bhos-midnight/90 p-6 shadow-xl space-y-4">
          <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-bhos-cyan" />
            <span>{t('tournaments.participants')} ({participants.length})</span>
          </h3>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {participants.map((player, idx) => (
              <div
                key={player.id}
                className="p-2.5 rounded-xl bg-bhos-darkCard/50 border border-bhos-border flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-mono">
                    #{idx + 1}
                  </span>
                  <Link
                    href={`/players/${player.id}`}
                    className="font-semibold text-white hover:text-bhos-cyan truncate"
                  >
                    {player.full_name}
                  </Link>
                </div>
                <span className="font-mono text-bhos-cyan font-bold text-[11px] shrink-0">
                  {player.current_elo} ELO
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


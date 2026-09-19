'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { BHOSDataStore } from '../../lib/data/store';
import { MatchRecord, PlayerProfile } from '../../lib/data/types';
import { useTranslation } from '../../lib/i18n';
import MatchLoggerModal from '../../components/MatchLoggerModal';
import { 
  Activity, 
  PlusCircle, 
  Search, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Filter, 
  ShieldCheck 
} from 'lucide-react';

export default function MatchesPage() {
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<PlayerProfile>(store.getCurrentUser());
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'TOURNAMENT' | 'RANKED'>('ALL');

  useEffect(() => {
    const update = () => {
      setMatches(store.getMatches());
      setCurrentUser(store.getCurrentUser());
    };
    update();
    return store.subscribe(update);
  }, [store]);

  const canLog = currentUser.role === 'coach' || currentUser.role === 'president';

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (m.player1_name || '').toLowerCase().includes(q) ||
        (m.player2_name || '').toLowerCase().includes(q) ||
        (m.tournament_title || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterType === 'TOURNAMENT') return Boolean(m.tournament_id);
      if (filterType === 'RANKED') return !m.tournament_id;
      return true;
    });
  }, [matches, searchQuery, filterType]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-bhos-cyan" />
            <h1 className="text-2xl md:text-3xl font-display font-black text-white">
              {t('matches.title')}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t('matches.subtitle')}
          </p>
        </div>

        {canLog && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-bhos-cyan to-bhos-blue text-bhos-navy font-display font-bold text-xs hover:opacity-95 shadow-lg shadow-cyan-500/20 active:scale-95 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('nav.log_match')}</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl border border-bhos-border bg-bhos-midnight/90 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by player or tournament..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-bhos-darkCard border border-bhos-border text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-bhos-cyan"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-bhos-darkCard p-1 rounded-xl border border-bhos-border w-full sm:w-auto">
          <button
            onClick={() => setFilterType('ALL')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterType === 'ALL'
                ? 'bg-bhos-cyan text-bhos-navy'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            All Matches ({matches.length})
          </button>
          <button
            onClick={() => setFilterType('TOURNAMENT')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterType === 'TOURNAMENT'
                ? 'bg-bhos-cyan text-bhos-navy'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Tournaments
          </button>
          <button
            onClick={() => setFilterType('RANKED')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterType === 'RANKED'
                ? 'bg-bhos-cyan text-bhos-navy'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Club Ranked
          </button>
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        {filteredMatches.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-bhos-border bg-bhos-darkCard/20 space-y-2">
            <Activity className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-sm">No matches found matching criteria.</p>
          </div>
        ) : (
          filteredMatches.map((m) => {
            const p1Won = m.player1_score > m.player2_score;

            return (
              <div
                key={m.id}
                className="p-5 rounded-2xl border border-bhos-border bg-bhos-midnight/90 shadow-md hover:border-slate-700 transition"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Players & Scores */}
                  <div className="flex items-center gap-4 flex-1">
                    {/* Big Score Box */}
                    <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-bhos-darkCard border border-bhos-border font-mono font-black text-xl text-white shadow-inner">
                      <span>{m.player1_score}</span>
                      <span className="text-[10px] text-slate-500 -mt-1 font-normal">:</span>
                      <span>{m.player2_score}</span>
                    </div>

                    <div className="space-y-2 flex-1">
                      {/* Player 1 Line */}
                      <div className="flex items-center justify-between max-w-md">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/players/${m.player1_id}`}
                            className={`text-sm font-bold hover:text-bhos-cyan transition ${
                              p1Won ? 'text-white' : 'text-slate-400'
                            }`}
                          >
                            {m.player1_name}
                          </Link>
                          {p1Won && <Award className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <div className="font-mono text-xs flex items-center gap-1.5">
                          <span className="text-slate-500">{m.player1_elo_before}</span>
                          <span className="text-slate-600">→</span>
                          <span className="font-bold text-white">{m.player1_elo_after}</span>
                          <span
                            className={`text-[11px] font-bold ${
                              p1Won ? 'text-emerald-400' : 'text-crimson'
                            }`}
                          >
                            ({p1Won ? `+${m.elo_delta}` : `-${m.elo_delta}`})
                          </span>
                        </div>
                      </div>

                      {/* Player 2 Line */}
                      <div className="flex items-center justify-between max-w-md">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/players/${m.player2_id}`}
                            className={`text-sm font-bold hover:text-bhos-cyan transition ${
                              !p1Won ? 'text-white' : 'text-slate-400'
                            }`}
                          >
                            {m.player2_name}
                          </Link>
                          {!p1Won && <Award className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <div className="font-mono text-xs flex items-center gap-1.5">
                          <span className="text-slate-500">{m.player2_elo_before}</span>
                          <span className="text-slate-600">→</span>
                          <span className="font-bold text-white">{m.player2_elo_after}</span>
                          <span
                            className={`text-[11px] font-bold ${
                              !p1Won ? 'text-emerald-400' : 'text-crimson'
                            }`}
                          >
                            ({!p1Won ? `+${m.elo_delta}` : `-${m.elo_delta}`})
                          </span>
                        </div>
                      </div>

                      {/* Set Scores Breakdown */}
                      <div className="text-xs font-mono text-slate-400 pt-0.5">
                        Sets: <span className="text-slate-300">{m.set_scores}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right metadata badge */}
                  <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-800 text-right gap-1">
                    <div className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(m.match_date).toLocaleDateString()}</span>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Logged by: <span className="text-slate-300 font-semibold">{m.logged_by_name}</span>
                    </div>

                    {m.tournament_title && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        {m.tournament_title}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <MatchLoggerModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}


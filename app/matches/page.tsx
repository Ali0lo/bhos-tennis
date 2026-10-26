'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { BHOSDataStore, isApprovedMatch } from '../../lib/data/store';
import { MatchRecord, PlayerProfile, isAutoApprovedMatch } from '../../lib/data/types';
import { useTranslation } from '../../lib/i18n';
import MatchLoggerModal from '../../components/MatchLoggerModal';
import PendingApprovals from '../../components/PendingApprovals';
import { 
  Activity, 
  PlusCircle, 
  Search, 
  Award, 
  Calendar,
  User,
  Globe,
  Clock,
  CheckCheck
} from 'lucide-react';

export default function MatchesPage() {
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(store.getCurrentUser());
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchScope, setMatchScope] = useState<'MY_GAMES' | 'ALL_GAMES'>('MY_GAMES');
  const [filterType, setFilterType] = useState<'ALL' | 'TOURNAMENT' | 'RANKED'>('ALL');

  const updateData = useCallback(() => {
    const resolved = store.getResolvedMatchIds();
    setMatches(store.getMatches().filter((m) => isApprovedMatch(m, resolved)));
    setCurrentUser(store.getCurrentUser());
  }, [store]);

  useEffect(() => {
    updateData();
    return store.subscribe(updateData);
  }, [updateData]);

  const canLog = !!currentUser && currentUser.is_verified !== false;
  const effectiveScope = currentUser ? matchScope : 'ALL_GAMES';

  const isMyMatch = useCallback((m: MatchRecord) => {
    if (!currentUser) return false;
    const uid = currentUser.id;
    const uname = currentUser.full_name?.trim().toLowerCase();
    return (
      m.player1_id === uid ||
      m.player2_id === uid ||
      m.logged_by === uid ||
      (uname && (
        m.player1_name?.trim().toLowerCase() === uname ||
        m.player2_name?.trim().toLowerCase() === uname
      ))
    );
  }, [currentUser]);

  const myMatchesCount = useMemo(() => {
    return matches.filter(isMyMatch).length;
  }, [matches, isMyMatch]);

  const myWinsCount = useMemo(() => {
    if (!currentUser) return 0;
    return matches.filter((m) => {
      const isP1 = m.player1_id === currentUser.id || m.player1_name?.trim().toLowerCase() === currentUser.full_name?.trim().toLowerCase();
      const isP2 = m.player2_id === currentUser.id || m.player2_name?.trim().toLowerCase() === currentUser.full_name?.trim().toLowerCase();
      if (isP1 && m.player1_score > m.player2_score) return true;
      if (isP2 && m.player2_score > m.player1_score) return true;
      return false;
    }).length;
  }, [matches, currentUser]);

  const myLossesCount = useMemo(() => {
    if (!currentUser) return 0;
    return matches.filter((m) => {
      const isP1 = m.player1_id === currentUser.id || m.player1_name?.trim().toLowerCase() === currentUser.full_name?.trim().toLowerCase();
      const isP2 = m.player2_id === currentUser.id || m.player2_name?.trim().toLowerCase() === currentUser.full_name?.trim().toLowerCase();
      if (isP1 && m.player1_score < m.player2_score) return true;
      if (isP2 && m.player2_score < m.player1_score) return true;
      return false;
    }).length;
  }, [matches, currentUser]);

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (effectiveScope === 'MY_GAMES' && !isMyMatch(m)) {
        return false;
      }

      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesSearch =
          (m.player1_name || '').toLowerCase().includes(q) ||
          (m.player2_name || '').toLowerCase().includes(q) ||
          (m.tournament_title || '').toLowerCase().includes(q) ||
          (m.logged_by_name || '').toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      if (filterType === 'TOURNAMENT') return Boolean(m.tournament_id);
      if (filterType === 'RANKED') return !m.tournament_id;
      return true;
    });
  }, [matches, searchQuery, filterType, effectiveScope, isMyMatch]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl md:text-3xl font-display font-black text-white">
              {effectiveScope === 'MY_GAMES' && currentUser ? 'Mənim Oyunlarım' : t('matches.title')}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {effectiveScope === 'MY_GAMES' && currentUser
              ? `${currentUser.full_name} üçün qeydə alınmış rəsmi qarşılaşmalar və nəticələr`
              : t('matches.subtitle')}
          </p>
        </div>

        {canLog && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-display font-bold text-xs hover:opacity-95 shadow-lg shadow-cyan-500/20 active:scale-95 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('nav.log_match')}</span>
          </button>
        )}
      </div>

      <PendingApprovals onMatchUpdated={updateData} />

      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center p-1 rounded-2xl bg-slate-900/90 border border-white/10 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setMatchScope('MY_GAMES')}
              disabled={!currentUser}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                effectiveScope === 'MY_GAMES'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Mənim Oyunlarım</span>
              {currentUser && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  effectiveScope === 'MY_GAMES' ? 'bg-black/30 text-cyan-200' : 'bg-white/5 text-slate-400'
                }`}>
                  {myMatchesCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMatchScope('ALL_GAMES')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                effectiveScope === 'ALL_GAMES'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Bütün Oyunlar</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                effectiveScope === 'ALL_GAMES' ? 'bg-black/30 text-cyan-200' : 'bg-white/5 text-slate-400'
              }`}>
                {matches.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-white/10 w-full sm:w-auto">
            <button
              onClick={() => setFilterType('ALL')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterType === 'ALL'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Hamısı
            </button>
            <button
              onClick={() => setFilterType('TOURNAMENT')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterType === 'TOURNAMENT'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Turnirlər
            </button>
            <button
              onClick={() => setFilterType('RANKED')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterType === 'RANKED'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Klub Reytinqi
            </button>
          </div>
        </div>

        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Oyunçu adı və ya turnir üzrə axtar..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition"
          />
        </div>
      </div>

      {effectiveScope === 'MY_GAMES' && currentUser && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950 border border-cyan-500/20 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-display font-black text-cyan-300 text-sm overflow-hidden">
              {currentUser.avatar_url ? (
                <img src={currentUser.avatar_url} alt={currentUser.full_name} className="w-full h-full object-cover" />
              ) : (
                currentUser.full_name.charAt(0)
              )}
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{currentUser.full_name}</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {t(`roles.${currentUser.role}`)}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Reytinq: <strong className="text-cyan-400 font-mono">{currentUser.current_elo} ELO</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono">
            <div className="text-center">
              <span className="text-slate-400 block text-[10px]">Oyunlar</span>
              <span className="font-bold text-white text-sm">{myMatchesCount}</span>
            </div>
            <div className="text-center">
              <span className="text-emerald-400 block text-[10px]">Qələbə</span>
              <span className="font-bold text-emerald-400 text-sm">{myWinsCount}</span>
            </div>
            <div className="text-center">
              <span className="text-rose-400 block text-[10px]">Məğlubiyyət</span>
              <span className="font-bold text-rose-400 text-sm">{myLossesCount}</span>
            </div>
            <div className="text-center">
              <span className="text-cyan-400 block text-[10px]">Qələbə %</span>
              <span className="font-bold text-cyan-300 text-sm">
                {myMatchesCount > 0 ? `${Math.round((myWinsCount / myMatchesCount) * 100)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredMatches.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 bg-slate-900/40 space-y-3">
            <Activity className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-slate-300 font-semibold text-sm">
              {effectiveScope === 'MY_GAMES'
                ? 'Hələ ki sizin heç bir rəsmi oyununuz qeydə alınmayıb.'
                : 'Axtarışa uyğun oyun tapılmadı.'}
            </p>
            {effectiveScope === 'MY_GAMES' && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMatchScope('ALL_GAMES')}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition"
                >
                  Bütün Oyunlara Bax ({matches.length})
                </button>
                {canLog && (
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs transition"
                  >
                    Oyun Qeyd Et
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          filteredMatches.map((m) => {
            const p1Won = m.player1_score > m.player2_score;
            const isUserP1 = currentUser && (m.player1_id === currentUser.id || m.player1_name?.trim().toLowerCase() === currentUser.full_name?.trim().toLowerCase());
            const isUserP2 = currentUser && (m.player2_id === currentUser.id || m.player2_name?.trim().toLowerCase() === currentUser.full_name?.trim().toLowerCase());
            const isUserMatch = isUserP1 || isUserP2;
            const userWon = isUserMatch && ((isUserP1 && p1Won) || (isUserP2 && !p1Won));

            return (
              <div
                key={m.id}
                className={`p-5 rounded-2xl border transition shadow-md ${
                  isUserMatch
                    ? userWon
                      ? 'border-emerald-500/30 bg-slate-900/90 shadow-emerald-500/5'
                      : 'border-rose-500/30 bg-slate-900/90 shadow-rose-500/5'
                    : 'border-white/10 bg-slate-900/80 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-slate-950 border border-white/10 font-mono font-black text-xl text-white shadow-inner shrink-0">
                      <span>{m.player1_score}</span>
                      <span className="text-[10px] text-slate-500 -mt-1 font-normal">:</span>
                      <span>{m.player2_score}</span>
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between max-w-md">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/players/${m.player1_id}`}
                            className={`text-sm font-bold hover:text-cyan-400 transition ${
                              isUserP1 ? 'text-cyan-300 underline underline-offset-2' : p1Won ? 'text-white' : 'text-slate-400'
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
                              p1Won ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            ({p1Won ? `+${m.elo_delta}` : `-${m.elo_delta}`})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between max-w-md">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/players/${m.player2_id}`}
                            className={`text-sm font-bold hover:text-cyan-400 transition ${
                              isUserP2 ? 'text-cyan-300 underline underline-offset-2' : !p1Won ? 'text-white' : 'text-slate-400'
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
                              !p1Won ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            ({!p1Won ? `+${m.elo_delta}` : `-${m.elo_delta}`})
                          </span>
                        </div>
                      </div>

                      <div className="text-xs font-mono text-slate-400 pt-0.5">
                        Setlər: <span className="text-slate-300">{m.set_scores}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-white/5 text-right gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {isUserMatch && (
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                            userWon
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {userWon ? 'Qələbə' : 'Məğlubiyyət'}
                        </span>
                      )}

                      {isAutoApprovedMatch(m) ? (
                        <span
                          title="Rəqib 48 saat ərzində təsdiqləmədiyi üçün avtomatik təsdiqlənib"
                          className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        >
                          <Clock className="w-3 h-3" />
                          <span>Avto-təsdiq (48 saat)</span>
                        </span>
                      ) : (
                        <span
                          title="Oyunçu tərəfindən rəsmi təsdiqlənib"
                          className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/25"
                        >
                          <CheckCheck className="w-3 h-3" />
                          <span>Təsdiqlənib</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(m.match_date).toLocaleDateString()}</span>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Qeyd edən: <span className="text-slate-300 font-semibold">{m.logged_by_name}</span>
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

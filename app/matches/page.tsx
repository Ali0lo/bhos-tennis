'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { BHOSDataStore, isApprovedMatch, getPlayerHref } from '../../lib/data/store';
import { MatchRecord, PlayerProfile, isAutoApprovedMatch } from '../../lib/data/types';
import { formatMatchStageAz, isPlayoffStage } from '../../lib/data/matches';
import { useTranslation } from '../../lib/i18n';
import MatchLoggerModal from '../../components/MatchLoggerModal';
import MatchDetailModal from '../../components/MatchDetailModal';
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
  const { t, locale } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(store.getCurrentUser());
  const [showModal, setShowModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchScope, setMatchScope] = useState<'MY_GAMES' | 'ALL_GAMES'>('ALL_GAMES');
  const [filterType, setFilterType] = useState<'ALL' | 'TOURNAMENT' | 'RANKED'>('ALL');

  const updateData = useCallback(() => {
    const resolved = store.getResolvedMatchIds();
    const approved = store
      .getMatches()
      .filter((m) => isApprovedMatch(m, resolved))
      .map((m) => store.enrichMatchRecord(m));
    setMatches(approved);
    setCurrentUser(store.getCurrentUser());
  }, [store]);

  useEffect(() => {
    updateData();
    void store.fetchMatchesFromCloud();
    return store.subscribe(updateData);
  }, [store, updateData]);

  useEffect(() => {
    if (typeof window === 'undefined' || matches.length === 0) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const idParam = params.get('id');
      if (idParam) {
        const found = matches.find((m) => m.id === idParam);
        if (found) {
          setMatchScope('ALL_GAMES');
          setSelectedMatch(found);
        }
      }
    } catch {}
  }, [matches]);

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
            <Activity className="w-6 h-6 text-blue-400" />
            <h1 className="text-2xl md:text-3xl font-display font-black text-white">
              {effectiveScope === 'MY_GAMES' && currentUser ? t('nav.my_matches') : t('matches.title')}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {effectiveScope === 'MY_GAMES' && currentUser
              ? t('matches.my_matches_sub', '{name} üçün qeydə alınmış rəsmi qarşılaşmalar və nəticələr').replace('{name}', currentUser.full_name)
              : t('matches.subtitle')}
          </p>
        </div>

        {canLog && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-xs shadow-sm active:scale-95 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('nav.log_match')}</span>
          </button>
        )}
      </div>

      <PendingApprovals onMatchUpdated={updateData} />

      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-800 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setMatchScope('MY_GAMES')}
              disabled={!currentUser}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                effectiveScope === 'MY_GAMES'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{t('nav.my_matches')}</span>
              {currentUser && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  effectiveScope === 'MY_GAMES' ? 'bg-slate-950/40 text-blue-100' : 'bg-slate-800 text-slate-400'
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
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{t('match_detail.all_matches')}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                effectiveScope === 'ALL_GAMES' ? 'bg-slate-950/40 text-blue-100' : 'bg-slate-800 text-slate-400'
              }`}>
                {matches.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setFilterType('ALL')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterType === 'ALL'
                  ? 'bg-blue-700/20 text-blue-300 border border-blue-600/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('leaderboard.all')}
            </button>
            <button
              onClick={() => setFilterType('TOURNAMENT')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterType === 'TOURNAMENT'
                  ? 'bg-blue-700/20 text-blue-300 border border-blue-600/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('nav.tournaments')}
            </button>
            <button
              onClick={() => setFilterType('RANKED')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterType === 'RANKED'
                  ? 'bg-blue-700/20 text-blue-300 border border-blue-600/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('match_detail.club_match')}
            </button>
          </div>
        </div>

        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('leaderboard.search_placeholder')}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-600 transition"
          />
        </div>
      </div>

      {effectiveScope === 'MY_GAMES' && currentUser && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-700/20 border border-blue-600/40 flex items-center justify-center font-display font-black text-blue-300 text-sm overflow-hidden">
              {currentUser.avatar_url ? (
                <img src={currentUser.avatar_url} alt={currentUser.full_name} className="w-full h-full object-cover" />
              ) : (
                currentUser.full_name.charAt(0)
              )}
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{currentUser.full_name}</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-700/15 text-blue-300 border border-blue-600/30">
                  {t(`roles.${currentUser.role}`)}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {t('profile.current_elo')}: <strong className="text-blue-400 font-mono">{currentUser.current_elo} ELO</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono">
            <div className="text-center">
              <span className="text-slate-400 block text-[10px]">{t('leaderboard.matches')}</span>
              <span className="font-bold text-white text-sm">{myMatchesCount}</span>
            </div>
            <div className="text-center">
              <span className="text-emerald-500 block text-[10px]">{t('leaderboard.wins')}</span>
              <span className="font-bold text-emerald-500 text-sm">{myWinsCount}</span>
            </div>
            <div className="text-center">
              <span className="text-rose-500 block text-[10px]">{t('leaderboard.losses')}</span>
              <span className="font-bold text-rose-500 text-sm">{myLossesCount}</span>
            </div>
            <div className="text-center">
              <span className="text-blue-400 block text-[10px]">{t('leaderboard.winrate')}</span>
              <span className="font-bold text-blue-300 text-sm">
                {myMatchesCount > 0 ? `${Math.round((myWinsCount / myMatchesCount) * 100)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredMatches.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900 space-y-3">
            <Activity className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-slate-300 font-semibold text-sm">
              {effectiveScope === 'MY_GAMES'
                ? t('matches.no_my_matches', 'Hələ ki sizin heç bir rəsmi oyununuz qeydə alınmayıb.')
                : t('matches.no_matches_found', 'Axtarışa uyğun oyun tapılmadı.')}
            </p>
            {effectiveScope === 'MY_GAMES' && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMatchScope('ALL_GAMES')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
                >
                  {t('matches.view_all_count', 'Bütün Oyunlara Bax ({count})').replace('{count}', String(matches.length))}
                </button>
                {canLog && (
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
                  >
                    {t('nav.log_match', 'Oyun Qeyd Et')}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          filteredMatches.map((m) => {
            const p1Id = m.player1?.id || m.player1_id;
            const p2Id = m.player2?.id || m.player2_id;
            const p1Name = m.player1?.full_name || m.player1_name || t('matches.player1_fallback', 'Oyunçu 1');
            const p2Name = m.player2?.full_name || m.player2_name || t('matches.player2_fallback', 'Oyunçu 2');

            const p1Won = m.winner_id
              ? m.winner_id === p1Id || m.player1_score > m.player2_score
              : m.player1_score > m.player2_score;
            const p2Won = !p1Won;

            const isUserP1 =
              currentUser &&
              (p1Id === currentUser.id ||
                p1Name.trim().toLowerCase() === currentUser.full_name?.trim().toLowerCase());
            const isUserP2 =
              currentUser &&
              (p2Id === currentUser.id ||
                p2Name.trim().toLowerCase() === currentUser.full_name?.trim().toLowerCase());
            const isUserMatch = isUserP1 || isUserP2;
            const userWon = isUserMatch && ((isUserP1 && p1Won) || (isUserP2 && p2Won));

            const p1Delta =
              typeof m.player1_elo_delta === 'number'
                ? m.player1_elo_delta
                : m.player1_elo_after !== m.player1_elo_before
                ? m.player1_elo_after - m.player1_elo_before
                : p1Won
                ? Math.abs(m.elo_delta)
                : -Math.abs(m.elo_delta);

            const p2Delta =
              typeof m.player2_elo_delta === 'number'
                ? m.player2_elo_delta
                : m.player2_elo_after !== m.player2_elo_before
                ? m.player2_elo_after - m.player2_elo_before
                : p2Won
                ? Math.abs(m.elo_delta)
                : -Math.abs(m.elo_delta);

            const stageLabel = formatMatchStageAz(m.stage, m.round_number, m.tournament_id);
            const isPlayoff = isPlayoffStage(m.stage, m.round_number);

            return (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedMatch(m)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedMatch(m);
                  }
                }}
                className={`p-5 rounded-2xl border hover:bg-slate-800/60 cursor-pointer transition shadow-sm ${
                  isUserMatch
                    ? userWon
                      ? 'border-emerald-600/35 bg-slate-900 hover:border-emerald-500/60'
                      : 'border-rose-600/35 bg-slate-900 hover:border-rose-500/60'
                    : 'border-slate-800 bg-slate-900 hover:border-blue-600/50'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 font-mono font-black text-xl text-white shrink-0">
                      <span className={p1Won ? 'text-emerald-400' : 'text-slate-300'}>
                        {m.player1_score}
                      </span>
                      <span className="text-[10px] text-slate-500 -mt-1 font-normal">:</span>
                      <span className={p2Won ? 'text-emerald-400' : 'text-slate-300'}>
                        {m.player2_score}
                      </span>
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between max-w-md gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Link
                            href={getPlayerHref(p1Id, p1Name)}
                            onClick={(e) => e.stopPropagation()}
                            className={`text-sm hover:text-blue-400 transition truncate ${
                              isUserP1
                                ? 'text-blue-400 font-bold underline underline-offset-2'
                                : p1Won
                                ? 'text-emerald-400 font-bold'
                                : 'text-slate-300 font-medium'
                            }`}
                          >
                            {p1Name}
                          </Link>
                          {p1Won && <Award className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        </div>
                        <div className="font-mono text-xs flex items-center gap-1.5 shrink-0">
                          <span className="text-slate-500">{m.player1_elo_before}</span>
                          <span className="text-slate-600">→</span>
                          <span className="font-bold text-white">{m.player1_elo_after}</span>
                          <span
                            className={`text-[11px] font-bold ${
                              p1Delta >= 0 ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            ({p1Delta >= 0 ? `+${p1Delta}` : p1Delta})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between max-w-md gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Link
                            href={getPlayerHref(p2Id, p2Name)}
                            onClick={(e) => e.stopPropagation()}
                            className={`text-sm hover:text-blue-400 transition truncate ${
                              isUserP2
                                ? 'text-blue-400 font-bold underline underline-offset-2'
                                : p2Won
                                ? 'text-emerald-400 font-bold'
                                : 'text-slate-300 font-medium'
                            }`}
                          >
                            {p2Name}
                          </Link>
                          {p2Won && <Award className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        </div>
                        <div className="font-mono text-xs flex items-center gap-1.5 shrink-0">
                          <span className="text-slate-500">{m.player2_elo_before}</span>
                          <span className="text-slate-600">→</span>
                          <span className="font-bold text-white">{m.player2_elo_after}</span>
                          <span
                            className={`text-[11px] font-bold ${
                              p2Delta >= 0 ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            ({p2Delta >= 0 ? `+${p2Delta}` : p2Delta})
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 pt-0.5">
                        <span>
                          {t('home_recent.sets_label', 'Setlər')}: <span className="text-slate-300">{m.set_scores}</span>
                        </span>
                        {stageLabel && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-sans font-extrabold uppercase tracking-wider border ${
                              isPlayoff
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                : 'bg-blue-700/15 text-blue-300 border-blue-600/30'
                            }`}
                          >
                            {stageLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-800 text-right gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {isUserMatch && (
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                            userWon
                              ? 'bg-emerald-600/15 text-emerald-400 border-emerald-600/30'
                              : 'bg-rose-600/15 text-rose-400 border-rose-600/30'
                          }`}
                        >
                          {userWon ? t('leaderboard.wins') : t('leaderboard.losses')}
                        </span>
                      )}

                      {isAutoApprovedMatch(m) ? (
                        <span
                          title="48h Auto-Approved"
                          className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        >
                          <Clock className="w-3 h-3" />
                          <span>{t('match_detail.approved')}</span>
                        </span>
                      ) : (
                        <span
                          title="Verified"
                          className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-blue-700/15 text-blue-300 border border-blue-600/30"
                        >
                          <CheckCheck className="w-3 h-3" />
                          <span>{t('match_detail.approved')}</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(m.match_date).toLocaleDateString(locale === 'az' ? 'az-AZ' : locale === 'ru' ? 'ru-RU' : 'en-US')}</span>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      {t('pending_matches.logged_by', 'Qeyd edən:')} <span className="text-slate-300 font-semibold">{m.logged_by_name}</span>
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
      {selectedMatch && (
        <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      )}
    </div>
  );
}

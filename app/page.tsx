'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BHOSDataStore, isApprovedMatch, getPlayerHref } from '../lib/data/store';
import { PlayerProfile, MatchRecord, Tournament, canAccessAdminPanel } from '../lib/data/types';
import { useTranslation, useTranslations } from '../lib/i18n';
import HallRulesSection from '../components/HallRulesSection';
import Hero from '../components/Hero';
import MatchLoggerModal from '../components/MatchLoggerModal';
import MatchDetailModal from '../components/MatchDetailModal';
import LiveMatches from '../components/LiveMatches';
import ArcadeDiscoveryBanner from '../components/ArcadeDiscoveryBanner';
import RecentResults from '../components/RecentResults';
import NumberTicker from '../components/NumberTicker';
import AnimatedCounter from '../components/AnimatedCounter';
import CourtBackground from '../components/CourtBackground';
import LeaderboardSkeleton from '../components/LeaderboardSkeleton';
import HoloCard from '../components/HoloCard';
import TiltCard from '../components/TiltCard';
import OnboardingBanner from '../components/OnboardingBanner';
import FoundationTournamentBanner from '../components/FoundationTournamentBanner';
import SmoothReveal, { SmoothRevealItem } from '../components/SmoothReveal';
import {
  Trophy,
  Table as TableIcon,
  ArrowRight,
  Award,
  Zap,
  ShieldCheck,
  Target,
  Flame,
  Users,
  UserPlus,
} from 'lucide-react';

export default function HomePage() {
  const t = useTranslations('home');
  const { t: rootT } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const [profiles, setProfiles] = useState<PlayerProfile[]>(() => {
    const cached = store.getCachedLeaderboard();
    const verified = store.getVerifiedProfiles();
    const all = store.getProfiles();
    if (cached.length > 0) return cached;
    return verified.length > 0 ? verified : all;
  });
  const [totalPlayersCount, setTotalPlayersCount] = useState<number>(() => {
    const verified = store.getVerifiedProfiles();
    const cached = store.getCachedLeaderboard();
    return cached.length > 0 ? cached.length : verified.length;
  });
  const [matches, setMatches] = useState<MatchRecord[]>(() => {
    const resolved = store.getResolvedMatchIds();
    return store.getMatches().filter((m) => isApprovedMatch(m, resolved));
  });
  const [tournaments, setTournaments] = useState<Tournament[]>(() => store.getTournaments());
  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(store.getCurrentUser());
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);

  useEffect(() => {
    let isMounted = true;

    const update = () => {
      if (!isMounted) return;
      const cached = store.getCachedLeaderboard();
      const verified = store.getVerifiedProfiles();
      const all = store.getProfiles();
      const activeList = cached.length > 0 ? cached : verified.length > 0 ? verified : all;
      setTotalPlayersCount(activeList.length);
      setProfiles(activeList);

      const resolved = store.getResolvedMatchIds();
      setMatches(store.getMatches().filter((m) => isApprovedMatch(m, resolved)));
      setTournaments(store.getTournaments());
      setCurrentUser(store.getCurrentUser());
    };

    update();
    void store.fetchMatchesFromCloud();
    void store.fetchLeaderboardStandings().then((allRows) => {
      if (isMounted) {
        const verified = store.getVerifiedProfiles();
        const all = store.getProfiles();
        const activeList = allRows.length > 0 ? allRows : verified.length > 0 ? verified : all;
        setTotalPlayersCount(activeList.length);
        setProfiles(activeList);
      }
    });

    const unsub = store.subscribe(update);
    return () => {
      isMounted = false;
      unsub();
    };
  }, [store]);

  const top3 = profiles.slice(0, 3);
  const top5 = profiles.slice(0, 5);

  const getActiveWinStreak = (player?: PlayerProfile): number => {
    if (!player) return 0;
    const playerMatches = matches
      .filter(
        (m) =>
          m.player1_id === player.id ||
          m.player2_id === player.id ||
          (player.full_name &&
            (m.player1_name?.trim().toLowerCase() === player.full_name.trim().toLowerCase() ||
              m.player2_name?.trim().toLowerCase() === player.full_name.trim().toLowerCase()))
      )
      .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());

    if (playerMatches.length === 0) {
      return player.losses === 0 && player.wins >= 3 ? player.wins : 0;
    }

    let streak = 0;
    for (const m of playerMatches) {
      const isP1 =
        m.player1_id === player.id ||
        (player.full_name &&
          m.player1_name?.trim().toLowerCase() === player.full_name.trim().toLowerCase());
      const myScore = isP1 ? m.player1_score : m.player2_score;
      const opScore = isP1 ? m.player2_score : m.player1_score;
      const won = m.winner_id ? m.winner_id === player.id : myScore > opScore;
      if (won) {
        streak += 1;
      } else {
        break;
      }
    }
    if (streak < 3 && player.losses === 0 && player.wins >= 3) {
      return player.wins;
    }
    return streak;
  };

  const translateFaculty = (faculty?: string) => {
    if (!faculty) return 'BHOS';
    const key = `faculties.${faculty}`;
    const translated = rootT(key);
    return translated === key ? faculty : translated;
  };

  return (
    <div className="relative space-y-10">
      <CourtBackground className="fixed" />

      <SmoothReveal delay={0.02}>
        <Hero
          currentUser={currentUser}
          totalPlayersCount={totalPlayersCount}
          matchesCount={matches.length}
          leaderElo={top3[0]?.current_elo ?? 966}
        />
      </SmoothReveal>

      {matches.length > 0 && (
        <SmoothReveal delay={0.04}>
          <div className="my-6 sm:mt-8 sm:mb-10 w-full">
            <LiveMatches matches={matches} onSelectMatch={(m) => setSelectedMatch(m)} />
          </div>
        </SmoothReveal>
      )}

      <SmoothReveal delay={0.05}>
        <div className="w-full">
          <ArcadeDiscoveryBanner />
        </div>
      </SmoothReveal>

      <SmoothReveal delay={0.06}>
        <FoundationTournamentBanner />
      </SmoothReveal>

      <SmoothReveal delay={0.08}>
        <OnboardingBanner />
      </SmoothReveal>

      <SmoothReveal delay={0.1}>
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl md:text-2xl font-display font-bold text-white flex items-center gap-2">
                  <Award className="w-6 h-6 text-amber-400" />
                  <span>{t('sections.leaderboard_title')}</span>
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                {t('sections.leaderboard_subtitle')}
              </p>
            </div>
            <Link
              href="/leaderboard"
              className="group text-xs font-semibold text-blue-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span>{t('sections.view_all_leaderboard')} ({totalPlayersCount})</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
            {top3[1] && (() => {
              const streak2 = getActiveWinStreak(top3[1]);

              return (
                <motion.div
                  initial={{ opacity: 0, y: 36, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.18 }}
                  className="order-2 md:order-1 flex flex-col items-center"
                >
                  <div className="w-full animate-podium-second">
                    <HoloCard className="rounded-3xl border border-slate-300/40 shadow-sm shadow-slate-300/10 bg-gradient-to-b from-slate-800/60 to-slate-900/80 p-6 relative group hover:border-slate-200/60 hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 will-change-transform">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 via-slate-400 to-slate-500 text-slate-950 font-bold shadow-inner border border-slate-200/80 flex items-center justify-center font-display text-base absolute -top-4 left-6 z-30">
                        2
                      </div>
                      <div className="pt-2 relative z-10">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={getPlayerHref(top3[1].id)}
                                className="font-display font-bold text-base text-white hover:text-slate-200 transition"
                              >
                                {top3[1].full_name}
                              </Link>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-slate-200/10 text-slate-200 border-slate-400/30">
                                🥈 #2
                              </span>
                            </div>
                            <p className="text-xs text-slate-300/80 mt-0.5">{translateFaculty(top3[1].major_faculty)}</p>
                          </div>
                          {streak2 >= 3 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600/15 border border-rose-600/40 text-rose-400 text-[10px] font-bold animate-pulse shrink-0">
                              <span>🔥 {streak2} {rootT('common.streak', 'Qələbə Seriyası')}</span>
                            </span>
                          )}
                        </div>
                        <div className="mt-4 flex items-baseline justify-between">
                          <div className="font-mono text-2xl font-extrabold text-slate-100 flex items-baseline gap-1">
                            <NumberTicker
                              value={top3[1].current_elo}
                              startValue={Math.min(500, top3[1].current_elo)}
                              durationMs={850}
                            />
                            <span className="text-xs text-slate-300 font-sans">ELO</span>
                          </div>
                          <span className="text-xs text-emerald-400 font-semibold">
                            {top3[1].matches_played > 0
                              ? Math.round((top3[1].wins / top3[1].matches_played) * 100)
                              : 0}% {t('table_headers.win_rate')}
                          </span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-400/20 text-[11px] text-slate-300/90 flex justify-between">
                          <span>{t('table_headers.matches')}: {top3[1].matches_played}</span>
                          <span>{top3[1].wins}W - {top3[1].losses}L</span>
                        </div>
                      </div>
                    </HoloCard>
                  </div>
                  <div
                    aria-hidden="true"
                    className="w-3/4 h-3 mt-3 rounded-full bg-slate-950/90 blur-md animate-shadow-second pointer-events-none"
                  />
                </motion.div>
              );
            })()}

            {top3[0] && (() => {
              const streak1 = getActiveWinStreak(top3[0]);
              return (
                <motion.div
                  initial={{ opacity: 0, y: 44, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 250, damping: 18, delay: 0.32 }}
                  className="order-1 md:order-2 flex flex-col items-center md:-translate-y-3"
                >
                  <div className="w-full animate-podium-champion">
                    <HoloCard className="rounded-3xl border-2 border-amber-500/80 bg-slate-900 p-7 shadow-md relative group hover:border-amber-400 hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 will-change-transform">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-3xl overflow-hidden z-10"
                      >
                        <div className="animate-champion-shimmer absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-amber-400/15 to-transparent" />
                      </div>

                      <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-display font-black text-xl absolute -top-6 left-1/2 -translate-x-1/2 shadow-sm z-30">
                        <span className="animate-crown-bob text-base leading-none mr-0.5">👑</span>
                        <span>1</span>
                      </div>
                      <div className="pt-4 text-center relative z-20">
                        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2">
                          <div className="inline-block px-3 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
                            {rootT(`roles.${top3[0].role}`)} • #1
                          </div>
                          {streak1 >= 3 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600/15 border border-rose-600/40 text-rose-400 text-[10px] font-bold animate-pulse">
                              <span>🔥 {streak1} {rootT('common.streak', 'Qələbə Seriyası')}</span>
                            </span>
                          )}
                        </div>
                        <Link
                          href={getPlayerHref(top3[0].id)}
                          className="block font-display font-black text-xl text-white hover:text-blue-400 transition"
                        >
                          {top3[0].full_name}
                        </Link>
                        <p className="text-xs text-slate-400">{translateFaculty(top3[0].major_faculty)}</p>
                        <div className="mt-4 font-mono text-3xl font-black text-amber-400 flex items-baseline justify-center gap-1">
                          <NumberTicker
                            value={top3[0].current_elo}
                            startValue={Math.min(500, top3[0].current_elo)}
                            durationMs={850}
                          />
                          <span className="text-xs text-slate-300 font-sans">ELO</span>
                        </div>
                        <div className="mt-2 text-xs text-emerald-500 font-semibold">
                          {top3[0].matches_played > 0
                            ? Math.round((top3[0].wins / top3[0].matches_played) * 100)
                            : 0}% {t('table_headers.win_rate')} ({top3[0].wins}W - {top3[0].losses}L)
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-center">
                          <span>
                            {top3[0].user_type === 'teacher' || top3[0].user_type === 'staff' || top3[0].role === 'coach' || !top3[0].admission_year
                              ? rootT('roles.staff_badge')
                              : `${top3[0].admission_year} ${rootT('roles.admission_suffix')}`}
                          </span>
                        </div>
                      </div>
                    </HoloCard>
                  </div>
                  <div
                    aria-hidden="true"
                    className="w-4/5 h-3.5 mt-3.5 rounded-full bg-amber-500/20 blur-md animate-shadow-champion pointer-events-none"
                  />
                </motion.div>
              );
            })()}

            {top3[2] && (() => {
              const streak3 = getActiveWinStreak(top3[2]);

              return (
                <motion.div
                  initial={{ opacity: 0, y: 36, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.05 }}
                  className="order-3 flex flex-col items-center"
                >
                  <div className="w-full animate-podium-third">
                    <HoloCard className="rounded-3xl border border-amber-800/80 bg-slate-900 p-6 shadow-sm relative group hover:border-amber-500/80 hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 will-change-transform">
                      <div className="w-10 h-10 rounded-full bg-amber-800 text-amber-200 border-2 border-amber-600 flex items-center justify-center font-display font-black text-base absolute -top-4 right-6 shadow-sm z-30">
                        3
                      </div>
                      <div className="pt-2 relative z-10">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link
                              href={getPlayerHref(top3[2].id)}
                              className="font-display font-bold text-base text-white hover:text-blue-400 transition"
                            >
                              {top3[2].full_name}
                            </Link>
                            <p className="text-xs text-slate-400">{translateFaculty(top3[2].major_faculty)}</p>
                          </div>
                          {streak3 >= 3 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600/15 border border-rose-600/40 text-rose-400 text-[10px] font-bold animate-pulse shrink-0">
                              <span>🔥 {streak3} {rootT('common.streak', 'Qələbə Seriyası')}</span>
                            </span>
                          )}
                        </div>
                        <div className="mt-4 flex items-baseline justify-between">
                          <div className="font-mono text-2xl font-extrabold text-white flex items-baseline gap-1">
                            <NumberTicker
                              value={top3[2].current_elo}
                              startValue={Math.min(500, top3[2].current_elo)}
                              durationMs={850}
                            />
                            <span className="text-xs text-slate-400 font-sans">ELO</span>
                          </div>
                          <span className="text-xs text-emerald-500 font-semibold">
                            {top3[2].matches_played > 0
                              ? Math.round((top3[2].wins / top3[2].matches_played) * 100)
                              : 0}% {t('table_headers.win_rate')}
                          </span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
                          <span>{t('table_headers.matches')}: {top3[2].matches_played}</span>
                          <span>{top3[2].wins}W - {top3[2].losses}L</span>
                        </div>
                      </div>
                    </HoloCard>
                  </div>
                  <div
                    aria-hidden="true"
                    className="w-3/4 h-3 mt-3 rounded-full bg-slate-950/90 blur-md animate-shadow-third pointer-events-none"
                  />
                </motion.div>
              );
            })()}
          </div>

          {top5.length === 0 ? (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
              <LeaderboardSkeleton rows={5} />
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      <th className="py-3 px-4">{t('table_headers.rank')}</th>
                      <th className="py-3 px-4">{t('table_headers.player')}</th>
                      <th className="py-3 px-4 hidden sm:table-cell">{t('table_headers.faculty')}</th>
                      <th className="py-3 px-4 text-right">{t('table_headers.points')}</th>
                      <th className="py-3 px-4 text-right hidden md:table-cell">{t('table_headers.matches')}</th>
                      <th className="py-3 px-4 text-right">{t('table_headers.win_rate')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {top5.map((p, idx) => {
                      const winRate = p.matches_played > 0 ? Math.round((p.wins / p.matches_played) * 100) : 0;
                      return (
                        <tr key={p.id} className="hover:bg-slate-800/60 transition-all">
                          <td className="py-3 px-4 font-mono font-bold text-slate-400">
                            #{idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <Link
                              href={getPlayerHref(p.id)}
                              className="font-semibold text-white hover:text-blue-400 transition"
                            >
                              {p.full_name}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">
                            {translateFaculty(p.major_faculty)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-blue-400">
                            <AnimatedCounter value={p.current_elo} />
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300 hidden md:table-cell">
                            {p.matches_played} ({p.wins}W-{p.losses}L)
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-500">
                            {winRate}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
                <Link
                  href="/leaderboard"
                  className="group text-xs font-semibold text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>{t('sections.view_all_leaderboard')}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          )}
        </section>
      </SmoothReveal>

      <section className="space-y-6">
        <HallRulesSection showGuideLink />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <RecentResults matches={matches} onSelectMatch={(m) => setSelectedMatch(m)} />
        </div>

        <SmoothReveal delay={0.1} scale className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>{t('sections.tournament_title')}</span>
                </h3>
              </div>
              <p className="text-[11px] text-slate-400">
                {t('sections.tournament_subtitle')}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <TiltCard className="p-5 rounded-2xl border border-slate-800 bg-slate-900 hover:border-blue-600/40 transition shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-blue-700/20 text-blue-300 border border-blue-600/30">
                  {t('tournament_card.status_badge')}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {t('tournament_card.date_range')}
                </span>
              </div>

              <Link
                href="/tournaments"
                className="block font-display font-bold text-base text-white hover:text-blue-400 transition"
              >
                {t('tournament_card.title')}
              </Link>

              <p className="text-xs text-slate-400 line-clamp-2">
                {t('tournament_card.desc')}
              </p>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <Link
                  href="/tournaments"
                  className="text-xs text-blue-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>{t('sections.view_brackets')}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
                <span className="text-[10px] text-slate-500 font-mono">
                  {t('tournament_card.cta')}
                </span>
              </div>
            </TiltCard>

            {/* BHOS Arcade Discovery Card */}
            <TiltCard className="p-5 rounded-2xl border border-rose-500/25 bg-gradient-to-b from-slate-900 via-slate-900 to-rose-950/20 hover:border-rose-500/40 transition shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-rose-600/20 text-rose-300 border border-rose-500/30">
                  {rootT('arcade.discovery_tag', '🏓 BHOS Arcade • Sonsuz Ralli')}
                </span>
                <span className="text-[11px] text-amber-400 font-mono font-semibold flex items-center gap-1">
                  <span>{rootT('arcade.infinity_badge', '♾️ Sonsuz Ralli')}</span>
                </span>
              </div>

              <Link
                href="/minigame"
                className="block font-display font-bold text-base text-white hover:text-rose-400 transition"
              >
                {rootT('arcade.title', 'Masaüstü Ralli')}
              </Link>

              <p className="text-xs text-slate-400 line-clamp-2">
                {rootT('arcade.discovery_desc', 'Bot rəqiblə sonsuz rallidə reflekslərini sına, sürətlənən topu masada saxla və BANM liderlər lövhəsində 1-ci pilləyə yüksəl!')}
              </p>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <Link
                  href="/minigame"
                  className="text-xs text-rose-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>{rootT('arcade.play_and_compete', 'Oyna və Yarış')}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
                <span className="text-[10px] text-slate-500 font-mono">
                  {rootT('arcade.online_ranking', 'Online Reytinq')}
                </span>
              </div>
            </TiltCard>
          </div>
        </SmoothReveal>
      </div>

      <SmoothReveal delay={0.12}>
        <section id="about" className="pt-8 border-t border-slate-800 scroll-mt-28 space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 sm:p-10 shadow-sm relative overflow-hidden">
            <div className="max-w-3xl space-y-4 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-600/30 bg-blue-700/15 text-blue-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{rootT('brand.title')}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
                {t('about.title')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {t('about.desc')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <Target className="w-5 h-5 text-blue-400" />
                  <h4 className="font-bold text-white text-xs">{t('about.card1_title')}</h4>
                  <p className="text-[11px] text-slate-400">{t('about.card1_desc')}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <Flame className="w-5 h-5 text-rose-500" />
                  <h4 className="font-bold text-white text-xs">{t('about.card2_title')}</h4>
                  <p className="text-[11px] text-slate-400">{t('about.card2_desc')}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <Trophy className="w-5 h-5 text-emerald-500" />
                  <h4 className="font-bold text-white text-xs">{t('about.card3_title')}</h4>
                  <p className="text-[11px] text-slate-400">{t('about.card3_desc')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </SmoothReveal>

      {showMatchModal && (
        <MatchLoggerModal onClose={() => setShowMatchModal(false)} />
      )}
      {selectedMatch && (
        <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      )}
    </div>
  );
}

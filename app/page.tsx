'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BHOSDataStore, isApprovedMatch, getPlayerHref } from '../lib/data/store';
import { PlayerProfile, MatchRecord, Tournament } from '../lib/data/types';
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
import OnboardingBanner from '../components/OnboardingBanner';
import FoundationTournamentBanner from '../components/FoundationTournamentBanner';
import SmoothReveal from '../components/SmoothReveal';
import {
  Trophy,
  ArrowRight,
  Award,
  ShieldCheck,
  Target,
  Flame,
  Swords,
  Crown,
  Medal,
  Gamepad2,
} from 'lucide-react';

const EDITORIAL_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

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
  const [, setTournaments] = useState<Tournament[]>(() => store.getTournaments());
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
    <div className="relative space-y-7 sm:space-y-8">
      <CourtBackground className="fixed opacity-50" />

      <SmoothReveal delay={0.01}>
        <Hero
          currentUser={currentUser}
          totalPlayersCount={totalPlayersCount}
          matchesCount={matches.length}
          leaderElo={top3[0]?.current_elo ?? 966}
        />
      </SmoothReveal>

      {matches.length > 0 && (
        <SmoothReveal delay={0.03}>
          <div className="w-full">
            <LiveMatches matches={matches} onSelectMatch={(m) => setSelectedMatch(m)} />
          </div>
        </SmoothReveal>
      )}

      <SmoothReveal delay={0.04}>
        <FoundationTournamentBanner />
      </SmoothReveal>

      {!currentUser && <OnboardingBanner isLoggedIn={Boolean(currentUser)} />}

      {/* Main Leaderboard Podium & Standings Section */}
      <SmoothReveal delay={0.06}>
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="space-y-1">
              <h2 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-[-0.015em] text-white flex items-center gap-2.5">
                <Award className="w-6 h-6 text-amber-400 shrink-0" />
                <span>{t('sections.leaderboard_title')}</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                {t('sections.leaderboard_subtitle')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
              <Link
                href="/challenges"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--border-hairline)] hover:border-amber-400/40 text-slate-200 hover:text-white text-xs font-semibold transition-colors"
              >
                <Swords className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('cta_challenges') || rootT('nav.challenges', 'Meydan Oxu')}</span>
              </Link>
              <Link
                href="/leaderboard"
                className="group text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
              >
                <span>
                  {t('sections.view_all_leaderboard')} ({totalPlayersCount})
                </span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Grounded Championship Top-3 Podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end pt-5">
            {/* #2 Silver */}
            {top3[1] && (() => {
              const streak2 = getActiveWinStreak(top3[1]);
              const winRate2 =
                top3[1].matches_played > 0
                  ? Math.round((top3[1].wins / top3[1].matches_played) * 100)
                  : 0;

              return (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.34, delay: 0.05, ease: EDITORIAL_EASE }}
                  className="order-2 md:order-1"
                >
                  <div className="relative rounded-2xl border border-slate-400/35 bg-[var(--bg-surface)] p-5 sm:p-6 transition-all duration-200 hover:border-slate-300/65 hover:-translate-y-1 shadow-lg shadow-black/30">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute top-0 inset-x-4 h-[2px] bg-gradient-to-r from-transparent via-slate-300/70 to-transparent"
                    />
                    <div className="h-8 px-3 gap-1.5 rounded-full bg-slate-200 text-slate-950 font-display font-black text-sm leading-none flex items-center justify-center absolute -top-4 left-5 ring-4 ring-[#070A11] z-20">
                      <Medal className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span className="tabular-nums">#2</span>
                    </div>

                    <div className="pt-2 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={getPlayerHref(top3[1].id)}
                            className="block font-display font-extrabold text-xl text-white hover:text-slate-200 transition-colors truncate"
                          >
                            {top3[1].full_name}
                          </Link>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {translateFaculty(top3[1].major_faculty)}
                          </p>
                        </div>
                        {streak2 >= 3 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-semibold shrink-0 tabular-nums">
                            <Flame className="w-3 h-3 text-rose-400" />
                            <span>{streak2}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline justify-between gap-2">
                        <div className="font-display text-3xl font-black text-slate-100 tabular-nums leading-none flex items-baseline gap-1.5">
                          <NumberTicker
                            value={top3[1].current_elo}
                            startValue={Math.min(500, top3[1].current_elo)}
                            durationMs={750}
                          />
                          <span className="text-[11px] font-mono font-semibold text-slate-400 tracking-wider">
                            ELO
                          </span>
                        </div>
                        <span className="font-mono text-xs text-emerald-400 font-semibold tabular-nums">
                          {winRate2}% {t('table_headers.win_rate')}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-slate-300"
                            style={{ width: `${winRate2}%` }}
                          />
                        </div>
                        <div className="pt-2 border-t border-[var(--border-hairline)] text-[11px] font-mono tabular-nums text-slate-400 flex justify-between">
                          <span>
                            {t('table_headers.matches')}: {top3[1].matches_played}
                          </span>
                          <span>
                            <span className="text-emerald-400 font-semibold">{top3[1].wins}W</span>
                            {' – '}
                            <span className="text-rose-400 font-semibold">{top3[1].losses}L</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* #1 Championship Gold */}
            {top3[0] && (() => {
              const streak1 = getActiveWinStreak(top3[0]);
              const winRate1 =
                top3[0].matches_played > 0
                  ? Math.round((top3[0].wins / top3[0].matches_played) * 100)
                  : 0;

              return (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.34, delay: 0.02, ease: EDITORIAL_EASE }}
                  className="order-1 md:order-2 md:-translate-y-2"
                >
                  <div className="relative rounded-2xl border border-amber-400/55 bg-[var(--bg-surface)] p-6 sm:p-7 transition-all duration-200 hover:border-amber-400/85 hover:-translate-y-1 shadow-2xl shadow-black/50">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute top-0 inset-x-4 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent"
                    />
                    <div className="h-9 min-w-[4.5rem] px-3.5 gap-1.5 rounded-full bg-amber-400 text-slate-950 font-display font-black text-base leading-none flex items-center justify-center absolute -top-[18px] left-1/2 -translate-x-1/2 shadow-md ring-4 ring-[#070A11] z-20">
                      <Crown className="w-4 h-4 stroke-[2.5] shrink-0" />
                      <span className="tabular-nums">#1</span>
                    </div>

                    <div className="pt-3 text-center space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-md bg-amber-400/12 text-amber-300 text-[10px] font-semibold uppercase tracking-[0.08em] border border-amber-400/30">
                            {rootT(`roles.${top3[0].role}`)}
                          </span>
                          {streak1 >= 3 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-semibold tabular-nums">
                              <Flame className="w-3 h-3 text-rose-400" />
                              <span>
                                {streak1} {rootT('common.streak', 'Qələbə Seriyası')}
                              </span>
                            </span>
                          )}
                        </div>

                        <Link
                          href={getPlayerHref(top3[0].id)}
                          className="block font-display font-black text-2xl sm:text-[1.65rem] text-white hover:text-amber-300 transition-colors tracking-tight"
                        >
                          {top3[0].full_name}
                        </Link>
                        <p className="text-xs text-slate-400">
                          {translateFaculty(top3[0].major_faculty)}
                        </p>
                      </div>

                      <div className="font-display text-4xl sm:text-[2.6rem] font-black text-amber-400 tabular-nums leading-none flex items-baseline justify-center gap-1.5">
                        <NumberTicker
                          value={top3[0].current_elo}
                          startValue={Math.min(500, top3[0].current_elo)}
                          durationMs={750}
                        />
                        <span className="text-xs font-mono font-semibold text-slate-300 tracking-wider">
                          ELO
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400"
                            style={{ width: `${winRate1}%` }}
                          />
                        </div>
                        <div className="text-xs font-mono tabular-nums text-emerald-400 font-semibold">
                          {winRate1}% {t('table_headers.win_rate')} ({top3[0].wins}W – {top3[0].losses}L)
                        </div>
                        <div className="pt-2.5 border-t border-[var(--border-hairline)] text-[11px] text-slate-400 flex justify-center">
                          <span>
                            {top3[0].user_type === 'teacher' ||
                            top3[0].user_type === 'staff' ||
                            top3[0].role === 'coach' ||
                            !top3[0].admission_year
                              ? rootT('roles.staff_badge')
                              : `${top3[0].admission_year} ${rootT('roles.admission_suffix')}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* #3 Bronze */}
            {top3[2] && (() => {
              const streak3 = getActiveWinStreak(top3[2]);
              const winRate3 =
                top3[2].matches_played > 0
                  ? Math.round((top3[2].wins / top3[2].matches_played) * 100)
                  : 0;

              return (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.34, delay: 0.08, ease: EDITORIAL_EASE }}
                  className="order-3"
                >
                  <div className="relative rounded-2xl border border-amber-700/45 bg-[var(--bg-surface)] p-5 sm:p-6 transition-all duration-200 hover:border-amber-600/75 hover:-translate-y-1 shadow-lg shadow-black/30">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute top-0 inset-x-4 h-[2px] bg-gradient-to-r from-transparent via-amber-600/75 to-transparent"
                    />
                    <div className="h-8 px-3 gap-1.5 rounded-full bg-amber-700 text-amber-100 border border-amber-500/40 font-display font-black text-sm leading-none flex items-center justify-center absolute -top-4 left-5 ring-4 ring-[#070A11] z-20">
                      <Medal className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span className="tabular-nums">#3</span>
                    </div>

                    <div className="pt-2 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={getPlayerHref(top3[2].id)}
                            className="block font-display font-extrabold text-xl text-white hover:text-amber-300 transition-colors truncate"
                          >
                            {top3[2].full_name}
                          </Link>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {translateFaculty(top3[2].major_faculty)}
                          </p>
                        </div>
                        {streak3 >= 3 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-semibold shrink-0 tabular-nums">
                            <Flame className="w-3 h-3 text-rose-400" />
                            <span>{streak3}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline justify-between gap-2">
                        <div className="font-display text-3xl font-black text-white tabular-nums leading-none flex items-baseline gap-1.5">
                          <NumberTicker
                            value={top3[2].current_elo}
                            startValue={Math.min(500, top3[2].current_elo)}
                            durationMs={750}
                          />
                          <span className="text-[11px] font-mono font-semibold text-slate-400 tracking-wider">
                            ELO
                          </span>
                        </div>
                        <span className="font-mono text-xs text-emerald-400 font-semibold tabular-nums">
                          {winRate3}% {t('table_headers.win_rate')}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-600"
                            style={{ width: `${winRate3}%` }}
                          />
                        </div>
                        <div className="pt-2 border-t border-[var(--border-hairline)] text-[11px] font-mono tabular-nums text-slate-400 flex justify-between">
                          <span>
                            {t('table_headers.matches')}: {top3[2].matches_played}
                          </span>
                          <span>
                            <span className="text-emerald-400 font-semibold">{top3[2].wins}W</span>
                            {' – '}
                            <span className="text-rose-400 font-semibold">{top3[2].losses}L</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </div>

          {/* Top-5 Compact Standings Table */}
          {top5.length === 0 ? (
            <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-hidden">
              <LeaderboardSkeleton rows={5} />
            </div>
          ) : (
            <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-hairline)] bg-[#070A11]/85 text-[10px] uppercase tracking-[0.08em] font-semibold text-slate-400">
                      <th className="py-3 px-4 w-16">{t('table_headers.rank')}</th>
                      <th className="py-3 px-4">{t('table_headers.player')}</th>
                      <th className="py-3 px-4 hidden sm:table-cell">{t('table_headers.faculty')}</th>
                      <th className="py-3 px-4 text-right">{t('table_headers.points')}</th>
                      <th className="py-3 px-4 text-right hidden md:table-cell">{t('table_headers.matches')}</th>
                      <th className="py-3 px-4 text-right">{t('table_headers.win_rate')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-hairline)] text-xs">
                    {top5.map((p, idx) => {
                      const rank = idx + 1;
                      const winRate =
                        p.matches_played > 0 ? Math.round((p.wins / p.matches_played) * 100) : 0;
                      return (
                        <tr
                          key={p.id}
                          className={`transition-colors ${
                            rank === 1
                              ? 'bg-amber-400/[0.03] hover:bg-amber-400/[0.06]'
                              : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono tabular-nums font-bold">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold ${
                                rank === 1
                                  ? 'bg-amber-400 text-slate-950'
                                  : rank === 2
                                  ? 'bg-slate-300 text-slate-950'
                                  : rank === 3
                                  ? 'bg-amber-700 text-amber-100'
                                  : 'bg-white/[0.05] text-slate-300'
                              }`}
                            >
                              {rank}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Link
                              href={getPlayerHref(p.id)}
                              className="font-semibold text-white hover:text-blue-400 transition-colors"
                            >
                              {p.full_name}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">
                            {translateFaculty(p.major_faculty)}
                          </td>
                          <td className="py-3 px-4 text-right font-display text-base font-black tabular-nums text-white">
                            <AnimatedCounter value={p.current_elo} />
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300 hidden md:table-cell">
                            {p.matches_played} ({p.wins}W–{p.losses}L)
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-400">
                            {winRate}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-[var(--border-hairline)] bg-[#070A11]/60 flex justify-end">
                <Link
                  href="/leaderboard"
                  className="group text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1"
                >
                  <span>{t('sections.view_all_leaderboard')}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          )}
        </section>
      </SmoothReveal>

      <SmoothReveal delay={0.04}>
        <div className="w-full">
          <ArcadeDiscoveryBanner />
        </div>
      </SmoothReveal>

      <section className="space-y-6">
        <HallRulesSection showGuideLink />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        <div className="lg:col-span-2">
          <RecentResults matches={matches} onSelectMatch={(m) => setSelectedMatch(m)} />
        </div>

        <SmoothReveal delay={0.05} className="space-y-4">
          <div className="space-y-0.5">
            <h3 className="font-display text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>{t('sections.tournament_title')}</span>
            </h3>
            <p className="text-[11px] text-slate-400">{t('sections.tournament_subtitle')}</p>
          </div>

          <div className="space-y-3">
            <div className="p-5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-colors space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/25">
                  {t('tournament_card.status_badge')}
                </span>
                <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                  {t('tournament_card.date_range')}
                </span>
              </div>

              <Link
                href="/tournaments"
                className="block font-display font-extrabold text-lg text-white hover:text-blue-400 transition-colors"
              >
                {t('tournament_card.title')}
              </Link>

              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {t('tournament_card.desc')}
              </p>

              <div className="pt-2.5 border-t border-[var(--border-hairline)] flex items-center justify-between">
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
            </div>

            {/* BHOS Arcade Sidebar Card */}
            <div className="p-5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-rose-500/35 transition-colors space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/25">
                  <Gamepad2 className="w-3 h-3 text-rose-400" />
                  <span>{rootT('arcade.discovery_tag', 'BHOS Arcade • Sonsuz Ralli')}</span>
                </span>
              </div>

              <Link
                href="/minigame"
                className="block font-display font-extrabold text-lg text-white hover:text-rose-400 transition-colors"
              >
                {rootT('arcade.title', 'Masaüstü Ralli')}
              </Link>

              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {rootT(
                  'arcade.discovery_desc',
                  'Bot rəqiblə sonsuz rallidə reflekslərini sına, sürətlənən topu masada saxla və BANM liderlər lövhəsində 1-ci pilləyə yüksəl!'
                )}
              </p>

              <div className="pt-2.5 border-t border-[var(--border-hairline)] flex items-center justify-between">
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
            </div>
          </div>
        </SmoothReveal>
      </div>

      {/* Institutional About Section */}
      <SmoothReveal delay={0.05}>
        <section id="about" className="pt-8 border-t border-[var(--border-hairline)] scroll-mt-24">
          <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 sm:p-9 relative overflow-hidden">
            <div className="max-w-4xl space-y-5 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-[var(--border-hairline)] bg-[#070A11]/70 text-slate-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>{rootT('brand.title')}</span>
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
                  {t('about.title')}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                  {t('about.desc')}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 rounded-xl border border-[var(--border-hairline)] bg-[#070A11]/60 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-hairline)] overflow-hidden">
                <div className="p-4 sm:p-5 space-y-1.5">
                  <Target className="w-4 h-4 text-blue-400" />
                  <h4 className="font-bold text-white text-xs">{t('about.card1_title')}</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{t('about.card1_desc')}</p>
                </div>
                <div className="p-4 sm:p-5 space-y-1.5">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <h4 className="font-bold text-white text-xs">{t('about.card2_title')}</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{t('about.card2_desc')}</p>
                </div>
                <div className="p-4 sm:p-5 space-y-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-white text-xs">{t('about.card3_title')}</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{t('about.card3_desc')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </SmoothReveal>

      {showMatchModal && <MatchLoggerModal onClose={() => setShowMatchModal(false)} />}
      {selectedMatch && (
        <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      )}
    </div>
  );
}

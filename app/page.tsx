'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BHOSDataStore, isApprovedMatch } from '../lib/data/store';
import { PlayerProfile, MatchRecord, Tournament } from '../lib/data/types';
import { useTranslation, useTranslations } from '../lib/i18n';
import HallRulesSection from '../components/HallRulesSection';
import MatchLoggerModal from '../components/MatchLoggerModal';
import NumberTicker from '../components/NumberTicker';
import AnimatedCounter from '../components/AnimatedCounter';
import CourtBackground from '../components/CourtBackground';
import MagneticButton from '../components/MagneticButton';
import LeaderboardSkeleton from '../components/LeaderboardSkeleton';
import HoloCard from '../components/HoloCard';
import TiltCard from '../components/TiltCard';
import EloToastBadge from '../components/EloToastBadge';
import OnboardingBanner from '../components/OnboardingBanner';
import SmoothReveal, { SmoothRevealItem } from '../components/SmoothReveal';
import {
  Trophy,
  Table as TableIcon,
  Activity,
  ArrowRight,
  Award,
  Zap,
  ShieldCheck,
  MessageCircle,
  ExternalLink,
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
    if (cached.length >= verified.length && cached.length > 0) return cached;
    return verified.length > 0 ? verified : all;
  });
  const [totalPlayersCount, setTotalPlayersCount] = useState<number>(() => {
    const all = store.getProfiles();
    const verified = store.getVerifiedProfiles();
    const cached = store.getCachedLeaderboard();
    return Math.max(all.length, verified.length, cached.length);
  });
  const [matches, setMatches] = useState<MatchRecord[]>(() => {
    const resolved = store.getResolvedMatchIds();
    return store.getMatches().filter((m) => isApprovedMatch(m, resolved));
  });
  const [tournaments, setTournaments] = useState<Tournament[]>(() => store.getTournaments());
  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(store.getCurrentUser());
  const [showMatchModal, setShowMatchModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const update = () => {
      if (!isMounted) return;
      const cached = store.getCachedLeaderboard();
      const verified = store.getVerifiedProfiles();
      const all = store.getProfiles();
      const maxCount = Math.max(all.length, verified.length, cached.length);
      setTotalPlayersCount(maxCount);

      const resolved = store.getResolvedMatchIds();
      if (cached.length >= maxCount && cached.length > 0) {
        setProfiles(cached);
      } else if (verified.length > 0) {
        setProfiles(verified);
      } else {
        setProfiles(all);
      }
      setMatches(store.getMatches().filter((m) => isApprovedMatch(m, resolved)));
      setTournaments(store.getTournaments());
      setCurrentUser(store.getCurrentUser());
    };

    update();
    void store.fetchLeaderboardStandings().then((allRows) => {
      if (isMounted) {
        const verified = store.getVerifiedProfiles();
        const all = store.getProfiles();
        const maxCount = Math.max(all.length, verified.length, allRows.length);
        setTotalPlayersCount(maxCount);
        if (allRows.length >= maxCount) {
          setProfiles(allRows);
        } else if (verified.length > 0) {
          setProfiles(verified);
        } else {
          setProfiles(all);
        }
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
  const recentMatches = matches.slice(0, 5);

  const translateFaculty = (faculty?: string) => {
    if (!faculty) return 'BHOS';
    const key = `faculties.${faculty}`;
    const translated = rootT(key);
    return translated === key ? faculty : translated;
  };

  return (
    <div className="relative space-y-12">
      <CourtBackground className="fixed" />
      <SmoothReveal delay={0.01}>
        <div className="flex justify-center -mt-3">
          <div className="inline-flex flex-wrap sm:flex-nowrap items-center justify-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl sm:rounded-full bg-[#080D16]/85 backdrop-blur-md border border-white/10 shadow-[0_0_28px_rgba(59,130,246,0.12)]">
            <Link
              href="/leaderboard"
              className="group inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-slate-200 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 hover:border-cyan-400/50 transition-all shadow-sm"
            >
              <Trophy className="w-3.5 h-3.5 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="whitespace-nowrap">{t('cta_view_leaderboard')}</span>
            </Link>

            <Link
              href="/tables"
              className="group inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-slate-200 hover:text-white bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/25 hover:border-pink-400/50 transition-all shadow-sm"
            >
              <TableIcon className="w-3.5 h-3.5 text-pink-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="whitespace-nowrap">{t('sections.tables_title')}</span>
            </Link>

            <a
              href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-slate-200 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 hover:border-emerald-400/50 transition-all shadow-sm"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="whitespace-nowrap">{t('sections.community_title')}</span>
            </a>
          </div>
        </div>
      </SmoothReveal>

      <SmoothReveal delay={0.03}>
        <section className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl min-h-[580px] md:min-h-[660px] flex flex-col justify-between p-6 sm:p-10 lg:p-12">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-100"
            style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-slate-950/60" />
          <CourtBackground />

          <div className="relative z-20 flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-white/15 bg-black/40 backdrop-blur-md text-xs font-semibold text-white shadow-lg">
              <img
                src="/images/bhos-crest.png"
                alt="BHOS"
                className="w-4 h-4 object-contain filter drop-shadow-[0_0_6px_rgba(0,229,255,0.8)]"
              />
              <span className="text-cyan-400 font-bold tracking-wide">BHOS TABLE TENNIS</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300">{t('badge')}</span>
            </div>

            <a
              href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 backdrop-blur-md text-xs font-semibold text-emerald-300 hover:bg-emerald-900/50 transition-all shadow-lg"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <MessageCircle className="w-3.5 h-3.5 fill-emerald-400" />
              <span>{rootT('hero.community_tag')}</span>
              <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>

          <SmoothReveal staggerChildren={0.1} className="relative z-20 max-w-2xl space-y-6 pt-24 pb-2">
            <SmoothRevealItem className="space-y-3">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black text-white tracking-tight leading-[1.08] drop-shadow-2xl">
                <span className="block">{t('hero_title_1')}</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-[#3B82F6] to-emerald-400">
                  {t('hero_title_2')}
                </span>
              </h1>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans max-w-xl drop-shadow">
                {t('hero_desc')}
              </p>
            </SmoothRevealItem>

            <SmoothRevealItem className="flex flex-wrap items-center gap-3 pt-2">
              <MagneticButton>
                <Link
                  href={currentUser ? '/log-match' : '/login'}
                  className="px-6 py-3 rounded-full bg-[#3B82F6] hover:bg-blue-500 text-white font-display font-bold text-xs sm:text-sm shadow-xl shadow-blue-500/25 active:scale-95 transition flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{t('cta_join')}</span>
                </Link>
              </MagneticButton>

              <MagneticButton>
                <Link
                  href="/leaderboard"
                  className="px-6 py-3 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs sm:text-sm shadow-xl shadow-cyan-500/25 active:scale-95 transition flex items-center gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  <span>{t('cta_view_leaderboard')}</span>
                </Link>
              </MagneticButton>

              <Link
                href="/tables"
                className="px-6 py-3 rounded-full border border-white/20 bg-slate-950/60 hover:bg-slate-900/80 backdrop-blur-md text-white font-display font-semibold text-xs sm:text-sm transition flex items-center gap-2"
              >
                <TableIcon className="w-4 h-4 text-pink-400" />
                <span>{rootT('hero.hall_tables_btn')}</span>
              </Link>

              {(currentUser?.role === 'president' || currentUser?.role === 'coach') && (
                <button
                  onClick={() => setShowMatchModal(true)}
                  className="px-5 py-3 rounded-full border border-cyan-400/40 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-display font-semibold text-xs sm:text-sm transition flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>{rootT('nav.log_match')}</span>
                </button>
              )}
            </SmoothRevealItem>
          </SmoothReveal>

          <div className="relative z-20 pt-6 mt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {t('hero_stats.players')}
              </span>
              <div className="text-xl sm:text-2xl font-mono font-black text-white flex items-baseline gap-1.5">
                <NumberTicker value={totalPlayersCount} />
                <span className="text-xs font-sans text-slate-400">{rootT('hero.players_count')}</span>
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {t('hero_stats.matches')}
              </span>
              <div className="text-xl sm:text-2xl font-mono font-black text-cyan-400 flex items-baseline gap-1.5">
                <NumberTicker value={matches.length} />
                <span className="text-xs font-sans text-slate-400">{rootT('hero.official_count')}</span>
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {t('hero_stats.tables')}
              </span>
              <div className="text-xl sm:text-2xl font-mono font-black text-pink-400">
                {rootT('hero.stats_tables_sub')}
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {rootT('hero.stats_leader')}
              </span>
              <div className="text-xl sm:text-2xl font-mono font-black text-amber-400 flex items-baseline gap-1">
                <NumberTicker value={top3[0]?.current_elo ?? 999} />
                <span className="text-xs font-sans text-slate-400">ELO</span>
              </div>
            </div>
          </div>
        </section>
      </SmoothReveal>

      <SmoothReveal delay={0.04}>
        <OnboardingBanner />
      </SmoothReveal>

      <SmoothReveal delay={0.08}>
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-lg bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#3B82F6] font-mono text-xs font-black">
                  {t('sections.leaderboard_num')}
                </span>
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
              className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span>{t('sections.view_all_leaderboard')} ({totalPlayersCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {top3[1] && (
              <HoloCard className="order-2 md:order-1 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl relative group hover:border-slate-600 transition">
                <div className="w-10 h-10 rounded-full bg-slate-300 text-slate-950 border-2 border-white flex items-center justify-center font-display font-black text-base absolute -top-4 left-6 shadow z-30">
                  2
                </div>
                <div className="pt-2 relative z-10">
                  <Link
                    href={`/players/${top3[1].id}`}
                    className="font-display font-bold text-base text-white hover:text-cyan-400 transition"
                  >
                    {top3[1].full_name}
                  </Link>
                  <p className="text-xs text-slate-400">{translateFaculty(top3[1].major_faculty)}</p>
                  <div className="mt-4 flex items-baseline justify-between">
                    <div className="font-mono text-2xl font-extrabold text-white flex items-baseline gap-1">
                      <NumberTicker value={top3[1].current_elo} />
                      <span className="text-xs text-slate-400 font-sans">ELO</span>
                    </div>
                    <span className="text-xs text-emerald-400 font-semibold">
                      {Math.round((top3[1].wins / (top3[1].matches_played || 1)) * 100)}% {t('table_headers.win_rate')}
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400 flex justify-between">
                    <span>{t('table_headers.matches')}: {top3[1].matches_played}</span>
                    <span>{top3[1].wins}W - {top3[1].losses}L</span>
                  </div>
                </div>
              </HoloCard>
            )}

            {top3[0] && (
              <HoloCard className="order-1 md:order-2 rounded-3xl border-2 border-amber-400/80 bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-slate-900 p-7 shadow-2xl relative group hover:border-amber-400 transition md:-translate-y-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center font-display font-black text-xl absolute -top-6 left-1/2 -translate-x-1/2 shadow-xl shadow-amber-500/30 z-30">
                  1
                </div>
                <div className="pt-4 text-center relative z-10">
                  <div className="inline-block px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-2 border border-amber-500/30">
                    {rootT(`roles.${top3[0].role}`)} • #1
                  </div>
                  <Link
                    href={`/players/${top3[0].id}`}
                    className="block font-display font-black text-xl text-white hover:text-cyan-400 transition"
                  >
                    {top3[0].full_name}
                  </Link>
                  <p className="text-xs text-slate-400">{translateFaculty(top3[0].major_faculty)}</p>
                  <div className="mt-4 font-mono text-3xl font-black text-amber-400 flex items-baseline justify-center gap-1">
                    <NumberTicker value={top3[0].current_elo} />
                    <span className="text-xs text-slate-300 font-sans">ELO</span>
                  </div>
                  <div className="mt-2 text-xs text-emerald-400 font-semibold">
                    {Math.round((top3[0].wins / (top3[0].matches_played || 1)) * 100)}% {t('table_headers.win_rate')} ({top3[0].wins}W - {top3[0].losses}L)
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400 flex justify-center">
                    <span>
                      {top3[0].user_type === 'teacher' || top3[0].user_type === 'staff' || top3[0].role === 'coach' || !top3[0].admission_year
                        ? rootT('roles.staff_badge')
                        : `${top3[0].admission_year} ${rootT('roles.admission_suffix')}`}
                    </span>
                  </div>
                </div>
              </HoloCard>
            )}

            {top3[2] && (
              <HoloCard className="order-3 rounded-3xl border border-amber-800/80 bg-slate-900/80 p-6 shadow-xl relative group hover:border-amber-700 transition">
                <div className="w-10 h-10 rounded-full bg-amber-800 text-amber-200 border-2 border-amber-600 flex items-center justify-center font-display font-black text-base absolute -top-4 right-6 shadow z-30">
                  3
                </div>
                <div className="pt-2 relative z-10">
                  <Link
                    href={`/players/${top3[2].id}`}
                    className="font-display font-bold text-base text-white hover:text-cyan-400 transition"
                  >
                    {top3[2].full_name}
                  </Link>
                  <p className="text-xs text-slate-400">{translateFaculty(top3[2].major_faculty)}</p>
                  <div className="mt-4 flex items-baseline justify-between">
                    <div className="font-mono text-2xl font-extrabold text-white flex items-baseline gap-1">
                      <NumberTicker value={top3[2].current_elo} />
                      <span className="text-xs text-slate-400 font-sans">ELO</span>
                    </div>
                    <span className="text-xs text-emerald-400 font-semibold">
                      {Math.round((top3[2].wins / (top3[2].matches_played || 1)) * 100)}% {t('table_headers.win_rate')}
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400 flex justify-between">
                    <span>{t('table_headers.matches')}: {top3[2].matches_played}</span>
                    <span>{top3[2].wins}W - {top3[2].losses}L</span>
                  </div>
                </div>
              </HoloCard>
            )}
          </div>

          {top5.length === 0 ? (
            <div
              className="rounded-2xl bg-[#0F1623]/90 backdrop-blur-md overflow-hidden shadow-xl"
              style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
            >
              <LeaderboardSkeleton rows={5} />
            </div>
          ) : (
            <div
              className="rounded-2xl bg-[#0F1623]/90 backdrop-blur-md overflow-hidden shadow-xl"
              style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-[#131C2B]/80 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      <th className="py-3 px-4">{t('table_headers.rank')}</th>
                      <th className="py-3 px-4">{t('table_headers.player')}</th>
                      <th className="py-3 px-4 hidden sm:table-cell">{t('table_headers.faculty')}</th>
                      <th className="py-3 px-4 text-right">{t('table_headers.points')}</th>
                      <th className="py-3 px-4 text-right hidden md:table-cell">{t('table_headers.matches')}</th>
                      <th className="py-3 px-4 text-right">{t('table_headers.win_rate')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {top5.map((p, idx) => {
                      const winRate = p.matches_played > 0 ? Math.round((p.wins / p.matches_played) * 100) : 0;
                      return (
                        <tr key={p.id} className="hover:bg-[#131C2B] transition-all">
                          <td className="py-3 px-4 font-mono font-bold text-slate-400">
                            #{idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <Link
                              href={`/players/${p.id}`}
                              className="font-semibold text-white hover:text-cyan-400 transition"
                            >
                              {p.full_name}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">
                            {translateFaculty(p.major_faculty)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-[#3B82F6]">
                            <AnimatedCounter value={p.current_elo} />
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300 hidden md:table-cell">
                            {p.matches_played} ({p.wins}W-{p.losses}L)
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">
                            {winRate}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-white/10 bg-[#131C2B]/40 flex justify-end">
                <Link
                  href="/leaderboard"
                  className="text-xs font-semibold text-cyan-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>{t('sections.view_all_leaderboard')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
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
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span>{rootT('home_recent.title')}</span>
            </h3>
            <Link
              href="/matches"
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>{rootT('home_recent.view_all')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentMatches.length === 0 ? (
              <div className="p-8 rounded-2xl border border-white/10 bg-slate-900/60 text-center space-y-2">
                <Activity className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">
                  {t('recent_empty_title')}
                </p>
                <p className="text-xs text-slate-500">
                  {t('recent_empty_desc')}
                </p>
              </div>
            ) : (
              recentMatches.map((m) => {
                const p1Won = m.player1_score > m.player2_score;
                return (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl border border-white/10 bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-slate-950 border border-white/10 font-mono font-black text-lg text-white shadow-inner">
                        <span>{m.player1_score}</span>
                        <span className="text-[10px] text-slate-500 -mt-1 font-normal">:</span>
                        <span>{m.player2_score}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/players/${m.player1_id}`}
                            className={`text-sm font-semibold hover:text-cyan-400 transition ${
                              p1Won ? 'text-white font-bold' : 'text-slate-400'
                            }`}
                          >
                            {m.player1_name}
                          </Link>
                          {p1Won && <Award className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/players/${m.player2_id}`}
                            className={`text-sm font-semibold hover:text-cyan-400 transition ${
                              !p1Won ? 'text-white font-bold' : 'text-slate-400'
                            }`}
                          >
                            {m.player2_name}
                          </Link>
                          {!p1Won && <Award className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>

                        <div className="text-[11px] font-mono text-slate-500">
                          {rootT('home_recent.sets_label')}: {m.set_scores}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-white/10">
                      <EloToastBadge delta={m.elo_delta} size="sm" />
                      <span className="text-[10px] text-slate-500 mt-1">
                        {new Date(m.match_date).toLocaleDateString()}
                      </span>
                      {m.tournament_title && (
                        <span className="mt-1 text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 truncate max-w-[150px]">
                          {m.tournament_title}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <SmoothReveal delay={0.1} scale className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-black">
                  {t('sections.tournament_num')}
                </span>
                <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>{t('sections.tournament_title')}</span>
                </h3>
              </div>
              <p className="text-[11px] text-slate-400">
                {t('sections.tournament_subtitle')}
              </p>
            </div>
            <Link
              href="/tournaments"
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>{t('sections.view_brackets')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {tournaments.map((tourn) => (
              <TiltCard
                key={tourn.id}
                className="p-5 rounded-2xl border border-white/10 bg-slate-900/80 hover:border-cyan-500/40 transition shadow-md space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {t('tournament_card.status_badge')}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {t('tournament_card.date_range')}
                  </span>
                </div>

                <Link
                  href="/tournaments"
                  className="block font-display font-bold text-base text-white hover:text-cyan-400 transition"
                >
                  {t('tournament_card.title')}
                </Link>

                <p className="text-xs text-slate-400 line-clamp-2">
                  {t('tournament_card.desc')}
                </p>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <Link
                    href="/tournaments"
                    className="text-xs text-cyan-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>{t('sections.view_brackets')}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {t('tournament_card.cta')}
                  </span>
                </div>
              </TiltCard>
            ))}
          </div>
        </SmoothReveal>
      </div>

      <SmoothReveal delay={0.12}>
        <section id="about" className="pt-8 border-t border-white/10 scroll-mt-28 space-y-6">
          <div className="rounded-3xl border border-emerald-500/25 bg-gradient-to-r from-[#0F1623] via-[#131C2B] to-[#0F1623] p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-black">
                  {t('sections.community_num')}
                </span>
                <h2 className="text-xl sm:text-2xl font-display font-black text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                  <span>{t('sections.community_title')}</span>
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {t('sections.community_subtitle')}
              </p>
            </div>

            <MagneticButton className="shrink-0">
              <a
                href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs sm:text-sm shadow-xl shadow-emerald-500/25 active:scale-95 transition shrink-0"
              >
                <MessageCircle className="w-4 h-4 fill-slate-950" />
                <span>{t('sections.join_whatsapp')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </MagneticButton>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-8 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="max-w-3xl space-y-4 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-semibold">
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
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <Target className="w-5 h-5 text-cyan-400" />
                  <h4 className="font-bold text-white text-xs">{t('about.card1_title')}</h4>
                  <p className="text-[11px] text-slate-400">{t('about.card1_desc')}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <h4 className="font-bold text-white text-xs">{t('about.card2_title')}</h4>
                  <p className="text-[11px] text-slate-400">{t('about.card2_desc')}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <Users className="w-5 h-5 text-emerald-400" />
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
    </div>
  );
}

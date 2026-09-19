'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BHOSDataStore } from '../lib/data/store';
import { PlayerProfile, MatchRecord, Tournament } from '../lib/data/types';
import { useTranslation } from '../lib/i18n';
import { 
  Trophy, 
  Table as TableIcon, 
  Activity, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Users, 
  Award, 
  Zap, 
  ShieldCheck, 
  CheckCircle2 
} from 'lucide-react';
import MatchLoggerModal from '../components/MatchLoggerModal';

export default function HomePage() {
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [currentUser, setCurrentUser] = useState<PlayerProfile>(store.getCurrentUser());
  const [showMatchModal, setShowMatchModal] = useState(false);

  useEffect(() => {
    const update = () => {
      setProfiles(store.getProfiles());
      setMatches(store.getMatches());
      setTournaments(store.getTournaments());
      setCurrentUser(store.getCurrentUser());
    };
    update();
    return store.subscribe(update);
  }, [store]);

  const top3 = profiles.slice(0, 3);
  const recentMatches = matches.slice(0, 5);
  const ongoingTournaments = tournaments.filter((t) => t.status === 'ongoing');

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden border border-bhos-border bg-gradient-to-br from-bhos-midnight via-[#0A192F] to-[#041022] p-8 md:p-12 shadow-2xl">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-bhos-cyan/30 bg-bhos-cyan/10 text-bhos-cyan text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <span>tabletennis.az Inspired • Official BHOS ELO System</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-display font-black text-white tracking-tight leading-tight">
              {t('brand.title')}
            </h1>

            <p className="text-base md:text-lg text-slate-300 leading-relaxed">
              {t('brand.subtitle')}. Real-time ITTF-compliant ELO tracking, visual knockout tournament brackets, and sports hall table reservation for Baku Higher Oil School engineers and athletes.
            </p>

            {/* Call to action buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/leaderboard"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-bhos-cyan to-bhos-blue text-bhos-navy font-display font-bold text-sm hover:opacity-95 shadow-lg shadow-cyan-500/25 active:scale-95 transition flex items-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              <span>{t('nav.leaderboard')}</span>
            </Link>

            <Link
              href="/tables"
              className="px-6 py-3 rounded-xl border border-bhos-border bg-bhos-darkCard/80 hover:bg-slate-800 text-white font-display font-semibold text-sm hover:border-slate-600 transition flex items-center gap-2"
            >
              <TableIcon className="w-4 h-4 text-bhos-cyan" />
              <span>{t('nav.tables')}</span>
            </Link>

            {(currentUser.role === 'president' || currentUser.role === 'coach') && (
              <button
                onClick={() => setShowMatchModal(true)}
                className="px-5 py-3 rounded-xl border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-display font-semibold text-sm transition flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>{t('nav.log_match')}</span>
              </button>
            )}
          </div>
        </div>

          {/* BHOS Official Emblem Display Card */}
          <div className="hidden lg:flex flex-col items-center justify-center p-6 rounded-2xl bg-white/95 text-slate-900 shadow-2xl border border-white/30 max-w-[240px] text-center shrink-0">
            <img
              src="/images/bhos-logo.png"
              alt="Baku Higher Oil School"
              className="w-36 h-auto object-contain drop-shadow"
            />
            <div className="mt-3 pt-3 border-t border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              Baku Higher Oil School
            </div>
          </div>
        </div>

        {/* Live Quick Stats Bar */}
        <div className="mt-10 pt-8 border-t border-bhos-border/60 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {t('admin.total_players')}
            </span>
            <div className="text-2xl md:text-3xl font-mono font-bold text-white">
              {profiles.length}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {t('admin.total_matches')}
            </span>
            <div className="text-2xl md:text-3xl font-mono font-bold text-bhos-cyan">
              {matches.length}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {t('admin.active_tournaments')}
            </span>
            <div className="text-2xl md:text-3xl font-mono font-bold text-amber-400">
              {ongoingTournaments.length}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              #1 Ranked ELO
            </span>
            <div className="text-2xl md:text-3xl font-mono font-bold text-emerald-400">
              {top3[0]?.current_elo || 1200}
            </div>
          </div>
        </div>
      </section>

      {/* Podium Top 3 Players (tabletennis.az inspired) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white flex items-center gap-2">
              <Award className="w-6 h-6 text-bhos-gold" />
              <span>{t('leaderboard.top_podium')}</span>
            </h2>
            <p className="text-xs text-slate-400">
              Top 3 BHOS athletes by current official ELO rating
            </p>
          </div>
          <Link
            href="/leaderboard"
            className="text-xs font-semibold text-bhos-cyan hover:underline flex items-center gap-1"
          >
            <span>View All ({profiles.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {/* Rank 2 (Silver) */}
          {top3[1] && (
            <div className="order-2 md:order-1 rounded-2xl border border-slate-700/80 bg-bhos-midnight/80 p-6 shadow-xl relative group hover:border-slate-500 transition">
              <div className="w-10 h-10 rounded-full bg-slate-300/20 text-slate-200 border border-slate-400 flex items-center justify-center font-display font-black text-base absolute -top-4 left-6 shadow">
                2
              </div>
              <div className="pt-2">
                <Link
                  href={`/players/${top3[1].id}`}
                  className="font-display font-bold text-base text-white hover:text-bhos-cyan transition"
                >
                  {top3[1].full_name}
                </Link>
                <p className="text-xs text-slate-400">{top3[1].major_faculty}</p>
                <div className="mt-4 flex items-baseline justify-between">
                  <div className="font-mono text-2xl font-extrabold text-white">
                    {top3[1].current_elo} <span className="text-xs text-slate-400 font-sans">ELO</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold">
                    {Math.round((top3[1].wins / (top3[1].matches_played || 1)) * 100)}% Win
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
                  <span>Matches: {top3[1].matches_played}</span>
                  <span>{top3[1].wins}W - {top3[1].losses}L</span>
                </div>
              </div>
            </div>
          )}

          {/* Rank 1 (Gold) - Elevated */}
          {top3[0] && (
            <div className="order-1 md:order-2 rounded-2xl border-2 border-amber-400/60 bg-gradient-to-b from-amber-500/10 via-bhos-midnight to-bhos-midnight p-7 shadow-2xl relative group hover:border-amber-400 transition md:-translate-y-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-bhos-navy flex items-center justify-center font-display font-black text-xl absolute -top-6 left-1/2 -translate-x-1/2 shadow-lg shadow-amber-500/30">
                1
              </div>
              <div className="pt-4 text-center">
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-2">
                  Club Leader
                </div>
                <Link
                  href={`/players/${top3[0].id}`}
                  className="block font-display font-black text-lg text-white hover:text-bhos-cyan transition"
                >
                  {top3[0].full_name}
                </Link>
                <p className="text-xs text-slate-400">{top3[0].major_faculty}</p>
                <div className="mt-5 font-mono text-3xl font-black text-amber-400">
                  {top3[0].current_elo} <span className="text-xs text-slate-300 font-sans">ELO</span>
                </div>
                <div className="mt-3 text-xs text-emerald-400 font-semibold">
                  {Math.round((top3[0].wins / (top3[0].matches_played || 1)) * 100)}% Win Rate ({top3[0].wins}W - {top3[0].losses}L)
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
                  <span>Blade: {top3[0].blade_equipment.split(' ')[0]}</span>
                  <span>Class of {top3[0].admission_year}</span>
                </div>
              </div>
            </div>
          )}

          {/* Rank 3 (Bronze) */}
          {top3[2] && (
            <div className="order-3 rounded-2xl border border-amber-800/80 bg-bhos-midnight/80 p-6 shadow-xl relative group hover:border-amber-700 transition">
              <div className="w-10 h-10 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700 flex items-center justify-center font-display font-black text-base absolute -top-4 right-6 shadow">
                3
              </div>
              <div className="pt-2">
                <Link
                  href={`/players/${top3[2].id}`}
                  className="font-display font-bold text-base text-white hover:text-bhos-cyan transition"
                >
                  {top3[2].full_name}
                </Link>
                <p className="text-xs text-slate-400">{top3[2].major_faculty}</p>
                <div className="mt-4 flex items-baseline justify-between">
                  <div className="font-mono text-2xl font-extrabold text-white">
                    {top3[2].current_elo} <span className="text-xs text-slate-400 font-sans">ELO</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold">
                    {Math.round((top3[2].wins / (top3[2].matches_played || 1)) * 100)}% Win
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
                  <span>Matches: {top3[2].matches_played}</span>
                  <span>{top3[2].wins}W - {top3[2].losses}L</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Two Column Section: Recent Matches & Ongoing Tournaments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Matches Log (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-bhos-cyan" />
              <span>{t('matches.title')}</span>
            </h3>
            <Link
              href="/matches"
              className="text-xs text-bhos-cyan hover:underline flex items-center gap-1"
            >
              <span>Full Archive</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentMatches.map((m) => {
              const p1Won = m.player1_score > m.player2_score;
              return (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl border border-bhos-border bg-bhos-midnight/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition shadow-md"
                >
                  {/* Left: Players and scores */}
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-bhos-darkCard border border-bhos-border font-mono font-black text-lg text-white">
                      <span>{m.player1_score}</span>
                      <span className="text-[10px] text-slate-500 -mt-1 font-normal">:</span>
                      <span>{m.player2_score}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/players/${m.player1_id}`}
                          className={`text-sm font-semibold hover:text-bhos-cyan transition ${
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
                          className={`text-sm font-semibold hover:text-bhos-cyan transition ${
                            !p1Won ? 'text-white font-bold' : 'text-slate-400'
                          }`}
                        >
                          {m.player2_name}
                        </Link>
                        {!p1Won && <Award className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>

                      <div className="text-[11px] font-mono text-slate-500">
                        Sets: {m.set_scores}
                      </div>
                    </div>
                  </div>

                  {/* Right: ELO Delta & Tournament badge */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <div className="flex items-center gap-1 font-mono text-xs font-bold text-emerald-400">
                      <span>+{m.elo_delta} ELO</span>
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(m.match_date).toLocaleDateString()}
                    </span>
                    {m.tournament_title && (
                      <span className="mt-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 truncate max-w-[150px]">
                        {m.tournament_title}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ongoing & Upcoming Tournaments (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>{t('tournaments.title')}</span>
            </h3>
            <Link
              href="/tournaments"
              className="text-xs text-bhos-cyan hover:underline flex items-center gap-1"
            >
              <span>All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {tournaments.map((tourn) => (
              <div
                key={tourn.id}
                className="p-5 rounded-2xl border border-bhos-border bg-bhos-midnight/90 hover:border-bhos-cyan/40 transition shadow-md space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      tourn.status === 'ongoing'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {tourn.status}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Max: {tourn.max_participants} Players
                  </span>
                </div>

                <Link
                  href={`/tournaments/${tourn.slug}`}
                  className="block font-display font-bold text-sm text-white hover:text-bhos-cyan transition"
                >
                  {tourn.title}
                </Link>

                <p className="text-xs text-slate-400 line-clamp-2">
                  {tourn.description}
                </p>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <Link
                    href={`/tournaments/${tourn.slug}`}
                    className="text-xs text-bhos-cyan font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>View Bracket</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showMatchModal && (
        <MatchLoggerModal onClose={() => setShowMatchModal(false)} />
      )}
    </div>
  );
}


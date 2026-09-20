'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BHOSDataStore } from '../lib/data/store';
import { PlayerProfile, MatchRecord, Tournament } from '../lib/data/types';
import { useTranslation } from '../lib/i18n';
import HallTableWidget from '../components/HallTableWidget';
import MatchLoggerModal from '../components/MatchLoggerModal';
import HeroHotspotPin from '../components/HeroHotspotPin';
import NumberTicker from '../components/NumberTicker';
import TiltCard from '../components/TiltCard';
import FormDots, { MatchFormItem } from '../components/FormDots';
import EloToastBadge from '../components/EloToastBadge';
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
  Sparkles,
  Flame,
  Users
} from 'lucide-react';

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

  // Helper to extract last 5 matches for a player
  const getPlayerForm = (playerId: string): MatchFormItem[] => {
    const playerMatches = matches
      .filter((m) => m.player1_id === playerId || m.player2_id === playerId)
      .slice(0, 5);

    return playerMatches.map((m) => {
      const isP1 = m.player1_id === playerId;
      const won = isP1 ? m.player1_score > m.player2_score : m.player2_score > m.player1_score;
      const oppName = isP1 ? m.player2_name : m.player1_name;
      const score = isP1 ? `${m.player1_score}-${m.player2_score}` : `${m.player2_score}-${m.player1_score}`;
      return {
        id: m.id,
        result: won ? 'W' : 'L',
        opponentName: oppName,
        score,
        eloDelta: isP1 ? m.elo_delta : -m.elo_delta,
        date: new Date(m.match_date).toLocaleDateString(),
      };
    });
  };

  return (
    <div className="space-y-16">
      {/* 1. Full-Bleed Cinematic Hero Section (Clean & Unobstructed Photo View + Perimeter Hotspots) */}
      <section className="relative -mt-6 rounded-3xl overflow-hidden border border-white/10 shadow-2xl min-h-[580px] md:min-h-[660px] flex flex-col justify-between p-6 sm:p-10 lg:p-12">
        {/* Full-bleed high-res background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-100"
          style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}
        />

        {/* Cinematic dark gradients: left gradient allows text readability while keeping center & right athlete photo clear */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-slate-950/60" />

        {/* Top Hero Meta Badges */}
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-white/15 bg-black/40 backdrop-blur-md text-xs font-semibold text-white shadow-lg">
            <img 
              src="/images/bhos-crest.png" 
              alt="BHOS" 
              className="w-4 h-4 object-contain filter drop-shadow-[0_0_6px_rgba(0,229,255,0.8)] mix-blend-screen" 
            />
            <span className="text-cyan-400 font-bold tracking-wide">BHOS TABLE TENNIS</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-300">{t('hero.portal_tag')}</span>
          </div>

          {/* WhatsApp Community Tag */}
          <a
            href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 backdrop-blur-md text-xs font-semibold text-emerald-300 hover:bg-emerald-900/50 transition-all shadow-lg"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <MessageCircle className="w-3.5 h-3.5 fill-emerald-400" />
            <span>{t('hero.community_tag')}</span>
            <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>

        {/* Floating Perimeter Interactive Hotspot Pins (Carefully positioned on outer perimeter to avoid athlete obstruction) */}
        <div className="absolute top-[22%] right-[6%] sm:right-[10%] z-30">
          <HeroHotspotPin type="league" badgeLabel={t('hero.stats_leader')} />
        </div>
        <div className="absolute top-[62%] right-[4%] sm:right-[8%] z-30">
          <HeroHotspotPin type="hall" badgeLabel={t('hero.hall_tables_btn')} />
        </div>
        <div className="absolute top-[80%] right-[10%] sm:right-[15%] z-30">
          <HeroHotspotPin type="community" badgeLabel="WhatsApp Chat" />
        </div>

        {/* Hero Bottom Content & Headline (Left-aligned, leaving the player with BHOS jersey fully visible in center/right) */}
        <div className="relative z-20 max-w-2xl space-y-6 pt-28 pb-2">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black text-white tracking-tight leading-[1.08] drop-shadow-2xl">
              {t('hero.headline')}
            </h1>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans max-w-xl drop-shadow">
              {t('hero.subtitle')}
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/leaderboard"
              className="px-6 py-3 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs sm:text-sm shadow-xl shadow-cyan-500/25 active:scale-95 transition flex items-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              <span>{t('nav.leaderboard')}</span>
            </Link>

            <Link
              href="/tables"
              className="px-6 py-3 rounded-full border border-white/20 bg-slate-950/60 hover:bg-slate-900/80 backdrop-blur-md text-white font-display font-semibold text-xs sm:text-sm transition flex items-center gap-2"
            >
              <TableIcon className="w-4 h-4 text-pink-400" />
              <span>{t('hero.hall_tables_btn')}</span>
            </Link>

            <a
              href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs sm:text-sm shadow-xl shadow-emerald-500/25 active:scale-95 transition flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4 fill-slate-950" />
              <span>{t('hero.join_whatsapp_btn')}</span>
            </a>

            {(currentUser.role === 'president' || currentUser.role === 'coach') && (
              <button
                onClick={() => setShowMatchModal(true)}
                className="px-5 py-3 rounded-full border border-cyan-400/40 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-display font-semibold text-xs sm:text-sm transition flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>{t('nav.log_match')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Hero Stats Strip with NumberTicker */}
        <div className="relative z-20 pt-6 mt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              {t('hero.stats_members')}
            </span>
            <div className="text-xl sm:text-2xl font-mono font-black text-white flex items-baseline gap-1.5">
              <NumberTicker value={profiles.length} />
              <span className="text-xs font-sans text-slate-400">{t('hero.players_count')}</span>
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              {t('hero.stats_matches')}
            </span>
            <div className="text-xl sm:text-2xl font-mono font-black text-cyan-400 flex items-baseline gap-1.5">
              <NumberTicker value={matches.length} />
              <span className="text-xs font-sans text-slate-400">{t('hero.official_count')}</span>
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              {t('hero.stats_tables')}
            </span>
            <div className="text-xl sm:text-2xl font-mono font-black text-pink-400">
              {t('hero.stats_tables_sub')}
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              {t('hero.stats_leader')}
            </span>
            <div className="text-xl sm:text-2xl font-mono font-black text-amber-400 flex items-baseline gap-1">
              <NumberTicker value={top3[0]?.current_elo || 1650} />
              <span className="text-xs font-sans text-slate-400">ELO</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Hall & Table Information Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-pink-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <TableIcon className="w-4 h-4" />
              <span>{t('facility.badge')}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-white">
              {t('facility.title')}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {t('facility.subtitle')}
            </p>
          </div>

          <Link
            href="/tables"
            className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-1 shrink-0"
          >
            <span>{t('facility.full_guide')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <HallTableWidget />
      </section>

      {/* 3. tabletennis.az Podium Top 3 Players with 3D TiltCard & FormDots */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-400" />
              <span>{t('leaderboard.top_podium')}</span>
            </h2>
            <p className="text-xs text-slate-400">
              {t('home_podium.subtitle')}
            </p>
          </div>
          <Link
            href="/leaderboard"
            className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-1"
          >
            <span>{t('home_podium.view_full')} ({profiles.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {/* Rank 2 (Silver) */}
          {top3[1] && (
            <TiltCard className="order-2 md:order-1 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl relative group hover:border-slate-600 transition">
              <div className="w-10 h-10 rounded-full bg-slate-300 text-slate-950 border-2 border-white flex items-center justify-center font-display font-black text-base absolute -top-4 left-6 shadow">
                2
              </div>
              <div className="pt-2">
                <Link
                  href={`/players/${top3[1].id}`}
                  className="font-display font-bold text-base text-white hover:text-cyan-400 transition"
                >
                  {top3[1].full_name}
                </Link>
                <p className="text-xs text-slate-400">{top3[1].major_faculty}</p>
                <div className="mt-4 flex items-baseline justify-between">
                  <div className="font-mono text-2xl font-extrabold text-white flex items-baseline gap-1">
                    <NumberTicker value={top3[1].current_elo} />
                    <span className="text-xs text-slate-400 font-sans">ELO</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold">
                    {Math.round((top3[1].wins / (top3[1].matches_played || 1)) * 100)}% {t('home_podium.win_rate')}
                  </span>
                </div>
                {/* Form indicator dots */}
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Recent Form:</span>
                  <FormDots form={getPlayerForm(top3[1].id)} size="sm" />
                </div>
                <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
                  <span>{t('home_podium.matches_label')}: {top3[1].matches_played}</span>
                  <span>{top3[1].wins}W - {top3[1].losses}L</span>
                </div>
              </div>
            </TiltCard>
          )}

          {/* Rank 1 (Gold) - Elevated */}
          {top3[0] && (
            <TiltCard className="order-1 md:order-2 rounded-3xl border-2 border-amber-400/80 bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-slate-900 p-7 shadow-2xl relative group hover:border-amber-400 transition md:-translate-y-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center font-display font-black text-xl absolute -top-6 left-1/2 -translate-x-1/2 shadow-xl shadow-amber-500/30">
                1
              </div>
              <div className="pt-4 text-center">
                <div className="inline-block px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-2 border border-amber-500/30">
                  {t('roles.president')} • #1
                </div>
                <Link
                  href={`/players/${top3[0].id}`}
                  className="block font-display font-black text-xl text-white hover:text-cyan-400 transition"
                >
                  {top3[0].full_name}
                </Link>
                <p className="text-xs text-slate-400">{top3[0].major_faculty}</p>
                <div className="mt-4 font-mono text-3xl font-black text-amber-400 flex items-baseline justify-center gap-1">
                  <NumberTicker value={top3[0].current_elo} />
                  <span className="text-xs text-slate-300 font-sans">ELO</span>
                </div>
                <div className="mt-2 text-xs text-emerald-400 font-semibold">
                  {Math.round((top3[0].wins / (top3[0].matches_played || 1)) * 100)}% {t('home_podium.win_rate')} ({top3[0].wins}W - {top3[0].losses}L)
                </div>
                {/* Form indicator dots */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Recent Form:</span>
                  <FormDots form={getPlayerForm(top3[0].id)} size="sm" />
                </div>
                <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
                  <span>{top3[0].blade_equipment.split(' ')[0]}</span>
                  <span>{top3[0].admission_year}</span>
                </div>
              </div>
            </TiltCard>
          )}

          {/* Rank 3 (Bronze) */}
          {top3[2] && (
            <TiltCard className="order-3 rounded-3xl border border-amber-800/80 bg-slate-900/80 p-6 shadow-xl relative group hover:border-amber-700 transition">
              <div className="w-10 h-10 rounded-full bg-amber-800 text-amber-200 border-2 border-amber-600 flex items-center justify-center font-display font-black text-base absolute -top-4 right-6 shadow">
                3
              </div>
              <div className="pt-2">
                <Link
                  href={`/players/${top3[2].id}`}
                  className="font-display font-bold text-base text-white hover:text-cyan-400 transition"
                >
                  {top3[2].full_name}
                </Link>
                <p className="text-xs text-slate-400">{top3[2].major_faculty}</p>
                <div className="mt-4 flex items-baseline justify-between">
                  <div className="font-mono text-2xl font-extrabold text-white flex items-baseline gap-1">
                    <NumberTicker value={top3[2].current_elo} />
                    <span className="text-xs text-slate-400 font-sans">ELO</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold">
                    {Math.round((top3[2].wins / (top3[2].matches_played || 1)) * 100)}% {t('home_podium.win_rate')}
                  </span>
                </div>
                {/* Form indicator dots */}
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Recent Form:</span>
                  <FormDots form={getPlayerForm(top3[2].id)} size="sm" />
                </div>
                <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
                  <span>{t('home_podium.matches_label')}: {top3[2].matches_played}</span>
                  <span>{top3[2].wins}W - {top3[2].losses}L</span>
                </div>
              </div>
            </TiltCard>
          )}
        </div>
      </section>

      {/* 4. Recent Matches Archive & Ongoing Tournaments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Matches Log (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span>{t('home_recent.title')}</span>
            </h3>
            <Link
              href="/matches"
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>{t('home_recent.view_all')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentMatches.map((m) => {
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
                        {t('home_recent.sets_label')}: {m.set_scores}
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
            })}
          </div>
        </div>

        {/* Ongoing Tournaments (1 col) with TiltCard */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>{t('home_tournaments.title')}</span>
            </h3>
            <Link
              href="/tournaments"
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>{t('home_tournaments.view_all')}</span>
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
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                      tourn.status === 'ongoing'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    }`}
                  >
                    {t(`tournaments.status_${tourn.status}`) || tourn.status}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Max {tourn.max_participants} {t('home_tournaments.registered')}
                  </span>
                </div>

                <Link
                  href={`/tournaments/${tourn.slug}`}
                  className="block font-display font-bold text-base text-white hover:text-cyan-400 transition"
                >
                  {tourn.title}
                </Link>

                <p className="text-xs text-slate-400 line-clamp-2">
                  {tourn.description}
                </p>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <Link
                    href={`/tournaments/${tourn.slug}`}
                    className="text-xs text-cyan-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>{t('home_tournaments.view_bracket')}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Club Mission & Heritage (#about Section) */}
      <section id="about" className="pt-8 border-t border-white/10 scroll-mt-28">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-8 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-3xl space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t('brand.title')}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
              Engineering Precision Meets Athletic Excellence
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Founded at Baku Higher Oil School (Bakı Ali Neft Məktəbi), the BHOS Table Tennis Club unites future engineers across Information Security, Petroleum, Chemical, and Process Automation disciplines through competitive table tennis. Guided by Head Coach <strong className="text-white">Iftixar Meherremov</strong> and Club President <strong className="text-white">Ali Iskandarli</strong>, our members train on ITTF competition tables and compete in dynamic ELO ranked circuits aligned with tabletennis.az standards.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <Target className="w-5 h-5 text-cyan-400" />
                <h4 className="font-bold text-white text-xs">ITTF Certified Arena</h4>
                <p className="text-[11px] text-slate-400">4 Donic Waldner 25mm competition tables with calibrated lighting.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <Flame className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-white text-xs">Official ELO System</h4>
                <p className="text-[11px] text-slate-400">Dynamic K=32 and K=48 rating algorithms tracking every set.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <Users className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-white text-xs">Active Community</h4>
                <p className="text-[11px] text-slate-400">Over 100 students sparring daily via WhatsApp matchmaking.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showMatchModal && (
        <MatchLoggerModal onClose={() => setShowMatchModal(false)} />
      )}
    </div>
  );
}

// 3D TiltCard applied to podium

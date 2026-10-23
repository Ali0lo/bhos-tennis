'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BHOSDataStore } from '../lib/data/store';
import { PlayerProfile, MatchRecord, Tournament } from '../lib/data/types';
import { useTranslation } from '../lib/i18n';
import HallRulesSection from '../components/HallRulesSection';
import MatchLoggerModal from '../components/MatchLoggerModal';
import NumberTicker from '../components/NumberTicker';
import TiltCard from '../components/TiltCard';
import EloToastBadge from '../components/EloToastBadge';
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
  Users
} from 'lucide-react';

export default function HomePage() {
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(store.getCurrentUser());
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

  return (
    <div className="space-y-12">
      <SmoothReveal delay={0.01}>
        <div className="flex justify-center -mt-3">
          <div className="inline-flex flex-wrap sm:flex-nowrap items-center justify-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl sm:rounded-full bg-[#080D16]/85 backdrop-blur-md border border-white/10 shadow-[0_0_28px_rgba(59,130,246,0.12)]">
            <Link
              href="/leaderboard"
              className="group inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-slate-200 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 hover:border-cyan-400/50 transition-all shadow-sm"
            >
              <Trophy className="w-3.5 h-3.5 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="whitespace-nowrap">{t('hero.stats_leader')}</span>
            </Link>

            <Link
              href="/tables"
              className="group inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-slate-200 hover:text-white bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/25 hover:border-pink-400/50 transition-all shadow-sm"
            >
              <TableIcon className="w-3.5 h-3.5 text-pink-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="whitespace-nowrap">{t('hero.hall_tables_btn')}</span>
            </Link>

            <a
              href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-slate-200 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 hover:border-emerald-400/50 transition-all shadow-sm"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="whitespace-nowrap">WhatsApp Chat</span>
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

          <div className="relative z-20 flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-white/15 bg-black/40 backdrop-blur-md text-xs font-semibold text-white shadow-lg">
              <img 
                src="/images/bhos-crest.png" 
                alt="BHOS" 
                className="w-4 h-4 object-contain filter drop-shadow-[0_0_6px_rgba(0,229,255,0.8)]" 
              />
              <span className="text-cyan-400 font-bold tracking-wide">BHOS TABLE TENNIS</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300">{t('hero.portal_tag')}</span>
            </div>

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

          <SmoothReveal staggerChildren={0.1} className="relative z-20 max-w-2xl space-y-6 pt-28 pb-2">
            <SmoothRevealItem className="space-y-3">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black text-white tracking-tight leading-[1.08] drop-shadow-2xl">
                {t('hero.headline')}
              </h1>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans max-w-xl drop-shadow">
                {t('hero.subtitle')}
              </p>
            </SmoothRevealItem>

            <SmoothRevealItem className="flex flex-wrap items-center gap-3 pt-2">
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

              {(currentUser?.role === 'president' || currentUser?.role === 'coach') && (
                <button
                  onClick={() => setShowMatchModal(true)}
                  className="px-5 py-3 rounded-full border border-cyan-400/40 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-display font-semibold text-xs sm:text-sm transition flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>{t('nav.log_match')}</span>
                </button>
              )}
            </SmoothRevealItem>
          </SmoothReveal>

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
                <NumberTicker value={top3[0]?.current_elo ?? 999} />
                <span className="text-xs font-sans text-slate-400">ELO</span>
              </div>
            </div>
          </div>
        </section>
      </SmoothReveal>

      <section className="space-y-6">
        <HallRulesSection />
      </section>

      <SmoothReveal delay={0.1}>
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
                  <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400 flex justify-between">
                    <span>{t('home_podium.matches_label')}: {top3[1].matches_played}</span>
                    <span>{top3[1].wins}W - {top3[1].losses}L</span>
                  </div>
                </div>
              </TiltCard>
            )}

            {top3[0] && (
              <TiltCard className="order-1 md:order-2 rounded-3xl border-2 border-amber-400/80 bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-slate-900 p-7 shadow-2xl relative group hover:border-amber-400 transition md:-translate-y-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center font-display font-black text-xl absolute -top-6 left-1/2 -translate-x-1/2 shadow-xl shadow-amber-500/30">
                  1
                </div>
                <div className="pt-4 text-center">
                  <div className="inline-block px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-2 border border-amber-500/30">
                    {t(`roles.${top3[0].role}`)} • #1
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
                  <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400 flex justify-center">
                    <span>
                      {top3[0].user_type === 'teacher' || top3[0].user_type === 'staff' || top3[0].role === 'coach' || !top3[0].admission_year
                        ? 'Müəllim / Əməkdaş'
                        : `${top3[0].admission_year} Qəbul ili`}
                    </span>
                  </div>
                </div>
              </TiltCard>
            )}

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
                  <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400 flex justify-between">
                    <span>{t('home_podium.matches_label')}: {top3[2].matches_played}</span>
                    <span>{top3[2].wins}W - {top3[2].losses}L</span>
                  </div>
                </div>
              </TiltCard>
            )}
          </div>
        </section>
      </SmoothReveal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
            {recentMatches.length === 0 ? (
              <div className="p-8 rounded-2xl border border-white/10 bg-slate-900/60 text-center space-y-2">
                <Activity className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">
                  Hələlik rəsmi oyun qeydə alınmayıb
                </p>
                <p className="text-xs text-slate-500">
                  Rəsmi klub oyunları təsdiqləndikcə nəticələr və ELO xalları burada görünəcək.
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
              })
            )}
          </div>
        </div>

        <SmoothReveal delay={0.1} scale className="space-y-4">
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
                    className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  >
                    Gözlənilən
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Fevral – Mart
                  </span>
                </div>

                <Link
                  href="/tournaments"
                  className="block font-display font-bold text-base text-white hover:text-cyan-400 transition"
                >
                  {tourn.title}
                </Link>

                <p className="text-xs text-slate-400 line-clamp-2">
                  Universitet çempionatı ikinci semestrdə (Fevral - Mart aylarında) keçiriləcək.
                </p>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <Link
                    href="/tournaments"
                    className="text-xs text-cyan-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>Tezliklə • Hazır Olun</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </TiltCard>
            ))}
          </div>
        </SmoothReveal>
      </div>

      <SmoothReveal delay={0.12}>
        <section id="about" className="pt-8 border-t border-white/10 scroll-mt-28">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-8 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="max-w-3xl space-y-4 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{t('brand.title')}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
                Mühəndis Dəqiqliyi və İdman Əzmi
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Bakı Ali Neft Məktəbinin (BANM) Stolüstü Tennis Klubu idmana və rəqabətə marağı olan bütün tələbə və əməkdaşları vahid masa ətrafında birləşdirir. Peşəkar məşq mühiti, ITTF standartlarına uyğun masalar və daxili ELO reytinq sistemi ilə klubumuz üzvlərinə həm bacarıqlarını inkişaf etdirmək, həm də universitet daxili turnirlərdə mübarizə aparmaq üçün aktiv idman platforması təqdim edir.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <Target className="w-5 h-5 text-cyan-400" />
                  <h4 className="font-bold text-white text-xs">ITTF Standartlı Arena</h4>
                  <p className="text-[11px] text-slate-400">4 ədəd Donic Waldner 25mm peşəkar yarış masası (1 Xanımlar / 3 Bəylər).</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <h4 className="font-bold text-white text-xs">Rəsmi ELO Sistemi</h4>
                  <p className="text-[11px] text-slate-400">Hər qarşılaşmanı izləyən dinamik K=32 iki-faktorlu təsdiq alqoritmi.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-bold text-white text-xs">Fəal İcma</h4>
                  <p className="text-[11px] text-slate-400">WhatsApp icması vasitəsilə gündəlik yoldaşlıq və reytinq oyunları.</p>
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

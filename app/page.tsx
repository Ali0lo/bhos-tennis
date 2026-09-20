'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BHOSDataStore } from '../lib/data/store';
import { PlayerProfile, MatchRecord, Tournament } from '../lib/data/types';
import { useTranslation } from '../lib/i18n';
import HallTableWidget from '../components/HallTableWidget';
import MatchLoggerModal from '../components/MatchLoggerModal';
import { 
  Trophy, 
  Table as TableIcon, 
  Activity, 
  ArrowRight, 
  TrendingUp, 
  Users, 
  Award, 
  Zap, 
  ShieldCheck, 
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
  MapPin,
  X
} from 'lucide-react';

export default function HomePage() {
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [currentUser, setCurrentUser] = useState<PlayerProfile>(store.getCurrentUser());
  const [showMatchModal, setShowMatchModal] = useState(false);

  // Active Hotspot state (null = none open, 1 = Table Hall, 2 = League, 3 = Coaching)
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);

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
    <div className="space-y-16">
      {/* 1. Full-Bleed Cinematic Hero Section with Hotspot Pins */}
      <section className="relative -mt-6 rounded-3xl overflow-hidden border border-white/10 shadow-2xl min-h-[640px] md:min-h-[740px] flex flex-col justify-between p-6 sm:p-10 lg:p-12">
        {/* Full-bleed high-res background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
          style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}
        />

        {/* Cinematic dark gradients & vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A192F] via-slate-950/60 to-slate-950/70" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/40 to-black/80" />

        {/* Top Hero Meta Badges */}
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-white/15 bg-black/40 backdrop-blur-md text-xs font-semibold text-white shadow-lg">
            <img 
              src="/images/bhos-crest.png" 
              alt="BHOS" 
              className="w-4 h-4 object-contain filter drop-shadow-[0_0_6px_rgba(0,229,255,0.8)]" 
            />
            <span className="text-cyan-400 font-bold tracking-wide">BHOS TABLE TENNIS</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-300">Official Campus Portal</span>
          </div>

          {/* Social Proof: WhatsApp Community Tag */}
          <a
            href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 backdrop-blur-md text-xs font-semibold text-emerald-300 hover:bg-emerald-900/50 transition-all shadow-lg"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <MessageCircle className="w-3.5 h-3.5 fill-emerald-400" />
            <span>Join 100+ BHOS Players on WhatsApp</span>
            <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>

        {/* Interactive Hotspot 1: Table Tennis Hall (Positioned on the table) */}
        <div className="absolute top-[68%] right-[10%] sm:right-[16%] z-30">
          <div className="relative">
            <button
              onClick={() => setActiveHotspot(activeHotspot === 1 ? null : 1)}
              className="group relative flex items-center justify-center cursor-pointer focus:outline-none"
              title="Table Tennis Hall Specifications"
            >
              <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-pink-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-7 w-7 bg-pink-500/90 text-white items-center justify-center border-2 border-white shadow-lg shadow-pink-500/50 group-hover:scale-110 transition-transform">
                <TableIcon className="w-3.5 h-3.5" />
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white shadow">
                4 Hall Tables
              </span>
            </button>

            {/* Hotspot 1 Tooltip Card */}
            {activeHotspot === 1 && (
              <div className="absolute bottom-10 right-0 w-72 sm:w-80 rounded-2xl border border-white/15 bg-slate-950/95 backdrop-blur-2xl p-4 shadow-2xl z-50 text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                  <span className="font-display font-bold text-white flex items-center gap-1.5">
                    <TableIcon className="w-4 h-4 text-pink-400" />
                    <span>Table Tennis Hall Setup</span>
                  </span>
                  <button onClick={() => setActiveHotspot(null)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  4 ITTF competition tables at Bibiheybat Campus:
                </p>
                <div className="space-y-1 text-[11px]">
                  <div className="p-1.5 rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-200 font-semibold">
                    🚺 Table 1: Dedicated for Girls & Women Practice
                  </div>
                  <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 font-semibold">
                    🚹 Tables 2, 3 & 4: Dedicated for Boys & League Matches
                  </div>
                </div>
                <Link
                  href="/tables"
                  className="mt-2 block w-full py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-center font-bold text-white text-[11px] transition"
                >
                  View Hall & Table Details →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Hotspot 2: Official BHOS League (Positioned near the player) */}
        <div className="absolute top-[38%] left-[45%] sm:left-[48%] z-30">
          <div className="relative">
            <button
              onClick={() => setActiveHotspot(activeHotspot === 2 ? null : 2)}
              className="group relative flex items-center justify-center cursor-pointer focus:outline-none"
              title="Official BHOS League"
            >
              <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-7 w-7 bg-cyan-400 text-slate-950 items-center justify-center border-2 border-white shadow-lg shadow-cyan-400/50 group-hover:scale-110 transition-transform">
                <Trophy className="w-3.5 h-3.5" />
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white shadow">
                Official ELO League
              </span>
            </button>

            {/* Hotspot 2 Tooltip Card */}
            {activeHotspot === 2 && (
              <div className="absolute bottom-10 -left-20 sm:left-0 w-72 sm:w-80 rounded-2xl border border-white/15 bg-slate-950/95 backdrop-blur-2xl p-4 shadow-2xl z-50 text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                  <span className="font-display font-bold text-white flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-cyan-400" />
                    <span>Official BHOS ELO League</span>
                  </span>
                  <button onClick={() => setActiveHotspot(null)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Real-time table tennis rating algorithm with dynamic K-factors (K=32 club, K=48 tournament) inspired by tabletennis.az standards.
                </p>
                <div className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-white/5 border border-white/10">
                  <span>Current #1:</span>
                  <span className="font-bold text-cyan-400">{top3[0]?.full_name || 'Ali Iskandarli'} ({top3[0]?.current_elo || 1650} ELO)</span>
                </div>
                <Link
                  href="/leaderboard"
                  className="mt-2 block w-full py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-center font-bold text-[11px] transition shadow"
                >
                  Explore Leaderboard →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Hotspot 3: Coaching & Practice (Positioned top left) */}
        <div className="absolute top-[28%] left-[8%] sm:left-[12%] z-30">
          <div className="relative">
            <button
              onClick={() => setActiveHotspot(activeHotspot === 3 ? null : 3)}
              className="group relative flex items-center justify-center cursor-pointer focus:outline-none"
              title="Coaching & Practice"
            >
              <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-7 w-7 bg-emerald-500 text-slate-950 items-center justify-center border-2 border-white shadow-lg shadow-emerald-400/50 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white shadow">
                Varsity Coaching
              </span>
            </button>

            {/* Hotspot 3 Tooltip Card */}
            {activeHotspot === 3 && (
              <div className="absolute top-10 left-0 w-72 sm:w-80 rounded-2xl border border-white/15 bg-slate-950/95 backdrop-blur-2xl p-4 shadow-2xl z-50 text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                  <span className="font-display font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Structured Coaching</span>
                  </span>
                  <button onClick={() => setActiveHotspot(null)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Guided by Head Coach <strong className="text-white">Iftixar Meherremov</strong>. Technique calibration, footwork patterns, and multi-ball training for student athletes.
                </p>
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px]">
                  Training Sessions: Mon, Wed, Fri (16:00 - 18:00)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hero Bottom Content & Massive Headline */}
        <div className="relative z-20 max-w-3xl space-y-6 pt-32 pb-4">
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-black text-white tracking-tight leading-[1.05] drop-shadow-2xl">
              WHERE PASSION MEETS EVERY RALLY.
            </h1>
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed font-sans max-w-2xl drop-shadow">
              The official table tennis management platform for Baku Higher Oil School. Live ELO ratings, campus championships, and sports hall court access for all BHOS engineering students.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/leaderboard"
              className="px-6 py-3.5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-sm shadow-xl shadow-cyan-500/25 active:scale-95 transition flex items-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              <span>{t('nav.leaderboard')}</span>
            </Link>

            <Link
              href="/tables"
              className="px-6 py-3.5 rounded-full border border-white/20 bg-slate-950/60 hover:bg-slate-900/80 backdrop-blur-md text-white font-display font-semibold text-sm transition flex items-center gap-2"
            >
              <TableIcon className="w-4 h-4 text-pink-400" />
              <span>Hall & Tables</span>
            </Link>

            <a
              href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm shadow-xl shadow-emerald-500/25 active:scale-95 transition flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4 fill-slate-950" />
              <span>Join WhatsApp Group</span>
            </a>
          </div>
        </div>

        {/* Bottom Hero Stats Strip */}
        <div className="relative z-20 pt-8 mt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Members</span>
            <div className="text-2xl sm:text-3xl font-mono font-black text-white">{profiles.length} Players</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Matches Logged</span>
            <div className="text-2xl sm:text-3xl font-mono font-black text-cyan-400">{matches.length} Official</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Campus Tables</span>
            <div className="text-2xl sm:text-3xl font-mono font-black text-pink-400">4 Tables (1 Girls / 3 Boys)</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">#1 ELO Leader</span>
            <div className="text-2xl sm:text-3xl font-mono font-black text-amber-400">{top3[0]?.current_elo || 1650} ELO</div>
          </div>
        </div>
      </section>

      {/* 2. Hall & Table Information Section (Replaces table reservation flow) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-pink-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <TableIcon className="w-4 h-4" />
              <span>Campus Facility Guide</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-white">
              BHOS Table Tennis Hall & Court Allocation
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Table 1 dedicated for Women / Girls; Tables 2, 3, and 4 dedicated for Men / Boys.
            </p>
          </div>

          <Link
            href="/tables"
            className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-1 shrink-0"
          >
            <span>Full Hall Guide</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <HallTableWidget />
      </section>

      {/* 3. tabletennis.az Podium Top 3 Players */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-400" />
              <span>{t('leaderboard.top_podium')}</span>
            </h2>
            <p className="text-xs text-slate-400">
              Top 3 BHOS athletes by official ELO rating
            </p>
          </div>
          <Link
            href="/leaderboard"
            className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-1"
          >
            <span>View Full Leaderboard ({profiles.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {/* Rank 2 (Silver) */}
          {top3[1] && (
            <div className="order-2 md:order-1 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl relative group hover:border-slate-600 transition">
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
                  <div className="font-mono text-2xl font-extrabold text-white">
                    {top3[1].current_elo} <span className="text-xs text-slate-400 font-sans">ELO</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold">
                    {Math.round((top3[1].wins / (top3[1].matches_played || 1)) * 100)}% Win
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-white/10 text-[11px] text-slate-400 flex justify-between">
                  <span>Matches: {top3[1].matches_played}</span>
                  <span>{top3[1].wins}W - {top3[1].losses}L</span>
                </div>
              </div>
            </div>
          )}

          {/* Rank 1 (Gold) - Elevated */}
          {top3[0] && (
            <div className="order-1 md:order-2 rounded-3xl border-2 border-amber-400/80 bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-slate-900 p-7 shadow-2xl relative group hover:border-amber-400 transition md:-translate-y-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center font-display font-black text-xl absolute -top-6 left-1/2 -translate-x-1/2 shadow-xl shadow-amber-500/30">
                1
              </div>
              <div className="pt-4 text-center">
                <div className="inline-block px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-2 border border-amber-500/30">
                  Club Leader & President
                </div>
                <Link
                  href={`/players/${top3[0].id}`}
                  className="block font-display font-black text-xl text-white hover:text-cyan-400 transition"
                >
                  {top3[0].full_name}
                </Link>
                <p className="text-xs text-slate-400">{top3[0].major_faculty}</p>
                <div className="mt-4 font-mono text-3xl font-black text-amber-400">
                  {top3[0].current_elo} <span className="text-xs text-slate-300 font-sans">ELO</span>
                </div>
                <div className="mt-2 text-xs text-emerald-400 font-semibold">
                  {Math.round((top3[0].wins / (top3[0].matches_played || 1)) * 100)}% Win Rate ({top3[0].wins}W - {top3[0].losses}L)
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400 flex justify-between">
                  <span>Blade: {top3[0].blade_equipment.split(' ')[0]}</span>
                  <span>Class of {top3[0].admission_year}</span>
                </div>
              </div>
            </div>
          )}

          {/* Rank 3 (Bronze) */}
          {top3[2] && (
            <div className="order-3 rounded-3xl border border-amber-800/80 bg-slate-900/80 p-6 shadow-xl relative group hover:border-amber-700 transition">
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
                  <div className="font-mono text-2xl font-extrabold text-white">
                    {top3[2].current_elo} <span className="text-xs text-slate-400 font-sans">ELO</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold">
                    {Math.round((top3[2].wins / (top3[2].matches_played || 1)) * 100)}% Win
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-white/10 text-[11px] text-slate-400 flex justify-between">
                  <span>Matches: {top3[2].matches_played}</span>
                  <span>{top3[2].wins}W - {top3[2].losses}L</span>
                </div>
              </div>
            </div>
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
              <span>{t('matches.title')}</span>
            </h3>
            <Link
              href="/matches"
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
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
                  className="p-4 rounded-2xl border border-white/10 bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-slate-950 border border-white/10 font-mono font-black text-lg text-white">
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
                        Sets: {m.set_scores}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-white/10">
                    <div className="flex items-center gap-1 font-mono text-xs font-bold text-emerald-400">
                      <span>+{m.elo_delta} ELO</span>
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] text-slate-500">
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

        {/* Ongoing Tournaments (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>{t('tournaments.title')}</span>
            </h3>
            <Link
              href="/tournaments"
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {tournaments.map((tourn) => (
              <div
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
                    {tourn.status}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Max {tourn.max_participants} Players
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
                    <span>View Knockout Bracket</span>
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

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BHOSDataStore } from '../lib/data/store';
import { PlayerProfile } from '../lib/data/types';
import SmoothReveal from '../components/SmoothReveal';
import { MessageCircle } from 'lucide-react';

export default function HomePage() {
  const store = BHOSDataStore.getInstance();
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);

  useEffect(() => {
    const update = () => {
      setProfiles(store.getProfiles());
    };
    update();
    return store.subscribe(update);
  }, [store]);

  const leader = profiles[0] || {
    id: 'p-2',
    full_name: 'Iftixar Meherremov',
    current_elo: 9999,
  };

  const tables = [
    {
      num: '01',
      title: 'Dedicated for Women/Girls',
      meta: 'TABLE 1 • 10:00-21:00',
      accent: 'text-[#EAB308]',
      hoverBorder: 'hover:border-[#EAB308]/40',
    },
    {
      num: '02',
      title: 'Men / General Training',
      meta: 'TABLE 2 • 10:00-21:00',
      accent: 'text-[#3B82F6]',
      hoverBorder: 'hover:border-[#3B82F6]/40',
    },
    {
      num: '03',
      title: 'Men / General Training',
      meta: 'TABLE 3 • 10:00-21:00',
      accent: 'text-[#3B82F6]',
      hoverBorder: 'hover:border-[#3B82F6]/40',
    },
    {
      num: '04',
      title: 'Men / General Training',
      meta: 'TABLE 4 • 10:00-21:00',
      accent: 'text-[#3B82F6]',
      hoverBorder: 'hover:border-[#3B82F6]/40',
    },
  ];

  return (
    <div className="space-y-16 pb-6">
      {/* HERO SECTION */}
      <section className="pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Hero Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7 space-y-4"
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3B82F6]">
              BAKU HIGHER OIL SCHOOL / EST. ON CAMPUS
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-display font-extrabold text-white tracking-tight leading-[1.06]">
              BHOS Official
              <br />
              Table Tennis Club
              <br />
              &amp; Ranking Portal
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md pt-1">
              A home for every rally. Follow the campus rankings, find your table, and compete with the BHOS community.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="#leaderboard"
                className="px-5 py-2.5 rounded-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-xs transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-[#3B82F6]/20"
              >
                View Leaderboard
              </a>

              <a
                href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-full bg-[#111824] hover:bg-[#192232] text-white border border-white/10 font-bold text-xs transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
              >
                Join WhatsApp Community
              </a>
            </div>
          </motion.div>

          {/* Right Hero Column: Top Ranked Spotlight Card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5"
          >
            <div className="rounded-2xl bg-[#0F1623] border border-white/[0.08] p-6 sm:p-7 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  TOP RANKED SPOTLIGHT
                </span>
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#22C55E]">
                  • RANKING
                </span>
              </div>

              <div className="text-5xl sm:text-6xl font-display font-black text-[#EAB308] leading-none my-5">
                01
              </div>

              <div className="flex items-end justify-between gap-4 pt-1">
                <div>
                  <div className="font-display font-extrabold text-base sm:text-lg text-white leading-snug">
                    Coach Iftixar
                    <br />
                    Meherremov
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 mt-1.5">
                    THE ONE TO BEAT
                  </div>
                </div>

                <div className="text-xs sm:text-sm font-extrabold text-[#EAB308] uppercase tracking-wider shrink-0">
                  {leader.current_elo} PTS
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 01 / THE FIELD — THE LEADERBOARD */}
      <SmoothReveal>
        <section id="leaderboard" className="scroll-mt-8">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3B82F6]">
              01 / THE FIELD
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
              The leaderboard.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 pt-0.5">
              Every match moves the needle. Track the current BHOS ELO standings below.
            </p>
          </div>

          <div className="mt-5 rounded-2xl bg-[#0F1623] border border-white/[0.08] p-4 sm:p-5 shadow-2xl">
            {/* Desktop Table Column Headers */}
            <div className="hidden lg:grid lg:grid-cols-12 px-4 pb-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <div className="col-span-1">RANK</div>
              <div className="col-span-3">PLAYER NAME</div>
              <div className="col-span-3">FACULTY</div>
              <div className="col-span-3">BLADE / RUBBER</div>
              <div className="col-span-1 text-center">MATCHES</div>
              <div className="col-span-1 text-right">POINTS</div>
            </div>

            {/* Player Rows */}
            <div className="space-y-2.5">
              {profiles.map((player, idx) => {
                const rankNum = player.rank || idx + 1;
                const isCoach = player.role === 'coach';
                const facultyDisplay = isCoach ? 'Coach / BHOS' : 'Not listed';
                const equipmentDisplay = isCoach
                  ? 'Donic / Rubbers pending'
                  : 'Not listed';

                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.4,
                      delay: idx * 0.04,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="rounded-xl bg-[#131C2B] border border-white/[0.06] hover:border-white/15 px-4 py-3.5 transition-all duration-200"
                  >
                    {/* Desktop Row */}
                    <div className="hidden lg:grid lg:grid-cols-12 lg:items-center text-xs">
                      <div className="col-span-1 font-extrabold text-[#EAB308]">
                        {rankNum}
                      </div>
                      <div className="col-span-3">
                        <Link
                          href={`/players/${player.id}`}
                          className="font-bold text-white hover:text-[#3B82F6] transition-colors"
                        >
                          {player.full_name}
                        </Link>
                      </div>
                      <div className="col-span-3 text-slate-400">
                        {facultyDisplay}
                      </div>
                      <div className="col-span-3 text-slate-400">
                        {equipmentDisplay}
                      </div>
                      <div className="col-span-1 text-center text-slate-400">
                        {player.matches_played}
                      </div>
                      <div className="col-span-1 text-right font-extrabold text-white">
                        {player.current_elo.toLocaleString()}
                      </div>
                    </div>

                    {/* Tablet & Phone Row */}
                    <div className="flex lg:hidden items-center justify-between text-xs">
                      <div className="flex items-center gap-4">
                        <span className="w-4 font-extrabold text-[#EAB308]">
                          {rankNum}
                        </span>
                        <Link
                          href={`/players/${player.id}`}
                          className="font-bold text-white hover:text-[#3B82F6] transition-colors"
                        >
                          {player.full_name}
                        </Link>
                      </div>
                      <div className="font-extrabold text-white">
                        {player.current_elo.toLocaleString()}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      </SmoothReveal>

      {/* 02 / PLAY SPACE — FOUR TABLES. ONE COMMUNITY. */}
      <SmoothReveal delay={0.08}>
        <section id="tables" className="scroll-mt-8">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3B82F6]">
              02 / PLAY SPACE
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
              Four tables. One community.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 pt-0.5">
              Your next session starts here. The sports hall is open daily from 10:00 to 21:00.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tables.map((tbl, idx) => (
              <motion.div
                key={tbl.num}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.45,
                  delay: idx * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`rounded-2xl bg-[#0F1623] border border-white/[0.08] ${tbl.hoverBorder} p-6 pb-12 transition-all duration-300 hover:-translate-y-0.5 shadow-xl`}
              >
                <div className={`text-2xl sm:text-3xl font-display font-black ${tbl.accent}`}>
                  {tbl.num}
                </div>
                <div className="text-sm sm:text-base font-bold text-white mt-2.5">
                  {tbl.title}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 mt-1.5">
                  {tbl.meta}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </SmoothReveal>

      {/* 03 / COMPETE — THE NEXT BIG RALLY. */}
      <SmoothReveal delay={0.1}>
        <section id="tournaments" className="scroll-mt-8">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3B82F6]">
              03 / COMPETE
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
              The next big rally.
            </h2>
          </div>

          <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Left Blue Championship Card */}
            <Link
              href="/tournaments"
              className="lg:col-span-6 rounded-2xl bg-[#4285F4] hover:bg-[#3B78E7] p-6 sm:p-8 flex flex-col justify-center transition-all duration-300 hover:-translate-y-0.5 shadow-xl"
            >
              <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-950/70">
                CAMPUS TOURNAMENT / AUTUMN EDITION
              </div>
              <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-950 tracking-tight leading-tight mt-2">
                BHOS Autumn
                <br className="hidden sm:block" /> Open Championship
              </h3>
              <p className="text-xs sm:text-sm text-slate-950/80 mt-3 max-w-sm leading-relaxed">
                A campus-wide knockout tournament. Follow the bracket as players advance toward the final.
              </p>
            </Link>

            {/* Right Knockout Bracket / Preview Card */}
            <div className="lg:col-span-6 rounded-2xl bg-[#0F1623] border border-white/[0.08] p-5 sm:p-6 shadow-xl flex flex-col justify-between">
              <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-4">
                KNOCKOUT BRACKET / PREVIEW
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center my-auto">
                {/* Round 01 */}
                <div className="space-y-2.5">
                  <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    ROUND 01
                  </div>
                  <div className="rounded-xl bg-[#131C2B] border border-white/[0.07] p-3 space-y-1">
                    <div className="text-xs font-bold text-white">Seed #1</div>
                    <div className="text-[11px] text-slate-400">Seed #8</div>
                  </div>
                  <div className="rounded-xl bg-[#131C2B] border border-white/[0.07] p-3 space-y-1">
                    <div className="text-xs font-bold text-white">Seed #4</div>
                    <div className="text-[11px] text-slate-400">Seed #5</div>
                  </div>
                </div>

                {/* Round 02 */}
                <div className="space-y-2.5">
                  <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    ROUND 02
                  </div>
                  <div className="rounded-xl bg-[#131C2B] border border-white/[0.07] p-3 space-y-1">
                    <div className="text-xs font-bold text-white">Winner A</div>
                    <div className="text-[11px] text-slate-400">Winner B</div>
                  </div>
                </div>

                {/* Final */}
                <div className="space-y-2.5">
                  <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#EAB308]">
                    FINAL
                  </div>
                  <div className="rounded-xl bg-[#131C2B] border border-[#EAB308]/50 p-3 space-y-1">
                    <div className="text-xs font-bold text-white">Finalist #1</div>
                    <div className="text-[11px] text-slate-400">Finalist #2</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </SmoothReveal>

      {/* 04 / THE COMMUNITY — YOUR PEOPLE. YOUR GAME. */}
      <SmoothReveal delay={0.12}>
        <section id="about" className="scroll-mt-8">
          <div className="rounded-2xl bg-[#0F1623] border border-white/[0.08] p-6 sm:p-8 shadow-2xl">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3B82F6]">
              04 / THE COMMUNITY
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight mt-2">
              Your people. Your game.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl leading-relaxed">
              Join 100+ BHOS players on WhatsApp for training sessions, match updates, tournament news, and a little friendly competition.
            </p>

            <a
              href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#22C55E] hover:bg-[#16A34A] text-slate-950 font-bold text-xs transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-[#22C55E]/20"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Join WhatsApp Community</span>
            </a>
          </div>
        </section>
      </SmoothReveal>
    </div>
  );
}

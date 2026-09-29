'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BHOSDataStore } from '../../lib/data/store';
import { PlayerProfile } from '../../lib/data/types';
import SmoothReveal from '../../components/SmoothReveal';
import { Search } from 'lucide-react';

export default function LeaderboardPage() {
  const store = BHOSDataStore.getInstance();
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const update = () => {
      setProfiles(store.getProfiles());
    };
    update();
    return store.subscribe(update);
  }, [store]);

  const filteredProfiles = useMemo(() => {
    return profiles
      .filter((p) =>
        p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.major_faculty.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => b.current_elo - a.current_elo);
  }, [profiles, searchQuery]);

  return (
    <div className="space-y-6 pb-8">
      <SmoothReveal>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3B82F6]">
              01 / THE FIELD
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
              The leaderboard.
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 pt-0.5">
              Every match moves the needle. Track the current BHOS ELO standings below.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search player..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#0F1623] border border-white/[0.08] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#3B82F6] transition"
            />
          </div>
        </div>
      </SmoothReveal>

      <SmoothReveal delay={0.08}>
        <div className="rounded-2xl bg-[#0F1623] border border-white/[0.08] p-4 sm:p-5 shadow-2xl">
          {/* Desktop Table Column Headers */}
          <div className="hidden lg:grid lg:grid-cols-12 px-4 pb-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
            <div className="col-span-1">RANK</div>
            <div className="col-span-3">PLAYER NAME</div>
            <div className="col-span-3">FACULTY</div>
            <div className="col-span-3">BLADE / RUBBER</div>
            <div className="col-span-1 text-center">MATCHES</div>
            <div className="col-span-1 text-right">POINTS</div>
          </div>

          <div className="space-y-2.5">
            {filteredProfiles.map((player, idx) => {
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
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
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
      </SmoothReveal>
    </div>
  );
}

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MatchRecord, PlayerProfile } from '../lib/data/types';

interface RecentFormBadgesProps {
  matches: MatchRecord[];
  player: PlayerProfile;
  playerId?: string;
}

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const badgeVariants = {
  hidden: {
    opacity: 0,
    y: 10,
    scale: 0.8,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 380,
      damping: 20,
    },
  },
};

export default function RecentFormBadges({
  matches,
  player,
  playerId,
}: RecentFormBadgesProps) {
  const recentFive = React.useMemo(() => {
    const confirmed = matches.filter(
      (m) =>
        (m.status === 'confirmed' || m.status === 'approved' || !m.status) &&
        m.status !== 'rejected' &&
        m.status !== 'pending'
    );
    const sortedDesc = [...confirmed].sort(
      (a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
    );
    return sortedDesc.slice(0, 5);
  }, [matches]);

  if (recentFive.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
        Son Forma:
      </span>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex items-center gap-1.5"
      >
        {recentFive.map((m) => {
          const isPlayer1 =
            m.player1_id === playerId ||
            m.player1_id === player.id ||
            (player.full_name
              ? m.player1_name?.trim().toLowerCase() === player.full_name.trim().toLowerCase()
              : false);
          const myScore = isPlayer1 ? m.player1_score : m.player2_score;
          const opScore = isPlayer1 ? m.player2_score : m.player1_score;
          const won = myScore > opScore;
          const opponentName = isPlayer1
            ? m.player2_name || 'Rəqib'
            : m.player1_name || 'Rəqib';

          return (
            <motion.span
              key={m.id}
              variants={badgeVariants}
              title={`${won ? 'Qələbə (W)' : 'Məğlubiyyət (L)'} vs ${opponentName} (${myScore}-${opScore})`}
              className={`w-6 h-6 rounded-lg font-mono text-[11px] font-black flex items-center justify-center border select-none will-change-transform ${
                won
                  ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/40 shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                  : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/35'
              }`}
            >
              {won ? 'W' : 'L'}
            </motion.span>
          );
        })}
      </motion.div>
    </div>
  );
}


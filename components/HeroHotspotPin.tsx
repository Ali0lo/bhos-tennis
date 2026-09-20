'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { 
  Table as TableIcon, 
  Trophy, 
  Users, 
  MessageCircle, 
  ExternalLink, 
  X, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export type HotspotType = 'hall' | 'league' | 'community';

interface HeroHotspotPinProps {
  type: HotspotType;
  className?: string;
  badgeLabel?: string;
}

export default function HeroHotspotPin({ type, className = '', badgeLabel }: HeroHotspotPinProps) {
  const [isOpen, setIsOpen] = useState(false);

  const config = {
    hall: {
      color: 'pink',
      pingColor: 'bg-pink-400',
      bgColor: 'bg-pink-500',
      shadowColor: 'shadow-pink-500/50',
      icon: TableIcon,
      label: badgeLabel || 'Hall & Tables',
      title: 'BHOS Sports Hall',
      subtitle: '4 Competition Tables',
      description: 'BHOS Sports Hall — 4 Tables (Table 1: Women / Girls Dedicated, Tables 2–4: Men / Boys).',
      link: '/tables',
      linkText: 'View Hall Guide',
    },
    league: {
      color: 'cyan',
      pingColor: 'bg-cyan-400',
      bgColor: 'bg-cyan-400',
      shadowColor: 'shadow-cyan-400/50',
      icon: Trophy,
      label: badgeLabel || 'Club League',
      title: 'Official BHOS League',
      subtitle: 'Dynamic ELO Ladder',
      description: 'Dynamic ELO Ladder & Real-Time Rankings based on tabletennis.az and ITTF competition metrics.',
      link: '/leaderboard',
      linkText: 'Explore Leaderboard',
    },
    community: {
      color: 'emerald',
      pingColor: 'bg-emerald-400',
      bgColor: 'bg-emerald-500',
      shadowColor: 'shadow-emerald-500/50',
      icon: MessageCircle,
      label: badgeLabel || 'Community',
      title: 'BHOS TT Community',
      subtitle: '100+ Active Players',
      description: 'Direct WhatsApp matchmaking, training partners, and match recordings for students and staff.',
      link: 'https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN',
      linkText: 'Join WhatsApp Group',
      isExternal: true,
    },
  }[type];

  const Icon = config.icon;

  return (
    <div className={`relative ${className}`}>
      {/* Radar Pulse Trigger Button */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.95 }}
        className="group relative flex items-center justify-center cursor-pointer focus:outline-none"
        aria-label={config.label}
      >
        {/* Radar ping rings */}
        <span className={`animate-ping absolute inline-flex h-7 w-7 rounded-full ${config.pingColor} opacity-75`} />
        
        {/* Center glowing core pin */}
        <span className={`relative inline-flex rounded-full h-6 w-6 ${config.bgColor} text-slate-950 items-center justify-center border-2 border-white shadow-lg ${config.shadowColor} transition-transform`}>
          <Icon className="w-3 h-3 fill-current" />
        </span>

        {/* Minimal pill label */}
        <span className="hidden md:inline-block ml-2 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/15 text-[11px] font-bold text-white shadow-lg group-hover:border-cyan-400/40 transition">
          {config.label}
        </span>
      </motion.button>

      {/* Frosted Glass Tool-Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            onMouseLeave={() => setIsOpen(false)}
            className="absolute bottom-10 left-0 sm:-left-6 w-72 sm:w-80 rounded-3xl border border-white/15 bg-slate-950/85 backdrop-blur-2xl p-5 shadow-2xl z-50 text-xs space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-lg ${config.bgColor} text-slate-950 flex items-center justify-center font-bold`}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h4 className="font-display font-bold text-white text-xs leading-none">
                    {config.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 leading-none">
                    {config.subtitle}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Description */}
            <p className="text-slate-300 leading-relaxed text-[11px]">
              {config.description}
            </p>

            {/* Special Section: Stacked Avatars for Community Pin */}
            {type === 'community' && (
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center -space-x-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-500 border-2 border-slate-950 text-[10px] font-bold text-slate-950 flex items-center justify-center">
                    AI
                  </span>
                  <span className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-950 text-[10px] font-bold text-slate-950 flex items-center justify-center">
                    IM
                  </span>
                  <span className="w-6 h-6 rounded-full bg-amber-500 border-2 border-slate-950 text-[10px] font-bold text-slate-950 flex items-center justify-center">
                    AA
                  </span>
                  <span className="w-6 h-6 rounded-full bg-purple-500 border-2 border-slate-950 text-[10px] font-bold text-slate-950 flex items-center justify-center">
                    HM
                  </span>
                  <span className="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-950 text-[9px] font-bold text-cyan-300 flex items-center justify-center">
                    +100
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Now
                </span>
              </div>
            )}

            {/* CTA Link Button */}
            {config.isExternal ? (
              <a
                href={config.link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition active:scale-95"
              >
                <span>{config.linkText}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <Link
                href={config.link}
                className="w-full py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 transition active:scale-95"
              >
                <span>{config.linkText}</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Stacked avatar preview for BHOS community hotspot

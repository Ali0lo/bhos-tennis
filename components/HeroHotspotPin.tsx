'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trophy, Layers, ExternalLink, ChevronRight, Check } from 'lucide-react';

export interface HeroHotspotPinProps {
  title: string;
  subtitle: string;
  badge?: string;
  icon?: 'hall' | 'trophy' | 'community';
  top: string;
  left: string;
  items?: string[];
  ctaText?: string;
  ctaLink?: string;
  avatars?: string[];
}

export default function HeroHotspotPin(props: HeroHotspotPinProps) {
  return (
    <div style={{ top: props.top, left: props.left }} className="absolute z-20">
      <span className="relative flex h-5 w-5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-5 w-5 bg-cyan-500" />
      </span>
    </div>
  );
}

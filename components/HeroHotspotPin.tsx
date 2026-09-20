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

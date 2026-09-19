'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '../lib/i18n';
import { Trophy, ExternalLink, MapPin, Mail, ShieldCheck } from 'lucide-react';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-bhos-border bg-bhos-navy/80 mt-20 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Description */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center shadow-md overflow-hidden">
                <img src="/images/bhos-logo.png" alt="BHOS Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="text-white font-bold font-display text-base">
                  {t('brand.title')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('brand.subtitle')}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              {t('brand.motto')}. Dedicated to developing competitive table tennis talent, collegiate ranking systems, and sportsmanship across Baku Higher Oil School engineering faculties.
            </p>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-bhos-cyan" />
                <span>BHOS Bibiheybat Campus Sports Complex</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider">
              {t('nav.home')}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/leaderboard" className="hover:text-bhos-cyan transition">
                  {t('nav.leaderboard')}
                </Link>
              </li>
              <li>
                <Link href="/matches" className="hover:text-bhos-cyan transition">
                  {t('nav.matches')}
                </Link>
              </li>
              <li>
                <Link href="/tournaments" className="hover:text-bhos-cyan transition">
                  {t('nav.tournaments')}
                </Link>
              </li>
              <li>
                <Link href="/tables" className="hover:text-bhos-cyan transition">
                  {t('nav.tables')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Affiliation & Federation Links */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider">
              Standards & Affiliation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://tabletennis.az"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-slate-300 hover:text-bhos-cyan transition"
                >
                  <span>tabletennis.az (ATTF)</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li>
                <a
                  href="https://bhos.edu.az"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-slate-300 hover:text-bhos-cyan transition"
                >
                  <span>bhos.edu.az</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li>
                <span className="inline-block px-2 py-1 rounded bg-slate-800 text-[11px] text-emerald-400 border border-emerald-500/30">
                  ITTF Rules Compliant
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-bhos-border flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© {new Date().getFullYear()} BHOS Table Tennis Club. Built for Baku Higher Oil School.</p>
          <p className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-bhos-cyan" />
            <span>Official ELO Rating Engine (K=32 / K=48)</span>
          </p>
        </div>
      </div>
    </footer>
  );
}


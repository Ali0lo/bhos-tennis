'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslation, Locale } from '../lib/i18n';
import { BHOSDataStore } from '../lib/data/store';
import { PlayerProfile } from '../lib/data/types';
import MatchLoggerModal from './MatchLoggerModal';

export default function Navbar() {
  const { locale, setLocale } = useTranslation();
  const pathname = usePathname();
  const store = BHOSDataStore.getInstance();

  const [currentUser, setCurrentUser] = useState<PlayerProfile>(store.getCurrentUser());
  const [showMatchModal, setShowMatchModal] = useState(false);

  useEffect(() => {
    setCurrentUser(store.getCurrentUser());
    const unsub = store.subscribe(() => {
      setCurrentUser(store.getCurrentUser());
    });
    return unsub;
  }, [store]);

  const navLinks = [
    { href: '/#leaderboard', pageHref: '/leaderboard', label: 'Leaderboard' },
    { href: '/#tournaments', pageHref: '/tournaments', label: 'Tournaments' },
    { href: '/#tables', pageHref: '/tables', label: 'Hall & Tables' },
    { href: '/#about', pageHref: '/#about', label: 'About' },
  ];

  const renderBrand = () => (
    <Link href="/" className="inline-flex items-center gap-2.5 group shrink-0">
      <div className="w-8 h-8 rounded-full bg-[#111927] border border-white/10 flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
        <img
          src="/images/bhos-crest.png"
          alt="BHOS Crest"
          className="w-full h-full object-contain filter drop-shadow-[0_0_4px_rgba(59,130,246,0.5)] mix-blend-screen"
        />
      </div>
      <div className="text-left">
        <div className="font-display font-extrabold text-xs text-white tracking-wider uppercase leading-none">
          BHOS / TT
        </div>
        <div className="text-[8px] font-bold tracking-[0.18em] text-slate-500 uppercase mt-1 leading-none">
          TABLE TENNIS CLUB
        </div>
      </div>
    </Link>
  );

  const renderLangSwitcher = () => (
    <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
      {(['az', 'en', 'ru'] as Locale[]).map((loc, idx) => {
        const isActive = locale === loc;
        return (
          <React.Fragment key={loc}>
            <button
              onClick={() => setLocale(loc)}
              className={`uppercase transition-colors ${
                isActive ? 'text-white font-extrabold' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {loc}
            </button>
            {idx < 2 && <span className="text-slate-700">|</span>}
          </React.Fragment>
        );
      })}
    </div>
  );

  const renderWhatsAppBtn = () => (
    <a
      href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-[#22C55E] hover:bg-[#16A34A] text-slate-950 font-bold text-[11px] tracking-tight transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-sm"
    >
      Join WhatsApp
    </a>
  );

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-5xl mx-auto px-5 sm:px-8 pt-5"
      >
        <div className="rounded-2xl bg-[#0C121E] border border-white/[0.07] px-5 py-4 shadow-xl">
          {/* Desktop Layout (lg and up): Single Row */}
          <div className="hidden lg:flex items-center justify-between gap-6">
            {renderBrand()}

            <nav className="flex items-center gap-6">
              {navLinks.map((link) => {
                const targetHref = pathname === '/' ? link.href : link.pageHref;
                const isActive = pathname === link.pageHref;
                return (
                  <Link
                    key={link.label}
                    href={targetHref}
                    className={`text-xs font-medium transition-colors ${
                      isActive ? 'text-white font-semibold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-4">
              {renderLangSwitcher()}
              {renderWhatsAppBtn()}
            </div>
          </div>

          {/* Tablet Layout (md to lg): Centered Brand top row, Links + Actions second row */}
          <div className="hidden md:flex lg:hidden flex-col items-center gap-3.5">
            <div className="flex justify-center">{renderBrand()}</div>
            <div className="w-full flex items-center justify-between gap-4 pt-1">
              <nav className="flex items-center gap-5">
                {navLinks.map((link) => {
                  const targetHref = pathname === '/' ? link.href : link.pageHref;
                  return (
                    <Link
                      key={link.label}
                      href={targetHref}
                      className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="flex items-center gap-4">
                {renderLangSwitcher()}
                {renderWhatsAppBtn()}
              </div>
            </div>
          </div>

          {/* Phone Layout (below md): Left-aligned vertical stack matching screenshot */}
          <div className="flex md:hidden flex-col items-start gap-3.5">
            {renderBrand()}
            <nav className="flex flex-col items-start gap-2 pt-1">
              {navLinks.map((link) => {
                const targetHref = pathname === '/' ? link.href : link.pageHref;
                return (
                  <Link
                    key={link.label}
                    href={targetHref}
                    className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="pt-0.5">{renderLangSwitcher()}</div>
            <div className="pt-0.5">{renderWhatsAppBtn()}</div>
          </div>
        </div>
      </motion.header>

      {showMatchModal && (
        <MatchLoggerModal onClose={() => setShowMatchModal(false)} />
      )}
    </>
  );
}

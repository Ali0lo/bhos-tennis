'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation, Locale } from '../lib/i18n';

const NAV_COPY: Record<
  Locale,
  {
    subtitle: string;
    leaderboard: string;
    tournaments: string;
    tables: string;
    about: string;
    whatsapp: string;
  }
> = {
  en: {
    subtitle: 'TABLE TENNIS CLUB',
    leaderboard: 'Leaderboard',
    tournaments: 'Tournaments',
    tables: 'Hall & Tables',
    about: 'About',
    whatsapp: 'Join WhatsApp',
  },
  az: {
    subtitle: 'STOLÜSTÜ TENNİS KLUBU',
    leaderboard: 'Reytinq',
    tournaments: 'Turnirlər',
    tables: 'Zal və Masalar',
    about: 'Haqqımızda',
    whatsapp: 'WhatsApp-a Qoşul',
  },
  ru: {
    subtitle: 'КЛУБ НАСТОЛЬНОГО ТЕННИСА',
    leaderboard: 'Рейтинг',
    tournaments: 'Турниры',
    tables: 'Зал и Столы',
    about: 'О клубе',
    whatsapp: 'WhatsApp чат',
  },
};

export default function Navbar() {
  const { locale, setLocale } = useTranslation();
  const copy = NAV_COPY[locale] || NAV_COPY.en;

  const navLinks = [
    { href: '/#leaderboard', label: copy.leaderboard },
    { href: '/#tournaments', label: copy.tournaments },
    { href: '/#tables', label: copy.tables },
    { href: '/#about', label: copy.about },
  ];

  return (
    <header className="w-full max-w-[1060px] mx-auto px-4 sm:px-6 pt-5">
      <div className="w-full rounded-2xl bg-[#121721] border border-[#1E2636] px-5 py-4 shadow-xl">
        {/* Desktop Layout (lg and up): Single Horizontal Row */}
        <div className="hidden lg:flex items-center justify-between">
          {/* Brand Crest & Title */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <img
              src="/images/bhos-crest.png"
              alt="BHOS Crest"
              className="w-8 h-8 object-contain"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-white leading-tight">
                BHOS / TT
              </span>
              <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#64748B] leading-tight mt-0.5">
                {copy.subtitle}
              </span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-medium text-[#94A3B8] hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Action Toolbar: Language Switcher + Join WhatsApp */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#64748B]">
              {(['az', 'en', 'ru'] as Locale[]).map((loc, idx) => (
                <React.Fragment key={loc}>
                  <button
                    onClick={() => setLocale(loc)}
                    className={`uppercase transition-colors ${
                      locale === loc
                        ? 'text-white font-bold'
                        : 'text-[#64748B] hover:text-[#94A3B8]'
                    }`}
                  >
                    {loc}
                  </button>
                  {idx < 2 && <span className="text-[#2E3A52]">|</span>}
                </React.Fragment>
              ))}
            </div>

            <a
              href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#34D399] hover:bg-[#2BB984] text-[#051B11] text-xs font-bold transition active:scale-95"
            >
              {copy.whatsapp}
            </a>
          </div>
        </div>

        {/* Tablet Layout (sm to lg): Centered Stack */}
        <div className="hidden sm:flex lg:hidden flex-col items-center gap-3.5 py-1">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/images/bhos-crest.png"
              alt="BHOS Crest"
              className="w-7 h-7 object-contain"
            />
            <div className="flex flex-col text-left">
              <span className="font-extrabold text-sm tracking-tight text-white leading-tight">
                BHOS / TT
              </span>
              <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#64748B] leading-tight">
                {copy.subtitle}
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-medium text-[#94A3B8] hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#64748B]">
              {(['az', 'en', 'ru'] as Locale[]).map((loc, idx) => (
                <React.Fragment key={loc}>
                  <button
                    onClick={() => setLocale(loc)}
                    className={`uppercase transition-colors ${
                      locale === loc
                        ? 'text-white font-bold'
                        : 'text-[#64748B] hover:text-[#94A3B8]'
                    }`}
                  >
                    {loc}
                  </button>
                  {idx < 2 && <span className="text-[#2E3A52]">|</span>}
                </React.Fragment>
              ))}
            </div>

            <a
              href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-[#34D399] hover:bg-[#2BB984] text-[#051B11] text-xs font-bold transition"
            >
              {copy.whatsapp}
            </a>
          </div>
        </div>

        {/* Phone Layout (< sm): Left-Aligned Vertical Card Stack */}
        <div className="flex sm:hidden flex-col items-start gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/images/bhos-crest.png"
              alt="BHOS Crest"
              className="w-7 h-7 object-contain"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-white leading-tight">
                BHOS / TT
              </span>
              <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#64748B] leading-tight">
                {copy.subtitle}
              </span>
            </div>
          </Link>

          <nav className="flex flex-col items-start gap-2.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-medium text-[#94A3B8] hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col items-start gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#64748B]">
              {(['az', 'en', 'ru'] as Locale[]).map((loc, idx) => (
                <React.Fragment key={loc}>
                  <button
                    onClick={() => setLocale(loc)}
                    className={`uppercase transition-colors ${
                      locale === loc
                        ? 'text-white font-bold'
                        : 'text-[#64748B] hover:text-[#94A3B8]'
                    }`}
                  >
                    {loc}
                  </button>
                  {idx < 2 && <span className="text-[#2E3A52]">|</span>}
                </React.Fragment>
              ))}
            </div>

            <a
              href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#34D399] hover:bg-[#2BB984] text-[#051B11] text-xs font-bold transition"
            >
              {copy.whatsapp}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

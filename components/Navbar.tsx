'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation, Locale } from '../lib/i18n';
import { BHOSDataStore } from '../lib/data/store';
import { PlayerProfile, UserRole } from '../lib/data/types';
import { 
  Trophy, 
  Table as TableIcon, 
  Calendar, 
  History, 
  ShieldCheck, 
  UserCheck, 
  Menu, 
  X, 
  PlusCircle, 
  Languages, 
  ChevronDown,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import MatchLoggerModal from './MatchLoggerModal';

export default function Navbar() {
  const { t, locale, setLocale } = useTranslation();
  const pathname = usePathname();
  const store = BHOSDataStore.getInstance();

  const [currentUser, setCurrentUser] = useState<PlayerProfile>(store.getCurrentUser());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);

  useEffect(() => {
    setCurrentUser(store.getCurrentUser());
    const unsub = store.subscribe(() => {
      setCurrentUser(store.getCurrentUser());
    });
    return unsub;
  }, [store]);

  const navLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/leaderboard', label: t('nav.leaderboard') },
    { href: '/matches', label: t('nav.matches') },
    { href: '/tournaments', label: t('nav.tournaments') },
    { href: '/tables', label: t('nav.tables') || 'Hall & Tables' },
  ];

  if (currentUser.role === 'president') {
    navLinks.push({ href: '/admin', label: t('nav.admin') });
  }

  const roleDemoUsers = [
    { id: 'p-1', role: 'president' as UserRole, label: `Ali Iskandarli (${t('roles.president')})` },
    { id: 'p-2', role: 'coach' as UserRole, label: `Iftixar Meherremov (${t('roles.coach')})` },
    { id: 'p-3', role: 'player' as UserRole, label: 'Ali Abdulov (Player)' },
    { id: 'p-4', role: 'player' as UserRole, label: 'Ali Aghayev (Player)' },
    { id: 'p-5', role: 'player' as UserRole, label: 'Huseyn Muradzade (Player)' },
    { id: 'p-6', role: 'player' as UserRole, label: 'Fateh Memmedli (Player)' },
    { id: 'p-7', role: 'player' as UserRole, label: 'Ayan Aliyeva (Player)' },
  ];

  const handleRoleChange = (userId: string) => {
    store.setCurrentUser(userId);
    setRoleDropdownOpen(false);
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'president':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'coach':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'player':
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    }
  };

  return (
    <>
      {/* Floating Glassmorphism Pill Header */}
      <header className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="w-full max-w-6xl rounded-full border border-white/10 bg-slate-950/80 backdrop-blur-xl px-4 sm:px-6 py-2.5 shadow-2xl shadow-black/80 pointer-events-auto flex items-center justify-between transition-all">
          {/* Brand Crest & Title */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
              <img
                src="/images/bhos-crest.png"
                alt="BHOS Crest"
                className="w-full h-full object-contain filter drop-shadow-[0_0_6px_rgba(0,229,255,0.6)]"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-black text-sm sm:text-base text-white group-hover:text-cyan-400 transition-colors tracking-tight">
                  BHOS TT
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-bold uppercase rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  CLUB
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block leading-none">
                Baku Higher Oil School
              </p>
            </div>
          </Link>

          {/* Center Navigation Links (Pill Style) */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/5 border border-white/5 rounded-full p-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Toolbar: WhatsApp CTA, Language, Role Switcher */}
          <div className="flex items-center gap-2">
            {/* WhatsApp Community Link Button */}
            <a
              href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition active:scale-95 shadow-sm"
              title="Join official BHOS Table Tennis WhatsApp Community"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-emerald-400" />
              <span>WhatsApp</span>
            </a>

            {/* Quick Log Match (Coach / President) */}
            {(currentUser.role === 'coach' || currentUser.role === 'president') && (
              <button
                onClick={() => setShowMatchModal(true)}
                className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-cyan-400 text-slate-950 text-xs font-bold hover:bg-cyan-300 shadow-md shadow-cyan-500/20 transition active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Log Match</span>
              </button>
            )}

            {/* Language Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-slate-300 hover:text-white hover:border-white/20 transition"
              >
                <Languages className="w-3 h-3 text-cyan-400" />
                <span className="uppercase font-bold text-[11px]">{locale}</span>
                <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
              </button>
              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 w-28 rounded-2xl border border-white/10 bg-slate-950 p-1.5 shadow-2xl z-50">
                  {(['az', 'en', 'ru'] as Locale[]).map((loc) => (
                    <button
                      key={loc}
                      onClick={() => {
                        setLocale(loc);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs transition uppercase ${
                        locale === loc
                          ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                          : 'text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {loc === 'az' ? 'Azərbaycan' : loc === 'en' ? 'English' : 'Русский'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Role Switcher Demo Dropdown */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition ${getRoleBadgeColor(
                  currentUser.role
                )}`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="font-semibold max-w-[90px] sm:max-w-none truncate">
                  {currentUser.full_name.split(' ')[0]}
                </span>
                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
              </button>
              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-slate-950 p-2 shadow-2xl z-50">
                  <p className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Switch Active User (Demo)
                  </p>
                  <div className="space-y-1 mt-1">
                    {roleDemoUsers.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleRoleChange(item.id)}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                          currentUser.id === item.id
                            ? 'bg-white/15 text-white font-bold'
                            : 'text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full border uppercase shrink-0 ${getRoleBadgeColor(
                            item.role
                          )}`}
                        >
                          {item.role}
                        </span>
                      </button>
                    ))}
                    <div className="mt-2 pt-2 border-t border-white/10 px-2">
                      <Link
                        href={`/players/${currentUser.id}`}
                        onClick={() => setRoleDropdownOpen(false)}
                        className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <UserCheck className="w-3 h-3" />
                        {t('profile.details')}
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-full border border-white/10 bg-white/5 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="w-full max-w-sm mx-auto mt-2 rounded-3xl border border-white/10 bg-slate-950/95 backdrop-blur-2xl p-4 shadow-2xl pointer-events-auto space-y-3">
            <div className="grid grid-cols-3 gap-1">
              {(['az', 'en', 'ru'] as Locale[]).map((loc) => (
                <button
                  key={loc}
                  onClick={() => setLocale(loc)}
                  className={`py-1.5 text-xs text-center rounded-xl uppercase font-semibold ${
                    locale === loc
                      ? 'bg-cyan-400 text-slate-950 font-bold'
                      : 'bg-white/5 text-slate-300'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-xl text-xs font-semibold ${
                    pathname === link.href
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="pt-3 border-t border-white/10">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                {t('nav.switch_role')}:
              </p>
              <div className="space-y-1">
                {roleDemoUsers.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleRoleChange(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                      currentUser.id === item.id
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <a
              href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 fill-slate-950" />
              <span>Join WhatsApp Group</span>
            </a>
          </div>
        )}
      </header>

      {/* Spacing spacer for floating navbar */}
      <div className="h-20" />

      {/* Match Logger Modal */}
      {showMatchModal && (
        <MatchLoggerModal onClose={() => setShowMatchModal(false)} />
      )}
    </>
  );
}

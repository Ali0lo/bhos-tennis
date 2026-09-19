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
  ChevronDown 
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
    { href: '/tables', label: t('nav.tables') },
  ];

  if (currentUser.role === 'president') {
    navLinks.push({ href: '/admin', label: t('nav.admin') });
  }

  const roleDemoUsers = [
    { id: 'p-1', role: 'president' as UserRole, label: `${t('roles.president')} (Elvin)` },
    { id: 'p-2', role: 'coach' as UserRole, label: `${t('roles.coach')} (Murad)` },
    { id: 'p-3', role: 'player' as UserRole, label: `${t('roles.player')} (Ayan)` },
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
      <header className="sticky top-0 z-40 w-full border-b border-bhos-border bg-bhos-navy/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Title */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                <span className="font-display font-black text-xl tracking-wider">BANM</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-lg text-white group-hover:text-bhos-cyan transition-colors">
                    BHOS Table Tennis
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-bhos-blue/30 text-bhos-cyan border border-bhos-blue/40">
                    BANM TT
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Bakı Ali Neft Məktəbi • tabletennis.az
                </p>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-bhos-border text-bhos-cyan shadow-inner font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right Action Toolbar: Role Switcher, Quick Match Log, Lang */}
            <div className="hidden sm:flex items-center gap-2.5">
              {/* Quick Log Match Button (Coach / President) */}
              {(currentUser.role === 'coach' || currentUser.role === 'president') && (
                <button
                  onClick={() => setShowMatchModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-bhos-cyan to-bhos-blue text-bhos-navy hover:opacity-95 shadow-md shadow-cyan-500/20 transition-transform active:scale-95"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{t('nav.log_match')}</span>
                </button>
              )}

              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-bhos-border bg-bhos-darkCard/60 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition"
                  title="Switch Language"
                >
                  <Languages className="w-3.5 h-3.5 text-bhos-cyan" />
                  <span className="uppercase font-bold">{locale}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {langDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-28 rounded-lg border border-bhos-border bg-bhos-midnight p-1 shadow-xl z-50">
                    {(['az', 'en', 'ru'] as Locale[]).map((loc) => (
                      <button
                        key={loc}
                        onClick={() => {
                          setLocale(loc);
                          setLangDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded text-xs transition uppercase ${
                          locale === loc
                            ? 'bg-bhos-blue/30 text-bhos-cyan font-bold'
                            : 'text-slate-300 hover:bg-slate-800'
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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${getRoleBadgeColor(
                    currentUser.role
                  )}`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="font-semibold">{currentUser.full_name}</span>
                  <span className="text-[10px] opacity-80 uppercase">({currentUser.role})</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>
                {roleDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-bhos-border bg-bhos-midnight p-2 shadow-2xl z-50">
                    <p className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {t('nav.switch_role')} (Demo Mode)
                    </p>
                    {roleDemoUsers.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleRoleChange(item.id)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                          currentUser.id === item.id
                            ? 'bg-slate-800 text-white font-bold'
                            : 'text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <span>{item.label}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded border uppercase ${getRoleBadgeColor(
                            item.role
                          )}`}
                        >
                          {item.role}
                        </span>
                      </button>
                    ))}
                    <div className="mt-2 pt-2 border-t border-slate-800 px-2">
                      <Link
                        href={`/players/${currentUser.id}`}
                        onClick={() => setRoleDropdownOpen(false)}
                        className="text-[11px] text-bhos-cyan hover:underline flex items-center gap-1"
                      >
                        <UserCheck className="w-3 h-3" />
                        {t('profile.details')}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg border border-bhos-border bg-bhos-darkCard/60 text-slate-300 hover:text-white"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-bhos-border bg-bhos-midnight px-4 pt-3 pb-5 space-y-2">
            <div className="grid grid-cols-3 gap-1 mb-3">
              {(['az', 'en', 'ru'] as Locale[]).map((loc) => (
                <button
                  key={loc}
                  onClick={() => {
                    setLocale(loc);
                  }}
                  className={`py-1.5 text-xs text-center rounded uppercase font-semibold ${
                    locale === loc
                      ? 'bg-bhos-cyan text-bhos-navy font-bold'
                      : 'bg-slate-800 text-slate-300'
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
                  className={`block px-3 py-2 rounded-lg text-sm ${
                    pathname === link.href
                      ? 'bg-bhos-blue/20 text-bhos-cyan font-bold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800">
              <p className="text-xs text-slate-400 mb-2">{t('nav.switch_role')}:</p>
              <div className="space-y-1">
                {roleDemoUsers.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleRoleChange(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded text-xs flex items-center justify-between ${
                      currentUser.id === item.id
                        ? 'bg-bhos-blue text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Match Logger Modal */}
      {showMatchModal && (
        <MatchLoggerModal onClose={() => setShowMatchModal(false)} />
      )}
    </>
  );
}


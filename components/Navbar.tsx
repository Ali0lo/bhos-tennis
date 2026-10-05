'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  MessageCircle, 
  ChevronDown,
  LogIn,
  LogOut
} from 'lucide-react';
import MatchLoggerModal from './MatchLoggerModal';

export default function Navbar() {
  const { t, locale, setLocale } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const store = BHOSDataStore.getInstance();

  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(store.getCurrentUser());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);

  useEffect(() => {
    setCurrentUser(store.getCurrentUser());
    const unsub = store.subscribe(() => {
      setCurrentUser(store.getCurrentUser());
    });
    return unsub;
  }, [store]);

  const navLinks = [
    { href: '/leaderboard', label: t('nav.leaderboard') },
    { href: '/tournaments', label: t('nav.tournaments') },
    { href: '/tables', label: t('nav.tables') || 'Hall Info' },
    { href: '/#about', label: t('nav.about') || 'About' },
  ];

  if (currentUser && (currentUser.role === 'president' || currentUser.role === 'coach')) {
    navLinks.push({ href: '/admin', label: t('nav.admin') });
  }

  const handleSignOut = async () => {
    await store.signOut();
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    router.push('/');
    router.refresh();
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
      {/* Floating Pill Navigation per specification */}
      <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="w-full max-w-6xl rounded-full border border-white/10 bg-black/40 backdrop-blur-md px-6 py-3 shadow-2xl shadow-black/80 pointer-events-auto flex items-center justify-between transition-all">
          {/* Brand Crest & Title */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
              <img
                src="/images/bhos-crest.png"
                alt="BHOS Crest"
                className="w-full h-full object-contain filter drop-shadow-[0_0_6px_rgba(0,229,255,0.6)] mix-blend-screen"
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
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
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

          {/* Right Action Toolbar: WhatsApp CTA, Quick Log Match, Language Toggle, Auth / Profile */}
          <div className="flex items-center gap-2.5">
            {/* Direct WhatsApp Community CTA Button */}
            <a
              href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition active:scale-95 shadow-sm"
              title="Official WhatsApp Community"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-emerald-400" />
              <span className="hidden sm:inline font-bold">WhatsApp</span>
            </a>

            {currentUser && currentUser.is_verified !== false && (
              <button
                onClick={() => setShowMatchModal(true)}
                className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-cyan-400 text-slate-950 text-xs font-bold hover:bg-cyan-300 shadow-md shadow-cyan-500/20 transition active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{t('nav.log_match')}</span>
              </button>
            )}

            {/* Minimalist Segmented Language Switcher (AZ | EN | RU) */}
            <div className="inline-flex items-center rounded-full bg-white/5 border border-white/10 p-0.5 text-[11px] font-bold">
              {(['az', 'en', 'ru'] as Locale[]).map((loc) => {
                const isActive = locale === loc;
                return (
                  <button
                    key={loc}
                    onClick={() => setLocale(loc)}
                    className={`px-2 py-0.5 rounded-full uppercase transition-all ${
                      isActive
                        ? 'bg-cyan-400 text-slate-950 shadow-sm font-extrabold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>

            {/* User Auth Section: Guest 'Sign In' vs Authenticated Profile Dropdown */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition ${getRoleBadgeColor(
                    currentUser.role
                  )}`}
                >
                  {currentUser.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.full_name}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span className="font-semibold max-w-[80px] sm:max-w-none truncate">
                    {currentUser.full_name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-[#0F1623]/95 backdrop-blur-xl p-3 shadow-2xl z-50">
                    <div className="px-2.5 py-2 border-b border-white/10 mb-2">
                      <p className="font-bold text-xs text-white truncate">{currentUser.full_name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full border uppercase ${getRoleBadgeColor(
                            currentUser.role
                          )}`}
                        >
                          {currentUser.role}
                        </span>
                        <span className="text-[11px] font-bold text-cyan-400">
                          {currentUser.current_elo.toLocaleString()} PTS
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Link
                        href={`/players/${currentUser.id}`}
                        onClick={() => setUserDropdownOpen(false)}
                        className="w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center gap-2 text-slate-300 hover:text-white hover:bg-white/5 transition"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{t('profile.details') || 'My Profile'}</span>
                      </Link>

                      {(currentUser.role === 'president' || currentUser.role === 'coach') && (
                        <Link
                          href="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center gap-2 text-slate-300 hover:text-white hover:bg-white/5 transition"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                          <span>{t('nav.admin')}</span>
                        </Link>
                      )}

                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center gap-2 text-rose-400 hover:bg-rose-500/10 transition border-t border-white/5 mt-1 pt-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{t('nav.signout', 'Sign Out')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('nav.signin', 'Sign In')}</span>
              </Link>
            )}

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
              {currentUser ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-white truncate">{currentUser.full_name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                    </div>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full border uppercase ${getRoleBadgeColor(
                        currentUser.role
                      )}`}
                    >
                      {currentUser.role}
                    </span>
                  </div>
                  <Link
                    href={`/players/${currentUser.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center py-2 rounded-xl bg-white/5 text-slate-300 hover:text-white text-xs font-semibold"
                  >
                    {t('profile.details') || 'My Profile'}
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('nav.signout', 'Sign Out')}</span>
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t('nav.signin', 'Sign In')}</span>
                </Link>
              )}
            </div>

            <a
              href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 fill-slate-950" />
              <span>{t('hero.join_whatsapp_btn')}</span>
            </a>
          </div>
        )}
      </header>

      {/* Spacing spacer for floating navbar */}
      <div className="h-24" />

      {/* Match Logger Modal */}
      {showMatchModal && (
        <MatchLoggerModal onClose={() => setShowMatchModal(false)} />
      )}
    </>
  );
}

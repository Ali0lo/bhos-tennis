'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation, Locale } from '../lib/i18n';
import { BHOSDataStore, getPlayerHref } from '../lib/data/store';
import {
  PlayerProfile,
  canAccessAdminPanel,
  isPresidentBadgeHolder,
} from '../lib/data/types';
import { usePendingMatchesCount } from '../lib/hooks/usePendingMatchesCount';
import {
  History,
  ShieldCheck,
  UserCheck,
  Menu,
  X,
  PlusCircle,
  MessageCircle,
  ChevronDown,
  LogIn,
  LogOut,
  Settings,
  Search,
  Gamepad2,
} from 'lucide-react';
import MatchLoggerModal from './MatchLoggerModal';
import EditProfileModal from './EditProfileModal';
import PlayerSearchModal from './PlayerSearchModal';

export default function Navbar() {
  const { t, locale, setLocale } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const store = BHOSDataStore.getInstance();

  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(store.getCurrentUser());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);
  const pendingMatchesCount = usePendingMatchesCount(currentUser?.id);

  useEffect(() => {
    setCurrentUser(store.getCurrentUser());
    const unsub = store.subscribe(() => {
      setCurrentUser(store.getCurrentUser());
    });
    return unsub;
  }, [store]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
        setMoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setUserDropdownOpen(false);
        setMoreDropdownOpen(false);
        setMobileMenuOpen(false);
        setShowSearchModal((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const leaderboardLabel = t('nav.ranking', 'Reytinq');
  const matchesLabel = t('nav.my_matches', 'Oyunlarım');
  const tournamentsLabel = t('nav.tournaments', 'Turnirlər');
  const miniGameLabel = t('nav.minigame', 'Mini-Oyun');
  const challengesLabel = t('nav.challenges', 'Meydan Oxu');
  const tablesLabel = t('nav.tables', 'Zal Qaydaları');
  const aboutLabel = t('nav.about', 'Haqqında');
  const moreLabel = t('nav.more', 'Daha çox');

  interface NavLinkItem {
    href: string;
    label: string;
    showBadge?: boolean;
    isArcade?: boolean;
  }

  const primaryNavLinks: NavLinkItem[] = [
    { href: '/leaderboard', label: leaderboardLabel },
    { href: '/matches', label: matchesLabel, showBadge: true },
    { href: '/tournaments', label: tournamentsLabel },
    { href: '/challenges', label: challengesLabel },
    { href: '/minigame', label: miniGameLabel, isArcade: true },
  ];

  const moreNavLinks: { href: string; label: string }[] = [
    { href: '/tables', label: tablesLabel },
    { href: '/#about', label: aboutLabel },
  ];

  const allMobileNavLinks = [
    { href: '/leaderboard', label: leaderboardLabel },
    { href: '/matches', label: matchesLabel, showBadge: true },
    { href: '/tournaments', label: tournamentsLabel },
    { href: '/challenges', label: challengesLabel },
    { href: '/minigame', label: miniGameLabel, isArcade: true },
    { href: '/tables', label: tablesLabel },
    { href: '/#about', label: aboutLabel },
    ...(canAccessAdminPanel(currentUser)
      ? [{ href: '/admin', label: t('nav.admin') || 'Prezident Paneli' }]
      : []),
  ];

  const handleSignOut = async () => {
    await store.signOut();
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  const getRoleBadgeColor = (user: PlayerProfile) => {
    if (isPresidentBadgeHolder(user)) {
      return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
    }
    switch (user.role) {
      case 'coach':
        return 'bg-emerald-600/15 text-emerald-400 border-emerald-600/40';
      case 'player':
      default:
        return 'bg-blue-700/20 text-blue-300 border-blue-600/40';
    }
  };

  return (
    <>
      <header
        ref={navRef}
        className="sticky top-0 z-50 w-full border-b border-[var(--border-hairline)] bg-[var(--bg-glass)] backdrop-blur-md"
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 relative flex items-center justify-between flex-nowrap gap-3">
          {/* Left Zone: Brand + Navigation Links */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/"
              aria-label="BHOS Table Tennis"
              className="group flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.04] border border-[var(--border-strong)] hover:border-white/40 transition-colors shrink-0"
            >
              <img
                src="/images/bhos-crest.png"
                alt="BHOS Crest"
                className="block h-5 w-auto max-w-[1.5rem]"
              />
            </Link>

            <button
              type="button"
              aria-label="Toggle navigation menu"
              onClick={() => {
                setMobileMenuOpen((prev) => !prev);
                setUserDropdownOpen(false);
                setMoreDropdownOpen(false);
              }}
              className="relative lg:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-slate-300 hover:text-white transition-colors shrink-0"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              {pendingMatchesCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E11D48] opacity-75" />
                  <span className="relative inline-flex items-center justify-center rounded-full bg-[#E11D48] px-1 text-[9px] font-black text-white h-4 min-w-[1rem] tabular-nums">
                    {pendingMatchesCount}
                  </span>
                </span>
              )}
            </button>

            <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 text-xs font-medium shrink-0 pl-1">
              {primaryNavLinks.map((link) => {
                const isActive = pathname === link.href;
                const hasBadge = link.showBadge && pendingMatchesCount > 0;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                      isActive
                        ? 'text-white font-semibold bg-white/[0.06] after:content-[""] after:absolute after:inset-x-2.5 after:-bottom-[17px] after:h-[2px] after:rounded-full after:bg-[#E11D48]'
                        : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {link.isArcade && (
                      <Gamepad2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span>{link.label}</span>
                    {hasBadge && (
                      <span className="relative flex h-4 min-w-[1rem] items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E11D48] opacity-75" />
                        <span className="relative inline-flex items-center justify-center rounded-full bg-[#E11D48] px-1 text-[9px] font-black text-white h-4 min-w-[1rem] tabular-nums">
                          {pendingMatchesCount}
                        </span>
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* Compact "Daha çox / More / Ещё" dropdown for secondary items */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setMoreDropdownOpen((prev) => !prev);
                    setUserDropdownOpen(false);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                    moreNavLinks.some((l) => pathname === l.href)
                      ? 'text-white font-semibold bg-white/[0.06]'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>{moreLabel}</span>
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </button>

                {moreDropdownOpen && (
                  <div className="absolute left-0 mt-2.5 w-48 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-1.5 shadow-2xl shadow-black/60 z-50">
                    {moreNavLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreDropdownOpen(false)}
                        className="block px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors whitespace-nowrap"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <a
                      href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMoreDropdownOpen(false)}
                      className="mt-1 pt-2 border-t border-[var(--border-hairline)] flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:bg-white/[0.06] transition-colors whitespace-nowrap"
                    >
                      <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{t('nav.join_whatsapp') || 'WhatsApp'}</span>
                    </a>
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Right Zone: Actions & Profile (strictly inline, h-8 aligned, no wrap) */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* Compact Player Quick-Search Pill */}
            <button
              type="button"
              onClick={() => {
                setShowSearchModal(true);
                setMoreDropdownOpen(false);
                setUserDropdownOpen(false);
                setMobileMenuOpen(false);
              }}
              aria-label={t('nav.search_placeholder', 'Oyunçu axtar...')}
              className="inline-flex items-center gap-2 h-8 px-2.5 sm:px-3 rounded-full bg-white/[0.04] border border-[var(--border-hairline)] hover:bg-white/[0.08] hover:border-[var(--border-strong)] text-xs text-slate-400 hover:text-slate-100 transition-colors shrink-0"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">
                {t('nav.search_placeholder', 'Oyunçu axtar...')}
              </span>
              <kbd className="hidden xl:inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.06] border border-[var(--border-hairline)] text-[10px] font-mono text-slate-400 leading-none">
                ⌘K
              </kbd>
            </button>

            {/* Multi-Language Switcher (AZ | EN | RU) */}
            <div
              role="group"
              aria-label="Language switcher"
              className="inline-flex items-center gap-0.5 h-8 p-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[11px] uppercase shrink-0"
            >
              {(['az', 'en', 'ru'] as Locale[]).map((loc) => {
                const isActive = locale === loc;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocale(loc)}
                    className={`uppercase transition-colors whitespace-nowrap rounded-md px-1.5 py-0.5 leading-none ${
                      isActive
                        ? 'text-white font-semibold bg-white/[0.11]'
                        : 'text-slate-400 hover:text-slate-200 font-medium'
                    }`}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>

            {currentUser && currentUser.is_verified !== false && (
              <button
                type="button"
                onClick={() => setShowMatchModal(true)}
                className="hidden md:inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#E11D48] text-white text-xs font-semibold hover:bg-[#F43F5E] transition active:scale-[0.98] whitespace-nowrap shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{t('nav.log_match') || 'Oyun Qeydiyyatı'}</span>
              </button>
            )}

            {canAccessAdminPanel(currentUser) && (
              <Link
                href="/admin"
                className="hidden xl:inline-flex items-center justify-center gap-1.5 h-8 bg-[var(--bg-surface)] hover:bg-white/[0.06] text-amber-300 border border-amber-500/25 px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{t('nav.admin') || 'Prezident Paneli'}</span>
              </Link>
            )}

            {currentUser ? (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setUserDropdownOpen((prev) => !prev);
                    setMobileMenuOpen(false);
                    setMoreDropdownOpen(false);
                  }}
                  className={`relative inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium transition whitespace-nowrap ${getRoleBadgeColor(
                    currentUser
                  )}`}
                >
                  {currentUser.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.full_name}
                      className="w-4 h-4 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="font-semibold max-w-[90px] truncate">
                    {currentUser.full_name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-60 shrink-0" />

                  {pendingMatchesCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white h-4 min-w-[1rem] shadow-sm">
                        {pendingMatchesCount}
                      </span>
                    </span>
                  )}
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-3 shadow-2xl shadow-black/60 z-50">
                    <div className="px-2.5 py-2 border-b border-[var(--border-hairline)] mb-2">
                      <p className="font-bold text-xs text-white truncate">{currentUser.full_name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full border uppercase ${getRoleBadgeColor(
                            currentUser
                          )}`}
                        >
                          {isPresidentBadgeHolder(currentUser)
                            ? t('roles.president_badge', 'Prezident')
                            : currentUser.role === 'coach'
                            ? t('roles.coach', 'Məşqçi')
                            : t('roles.player', 'Oyunçu')}
                        </span>
                        <span className="text-[11px] font-bold text-blue-400">
                          {currentUser.current_elo.toLocaleString()} {t('leaderboard.points_abbr', 'XAL')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Link
                        href="/matches"
                        onClick={() => setUserDropdownOpen(false)}
                        className="w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between text-slate-300 hover:text-white hover:bg-slate-800 transition"
                      >
                        <span className="flex items-center gap-2">
                          <History className="w-3.5 h-3.5 text-rose-500" />
                          <span>{t('nav.my_matches') || 'Oyunlarım'}</span>
                        </span>
                        {pendingMatchesCount > 0 && (
                          <span className="inline-flex items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                            {pendingMatchesCount} {t('nav.pending', 'gözləyir')}
                          </span>
                        )}
                      </Link>

                      <Link
                        href={getPlayerHref(currentUser.id)}
                        onClick={() => setUserDropdownOpen(false)}
                        className="w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800 transition"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                        <span>{t('profile.details') || 'Profilim'}</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          setShowEditProfileModal(true);
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800 transition"
                      >
                        <Settings className="w-3.5 h-3.5 text-blue-400" />
                        <span>{t('nav.customize_profile', 'Profili Fərdiləşdir')}</span>
                      </button>

                      {canAccessAdminPanel(currentUser) && (
                        <Link
                          href="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800 transition"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                          <span>{t('nav.admin') || 'Prezident Paneli'}</span>
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center gap-2 text-rose-400 hover:bg-rose-600/10 transition border-t border-slate-800 mt-1 pt-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{t('nav.signout', 'Çıxış')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-full bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold transition shadow-sm active:scale-95 whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span>{t('nav.signin', 'Daxil ol')}</span>
              </Link>
            )}
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-full inset-x-0 px-3 sm:px-4 pt-2 z-50">
            <div className="w-full max-w-6xl mx-auto max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain rounded-3xl border border-slate-800 bg-slate-900/95 backdrop-blur-md p-4 shadow-xl space-y-3">
              <div className="grid grid-cols-3 gap-1">
                {(['az', 'en', 'ru'] as Locale[]).map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocale(loc)}
                    className={`py-1.5 text-xs text-center rounded-xl uppercase font-semibold ${
                      locale === loc
                        ? 'bg-blue-700 text-white font-bold'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                {allMobileNavLinks.map((link) => {
                  const hasBadge = link.showBadge && pendingMatchesCount > 0;
                  const isArcade = 'isArcade' in link && Boolean(link.isArcade);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                        pathname === link.href
                          ? 'bg-white/[0.1] text-white'
                          : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        {isArcade && <Gamepad2 className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{link.label}</span>
                      </span>
                      {hasBadge && (
                        <span className="relative flex h-5 min-w-[1.25rem] items-center justify-center">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E11D48] opacity-75" />
                          <span className="relative inline-flex items-center justify-center rounded-full bg-[#E11D48] px-1.5 text-[10px] font-black text-white h-5 min-w-[1.25rem] tabular-nums">
                            {pendingMatchesCount}
                          </span>
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-800">
                {currentUser ? (
                  <div className="space-y-2">
                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-xs text-white truncate">{currentUser.full_name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                      </div>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full border uppercase ${getRoleBadgeColor(
                          currentUser
                        )}`}
                      >
                        {isPresidentBadgeHolder(currentUser)
                          ? t('roles.president_badge', 'Prezident')
                          : currentUser.role === 'coach'
                          ? t('roles.coach', 'Məşqçi')
                          : t('roles.player', 'Oyunçu')}
                      </span>
                    </div>
                    <Link
                      href={getPlayerHref(currentUser.id)}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-center py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                    >
                      {t('profile.details') || 'Profilim'}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setShowEditProfileModal(true);
                      }}
                      className="w-full text-center py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                    >
                      {t('nav.customize_profile', 'Profili Fərdiləşdir')}
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full py-2 rounded-xl bg-rose-600/15 border border-rose-600/30 text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{t('nav.signout', 'Çıxış')}</span>
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{t('nav.signin', 'Daxil ol')}</span>
                  </Link>
                )}
              </div>

              <a
                href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>{t('hero.join_whatsapp_btn') || 'WhatsApp Qrupuna Qoşul'}</span>
              </a>
            </div>
          </div>
        )}
      </header>

      <PlayerSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      />

      {showMatchModal && (
        <MatchLoggerModal onClose={() => setShowMatchModal(false)} />
      )}

      {currentUser && (
        <EditProfileModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          profile={currentUser}
          onProfileUpdated={(updated) => {
            setCurrentUser(updated);
          }}
        />
      )}
    </>
  );
}

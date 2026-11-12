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
} from 'lucide-react';
import MatchLoggerModal from './MatchLoggerModal';
import EditProfileModal from './EditProfileModal';

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
  const [isNavHidden, setIsNavHidden] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef<number>(0);
  const pendingMatchesCount = usePendingMatchesCount(currentUser?.id);

  useEffect(() => {
    setCurrentUser(store.getCurrentUser());
    const unsub = store.subscribe(() => {
      setCurrentUser(store.getCurrentUser());
    });
    return unsub;
  }, [store]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const lastScrollY = lastScrollYRef.current;
      const delta = currentScrollY - lastScrollY;

      if (currentScrollY <= 60) {
        setIsNavHidden(false);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      if (delta > 10 && currentScrollY > 60) {
        setIsNavHidden(true);
        setUserDropdownOpen(false);
        setMoreDropdownOpen(false);
        setMobileMenuOpen(false);
        lastScrollYRef.current = currentScrollY;
      } else if (delta < -6) {
        setIsNavHidden(false);
        lastScrollYRef.current = currentScrollY;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const leaderboardLabel = t('nav.ranking', 'Reytinq');
  const matchesLabel = t('nav.my_matches', 'Oyunlarım');
  const tournamentsLabel = t('nav.tournaments', 'Turnirlər');
  const miniGameLabel = t('nav.minigame', 'Mini-Oyun');
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
    { href: '/minigame', label: `🏓 ${miniGameLabel}`, isArcade: true },
  ];

  const moreNavLinks: { href: string; label: string }[] = [
    { href: '/tables', label: tablesLabel },
    { href: '/#about', label: aboutLabel },
  ];

  const allMobileNavLinks = [
    { href: '/leaderboard', label: leaderboardLabel },
    { href: '/matches', label: matchesLabel, showBadge: true },
    { href: '/tournaments', label: tournamentsLabel },
    { href: '/minigame', label: `🏓 ${miniGameLabel}` },
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
        className={`transition-all duration-300 ease-in-out fixed top-0 inset-x-0 z-50 pt-4 sm:pt-6 flex flex-col items-center px-3 sm:px-4 pointer-events-none ${
          isNavHidden
            ? '-translate-y-full opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100'
        }`}
      >
        <div
          className={`w-full max-w-6xl rounded-full border border-slate-800 bg-slate-900/95 backdrop-blur-md px-3.5 sm:px-5 py-2 shadow-md relative flex items-center justify-between flex-nowrap gap-3 transition-all ${
            isNavHidden ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        >
          {/* Left Zone: Brand + Navigation Links */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/"
              aria-label="BHOS Table Tennis"
              className="group flex items-center justify-center w-9 h-9 rounded-full bg-blue-700/15 border border-blue-600/40 hover:scale-105 transition-transform shrink-0"
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
              className="relative lg:hidden inline-flex items-center justify-center h-8 w-8 rounded-full border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition shrink-0"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              {pendingMatchesCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white h-4 min-w-[1rem]">
                    {pendingMatchesCount}
                  </span>
                </span>
              )}
            </button>

            <nav className="hidden lg:flex items-center gap-3.5 text-xs font-medium shrink-0 pl-1">
              {primaryNavLinks.map((link) => {
                const isActive = pathname === link.href;
                const hasBadge = link.showBadge && pendingMatchesCount > 0;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative inline-flex items-center gap-1.5 whitespace-nowrap transition ${
                      link.isArcade
                        ? isActive
                          ? 'text-rose-400 font-semibold drop-shadow-sm'
                          : 'text-rose-400/90 hover:text-white font-medium hover:drop-shadow-sm'
                        : isActive
                        ? 'text-white font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>{link.label}</span>
                    {hasBadge && (
                      <span className="relative flex h-4 min-w-[1rem] items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white h-4 min-w-[1rem]">
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
                  className={`inline-flex items-center gap-1 whitespace-nowrap transition ${
                    moreNavLinks.some((l) => pathname === l.href)
                      ? 'text-white font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{moreLabel}</span>
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </button>

                {moreDropdownOpen && (
                  <div className="absolute left-0 mt-2.5 w-44 rounded-xl border border-slate-800 bg-slate-900 p-1.5 shadow-xl z-50">
                    {moreNavLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreDropdownOpen(false)}
                        className="block px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition whitespace-nowrap"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <a
                href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('common.whatsapp_community', 'Rəsmi WhatsApp İcması')}
                title={t('nav.join_whatsapp') || 'WhatsApp'}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800/70 transition shrink-0"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </nav>
          </div>

          {/* Right Zone: Actions & Profile (strictly inline, h-8 aligned, no wrap) */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* Multi-Language Switcher (AZ | EN | RU) */}
            <div
              role="group"
              aria-label="Language switcher"
              className="inline-flex items-center gap-0.5 h-8 px-1.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] uppercase shrink-0"
            >
              {(['az', 'en', 'ru'] as Locale[]).map((loc) => {
                const isActive = locale === loc;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocale(loc)}
                    className={`uppercase transition whitespace-nowrap ${
                      isActive
                        ? 'text-white font-bold bg-slate-800/90 rounded px-1.5 py-0.5'
                        : 'text-slate-400 hover:text-slate-200 px-1.5 py-0.5 font-medium'
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
                className="hidden md:inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 shadow-sm shadow-rose-950/40 transition active:scale-95 whitespace-nowrap shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{t('nav.log_match') || 'Oyun Qeydiyyatı'}</span>
              </button>
            )}

            {canAccessAdminPanel(currentUser) && (
              <Link
                href="/admin"
                className="hidden lg:inline-flex items-center justify-center gap-1.5 h-8 bg-slate-800/80 hover:bg-slate-800 text-amber-400 border border-amber-500/20 px-3 rounded-lg text-xs font-medium transition whitespace-nowrap shrink-0"
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
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-lg z-50">
                    <div className="px-2.5 py-2 border-b border-slate-800 mb-2">
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
          <div className="lg:hidden w-full max-w-6xl mt-2.5 max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-lg pointer-events-auto space-y-3">
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
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                      pathname === link.href
                        ? 'bg-blue-700 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{link.label}</span>
                    {hasBadge && (
                      <span className="relative flex h-5 min-w-[1.25rem] items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-black text-white h-5 min-w-[1.25rem]">
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
        )}
      </header>

      <div className="h-24" />

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

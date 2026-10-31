'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation, Locale } from '../lib/i18n';
import { BHOSDataStore } from '../lib/data/store';
import {
  PlayerProfile,
  UserRole,
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
  Settings
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
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  const pendingMatchesCount = usePendingMatchesCount(currentUser?.id);

  useEffect(() => {
    setCurrentUser(store.getCurrentUser());
    const unsub = store.subscribe(() => {
      setCurrentUser(store.getCurrentUser());
    });
    return unsub;
  }, [store]);

  const publicNavLinks: { href: string; label: string; showBadge?: boolean }[] = [
    { href: '/leaderboard', label: t('nav.leaderboard') || 'Reytinq Cədvəli' },
    { href: '/matches', label: t('nav.my_matches') || 'Oyunlarım', showBadge: true },
    { href: '/tournaments', label: t('nav.tournaments') || 'Turnirlər' },
    { href: '/tables', label: t('nav.tables') || 'Zal Qaydaları' },
    { href: '/minigame', label: '🏓 Mini-Oyun' },
    { href: '/#about', label: t('nav.about') || 'Haqqında' },
  ];

  const navLinks = [...publicNavLinks];
  if (canAccessAdminPanel(currentUser)) {
    navLinks.push({ href: '/admin', label: t('nav.admin') || 'Prezident Paneli' });
  }

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
      <header className="fixed top-4 sm:top-6 left-0 right-0 z-50 flex flex-col items-center px-3 sm:px-4 pointer-events-none">
        <div className="w-full max-w-6xl rounded-full border border-slate-800 bg-slate-900 px-3.5 sm:px-6 py-2.5 sm:py-3 shadow-md pointer-events-auto relative flex items-center justify-between transition-all">
          <div className="flex items-center justify-start gap-2.5 sm:gap-3">
            <Link
              href="/"
              aria-label="BHOS Table Tennis"
              className="group flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-700/15 border border-blue-600/40 hover:scale-105 transition-transform shrink-0"
            >
              <img
                src="/images/bhos-crest.png"
                alt="BHOS Crest"
                className="block h-5 sm:h-6 w-auto max-w-[1.75rem]"
              />
            </Link>

            <button
              type="button"
              aria-label="Toggle navigation menu"
              onClick={() => {
                setMobileMenuOpen((prev) => !prev);
                setUserDropdownOpen(false);
              }}
              className="relative lg:hidden p-2 rounded-full border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition"
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

            <nav className="hidden lg:flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-full p-1">
              {publicNavLinks.map((link) => {
                const isActive = pathname === link.href;
                const hasBadge = link.showBadge && pendingMatchesCount > 0;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-blue-700 text-white font-bold shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
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
            </nav>
          </div>

          <div className="flex items-center justify-end gap-2.5 ml-auto">
            {canAccessAdminPanel(currentUser) && (
              <Link
                href="/admin"
                className={`hidden lg:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition active:scale-95 shadow-sm ${
                  pathname === '/admin'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('nav.admin') || 'Prezident Paneli'}</span>
              </Link>
            )}
            <a
              href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-600/40 text-emerald-400 text-xs font-semibold transition active:scale-95 shadow-sm"
              title="Rəsmi WhatsApp İcması"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-emerald-500" />
              <span className="hidden sm:inline font-bold">WhatsApp</span>
            </a>

            {currentUser && currentUser.is_verified !== false && (
              <button
                onClick={() => setShowMatchModal(true)}
                className="hidden md:inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 shadow-sm transition active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{t('nav.log_match') || 'Oyun Qeyd Et'}</span>
              </button>
            )}

            <div className="inline-flex items-center rounded-full bg-slate-950 border border-slate-800 p-0.5 text-[11px] font-bold">
              {(['az', 'en', 'ru'] as Locale[]).map((loc) => {
                const isActive = locale === loc;
                return (
                  <button
                    key={loc}
                    onClick={() => setLocale(loc)}
                    className={`px-2 py-0.5 rounded-full uppercase transition-all ${
                      isActive
                        ? 'bg-blue-700 text-white shadow-sm font-extrabold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>

            {currentUser ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setUserDropdownOpen((prev) => !prev);
                    setMobileMenuOpen(false);
                  }}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition ${getRoleBadgeColor(
                    currentUser
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

                  {pendingMatchesCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[1rem] items-center justify-center">
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
                            ? 'Prezident'
                            : currentUser.role === 'coach'
                            ? 'Məşqçi'
                            : 'Oyunçu'}
                        </span>
                        <span className="text-[11px] font-bold text-blue-400">
                          {currentUser.current_elo.toLocaleString()} XAL
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
                            {pendingMatchesCount} gözləyir
                          </span>
                        )}
                      </Link>

                      <Link
                        href={`/players/${currentUser.id}`}
                        onClick={() => setUserDropdownOpen(false)}
                        className="w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800 transition"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                        <span>{t('profile.details') || 'Profilim'}</span>
                      </Link>

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          setShowEditProfileModal(true);
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800 transition"
                      >
                        <Settings className="w-3.5 h-3.5 text-blue-400" />
                        <span>Profili Fərdiləşdir</span>
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
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold transition shadow-sm active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
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
              {navLinks.map((link) => {
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
                        ? 'Prezident'
                        : currentUser.role === 'coach'
                        ? 'Məşqçi'
                        : 'Oyunçu'}
                    </span>
                  </div>
                  <Link
                    href={`/players/${currentUser.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                  >
                    {t('profile.details') || 'Profilim'}
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowEditProfileModal(true);
                    }}
                    className="w-full text-center py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                  >
                    Profili Fərdiləşdir
                  </button>
                  <button
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

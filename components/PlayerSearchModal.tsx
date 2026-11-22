'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowRight } from 'lucide-react';
import ScrollLock from './ScrollLock';
import { BHOSDataStore, getPlayerHref } from '../lib/data/store';
import { PlayerProfile } from '../lib/data/types';
import { useTranslation } from '../lib/i18n';
import { normalizeForSearch } from '../lib/utils/slug';

interface PlayerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PlayerSearchModal({ isOpen, onClose }: PlayerSearchModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setActiveIndex(0);
      return;
    }

    const store = BHOSDataStore.getInstance();
    const load = () => {
      const cached = store.getCachedLeaderboard();
      const verified = store.getVerifiedProfiles();
      const activeList = cached.length > 0 ? cached : verified;
      setPlayers(activeList);
      return activeList;
    };

    const currentList = load();
    if (currentList.length === 0) {
      void store.fetchLeaderboardStandings().then((rows) => {
        if (rows.length > 0) setPlayers(rows);
      });
    }

    const unsub = store.subscribe(load);

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 15);

    return () => {
      window.clearTimeout(timer);
      unsub();
    };
  }, [isOpen]);

  const filteredPlayers = useMemo(() => {
    const sorted = [...players].sort((a, b) => (b.current_elo ?? 0) - (a.current_elo ?? 0));
    const needle = normalizeForSearch(query);
    if (!needle) {
      return sorted.slice(0, 6);
    }

    const tokens = needle.split(/\s+/).filter(Boolean);
    return sorted
      .filter((p) => {
        const facultyRaw = p.major_faculty || p.department || '';
        const haystack = normalizeForSearch(`${p.full_name} ${facultyRaw} ${p.department || ''}`);
        return tokens.every((tok) => haystack.includes(tok));
      })
      .slice(0, 8);
  }, [players, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const translateFaculty = (faculty?: string) => {
    if (!faculty) return 'BHOS';
    const key = `faculties.${faculty}`;
    const translated = t(key);
    return translated === key ? faculty : translated;
  };

  const handleSelectPlayer = (player: PlayerProfile) => {
    const href = getPlayerHref(player.id, player.full_name);
    onClose();
    router.push(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (filteredPlayers.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredPlayers.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredPlayers.length) % filteredPlayers.length);
    } else if (e.key === 'Enter') {
      const selected = filteredPlayers[activeIndex];
      if (selected) {
        e.preventDefault();
        handleSelectPlayer(selected);
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('nav.search_placeholder', 'Oyunçu axtar...')}
      onClick={onClose}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
    >
      <ScrollLock />

      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950/60">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('nav.search_input_placeholder', 'Ad, soyad və ya fakültə axtar...')}
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label={t('common.cancel', 'Təmizlə')}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400 hover:text-white transition shrink-0"
          >
            ESC
          </button>
        </div>

        <div className="max-h-[56vh] overflow-y-auto p-2">
          {!query.trim() && filteredPlayers.length > 0 && (
            <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {t('nav.search_top_players', 'Top Oyunçular')}
            </div>
          )}

          {filteredPlayers.length === 0 ? (
            <div className="py-10 px-4 text-center text-xs text-slate-400">
              {t('nav.search_empty', 'Uyğun oyunçu tapılmadı')}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredPlayers.map((player, index) => {
                const isSelected = index === activeIndex;
                const facultyLabel = translateFaculty(player.major_faculty || player.department);
                return (
                  <button
                    key={player.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => handleSelectPlayer(player)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                      isSelected
                        ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                        : 'border border-transparent text-slate-200 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {player.avatar_url ? (
                        <img
                          src={player.avatar_url}
                          alt={player.full_name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-display font-bold text-blue-400 shrink-0">
                          {player.full_name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {player.full_name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{facultyLabel}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 font-mono text-xs font-bold text-blue-400">
                        {player.current_elo} ELO
                      </span>
                      <ArrowRight
                        className={`w-3.5 h-3.5 transition ${
                          isSelected ? 'text-blue-400 translate-x-0.5' : 'text-slate-600'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[10px] text-slate-500">
          <span>↑↓ • ↵</span>
          <span>ESC • {t('nav.search_esc_hint', 'Bağla')}</span>
        </div>
      </div>
    </div>
  );
}

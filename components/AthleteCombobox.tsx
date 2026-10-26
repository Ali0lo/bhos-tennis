'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import { PlayerProfile } from '../lib/data/types';

interface AthleteComboboxProps {
  players: PlayerProfile[];
  value: string;
  onChange: (id: string) => void;
  excludeIds?: string[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

function Avatar({ player, size = 'md' }: { player: PlayerProfile; size?: 'sm' | 'md' }) {
  const dims = size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-9 h-9 text-xs';
  if (player.avatar_url) {
    return (
      <img
        src={player.avatar_url}
        alt={player.full_name}
        className={`${dims} rounded-lg object-cover border border-white/10 shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${dims} rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] flex items-center justify-center font-display font-black text-white border border-white/10 shrink-0`}
    >
      {player.full_name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function AthleteCombobox({
  players,
  value,
  onChange,
  excludeIds = [],
  placeholder = 'Oyunçu adı və ya fakültə üzrə axtar...',
  label,
  disabled = false,
}: AthleteComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => players.find((p) => p.id === value) || null, [players, value]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players
      .filter((p) => !excludeIds.includes(p.id))
      .filter((p) => {
        if (!q) return true;
        return (
          p.full_name?.toLowerCase().includes(q) ||
          (p.major_faculty || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 50);
  }, [players, excludeIds, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const choose = (id: string) => {
    onChange(id);
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(results.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      if (open && results[highlight]) {
        e.preventDefault();
        choose(results[highlight].id);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
          {label}
        </label>
      )}

      {selected && !open ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#131C2B] border border-[#3B82F6]/40 text-left hover:border-[#3B82F6]/70 transition disabled:opacity-50"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Avatar player={selected} />
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">{selected.full_name}</div>
              <div className="text-[11px] text-slate-400 truncate">{selected.major_faculty}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-xs font-bold text-[#3B82F6]">{selected.current_elo} ELO</span>
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          </div>
        </button>
      ) : (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            disabled={disabled}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            role="combobox"
            aria-expanded={open}
            className="w-full pl-10 pr-9 py-3 rounded-xl bg-[#131C2B] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#3B82F6] transition disabled:opacity-50"
          />
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            role="listbox"
            className="absolute z-40 mt-2 w-full max-h-72 overflow-y-auto rounded-xl bg-[#0F1623] border border-white/10 shadow-2xl p-1.5"
          >
            {results.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-slate-500">Uyğun oyunçu tapılmadı.</li>
            ) : (
              results.map((p, idx) => {
                const isActive = idx === highlight;
                const isSelected = p.id === value;
                return (
                  <li
                    key={p.id}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(p.id);
                    }}
                    className={`flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg cursor-pointer transition ${
                      isActive ? 'bg-[#131C2B]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar player={p} size="sm" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{p.full_name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{p.major_faculty}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[11px] font-bold text-[#3B82F6]">{p.current_elo}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#22C55E]" />}
                    </div>
                  </li>
                );
              })
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}


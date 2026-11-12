'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import ScrollLock from './ScrollLock';
import ClickableAvatar from './ClickableAvatar';
import { MatchRecord, isAutoApprovedMatch } from '../lib/data/types';
import { BHOSDataStore, getPlayerHref } from '../lib/data/store';
import { formatMatchStageAz, isPlayoffStage } from '../lib/data/matches';
import { useTranslation } from '../lib/i18n';
import {
  X,
  Trophy,
  Award,
  Calendar,
  Clock,
  CheckCheck,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Swords,
  User,
} from 'lucide-react';

interface MatchDetailModalProps {
  match: MatchRecord | null;
  onClose: () => void;
}

export default function MatchDetailModal({ match, onClose }: MatchDetailModalProps) {
  const { t, locale } = useTranslation();
  useEffect(() => {
    if (!match) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [match, onClose]);

  if (!match) return null;

  const store = BHOSDataStore.getInstance();
  const enriched = store.enrichMatchRecord(match);

  const p1Name = enriched.player1?.full_name || enriched.player1_name || t('matches.player1_fallback', 'Oyunçu 1');
  const p2Name = enriched.player2?.full_name || enriched.player2_name || t('matches.player2_fallback', 'Oyunçu 2');
  const p1Id = enriched.player1?.id || enriched.player1_id;
  const p2Id = enriched.player2?.id || enriched.player2_id;
  const p1Dept =
    enriched.player1?.department ||
    enriched.player1?.major_faculty ||
    store.getProfile(p1Id)?.department ||
    store.getProfile(p1Id)?.major_faculty ||
    'BANM';
  const p2Dept =
    enriched.player2?.department ||
    enriched.player2?.major_faculty ||
    store.getProfile(p2Id)?.department ||
    store.getProfile(p2Id)?.major_faculty ||
    'BANM';

  const p1Profile = store.getProfile(p1Id);
  const p2Profile = store.getProfile(p2Id);
  const p1Avatar = enriched.player1?.avatar_url || p1Profile?.avatar_url || null;
  const p2Avatar = enriched.player2?.avatar_url || p2Profile?.avatar_url || null;
  const p1Rating = enriched.player1_elo_after ?? p1Profile?.current_elo ?? null;
  const p2Rating = enriched.player2_elo_after ?? p2Profile?.current_elo ?? null;

  const p1Href = getPlayerHref(p1Id, p1Name);
  const p2Href = getPlayerHref(p2Id, p2Name);

  const p1Won = enriched.winner_id
    ? enriched.winner_id === p1Id || enriched.player1_score > enriched.player2_score
    : enriched.player1_score > enriched.player2_score;
  const p2Won = !p1Won;

  const p1Delta =
    typeof enriched.player1_elo_delta === 'number'
      ? enriched.player1_elo_delta
      : enriched.player1_elo_after !== enriched.player1_elo_before
      ? enriched.player1_elo_after - enriched.player1_elo_before
      : p1Won
      ? Math.abs(enriched.elo_delta)
      : -Math.abs(enriched.elo_delta);

  const p2Delta =
    typeof enriched.player2_elo_delta === 'number'
      ? enriched.player2_elo_delta
      : enriched.player2_elo_after !== enriched.player2_elo_before
      ? enriched.player2_elo_after - enriched.player2_elo_before
      : p2Won
      ? Math.abs(enriched.elo_delta)
      : -Math.abs(enriched.elo_delta);

  const stageLabel = formatMatchStageAz(
    enriched.stage,
    enriched.round_number,
    enriched.tournament_id
  );
  const isPlayoff = isPlayoffStage(enriched.stage, enriched.round_number);

  const rawSetList = (enriched.set_scores || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const matchDateObj = new Date(enriched.match_date || enriched.created_at || Date.now());
  const dateLocale = locale === 'az' ? 'az-AZ' : locale === 'ru' ? 'ru-RU' : 'en-US';
  const formattedDate = matchDateObj.toLocaleDateString(dateLocale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = matchDateObj.toLocaleTimeString(dateLocale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const tournamentTitle =
    enriched.tournament_title ||
    (enriched.tournament_id ? t('tournaments.foundation_title', '"Zəfər Günü" Foundation Kuboku') : null);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center p-4 overflow-y-auto bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${p1Name} vs ${p2Name} — ${t('match_detail.title')}`}
    >
      <ScrollLock />
      <div
        className="relative w-full max-w-xl my-auto rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden="true"
          className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-blue-500 to-amber-400"
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 sm:p-6 border-b border-slate-800 bg-slate-950/60">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {tournamentTitle ? (
                <Link
                  href="/tournaments/foundation-kuboku-2026"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[11px] font-bold hover:border-amber-400 transition"
                >
                  <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">{tournamentTitle}</span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-700/20 border border-blue-600/35 text-blue-300 text-[11px] font-bold">
                  <Swords className="w-3 h-3 text-blue-400 shrink-0" />
                  <span>{t('match_detail.club_match')}</span>
                </span>
              )}

              {stageLabel && (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                    isPlayoff
                      ? 'bg-rose-600/15 border-rose-500/40 text-rose-300'
                      : 'bg-blue-700/15 border-blue-600/35 text-blue-300'
                  }`}
                >
                  {stageLabel}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>{formattedDate}</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{formattedTime}</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('match_detail.close')}
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Scoreboard */}
          <div className="grid grid-cols-1 sm:grid-cols-11 gap-3 items-center p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800">
            {/* Player 1 */}
            <div
              className={`sm:col-span-4 flex flex-col items-center sm:items-start text-center sm:text-left p-3 rounded-xl border transition ${
                p1Won
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : 'bg-slate-900/70 border-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {p1Won && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider">
                    <Award className="w-3 h-3" />
                    <span>{t('match_detail.winner')}</span>
                  </span>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center text-sm font-bold text-slate-300 shrink-0 mb-2">
                <ClickableAvatar
                  avatarUrl={p1Avatar}
                  name={p1Name}
                  department={p1Dept}
                  rating={p1Rating}
                  fallback={<>{p1Name.charAt(0).toUpperCase()}</>}
                />
              </div>
              <Link
                href={p1Href}
                onClick={onClose}
                className={`text-sm sm:text-base font-display hover:underline transition leading-snug ${
                  p1Won ? 'font-black text-emerald-400' : 'font-bold text-slate-200 hover:text-blue-400'
                }`}
              >
                {p1Name}
              </Link>
              <span className="text-[11px] text-slate-400 mt-0.5 truncate max-w-full">
                {p1Dept}
              </span>
            </div>

            {/* Center Score Pill */}
            <div className="sm:col-span-3 flex flex-col items-center justify-center py-2">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900 border-2 border-blue-600/40 font-mono font-black text-2xl sm:text-3xl text-white shadow-inner">
                <span className={p1Won ? 'text-emerald-400' : 'text-slate-300'}>
                  {enriched.player1_score}
                </span>
                <span className="text-slate-500 text-lg">:</span>
                <span className={p2Won ? 'text-emerald-400' : 'text-slate-300'}>
                  {enriched.player2_score}
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mt-1.5">
                {t('match_detail.final_score')}
              </span>
            </div>

            {/* Player 2 */}
            <div
              className={`sm:col-span-4 flex flex-col items-center sm:items-end text-center sm:text-right p-3 rounded-xl border transition ${
                p2Won
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : 'bg-slate-900/70 border-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {p2Won && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider">
                    <Award className="w-3 h-3" />
                    <span>{t('match_detail.winner')}</span>
                  </span>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center text-sm font-bold text-slate-300 shrink-0 mb-2">
                <ClickableAvatar
                  avatarUrl={p2Avatar}
                  name={p2Name}
                  department={p2Dept}
                  rating={p2Rating}
                  fallback={<>{p2Name.charAt(0).toUpperCase()}</>}
                />
              </div>
              <Link
                href={p2Href}
                onClick={onClose}
                className={`text-sm sm:text-base font-display hover:underline transition leading-snug ${
                  p2Won ? 'font-black text-emerald-400' : 'font-bold text-slate-200 hover:text-blue-400'
                }`}
              >
                {p2Name}
              </Link>
              <span className="text-[11px] text-slate-400 mt-0.5 truncate max-w-full">
                {p2Dept}
              </span>
            </div>
          </div>

          {/* Set-by-Set Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {t('match_detail.set_breakdown')}
              </span>
              <span className="text-xs font-mono font-bold text-blue-400">
                {enriched.player1_score} - {enriched.player2_score} ({rawSetList.length} set)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {rawSetList.map((setStr, i) => {
                const parts = setStr.split(/[-:]/).map((n) => parseInt(n.trim(), 10));
                const s1 = parts[0];
                const s2 = parts[1];
                const p1WonSet = !isNaN(s1) && !isNaN(s2) ? s1 > s2 : p1Won;

                return (
                  <div
                    key={i}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono"
                  >
                    <span className="text-[10px] text-slate-500 uppercase font-bold">
                      {t('match_detail.set_num', 'Set {num}:').replace('{num}', String(i + 1))}
                    </span>
                    <span className={`font-bold ${p1WonSet ? 'text-emerald-400' : 'text-white'}`}>
                      {setStr}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Post-Match ELO Rating Changes */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {t('match_detail.elo_changes')}
              </span>
              {isAutoApprovedMatch(enriched) ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-semibold">
                  <Clock className="w-3 h-3" />
                  <span>{t('match_detail.approved')}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
                  <CheckCheck className="w-3 h-3" />
                  <span>{t('match_detail.approved')}</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Player 1 ELO */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={p1Href}
                    onClick={onClose}
                    className="text-xs font-bold text-white hover:text-blue-400 transition truncate block"
                  >
                    {p1Name}
                  </Link>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <span>{enriched.player1_elo_before}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-white font-bold">{enriched.player1_elo_after} ELO</span>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-xs font-black shrink-0 ${
                    p1Delta >= 0
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {p1Delta >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  <span>{p1Delta >= 0 ? `+${p1Delta}` : p1Delta}</span>
                </span>
              </div>

              {/* Player 2 ELO */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={p2Href}
                    onClick={onClose}
                    className="text-xs font-bold text-white hover:text-blue-400 transition truncate block"
                  >
                    {p2Name}
                  </Link>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <span>{enriched.player2_elo_before}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-white font-bold">{enriched.player2_elo_after} ELO</span>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-xs font-black shrink-0 ${
                    p2Delta >= 0
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {p2Delta >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  <span>{p2Delta >= 0 ? `+${p2Delta}` : p2Delta}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={p1Href}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-white transition"
            >
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>{p1Name}</span>
            </Link>
            <Link
              href={p2Href}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-white transition"
            >
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>{p2Name}</span>
            </Link>
          </div>

          <Link
            href={`/matches?id=${encodeURIComponent(enriched.id)}`}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-700/20 hover:bg-blue-700/30 border border-blue-600/40 text-xs font-bold text-blue-300 hover:text-white transition"
          >
            <span>{t('match_detail.all_matches')}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

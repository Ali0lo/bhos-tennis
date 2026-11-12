'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { MatchRecord } from '../lib/data/types';
import { BHOSDataStore, getPlayerHref } from '../lib/data/store';
import { formatMatchStageAz, isPlayoffStage } from '../lib/data/matches';
import { useTranslation, useTranslations } from '../lib/i18n';
import EloToastBadge from './EloToastBadge';
import { Activity, ArrowRight, Award, Calendar } from 'lucide-react';

interface RecentResultsProps {
  matches: MatchRecord[];
  onSelectMatch: (match: MatchRecord) => void;
}

export default function RecentResults({ matches, onSelectMatch }: RecentResultsProps) {
  const t = useTranslations('home');
  const { t: rootT, locale } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const recentMatches = useMemo(() => {
    return matches.slice(0, 6).map((m) => store.enrichMatchRecord(m));
  }, [matches, store]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          <span>{rootT('home_recent.title')}</span>
        </h3>
        <Link
          href="/matches"
          className="group text-xs text-blue-400 hover:underline flex items-center gap-1"
        >
          <span>{rootT('home_recent.view_all')}</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="space-y-3">
        {recentMatches.length === 0 ? (
          <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900 text-center space-y-2">
            <Activity className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">
              {t('recent_empty_title')}
            </p>
            <p className="text-xs text-slate-500">
              {t('recent_empty_desc')}
            </p>
          </div>
        ) : (
          recentMatches.map((m) => {
            const p1Id = m.player1?.id || m.player1_id;
            const p2Id = m.player2?.id || m.player2_id;
            const p1Name = m.player1?.full_name || m.player1_name || rootT('matches.player1_fallback', 'Oyunçu 1');
            const p2Name = m.player2?.full_name || m.player2_name || rootT('matches.player2_fallback', 'Oyunçu 2');

            const p1Won = m.winner_id
              ? m.winner_id === p1Id || m.player1_score > m.player2_score
              : m.player1_score > m.player2_score;
            const p2Won = !p1Won;

            const stageLabel = formatMatchStageAz(m.stage, m.round_number, m.tournament_id);
            const isPlayoff = isPlayoffStage(m.stage, m.round_number);
            const winnerDelta = Math.abs(
              Math.round(
                Number((p1Won ? m.player1_elo_delta : m.player2_elo_delta) ?? m.elo_delta ?? 0)
              )
            );
            const loserDelta =
              typeof (p1Won ? m.player2_elo_delta : m.player1_elo_delta) === 'number'
                ? (p1Won ? m.player2_elo_delta : m.player1_elo_delta)!
                : -Math.max(1, Math.round(winnerDelta * 0.5));

            return (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectMatch(m)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectMatch(m);
                  }
                }}
                className="p-4 rounded-2xl border border-slate-800 bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/60 hover:border-blue-600/60 hover:-translate-y-1 cursor-pointer transition-all duration-200 shadow-sm"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex flex-col items-center justify-center px-3 py-2 min-w-[64px] rounded-2xl bg-slate-950 border border-slate-800 font-mono font-black text-base text-white shrink-0">
                    <div className="flex items-center gap-1">
                      <span className={p1Won ? 'text-emerald-400' : 'text-slate-300'}>
                        {m.player1_score}
                      </span>
                      <span className="text-xs text-slate-500 font-normal">:</span>
                      <span className={p2Won ? 'text-emerald-400' : 'text-slate-300'}>
                        {m.player2_score}
                      </span>
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans font-bold mt-0.5">
                      {rootT('matches.set_label', 'Set')}
                    </span>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={getPlayerHref(p1Id, p1Name)}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-sm hover:text-blue-400 transition truncate ${
                          p1Won ? 'text-emerald-400 font-bold' : 'text-slate-300 font-medium'
                        }`}
                      >
                        {p1Name}
                      </Link>
                      {p1Won && <Award className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={getPlayerHref(p2Id, p2Name)}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-sm hover:text-blue-400 transition truncate ${
                          p2Won ? 'text-emerald-400 font-bold' : 'text-slate-300 font-medium'
                        }`}
                      >
                        {p2Name}
                      </Link>
                      {p2Won && <Award className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-mono text-slate-400">
                      <span>
                        {rootT('home_recent.sets_label')}: <strong className="text-slate-300">{m.set_scores}</strong>
                      </span>
                      {stageLabel && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-sans font-extrabold uppercase tracking-wider border ${
                            isPlayoff
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : 'bg-blue-700/15 text-blue-300 border-blue-600/30'
                          }`}
                        >
                          {stageLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800 shrink-0 gap-1">
                  <div className="flex items-center gap-1.5">
                    <EloToastBadge delta={winnerDelta} size="sm" />
                    {loserDelta < 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/25 font-mono text-[10px] font-bold text-rose-400">
                        {loserDelta}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono inline-flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>{new Date(m.match_date).toLocaleDateString(locale === 'az' ? 'az-AZ' : locale === 'ru' ? 'ru-RU' : 'en-US')}</span>
                  </span>

                  {m.tournament_title && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 truncate max-w-[165px]">
                      {m.tournament_title}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

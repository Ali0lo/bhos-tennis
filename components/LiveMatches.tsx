'use client';

import React, { useMemo } from 'react';
import { MatchRecord } from '../lib/data/types';
import { BHOSDataStore } from '../lib/data/store';
import { formatMatchStageAz, isPlayoffStage } from '../lib/data/matches';
import { useTranslation } from '../lib/i18n';

interface LiveMatchesProps {
  matches: MatchRecord[];
  onSelectMatch: (match: MatchRecord) => void;
}

export default function LiveMatches({ matches, onSelectMatch }: LiveMatchesProps) {
  const store = BHOSDataStore.getInstance();
  const { locale, t } = useTranslation();

  const liveLabel =
    locale === 'en'
      ? 'Live Results'
      : locale === 'ru'
      ? 'Live Результаты'
      : 'Canlı Nəticələr';
  const playoffLabel =
    locale === 'en' ? 'Playoff' : locale === 'ru' ? 'Плей-офф' : 'Pley-off';
  const groupLabel =
    locale === 'en' ? 'Group' : locale === 'ru' ? 'Группа' : 'Qrup';

  const enrichedMatches = useMemo(() => {
    return matches.slice(0, 10).map((m) => store.enrichMatchRecord(m));
  }, [matches, store]);

  const tickerMatches = useMemo(() => {
    return enrichedMatches.length > 0 ? [...enrichedMatches, ...enrichedMatches] : [];
  }, [enrichedMatches]);

  if (tickerMatches.length === 0) return null;

  return (
    <div className="ticker-viewport relative flex items-center rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden">
      {/* Broadcast Live Tag */}
      <div className="shrink-0 z-10 flex items-center gap-2 px-3.5 py-2.5 bg-[#070A11] border-r border-[var(--border-hairline)]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E11D48] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E11D48]" />
        </span>
        <span className="font-display text-xs font-extrabold uppercase tracking-[0.1em] text-white whitespace-nowrap">
          {liveLabel}
        </span>
      </div>

      {/* Dual-Edge Masked Horizontal Track */}
      <div className="relative flex-1 overflow-hidden py-1.5 [mask-image:linear-gradient(to_right,transparent_0%,black_4%,black_90%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_4%,black_90%,transparent_100%)]">
        <div className="animate-broadcast-ticker items-center gap-2.5 pl-3 pr-3">
          {tickerMatches.map((m, idx) => {
            const p1Id = m.player1?.id || m.player1_id;
            const p2Id = m.player2?.id || m.player2_id;
            const p1Name = m.player1?.full_name || m.player1_name || t('common.player_1', 'Oyunçu 1');
            const p2Name = m.player2?.full_name || m.player2_name || t('common.player_2', 'Oyunçu 2');

            const p1Won = m.winner_id
              ? m.winner_id === p1Id || m.player1_score > m.player2_score
              : m.player1_score > m.player2_score;
            const p2Won = !p1Won;

            const delta = Math.abs(
              Math.round(
                Number(
                  (p1Won ? m.player1_elo_delta : m.player2_elo_delta) ?? m.elo_delta ?? 0
                )
              )
            );
            const stageLabel = formatMatchStageAz(m.stage, m.round_number, m.tournament_id);
            const isPlayoff = isPlayoffStage(m.stage, m.round_number);

            return (
              <button
                key={`${m.id}-${idx}`}
                type="button"
                onClick={() => onSelectMatch(m)}
                title={`${p1Name} (${m.player1_score} : ${m.player2_score}) ${p2Name}`}
                className="inline-flex items-center gap-2 bg-[#070A11]/75 border border-white/[0.08] rounded-lg px-2.5 py-1.5 hover:bg-white/[0.05] hover:border-white/20 cursor-pointer transition-colors text-xs shrink-0"
              >
                {stageLabel && (
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300 text-[9px] font-semibold uppercase tracking-wider">
                    {isPlayoff ? playoffLabel : groupLabel}
                  </span>
                )}

                <span
                  className={`whitespace-nowrap ${
                    p1Won ? 'font-semibold text-white' : 'font-normal text-slate-400'
                  }`}
                >
                  {p1Name}
                </span>

                <span className="px-2 py-0.5 rounded bg-[#0D121E] border border-white/10 font-mono tabular-nums font-bold text-[11px] text-white leading-none">
                  {m.player1_score}–{m.player2_score}
                </span>

                <span
                  className={`whitespace-nowrap ${
                    p2Won ? 'font-semibold text-white' : 'font-normal text-slate-400'
                  }`}
                >
                  {p2Name}
                </span>

                {delta > 0 && (
                  <span className="font-mono tabular-nums text-[11px] font-semibold text-emerald-400">
                    +{delta}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

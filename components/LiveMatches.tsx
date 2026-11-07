'use client';

import React, { useMemo } from 'react';
import { MatchRecord } from '../lib/data/types';
import { BHOSDataStore } from '../lib/data/store';
import { formatMatchStageAz, isPlayoffStage } from '../lib/data/matches';

interface LiveMatchesProps {
  matches: MatchRecord[];
  onSelectMatch: (match: MatchRecord) => void;
}

export default function LiveMatches({ matches, onSelectMatch }: LiveMatchesProps) {
  const store = BHOSDataStore.getInstance();

  const enrichedMatches = useMemo(() => {
    return matches.slice(0, 10).map((m) => store.enrichMatchRecord(m));
  }, [matches, store]);

  const tickerMatches = useMemo(() => {
    return enrichedMatches.length > 0 ? [...enrichedMatches, ...enrichedMatches] : [];
  }, [enrichedMatches]);

  if (tickerMatches.length === 0) return null;

  return (
    <div className="ticker-viewport relative flex items-center rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
      <div className="shrink-0 z-10 flex items-center gap-2 px-3.5 py-2.5 bg-slate-950 border-r border-slate-800">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
        </span>
        <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-white whitespace-nowrap">
          Canlı Nəticələr
        </span>
      </div>

      <div className="relative flex-1 overflow-hidden py-2">
        <div className="animate-broadcast-ticker items-center gap-3.5 px-3">
          {tickerMatches.map((m, idx) => {
            const p1Id = m.player1?.id || m.player1_id;
            const p2Id = m.player2?.id || m.player2_id;
            const p1Name = m.player1?.full_name || m.player1_name || 'Oyunçu 1';
            const p2Name = m.player2?.full_name || m.player2_name || 'Oyunçu 2';

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
                title={`${p1Name} (${m.player1_score} : ${m.player2_score}) ${p2Name} — Təfərrüatlar üçün klikləyin`}
                className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 hover:bg-slate-800/60 hover:border-blue-500/60 cursor-pointer transition text-xs shrink-0"
              >
                {stageLabel && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                      isPlayoff
                        ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        : 'bg-blue-700/15 text-blue-300 border border-blue-600/30'
                    }`}
                  >
                    {isPlayoff ? 'Pley-off' : 'Qrup'}
                  </span>
                )}

                <span
                  className={`whitespace-nowrap ${
                    p1Won ? 'font-bold text-emerald-400' : 'font-medium text-slate-300'
                  }`}
                >
                  {p1Name}
                </span>

                <span className="px-2 py-0.5 rounded-md bg-blue-700/20 border border-blue-700/40 font-mono font-bold text-[11px] text-blue-300">
                  {m.player1_score} : {m.player2_score}
                </span>

                <span
                  className={`whitespace-nowrap ${
                    p2Won ? 'font-bold text-emerald-400' : 'font-medium text-slate-300'
                  }`}
                >
                  {p2Name}
                </span>

                {delta > 0 && (
                  <span className="font-mono text-[11px] font-bold text-emerald-400">
                    +{delta} ELO
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

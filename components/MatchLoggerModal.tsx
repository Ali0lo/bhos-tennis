'use client';

import React, { useState, useMemo } from 'react';
import { useTranslation } from '../lib/i18n';
import { BHOSDataStore } from '../lib/data/store';
import { PlayerProfile } from '../lib/data/types';
import { calculateMatchElo, parseSetScores } from '../lib/elo';
import { X, Trophy, AlertCircle, CheckCircle2, ArrowRight, Zap } from 'lucide-react';

interface MatchLoggerModalProps {
  onClose: () => void;
  tournamentId?: string;
  defaultP1Id?: string;
  defaultP2Id?: string;
}

export default function MatchLoggerModal({
  onClose,
  tournamentId,
  defaultP1Id,
  defaultP2Id,
}: MatchLoggerModalProps) {
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();
  const profiles = store.getProfiles();
  const currentUser = store.getCurrentUser();
  const tournaments = store.getTournaments();

  const [p1Id, setP1Id] = useState<string>(defaultP1Id || (profiles[0]?.id !== currentUser.id ? profiles[0]?.id : profiles[1]?.id));
  const [p2Id, setP2Id] = useState<string>(defaultP2Id || (profiles[1]?.id !== p1Id ? profiles[1]?.id : profiles[2]?.id));
  const [selectedTournament, setSelectedTournament] = useState<string>(tournamentId || '');
  
  // Set score input format: "11-9, 8-11, 11-6, 12-10"
  const [setScoresText, setSetScoresText] = useState<string>('11-8, 9-11, 11-7, 11-9');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const player1 = useMemo(() => profiles.find((p) => p.id === p1Id), [profiles, p1Id]);
  const player2 = useMemo(() => profiles.find((p) => p.id === p2Id), [profiles, p2Id]);

  // Real-time parsed scores & live ELO preview
  const parseResult = useMemo(() => {
    return parseSetScores(setScoresText);
  }, [setScoresText]);

  const eloPreview = useMemo(() => {
    if (!player1 || !player2 || !parseResult.isValid || player1.id === player2.id) {
      return null;
    }
    const p1Won = parseResult.player1Games > parseResult.player2Games;
    return calculateMatchElo({
      player1Elo: player1.current_elo,
      player2Elo: player2.current_elo,
      player1Won: p1Won,
      isTournament: Boolean(selectedTournament),
      player1MatchesPlayed: player1.matches_played,
      player2MatchesPlayed: player2.matches_played,
    });
  }, [player1, player2, parseResult, selectedTournament]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!player1 || !player2) {
      setError('Please select both players');
      return;
    }

    if (player1.id === player2.id) {
      setError('Player 1 and Player 2 cannot be the same person');
      return;
    }

    if (!parseResult.isValid) {
      setError(parseResult.errorMessage || 'Invalid set score format');
      return;
    }

    if (parseResult.player1Games === parseResult.player2Games) {
      setError('Match cannot end in a draw in table tennis');
      return;
    }

    try {
      store.logMatch({
        player1Id: player1.id,
        player2Id: player2.id,
        loggedById: currentUser.id,
        setScores: setScoresText,
        tournamentId: selectedTournament || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to log match');
    }
  };

  const applyQuickTemplate = (template: string) => {
    setSetScoresText(template);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-bhos-border bg-bhos-midnight p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-bhos-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-bhos-cyan/10 text-bhos-cyan">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">
                {t('matches.log_match_modal_title')}
              </h3>
              <p className="text-xs text-slate-400">
                Official BHOS TT Match Logger • Logged by {currentUser.full_name} ({currentUser.role})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-bounce" />
            <h4 className="text-lg font-bold text-white">Match Recorded Successfully!</h4>
            <p className="text-xs text-slate-400">
              Player ratings and club leaderboard have been updated.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Players Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Player 1 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {t('matches.p1')}
                </label>
                <select
                  value={p1Id}
                  onChange={(e) => setP1Id(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white text-xs focus:outline-none focus:border-bhos-cyan"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.id === p2Id}>
                      {p.full_name} ({p.current_elo} ELO - {p.major_faculty})
                    </option>
                  ))}
                </select>
                {player1 && (
                  <p className="text-[11px] text-slate-400">
                    Current: <span className="text-bhos-cyan font-semibold">{player1.current_elo} ELO</span> ({player1.wins}W / {player1.losses}L)
                  </p>
                )}
              </div>

              {/* Player 2 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {t('matches.p2')}
                </label>
                <select
                  value={p2Id}
                  onChange={(e) => setP2Id(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white text-xs focus:outline-none focus:border-bhos-cyan"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.id === p1Id}>
                      {p.full_name} ({p.current_elo} ELO - {p.major_faculty})
                    </option>
                  ))}
                </select>
                {player2 && (
                  <p className="text-[11px] text-slate-400">
                    Current: <span className="text-bhos-cyan font-semibold">{player2.current_elo} ELO</span> ({player2.wins}W / {player2.losses}L)
                  </p>
                )}
              </div>
            </div>

            {/* Tournament Association (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Tournament Event (Optional)
              </label>
              <select
                value={selectedTournament}
                onChange={(e) => setSelectedTournament(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-bhos-darkCard border border-bhos-border text-white text-xs focus:outline-none focus:border-bhos-cyan"
              >
                <option value="">None (Regular Ranked Club Match)</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Set Scores Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  {t('matches.set_scores')}
                </label>
                {/* Quick Templates */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500">Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyQuickTemplate('11-7, 11-9, 11-8')}
                    className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white"
                  >
                    3-0
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickTemplate('11-8, 9-11, 11-7, 11-9')}
                    className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white"
                  >
                    3-1
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickTemplate('11-9, 9-11, 11-8, 8-11, 12-10')}
                    className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white"
                  >
                    3-2
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={setScoresText}
                onChange={(e) => setSetScoresText(e.target.value)}
                placeholder="11-9, 8-11, 11-6, 12-10"
                className="w-full px-3.5 py-2.5 rounded-lg bg-bhos-darkCard border border-bhos-border text-white text-sm font-mono focus:outline-none focus:border-bhos-cyan"
              />
              <p className="text-[11px] text-slate-500">
                {t('matches.set_scores_help')}
              </p>
            </div>

            {/* Live ELO Preview Box */}
            {eloPreview && player1 && player2 && parseResult.isValid && (
              <div className="p-3.5 rounded-xl border border-bhos-cyan/30 bg-bhos-cyan/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-bhos-cyan font-semibold">
                    <Zap className="w-3.5 h-3.5" />
                    <span>{t('matches.preview_elo')}</span>
                  </div>
                  <span className="text-slate-400 font-mono">
                    Outcome: <strong className="text-white">{parseResult.player1Games} - {parseResult.player2Games}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                  {/* P1 Result */}
                  <div className="p-2 rounded-lg bg-bhos-midnight/60 border border-bhos-border">
                    <div className="font-semibold text-slate-200 truncate">{player1.full_name}</div>
                    <div className="flex items-center gap-1.5 mt-1 font-mono">
                      <span className="text-slate-400">{player1.current_elo}</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="font-bold text-white">{eloPreview.player1EloAfter}</span>
                      <span
                        className={`text-[11px] font-bold ${
                          eloPreview.delta > 0 ? 'text-emerald-400' : 'text-crimson'
                        }`}
                      >
                        ({eloPreview.delta > 0 ? `+${eloPreview.delta}` : eloPreview.delta})
                      </span>
                    </div>
                  </div>

                  {/* P2 Result */}
                  <div className="p-2 rounded-lg bg-bhos-midnight/60 border border-bhos-border">
                    <div className="font-semibold text-slate-200 truncate">{player2.full_name}</div>
                    <div className="flex items-center gap-1.5 mt-1 font-mono">
                      <span className="text-slate-400">{player2.current_elo}</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="font-bold text-white">{eloPreview.player2EloAfter}</span>
                      <span
                        className={`text-[11px] font-bold ${
                          -eloPreview.delta > 0 ? 'text-emerald-400' : 'text-crimson'
                        }`}
                      >
                        ({-eloPreview.delta > 0 ? `+${-eloPreview.delta}` : -eloPreview.delta})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                {t('profile.cancel')}
              </button>
              <button
                type="submit"
                disabled={!parseResult.isValid || player1?.id === player2?.id}
                className="px-5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-bhos-cyan to-bhos-blue text-bhos-navy hover:opacity-95 shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {t('matches.submit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

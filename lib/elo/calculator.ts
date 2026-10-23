export interface MatchupPrediction {
  winProbability: number;
  winEloGain: number;
  lossEloDrop: number;
  opponentWinEloGain: number;
  opponentLossEloDrop: number;
}

export function calculateWhatIf(
  playerElo: number,
  opponentElo: number,
  kFactor: number = 32
): MatchupPrediction {
  const safePlayerElo = Math.max(0, Number.isFinite(playerElo) ? playerElo : 0);
  const safeOpponentElo = Math.max(0, Number.isFinite(opponentElo) ? opponentElo : 0);
  const safeK = kFactor > 0 ? kFactor : 32;

  const exponent = Math.max(-25, Math.min(25, (safeOpponentElo - safePlayerElo) / 400));
  const rawWinProbability = 1 / (1 + Math.pow(10, exponent));
  const winProbability = Math.max(0, Math.min(1, rawWinProbability));

  const winEloGain = Math.max(1, Math.round(safeK * (1 - winProbability)));
  const rawLossDrop = Math.max(1, Math.round(safeK * winProbability));

  const clampedPlayerDrop = Math.min(safePlayerElo, rawLossDrop);
  const clampedOpponentDrop = Math.min(safeOpponentElo, winEloGain);

  const lossEloDrop = clampedPlayerDrop === 0 ? 0 : -clampedPlayerDrop;
  const opponentWinEloGain = rawLossDrop;
  const opponentLossEloDrop = clampedOpponentDrop === 0 ? 0 : -clampedOpponentDrop;

  return {
    winProbability,
    winEloGain,
    lossEloDrop,
    opponentWinEloGain,
    opponentLossEloDrop,
  };
}

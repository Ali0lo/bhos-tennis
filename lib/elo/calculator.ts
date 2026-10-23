export const MIN_ELO = 0;
export const MAX_ELO = 999;

export interface MatchupPrediction {
  winProbability: number;
  winEloGain: number;
  lossEloDrop: number;
  opponentWinEloGain: number;
  opponentLossEloDrop: number;
  setMultiplier: number;
}

export function getSetDominanceMultiplier(
  setsWon?: number,
  setsLost?: number
): number {
  if (setsWon === undefined || setsLost === undefined) {
    return 1.0;
  }
  const hi = Math.max(setsWon, setsLost);
  const lo = Math.min(setsWon, setsLost);

  if (lo === 0 && (hi === 3 || hi === 2)) {
    return 1.15;
  }
  if (hi === 3 && lo === 2) {
    return 0.9;
  }
  if ((hi === 3 && lo === 1) || (hi === 2 && lo === 1)) {
    return 1.0;
  }
  return 1.0;
}

export function calculateWhatIf(
  playerElo: number,
  opponentElo: number,
  kFactor: number = 32,
  setsWon?: number,
  setsLost?: number
): MatchupPrediction {
  const safePlayerElo = Math.min(
    MAX_ELO,
    Math.max(MIN_ELO, Number.isFinite(playerElo) ? playerElo : 0)
  );
  const safeOpponentElo = Math.min(
    MAX_ELO,
    Math.max(MIN_ELO, Number.isFinite(opponentElo) ? opponentElo : 0)
  );
  const safeK = kFactor > 0 ? kFactor : 32;
  const setMultiplier = getSetDominanceMultiplier(setsWon, setsLost);

  const exponent = Math.max(
    -25,
    Math.min(25, (safeOpponentElo - safePlayerElo) / 400)
  );
  const rawWinProbability = 1 / (1 + Math.pow(10, exponent));
  const winProbability = Math.max(0, Math.min(1, rawWinProbability));

  const rawWinDelta = Math.max(
    1,
    Math.round(safeK * (1 - winProbability) * setMultiplier)
  );
  const rawLossDelta = Math.max(
    1,
    Math.round(safeK * winProbability * setMultiplier)
  );

  const projectedPlayerWin = Math.min(MAX_ELO, safePlayerElo + rawWinDelta);
  const winEloGain = projectedPlayerWin - safePlayerElo;

  const projectedPlayerLoss = Math.max(MIN_ELO, safePlayerElo - rawLossDelta);
  const clampedPlayerDrop = safePlayerElo - projectedPlayerLoss;
  const lossEloDrop = clampedPlayerDrop === 0 ? 0 : -clampedPlayerDrop;

  const projectedOpponentWin = Math.min(MAX_ELO, safeOpponentElo + rawLossDelta);
  const opponentWinEloGain = projectedOpponentWin - safeOpponentElo;

  const projectedOpponentLoss = Math.max(MIN_ELO, safeOpponentElo - rawWinDelta);
  const clampedOpponentDrop = safeOpponentElo - projectedOpponentLoss;
  const opponentLossEloDrop = clampedOpponentDrop === 0 ? 0 : -clampedOpponentDrop;

  return {
    winProbability,
    winEloGain,
    lossEloDrop,
    opponentWinEloGain,
    opponentLossEloDrop,
    setMultiplier,
  };
}

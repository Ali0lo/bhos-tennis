export const MIN_ELO = 0;
export const MAX_ELO = 999;

export interface EloCalculationParams {
  playerElo: number;
  opponentElo: number;
  playerScore: number;
  opponentScore: number;
  isWinner: boolean;
}

export function calculateEloDelta({
  playerElo,
  opponentElo,
  playerScore,
  opponentScore,
  isWinner,
}: EloCalculationParams): number {
  const K = 32;

  const expectedProbability = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));

  const winnerScore = Math.max(playerScore, opponentScore);
  const loserScore = Math.min(playerScore, opponentScore);
  const setMargin = Math.max(1, winnerScore - loserScore);

  let dominanceMultiplier = 1.0;
  if (setMargin >= 4) {
    dominanceMultiplier = 1.30;
  } else if (setMargin === 3) {
    dominanceMultiplier = 1.18;
  } else if (setMargin === 2) {
    dominanceMultiplier = 1.06;
  } else {
    dominanceMultiplier = 0.95;
  }

  if (isWinner) {
    const rawGain = K * (1 - expectedProbability) * dominanceMultiplier;
    return Math.max(2, Math.min(48, Math.round(rawGain)));
  } else {
    const rawLoss = K * (0 - expectedProbability) * dominanceMultiplier;
    return Math.min(-2, Math.max(-48, Math.round(rawLoss)));
  }
}

export interface MatchupPrediction {
  winProbability: number;
  winEloGain: number;
  lossEloDrop: number;
  opponentWinEloGain: number;
  opponentLossEloDrop: number;
  setMultiplier: number;
}

export interface DuelProjection {
  userWinProbability: number;
  targetWinProbability: number;
  userWinPercent: number;
  targetWinPercent: number;
  winDelta: number;
  lossDelta: number;
  projectedWinElo: number;
  projectedLossElo: number;
}

export function calculateDuelProjection(
  userElo: number,
  targetElo: number,
  kFactor: number = 32
): DuelProjection {
  const safeUserElo = Math.min(
    MAX_ELO,
    Math.max(MIN_ELO, Number.isFinite(userElo) ? userElo : 0)
  );
  const safeTargetElo = Math.min(
    MAX_ELO,
    Math.max(MIN_ELO, Number.isFinite(targetElo) ? targetElo : 0)
  );
  const safeK = kFactor > 0 ? kFactor : 32;

  const exponent = Math.max(
    -25,
    Math.min(25, (safeTargetElo - safeUserElo) / 400)
  );
  const userWinProbability = Math.max(
    0,
    Math.min(1, 1 / (1 + Math.pow(10, exponent)))
  );
  const targetWinProbability = 1 - userWinProbability;

  const userWinPercent = Math.round(userWinProbability * 100);
  const targetWinPercent = 100 - userWinPercent;

  const winDelta = Math.min(
    MAX_ELO - safeUserElo,
    Math.round(safeK * (1 - userWinProbability))
  );
  const lossDelta = Math.max(
    -safeUserElo,
    Math.round(safeK * (0 - userWinProbability))
  );

  const projectedWinElo = Math.min(MAX_ELO, safeUserElo + winDelta);
  const projectedLossElo = Math.max(MIN_ELO, safeUserElo + lossDelta);

  return {
    userWinProbability,
    targetWinProbability,
    userWinPercent,
    targetWinPercent,
    winDelta,
    lossDelta,
    projectedWinElo,
    projectedLossElo,
  };
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
  const setMargin = Math.max(1, hi - lo);

  if (setMargin >= 4) {
    return 1.30;
  }
  if (setMargin === 3) {
    return 1.18;
  }
  if (setMargin === 2) {
    return 1.06;
  }
  return 0.95;
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
  const setMultiplier = getSetDominanceMultiplier(setsWon, setsLost);

  const exponent = Math.max(
    -25,
    Math.min(25, (safeOpponentElo - safePlayerElo) / 400)
  );
  const rawWinProbability = 1 / (1 + Math.pow(10, exponent));
  const winProbability = Math.max(0, Math.min(1, rawWinProbability));

  const pScore = setsWon ?? 3;
  const oScore = setsLost ?? 0;

  const rawWinDelta = calculateEloDelta({
    playerElo: safePlayerElo,
    opponentElo: safeOpponentElo,
    playerScore: pScore,
    opponentScore: oScore,
    isWinner: true,
  });

  const rawLossDelta = Math.abs(
    calculateEloDelta({
      playerElo: safePlayerElo,
      opponentElo: safeOpponentElo,
      playerScore: oScore,
      opponentScore: pScore,
      isWinner: false,
    })
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

import {
  calculateEloDelta,
  EloCalculationParams,
  getSetDominanceMultiplier,
  MAX_ELO,
  MIN_ELO,
} from './elo/calculator';

export {
  calculateEloDelta,
  getSetDominanceMultiplier,
  MAX_ELO,
  MIN_ELO,
};

export type { EloCalculationParams };

export interface EloCalculationInput {
  player1Elo: number;
  player2Elo: number;
  player1Won: boolean;
  isTournament?: boolean;
  player1MatchesPlayed?: number;
  player2MatchesPlayed?: number;
  customKFactor?: number;
  player1SetsWon?: number;
  player2SetsWon?: number;
}

export interface EloCalculationResult {
  player1EloBefore: number;
  player2EloBefore: number;
  player1EloAfter: number;
  player2EloAfter: number;
  delta: number;
  winnerGained: number;
  p1WinProbability: number;
  p2WinProbability: number;
  setMultiplier?: number;
}

export function getKFactor(
  isTournament: boolean = false,
  matchesPlayed: number = 20,
  customK?: number
): number {
  if (customK && customK > 0) return customK;
  if (isTournament) return 48;
  if (matchesPlayed < 10) return 40;
  return 32;
}

export function calculateWinProbability(ratingA: number, ratingB: number): number {
  const exponent = (ratingB - ratingA) / 400;
  return 1 / (1 + Math.pow(10, exponent));
}

export function calculateMatchElo(input: EloCalculationInput): EloCalculationResult {
  const {
    player1Elo,
    player2Elo,
    player1Won,
    player1SetsWon,
    player2SetsWon,
  } = input;

  const safeP1Elo = Math.min(MAX_ELO, Math.max(MIN_ELO, player1Elo));
  const safeP2Elo = Math.min(MAX_ELO, Math.max(MIN_ELO, player2Elo));

  const p1Expected = calculateWinProbability(safeP1Elo, safeP2Elo);
  const p2Expected = 1 - p1Expected;

  const p1Sets = player1SetsWon ?? (player1Won ? 3 : 0);
  const p2Sets = player2SetsWon ?? (player1Won ? 0 : 3);
  const setMultiplier = getSetDominanceMultiplier(p1Sets, p2Sets);

  let rawDelta = calculateEloDelta({
    playerElo: safeP1Elo,
    opponentElo: safeP2Elo,
    playerScore: p1Sets,
    opponentScore: p2Sets,
    isWinner: player1Won,
  });

  const winnerGained = Math.abs(rawDelta);
  const p1After = Math.min(MAX_ELO, Math.max(MIN_ELO, safeP1Elo + rawDelta));
  const p2After = Math.min(MAX_ELO, Math.max(MIN_ELO, safeP2Elo - rawDelta));

  return {
    player1EloBefore: safeP1Elo,
    player2EloBefore: safeP2Elo,
    player1EloAfter: p1After,
    player2EloAfter: p2After,
    delta: rawDelta,
    winnerGained,
    p1WinProbability: Math.round(p1Expected * 100) / 100,
    p2WinProbability: Math.round(p2Expected * 100) / 100,
    setMultiplier,
  };
}

export function parseSetScores(setScoresString: string): {
  player1Games: number;
  player2Games: number;
  sets: { p1: number; p2: number }[];
  isValid: boolean;
  errorMessage?: string;
} {
  const trimmed = setScoresString.trim();
  if (!trimmed) {
    return { player1Games: 0, player2Games: 0, sets: [], isValid: false, errorMessage: 'Scores cannot be empty' };
  }

  const parts = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  let p1Wins = 0;
  let p2Wins = 0;
  const sets: { p1: number; p2: number }[] = [];

  for (const part of parts) {
    const tokens = part.split(/[-:]/).map((t) => parseInt(t.trim(), 10));
    if (tokens.length !== 2 || isNaN(tokens[0]) || isNaN(tokens[1])) {
      return {
        player1Games: 0,
        player2Games: 0,
        sets: [],
        isValid: false,
        errorMessage: `Invalid format in set: "${part}". Expected format: 11-9`,
      };
    }

    const [s1, s2] = tokens;
    const maxScore = Math.max(s1, s2);
    const diff = Math.abs(s1 - s2);

    if (maxScore < 11 || diff < 2) {
      return {
        player1Games: 0,
        player2Games: 0,
        sets: [],
        isValid: false,
        errorMessage: `Set "${part}" must have a winner with at least 11 points and 2-point difference.`,
      };
    }

    if (s1 > s2) p1Wins++;
    else p2Wins++;

    sets.push({ p1: s1, p2: s2 });
  }

  return {
    player1Games: p1Wins,
    player2Games: p2Wins,
    sets,
    isValid: sets.length > 0,
  };
}

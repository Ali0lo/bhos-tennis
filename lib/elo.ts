/**
 * Official Table Tennis ELO Rating Calculation Engine
 * Baku Higher Oil School (BHOS) Table Tennis Club
 */

export interface EloCalculationInput {
  player1Elo: number;
  player2Elo: number;
  player1Won: boolean;
  isTournament?: boolean;
  player1MatchesPlayed?: number;
  player2MatchesPlayed?: number;
  customKFactor?: number;
}

export interface EloCalculationResult {
  player1EloBefore: number;
  player2EloBefore: number;
  player1EloAfter: number;
  player2EloAfter: number;
  delta: number; // Signed delta for Player 1 (+delta if won, -delta if lost)
  winnerGained: number; // Positive absolute points gained by the winner
  p1WinProbability: number; // 0.0 to 1.0 (e.g. 0.65 = 65%)
  p2WinProbability: number; // 0.0 to 1.0 (e.g. 0.35 = 35%)
}

/**
 * Determine dynamic K-Factor based on player experience and tournament context
 */
export function getKFactor(
  isTournament: boolean = false,
  matchesPlayed: number = 20,
  customK?: number
): number {
  if (customK && customK > 0) return customK;
  if (isTournament) return 48; // High stakes for official tournaments
  if (matchesPlayed < 10) return 40; // Accelerated calibration for newcomers
  return 32; // Standard club ranked match
}

/**
 * Calculate expected probability of winning
 * E_A = 1 / (1 + 10 ^ ((R_B - R_A) / 400))
 */
export function calculateWinProbability(ratingA: number, ratingB: number): number {
  const exponent = (ratingB - ratingA) / 400;
  return 1 / (1 + Math.pow(10, exponent));
}

/**
 * Calculate updated ELO ratings following official match outcome
 */
export function calculateMatchElo(input: EloCalculationInput): EloCalculationResult {
  const {
    player1Elo,
    player2Elo,
    player1Won,
    isTournament = false,
    player1MatchesPlayed = 20,
    player2MatchesPlayed = 20,
    customKFactor,
  } = input;

  const p1Expected = calculateWinProbability(player1Elo, player2Elo);
  const p2Expected = 1 - p1Expected;

  // Average K-factor between the two players' profiles
  const k1 = getKFactor(isTournament, player1MatchesPlayed, customKFactor);
  const k2 = getKFactor(isTournament, player2MatchesPlayed, customKFactor);
  const k = Math.round((k1 + k2) / 2);

  const actualScore1 = player1Won ? 1 : 0;
  
  // Rating change: Delta = Round(K * (Actual - Expected))
  let rawDelta = Math.round(k * (actualScore1 - p1Expected));

  // Ensure winner gains at least 1 point even in extreme upsets/mismatches
  if (player1Won && rawDelta < 1) rawDelta = 1;
  if (!player1Won && rawDelta > -1) rawDelta = -1;

  const winnerGained = Math.abs(rawDelta);
  const p1After = Math.max(100, player1Elo + rawDelta);
  const p2After = Math.max(100, player2Elo - rawDelta);

  return {
    player1EloBefore: player1Elo,
    player2EloBefore: player2Elo,
    player1EloAfter: p1After,
    player2EloAfter: p2After,
    delta: rawDelta,
    winnerGained,
    p1WinProbability: Math.round(p1Expected * 100) / 100,
    p2WinProbability: Math.round(p2Expected * 100) / 100,
  };
}

/**
 * Parse and validate table tennis set scores
 * e.g. "11-9, 8-11, 11-6, 12-10" -> returns games won { p1: 3, p2: 1, isValid: true }
 */
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
    // Table tennis set rule: First to 11 with at least 2 point lead
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


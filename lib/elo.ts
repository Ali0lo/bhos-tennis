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

export function validateMatchSetSummary(
  scoreA: number,
  scoreB: number
): {
  isValid: boolean;
  winnerSets: number;
  loserSets: number;
  errorMessage?: string;
} {
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0) {
    return {
      isValid: false,
      winnerSets: 0,
      loserSets: 0,
      errorMessage: 'Set hesabları tam və müsbət rəqəm olmalıdır.',
    };
  }

  if (scoreA === scoreB) {
    return {
      isValid: false,
      winnerSets: scoreA,
      loserSets: scoreB,
      errorMessage: 'Matç hesabı bərabər ola bilməz.',
    };
  }

  const winnerSets = Math.max(scoreA, scoreB);
  const loserSets = Math.min(scoreA, scoreB);

  if (winnerSets < 2 || winnerSets > 4 || loserSets >= winnerSets) {
    return {
      isValid: false,
      winnerSets,
      loserSets,
      errorMessage: 'Etibarlı matç formatı seçin: Best-of-3 (2-0, 2-1), Best-of-5 (3-0, 3-1, 3-2) və ya Best-of-7 (4-0, 4-1, 4-2, 4-3).',
    };
  }

  return {
    isValid: true,
    winnerSets,
    loserSets,
  };
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

  const rawDelta = calculateEloDelta({
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

export function parseSetScores(
  setScoresString: string,
  expectedP1Sets?: number,
  expectedP2Sets?: number
): {
  player1Games: number;
  player2Games: number;
  sets: { p1: number; p2: number }[];
  isValid: boolean;
  errorMessage?: string;
} {
  const trimmed = setScoresString.trim();
  if (!trimmed) {
    return {
      player1Games: 0,
      player2Games: 0,
      sets: [],
      isValid: false,
      errorMessage: 'Set xalları boş ola bilməz.',
    };
  }

  const parts = trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length < 2 || parts.length > 7) {
    return {
      player1Games: 0,
      player2Games: 0,
      sets: [],
      isValid: false,
      errorMessage: 'Matç ən azı 2, ən çoxu 7 setdən ibarət ola bilər.',
    };
  }

  let p1Wins = 0;
  let p2Wins = 0;
  const sets: { p1: number; p2: number }[] = [];

  for (const part of parts) {
    const rawTokens = part.split(/[-:]/).map((t) => t.trim());
    if (rawTokens.length !== 2 || !/^\d+$/.test(rawTokens[0]) || !/^\d+$/.test(rawTokens[1])) {
      return {
        player1Games: 0,
        player2Games: 0,
        sets: [],
        isValid: false,
        errorMessage: `Yanlış set formatı: "${part}". Nümunə: 11-9, 12-10`,
      };
    }

    const s1 = parseInt(rawTokens[0], 10);
    const s2 = parseInt(rawTokens[1], 10);

    if (s1 < 0 || s2 < 0 || s1 > 50 || s2 > 50 || s1 === s2) {
      return {
        player1Games: 0,
        player2Games: 0,
        sets: [],
        isValid: false,
        errorMessage: `Set "${part}" bərabər və ya etibarsız hesabla bitə bilməz.`,
      };
    }

    const maxScore = Math.max(s1, s2);
    const diff = Math.abs(s1 - s2);

    if (maxScore < 11 || diff < 2) {
      return {
        player1Games: 0,
        player2Games: 0,
        sets: [],
        isValid: false,
        errorMessage: `Set "${part}" qalibi ən azı 11 xala çatmalı və ən azı 2 xal fərqlə qalib gəlməlidir (məs. 11-9, 12-10).`,
      };
    }

    if (maxScore > 11 && diff !== 2) {
      return {
        player1Games: 0,
        player2Games: 0,
        sets: [],
        isValid: false,
        errorMessage: `Set "${part}" 10-10 bərabərlikdən (deuce) sonra yalnız 2 xal fərqlə bitə bilər (məs. 12-10, 14-12).`,
      };
    }

    if (s1 > s2) p1Wins++;
    else p2Wins++;

    sets.push({ p1: s1, p2: s2 });
  }

  const summaryValidation = validateMatchSetSummary(p1Wins, p2Wins);
  if (!summaryValidation.isValid) {
    return {
      player1Games: 0,
      player2Games: 0,
      sets: [],
      isValid: false,
      errorMessage: summaryValidation.errorMessage,
    };
  }

  if (expectedP1Sets !== undefined && expectedP2Sets !== undefined) {
    const exactMatch = p1Wins === expectedP1Sets && p2Wins === expectedP2Sets;
    const swappedMatch = p1Wins === expectedP2Sets && p2Wins === expectedP1Sets;
    if (!exactMatch && !swappedMatch) {
      return {
        player1Games: p1Wins,
        player2Games: p2Wins,
        sets,
        isValid: false,
        errorMessage: `Daxil edilən set detalları (${p1Wins}-${p2Wins}) seçilmiş ümumi set hesabı (${expectedP1Sets}-${expectedP2Sets}) ilə uyğun gəlmir.`,
      };
    }
  }

  return {
    player1Games: p1Wins,
    player2Games: p2Wins,
    sets,
    isValid: true,
  };
}

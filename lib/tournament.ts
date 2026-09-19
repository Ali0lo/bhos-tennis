/**
 * Tournament Bracket and Seeding Engine
 * Supports Single Elimination and Round Robin formats
 */

import { BracketMatch, PlayerProfile, Tournament } from './data/types';

/**
 * Standard tournament seeding pairs for power-of-two brackets
 * e.g., for 8 players: [1 vs 8], [4 vs 5], [2 vs 7], [3 vs 6]
 */
export function getSeedingPairs(numPlayers: number): [number, number][] {
  if (numPlayers === 4) {
    return [[1, 4], [2, 3]];
  }
  if (numPlayers === 8) {
    return [
      [1, 8],
      [4, 5],
      [2, 7],
      [3, 6],
    ];
  }
  if (numPlayers === 16) {
    return [
      [1, 16],
      [8, 9],
      [4, 13],
      [5, 12],
      [2, 15],
      [7, 10],
      [3, 14],
      [6, 11],
    ];
  }
  
  // Default generic pairings
  const pairs: [number, number][] = [];
  for (let i = 0; i < numPlayers / 2; i++) {
    pairs.push([i + 1, numPlayers - i]);
  }
  return pairs;
}

/**
 * Generate a complete Single Elimination bracket structure
 */
export function generateSingleEliminationBracket(
  players: PlayerProfile[],
  tournamentId: string
): NonNullable<Tournament['bracket_data']> {
  // Sort players by ELO descending to establish seeds 1..N
  const sortedPlayers = [...players].sort((a, b) => b.current_elo - a.current_elo);
  const participantCount = Math.max(4, Math.min(16, Math.pow(2, Math.ceil(Math.log2(sortedPlayers.length || 4)))));
  
  const numRounds = Math.log2(participantCount);
  const rounds: { name: string; matches: BracketMatch[] }[] = [];

  const roundNames = ['Final', 'Semifinals', 'Quarterfinals', 'Round of 16'];

  // Seed pairings for Round 1
  const seedPairs = getSeedingPairs(participantCount);

  for (let r = 0; r < numRounds; r++) {
    const roundMatchesCount = participantCount / Math.pow(2, r + 1);
    const roundNameIndex = numRounds - 1 - r;
    const roundName = roundNames[roundNameIndex] || `Round ${r + 1}`;
    const matches: BracketMatch[] = [];

    for (let m = 0; m < roundMatchesCount; m++) {
      const matchId = `t-${tournamentId}-r${r}-m${m}`;
      const nextMatchId = r < numRounds - 1 ? `t-${tournamentId}-r${r + 1}-m${Math.floor(m / 2)}` : undefined;
      const nextMatchSlot = (m % 2 === 0 ? 1 : 2) as 1 | 2;

      let p1: PlayerProfile | null = null;
      let p2: PlayerProfile | null = null;

      if (r === 0) {
        // Round 1 seeding
        const [seed1, seed2] = seedPairs[m] || [m * 2 + 1, m * 2 + 2];
        p1 = sortedPlayers[seed1 - 1] || null;
        p2 = sortedPlayers[seed2 - 1] || null;
      }

      matches.push({
        id: matchId,
        roundIndex: r,
        matchIndex: m,
        player1: p1,
        player2: p2,
        player1_score: undefined,
        player2_score: undefined,
        winner_id: undefined,
        nextMatchId,
        nextMatchSlot,
        status: p1 && p2 ? 'ready' : 'pending',
      });
    }

    rounds.push({
      name: roundName,
      matches,
    });
  }

  return { rounds };
}

/**
 * Advance a match winner into the next bracket slot
 */
export function advanceBracketWinner(
  bracketData: NonNullable<Tournament['bracket_data']>,
  roundIndex: number,
  matchIndex: number,
  winnerId: string,
  scores: { p1Score: number; p2Score: number; setScores: string }
): NonNullable<Tournament['bracket_data']> {
  const newRounds = JSON.parse(JSON.stringify(bracketData.rounds)) as typeof bracketData.rounds;
  const currentMatch = newRounds[roundIndex]?.matches[matchIndex];
  if (!currentMatch) return bracketData;

  // Record score
  currentMatch.player1_score = scores.p1Score;
  currentMatch.player2_score = scores.p2Score;
  currentMatch.set_scores = scores.setScores;
  currentMatch.winner_id = winnerId;
  currentMatch.status = 'completed';

  const winningPlayer = currentMatch.player1?.id === winnerId ? currentMatch.player1 : currentMatch.player2;

  // Propagate to next match if not final
  if (currentMatch.nextMatchId && roundIndex + 1 < newRounds.length) {
    const nextRound = newRounds[roundIndex + 1];
    const nextMatch = nextRound.matches.find((m) => m.id === currentMatch.nextMatchId);
    if (nextMatch && winningPlayer) {
      if (currentMatch.nextMatchSlot === 1) {
        nextMatch.player1 = winningPlayer;
      } else {
        nextMatch.player2 = winningPlayer;
      }

      if (nextMatch.player1 && nextMatch.player2) {
        nextMatch.status = 'ready';
      }
    }
  }

  return { rounds: newRounds };
}


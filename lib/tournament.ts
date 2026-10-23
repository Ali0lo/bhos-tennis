/**
 * Tournament Bracket and Seeding Engine
 * Supports Single Elimination and Round Robin formats
 */

import { BracketMatch, MatchRecord, PlayerProfile, Tournament } from './data/types';

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

      const isByeMatch = r === 0 && Boolean((p1 && !p2) || (!p1 && p2));
      const byeWinner = isByeMatch ? (p1 || p2) : null;

      matches.push({
        id: matchId,
        roundIndex: r,
        matchIndex: m,
        round_number: r + 1,
        bracket_node_index: m,
        player1: p1,
        player2: p2,
        player1_score: isByeMatch ? (p1 ? 3 : 0) : undefined,
        player2_score: isByeMatch ? (p2 ? 3 : 0) : undefined,
        winner_id: byeWinner?.id,
        nextMatchId,
        next_match_id: nextMatchId,
        nextMatchSlot,
        is_bye: isByeMatch,
        status: isByeMatch ? 'completed' : p1 && p2 ? 'ready' : 'pending',
      });
    }

    rounds.push({
      name: roundName,
      matches,
    });
  }

  if (rounds.length > 1) {
    rounds[0].matches.forEach((m, idx) => {
      if (m.is_bye && m.winner_id) {
        const winningPlayer = m.player1?.id === m.winner_id ? m.player1 : m.player2;
        const nextMatch = rounds[1].matches[Math.floor(idx / 2)];
        if (nextMatch && winningPlayer) {
          if (idx % 2 === 0) {
            nextMatch.player1 = winningPlayer;
          } else {
            nextMatch.player2 = winningPlayer;
          }
          if (nextMatch.player1 && nextMatch.player2) {
            nextMatch.status = 'ready';
          }
        }
      }
    });
  }

  return { rounds };
}

export function advanceBracketWinner(
  bracketData: NonNullable<Tournament['bracket_data']>,
  roundIndex: number,
  matchIndex: number,
  winnerId: string,
  scores: { p1Score: number; p2Score: number; setScores: string },
  winnerProfileOverride?: PlayerProfile | null
): NonNullable<Tournament['bracket_data']> {
  const newRounds = JSON.parse(JSON.stringify(bracketData.rounds)) as typeof bracketData.rounds;
  const currentMatch = newRounds[roundIndex]?.matches[matchIndex];
  if (!currentMatch) return bracketData;

  currentMatch.player1_score = scores.p1Score;
  currentMatch.player2_score = scores.p2Score;
  currentMatch.set_scores = scores.setScores;
  currentMatch.winner_id = winnerId;
  currentMatch.status = 'completed';

  const winningPlayer =
    winnerProfileOverride ||
    (currentMatch.player1?.id === winnerId ? currentMatch.player1 : currentMatch.player2);

  if (roundIndex + 1 < newRounds.length) {
    const nextRound = newRounds[roundIndex + 1];
    const deterministicNextIndex = Math.floor(
      (currentMatch.bracket_node_index ?? matchIndex) / 2
    );
    const nextMatch =
      (currentMatch.nextMatchId
        ? nextRound.matches.find((m) => m.id === currentMatch.nextMatchId)
        : undefined) || nextRound.matches[deterministicNextIndex];

    if (nextMatch && winningPlayer) {
      const isSlot1 =
        currentMatch.nextMatchSlot !== undefined
          ? currentMatch.nextMatchSlot === 1
          : (currentMatch.bracket_node_index ?? matchIndex) % 2 === 0;

      if (isSlot1) {
        nextMatch.player1 = winningPlayer;
        nextMatch.advancedSlot = 1;
      } else {
        nextMatch.player2 = winningPlayer;
        nextMatch.advancedSlot = 2;
      }
      nextMatch.advancedAt = Date.now();

      if (nextMatch.player1 && nextMatch.player2) {
        nextMatch.status = 'ready';
      }
    }
  }

  return { rounds: newRounds };
}

export function findBracketNodeForMatch(
  bracketData: NonNullable<Tournament['bracket_data']>,
  match: {
    id?: string;
    round_number?: number | null;
    bracket_node_index?: number | null;
    player1_id: string;
    player2_id: string;
  }
): { roundIndex: number; matchIndex: number } | null {
  if (
    typeof match.round_number === 'number' &&
    match.round_number >= 1 &&
    typeof match.bracket_node_index === 'number' &&
    match.bracket_node_index >= 0
  ) {
    const rIdx = match.round_number - 1;
    if (bracketData.rounds[rIdx]?.matches[match.bracket_node_index]) {
      return { roundIndex: rIdx, matchIndex: match.bracket_node_index };
    }
  }

  for (let r = 0; r < bracketData.rounds.length; r++) {
    const matches = bracketData.rounds[r].matches;
    for (let m = 0; m < matches.length; m++) {
      const bm = matches[m];
      if (match.id && bm.id === match.id) {
        return { roundIndex: r, matchIndex: m };
      }
      const p1Id = bm.player1?.id;
      const p2Id = bm.player2?.id;
      if (
        bm.status !== 'completed' &&
        p1Id &&
        p2Id &&
        ((p1Id === match.player1_id && p2Id === match.player2_id) ||
          (p1Id === match.player2_id && p2Id === match.player1_id))
      ) {
        return { roundIndex: r, matchIndex: m };
      }
    }
  }

  return null;
}



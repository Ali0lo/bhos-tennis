import { BracketMatch, GroupMatch, PlayerProfile, Tournament, TournamentGroup } from './data/types';
import { parseSetScores, validateMatchSetSummary } from './elo';

export function isTournamentRosterLocked(status?: string | null): boolean {
  if (!status) return false;
  const normalized = status.trim().toLowerCase();
  return (
    normalized === 'active' ||
    normalized === 'ongoing' ||
    normalized === 'in_progress' ||
    normalized === 'in progress' ||
    normalized === 'completed'
  );
}

export function getSeedingPairs(numPlayers: number): [number, number][] {
  const targetSize = Math.max(2, Math.min(64, Math.pow(2, Math.ceil(Math.log2(Math.max(2, numPlayers))))));

  let seeds: number[] = [1, 2];
  let currentSize = 2;

  while (currentSize < targetSize) {
    currentSize *= 2;
    const nextSeeds: number[] = [];
    for (const s of seeds) {
      nextSeeds.push(s);
      nextSeeds.push(currentSize + 1 - s);
    }
    seeds = nextSeeds;
  }

  const pairs: [number, number][] = [];
  for (let i = 0; i < seeds.length; i += 2) {
    pairs.push([seeds[i], seeds[i + 1]]);
  }
  return pairs;
}

export function generateSingleEliminationBracket(
  players: PlayerProfile[],
  tournamentId: string
): NonNullable<Tournament['bracket_data']> {
  const seenIds = new Set<string>();
  const uniquePlayers: PlayerProfile[] = [];
  for (const p of players || []) {
    if (p && p.id && !seenIds.has(p.id)) {
      seenIds.add(p.id);
      uniquePlayers.push(p);
    }
  }

  if (uniquePlayers.length < 2) {
    return { rounds: [] };
  }

  const sortedPlayers = [...uniquePlayers].slice(0, 64).sort((a, b) => b.current_elo - a.current_elo);
  const participantCount = Math.max(
    2,
    Math.min(64, Math.pow(2, Math.ceil(Math.log2(sortedPlayers.length))))
  );

  const numRounds = Math.log2(participantCount);
  const rounds: { name: string; matches: BracketMatch[] }[] = [];

  const roundNames = [
    'Final',
    'Semifinals',
    'Quarterfinals',
    'Round of 16',
    'Round of 32',
    'Round of 64',
  ];
  const seedPairs = getSeedingPairs(participantCount);

  for (let r = 0; r < numRounds; r++) {
    const roundMatchesCount = participantCount / Math.pow(2, r + 1);
    const roundNameIndex = numRounds - 1 - r;
    const roundName = roundNames[roundNameIndex] || `Round ${r + 1}`;
    const matches: BracketMatch[] = [];

    for (let m = 0; m < roundMatchesCount; m++) {
      const matchId = `t-${tournamentId}-r${r}-m${m}`;
      const nextMatchId =
        r < numRounds - 1 ? `t-${tournamentId}-r${r + 1}-m${Math.floor(m / 2)}` : undefined;
      const nextMatchSlot = (m % 2 === 0 ? 1 : 2) as 1 | 2;

      let p1: PlayerProfile | null = null;
      let p2: PlayerProfile | null = null;

      if (r === 0) {
        const [seed1, seed2] = seedPairs[m] || [m * 2 + 1, m * 2 + 2];
        p1 = sortedPlayers[seed1 - 1] || null;
        p2 = sortedPlayers[seed2 - 1] || null;
      }

      const isByeMatch = r === 0 && Boolean((p1 && !p2) || (!p1 && p2));
      const byeWinner = isByeMatch ? p1 || p2 : null;

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
        set_scores: isByeMatch ? 'BYE' : undefined,
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

  for (let r = 0; r < rounds.length - 1; r++) {
    rounds[r].matches.forEach((m, idx) => {
      if ((m.is_bye || m.status === 'completed') && m.winner_id) {
        const winningPlayer = m.player1?.id === m.winner_id ? m.player1 : m.player2;
        const nextMatch = rounds[r + 1].matches[Math.floor(idx / 2)];
        if (nextMatch && winningPlayer) {
          if (idx % 2 === 0) {
            nextMatch.player1 = winningPlayer;
          } else {
            nextMatch.player2 = winningPlayer;
          }
          if (nextMatch.player1 && nextMatch.player2 && nextMatch.status !== 'completed') {
            nextMatch.status = 'ready';
          }
        }
      }
    });
  }

  return { rounds };
}

export function canAdvanceBracketMatch(
  bracketData: NonNullable<Tournament['bracket_data']>,
  roundIndex: number,
  matchIndex: number
): { allowed: boolean; reason?: string } {
  const rounds = bracketData?.rounds;
  if (!rounds || !rounds[roundIndex]) {
    return { allowed: false, reason: 'Bracket round not found.' };
  }

  const currentMatch = rounds[roundIndex].matches?.[matchIndex];
  if (!currentMatch) {
    return { allowed: false, reason: 'Bracket match node not found.' };
  }

  if (currentMatch.is_bye) {
    return { allowed: false, reason: 'Bye matches are automatically resolved.' };
  }

  if (!currentMatch.player1 || !currentMatch.player2) {
    return { allowed: false, reason: 'Both players must be determined before advancing.' };
  }

  if (currentMatch.player1.id === currentMatch.player2.id) {
    return { allowed: false, reason: 'A player cannot play against themselves in a bracket.' };
  }

  if (roundIndex > 0) {
    const prevRound = rounds[roundIndex - 1];
    const feederA = prevRound?.matches?.[matchIndex * 2];
    const feederB = prevRound?.matches?.[matchIndex * 2 + 1];

    const feederAConfirmed =
      feederA &&
      (feederA.status === 'completed' || feederA.status === 'approved') &&
      Boolean(feederA.winner_id);
    const feederBConfirmed =
      feederB &&
      (feederB.status === 'completed' || feederB.status === 'approved') &&
      Boolean(feederB.winner_id);

    if (!feederAConfirmed || !feederBConfirmed) {
      return {
        allowed: false,
        reason: 'Prerequisite round matches must have a confirmed winner before advancing.',
      };
    }

    if (
      feederA.winner_id !== currentMatch.player1.id ||
      feederB.winner_id !== currentMatch.player2.id
    ) {
      return {
        allowed: false,
        reason: 'Bracket slot participants do not match prerequisite round winners.',
      };
    }
  }

  if (roundIndex + 1 < rounds.length) {
    const nextRound = rounds[roundIndex + 1];
    const nextMatchIndex = Math.floor((currentMatch.bracket_node_index ?? matchIndex) / 2);
    const nextMatch = nextRound?.matches?.[nextMatchIndex];
    if (nextMatch && (nextMatch.status === 'completed' || nextMatch.status === 'approved')) {
      return {
        allowed: false,
        reason: 'Cannot modify a match after the next bracket round match has already been completed.',
      };
    }
  }

  return { allowed: true };
}

export function advanceBracketWinner(
  bracketData: NonNullable<Tournament['bracket_data']>,
  roundIndex: number,
  matchIndex: number,
  winnerId: string,
  scores: { p1Score: number; p2Score: number; setScores: string },
  winnerProfileOverride?: PlayerProfile | null
): NonNullable<Tournament['bracket_data']> {
  const eligibility = canAdvanceBracketMatch(bracketData, roundIndex, matchIndex);
  if (!eligibility.allowed) {
    throw new Error(eligibility.reason || 'Bracket match cannot be advanced.');
  }

  const newRounds = JSON.parse(JSON.stringify(bracketData.rounds)) as typeof bracketData.rounds;
  const currentMatch = newRounds[roundIndex]?.matches[matchIndex];
  if (!currentMatch || !currentMatch.player1 || !currentMatch.player2) {
    throw new Error('Both players must be assigned to the bracket match.');
  }

  if (winnerId !== currentMatch.player1.id && winnerId !== currentMatch.player2.id) {
    throw new Error('Selected winner must be one of the match participants.');
  }

  const summaryCheck = validateMatchSetSummary(scores.p1Score, scores.p2Score);
  if (!summaryCheck.isValid) {
    throw new Error(summaryCheck.errorMessage || 'Invalid match set scores.');
  }

  const p1IsDeclaredWinner = winnerId === currentMatch.player1.id;
  if (p1IsDeclaredWinner && scores.p1Score <= scores.p2Score) {
    throw new Error('Set scores must favor the selected winning player.');
  }
  if (!p1IsDeclaredWinner && scores.p2Score <= scores.p1Score) {
    throw new Error('Set scores must favor the selected winning player.');
  }

  const trimmedSetScores = (scores.setScores || '').trim();
  if (trimmedSetScores && trimmedSetScores.includes(',')) {
    const parsedSets = parseSetScores(trimmedSetScores, scores.p1Score, scores.p2Score);
    if (!parsedSets.isValid) {
      throw new Error(parsedSets.errorMessage || 'Invalid individual game scores.');
    }
  }

  currentMatch.player1_score = scores.p1Score;
  currentMatch.player2_score = scores.p2Score;
  currentMatch.set_scores = trimmedSetScores || `${scores.p1Score}-${scores.p2Score}`;
  currentMatch.winner_id = winnerId;
  currentMatch.status = 'completed';

  const winningPlayer =
    winnerProfileOverride ||
    (currentMatch.player1.id === winnerId ? currentMatch.player1 : currentMatch.player2);

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
  if (!bracketData?.rounds) return null;

  if (
    typeof match.round_number === 'number' &&
    match.round_number >= 1 &&
    typeof match.bracket_node_index === 'number' &&
    match.bracket_node_index >= 0
  ) {
    const rIdx = match.round_number - 1;
    if (bracketData.rounds[rIdx]?.matches?.[match.bracket_node_index]) {
      return { roundIndex: rIdx, matchIndex: match.bracket_node_index };
    }
  }

  for (let r = 0; r < bracketData.rounds.length; r++) {
    const matches = bracketData.rounds[r]?.matches || [];
    for (let m = 0; m < matches.length; m++) {
      const bm = matches[m];
      if (!bm) continue;
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

export interface GroupStandingRow {
  player: PlayerProfile;
  played: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setDiff: number;
  points: number;
}

export function generateTournamentGroups(
  players: PlayerProfile[],
  tournamentId: string,
  targetGroupSize = 4
): TournamentGroup[] {
  const seenIds = new Set<string>();
  const uniquePlayers: PlayerProfile[] = [];
  for (const p of players || []) {
    if (p && p.id && !seenIds.has(p.id)) {
      seenIds.add(p.id);
      uniquePlayers.push(p);
    }
  }

  if (uniquePlayers.length === 0) {
    return [];
  }

  const clampedGroupSize = Math.max(3, Math.min(8, targetGroupSize || 4));
  const sortedPlayers = [...uniquePlayers].sort((a, b) => b.current_elo - a.current_elo);
  const numGroups = Math.max(1, Math.floor(sortedPlayers.length / clampedGroupSize));
  const groupBuckets: PlayerProfile[][] = Array.from({ length: numGroups }, () => []);

  sortedPlayers.forEach((player, idx) => {
    const cycle = Math.floor(idx / numGroups);
    const posInCycle = idx % numGroups;
    const bucketIdx = cycle % 2 === 0 ? posInCycle : numGroups - 1 - posInCycle;
    groupBuckets[bucketIdx].push(player);
  });

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return groupBuckets.map((bucketPlayers, gIdx) => {
    const letter = letters[gIdx] || String(gIdx + 1);
    const groupId = `g-${tournamentId}-${letter.toLowerCase()}`;
    const matches: GroupMatch[] = [];
    let matchCounter = 0;

    for (let i = 0; i < bucketPlayers.length; i++) {
      for (let j = i + 1; j < bucketPlayers.length; j++) {
        matches.push({
          id: `${groupId}-m${matchCounter++}`,
          groupId,
          player1: bucketPlayers[i],
          player2: bucketPlayers[j],
          status: 'ready',
        });
      }
    }

    return {
      id: groupId,
      name: `Qrup ${letter}`,
      players: bucketPlayers,
      matches,
    };
  });
}

export function computeGroupStandings(group: TournamentGroup): GroupStandingRow[] {
  const map = new Map<string, GroupStandingRow>();
  for (const p of group.players || []) {
    map.set(p.id, {
      player: p,
      played: 0,
      wins: 0,
      losses: 0,
      setsWon: 0,
      setsLost: 0,
      setDiff: 0,
      points: 0,
    });
  }

  for (const m of group.matches || []) {
    if (
      m.status === 'completed' &&
      typeof m.player1_score === 'number' &&
      typeof m.player2_score === 'number' &&
      m.player1_score !== m.player2_score
    ) {
      const row1 = map.get(m.player1.id);
      const row2 = map.get(m.player2.id);
      const p1Won = m.player1_score > m.player2_score;

      if (row1) {
        row1.played += 1;
        row1.setsWon += m.player1_score;
        row1.setsLost += m.player2_score;
        row1.setDiff = row1.setsWon - row1.setsLost;
        if (p1Won) {
          row1.wins += 1;
          row1.points += 2;
        } else {
          row1.losses += 1;
          row1.points += 1;
        }
      }

      if (row2) {
        row2.played += 1;
        row2.setsWon += m.player2_score;
        row2.setsLost += m.player1_score;
        row2.setDiff = row2.setsWon - row2.setsLost;
        if (!p1Won) {
          row2.wins += 1;
          row2.points += 2;
        } else {
          row2.losses += 1;
          row2.points += 1;
        }
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
    if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
    return b.player.current_elo - a.player.current_elo;
  });
}

export function getQualifiedPlayersFromGroups(
  groups: TournamentGroup[],
  advancePerGroup = 2
): PlayerProfile[] {
  const qualified: PlayerProfile[] = [];
  const cap = Math.max(1, advancePerGroup || 2);

  for (const group of groups || []) {
    const standings = computeGroupStandings(group);
    standings.slice(0, cap).forEach((row) => {
      qualified.push(row.player);
    });
  }

  return qualified;
}

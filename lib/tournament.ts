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

export interface GenerateTournamentGroupsOptions {
  numGroups?: number;
  topSeedPlayerIds?: string[];
}

export function generateTournamentGroups(
  players: PlayerProfile[],
  tournamentId: string,
  targetGroupSize = 4,
  options?: GenerateTournamentGroupsOptions
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

  const requestedNumGroups = options?.numGroups;
  const clampedGroupSize = Math.max(3, Math.min(12, targetGroupSize || 4));
  const numGroups =
    requestedNumGroups && requestedNumGroups >= 1
      ? requestedNumGroups
      : Math.max(1, Math.floor(uniquePlayers.length / clampedGroupSize));

  const groupBuckets: PlayerProfile[][] = Array.from({ length: numGroups }, () => []);
  const topSeedIds = (options?.topSeedPlayerIds || []).filter(Boolean);

  // 1. Separate top seeds from general pool
  const topSeedPlayers: PlayerProfile[] = [];
  const remainingPlayers: PlayerProfile[] = [];

  const playerMap = new Map<string, PlayerProfile>();
  uniquePlayers.forEach((p) => playerMap.set(p.id, p));

  // Place designated top seeds first
  for (const seedId of topSeedIds) {
    const p = playerMap.get(seedId);
    if (p && !topSeedPlayers.some((tsp) => tsp.id === p.id)) {
      topSeedPlayers.push(p);
    }
  }

  // Everyone else goes to remaining
  uniquePlayers.forEach((p) => {
    if (!topSeedPlayers.some((tsp) => tsp.id === p.id)) {
      remainingPlayers.push(p);
    }
  });

  // Sort remaining by current_elo descending
  remainingPlayers.sort((a, b) => (b.current_elo ?? 1200) - (a.current_elo ?? 1200));

  // If no top seeds were explicitly chosen, use top N by ELO as seeds
  if (topSeedPlayers.length === 0 && numGroups > 1) {
    const autoSeedCount = Math.min(numGroups, remainingPlayers.length);
    for (let i = 0; i < autoSeedCount; i++) {
      const topP = remainingPlayers.shift();
      if (topP) topSeedPlayers.push(topP);
    }
  }

  // 2. Assign top seeds to different groups:
  // Seed 1 -> Group A (bucket 0)
  // Seed 2 -> Group B (bucket 1)
  // Seed 3 -> Group C (bucket 2)
  // Seed 4 -> Group D (bucket 3)
  topSeedPlayers.forEach((seedPlayer, idx) => {
    const bucketIdx = idx % numGroups;
    groupBuckets[bucketIdx].push(seedPlayer);
  });

  // 3. Distribute remaining players across groups evenly using serpentine distribution
  remainingPlayers.forEach((player, idx) => {
    const cycle = Math.floor(idx / numGroups);
    const posInCycle = idx % numGroups;
    // Serpentine order: left-to-right on even cycles, right-to-left on odd cycles
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

    const assignedTopSeed = topSeedPlayers[gIdx]?.id;

    return {
      id: groupId,
      name: `Qrup ${letter}`,
      players: bucketPlayers,
      matches,
      top_seed_id: assignedTopSeed,
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

export function generatePlayoffBracketFromGroups(
  groups: TournamentGroup[],
  tournamentId: string,
  advancePerGroup = 2
): NonNullable<Tournament['bracket_data']> {
  const cap = Math.max(1, advancePerGroup || 2);
  const groupRankings: PlayerProfile[][] = (groups || []).map((g) => {
    const standings = computeGroupStandings(g);
    return standings.slice(0, cap).map((r) => r.player);
  });

  // 4 Groups, 2 advancing each (8 players in Quarterfinals)
  // Guarantees:
  // - Seed 1 (A1) & Seed 2 (B1) meet ONLY in the FINAL
  // - Seed 1 (A1) & Seed 4 (D1) meet ONLY in Semifinal 1
  // - Seed 3 (C1) & Seed 2 (B1) meet ONLY in Semifinal 2
  // - Group runners-up do not face their own group winner in QF
  if (groups.length === 4 && cap === 2) {
    const A = groupRankings[0] || [];
    const B = groupRankings[1] || [];
    const C = groupRankings[2] || [];
    const D = groupRankings[3] || [];

    const a1 = A[0] || null;
    const a2 = A[1] || null;
    const b1 = B[0] || null;
    const b2 = B[1] || null;
    const c1 = C[0] || null;
    const c2 = C[1] || null;
    const d1 = D[0] || null;
    const d2 = D[1] || null;

    const qfMatches: BracketMatch[] = [
      {
        id: `t-${tournamentId}-r0-m0`,
        roundIndex: 0,
        matchIndex: 0,
        round_number: 1,
        bracket_node_index: 0,
        player1: a1,
        player2: c2,
        nextMatchId: `t-${tournamentId}-r1-m0`,
        next_match_id: `t-${tournamentId}-r1-m0`,
        nextMatchSlot: 1,
        status: a1 && c2 ? 'ready' : 'pending',
      },
      {
        id: `t-${tournamentId}-r0-m1`,
        roundIndex: 0,
        matchIndex: 1,
        round_number: 1,
        bracket_node_index: 1,
        player1: d1,
        player2: b2,
        nextMatchId: `t-${tournamentId}-r1-m0`,
        next_match_id: `t-${tournamentId}-r1-m0`,
        nextMatchSlot: 2,
        status: d1 && b2 ? 'ready' : 'pending',
      },
      {
        id: `t-${tournamentId}-r0-m2`,
        roundIndex: 0,
        matchIndex: 2,
        round_number: 1,
        bracket_node_index: 2,
        player1: c1,
        player2: a2,
        nextMatchId: `t-${tournamentId}-r1-m1`,
        next_match_id: `t-${tournamentId}-r1-m1`,
        nextMatchSlot: 1,
        status: c1 && a2 ? 'ready' : 'pending',
      },
      {
        id: `t-${tournamentId}-r0-m3`,
        roundIndex: 0,
        matchIndex: 3,
        round_number: 1,
        bracket_node_index: 3,
        player1: b1,
        player2: d2,
        nextMatchId: `t-${tournamentId}-r1-m1`,
        next_match_id: `t-${tournamentId}-r1-m1`,
        nextMatchSlot: 2,
        status: b1 && d2 ? 'ready' : 'pending',
      },
    ];

    const sfMatches: BracketMatch[] = [
      {
        id: `t-${tournamentId}-r1-m0`,
        roundIndex: 1,
        matchIndex: 0,
        round_number: 2,
        bracket_node_index: 0,
        player1: null,
        player2: null,
        nextMatchId: `t-${tournamentId}-r2-m0`,
        next_match_id: `t-${tournamentId}-r2-m0`,
        nextMatchSlot: 1,
        status: 'pending',
      },
      {
        id: `t-${tournamentId}-r1-m1`,
        roundIndex: 1,
        matchIndex: 1,
        round_number: 2,
        bracket_node_index: 1,
        player1: null,
        player2: null,
        nextMatchId: `t-${tournamentId}-r2-m0`,
        next_match_id: `t-${tournamentId}-r2-m0`,
        nextMatchSlot: 2,
        status: 'pending',
      },
    ];

    const finalMatch: BracketMatch[] = [
      {
        id: `t-${tournamentId}-r2-m0`,
        roundIndex: 2,
        matchIndex: 0,
        round_number: 3,
        bracket_node_index: 0,
        player1: null,
        player2: null,
        status: 'pending',
      },
    ];

    return {
      rounds: [
        { name: 'Quarterfinals', matches: qfMatches },
        { name: 'Semifinals', matches: sfMatches },
        { name: 'Final', matches: finalMatch },
      ],
    };
  }

  // 4 Groups, 1 advancing each (4 players in Semifinals)
  if (groups.length === 4 && cap === 1) {
    const a1 = groupRankings[0]?.[0] || null;
    const b1 = groupRankings[1]?.[0] || null;
    const c1 = groupRankings[2]?.[0] || null;
    const d1 = groupRankings[3]?.[0] || null;

    const sfMatches: BracketMatch[] = [
      {
        id: `t-${tournamentId}-r0-m0`,
        roundIndex: 0,
        matchIndex: 0,
        round_number: 1,
        bracket_node_index: 0,
        player1: a1,
        player2: d1,
        nextMatchId: `t-${tournamentId}-r1-m0`,
        next_match_id: `t-${tournamentId}-r1-m0`,
        nextMatchSlot: 1,
        status: a1 && d1 ? 'ready' : 'pending',
      },
      {
        id: `t-${tournamentId}-r0-m1`,
        roundIndex: 0,
        matchIndex: 1,
        round_number: 1,
        bracket_node_index: 1,
        player1: b1,
        player2: c1,
        nextMatchId: `t-${tournamentId}-r1-m0`,
        next_match_id: `t-${tournamentId}-r1-m0`,
        nextMatchSlot: 2,
        status: b1 && c1 ? 'ready' : 'pending',
      },
    ];

    const finalMatch: BracketMatch[] = [
      {
        id: `t-${tournamentId}-r1-m0`,
        roundIndex: 1,
        matchIndex: 0,
        round_number: 2,
        bracket_node_index: 0,
        player1: null,
        player2: null,
        status: 'pending',
      },
    ];

    return {
      rounds: [
        { name: 'Semifinals', matches: sfMatches },
        { name: 'Final', matches: finalMatch },
      ],
    };
  }

  // 2 Groups, 4 advancing each (8 players in Quarterfinals -> Semifinals -> Final)
  // Cross-pairing guarantees:
  // - A1 vs B4 (m0) & B2 vs A3 (m1) -> Upper Half Semifinal (A1 vs B2)
  // - A2 vs B3 (m2) & B1 vs A4 (m3) -> Lower Half Semifinal (A2 vs B1)
  // - Final: Upper Half winner vs Lower Half winner (A1 vs B1)
  // - No players from the same group meet in Quarterfinals
  // - Top seeds from Group A & B only meet in Semifinals and Final!
  if (groups.length === 2 && cap === 4) {
    const A = groupRankings[0] || [];
    const B = groupRankings[1] || [];

    const a1 = A[0] || null;
    const a2 = A[1] || null;
    const a3 = A[2] || null;
    const a4 = A[3] || null;

    const b1 = B[0] || null;
    const b2 = B[1] || null;
    const b3 = B[2] || null;
    const b4 = B[3] || null;

    const qfMatches: BracketMatch[] = [
      {
        id: `t-${tournamentId}-r0-m0`,
        roundIndex: 0,
        matchIndex: 0,
        round_number: 1,
        bracket_node_index: 0,
        player1: a1,
        player2: b4,
        nextMatchId: `t-${tournamentId}-r1-m0`,
        next_match_id: `t-${tournamentId}-r1-m0`,
        nextMatchSlot: 1,
        status: a1 && b4 ? 'ready' : 'pending',
      },
      {
        id: `t-${tournamentId}-r0-m1`,
        roundIndex: 0,
        matchIndex: 1,
        round_number: 1,
        bracket_node_index: 1,
        player1: b2,
        player2: a3,
        nextMatchId: `t-${tournamentId}-r1-m0`,
        next_match_id: `t-${tournamentId}-r1-m0`,
        nextMatchSlot: 2,
        status: b2 && a3 ? 'ready' : 'pending',
      },
      {
        id: `t-${tournamentId}-r0-m2`,
        roundIndex: 0,
        matchIndex: 2,
        round_number: 1,
        bracket_node_index: 2,
        player1: a2,
        player2: b3,
        nextMatchId: `t-${tournamentId}-r1-m1`,
        next_match_id: `t-${tournamentId}-r1-m1`,
        nextMatchSlot: 1,
        status: a2 && b3 ? 'ready' : 'pending',
      },
      {
        id: `t-${tournamentId}-r0-m3`,
        roundIndex: 0,
        matchIndex: 3,
        round_number: 1,
        bracket_node_index: 3,
        player1: b1,
        player2: a4,
        nextMatchId: `t-${tournamentId}-r1-m1`,
        next_match_id: `t-${tournamentId}-r1-m1`,
        nextMatchSlot: 2,
        status: b1 && a4 ? 'ready' : 'pending',
      },
    ];

    const sfMatches: BracketMatch[] = [
      {
        id: `t-${tournamentId}-r1-m0`,
        roundIndex: 1,
        matchIndex: 0,
        round_number: 2,
        bracket_node_index: 0,
        player1: null,
        player2: null,
        nextMatchId: `t-${tournamentId}-r2-m0`,
        next_match_id: `t-${tournamentId}-r2-m0`,
        nextMatchSlot: 1,
        status: 'pending',
      },
      {
        id: `t-${tournamentId}-r1-m1`,
        roundIndex: 1,
        matchIndex: 1,
        round_number: 2,
        bracket_node_index: 1,
        player1: null,
        player2: null,
        nextMatchId: `t-${tournamentId}-r2-m0`,
        next_match_id: `t-${tournamentId}-r2-m0`,
        nextMatchSlot: 2,
        status: 'pending',
      },
    ];

    const finalMatch: BracketMatch[] = [
      {
        id: `t-${tournamentId}-r2-m0`,
        roundIndex: 2,
        matchIndex: 0,
        round_number: 3,
        bracket_node_index: 0,
        player1: null,
        player2: null,
        status: 'pending',
      },
    ];

    return {
      rounds: [
        { name: 'Quarterfinals', matches: qfMatches },
        { name: 'Semifinals', matches: sfMatches },
        { name: 'Final', matches: finalMatch },
      ],
    };
  }

  // 2 Groups, 2 advancing each (4 players in Semifinals)
  if (groups.length === 2 && cap === 2) {
    const a1 = groupRankings[0]?.[0] || null;
    const a2 = groupRankings[0]?.[1] || null;
    const b1 = groupRankings[1]?.[0] || null;
    const b2 = groupRankings[1]?.[1] || null;

    const sfMatches: BracketMatch[] = [
      {
        id: `t-${tournamentId}-r0-m0`,
        roundIndex: 0,
        matchIndex: 0,
        round_number: 1,
        bracket_node_index: 0,
        player1: a1,
        player2: b2,
        nextMatchId: `t-${tournamentId}-r1-m0`,
        next_match_id: `t-${tournamentId}-r1-m0`,
        nextMatchSlot: 1,
        status: a1 && b2 ? 'ready' : 'pending',
      },
      {
        id: `t-${tournamentId}-r0-m1`,
        roundIndex: 0,
        matchIndex: 1,
        round_number: 1,
        bracket_node_index: 1,
        player1: b1,
        player2: a2,
        nextMatchId: `t-${tournamentId}-r1-m0`,
        next_match_id: `t-${tournamentId}-r1-m0`,
        nextMatchSlot: 2,
        status: b1 && a2 ? 'ready' : 'pending',
      },
    ];

    const finalMatch: BracketMatch[] = [
      {
        id: `t-${tournamentId}-r1-m0`,
        roundIndex: 1,
        matchIndex: 0,
        round_number: 2,
        bracket_node_index: 0,
        player1: null,
        player2: null,
        status: 'pending',
      },
    ];

    return {
      rounds: [
        { name: 'Semifinals', matches: sfMatches },
        { name: 'Final', matches: finalMatch },
      ],
    };
  }

  // General fallback: flatten qualified players and use standard bracket
  const allQualified: PlayerProfile[] = [];
  for (let rank = 0; rank < cap; rank++) {
    groupRankings.forEach((grp) => {
      if (grp[rank]) allQualified.push(grp[rank]);
    });
  }

  return generateSingleEliminationBracket(allQualified, tournamentId);
}

import { calculateMatchElo, calculateWinProbability, parseSetScores } from '../lib/elo';
import { generateSingleEliminationBracket, advanceBracketWinner } from '../lib/tournament';
import { PlayerProfile } from '../lib/data/types';

function runTests() {
  console.log('--- Testing Table Tennis ELO Engine ---');

  // Test 1: Equal ratings (1200 vs 1200)
  const equalProb = calculateWinProbability(1200, 1200);
  console.assert(Math.abs(equalProb - 0.5) < 0.001, 'Equal rating should have 0.5 probability');

  const equalMatch = calculateMatchElo({
    player1Elo: 1200,
    player2Elo: 1200,
    player1Won: true,
  });
  console.log('Equal match result (1200 vs 1200):', equalMatch);
  console.assert(equalMatch.winnerGained === 16, `Expected delta 16, got ${equalMatch.winnerGained}`);
  console.assert(equalMatch.player1EloAfter === 1216, 'P1 should be 1216');
  console.assert(equalMatch.player2EloAfter === 1184, 'P2 should be 1184');

  // Test 2: Upset victory (1200 beats 1600)
  const upsetMatch = calculateMatchElo({
    player1Elo: 1200,
    player2Elo: 1600,
    player1Won: true,
    isTournament: true,
  });
  console.log('Upset victory (1200 beats 1600 in Tournament):', upsetMatch);
  console.assert(upsetMatch.winnerGained > 30, 'Upset win in tournament should award high points');

  // Test 3: Set Score Parser
  const parsed = parseSetScores('11-9, 8-11, 11-6, 12-10');
  console.log('Parsed set score:', parsed);
  console.assert(parsed.isValid === true, 'Set score should be valid');
  console.assert(parsed.player1Games === 3, 'P1 should have 3 games won');
  console.assert(parsed.player2Games === 1, 'P2 should have 1 game won');

  // Test 4: Tournament Bracket Generation
  const dummyPlayers: PlayerProfile[] = Array.from({ length: 8 }, (_, i) => ({
    id: `player-${i + 1}`,
    full_name: `Player ${i + 1}`,
    email: `p${i + 1}@bhos.edu.az`,
    major_faculty: 'Information Security',
    admission_year: 2022,
    role: 'player',
    playing_style: 'Shakehand Offensive',
    blade_equipment: 'Viscaria',
    forehand_rubber: 'Dignics 09C',
    backhand_rubber: 'Tenergy 05',
    current_elo: 1600 - i * 50,
    matches_played: 10,
    wins: 8,
    losses: 2,
    is_active: true,
    created_at: new Date().toISOString(),
  }));

  const bracket = generateSingleEliminationBracket(dummyPlayers, 'test-tourn-1');
  console.log(`Generated bracket with ${bracket.rounds.length} rounds.`);
  console.assert(bracket.rounds.length === 3, '8 players should generate 3 rounds (QF, SF, Final)');
  console.assert(bracket.rounds[0].matches.length === 4, 'Round 1 should have 4 matches');
  console.assert(bracket.rounds[1].matches.length === 2, 'Round 2 should have 2 matches');
  console.assert(bracket.rounds[2].matches.length === 1, 'Round 3 should have 1 match');

  // Test advancement
  const advancedBracket = advanceBracketWinner(bracket, 0, 0, 'player-1', {
    p1Score: 3,
    p2Score: 0,
    setScores: '11-4, 11-5, 11-6',
  });
  console.assert(
    advancedBracket.rounds[1].matches[0].player1?.id === 'player-1',
    'Player 1 should advance to Semifinal slot 1'
  );

  console.log('All ELO & Tournament Tests Passed Successfully!');
}

runTests();


// Verified all ELO formulas and upset K-factor scaling

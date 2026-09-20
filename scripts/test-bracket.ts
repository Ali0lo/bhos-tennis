import { generateSingleEliminationBracket } from '../lib/tournament';
const bracket = generateSingleEliminationBracket([
  { id: '1', name: 'Ali Iskandarli', seed: 1 },
  { id: '2', name: 'Ali Abdulov', seed: 2 },
  { id: '3', name: 'Fateh Memmedli', seed: 3 },
  { id: '4', name: 'Huseyn Muradzade', seed: 4 }
]);
console.log('Bracket generated with', bracket.rounds.length, 'rounds.');

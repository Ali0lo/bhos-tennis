'use client';

export interface MatchFormItem {
  id: string;
  result: 'W' | 'L';
  opponentName?: string;
  score: string;
  eloDelta?: number;
  date?: string;
}

import {
  PlayerProfile,
  MatchRecord,
  Tournament,
  TournamentGroup,
  TableReservation,
} from './types';

/* eslint-disable @typescript-eslint/no-var-requires */
const devSeeds: typeof import('./mockData.dev') | null =
  process.env.NODE_ENV !== 'production' ? require('./mockData.dev') : null;

export const FOUNDATION_PLAYERS: PlayerProfile[] = devSeeds?.FOUNDATION_PLAYERS ?? [];
export const FOUNDATION_GROUPS: TournamentGroup[] = devSeeds?.FOUNDATION_GROUPS ?? [];
export const INITIAL_PROFILES: PlayerProfile[] = devSeeds?.INITIAL_PROFILES ?? [];
export const INITIAL_MATCHES: MatchRecord[] = devSeeds?.INITIAL_MATCHES ?? [];
export const INITIAL_TOURNAMENTS: Tournament[] = devSeeds?.INITIAL_TOURNAMENTS ?? [];
export const INITIAL_RESERVATIONS: TableReservation[] = devSeeds?.INITIAL_RESERVATIONS ?? [];

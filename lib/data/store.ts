'use client';

import { PlayerProfile, MatchRecord, Tournament, TableReservation, UserRole } from './types';
import { INITIAL_PROFILES, INITIAL_MATCHES, INITIAL_TOURNAMENTS, INITIAL_RESERVATIONS } from './mockData';
import { calculateMatchElo, parseSetScores } from '../elo';
import { advanceBracketWinner, generateSingleEliminationBracket } from '../tournament';

const STORAGE_KEYS = {
  PROFILES: 'bhos_tt_profiles_v1',
  MATCHES: 'bhos_tt_matches_v1',
  TOURNAMENTS: 'bhos_tt_tournaments_v1',
  RESERVATIONS: 'bhos_tt_reservations_v1',
  CURRENT_USER_ID: 'bhos_tt_active_user_id',
};

// Safe browser local storage access
function getStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to store key ${key}:`, err);
  }
}

export class BHOSDataStore {
  private static instance: BHOSDataStore;

  private profiles: PlayerProfile[] = INITIAL_PROFILES;
  private matches: MatchRecord[] = INITIAL_MATCHES;
  private tournaments: Tournament[] = INITIAL_TOURNAMENTS;
  private reservations: TableReservation[] = INITIAL_RESERVATIONS;
  private currentUserId: string = 'p-1'; // Default: Elvin (President)

  private constructor() {
    if (typeof window !== 'undefined') {
      this.profiles = getStored(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
      this.matches = getStored(STORAGE_KEYS.MATCHES, INITIAL_MATCHES);
      this.tournaments = getStored(STORAGE_KEYS.TOURNAMENTS, INITIAL_TOURNAMENTS);
      this.reservations = getStored(STORAGE_KEYS.RESERVATIONS, INITIAL_RESERVATIONS);
      this.currentUserId = getStored(STORAGE_KEYS.CURRENT_USER_ID, 'p-1');
      this.recalculateRanks();
    }
  }

  public static getInstance(): BHOSDataStore {
    if (!BHOSDataStore.instance) {
      BHOSDataStore.instance = new BHOSDataStore();
    }
    return BHOSDataStore.instance;
  }

  private save() {
    setStored(STORAGE_KEYS.PROFILES, this.profiles);
    setStored(STORAGE_KEYS.MATCHES, this.matches);
    setStored(STORAGE_KEYS.TOURNAMENTS, this.tournaments);
    setStored(STORAGE_KEYS.RESERVATIONS, this.reservations);
    setStored(STORAGE_KEYS.CURRENT_USER_ID, this.currentUserId);
    this.notify();
  }

  private listeners: (() => void)[] = [];

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private recalculateRanks() {
    this.profiles.sort((a, b) => b.current_elo - a.current_elo);
    this.profiles.forEach((p, idx) => {
      p.rank = idx + 1;
    });
  }

  // --- Auth / Active User ---
  public getCurrentUser(): PlayerProfile {
    const user = this.profiles.find((p) => p.id === this.currentUserId);
    return user || this.profiles[0];
  }

  public setCurrentUser(userId: string): void {
    if (this.profiles.some((p) => p.id === userId)) {
      this.currentUserId = userId;
      setStored(STORAGE_KEYS.CURRENT_USER_ID, userId);
      this.notify();
    }
  }

  // --- Profiles ---
  public getProfiles(): PlayerProfile[] {
    this.recalculateRanks();
    return [...this.profiles];
  }

  public getProfile(id: string): PlayerProfile | undefined {
    return this.profiles.find((p) => p.id === id);
  }

  public updateProfile(id: string, updates: Partial<PlayerProfile>): PlayerProfile {
    const index = this.profiles.findIndex((p) => p.id === id);
    if (index === -1) throw new Error(`Profile ${id} not found`);
    this.profiles[index] = { ...this.profiles[index], ...updates };
    this.save();
    return this.profiles[index];
  }

  public overrideElo(id: string, newElo: number, note?: string): PlayerProfile {
    const profile = this.getProfile(id);
    if (!profile) throw new Error(`Profile ${id} not found`);
    profile.current_elo = Math.round(newElo);
    this.recalculateRanks();
    this.save();
    return profile;
  }

  public updateUserRole(id: string, role: UserRole): PlayerProfile {
    const profile = this.getProfile(id);
    if (!profile) throw new Error(`Profile ${id} not found`);
    profile.role = role;
    this.save();
    return profile;
  }

  // --- Matches ---
  public getMatches(): MatchRecord[] {
    return [...this.matches].sort(
      (a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
    );
  }

  public getPlayerMatches(playerId: string): MatchRecord[] {
    return this.getMatches().filter(
      (m) => m.player1_id === playerId || m.player2_id === playerId
    );
  }

  public logMatch(input: {
    player1Id: string;
    player2Id: string;
    loggedById: string;
    setScores: string;
    tournamentId?: string;
  }): MatchRecord {
    const p1 = this.getProfile(input.player1Id);
    const p2 = this.getProfile(input.player2Id);
    const loggedBy = this.getProfile(input.loggedById);

    if (!p1 || !p2) throw new Error('Both players must exist');
    if (p1.id === p2.id) throw new Error('Players cannot play against themselves');

    const parsed = parseSetScores(input.setScores);
    if (!parsed.isValid) {
      throw new Error(parsed.errorMessage || 'Invalid set scores');
    }

    const p1Won = parsed.player1Games > parsed.player2Games;
    const isTournament = Boolean(input.tournamentId);

    const eloResult = calculateMatchElo({
      player1Elo: p1.current_elo,
      player2Elo: p2.current_elo,
      player1Won: p1Won,
      isTournament,
      player1MatchesPlayed: p1.matches_played,
      player2MatchesPlayed: p2.matches_played,
    });

    // Update Player 1 Stats
    p1.current_elo = eloResult.player1EloAfter;
    p1.matches_played += 1;
    if (p1Won) p1.wins += 1;
    else p1.losses += 1;

    // Update Player 2 Stats
    p2.current_elo = eloResult.player2EloAfter;
    p2.matches_played += 1;
    if (!p1Won) p2.wins += 1;
    else p2.losses += 1;

    this.recalculateRanks();

    const matchRecord: MatchRecord = {
      id: `m-${Date.now()}`,
      tournament_id: input.tournamentId || null,
      player1_id: p1.id,
      player1_name: p1.full_name,
      player2_id: p2.id,
      player2_name: p2.full_name,
      logged_by: loggedBy?.id || input.loggedById,
      logged_by_name: loggedBy?.full_name || 'Club Official',
      player1_score: parsed.player1Games,
      player2_score: parsed.player2Games,
      set_scores: input.setScores,
      player1_elo_before: eloResult.player1EloBefore,
      player2_elo_before: eloResult.player2EloBefore,
      player1_elo_after: eloResult.player1EloAfter,
      player2_elo_after: eloResult.player2EloAfter,
      elo_delta: eloResult.winnerGained,
      match_date: new Date().toISOString(),
    };

    this.matches.unshift(matchRecord);
    this.save();
    return matchRecord;
  }

  // --- Tournaments ---
  public getTournaments(): Tournament[] {
    return [...this.tournaments];
  }

  public getTournament(slugOrId: string): Tournament | undefined {
    return this.tournaments.find((t) => t.slug === slugOrId || t.id === slugOrId);
  }

  public createTournament(input: {
    title: string;
    description: string;
    custom_rules: string;
    format: Tournament['format'];
    max_participants: number;
    start_date: string;
    end_date?: string;
    created_by: string;
    participant_ids?: string[];
  }): Tournament {
    const slug = input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const id = `tourn-${Date.now()}`;
    const selectedPlayers = (input.participant_ids || [])
      .map((pid) => this.getProfile(pid))
      .filter((p): p is PlayerProfile => Boolean(p));

    const bracket_data =
      selectedPlayers.length >= 2
        ? generateSingleEliminationBracket(selectedPlayers, id)
        : undefined;

    const newTournament: Tournament = {
      id,
      title: input.title,
      slug,
      description: input.description,
      custom_rules: input.custom_rules,
      format: input.format,
      max_participants: input.max_participants,
      status: 'upcoming',
      start_date: input.start_date,
      end_date: input.end_date,
      created_by: input.created_by,
      participants: input.participant_ids || [],
      bracket_data,
      created_at: new Date().toISOString(),
    };

    this.tournaments.push(newTournament);
    this.save();
    return newTournament;
  }

  public updateTournamentBracketMatch(
    tournamentId: string,
    roundIndex: number,
    matchIndex: number,
    winnerId: string,
    scores: { p1Score: number; p2Score: number; setScores: string }
  ): Tournament {
    const tournament = this.tournaments.find((t) => t.id === tournamentId);
    if (!tournament || !tournament.bracket_data) {
      throw new Error('Tournament or bracket not found');
    }

    tournament.bracket_data = advanceBracketWinner(
      tournament.bracket_data,
      roundIndex,
      matchIndex,
      winnerId,
      scores
    );

    // Also log this as an official ranked match if both players exist
    const match = tournament.bracket_data.rounds[roundIndex]?.matches[matchIndex];
    if (match && match.player1 && match.player2) {
      this.logMatch({
        player1Id: match.player1.id,
        player2Id: match.player2.id,
        loggedById: this.currentUserId,
        setScores: scores.setScores,
        tournamentId: tournament.id,
      });
    }

    this.save();
    return tournament;
  }

  // --- Table Reservations ---
  public getReservations(date?: string): TableReservation[] {
    if (!date) return [...this.reservations];
    return this.reservations.filter(
      (r) => r.slot_date === date && r.status === 'confirmed'
    );
  }

  public createReservation(input: {
    table_number: number;
    reserved_by: string;
    slot_date: string;
    start_time: string;
    end_time: string;
    purpose: TableReservation['purpose'];
    notes?: string;
  }): TableReservation {
    // Conflict check
    const existing = this.reservations.find(
      (r) =>
        r.status === 'confirmed' &&
        r.table_number === input.table_number &&
        r.slot_date === input.slot_date &&
        ((input.start_time >= r.start_time && input.start_time < r.end_time) ||
          (input.end_time > r.start_time && input.end_time <= r.end_time) ||
          (input.start_time <= r.start_time && input.end_time >= r.end_time))
    );

    if (existing) {
      throw new Error(
        `Table ${input.table_number} is already booked from ${existing.start_time} to ${existing.end_time} by ${existing.reserved_by_name || 'another member'}`
      );
    }

    const user = this.getProfile(input.reserved_by);

    const newRes: TableReservation = {
      id: `res-${Date.now()}`,
      table_number: input.table_number,
      reserved_by: input.reserved_by,
      reserved_by_name: user?.full_name || 'Member',
      reserved_by_role: user?.role || 'player',
      slot_date: input.slot_date,
      start_time: input.start_time,
      end_time: input.end_time,
      purpose: input.purpose,
      status: 'confirmed',
      notes: input.notes,
      created_at: new Date().toISOString(),
    };

    this.reservations.push(newRes);
    this.save();
    return newRes;
  }

  public cancelReservation(id: string): void {
    const res = this.reservations.find((r) => r.id === id);
    if (!res) throw new Error('Reservation not found');
    res.status = 'cancelled';
    this.save();
  }

  public resetToDefault(): void {
    this.profiles = [...INITIAL_PROFILES];
    this.matches = [...INITIAL_MATCHES];
    this.tournaments = [...INITIAL_TOURNAMENTS];
    this.reservations = [...INITIAL_RESERVATIONS];
    this.currentUserId = 'p-1';
    this.save();
  }
}

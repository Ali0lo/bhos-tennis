'use client';

import { PlayerProfile, MatchRecord, Tournament, TableReservation, UserRole } from './types';
import { INITIAL_PROFILES, INITIAL_MATCHES, INITIAL_TOURNAMENTS, INITIAL_RESERVATIONS } from './mockData';
import { calculateMatchElo, parseSetScores } from '../elo';
import { advanceBracketWinner, generateSingleEliminationBracket } from '../tournament';
import { getSupabaseClient } from '../supabase/client';

const STORAGE_KEYS = {
  PROFILES: 'bhos_tt_profiles_v5',
  MATCHES: 'bhos_tt_matches_v5',
  TOURNAMENTS: 'bhos_tt_tournaments_v5',
  RESERVATIONS: 'bhos_tt_reservations_v5',
  CURRENT_USER_ID: 'bhos_tt_active_user_id_v5',
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
  private currentUserId: string | null = null;
  private currentUser: PlayerProfile | null = null;
  private isCloudConnected: boolean = false;
  private realtimeChannel: any = null;

  private listeners: (() => void)[] = [];

  private constructor() {
    if (typeof window !== 'undefined') {
      // 1. Load local fallback / cached data first for instant first-paint
      this.profiles = getStored(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
      this.matches = getStored(STORAGE_KEYS.MATCHES, INITIAL_MATCHES);
      this.tournaments = getStored(STORAGE_KEYS.TOURNAMENTS, INITIAL_TOURNAMENTS);
      this.reservations = getStored(STORAGE_KEYS.RESERVATIONS, INITIAL_RESERVATIONS);
      this.currentUserId = getStored<string | null>(STORAGE_KEYS.CURRENT_USER_ID, null);
      if (this.currentUserId) {
        this.currentUser = this.profiles.find((p) => p.id === this.currentUserId) || null;
      }
      this.recalculateRanks();

      // 2. Initialize Supabase cloud sync & realtime subscription
      this.initializeCloudSync();
    }
  }

  public static getInstance(): BHOSDataStore {
    if (!BHOSDataStore.instance) {
      BHOSDataStore.instance = new BHOSDataStore();
    }
    return BHOSDataStore.instance;
  }

  /**
   * Initializes Supabase cloud data fetching and real-time subscription.
   */
  private async initializeCloudSync() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.info('[BHOS Store] Running in client-side LocalStorage mode (Supabase env vars not set).');
      return;
    }

    try {
      this.isCloudConnected = true;

      // 1. Listen to Supabase Auth state changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user?.email) {
          await this.linkProfileByEmail(session.user.email);
        } else {
          this.currentUser = null;
          this.currentUserId = null;
          setStored(STORAGE_KEYS.CURRENT_USER_ID, null);
          this.notify();
        }
      });

      // 2. Check initial session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        await this.linkProfileByEmail(session.user.email);
      } else {
        this.currentUser = null;
        this.currentUserId = null;
        setStored(STORAGE_KEYS.CURRENT_USER_ID, null);
        this.notify();
      }

      // 3. Initial cloud pull
      await Promise.allSettled([
        this.fetchProfilesFromCloud(),
        this.fetchMatchesFromCloud(),
        this.fetchTournamentsFromCloud(),
        this.fetchReservationsFromCloud(),
      ]);

      // Setup Realtime Subscription
      this.setupRealtimeSubscription(supabase);
    } catch (err) {
      console.warn('[BHOS Store] Cloud sync initialization error:', err);
    }
  }

  /**
   * Fetches latest profiles from Supabase.
   */
  public async fetchProfilesFromCloud(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('current_elo', { ascending: false });

      if (error) {
        console.warn('[BHOS Store] Could not fetch profiles from Supabase:', error.message);
        return;
      }

      if (data && data.length > 0) {
        this.profiles = data as PlayerProfile[];
        this.recalculateRanks();
        setStored(STORAGE_KEYS.PROFILES, this.profiles);
        this.notify();
      }
    } catch (err) {
      console.warn('[BHOS Store] Error fetching profiles:', err);
    }
  }

  /**
   * Fetches latest matches from Supabase.
   */
  public async fetchMatchesFromCloud(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: false });

      if (error) {
        console.warn('[BHOS Store] Could not fetch matches from Supabase:', error.message);
        return;
      }

      if (data) {
        this.matches = data as MatchRecord[];
        setStored(STORAGE_KEYS.MATCHES, this.matches);
        this.notify();
      }
    } catch (err) {
      console.warn('[BHOS Store] Error fetching matches:', err);
    }
  }

  /**
   * Fetches tournaments from Supabase.
   */
  public async fetchTournamentsFromCloud(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        this.tournaments = data as Tournament[];
        setStored(STORAGE_KEYS.TOURNAMENTS, this.tournaments);
        this.notify();
      }
    } catch (err) {
      console.warn('[BHOS Store] Error fetching tournaments:', err);
    }
  }

  /**
   * Fetches table reservations from Supabase.
   */
  public async fetchReservationsFromCloud(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('table_reservations')
        .select('*')
        .order('slot_date', { ascending: true });

      if (!error && data && data.length > 0) {
        this.reservations = data as TableReservation[];
        setStored(STORAGE_KEYS.RESERVATIONS, this.reservations);
        this.notify();
      }
    } catch (err) {
      console.warn('[BHOS Store] Error fetching reservations:', err);
    }
  }

  /**
   * Connects to Supabase Realtime channel for live updates across all clients.
   */
  private setupRealtimeSubscription(supabase: any) {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
    }

    this.realtimeChannel = supabase
      .channel('bhos-cloud-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload: any) => {
          this.handleRealtimeProfile(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        (payload: any) => {
          this.handleRealtimeMatch(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournaments' },
        (payload: any) => {
          this.handleRealtimeTournament(payload);
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.info('[BHOS Store] Live Realtime channel subscribed.');
        }
      });
  }

  private handleRealtimeProfile(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'INSERT') {
      const exists = this.profiles.some((p) => p.id === newRecord.id);
      if (!exists) {
        this.profiles.push(newRecord);
      }
    } else if (eventType === 'UPDATE') {
      const idx = this.profiles.findIndex((p) => p.id === newRecord.id);
      if (idx !== -1) {
        this.profiles[idx] = { ...this.profiles[idx], ...newRecord };
      } else {
        this.profiles.push(newRecord);
      }
    } else if (eventType === 'DELETE') {
      this.profiles = this.profiles.filter((p) => p.id !== oldRecord.id);
    }

    this.recalculateRanks();
    setStored(STORAGE_KEYS.PROFILES, this.profiles);
    this.notify();
  }

  private handleRealtimeMatch(payload: any) {
    const { eventType, new: newRecord } = payload;

    if (eventType === 'INSERT') {
      const exists = this.matches.some((m) => m.id === newRecord.id);
      if (!exists) {
        this.matches.unshift(newRecord);
        setStored(STORAGE_KEYS.MATCHES, this.matches);
        // Refresh profiles to ensure ELO changes are synced
        this.fetchProfilesFromCloud();
        this.notify();
      }
    }
  }

  private handleRealtimeTournament(payload: any) {
    const { eventType, new: newRecord } = payload;
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      const idx = this.tournaments.findIndex((t) => t.id === newRecord.id);
      if (idx !== -1) {
        this.tournaments[idx] = { ...this.tournaments[idx], ...newRecord };
      } else {
        this.tournaments.unshift(newRecord);
      }
      setStored(STORAGE_KEYS.TOURNAMENTS, this.tournaments);
      this.notify();
    }
  }

  private saveLocal() {
    setStored(STORAGE_KEYS.PROFILES, this.profiles);
    setStored(STORAGE_KEYS.MATCHES, this.matches);
    setStored(STORAGE_KEYS.TOURNAMENTS, this.tournaments);
    setStored(STORAGE_KEYS.RESERVATIONS, this.reservations);
    setStored(STORAGE_KEYS.CURRENT_USER_ID, this.currentUserId);
    this.notify();
  }

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
    // Only verified players participate in rankings
    const verified = this.profiles.filter((p) => p.is_verified !== false);
    verified.sort((a, b) => b.current_elo - a.current_elo);
    verified.forEach((p, idx) => {
      p.rank = idx + 1;
    });

    // Unverified players do not get an official rank
    this.profiles
      .filter((p) => p.is_verified === false)
      .forEach((p) => {
        p.rank = undefined;
      });
  }

  // --- Auth / Active User ---
  public getCurrentUser(): PlayerProfile | null {
    if (this.currentUser) return this.currentUser;
    if (this.currentUserId) {
      const user = this.profiles.find((p) => p.id === this.currentUserId);
      if (user) {
        this.currentUser = user;
        return user;
      }
    }
    return null;
  }

  public isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  public async linkProfileByEmail(email: string): Promise<PlayerProfile | null> {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Look in existing local profiles first
    let profile = this.profiles.find(
      (p) => p.email && p.email.trim().toLowerCase() === normalizedEmail
    );

    // 2. Fetch fresh record from Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', normalizedEmail)
          .maybeSingle();

        if (!error && data) {
          profile = data as PlayerProfile;
          const idx = this.profiles.findIndex((p) => p.id === profile!.id);
          if (idx !== -1) {
            this.profiles[idx] = profile;
          } else {
            this.profiles.push(profile);
          }
        }
      } catch (err) {
        console.warn('[BHOS Store] Could not fetch profile by email:', err);
      }
    }

    if (profile) {
      this.currentUser = profile;
      this.currentUserId = profile.id;
      setStored(STORAGE_KEYS.CURRENT_USER_ID, profile.id);
      this.recalculateRanks();
      this.notify();
      return profile;
    }

    return null;
  }

  public async signOut(): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[BHOS Store] Error signing out from Supabase:', err);
      }
    }
    this.currentUser = null;
    this.currentUserId = null;
    setStored(STORAGE_KEYS.CURRENT_USER_ID, null);
    this.notify();
  }

  public setCurrentUser(userId: string): void {
    const found = this.profiles.find((p) => p.id === userId);
    if (found) {
      this.currentUser = found;
      this.currentUserId = userId;
      setStored(STORAGE_KEYS.CURRENT_USER_ID, userId);
      this.notify();
    }
  }

  // --- Profiles ---
  public getProfiles(verifiedOnly: boolean = false): PlayerProfile[] {
    this.recalculateRanks();
    if (verifiedOnly) {
      return this.profiles.filter((p) => p.is_verified !== false);
    }
    return [...this.profiles];
  }

  public getVerifiedProfiles(): PlayerProfile[] {
    return this.getProfiles(true);
  }

  public getUnverifiedProfiles(): PlayerProfile[] {
    return this.profiles.filter((p) => p.is_verified === false);
  }

  public async verifyPlayer(id: string, initialElo: number = 0): Promise<PlayerProfile> {
    const profile = this.getProfile(id);
    if (!profile) throw new Error(`Profile ${id} not found`);

    profile.is_verified = true;
    profile.current_elo = Math.round(initialElo);
    this.recalculateRanks();
    this.saveLocal();

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_verified: true,
          current_elo: profile.current_elo,
        })
        .eq('id', id);

      if (error) {
        console.warn('[BHOS Store] Supabase verifyPlayer failed:', error.message);
        throw error;
      }
    }

    return profile;
  }

  public getProfile(id: string): PlayerProfile | undefined {
    return this.profiles.find((p) => p.id === id);
  }

  public addProfile(profile: PlayerProfile): void {
    const exists = this.profiles.some((p) => p.id === profile.id);
    if (!exists) {
      this.profiles.push(profile);
      this.recalculateRanks();
      this.saveLocal();
    }
  }

  public updateProfile(id: string, updates: Partial<PlayerProfile>): PlayerProfile {
    const index = this.profiles.findIndex((p) => p.id === id);
    if (index === -1) throw new Error(`Profile ${id} not found`);

    this.profiles[index] = { ...this.profiles[index], ...updates };
    this.saveLocal();

    // Async Supabase Sync
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.warn('[BHOS Store] Supabase updateProfile failed:', error.message);
        });
    }

    return this.profiles[index];
  }

  public overrideElo(id: string, newElo: number, note?: string): PlayerProfile {
    const profile = this.getProfile(id);
    if (!profile) throw new Error(`Profile ${id} not found`);

    profile.current_elo = Math.round(newElo);
    this.recalculateRanks();
    this.saveLocal();

    // Async Supabase Sync
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('profiles')
        .update({ current_elo: profile.current_elo })
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.warn('[BHOS Store] Supabase overrideElo failed:', error.message);
        });
    }

    return profile;
  }

  public updateUserRole(id: string, role: UserRole): PlayerProfile {
    const profile = this.getProfile(id);
    if (!profile) throw new Error(`Profile ${id} not found`);

    profile.role = role;
    this.saveLocal();

    // Async Supabase Sync
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('profiles')
        .update({ role })
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.warn('[BHOS Store] Supabase updateUserRole failed:', error.message);
        });
    }

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
    this.saveLocal();

    // Async Supabase Sync: Insert match and update both player profiles
    const supabase = getSupabaseClient();
    if (supabase) {
      Promise.all([
        supabase.from('matches').insert([matchRecord]),
        supabase
          .from('profiles')
          .update({
            current_elo: p1.current_elo,
            matches_played: p1.matches_played,
            wins: p1.wins,
            losses: p1.losses,
          })
          .eq('id', p1.id),
        supabase
          .from('profiles')
          .update({
            current_elo: p2.current_elo,
            matches_played: p2.matches_played,
            wins: p2.wins,
            losses: p2.losses,
          })
          .eq('id', p2.id),
      ]).then((results) => {
        results.forEach((res, i) => {
          if (res.error) {
            console.warn(`[BHOS Store] Supabase match sync step ${i} warning:`, res.error.message);
          }
        });
      });
    }

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
    this.saveLocal();

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('tournaments')
        .insert([newTournament])
        .then(({ error }) => {
          if (error) console.warn('[BHOS Store] Supabase createTournament failed:', error.message);
        });
    }

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
        loggedById: this.currentUserId || 'system',
        setScores: scores.setScores,
        tournamentId: tournament.id,
      });
    }

    this.saveLocal();

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('tournaments')
        .update({ bracket_data: tournament.bracket_data })
        .eq('id', tournamentId)
        .then(({ error }) => {
          if (error) console.warn('[BHOS Store] Supabase updateTournamentBracketMatch failed:', error.message);
        });
    }

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
    this.saveLocal();

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('table_reservations')
        .insert([newRes])
        .then(({ error }) => {
          if (error) console.warn('[BHOS Store] Supabase createReservation failed:', error.message);
        });
    }

    return newRes;
  }

  public cancelReservation(id: string): void {
    const res = this.reservations.find((r) => r.id === id);
    if (!res) throw new Error('Reservation not found');
    res.status = 'cancelled';
    this.saveLocal();

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('table_reservations')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.warn('[BHOS Store] Supabase cancelReservation failed:', error.message);
        });
    }
  }

  public resetToDefault(): void {
    this.profiles = [...INITIAL_PROFILES];
    this.matches = [...INITIAL_MATCHES];
    this.tournaments = [...INITIAL_TOURNAMENTS];
    this.reservations = [...INITIAL_RESERVATIONS];
    this.currentUserId = 'p-1';
    this.saveLocal();
  }
}

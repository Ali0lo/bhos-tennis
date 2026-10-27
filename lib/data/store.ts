'use client';

import { PlayerProfile, MatchRecord, Tournament, TableReservation, UserRole, isProfilePending } from './types';
import { INITIAL_PROFILES, INITIAL_MATCHES, INITIAL_TOURNAMENTS, INITIAL_RESERVATIONS } from './mockData';
import { calculateMatchElo, parseSetScores } from '../elo';
import { advanceBracketWinner, findBracketNodeForMatch, generateSingleEliminationBracket } from '../tournament';
import { getSupabaseClient } from '../supabase/client';

const STORAGE_KEYS = {
  PROFILES: 'bhos_tt_profiles_v8',
  MATCHES: 'bhos_tt_matches_v8',
  TOURNAMENTS: 'bhos_tt_tournaments_v8',
  RESERVATIONS: 'bhos_tt_reservations_v8',
  CURRENT_USER_ID: 'bhos_tt_active_user_id_v8',
};

const SESSION_LEADERBOARD_KEY = 'bhos_tt_leaderboard_cache_v1';
const SESSION_RECENT_MATCHES_KEY = 'bhos_tt_recent_matches';
const LEADERBOARD_TTL_MS = 60_000;

export function isApprovedMatch(
  match?: Partial<MatchRecord> | null,
  resolvedMap?: Record<string, 'confirmed' | 'rejected'>,
  deletedIds?: string[]
): boolean {
  if (!match || !match.id) return false;
  if (match.id.startsWith('m-seed-')) return false;
  if (deletedIds && deletedIds.includes(match.id)) return false;
  const effectiveStatus = (resolvedMap && resolvedMap[match.id]) || match.status || 'confirmed';
  if (
    effectiveStatus === 'rejected' ||
    effectiveStatus === 'pending' ||
    effectiveStatus === 'waiting' ||
    effectiveStatus === 'scheduled'
  ) {
    return false;
  }
  return effectiveStatus === 'confirmed' || effectiveStatus === 'approved';
}

interface LeaderboardCacheEntry {
  data: PlayerProfile[];
  timestamp: number;
  isFull: boolean;
}

function getSessionLeaderboardCache(): LeaderboardCacheEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_LEADERBOARD_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setSessionLeaderboardCache(entry: LeaderboardCacheEntry): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_LEADERBOARD_KEY, JSON.stringify(entry));
  } catch {}
}

function normalizeAvatarUrl(url?: string): string | undefined {
  if (!url) return url;
  if (url.includes('unsplash.com')) {
    if (url.includes('1609710228159')) return '/images/avatars/topspin-pro.jpg';
    if (url.includes('1517649763962')) return '/images/avatars/carbon-blade.jpg';
    if (url.includes('1579952363873')) return '/images/avatars/varsity-champion.jpg';
    if (url.includes('1546519638')) return '/images/avatars/smash-master.jpg';
    if (url.includes('1534158914592')) return '/images/avatars/match-point.jpg';
    return '/images/avatars/bhos-varsity.jpg';
  }
  return url;
}

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
  private leaderboardCache: LeaderboardCacheEntry | null = null;
  private inFlightLeaderboardPromise: Promise<PlayerProfile[]> | null = null;

  private listeners: (() => void)[] = [];

  private constructor() {
    if (typeof window !== 'undefined') {
      const oldKeys = [
        'bhos_tt_profiles_v7',
        'bhos_tt_matches_v7',
        'bhos_tt_profiles_v6',
        'bhos_tt_matches_v6',
        'bhos_tt_profiles_v5',
        'bhos_tt_matches_v5',
        'bhos_matches',
        'bhos_profiles',
      ];
      oldKeys.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {}
      });

      this.leaderboardCache = getSessionLeaderboardCache();
      this.profiles = getStored(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
      const storedMatches = getStored<MatchRecord[]>(STORAGE_KEYS.MATCHES, INITIAL_MATCHES);
      const deletedMatches = getStored<string[]>('bhos_deleted_matches', []);
      const resolvedMatches = getStored<Record<string, 'confirmed' | 'rejected'>>('bhos_resolved_matches', {});
      const matchMap = new Map<string, MatchRecord>();

      storedMatches.forEach((m) => {
        if (isApprovedMatch(m, resolvedMatches, deletedMatches)) {
          const effectiveStatus =
            resolvedMatches[m.id] || (m.status === 'approved' ? 'approved' : 'confirmed');
          matchMap.set(m.id, { ...m, status: effectiveStatus });
        }
      });

      this.matches = Array.from(matchMap.values()).sort(
        (a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
      );
      setStored(STORAGE_KEYS.MATCHES, this.matches);
      this.tournaments = getStored(STORAGE_KEYS.TOURNAMENTS, INITIAL_TOURNAMENTS);
      this.reservations = getStored(STORAGE_KEYS.RESERVATIONS, INITIAL_RESERVATIONS);
      this.currentUserId = getStored<string | null>(STORAGE_KEYS.CURRENT_USER_ID, null);
      if (this.currentUserId) {
        this.currentUser = this.profiles.find((p) => p.id === this.currentUserId) || null;
      }
      this.recalculateRanks();

      this.initializeCloudSync();
    }
  }

  public static getInstance(): BHOSDataStore {
    if (!BHOSDataStore.instance) {
      BHOSDataStore.instance = new BHOSDataStore();
    }
    return BHOSDataStore.instance;
  }

  private async initializeCloudSync() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    try {
      this.isCloudConnected = true;

      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user?.email) {
          await this.linkProfileByEmail(session.user.email);
        } else {
          this.currentUser = null;
          this.currentUserId = null;
          setStored(STORAGE_KEYS.CURRENT_USER_ID, null);
          this.notify();
        }
      });

      const sessionPromise = supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user?.email) {
          await this.linkProfileByEmail(session.user.email);
        } else {
          this.currentUser = null;
          this.currentUserId = null;
          setStored(STORAGE_KEYS.CURRENT_USER_ID, null);
          this.notify();
        }
      });

      await Promise.allSettled([
        this.fetchLeaderboardStandings(),
        this.fetchProfilesFromCloud(),
        this.fetchMatchesFromCloud(),
        this.fetchTournamentsFromCloud(),
        sessionPromise,
      ]);

      this.setupRealtimeSubscription(supabase);
    } catch (err) {
      console.warn('[BHOS Store] Cloud sync initialization error:', err);
    }
  }

  public getCachedLeaderboard(limit?: number): PlayerProfile[] {
    const cached = this.leaderboardCache || getSessionLeaderboardCache();
    if (cached && cached.data.length > 0) {
      this.leaderboardCache = cached;
      return limit ? cached.data.slice(0, limit) : cached.data;
    }
    const verified = this.getVerifiedProfiles();
    return limit ? verified.slice(0, limit) : verified;
  }

  public async fetchLeaderboardStandings(options?: {
    limit?: number;
    force?: boolean;
  }): Promise<PlayerProfile[]> {
    const limit = options?.limit;
    const force = Boolean(options?.force);
    const now = Date.now();

    const cached = this.leaderboardCache || getSessionLeaderboardCache();
    if (cached && cached.data.length > 0) {
      this.leaderboardCache = cached;
      const isFresh = now - cached.timestamp < LEADERBOARD_TTL_MS;
      const satisfiesScope = cached.isFull || (Boolean(limit) && cached.data.length >= limit!);

      if (!force && isFresh && satisfiesScope) {
        return limit ? cached.data.slice(0, limit) : cached.data;
      }

      if (!force && satisfiesScope) {
        void this.revalidateLeaderboardFromCloud(limit);
        return limit ? cached.data.slice(0, limit) : cached.data;
      }
    }

    return this.revalidateLeaderboardFromCloud(limit);
  }

  private async revalidateLeaderboardFromCloud(limit?: number): Promise<PlayerProfile[]> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return this.getCachedLeaderboard(limit);
    }

    if (this.inFlightLeaderboardPromise && !limit) {
      return this.inFlightLeaderboardPromise;
    }

    const task = (async (): Promise<PlayerProfile[]> => {
      try {
        let viewQuery = supabase
          .from('leaderboard_standings')
          .select('id, full_name, faculty, current_elo, avatar_url, origin, total_matches, wins, win_rate')
          .order('current_elo', { ascending: false });

        if (limit) {
          viewQuery = viewQuery.limit(limit);
        }

        const { data, error } = await viewQuery;

        if (!error && data && data.length > 0) {
          const existingById = new Map(this.profiles.map((p) => [p.id, p]));
          const mapped: PlayerProfile[] = data.map((row: any, idx: number) => {
            const prev = existingById.get(row.id);
            const totalMatches = Number(row.total_matches ?? prev?.matches_played ?? 0);
            const wins = Number(row.wins ?? prev?.wins ?? 0);
            const losses = Math.max(0, totalMatches - wins);

            return {
              id: row.id,
              full_name: row.full_name,
              email: prev?.email || '',
              major_faculty: row.faculty || prev?.major_faculty || 'Computer Engineering',
              admission_year: prev?.admission_year ?? 2024,
              user_type: prev?.user_type || (row.full_name?.includes('İftixar') ? 'staff' : 'student'),
              gender: prev?.gender || 'male',
              role:
                prev?.role ||
                (row.full_name?.includes('İftixar')
                  ? 'coach'
                  : row.full_name?.includes('İsgəndərli')
                  ? 'president'
                  : 'player'),
              playing_level: prev?.playing_level || 'Advanced',
              playing_style: prev?.playing_style || 'Shakehand Attack',
              blade_equipment: prev?.blade_equipment || 'Butterfly Viscaria',
              forehand_rubber: prev?.forehand_rubber || 'Tenergy 05',
              backhand_rubber: prev?.backhand_rubber || 'Dignics 09C',
              current_elo: Number(row.current_elo ?? 0),
              matches_played: totalMatches,
              wins,
              losses,
              status: 'approved',
              origin: row.origin || prev?.origin || 'Qeydiyyat',
              is_verified: true,
              is_active: true,
              avatar_url: normalizeAvatarUrl(row.avatar_url || prev?.avatar_url),
              rank: idx + 1,
              created_at: prev?.created_at || new Date().toISOString(),
            };
          });

          if (!limit) {
            const unverified = this.profiles.filter((p) => isProfilePending(p));
            this.profiles = [...mapped, ...unverified];
            this.recalculateRanks();
            setStored(STORAGE_KEYS.PROFILES, this.profiles);
          }

          if (!limit || !this.leaderboardCache?.isFull) {
            const cacheEntry: LeaderboardCacheEntry = {
              data: mapped,
              timestamp: Date.now(),
              isFull: !limit,
            };
            this.leaderboardCache = cacheEntry;
            setSessionLeaderboardCache(cacheEntry);
          }
          this.notify();

          return limit ? mapped.slice(0, limit) : mapped;
        }

        let fallbackQuery = supabase
          .from('profiles')
          .select(
            'id, full_name, email, major_faculty, admission_year, user_type, gender, role, playing_level, current_elo, matches_played, wins, losses, status, origin, is_verified, is_active, avatar_url, created_at'
          )
          .order('current_elo', { ascending: false });

        if (limit) {
          fallbackQuery = fallbackQuery.limit(limit);
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        if (!fallbackError && fallbackData && fallbackData.length > 0) {
          const normalized = (fallbackData as PlayerProfile[]).map((p) => ({
            ...p,
            avatar_url: normalizeAvatarUrl(p.avatar_url),
          }));

          const verified = normalized
            .filter((p) => !isProfilePending(p))
            .map((p, idx) => ({ ...p, rank: idx + 1 }));

          if (!limit) {
            this.profiles = normalized;
            this.recalculateRanks();
            setStored(STORAGE_KEYS.PROFILES, this.profiles);
          }

          const cacheEntry: LeaderboardCacheEntry = {
            data: verified,
            timestamp: Date.now(),
            isFull: !limit,
          };
          this.leaderboardCache = cacheEntry;
          setSessionLeaderboardCache(cacheEntry);
          this.notify();

          return limit ? verified.slice(0, limit) : verified;
        }
      } catch (err) {
        console.warn('[BHOS Store] Leaderboard fetch error:', err);
      } finally {
        if (!limit) {
          this.inFlightLeaderboardPromise = null;
        }
      }

      return this.getCachedLeaderboard(limit);
    })();

    if (!limit) {
      this.inFlightLeaderboardPromise = task;
    }

    return task;
  }

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
        this.profiles = (data as PlayerProfile[]).map((p) => ({
          ...p,
          avatar_url: normalizeAvatarUrl(p.avatar_url),
        }));
        this.recalculateRanks();
        setStored(STORAGE_KEYS.PROFILES, this.profiles);

        const verified = this.getVerifiedProfiles();
        const cacheEntry: LeaderboardCacheEntry = {
          data: verified,
          timestamp: Date.now(),
          isFull: true,
        };
        this.leaderboardCache = cacheEntry;
        setSessionLeaderboardCache(cacheEntry);

        this.notify();
      }
    } catch (err) {
      console.warn('[BHOS Store] Error fetching profiles:', err);
    }
  }

  public async fetchMatchesFromCloud(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      void supabase.rpc('auto_resolve_stale_matches', { hours_threshold: 48 }).then(() => {}, () => {});

      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .in('status', ['confirmed', 'approved'])
        .order('match_date', { ascending: false });

      if (error) {
        console.warn('[BHOS Store] Could not fetch matches from Supabase:', error.message);
        return;
      }

      if (data) {
        const deleted = getStored<string[]>('bhos_deleted_matches', []);
        const resolved = this.getResolvedMatchIds();
        const matchMap = new Map<string, MatchRecord>();

        (data as MatchRecord[]).forEach((m) => {
          if (isApprovedMatch(m, resolved, deleted)) {
            const status: string =
              resolved[m.id] || (m.status === 'approved' ? 'approved' : 'confirmed');
            const autoApproved = Boolean(m.auto_approved);
            matchMap.set(m.id, { ...m, status, auto_approved: autoApproved });
          }
        });

        this.matches = Array.from(matchMap.values()).sort(
          (a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
        );
        setStored(STORAGE_KEYS.MATCHES, this.matches);
        this.notify();
      }
    } catch (err) {
      console.warn('[BHOS Store] Error fetching matches:', err);
    }
  }

  
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
    const { eventType, new: newRecord, old: oldRecord } = payload;
    const deleted = getStored<string[]>('bhos_deleted_matches', []);
    const resolved = this.getResolvedMatchIds();

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      if (!isApprovedMatch(newRecord, resolved, deleted)) {
        const hadMatch = this.matches.some((m) => m.id === newRecord?.id);
        if (hadMatch) {
          this.matches = this.matches.filter((m) => m.id !== newRecord.id);
          setStored(STORAGE_KEYS.MATCHES, this.matches);
        }
        this.clearMatchAndPlayerCaches();
        this.notify();
        return;
      }

      const idx = this.matches.findIndex((m) => m.id === newRecord.id);
      if (idx !== -1) {
        this.matches[idx] = { ...this.matches[idx], ...newRecord };
      } else {
        this.matches.unshift(newRecord);
      }
      setStored(STORAGE_KEYS.MATCHES, this.matches);
      this.propagateVerifiedMatchToBracket(newRecord, false);
      this.clearMatchAndPlayerCaches();
      this.fetchProfilesFromCloud();
      this.fetchTournamentsFromCloud();
      this.notify();
    } else if (eventType === 'DELETE') {
      const idToDelete = oldRecord?.id || newRecord?.id;
      if (idToDelete) {
        this.matches = this.matches.filter((m) => m.id !== idToDelete);
        setStored(STORAGE_KEYS.MATCHES, this.matches);
        this.clearMatchAndPlayerCaches();
        this.fetchTournamentsFromCloud();
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
    this.profiles.sort((a, b) => b.current_elo - a.current_elo);
    this.profiles.forEach((p, idx) => {
      p.rank = idx + 1;
    });
  }

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

    let profile = this.profiles.find(
      (p) => p.email && p.email.trim().toLowerCase() === normalizedEmail
    );

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

  public getProfiles(): PlayerProfile[] {
    this.recalculateRanks();
    return [...this.profiles];
  }

  public getVerifiedProfiles(): PlayerProfile[] {
    this.recalculateRanks();
    return this.profiles.filter((p) => !isProfilePending(p));
  }

  public getUnverifiedProfiles(): PlayerProfile[] {
    return this.profiles.filter((p) => isProfilePending(p));
  }

  public async verifyPlayer(id: string, initialElo: number, fallbackProfile?: PlayerProfile): Promise<PlayerProfile> {
    if (fallbackProfile) {
      this.addProfile(fallbackProfile);
    }
    let profile = this.getProfile(id);
    if (!profile) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
        if (data) {
          this.addProfile(data as PlayerProfile);
        }
      }
    }

    const updated = this.updateProfile(id, {
      status: 'approved',
      is_verified: true,
      current_elo: Math.min(999, Math.max(0, initialElo)),
      updated_at: new Date().toISOString(),
    });
    this.recalculateRanks();
    this.notify();
    return updated;
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
    let index = this.profiles.findIndex((p) => p.id === id);
    if (index === -1) {
      const fallback: PlayerProfile = {
        id,
        full_name: 'Unknown',
        email: '',
        major_faculty: 'Computer Engineering',
        admission_year: 2024,
        user_type: 'student',
        gender: 'male',
        role: 'player',
        playing_level: 'Intermediate',
        playing_style: 'Shakehand All-round',
        blade_equipment: 'Standard Club Racket',
        forehand_rubber: 'Standard Red',
        backhand_rubber: 'Standard Black',
        current_elo: 0,
        matches_played: 0,
        wins: 0,
        losses: 0,
        is_verified: true,
        is_active: true,
        created_at: new Date().toISOString(),
        ...updates,
      };
      this.profiles.push(fallback);
      index = this.profiles.length - 1;
    }

    this.profiles[index] = { ...this.profiles[index], ...updates };
    if (this.currentUser && (this.currentUser.id === id || this.currentUser.email === this.profiles[index].email)) {
      this.currentUser = this.profiles[index];
    }
    if (updates.full_name) {
      const newName = updates.full_name;
      this.matches.forEach((m) => {
        if (m.player1_id === id) m.player1_name = newName;
        if (m.player2_id === id) m.player2_name = newName;
        if (m.logged_by === id) m.logged_by_name = newName;
      });
    }
    this.saveLocal();
    this.notify();

    const supabase = getSupabaseClient();
    if (supabase) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        supabase
          .from('profiles')
          .update(updates)
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.warn('[BHOS Store] Supabase updateProfile failed:', error.message);
          });
      } else if (this.profiles[index].email) {
        supabase
          .from('profiles')
          .update(updates)
          .eq('email', this.profiles[index].email)
          .then(({ error }) => {
            if (error) console.warn('[BHOS Store] Supabase updateProfile by email failed:', error.message);
          });
      }
      if (updates.full_name) {
        supabase.from('matches').update({ player1_name: updates.full_name }).eq('player1_id', id).then();
        supabase.from('matches').update({ player2_name: updates.full_name }).eq('player2_id', id).then();
        supabase.from('matches').update({ logged_by_name: updates.full_name }).eq('logged_by', id).then();
      }
    }

    return this.profiles[index];
  }

  public overrideElo(id: string, newElo: number, note?: string): PlayerProfile {
    const profile = this.getProfile(id);
    if (!profile) throw new Error(`Profile ${id} not found`);

    profile.current_elo = Math.min(999, Math.max(0, Math.round(newElo)));
    this.recalculateRanks();
    this.saveLocal();

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
    this.notify();

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

  public async deleteProfile(id: string): Promise<boolean> {
    const index = this.profiles.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.profiles.splice(index, 1);
      this.matches = this.matches.filter(
        (m) => m.player1_id !== id && m.player2_id !== id
      );
      this.reservations = this.reservations.filter((r) => r.reserved_by !== id);
      this.tournaments = this.tournaments.map((t) =>
        t.created_by === id ? { ...t, created_by: null } : t
      );

      this.recalculateRanks();
      this.saveLocal();
      this.notify();
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('tournament_registrations').delete().eq('player_id', id);
        await supabase.from('table_reservations').delete().eq('reserved_by', id);
        await supabase.from('tournaments').update({ created_by: null }).eq('created_by', id);
        await supabase.from('profiles').delete().eq('id', id);
      } catch (err) {
        console.warn('[BHOS Store] Supabase deleteProfile failed:', err);
      }
    }
    return true;
  }

  public getMatches(): MatchRecord[] {
    const deleted = getStored<string[]>('bhos_deleted_matches', []);
    const resolved = this.getResolvedMatchIds();
    return this.matches
      .filter((m) => isApprovedMatch(m, resolved, deleted))
      .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());
  }

  public getPlayerMatches(playerId: string): MatchRecord[] {
    const profile =
      this.getProfile(playerId) ||
      this.profiles.find((p) => p.full_name?.toLowerCase() === playerId.toLowerCase());
    const targetName = profile?.full_name?.trim().toLowerCase();
    const targetIds = Array.from(new Set([playerId, profile?.id].filter(Boolean))) as string[];
    return this.getMatches().filter(
      (m) =>
        targetIds.includes(m.player1_id) ||
        targetIds.includes(m.player2_id) ||
        (targetName && (
          m.player1_name?.trim().toLowerCase() === targetName ||
          m.player2_name?.trim().toLowerCase() === targetName
        ))
    );
  }

  public clearMatchAndPlayerCaches(): void {
    this.leaderboardCache = null;
    inMemoryPlayerCache.clear();
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(SESSION_LEADERBOARD_KEY);
        sessionStorage.removeItem(SESSION_RECENT_MATCHES_KEY);
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith('bhos_player_')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => sessionStorage.removeItem(k));
      } catch {}
    }
  }

  public confirmMatch(matchId: string, updates?: Partial<MatchRecord>): MatchRecord | undefined {
    let match = this.matches.find((m) => m.id === matchId);
    if (match) {
      match.status = 'confirmed';
      if (updates) {
        Object.assign(match, updates);
      }
    } else if (updates) {
      match = {
        id: matchId,
        tournament_id: null,
        player1_id: '',
        player1_name: '',
        player2_id: '',
        player2_name: '',
        logged_by: '',
        logged_by_name: '',
        player1_score: 0,
        player2_score: 0,
        set_scores: '',
        player1_elo_before: 0,
        player2_elo_before: 0,
        player1_elo_after: 0,
        player2_elo_after: 0,
        elo_delta: 0,
        status: 'confirmed',
        match_date: new Date().toISOString(),
        ...updates,
      };
      this.matches.unshift(match);
    }
    this.markMatchResolvedLocally(matchId, 'confirmed');
    if (match) {
      this.propagateVerifiedMatchToBracket(match, true);
    }
    setStored(STORAGE_KEYS.MATCHES, this.matches);
    this.clearMatchAndPlayerCaches();
    this.notify();
    return match;
  }

  public propagateVerifiedMatchToBracket(match: MatchRecord, syncToCloud: boolean = true): void {
    const winnerId =
      match.winner_id ||
      (match.player1_score >= match.player2_score ? match.player1_id : match.player2_id);

    if (!winnerId) return;

    let tournament = match.tournament_id
      ? this.tournaments.find((t) => t.id === match.tournament_id)
      : undefined;

    if (!tournament) {
      tournament = this.tournaments.find((t) => {
        if (!t.bracket_data || t.status === 'completed') return false;
        return findBracketNodeForMatch(t.bracket_data, match) !== null;
      });
    }

    if (!tournament || !tournament.bracket_data) return;

    const node = findBracketNodeForMatch(tournament.bracket_data, match);
    if (!node) return;

    const bracketMatch = tournament.bracket_data.rounds[node.roundIndex]?.matches[node.matchIndex];
    if (!bracketMatch || bracketMatch.status === 'completed') return;

    const isNormalOrder = bracketMatch.player1?.id === match.player1_id;
    const p1Score = isNormalOrder ? match.player1_score : match.player2_score;
    const p2Score = isNormalOrder ? match.player2_score : match.player1_score;

    const winnerProfile = this.getProfile(winnerId);

    tournament.bracket_data = advanceBracketWinner(
      tournament.bracket_data,
      node.roundIndex,
      node.matchIndex,
      winnerId,
      {
        p1Score,
        p2Score,
        setScores: match.set_scores || '',
      },
      winnerProfile
    );

    const isFinalRound = node.roundIndex === tournament.bracket_data.rounds.length - 1;
    if (isFinalRound) {
      tournament.winner_id = winnerId;
      tournament.status = 'completed';
    } else if (tournament.status === 'upcoming') {
      tournament.status = 'ongoing';
    }

    setStored(STORAGE_KEYS.TOURNAMENTS, this.tournaments);

    if (syncToCloud) {
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase
          .from('tournaments')
          .update({
            bracket_data: tournament.bracket_data,
            status: tournament.status,
            winner_id: tournament.winner_id || null,
          })
          .eq('id', tournament.id)
          .then(({ error }) => {
            if (error) {
              console.warn('[BHOS Store] Bracket progression sync warning:', error.message);
            }
          });

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          match.id
        );
        if (isUuid) {
          supabase.rpc('advance_tournament_bracket', { p_match_id: match.id }).then(() => {});
        }
      }
    }
  }

  public rejectMatch(matchId: string): void {
    this.matches = this.matches.filter((m) => m.id !== matchId);
    this.markMatchResolvedLocally(matchId, 'rejected');
    const deleted = getStored<string[]>('bhos_deleted_matches', []);
    if (!deleted.includes(matchId)) {
      deleted.push(matchId);
      setStored('bhos_deleted_matches', deleted);
    }
    setStored(STORAGE_KEYS.MATCHES, this.matches);
    this.clearMatchAndPlayerCaches();
    this.notify();
  }

  public async voidMatch(matchId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase bağlantısı mövcud deyil.');
    }

    const { error } = await supabase.rpc('admin_void_match', { target_match_id: matchId });
    if (error) {
      throw new Error(error.message || 'Matç ləğv edilə bilmədi.');
    }

    this.matches = this.matches.filter((m) => m.id !== matchId);
    setStored(STORAGE_KEYS.MATCHES, this.matches);
    this.clearMatchAndPlayerCaches();
    this.notify();

    await Promise.allSettled([
      this.fetchProfilesFromCloud(),
      this.fetchMatchesFromCloud(),
      this.fetchLeaderboardStandings({ force: true }),
    ]);
  }

  public markMatchResolvedLocally(matchId: string, status: 'confirmed' | 'rejected'): void {
    const resolved = this.getResolvedMatchIds();
    resolved[matchId] = status;
    setStored('bhos_resolved_matches', resolved);
  }

  public getResolvedMatchIds(): Record<string, 'confirmed' | 'rejected'> {
    return getStored<Record<string, 'confirmed' | 'rejected'>>('bhos_resolved_matches', {});
  }

  public async deleteMatch(matchId: string): Promise<boolean> {
    const idx = this.matches.findIndex((m) => m.id === matchId);
    if (idx !== -1) {
      this.matches.splice(idx, 1);
      setStored(STORAGE_KEYS.MATCHES, this.matches);
      this.notify();
    }

    const resolved = this.getResolvedMatchIds();
    if (resolved[matchId]) {
      delete resolved[matchId];
      setStored('bhos_resolved_matches', resolved);
    }

    const deleted = getStored<string[]>('bhos_deleted_matches', []);
    if (!deleted.includes(matchId)) {
      deleted.push(matchId);
      setStored('bhos_deleted_matches', deleted);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matchId);
        if (isUuid) {
          const { error } = await supabase.from('matches').delete().eq('id', matchId);
          if (error) {
            console.warn('[BHOS Store] Could not delete match from Supabase:', error.message);
          }
        }
      } catch (err) {
        console.warn('[BHOS Store] Error deleting match:', err);
      }
    }

    return true;
  }

  public async deleteMatches(matchIds: string[]): Promise<boolean> {
    if (!matchIds || matchIds.length === 0) return true;
    const idSet = new Set(matchIds);

    this.matches = this.matches.filter((m) => !idSet.has(m.id));
    setStored(STORAGE_KEYS.MATCHES, this.matches);

    const resolved = this.getResolvedMatchIds();
    matchIds.forEach((id) => {
      delete resolved[id];
    });
    setStored('bhos_resolved_matches', resolved);

    const deleted = getStored<string[]>('bhos_deleted_matches', []);
    matchIds.forEach((id) => {
      if (!deleted.includes(id)) {
        deleted.push(id);
      }
    });
    setStored('bhos_deleted_matches', deleted);

    this.notify();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const validUuids = matchIds.filter((id) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        );
        if (validUuids.length > 0) {
          const { error } = await supabase.from('matches').delete().in('id', validUuids);
          if (error) {
            console.warn('[BHOS Store] Could not delete matches batch from Supabase:', error.message);
          }
        }
      } catch (err) {
        console.warn('[BHOS Store] Error deleting matches batch:', err);
      }
    }

    return true;
  }

  public async updateMatch(
    matchId: string,
    updates: Partial<MatchRecord>
  ): Promise<MatchRecord | null> {
    const idx = this.matches.findIndex((m) => m.id === matchId);
    if (idx === -1) return null;

    const current = this.matches[idx];
    const updated: MatchRecord = {
      ...current,
      ...updates,
      id: matchId,
    };

    this.matches[idx] = updated;
    if (updated.status === 'confirmed' || updated.status === 'rejected') {
      this.markMatchResolvedLocally(matchId, updated.status);
    }
    setStored(STORAGE_KEYS.MATCHES, this.matches);
    this.notify();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const payload: Record<string, any> = {};
        if (updates.player1_score !== undefined) payload.player1_score = updates.player1_score;
        if (updates.player2_score !== undefined) payload.player2_score = updates.player2_score;
        if (updates.set_scores !== undefined) payload.set_scores = updates.set_scores;
        if (updates.status !== undefined) payload.status = updates.status;
        if (updates.match_date !== undefined) payload.match_date = updates.match_date;
        if (updates.tournament_title !== undefined) payload.tournament_title = updates.tournament_title;
        if (updates.elo_delta !== undefined) payload.elo_delta = updates.elo_delta;

        const { error } = await supabase
          .from('matches')
          .update(payload)
          .eq('id', matchId);

        if (error) {
          console.warn('[BHOS Store] Could not update match in Supabase:', error.message);
        }
      } catch (err) {
        console.warn('[BHOS Store] Error updating match in Supabase:', err);
      }
    }

    return updated;
  }

  public logMatch(input: {
    player1Id: string;
    player2Id: string;
    loggedById: string;
    setScores: string;
    tournamentId?: string;
    roundNumber?: number;
    bracketNodeIndex?: number;
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
      player1SetsWon: parsed.player1Games,
      player2SetsWon: parsed.player2Games,
    });

    p1.current_elo = eloResult.player1EloAfter;
    p1.matches_played += 1;
    if (p1Won) p1.wins += 1;
    else p1.losses += 1;

    p2.current_elo = eloResult.player2EloAfter;
    p2.matches_played += 1;
    if (!p1Won) p2.wins += 1;
    else p2.losses += 1;

    this.recalculateRanks();

    const winnerId = p1Won ? p1.id : p2.id;

    const matchRecord: MatchRecord = {
      id: `m-${Date.now()}`,
      tournament_id: input.tournamentId || null,
      round_number: input.roundNumber ?? null,
      bracket_node_index: input.bracketNodeIndex ?? null,
      winner_id: winnerId,
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
      status: 'confirmed',
      match_date: new Date().toISOString(),
    };

    this.matches.unshift(matchRecord);
    if (input.tournamentId) {
      this.propagateVerifiedMatchToBracket(matchRecord, true);
    }
    this.saveLocal();

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

    const winnerProfile = this.getProfile(winnerId);

    tournament.bracket_data = advanceBracketWinner(
      tournament.bracket_data,
      roundIndex,
      matchIndex,
      winnerId,
      scores,
      winnerProfile
    );

    const isFinalRound = roundIndex === tournament.bracket_data.rounds.length - 1;
    if (isFinalRound) {
      tournament.winner_id = winnerId;
      tournament.status = 'completed';
    } else if (tournament.status === 'upcoming') {
      tournament.status = 'ongoing';
    }

    const match = tournament.bracket_data.rounds[roundIndex]?.matches[matchIndex];
    if (match && match.player1 && match.player2) {
      this.logMatch({
        player1Id: match.player1.id,
        player2Id: match.player2.id,
        loggedById: this.currentUserId || 'system',
        setScores: scores.setScores,
        tournamentId: tournament.id,
        roundNumber: roundIndex + 1,
        bracketNodeIndex: matchIndex,
      });
    }

    this.saveLocal();

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('tournaments')
        .update({
          bracket_data: tournament.bracket_data,
          status: tournament.status,
          winner_id: tournament.winner_id || null,
        })
        .eq('id', tournamentId)
        .then(({ error }) => {
          if (error) console.warn('[BHOS Store] Supabase updateTournamentBracketMatch failed:', error.message);
        });
    }

    return tournament;
  }

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
    if (isProfilePending(user)) {
      throw new Error(
        'Hesabınız təsdiq gözləyir. Yalnız rəhbərlik təsdiqindən sonra matç qeyd edə və masa rezerv edə bilərsiniz.'
      );
    }

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

export interface PlayerProfileSummaryResult {
  profile: PlayerProfile | null;
  recent_matches: MatchRecord[];
  achievements: Record<string, string>;
}

const PLAYER_PROFILE_TTL_MS = 45_000;
const inMemoryPlayerCache = new Map<
  string,
  { data: PlayerProfileSummaryResult; timestamp: number }
>();

function isUuidString(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

function mapRawProfileToPlayerProfile(
  raw: any,
  fallback?: PlayerProfile
): PlayerProfile {
  const totalMatches = Number(
    raw.matches_played ?? raw.total_matches ?? fallback?.matches_played ?? 0
  );
  const wins = Number(raw.wins ?? fallback?.wins ?? 0);
  const losses = Number(
    raw.losses ?? Math.max(0, totalMatches - wins)
  );

  return {
    id: raw.id || fallback?.id || '',
    full_name: raw.full_name || fallback?.full_name || 'Unknown',
    email: raw.email || fallback?.email || '',
    major_faculty:
      raw.major_faculty || raw.faculty || fallback?.major_faculty || 'Computer Engineering',
    admission_year: raw.admission_year ?? fallback?.admission_year ?? 2024,
    user_type:
      raw.user_type ||
      fallback?.user_type ||
      (raw.full_name?.includes('İftixar') ? 'staff' : 'student'),
    gender: raw.gender || fallback?.gender || 'male',
    role:
      raw.role ||
      fallback?.role ||
      (raw.full_name?.includes('İftixar')
        ? 'coach'
        : raw.full_name?.includes('İsgəndərli')
        ? 'president'
        : 'player'),
    playing_level: raw.playing_level || fallback?.playing_level || 'Intermediate',
    playing_style: raw.playing_style || fallback?.playing_style || 'Shakehand Attack',
    blade_equipment: raw.blade_equipment || fallback?.blade_equipment || 'Butterfly Viscaria',
    forehand_rubber: raw.forehand_rubber || fallback?.forehand_rubber || 'Tenergy 05',
    backhand_rubber: raw.backhand_rubber || fallback?.backhand_rubber || 'Dignics 09C',
    current_elo: Number(raw.current_elo ?? fallback?.current_elo ?? 0),
    matches_played: totalMatches,
    wins,
    losses,
    status: raw.status || fallback?.status || 'approved',
    origin: raw.origin || fallback?.origin || 'Qeydiyyat',
    is_verified: raw.is_verified ?? fallback?.is_verified ?? true,
    is_active: raw.is_active ?? fallback?.is_active ?? true,
    avatar_url: normalizeAvatarUrl(raw.avatar_url || fallback?.avatar_url),
    rank: raw.rank ?? fallback?.rank,
    created_at: raw.created_at || fallback?.created_at || new Date().toISOString(),
  };
}

export function getCachedPlayerProfile(
  playerId: string
): PlayerProfileSummaryResult | null {
  if (!playerId) return null;
  const cacheKey = `bhos_player_${playerId}`;
  const now = Date.now();
  const store = BHOSDataStore.getInstance();
  const resolved = store.getResolvedMatchIds();
  const deleted = getStored<string[]>('bhos_deleted_matches', []);

  const mem = inMemoryPlayerCache.get(cacheKey);
  if (mem && now - mem.timestamp < PLAYER_PROFILE_TTL_MS) {
    return {
      ...mem.data,
      recent_matches: (mem.data.recent_matches || []).filter((m) =>
        isApprovedMatch(m, resolved, deleted)
      ),
    };
  }

  if (typeof window !== 'undefined') {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed?.data && now - parsed.timestamp < PLAYER_PROFILE_TTL_MS) {
          const filteredData: PlayerProfileSummaryResult = {
            ...parsed.data,
            recent_matches: (parsed.data.recent_matches || []).filter((m: MatchRecord) =>
              isApprovedMatch(m, resolved, deleted)
            ),
          };
          inMemoryPlayerCache.set(cacheKey, {
            data: filteredData,
            timestamp: parsed.timestamp,
          });
          return filteredData;
        }
      } catch {}
    }
  }

  const localProfile = store.getProfile(playerId);
  if (localProfile && localProfile.is_verified !== false) {
    const localMatches = store.getPlayerMatches(localProfile.id);
    return {
      profile: localProfile,
      recent_matches: localMatches,
      achievements: {},
    };
  }

  return null;
}

export async function fetchPlayerProfile(
  playerId: string,
  options?: { force?: boolean }
): Promise<PlayerProfileSummaryResult> {
  const cacheKey = `bhos_player_${playerId}`;
  const force = Boolean(options?.force);
  const store = BHOSDataStore.getInstance();
  const resolved = store.getResolvedMatchIds();
  const deleted = getStored<string[]>('bhos_deleted_matches', []);

  if (!force && typeof window !== 'undefined') {
    const mem = inMemoryPlayerCache.get(cacheKey);
    if (mem && Date.now() - mem.timestamp < PLAYER_PROFILE_TTL_MS) {
      return {
        ...mem.data,
        recent_matches: (mem.data.recent_matches || []).filter((m) =>
          isApprovedMatch(m, resolved, deleted)
        ),
      };
    }

    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed?.data && Date.now() - parsed.timestamp < PLAYER_PROFILE_TTL_MS) {
          const filteredData: PlayerProfileSummaryResult = {
            ...parsed.data,
            recent_matches: (parsed.data.recent_matches || []).filter((m: MatchRecord) =>
              isApprovedMatch(m, resolved, deleted)
            ),
          };
          inMemoryPlayerCache.set(cacheKey, {
            data: filteredData,
            timestamp: parsed.timestamp,
          });
          return filteredData;
        }
      } catch {}
    }
  }

  const localProfile = store.getProfile(playerId);
  const supabase = getSupabaseClient();

  if (!supabase) {
    const fallbackResult: PlayerProfileSummaryResult = {
      profile: localProfile || null,
      recent_matches: localProfile ? store.getPlayerMatches(localProfile.id) : [],
      achievements: {},
    };
    return fallbackResult;
  }

  const validUuid = isUuidString(playerId);

  if (validUuid) {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_player_profile_summary',
      {
        target_player_id: playerId,
      }
    );

    if (!rpcError && rpcData && rpcData.profile) {
      const normalizedProfile = mapRawProfileToPlayerProfile(
        rpcData.profile,
        localProfile
      );
      const cloudMatches: MatchRecord[] = Array.isArray(rpcData.recent_matches)
        ? rpcData.recent_matches
        : [];
      const localMatches = store.getPlayerMatches(normalizedProfile.id);
      const matchMap = new Map<string, MatchRecord>();
      cloudMatches.forEach((m) => {
        if (isApprovedMatch(m, resolved, deleted)) {
          matchMap.set(m.id, m);
        }
      });
      localMatches.forEach((m) => {
        if (!matchMap.has(m.id) && isApprovedMatch(m, resolved, deleted)) {
          matchMap.set(m.id, m);
        }
      });

      const mergedMatches = Array.from(matchMap.values()).sort(
        (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
      );

      const summary: PlayerProfileSummaryResult = {
        profile: normalizedProfile,
        recent_matches: mergedMatches,
        achievements:
          rpcData.achievements && typeof rpcData.achievements === 'object'
            ? rpcData.achievements
            : {},
      };

      const entry = { data: summary, timestamp: Date.now() };
      inMemoryPlayerCache.set(cacheKey, entry);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(entry));
        } catch {}
      }

      return summary;
    }
  }

  const [standingsRes, profileRes, matchesRes, achRes] = await Promise.all([
    validUuid
      ? supabase.from('leaderboard_standings').select('*').eq('id', playerId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    validUuid
      ? supabase.from('profiles').select('*').eq('id', playerId).maybeSingle()
      : supabase
          .from('profiles')
          .select('*')
          .ilike('full_name', playerId.replace(/-/g, ' '))
          .maybeSingle(),
    validUuid
      ? supabase
          .from('matches')
          .select(
            'id, created_at, match_date, tournament_id, tournament_title, player1_id, player1_name, player2_id, player2_name, logged_by, logged_by_name, winner_id, player1_score, player2_score, set_scores, player1_elo_before, player2_elo_before, player1_elo_after, player2_elo_after, elo_delta, status, auto_approved'
          )
          .in('status', ['confirmed', 'approved'])
          .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
          .order('match_date', { ascending: false })
          .limit(25)
      : Promise.resolve({ data: [] as any[], error: null }),
    validUuid
      ? supabase
          .from('profile_achievements')
          .select('badge_id, unlocked_at')
          .eq('profile_id', playerId)
      : Promise.resolve({ data: [] as any[], error: null }),
  ]);

  const rawProfile = profileRes.data || standingsRes.data || localProfile;
  if (!rawProfile || rawProfile.is_verified === false) {
    return {
      profile: null,
      recent_matches: [],
      achievements: {},
    };
  }

  const resolvedProfile = mapRawProfileToPlayerProfile(
    { ...(standingsRes.data || {}), ...(profileRes.data || {}) },
    localProfile
  );

  const cloudMatches = (matchesRes.data || []) as MatchRecord[];
  const localMatches = store.getPlayerMatches(resolvedProfile.id || playerId);
  const matchMap = new Map<string, MatchRecord>();
  cloudMatches.forEach((m) => {
    if (isApprovedMatch(m, resolved, deleted)) {
      matchMap.set(m.id, m);
    }
  });
  localMatches.forEach((m) => {
    if (!matchMap.has(m.id) && isApprovedMatch(m, resolved, deleted)) {
      matchMap.set(m.id, m);
    }
  });

  const combinedMatches = Array.from(matchMap.values()).sort(
    (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  );

  const achMap: Record<string, string> = {};
  if (Array.isArray(achRes.data)) {
    achRes.data.forEach((row: any) => {
      if (row.badge_id) {
        achMap[row.badge_id] = row.unlocked_at || new Date().toISOString();
      }
    });
  }

  const fallbackData: PlayerProfileSummaryResult = {
    profile: resolvedProfile,
    recent_matches: combinedMatches,
    achievements: achMap,
  };

  const entry = { data: fallbackData, timestamp: Date.now() };
  inMemoryPlayerCache.set(cacheKey, entry);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch {}
  }

  return fallbackData;
}

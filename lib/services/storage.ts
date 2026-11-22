export const STORAGE_KEYS = {
  PROFILES: 'bhos_tt_profiles_v14',
  MATCHES: 'bhos_tt_matches_v13',
  TOURNAMENTS: 'bhos_tt_tournaments_v13',
  RESERVATIONS: 'bhos_tt_reservations_v8',
  CURRENT_USER_ID: 'bhos_tt_active_user_id_v8',
};

export const SESSION_LEADERBOARD_KEY = 'bhos_tt_leaderboard_cache_v5';
export const SESSION_RECENT_MATCHES_KEY = 'bhos_tt_recent_matches';
export const LEADERBOARD_TTL_MS = 60_000;
export const PLAYER_PROFILE_TTL_MS = 45_000;

export interface LeaderboardCacheEntry {
  data: any[];
  timestamp: number;
  isFull: boolean;
}

export function getSessionLeaderboardCache(): LeaderboardCacheEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_LEADERBOARD_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSessionLeaderboardCache(entry: LeaderboardCacheEntry): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_LEADERBOARD_KEY, JSON.stringify(entry));
  } catch {}
}

export function normalizeAvatarUrl(url?: string): string | undefined {
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

export function getStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export function setStored<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to store key ${key}:`, err);
  }
}

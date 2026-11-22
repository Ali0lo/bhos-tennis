import {
  PlayerProfile,
  MatchRecord,
  getProfileDepartment,
  resolveCanonicalDepartment,
} from '../data/types';
import { INITIAL_PROFILES } from '../data/mockData';
import { getSupabaseClient } from '../supabase/client';
import { buildSlugMap, isUuid, normalizeForSearch } from '../utils/slug';
import { isCustomRacket } from '../utils/equipment';
import {
  PLAYER_PROFILE_TTL_MS,
  SESSION_LEADERBOARD_KEY,
  getStored,
  normalizeAvatarUrl,
} from './storage';
import { isApprovedMatch } from './matches';

/**
 * The 12 verified official participants of the November 7 Foundation Cup
 * ("Zəfər Günü" Foundation Kuboku).
 */
export const OFFICIAL_FOUNDATION_CUP_PLAYERS: ReadonlyArray<{
  name: string;
  slug: string;
  seedId: string;
  aliases: string[];
}> = [
  {
    name: 'Yusif Xanlarov',
    slug: 'yusif-xanlarov',
    seedId: 'p-f-yusif-xanlarov',
    aliases: ['yusif xanlarov'],
  },
  {
    name: 'Məharət Kərimli',
    slug: 'maharat-karimli',
    seedId: 'p-f-meharet-kerimli',
    aliases: ['meharet kerimli', 'maharat karimli'],
  },
  {
    name: 'Əhəd Zamanlı',
    slug: 'ahad-zamanli',
    seedId: 'p-f-ehed-zamanli',
    aliases: ['ehed zamanli', 'ahad zamanli'],
  },
  {
    name: 'Qulam Rüstəmzadə',
    slug: 'qulam-rustamzada',
    seedId: 'p-f-qulam-rustemzade',
    aliases: ['qulam rustemzade', 'qulam rustamzada'],
  },
  {
    name: 'Sabir Məhərrəmli',
    slug: 'sabir-maharramli',
    seedId: 'p-f-sabir-meherremli',
    aliases: ['sabir meherremli', 'sabir maharramli'],
  },
  {
    name: 'Adil Süleymanov',
    slug: 'adil-suleymanov',
    seedId: 'p-f-adil-suleymanov',
    aliases: ['adil suleymanov'],
  },
  {
    name: 'Kazım Fətəlizadə',
    slug: 'kazim-fatalizada',
    seedId: 'p-f-kazim-fetelizade',
    aliases: ['kazim fetelizade', 'kazim fatalizada'],
  },
  {
    name: 'Faiq Hüseynli',
    slug: 'faiq-huseynli',
    seedId: 'p-f-faiq-huseynli',
    aliases: ['faiq huseynli'],
  },
  {
    name: 'Məhəmməd Əsədov',
    slug: 'muhammad-asadov',
    seedId: 'p-f-mehemmed-esedov',
    aliases: ['mehemmed esedov', 'muhammad asadov'],
  },
  {
    name: 'Kamran Əliyev',
    slug: 'kamran-aliyev',
    seedId: 'p-f-kamran-aliev',
    aliases: ['kamran aliyev', 'kamran aliev', 'kamran eliyev'],
  },
  {
    name: 'Məhərrəm Mirzəxanlı',
    slug: 'maharram-mirzaxanli',
    seedId: 'p-f-meherrem-mirzexanli',
    aliases: ['meherrem mirzexanli', 'maharram mirzaxanli'],
  },
  {
    name: 'Rafiq Həsənli',
    slug: 'rafiq-hasanli',
    seedId: 'p-f-rafiq-hesenli',
    aliases: ['rafiq hesenli', 'rafiq hasanli'],
  },
];

export function isCoachIftixarProfile(raw: any): boolean {
  if (!raw) return false;
  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  if (email === 'iftixar.coach@gmail.com' || email === 'iftixar@bhos.edu.az') return true;
  if (raw.role === 'coach') return true;
  if (raw.id === 'p-2' || raw.id === '00000000-0000-0000-0000-000000000002') return true;
  const norm = normalizeForSearch(raw.full_name || '');
  return norm.includes('iftixar');
}

export function resolvePlayerRealElo(
  raw: any,
  rawMatches: number,
  prev?: PlayerProfile,
  prevMatches: number = 0,
  seed?: PlayerProfile,
  seedMatches: number = 0,
  matches?: MatchRecord[]
): number {
  const isCoach =
    isCoachIftixarProfile(raw) || isCoachIftixarProfile(prev) || isCoachIftixarProfile(seed);

  if (matches && matches.length > 0) {
    const rawId = raw?.id || prev?.id;
    const rawNorm = normalizeForSearch(raw?.full_name || prev?.full_name || '');
    const playerMatches = matches
      .filter((m) => {
        if (rawId && (m.player1_id === rawId || m.player2_id === rawId)) return true;
        if (rawNorm) {
          const p1Norm = normalizeForSearch(m.player1_name || '');
          const p2Norm = normalizeForSearch(m.player2_name || '');
          if (p1Norm === rawNorm || p2Norm === rawNorm) return true;
          if (isCoach && (p1Norm.includes('iftixar') || p2Norm.includes('iftixar'))) return true;
        }
        return false;
      })
      .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());

    if (playerMatches.length > 0) {
      const latest = playerMatches[0];
      const isP1 =
        (rawId && latest.player1_id === rawId) ||
        (rawNorm && normalizeForSearch(latest.player1_name || '') === rawNorm) ||
        (isCoach && normalizeForSearch(latest.player1_name || '').includes('iftixar'));
      const eloAfter = isP1 ? latest.player1_elo_after : latest.player2_elo_after;
      if (typeof eloAfter === 'number' && eloAfter > 0) {
        if (isCoach || Number(raw?.current_elo ?? 0) === 999 || Number(raw?.current_elo ?? 0) === 0) {
          return eloAfter;
        }
      }
    }
  }

  const rawElo = Number(raw?.current_elo ?? raw?.elo_rating ?? 0);
  if (isCoach) {
    if (rawElo > 0 && rawElo < 999) return rawElo;
    const prevElo = Number(prev?.current_elo ?? 0);
    if (prevElo > 0 && prevElo < 999) return prevElo;
    return 966;
  }

  if (rawMatches === 0 && (prevMatches > 0 || seedMatches > 0)) {
    return Math.max(
      rawElo,
      Number(prev?.current_elo ?? 0),
      Number(seed?.current_elo ?? 0)
    );
  }

  return Number(raw?.current_elo ?? raw?.elo_rating ?? prev?.current_elo ?? seed?.current_elo ?? 0);
}

export function deduplicatePlayerProfiles(profiles: PlayerProfile[]): PlayerProfile[] {
  const result: PlayerProfile[] = [];
  const byKey = new Map<string, number>();

  for (const p of profiles) {
    const emailKey = (p.email || '').trim().toLowerCase();
    const normName = normalizeForSearch(p.full_name || '');
    const isCoach = isCoachIftixarProfile(p);
    const key = isCoach
      ? 'coach:iftixar'
      : emailKey || (normName ? `name:${normName}` : `id:${p.id}`);

    const existingIdx = byKey.get(key);
    if (existingIdx === undefined) {
      byKey.set(key, result.length);
      result.push(p);
    } else {
      const existing = result[existingIdx];
      const preferNew =
        (isUuid(p.id) && !isUuid(existing.id)) ||
        (isCoach && p.current_elo !== 999 && existing.current_elo === 999) ||
        ((p.matches_played || 0) > (existing.matches_played || 0));

      if (preferNew) {
        result[existingIdx] = {
          ...existing,
          ...p,
          current_elo: isCoach && p.current_elo === 999 ? existing.current_elo : p.current_elo,
        };
      } else if (isCoach && existing.current_elo === 999 && p.current_elo !== 999 && p.current_elo > 0) {
        result[existingIdx] = {
          ...existing,
          current_elo: p.current_elo,
          matches_played: Math.max(existing.matches_played || 0, p.matches_played || 0),
          wins: Math.max(existing.wins || 0, p.wins || 0),
          losses: Math.max(existing.losses || 0, p.losses || 0),
        };
      }
    }
  }

  return result;
}

export function findMatchingSeedProfile(raw: any): PlayerProfile | undefined {
  if (!raw) return undefined;
  const rawId = typeof raw.id === 'string' ? raw.id.trim() : '';
  const rawEmail = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  const rawSlug = typeof raw.slug === 'string' ? raw.slug.trim().toLowerCase() : '';
  const rawNorm = normalizeForSearch(raw.full_name || '');

  if (rawId) {
    const byId = INITIAL_PROFILES.find((p) => p.id === rawId);
    if (byId) return byId;
  }
  if (rawEmail) {
    const byEmail = INITIAL_PROFILES.find((p) => (p.email || '').trim().toLowerCase() === rawEmail);
    if (byEmail) return byEmail;
  }
  if (rawSlug) {
    const bySlug = INITIAL_PROFILES.find((p) => (p.slug || '').trim().toLowerCase() === rawSlug);
    if (bySlug) return bySlug;
  }
  if (rawNorm) {
    const byNorm = INITIAL_PROFILES.find((p) => normalizeForSearch(p.full_name) === rawNorm);
    if (byNorm) return byNorm;
    const official = OFFICIAL_FOUNDATION_CUP_PLAYERS.find((o) =>
      o.aliases.some((alias) => alias === rawNorm)
    );
    if (official) {
      return INITIAL_PROFILES.find((p) => p.id === official.seedId);
    }
  }
  return undefined;
}

export interface PlayerProfileSummaryResult {
  profile: PlayerProfile | null;
  recent_matches: MatchRecord[];
  achievements: Record<string, string>;
}

export interface ProfileStoreAdapter {
  getMatches: () => MatchRecord[];
  getProfile: (id: string) => PlayerProfile | undefined;
  getPlayerMatches: (playerId: string) => MatchRecord[];
  resolvePlayerIdentifier: (identifier: string | null | undefined) => string | null;
  getResolvedMatchIds: () => Record<string, 'confirmed' | 'rejected'>;
  enrichMatchRecord: (raw: any) => MatchRecord;
}

let storeAdapter: ProfileStoreAdapter | null = null;

export function registerProfileStoreAdapter(adapter: ProfileStoreAdapter): void {
  storeAdapter = adapter;
}

export const inMemoryPlayerCache = new Map<
  string,
  { data: PlayerProfileSummaryResult; timestamp: number }
>();

export async function resolvePlayerIdentifierRemote(identifier: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const slug = identifier.trim().toLowerCase();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!error && data?.id) return data.id as string;
  } catch {}

  try {
    const { data } = await supabase.from('profiles').select('id, full_name, created_at');
    if (Array.isArray(data) && data.length > 0) {
      const slugMap = buildSlugMap(data as PlayerProfile[]);
      let match: string | null = null;
      slugMap.forEach((s, id) => {
        if (!match && s === slug) match = id;
      });
      if (match) return match;
      const wanted = normalizeForSearch(slug.replace(/-/g, ' '));
      const byName = (data as PlayerProfile[]).find(
        (p) => normalizeForSearch(p.full_name) === wanted
      );
      if (byName) return byName.id;
    }
  } catch {}

  return null;
}

export function mapRawProfileToPlayerProfile(
  raw: any,
  fallback?: PlayerProfile
): PlayerProfile {
  const seed = findMatchingSeedProfile(raw) || (fallback ? findMatchingSeedProfile(fallback) : undefined);

  const rawWins = Number(raw.wins ?? 0);
  const rawLosses = Number(raw.losses ?? 0);
  const rawMatches = Math.max(
    Number(raw.matches_played ?? raw.total_matches ?? 0),
    rawWins + rawLosses
  );

  const fbWins = Number(fallback?.wins ?? 0);
  const fbLosses = Number(fallback?.losses ?? 0);
  const fbMatches = Math.max(Number(fallback?.matches_played ?? 0), fbWins + fbLosses);

  const seedWins = Number(seed?.wins ?? 0);
  const seedLosses = Number(seed?.losses ?? 0);
  const seedMatches = Math.max(Number(seed?.matches_played ?? 0), seedWins + seedLosses);

  let wins = rawWins;
  let losses = rawLosses;
  let totalMatches = rawMatches;

  if (totalMatches === 0) {
    if (fbMatches > 0) {
      wins = fbWins;
      losses = fbLosses > 0 ? fbLosses : Math.max(0, fbMatches - fbWins);
      totalMatches = Math.max(fbMatches, wins + losses);
    } else if (seedMatches > 0) {
      wins = seedWins;
      losses = seedLosses > 0 ? seedLosses : Math.max(0, seedMatches - seedWins);
      totalMatches = Math.max(seedMatches, wins + losses);
    }
  } else {
    losses = rawLosses > 0 ? rawLosses : Math.max(0, totalMatches - wins);
    totalMatches = Math.max(totalMatches, wins + losses);
  }

  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  const rawDept =
    getProfileDepartment(raw) ||
    getProfileDepartment(fallback) ||
    getProfileDepartment(seed) ||
    'Computer Engineering';
  const canonicalDept = resolveCanonicalDepartment(rawDept) || rawDept;

  const admissionYear =
    raw.admission_year ??
    raw.year_of_study ??
    fallback?.admission_year ??
    fallback?.year_of_study ??
    seed?.admission_year ??
    2024;
  const yearOfStudy =
    raw.year_of_study ??
    raw.admission_year ??
    fallback?.year_of_study ??
    fallback?.admission_year ??
    seed?.year_of_study ??
    admissionYear;

  const isFoundation =
    Number(admissionYear) === 2026 ||
    Number(yearOfStudy) === 2026 ||
    raw.is_foundation === true ||
    fallback?.is_foundation === true ||
    seed?.is_foundation === true ||
    (raw.department || fallback?.department || seed?.department || '')
      .toLowerCase()
      .includes('foundation') ||
    (raw.department || fallback?.department || seed?.department || '')
      .toLowerCase()
      .includes('hazirliq') ||
    (raw.group || fallback?.group || seed?.group || '').toLowerCase().startsWith('f-') ||
    (raw.group || fallback?.group || seed?.group || '').toLowerCase().startsWith('fnd-');

  const resolvedElo = resolvePlayerRealElo(
    raw,
    rawMatches,
    fallback,
    fbMatches,
    seed,
    seedMatches,
    storeAdapter ? storeAdapter.getMatches() : []
  );

  return {
    id: raw.id || fallback?.id || '',
    full_name: raw.full_name || fallback?.full_name || 'Unknown',
    slug: raw.slug || fallback?.slug || seed?.slug || null,
    email: raw.email || fallback?.email || seed?.email || '',
    major_faculty: canonicalDept,
    faculty: raw.faculty || fallback?.faculty || canonicalDept,
    department:
      raw.department ||
      fallback?.department ||
      seed?.department ||
      (isFoundation ? 'Foundation' : canonicalDept),
    major: raw.major || fallback?.major || canonicalDept,
    group:
      raw.group ||
      fallback?.group ||
      seed?.group ||
      (isFoundation ? 'Foundation / 2026' : ''),
    admission_year: admissionYear,
    year_of_study: yearOfStudy,
    is_foundation: isFoundation,
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
    racket:
      raw.racket !== undefined
        ? (isCustomRacket(raw.racket) ? raw.racket : null)
        : (fallback?.racket ?? (isCustomRacket(raw.blade_equipment) ? raw.blade_equipment : null)),
    blade_equipment: raw.blade_equipment || fallback?.blade_equipment || 'Butterfly Viscaria',
    forehand_rubber: raw.forehand_rubber || fallback?.forehand_rubber || 'Tenergy 05',
    backhand_rubber: raw.backhand_rubber || fallback?.backhand_rubber || 'Dignics 09C',
    current_elo: resolvedElo,
    elo_rating: resolvedElo,
    matches_played: totalMatches,
    wins,
    losses,
    win_rate: winRate,
    status: raw.status || fallback?.status || 'approved',
    origin: raw.origin || fallback?.origin || 'Qeydiyyat',
    is_verified: raw.is_verified ?? fallback?.is_verified ?? true,
    is_active: raw.is_active ?? fallback?.is_active ?? true,
    avatar_url: normalizeAvatarUrl(raw.avatar_url || fallback?.avatar_url),
    rank: raw.rank ?? fallback?.rank,
    created_at: raw.created_at || fallback?.created_at || new Date().toISOString(),
  };
}

/** Drops cached profile summary (e.g. after arcade badges were awarded server-side). */
export function invalidatePlayerProfileCache(playerId: string): void {
  if (!playerId) return;
  const cacheKey = `bhos_player_${playerId}`;
  inMemoryPlayerCache.delete(cacheKey);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(cacheKey);
    } catch {}
  }
}

export function getCachedPlayerProfile(
  identifier: string
): PlayerProfileSummaryResult | null {
  if (!identifier || !storeAdapter) return null;
  const playerId = storeAdapter.resolvePlayerIdentifier(identifier) || identifier;
  const cacheKey = `bhos_player_${playerId}`;
  const now = Date.now();
  const resolved = storeAdapter.getResolvedMatchIds();
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

  const localProfile = storeAdapter.getProfile(playerId);
  if (localProfile && localProfile.is_verified !== false) {
    const localMatches = storeAdapter.getPlayerMatches(localProfile.id);
    return {
      profile: localProfile,
      recent_matches: localMatches,
      achievements: {},
    };
  }

  return null;
}

export async function fetchPlayerProfile(
  identifier: string,
  options?: { force?: boolean }
): Promise<PlayerProfileSummaryResult> {
  let playerId = identifier;
  if (identifier && !isUuid(identifier)) {
    const localId = storeAdapter?.resolvePlayerIdentifier(identifier) || null;
    const resolvedId = localId || (await resolvePlayerIdentifierRemote(identifier));
    if (resolvedId) playerId = resolvedId;
  }

  const cacheKey = `bhos_player_${playerId}`;
  const force = Boolean(options?.force);
  const resolved = storeAdapter?.getResolvedMatchIds() || {};
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

  const localProfile = storeAdapter?.getProfile(playerId);
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      profile: localProfile || null,
      recent_matches: localProfile && storeAdapter ? storeAdapter.getPlayerMatches(localProfile.id) : [],
      achievements: {},
    };
  }

  const validUuid = isUuid(playerId);

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
        ? rpcData.recent_matches.map((m: any) =>
            storeAdapter ? storeAdapter.enrichMatchRecord(m) : m
          )
        : [];
      const localMatches = storeAdapter ? storeAdapter.getPlayerMatches(normalizedProfile.id) : [];
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
            'id, created_at, match_date, tournament_id, tournament_title, player1_id, player1_name, player2_id, player2_name, logged_by, logged_by_name, winner_id, player1_score, player2_score, set_scores, player1_elo_before, player2_elo_before, player1_elo_after, player2_elo_after, player1_elo_delta, player2_elo_delta, elo_delta, status, stage, auto_approved, player1:profiles!player1_id(id, full_name, slug, elo_rating, current_elo, department, major_faculty), player2:profiles!player2_id(id, full_name, slug, elo_rating, current_elo, department, major_faculty)'
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

  const cloudMatches = ((matchesRes.data || []) as any[]).map((m) =>
    storeAdapter ? storeAdapter.enrichMatchRecord(m) : m
  );
  const localMatches = storeAdapter
    ? storeAdapter.getPlayerMatches(resolvedProfile.id || playerId)
    : [];
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

export function updateProfileInCloud(
  id: string,
  safeUpdates: Partial<PlayerProfile>,
  fallbackEmail?: string
): void {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const isUuidId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (isUuidId) {
    supabase
      .from('profiles')
      .update(safeUpdates)
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.warn('[BHOS Store] Supabase updateProfile failed:', error.message);
      });
  } else if (fallbackEmail) {
    supabase
      .from('profiles')
      .update(safeUpdates)
      .eq('email', fallbackEmail)
      .then(({ error }) => {
        if (error) console.warn('[BHOS Store] Supabase updateProfile by email failed:', error.message);
      });
  }
  if (safeUpdates.full_name) {
    supabase.from('matches').update({ player1_name: safeUpdates.full_name }).eq('player1_id', id).then();
    supabase.from('matches').update({ player2_name: safeUpdates.full_name }).eq('player2_id', id).then();
    supabase.from('matches').update({ logged_by_name: safeUpdates.full_name }).eq('logged_by', id).then();
  }
}

export function overrideEloInCloud(id: string, currentElo: number): void {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  supabase
    .from('profiles')
    .update({ current_elo: currentElo })
    .eq('id', id)
    .then(({ error }) => {
      if (error) console.warn('[BHOS Store] Supabase overrideElo failed:', error.message);
    });
}

export function updateUserRoleInCloud(id: string, role: string): void {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const payload: Record<string, any> = { role };
  if (role === 'president' || role === 'coach') {
    payload.is_verified = true;
    payload.status = 'approved';
  }
  supabase
    .from('profiles')
    .update(payload)
    .eq('id', id)
    .then(({ error }) => {
      if (error) console.warn('[BHOS Store] Supabase updateUserRole failed:', error.message);
    });

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(SESSION_LEADERBOARD_KEY);
      sessionStorage.removeItem(`bhos_player_${id}`);
    } catch {}
  }
}

export async function deleteProfileInCloud(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.from('tournament_registrations').delete().eq('player_id', id);
    await supabase.from('table_reservations').delete().eq('reserved_by', id);
    await supabase.from('tournaments').update({ created_by: null }).eq('created_by', id);
    await supabase.from('profiles').delete().eq('id', id);
  } catch (err) {
    console.warn('[BHOS Store] Supabase deleteProfile failed:', err);
  }
}

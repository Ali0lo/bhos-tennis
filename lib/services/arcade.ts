import { getSupabaseClient } from '../supabase/client';

export const ARCADE_INFINITY_MODE = 'infinity';

export interface ArcadeLeaderboardRow {
  rank: number;
  user_id: string;
  full_name: string;
  slug: string | null;
  department: string | null;
  year_of_study?: number | null;
  avatar_url: string | null;
  score: number;
}

export interface ArcadeStanding {
  rank: number;
  score: number;
}

export async function fetchArcadeLeaderboard(
  mode: string = ARCADE_INFINITY_MODE,
  limit: number = 100
): Promise<ArcadeLeaderboardRow[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('get_arcade_leaderboard', {
    p_mode: mode,
    p_limit: limit,
  });

  if (error || !Array.isArray(data)) {
    throw error || new Error('Failed to load arcade leaderboard');
  }

  return data as ArcadeLeaderboardRow[];
}

export async function fetchMyArcadeStanding(
  mode: string = ARCADE_INFINITY_MODE
): Promise<ArcadeStanding | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('get_my_arcade_standing', {
    p_mode: mode,
  });

  if (error || !data) return null;
  return data as ArcadeStanding;
}

export async function deleteArcadeScore(
  targetUserId: string,
  mode: string = ARCADE_INFINITY_MODE,
  revokeBadges: boolean = true
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client unavailable');
  }

  const { error } = await supabase.rpc('delete_arcade_score', {
    p_target_user_id: targetUserId,
    p_mode: mode,
    p_revoke_badges: revokeBadges,
  });

  if (error) {
    throw error;
  }
}

export async function startArcadeSession(
  mode: string = ARCADE_INFINITY_MODE
): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('start_arcade_session', {
    p_mode: mode,
  });

  if (error || !data) return null;
  return String(data);
}

export async function submitArcadeScore(params: {
  sessionId: string;
  score: number;
  mode?: string;
  durationSeconds?: number;
  isNaturalInput?: boolean;
}) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client unavailable');
  }

  return supabase.rpc('submit_arcade_score', {
    p_session_id: params.sessionId,
    p_score: params.score,
    p_mode: params.mode || ARCADE_INFINITY_MODE,
    p_duration_seconds: params.durationSeconds ?? null,
    p_is_natural_input: params.isNaturalInput ?? true,
  });
}

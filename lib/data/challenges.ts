import { getSupabaseClient } from '../supabase/client';
import { sanitizeTextInput } from '../security/sanitize';

export type ChallengeFormat = 'bo3' | 'bo5' | 'bo7';
export type ChallengeStatus = 'open' | 'accepted' | 'expired' | 'cancelled';

export interface ChallengeParticipant {
  id: string;
  full_name: string;
  slug?: string | null;
  current_elo: number;
  major_faculty?: string | null;
  avatar_url?: string | null;
}

export interface ChallengeRecord {
  id: string;
  challenger_id: string;
  opponent_id: string | null;
  format: ChallengeFormat;
  proposed_time: string;
  note: string;
  status: ChallengeStatus;
  created_at: string;
  expires_at: string;
  challenger?: ChallengeParticipant | null;
  opponent?: ChallengeParticipant | null;
}

export function getEffectiveChallengeStatus(challenge: ChallengeRecord): ChallengeStatus {
  if (challenge.status === 'open') {
    const expiresMs = new Date(challenge.expires_at).getTime();
    if (Number.isFinite(expiresMs) && expiresMs <= Date.now()) {
      return 'expired';
    }
  }
  return challenge.status;
}

function normalizeParticipant(raw: any): ChallengeParticipant | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || !row.id) return null;
  return {
    id: String(row.id),
    full_name: String(row.full_name || ''),
    slug: row.slug ?? null,
    current_elo: Number(row.current_elo ?? 0),
    major_faculty: row.major_faculty ?? null,
    avatar_url: row.avatar_url ?? null,
  };
}

export async function fetchChallenges(): Promise<{
  data: ChallengeRecord[];
  error: string | null;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from('challenges')
    .select(
      `
      id,
      challenger_id,
      opponent_id,
      format,
      proposed_time,
      note,
      status,
      created_at,
      expires_at,
      challenger:profiles!challenger_id (id, full_name, slug, current_elo, major_faculty, avatar_url),
      opponent:profiles!opponent_id (id, full_name, slug, current_elo, major_faculty, avatar_url)
    `
    )
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return { data: [], error: error.message };
  }

  const normalized: ChallengeRecord[] = (data || []).map((row: any) => ({
    id: String(row.id),
    challenger_id: String(row.challenger_id),
    opponent_id: row.opponent_id ? String(row.opponent_id) : null,
    format: (row.format || 'bo5') as ChallengeFormat,
    proposed_time: String(row.proposed_time || ''),
    note: String(row.note || ''),
    status: (row.status || 'open') as ChallengeStatus,
    created_at: String(row.created_at),
    expires_at: String(row.expires_at),
    challenger: normalizeParticipant(row.challenger),
    opponent: normalizeParticipant(row.opponent),
  }));

  return { data: normalized, error: null };
}

export async function createChallenge(input: {
  challengerId: string;
  opponentId?: string | null;
  format: ChallengeFormat;
  proposedTime: string;
  note?: string;
  expiresInHours?: number;
}): Promise<{ data: ChallengeRecord | null; error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: 'Supabase client unavailable' };
  }

  const cleanTime = sanitizeTextInput(input.proposedTime, 120);
  const cleanNote = sanitizeTextInput(input.note || '', 280);
  const opponentId = input.opponentId ? input.opponentId.trim() : null;

  if (!cleanTime) {
    return { data: null, error: 'Proposed time is required' };
  }

  if (opponentId && opponentId === input.challengerId) {
    return { data: null, error: 'Cannot challenge yourself' };
  }

  const hours = Math.max(1, Math.min(168, input.expiresInHours ?? 24));
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();

  const { data, error } = await supabase
    .from('challenges')
    .insert([
      {
        challenger_id: input.challengerId,
        opponent_id: opponentId,
        format: input.format,
        proposed_time: cleanTime,
        note: cleanNote,
        status: 'open',
        expires_at: expiresAt,
      },
    ])
    .select(
      `
      id,
      challenger_id,
      opponent_id,
      format,
      proposed_time,
      note,
      status,
      created_at,
      expires_at,
      challenger:profiles!challenger_id (id, full_name, slug, current_elo, major_faculty, avatar_url),
      opponent:profiles!opponent_id (id, full_name, slug, current_elo, major_faculty, avatar_url)
    `
    )
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: {
      id: String(data.id),
      challenger_id: String(data.challenger_id),
      opponent_id: data.opponent_id ? String(data.opponent_id) : null,
      format: (data.format || 'bo5') as ChallengeFormat,
      proposed_time: String(data.proposed_time || ''),
      note: String(data.note || ''),
      status: (data.status || 'open') as ChallengeStatus,
      created_at: String(data.created_at),
      expires_at: String(data.expires_at),
      challenger: normalizeParticipant((data as any).challenger),
      opponent: normalizeParticipant((data as any).opponent),
    },
    error: null,
  };
}

export async function acceptChallenge(
  challengeId: string,
  userId: string
): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: 'Supabase client unavailable' };
  }

  const { data, error } = await supabase
    .from('challenges')
    .update({ status: 'accepted', opponent_id: userId })
    .eq('id', challengeId)
    .eq('status', 'open')
    .select('id');

  if (error) {
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return { error: 'Challenge is no longer open or already accepted' };
  }

  return { error: null };
}

export async function cancelChallenge(challengeId: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: 'Supabase client unavailable' };
  }

  const { error } = await supabase
    .from('challenges')
    .update({ status: 'cancelled' })
    .eq('id', challengeId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

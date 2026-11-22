import { MatchRecord, Tournament } from '../data/types';
import { getSupabaseClient } from '../supabase/client';

export interface MatchAuditLogRecord {
  id: string;
  match_id: string;
  reason: string;
  resolved_by?: string | null;
  resolved_at: string;
  match?: {
    id: string;
    player1_name?: string;
    player2_name?: string;
    player1_score?: number;
    player2_score?: number;
    elo_delta?: number;
    status?: string;
    match_date?: string;
  } | null;
}

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

export async function fetchMatchAuditLogs(limit: number = 100): Promise<MatchAuditLogRecord[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('match_audit_logs')
      .select(
        'id, match_id, reason, resolved_by, resolved_at, match:matches!match_id(id, player1_name, player2_name, player1_score, player2_score, elo_delta, status, match_date)'
      )
      .order('resolved_at', { ascending: false })
      .limit(limit);

    if (!error && Array.isArray(data)) {
      return data.map((row: any) => ({
        id: String(row.id),
        match_id: String(row.match_id),
        reason: String(row.reason || ''),
        resolved_by: row.resolved_by ?? null,
        resolved_at: String(row.resolved_at),
        match: Array.isArray(row.match) ? row.match[0] || null : row.match || null,
      }));
    }

    const { data: plainData, error: plainErr } = await supabase
      .from('match_audit_logs')
      .select('id, match_id, reason, resolved_by, resolved_at')
      .order('resolved_at', { ascending: false })
      .limit(limit);

    if (!plainErr && Array.isArray(plainData)) {
      return plainData as MatchAuditLogRecord[];
    }
  } catch (err) {
    console.warn('[BHOS Matches] Could not fetch audit logs:', err);
  }

  return [];
}

export async function propagateBracketMatchInCloud(
  tournament: Tournament,
  matchId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

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

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matchId);
  if (isUuid) {
    supabase.rpc('advance_tournament_bracket', { p_match_id: matchId }).then(() => {});
  }
}

export async function voidMatchInCloud(matchId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase bağlantısı mövcud deyil.');
  }

  const { error } = await supabase.rpc('admin_void_match', { target_match_id: matchId });
  if (error) {
    throw new Error(error.message || 'Matç ləğv edilə bilmədi.');
  }
}

export async function deleteMatchInCloud(matchId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

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

export async function deleteMatchesBulkInCloud(matchIds: string[]): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

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

export async function updateMatchInCloud(
  matchId: string,
  payload: Record<string, any>
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
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

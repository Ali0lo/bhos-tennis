import { Tournament } from '../data/types';
import { getSupabaseClient } from '../supabase/client';

export const OBSOLETE_TOURNAMENT_IDENTIFIERS = new Set([
  'tourn-1',
  'tourn-2',
  '11111111-1111-1111-1111-111111111111',
  'bhos-autumn-open-2026',
  'inter-faculty-engineering-cup-2026',
]);

export function isFoundationCupTournament(
  t?: Partial<Tournament> | string | null
): boolean {
  if (!t) return false;
  if (typeof t === 'string') {
    const val = t.trim().toLowerCase();
    return (
      val === 'foundation-kuboku-2026' ||
      val === 'tourn-foundation-2026' ||
      val.includes('foundation')
    );
  }
  const id = (t.id || '').toLowerCase();
  const slug = (t.slug || '').toLowerCase();
  const title = (t.title || '').toLowerCase();
  return (
    id === 'tourn-foundation-2026' ||
    slug === 'foundation-kuboku-2026' ||
    title.includes('foundation')
  );
}

export function getBracketCacheKey(identifier: string): string {
  return `bhos_tt_bracket_cache_${identifier}`;
}

export function getBracketDataFromCache(identifier: string): Tournament['bracket_data'] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getBracketCacheKey(identifier));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveBracketDataToCache(identifier: string, data: Tournament['bracket_data']): void {
  if (typeof window === 'undefined' || !data) return;
  try {
    localStorage.setItem(getBracketCacheKey(identifier), JSON.stringify(data));
  } catch (e) {
    console.warn('[BHOS Store] Could not cache bracket data:', e);
  }
}

export async function syncTournamentBracketToCloud(tournament: Tournament): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const payload: any = {
      bracket_data: tournament.bracket_data,
      status: tournament.status,
      format: tournament.format,
      group_size: tournament.group_size,
      advance_per_group: tournament.advance_per_group,
      participants: tournament.participants,
    };

    if (tournament.slug) {
      await supabase
        .from('tournaments')
        .update(payload)
        .eq('slug', tournament.slug);
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tournament.id);
    if (isUuid) {
      await supabase
        .from('tournaments')
        .update(payload)
        .eq('id', tournament.id);
    }
  } catch (err: any) {
    console.warn('[BHOS Store] syncTournamentBracketToCloud error:', err?.message || err);
  }
}

export async function registerForTournamentInCloud(
  tournament: Tournament,
  targetId: string
): Promise<string[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.rpc('register_for_tournament', {
      target_tournament_id: tournament.slug || tournament.id,
      p_target_player_id: targetId,
    });
    if (!error && data && Array.isArray(data.participants)) {
      return data.participants as string[];
    }

    if (error) {
      console.warn('[BHOS Store] Supabase register_for_tournament notice:', error.message);
    }
    if (tournament.slug) {
      await supabase
        .from('tournaments')
        .update({ participants: tournament.participants })
        .eq('slug', tournament.slug);
    }
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tournament.id);
    if (isUuid) {
      await supabase
        .from('tournaments')
        .update({ participants: tournament.participants })
        .eq('id', tournament.id);
    }
    const regPayload: any = {
      player_id: targetId,
      tournament_slug: tournament.slug,
    };
    if (isUuid) regPayload.tournament_id = tournament.id;
    await supabase
      .from('tournament_registrations')
      .upsert(regPayload, { onConflict: 'tournament_slug,player_id' });
  } catch (e: any) {
    console.warn('[BHOS Store] Error registering for tournament in Supabase:', e?.message || e);
  }

  return null;
}

export async function withdrawFromTournamentInCloud(
  tournament: Tournament,
  targetId: string
): Promise<string[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.rpc('withdraw_from_tournament', {
      target_tournament_id: tournament.slug || tournament.id,
      p_target_player_id: targetId,
    });
    if (!error && data && Array.isArray(data.participants)) {
      return data.participants as string[];
    }

    if (error) {
      console.warn('[BHOS Store] Supabase withdraw_from_tournament notice:', error.message);
    }
    if (tournament.slug) {
      await supabase
        .from('tournaments')
        .update({ participants: tournament.participants })
        .eq('slug', tournament.slug);
    }
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tournament.id);
    if (isUuid) {
      await supabase
        .from('tournaments')
        .update({ participants: tournament.participants })
        .eq('id', tournament.id);
    }
    if (tournament.slug) {
      await supabase
        .from('tournament_registrations')
        .delete()
        .eq('player_id', targetId)
        .eq('tournament_slug', tournament.slug);
    }
  } catch (e: any) {
    console.warn('[BHOS Store] Error withdrawing from tournament in Supabase:', e?.message || e);
  }

  return null;
}

export async function addTournamentParticipantInCloud(
  tournament: Tournament,
  playerId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { error: rpcError } = await supabase.rpc('admin_add_tournament_participant', {
      target_tournament_id: tournament.slug || tournament.id,
      target_player_id: playerId,
    });

    if (rpcError) {
      console.warn('[BHOS Store] admin_add_tournament_participant notice:', rpcError.message);
    }

    if (tournament.slug) {
      await supabase
        .from('tournaments')
        .update({ participants: tournament.participants })
        .eq('slug', tournament.slug);
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tournament.id);
    if (isUuid) {
      await supabase
        .from('tournaments')
        .update({ participants: tournament.participants })
        .eq('id', tournament.id);
    }

    const regPayload: any = {
      player_id: playerId,
      tournament_slug: tournament.slug,
    };
    if (isUuid) regPayload.tournament_id = tournament.id;

    await supabase
      .from('tournament_registrations')
      .upsert(regPayload, { onConflict: 'tournament_slug,player_id' });
  } catch (err: any) {
    console.warn('[BHOS Store] addTournamentParticipant Supabase failed:', err?.message || err);
  }
}

export async function removeTournamentParticipantInCloud(
  tournament: Tournament,
  playerId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    if (tournament.slug) {
      await supabase
        .from('tournaments')
        .update({ participants: tournament.participants })
        .eq('slug', tournament.slug);

      await supabase
        .from('tournament_registrations')
        .delete()
        .eq('player_id', playerId)
        .eq('tournament_slug', tournament.slug);
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tournament.id);
    if (isUuid) {
      await supabase
        .from('tournaments')
        .update({ participants: tournament.participants })
        .eq('id', tournament.id);

      await supabase
        .from('tournament_registrations')
        .delete()
        .eq('player_id', playerId)
        .eq('tournament_id', tournament.id);
    }
  } catch (err: any) {
    console.warn('[BHOS Store] removeTournamentParticipant Supabase failed:', err?.message || err);
  }
}

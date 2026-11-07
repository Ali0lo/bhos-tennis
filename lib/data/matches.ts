import { getSupabaseClient } from '../supabase/client';
import { MatchCompetitorProfile, MatchRecord, PlayerProfile } from './types';
import { INITIAL_MATCHES, INITIAL_PROFILES } from './mockData';
import { normalizeForSearch } from '../utils/slug';

export function formatMatchStageAz(
  stage?: string | null,
  roundNumber?: number | null,
  tournamentId?: string | null
): string | null {
  if (stage) {
    const s = stage.trim();
    const lower = s.toLowerCase();
    if (lower === 'group a' || lower === 'qrup a') return 'Qrup A';
    if (lower === 'group b' || lower === 'qrup b') return 'Qrup B';
    if (lower.startsWith('group') || lower.startsWith('qrup')) return s.replace(/^Group/i, 'Qrup');
    if (lower === 'quarterfinal' || lower === 'quarterfinals' || lower === '1/4 final' || lower === 'qf') {
      return 'Pley-off • 1/4 Final';
    }
    if (lower === 'semifinal' || lower === 'semifinals' || lower === '1/2 final' || lower === 'sf') {
      return 'Pley-off • Yarımfinal';
    }
    if (lower === '3rd place' || lower === 'third place' || lower === 'bürünc final' || lower.includes('3-cü')) {
      return 'Pley-off • 3-cü Yer';
    }
    if (lower === 'final' || lower === 'grand final') {
      return 'Pley-off • Final';
    }
    return s;
  }

  if (roundNumber && roundNumber > 0) {
    if (roundNumber === 1) return 'Pley-off • 1/4 Final';
    if (roundNumber === 2) return 'Pley-off • Yarımfinal';
    if (roundNumber === 3) return 'Pley-off • Final';
    return `Pley-off • Tur ${roundNumber}`;
  }

  if (tournamentId) {
    return 'Turnir Oyunu';
  }

  return null;
}

export function isPlayoffStage(stage?: string | null, roundNumber?: number | null): boolean {
  if (roundNumber && roundNumber > 0) return true;
  if (!stage) return false;
  const lower = stage.toLowerCase();
  return (
    lower.includes('final') ||
    lower.includes('3rd') ||
    lower.includes('third') ||
    lower.includes('pley-off') ||
    lower.includes('playoff') ||
    lower === 'qf' ||
    lower === 'sf'
  );
}

function unwrapJoinedProfile(raw: any): MatchCompetitorProfile | null {
  if (!raw) return null;
  const item = Array.isArray(raw) ? raw[0] : raw;
  if (!item || typeof item !== 'object') return null;
  if (!item.full_name && !item.id) return null;
  return {
    id: item.id || '',
    full_name: item.full_name || '',
    slug: item.slug || null,
    elo_rating: item.elo_rating ?? item.current_elo ?? null,
    current_elo: item.current_elo ?? item.elo_rating ?? null,
    department: item.department ?? item.major_faculty ?? null,
    major_faculty: item.major_faculty ?? item.department ?? null,
    avatar_url: item.avatar_url ?? null,
  };
}

function toCompetitorProfile(
  profile?: PlayerProfile | MatchCompetitorProfile | null,
  fallbackId?: string,
  fallbackName?: string
): MatchCompetitorProfile | null {
  if (!profile && !fallbackName) return null;
  return {
    id: profile?.id || fallbackId || '',
    full_name: profile?.full_name || fallbackName || 'Naməlum Oyunçu',
    slug: profile?.slug || null,
    elo_rating:
      (profile as MatchCompetitorProfile)?.elo_rating ??
      (profile as PlayerProfile)?.current_elo ??
      null,
    current_elo:
      (profile as PlayerProfile)?.current_elo ??
      (profile as MatchCompetitorProfile)?.elo_rating ??
      null,
    department: profile?.department || profile?.major_faculty || null,
    major_faculty: profile?.major_faculty || profile?.department || null,
    avatar_url: profile?.avatar_url || null,
  };
}

export function hydrateMatchCompetitors(
  raw: any,
  resolveProfile?: (idOrName: string) => PlayerProfile | undefined
): MatchRecord {
  const joinedP1 = unwrapJoinedProfile(raw?.player1);
  const joinedP2 = unwrapJoinedProfile(raw?.player2);

  const lookupProfile = (id?: string, name?: string): PlayerProfile | undefined => {
    if (resolveProfile) {
      if (id) {
        const byId = resolveProfile(id);
        if (byId) return byId;
      }
      if (name) {
        const byName = resolveProfile(name);
        if (byName) return byName;
      }
    }
    if (id) {
      const seedById = INITIAL_PROFILES.find((p) => p.id === id);
      if (seedById) return seedById;
    }
    if (name) {
      const norm = normalizeForSearch(name);
      if (norm) {
        const seedByName = INITIAL_PROFILES.find(
          (p) => normalizeForSearch(p.full_name) === norm
        );
        if (seedByName) return seedByName;
      }
    }
    return undefined;
  };

  const resolvedP1Profile = lookupProfile(
    raw?.player1_id || joinedP1?.id,
    joinedP1?.full_name || raw?.player1_name
  );
  const resolvedP2Profile = lookupProfile(
    raw?.player2_id || joinedP2?.id,
    joinedP2?.full_name || raw?.player2_name
  );

  // Match against INITIAL_MATCHES to recover detailed set_scores, stage, and tournament_title if needed
  const seedMatchById = raw?.id
    ? INITIAL_MATCHES.find((im) => im.id === raw.id)
    : undefined;

  const p1NameCandidate =
    joinedP1?.full_name ||
    raw?.player1_name ||
    resolvedP1Profile?.full_name ||
    seedMatchById?.player1_name ||
    '';
  const p2NameCandidate =
    joinedP2?.full_name ||
    raw?.player2_name ||
    resolvedP2Profile?.full_name ||
    seedMatchById?.player2_name ||
    '';

  const p1Norm = normalizeForSearch(p1NameCandidate);
  const p2Norm = normalizeForSearch(p2NameCandidate);
  const p1Score = Number(raw?.player1_score ?? seedMatchById?.player1_score ?? 0);
  const p2Score = Number(raw?.player2_score ?? seedMatchById?.player2_score ?? 0);

  const seedMatchByCompetitors =
    seedMatchById ||
    (p1Norm && p2Norm
      ? INITIAL_MATCHES.find((im) => {
          const imP1 = normalizeForSearch(im.player1_name || '');
          const imP2 = normalizeForSearch(im.player2_name || '');
          if (
            imP1 === p1Norm &&
            imP2 === p2Norm &&
            im.player1_score === p1Score &&
            im.player2_score === p2Score
          ) {
            if (raw?.stage && im.stage && raw.stage.toLowerCase() !== im.stage.toLowerCase()) {
              return false;
            }
            return true;
          }
          return false;
        })
      : undefined);

  const finalP1Name =
    p1NameCandidate || seedMatchByCompetitors?.player1_name || 'Oyunçu 1';
  const finalP2Name =
    p2NameCandidate || seedMatchByCompetitors?.player2_name || 'Oyunçu 2';

  const player1Obj = toCompetitorProfile(
    joinedP1?.full_name ? { ...resolvedP1Profile, ...joinedP1 } : resolvedP1Profile,
    raw?.player1_id || seedMatchByCompetitors?.player1_id,
    finalP1Name
  );
  const player2Obj = toCompetitorProfile(
    joinedP2?.full_name ? { ...resolvedP2Profile, ...joinedP2 } : resolvedP2Profile,
    raw?.player2_id || seedMatchByCompetitors?.player2_id,
    finalP2Name
  );

  const p1Id = raw?.player1_id || player1Obj?.id || seedMatchByCompetitors?.player1_id || '';
  const p2Id = raw?.player2_id || player2Obj?.id || seedMatchByCompetitors?.player2_id || '';

  const p1Won = p1Score >= p2Score;
  const winnerId = raw?.winner_id || (p1Won ? p1Id : p2Id) || null;

  const rawEloDelta = Math.abs(
    Number(
      raw?.elo_delta ??
        (p1Won ? raw?.player1_elo_delta : raw?.player2_elo_delta) ??
        seedMatchByCompetitors?.elo_delta ??
        0
    )
  );

  const p1EloBefore = Number(
    raw?.player1_elo_before ??
      seedMatchByCompetitors?.player1_elo_before ??
      player1Obj?.current_elo ??
      250
  );
  const p2EloBefore = Number(
    raw?.player2_elo_before ??
      seedMatchByCompetitors?.player2_elo_before ??
      player2Obj?.current_elo ??
      250
  );
  const p1EloAfter = Number(
    raw?.player1_elo_after ??
      seedMatchByCompetitors?.player1_elo_after ??
      (p1Won ? p1EloBefore + rawEloDelta : Math.max(0, p1EloBefore - Math.round(rawEloDelta * 0.5)))
  );
  const p2EloAfter = Number(
    raw?.player2_elo_after ??
      seedMatchByCompetitors?.player2_elo_after ??
      (!p1Won ? p2EloBefore + rawEloDelta : Math.max(0, p2EloBefore - Math.round(rawEloDelta * 0.5)))
  );

  const p1Delta =
    typeof raw?.player1_elo_delta === 'number'
      ? raw.player1_elo_delta
      : typeof seedMatchByCompetitors?.player1_elo_delta === 'number'
      ? seedMatchByCompetitors.player1_elo_delta
      : p1EloAfter !== p1EloBefore
      ? p1EloAfter - p1EloBefore
      : p1Won
      ? rawEloDelta
      : -rawEloDelta;

  const p2Delta =
    typeof raw?.player2_elo_delta === 'number'
      ? raw.player2_elo_delta
      : typeof seedMatchByCompetitors?.player2_elo_delta === 'number'
      ? seedMatchByCompetitors.player2_elo_delta
      : p2EloAfter !== p2EloBefore
      ? p2EloAfter - p2EloBefore
      : !p1Won
      ? rawEloDelta
      : -rawEloDelta;

  const rawSetScores = (raw?.set_scores || '').trim();
  const isSimpleSummaryOnly = /^\d+\s*[-:]\s*\d+$/.test(rawSetScores) && Number(rawSetScores.split(/[-:]/)[0]) <= 4;
  const setScores =
    (!rawSetScores || isSimpleSummaryOnly) && seedMatchByCompetitors?.set_scores
      ? seedMatchByCompetitors.set_scores
      : rawSetScores || `${p1Score}-${p2Score}`;

  const stage = raw?.stage || seedMatchByCompetitors?.stage || undefined;
  const tournamentId = raw?.tournament_id ?? seedMatchByCompetitors?.tournament_id ?? null;
  const tournamentTitle =
    raw?.tournament_title ||
    seedMatchByCompetitors?.tournament_title ||
    (tournamentId ? '"Zəfər Günü" Foundation Kuboku' : null);

  const loggedById = raw?.logged_by || p1Id;
  const loggedByProfile = lookupProfile(loggedById, raw?.logged_by_name);
  const loggedByName =
    raw?.logged_by_name ||
    loggedByProfile?.full_name ||
    seedMatchByCompetitors?.logged_by_name ||
    finalP1Name;

  const matchDate =
    raw?.match_date ||
    raw?.created_at ||
    seedMatchByCompetitors?.match_date ||
    new Date().toISOString();

  return {
    ...raw,
    id: raw?.id || seedMatchByCompetitors?.id || '',
    tournament_id: tournamentId,
    tournament_title: tournamentTitle,
    winner_id: winnerId,
    player1_id: p1Id,
    player1_name: finalP1Name,
    player1: player1Obj,
    player2_id: p2Id,
    player2_name: finalP2Name,
    player2: player2Obj,
    logged_by: loggedById,
    logged_by_name: loggedByName,
    player1_score: p1Score,
    player2_score: p2Score,
    set_scores: setScores,
    player1_elo_before: p1EloBefore,
    player2_elo_before: p2EloBefore,
    player1_elo_after: p1EloAfter,
    player2_elo_after: p2EloAfter,
    player1_elo_delta: p1Delta,
    player2_elo_delta: p2Delta,
    elo_delta: rawEloDelta || Math.max(Math.abs(p1Delta), Math.abs(p2Delta)),
    status: raw?.status || 'confirmed',
    stage,
    auto_approved: Boolean(raw?.auto_approved ?? seedMatchByCompetitors?.auto_approved ?? true),
    created_at: raw?.created_at || matchDate,
    match_date: matchDate,
  };
}

/**
 * Relational query fetching live/recent matches with joined competitor profiles.
 */
export async function fetchLiveRecentMatches(
  limit: number = 10,
  resolveProfile?: (idOrName: string) => PlayerProfile | undefined
): Promise<MatchRecord[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return INITIAL_MATCHES.slice(0, limit).map((m) => hydrateMatchCompetitors(m, resolveProfile));
  }

  try {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        id,
        player1_id,
        player2_id,
        player1_name,
        player2_name,
        logged_by,
        logged_by_name,
        player1_score,
        player2_score,
        set_scores,
        status,
        stage,
        created_at,
        match_date,
        tournament_id,
        tournament_title,
        winner_id,
        elo_delta,
        player1_elo_before,
        player2_elo_before,
        player1_elo_after,
        player2_elo_after,
        player1_elo_delta,
        player2_elo_delta,
        auto_approved,
        player1:profiles!player1_id (id, full_name, slug, elo_rating, current_elo, department, major_faculty),
        player2:profiles!player2_id (id, full_name, slug, elo_rating, current_elo, department, major_faculty)
      `)
      .in('status', ['confirmed', 'approved'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && Array.isArray(data) && data.length > 0) {
      return data
        .map((row) => hydrateMatchCompetitors(row, resolveProfile))
        .filter((m) => {
          const p1 = (m.player1_name || '').toLowerCase();
          const p2 = (m.player2_name || '').toLowerCase();
          return (
            !p1.includes('adəm rəhimli') &&
            !p1.includes('adem rehimli') &&
            !p2.includes('adəm rəhimli') &&
            !p2.includes('adem rehimli')
          );
        });
    }
  } catch (err) {
    console.warn('[BHOS Matches] Joined query fallback:', err);
  }

  return INITIAL_MATCHES.slice(0, limit).map((m) => hydrateMatchCompetitors(m, resolveProfile));
}

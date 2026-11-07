import { NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../lib/supabase/client';
import { INITIAL_MATCHES } from '../../../lib/data/mockData';
import { hydrateMatchCompetitors } from '../../../lib/data/matches';

export const revalidate = 15;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const idParam = searchParams.get('id');
  const limit = limitParam ? Math.max(1, Math.min(200, parseInt(limitParam, 10) || 10)) : 10;

  const supabase = getSupabaseClient();
  if (!supabase) {
    const hydrated = INITIAL_MATCHES.map((m) => hydrateMatchCompetitors(m));
    const filtered = idParam ? hydrated.filter((m) => m.id === idParam) : hydrated.slice(0, limit);
    return NextResponse.json(
      { data: filtered, total: filtered.length },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
        },
      }
    );
  }

  try {
    let query = supabase
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
      .order('created_at', { ascending: false });

    if (idParam) {
      query = query.eq('id', idParam).limit(1);
    } else {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (!error && Array.isArray(data) && data.length > 0) {
      const hydrated = data
        .map((row) => hydrateMatchCompetitors(row))
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

      return NextResponse.json(
        { data: hydrated, total: hydrated.length },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
          },
        }
      );
    }
  } catch (err) {
    console.warn('[API /api/matches] Error fetching joined matches:', err);
  }

  const hydratedFallback = INITIAL_MATCHES.map((m) => hydrateMatchCompetitors(m));
  const filteredFallback = idParam
    ? hydratedFallback.filter((m) => m.id === idParam)
    : hydratedFallback.slice(0, limit);

  return NextResponse.json(
    { data: filteredFallback, total: filteredFallback.length },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
      },
    }
  );
}

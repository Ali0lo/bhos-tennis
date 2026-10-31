import { NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../lib/supabase/client';
import { INITIAL_PROFILES } from '../../../lib/data/mockData';

export const revalidate = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const pageParam = searchParams.get('page');

  const limit = limitParam ? Math.max(1, Math.min(500, parseInt(limitParam, 10) || 25)) : undefined;
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
  const rangeFrom = limit ? (page - 1) * limit : undefined;
  const rangeTo = limit && rangeFrom !== undefined ? rangeFrom + limit - 1 : undefined;

  const supabase = getSupabaseClient();
  if (!supabase) {
    const fallback =
      rangeFrom !== undefined && rangeTo !== undefined
        ? INITIAL_PROFILES.slice(rangeFrom, rangeTo + 1)
        : INITIAL_PROFILES;
    return NextResponse.json(
      { data: fallback, page, limit: limit ?? INITIAL_PROFILES.length, total: INITIAL_PROFILES.length },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  }

  let query = supabase
    .from('leaderboard_standings')
    .select('id, full_name, faculty, current_elo, avatar_url, origin, total_matches, wins, win_rate', {
      count: 'exact',
    })
    .order('current_elo', { ascending: false });

  if (rangeFrom !== undefined && rangeTo !== undefined) {
    query = query.range(rangeFrom, rangeTo);
  }

  const { data, error, count } = await query;

  if (!error && data) {
    return NextResponse.json(
      { data, page, limit: limit ?? data.length, total: count ?? data.length },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  }

  let fallbackQuery = supabase
    .from('profiles')
    .select(
      'id, full_name, major_faculty, current_elo, avatar_url, origin, matches_played, wins, losses, status, is_verified',
      { count: 'exact' }
    )
    .order('current_elo', { ascending: false });

  if (rangeFrom !== undefined && rangeTo !== undefined) {
    fallbackQuery = fallbackQuery.range(rangeFrom, rangeTo);
  }

  const { data: profilesData, count: fallbackCount } = await fallbackQuery;
  const safeData = profilesData || [];
  return NextResponse.json(
    { data: safeData, page, limit: limit ?? safeData.length, total: fallbackCount ?? safeData.length },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    }
  );
}


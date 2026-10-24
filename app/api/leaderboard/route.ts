import { NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../lib/supabase/client';
import { INITIAL_PROFILES } from '../../../lib/data/mockData';

export const revalidate = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.max(1, Math.min(100, parseInt(limitParam, 10) || 0)) : undefined;

  const supabase = getSupabaseClient();
  if (!supabase) {
    const fallback = limit ? INITIAL_PROFILES.slice(0, limit) : INITIAL_PROFILES;
    return NextResponse.json(
      { data: fallback },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  }

  let query = supabase
    .from('leaderboard_standings')
    .select('id, full_name, faculty, current_elo, avatar_url, origin, total_matches, wins, win_rate')
    .order('current_elo', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (!error && data) {
    return NextResponse.json(
      { data },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  }

  let fallbackQuery = supabase
    .from('profiles')
    .select('id, full_name, major_faculty, current_elo, avatar_url, origin, matches_played, wins, losses, status, is_verified')
    .order('current_elo', { ascending: false });

  if (limit) {
    fallbackQuery = fallbackQuery.limit(limit);
  }

  const { data: profilesData } = await fallbackQuery;
  return NextResponse.json(
    { data: profilesData || [] },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    }
  );
}

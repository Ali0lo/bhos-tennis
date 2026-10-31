import { NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../lib/supabase/client';
import { INITIAL_PROFILES } from '../../../lib/data/mockData';
import {
  getProfileDepartment,
  isAllDepartmentsFilter,
  matchesDepartmentFilter,
  resolveCanonicalDepartment,
} from '../../../lib/data/types';

export const revalidate = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const pageParam = searchParams.get('page');
  const departmentParam =
    searchParams.get('department') ||
    searchParams.get('faculty') ||
    searchParams.get('major') ||
    '';

  const limit = limitParam ? Math.max(1, Math.min(500, parseInt(limitParam, 10) || 25)) : undefined;
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
  const rangeFrom = limit ? (page - 1) * limit : undefined;
  const rangeTo = limit && rangeFrom !== undefined ? rangeFrom + limit - 1 : undefined;
  const hasDepartmentFilter = !isAllDepartmentsFilter(departmentParam);

  const normalizeRow = (row: any) => {
    const rawDept = getProfileDepartment(row);
    const canonicalDept = resolveCanonicalDepartment(rawDept) || rawDept || 'Computer Engineering';
    return {
      ...row,
      major_faculty: row.major_faculty || canonicalDept,
      faculty: row.faculty || canonicalDept,
      department: canonicalDept,
    };
  };

  const applyFilterAndSlice = (rows: any[]) => {
    const normalizedRows = rows.map(normalizeRow);
    const filtered = hasDepartmentFilter
      ? normalizedRows.filter((row) => matchesDepartmentFilter(row, departmentParam))
      : normalizedRows;
    const total = filtered.length;
    const sliced =
      rangeFrom !== undefined && rangeTo !== undefined
        ? filtered.slice(rangeFrom, rangeTo + 1)
        : filtered;
    return { data: sliced, total };
  };

  const supabase = getSupabaseClient();
  if (!supabase) {
    const { data: fallback, total } = applyFilterAndSlice(INITIAL_PROFILES);
    return NextResponse.json(
      { data: fallback, page, limit: limit ?? fallback.length, total },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  }

  const { data, error } = await supabase
    .from('leaderboard_standings')
    .select('*')
    .order('current_elo', { ascending: false });

  if (!error && data) {
    const { data: resultData, total } = applyFilterAndSlice(data);
    return NextResponse.json(
      { data: resultData, page, limit: limit ?? resultData.length, total },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  }

  const { data: profilesData } = await supabase
    .from('profiles')
    .select(
      'id, full_name, email, major_faculty, admission_year, user_type, gender, role, current_elo, avatar_url, origin, matches_played, wins, losses, status, is_verified'
    )
    .order('current_elo', { ascending: false });

  const { data: safeData, total: fallbackTotal } = applyFilterAndSlice(profilesData || []);
  return NextResponse.json(
    { data: safeData, page, limit: limit ?? safeData.length, total: fallbackTotal },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    }
  );
}



import { NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../lib/supabase/client';
import { INITIAL_PROFILES } from '../../../lib/data/mockData';
import {
  getProfileDepartment,
  isAllDepartmentsFilter,
  matchesDepartmentFilter,
  resolveCanonicalDepartment,
} from '../../../lib/utils/department';

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
    const wins = Number(row.wins ?? 0);
    const losses = Number(row.losses ?? 0);
    const matchesPlayed =
      wins + losses > 0
        ? Math.max(Number(row.matches_played ?? row.total_matches ?? 0), wins + losses)
        : Number(row.matches_played ?? row.total_matches ?? 0);
    const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;
    const yearOfStudy = row.year_of_study ?? row.admission_year ?? null;
    const isFoundation =
      Number(yearOfStudy) === 2026 ||
      Number(row.admission_year) === 2026 ||
      row.is_foundation === true ||
      row.department?.toLowerCase().includes('foundation') ||
      row.department?.toLowerCase().includes('hazirliq') ||
      row.faculty?.toLowerCase().includes('foundation') ||
      row.major_faculty?.toLowerCase().includes('foundation') ||
      row.group?.toLowerCase().startsWith('f-') ||
      row.group?.toLowerCase().startsWith('fnd-');

    const emailLower = (row.email || '').trim().toLowerCase();
    const nameLower = (row.full_name || '').trim().toLowerCase();
    const isCoachIftixar =
      row.role === 'coach' ||
      emailLower === 'iftixar.coach@gmail.com' ||
      emailLower === 'iftixar@bhos.edu.az' ||
      nameLower.includes('iftixar') ||
      nameLower.includes('i̇ftixar');

    const rawElo = Number(row.current_elo ?? row.elo_rating ?? 0);
    const currentElo = isCoachIftixar && (rawElo === 999 || rawElo === 0) ? 966 : rawElo;

    return {
      ...row,
      current_elo: currentElo,
      elo_rating: currentElo,
      matches_played: matchesPlayed,
      wins,
      losses,
      win_rate: winRate,
      year_of_study: yearOfStudy,
      is_foundation: isFoundation,
      major_faculty: row.major_faculty || (isFoundation ? 'Foundation' : canonicalDept),
      faculty: row.faculty || row.major_faculty || (isFoundation ? 'Foundation' : canonicalDept),
      department: row.department || (isFoundation ? 'Foundation' : row.major_faculty || canonicalDept),
      major: row.major || row.major_faculty || canonicalDept,
      group: row.group || (isFoundation ? 'Foundation / 2026' : ''),
    };
  };

  const applyFilterAndSlice = (rows: any[]) => {
    const normalizedRows = rows
      .map(normalizeRow)
      .sort((a, b) => Number(b.current_elo ?? 0) - Number(a.current_elo ?? 0));
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

  let profilesQuery = supabase
    .from('profiles')
    .select('*')
    .order('current_elo', { ascending: false });

  if (hasDepartmentFilter && departmentParam.trim().toLowerCase() === 'foundation') {
    profilesQuery = profilesQuery.or(
      'department.ilike.%foundation%,department.ilike.%hazirliq%,major_faculty.ilike.%foundation%,admission_year.eq.2026,year_of_study.eq.2026'
    );
  }

  const { data: profilesData } = await profilesQuery;

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



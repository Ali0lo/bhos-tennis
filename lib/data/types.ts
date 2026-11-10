import { foldDepartmentAscii } from '../utils/department';

export type UserRole = 'player' | 'coach' | 'president';

export type UserType = 'student' | 'teacher' | 'staff' | 'alumni';

export type PlayingStyle = 
  | 'Shakehand Offensive'
  | 'Shakehand All-round'
  | 'Shakehand Defensive'
  | 'Penhold Offensive'
  | 'Penhold All-round';

export type BHOSFaculty =
  | 'Information Security'
  | 'Computer Engineering'
  | 'Computer Science'
  | 'Data Analytics'
  | 'Chemical Engineering'
  | 'Petroleum Engineering'
  | 'Process Automation'
  | 'Business Administration'
  | 'Finance';

export type PlayingLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface PlayerProfile {
  id: string;
  full_name: string;
  /** Human-readable URL slug (e.g. "ali-iskandarli"). Optional for legacy rows. */
  slug?: string | null;
  email: string;
  major_faculty: BHOSFaculty | string;
  faculty?: string;
  department?: string;
  major?: string;
  group?: string;
  admission_year?: number | null;
  year_of_study?: number | null;
  is_foundation?: boolean;
  user_type?: UserType | string;
  gender?: 'female' | 'male' | 'other';
  role: UserRole;
  playing_level?: PlayingLevel | string;
  playing_style: PlayingStyle | string;
  racket?: string | null;
  blade_equipment: string;
  forehand_rubber: string;
  backhand_rubber: string;
  current_elo: number;
  elo_rating?: number;
  peak_elo?: number;
  matches_played: number;
  wins: number;
  losses: number;
  win_rate?: number;
  status?: 'pending' | 'approved' | string;
  origin?: 'İlkin Heyət' | 'Qeydiyyat' | string;
  is_verified?: boolean;
  is_active: boolean;
  avatar_url?: string;
  rank?: number;
  rank_change?: number;
  created_at: string;
  updated_at?: string;
}

export interface MatchCompetitorProfile {
  id: string;
  full_name: string;
  slug?: string | null;
  elo_rating?: number | null;
  current_elo?: number | null;
  department?: string | null;
  major_faculty?: string | null;
  avatar_url?: string | null;
}

export interface MatchRecord {
  id: string;
  tournament_id?: string | null;
  tournament_title?: string | null;
  round_number?: number | null;
  bracket_node_index?: number | null;
  next_match_id?: string | null;
  is_bye?: boolean;
  winner_id?: string | null;
  player1_id: string;
  player1_name?: string;
  player1?: MatchCompetitorProfile | null;
  player2_id: string;
  player2_name?: string;
  player2?: MatchCompetitorProfile | null;
  logged_by: string;
  logged_by_name?: string;
  player1_score: number;
  player2_score: number;
  set_scores: string;
  player1_elo_before: number;
  player2_elo_before: number;
  player1_elo_after: number;
  player2_elo_after: number;
  player1_elo_delta?: number;
  player2_elo_delta?: number;
  elo_delta: number;
  status?: 'confirmed' | 'approved' | 'pending' | 'rejected' | 'waiting' | 'scheduled' | string;
  stage?: string;
  is_disputed?: boolean;
  auto_approved?: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string;
  match_date: string;
}

export function isAutoApprovedMatch(match: MatchRecord): boolean {
  if (match.auto_approved === true) return true;
  if (match.approved_by === '00000000-0000-0000-0000-000000000000') return true;
  return false;
}

export type TournamentFormat = 'single_elimination' | 'round_robin' | 'groups_and_knockout';
export type TournamentStatus =
  | 'upcoming'
  | 'registration'
  | 'ongoing'
  | 'in_progress'
  | 'active'
  | 'completed';

export interface BracketMatch {
  id: string;
  roundIndex: number;
  matchIndex: number;
  round_number?: number;
  bracket_node_index?: number;
  player1?: PlayerProfile | null;
  player2?: PlayerProfile | null;
  player1_score?: number;
  player2_score?: number;
  set_scores?: string;
  winner_id?: string;
  nextMatchId?: string;
  next_match_id?: string;
  nextMatchSlot?: 1 | 2;
  is_bye?: boolean;
  advancedSlot?: 1 | 2;
  advancedAt?: number;
  status: 'pending' | 'waiting' | 'ready' | 'scheduled' | 'completed' | 'approved';
}

export interface GroupMatch {
  id: string;
  groupId: string;
  player1: PlayerProfile;
  player2: PlayerProfile;
  player1_score?: number;
  player2_score?: number;
  set_scores?: string;
  winner_id?: string;
  status: 'pending' | 'ready' | 'completed';
}

export interface TournamentGroup {
  id: string;
  name: string;
  players: PlayerProfile[];
  matches: GroupMatch[];
  top_seed_id?: string;
}

export interface TournamentSettingsConfig {
  group_size: number;
  group_size_label?: string;
  advance_per_group: number;
  location?: string;
  registration_url?: string;
  allowed_admission_year?: number | null;
  best_of_sets?: number;
  point_weight?: number;
  top_seed_ids?: string[];
  seeding_guarantee?: string;
}

export interface Tournament {
  id: string;
  title: string;
  slug: string;
  description: string;
  custom_rules: string;
  format: TournamentFormat;
  max_participants: number;
  status: TournamentStatus;
  start_date: string;
  end_date?: string;
  created_by: string | null;
  winner_id?: string | null;
  runner_up_id?: string | null;
  third_place_id?: string | null;
  group_size?: number;
  advance_per_group?: number;
  point_weight?: number;
  location?: string;
  registration_url?: string;
  allowed_admission_year?: number | null;
  bracket_data?: {
    rounds: {
      name: string;
      matches: BracketMatch[];
    }[];
    third_place_match?: BracketMatch;
    podium?: {
      first?: PlayerProfile;
      second?: PlayerProfile;
      third?: PlayerProfile;
    };
    groups?: TournamentGroup[];
    settings?: TournamentSettingsConfig;
  };
  participants?: string[];
  created_at: string;
}

export type TablePurpose = 'free_play' | 'coaching' | 'tournament';
export type ReservationStatus = 'confirmed' | 'cancelled';

export interface TableReservation {
  id: string;
  table_number: number;
  reserved_by: string;
  reserved_by_name?: string;
  reserved_by_role?: UserRole;
  slot_date: string;
  start_time: string;
  end_time: string;
  purpose: TablePurpose;
  status: ReservationStatus;
  notes?: string;
  created_at: string;
}

export interface EloHistoryPoint {
  date: string;
  elo: number;
  matchId?: string;
  opponentName?: string;
  result?: 'W' | 'L';
  delta?: number;
}

export const DEFAULT_MEMBER_EMAILS = [
  'ali.iskandarli.std@bhos.edu.az',
  'iftixar.coach@gmail.com',
  'ali.abdulov.std@bhos.edu.az',
  'ali.aghayev.std@bhos.edu.az',
  'huseyn.muradzade.std@bhos.edu.az',
  'fateh.mammadli.std@bhos.edu.az',
  'rinad.evezzade.std@bhos.edu.az',
  'anar.alakbarli.std@bhos.edu.az',
  'nihat.ismayilzade.std@bhos.edu.az',
];

export function isDefaultMember(id?: string | null, email?: string | null): boolean {
  if (id && (id.startsWith('p-') || id.startsWith('00000000-0000-0000-0000-'))) {
    return true;
  }
  if (email && DEFAULT_MEMBER_EMAILS.includes(email.toLowerCase().trim())) {
    return true;
  }
  return false;
}

export function getProfileOrigin(profile?: PlayerProfile | null): 'İlkin Heyət' | 'Qeydiyyat' {
  if (!profile) return 'Qeydiyyat';
  if (profile.origin === 'İlkin Heyət') return 'İlkin Heyət';
  if (profile.origin === 'Qeydiyyat') return 'Qeydiyyat';
  return isDefaultMember(profile.id, profile.email) ? 'İlkin Heyət' : 'Qeydiyyat';
}

export function isProfilePending(profile?: PlayerProfile | null): boolean {
  if (!profile) return false;
  if (profile.role === 'president' || profile.role === 'coach') return false;
  if (isDefaultMember(profile.id, profile.email)) return false;
  if (profile.status === 'pending') return true;
  if (profile.status === 'approved') return false;
  if (profile.is_verified === false) return true;
  return false;
}

export function isProfileApproved(profile?: PlayerProfile | null): boolean {
  if (!profile) return false;
  return !isProfilePending(profile);
}

export function isPresidentBadgeHolder(profile?: PlayerProfile | null): boolean {
  if (!profile) return false;
  if (profile.role === 'president') return true;
  const email = (profile.email || '').trim().toLowerCase();
  if (
    email === 'ali.iskandarli.std@bhos.edu.az' ||
    email === 'ali.iskandarli@bhos.edu.az' ||
    email.startsWith('fidan.abdullayeva')
  ) {
    return true;
  }
  const foldedName = foldDepartmentAscii(profile.full_name || '');
  if (foldedName === 'fidanabdullayeva') {
    return true;
  }
  return false;
}

export function canAccessAdminPanel(profile?: PlayerProfile | null): boolean {
  if (!profile) return false;
  if (profile.role === 'coach') return true;
  const email = (profile.email || '').trim().toLowerCase();
  if (
    email === 'ali.iskandarli.std@bhos.edu.az' ||
    email === 'ali.iskandarli@bhos.edu.az' ||
    email === 'iftixar.coach@gmail.com' ||
    email === 'iftixar@bhos.edu.az'
  ) {
    return true;
  }
  if (
    profile.id === 'p-1' ||
    profile.id === 'p-2' ||
    profile.id === '00000000-0000-0000-0000-000000000001' ||
    profile.id === '00000000-0000-0000-0000-000000000002'
  ) {
    return true;
  }
  const foldedName = foldDepartmentAscii(profile.full_name || '');
  if (foldedName === 'aliiskandarli' || foldedName === 'eliisgenderli') {
    return true;
  }
  return false;
}

export function isTournamentOrganizerOrAdmin(
  profile?: PlayerProfile | null,
  tournament?: Tournament | null
): boolean {
  if (!profile) return false;
  if (canAccessAdminPanel(profile)) return true;
  if (profile.role === 'president' || profile.role === 'coach') return true;
  if ((profile as any).is_admin) return true;
  if (
    tournament &&
    tournament.created_by &&
    (tournament.created_by === profile.id || tournament.created_by === profile.email)
  ) {
    return true;
  }
  return false;
}

export function formatDateTimeAz(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatTournamentDateAz(dateStr?: string | null): string {
  if (!dateStr) return '7 Noyabr 2026 (Şənbə) • 10:00';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const months = [
    'Yanvar',
    'Fevral',
    'Mart',
    'Aprel',
    'May',
    'İyun',
    'İyul',
    'Avqust',
    'Sentyabr',
    'Oktyabr',
    'Noyabr',
    'Dekabr',
  ];
  const weekDays = [
    'Bazar',
    'Bazar ertəsi',
    'Çərşənbə axşamı',
    'Çərşənbə',
    'Cümə axşamı',
    'Cümə',
    'Şənbə',
  ];
  const month = months[d.getMonth()];
  const weekDay = weekDays[d.getDay()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} (${weekDay}) • ${hours}:${minutes}`;
}

export {
  normalizeDepartmentText,
  stripPunctuation,
  normalizeDepartment,
  foldDepartmentAscii,
  isAllDepartmentsFilter,
  resolveCanonicalDepartment,
  getProfileDepartment,
  matchesDepartmentFilter,
  DEFAULT_EMAIL_DEPARTMENT_MAP,
  CANONICAL_DEPARTMENT_DISPLAY,
} from '../utils/department';
export type { CanonicalDepartmentKey } from '../utils/department';


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
  email: string;
  major_faculty: BHOSFaculty | string;
  admission_year?: number | null;
  user_type?: UserType | string;
  gender?: 'female' | 'male' | 'other';
  role: UserRole;
  playing_level?: PlayingLevel | string;
  playing_style: PlayingStyle | string;
  blade_equipment: string;
  forehand_rubber: string;
  backhand_rubber: string;
  current_elo: number;
  matches_played: number;
  wins: number;
  losses: number;
  is_verified?: boolean;
  is_active: boolean;
  avatar_url?: string;
  rank?: number;
  rank_change?: number;
  created_at: string;
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
  player2_id: string;
  player2_name?: string;
  logged_by: string;
  logged_by_name?: string;
  player1_score: number;
  player2_score: number;
  set_scores: string;
  player1_elo_before: number;
  player2_elo_before: number;
  player1_elo_after: number;
  player2_elo_after: number;
  elo_delta: number;
  status?: 'confirmed' | 'approved' | 'pending' | 'rejected' | 'waiting' | 'scheduled' | string;
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
export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed';

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
  bracket_data?: {
    rounds: {
      name: string;
      matches: BracketMatch[];
    }[];
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

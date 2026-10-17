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
  | 'Chemical Engineering'
  | 'Petroleum Engineering'
  | 'Process Automation';

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
  tournament_title?: string;
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
  status?: 'confirmed' | 'pending' | 'rejected' | string;
  match_date: string;
}

export type TournamentFormat = 'single_elimination' | 'round_robin' | 'groups_and_knockout';
export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed';

export interface BracketMatch {
  id: string;
  roundIndex: number;
  matchIndex: number;
  player1?: PlayerProfile | null;
  player2?: PlayerProfile | null;
  player1_score?: number;
  player2_score?: number;
  set_scores?: string;
  winner_id?: string;
  nextMatchId?: string;
  nextMatchSlot?: 1 | 2;
  status: 'pending' | 'ready' | 'completed';
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

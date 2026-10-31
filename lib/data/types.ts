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
  faculty?: string;
  department?: string;
  major?: string;
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

export function formatDateTimeAz(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const normalizeDepartment = (str?: string | null): string =>
  str?.trim().toLowerCase().replace(/[\s_-]+/g, '') || '';

export const foldDepartmentAscii = (str?: string | null): string =>
  (str || '')
    .trim()
    .toLowerCase()
    .replace(/i̇/g, 'i')
    .replace(/ə/g, 'e')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/[\s_.\-–—/(),]+/g, '');

const ALL_DEPARTMENT_TOKENS = new Set([
  '',
  'all',
  'hamısı',
  'hamisi',
  'bütünfakültələr',
  'butunfakulteler',
  'bütünfakültələr/kafedralar',
  'butunfakulteler/kafedralar',
  'bütünfakültələrinəməkdaşları',
]);

export function isAllDepartmentsFilter(filterValue?: string | null): boolean {
  if (!filterValue) return true;
  const norm = normalizeDepartment(filterValue);
  const folded = foldDepartmentAscii(filterValue);
  return (
    ALL_DEPARTMENT_TOKENS.has(norm) ||
    ALL_DEPARTMENT_TOKENS.has(folded) ||
    folded === 'all' ||
    folded === 'hamisi'
  );
}

const DEPARTMENT_CANONICAL_ALIASES: Record<string, string[]> = {
  'Information Security': [
    'information security',
    'information_security',
    'informationsecurity',
    'infosec',
    'is',
    'informasiya təhlükəsizliyi',
    'informasiya tehlukesizliyi',
    'informasiya təhl.',
    'informasiya təhl',
    'informasiya tehl.',
    'informasiya tehl',
    'kibertəhlükəsizlik',
    'kibertehlukesizlik',
    'cybersecurity',
    'cyber security',
    'информационная безопасность',
  ],
  'Computer Engineering': [
    'computer engineering',
    'computer_engineering',
    'computerengineering',
    'compeng',
    'ce',
    'kompüter mühəndisliyi',
    'komputer muhendisliyi',
    'kompüter müh.',
    'kompüter müh',
    'komputer muh.',
    'komputer muh',
    'компьютерная инженерия',
  ],
  'Computer Science': [
    'computer science',
    'computer_science',
    'computerscience',
    'cs',
    'kompüter elmləri',
    'komputer elmleri',
    'kompüter elm.',
    'компьютерные науки',
  ],
  'Data Analytics': [
    'data analytics',
    'data_analytics',
    'dataanalytics',
    'data science',
    'da',
    'data analitikası',
    'data analitikasi',
    'verilənlərin analitikası',
    'verilenlerin analitikasi',
    'аналитика данных',
  ],
  'Chemical Engineering': [
    'chemical engineering',
    'chemical_engineering',
    'chemicalengineering',
    'chemeng',
    'che',
    'chem',
    'kimya mühəndisliyi',
    'kimya muhendisliyi',
    'kimya müh.',
    'kimya müh',
    'kimya muh.',
    'kimya muh',
    'химическая инженерия',
  ],
  'Petroleum Engineering': [
    'petroleum engineering',
    'petroleum_engineering',
    'petroleumengineering',
    'oil and gas engineering',
    'pete',
    'pe',
    'oge',
    'neft-qaz mühəndisliyi',
    'neft qaz mühəndisliyi',
    'neft-qaz muhendisliyi',
    'neft qaz muhendisliyi',
    'neft-qaz müh.',
    'neft-qaz müh',
    'neft qaz muh.',
    'neft qaz muh',
    'нефтегазовая инженерия',
  ],
  'Process Automation': [
    'process automation',
    'process_automation',
    'processautomation',
    'process automation engineering',
    'process_automation_engineering',
    'processautomationengineering',
    'pam',
    'pae',
    'pa',
    'proseslərin avtomatlaşdırılması',
    'proseslerin avtomatlasdirilmasi',
    'proseslərin avtomatlaşdırılması mühəndisliyi',
    'proseslerin avtomatlasdirilmasi muhendisliyi',
    'proseslərin avtomatlaşdırılması müh.',
    'proseslerin avtomatlasdirilmasi muh',
    'автоматизация процессов',
    'инженерия автоматизации процессов',
  ],
  'Business Administration': [
    'business administration',
    'business_administration',
    'businessadministration',
    'mba',
    'bba',
    'ba',
    'biznesin idarə edilməsi',
    'biznesin idare edilmesi',
    'biznesin idarə olunması',
    'управление бизнесом',
  ],
  Finance: [
    'finance',
    'fin',
    'maliyyə',
    'maliyye',
    'финансы',
  ],
  'İdman Klubu': [
    'idman klubu',
    'i̇dman klubu',
    'sports club',
    'sport club',
    'bədən tərbiyəsi və idman',
    'спортивный клуб',
  ],
  'İnzibati Heyət / Dekanlıq': [
    'inzibati heyət / dekanlıq',
    'inzibati heyet / dekanliq',
    'inzibati heyət',
    'dekanlıq',
    'administration',
    'dean office',
  ],
};

const NORMALIZED_TO_CANONICAL = new Map<string, string>();
Object.entries(DEPARTMENT_CANONICAL_ALIASES).forEach(([canonical, aliases]) => {
  NORMALIZED_TO_CANONICAL.set(normalizeDepartment(canonical), canonical);
  NORMALIZED_TO_CANONICAL.set(foldDepartmentAscii(canonical), canonical);
  aliases.forEach((alias) => {
    NORMALIZED_TO_CANONICAL.set(normalizeDepartment(alias), canonical);
    NORMALIZED_TO_CANONICAL.set(foldDepartmentAscii(alias), canonical);
  });
});

const DEFAULT_EMAIL_DEPARTMENT_MAP: Record<string, string> = {
  'iftixar.coach@gmail.com': 'İdman Klubu',
  'ali.iskandarli.std@bhos.edu.az': 'Computer Engineering',
  'ali.iskandarli@bhos.edu.az': 'Computer Engineering',
  'ali.abdulov.std@bhos.edu.az': 'Computer Engineering',
  'ali.aghayev.std@bhos.edu.az': 'Process Automation Engineering',
  'huseyn.muradzade.std@bhos.edu.az': 'Computer Engineering',
  'fateh.mammadli.std@bhos.edu.az': 'Process Automation Engineering',
  'rinad.evezzade.std@bhos.edu.az': 'Computer Engineering',
  'anar.alakbarli.std@bhos.edu.az': 'Process Automation Engineering',
  'nihat.ismayilzade.std@bhos.edu.az': 'Process Automation Engineering',
};

export function resolveCanonicalDepartment(value?: string | null): string {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  const byNorm = NORMALIZED_TO_CANONICAL.get(normalizeDepartment(trimmed));
  if (byNorm) return byNorm;

  const byFolded = NORMALIZED_TO_CANONICAL.get(foldDepartmentAscii(trimmed));
  if (byFolded) return byFolded;

  const folded = foldDepartmentAscii(trimmed);
  if (folded.includes('komputer') && folded.includes('muh')) return 'Computer Engineering';
  if (folded.includes('computer') && folded.includes('eng')) return 'Computer Engineering';
  if (folded.includes('informasiya') && folded.includes('tehl')) return 'Information Security';
  if (folded.includes('information') && folded.includes('sec')) return 'Information Security';
  if (folded.includes('proses') && folded.includes('avtomat')) return 'Process Automation';
  if (folded.includes('process') && folded.includes('automat')) return 'Process Automation';
  if (folded.includes('kimya') && folded.includes('muh')) return 'Chemical Engineering';
  if (folded.includes('chemical') && folded.includes('eng')) return 'Chemical Engineering';
  if (folded.includes('neft') && folded.includes('qaz')) return 'Petroleum Engineering';
  if (folded.includes('petroleum') && folded.includes('eng')) return 'Petroleum Engineering';
  if (folded.includes('biznes') && folded.includes('idare')) return 'Business Administration';
  if (folded.includes('business') && folded.includes('admin')) return 'Business Administration';
  if (folded.includes('komputer') && folded.includes('elm')) return 'Computer Science';
  if (folded.includes('computer') && folded.includes('sci')) return 'Computer Science';
  if (folded.includes('data') && folded.includes('anal')) return 'Data Analytics';
  if (folded.includes('maliyye') || folded === 'finance') return 'Finance';
  if (folded.includes('idman') && folded.includes('klub')) return 'İdman Klubu';

  return trimmed;
}

export function getProfileDepartment(
  profile?: (Partial<PlayerProfile> & Record<string, any>) | null
): string {
  if (!profile) return '';
  const raw =
    profile.major_faculty ||
    profile.faculty ||
    profile.department ||
    profile.major ||
    '';
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim();
  }
  const email = typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : '';
  if (email && DEFAULT_EMAIL_DEPARTMENT_MAP[email]) {
    return DEFAULT_EMAIL_DEPARTMENT_MAP[email];
  }
  return '';
}

export function matchesDepartmentFilter(
  profileOrDepartment:
    | (Partial<PlayerProfile> & Record<string, any>)
    | string
    | null
    | undefined,
  selectedFilter?: string | null
): boolean {
  if (isAllDepartmentsFilter(selectedFilter)) {
    return true;
  }

  const rawDept =
    typeof profileOrDepartment === 'string'
      ? profileOrDepartment.trim()
      : getProfileDepartment(profileOrDepartment);

  if (!rawDept) {
    return false;
  }

  const canonicalProfile = resolveCanonicalDepartment(rawDept);
  const canonicalFilter = resolveCanonicalDepartment(selectedFilter);

  if (
    canonicalProfile &&
    canonicalFilter &&
    normalizeDepartment(canonicalProfile) === normalizeDepartment(canonicalFilter)
  ) {
    return true;
  }

  const normProfile = normalizeDepartment(rawDept);
  const normFilter = normalizeDepartment(selectedFilter);
  if (!normFilter) return true;
  if (normProfile === normFilter) return true;
  if (normFilter.length >= 3 && (normProfile.includes(normFilter) || normFilter.includes(normProfile))) {
    return true;
  }

  const foldedProfile = foldDepartmentAscii(rawDept);
  const foldedFilter = foldDepartmentAscii(selectedFilter);
  if (foldedProfile === foldedFilter) return true;
  if (
    foldedFilter.length >= 3 &&
    (foldedProfile.includes(foldedFilter) || foldedFilter.includes(foldedProfile))
  ) {
    return true;
  }

  return false;
}


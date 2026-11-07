import { PlayerProfile } from '../data/types';

/**
 * Normalizes any text by folding Azerbaijani/Turkish characters to ASCII,
 * lowercasing, and stripping diacritics.
 * e.g. "Kompüter Mühəndisliyi" -> "komputer muhendisliyi"
 */
export function normalizeDepartmentText(val?: string | null): string {
  if (!val) return '';
  return val
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
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Strips all non-alphanumeric characters after folding diacritics.
 * e.g. "CE-23" -> "ce23", "Neft-Qaz Müh." -> "neftqazmuh"
 */
export function stripPunctuation(val?: string | null): string {
  return normalizeDepartmentText(val).replace(/[^a-z0-9]/g, '');
}

export const normalizeDepartment = (str?: string | null): string =>
  str?.trim().toLowerCase().replace(/[\s_-]+/g, '') || '';

export const foldDepartmentAscii = (str?: string | null): string =>
  stripPunctuation(str);

const ALL_FILTER_KEYWORDS = new Set([
  '',
  'all',
  'hamisi',
  'hamısı',
  'butun',
  'butunfakulteler',
  'butunfakultelerkafedralar',
  'butunfakultelerineemekdaslari',
]);

/**
 * Determines whether a filter represents the "All Departments" option.
 */
export function isAllDepartmentsFilter(filter?: string | null): boolean {
  if (!filter) return true;
  const stripped = stripPunctuation(filter);
  return ALL_FILTER_KEYWORDS.has(stripped) || stripped === 'all' || stripped === 'hamisi';
}

export type CanonicalDepartmentKey =
  | 'CE'
  | 'IS'
  | 'CHE'
  | 'PE'
  | 'PAE'
  | 'BA'
  | 'FOUNDATION'
  | 'CS'
  | 'DA'
  | 'FIN'
  | 'SPORTS';

export const CANONICAL_DEPARTMENT_DISPLAY: Record<CanonicalDepartmentKey, string> = {
  CE: 'Computer Engineering',
  IS: 'Information Security',
  CHE: 'Chemical Engineering',
  PE: 'Petroleum Engineering',
  PAE: 'Process Automation Engineering',
  BA: 'Business Administration',
  FOUNDATION: 'Foundation',
  CS: 'Computer Science',
  DA: 'Data Analytics',
  FIN: 'Finance',
  SPORTS: 'İdman Klubu',
};

export const DEFAULT_EMAIL_DEPARTMENT_MAP: Record<string, string> = {
  'iftixar.coach@gmail.com': 'İdman Klubu',
  'iftixar@bhos.edu.az': 'İdman Klubu',
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

/**
 * Determines which canonical department(s) a raw string or group code belongs to.
 */
export function getCanonicalDepartments(input?: string | null): Set<CanonicalDepartmentKey> {
  const depts = new Set<CanonicalDepartmentKey>();
  if (!input) return depts;

  const norm = normalizeDepartmentText(input);
  const stripped = stripPunctuation(input);
  if (!norm) return depts;

  // 1. Computer Engineering (CE):
  // matches computer engineering, komputer muhendisliyi, komputer muh, ce, komp, or group strings starting with ce- / ce
  if (
    norm === 'ce' ||
    norm === 'komp' ||
    stripped === 'ce' ||
    stripped === 'komp' ||
    stripped === 'computerengineering' ||
    stripped === 'compeng' ||
    stripped === 'komputermuhendisliyi' ||
    stripped === 'komputermuh' ||
    (norm.includes('computer') && (norm.includes('eng') || norm.includes('muh'))) ||
    (norm.includes('komputer') && (norm.includes('muh') || norm.includes('eng'))) ||
    norm.startsWith('ce-') ||
    norm.startsWith('ce_') ||
    norm.startsWith('ce/') ||
    /^ce[-_./\s]?\d+/i.test(norm) ||
    /^ce\d+/i.test(stripped)
  ) {
    depts.add('CE');
  }

  // 2. Information Security (IS):
  // matches information security, informasiya tehlukesizliyi, infoteh, is, pam, or group strings starting with is- / pam-
  if (
    norm === 'is' ||
    norm === 'infosec' ||
    norm === 'infoteh' ||
    norm === 'pam' ||
    stripped === 'is' ||
    stripped === 'infosec' ||
    stripped === 'infoteh' ||
    stripped === 'pam' ||
    stripped === 'informationsecurity' ||
    stripped === 'informasiyatehlukesizliyi' ||
    stripped === 'kibertehlukesizlik' ||
    stripped === 'cybersecurity' ||
    (norm.includes('information') && norm.includes('sec')) ||
    (norm.includes('informasiya') && norm.includes('tehl')) ||
    (norm.includes('kiber') && norm.includes('tehl')) ||
    (norm.includes('cyber') && norm.includes('sec')) ||
    norm.startsWith('is-') ||
    norm.startsWith('pam-') ||
    /^is[-_./\s]?\d+/i.test(norm) ||
    /^is\d+/i.test(stripped) ||
    /^pam[-_./\s]?\d+/i.test(norm) ||
    /^pam\d+/i.test(stripped)
  ) {
    depts.add('IS');
  }

  // 3. Chemical Engineering (ChE):
  // matches chemical engineering, kimya muhendisliyi, kimya muh, che, chem, or group strings starting with che- / ke-
  if (
    norm === 'che' ||
    norm === 'chem' ||
    norm === 'ke' ||
    stripped === 'che' ||
    stripped === 'chem' ||
    stripped === 'chemeng' ||
    stripped === 'chemicalengineering' ||
    stripped === 'kimyamuhendisliyi' ||
    stripped === 'kimyamuh' ||
    stripped === 'ke' ||
    (norm.includes('chemical') && norm.includes('eng')) ||
    (norm.includes('kimya') && (norm.includes('muh') || norm.includes('eng'))) ||
    norm.startsWith('che-') ||
    norm.startsWith('ke-') ||
    /^che[-_./\s]?\d+/i.test(norm) ||
    /^che\d+/i.test(stripped) ||
    /^ke[-_./\s]?\d+/i.test(norm) ||
    /^ke\d+/i.test(stripped)
  ) {
    depts.add('CHE');
  }

  // 4. Petroleum Engineering (PE):
  // matches petroleum engineering, neft-qaz muhendisliyi, neft qaz, pe, or group strings starting with pe- / nqm-
  if (
    norm === 'pe' ||
    norm === 'pete' ||
    norm === 'nqm' ||
    stripped === 'pe' ||
    stripped === 'pete' ||
    stripped === 'nqm' ||
    stripped === 'petroleumengineering' ||
    stripped === 'oilandgasengineering' ||
    stripped === 'neftqazmuhendisliyi' ||
    stripped === 'neftqazmuh' ||
    stripped === 'neftqaz' ||
    norm.includes('petroleum') ||
    (norm.includes('neft') && norm.includes('qaz')) ||
    norm.startsWith('pe-') ||
    norm.startsWith('nqm-') ||
    /^pe[-_./\s]?\d+/i.test(norm) ||
    /^pe\d+/i.test(stripped) ||
    /^nqm[-_./\s]?\d+/i.test(norm) ||
    /^nqm\d+/i.test(stripped)
  ) {
    depts.add('PE');
  }

  // 5. Process Automation Engineering (PAE):
  // matches process automation, proseslerin avtomatlasdirilmasi, pae, pam, or group strings starting with pae- / pam-
  if (
    norm === 'pae' ||
    norm === 'pa' ||
    norm === 'pam' ||
    stripped === 'pae' ||
    stripped === 'pa' ||
    stripped === 'pam' ||
    stripped === 'processautomation' ||
    stripped === 'processautomationengineering' ||
    stripped === 'proseslerinavtomatlasdirilmasi' ||
    stripped === 'proseslerinavtomatlasdirilmasimuhendisliyi' ||
    stripped === 'proseslerinavtomatlasdirilmasimuh' ||
    (norm.includes('process') && norm.includes('automat')) ||
    (norm.includes('proses') && norm.includes('avtomat')) ||
    norm.startsWith('pae-') ||
    norm.startsWith('pam-') ||
    /^pae[-_./\s]?\d+/i.test(norm) ||
    /^pae\d+/i.test(stripped) ||
    /^pam[-_./\s]?\d+/i.test(norm) ||
    /^pam\d+/i.test(stripped)
  ) {
    depts.add('PAE');
  }

  // 6. Business Administration (BA / MBA):
  // matches business administration, biznesin idare edilmesi, ba, mba, bba
  if (
    norm === 'ba' ||
    norm === 'mba' ||
    norm === 'bba' ||
    stripped === 'ba' ||
    stripped === 'mba' ||
    stripped === 'bba' ||
    stripped === 'businessadministration' ||
    stripped === 'biznesinidareedilmesi' ||
    stripped === 'biznesinidareolunmasi' ||
    (norm.includes('business') && norm.includes('admin')) ||
    norm.includes('biznes') ||
    norm.startsWith('ba-') ||
    norm.startsWith('mba-') ||
    norm.startsWith('bba-') ||
    /^ba[-_./\s]?\d+/i.test(norm) ||
    /^mba[-_./\s]?\d+/i.test(norm) ||
    /^bba[-_./\s]?\d+/i.test(norm)
  ) {
    depts.add('BA');
  }

  // 7. Foundation:
  // matches foundation, hazirliq, found, fnd, f-, fnd-
  if (
    norm === 'foundation' ||
    norm === 'hazirliq' ||
    norm === 'found' ||
    norm === 'fnd' ||
    stripped === 'foundation' ||
    stripped === 'hazirliq' ||
    stripped === 'found' ||
    stripped === 'fnd' ||
    norm.includes('foundation') ||
    norm.includes('hazirliq') ||
    norm.startsWith('f-') ||
    norm.startsWith('fnd-') ||
    norm.startsWith('found-') ||
    norm.startsWith('hazirliq-') ||
    /^f[-_./\s]?\d+/i.test(norm) ||
    /^fnd[-_./\s]?\d+/i.test(norm) ||
    /^found[-_./\s]?\d+/i.test(norm)
  ) {
    depts.add('FOUNDATION');
  }

  // 8. Computer Science (CS)
  if (
    norm === 'cs' ||
    stripped === 'cs' ||
    stripped === 'computerscience' ||
    stripped === 'komputerelmleri' ||
    (norm.includes('computer') && norm.includes('sci')) ||
    (norm.includes('komputer') && norm.includes('elm')) ||
    norm.startsWith('cs-') ||
    /^cs[-_./\s]?\d+/i.test(norm) ||
    /^cs\d+/i.test(stripped)
  ) {
    depts.add('CS');
  }

  // 9. Data Analytics (DA)
  if (
    norm === 'da' ||
    stripped === 'da' ||
    stripped === 'dataanalytics' ||
    stripped === 'datascience' ||
    stripped === 'dataanalitikasi' ||
    stripped === 'verilenlerinanalitikasi' ||
    (norm.includes('data') && (norm.includes('anal') || norm.includes('sci'))) ||
    norm.startsWith('da-') ||
    /^da[-_./\s]?\d+/i.test(norm) ||
    /^da\d+/i.test(stripped)
  ) {
    depts.add('DA');
  }

  // 10. Finance (FIN)
  if (
    norm === 'fin' ||
    norm === 'finance' ||
    norm === 'maliyye' ||
    stripped === 'fin' ||
    stripped === 'finance' ||
    stripped === 'maliyye' ||
    norm.startsWith('fin-') ||
    /^fin[-_./\s]?\d+/i.test(norm)
  ) {
    depts.add('FIN');
  }

  // 11. Sports Club / Staff (SPORTS)
  if (
    norm.includes('idman') ||
    norm.includes('sport') ||
    stripped.includes('idmanklubu') ||
    stripped.includes('sportsclub')
  ) {
    depts.add('SPORTS');
  }

  return depts;
}

/**
 * Returns a primary canonical English label for a given raw department or group code.
 */
export function resolveCanonicalDepartment(value?: string | null): string {
  if (!value) return '';
  const depts = getCanonicalDepartments(value);
  if (depts.size > 0) {
    const primary = Array.from(depts)[0];
    return CANONICAL_DEPARTMENT_DISPLAY[primary] || value.trim();
  }
  return value.trim();
}

/**
 * Safely extracts the department/faculty/group string from a player object.
 */
export function getProfileDepartment(
  profile?: (Partial<PlayerProfile> & Record<string, any>) | null
): string {
  if (!profile) return '';
  const raw =
    profile.major_faculty ||
    profile.faculty ||
    profile.department ||
    profile.major ||
    profile.group ||
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

/**
 * Canonical Department Alias Resolver
 * Matches a player profile or raw department string against a chosen department filter.
 * Normalizes case, strips punctuation/diacritics (ə->e, ü->u, ö->o, ğ->g, ş->s, ç->c, ı->i),
 * and handles all BHOS naming variants and group prefixes.
 */
export function matchesDepartmentFilter(
  playerOrValue:
    | (Partial<PlayerProfile> & Record<string, any>)
    | string
    | null
    | undefined,
  selectedFilter?: string | null
): boolean {
  if (isAllDepartmentsFilter(selectedFilter)) {
    return true;
  }

  if (!playerOrValue) {
    return false;
  }

  const filterDepts = getCanonicalDepartments(selectedFilter);
  const normFilter = normalizeDepartmentText(selectedFilter);
  const strippedFilter = stripPunctuation(selectedFilter);

  if (
    selectedFilter &&
    (selectedFilter.trim().toLowerCase() === 'foundation' ||
      normFilter === 'foundation' ||
      normFilter === 'hazirliq' ||
      normFilter.includes('foundation') ||
      normFilter.includes('hazirliq') ||
      filterDepts.has('FOUNDATION'))
  ) {
    if (typeof playerOrValue === 'string') {
      const s = playerOrValue.trim().toLowerCase();
      const sNorm = normalizeDepartmentText(playerOrValue);
      return (
        s.includes('foundation') ||
        s.includes('hazirliq') ||
        sNorm.includes('foundation') ||
        sNorm.includes('hazirliq') ||
        s === '2026' ||
        s.startsWith('f-') ||
        s.startsWith('fnd-') ||
        s.startsWith('found')
      );
    }

    if (typeof playerOrValue === 'object' && playerOrValue !== null) {
      const player = playerOrValue;
      const deptNorm = normalizeDepartmentText(player.department);
      const facNorm = normalizeDepartmentText(player.faculty);
      const majorFacNorm = normalizeDepartmentText(player.major_faculty);
      const groupNorm = normalizeDepartmentText(player.group);

      return Boolean(
        player.department?.toLowerCase().includes('foundation') ||
          player.department?.toLowerCase().includes('hazirliq') ||
          deptNorm.includes('foundation') ||
          deptNorm.includes('hazirliq') ||
          player.faculty?.toLowerCase().includes('foundation') ||
          player.faculty?.toLowerCase().includes('hazirliq') ||
          facNorm.includes('foundation') ||
          facNorm.includes('hazirliq') ||
          player.major_faculty?.toLowerCase().includes('foundation') ||
          player.major_faculty?.toLowerCase().includes('hazirliq') ||
          majorFacNorm.includes('foundation') ||
          majorFacNorm.includes('hazirliq') ||
          player.year_of_study === 2026 ||
          Number(player.year_of_study) === 2026 ||
          Number(player.admission_year) === 2026 ||
          player.is_foundation === true ||
          player.group?.toLowerCase().startsWith('f-') ||
          player.group?.toLowerCase().startsWith('fnd-') ||
          player.group?.toLowerCase().startsWith('found') ||
          groupNorm.includes('foundation') ||
          groupNorm.includes('hazirliq')
      );
    }
  }

  const valuesToCheck: string[] = [];

  if (typeof playerOrValue === 'string') {
    if (playerOrValue.trim()) {
      valuesToCheck.push(playerOrValue.trim());
    }
  } else if (typeof playerOrValue === 'object') {
    if (typeof playerOrValue.major_faculty === 'string' && playerOrValue.major_faculty.trim()) {
      valuesToCheck.push(playerOrValue.major_faculty.trim());
    }
    if (typeof playerOrValue.faculty === 'string' && playerOrValue.faculty.trim()) {
      valuesToCheck.push(playerOrValue.faculty.trim());
    }
    if (typeof playerOrValue.department === 'string' && playerOrValue.department.trim()) {
      valuesToCheck.push(playerOrValue.department.trim());
    }
    if (typeof playerOrValue.major === 'string' && playerOrValue.major.trim()) {
      valuesToCheck.push(playerOrValue.major.trim());
    }
    if (typeof playerOrValue.group === 'string' && playerOrValue.group.trim()) {
      valuesToCheck.push(playerOrValue.group.trim());
    }
    const email = typeof playerOrValue.email === 'string' ? playerOrValue.email.trim().toLowerCase() : '';
    if (email && DEFAULT_EMAIL_DEPARTMENT_MAP[email]) {
      valuesToCheck.push(DEFAULT_EMAIL_DEPARTMENT_MAP[email]);
    }
  }

  if (valuesToCheck.length === 0) {
    return false;
  }

  for (const val of valuesToCheck) {
    const valDepts = getCanonicalDepartments(val);

    let hasOverlap = false;
    valDepts.forEach((d) => {
      if (filterDepts.has(d)) {
        hasOverlap = true;
      }
    });
    if (hasOverlap) {
      return true;
    }

    const normVal = normalizeDepartmentText(val);
    const strippedVal = stripPunctuation(val);

    if (normVal === normFilter || strippedVal === strippedFilter) {
      return true;
    }

    if (
      normFilter.length >= 3 &&
      (normVal.includes(normFilter) || normFilter.includes(normVal))
    ) {
      return true;
    }

    if (
      strippedFilter.length >= 3 &&
      (strippedVal.includes(strippedFilter) || strippedFilter.includes(strippedVal))
    ) {
      return true;
    }
  }

  return false;
}

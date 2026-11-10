import { PlayerProfile } from '../data/types';

const DEFAULT_RACKET_VALUES = new Set([
  'default',
  'klub raketi',
  'standard',
  'standard club racket',
  'standard club blade',
  'standard club',
  'not listed',
  'yoxdur',
  'none',
  '—',
  '-',
  'empty',
  'null',
]);

/**
 * Returns true if a given racket string represents a customized, non-default racket name.
 */
export function isCustomRacket(racket?: string | null): boolean {
  if (!racket) return false;
  const trimmed = racket.trim().toLowerCase();
  if (trimmed === '') return false;
  return !DEFAULT_RACKET_VALUES.has(trimmed);
}

/**
 * Returns the customized racket name for a player profile, or null if missing/default.
 */
export function getCustomRacket(profile?: Partial<PlayerProfile> | null): string | null {
  if (!profile) return null;
  const candidate = (profile.racket || profile.blade_equipment || '').trim();
  return isCustomRacket(candidate) ? candidate : null;
}

/**
 * Translates tactical playing style to Azerbaijani with grip notation.
 */
export function translatePlayingStyle(style?: string | null): string {
  if (!style) return '';
  switch (style) {
    case 'Shakehand Offensive':
      return 'Hücumçu / Shakehand';
    case 'Shakehand All-round':
      return 'All-round / Shakehand';
    case 'Shakehand Defensive':
      return 'Müdafiə / Shakehand';
    case 'Penhold Offensive':
      return 'Hücumçu / Penhold';
    case 'Penhold All-round':
      return 'All-round / Penhold';
    default:
      return style;
  }
}

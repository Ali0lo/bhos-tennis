/**
 * Human-readable URL slug helpers with Azerbaijani transliteration.
 *
 * Slugs are generated identically on the client (this file) and in Postgres
 * (`public.generate_slug()` in migration 033) so links stay stable whether the
 * slug comes from the `profiles.slug` column or is computed locally.
 */

const AZ_TRANSLITERATION: Record<string, string> = {
  ə: 'e',
  Ə: 'e',
  ü: 'u',
  Ü: 'u',
  ö: 'o',
  Ö: 'o',
  ğ: 'g',
  Ğ: 'g',
  ş: 's',
  Ş: 's',
  ç: 'c',
  Ç: 'c',
  ı: 'i',
  I: 'i',
  İ: 'i',
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when the value is a raw 36-character UUID (legacy link format). */
export function isUuid(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

/** Lowercase, transliterated, accent-free form of a string (no hyphenation). */
export function transliterate(text: string | null | undefined): string {
  if (!text) return '';
  return Array.from(text)
    .map((ch) => AZ_TRANSLITERATION[ch] ?? ch)
    .join('')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Short, stable 4-character suffix derived from an ID (used on collisions). */
export function shortIdSuffix(id: string | null | undefined): string {
  const clean = (id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean.slice(0, 4) || 'x000';
}

/**
 * Turns arbitrary text into a URL slug.
 * "Əli İsgəndərli" -> "eli-isgenderli"
 * Falls back to `fallbackId` (or "player") when the text has no usable chars.
 */
export function generateSlug(text: string | null | undefined, fallbackId?: string): string {
  const slug = transliterate(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');

  if (slug) return slug;
  if (fallbackId) return generateSlug(fallbackId) || 'player';
  return 'player';
}

interface SluggableEntity {
  id: string;
  full_name?: string | null;
  slug?: string | null;
  created_at?: string | null;
}

/**
 * Builds a deterministic id -> slug map for a list of players.
 * Stored DB slugs win; otherwise the name slug is used, and only colliding
 * names get a short "-xxxx" ID suffix (oldest profile keeps the clean slug).
 */
export function buildSlugMap(entities: SluggableEntity[]): Map<string, string> {
  const result = new Map<string, string>();
  const taken = new Set<string>();

  entities.forEach((e) => {
    if (e.slug) {
      result.set(e.id, e.slug);
      taken.add(e.slug);
    }
  });

  const pending = entities
    .filter((e) => !e.slug)
    .sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return ta - tb || a.id.localeCompare(b.id);
    });

  pending.forEach((e) => {
    const base = generateSlug(e.full_name, e.id);
    let candidate = base;
    if (taken.has(candidate)) {
      candidate = `${base}-${shortIdSuffix(e.id)}`;
      let n = 2;
      while (taken.has(candidate)) {
        candidate = `${base}-${shortIdSuffix(e.id)}${n++}`;
      }
    }
    taken.add(candidate);
    result.set(e.id, candidate);
  });

  return result;
}

/** Normalized form for fuzzy name comparison (search boxes, legacy name URLs). */
export function normalizeForSearch(text: string | null | undefined): string {
  return transliterate(text).replace(/[^a-z0-9]+/g, ' ').trim();
}


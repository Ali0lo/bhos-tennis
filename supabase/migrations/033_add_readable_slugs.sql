-- =============================================================================
-- 033: Human-readable URL slugs for player profiles (and tournament safety net)
-- =============================================================================
-- /players/ali-iskandarli instead of /players/550e8400-e29b-41d4-a716-446655440000
-- Legacy UUID links keep working: the app resolves either form.
--
-- Slug algorithm mirrors lib/utils/slug.ts::generateSlug():
--   Azerbaijani transliteration (ə→e, ü→u, ö→o, ğ→g, ş→s, ç→c, ı/İ→i),
--   lowercase, non-alphanumeric runs → single hyphen, trimmed, max 80 chars.
-- Collisions get a short 4-char suffix from the row id ("ali-aghayev-3f2a").
-- =============================================================================

-- 1. Pure slug generator --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_slug(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s TEXT;
BEGIN
  IF input_text IS NULL THEN
    RETURN '';
  END IF;

  s := translate(
    input_text,
    'əƏüÜöÖğĞşŞçÇıİáàâäãÁÀÂÄÃéèêëÉÈÊËíìîïÍÌÎÏóòôõÓÒÔÕúùûÚÙÛñÑ',
    'eEuUoOgGsScCiIaaaaaAAAAAeeeeEEEEiiiiIIIIooooOOOOuuuUUUnN'
  );
  s := lower(s);
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '(^-+|-+$)', '', 'g');
  s := left(s, 80);
  s := regexp_replace(s, '-+$', '', 'g');
  RETURN s;
END;
$$;

-- 2. Unique slug for a profile (suffix only on collision) ------------------------
CREATE OR REPLACE FUNCTION public.unique_profile_slug(p_name TEXT, p_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  short_id TEXT := left(replace(p_id::TEXT, '-', ''), 4);
  n INT := 2;
BEGIN
  base_slug := public.generate_slug(p_name);
  IF base_slug = '' THEN
    base_slug := 'player';
  END IF;

  candidate := base_slug;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE slug = candidate AND id <> p_id) THEN
    candidate := base_slug || '-' || short_id;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = candidate AND id <> p_id) LOOP
      candidate := base_slug || '-' || short_id || n::TEXT;
      n := n + 1;
    END LOOP;
  END IF;

  RETURN candidate;
END;
$$;

-- 3. Column ---------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug VARCHAR(120);

-- 4. Backfill existing profiles (oldest profile keeps the clean, un-suffixed slug) --
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, full_name
    FROM public.profiles
    WHERE slug IS NULL OR slug = ''
    ORDER BY created_at ASC NULLS FIRST, id ASC
  LOOP
    UPDATE public.profiles
    SET slug = public.unique_profile_slug(r.full_name, r.id)
    WHERE id = r.id;
  END LOOP;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_slug_unique_idx ON public.profiles (slug);

-- 5. Auto-generate on INSERT / name UPDATE -----------------------------------------
CREATE OR REPLACE FUNCTION public.profiles_set_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
      NEW.slug := public.unique_profile_slug(NEW.full_name, NEW.id);
    ELSE
      NEW.slug := public.generate_slug(NEW.slug);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.full_name IS DISTINCT FROM OLD.full_name
       OR NEW.slug IS NULL OR NEW.slug = '' THEN
      NEW.slug := public.unique_profile_slug(NEW.full_name, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_set_slug ON public.profiles;
CREATE TRIGGER trg_profiles_set_slug
  BEFORE INSERT OR UPDATE OF full_name, slug ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_set_slug();

-- 6. Tournaments already have a UNIQUE NOT NULL slug column (001). Existing slugs are
--    left untouched so shared links stay valid; only blank slugs are auto-filled.
CREATE OR REPLACE FUNCTION public.tournaments_set_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  n INT := 2;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := public.generate_slug(NEW.title);
    IF base_slug = '' THEN
      base_slug := 'turnir';
    END IF;
    candidate := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.tournaments WHERE slug = candidate AND id <> NEW.id) LOOP
      candidate := base_slug || '-' || n::TEXT;
      n := n + 1;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tournaments_set_slug ON public.tournaments;
CREATE TRIGGER trg_tournaments_set_slug
  BEFORE INSERT OR UPDATE OF slug ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.tournaments_set_slug();


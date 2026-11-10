-- ==============================================================================
-- Migration 043: Add Racket Column & Conditional Equipment Schema
--
-- 1. Adds optional `racket` TEXT DEFAULT NULL column to `public.profiles`.
-- 2. Backfills `racket` for players with customized blade_equipment,
--    while strictly setting default / generic / unlisted rackets to NULL.
-- ==============================================================================

-- 1. Add racket column to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS racket TEXT DEFAULT NULL;

-- 2. Backfill existing custom rackets from blade_equipment (skipping defaults)
UPDATE public.profiles
SET racket = btrim(blade_equipment)
WHERE (racket IS NULL OR btrim(racket) = '')
  AND blade_equipment IS NOT NULL
  AND btrim(blade_equipment) <> ''
  AND lower(btrim(blade_equipment)) NOT IN (
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
    '-'
  );

-- 3. Ensure any legacy default strings in racket are normalized to NULL
UPDATE public.profiles
SET racket = NULL
WHERE racket IS NOT NULL
  AND lower(btrim(racket)) IN (
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
    ''
  );

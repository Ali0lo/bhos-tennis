-- ==============================================================================
-- Migration 038: Backfill Player & Tournament Names on `public.matches`
-- Ensures all match rows store `player1_name`, `player2_name`, `logged_by_name`,
-- and `tournament_title` alongside their relational foreign keys.
-- ==============================================================================

DO $$
BEGIN
  PERFORM set_config('app.bypass_match_security', 'true', true);
  PERFORM set_config('app.bypass_security_guard', 'true', true);

  UPDATE public.matches m
  SET player1_name = p.full_name
  FROM public.profiles p
  WHERE m.player1_id = p.id
    AND (m.player1_name IS NULL OR btrim(m.player1_name) = '');

  UPDATE public.matches m
  SET player2_name = p.full_name
  FROM public.profiles p
  WHERE m.player2_id = p.id
    AND (m.player2_name IS NULL OR btrim(m.player2_name) = '');

  UPDATE public.matches m
  SET logged_by_name = p.full_name
  FROM public.profiles p
  WHERE m.logged_by = p.id
    AND (m.logged_by_name IS NULL OR btrim(m.logged_by_name) = '');

  UPDATE public.matches m
  SET tournament_title = t.title
  FROM public.tournaments t
  WHERE m.tournament_id = t.id
    AND (m.tournament_title IS NULL OR btrim(m.tournament_title) = '');
END;
$$;

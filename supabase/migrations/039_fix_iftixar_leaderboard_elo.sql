-- ==============================================================================
-- Migration 039: Sync Coach Iftixar's Leaderboard ELO Rating to 966
-- Ensures `public.profiles` and `public.leaderboard_standings` reflect Coach
-- Iftixar Məhərrəmov's real rating (966) rather than the legacy 999 seed cap.
-- ==============================================================================

DO $$
DECLARE
  v_latest_elo INT;
BEGIN
  PERFORM set_config('app.bypass_profile_security', 'true', true);
  PERFORM set_config('app.bypass_security_guard', 'true', true);

  -- Check if there is a confirmed match for Coach Iftixar with a recorded post-match ELO
  SELECT
    CASE
      WHEN m.player1_id = p.id THEN m.player1_elo_after
      ELSE m.player2_elo_after
    END
  INTO v_latest_elo
  FROM public.matches m
  JOIN public.profiles p
    ON p.id = m.player1_id OR p.id = m.player2_id
  WHERE (
    p.role = 'coach'
    OR lower(COALESCE(p.email, '')) IN ('iftixar.coach@gmail.com', 'iftixar@bhos.edu.az')
    OR p.full_name ILIKE '%ftixar%'
  )
    AND COALESCE(m.status, 'confirmed') IN ('confirmed', 'approved')
  ORDER BY COALESCE(m.match_date, m.created_at) DESC
  LIMIT 1;

  v_latest_elo := COALESCE(NULLIF(v_latest_elo, 999), 966);

  UPDATE public.profiles
  SET
    current_elo = v_latest_elo,
    elo_rating = v_latest_elo,
    updated_at = NOW()
  WHERE (
    role = 'coach'
    OR lower(COALESCE(email, '')) IN ('iftixar.coach@gmail.com', 'iftixar@bhos.edu.az')
    OR full_name ILIKE '%ftixar%'
  )
    AND (current_elo IS NULL OR current_elo = 999 OR elo_rating IS NULL OR elo_rating = 999);
END;
$$;

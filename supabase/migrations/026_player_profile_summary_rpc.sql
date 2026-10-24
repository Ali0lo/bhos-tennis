CREATE INDEX IF NOT EXISTS idx_matches_player1_date
  ON public.matches(player1_id, match_date DESC);

CREATE INDEX IF NOT EXISTS idx_matches_player2_date
  ON public.matches(player2_id, match_date DESC);

CREATE OR REPLACE FUNCTION public.get_player_profile_summary(target_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile JSONB;
  v_matches JSONB;
  v_achievements JSONB;
BEGIN
  SELECT to_jsonb(p.*)
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = target_player_id
    AND COALESCE(p.is_verified, TRUE) = TRUE;

  IF v_profile IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(m.*) ORDER BY m.match_date DESC), '[]'::jsonb)
  INTO v_matches
  FROM (
    SELECT
      id,
      tournament_id,
      tournament_title,
      player1_id,
      player1_name,
      player2_id,
      player2_name,
      logged_by,
      logged_by_name,
      player1_score,
      player2_score,
      set_scores,
      player1_elo_before,
      player2_elo_before,
      player1_elo_after,
      player2_elo_after,
      elo_delta,
      status,
      auto_approved,
      match_date
    FROM public.matches
    WHERE player1_id = target_player_id OR player2_id = target_player_id
    ORDER BY match_date DESC
    LIMIT 30
  ) m;

  SELECT COALESCE(
    jsonb_object_agg(pa.badge_id, pa.unlocked_at),
    '{}'::jsonb
  )
  INTO v_achievements
  FROM public.profile_achievements pa
  WHERE pa.profile_id = target_player_id;

  RETURN jsonb_build_object(
    'profile', v_profile,
    'recent_matches', v_matches,
    'achievements', v_achievements
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_player_profile_summary(UUID) TO anon, authenticated;

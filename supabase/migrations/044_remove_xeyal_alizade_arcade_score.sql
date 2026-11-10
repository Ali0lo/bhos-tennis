-- ==============================================================================
-- Migration 044: Reset Khayal's 778 Arcade Infinity Result (Bot Detection)
--
-- 1. Locates user profile(s) matching Khayal / Xeyal / Alizade OR having score = 778.
-- 2. Deletes the 778 bot record from `public.arcade_highscores` so his progress is reset
--    to 0, enabling genuine future records to appear on the leaderboard.
-- 3. Revokes all arcade-related achievement badges ('rally_starter', 'rally_master', 'table_ruler')
--    from `public.profile_achievements`.
-- 4. Cleans up arcade sessions for that user.
-- 5. Ensures his profile is verified (`is_verified = TRUE`) so any future legitimate
--    rallies immediately rank on the public leaderboard.
-- 6. Adds `admin_remove_arcade_score` RPC for future admin moderation.
-- ==============================================================================

DO $$
DECLARE
  v_rec RECORD;
  v_count INT := 0;
BEGIN
  -- 1. Locate all profiles matching Khayal / Xeyal / Alizade OR having the 778 score
  FOR v_rec IN
    SELECT DISTINCT p.id, p.full_name, p.email
    FROM public.profiles p
    LEFT JOIN public.arcade_highscores h ON h.user_id = p.id
    WHERE h.score = 778
       OR p.full_name ILIKE '%khayal%'
       OR p.full_name ILIKE '%x_yal%'
       OR p.email ILIKE '%khayal%'
       OR p.email ILIKE '%x_yal%'
  LOOP
    -- Remove the fraudulent / bot high score record
    DELETE FROM public.arcade_highscores
    WHERE user_id = v_rec.id;

    -- Revoke bot-earned arcade badges
    DELETE FROM public.profile_achievements
    WHERE profile_id = v_rec.id
      AND badge_id IN ('rally_starter', 'rally_master', 'table_ruler');

    -- Clear arcade sessions to ensure clean state
    DELETE FROM public.arcade_sessions
    WHERE user_id = v_rec.id;

    -- Ensure profile is verified so future legitimate runs appear on leaderboard
    UPDATE public.profiles
    SET is_verified = TRUE, updated_at = NOW()
    WHERE id = v_rec.id;

    v_count := v_count + 1;
    RAISE NOTICE 'Reset arcade progress for % (id: %, email: %)',
      v_rec.full_name, v_rec.id, v_rec.email;
  END LOOP;

  -- 2. Direct safety purge: delete any highscore record of 778 or >= 700
  DELETE FROM public.arcade_highscores
  WHERE score = 778 OR score >= 700;

  RAISE NOTICE 'Total profiles reset: %', v_count;
END;
$$;

-- ------------------------------------------------------------------------------
-- Admin RPC: admin_remove_arcade_score
-- Allows club admins/president to void bot/fraudulent scores directly
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_remove_arcade_score(
  p_target_user_id UUID,
  p_mode TEXT DEFAULT 'infinity'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_role TEXT;
  v_deleted_score INT;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = v_caller;

  IF v_role NOT IN ('president', 'coach', 'admin') THEN
    RAISE EXCEPTION 'İcazəniz yoxdur (Yalnız adminlər nəticəni silə bilər)' USING ERRCODE = '42501';
  END IF;

  -- Delete score from arcade_highscores
  DELETE FROM public.arcade_highscores
  WHERE user_id = p_target_user_id
    AND mode = p_mode
  RETURNING score INTO v_deleted_score;

  -- Revoke arcade badges
  DELETE FROM public.profile_achievements
  WHERE profile_id = p_target_user_id
    AND badge_id IN ('rally_starter', 'rally_master', 'table_ruler');

  -- Delete sessions
  DELETE FROM public.arcade_sessions
  WHERE user_id = p_target_user_id
    AND mode = p_mode;

  RETURN jsonb_build_object(
    'target_user_id', p_target_user_id,
    'deleted_score', v_deleted_score,
    'mode', p_mode,
    'success', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_remove_arcade_score(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_remove_arcade_score(UUID, TEXT) TO authenticated;

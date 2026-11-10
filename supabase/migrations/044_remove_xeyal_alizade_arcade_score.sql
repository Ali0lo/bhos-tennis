-- ==============================================================================
-- Migration 044: Remove Xeyal Alizade Arcade Infinity Result (Bot Detection)
--
-- 1. Locates user profile(s) matching Xeyal Alizade (Xəyal Əlizadə).
-- 2. Deletes any bot-generated record from `public.arcade_highscores`.
-- 3. Revokes all arcade-related achievement badges ('rally_starter', 'rally_master', 'table_ruler')
--    from `public.profile_achievements`.
-- 4. Purges any active or used sessions in `public.arcade_sessions`.
-- 5. Adds `admin_remove_arcade_score` SECURITY DEFINER RPC allowing club admins/president
--    to void bot-assisted or fraudulent arcade submissions.
-- ==============================================================================

DO $$
DECLARE
  v_rec RECORD;
  v_count INT := 0;
BEGIN
  -- Loop over all matching profiles for Xeyal Alizade
  FOR v_rec IN
    SELECT id, full_name, email
    FROM public.profiles
    WHERE full_name ILIKE '%x_yal%_lizad%'
       OR full_name ILIKE '%khayal%alizad%'
       OR email ILIKE '%x_yal%_lizad%'
       OR email ILIKE '%khayal%alizad%'
  LOOP
    -- 1. Remove high score record from arcade_highscores
    DELETE FROM public.arcade_highscores
    WHERE user_id = v_rec.id;

    -- 2. Revoke bot-earned arcade badges
    DELETE FROM public.profile_achievements
    WHERE profile_id = v_rec.id
      AND badge_id IN ('rally_starter', 'rally_master', 'table_ruler');

    -- 3. Clear any arcade sessions
    DELETE FROM public.arcade_sessions
    WHERE user_id = v_rec.id;

    v_count := v_count + 1;
    RAISE NOTICE 'Removed arcade highscore and badges for % (id: %, email: %)',
      v_rec.full_name, v_rec.id, v_rec.email;
  END LOOP;

  IF v_count = 0 THEN
    RAISE NOTICE 'No profile found matching Xeyal Alizade in public.profiles';
  END IF;
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

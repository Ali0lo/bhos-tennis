-- ==============================================================================
-- Migration 049: Restrict Arcade High Score Deletion to Admins Only
--
-- Disallow regular users from deleting their own arcade high scores.
-- Only authorized admins (president, coach, or designated admin accounts)
-- are permitted to delete arcade scores.
-- ==============================================================================

-- 1. Restrict RLS DELETE policy on arcade_highscores to admins only
DROP POLICY IF EXISTS "Allow delete arcade score for owner or admin" ON public.arcade_highscores;
DROP POLICY IF EXISTS "Allow delete arcade score for admin only" ON public.arcade_highscores;

CREATE POLICY "Allow delete arcade score for admin only"
  ON public.arcade_highscores
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
  );

-- 2. Update delete_arcade_score to enforce admin-only check
CREATE OR REPLACE FUNCTION public.delete_arcade_score(
  p_target_user_id UUID,
  p_mode TEXT DEFAULT 'infinity',
  p_revoke_badges BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_adm BOOLEAN := FALSE;
  v_deleted_score INT := NULL;
  v_player_name TEXT := '';
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  v_is_adm := public.is_admin(v_caller);

  -- Allowed strictly for admins only
  IF NOT v_is_adm THEN
    RAISE EXCEPTION 'İcazə verilmədi: Yalnız adminlər arcade rekordunu silə bilər.' USING ERRCODE = '42501';
  END IF;

  -- Capture existing score and player name before deletion
  SELECT h.score, p.full_name
  INTO v_deleted_score, v_player_name
  FROM public.arcade_highscores h
  JOIN public.profiles p ON p.id = h.user_id
  WHERE h.user_id = p_target_user_id AND h.mode = p_mode;

  IF v_player_name IS NULL OR v_player_name = '' THEN
    SELECT full_name INTO v_player_name
    FROM public.profiles
    WHERE id = p_target_user_id;
  END IF;

  -- 1. Delete from arcade_highscores
  DELETE FROM public.arcade_highscores
  WHERE user_id = p_target_user_id AND mode = p_mode;

  -- 2. Clean up arcade sessions
  DELETE FROM public.arcade_sessions
  WHERE user_id = p_target_user_id AND mode = p_mode;

  -- 3. Revoke arcade achievement badges if requested
  IF p_revoke_badges THEN
    DELETE FROM public.profile_achievements
    WHERE profile_id = p_target_user_id
      AND badge_id IN ('rally_starter', 'rally_master', 'table_ruler');
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'user_id', p_target_user_id,
    'player_name', COALESCE(v_player_name, 'Oyunçu'),
    'mode', p_mode,
    'deleted_score', v_deleted_score
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_arcade_score(UUID, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_arcade_score(UUID, TEXT, BOOLEAN) TO authenticated;

-- ==============================================================================
-- Migration 045: Reset Khayal's 778 Arcade Score & Enable New Records
--
-- 1. Deletes the 778 bot record from `public.arcade_highscores`.
-- 2. Resets Khayal's arcade progress to 0 and clears bot badges.
-- 3. Ensures his profile is verified (`is_verified = TRUE`) so any future legitimate
--    high scores rank on the public leaderboard.
-- ==============================================================================

DO $$
DECLARE
  v_rec RECORD;
BEGIN
  -- Target any profile associated with score = 778 or named Khayal / Xeyal / Alizade
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
    -- Purge the 778 score
    DELETE FROM public.arcade_highscores
    WHERE user_id = v_rec.id;

    -- Revoke bot-earned badges so he can re-earn them legitimately
    DELETE FROM public.profile_achievements
    WHERE profile_id = v_rec.id
      AND badge_id IN ('rally_starter', 'rally_master', 'table_ruler');

    -- Clear old arcade sessions
    DELETE FROM public.arcade_sessions
    WHERE user_id = v_rec.id;

    -- Ensure profile is verified so legitimate scores appear on leaderboard
    UPDATE public.profiles
    SET is_verified = TRUE, updated_at = NOW()
    WHERE id = v_rec.id;

    RAISE NOTICE 'Reset arcade score & verified profile for % (id: %, email: %)',
      v_rec.full_name, v_rec.id, v_rec.email;
  END LOOP;

  -- Safety purge for any orphaned 778 records
  DELETE FROM public.arcade_highscores
  WHERE score = 778 OR score >= 700;
END;
$$;

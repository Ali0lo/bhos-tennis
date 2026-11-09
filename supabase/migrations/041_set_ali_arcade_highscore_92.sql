-- ==============================================================================
-- Migration 041: Set Ali Iskandarli's Arcade High Score to 92 (Infinity Mode)
--
-- 1. Updates / inserts record in `public.arcade_highscores` for Ali Iskandarli
--    with score = 92 in 'infinity' mode.
-- 2. Awards all 3 arcade achievement badges into `public.profile_achievements`:
--    - rally_starter (threshold 15)  "Ralli Başlanğıcı"
--    - rally_master  (threshold 30)  "Ralli Ustası"
--    - table_ruler   (threshold 50)  "Masa Hakimi"
-- 3. Ensures his profile is verified so he appears on the public arcade leaderboard.
-- ==============================================================================

DO $$
DECLARE
  v_uid UUID;
  v_badge TEXT;
BEGIN
  -- Locate Ali Iskandarli's profile
  SELECT id INTO v_uid
  FROM public.profiles
  WHERE email IN ('ali.iskandarli.std@bhos.edu.az', 'ali.iskandarli@bhos.edu.az')
     OR full_name ILIKE '%ali iskandarli%'
  ORDER BY (email = 'ali.iskandarli.std@bhos.edu.az') DESC, created_at ASC
  LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE NOTICE 'Profile for Ali Iskandarli was not found in public.profiles';
    RETURN;
  END IF;

  -- Ensure profile is verified so get_arcade_leaderboard includes the record
  UPDATE public.profiles
  SET is_verified = TRUE, updated_at = NOW()
  WHERE id = v_uid AND COALESCE(is_verified, FALSE) = FALSE;

  -- Upsert arcade highscore for Infinity mode
  INSERT INTO public.arcade_highscores (user_id, mode, score, updated_at)
  VALUES (v_uid, 'infinity', 92, NOW())
  ON CONFLICT ON CONSTRAINT unique_user_infinity
  DO UPDATE SET
    score = GREATEST(public.arcade_highscores.score, 92),
    updated_at = NOW();

  -- Award arcade milestone achievement badges (all 3 thresholds met with 92)
  FOR v_badge IN
    SELECT unnest(ARRAY['rally_starter', 'rally_master', 'table_ruler'])
  LOOP
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (v_uid, v_badge, NOW())
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Successfully set Ali Iskandarli (%) arcade infinity high score to 92 and awarded badges.', v_uid;
END;
$$;

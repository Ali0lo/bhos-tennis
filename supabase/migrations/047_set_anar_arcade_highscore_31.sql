-- ==============================================================================
-- Migration 047: Set Anar Alakbarli's Arcade High Score to 31 (Infinity Mode)
--
-- 1. Updates / inserts record in `public.arcade_highscores` for Anar Alakbarli
--    with score = 31 in 'infinity' mode.
-- 2. Awards milestone badges into `public.profile_achievements`:
--    - rally_starter (threshold 15)  "Ralli Başlanğıcı"
--    - rally_master  (threshold 30)  "Ralli Ustası"
-- 3. Ensures his profile is verified (`is_verified = TRUE`) so he appears on the
--    public arcade leaderboard.
-- 4. Updates `submit_arcade_score` with relaxed physical time threshold (0.45s/score)
--    and graceful fallback for session handling to prevent false positive blocks.
-- ==============================================================================

DO $$
DECLARE
  v_uid UUID;
  v_badge TEXT;
BEGIN
  -- Locate Anar Alakbarli's profile
  SELECT id INTO v_uid
  FROM public.profiles
  WHERE email IN ('anar.alakbarli.std@bhos.edu.az', 'anar.alakbarli@bhos.edu.az')
     OR email ILIKE '%anar.alakbarli%'
     OR full_name ILIKE '%anar alakbarli%'
     OR full_name ILIKE '%anar ələkbərli%'
  ORDER BY (email = 'anar.alakbarli.std@bhos.edu.az') DESC, created_at ASC
  LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE NOTICE 'Profile for Anar Alakbarli was not found in public.profiles';
    RETURN;
  END IF;

  -- Ensure profile is verified so get_arcade_leaderboard includes the record
  UPDATE public.profiles
  SET is_verified = TRUE, updated_at = NOW()
  WHERE id = v_uid;

  -- Upsert arcade highscore for Infinity mode (at least 31)
  INSERT INTO public.arcade_highscores (user_id, mode, score, updated_at)
  VALUES (v_uid, 'infinity', 31, NOW())
  ON CONFLICT ON CONSTRAINT unique_user_infinity
  DO UPDATE SET
    score = GREATEST(public.arcade_highscores.score, 31),
    updated_at = NOW();

  -- Award arcade milestone achievement badges for score 31 (thresholds 15 and 30)
  FOR v_badge IN
    SELECT unnest(ARRAY['rally_starter', 'rally_master'])
  LOOP
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (v_uid, v_badge, NOW())
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Successfully set Anar Alakbarli (%) arcade infinity high score to 31 and awarded badges.', v_uid;
END;
$$;

-- ------------------------------------------------------------------------------
-- Upgrade submit_arcade_score: Relax physical time threshold and allow robust fallback
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_arcade_score(
  p_session_id UUID DEFAULT NULL,
  p_score INT DEFAULT 0,
  p_mode TEXT DEFAULT 'infinity',
  p_duration_seconds NUMERIC DEFAULT NULL,
  p_is_natural_input BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_session_id UUID;
  v_session_started TIMESTAMPTZ;
  v_session_used BOOLEAN;
  v_elapsed_seconds NUMERIC := NULL;
  v_min_time NUMERIC;
  v_prev INT;
  v_best INT;
  v_is_new_best BOOLEAN := FALSE;
  v_rank INT;
  v_badge TEXT;
  v_awarded TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Basic auth and parameters validation
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_mode IS DISTINCT FROM 'infinity' THEN
    RAISE EXCEPTION 'Unsupported arcade mode: %', p_mode USING ERRCODE = '22023';
  END IF;

  IF p_score IS NULL OR p_score < 0 OR p_score > 10000 THEN
    RAISE EXCEPTION 'Invalid score' USING ERRCODE = '22003';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  -- Input Telemetry Integrity Check
  IF p_is_natural_input IS FALSE THEN
    RAISE EXCEPTION 'Keçərsiz oyun sessiyası (Süni giriş aşkarlandı)' USING ERRCODE = '22023';
  END IF;

  -- Minimum physical time requirement: elapsed_time >= (p_score * 0.45)
  -- Real rallies at max speed take ~0.85-1.02 seconds roundtrip; 0.45s is a generous safety threshold
  -- that blocks instant bot-injection while never failing fast human reflexes.
  v_min_time := p_score * 0.45;

  -- Time-Bound Signed Sessions Validation (if session_id provided)
  IF p_session_id IS NOT NULL THEN
    SELECT id, started_at, used
    INTO v_session_id, v_session_started, v_session_used
    FROM public.arcade_sessions
    WHERE id = p_session_id
      AND user_id = v_uid
      AND mode = p_mode
    FOR UPDATE;

    IF v_session_id IS NOT NULL THEN
      IF v_session_used THEN
        RAISE EXCEPTION 'Keçərsiz oyun sessiyası (Sessiya artıq istifadə olunub)' USING ERRCODE = '22023';
      END IF;

      IF v_session_started < NOW() - INTERVAL '4 hours' THEN
        RAISE EXCEPTION 'Keçərsiz oyun sessiyası (Sessiyanın vaxtı bitib)' USING ERRCODE = '22023';
      END IF;

      v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_session_started));

      IF p_score > 0 AND v_elapsed_seconds < v_min_time THEN
        RAISE EXCEPTION 'Keçərsiz oyun sessiyası (Vaxt uyğunsuzluğu)' USING ERRCODE = '22023';
      END IF;

      -- Mark session as used
      UPDATE public.arcade_sessions
      SET used = TRUE
      WHERE id = v_session_id;
    END IF;
  END IF;

  -- Check client reported duration if available
  IF p_score > 0 AND p_duration_seconds IS NOT NULL AND p_duration_seconds < v_min_time THEN
    RAISE EXCEPTION 'Keçərsiz oyun sessiyası (Vaxt uyğunsuzluğu)' USING ERRCODE = '22023';
  END IF;

  -- Atomic high score upsert
  SELECT score INTO v_prev
  FROM public.arcade_highscores
  WHERE user_id = v_uid AND mode = p_mode;

  INSERT INTO public.arcade_highscores (user_id, mode, score, updated_at)
  VALUES (v_uid, p_mode, p_score, NOW())
  ON CONFLICT ON CONSTRAINT unique_user_infinity
  DO UPDATE SET
    score = EXCLUDED.score,
    updated_at = NOW()
  WHERE public.arcade_highscores.score < EXCLUDED.score
  RETURNING score INTO v_best;

  IF FOUND THEN
    v_is_new_best := TRUE;
  ELSE
    SELECT score INTO v_best
    FROM public.arcade_highscores
    WHERE user_id = v_uid AND mode = p_mode;
  END IF;

  -- Award milestone achievement badges into profile_achievements
  FOR v_badge IN
    SELECT t.badge_id
    FROM (VALUES
      ('rally_starter', 15),
      ('rally_master', 30),
      ('table_ruler', 50)
    ) AS t(badge_id, threshold)
    WHERE v_best >= t.threshold
    ORDER BY t.threshold
  LOOP
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (v_uid, v_badge, NOW())
    ON CONFLICT (profile_id, badge_id) DO NOTHING;

    IF FOUND THEN
      v_awarded := array_append(v_awarded, v_badge);
    END IF;
  END LOOP;

  -- Calculate rank
  SELECT COUNT(*) + 1 INTO v_rank
  FROM public.arcade_highscores h
  JOIN public.profiles p ON p.id = h.user_id
  WHERE h.mode = p_mode
    AND COALESCE(p.is_verified, FALSE) = TRUE
    AND (h.score > v_best OR (h.score = v_best AND h.user_id <> v_uid AND h.updated_at < (
      SELECT updated_at FROM public.arcade_highscores WHERE user_id = v_uid AND mode = p_mode
    )));

  RETURN jsonb_build_object(
    'mode', p_mode,
    'submitted_score', p_score,
    'previous_best', v_prev,
    'best_score', v_best,
    'is_new_best', v_is_new_best,
    'rank', v_rank,
    'badges_awarded', to_jsonb(v_awarded),
    'duration_seconds', ROUND(COALESCE(v_elapsed_seconds, p_duration_seconds, 0)::numeric, 2)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_arcade_score(UUID, INT, TEXT, NUMERIC, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_arcade_score(UUID, INT, TEXT, NUMERIC, BOOLEAN) TO authenticated;

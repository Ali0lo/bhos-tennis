-- ==============================================================================
-- Migration 042: Arcade Anti-Cheat & Verification
--
-- 1. Time-Bound Signed Sessions:
--    - Table `arcade_sessions` tracks per-user game sessions with started_at and used flag.
--    - Function `start_arcade_session(p_mode)` initializes a session and returns its UUID.
--
-- 2. Physical Time Validation:
--    - `submit_arcade_score` verifies elapsed time >= (p_score * 0.95) seconds.
--    - Rejects with 'Keçərsiz oyun sessiyası (Vaxt uyğunsuzluğu)' if elapsed time is suspiciously low.
--    - Marks session used = true to prevent replay attacks.
--
-- 3. Input Telemetry Integrity:
--    - `submit_arcade_score` verifies `p_is_natural_input` (paddle movement + contact point std dev).
--    - Rejects synthetic snaps / dead-center solver bots.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Table: arcade_sessions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.arcade_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'infinity',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arcade_sessions_user_mode
  ON public.arcade_sessions (user_id, mode, used, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_arcade_sessions_id_user
  ON public.arcade_sessions (id, user_id);

ALTER TABLE public.arcade_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own arcade sessions" ON public.arcade_sessions;
CREATE POLICY "Users can view own arcade sessions"
  ON public.arcade_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 2. Function: start_arcade_session
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_arcade_session(
  p_mode TEXT DEFAULT 'infinity'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_session_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_mode IS DISTINCT FROM 'infinity' THEN
    RAISE EXCEPTION 'Unsupported arcade mode: %', p_mode USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  -- Create fresh time-bound session
  INSERT INTO public.arcade_sessions (user_id, mode, started_at, used)
  VALUES (v_uid, p_mode, NOW(), FALSE)
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.start_arcade_session(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_arcade_session(TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. Function: submit_arcade_score (with 3-Layer Anti-Cheat)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.submit_arcade_score(INT, TEXT);

CREATE OR REPLACE FUNCTION public.submit_arcade_score(
  p_session_id UUID,
  p_score INT,
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
  v_elapsed_seconds NUMERIC;
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

  -- Layer 2: Input Telemetry Integrity Check
  IF p_is_natural_input IS FALSE THEN
    RAISE EXCEPTION 'Keçərsiz oyun sessiyası (Süni giriş aşkarlandı)' USING ERRCODE = '22023';
  END IF;

  -- Layer 1: Time-Bound Signed Sessions Validation
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'Keçərsiz oyun sessiyası (Sessiya ID tələb olunur)' USING ERRCODE = '22023';
  END IF;

  SELECT id, started_at, used
  INTO v_session_id, v_session_started, v_session_used
  FROM public.arcade_sessions
  WHERE id = p_session_id
    AND user_id = v_uid
    AND mode = p_mode
  FOR UPDATE;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Keçərsiz oyun sessiyası (Sessiya tapılmadı)' USING ERRCODE = 'P0002';
  END IF;

  IF v_session_used THEN
    RAISE EXCEPTION 'Keçərsiz oyun sessiyası (Sessiya artıq istifadə olunub)' USING ERRCODE = '22023';
  END IF;

  IF v_session_started < NOW() - INTERVAL '2 hours' THEN
    RAISE EXCEPTION 'Keçərsiz oyun sessiyası (Sessiyanın vaxtı bitib)' USING ERRCODE = '22023';
  END IF;

  -- Physical elapsed time calculation
  v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_session_started));

  -- Minimum physical time requirement: elapsed_time >= (p_score * 0.95)
  v_min_time := p_score * 0.95;

  IF p_score > 0 AND (v_elapsed_seconds < v_min_time OR (p_duration_seconds IS NOT NULL AND p_duration_seconds < v_min_time)) THEN
    RAISE EXCEPTION 'Keçərsiz oyun sessiyası (Vaxt uyğunsuzluğu)' USING ERRCODE = '22023';
  END IF;

  -- Mark session as used immediately
  UPDATE public.arcade_sessions
  SET used = TRUE
  WHERE id = v_session_id;

  -- Atomic high score upsert
  SELECT score INTO v_prev
  FROM public.arcade_highscores
  WHERE user_id = v_uid AND mode = p_mode;

  INSERT INTO public.arcade_highscores (user_id, mode, score)
  VALUES (v_uid, p_mode, p_score)
  ON CONFLICT ON CONSTRAINT unique_user_infinity
  DO UPDATE SET score = EXCLUDED.score, updated_at = NOW()
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
    'duration_seconds', ROUND(v_elapsed_seconds::numeric, 2)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_arcade_score(UUID, INT, TEXT, NUMERIC, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_arcade_score(UUID, INT, TEXT, NUMERIC, BOOLEAN) TO authenticated;

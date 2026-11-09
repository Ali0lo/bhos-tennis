-- ==============================================================================
-- Migration 040: Arcade (Sonsuz Ralli / Infinity Mode) leaderboard + profile badges
--
-- NOTE: numbered 040 because 038_backfill_match_player_names.sql and
--       039_fix_iftixar_leaderboard_elo.sql already exist.
--
-- * arcade_highscores         : one best score per (user, mode)
-- * submit_arcade_score()     : the ONLY write path; upserts best score + awards badges
-- * get_arcade_leaderboard()  : Top-N board joined with profile info
-- * get_my_arcade_standing()  : caller's own rank / best score
-- * Badges are stored in the existing public.profile_achievements relation so they
--   automatically show on the player profile page (/players/[slug]).
--     rally_starter (Bronze)  "Ralli Başlanğıcı" >= 15
--     rally_master  (Silver)  "Ralli Ustası"     >= 30
--     table_ruler   (Gold)    "Masa Hakimi"      >= 50
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.arcade_highscores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'infinity',
  score INT NOT NULL CHECK (score >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_infinity UNIQUE (user_id, mode)
);

CREATE INDEX IF NOT EXISTS idx_arcade_highscores_mode_score
  ON public.arcade_highscores (mode, score DESC, updated_at ASC);

ALTER TABLE public.arcade_highscores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view high scores" ON public.arcade_highscores;
CREATE POLICY "Anyone can view high scores"
  ON public.arcade_highscores
  FOR SELECT
  USING (true);

-- Intentionally NO INSERT/UPDATE/DELETE policies: clients cannot write scores
-- directly (which would allow forging any score). All writes go through the
-- SECURITY DEFINER function below, which validates input and uses auth.uid().
DROP POLICY IF EXISTS "Authenticated users can upsert their own score" ON public.arcade_highscores;

-- ------------------------------------------------------------------------------
-- submit_arcade_score
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_arcade_score(
  p_score INT,
  p_mode TEXT DEFAULT 'infinity'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prev INT;
  v_best INT;
  v_is_new_best BOOLEAN := FALSE;
  v_rank INT;
  v_badge TEXT;
  v_awarded TEXT[] := ARRAY[]::TEXT[];
BEGIN
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

  SELECT score INTO v_prev
  FROM public.arcade_highscores
  WHERE user_id = v_uid AND mode = p_mode;

  -- Atomic upsert: only overwrite when the new score is strictly higher.
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

  -- Award any badge whose threshold the (best) score meets and not yet owned.
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
    'badges_awarded', to_jsonb(v_awarded)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_arcade_score(INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_arcade_score(INT, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- get_arcade_leaderboard
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_arcade_leaderboard(
  p_mode TEXT DEFAULT 'infinity',
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  full_name TEXT,
  slug TEXT,
  department TEXT,
  avatar_url TEXT,
  score INT,
  achieved_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY h.score DESC, h.updated_at ASC) AS rank,
    h.user_id,
    p.full_name::TEXT,
    p.slug::TEXT,
    COALESCE(NULLIF(p.department, ''), p.major_faculty)::TEXT AS department,
    p.avatar_url::TEXT,
    h.score,
    h.updated_at AS achieved_at
  FROM public.arcade_highscores h
  JOIN public.profiles p ON p.id = h.user_id
  WHERE h.mode = p_mode
    AND h.score > 0
    AND COALESCE(p.is_verified, FALSE) = TRUE
  ORDER BY h.score DESC, h.updated_at ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 100));
$$;

GRANT EXECUTE ON FUNCTION public.get_arcade_leaderboard(TEXT, INT) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- get_my_arcade_standing  (rank + best score of the calling user)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_arcade_standing(
  p_mode TEXT DEFAULT 'infinity'
)
RETURNS TABLE (
  rank BIGINT,
  score INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.rank, r.score
  FROM (
    SELECT
      h.user_id,
      h.score,
      ROW_NUMBER() OVER (ORDER BY h.score DESC, h.updated_at ASC) AS rank
    FROM public.arcade_highscores h
    JOIN public.profiles p ON p.id = h.user_id
    WHERE h.mode = p_mode
      AND h.score > 0
      AND COALESCE(p.is_verified, FALSE) = TRUE
  ) r
  WHERE r.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_arcade_standing(TEXT) TO authenticated;

-- 023_cap_max_elo_and_optimize_engine.sql
-- ELO Formula Optimization (Max 999 Cap, Set-Dominance Multiplier) & Automated Profile Achievements

-- 1. Update Coach Iftixar's honorary rating to 999 and clamp all existing profiles to [0, 999]
UPDATE public.profiles
SET current_elo = 999
WHERE LOWER(email) IN ('iftixar.coach@gmail.com', 'iftixar@bhos.edu.az')
   OR role = 'coach';

UPDATE public.profiles
SET current_elo = LEAST(999, GREATEST(0, COALESCE(current_elo, 0)))
WHERE current_elo IS NULL OR current_elo < 0 OR current_elo > 999;

-- 2. Enforce [0, 999] ELO range check constraint on public.profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profiles_min_elo;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profiles_elo_range;
ALTER TABLE public.profiles ADD CONSTRAINT chk_profiles_elo_range CHECK (current_elo >= 0 AND current_elo <= 999);

-- 3. Create profile_achievements table for automated badges
CREATE TABLE IF NOT EXISTS public.profile_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id VARCHAR(64) NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_achievements_profile_id
  ON public.profile_achievements(profile_id);

ALTER TABLE public.profile_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read of profile achievements" ON public.profile_achievements;
CREATE POLICY "Allow public read of profile achievements"
  ON public.profile_achievements
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert of profile achievements" ON public.profile_achievements;
CREATE POLICY "Allow authenticated insert of profile achievements"
  ON public.profile_achievements
  FOR INSERT
  WITH CHECK (true);

-- Seed Founding Member ('founding_member') & Top Tier ('top_tier') badges for existing eligible profiles
INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
SELECT id, 'founding_member', COALESCE(created_at, NOW())
FROM public.profiles
WHERE LOWER(email) IN (
  'iftixar.coach@gmail.com',
  'ali.iskandarli.std@bhos.edu.az',
  'ali.abdulov.std@bhos.edu.az',
  'ali.aghayev.std@bhos.edu.az',
  'huseyn.muradzade.std@bhos.edu.az',
  'fateh.mammadli.std@bhos.edu.az',
  'rinad.evezzade.std@bhos.edu.az',
  'anar.alakbarli.std@bhos.edu.az',
  'nihat.ismayilzade.std@bhos.edu.az'
)
ON CONFLICT (profile_id, badge_id) DO NOTHING;

INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
SELECT id, 'top_tier', NOW()
FROM public.profiles
WHERE current_elo >= 800
ON CONFLICT (profile_id, badge_id) DO NOTHING;

-- 4. Automated Achievement Evaluation Function
CREATE OR REPLACE FUNCTION public.evaluate_match_achievements(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
  v_match RECORD;
  v_p1 RECORD;
  v_p2 RECORD;
  v_winner_id UUID;
  v_loser_id UUID;
  v_winner_elo_before INT;
  v_loser_elo_before INT;
  v_winner_elo_after INT;
  v_last_three_winners UUID[];
  v_set_part TEXT;
  v_score_tokens TEXT[];
  v_s1 INT;
  v_s2 INT;
  v_p1_won_deuce BOOLEAN := FALSE;
  v_p2_won_deuce BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND OR v_match.player1_id IS NULL OR v_match.player2_id IS NULL THEN
    RETURN;
  END IF;

  IF v_match.status NOT IN ('confirmed', 'approved') THEN
    RETURN;
  END IF;

  SELECT * INTO v_p1 FROM public.profiles WHERE id = v_match.player1_id;
  SELECT * INTO v_p2 FROM public.profiles WHERE id = v_match.player2_id;

  -- Badge 1: "first_step" (First official match completed for both participants)
  INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
  VALUES
    (v_match.player1_id, 'first_step', NOW()),
    (v_match.player2_id, 'first_step', NOW())
  ON CONFLICT (profile_id, badge_id) DO NOTHING;

  -- Determine winner and loser
  IF COALESCE(v_match.player1_score, 0) >= COALESCE(v_match.player2_score, 0) THEN
    v_winner_id := v_match.player1_id;
    v_loser_id := v_match.player2_id;
    v_winner_elo_before := COALESCE(v_match.player1_elo_before, v_p1.current_elo, 0);
    v_loser_elo_before := COALESCE(v_match.player2_elo_before, v_p2.current_elo, 0);
    v_winner_elo_after := COALESCE(v_match.player1_elo_after, v_p1.current_elo, 0);
  ELSE
    v_winner_id := v_match.player2_id;
    v_loser_id := v_match.player1_id;
    v_winner_elo_before := COALESCE(v_match.player2_elo_before, v_p2.current_elo, 0);
    v_loser_elo_before := COALESCE(v_match.player1_elo_before, v_p1.current_elo, 0);
    v_winner_elo_after := COALESCE(v_match.player2_elo_after, v_p2.current_elo, 0);
  END IF;

  -- Badge 2: "giant_slayer" (Defeat an opponent whose ELO was at least 100 points higher)
  IF (v_loser_elo_before - v_winner_elo_before) >= 100 THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (v_winner_id, 'giant_slayer', NOW())
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;

  -- Badge 3: "top_tier" (Reach 800+ ELO points)
  IF v_winner_elo_after >= 800 OR COALESCE(v_p1.current_elo, 0) >= 800 THEN
    IF COALESCE(v_p1.current_elo, 0) >= 800 THEN
      INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
      VALUES (v_match.player1_id, 'top_tier', NOW())
      ON CONFLICT (profile_id, badge_id) DO NOTHING;
    END IF;
  END IF;

  IF COALESCE(v_p2.current_elo, 0) >= 800 THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (v_match.player2_id, 'top_tier', NOW())
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;

  -- Badge 4: "hot_streak" (Win 3 consecutive confirmed matches)
  SELECT ARRAY_AGG(sub.computed_winner)
  INTO v_last_three_winners
  FROM (
    SELECT
      CASE
        WHEN m.winner_id IS NOT NULL THEN m.winner_id
        WHEN COALESCE(m.player1_score, 0) >= COALESCE(m.player2_score, 0) THEN m.player1_id
        ELSE m.player2_id
      END AS computed_winner
    FROM public.matches m
    WHERE m.status IN ('confirmed', 'approved')
      AND (m.player1_id = v_winner_id OR m.player2_id = v_winner_id)
    ORDER BY COALESCE(m.match_date, m.created_at, NOW()) DESC
    LIMIT 3
  ) sub;

  IF ARRAY_LENGTH(v_last_three_winners, 1) = 3
     AND v_last_three_winners[1] = v_winner_id
     AND v_last_three_winners[2] = v_winner_id
     AND v_last_three_winners[3] = v_winner_id THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (v_winner_id, 'hot_streak', NOW())
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;

  -- Badge 5: "deuce_demon" (Win a set with a score of 12-10 or higher)
  IF v_match.set_scores IS NOT NULL AND LENGTH(TRIM(v_match.set_scores)) > 0 THEN
    FOREACH v_set_part IN ARRAY STRING_TO_ARRAY(v_match.set_scores, ',')
    LOOP
      v_score_tokens := REGEXP_SPLIT_TO_ARRAY(TRIM(v_set_part), '[-:]');
      IF ARRAY_LENGTH(v_score_tokens, 1) = 2 THEN
        BEGIN
          v_s1 := TRIM(v_score_tokens[1])::INT;
          v_s2 := TRIM(v_score_tokens[2])::INT;
          IF v_s1 >= 12 AND v_s2 >= 10 AND (v_s1 - v_s2) >= 2 THEN
            v_p1_won_deuce := TRUE;
          ELSIF v_s2 >= 12 AND v_s1 >= 10 AND (v_s2 - v_s1) >= 2 THEN
            v_p2_won_deuce := TRUE;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;
    END LOOP;

    IF v_p1_won_deuce THEN
      INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
      VALUES (v_match.player1_id, 'deuce_demon', NOW())
      ON CONFLICT (profile_id, badge_id) DO NOTHING;
    END IF;

    IF v_p2_won_deuce THEN
      INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
      VALUES (v_match.player2_id, 'deuce_demon', NOW())
      ON CONFLICT (profile_id, badge_id) DO NOTHING;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Optimized approve_match_safely RPC with Set-Dominance Multiplier (M) and [0, 999] Clamping
CREATE OR REPLACE FUNCTION public.approve_match_safely(
  p_match_id UUID,
  p_approver_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID,
  p_k_factor INT DEFAULT 32
)
RETURNS BOOLEAN AS $$
DECLARE
  v_match RECORD;
  v_p1 RECORD;
  v_p2 RECORD;
  v_p1_elo INT;
  v_p2_elo INT;
  v_p1_won BOOLEAN;
  v_sets_won INT;
  v_sets_lost INT;
  v_multiplier NUMERIC := 1.00;
  v_expected_p1 NUMERIC;
  v_actual_p1 NUMERIC;
  v_delta INT;
  v_p1_after INT;
  v_p2_after INT;
  v_winner_id UUID;
  v_is_auto BOOLEAN;
BEGIN
  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_match.status IN ('confirmed', 'approved', 'rejected') THEN
    RETURN FALSE;
  END IF;

  IF v_match.player1_id IS NULL OR v_match.player2_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO v_p1 FROM public.profiles WHERE id = v_match.player1_id FOR UPDATE;
  SELECT * INTO v_p2 FROM public.profiles WHERE id = v_match.player2_id FOR UPDATE;

  v_p1_elo := LEAST(999, GREATEST(0, COALESCE(v_p1.current_elo, 0)));
  v_p2_elo := LEAST(999, GREATEST(0, COALESCE(v_p2.current_elo, 0)));
  v_p1_won := COALESCE(v_match.player1_score, 0) >= COALESCE(v_match.player2_score, 0);
  v_winner_id := CASE WHEN v_p1_won THEN v_match.player1_id ELSE v_match.player2_id END;

  v_sets_won := GREATEST(COALESCE(v_match.player1_score, 0), COALESCE(v_match.player2_score, 0));
  v_sets_lost := LEAST(COALESCE(v_match.player1_score, 0), COALESCE(v_match.player2_score, 0));

  IF v_sets_lost = 0 AND v_sets_won IN (2, 3) THEN
    v_multiplier := 1.15;
  ELSIF v_sets_won = 3 AND v_sets_lost = 2 THEN
    v_multiplier := 0.90;
  ELSE
    v_multiplier := 1.00;
  END IF;

  v_expected_p1 := 1.0 / (1.0 + POWER(10.0, (v_p2_elo - v_p1_elo)::NUMERIC / 400.0));
  v_actual_p1 := CASE WHEN v_p1_won THEN 1.0 ELSE 0.0 END;
  v_delta := GREATEST(1, ROUND(p_k_factor * ABS(v_actual_p1 - v_expected_p1) * v_multiplier)::INT);

  IF v_p1_won THEN
    v_p1_after := LEAST(999, GREATEST(0, v_p1_elo + v_delta));
    v_p2_after := LEAST(999, GREATEST(0, v_p2_elo - v_delta));
  ELSE
    v_p1_after := LEAST(999, GREATEST(0, v_p1_elo - v_delta));
    v_p2_after := LEAST(999, GREATEST(0, v_p2_elo + v_delta));
  END IF;

  v_is_auto := (p_approver_id = '00000000-0000-0000-0000-000000000000'::UUID);

  UPDATE public.matches
  SET
    status = 'confirmed',
    winner_id = v_winner_id,
    player1_elo_before = v_p1_elo,
    player2_elo_before = v_p2_elo,
    player1_elo_after = v_p1_after,
    player2_elo_after = v_p2_after,
    elo_delta = v_delta,
    auto_approved = v_is_auto,
    approved_by = NULLIF(p_approver_id, '00000000-0000-0000-0000-000000000000'::UUID),
    approved_at = NOW()
  WHERE id = p_match_id;

  UPDATE public.profiles
  SET
    current_elo = v_p1_after,
    matches_played = COALESCE(matches_played, 0) + 1,
    wins = COALESCE(wins, 0) + (CASE WHEN v_p1_won THEN 1 ELSE 0 END),
    losses = COALESCE(losses, 0) + (CASE WHEN v_p1_won THEN 0 ELSE 1 END)
  WHERE id = v_match.player1_id;

  UPDATE public.profiles
  SET
    current_elo = v_p2_after,
    matches_played = COALESCE(matches_played, 0) + 1,
    wins = COALESCE(wins, 0) + (CASE WHEN NOT v_p1_won THEN 1 ELSE 0 END),
    losses = COALESCE(losses, 0) + (CASE WHEN NOT v_p1_won THEN 0 ELSE 1 END)
  WHERE id = v_match.player2_id;

  PERFORM public.evaluate_match_achievements(p_match_id);

  IF v_match.tournament_id IS NOT NULL THEN
    PERFORM public.advance_tournament_bracket(v_match.id);
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger to evaluate achievements on direct match confirmation/approval
CREATE OR REPLACE FUNCTION public.trg_fn_evaluate_match_achievements()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('confirmed', 'approved') AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.evaluate_match_achievements(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_matches_evaluate_achievements ON public.matches;
CREATE TRIGGER trg_matches_evaluate_achievements
  AFTER INSERT OR UPDATE OF status ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_evaluate_match_achievements();


-- 030_revised_set_dominance_elo.sql
-- Update approve_match_safely with revised set-dominance multiplier based strictly on set margin

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
  v_margin INT;
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
  v_margin := GREATEST(1, v_sets_won - v_sets_lost);

  IF v_margin >= 4 THEN
    v_multiplier := 1.30;
  ELSIF v_margin = 3 THEN
    v_multiplier := 1.18;
  ELSIF v_margin = 2 THEN
    v_multiplier := 1.06;
  ELSE
    v_multiplier := 0.95;
  END IF;

  v_expected_p1 := 1.0 / (1.0 + POWER(10.0, (v_p2_elo - v_p1_elo)::NUMERIC / 400.0));
  v_actual_p1 := CASE WHEN v_p1_won THEN 1.0 ELSE 0.0 END;
  v_delta := GREATEST(2, LEAST(48, ROUND(p_k_factor * ABS(v_actual_p1 - v_expected_p1) * v_multiplier)::INT));

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

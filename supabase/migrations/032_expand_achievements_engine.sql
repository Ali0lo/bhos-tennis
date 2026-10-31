-- ============================================================================
-- Migration 032: Expand Achievement Engine to 12 Official Badges (3-Tier System)
-- ============================================================================
-- Badges supported:
--   1. first_step          (Blue / Common)   - Complete first official match
--   2. clean_sweep         (Blue / Common)   - Win a match 2-0, 3-0, or 4-0
--   3. campus_ambassador   (Blue / Common)   - Play confirmed matches against opponents from >= 3 distinct departments
--   4. hot_streak          (Blue / Common)   - Win 3 consecutive confirmed matches
--   5. deuce_demon         (Blue / Common)   - Win a set 12-10 or higher
--   6. comeback_king       (Crimson / Rare)  - Win in a deciding final set (2-1, 3-2, 4-3) or after losing Set 1
--   7. club_veteran        (Crimson / Rare)  - Complete >= 25 confirmed matches
--   8. giant_slayer        (Gold / Legendary)- Defeat an opponent with >= 100 higher ELO
--   9. top_tier            (Gold / Legendary)- Reach >= 800 ELO
--  10. unstoppable_streak  (Gold / Legendary)- Win 7 consecutive confirmed matches
--  11. tournament_champion (Gold / Legendary)- Win an official club tournament
--  12. founding_member     (Gold / Legendary)- Founding roster member
-- ============================================================================

CREATE OR REPLACE FUNCTION public.evaluate_match_achievements(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_p1 RECORD;
  v_p2 RECORD;
  v_winner_id UUID;
  v_winner_score INTEGER;
  v_loser_score INTEGER;
  v_winner_elo_before INTEGER;
  v_loser_elo_before INTEGER;
  v_winner_is_p1 BOOLEAN;
  v_recent_winners UUID[];
  v_streak_3 BOOLEAN := FALSE;
  v_streak_7 BOOLEAN := FALSE;
  v_set_token TEXT;
  v_set_parts TEXT[];
  v_g1 INTEGER;
  v_g2 INTEGER;
  v_set_idx INTEGER := 0;
  v_winner_lost_set1 BOOLEAN := FALSE;
  v_p1_dept_count INTEGER := 0;
  v_p2_dept_count INTEGER := 0;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND OR v_match.status NOT IN ('confirmed', 'approved') THEN
    RETURN;
  END IF;

  SELECT * INTO v_p1 FROM public.profiles WHERE id = v_match.player1_id;
  SELECT * INTO v_p2 FROM public.profiles WHERE id = v_match.player2_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_winner_is_p1 := v_match.player1_score > v_match.player2_score;

  IF v_winner_is_p1 THEN
    v_winner_id := v_p1.id;
    v_winner_score := v_match.player1_score;
    v_loser_score := v_match.player2_score;
    v_winner_elo_before := COALESCE(v_match.player1_elo_before, v_p1.current_elo);
    v_loser_elo_before := COALESCE(v_match.player2_elo_before, v_p2.current_elo);
  ELSE
    v_winner_id := v_p2.id;
    v_winner_score := v_match.player2_score;
    v_loser_score := v_match.player1_score;
    v_winner_elo_before := COALESCE(v_match.player2_elo_before, v_p2.current_elo);
    v_loser_elo_before := COALESCE(v_match.player1_elo_before, v_p1.current_elo);
  END IF;

  -- 1. first_step ("İlk Addım")
  IF COALESCE(v_p1.matches_played, 0) >= 1 THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (v_p1.id, 'first_step', COALESCE(v_match.match_date, NOW()))
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;

  IF COALESCE(v_p2.matches_played, 0) >= 1 THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (v_p2.id, 'first_step', COALESCE(v_match.match_date, NOW()))
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;

  -- 2. clean_sweep ("Quru Hesab"): 2-0, 3-0, or 4-0
  IF v_winner_score >= 2 AND v_loser_score = 0 THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (v_winner_id, 'clean_sweep', COALESCE(v_match.match_date, NOW()))
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;

  -- 3. club_veteran ("Klub Veteranı"): >= 25 confirmed matches
  IF COALESCE(v_p1.matches_played, 0) >= 25 THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (v_p1.id, 'club_veteran', COALESCE(v_match.match_date, NOW()))
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;

  IF COALESCE(v_p2.matches_played, 0) >= 25 THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (v_p2.id, 'club_veteran', COALESCE(v_match.match_date, NOW()))
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;

  -- 4. top_tier ("BANM Elitası"): >= 800 ELO
  IF COALESCE(v_p1.current_elo, 0) >= 800 OR COALESCE(v_match.player1_elo_after, 0) >= 800 THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (v_p1.id, 'top_tier', COALESCE(v_match.match_date, NOW()))
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;

  IF COALESCE(v_p2.current_elo, 0) >= 800 OR COALESCE(v_match.player2_elo_after, 0) >= 800 THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (v_p2.id, 'top_tier', COALESCE(v_match.match_date, NOW()))
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;

  -- 5. giant_slayer ("Nəhəng Qatili"): opponent ELO >= winner ELO + 100
  IF (v_loser_elo_before - v_winner_elo_before) >= 100 THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (v_winner_id, 'giant_slayer', COALESCE(v_match.match_date, NOW()))
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;

  -- 6. hot_streak (3 wins) & unstoppable_streak (7 wins)
  SELECT ARRAY_AGG(sub.w_id ORDER BY sub.match_date DESC, sub.created_at DESC)
  INTO v_recent_winners
  FROM (
    SELECT
      CASE WHEN m.player1_score > m.player2_score THEN m.player1_id ELSE m.player2_id END AS w_id,
      m.match_date,
      m.created_at
    FROM public.matches m
    WHERE m.status IN ('confirmed', 'approved')
      AND (m.player1_id = v_winner_id OR m.player2_id = v_winner_id)
    ORDER BY m.match_date DESC, m.created_at DESC
    LIMIT 7
  ) sub;

  IF array_length(v_recent_winners, 1) >= 3 THEN
    v_streak_3 := (
      v_recent_winners[1] = v_winner_id AND
      v_recent_winners[2] = v_winner_id AND
      v_recent_winners[3] = v_winner_id
    );
    IF v_streak_3 THEN
      INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
      VALUES (v_winner_id, 'hot_streak', COALESCE(v_match.match_date, NOW()))
      ON CONFLICT (profile_id, badge_id) DO NOTHING;
    END IF;
  END IF;

  IF array_length(v_recent_winners, 1) = 7 THEN
    v_streak_7 := (
      v_recent_winners[1] = v_winner_id AND
      v_recent_winners[2] = v_winner_id AND
      v_recent_winners[3] = v_winner_id AND
      v_recent_winners[4] = v_winner_id AND
      v_recent_winners[5] = v_winner_id AND
      v_recent_winners[6] = v_winner_id AND
      v_recent_winners[7] = v_winner_id
    );
    IF v_streak_7 THEN
      INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
      VALUES (v_winner_id, 'unstoppable_streak', COALESCE(v_match.match_date, NOW()))
      ON CONFLICT (profile_id, badge_id) DO NOTHING;
    END IF;
  END IF;

  -- 7. deuce_demon ("Gərgin Mübarizə") & Set 1 check for comeback_king
  IF v_match.set_scores IS NOT NULL AND btrim(v_match.set_scores) <> '' THEN
    FOREACH v_set_token IN ARRAY string_to_array(v_match.set_scores, ',')
    LOOP
      v_set_idx := v_set_idx + 1;
      v_set_parts := regexp_split_to_array(btrim(v_set_token), '[-:]');
      IF array_length(v_set_parts, 1) = 2 THEN
        BEGIN
          v_g1 := btrim(v_set_parts[1])::INTEGER;
          v_g2 := btrim(v_set_parts[2])::INTEGER;

          IF v_set_idx = 1 THEN
            IF (v_winner_is_p1 AND v_g1 < v_g2) OR (NOT v_winner_is_p1 AND v_g2 < v_g1) THEN
              v_winner_lost_set1 := TRUE;
            END IF;
          END IF;

          IF v_g1 >= 12 AND v_g2 >= 10 AND (v_g1 - v_g2) >= 2 THEN
            INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
            VALUES (v_p1.id, 'deuce_demon', COALESCE(v_match.match_date, NOW()))
            ON CONFLICT (profile_id, badge_id) DO NOTHING;
          ELSIF v_g2 >= 12 AND v_g1 >= 10 AND (v_g2 - v_g1) >= 2 THEN
            INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
            VALUES (v_p2.id, 'deuce_demon', COALESCE(v_match.match_date, NOW()))
            ON CONFLICT (profile_id, badge_id) DO NOTHING;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;
    END LOOP;
  END IF;

  -- 8. comeback_king ("Geri Dönüş Kralı"): deciding final set (2-1, 3-2, 4-3) OR won after losing Set 1
  IF (
    (v_winner_score = 2 AND v_loser_score = 1) OR
    (v_winner_score = 3 AND v_loser_score = 2) OR
    (v_winner_score = 4 AND v_loser_score = 3) OR
    v_winner_lost_set1
  ) THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (v_winner_id, 'comeback_king', COALESCE(v_match.match_date, NOW()))
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;

  -- 9. campus_ambassador ("Fakültələrarası Səfir"): opponents from >= 3 distinct departments
  SELECT COUNT(DISTINCT lower(btrim(COALESCE(opp.major_faculty, opp.department, opp.faculty, ''))))
  INTO v_p1_dept_count
  FROM public.matches m
  JOIN public.profiles opp
    ON opp.id = CASE WHEN m.player1_id = v_p1.id THEN m.player2_id ELSE m.player1_id END
  WHERE m.status IN ('confirmed', 'approved')
    AND (m.player1_id = v_p1.id OR m.player2_id = v_p1.id)
    AND btrim(COALESCE(opp.major_faculty, opp.department, opp.faculty, '')) <> '';

  IF v_p1_dept_count >= 3 THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (v_p1.id, 'campus_ambassador', COALESCE(v_match.match_date, NOW()))
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;

  SELECT COUNT(DISTINCT lower(btrim(COALESCE(opp.major_faculty, opp.department, opp.faculty, ''))))
  INTO v_p2_dept_count
  FROM public.matches m
  JOIN public.profiles opp
    ON opp.id = CASE WHEN m.player1_id = v_p2.id THEN m.player2_id ELSE m.player1_id END
  WHERE m.status IN ('confirmed', 'approved')
    AND (m.player1_id = v_p2.id OR m.player2_id = v_p2.id)
    AND btrim(COALESCE(opp.major_faculty, opp.department, opp.faculty, '')) <> '';

  IF v_p2_dept_count >= 3 THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (v_p2.id, 'campus_ambassador', COALESCE(v_match.match_date, NOW()))
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;
END;
$$;


CREATE OR REPLACE FUNCTION public.evaluate_player_achievements(p_player_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof RECORD;
  v_dept_count INTEGER := 0;
  v_has_tourney_win BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_prof FROM public.profiles WHERE id = p_player_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF COALESCE(v_prof.matches_played, 0) >= 1 THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (p_player_id, 'first_step', NOW())
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;

  IF COALESCE(v_prof.matches_played, 0) >= 25 THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (p_player_id, 'club_veteran', NOW())
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;

  IF COALESCE(v_prof.current_elo, 0) >= 800 THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (p_player_id, 'top_tier', NOW())
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;

  IF v_prof.origin = 'İlkin Heyət' THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (p_player_id, 'founding_member', COALESCE(v_prof.created_at, NOW()))
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;

  SELECT COUNT(DISTINCT lower(btrim(COALESCE(opp.major_faculty, opp.department, opp.faculty, ''))))
  INTO v_dept_count
  FROM public.matches m
  JOIN public.profiles opp
    ON opp.id = CASE WHEN m.player1_id = p_player_id THEN m.player2_id ELSE m.player1_id END
  WHERE m.status IN ('confirmed', 'approved')
    AND (m.player1_id = p_player_id OR m.player2_id = p_player_id)
    AND btrim(COALESCE(opp.major_faculty, opp.department, opp.faculty, '')) <> '';

  IF v_dept_count >= 3 THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (p_player_id, 'campus_ambassador', NOW())
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.tournaments t WHERE t.winner_id = p_player_id
  ) INTO v_has_tourney_win;

  IF v_has_tourney_win THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (p_player_id, 'tournament_champion', NOW())
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;
END;
$$;


CREATE OR REPLACE FUNCTION public.approve_match_safely(
  p_match_id UUID,
  p_approver_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_match RECORD;
  v_p1 RECORD;
  v_p2 RECORD;
  v_winner_id UUID;
  v_p1_won BOOLEAN;
  v_k1 NUMERIC := 32;
  v_k2 NUMERIC := 32;
  v_exp1 NUMERIC;
  v_exp2 NUMERIC;
  v_raw_delta1 INTEGER;
  v_raw_delta2 INTEGER;
  v_new_elo1 INTEGER;
  v_new_elo2 INTEGER;
  v_applied_delta INTEGER;
  v_effective_approver UUID;
BEGIN
  v_caller_id := auth.uid();

  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found: %', p_match_id;
  END IF;

  IF v_match.status IN ('confirmed', 'approved') THEN
    RETURN jsonb_build_object(
      'status', 'already_confirmed',
      'match_id', v_match.id,
      'player1_elo_after', v_match.player1_elo_after,
      'player2_elo_after', v_match.player2_elo_after,
      'elo_delta', v_match.elo_delta
    );
  END IF;

  IF v_match.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending matches can be approved (current status: %)', v_match.status;
  END IF;

  IF v_caller_id IS NOT NULL THEN
    IF NOT public.is_club_admin() THEN
      IF v_match.logged_by = v_caller_id THEN
        RAISE EXCEPTION 'Unauthorized: You cannot approve a match that you logged yourself.';
      END IF;
      IF v_caller_id <> v_match.player1_id AND v_caller_id <> v_match.player2_id THEN
        RAISE EXCEPTION 'Unauthorized: Only the opposing participant or a club administrator can approve this match.';
      END IF;
    END IF;
    v_effective_approver := v_caller_id;
  ELSE
    v_effective_approver := p_approver_id;
  END IF;

  IF v_match.player1_id < v_match.player2_id THEN
    SELECT * INTO v_p1 FROM public.profiles WHERE id = v_match.player1_id FOR UPDATE;
    SELECT * INTO v_p2 FROM public.profiles WHERE id = v_match.player2_id FOR UPDATE;
  ELSE
    SELECT * INTO v_p2 FROM public.profiles WHERE id = v_match.player2_id FOR UPDATE;
    SELECT * INTO v_p1 FROM public.profiles WHERE id = v_match.player1_id FOR UPDATE;
  END IF;

  IF v_p1.id IS NULL OR v_p2.id IS NULL THEN
    RAISE EXCEPTION 'Both player profiles must exist to approve a match.';
  END IF;

  v_p1_won := v_match.player1_score > v_match.player2_score;
  v_winner_id := CASE WHEN v_p1_won THEN v_p1.id ELSE v_p2.id END;

  IF COALESCE(v_p1.matches_played, 0) > 30 THEN v_k1 := 24; END IF;
  IF COALESCE(v_p2.matches_played, 0) > 30 THEN v_k2 := 24; END IF;

  v_exp1 := 1.0 / (1.0 + power(10.0, (COALESCE(v_p2.current_elo, 0) - COALESCE(v_p1.current_elo, 0))::NUMERIC / 400.0));
  v_exp2 := 1.0 - v_exp1;

  v_raw_delta1 := round(v_k1 * ((CASE WHEN v_p1_won THEN 1.0 ELSE 0.0 END) - v_exp1))::INTEGER;
  v_raw_delta2 := round(v_k2 * ((CASE WHEN v_p1_won THEN 0.0 ELSE 1.0 END) - v_exp2))::INTEGER;

  v_new_elo1 := LEAST(2600, GREATEST(0, COALESCE(v_p1.current_elo, 0) + v_raw_delta1));
  v_new_elo2 := LEAST(2600, GREATEST(0, COALESCE(v_p2.current_elo, 0) + v_raw_delta2));

  v_applied_delta := GREATEST(
    abs(v_new_elo1 - COALESCE(v_p1.current_elo, 0)),
    abs(v_new_elo2 - COALESCE(v_p2.current_elo, 0))
  );

  UPDATE public.matches
  SET
    status = 'confirmed',
    winner_id = v_winner_id,
    player1_elo_before = COALESCE(v_p1.current_elo, 0),
    player2_elo_before = COALESCE(v_p2.current_elo, 0),
    player1_elo_after = v_new_elo1,
    player2_elo_after = v_new_elo2,
    elo_delta = v_applied_delta,
    approved_by = v_effective_approver,
    approved_at = NOW()
  WHERE id = p_match_id;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  UPDATE public.profiles
  SET
    current_elo = v_new_elo1,
    matches_played = COALESCE(matches_played, 0) + 1,
    wins = COALESCE(wins, 0) + (CASE WHEN v_p1_won THEN 1 ELSE 0 END),
    losses = COALESCE(losses, 0) + (CASE WHEN v_p1_won THEN 0 ELSE 1 END),
    updated_at = NOW()
  WHERE id = v_p1.id;

  UPDATE public.profiles
  SET
    current_elo = v_new_elo2,
    matches_played = COALESCE(matches_played, 0) + 1,
    wins = COALESCE(wins, 0) + (CASE WHEN v_p1_won THEN 0 ELSE 1 END),
    losses = COALESCE(losses, 0) + (CASE WHEN v_p1_won THEN 1 ELSE 0 END),
    updated_at = NOW()
  WHERE id = v_p2.id;

  IF v_match.tournament_id IS NOT NULL THEN
    PERFORM public.advance_tournament_bracket(v_match.id);
  END IF;

  BEGIN
    PERFORM public.evaluate_match_achievements(p_match_id);
    PERFORM public.evaluate_player_achievements(v_p1.id);
    PERFORM public.evaluate_player_achievements(v_p2.id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'status', 'confirmed',
    'match_id', v_match.id,
    'winner_id', v_winner_id,
    'player1_elo_before', COALESCE(v_p1.current_elo, 0),
    'player2_elo_before', COALESCE(v_p2.current_elo, 0),
    'player1_elo_after', v_new_elo1,
    'player2_elo_after', v_new_elo2,
    'elo_delta', v_applied_delta
  );
END;
$$;


CREATE OR REPLACE FUNCTION public.advance_tournament_bracket(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_tourney RECORD;
  v_winner RECORD;
  v_rounds JSONB;
  v_round_count INTEGER;
  v_r_idx INTEGER;
  v_m_idx INTEGER;
  v_round JSONB;
  v_matches JSONB;
  v_node JSONB;
  v_found_r INTEGER := -1;
  v_found_m INTEGER := -1;
  v_next_r INTEGER;
  v_next_m INTEGER;
  v_next_slot INTEGER;
  v_next_node JSONB;
  v_winner_json JSONB;
  v_other_player JSONB;
  v_next_status TEXT;
  v_new_status TEXT;
  v_new_winner_id UUID;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND OR v_match.tournament_id IS NULL THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'not_tournament_match');
  END IF;

  IF v_match.status NOT IN ('confirmed', 'approved') THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'match_not_confirmed');
  END IF;

  SELECT * INTO v_tourney
  FROM public.tournaments
  WHERE id = v_match.tournament_id
  FOR UPDATE;

  IF NOT FOUND OR v_tourney.bracket_data IS NULL THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'no_bracket_data');
  END IF;

  v_new_winner_id := COALESCE(
    v_match.winner_id,
    CASE WHEN v_match.player1_score > v_match.player2_score THEN v_match.player1_id ELSE v_match.player2_id END
  );

  SELECT * INTO v_winner FROM public.profiles WHERE id = v_new_winner_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'winner_profile_not_found');
  END IF;

  v_winner_json := jsonb_build_object(
    'id', v_winner.id,
    'full_name', v_winner.full_name,
    'email', v_winner.email,
    'major_faculty', v_winner.major_faculty,
    'current_elo', v_winner.current_elo,
    'role', v_winner.role,
    'avatar_url', v_winner.avatar_url
  );

  v_rounds := COALESCE(v_tourney.bracket_data->'rounds', '[]'::JSONB);
  v_round_count := jsonb_array_length(v_rounds);

  IF v_round_count = 0 THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'empty_rounds');
  END IF;

  FOR v_r_idx IN 0..(v_round_count - 1) LOOP
    v_round := v_rounds->v_r_idx;
    v_matches := COALESCE(v_round->'matches', '[]'::JSONB);

    FOR v_m_idx IN 0..(jsonb_array_length(v_matches) - 1) LOOP
      v_node := v_matches->v_m_idx;

      IF (v_node->>'id') = p_match_id::TEXT
         OR (
           v_match.round_number IS NOT NULL
           AND v_match.bracket_node_index IS NOT NULL
           AND (v_r_idx + 1) = v_match.round_number
           AND v_m_idx = v_match.bracket_node_index
         )
         OR (
           (v_node->>'status') <> 'completed'
           AND (
             ((v_node->'player1'->>'id') = v_match.player1_id::TEXT AND (v_node->'player2'->>'id') = v_match.player2_id::TEXT)
             OR
             ((v_node->'player1'->>'id') = v_match.player2_id::TEXT AND (v_node->'player2'->>'id') = v_match.player1_id::TEXT)
           )
         )
      THEN
        v_found_r := v_r_idx;
        v_found_m := v_m_idx;
        EXIT;
      END IF;
    END LOOP;

    IF v_found_r >= 0 THEN
      EXIT;
    END IF;
  END LOOP;

  IF v_found_r < 0 THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'node_not_found');
  END IF;

  v_node := (v_rounds->v_found_r->'matches')->v_found_m;

  IF (v_node->'player1'->>'id') = v_match.player1_id::TEXT THEN
    v_node := jsonb_set(v_node, '{player1_score}', to_jsonb(v_match.player1_score), true);
    v_node := jsonb_set(v_node, '{player2_score}', to_jsonb(v_match.player2_score), true);
  ELSE
    v_node := jsonb_set(v_node, '{player1_score}', to_jsonb(v_match.player2_score), true);
    v_node := jsonb_set(v_node, '{player2_score}', to_jsonb(v_match.player1_score), true);
  END IF;

  v_node := jsonb_set(v_node, '{set_scores}', to_jsonb(COALESCE(v_match.set_scores, '')), true);
  v_node := jsonb_set(v_node, '{winner_id}', to_jsonb(v_new_winner_id::TEXT), true);
  v_node := jsonb_set(v_node, '{status}', '"completed"'::JSONB, true);

  v_rounds := jsonb_set(
    v_rounds,
    ARRAY[v_found_r::TEXT, 'matches', v_found_m::TEXT],
    v_node,
    true
  );

  v_new_status := v_tourney.status;

  IF v_found_r < (v_round_count - 1) THEN
    v_next_r := v_found_r + 1;
    v_next_m := v_found_m / 2;
    v_next_slot := CASE WHEN (v_found_m % 2) = 0 THEN 1 ELSE 2 END;

    v_next_node := (v_rounds->v_next_r->'matches')->v_next_m;

    IF v_next_node IS NOT NULL THEN
      IF v_next_slot = 1 THEN
        v_next_node := jsonb_set(v_next_node, '{player1}', v_winner_json, true);
        v_other_player := v_next_node->'player2';
      ELSE
        v_next_node := jsonb_set(v_next_node, '{player2}', v_winner_json, true);
        v_other_player := v_next_node->'player1';
      END IF;

      IF v_other_player IS NOT NULL AND jsonb_typeof(v_other_player) = 'object' AND (v_other_player->>'id') IS NOT NULL THEN
        v_next_status := 'ready';
      ELSE
        v_next_status := 'waiting';
      END IF;

      IF (v_next_node->>'status') <> 'completed' THEN
        v_next_node := jsonb_set(v_next_node, '{status}', to_jsonb(v_next_status), true);
      END IF;

      v_rounds := jsonb_set(
        v_rounds,
        ARRAY[v_next_r::TEXT, 'matches', v_next_m::TEXT],
        v_next_node,
        true
      );
    END IF;
  ELSE
    v_new_status := 'completed';
  END IF;

  UPDATE public.tournaments
  SET
    bracket_data = jsonb_set(COALESCE(bracket_data, '{}'::JSONB), '{rounds}', v_rounds, true),
    status = v_new_status,
    winner_id = CASE WHEN v_new_status = 'completed' THEN v_new_winner_id ELSE winner_id END
  WHERE id = v_tourney.id;

  IF v_new_status = 'completed' AND v_new_winner_id IS NOT NULL THEN
    INSERT INTO public.profile_achievements (profile_id, badge_id, unlocked_at)
    VALUES (v_new_winner_id, 'tournament_champion', NOW())
    ON CONFLICT (profile_id, badge_id) DO NOTHING;
  END IF;

  IF v_match.next_match_id IS NOT NULL THEN
    IF (v_found_m % 2) = 0 THEN
      UPDATE public.matches
      SET player1_id = v_new_winner_id
      WHERE id = v_match.next_match_id AND status IN ('waiting', 'scheduled', 'pending');
    ELSE
      UPDATE public.matches
      SET player2_id = v_new_winner_id
      WHERE id = v_match.next_match_id AND status IN ('waiting', 'scheduled', 'pending');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'advanced', true,
    'tournament_id', v_tourney.id,
    'round_index', v_found_r,
    'match_index', v_found_m,
    'winner_id', v_new_winner_id,
    'tournament_status', v_new_status
  );
END;
$$;

-- Backfill achievements for existing eligible profiles and matches
DO $$
DECLARE
  v_m RECORD;
  v_p RECORD;
BEGIN
  FOR v_m IN
    SELECT id FROM public.matches WHERE status IN ('confirmed', 'approved') ORDER BY match_date ASC, created_at ASC
  LOOP
    PERFORM public.evaluate_match_achievements(v_m.id);
  END LOOP;

  FOR v_p IN
    SELECT id FROM public.profiles
  LOOP
    PERFORM public.evaluate_player_achievements(v_p.id);
  END LOOP;
END;
$$;


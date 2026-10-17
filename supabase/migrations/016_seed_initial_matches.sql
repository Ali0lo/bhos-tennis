-- 016_seed_initial_matches.sql
-- Seeds initial match history for players dynamically referencing their profile UUIDs

DO $$
DECLARE
  v_ali UUID;
  v_iftixar UUID;
  v_abdulov UUID;
  v_aghayev UUID;
  v_muradzade UUID;
  v_fateh UUID;
  v_rinad UUID;
BEGIN
  SELECT id INTO v_ali FROM public.profiles WHERE email ILIKE '%ali.iskandarli%' LIMIT 1;
  SELECT id INTO v_iftixar FROM public.profiles WHERE email ILIKE '%iftixar%' LIMIT 1;
  SELECT id INTO v_abdulov FROM public.profiles WHERE email ILIKE '%abdulov%' LIMIT 1;
  SELECT id INTO v_aghayev FROM public.profiles WHERE email ILIKE '%ali.aghayev%' LIMIT 1;
  SELECT id INTO v_muradzade FROM public.profiles WHERE email ILIKE '%muradzade%' LIMIT 1;
  SELECT id INTO v_fateh FROM public.profiles WHERE email ILIKE '%fateh%' LIMIT 1;
  SELECT id INTO v_rinad FROM public.profiles WHERE email ILIKE '%rinad%' LIMIT 1;

  -- 1. Ali Iskandarli vs Ali Abdulov
  IF v_ali IS NOT NULL AND v_abdulov IS NOT NULL AND v_iftixar IS NOT NULL THEN
    INSERT INTO public.matches (
      tournament_title, player1_id, player1_name, player2_id, player2_name, logged_by, logged_by_name,
      player1_score, player2_score, set_scores, player1_elo_before, player2_elo_before,
      player1_elo_after, player2_elo_after, elo_delta, status, match_date
    ) VALUES (
      'BHOS Autumn Open Championship 2026', v_ali, 'Ali Iskandarli', v_abdulov, 'Ali Abdulov', v_iftixar, 'Iftixar Meherremov',
      3, 1, '11-8, 9-11, 11-7, 11-9', 1000, 1000, 1016, 1000, 16, 'confirmed', '2026-09-18 14:30:00+00'
    );
  END IF;

  -- 2. Ali Aghayev vs Huseyn Muradzada
  IF v_aghayev IS NOT NULL AND v_muradzade IS NOT NULL AND v_iftixar IS NOT NULL THEN
    INSERT INTO public.matches (
      tournament_title, player1_id, player1_name, player2_id, player2_name, logged_by, logged_by_name,
      player1_score, player2_score, set_scores, player1_elo_before, player2_elo_before,
      player1_elo_after, player2_elo_after, elo_delta, status, match_date
    ) VALUES (
      'BHOS Autumn Open Championship 2026', v_aghayev, 'Ali Aghayev', v_muradzade, 'Huseyn Muradzada', v_iftixar, 'Iftixar Meherremov',
      3, 2, '11-9, 8-11, 11-7, 10-12, 11-8', 1000, 1000, 1016, 1000, 16, 'confirmed', '2026-09-19 11:00:00+00'
    );
  END IF;

  -- 3. Fateh Mammadli vs Rinad Evezzade
  IF v_fateh IS NOT NULL AND v_rinad IS NOT NULL AND v_iftixar IS NOT NULL THEN
    INSERT INTO public.matches (
      tournament_title, player1_id, player1_name, player2_id, player2_name, logged_by, logged_by_name,
      player1_score, player2_score, set_scores, player1_elo_before, player2_elo_before,
      player1_elo_after, player2_elo_after, elo_delta, status, match_date
    ) VALUES (
      'BHOS Autumn Open Championship 2026', v_fateh, 'Fateh Mammadli', v_rinad, 'Rinad Evezzade', v_iftixar, 'Iftixar Meherremov',
      3, 0, '11-6, 11-8, 11-9', 1000, 1000, 1016, 1000, 16, 'confirmed', '2026-09-20 16:15:00+00'
    );
  END IF;

  -- 4. Ali Iskandarli vs Ali Aghayev
  IF v_ali IS NOT NULL AND v_aghayev IS NOT NULL AND v_iftixar IS NOT NULL THEN
    INSERT INTO public.matches (
      tournament_title, player1_id, player1_name, player2_id, player2_name, logged_by, logged_by_name,
      player1_score, player2_score, set_scores, player1_elo_before, player2_elo_before,
      player1_elo_after, player2_elo_after, elo_delta, status, match_date
    ) VALUES (
      'BHOS Autumn Open Championship 2026', v_ali, 'Ali Iskandarli', v_aghayev, 'Ali Aghayev', v_iftixar, 'Iftixar Meherremov',
      3, 1, '11-7, 11-9, 9-11, 11-8', 1016, 1016, 1032, 1000, 16, 'confirmed', '2026-09-22 17:00:00+00'
    );
  END IF;

  -- 5. Ali Iskandarli vs Fateh Mammadli
  IF v_ali IS NOT NULL AND v_fateh IS NOT NULL AND v_iftixar IS NOT NULL THEN
    INSERT INTO public.matches (
      tournament_title, player1_id, player1_name, player2_id, player2_name, logged_by, logged_by_name,
      player1_score, player2_score, set_scores, player1_elo_before, player2_elo_before,
      player1_elo_after, player2_elo_after, elo_delta, status, match_date
    ) VALUES (
      'BHOS Autumn Open Championship 2026 - Final', v_ali, 'Ali Iskandarli', v_fateh, 'Fateh Mammadli', v_iftixar, 'Iftixar Meherremov',
      3, 2, '11-9, 9-11, 11-8, 10-12, 11-9', 1032, 1016, 1048, 1000, 16, 'confirmed', '2026-09-25 18:30:00+00'
    );
  END IF;

  -- Update profiles matches_played, wins, losses to stay consistent
  IF v_ali IS NOT NULL THEN
    UPDATE public.profiles SET matches_played = 3, wins = 3, losses = 0, current_elo = 1048 WHERE id = v_ali;
  END IF;

  IF v_abdulov IS NOT NULL THEN
    UPDATE public.profiles SET matches_played = 1, wins = 0, losses = 1 WHERE id = v_abdulov;
  END IF;

  IF v_aghayev IS NOT NULL THEN
    UPDATE public.profiles SET matches_played = 2, wins = 1, losses = 1 WHERE id = v_aghayev;
  END IF;

  IF v_muradzade IS NOT NULL THEN
    UPDATE public.profiles SET matches_played = 1, wins = 0, losses = 1 WHERE id = v_muradzade;
  END IF;

  IF v_fateh IS NOT NULL THEN
    UPDATE public.profiles SET matches_played = 2, wins = 1, losses = 1 WHERE id = v_fateh;
  END IF;

  IF v_rinad IS NOT NULL THEN
    UPDATE public.profiles SET matches_played = 1, wins = 0, losses = 1 WHERE id = v_rinad;
  END IF;

END $$;

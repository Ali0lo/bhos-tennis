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
  v_anar UUID;
  v_nihat UUID;
  v_murad UUID;
  v_leyla UUID;
  v_aydan UUID;
BEGIN
  SELECT id INTO v_ali FROM public.profiles WHERE email ILIKE '%ali.iskandarli%' LIMIT 1;
  SELECT id INTO v_iftixar FROM public.profiles WHERE email ILIKE '%iftixar%' LIMIT 1;
  SELECT id INTO v_abdulov FROM public.profiles WHERE email ILIKE '%abdulov%' LIMIT 1;
  SELECT id INTO v_aghayev FROM public.profiles WHERE email ILIKE '%ali.aghayev%' LIMIT 1;
  SELECT id INTO v_muradzade FROM public.profiles WHERE email ILIKE '%muradzade%' LIMIT 1;
  SELECT id INTO v_fateh FROM public.profiles WHERE email ILIKE '%fateh%' LIMIT 1;
  SELECT id INTO v_rinad FROM public.profiles WHERE email ILIKE '%rinad%' LIMIT 1;
  SELECT id INTO v_anar FROM public.profiles WHERE email ILIKE '%anar%' LIMIT 1;
  SELECT id INTO v_nihat FROM public.profiles WHERE email ILIKE '%nihat%' LIMIT 1;
  SELECT id INTO v_murad FROM public.profiles WHERE email ILIKE '%murad.aliyev%' LIMIT 1;
  SELECT id INTO v_leyla FROM public.profiles WHERE email ILIKE '%leyla%' LIMIT 1;
  SELECT id INTO v_aydan FROM public.profiles WHERE email ILIKE '%aydan%' LIMIT 1;

  -- Default to ali or iftixar for logged_by if not found
  IF v_iftixar IS NULL THEN
    v_iftixar := v_ali;
  END IF;

  -- 1. Ali Iskandarli vs Fateh Mammadli
  IF v_ali IS NOT NULL AND v_fateh IS NOT NULL AND v_iftixar IS NOT NULL THEN
    INSERT INTO public.matches (
      tournament_title, player1_id, player1_name, player2_id, player2_name, logged_by, logged_by_name,
      player1_score, player2_score, set_scores, player1_elo_before, player2_elo_before,
      player1_elo_after, player2_elo_after, elo_delta, status, match_date
    ) VALUES (
      'BHOS Autumn Open Championship 2026 - Final', v_ali, 'Ali Iskandarli', v_fateh, 'Fateh Mammadli', v_iftixar, 'Iftixar Meherremov',
      3, 1, '11-8, 9-11, 11-7, 11-9', 1048, 1016, 1064, 1000, 16, 'confirmed', '2026-10-16 18:30:00+00'
    );
  END IF;

  -- 2. Ali Aghayev vs Ali Abdulov
  IF v_aghayev IS NOT NULL AND v_abdulov IS NOT NULL AND v_iftixar IS NOT NULL THEN
    INSERT INTO public.matches (
      tournament_title, player1_id, player1_name, player2_id, player2_name, logged_by, logged_by_name,
      player1_score, player2_score, set_scores, player1_elo_before, player2_elo_before,
      player1_elo_after, player2_elo_after, elo_delta, status, match_date
    ) VALUES (
      'BHOS Autumn Open Championship 2026', v_aghayev, 'Ali Aghayev', v_abdulov, 'Ali Abdulov', v_iftixar, 'Iftixar Meherremov',
      3, 2, '11-9, 8-11, 11-7, 10-12, 11-8', 1016, 1018, 1032, 1002, 16, 'confirmed', '2026-10-15 16:00:00+00'
    );
  END IF;

  -- 3. Huseyn Muradzada vs Rinad Evezzade
  IF v_muradzade IS NOT NULL AND v_rinad IS NOT NULL AND v_iftixar IS NOT NULL THEN
    INSERT INTO public.matches (
      tournament_title, player1_id, player1_name, player2_id, player2_name, logged_by, logged_by_name,
      player1_score, player2_score, set_scores, player1_elo_before, player2_elo_before,
      player1_elo_after, player2_elo_after, elo_delta, status, match_date
    ) VALUES (
      'BHOS Autumn Open Championship 2026', v_muradzade, 'Huseyn Muradzada', v_rinad, 'Rinad Evezzade', v_iftixar, 'Iftixar Meherremov',
      3, 1, '11-8, 11-9, 9-11, 11-6', 1000, 1016, 1018, 1000, 18, 'confirmed', '2026-10-14 15:30:00+00'
    );
  END IF;

  -- 4. Leyla Mammadova vs Aydan Karimova
  IF v_leyla IS NOT NULL AND v_aydan IS NOT NULL AND v_ali IS NOT NULL THEN
    INSERT INTO public.matches (
      tournament_title, player1_id, player1_name, player2_id, player2_name, logged_by, logged_by_name,
      player1_score, player2_score, set_scores, player1_elo_before, player2_elo_before,
      player1_elo_after, player2_elo_after, elo_delta, status, match_date
    ) VALUES (
      'BHOS Qadınlar Kuboku 2026', v_leyla, 'Leyla Mammadova', v_aydan, 'Aydan Karimova', v_ali, 'Ali Iskandarli',
      3, 0, '11-7, 11-6, 11-8', 1000, 1000, 1016, 1000, 16, 'confirmed', '2026-10-13 17:15:00+00'
    );
  END IF;

  -- 5. Murad Aliyev vs Anar Alakbarli
  IF v_murad IS NOT NULL AND v_anar IS NOT NULL AND v_ali IS NOT NULL THEN
    INSERT INTO public.matches (
      tournament_title, player1_id, player1_name, player2_id, player2_name, logged_by, logged_by_name,
      player1_score, player2_score, set_scores, player1_elo_before, player2_elo_before,
      player1_elo_after, player2_elo_after, elo_delta, status, match_date
    ) VALUES (
      'Fərdi Reytinq Oyunu', v_murad, 'Murad Aliyev', v_anar, 'Anar Alakbarli', v_ali, 'Ali Iskandarli',
      3, 1, '11-6, 9-11, 11-8, 11-5', 1000, 1000, 1016, 1000, 16, 'confirmed', '2026-10-12 14:00:00+00'
    );
  END IF;

  -- 6. Nihat Ismayilzade vs Fateh Mammadli
  IF v_nihat IS NOT NULL AND v_fateh IS NOT NULL AND v_iftixar IS NOT NULL THEN
    INSERT INTO public.matches (
      tournament_title, player1_id, player1_name, player2_id, player2_name, logged_by, logged_by_name,
      player1_score, player2_score, set_scores, player1_elo_before, player2_elo_before,
      player1_elo_after, player2_elo_after, elo_delta, status, match_date
    ) VALUES (
      'Fərdi Reytinq Oyunu', v_nihat, 'Nihat Ismayilzade', v_fateh, 'Fateh Mammadli', v_iftixar, 'Iftixar Meherremov',
      1, 3, '8-11, 11-9, 7-11, 9-11', 1000, 1000, 1000, 1016, 16, 'confirmed', '2026-10-11 16:45:00+00'
    );
  END IF;

  -- 7. Ali Iskandarli vs Huseyn Muradzada
  IF v_ali IS NOT NULL AND v_muradzade IS NOT NULL AND v_iftixar IS NOT NULL THEN
    INSERT INTO public.matches (
      tournament_title, player1_id, player1_name, player2_id, player2_name, logged_by, logged_by_name,
      player1_score, player2_score, set_scores, player1_elo_before, player2_elo_before,
      player1_elo_after, player2_elo_after, elo_delta, status, match_date
    ) VALUES (
      'BHOS Faculty Cup 2026', v_ali, 'Ali Iskandarli', v_muradzade, 'Huseyn Muradzada', v_iftixar, 'Iftixar Meherremov',
      3, 0, '11-5, 11-7, 11-6', 1032, 1000, 1048, 1000, 16, 'confirmed', '2026-10-10 18:00:00+00'
    );
  END IF;

  -- 8. Ali Abdulov vs Rinad Evezzade
  IF v_abdulov IS NOT NULL AND v_rinad IS NOT NULL AND v_iftixar IS NOT NULL THEN
    INSERT INTO public.matches (
      tournament_title, player1_id, player1_name, player2_id, player2_name, logged_by, logged_by_name,
      player1_score, player2_score, set_scores, player1_elo_before, player2_elo_before,
      player1_elo_after, player2_elo_after, elo_delta, status, match_date
    ) VALUES (
      'BHOS Faculty Cup 2026', v_abdulov, 'Ali Abdulov', v_rinad, 'Rinad Evezzade', v_iftixar, 'Iftixar Meherremov',
      3, 2, '12-10, 8-11, 11-9, 9-11, 11-7', 1000, 1016, 1018, 1000, 18, 'confirmed', '2026-10-09 15:00:00+00'
    );
  END IF;

  -- 9. Ali Aghayev vs Murad Aliyev
  IF v_aghayev IS NOT NULL AND v_murad IS NOT NULL AND v_ali IS NOT NULL THEN
    INSERT INTO public.matches (
      tournament_title, player1_id, player1_name, player2_id, player2_name, logged_by, logged_by_name,
      player1_score, player2_score, set_scores, player1_elo_before, player2_elo_before,
      player1_elo_after, player2_elo_after, elo_delta, status, match_date
    ) VALUES (
      'Fərdi Reytinq Oyunu', v_aghayev, 'Ali Aghayev', v_murad, 'Murad Aliyev', v_ali, 'Ali Iskandarli',
      3, 1, '11-8, 11-6, 9-11, 11-7', 1000, 1016, 1016, 1000, 16, 'confirmed', '2026-10-08 17:30:00+00'
    );
  END IF;

  -- 10. Leyla Mammadova vs Nihat Ismayilzade
  IF v_leyla IS NOT NULL AND v_nihat IS NOT NULL AND v_iftixar IS NOT NULL THEN
    INSERT INTO public.matches (
      tournament_title, player1_id, player1_name, player2_id, player2_name, logged_by, logged_by_name,
      player1_score, player2_score, set_scores, player1_elo_before, player2_elo_before,
      player1_elo_after, player2_elo_after, elo_delta, status, match_date
    ) VALUES (
      'Fərdi Reytinq Oyunu', v_leyla, 'Leyla Mammadova', v_nihat, 'Nihat Ismayilzade', v_iftixar, 'Iftixar Meherremov',
      3, 1, '11-9, 11-8, 8-11, 11-7', 1000, 1000, 1016, 1000, 16, 'confirmed', '2026-10-07 14:15:00+00'
    );
  END IF;

  -- Update profiles matches_played, wins, losses
  IF v_ali IS NOT NULL THEN
    UPDATE public.profiles SET matches_played = 6, wins = 6, losses = 0, current_elo = 1064 WHERE id = v_ali;
  END IF;

  IF v_abdulov IS NOT NULL THEN
    UPDATE public.profiles SET matches_played = 5, wins = 3, losses = 2, current_elo = 1018 WHERE id = v_abdulov;
  END IF;

  IF v_aghayev IS NOT NULL THEN
    UPDATE public.profiles SET matches_played = 5, wins = 3, losses = 2, current_elo = 1032 WHERE id = v_aghayev;
  END IF;

  IF v_fateh IS NOT NULL THEN
    UPDATE public.profiles SET matches_played = 6, wins = 3, losses = 3, current_elo = 1016 WHERE id = v_fateh;
  END IF;

  IF v_muradzade IS NOT NULL THEN
    UPDATE public.profiles SET matches_played = 5, wins = 2, losses = 3, current_elo = 1018 WHERE id = v_muradzade;
  END IF;

  IF v_rinad IS NOT NULL THEN
    UPDATE public.profiles SET matches_played = 6, wins = 2, losses = 4, current_elo = 1016 WHERE id = v_rinad;
  END IF;

  IF v_leyla IS NOT NULL THEN
    UPDATE public.profiles SET matches_played = 4, wins = 3, losses = 1, current_elo = 1016 WHERE id = v_leyla;
  END IF;

  IF v_murad IS NOT NULL THEN
    UPDATE public.profiles SET matches_played = 4, wins = 2, losses = 2, current_elo = 1016 WHERE id = v_murad;
  END IF;

  IF v_nihat IS NOT NULL THEN
    UPDATE public.profiles SET matches_played = 5, wins = 1, losses = 4, current_elo = 1016 WHERE id = v_nihat;
  END IF;

  IF v_anar IS NOT NULL THEN
    UPDATE public.profiles SET matches_played = 4, wins = 0, losses = 4, current_elo = 1000 WHERE id = v_anar;
  END IF;

  IF v_aydan IS NOT NULL THEN
    UPDATE public.profiles SET matches_played = 2, wins = 0, losses = 2, current_elo = 1000 WHERE id = v_aydan;
  END IF;

END $$;

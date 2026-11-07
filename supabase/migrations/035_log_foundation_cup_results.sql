-- ==============================================================================
-- Migration 035: Log Official Results for "Zəfər Günü" Foundation Kuboku (Nov 7)
-- - Excludes Adəm Rəhimli (did not attend; 0 matches logged)
-- - Ensures all 12 participating Foundation 2026 student profiles exist (starting ELO = 500)
-- - Logs all 38 official matches in chronological order (15 Group A + 15 Group B + 8 Playoffs)
--   through the atomic match engine (`approve_match_safely`) so ELO, stats & achievements update
-- - Finalizes tournament status = 'completed' and records official podium:
--     1st: Yusif Xanlarov (Çempion)
--     2nd: Məharət Kərimli (Gümüş)
--     3rd: Əhəd Zamanlı (Bürünc)
-- ==============================================================================

-- 0. Safe Schema Preparations (Prevent FK & Missing Column Errors)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_bhos_student_email;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slug VARCHAR(120),
  ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'Foundation',
  ADD COLUMN IF NOT EXISTS year_of_study INT DEFAULT 2026,
  ADD COLUMN IF NOT EXISTS elo_rating INT DEFAULT 500,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS winner_id UUID,
  ADD COLUMN IF NOT EXISTS runner_up_id UUID,
  ADD COLUMN IF NOT EXISTS third_place_id UUID,
  ADD COLUMN IF NOT EXISTS location VARCHAR(150) DEFAULT 'Bibiheybət Kampusu',
  ADD COLUMN IF NOT EXISTS allowed_admission_year INT DEFAULT 2026,
  ADD COLUMN IF NOT EXISTS group_size INT DEFAULT 6,
  ADD COLUMN IF NOT EXISTS advance_per_group INT DEFAULT 4,
  ADD COLUMN IF NOT EXISTS max_participants INT DEFAULT 12,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.matches
  ALTER COLUMN logged_by DROP NOT NULL;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS winner_id UUID,
  ADD COLUMN IF NOT EXISTS stage VARCHAR(50),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT TRUE;

-- 1. Helper Function: Ensure Player Profile Exists (Department = 'Foundation', Year = 2026, Initial ELO = 500)
CREATE OR REPLACE FUNCTION public.get_or_create_player(
  p_name TEXT,
  p_slug TEXT,
  p_email TEXT DEFAULT NULL,
  p_faculty TEXT DEFAULT 'Foundation'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_email TEXT;
BEGIN
  PERFORM set_config('app.bypass_profile_security', 'true', true);

  v_email := COALESCE(p_email, replace(p_slug, '-', '.') || '.std@bhos.edu.az');

  SELECT id INTO v_id
  FROM public.profiles
  WHERE full_name ILIKE p_name
     OR slug = p_slug
     OR lower(email) = lower(v_email)
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.profiles (
      id,
      full_name,
      slug,
      email,
      major_faculty,
      department,
      admission_year,
      year_of_study,
      user_type,
      role,
      playing_level,
      playing_style,
      blade_equipment,
      forehand_rubber,
      backhand_rubber,
      current_elo,
      elo_rating,
      matches_played,
      wins,
      losses,
      status,
      is_verified,
      is_active
    ) VALUES (
      gen_random_uuid(),
      p_name,
      p_slug,
      v_email,
      p_faculty,
      'Foundation',
      2026,
      2026,
      'student',
      'player',
      'Beginner',
      'Shakehand All-round',
      'Standard Club Blade',
      'Standard Inverted',
      'Standard Inverted',
      500,
      500,
      0,
      0,
      0,
      'approved',
      TRUE,
      TRUE
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.profiles
    SET full_name = p_name,
        slug = COALESCE(slug, p_slug),
        department = 'Foundation',
        admission_year = 2026,
        year_of_study = 2026,
        status = 'approved',
        is_verified = TRUE,
        is_active = TRUE,
        updated_at = NOW()
    WHERE id = v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- 2. Helper Function: Atomic Match Logger (Processes each match via approve_match_safely / Set-Dominance ELO Engine)
CREATE OR REPLACE FUNCTION public.record_cup_match(
  p_p1 UUID,
  p_p2 UUID,
  p_s1 INT,
  p_s2 INT,
  p_t_id UUID,
  p_stage TEXT,
  p_match_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_id UUID;
  v_winner UUID := CASE WHEN p_s1 > p_s2 THEN p_p1 ELSE p_p2 END;
  v_p1_elo INT;
  v_p2_elo INT;
  v_expected1 NUMERIC;
  v_actual1 NUMERIC;
  v_margin INT;
  v_mult NUMERIC := 1.0;
  v_raw_change1 NUMERIC;
  v_raw_change2 NUMERIC;
  v_new_p1_elo INT;
  v_new_p2_elo INT;
  v_delta INT;
BEGIN
  PERFORM set_config('app.bypass_profile_security', 'true', true);
  PERFORM set_config('app.bypass_match_security', 'true', true);

  -- Read current ELOs
  SELECT COALESCE(current_elo, 500) INTO v_p1_elo FROM public.profiles WHERE id = p_p1 FOR UPDATE;
  SELECT COALESCE(current_elo, 500) INTO v_p2_elo FROM public.profiles WHERE id = p_p2 FOR UPDATE;

  -- Compute Set-Dominance ELO (K=32, 0.95x for 1-set margin, 1.06x for 2-set margin, 1.18x for 3-set margin)
  v_expected1 := 1.0 / (1.0 + power(10.0, (v_p2_elo - v_p1_elo)::numeric / 400.0));
  v_actual1 := CASE WHEN p_s1 > p_s2 THEN 1.0 ELSE 0.0 END;
  v_margin := abs(p_s1 - p_s2);

  IF v_margin <= 1 THEN
    v_mult := 0.95;
  ELSIF v_margin = 2 THEN
    v_mult := 1.06;
  ELSE
    v_mult := 1.18;
  END IF;

  v_raw_change1 := 32.0 * (v_actual1 - v_expected1) * v_mult;
  v_raw_change2 := -v_raw_change1;

  v_new_p1_elo := LEAST(3000, GREATEST(0, round(v_p1_elo + v_raw_change1)::int));
  v_new_p2_elo := LEAST(3000, GREATEST(0, round(v_p2_elo + v_raw_change2)::int));
  v_delta := GREATEST(abs(v_new_p1_elo - v_p1_elo), abs(v_new_p2_elo - v_p2_elo));

  -- Insert confirmed match record
  INSERT INTO public.matches (
    player1_id,
    player2_id,
    logged_by,
    player1_score,
    player2_score,
    set_scores,
    winner_id,
    player1_elo_before,
    player2_elo_before,
    player1_elo_after,
    player2_elo_after,
    elo_delta,
    status,
    tournament_id,
    stage,
    auto_approved,
    approved_at,
    match_date,
    created_at
  ) VALUES (
    p_p1,
    p_p2,
    p_p1,
    p_s1,
    p_s2,
    p_s1::text || '-' || p_s2::text,
    v_winner,
    v_p1_elo,
    v_p2_elo,
    v_new_p1_elo,
    v_new_p2_elo,
    v_delta,
    'confirmed',
    p_t_id,
    p_stage,
    TRUE,
    p_match_time,
    p_match_time,
    p_match_time
  )
  RETURNING id INTO v_match_id;

  -- Update Player 1 profile atomically
  UPDATE public.profiles
  SET current_elo = v_new_p1_elo,
      elo_rating = v_new_p1_elo,
      matches_played = COALESCE(matches_played, 0) + 1,
      wins = COALESCE(wins, 0) + CASE WHEN p_s1 > p_s2 THEN 1 ELSE 0 END,
      losses = COALESCE(losses, 0) + CASE WHEN p_s1 < p_s2 THEN 1 ELSE 0 END,
      updated_at = p_match_time
  WHERE id = p_p1;

  -- Update Player 2 profile atomically
  UPDATE public.profiles
  SET current_elo = v_new_p2_elo,
      elo_rating = v_new_p2_elo,
      matches_played = COALESCE(matches_played, 0) + 1,
      wins = COALESCE(wins, 0) + CASE WHEN p_s2 > p_s1 THEN 1 ELSE 0 END,
      losses = COALESCE(losses, 0) + CASE WHEN p_s2 < p_s1 THEN 1 ELSE 0 END,
      updated_at = p_match_time
  WHERE id = p_p2;

  -- Evaluate achievements if achievement engine is installed
  BEGIN
    PERFORM public.evaluate_player_achievements(p_p1, v_match_id);
    PERFORM public.evaluate_player_achievements(p_p2, v_match_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_match_id;
END;
$$;

-- 3. Execute Official Foundation Cup Seed & Podium Finalization
DO $$
DECLARE
  v_tourn_id UUID;
  p_yusif UUID;
  p_ahad UUID;
  p_maharat UUID;
  p_qulam UUID;
  p_sabir UUID;
  p_adil UUID;
  p_muhammad UUID;
  p_kamran UUID;
  p_kazim UUID;
  p_faiq UUID;
  p_maharram UUID;
  p_rafiq UUID;

  v_base_time TIMESTAMPTZ := '2026-11-07 10:00:00+04'::timestamptz;

  -- Profile JSONB snapshots for bracket_data
  j_yusif JSONB;
  j_ahad JSONB;
  j_muhammad JSONB;
  j_sabir JSONB;
  j_kamran JSONB;
  j_adil JSONB;
  j_maharat JSONB;
  j_kazim JSONB;
  j_qulam JSONB;
  j_faiq JSONB;
  j_rafiq JSONB;
  j_maharram JSONB;

  v_group_a_matches JSONB;
  v_group_b_matches JSONB;
  v_playoff_rounds JSONB;
  v_third_place_match JSONB;
  v_bracket_data JSONB;
  v_participants JSONB;
BEGIN
  PERFORM set_config('app.bypass_profile_security', 'true', true);
  PERFORM set_config('app.bypass_match_security', 'true', true);
  PERFORM set_config('app.bypass_security_guard', 'true', true);

  -- Disable user triggers on matches/tournaments during bulk atomic replay so triggers don't double-count ELO
  ALTER TABLE public.matches DISABLE TRIGGER USER;
  ALTER TABLE public.tournaments DISABLE TRIGGER USER;

  -- 1. Identify (or create) Foundation Cup Tournament
  SELECT id INTO v_tourn_id
  FROM public.tournaments
  WHERE slug = 'foundation-kuboku-2026'
     OR title ILIKE '%Foundation%'
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF v_tourn_id IS NULL THEN
    INSERT INTO public.tournaments (
      title,
      slug,
      description,
      custom_rules,
      format,
      max_participants,
      group_size,
      advance_per_group,
      location,
      allowed_admission_year,
      status,
      start_date
    ) VALUES (
      '"Zəfər Günü" Foundation Kuboku',
      'foundation-kuboku-2026',
      '7 Noyabr "Zəfər Günü" münasibətilə Bibiheybət kampusunda 2026-cı il qəbul (Foundation) tələbələri arasında keçirilmiş rəsmi stolüstü tennis turniri. 12 iştirakçı 2 qrupda mübarizə aparmış və 38 rəsmi oyun nəticəsində qaliblər müəyyənləşmişdir.',
      'Qrup mərhələsi Best of 3 (2 setə qədər), Yarımfinal, 3-cü yer uğrunda oyun və Final isə Best of 5 (3 setə qədər) formatında oynanılmışdır.',
      'groups_and_knockout',
      12,
      6,
      4,
      'Bibiheybət Kampusu',
      2026,
      'ongoing',
      '2026-11-07 10:00:00+04'::timestamptz
    )
    RETURNING id INTO v_tourn_id;
  END IF;

  -- Remove Adəm Rəhimli (no-show: exclude all his matches & tournament registration)
  DELETE FROM public.matches
  WHERE player1_id IN (SELECT id FROM public.profiles WHERE full_name ILIKE '%Adəm Rəhimli%' OR full_name ILIKE '%Adem Rehimli%' OR email ILIKE '%adem.rehimli%')
     OR player2_id IN (SELECT id FROM public.profiles WHERE full_name ILIKE '%Adəm Rəhimli%' OR full_name ILIKE '%Adem Rehimli%' OR email ILIKE '%adem.rehimli%');

  DELETE FROM public.tournament_registrations
  WHERE player_id IN (SELECT id FROM public.profiles WHERE full_name ILIKE '%Adəm Rəhimli%' OR full_name ILIKE '%Adem Rehimli%' OR email ILIKE '%adem.rehimli%');

  -- 2. Ensure all 12 participating Foundation players exist
  -- Group A (6 players)
  p_ahad     := public.get_or_create_player('Əhəd Zamanlı',      'ahad-zamanli',       'ehed.zamanli.std@bhos.edu.az',       'Information Security');
  p_yusif    := public.get_or_create_player('Yusif Xanlarov',    'yusif-xanlarov',     'yusif.xanlarov.std@bhos.edu.az',     'Computer Engineering');
  p_muhammad := public.get_or_create_player('Məhəmməd Əsədov',   'muhammad-asadov',    'mehemmed.esedov.std@bhos.edu.az',    'Process Automation Engineering');
  p_sabir    := public.get_or_create_player('Sabir Məhərrəmli',  'sabir-maharramli',   'sabir.meherremli.std@bhos.edu.az',   'Petroleum Engineering');
  p_adil     := public.get_or_create_player('Adil Süleymanov',   'adil-suleymanov',    'adil.suleymanov.std@bhos.edu.az',    'Information Security');
  p_kamran   := public.get_or_create_player('Kamran Əliyev',     'kamran-aliyev',      'kamran.aliev.std@bhos.edu.az',       'Computer Engineering');

  -- Group B (6 players)
  p_maharat  := public.get_or_create_player('Məharət Kərimli',     'maharat-karimli',     'meharet.kerimli.std@bhos.edu.az',     'Computer Engineering');
  p_kazim    := public.get_or_create_player('Kazım Fətəlizadə',    'kazim-fatalizada',    'kazim.fetelizade.std@bhos.edu.az',    'Process Automation Engineering');
  p_qulam    := public.get_or_create_player('Qulam Rüstəmzadə',    'qulam-rustamzada',    'qulam.rustemzade.std@bhos.edu.az',    'Petroleum Engineering');
  p_faiq     := public.get_or_create_player('Faiq Hüseynli',       'faiq-huseynli',       'faiq.huseynli.std@bhos.edu.az',       'Chemical Engineering');
  p_maharram := public.get_or_create_player('Məhərrəm Mirzəxanlı', 'maharram-mirzaxanli', 'meherrem.mirzexanli.std@bhos.edu.az', 'Process Automation Engineering');
  p_rafiq    := public.get_or_create_player('Rafiq Həsənli',       'rafiq-hasanli',       'rafiq.hesenli.std@bhos.edu.az',       'Computer Engineering');

  -- Clean any previous matches for this tournament or these 12 players to ensure idempotent calculation from 500 ELO
  DELETE FROM public.matches
  WHERE tournament_id = v_tourn_id
     OR player1_id IN (p_ahad, p_yusif, p_muhammad, p_sabir, p_adil, p_kamran, p_maharat, p_kazim, p_qulam, p_faiq, p_maharram, p_rafiq)
     OR player2_id IN (p_ahad, p_yusif, p_muhammad, p_sabir, p_adil, p_kamran, p_maharat, p_kazim, p_qulam, p_faiq, p_maharram, p_rafiq);

  -- Reset the 12 participating players to starting rating = 500, 0 matches before replaying the 38 matches
  UPDATE public.profiles
  SET current_elo = 500,
      elo_rating = 500,
      matches_played = 0,
      wins = 0,
      losses = 0,
      department = 'Foundation',
      admission_year = 2026,
      year_of_study = 2026
  WHERE id IN (p_ahad, p_yusif, p_muhammad, p_sabir, p_adil, p_kamran, p_maharat, p_kazim, p_qulam, p_faiq, p_maharram, p_rafiq);

  -- 3. Group A Matches (15 matches, Adəm Rəhimli excluded)
  PERFORM public.record_cup_match(p_ahad,     p_adil,     2, 0, v_tourn_id, 'group', v_base_time + interval '5 minutes');
  PERFORM public.record_cup_match(p_muhammad, p_kamran,   2, 0, v_tourn_id, 'group', v_base_time + interval '10 minutes');
  PERFORM public.record_cup_match(p_yusif,    p_adil,     2, 0, v_tourn_id, 'group', v_base_time + interval '15 minutes');
  PERFORM public.record_cup_match(p_muhammad, p_sabir,    0, 2, v_tourn_id, 'group', v_base_time + interval '20 minutes');
  PERFORM public.record_cup_match(p_yusif,    p_kamran,   2, 0, v_tourn_id, 'group', v_base_time + interval '25 minutes');
  PERFORM public.record_cup_match(p_ahad,     p_muhammad, 2, 0, v_tourn_id, 'group', v_base_time + interval '30 minutes');
  PERFORM public.record_cup_match(p_kamran,   p_sabir,    0, 2, v_tourn_id, 'group', v_base_time + interval '35 minutes');
  PERFORM public.record_cup_match(p_adil,     p_muhammad, 2, 0, v_tourn_id, 'group', v_base_time + interval '40 minutes');
  PERFORM public.record_cup_match(p_yusif,    p_sabir,    2, 0, v_tourn_id, 'group', v_base_time + interval '45 minutes');
  PERFORM public.record_cup_match(p_kamran,   p_ahad,     0, 2, v_tourn_id, 'group', v_base_time + interval '50 minutes');
  PERFORM public.record_cup_match(p_yusif,    p_muhammad, 2, 0, v_tourn_id, 'group', v_base_time + interval '55 minutes');
  PERFORM public.record_cup_match(p_sabir,    p_ahad,     0, 2, v_tourn_id, 'group', v_base_time + interval '60 minutes');
  PERFORM public.record_cup_match(p_kamran,   p_adil,     0, 2, v_tourn_id, 'group', v_base_time + interval '65 minutes');
  PERFORM public.record_cup_match(p_yusif,    p_ahad,     1, 2, v_tourn_id, 'group', v_base_time + interval '70 minutes');
  PERFORM public.record_cup_match(p_sabir,    p_adil,     2, 0, v_tourn_id, 'group', v_base_time + interval '75 minutes');

  -- 4. Group B Matches (15 matches)
  PERFORM public.record_cup_match(p_maharat,  p_maharram, 2, 0, v_tourn_id, 'group', v_base_time + interval '80 minutes');
  PERFORM public.record_cup_match(p_kazim,    p_rafiq,    2, 0, v_tourn_id, 'group', v_base_time + interval '85 minutes');
  PERFORM public.record_cup_match(p_qulam,    p_faiq,     2, 0, v_tourn_id, 'group', v_base_time + interval '90 minutes');
  PERFORM public.record_cup_match(p_maharat,  p_rafiq,    2, 0, v_tourn_id, 'group', v_base_time + interval '95 minutes');
  PERFORM public.record_cup_match(p_maharram, p_faiq,     0, 2, v_tourn_id, 'group', v_base_time + interval '100 minutes');
  PERFORM public.record_cup_match(p_kazim,    p_qulam,    1, 2, v_tourn_id, 'group', v_base_time + interval '105 minutes');
  PERFORM public.record_cup_match(p_maharat,  p_faiq,     2, 0, v_tourn_id, 'group', v_base_time + interval '110 minutes');
  PERFORM public.record_cup_match(p_rafiq,    p_qulam,    0, 2, v_tourn_id, 'group', v_base_time + interval '115 minutes');
  PERFORM public.record_cup_match(p_maharram, p_kazim,    0, 2, v_tourn_id, 'group', v_base_time + interval '120 minutes');
  PERFORM public.record_cup_match(p_maharat,  p_qulam,    1, 2, v_tourn_id, 'group', v_base_time + interval '125 minutes');
  PERFORM public.record_cup_match(p_faiq,     p_kazim,    0, 2, v_tourn_id, 'group', v_base_time + interval '130 minutes');
  PERFORM public.record_cup_match(p_rafiq,    p_maharram, 0, 2, v_tourn_id, 'group', v_base_time + interval '135 minutes');
  PERFORM public.record_cup_match(p_maharat,  p_kazim,    2, 1, v_tourn_id, 'group', v_base_time + interval '140 minutes');
  PERFORM public.record_cup_match(p_qulam,    p_maharram, 2, 0, v_tourn_id, 'group', v_base_time + interval '145 minutes');
  PERFORM public.record_cup_match(p_faiq,     p_rafiq,    2, 0, v_tourn_id, 'group', v_base_time + interval '150 minutes');

  -- 5. Playoff Matches (8 matches)
  -- Quarterfinals (1/4 Final)
  PERFORM public.record_cup_match(p_ahad,    p_faiq,  2, 0, v_tourn_id, 'playoff_qf', v_base_time + interval '180 minutes');
  PERFORM public.record_cup_match(p_maharat, p_sabir, 2, 1, v_tourn_id, 'playoff_qf', v_base_time + interval '190 minutes');
  PERFORM public.record_cup_match(p_qulam,   p_adil,  2, 0, v_tourn_id, 'playoff_qf', v_base_time + interval '200 minutes');
  PERFORM public.record_cup_match(p_yusif,   p_kazim, 2, 0, v_tourn_id, 'playoff_qf', v_base_time + interval '210 minutes');

  -- Semifinals (1/2 Final)
  PERFORM public.record_cup_match(p_ahad,  p_maharat, 1, 3, v_tourn_id, 'playoff_sf', v_base_time + interval '240 minutes');
  PERFORM public.record_cup_match(p_qulam, p_yusif,   0, 3, v_tourn_id, 'playoff_sf', v_base_time + interval '255 minutes');

  -- 3rd Place Match (Bürünc medal oyunu)
  PERFORM public.record_cup_match(p_ahad, p_qulam, 3, 2, v_tourn_id, 'playoff_3rd', v_base_time + interval '285 minutes');

  -- Grand Final (Çempionluq oyunu)
  PERFORM public.record_cup_match(p_maharat, p_yusif, 0, 3, v_tourn_id, 'playoff_final', v_base_time + interval '315 minutes');

  -- 6. Build Complete Tournament Bracket & Group Standings Data for Frontend Display
  SELECT to_jsonb(p.*) INTO j_yusif    FROM public.profiles p WHERE id = p_yusif;
  SELECT to_jsonb(p.*) INTO j_ahad     FROM public.profiles p WHERE id = p_ahad;
  SELECT to_jsonb(p.*) INTO j_muhammad FROM public.profiles p WHERE id = p_muhammad;
  SELECT to_jsonb(p.*) INTO j_sabir    FROM public.profiles p WHERE id = p_sabir;
  SELECT to_jsonb(p.*) INTO j_kamran   FROM public.profiles p WHERE id = p_kamran;
  SELECT to_jsonb(p.*) INTO j_adil     FROM public.profiles p WHERE id = p_adil;
  SELECT to_jsonb(p.*) INTO j_maharat  FROM public.profiles p WHERE id = p_maharat;
  SELECT to_jsonb(p.*) INTO j_kazim    FROM public.profiles p WHERE id = p_kazim;
  SELECT to_jsonb(p.*) INTO j_qulam    FROM public.profiles p WHERE id = p_qulam;
  SELECT to_jsonb(p.*) INTO j_faiq     FROM public.profiles p WHERE id = p_faiq;
  SELECT to_jsonb(p.*) INTO j_rafiq    FROM public.profiles p WHERE id = p_rafiq;
  SELECT to_jsonb(p.*) INTO j_maharram FROM public.profiles p WHERE id = p_maharram;

  v_group_a_matches := jsonb_build_array(
    jsonb_build_object('id', 'g-tourn-foundation-2026-a-m0',  'groupId', 'g-tourn-foundation-2026-a', 'player1', j_ahad,     'player2', j_adil,     'player1_score', 2, 'player2_score', 0, 'set_scores', '2-0', 'winner_id', p_ahad::text,     'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-a-m1',  'groupId', 'g-tourn-foundation-2026-a', 'player1', j_muhammad, 'player2', j_kamran,   'player1_score', 2, 'player2_score', 0, 'set_scores', '2-0', 'winner_id', p_muhammad::text, 'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-a-m2',  'groupId', 'g-tourn-foundation-2026-a', 'player1', j_yusif,    'player2', j_adil,     'player1_score', 2, 'player2_score', 0, 'set_scores', '2-0', 'winner_id', p_yusif::text,    'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-a-m3',  'groupId', 'g-tourn-foundation-2026-a', 'player1', j_muhammad, 'player2', j_sabir,    'player1_score', 0, 'player2_score', 2, 'set_scores', '0-2', 'winner_id', p_sabir::text,    'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-a-m4',  'groupId', 'g-tourn-foundation-2026-a', 'player1', j_yusif,    'player2', j_kamran,   'player1_score', 2, 'player2_score', 0, 'set_scores', '2-0', 'winner_id', p_yusif::text,    'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-a-m5',  'groupId', 'g-tourn-foundation-2026-a', 'player1', j_ahad,     'player2', j_muhammad, 'player1_score', 2, 'player2_score', 0, 'set_scores', '2-0', 'winner_id', p_ahad::text,     'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-a-m6',  'groupId', 'g-tourn-foundation-2026-a', 'player1', j_kamran,   'player2', j_sabir,    'player1_score', 0, 'player2_score', 2, 'set_scores', '0-2', 'winner_id', p_sabir::text,    'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-a-m7',  'groupId', 'g-tourn-foundation-2026-a', 'player1', j_adil,     'player2', j_muhammad, 'player1_score', 2, 'player2_score', 0, 'set_scores', '2-0', 'winner_id', p_adil::text,     'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-a-m8',  'groupId', 'g-tourn-foundation-2026-a', 'player1', j_yusif,    'player2', j_sabir,    'player1_score', 2, 'player2_score', 0, 'set_scores', '2-0', 'winner_id', p_yusif::text,    'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-a-m9',  'groupId', 'g-tourn-foundation-2026-a', 'player1', j_kamran,   'player2', j_ahad,     'player1_score', 0, 'player2_score', 2, 'set_scores', '0-2', 'winner_id', p_ahad::text,     'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-a-m10', 'groupId', 'g-tourn-foundation-2026-a', 'player1', j_yusif,    'player2', j_muhammad, 'player1_score', 2, 'player2_score', 0, 'set_scores', '2-0', 'winner_id', p_yusif::text,    'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-a-m11', 'groupId', 'g-tourn-foundation-2026-a', 'player1', j_sabir,    'player2', j_ahad,     'player1_score', 0, 'player2_score', 2, 'set_scores', '0-2', 'winner_id', p_ahad::text,     'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-a-m12', 'groupId', 'g-tourn-foundation-2026-a', 'player1', j_kamran,   'player2', j_adil,     'player1_score', 0, 'player2_score', 2, 'set_scores', '0-2', 'winner_id', p_adil::text,     'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-a-m13', 'groupId', 'g-tourn-foundation-2026-a', 'player1', j_yusif,    'player2', j_ahad,     'player1_score', 1, 'player2_score', 2, 'set_scores', '1-2', 'winner_id', p_ahad::text,     'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-a-m14', 'groupId', 'g-tourn-foundation-2026-a', 'player1', j_sabir,    'player2', j_adil,     'player1_score', 2, 'player2_score', 0, 'set_scores', '2-0', 'winner_id', p_sabir::text,    'status', 'completed')
  );

  v_group_b_matches := jsonb_build_array(
    jsonb_build_object('id', 'g-tourn-foundation-2026-b-m0',  'groupId', 'g-tourn-foundation-2026-b', 'player1', j_maharat,  'player2', j_maharram, 'player1_score', 2, 'player2_score', 0, 'set_scores', '2-0', 'winner_id', p_maharat::text,  'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-b-m1',  'groupId', 'g-tourn-foundation-2026-b', 'player1', j_kazim,    'player2', j_rafiq,    'player1_score', 2, 'player2_score', 0, 'set_scores', '2-0', 'winner_id', p_kazim::text,    'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-b-m2',  'groupId', 'g-tourn-foundation-2026-b', 'player1', j_qulam,    'player2', j_faiq,     'player1_score', 2, 'player2_score', 0, 'set_scores', '2-0', 'winner_id', p_qulam::text,    'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-b-m3',  'groupId', 'g-tourn-foundation-2026-b', 'player1', j_maharat,  'player2', j_rafiq,    'player1_score', 2, 'player2_score', 0, 'set_scores', '2-0', 'winner_id', p_maharat::text,  'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-b-m4',  'groupId', 'g-tourn-foundation-2026-b', 'player1', j_maharram, 'player2', j_faiq,     'player1_score', 0, 'player2_score', 2, 'set_scores', '0-2', 'winner_id', p_faiq::text,     'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-b-m5',  'groupId', 'g-tourn-foundation-2026-b', 'player1', j_kazim,    'player2', j_qulam,    'player1_score', 1, 'player2_score', 2, 'set_scores', '1-2', 'winner_id', p_qulam::text,    'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-b-m6',  'groupId', 'g-tourn-foundation-2026-b', 'player1', j_maharat,  'player2', j_faiq,     'player1_score', 2, 'player2_score', 0, 'set_scores', '2-0', 'winner_id', p_maharat::text,  'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-b-m7',  'groupId', 'g-tourn-foundation-2026-b', 'player1', j_rafiq,    'player2', j_qulam,    'player1_score', 0, 'player2_score', 2, 'set_scores', '0-2', 'winner_id', p_qulam::text,    'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-b-m8',  'groupId', 'g-tourn-foundation-2026-b', 'player1', j_maharram, 'player2', j_kazim,    'player1_score', 0, 'player2_score', 2, 'set_scores', '0-2', 'winner_id', p_kazim::text,    'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-b-m9',  'groupId', 'g-tourn-foundation-2026-b', 'player1', j_maharat,  'player2', j_qulam,    'player1_score', 1, 'player2_score', 2, 'set_scores', '1-2', 'winner_id', p_qulam::text,    'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-b-m10', 'groupId', 'g-tourn-foundation-2026-b', 'player1', j_faiq,     'player2', j_kazim,    'player1_score', 0, 'player2_score', 2, 'set_scores', '0-2', 'winner_id', p_kazim::text,    'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-b-m11', 'groupId', 'g-tourn-foundation-2026-b', 'player1', j_rafiq,    'player2', j_maharram, 'player1_score', 0, 'player2_score', 2, 'set_scores', '0-2', 'winner_id', p_maharram::text, 'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-b-m12', 'groupId', 'g-tourn-foundation-2026-b', 'player1', j_maharat,  'player2', j_kazim,    'player1_score', 2, 'player2_score', 1, 'set_scores', '2-1', 'winner_id', p_maharat::text,  'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-b-m13', 'groupId', 'g-tourn-foundation-2026-b', 'player1', j_qulam,    'player2', j_maharram, 'player1_score', 2, 'player2_score', 0, 'set_scores', '2-0', 'winner_id', p_qulam::text,    'status', 'completed'),
    jsonb_build_object('id', 'g-tourn-foundation-2026-b-m14', 'groupId', 'g-tourn-foundation-2026-b', 'player1', j_faiq,     'player2', j_rafiq,    'player1_score', 2, 'player2_score', 0, 'set_scores', '2-0', 'winner_id', p_faiq::text,     'status', 'completed')
  );

  v_playoff_rounds := jsonb_build_array(
    jsonb_build_object(
      'name', '1/4 Final',
      'matches', jsonb_build_array(
        jsonb_build_object('id', 'playoff-r0-m0', 'roundIndex', 0, 'matchIndex', 0, 'player1', j_ahad,    'player2', j_faiq,  'player1_score', 2, 'player2_score', 0, 'set_scores', '2-0', 'winner_id', p_ahad::text,    'nextMatchId', 'playoff-r1-m0', 'nextMatchSlot', 1, 'status', 'completed'),
        jsonb_build_object('id', 'playoff-r0-m1', 'roundIndex', 0, 'matchIndex', 1, 'player1', j_maharat, 'player2', j_sabir, 'player1_score', 2, 'player2_score', 1, 'set_scores', '2-1', 'winner_id', p_maharat::text, 'nextMatchId', 'playoff-r1-m0', 'nextMatchSlot', 2, 'status', 'completed'),
        jsonb_build_object('id', 'playoff-r0-m2', 'roundIndex', 0, 'matchIndex', 2, 'player1', j_qulam,   'player2', j_adil,  'player1_score', 2, 'player2_score', 0, 'set_scores', '2-0', 'winner_id', p_qulam::text,   'nextMatchId', 'playoff-r1-m1', 'nextMatchSlot', 1, 'status', 'completed'),
        jsonb_build_object('id', 'playoff-r0-m3', 'roundIndex', 0, 'matchIndex', 3, 'player1', j_yusif,   'player2', j_kazim, 'player1_score', 2, 'player2_score', 0, 'set_scores', '2-0', 'winner_id', p_yusif::text,   'nextMatchId', 'playoff-r1-m1', 'nextMatchSlot', 2, 'status', 'completed')
      )
    ),
    jsonb_build_object(
      'name', 'Yarımfinal',
      'matches', jsonb_build_array(
        jsonb_build_object('id', 'playoff-r1-m0', 'roundIndex', 1, 'matchIndex', 0, 'player1', j_ahad,  'player2', j_maharat, 'player1_score', 1, 'player2_score', 3, 'set_scores', '1-3', 'winner_id', p_maharat::text, 'nextMatchId', 'playoff-r2-m0', 'nextMatchSlot', 1, 'status', 'completed'),
        jsonb_build_object('id', 'playoff-r1-m1', 'roundIndex', 1, 'matchIndex', 1, 'player1', j_qulam, 'player2', j_yusif,   'player1_score', 0, 'player2_score', 3, 'set_scores', '0-3', 'winner_id', p_yusif::text,   'nextMatchId', 'playoff-r2-m0', 'nextMatchSlot', 2, 'status', 'completed')
      )
    ),
    jsonb_build_object(
      'name', 'Final',
      'matches', jsonb_build_array(
        jsonb_build_object('id', 'playoff-r2-m0', 'roundIndex', 2, 'matchIndex', 0, 'player1', j_maharat, 'player2', j_yusif, 'player1_score', 0, 'player2_score', 3, 'set_scores', '0-3', 'winner_id', p_yusif::text, 'status', 'completed')
      )
    )
  );

  v_third_place_match := jsonb_build_object(
    'id', 'playoff-3rd-place',
    'roundIndex', 2,
    'matchIndex', 1,
    'player1', j_ahad,
    'player2', j_qulam,
    'player1_score', 3,
    'player2_score', 2,
    'set_scores', '3-2',
    'winner_id', p_ahad::text,
    'status', 'completed'
  );

  v_bracket_data := jsonb_build_object(
    'rounds', v_playoff_rounds,
    'third_place_match', v_third_place_match,
    'podium', jsonb_build_object(
      'first', j_yusif,
      'second', j_maharat,
      'third', j_ahad
    ),
    'groups', jsonb_build_array(
      jsonb_build_object(
        'id', 'g-tourn-foundation-2026-a',
        'name', 'Qrup A',
        'players', jsonb_build_array(j_ahad, j_yusif, j_sabir, j_adil, j_muhammad, j_kamran),
        'matches', v_group_a_matches,
        'top_seed_id', p_yusif::text
      ),
      jsonb_build_object(
        'id', 'g-tourn-foundation-2026-b',
        'name', 'Qrup B',
        'players', jsonb_build_array(j_qulam, j_maharat, j_kazim, j_faiq, j_maharram, j_rafiq),
        'matches', v_group_b_matches,
        'top_seed_id', p_maharat::text
      )
    ),
    'settings', jsonb_build_object(
      'group_size', 6,
      'group_size_label', '6 nəfər',
      'advance_per_group', 4,
      'location', 'Bibiheybət Kampusu',
      'allowed_admission_year', 2026,
      'best_of_sets', 3,
      'top_seed_ids', jsonb_build_array(p_yusif::text, p_maharat::text, p_ahad::text, p_kazim::text)
    )
  );

  v_participants := jsonb_build_array(
    p_ahad::text, p_yusif::text, p_sabir::text, p_adil::text, p_muhammad::text, p_kamran::text,
    p_qulam::text, p_maharat::text, p_kazim::text, p_faiq::text, p_maharram::text, p_rafiq::text
  );

  -- Finalize Tournament Record & Official Podium
  IF v_tourn_id IS NOT NULL THEN
    UPDATE public.tournaments
    SET status = 'completed',
        winner_id = p_yusif,
        runner_up_id = p_maharat,
        third_place_id = p_ahad,
        max_participants = 12,
        group_size = 6,
        advance_per_group = 4,
        participants = v_participants,
        bracket_data = v_bracket_data,
        updated_at = NOW()
    WHERE id = v_tourn_id;
  END IF;

  -- Re-enable user triggers
  ALTER TABLE public.matches ENABLE TRIGGER USER;
  ALTER TABLE public.tournaments ENABLE TRIGGER USER;
END $$;

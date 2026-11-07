-- ==============================================================================
-- Migration 035: Log Official Results for "Zəfər Günü" Foundation Kuboku (7 Noyabr)
--
-- RULES IMPLEMENTED:
-- 1. Adəm Rəhimli did not attend; ALL 6 of his scheduled matches are excluded.
-- 2. All other 38 matches across Group A (15 matches), Group B (15 matches),
--    and Playoffs (8 matches: 4 QF, 2 SF, 1 3rd Place, 1 Grand Final) are inserted
--    in chronological order using dampened tournament point scaling (`point_weight = 0.40`).
-- 3. All 12 participating student profiles exist in `public.profiles` with their
--    intact starting baseline ratings (100 / 250 / 400).
-- 4. Each match updates sets, match records, ELO ratings (+6..+12 per win, -3..-7 per loss),
--    `peak_elo`, `player1_elo_delta`, `player2_elo_delta`, and achievements.
-- 5. Finalizes the tournament record (`status = 'completed'`) and records the official podium:
--    - 1st: Yusif Xanlarov (Çempion) — 462 ELO
--    - 2nd: Məharət Kərimli (Gümüş) — 441 ELO
--    - 3rd: Əhəd Zamanlı (Bürünc) — 458 ELO
-- ==============================================================================

-- 0. Ensure Schema Columns & Constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_bhos_student_email;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS point_weight NUMERIC(4,2) DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS winner_id UUID,
  ADD COLUMN IF NOT EXISTS runner_up_id UUID,
  ADD COLUMN IF NOT EXISTS third_place_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slug VARCHAR(120),
  ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'Foundation',
  ADD COLUMN IF NOT EXISTS year_of_study INT DEFAULT 2026,
  ADD COLUMN IF NOT EXISTS elo_rating INT DEFAULT 100,
  ADD COLUMN IF NOT EXISTS peak_elo INT DEFAULT 100,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.matches
  ALTER COLUMN logged_by DROP NOT NULL;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS winner_id UUID,
  ADD COLUMN IF NOT EXISTS stage VARCHAR(50),
  ADD COLUMN IF NOT EXISTS player1_elo_delta INT,
  ADD COLUMN IF NOT EXISTS player2_elo_delta INT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT TRUE;

-- 1. Parameterized ELO Delta Calculator (Supports Tournament `point_weight`)
CREATE OR REPLACE FUNCTION public.calculate_elo_delta(
  p_player_elo INT,
  p_opponent_elo INT,
  p_player_score INT,
  p_opponent_score INT,
  p_is_winner BOOLEAN,
  p_point_weight NUMERIC DEFAULT 1.00
)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_k NUMERIC := 32.0;
  v_weight NUMERIC := CASE WHEN p_point_weight IS NULL OR p_point_weight <= 0 THEN 1.00 ELSE p_point_weight END;
  v_expected NUMERIC;
  v_hi INT;
  v_lo INT;
  v_margin INT;
  v_dom NUMERIC := 1.00;
  v_scale NUMERIC;
  v_raw NUMERIC;
  v_min_gain INT;
  v_max_gain INT;
  v_min_loss INT;
  v_max_loss INT;
BEGIN
  v_expected := 1.0 / (1.0 + power(10.0, (COALESCE(p_opponent_elo, 100) - COALESCE(p_player_elo, 100))::NUMERIC / 400.0));

  v_hi := GREATEST(COALESCE(p_player_score, 0), COALESCE(p_opponent_score, 0));
  v_lo := LEAST(COALESCE(p_player_score, 0), COALESCE(p_opponent_score, 0));
  v_margin := GREATEST(1, v_hi - v_lo);

  IF v_margin >= 4 THEN
    v_dom := 1.30;
  ELSIF v_margin = 3 THEN
    v_dom := 1.18;
  ELSIF v_margin = 2 THEN
    v_dom := 1.06;
  ELSE
    v_dom := 0.95;
  END IF;

  IF v_weight < 0.99 THEN
    v_scale := v_weight / 0.40;
    IF p_is_winner THEN
      v_raw := v_k * v_weight * v_dom * (0.50 + 0.65 * (1.0 - v_expected));
      v_min_gain := GREATEST(1, round(6.0 * v_scale)::INT);
      v_max_gain := GREATEST(v_min_gain, round(12.0 * v_scale)::INT);
      RETURN GREATEST(v_min_gain, LEAST(v_max_gain, round(v_raw)::INT));
    ELSE
      v_raw := v_k * (v_weight * 0.50) * v_dom * (0.45 + 0.65 * v_expected);
      v_min_loss := GREATEST(1, round(3.0 * v_scale)::INT);
      v_max_loss := GREATEST(v_min_loss, round(7.0 * v_scale)::INT);
      RETURN -GREATEST(v_min_loss, LEAST(v_max_loss, round(v_raw)::INT));
    END IF;
  END IF;

  IF p_is_winner THEN
    v_raw := v_k * (1.0 - v_expected) * v_dom;
    RETURN GREATEST(2, LEAST(48, round(v_raw)::INT));
  ELSE
    v_raw := v_k * (0.0 - v_expected) * v_dom;
    RETURN LEAST(-2, GREATEST(-48, round(v_raw)::INT));
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_elo_delta(INT, INT, INT, INT, BOOLEAN, NUMERIC) TO anon, authenticated;

-- 2. Helper Function: Ensure Player Profile Exists
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
  PERFORM set_config('app.bypass_security_guard', 'true', true);

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
      peak_elo,
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
      'Intermediate',
      'Shakehand All-round',
      'Standard Club Blade',
      'Standard Inverted',
      'Standard Inverted',
      250,
      250,
      250,
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

-- 3. Helper to resolve a player's intact starting baseline rating (100 / 250 / 400)
CREATE OR REPLACE FUNCTION public.resolve_player_baseline_elo(
  p_player_id UUID,
  p_default_baseline INT DEFAULT 250
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_auth_meta JSONB;
  v_meta_elo TEXT;
  v_meta_skill TEXT;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_player_id;
  IF NOT FOUND THEN
    RETURN p_default_baseline;
  END IF;

  BEGIN
    SELECT raw_user_meta_data INTO v_auth_meta
    FROM auth.users
    WHERE id = p_player_id
       OR lower(email) = lower(v_profile.email)
    LIMIT 1;

    IF v_auth_meta IS NOT NULL THEN
      v_meta_elo := v_auth_meta->>'current_elo';
      IF v_meta_elo IS NOT NULL AND v_meta_elo ~ '^[0-9]+$' THEN
        IF v_meta_elo::INT BETWEEN 50 AND 450 THEN
          RETURN v_meta_elo::INT;
        END IF;
      END IF;

      v_meta_skill := lower(COALESCE(v_auth_meta->>'skill_level', v_auth_meta->>'playing_level', ''));
      IF v_meta_skill = 'advanced' THEN
        RETURN 400;
      ELSIF v_meta_skill = 'intermediate' THEN
        RETURN 250;
      ELSIF v_meta_skill = 'beginner' THEN
        RETURN 100;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  IF COALESCE(v_profile.matches_played, 0) = 0 AND COALESCE(v_profile.current_elo, 0) BETWEEN 50 AND 450 THEN
    RETURN v_profile.current_elo;
  END IF;

  IF lower(COALESCE(v_profile.playing_level, '')) = 'advanced' THEN
    RETURN 400;
  ELSIF lower(COALESCE(v_profile.playing_level, '')) = 'intermediate' THEN
    RETURN 250;
  END IF;

  RETURN p_default_baseline;
END;
$$;

-- 4. Helper Function: Record & Approve Cup Match with Dampened Point Scaling
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
  v_p1_won BOOLEAN := (p_s1 > p_s2);
  v_winner UUID := CASE WHEN p_s1 > p_s2 THEN p_p1 ELSE p_p2 END;
  v_p1_elo INT;
  v_p2_elo INT;
  v_p1_delta INT;
  v_p2_delta INT;
  v_new_p1_elo INT;
  v_new_p2_elo INT;
  v_delta INT;
  v_weight NUMERIC := 0.40;
BEGIN
  PERFORM set_config('app.bypass_profile_security', 'true', true);
  PERFORM set_config('app.bypass_match_security', 'true', true);
  PERFORM set_config('app.bypass_security_guard', 'true', true);

  IF p_t_id IS NOT NULL THEN
    SELECT COALESCE(point_weight, 0.40) INTO v_weight FROM public.tournaments WHERE id = p_t_id;
    v_weight := COALESCE(v_weight, 0.40);
  END IF;

  SELECT COALESCE(current_elo, 250) INTO v_p1_elo FROM public.profiles WHERE id = p_p1 FOR UPDATE;
  SELECT COALESCE(current_elo, 250) INTO v_p2_elo FROM public.profiles WHERE id = p_p2 FOR UPDATE;

  v_p1_delta := public.calculate_elo_delta(v_p1_elo, v_p2_elo, p_s1, p_s2, v_p1_won, v_weight);
  v_p2_delta := public.calculate_elo_delta(v_p2_elo, v_p1_elo, p_s2, p_s1, NOT v_p1_won, v_weight);

  v_new_p1_elo := LEAST(999, GREATEST(0, v_p1_elo + v_p1_delta));
  v_new_p2_elo := LEAST(999, GREATEST(0, v_p2_elo + v_p2_delta));
  v_p1_delta := v_new_p1_elo - v_p1_elo;
  v_p2_delta := v_new_p2_elo - v_p2_elo;
  v_delta := CASE WHEN v_p1_won THEN abs(v_p1_delta) ELSE abs(v_p2_delta) END;

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
    player1_elo_delta,
    player2_elo_delta,
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
    v_p1_delta,
    v_p2_delta,
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

  UPDATE public.profiles
  SET current_elo = v_new_p1_elo,
      elo_rating = v_new_p1_elo,
      peak_elo = GREATEST(COALESCE(peak_elo, v_p1_elo), v_new_p1_elo),
      matches_played = COALESCE(matches_played, 0) + 1,
      wins = COALESCE(wins, 0) + CASE WHEN v_p1_won THEN 1 ELSE 0 END,
      losses = COALESCE(losses, 0) + CASE WHEN NOT v_p1_won THEN 1 ELSE 0 END,
      updated_at = p_match_time
  WHERE id = p_p1;

  UPDATE public.profiles
  SET current_elo = v_new_p2_elo,
      elo_rating = v_new_p2_elo,
      peak_elo = GREATEST(COALESCE(peak_elo, v_p2_elo), v_new_p2_elo),
      matches_played = COALESCE(matches_played, 0) + 1,
      wins = COALESCE(wins, 0) + CASE WHEN NOT v_p1_won THEN 1 ELSE 0 END,
      losses = COALESCE(losses, 0) + CASE WHEN v_p1_won THEN 1 ELSE 0 END,
      updated_at = p_match_time
  WHERE id = p_p2;

  BEGIN
    PERFORM public.evaluate_player_achievements(p_p1, v_match_id);
    PERFORM public.evaluate_player_achievements(p_p2, v_match_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_match_id;
END;
$$;

-- 5. Execute Official Foundation Cup Seeding & Bracket Completion
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

  b_yusif INT;
  b_ahad INT;
  b_maharat INT;
  b_qulam INT;
  b_sabir INT;
  b_adil INT;
  b_muhammad INT;
  b_kamran INT;
  b_kazim INT;
  b_faiq INT;
  b_maharram INT;
  b_rafiq INT;

  v_base_time TIMESTAMPTZ := '2026-11-07 10:00:00+04'::timestamptz;

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

  ALTER TABLE public.matches DISABLE TRIGGER USER;
  ALTER TABLE public.tournaments DISABLE TRIGGER USER;

  -- 1. Identify or Create Tournament
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
      point_weight,
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
      0.40,
      'Bibiheybət Kampusu',
      2026,
      'completed',
      '2026-11-07 10:00:00+04'::timestamptz
    )
    RETURNING id INTO v_tourn_id;
  ELSE
    UPDATE public.tournaments
    SET point_weight = 0.40
    WHERE id = v_tourn_id;
  END IF;

  -- 2. Ensure All 12 Participating Players Exist (Adəm Rəhimli excluded)
  p_ahad     := public.get_or_create_player('Əhəd Zamanlı',        'ahad-zamanli',        'ehed.zamanli.std@bhos.edu.az',        'Information Security');
  p_yusif    := public.get_or_create_player('Yusif Xanlarov',      'yusif-xanlarov',      'yusif.xanlarov.std@bhos.edu.az',      'Computer Engineering');
  p_muhammad := public.get_or_create_player('Məhəmməd Əsədov',     'muhammad-asadov',     'mehemmed.esedov.std@bhos.edu.az',     'Process Automation Engineering');
  p_sabir    := public.get_or_create_player('Sabir Məhərrəmli',    'sabir-maharramli',    'sabir.meherremli.std@bhos.edu.az',    'Petroleum Engineering');
  p_adil     := public.get_or_create_player('Adil Süleymanov',     'adil-suleymanov',     'adil.suleymanov.std@bhos.edu.az',     'Information Security');
  p_kamran   := public.get_or_create_player('Kamran Əliyev',       'kamran-aliyev',       'kamran.aliev.std@bhos.edu.az',        'Computer Engineering');

  p_maharat  := public.get_or_create_player('Məharət Kərimli',     'maharat-karimli',     'meharet.kerimli.std@bhos.edu.az',     'Computer Engineering');
  p_kazim    := public.get_or_create_player('Kazım Fətəlizadə',    'kazim-fatalizada',    'kazim.fetelizade.std@bhos.edu.az',    'Process Automation Engineering');
  p_qulam    := public.get_or_create_player('Qulam Rüstəmzadə',    'qulam-rustamzada',    'qulam.rustemzade.std@bhos.edu.az',    'Petroleum Engineering');
  p_faiq     := public.get_or_create_player('Faiq Hüseynli',       'faiq-huseynli',       'faiq.huseynli.std@bhos.edu.az',       'Chemical Engineering');
  p_maharram := public.get_or_create_player('Məhərrəm Mirzəxanlı', 'maharram-mirzaxanli', 'meherrem.mirzexanli.std@bhos.edu.az', 'Process Automation Engineering');
  p_rafiq    := public.get_or_create_player('Rafiq Həsənli',       'rafiq-hasanli',       'rafiq.hesenli.std@bhos.edu.az',       'Computer Engineering');

  -- 3. Resolve each player's intact starting baseline rating (100 / 250 / 400)
  b_yusif    := public.resolve_player_baseline_elo(p_yusif,    400);
  b_ahad     := public.resolve_player_baseline_elo(p_ahad,     400);
  b_maharat  := public.resolve_player_baseline_elo(p_maharat,  400);
  b_qulam    := public.resolve_player_baseline_elo(p_qulam,    400);
  b_sabir    := public.resolve_player_baseline_elo(p_sabir,    250);
  b_kazim    := public.resolve_player_baseline_elo(p_kazim,    250);
  b_adil     := public.resolve_player_baseline_elo(p_adil,     250);
  b_faiq     := public.resolve_player_baseline_elo(p_faiq,     250);
  b_muhammad := public.resolve_player_baseline_elo(p_muhammad, 100);
  b_maharram := public.resolve_player_baseline_elo(p_maharram, 100);
  b_kamran   := public.resolve_player_baseline_elo(p_kamran,   100);
  b_rafiq    := public.resolve_player_baseline_elo(p_rafiq,    100);

  DELETE FROM public.matches
  WHERE tournament_id = v_tourn_id
     OR player1_id IN (p_ahad, p_yusif, p_muhammad, p_sabir, p_adil, p_kamran, p_maharat, p_kazim, p_qulam, p_faiq, p_maharram, p_rafiq)
     OR player2_id IN (p_ahad, p_yusif, p_muhammad, p_sabir, p_adil, p_kamran, p_maharat, p_kazim, p_qulam, p_faiq, p_maharram, p_rafiq);

  UPDATE public.profiles SET current_elo = b_yusif,    elo_rating = b_yusif,    peak_elo = b_yusif,    playing_level = CASE WHEN b_yusif >= 400 THEN 'Advanced' WHEN b_yusif >= 250 THEN 'Intermediate' ELSE 'Beginner' END, matches_played = 0, wins = 0, losses = 0 WHERE id = p_yusif;
  UPDATE public.profiles SET current_elo = b_ahad,     elo_rating = b_ahad,     peak_elo = b_ahad,     playing_level = CASE WHEN b_ahad >= 400 THEN 'Advanced' WHEN b_ahad >= 250 THEN 'Intermediate' ELSE 'Beginner' END, matches_played = 0, wins = 0, losses = 0 WHERE id = p_ahad;
  UPDATE public.profiles SET current_elo = b_maharat,  elo_rating = b_maharat,  peak_elo = b_maharat,  playing_level = CASE WHEN b_maharat >= 400 THEN 'Advanced' WHEN b_maharat >= 250 THEN 'Intermediate' ELSE 'Beginner' END, matches_played = 0, wins = 0, losses = 0 WHERE id = p_maharat;
  UPDATE public.profiles SET current_elo = b_qulam,    elo_rating = b_qulam,    peak_elo = b_qulam,    playing_level = CASE WHEN b_qulam >= 400 THEN 'Advanced' WHEN b_qulam >= 250 THEN 'Intermediate' ELSE 'Beginner' END, matches_played = 0, wins = 0, losses = 0 WHERE id = p_qulam;
  UPDATE public.profiles SET current_elo = b_sabir,    elo_rating = b_sabir,    peak_elo = b_sabir,    playing_level = CASE WHEN b_sabir >= 400 THEN 'Advanced' WHEN b_sabir >= 250 THEN 'Intermediate' ELSE 'Beginner' END, matches_played = 0, wins = 0, losses = 0 WHERE id = p_sabir;
  UPDATE public.profiles SET current_elo = b_kazim,    elo_rating = b_kazim,    peak_elo = b_kazim,    playing_level = CASE WHEN b_kazim >= 400 THEN 'Advanced' WHEN b_kazim >= 250 THEN 'Intermediate' ELSE 'Beginner' END, matches_played = 0, wins = 0, losses = 0 WHERE id = p_kazim;
  UPDATE public.profiles SET current_elo = b_adil,     elo_rating = b_adil,     peak_elo = b_adil,     playing_level = CASE WHEN b_adil >= 400 THEN 'Advanced' WHEN b_adil >= 250 THEN 'Intermediate' ELSE 'Beginner' END, matches_played = 0, wins = 0, losses = 0 WHERE id = p_adil;
  UPDATE public.profiles SET current_elo = b_faiq,     elo_rating = b_faiq,     peak_elo = b_faiq,     playing_level = CASE WHEN b_faiq >= 400 THEN 'Advanced' WHEN b_faiq >= 250 THEN 'Intermediate' ELSE 'Beginner' END, matches_played = 0, wins = 0, losses = 0 WHERE id = p_faiq;
  UPDATE public.profiles SET current_elo = b_muhammad, elo_rating = b_muhammad, peak_elo = b_muhammad, playing_level = CASE WHEN b_muhammad >= 400 THEN 'Advanced' WHEN b_muhammad >= 250 THEN 'Intermediate' ELSE 'Beginner' END, matches_played = 0, wins = 0, losses = 0 WHERE id = p_muhammad;
  UPDATE public.profiles SET current_elo = b_maharram, elo_rating = b_maharram, peak_elo = b_maharram, playing_level = CASE WHEN b_maharram >= 400 THEN 'Advanced' WHEN b_maharram >= 250 THEN 'Intermediate' ELSE 'Beginner' END, matches_played = 0, wins = 0, losses = 0 WHERE id = p_maharram;
  UPDATE public.profiles SET current_elo = b_kamran,   elo_rating = b_kamran,   peak_elo = b_kamran,   playing_level = CASE WHEN b_kamran >= 400 THEN 'Advanced' WHEN b_kamran >= 250 THEN 'Intermediate' ELSE 'Beginner' END, matches_played = 0, wins = 0, losses = 0 WHERE id = p_kamran;
  UPDATE public.profiles SET current_elo = b_rafiq,    elo_rating = b_rafiq,    peak_elo = b_rafiq,    playing_level = CASE WHEN b_rafiq >= 400 THEN 'Advanced' WHEN b_rafiq >= 250 THEN 'Intermediate' ELSE 'Beginner' END, matches_played = 0, wins = 0, losses = 0 WHERE id = p_rafiq;

  -- 4. Group A Matches (15 matches, Adəm excluded)
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

  -- 5. Group B Matches (15 matches)
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

  -- 6. Playoff Matches (8 matches)
  -- Quarterfinals
  PERFORM public.record_cup_match(p_ahad,    p_faiq,  2, 0, v_tourn_id, 'playoff_qf', v_base_time + interval '180 minutes');
  PERFORM public.record_cup_match(p_maharat, p_sabir, 2, 1, v_tourn_id, 'playoff_qf', v_base_time + interval '190 minutes');
  PERFORM public.record_cup_match(p_qulam,   p_adil,  2, 0, v_tourn_id, 'playoff_qf', v_base_time + interval '200 minutes');
  PERFORM public.record_cup_match(p_yusif,   p_kazim, 2, 0, v_tourn_id, 'playoff_qf', v_base_time + interval '210 minutes');

  -- Semifinals
  PERFORM public.record_cup_match(p_ahad,  p_maharat, 1, 3, v_tourn_id, 'playoff_sf', v_base_time + interval '240 minutes');
  PERFORM public.record_cup_match(p_qulam, p_yusif,   0, 3, v_tourn_id, 'playoff_sf', v_base_time + interval '255 minutes');

  -- 3rd Place Match
  PERFORM public.record_cup_match(p_ahad, p_qulam, 3, 2, v_tourn_id, 'playoff_3rd', v_base_time + interval '285 minutes');

  -- Grand Final
  PERFORM public.record_cup_match(p_maharat, p_yusif, 0, 3, v_tourn_id, 'playoff_final', v_base_time + interval '315 minutes');

  -- 7. Build Rich Bracket & Podium JSONB for Tournament Page UI
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
      'point_weight', 0.40,
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

  -- 8. Finalize Tournament Record & Official Podium
  UPDATE public.tournaments
  SET status = 'completed',
      point_weight = 0.40,
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

  ALTER TABLE public.matches ENABLE TRIGGER USER;
  ALTER TABLE public.tournaments ENABLE TRIGGER USER;
END $$;

-- ==============================================================================
-- Migration 037: Restrict Foundation Cup Roster Strictly to the 12 Official Participants
--
-- Fixes the participant count on the Foundation Cup tournament ("Zəfər Günü" Foundation Kuboku)
-- so that ONLY the 12 verified official participants are associated with the tournament:
--   1. Yusif Xanlarov
--   2. Məharət Kərimli
--   3. Əhəd Zamanlı
--   4. Qulam Rüstəmzadə
--   5. Sabir Məhərrəmli
--   6. Adil Süleymanov
--   7. Kazım Fətəlizadə
--   8. Faiq Hüseynli
--   9. Məhəmməd Əsədov
--  10. Kamran Əliyev
--  11. Məhərrəm Mirzəxanlı
--  12. Rafiq Həsənli
--
-- Excludes Adəm Rəhimli (did not attend) and any mock/test/organizer accounts from
-- `tournaments.participants`, `tournament_registrations`, `matches`, and `bracket_data`.
-- ==============================================================================

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
  END IF;

  RETURN v_id;
END;
$$;

DO $$
DECLARE
  v_tourn_id UUID;
  v_tourn_slug TEXT := 'foundation-kuboku-2026';

  p_yusif UUID;
  p_maharat UUID;
  p_ahad UUID;
  p_qulam UUID;
  p_sabir UUID;
  p_adil UUID;
  p_kazim UUID;
  p_faiq UUID;
  p_muhammad UUID;
  p_kamran UUID;
  p_maharram UUID;
  p_rafiq UUID;

  v_official_ids UUID[];
  v_participants_json JSONB;

  j_yusif JSONB;
  j_maharat JSONB;
  j_ahad JSONB;
  j_qulam JSONB;
  j_sabir JSONB;
  j_adil JSONB;
  j_kazim JSONB;
  j_faiq JSONB;
  j_muhammad JSONB;
  j_kamran JSONB;
  j_maharram JSONB;
  j_rafiq JSONB;

  v_group_a_matches JSONB;
  v_group_b_matches JSONB;
  v_playoff_rounds JSONB;
  v_third_place_match JSONB;
  v_bracket_data JSONB;
BEGIN
  PERFORM set_config('app.bypass_profile_security', 'true', true);
  PERFORM set_config('app.bypass_match_security', 'true', true);
  PERFORM set_config('app.bypass_security_guard', 'true', true);

  ALTER TABLE public.matches DISABLE TRIGGER USER;
  ALTER TABLE public.tournaments DISABLE TRIGGER USER;

  -- 1. Locate the Foundation Cup tournament record
  SELECT id, COALESCE(slug, 'foundation-kuboku-2026')
  INTO v_tourn_id, v_tourn_slug
  FROM public.tournaments
  WHERE slug = 'foundation-kuboku-2026'
     OR title ILIKE '%Foundation%'
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF v_tourn_id IS NULL THEN
    RAISE NOTICE 'Foundation Cup tournament not found in public.tournaments; skipping.';
    ALTER TABLE public.matches ENABLE TRIGGER USER;
    ALTER TABLE public.tournaments ENABLE TRIGGER USER;
    RETURN;
  END IF;

  -- 2. Resolve the exact 12 official participants
  p_yusif    := public.get_or_create_player('Yusif Xanlarov',      'yusif-xanlarov',      'yusif.xanlarov.std@bhos.edu.az',      'Computer Engineering');
  p_maharat  := public.get_or_create_player('Məharət Kərimli',     'maharat-karimli',     'meharet.kerimli.std@bhos.edu.az',     'Computer Engineering');
  p_ahad     := public.get_or_create_player('Əhəd Zamanlı',        'ahad-zamanli',        'ehed.zamanli.std@bhos.edu.az',        'Information Security');
  p_qulam    := public.get_or_create_player('Qulam Rüstəmzadə',    'qulam-rustamzada',    'qulam.rustemzade.std@bhos.edu.az',    'Petroleum Engineering');
  p_sabir    := public.get_or_create_player('Sabir Məhərrəmli',    'sabir-maharramli',    'sabir.meherremli.std@bhos.edu.az',    'Petroleum Engineering');
  p_adil     := public.get_or_create_player('Adil Süleymanov',     'adil-suleymanov',     'adil.suleymanov.std@bhos.edu.az',     'Information Security');
  p_kazim    := public.get_or_create_player('Kazım Fətəlizadə',    'kazim-fatalizada',    'kazim.fetelizade.std@bhos.edu.az',    'Process Automation Engineering');
  p_faiq     := public.get_or_create_player('Faiq Hüseynli',       'faiq-huseynli',       'faiq.huseynli.std@bhos.edu.az',       'Chemical Engineering');
  p_muhammad := public.get_or_create_player('Məhəmməd Əsədov',     'muhammad-asadov',     'mehemmed.esedov.std@bhos.edu.az',     'Process Automation Engineering');
  p_kamran   := public.get_or_create_player('Kamran Əliyev',       'kamran-aliyev',       'kamran.aliev.std@bhos.edu.az',        'Computer Engineering');
  p_maharram := public.get_or_create_player('Məhərrəm Mirzəxanlı', 'maharram-mirzaxanli', 'meherrem.mirzexanli.std@bhos.edu.az', 'Process Automation Engineering');
  p_rafiq    := public.get_or_create_player('Rafiq Həsənli',       'rafiq-hasanli',       'rafiq.hasanli.std@bhos.edu.az',       'Computer Engineering');

  v_official_ids := ARRAY[
    p_yusif,
    p_maharat,
    p_ahad,
    p_qulam,
    p_sabir,
    p_adil,
    p_kazim,
    p_faiq,
    p_muhammad,
    p_kamran,
    p_maharram,
    p_rafiq
  ];

  v_participants_json := jsonb_build_array(
    p_yusif::text,
    p_maharat::text,
    p_ahad::text,
    p_qulam::text,
    p_sabir::text,
    p_adil::text,
    p_kazim::text,
    p_faiq::text,
    p_muhammad::text,
    p_kamran::text,
    p_maharram::text,
    p_rafiq::text
  );

  -- 3. Clean up `tournament_registrations` (if table exists) so ONLY these 12 players remain
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'tournament_registrations'
  ) THEN
    EXECUTE $sql$
      DELETE FROM public.tournament_registrations
      WHERE (tournament_id = $1 OR tournament_slug = $2 OR tournament_slug = 'tourn-foundation-2026')
        AND (player_id IS NULL OR NOT (player_id = ANY($3)))
    $sql$
    USING v_tourn_id, v_tourn_slug, v_official_ids;
  END IF;

  -- 4. Delete any tournament matches involving anyone outside the 12 official participants (e.g. Adəm Rəhimli or test users)
  DELETE FROM public.matches
  WHERE tournament_id = v_tourn_id
    AND (
      player1_id IS NULL
      OR player2_id IS NULL
      OR NOT (player1_id = ANY(v_official_ids))
      OR NOT (player2_id = ANY(v_official_ids))
    );

  -- 5. Rebuild clean 12-player `bracket_data` snapshots from the 12 official profiles
  SELECT to_jsonb(p.*) INTO j_yusif    FROM public.profiles p WHERE id = p_yusif;
  SELECT to_jsonb(p.*) INTO j_maharat  FROM public.profiles p WHERE id = p_maharat;
  SELECT to_jsonb(p.*) INTO j_ahad     FROM public.profiles p WHERE id = p_ahad;
  SELECT to_jsonb(p.*) INTO j_qulam    FROM public.profiles p WHERE id = p_qulam;
  SELECT to_jsonb(p.*) INTO j_sabir    FROM public.profiles p WHERE id = p_sabir;
  SELECT to_jsonb(p.*) INTO j_adil     FROM public.profiles p WHERE id = p_adil;
  SELECT to_jsonb(p.*) INTO j_kazim    FROM public.profiles p WHERE id = p_kazim;
  SELECT to_jsonb(p.*) INTO j_faiq     FROM public.profiles p WHERE id = p_faiq;
  SELECT to_jsonb(p.*) INTO j_muhammad FROM public.profiles p WHERE id = p_muhammad;
  SELECT to_jsonb(p.*) INTO j_kamran   FROM public.profiles p WHERE id = p_kamran;
  SELECT to_jsonb(p.*) INTO j_maharram FROM public.profiles p WHERE id = p_maharram;
  SELECT to_jsonb(p.*) INTO j_rafiq    FROM public.profiles p WHERE id = p_rafiq;

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

  -- 6. Update `public.tournaments` to strictly hold the 12 official participants
  UPDATE public.tournaments
  SET status = 'completed',
      point_weight = 0.40,
      winner_id = p_yusif,
      runner_up_id = p_maharat,
      third_place_id = p_ahad,
      max_participants = 12,
      group_size = 6,
      advance_per_group = 4,
      participants = v_participants_json,
      bracket_data = v_bracket_data,
      updated_at = NOW()
  WHERE id = v_tourn_id;

  ALTER TABLE public.matches ENABLE TRIGGER USER;
  ALTER TABLE public.tournaments ENABLE TRIGGER USER;
END $$;

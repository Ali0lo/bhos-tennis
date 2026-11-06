-- Migration 036: Foundation Cup 2026 Groups & Matches Locked Data
-- Seeds the 14 Foundation student players and permanently locks in Qrup A and Qrup B
-- with all 42 round-robin matches and ITTF semi-final/final seeding protection.

-- 1. Ensure the 14 Foundation players exist in public.profiles
INSERT INTO public.profiles (
  id, full_name, email, major_faculty, admission_year,
  user_type, gender, role, playing_style, blade_equipment,
  forehand_rubber, backhand_rubber, current_elo,
  matches_played, wins, losses, is_verified, is_active
)
VALUES
  -- Qrup A
  ('00000000-0000-0000-0001-000000000001', 'Yusif Xanlarov', 'yusif.xanlarov.std@bhos.edu.az', 'Computer Engineering', 2026, 'student', 'male', 'player', 'Shakehand Offensive', 'Butterfly Timo Boll ALC', 'Butterfly Dignics 09C', 'Butterfly Tenergy 05', 1000, 0, 0, 0, true, true),
  ('00000000-0000-0000-0001-000000000002', 'Əhəd Zamanlı', 'ehed.zamanli.std@bhos.edu.az', 'Information Security', 2026, 'student', 'male', 'player', 'Shakehand All-round', 'Stiga Allround Classic', 'Yasaka Rakza 7', 'Yasaka Rakza 7', 1000, 0, 0, 0, true, true),
  ('00000000-0000-0000-0001-000000000003', 'Məhəmməd Əsədov', 'mehemmed.esedov.std@bhos.edu.az', 'Process Automation Engineering', 2026, 'student', 'male', 'player', 'Shakehand Offensive', 'Donic Waldner Senso V1', 'Donic Baracuda', 'Donic Baracuda', 1000, 0, 0, 0, true, true),
  ('00000000-0000-0000-0001-000000000004', 'Sabir Məhərrəmli', 'sabir.meherremli.std@bhos.edu.az', 'Petroleum Engineering', 2026, 'student', 'male', 'player', 'Shakehand All-round', 'Yasaka Sweden Extra', 'Xiom Vega Pro', 'Xiom Vega Europe', 1000, 0, 0, 0, true, true),
  ('00000000-0000-0000-0001-000000000005', 'Adəm Rəhimli', 'adem.rehimli.std@bhos.edu.az', 'Chemical Engineering', 2026, 'student', 'male', 'player', 'Shakehand Offensive', 'Butterfly Primorac', 'Butterfly Rozena', 'Butterfly Rozena', 1000, 0, 0, 0, true, true),
  ('00000000-0000-0000-0001-000000000006', 'Kamran Aliev', 'kamran.aliev.std@bhos.edu.az', 'Computer Engineering', 2026, 'student', 'male', 'player', 'Shakehand All-round', 'Tibhar Samsonov Alpha', 'Tibhar Evolution EL-P', 'Tibhar Evolution FX-P', 1000, 0, 0, 0, true, true),
  ('00000000-0000-0000-0001-000000000007', 'Adil Süleymanov', 'adil.suleymanov.std@bhos.edu.az', 'Information Security', 2026, 'student', 'male', 'player', 'Shakehand All-round', 'Stiga Infinity VPS V', 'DHS Hurricane 3', 'Yasaka Rakza 7', 1000, 0, 0, 0, true, true),

  -- Qrup B
  ('00000000-0000-0000-0001-000000000008', 'Məharət Kərimli', 'meharet.kerimli.std@bhos.edu.az', 'Computer Engineering', 2026, 'student', 'male', 'player', 'Shakehand Offensive', 'Butterfly Viscaria', 'Butterfly Dignics 05', 'Butterfly Tenergy 05', 1000, 0, 0, 0, true, true),
  ('00000000-0000-0000-0001-000000000009', 'Kazım Fətəlizadə', 'kazim.fetelizade.std@bhos.edu.az', 'Process Automation Engineering', 2026, 'student', 'male', 'player', 'Shakehand All-round', 'Yasaka Ma Lin Carbon', 'Yasaka Rakza 7', 'Yasaka Rakza 7', 1000, 0, 0, 0, true, true),
  ('00000000-0000-0000-0001-000000000010', 'Qulam Rüstəmzadə', 'qulam.rustemzade.std@bhos.edu.az', 'Petroleum Engineering', 2026, 'student', 'male', 'player', 'Shakehand Defensive', 'Butterfly Innershield Layer ZLF', 'Butterfly Tackiness Chop II', 'Butterfly Feint Long III', 1000, 0, 0, 0, true, true),
  ('00000000-0000-0000-0001-000000000011', 'Faiq Hüseynli', 'faiq.huseynli.std@bhos.edu.az', 'Chemical Engineering', 2026, 'student', 'male', 'player', 'Shakehand Offensive', 'Donic Ovtcharov True Carbon', 'Donic Bluefire M2', 'Donic Bluefire M3', 1000, 0, 0, 0, true, true),
  ('00000000-0000-0000-0001-000000000012', 'Kamran Aliev', 'kamran.aliev2.std@bhos.edu.az', 'Information Security', 2026, 'student', 'male', 'player', 'Shakehand All-round', 'Stiga Clipper CR', 'Stiga Calibra LT', 'Stiga Calibra LT Sound', 1000, 0, 0, 0, true, true),
  ('00000000-0000-0000-0001-000000000013', 'Rafiq Həsənli', 'rafiq.hesenli.std@bhos.edu.az', 'Computer Engineering', 2026, 'student', 'male', 'player', 'Shakehand Offensive', 'Xiom Feel AX', 'Xiom Omega VII Pro', 'Xiom Vega X', 1000, 0, 0, 0, true, true),
  ('00000000-0000-0000-0001-000000000014', 'Məhərrəm Mirzəxanlı', 'meherrem.mirzexanli.std@bhos.edu.az', 'Process Automation Engineering', 2026, 'student', 'male', 'player', 'Shakehand All-round', 'Butterfly Korbel', 'Butterfly Sriver EL', 'Butterfly Sriver FX', 1000, 0, 0, 0, true, true)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  major_faculty = EXCLUDED.major_faculty,
  admission_year = EXCLUDED.admission_year,
  is_verified = true,
  is_active = true;

-- 2. Clean out organizer from Foundation tournament roster
DELETE FROM public.tournament_registrations
WHERE (tournament_slug = 'foundation-kuboku-2026' OR tournament_id::text = 'tourn-foundation-2026')
  AND player_id IN (
    SELECT id FROM public.profiles
    WHERE email IN ('ali.iskandarli.std@bhos.edu.az', 'ali.iskandarli@bhos.edu.az')
       OR full_name ILIKE '%ali iskandarli%'
       OR full_name ILIKE '%əli isgəndərli%'
  );

-- 3. Register the 14 players in tournament_registrations
INSERT INTO public.tournament_registrations (player_id, tournament_slug, registered_at)
SELECT p.id, 'foundation-kuboku-2026', NOW()
FROM public.profiles p
WHERE p.id IN (
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0001-000000000002',
  '00000000-0000-0000-0001-000000000003',
  '00000000-0000-0000-0001-000000000004',
  '00000000-0000-0000-0001-000000000005',
  '00000000-0000-0000-0001-000000000006',
  '00000000-0000-0000-0001-000000000007',
  '00000000-0000-0000-0001-000000000008',
  '00000000-0000-0000-0001-000000000009',
  '00000000-0000-0000-0001-000000000010',
  '00000000-0000-0000-0001-000000000011',
  '00000000-0000-0000-0001-000000000012',
  '00000000-0000-0000-0001-000000000013',
  '00000000-0000-0000-0001-000000000014'
)
ON CONFLICT DO NOTHING;

-- 4. Build and lock the tournament bracket data for Foundation Cup 2026
DO $$
DECLARE
  v_p jsonb[];
  v_group_a_players jsonb;
  v_group_b_players jsonb;
  v_group_a_matches jsonb := '[]'::jsonb;
  v_group_b_matches jsonb := '[]'::jsonb;
  v_bracket_data jsonb;
  v_p1 jsonb;
  v_p2 jsonb;
  i int;
  j int;
  m_idx int := 0;
  v_part_ids jsonb;
BEGIN
  -- Gather player profiles
  SELECT jsonb_agg(to_jsonb(p.*)) INTO v_group_a_players
  FROM public.profiles p
  WHERE p.id IN (
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0001-000000000002',
    '00000000-0000-0000-0001-000000000003',
    '00000000-0000-0000-0001-000000000004',
    '00000000-0000-0000-0001-000000000005',
    '00000000-0000-0000-0001-000000000006',
    '00000000-0000-0000-0001-000000000007'
  );

  SELECT jsonb_agg(to_jsonb(p.*)) INTO v_group_b_players
  FROM public.profiles p
  WHERE p.id IN (
    '00000000-0000-0000-0001-000000000008',
    '00000000-0000-0000-0001-000000000009',
    '00000000-0000-0000-0001-000000000010',
    '00000000-0000-0000-0001-000000000011',
    '00000000-0000-0000-0001-000000000012',
    '00000000-0000-0000-0001-000000000013',
    '00000000-0000-0000-0001-000000000014'
  );

  -- Generate Group A round-robin matches (21 matches)
  m_idx := 0;
  FOR i IN 0..jsonb_array_length(v_group_a_players) - 1 LOOP
    FOR j IN (i + 1)..jsonb_array_length(v_group_a_players) - 1 LOOP
      v_p1 := v_group_a_players->i;
      v_p2 := v_group_a_players->j;
      v_group_a_matches := v_group_a_matches || jsonb_build_array(
        jsonb_build_object(
          'id', 'g-tourn-foundation-2026-a-m' || m_idx,
          'groupId', 'g-tourn-foundation-2026-a',
          'player1', v_p1,
          'player2', v_p2,
          'status', 'ready'
        )
      );
      m_idx := m_idx + 1;
    END LOOP;
  END LOOP;

  -- Generate Group B round-robin matches (21 matches)
  m_idx := 0;
  FOR i IN 0..jsonb_array_length(v_group_b_players) - 1 LOOP
    FOR j IN (i + 1)..jsonb_array_length(v_group_b_players) - 1 LOOP
      v_p1 := v_group_b_players->i;
      v_p2 := v_group_b_players->j;
      v_group_b_matches := v_group_b_matches || jsonb_build_array(
        jsonb_build_object(
          'id', 'g-tourn-foundation-2026-b-m' || m_idx,
          'groupId', 'g-tourn-foundation-2026-b',
          'player1', v_p1,
          'player2', v_p2,
          'status', 'ready'
        )
      );
      m_idx := m_idx + 1;
    END LOOP;
  END LOOP;

  -- Build full bracket_data JSONB
  v_bracket_data := jsonb_build_object(
    'rounds', '[]'::jsonb,
    'groups', jsonb_build_array(
      jsonb_build_object(
        'id', 'g-tourn-foundation-2026-a',
        'name', 'Qrup A',
        'players', v_group_a_players,
        'matches', v_group_a_matches,
        'top_seed_id', '00000000-0000-0000-0001-000000000001'
      ),
      jsonb_build_object(
        'id', 'g-tourn-foundation-2026-b',
        'name', 'Qrup B',
        'players', v_group_b_players,
        'matches', v_group_b_matches,
        'top_seed_id', '00000000-0000-0000-0001-000000000008'
      )
    ),
    'settings', jsonb_build_object(
      'group_size', 7,
      'group_size_label', '7 nəfər',
      'advance_per_group', 4,
      'location', 'Bibiheybət Kampusu',
      'allowed_admission_year', 2026,
      'best_of_sets', 3,
      'top_seed_ids', jsonb_build_array(
        '00000000-0000-0000-0001-000000000001',
        '00000000-0000-0000-0001-000000000008',
        '00000000-0000-0000-0001-000000000002',
        '00000000-0000-0000-0001-000000000009'
      ),
      'seeding_guarantee', '1-ci və 2-ci səbət başçıları yalnız Finalda, 3-cü və 4-cü səbət başçıları isə yalnız Yarımfinalda qarşılaşa bilər.'
    )
  );

  SELECT jsonb_agg(p->>'id') INTO v_part_ids
  FROM (
    SELECT jsonb_array_elements(v_group_a_players) AS p
    UNION ALL
    SELECT jsonb_array_elements(v_group_b_players) AS p
  ) s;

  -- Update tournaments table
  UPDATE public.tournaments
  SET
    status = 'ongoing',
    format = 'groups_and_knockout',
    max_participants = 14,
    group_size = 7,
    advance_per_group = 4,
    participants = v_part_ids,
    bracket_data = v_bracket_data,
    updated_at = NOW()
  WHERE slug = 'foundation-kuboku-2026'
     OR id::text = 'tourn-foundation-2026'
     OR title ILIKE '%foundation%';
END $$;

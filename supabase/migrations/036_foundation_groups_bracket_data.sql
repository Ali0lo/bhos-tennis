-- ==============================================================================
-- Migration 036: Foundation Cup 2026 Locked Groups & Bracket Data
-- Qrup A (7 oyunçu, 21 oyun) və Qrup B (6 oyunçu, 15 oyun)
-- Kamran Aliyev yalnız Qrup A-dadır.
-- ==============================================================================

-- 1. Təşkilatçını (Əli İsgəndərli) turnir iştirakçı siyahısından təmizlə
DELETE FROM public.tournament_registrations
WHERE (tournament_slug = 'foundation-kuboku-2026' OR tournament_id::text = 'tourn-foundation-2026')
  AND player_id IN (
    SELECT id FROM public.profiles
    WHERE email IN ('ali.iskandarli.std@bhos.edu.az', 'ali.iskandarli@bhos.edu.az')
       OR full_name ILIKE '%ali iskandarli%'
       OR full_name ILIKE '%əli isgəndərli%'
  );

-- 2. Əgər bu 13 tələbədən qeydiyyatdan keçənlər varsa, onları qeydiyyata bağla
INSERT INTO public.tournament_registrations (player_id, tournament_slug, registered_at)
SELECT p.id, 'foundation-kuboku-2026', NOW()
FROM public.profiles p
WHERE p.email IN (
  'yusif.xanlarov.std@bhos.edu.az',
  'ehed.zamanli.std@bhos.edu.az',
  'mehemmed.esedov.std@bhos.edu.az',
  'sabir.meherremli.std@bhos.edu.az',
  'adem.rehimli.std@bhos.edu.az',
  'kamran.aliev.std@bhos.edu.az',
  'adil.suleymanov.std@bhos.edu.az',
  'meharet.kerimli.std@bhos.edu.az',
  'kazim.fetelizade.std@bhos.edu.az',
  'qulam.rustemzade.std@bhos.edu.az',
  'faiq.huseynli.std@bhos.edu.az',
  'rafiq.hesenli.std@bhos.edu.az',
  'meherrem.mirzexanli.std@bhos.edu.az'
) OR p.full_name IN (
  'Yusif Xanlarov',
  'Əhəd Zamanlı',
  'Məhəmməd Əsədov',
  'Sabir Məhərrəmli',
  'Adəm Rəhimli',
  'Kamran Aliev',
  'Adil Süleymanov',
  'Məharət Kərimli',
  'Kazım Fətəlizadə',
  'Qulam Rüstəmzadə',
  'Faiq Hüseynli',
  'Rafiq Həsənli',
  'Məhərrəm Mirzəxanlı'
)
ON CONFLICT DO NOTHING;

-- 3. Qrup A (7 oyunçu) və Qrup B (6 oyunçu) turnir cədvəlinə yaz
DO $$
DECLARE
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

  -- Group A (7 oyunçu)
  v_a1 jsonb; v_a2 jsonb; v_a3 jsonb; v_a4 jsonb; v_a5 jsonb; v_a6 jsonb; v_a7 jsonb;
  -- Group B (6 oyunçu)
  v_b1 jsonb; v_b2 jsonb; v_b3 jsonb; v_b4 jsonb; v_b5 jsonb; v_b6 jsonb;
BEGIN
  -- Qrup A oyunçuları
  SELECT COALESCE(to_jsonb(p.*), jsonb_build_object('id', 'p-f-yusif-xanlarov', 'full_name', 'Yusif Xanlarov', 'email', 'yusif.xanlarov.std@bhos.edu.az', 'major_faculty', 'Computer Engineering', 'admission_year', 2026, 'current_elo', 1000, 'role', 'player'))
  INTO v_a1 FROM (SELECT 1) d LEFT JOIN public.profiles p ON (p.full_name ILIKE '%Yusif%Xanlarov%' OR p.email ILIKE '%yusif.xanlarov%') LIMIT 1;

  SELECT COALESCE(to_jsonb(p.*), jsonb_build_object('id', 'p-f-ehed-zamanli', 'full_name', 'Əhəd Zamanlı', 'email', 'ehed.zamanli.std@bhos.edu.az', 'major_faculty', 'Information Security', 'admission_year', 2026, 'current_elo', 1000, 'role', 'player'))
  INTO v_a2 FROM (SELECT 1) d LEFT JOIN public.profiles p ON (p.full_name ILIKE '%Əhəd%Zamanlı%' OR p.full_name ILIKE '%Ehed%Zamanli%' OR p.email ILIKE '%ehed.zamanli%') LIMIT 1;

  SELECT COALESCE(to_jsonb(p.*), jsonb_build_object('id', 'p-f-mehemmed-esedov', 'full_name', 'Məhəmməd Əsədov', 'email', 'mehemmed.esedov.std@bhos.edu.az', 'major_faculty', 'Process Automation Engineering', 'admission_year', 2026, 'current_elo', 1000, 'role', 'player'))
  INTO v_a3 FROM (SELECT 1) d LEFT JOIN public.profiles p ON (p.full_name ILIKE '%Məhəmməd%Əsədov%' OR p.full_name ILIKE '%Mehemmed%Esedov%' OR p.email ILIKE '%mehemmed.esedov%') LIMIT 1;

  SELECT COALESCE(to_jsonb(p.*), jsonb_build_object('id', 'p-f-sabir-meherremli', 'full_name', 'Sabir Məhərrəmli', 'email', 'sabir.meherremli.std@bhos.edu.az', 'major_faculty', 'Petroleum Engineering', 'admission_year', 2026, 'current_elo', 1000, 'role', 'player'))
  INTO v_a4 FROM (SELECT 1) d LEFT JOIN public.profiles p ON (p.full_name ILIKE '%Sabir%Məhərrəmli%' OR p.full_name ILIKE '%Sabir%Meherremli%' OR p.email ILIKE '%sabir.meherremli%') LIMIT 1;

  SELECT COALESCE(to_jsonb(p.*), jsonb_build_object('id', 'p-f-adem-rehimli', 'full_name', 'Adəm Rəhimli', 'email', 'adem.rehimli.std@bhos.edu.az', 'major_faculty', 'Chemical Engineering', 'admission_year', 2026, 'current_elo', 1000, 'role', 'player'))
  INTO v_a5 FROM (SELECT 1) d LEFT JOIN public.profiles p ON (p.full_name ILIKE '%Adəm%Rəhimli%' OR p.full_name ILIKE '%Adem%Rehimli%' OR p.email ILIKE '%adem.rehimli%') LIMIT 1;

  SELECT COALESCE(to_jsonb(p.*), jsonb_build_object('id', 'p-f-kamran-aliev', 'full_name', 'Kamran Aliev', 'email', 'kamran.aliev.std@bhos.edu.az', 'major_faculty', 'Computer Engineering', 'admission_year', 2026, 'current_elo', 1000, 'role', 'player'))
  INTO v_a6 FROM (SELECT 1) d LEFT JOIN public.profiles p ON (p.full_name ILIKE '%Kamran%Aliev%' OR p.full_name ILIKE '%Kamran%Aliyev%' OR p.email ILIKE '%kamran.aliev%') LIMIT 1;

  SELECT COALESCE(to_jsonb(p.*), jsonb_build_object('id', 'p-f-adil-suleymanov', 'full_name', 'Adil Süleymanov', 'email', 'adil.suleymanov.std@bhos.edu.az', 'major_faculty', 'Information Security', 'admission_year', 2026, 'current_elo', 1000, 'role', 'player'))
  INTO v_a7 FROM (SELECT 1) d LEFT JOIN public.profiles p ON (p.full_name ILIKE '%Adil%Süleymanov%' OR p.full_name ILIKE '%Adil%Suleymanov%' OR p.email ILIKE '%adil.suleymanov%') LIMIT 1;

  -- Qrup B oyunçuları (6 oyunçu - Kamran Aliyev yalnız Qrup A-dadır)
  SELECT COALESCE(to_jsonb(p.*), jsonb_build_object('id', 'p-f-meharet-kerimli', 'full_name', 'Məharət Kərimli', 'email', 'meharet.kerimli.std@bhos.edu.az', 'major_faculty', 'Computer Engineering', 'admission_year', 2026, 'current_elo', 1000, 'role', 'player'))
  INTO v_b1 FROM (SELECT 1) d LEFT JOIN public.profiles p ON (p.full_name ILIKE '%Məharət%Kərimli%' OR p.full_name ILIKE '%Meharet%Kerimli%' OR p.email ILIKE '%meharet.kerimli%') LIMIT 1;

  SELECT COALESCE(to_jsonb(p.*), jsonb_build_object('id', 'p-f-kazim-fetelizade', 'full_name', 'Kazım Fətəlizadə', 'email', 'kazim.fetelizade.std@bhos.edu.az', 'major_faculty', 'Process Automation Engineering', 'admission_year', 2026, 'current_elo', 1000, 'role', 'player'))
  INTO v_b2 FROM (SELECT 1) d LEFT JOIN public.profiles p ON (p.full_name ILIKE '%Kazım%Fətəlizadə%' OR p.full_name ILIKE '%Kazim%Fetelizade%' OR p.email ILIKE '%kazim.fetelizade%') LIMIT 1;

  SELECT COALESCE(to_jsonb(p.*), jsonb_build_object('id', 'p-f-qulam-rustemzade', 'full_name', 'Qulam Rüstəmzadə', 'email', 'qulam.rustemzade.std@bhos.edu.az', 'major_faculty', 'Petroleum Engineering', 'admission_year', 2026, 'current_elo', 1000, 'role', 'player'))
  INTO v_b3 FROM (SELECT 1) d LEFT JOIN public.profiles p ON (p.full_name ILIKE '%Qulam%Rüstəmzadə%' OR p.full_name ILIKE '%Qulam%Rustemzade%' OR p.email ILIKE '%qulam.rustemzade%') LIMIT 1;

  SELECT COALESCE(to_jsonb(p.*), jsonb_build_object('id', 'p-f-faiq-huseynli', 'full_name', 'Faiq Hüseynli', 'email', 'faiq.huseynli.std@bhos.edu.az', 'major_faculty', 'Chemical Engineering', 'admission_year', 2026, 'current_elo', 1000, 'role', 'player'))
  INTO v_b4 FROM (SELECT 1) d LEFT JOIN public.profiles p ON (p.full_name ILIKE '%Faiq%Hüseynli%' OR p.full_name ILIKE '%Faiq%Huseynli%' OR p.email ILIKE '%faiq.huseynli%') LIMIT 1;

  SELECT COALESCE(to_jsonb(p.*), jsonb_build_object('id', 'p-f-rafiq-hesenli', 'full_name', 'Rafiq Həsənli', 'email', 'rafiq.hesenli.std@bhos.edu.az', 'major_faculty', 'Computer Engineering', 'admission_year', 2026, 'current_elo', 1000, 'role', 'player'))
  INTO v_b5 FROM (SELECT 1) d LEFT JOIN public.profiles p ON (p.full_name ILIKE '%Rafiq%Həsənli%' OR p.full_name ILIKE '%Rafiq%Hesenli%' OR p.email ILIKE '%rafiq.hesenli%') LIMIT 1;

  SELECT COALESCE(to_jsonb(p.*), jsonb_build_object('id', 'p-f-meherrem-mirzexanli', 'full_name', 'Məhərrəm Mirzəxanlı', 'email', 'meherrem.mirzexanli.std@bhos.edu.az', 'major_faculty', 'Process Automation Engineering', 'admission_year', 2026, 'current_elo', 1000, 'role', 'player'))
  INTO v_b6 FROM (SELECT 1) d LEFT JOIN public.profiles p ON (p.full_name ILIKE '%Məhərrəm%Mirzəxanlı%' OR p.full_name ILIKE '%Meherrem%Mirzexanli%' OR p.email ILIKE '%meherrem.mirzexanli%') LIMIT 1;

  -- Array-ləri tərtib et
  v_group_a_players := jsonb_build_array(v_a1, v_a2, v_a3, v_a4, v_a5, v_a6, v_a7);
  v_group_b_players := jsonb_build_array(v_b1, v_b2, v_b3, v_b4, v_b5, v_b6);

  -- Qrup A oyunları (7 oyunçu = 21 oyun)
  m_idx := 0;
  FOR i IN 0..6 LOOP
    FOR j IN (i + 1)..6 LOOP
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

  -- Qrup B oyunları (6 oyunçu = 15 oyun)
  m_idx := 0;
  FOR i IN 0..5 LOOP
    FOR j IN (i + 1)..5 LOOP
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

  -- bracket_data JSONB qurulması
  v_bracket_data := jsonb_build_object(
    'rounds', '[]'::jsonb,
    'groups', jsonb_build_array(
      jsonb_build_object(
        'id', 'g-tourn-foundation-2026-a',
        'name', 'Qrup A',
        'players', v_group_a_players,
        'matches', v_group_a_matches,
        'top_seed_id', v_a1->>'id'
      ),
      jsonb_build_object(
        'id', 'g-tourn-foundation-2026-b',
        'name', 'Qrup B',
        'players', v_group_b_players,
        'matches', v_group_b_matches,
        'top_seed_id', v_b1->>'id'
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
        v_a1->>'id',
        v_b1->>'id',
        v_a2->>'id',
        v_b2->>'id'
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

  -- Turnir cədvəlini yenilə (updated_at sütunu olmadan)
  UPDATE public.tournaments
  SET
    status = 'ongoing',
    format = 'groups_and_knockout',
    max_participants = 13,
    group_size = 7,
    advance_per_group = 4,
    participants = v_part_ids,
    bracket_data = v_bracket_data
  WHERE slug = 'foundation-kuboku-2026'
     OR id::text = 'tourn-foundation-2026'
     OR title ILIKE '%foundation%';
END $$;

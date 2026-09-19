-- Seed Data for BHOS Table Tennis Portal

-- Seed Profiles (using standard UUIDs for deterministic seeding)
INSERT INTO profiles (id, full_name, email, major_faculty, admission_year, role, playing_style, blade_equipment, forehand_rubber, backhand_rubber, current_elo, matches_played, wins, losses, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Elvin Məmmədov', 'elvin.mammadov@bhos.edu.az', 'Information Security', 2021, 'president', 'Shakehand Offensive', 'Butterfly Viscaria', 'Dignics 09C', 'Tenergy 05', 1640, 38, 31, 7, true),
  ('00000000-0000-0000-0000-000000000002', 'Murad Quliyev', 'murad.quliyev@bhos.edu.az', 'Chemical Engineering', 2020, 'coach', 'Shakehand All-round', 'Stiga Clipper Wood', 'Tibhar Evolution MX-P', 'Yasaka Rakza 7', 1585, 42, 33, 9, true),
  ('00000000-0000-0000-0000-000000000003', 'Ayan Əliyeva', 'ayan.aliyeva@bhos.edu.az', 'Computer Engineering', 2022, 'player', 'Shakehand Offensive', 'Timo Boll ALC', 'Butterfly Tenergy 05', 'Donic Baracuda', 1510, 29, 22, 7, true),
  ('00000000-0000-0000-0000-000000000004', 'Kənan Həsənov', 'kenan.hasanov@bhos.edu.az', 'Process Automation', 2021, 'player', 'Penhold Offensive', 'Yasaka Ma Lin Extra Offensive', 'DHS Hurricane 3 Neo', 'Xiom Vega Pro', 1475, 25, 17, 8, true),
  ('00000000-0000-0000-0000-000000000005', 'Rəşad İsmayılov', 'reshad.ismayilov@bhos.edu.az', 'Petroleum Engineering', 2023, 'player', 'Shakehand Defensive', 'Donic Defplay Senso', 'DHS Skyline 3', 'TSP Curl P-1R', 1390, 20, 12, 8, true),
  ('00000000-0000-0000-0000-000000000006', 'Nigar Rəhimova', 'nigar.rahimova@bhos.edu.az', 'Information Security', 2022, 'player', 'Shakehand All-round', 'Yasaka Sweden Extra', 'Yasaka Rakza 7', 'Yasaka Rakza 7 Soft', 1340, 18, 10, 8, true),
  ('00000000-0000-0000-0000-000000000007', 'Tural Hüseynov', 'tural.huseynov@bhos.edu.az', 'Chemical Engineering', 2024, 'player', 'Shakehand Offensive', 'Butterfly Primorac', 'Rozena', 'Rozena', 1280, 14, 7, 7, true),
  ('00000000-0000-0000-0000-000000000008', 'Leyla Babayeva', 'leyla.babayeva@bhos.edu.az', 'Computer Engineering', 2023, 'player', 'Shakehand All-round', 'Stiga Allround Classic', 'Tibhar Aurus', 'Tibhar Aurus Soft', 1230, 11, 5, 6, true)
ON CONFLICT (id) DO NOTHING;

-- Seed Sample Tournaments
INSERT INTO tournaments (id, title, slug, description, custom_rules, format, max_participants, status, start_date, end_date, created_by, bracket_data)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'BHOS Autumn Open Championship 2024',
    'bhos-autumn-open-2024',
    'Annual university championship bringing together players from all engineering faculties for the prestigious BHOS Cup.',
    '# BHOS Table Tennis Tournament Rules & Regulations
1. **Match Format**: All main bracket matches are Best of 5 (first to win 3 sets). Finals are Best of 7.
2. **Service Rule**: ITTF standard service rule applies — ball must be tossed at least 16 cm vertically from an open palm.
3. **Punctuality**: Players who arrive more than 10 minutes late forfeit the first set. 15 minutes late results in a walkover (WO).
4. **Equipment**: Rackets must comply with ITTF rubber authorization lists. Two-colored racket rule is mandatory.',
    'single_elimination',
    8,
    'ongoing',
    NOW() - INTERVAL '2 days',
    NOW() + INTERVAL '5 days',
    '00000000-0000-0000-0000-000000000001',
    '{}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;


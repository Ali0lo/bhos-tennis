-- Seed Data for BHOS Table Tennis Portal
-- Updated Roster: Iftixar Meherremov, Ali Iskandarli, Ali Abdulov, Ali Aghayev, Huseyn Muradzade, Fateh Memmedli, Rinad Avazzade, Anar Alakbarli, Nihat Ismayilzade

INSERT INTO profiles (id, full_name, email, major_faculty, admission_year, role, playing_style, blade_equipment, forehand_rubber, backhand_rubber, current_elo, matches_played, wins, losses, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'Iftixar Meherremov', 'iftixar.meherremov@bhos.edu.az', 'Coach / BHOS', 2019, 'coach', 'Shakehand All-round', 'Donic / Rubbers pending', 'Tibhar Evolution MX-P', 'Yasaka Rakza 7', 9999, 0, 0, 0, true),
  ('00000000-0000-0000-0000-000000000001', 'Ali Iskandarli', 'ali.iskandarli@bhos.edu.az', 'Information Security', 2021, 'president', 'Shakehand Offensive', 'Not listed', 'Not listed', 'Not listed', 0, 0, 0, 0, true),
  ('00000000-0000-0000-0000-000000000003', 'Ali Abdulov', 'ali.abdulov@bhos.edu.az', 'Petroleum Engineering', 2022, 'player', 'Shakehand Offensive', 'Not listed', 'Not listed', 'Not listed', 0, 0, 0, 0, true),
  ('00000000-0000-0000-0000-000000000004', 'Ali Aghayev', 'ali.aghayev@bhos.edu.az', 'Computer Engineering', 2022, 'player', 'Penhold Offensive', 'Not listed', 'Not listed', 'Not listed', 0, 0, 0, 0, true),
  ('00000000-0000-0000-0000-000000000005', 'Huseyn Muradzade', 'huseyn.muradzade@bhos.edu.az', 'Process Automation', 2023, 'player', 'Shakehand All-round', 'Not listed', 'Not listed', 'Not listed', 0, 0, 0, 0, true),
  ('00000000-0000-0000-0000-000000000006', 'Fateh Memmedli', 'fateh.memmedli@bhos.edu.az', 'Chemical Engineering', 2023, 'player', 'Shakehand Offensive', 'Not listed', 'Not listed', 'Not listed', 0, 0, 0, 0, true),
  ('00000000-0000-0000-0000-000000000007', 'Rinad Avazzade', 'rinad.avazzade@bhos.edu.az', 'Information Security', 2024, 'player', 'Shakehand Offensive', 'Not listed', 'Not listed', 'Not listed', 0, 0, 0, 0, true),
  ('00000000-0000-0000-0000-000000000008', 'Anar Alakbarli', 'anar.alakbarli@bhos.edu.az', 'Computer Engineering', 2024, 'player', 'Shakehand All-round', 'Not listed', 'Not listed', 'Not listed', 0, 0, 0, 0, true),
  ('00000000-0000-0000-0000-000000000009', 'Nihat Ismayilzade', 'nihat.ismayilzade@bhos.edu.az', 'Petroleum Engineering', 2024, 'player', 'Shakehand Offensive', 'Not listed', 'Not listed', 'Not listed', 0, 0, 0, 0, true)
ON CONFLICT (id) DO NOTHING;

-- Seed Sample Tournaments
INSERT INTO tournaments (id, title, slug, description, custom_rules, format, max_participants, status, start_date, end_date, created_by, bracket_data)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'BHOS Autumn Open Championship 2024',
    'bhos-autumn-open-2024',
    'Annual university championship bringing together players from all engineering faculties for the prestigious BANM Cup.',
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

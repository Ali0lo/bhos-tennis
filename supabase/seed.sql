-- ==============================================================================
-- Supabase Seed Script for BHOS Table Tennis Portal
-- File: supabase/seed.sql
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step A: Ensure auth.users parent records exist for all seeded profiles
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
)
VALUES
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'iftixar@bhos.edu.az',
    crypt('bhos2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"İftixar Məhərrəmov","user_type":"teacher","role":"coach"}',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'ali.iskandarli@bhos.edu.az',
    crypt('bhos2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ali Iskandarli","user_type":"student","role":"president"}',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'ali.abdulov@bhos.edu.az',
    crypt('bhos2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ali Abdulov","user_type":"student","role":"player"}',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'ali.aghayev@bhos.edu.az',
    crypt('bhos2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ali Aghayev","user_type":"student","role":"player"}',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'huseyn.muradzade@bhos.edu.az',
    crypt('bhos2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Huseyn Muradzada","user_type":"student","role":"player"}',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'fateh.mammadli@bhos.edu.az',
    crypt('bhos2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Fateh Mammadli","user_type":"student","role":"player"}',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rinad.evezzade@bhos.edu.az',
    crypt('bhos2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Rinad Evezzade","user_type":"student","role":"player"}',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'anar.alakbarli@bhos.edu.az',
    crypt('bhos2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Anar Alakbarli","user_type":"student","role":"player"}',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000009',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'nihat.ismayilzade@bhos.edu.az',
    crypt('bhos2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Nihat Ismayilzade","user_type":"student","role":"player"}',
    false
  )
ON CONFLICT (id) DO NOTHING;

-- Step B: Insert into public.profiles
INSERT INTO public.profiles (
  id, full_name, email, major_faculty, admission_year,
  user_type, gender, role, playing_style, blade_equipment,
  forehand_rubber, backhand_rubber, current_elo,
  matches_played, wins, losses, is_verified, is_active
)
VALUES
  (
    '00000000-0000-0000-0000-000000000002',
    'İftixar Məhərrəmov',
    'iftixar@bhos.edu.az',
    'İdman Klubu',
    NULL,
    'teacher',
    'male',
    'coach',
    'Shakehand All-round',
    'Stiga Clipper Wood',
    'Tibhar Evolution MX-P',
    'Yasaka Rakza 7',
    1400,
    0, 0, 0,
    true, true
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Ali Iskandarli',
    'ali.iskandarli@bhos.edu.az',
    'Computer Engineering',
    2023,
    'student',
    'male',
    'president',
    'Shakehand Offensive',
    'Butterfly Viscaria ALC',
    'Dignics 09C',
    'Tenergy 05',
    0,
    0, 0, 0,
    true, true
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Ali Abdulov',
    'ali.abdulov@bhos.edu.az',
    'Computer Engineering',
    2023,
    'student',
    'male',
    'player',
    'Shakehand Offensive',
    'Timo Boll ALC',
    'Butterfly Tenergy 05',
    'Donic Baracuda',
    0,
    0, 0, 0,
    true, true
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'Ali Aghayev',
    'ali.aghayev@bhos.edu.az',
    'Process Automation Engineering',
    2024,
    'student',
    'male',
    'player',
    'Penhold Offensive',
    'Yasaka Ma Lin Extra Offensive',
    'DHS Hurricane 3 Neo',
    'Xiom Vega Pro',
    0,
    0, 0, 0,
    true, true
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'Huseyn Muradzada',
    'huseyn.muradzade@bhos.edu.az',
    'Computer Engineering',
    2023,
    'student',
    'male',
    'player',
    'Shakehand All-round',
    'Yasaka Sweden Extra',
    'Yasaka Rakza 7',
    'Yasaka Rakza 7 Soft',
    0,
    0, 0, 0,
    true, true
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    'Fateh Mammadli',
    'fateh.mammadli@bhos.edu.az',
    'Process Automation Engineering',
    2022,
    'student',
    'male',
    'player',
    'Shakehand Offensive',
    'Butterfly Primorac Carbon',
    'Rozena',
    'Rozena',
    0,
    0, 0, 0,
    true, true
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    'Rinad Evezzade',
    'rinad.evezzade@bhos.edu.az',
    'Computer Engineering',
    2023,
    'student',
    'male',
    'player',
    'Shakehand Offensive',
    'Timo Boll ALC',
    'Butterfly Tenergy 05',
    'Donic Baracuda',
    0,
    0, 0, 0,
    true, true
  ),
  (
    '00000000-0000-0000-0000-000000000008',
    'Anar Alakbarli',
    'anar.alakbarli@bhos.edu.az',
    'Process Automation Engineering',
    2023,
    'student',
    'male',
    'player',
    'Shakehand All-round',
    'Not listed',
    'Not listed',
    'Not listed',
    0,
    0, 0, 0,
    true, true
  ),
  (
    '00000000-0000-0000-0000-000000000009',
    'Nihat Ismayilzade',
    'nihat.ismayilzade@bhos.edu.az',
    'Process Automation Engineering',
    2023,
    'student',
    'male',
    'player',
    'Shakehand Offensive',
    'Not listed',
    'Not listed',
    'Not listed',
    0,
    0, 0, 0,
    true, true
  )
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  major_faculty = EXCLUDED.major_faculty,
  admission_year = EXCLUDED.admission_year,
  user_type = EXCLUDED.user_type,
  role = EXCLUDED.role,
  is_verified = EXCLUDED.is_verified;


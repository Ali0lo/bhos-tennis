-- ==============================================================================
-- BHOS Table Tennis Portal — Roster and Faculty Specializations Update
-- Migration: 007_update_roster_and_faculties.sql
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Remove Ayan Aliyeva from Database
DELETE FROM public.matches 
WHERE player1_id IN (SELECT id FROM public.profiles WHERE full_name ILIKE '%Ayan Aliyeva%' OR email ILIKE '%ayan.aliyeva%')
   OR player2_id IN (SELECT id FROM public.profiles WHERE full_name ILIKE '%Ayan Aliyeva%' OR email ILIKE '%ayan.aliyeva%');

DELETE FROM public.profiles 
WHERE full_name ILIKE '%Ayan Aliyeva%' OR email ILIKE '%ayan.aliyeva%';

-- 2. Update Computer Engineering 4th Year Students (Admission 2023)
-- Ali Iskandarli (President)
UPDATE public.profiles
SET 
  full_name = 'Ali Iskandarli',
  email = 'ali.iskandarli.std@bhos.edu.az',
  major_faculty = 'Computer Engineering',
  admission_year = 2023
WHERE id::text IN ('p-1', '00000000-0000-0000-0000-000000000001') OR email LIKE 'ali.iskandarli%';

-- Ali Abdulov
UPDATE public.profiles
SET 
  full_name = 'Ali Abdulov',
  email = 'ali.abdulov.std@bhos.edu.az',
  major_faculty = 'Computer Engineering',
  admission_year = 2023
WHERE id::text IN ('p-3', '00000000-0000-0000-0000-000000000003') OR email LIKE 'ali.abdulov%';

-- Huseyn Muradzada
UPDATE public.profiles
SET 
  full_name = 'Huseyn Muradzada',
  email = 'huseyn.muradzade.std@bhos.edu.az',
  major_faculty = 'Computer Engineering',
  admission_year = 2023
WHERE id::text IN ('p-5', '00000000-0000-0000-0000-000000000005') OR email LIKE 'huseyn.muradzade%';

-- Rinad Evezzade
UPDATE public.profiles
SET 
  full_name = 'Rinad Evezzade',
  email = 'rinad.evezzade.std@bhos.edu.az',
  major_faculty = 'Computer Engineering',
  admission_year = 2023
WHERE id::text IN ('p-7', '00000000-0000-0000-0000-000000000007') OR email ILIKE '%rinad%' OR full_name ILIKE '%Rinad%';

-- Step A: Ensure auth.users parent record exists for Rinad Evezzade
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
)
VALUES (
  '00000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'rinad.evezzade.std@bhos.edu.az',
  crypt('bhos2026', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Rinad Evezzade","user_type":"student","role":"player"}',
  false
)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Step B: Insert Rinad Evezzade into public.profiles if not already existing
INSERT INTO public.profiles (
  id, full_name, email, major_faculty, admission_year, gender, role,
  current_elo, matches_played, wins, losses, is_active, is_verified, playing_level
)
VALUES (
  '00000000-0000-0000-0000-000000000007',
  'Rinad Evezzade',
  'rinad.evezzade.std@bhos.edu.az',
  'Computer Engineering',
  2023,
  'male',
  'player',
  0, 0, 0, 0, true, true, 'Intermediate'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  major_faculty = EXCLUDED.major_faculty,
  admission_year = EXCLUDED.admission_year,
  is_verified = true;

-- 3. Update Process Automation Engineering Students
-- Ali Aghayev: 3rd year student (Admission 2024)
UPDATE public.profiles
SET 
  full_name = 'Ali Aghayev',
  email = 'ali.aghayev.std@bhos.edu.az',
  major_faculty = 'Process Automation Engineering',
  admission_year = 2024
WHERE id::text IN ('p-4', '00000000-0000-0000-0000-000000000004') OR email LIKE 'ali.aghayev%';

-- Fateh Mammadli: 5th year student (Admission 2022)
UPDATE public.profiles
SET 
  full_name = 'Fateh Mammadli',
  email = 'fateh.mammadli.std@bhos.edu.az',
  major_faculty = 'Process Automation Engineering',
  admission_year = 2022
WHERE id::text IN ('p-6', '00000000-0000-0000-0000-000000000006') OR email ILIKE '%fateh%' OR full_name ILIKE '%Fateh%';

-- Anar Alakbarli: 4th year student (Admission 2023)
UPDATE public.profiles
SET 
  full_name = 'Anar Alakbarli',
  email = 'anar.alakbarli.std@bhos.edu.az',
  major_faculty = 'Process Automation Engineering',
  admission_year = 2023
WHERE id::text IN ('p-8', '00000000-0000-0000-0000-000000000008') OR email ILIKE '%anar%' OR full_name ILIKE '%Anar%';

-- Nihat Ismayilzade: 4th year student (Admission 2023)
UPDATE public.profiles
SET 
  full_name = 'Nihat Ismayilzade',
  email = 'nihat.ismayilzade.std@bhos.edu.az',
  major_faculty = 'Process Automation Engineering',
  admission_year = 2023
WHERE id::text IN ('p-9', '00000000-0000-0000-0000-000000000009') OR email ILIKE '%nihat%' OR full_name ILIKE '%Nihat%';

-- 4. Student Email Domain Constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_student_email;
ALTER TABLE public.profiles ADD CONSTRAINT check_student_email 
CHECK (
  (user_type = 'student' AND email LIKE '%.std@bhos.edu.az') OR 
  (user_type != 'student')
);


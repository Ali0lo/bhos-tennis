-- ==============================================================================
-- BHOS Table Tennis Portal — Roster and Faculty Specializations Update
-- Migration: 007_update_roster_and_faculties.sql
-- ==============================================================================

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
  email = 'ali.iskandarli@bhos.edu.az',
  major_faculty = 'Computer Engineering',
  admission_year = 2023
WHERE id = 'p-1' OR email = 'ali.iskandarli@bhos.edu.az';

-- Ali Abdulov
UPDATE public.profiles
SET 
  full_name = 'Ali Abdulov',
  email = 'ali.abdulov@bhos.edu.az',
  major_faculty = 'Computer Engineering',
  admission_year = 2023
WHERE id = 'p-3' OR email = 'ali.abdulov@bhos.edu.az';

-- Huseyn Muradzada
UPDATE public.profiles
SET 
  full_name = 'Huseyn Muradzada',
  email = 'huseyn.muradzade@bhos.edu.az',
  major_faculty = 'Computer Engineering',
  admission_year = 2023
WHERE id = 'p-5' OR email = 'huseyn.muradzade@bhos.edu.az';

-- Rinad Evezzade
UPDATE public.profiles
SET 
  full_name = 'Rinad Evezzade',
  email = 'rinad.evezzade@bhos.edu.az',
  major_faculty = 'Computer Engineering',
  admission_year = 2023
WHERE id = 'p-7' OR email ILIKE '%rinad%' OR full_name ILIKE '%Rinad%';

-- Insert Rinad Evezzade if not already existing
INSERT INTO public.profiles (
  id, full_name, email, major_faculty, admission_year, gender, role,
  current_elo, matches_played, wins, losses, is_active, is_verified, playing_level
)
VALUES (
  'p-7', 'Rinad Evezzade', 'rinad.evezzade@bhos.edu.az', 'Computer Engineering', 2023, 'male', 'player',
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
  email = 'ali.aghayev@bhos.edu.az',
  major_faculty = 'Process Automation Engineering',
  admission_year = 2024
WHERE id = 'p-4' OR email = 'ali.aghayev@bhos.edu.az';

-- Fateh Mammadli: 5th year student (Admission 2022)
UPDATE public.profiles
SET 
  full_name = 'Fateh Mammadli',
  email = 'fateh.mammadli@bhos.edu.az',
  major_faculty = 'Process Automation Engineering',
  admission_year = 2022
WHERE id = 'p-6' OR email ILIKE '%fateh%' OR full_name ILIKE '%Fateh%';

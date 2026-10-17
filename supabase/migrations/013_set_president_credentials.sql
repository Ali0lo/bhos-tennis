-- ==============================================================================
-- BHOS Table Tennis Portal — Set Confirmed President Credentials & Fix Rate Limit
-- Migration: 013_set_president_credentials.sql
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Ensure all auth.users rows have non-null token strings to prevent GoTrue scanning errors
UPDATE auth.users 
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE 
  confirmation_token IS NULL OR
  recovery_token IS NULL OR
  email_change_token_new IS NULL OR
  email_change IS NULL;

-- 2. Update existing user if present
UPDATE auth.users
SET 
  email = 'ali.iskandarli.std@bhos.edu.az',
  encrypted_password = crypt('bhos2006', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmation_token = '',
  recovery_token = '',
  email_change_token_new = '',
  email_change = '',
  email_change_token_current = '',
  phone_change = '',
  phone_change_token = '',
  reauthentication_token = '',
  raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
  raw_user_meta_data = '{"full_name":"Ali Iskandarli","user_type":"student","role":"president","is_verified":true}'::jsonb
WHERE id::text = '00000000-0000-0000-0000-000000000001' 
   OR email IN ('ali.iskandarli@bhos.edu.az', 'ali.iskandarli.std@bhos.edu.az');

-- 3. If no user exists with this email, insert a pre-confirmed user directly
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
)
SELECT
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'ali.iskandarli.std@bhos.edu.az',
  crypt('bhos2006', gen_salt('bf')),
  now(),
  now(),
  now(),
  '', '', '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Ali Iskandarli","user_type":"student","role":"president","is_verified":true}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'ali.iskandarli.std@bhos.edu.az'
);

-- 4. Sync public.profiles to ensure President role and verified status
INSERT INTO public.profiles (
  id, full_name, email, major_faculty, admission_year, user_type, gender,
  role, playing_style, blade_equipment, forehand_rubber, backhand_rubber,
  current_elo, matches_played, wins, losses, is_verified, is_active
)
SELECT 
  u.id,
  'Ali Iskandarli',
  'ali.iskandarli.std@bhos.edu.az',
  'Computer Engineering',
  2023,
  'student',
  'male',
  'president',
  'Shakehand Offensive',
  'Butterfly Viscaria ALC',
  'Dignics 09C',
  'Tenergy 05',
  0, 0, 0, 0, true, true
FROM auth.users u
WHERE u.email = 'ali.iskandarli.std@bhos.edu.az'
ON CONFLICT (id) DO UPDATE SET
  email = 'ali.iskandarli.std@bhos.edu.az',
  full_name = 'Ali Iskandarli',
  major_faculty = 'Computer Engineering',
  admission_year = 2023,
  user_type = 'student',
  role = 'president',
  is_verified = true,
  is_active = true;

-- ==============================================================================
-- BHOS Table Tennis Portal — Fix auth.users Null Tokens & Clean Up Auth Triggers
-- Migration: 012_fix_auth_users_and_profiles.sql
-- ==============================================================================

-- 1. Fix NULL string tokens on all auth.users rows to prevent GoTrue "Database error querying schema"
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

-- 2. Nullify and update foreign key references to the mock user ID in all dependent tables

-- Nullify created_by in tournaments
UPDATE public.tournaments 
SET created_by = NULL 
WHERE created_by::text = '00000000-0000-0000-0000-000000000001'
   OR created_by::text IN (SELECT id::text FROM public.profiles WHERE email IN ('ali.iskandarli@bhos.edu.az', 'ali.iskandarli.std@bhos.edu.az'));

-- Fix tournaments_created_by_fkey to ON DELETE SET NULL
ALTER TABLE public.tournaments 
  DROP CONSTRAINT IF EXISTS tournaments_created_by_fkey;

ALTER TABLE public.tournaments 
  ADD CONSTRAINT tournaments_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Clean up any table reservations for this mock ID
DELETE FROM public.table_reservations 
WHERE reserved_by::text = '00000000-0000-0000-0000-000000000001'
   OR reserved_by::text IN (SELECT id::text FROM public.profiles WHERE email IN ('ali.iskandarli@bhos.edu.az', 'ali.iskandarli.std@bhos.edu.az'));

-- Clean up any tournament registrations for this mock ID
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tournament_registrations') THEN
    DELETE FROM public.tournament_registrations 
    WHERE player_id::text = '00000000-0000-0000-0000-000000000001'
       OR player_id::text IN (SELECT id::text FROM public.profiles WHERE email IN ('ali.iskandarli@bhos.edu.az', 'ali.iskandarli.std@bhos.edu.az'));
  END IF;
END $$;

-- 3. Delete any stale profile placeholder that would conflict with the new authenticated user ID
DELETE FROM public.profiles 
WHERE id::text = '00000000-0000-0000-0000-000000000001' 
   OR email IN ('ali.iskandarli@bhos.edu.az', 'ali.iskandarli.std@bhos.edu.az');

-- 4. Delete the artificial mock auth.users record for Ali Iskandarli so real registration succeeds cleanly
DELETE FROM auth.users 
WHERE id::text = '00000000-0000-0000-0000-000000000001' 
   OR email IN ('ali.iskandarli@bhos.edu.az', 'ali.iskandarli.std@bhos.edu.az');

-- 5. Safeguard the handle_new_user trigger so it never aborts auth signup transactions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, user_type, role, is_verified, current_elo
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'player'),
    COALESCE((NEW.raw_user_meta_data->>'is_verified')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'current_elo')::int, 0)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

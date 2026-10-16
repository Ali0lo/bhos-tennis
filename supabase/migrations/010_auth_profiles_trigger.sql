-- ==============================================================================
-- BHOS Table Tennis Portal — Automated Auth-to-Profile Trigger
-- Migration: 010_auth_profiles_trigger.sql
-- ==============================================================================

-- Ensure admission_year is nullable and major_faculty has a safe default
-- so automatic trigger insertions succeed even with minimal user metadata
ALTER TABLE public.profiles ALTER COLUMN admission_year DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN major_faculty SET DEFAULT 'Computer Engineering';
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

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
    false,
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


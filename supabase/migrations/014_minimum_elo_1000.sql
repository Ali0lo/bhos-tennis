-- 014_minimum_elo_1000.sql
-- Enforces a minimum starting rating and floor of 1000 ELO across the club

-- 1. Update any existing profiles currently below 1000 ELO (excluding coach with 9999)
UPDATE public.profiles
SET current_elo = 1000
WHERE current_elo < 1000;

-- 2. Update default column value to 1000
ALTER TABLE public.profiles 
  ALTER COLUMN current_elo SET DEFAULT 1000;

-- 3. Update the auth handle_new_user trigger to default to 1000 ELO
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
    COALESCE((NEW.raw_user_meta_data->>'current_elo')::int, 1000)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enforce minimum rating constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profiles_min_elo;
ALTER TABLE public.profiles ADD CONSTRAINT chk_profiles_min_elo CHECK (current_elo >= 1000);


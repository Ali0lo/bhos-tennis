-- 019_reset_elo_floor_to_zero.sql
-- Sets lowest ELO floor to 0, defaults new users to 0,
-- and resets all player ratings to 0 starting rating (except Coach Iftixar with 9999).

-- 1. Update the check constraint to allow 0 as minimum ELO
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profiles_min_elo;
ALTER TABLE public.profiles ADD CONSTRAINT chk_profiles_min_elo CHECK (current_elo >= 0);

-- 2. Update default column value to 0
ALTER TABLE public.profiles
  ALTER COLUMN current_elo SET DEFAULT 0;

-- 3. Update the auth handle_new_user trigger to default to 0 ELO
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

-- 4. Reset all players to 0 starting ELO except Coach Iftixar
UPDATE public.profiles
SET current_elo = 0
WHERE role != 'coach' AND email NOT ILIKE '%iftixar%';

-- 5. Ensure Coach Iftixar retains 9999 rating
UPDATE public.profiles
SET current_elo = 9999
WHERE role = 'coach' OR email ILIKE '%iftixar%';

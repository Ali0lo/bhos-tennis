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

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS origin VARCHAR(32) DEFAULT 'Qeydiyyat';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'student';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS playing_level VARCHAR(50) DEFAULT 'Beginner';
ALTER TABLE public.profiles ALTER COLUMN admission_year DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN major_faculty SET DEFAULT 'Computer Engineering';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profiles_min_elo;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profiles_elo_range;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_student_email;
ALTER TABLE public.profiles ADD CONSTRAINT chk_profiles_elo_range CHECK (current_elo >= 0 AND current_elo <= 9999);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_skill_level TEXT;
  v_role TEXT;
  v_starting_elo INT;
  v_playing_level TEXT;
  v_user_type TEXT;
  v_full_name TEXT;
  v_major TEXT;
  v_admission_year INT;
  v_gender TEXT;
  v_status TEXT;
  v_origin TEXT;
  v_is_verified BOOLEAN;
BEGIN
  v_skill_level := LOWER(COALESCE(NEW.raw_user_meta_data->>'skill_level', 'beginner'));
  v_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'player'));
  v_user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'student');
  v_full_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), SPLIT_PART(NEW.email, '@', 1));
  v_major := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'major_faculty'), ''), 'Computer Engineering');
  v_gender := COALESCE(NEW.raw_user_meta_data->>'gender', 'male');
  v_status := COALESCE(NEW.raw_user_meta_data->>'status', 'pending');
  v_origin := COALESCE(NEW.raw_user_meta_data->>'origin', 'Qeydiyyat');
  v_is_verified := COALESCE((NEW.raw_user_meta_data->>'is_verified')::BOOLEAN, false);

  IF NEW.raw_user_meta_data->>'admission_year' ~ '^[0-9]+$' THEN
    v_admission_year := (NEW.raw_user_meta_data->>'admission_year')::INT;
  ELSE
    v_admission_year := NULL;
  END IF;

  IF v_role = 'coach' OR NEW.email IN ('iftixar.coach@gmail.com', 'iftixar@bhos.edu.az') THEN
    v_starting_elo := 999;
    v_playing_level := 'Advanced';
    v_user_type := 'teacher';
    v_status := 'approved';
    v_is_verified := true;
  ELSIF NEW.raw_user_meta_data->>'current_elo' IS NOT NULL THEN
    v_starting_elo := LEAST(999, GREATEST(0, (NEW.raw_user_meta_data->>'current_elo')::INT));
    v_playing_level := COALESCE(NEW.raw_user_meta_data->>'playing_level', 'Intermediate');
  ELSIF v_skill_level = 'advanced' THEN
    v_starting_elo := 400;
    v_playing_level := 'Advanced';
  ELSIF v_skill_level = 'intermediate' THEN
    v_starting_elo := 250;
    v_playing_level := 'Intermediate';
  ELSE
    v_starting_elo := 100;
    v_playing_level := 'Beginner';
  END IF;

  DELETE FROM public.profiles WHERE email = NEW.email AND id <> NEW.id;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    major_faculty,
    admission_year,
    user_type,
    gender,
    role,
    playing_level,
    playing_style,
    blade_equipment,
    forehand_rubber,
    backhand_rubber,
    current_elo,
    matches_played,
    wins,
    losses,
    status,
    origin,
    is_verified,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_major,
    v_admission_year,
    v_user_type,
    v_gender,
    v_role,
    v_playing_level,
    'Shakehand All-round',
    'Standard Club Racket',
    'Standard Red',
    'Standard Black',
    v_starting_elo,
    0,
    0,
    0,
    v_status,
    v_origin,
    v_is_verified,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    major_faculty = EXCLUDED.major_faculty,
    current_elo = CASE
      WHEN public.profiles.matches_played = 0 THEN EXCLUDED.current_elo
      ELSE public.profiles.current_elo
    END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

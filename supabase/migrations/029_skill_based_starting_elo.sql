CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_skill_level TEXT;
  v_role TEXT;
  v_starting_elo INT;
  v_playing_level TEXT;
BEGIN
  v_skill_level := LOWER(COALESCE(NEW.raw_user_meta_data->>'skill_level', 'beginner'));
  v_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'player'));

  IF v_role = 'coach' OR NEW.email IN ('iftixar.coach@gmail.com', 'iftixar@bhos.edu.az') THEN
    v_starting_elo := 999;
    v_playing_level := 'Advanced';
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'major_faculty', 'Computer Engineering'),
    CASE
      WHEN NEW.raw_user_meta_data->>'admission_year' IS NOT NULL AND NEW.raw_user_meta_data->>'admission_year' ~ '^[0-9]+$'
      THEN (NEW.raw_user_meta_data->>'admission_year')::INT
      ELSE NULL
    END,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'gender', 'male'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'player'),
    v_playing_level,
    'Shakehand All-round',
    'Standard Club Racket',
    'Standard Red',
    'Standard Black',
    v_starting_elo,
    0,
    0,
    0,
    COALESCE(NEW.raw_user_meta_data->>'status', 'pending'),
    COALESCE(NEW.raw_user_meta_data->>'origin', 'Qeydiyyat'),
    COALESCE((NEW.raw_user_meta_data->>'is_verified')::BOOLEAN, false),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    major_faculty = EXCLUDED.major_faculty,
    current_elo = CASE
      WHEN public.profiles.matches_played = 0 THEN EXCLUDED.current_elo
      ELSE public.profiles.current_elo
    END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


DROP FUNCTION IF EXISTS public.sanitize_text_sql(TEXT, INTEGER);
CREATE OR REPLACE FUNCTION public.sanitize_text_sql(
  p_text TEXT,
  p_max_len INTEGER DEFAULT 160
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_clean TEXT;
BEGIN
  IF p_text IS NULL THEN
    RETURN '';
  END IF;

  v_clean := regexp_replace(p_text, '<[^>]*>', '', 'gi');
  v_clean := regexp_replace(v_clean, '(javascript|vbscript)\s*:', '', 'gi');
  v_clean := regexp_replace(v_clean, 'on[a-z]+\s*=', '', 'gi');
  v_clean := regexp_replace(v_clean, '[<>`]', '', 'g');
  v_clean := btrim(regexp_replace(v_clean, '\s+', ' ', 'g'));

  IF p_max_len > 0 AND char_length(v_clean) > p_max_len THEN
    v_clean := left(v_clean, p_max_len);
  END IF;

  RETURN v_clean;
END;
$$;

DROP FUNCTION IF EXISTS public.is_admin_or_coach(UUID);
CREATE OR REPLACE FUNCTION public.is_admin_or_coach(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND role IN ('president', 'coach')
  );
END;
$$;

DROP FUNCTION IF EXISTS public.validate_table_tennis_set_scores(TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.validate_table_tennis_set_scores(
  p_set_scores TEXT,
  p_s1 INTEGER,
  p_s2 INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_winner_sets INTEGER;
  v_loser_sets INTEGER;
  v_trimmed TEXT;
  v_tokens TEXT[];
  v_token TEXT;
  v_parts TEXT[];
  v_g1 INTEGER;
  v_g2 INTEGER;
  v_max INTEGER;
  v_diff INTEGER;
  v_calc_s1 INTEGER := 0;
  v_calc_s2 INTEGER := 0;
BEGIN
  IF p_s1 IS NULL OR p_s2 IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_s1 < 0 OR p_s2 < 0 OR p_s1 = p_s2 THEN
    RETURN FALSE;
  END IF;

  v_winner_sets := GREATEST(p_s1, p_s2);
  v_loser_sets := LEAST(p_s1, p_s2);

  IF v_winner_sets NOT IN (2, 3, 4) THEN
    RETURN FALSE;
  END IF;

  IF v_loser_sets < 0 OR v_loser_sets >= v_winner_sets THEN
    RETURN FALSE;
  END IF;

  v_trimmed := btrim(COALESCE(p_set_scores, ''));
  IF v_trimmed = '' THEN
    RETURN TRUE;
  END IF;

  IF v_trimmed ~ '^\d+\s*[-–:]\s*\d+$' THEN
    v_parts := regexp_split_to_array(v_trimmed, '\s*[-–:]\s*');
    v_g1 := v_parts[1]::INTEGER;
    v_g2 := v_parts[2]::INTEGER;
    IF v_g1 = p_s1 AND v_g2 = p_s2 THEN
      RETURN TRUE;
    END IF;
    RETURN FALSE;
  END IF;

  v_tokens := regexp_split_to_array(v_trimmed, '\s*,\s*');
  IF array_length(v_tokens, 1) IS NULL OR array_length(v_tokens, 1) > 7 THEN
    RETURN FALSE;
  END IF;

  FOREACH v_token IN ARRAY v_tokens LOOP
    v_token := btrim(v_token);
    IF v_token !~ '^\d+\s*-\s*\d+$' THEN
      RETURN FALSE;
    END IF;

    v_parts := regexp_split_to_array(v_token, '\s*-\s*');
    v_g1 := v_parts[1]::INTEGER;
    v_g2 := v_parts[2]::INTEGER;

    IF v_g1 = v_g2 THEN
      RETURN FALSE;
    END IF;

    v_max := GREATEST(v_g1, v_g2);
    v_diff := ABS(v_g1 - v_g2);

    IF v_max < 11 OR v_diff < 2 THEN
      RETURN FALSE;
    END IF;

    IF v_max > 11 AND v_diff <> 2 THEN
      RETURN FALSE;
    END IF;

    IF v_g1 > v_g2 THEN
      v_calc_s1 := v_calc_s1 + 1;
    ELSE
      v_calc_s2 := v_calc_s2 + 1;
    END IF;
  END LOOP;

  IF v_calc_s1 <> p_s1 OR v_calc_s2 <> p_s2 THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

UPDATE public.profiles
SET
  full_name = CASE
    WHEN char_length(public.sanitize_text_sql(full_name, 80)) < 2 THEN 'Oyunçu'
    ELSE public.sanitize_text_sql(full_name, 80)
  END,
  current_elo = GREATEST(0, LEAST(999, COALESCE(current_elo, 100)));

DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_student_email;
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_allowed_email_domain_check;

  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_allowed_email_domain_check
    CHECK (
      email IS NULL
      OR btrim(email) = ''
      OR lower(btrim(email)) LIKE '%@bhos.edu.az'
      OR lower(btrim(email)) LIKE '%@gmail.com'
    ) NOT VALID;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_elo_bounds_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_elo_bounds_check
      CHECK (current_elo >= 0 AND current_elo <= 999) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_non_empty_name_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_non_empty_name_check
      CHECK (btrim(full_name) <> '') NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matches_different_players_check'
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_different_players_check
      CHECK (player1_id <> player2_id) NOT VALID;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.guard_profiles_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bypass BOOLEAN;
  v_uid UUID;
  v_is_admin BOOLEAN;
BEGIN
  NEW.full_name := public.sanitize_text_sql(NEW.full_name, 80);
  IF btrim(COALESCE(NEW.full_name, '')) = '' OR char_length(NEW.full_name) < 2 THEN
    RAISE EXCEPTION 'Ad və soyad ən azı 2 simvoldan ibarət olmalıdır.';
  END IF;

  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(btrim(NEW.email));
    IF NEW.email <> '' AND NOT (NEW.email LIKE '%@bhos.edu.az' OR NEW.email LIKE '%@gmail.com') THEN
      RAISE EXCEPTION 'Zəhmət olmasa @bhos.edu.az və ya @gmail.com ünvanından istifadə edin.';
    END IF;
  END IF;

  IF NEW.major_faculty IS NOT NULL THEN
    NEW.major_faculty := public.sanitize_text_sql(NEW.major_faculty, 80);
  END IF;

  IF NEW.playing_style IS NOT NULL THEN
    NEW.playing_style := public.sanitize_text_sql(NEW.playing_style, 60);
  END IF;

  IF NEW.blade_equipment IS NOT NULL THEN
    NEW.blade_equipment := public.sanitize_text_sql(NEW.blade_equipment, 80);
  END IF;

  IF NEW.forehand_rubber IS NOT NULL THEN
    NEW.forehand_rubber := public.sanitize_text_sql(NEW.forehand_rubber, 80);
  END IF;

  IF NEW.backhand_rubber IS NOT NULL THEN
    NEW.backhand_rubber := public.sanitize_text_sql(NEW.backhand_rubber, 80);
  END IF;

  NEW.current_elo := GREATEST(0, LEAST(999, COALESCE(NEW.current_elo, 100)));

  v_bypass := COALESCE(current_setting('app.bypass_security_guard', true), '') = 'true';
  v_uid := auth.uid();

  IF v_bypass OR v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_admin := public.is_admin_or_coach(v_uid);

  IF TG_OP = 'INSERT' THEN
    IF NOT v_is_admin THEN
      IF NEW.id <> v_uid THEN
        RAISE EXCEPTION 'Yalnız öz profilinizi yarada bilərsiniz.';
      END IF;
      NEW.role := 'player';
      NEW.wins := 0;
      NEW.losses := 0;
      NEW.matches_played := 0;
      IF COALESCE(NEW.email, '') LIKE '%@gmail.com' AND NEW.email <> 'iftixar.coach@gmail.com' THEN
        NEW.is_verified := FALSE;
        NEW.status := 'pending';
      END IF;
      IF NEW.current_elo NOT IN (100, 250, 400) THEN
        NEW.current_elo := 100;
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT v_is_admin THEN
      IF OLD.id <> v_uid THEN
        RAISE EXCEPTION 'Başqa istifadəçinin profilini yeniləmək qadağandır.';
      END IF;
      NEW.role := OLD.role;
      NEW.current_elo := OLD.current_elo;
      NEW.is_verified := OLD.is_verified;
      NEW.status := OLD.status;
      NEW.wins := OLD.wins;
      NEW.losses := OLD.losses;
      NEW.matches_played := OLD.matches_played;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profiles_security ON public.profiles;
CREATE TRIGGER trg_guard_profiles_security
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profiles_security();

CREATE OR REPLACE FUNCTION public.guard_matches_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bypass BOOLEAN;
  v_uid UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_bypass := COALESCE(current_setting('app.bypass_security_guard', true), '') = 'true';
  v_uid := auth.uid();
  v_is_admin := public.is_admin_or_coach(v_uid);

  IF TG_OP = 'DELETE' THEN
    IF NOT v_bypass AND v_uid IS NOT NULL AND NOT v_is_admin THEN
      IF OLD.status IN ('confirmed', 'approved', 'voided') THEN
        RAISE EXCEPTION 'Təsdiqlənmiş rəsmi matçlar silinə bilməz.';
      END IF;
      IF OLD.logged_by IS DISTINCT FROM v_uid AND OLD.player1_id <> v_uid AND OLD.player2_id <> v_uid THEN
        RAISE EXCEPTION 'Bu matçı silmək səlahiyyətiniz yoxdur.';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.player1_id = NEW.player2_id THEN
    RAISE EXCEPTION 'Oyunçu özünə qarşı matç qeyd edə bilməz (player1_id != player2_id).';
  END IF;

  IF NOT public.validate_table_tennis_set_scores(NEW.set_scores, NEW.player1_score, NEW.player2_score) THEN
    RAISE EXCEPTION 'Matç və ya set hesabları stolüstü tennis qaydalarına uyğun deyil.';
  END IF;

  IF NEW.set_scores IS NOT NULL THEN
    NEW.set_scores := public.sanitize_text_sql(NEW.set_scores, 80);
  END IF;

  IF NEW.tournament_title IS NOT NULL THEN
    NEW.tournament_title := public.sanitize_text_sql(NEW.tournament_title, 100);
  END IF;

  IF v_bypass OR v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT v_is_admin AND v_uid <> NEW.player1_id AND v_uid <> NEW.player2_id THEN
      RAISE EXCEPTION 'Yalnız matçın iştirakçıları və ya klub rəhbərliyi matç daxil edə bilər.';
    END IF;

    IF NOT v_is_admin AND NEW.status IN ('confirmed', 'approved') THEN
      NEW.status := 'pending';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IN ('confirmed', 'approved', 'voided') AND NOT v_is_admin THEN
      RAISE EXCEPTION 'Təsdiqlənmiş matç üzərində dəyişiklik etmək qadağandır.';
    END IF;

    IF NOT v_is_admin AND NEW.status IN ('confirmed', 'approved') AND OLD.status <> NEW.status THEN
      RAISE EXCEPTION 'Matç təsdiqlənməsi yalnız rəsmi server RPC vasitəsilə icra edilməlidir.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_matches_security ON public.matches;
CREATE TRIGGER trg_guard_matches_security
  BEFORE INSERT OR UPDATE OR DELETE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_matches_security();

CREATE OR REPLACE FUNCTION public.lock_active_tournament_roster()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_tid UUID;
BEGIN
  v_tid := COALESCE(NEW.tournament_id, OLD.tournament_id);
  SELECT status INTO v_status FROM public.tournaments WHERE id = v_tid;

  IF v_status IN ('active', 'ongoing', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'Turnir artıq aktivdir və ya başa çatıb. İştirakçı siyahısı kilidlənib.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_tournament_registrations ON public.tournament_registrations;
CREATE TRIGGER trg_lock_tournament_registrations
  BEFORE INSERT OR DELETE ON public.tournament_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.lock_active_tournament_roster();

CREATE OR REPLACE FUNCTION public.guard_tournaments_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.title := public.sanitize_text_sql(NEW.title, 100);
  IF btrim(COALESCE(NEW.title, '')) = '' THEN
    RAISE EXCEPTION 'Turnirin adı boş ola bilməz.';
  END IF;

  IF NEW.description IS NOT NULL THEN
    NEW.description := public.sanitize_text_sql(NEW.description, 600);
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IN ('active', 'ongoing', 'in_progress', 'completed')
       AND NEW.participants IS DISTINCT FROM OLD.participants THEN
      RAISE EXCEPTION 'Aktiv və ya tamamlanmış turnirin iştirakçı siyahısı dəyişdirilə bilməz.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_tournaments_security ON public.tournaments;
CREATE TRIGGER trg_guard_tournaments_security
  BEFORE INSERT OR UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_tournaments_security();

DROP FUNCTION IF EXISTS public.approve_match_safely(UUID, UUID);
DROP FUNCTION IF EXISTS public.approve_match_safely(UUID);
CREATE OR REPLACE FUNCTION public.approve_match_safely(
  p_match_id UUID,
  p_approver_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_p1 RECORD;
  v_p2 RECORD;
  v_caller_id UUID;
  v_is_admin BOOLEAN;
  v_expected_p1 NUMERIC;
  v_k_factor NUMERIC := 32;
  v_winner_sets INTEGER;
  v_loser_sets INTEGER;
  v_set_margin INTEGER;
  v_dominance_multiplier NUMERIC := 1.0;
  v_p1_won BOOLEAN;
  v_raw_delta NUMERIC;
  v_elo_delta INTEGER;
  v_p1_elo_after INTEGER;
  v_p2_elo_after INTEGER;
  v_winner_id UUID;
BEGIN
  PERFORM set_config('app.bypass_security_guard', 'true', true);

  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'already_processed', false,
      'message', 'Matç tapılmadı.'
    );
  END IF;

  IF v_match.status IN ('confirmed', 'approved') THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'message', 'Bu matç artıq təsdiqlənib (ELO dəyişikliyi təkrar tətbiq edilmədi).',
      'elo_delta', COALESCE(v_match.elo_delta, 0)
    );
  END IF;

  IF v_match.status IN ('rejected', 'voided') THEN
    RETURN jsonb_build_object(
      'success', false,
      'already_processed', true,
      'message', 'Rədd edilmiş və ya ləğv edilmiş matç təsdiqlənə bilməz.'
    );
  END IF;

  IF v_match.player1_id = v_match.player2_id THEN
    RAISE EXCEPTION 'Oyunçu özünə qarşı matç keçirə bilməz.';
  END IF;

  IF NOT public.validate_table_tennis_set_scores(
    v_match.set_scores,
    v_match.player1_score,
    v_match.player2_score
  ) THEN
    RAISE EXCEPTION 'Matçın set hesabları stolüstü tennis qaydalarına uyğun deyil.';
  END IF;

  v_caller_id := COALESCE(auth.uid(), p_approver_id);
  IF v_caller_id IS NOT NULL THEN
    v_is_admin := public.is_admin_or_coach(v_caller_id);
    IF NOT v_is_admin THEN
      IF v_caller_id <> v_match.player1_id AND v_caller_id <> v_match.player2_id THEN
        RAISE EXCEPTION 'Bu matçı təsdiqləmək səlahiyyətiniz yoxdur.';
      END IF;
      IF v_match.logged_by IS NOT NULL AND v_caller_id = v_match.logged_by THEN
        RAISE EXCEPTION 'Matçı daxil edən oyunçu öz matçını özü təsdiqləyə bilməz.';
      END IF;
    END IF;
  END IF;

  IF v_match.player1_id < v_match.player2_id THEN
    SELECT * INTO v_p1 FROM public.profiles WHERE id = v_match.player1_id FOR UPDATE;
    SELECT * INTO v_p2 FROM public.profiles WHERE id = v_match.player2_id FOR UPDATE;
  ELSE
    SELECT * INTO v_p2 FROM public.profiles WHERE id = v_match.player2_id FOR UPDATE;
    SELECT * INTO v_p1 FROM public.profiles WHERE id = v_match.player1_id FOR UPDATE;
  END IF;

  IF v_p1.id IS NULL OR v_p2.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'already_processed', false,
      'message', 'Oyunçu profilləri tapılmadı.'
    );
  END IF;

  v_p1_won := COALESCE(v_match.player1_score, 0) > COALESCE(v_match.player2_score, 0);
  v_winner_id := CASE WHEN v_p1_won THEN v_p1.id ELSE v_p2.id END;

  v_expected_p1 := 1.0 / (
    1.0 + power(10.0, (COALESCE(v_p2.current_elo, 100) - COALESCE(v_p1.current_elo, 100))::NUMERIC / 400.0)
  );

  v_winner_sets := GREATEST(COALESCE(v_match.player1_score, 0), COALESCE(v_match.player2_score, 0));
  v_loser_sets := LEAST(COALESCE(v_match.player1_score, 0), COALESCE(v_match.player2_score, 0));
  v_set_margin := GREATEST(1, v_winner_sets - v_loser_sets);

  IF v_set_margin >= 4 THEN
    v_dominance_multiplier := 1.30;
  ELSIF v_set_margin = 3 THEN
    v_dominance_multiplier := 1.18;
  ELSIF v_set_margin = 2 THEN
    v_dominance_multiplier := 1.06;
  ELSE
    v_dominance_multiplier := 0.95;
  END IF;

  IF v_p1_won THEN
    v_raw_delta := v_k_factor * (1.0 - v_expected_p1) * v_dominance_multiplier;
  ELSE
    v_raw_delta := v_k_factor * (1.0 - (1.0 - v_expected_p1)) * v_dominance_multiplier;
  END IF;

  v_elo_delta := GREATEST(2, LEAST(48, ROUND(v_raw_delta)::INTEGER));

  IF v_p1_won THEN
    v_p1_elo_after := LEAST(999, GREATEST(0, COALESCE(v_p1.current_elo, 100) + v_elo_delta));
    v_p2_elo_after := LEAST(999, GREATEST(0, COALESCE(v_p2.current_elo, 100) - v_elo_delta));
  ELSE
    v_p1_elo_after := LEAST(999, GREATEST(0, COALESCE(v_p1.current_elo, 100) - v_elo_delta));
    v_p2_elo_after := LEAST(999, GREATEST(0, COALESCE(v_p2.current_elo, 100) + v_elo_delta));
  END IF;

  UPDATE public.matches
  SET
    status = 'confirmed',
    winner_id = v_winner_id,
    player1_elo_before = COALESCE(v_p1.current_elo, 100),
    player2_elo_before = COALESCE(v_p2.current_elo, 100),
    player1_elo_after = v_p1_elo_after,
    player2_elo_after = v_p2_elo_after,
    elo_delta = v_elo_delta
  WHERE id = p_match_id;

  UPDATE public.profiles
  SET
    current_elo = v_p1_elo_after,
    matches_played = COALESCE(matches_played, 0) + 1,
    wins = COALESCE(wins, 0) + (CASE WHEN v_p1_won THEN 1 ELSE 0 END),
    losses = COALESCE(losses, 0) + (CASE WHEN v_p1_won THEN 0 ELSE 1 END),
    updated_at = NOW()
  WHERE id = v_p1.id;

  UPDATE public.profiles
  SET
    current_elo = v_p2_elo_after,
    matches_played = COALESCE(matches_played, 0) + 1,
    wins = COALESCE(wins, 0) + (CASE WHEN v_p1_won THEN 0 ELSE 1 END),
    losses = COALESCE(losses, 0) + (CASE WHEN v_p1_won THEN 1 ELSE 0 END),
    updated_at = NOW()
  WHERE id = v_p2.id;

  PERFORM public.evaluate_player_achievements(v_p1.id);
  PERFORM public.evaluate_player_achievements(v_p2.id);

  IF v_match.tournament_id IS NOT NULL THEN
    PERFORM public.advance_tournament_bracket(p_match_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'elo_delta', v_elo_delta,
    'player1_elo_after', v_p1_elo_after,
    'player2_elo_after', v_p2_elo_after,
    'winner_id', v_winner_id
  );
END;
$$;

DROP FUNCTION IF EXISTS public.advance_tournament_bracket(UUID);
CREATE OR REPLACE FUNCTION public.advance_tournament_bracket(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_tournament RECORD;
  v_winner RECORD;
  v_bracket JSONB;
  v_rounds JSONB;
  v_round_idx INTEGER;
  v_match_idx INTEGER;
  v_round JSONB;
  v_matches JSONB;
  v_node JSONB;
  v_found_round INTEGER := -1;
  v_found_match INTEGER := -1;
  v_next_round_idx INTEGER;
  v_next_match_idx INTEGER;
  v_is_p1_slot BOOLEAN;
  v_p1_id TEXT;
  v_p2_id TEXT;
  v_winner_slot JSONB;
  v_normal_order BOOLEAN;
  v_s1 INTEGER;
  v_s2 INTEGER;
  v_new_status TEXT;
  v_new_winner_id UUID;
  v_prev_round_matches JSONB;
  v_feeder1 JSONB;
  v_feeder2 JSONB;
BEGIN
  PERFORM set_config('app.bypass_security_guard', 'true', true);

  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id;

  IF NOT FOUND OR v_match.status NOT IN ('confirmed', 'approved') THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'match_not_verified');
  END IF;

  IF v_match.winner_id IS NULL THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'no_confirmed_winner');
  END IF;

  IF v_match.tournament_id IS NOT NULL THEN
    SELECT * INTO v_tournament
    FROM public.tournaments
    WHERE id = v_match.tournament_id
    FOR UPDATE;
  ELSE
    SELECT * INTO v_tournament
    FROM public.tournaments
    WHERE status IN ('upcoming', 'ongoing', 'active', 'in_progress')
      AND bracket_data IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF NOT FOUND OR v_tournament.bracket_data IS NULL THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'no_active_bracket');
  END IF;

  v_bracket := v_tournament.bracket_data;
  v_rounds := v_bracket -> 'rounds';

  IF v_rounds IS NULL OR jsonb_typeof(v_rounds) <> 'array' THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'invalid_bracket_structure');
  END IF;

  FOR v_round_idx IN 0 .. (jsonb_array_length(v_rounds) - 1) LOOP
    v_round := v_rounds -> v_round_idx;
    v_matches := v_round -> 'matches';

    IF v_matches IS NOT NULL AND jsonb_typeof(v_matches) = 'array' THEN
      FOR v_match_idx IN 0 .. (jsonb_array_length(v_matches) - 1) LOOP
        v_node := v_matches -> v_match_idx;
        v_p1_id := v_node #>> '{player1,id}';
        v_p2_id := v_node #>> '{player2,id}';

        IF COALESCE(v_node ->> 'status', '') <> 'completed' AND (
          (v_p1_id = v_match.player1_id::TEXT AND v_p2_id = v_match.player2_id::TEXT) OR
          (v_p1_id = v_match.player2_id::TEXT AND v_p2_id = v_match.player1_id::TEXT)
        ) THEN
          v_found_round := v_round_idx;
          v_found_match := v_match_idx;
          EXIT;
        END IF;
      END LOOP;
    END IF;

    IF v_found_round >= 0 THEN
      EXIT;
    END IF;
  END LOOP;

  IF v_found_round < 0 THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'matching_bracket_node_not_found');
  END IF;

  IF v_found_round > 0 THEN
    v_prev_round_matches := (v_rounds -> (v_found_round - 1)) -> 'matches';
    v_feeder1 := v_prev_round_matches -> (v_found_match * 2);
    v_feeder2 := v_prev_round_matches -> (v_found_match * 2 + 1);

    IF v_feeder1 IS NULL OR v_feeder2 IS NULL
       OR COALESCE(v_feeder1 ->> 'status', '') <> 'completed'
       OR COALESCE(v_feeder2 ->> 'status', '') <> 'completed'
       OR COALESCE(v_feeder1 ->> 'winner_id', '') = ''
       OR COALESCE(v_feeder2 ->> 'winner_id', '') = '' THEN
      RETURN jsonb_build_object('advanced', false, 'reason', 'prerequisite_round_incomplete');
    END IF;
  END IF;

  v_node := (v_rounds -> v_found_round -> 'matches') -> v_found_match;
  v_normal_order := (v_node #>> '{player1,id}') = v_match.player1_id::TEXT;
  v_s1 := CASE WHEN v_normal_order THEN v_match.player1_score ELSE v_match.player2_score END;
  v_s2 := CASE WHEN v_normal_order THEN v_match.player2_score ELSE v_match.player1_score END;

  v_node := jsonb_set(v_node, '{player1_score}', to_jsonb(COALESCE(v_s1, 0)), true);
  v_node := jsonb_set(v_node, '{player2_score}', to_jsonb(COALESCE(v_s2, 0)), true);
  v_node := jsonb_set(v_node, '{set_scores}', to_jsonb(COALESCE(v_match.set_scores, '')), true);
  v_node := jsonb_set(v_node, '{winner_id}', to_jsonb(v_match.winner_id::TEXT), true);
  v_node := jsonb_set(v_node, '{status}', '"completed"'::jsonb, true);

  v_rounds := jsonb_set(
    v_rounds,
    ARRAY[v_found_round::TEXT, 'matches', v_found_match::TEXT],
    v_node,
    true
  );

  SELECT id, full_name, current_elo, avatar_url
  INTO v_winner
  FROM public.profiles
  WHERE id = v_match.winner_id;

  IF (v_node #>> '{player1,id}') = v_match.winner_id::TEXT THEN
    v_winner_slot := v_node -> 'player1';
  ELSE
    v_winner_slot := v_node -> 'player2';
  END IF;

  IF v_winner.id IS NOT NULL THEN
    v_winner_slot := jsonb_build_object(
      'id', v_winner.id::TEXT,
      'full_name', v_winner.full_name,
      'seed', COALESCE((v_winner_slot ->> 'seed')::INTEGER, 1),
      'elo', v_winner.current_elo,
      'avatar_url', v_winner.avatar_url
    );
  END IF;

  v_next_round_idx := v_found_round + 1;
  v_new_status := v_tournament.status;
  v_new_winner_id := v_tournament.winner_id;

  IF v_next_round_idx < jsonb_array_length(v_rounds) THEN
    v_next_match_idx := FLOOR(v_found_match / 2.0)::INTEGER;
    v_is_p1_slot := (v_found_match % 2) = 0;

    IF v_is_p1_slot THEN
      v_rounds := jsonb_set(
        v_rounds,
        ARRAY[v_next_round_idx::TEXT, 'matches', v_next_match_idx::TEXT, 'player1'],
        v_winner_slot,
        true
      );
    ELSE
      v_rounds := jsonb_set(
        v_rounds,
        ARRAY[v_next_round_idx::TEXT, 'matches', v_next_match_idx::TEXT, 'player2'],
        v_winner_slot,
        true
      );
    END IF;

    IF v_new_status = 'upcoming' THEN
      v_new_status := 'ongoing';
    END IF;
  ELSE
    v_new_status := 'completed';
    v_new_winner_id := v_match.winner_id;
  END IF;

  v_bracket := jsonb_set(v_bracket, '{rounds}', v_rounds, true);

  UPDATE public.tournaments
  SET
    bracket_data = v_bracket,
    status = v_new_status,
    winner_id = v_new_winner_id
  WHERE id = v_tournament.id;

  RETURN jsonb_build_object(
    'advanced', true,
    'tournament_id', v_tournament.id,
    'round_index', v_found_round,
    'match_index', v_found_match,
    'winner_id', v_match.winner_id
  );
END;
$$;

DROP POLICY IF EXISTS "Public insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public insert matches" ON public.matches;
DROP POLICY IF EXISTS "Public update matches" ON public.matches;
DROP POLICY IF EXISTS "Public delete matches" ON public.matches;
DROP POLICY IF EXISTS "Allow match status updates" ON public.matches;
DROP POLICY IF EXISTS "Allow match deletes" ON public.matches;
DROP POLICY IF EXISTS "Public insert tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Public update tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Public insert reservations" ON public.table_reservations;
DROP POLICY IF EXISTS "Public update reservations" ON public.table_reservations;

DROP POLICY IF EXISTS "Strict insert profiles" ON public.profiles;
CREATE POLICY "Strict insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id OR public.is_admin_or_coach(auth.uid())
  );

DROP POLICY IF EXISTS "Strict update profiles" ON public.profiles;
CREATE POLICY "Strict update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR public.is_admin_or_coach(auth.uid())
  )
  With CHECK (
    auth.uid() = id OR public.is_admin_or_coach(auth.uid())
  );

DROP POLICY IF EXISTS "Strict delete profiles" ON public.profiles;
CREATE POLICY "Strict delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    public.is_admin_or_coach(auth.uid())
  );

DROP POLICY IF EXISTS "Strict insert matches" ON public.matches;
CREATE POLICY "Strict insert matches"
  ON public.matches FOR INSERT
  TO authenticated
  WITH CHECK (
    player1_id <> player2_id
    AND (
      auth.uid() = player1_id
      OR auth.uid() = player2_id
      OR public.is_admin_or_coach(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Strict update matches" ON public.matches;
CREATE POLICY "Strict update matches"
  ON public.matches FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_coach(auth.uid())
    OR (
      status IN ('pending', 'waiting', 'scheduled')
      AND (auth.uid() = player1_id OR auth.uid() = player2_id)
    )
  )
  WITH CHECK (
    player1_id <> player2_id
    AND (
      public.is_admin_or_coach(auth.uid())
      OR (auth.uid() = player1_id OR auth.uid() = player2_id)
    )
  );

DROP POLICY IF EXISTS "Strict delete matches" ON public.matches;
CREATE POLICY "Strict delete matches"
  ON public.matches FOR DELETE
  TO authenticated
  USING (
    public.is_admin_or_coach(auth.uid())
    OR (
      status IN ('pending', 'waiting', 'scheduled', 'rejected')
      AND (auth.uid() = logged_by OR auth.uid() = player1_id OR auth.uid() = player2_id)
    )
  );

DROP POLICY IF EXISTS "Strict insert tournaments" ON public.tournaments;
CREATE POLICY "Strict insert tournaments"
  ON public.tournaments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_or_coach(auth.uid())
  );

DROP POLICY IF EXISTS "Strict update tournaments" ON public.tournaments;
CREATE POLICY "Strict update tournaments"
  ON public.tournaments FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_coach(auth.uid())
  )
  WITH CHECK (
    public.is_admin_or_coach(auth.uid())
  );

DROP POLICY IF EXISTS "Strict delete tournaments" ON public.tournaments;
CREATE POLICY "Strict delete tournaments"
  ON public.tournaments FOR DELETE
  TO authenticated
  USING (
    public.is_admin_or_coach(auth.uid())
  );

DROP POLICY IF EXISTS "Strict insert reservations" ON public.table_reservations;
CREATE POLICY "Strict insert reservations"
  ON public.table_reservations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reserved_by OR public.is_admin_or_coach(auth.uid())
  );

DROP POLICY IF EXISTS "Strict update reservations" ON public.table_reservations;
CREATE POLICY "Strict update reservations"
  ON public.table_reservations FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = reserved_by OR public.is_admin_or_coach(auth.uid())
  )
  WITH CHECK (
    auth.uid() = reserved_by OR public.is_admin_or_coach(auth.uid())
  );

GRANT EXECUTE ON FUNCTION public.sanitize_text_sql(TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_coach(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_table_tennis_set_scores(TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_match_safely(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_tournament_bracket(UUID) TO authenticated;


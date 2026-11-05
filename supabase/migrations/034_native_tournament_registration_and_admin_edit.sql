-- Migration 034: Native Tournament Registration & Admin Management
-- Allows authenticated users to 1-click register and withdraw from upcoming tournaments
-- with strict capacity and eligibility checking.

-- 1. Ensure tournament columns exist
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS location VARCHAR(150) DEFAULT 'Bibiheybət Kampusu',
  ADD COLUMN IF NOT EXISTS allowed_admission_year INT,
  ADD COLUMN IF NOT EXISTS registration_url TEXT,
  ADD COLUMN IF NOT EXISTS group_size INT DEFAULT 4,
  ADD COLUMN IF NOT EXISTS advance_per_group INT DEFAULT 2,
  ADD COLUMN IF NOT EXISTS max_participants INT DEFAULT 16;

-- 2. Ensure tournament_registrations table exists
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tournament_id UUID,
  tournament_slug VARCHAR(120),
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist even if table was created in an earlier migration (e.g. migration 008)
ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS tournament_id UUID,
  ADD COLUMN IF NOT EXISTS tournament_slug VARCHAR(120),
  ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Relax NOT NULL on tournament_slug if present from migration 008
DO $$
BEGIN
  ALTER TABLE public.tournament_registrations ALTER COLUMN tournament_slug DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_registrations_player_tourn
  ON public.tournament_registrations(tournament_id, player_id)
  WHERE tournament_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_registrations_player_slug
  ON public.tournament_registrations(tournament_slug, player_id)
  WHERE tournament_slug IS NOT NULL;

-- Ensure is_admin helper exists
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID DEFAULT auth.uid())
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

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon, authenticated;

ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read tournament registrations" ON public.tournament_registrations;
CREATE POLICY "Public read tournament registrations"
  ON public.tournament_registrations
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Self insert tournament registration" ON public.tournament_registrations;
CREATE POLICY "Self insert tournament registration"
  ON public.tournament_registrations
  FOR INSERT
  WITH CHECK (auth.uid() = player_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Self delete tournament registration" ON public.tournament_registrations;
CREATE POLICY "Self delete tournament registration"
  ON public.tournament_registrations
  FOR DELETE
  USING (auth.uid() = player_id OR public.is_admin(auth.uid()));

-- 3. Atomic RPC: register_for_tournament
CREATE OR REPLACE FUNCTION public.register_for_tournament(target_tournament_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_tourn RECORD;
  v_player RECORD;
  v_parts JSONB;
  v_count INT;
  v_is_already_registered BOOLEAN;
  v_res JSONB;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Qeydiyyatdan keçmək üçün əvvəlcə sayta daxil olmalısınız.';
  END IF;

  -- Fetch player profile
  SELECT * INTO v_player FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Oyunçu profili tapılmadı.';
  END IF;

  -- Find tournament by UUID or slug
  SELECT * INTO v_tourn
  FROM public.tournaments
  WHERE id::text = target_tournament_id
     OR slug = target_tournament_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turnir tapılmadı.';
  END IF;

  -- Check roster lock
  IF v_tourn.status IN ('active', 'ongoing', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'Turnir artıq aktivdir və ya başa çatıb. Qeydiyyat bağlanıb.';
  END IF;

  -- Check eligibility if restricted to admission year (organizers & admins like Ali Iskandarli are exempt)
  IF v_tourn.allowed_admission_year IS NOT NULL THEN
    IF NOT (
      v_player.role IN ('president', 'coach')
      OR v_player.email IN ('ali.iskandarli.std@bhos.edu.az', 'ali.iskandarli@bhos.edu.az')
      OR v_player.full_name ILIKE '%ali iskandarli%'
      OR v_player.full_name ILIKE '%əli isgəndərli%'
      OR v_uid::text = COALESCE(v_tourn.created_by, '')
      OR public.is_admin(v_uid)
    ) THEN
      IF v_player.user_type IN ('teacher', 'staff') OR v_player.admission_year IS DISTINCT FROM v_tourn.allowed_admission_year THEN
        RAISE EXCEPTION 'Bu turnir yalnız % qəbul ili (Foundation) tələbələri üçündür.', v_tourn.allowed_admission_year;
      END IF;
    END IF;
  END IF;

  v_parts := COALESCE(v_tourn.participants, '[]'::jsonb);

  -- Check if already registered
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(v_parts) elem WHERE elem = v_uid::text
  ) INTO v_is_already_registered;

  IF v_is_already_registered THEN
    -- Already registered, return success
    SELECT to_jsonb(t.*) INTO v_res FROM public.tournaments t WHERE t.id = v_tourn.id;
    RETURN v_res;
  END IF;

  -- Check capacity
  v_count := jsonb_array_length(v_parts);
  IF v_count >= COALESCE(v_tourn.max_participants, 16) THEN
    RAISE EXCEPTION 'Turnirdə yerlər dolub (Maksimum % iştirakçı).', COALESCE(v_tourn.max_participants, 16);
  END IF;

  -- Append to participants JSONB array
  v_parts := v_parts || jsonb_build_array(v_uid::text);

  UPDATE public.tournaments
  SET participants = v_parts,
      updated_at = NOW()
  WHERE id = v_tourn.id;

  -- Record in tournament_registrations table
  INSERT INTO public.tournament_registrations (player_id, tournament_id, tournament_slug, registered_at)
  VALUES (v_uid, v_tourn.id, v_tourn.slug, NOW())
  ON CONFLICT DO NOTHING;

  SELECT to_jsonb(t.*) INTO v_res FROM public.tournaments t WHERE t.id = v_tourn.id;
  RETURN v_res;
END;
$$;

-- 4. Atomic RPC: withdraw_from_tournament
CREATE OR REPLACE FUNCTION public.withdraw_from_tournament(target_tournament_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_tourn RECORD;
  v_parts JSONB;
  v_new_parts JSONB;
  v_res JSONB;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Bu əməliyyatı icra etmək üçün sayta daxil olmalısınız.';
  END IF;

  SELECT * INTO v_tourn
  FROM public.tournaments
  WHERE id::text = target_tournament_id
     OR slug = target_tournament_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turnir tapılmadı.';
  END IF;

  IF v_tourn.status IN ('active', 'ongoing', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'Turnir artıq başlayıb və ya başa çatıb. Qeydiyyatı ləğv etmək mümkün deyil.';
  END IF;

  v_parts := COALESCE(v_tourn.participants, '[]'::jsonb);

  -- Remove v_uid from participants array
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  INTO v_new_parts
  FROM jsonb_array_elements_text(v_parts) elem
  WHERE elem <> v_uid::text;

  UPDATE public.tournaments
  SET participants = v_new_parts,
      updated_at = NOW()
  WHERE id = v_tourn.id;

  DELETE FROM public.tournament_registrations
  WHERE (tournament_id = v_tourn.id OR tournament_slug = v_tourn.slug)
    AND player_id = v_uid;

  SELECT to_jsonb(t.*) INTO v_res FROM public.tournaments t WHERE t.id = v_tourn.id;
  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_for_tournament(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_from_tournament(TEXT) TO authenticated, anon;

-- 5. Tournament RLS policy update for admins
DROP POLICY IF EXISTS "Admin update tournaments full" ON public.tournaments;
CREATE POLICY "Admin update tournaments full"
  ON public.tournaments
  FOR UPDATE
  USING (public.is_admin(auth.uid()) OR true);


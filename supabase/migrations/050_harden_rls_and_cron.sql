-- ==============================================================================
-- Migration 050: Harden RLS Policies & Admin Role Verification
--
-- 1. Redefine `public.is_admin(p_user_id)` to verify strictly against
--    `profiles.role IN ('president', 'coach')`, removing legacy hardcoded
--    email/name ILIKE fallbacks from migration 034.
-- 2. Replace over-permissive INSERT and DELETE RLS policies on
--    `public.tournament_registrations` (from migrations 008 and 034) so only
--    the authenticated owner (`auth.uid() = player_id`) or an admin can
--    insert or delete registration records.
-- ==============================================================================

-- 1. Role-strict is_admin helper
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

-- 2. Harden RLS on public.tournament_registrations
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

-- Drop both legacy (008) and overly permissive (034) write policies
DROP POLICY IF EXISTS "Allow insert tournament_registrations" ON public.tournament_registrations;
DROP POLICY IF EXISTS "Allow delete tournament_registrations" ON public.tournament_registrations;
DROP POLICY IF EXISTS "Public insert tournament registration" ON public.tournament_registrations;
DROP POLICY IF EXISTS "Self insert tournament registration" ON public.tournament_registrations;
DROP POLICY IF EXISTS "Public delete tournament registration" ON public.tournament_registrations;
DROP POLICY IF EXISTS "Self delete tournament registration" ON public.tournament_registrations;
DROP POLICY IF EXISTS "Authenticated self or admin insert tournament registration" ON public.tournament_registrations;
DROP POLICY IF EXISTS "Authenticated self or admin delete tournament registration" ON public.tournament_registrations;

CREATE POLICY "Authenticated self or admin insert tournament registration"
  ON public.tournament_registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = player_id OR public.is_admin(auth.uid())
  );

CREATE POLICY "Authenticated self or admin delete tournament registration"
  ON public.tournament_registrations
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = player_id OR public.is_admin(auth.uid())
  );

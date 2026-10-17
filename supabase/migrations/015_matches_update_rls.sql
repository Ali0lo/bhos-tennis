-- 015_matches_update_rls.sql
-- Enables UPDATE and DELETE permissions on public.matches for authenticated and anon roles

-- 1. Ensure status column exists and default is confirmed
ALTER TABLE public.matches 
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'confirmed';

CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);

-- 2. Enable UPDATE and DELETE on public.matches
DROP POLICY IF EXISTS "Public update matches" ON public.matches;
CREATE POLICY "Public update matches" ON public.matches
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete matches" ON public.matches;
CREATE POLICY "Public delete matches" ON public.matches
  FOR DELETE TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public insert matches" ON public.matches;
CREATE POLICY "Public insert matches" ON public.matches
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public read matches" ON public.matches;
CREATE POLICY "Public read matches" ON public.matches
  FOR SELECT TO anon, authenticated
  USING (true);

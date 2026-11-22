-- ==============================================================================
-- Migration 051: Open & Direct Challenges Matchmaking Board
--
-- 1. Creates `public.challenges` table supporting open matchmaking posts
--    (`opponent_id IS NULL`) and direct rival challenges (`opponent_id` set).
-- 2. Adds immutability trigger so core challenge fields cannot be altered on update.
-- 3. Enables strict Row-Level Security (RLS):
--    - Public read access for the challenge board.
--    - Only authenticated users matching `auth.uid() = challenger_id` can insert.
--    - Only non-challenger authenticated users (and targeted opponent if direct)
--      can accept non-expired open challenges.
--    - Only challenger or admin can cancel/delete.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  format TEXT NOT NULL DEFAULT 'bo5' CHECK (format IN ('bo3', 'bo5', 'bo7')),
  proposed_time TEXT NOT NULL CHECK (char_length(btrim(proposed_time)) BETWEEN 1 AND 120),
  note TEXT DEFAULT '' CHECK (char_length(COALESCE(note, '')) <= 280),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  CONSTRAINT chk_challenges_distinct_players CHECK (opponent_id IS NULL OR opponent_id <> challenger_id),
  CONSTRAINT chk_challenges_expiry_after_create CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_challenges_status_expires
  ON public.challenges (status, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_challenges_challenger
  ON public.challenges (challenger_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_challenges_opponent
  ON public.challenges (opponent_id, created_at DESC)
  WHERE opponent_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guard_challenges_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.challenger_id IS DISTINCT FROM OLD.challenger_id
     OR NEW.format IS DISTINCT FROM OLD.format
     OR NEW.proposed_time IS DISTINCT FROM OLD.proposed_time
     OR NEW.note IS DISTINCT FROM OLD.note
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    RAISE EXCEPTION 'Challenge details cannot be altered after creation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_challenges_update ON public.challenges;
CREATE TRIGGER trg_guard_challenges_update
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_challenges_update();

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view challenges" ON public.challenges;
CREATE POLICY "Anyone can view challenges"
  ON public.challenges
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Challenger can create own challenge" ON public.challenges;
CREATE POLICY "Challenger can create own challenge"
  ON public.challenges
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = challenger_id
    AND status = 'open'
    AND (opponent_id IS NULL OR opponent_id <> auth.uid())
  );

DROP POLICY IF EXISTS "Challenger or admin can cancel challenge" ON public.challenges;
CREATE POLICY "Challenger or admin can cancel challenge"
  ON public.challenges
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = challenger_id OR public.is_admin(auth.uid()))
    AND status IN ('open', 'accepted')
  )
  WITH CHECK (
    (auth.uid() = challenger_id OR public.is_admin(auth.uid()))
    AND status = 'cancelled'
  );

DROP POLICY IF EXISTS "Authenticated user can accept open or direct challenge" ON public.challenges;
CREATE POLICY "Authenticated user can accept open or direct challenge"
  ON public.challenges
  FOR UPDATE
  TO authenticated
  USING (
    status = 'open'
    AND expires_at > NOW()
    AND auth.uid() <> challenger_id
    AND (opponent_id IS NULL OR opponent_id = auth.uid())
  )
  WITH CHECK (
    status = 'accepted'
    AND opponent_id = auth.uid()
    AND auth.uid() <> challenger_id
  );

DROP POLICY IF EXISTS "Challenger or admin can delete challenge" ON public.challenges;
CREATE POLICY "Challenger or admin can delete challenge"
  ON public.challenges
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = challenger_id OR public.is_admin(auth.uid())
  );

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

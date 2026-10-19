-- 018_fix_pending_matches_trigger.sql
-- Fix check constraint violation when matches are logged:
-- The client-side application handles profile ELO and match statistics directly
-- upon match completion (MatchLogger) and match confirmation (PendingApprovals).
-- The legacy AFTER INSERT trigger on matches attempted to set current_elo to 0
-- for pending matches, which violated the chk_profiles_min_elo check constraint.

-- 1. Drop the legacy trigger on matches
DROP TRIGGER IF EXISTS trg_after_match_insert ON public.matches;

-- 2. Make on_match_inserted a safe no-op
CREATE OR REPLACE FUNCTION public.on_match_inserted()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Clean up any pending matches with 0 or sub-1000 placeholder ELOs
UPDATE public.matches
SET
  player1_elo_after = GREATEST(1000, player1_elo_before),
  player2_elo_after = GREATEST(1000, player2_elo_before)
WHERE status = 'pending' AND (player1_elo_after < 1000 OR player2_elo_after < 1000);

-- 4. Ensure all profiles meet the minimum 1000 ELO constraint
UPDATE public.profiles
SET current_elo = 1000
WHERE current_elo < 1000;


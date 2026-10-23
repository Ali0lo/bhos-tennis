-- 022_auto_resolve_pending_matches.sql
-- Uncontested Pending Match Auto-Resolution Engine (48h threshold)

-- 1. Ensure required columns exist on public.matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_disputed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

UPDATE public.matches
SET
  created_at = COALESCE(created_at, match_date, NOW()),
  is_disputed = COALESCE(is_disputed, FALSE),
  auto_approved = COALESCE(auto_approved, FALSE)
WHERE created_at IS NULL OR is_disputed IS NULL OR auto_approved IS NULL;

CREATE INDEX IF NOT EXISTS idx_matches_pending_stale
  ON public.matches(status, is_disputed, created_at);

-- 2. Create match_audit_logs table
CREATE TABLE IF NOT EXISTS public.match_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL DEFAULT 'auto_resolved_48h_inactivity',
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_audit_logs_match_id
  ON public.match_audit_logs(match_id);

ALTER TABLE public.match_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read of match audit logs" ON public.match_audit_logs;
CREATE POLICY "Allow public read of match audit logs"
  ON public.match_audit_logs
  FOR SELECT
  USING (true);

-- 3. Idempotent Match Verification RPC: approve_match_safely
CREATE OR REPLACE FUNCTION public.approve_match_safely(
  p_match_id UUID,
  p_approver_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID,
  p_k_factor INT DEFAULT 32
)
RETURNS BOOLEAN AS $$
DECLARE
  v_match RECORD;
  v_p1 RECORD;
  v_p2 RECORD;
  v_p1_elo INT;
  v_p2_elo INT;
  v_p1_won BOOLEAN;
  v_expected_p1 NUMERIC;
  v_actual_p1 NUMERIC;
  v_delta INT;
  v_p1_after INT;
  v_p2_after INT;
  v_winner_id UUID;
  v_is_auto BOOLEAN;
BEGIN
  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_match.status IN ('confirmed', 'approved', 'rejected') THEN
    RETURN FALSE;
  END IF;

  IF v_match.player1_id IS NULL OR v_match.player2_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO v_p1 FROM public.profiles WHERE id = v_match.player1_id FOR UPDATE;
  SELECT * INTO v_p2 FROM public.profiles WHERE id = v_match.player2_id FOR UPDATE;

  v_p1_elo := COALESCE(v_p1.current_elo, 0);
  v_p2_elo := COALESCE(v_p2.current_elo, 0);
  v_p1_won := COALESCE(v_match.player1_score, 0) >= COALESCE(v_match.player2_score, 0);
  v_winner_id := CASE WHEN v_p1_won THEN v_match.player1_id ELSE v_match.player2_id END;

  v_expected_p1 := 1.0 / (1.0 + POWER(10.0, (v_p2_elo - v_p1_elo)::NUMERIC / 400.0));
  v_actual_p1 := CASE WHEN v_p1_won THEN 1.0 ELSE 0.0 END;
  v_delta := GREATEST(1, ROUND(p_k_factor * ABS(v_actual_p1 - v_expected_p1))::INT);

  IF v_p1_won THEN
    v_p1_after := GREATEST(0, v_p1_elo + v_delta);
    v_p2_after := GREATEST(0, v_p2_elo - v_delta);
  ELSE
    v_p1_after := GREATEST(0, v_p1_elo - v_delta);
    v_p2_after := GREATEST(0, v_p2_elo + v_delta);
  END IF;

  v_is_auto := (p_approver_id = '00000000-0000-0000-0000-000000000000'::UUID);

  UPDATE public.matches
  SET
    status = 'confirmed',
    winner_id = v_winner_id,
    player1_elo_before = v_p1_elo,
    player2_elo_before = v_p2_elo,
    player1_elo_after = v_p1_after,
    player2_elo_after = v_p2_after,
    elo_delta = v_delta,
    auto_approved = v_is_auto,
    approved_by = NULLIF(p_approver_id, '00000000-0000-0000-0000-000000000000'::UUID),
    approved_at = NOW()
  WHERE id = p_match_id;

  UPDATE public.profiles
  SET
    current_elo = v_p1_after,
    matches_played = COALESCE(matches_played, 0) + 1,
    wins = COALESCE(wins, 0) + (CASE WHEN v_p1_won THEN 1 ELSE 0 END),
    losses = COALESCE(losses, 0) + (CASE WHEN v_p1_won THEN 0 ELSE 1 END)
  WHERE id = v_match.player1_id;

  UPDATE public.profiles
  SET
    current_elo = v_p2_after,
    matches_played = COALESCE(matches_played, 0) + 1,
    wins = COALESCE(wins, 0) + (CASE WHEN NOT v_p1_won THEN 1 ELSE 0 END),
    losses = COALESCE(losses, 0) + (CASE WHEN NOT v_p1_won THEN 0 ELSE 1 END)
  WHERE id = v_match.player2_id;

  IF v_match.tournament_id IS NOT NULL THEN
    PERFORM public.advance_tournament_bracket(v_match.id);
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Auto-Resolve Stale Matches Function
CREATE OR REPLACE FUNCTION public.auto_resolve_stale_matches(hours_threshold INT DEFAULT 48)
RETURNS INT AS $$
DECLARE
  v_candidate RECORD;
  v_approved BOOLEAN;
  v_processed_count INT := 0;
BEGIN
  FOR v_candidate IN
    SELECT id
    FROM public.matches
    WHERE status = 'pending'
      AND COALESCE(is_disputed, FALSE) = FALSE
      AND COALESCE(created_at, match_date, NOW()) <= NOW() - (hours_threshold || ' hours')::INTERVAL
    ORDER BY COALESCE(created_at, match_date) ASC
  LOOP
    v_approved := public.approve_match_safely(
      v_candidate.id,
      '00000000-0000-0000-0000-000000000000'::UUID,
      32
    );

    IF v_approved THEN
      INSERT INTO public.match_audit_logs (
        match_id,
        reason,
        resolved_by,
        resolved_at
      ) VALUES (
        v_candidate.id,
        'auto_resolved_48h_inactivity',
        '00000000-0000-0000-0000-000000000000'::UUID,
        NOW()
      );

      v_processed_count := v_processed_count + 1;
    END IF;
  END LOOP;

  RETURN v_processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Schedule Hourly Auto-Resolution via pg_cron if extension is enabled
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'auto-resolve-stale-matches',
      '0 * * * *',
      'SELECT public.auto_resolve_stale_matches(48);'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

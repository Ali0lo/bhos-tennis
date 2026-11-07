-- ==============================================================================
-- Migration 036: Foundation Cup 2026 Completed Results, Groups & Playoff Bracket
-- Synchronized with 035_log_foundation_cup_results.sql (Adəm Rəhimli excluded, 38 matches)
-- ==============================================================================

-- Delegates to the idempotent logic in 035_log_foundation_cup_results.sql
-- Ensure tournament status remains 'completed' with official podium:
--   1st: Yusif Xanlarov
--   2nd: Məharət Kərimli
--   3rd: Əhəd Zamanlı
DO $$
DECLARE
  v_tourn_id UUID;
  p_yusif UUID;
  p_maharat UUID;
  p_ahad UUID;
BEGIN
  PERFORM set_config('app.bypass_security_guard', 'true', true);

  SELECT id INTO v_tourn_id
  FROM public.tournaments
  WHERE slug = 'foundation-kuboku-2026'
     OR title ILIKE '%Foundation%'
  LIMIT 1;

  SELECT id INTO p_yusif   FROM public.profiles WHERE full_name ILIKE '%Yusif Xanlarov%'  LIMIT 1;
  SELECT id INTO p_maharat FROM public.profiles WHERE full_name ILIKE '%Məharət Kərimli%' LIMIT 1;
  SELECT id INTO p_ahad    FROM public.profiles WHERE full_name ILIKE '%Əhəd Zamanlı%'    LIMIT 1;

  IF v_tourn_id IS NOT NULL AND p_yusif IS NOT NULL THEN
    UPDATE public.tournaments
    SET status = 'completed',
        winner_id = p_yusif,
        runner_up_id = p_maharat,
        third_place_id = p_ahad
    WHERE id = v_tourn_id;
  END IF;
END $$;

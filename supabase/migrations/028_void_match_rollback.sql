ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.admin_void_match(target_match_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m_record RECORD;
  v_delta INT;
  v_winner_id UUID;
  v_loser_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE role IN ('president', 'coach')
      AND (
        id = auth.uid()
        OR LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
      )
  ) THEN
    RAISE EXCEPTION 'İcazə verilmədi: Yalnız adminlər matçı ləğv edə bilər.';
  END IF;

  SELECT * INTO m_record
  FROM public.matches
  WHERE id = target_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Matç tapılmadı.';
  END IF;

  IF m_record.status = 'voided' THEN
    RETURN;
  END IF;

  IF COALESCE(m_record.status, 'confirmed') IN ('confirmed', 'approved') THEN
    v_delta := GREATEST(0, COALESCE(m_record.elo_delta, 0));

    IF m_record.winner_id IS NOT NULL THEN
      v_winner_id := m_record.winner_id;
    ELSIF COALESCE(m_record.player1_score, 0) >= COALESCE(m_record.player2_score, 0) THEN
      v_winner_id := m_record.player1_id;
    ELSE
      v_winner_id := m_record.player2_id;
    END IF;

    v_loser_id := CASE
      WHEN v_winner_id = m_record.player1_id THEN m_record.player2_id
      ELSE m_record.player1_id
    END;

    UPDATE public.profiles
    SET
      current_elo = GREATEST(0, LEAST(999, COALESCE(current_elo, 0) - v_delta)),
      matches_played = GREATEST(0, COALESCE(matches_played, 0) - 1),
      wins = GREATEST(0, COALESCE(wins, 0) - 1),
      updated_at = NOW()
    WHERE id = v_winner_id;

    UPDATE public.profiles
    SET
      current_elo = GREATEST(0, LEAST(999, COALESCE(current_elo, 0) + v_delta)),
      matches_played = GREATEST(0, COALESCE(matches_played, 0) - 1),
      losses = GREATEST(0, COALESCE(losses, 0) - 1),
      updated_at = NOW()
    WHERE id = v_loser_id;
  END IF;

  UPDATE public.matches
  SET status = 'voided', updated_at = NOW()
  WHERE id = target_match_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_void_match(UUID) TO authenticated;


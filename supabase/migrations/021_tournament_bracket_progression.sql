-- 021_tournament_bracket_progression.sql
-- Dynamic Knockout Bracket Progression on Match Verification

-- 1. Ensure tournaments has winner_id column
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Ensure matches table has bracket progression columns
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS round_number INT,
  ADD COLUMN IF NOT EXISTS bracket_node_index INT,
  ADD COLUMN IF NOT EXISTS next_match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_bye BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Allow waiting bracket match slots to exist before players are determined
ALTER TABLE public.matches
  ALTER COLUMN player1_id DROP NOT NULL,
  ALTER COLUMN player2_id DROP NOT NULL,
  ALTER COLUMN logged_by DROP NOT NULL,
  ALTER COLUMN player1_score SET DEFAULT 0,
  ALTER COLUMN player2_score SET DEFAULT 0,
  ALTER COLUMN player1_elo_before SET DEFAULT 0,
  ALTER COLUMN player2_elo_before SET DEFAULT 0,
  ALTER COLUMN player1_elo_after SET DEFAULT 0,
  ALTER COLUMN player2_elo_after SET DEFAULT 0,
  ALTER COLUMN elo_delta SET DEFAULT 0;

-- Ensure tournament_id foreign key cascades on delete
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO v_constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'matches'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'tournament_id'
  LIMIT 1;

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.matches DROP CONSTRAINT %I', v_constraint_name);
  END IF;

  ALTER TABLE public.matches
    ADD CONSTRAINT fk_matches_tournament_cascade
    FOREIGN KEY (tournament_id)
    REFERENCES public.tournaments(id)
    ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 3. Create performance indexes for bracket traversal
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id
  ON public.matches(tournament_id);

CREATE INDEX IF NOT EXISTS idx_matches_bracket_node
  ON public.matches(tournament_id, round_number, bracket_node_index);

CREATE INDEX IF NOT EXISTS idx_matches_next_match_id
  ON public.matches(next_match_id);

-- 4. RPC & Trigger Logic: Advance Winner in Knockout Bracket
CREATE OR REPLACE FUNCTION public.advance_tournament_bracket(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
  v_match RECORD;
  v_winner_id UUID;
  v_winner_name VARCHAR(120);
  v_winner_profile JSONB;
  v_target_match RECORD;
  v_next_node_index INT;
  v_is_player1_slot BOOLEAN;
  v_max_rounds INT;
  v_bracket JSONB;
  v_round_idx INT;
  v_next_round_idx INT;
  v_node_idx INT;
BEGIN
  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id;

  IF NOT FOUND OR v_match.tournament_id IS NULL THEN
    RETURN;
  END IF;

  IF v_match.status NOT IN ('approved', 'confirmed', 'completed') THEN
    RETURN;
  END IF;

  v_winner_id := COALESCE(
    v_match.winner_id,
    CASE
      WHEN v_match.player1_score > v_match.player2_score THEN v_match.player1_id
      WHEN v_match.player2_score > v_match.player1_score THEN v_match.player2_id
      ELSE NULL
    END
  );

  IF v_winner_id IS NULL THEN
    RETURN;
  END IF;

  SELECT full_name, to_jsonb(p.*)
  INTO v_winner_name, v_winner_profile
  FROM public.profiles p
  WHERE p.id = v_winner_id;

  IF v_match.winner_id IS DISTINCT FROM v_winner_id THEN
    UPDATE public.matches
    SET winner_id = v_winner_id
    WHERE id = p_match_id;
  END IF;

  v_next_node_index := CASE
    WHEN v_match.bracket_node_index IS NOT NULL THEN FLOOR(v_match.bracket_node_index / 2.0)::INT
    ELSE NULL
  END;

  v_is_player1_slot := COALESCE(v_match.bracket_node_index, 0) % 2 = 0;

  IF v_match.next_match_id IS NOT NULL THEN
    SELECT * INTO v_target_match
    FROM public.matches
    WHERE id = v_match.next_match_id
    FOR UPDATE;
  ELSIF v_match.round_number IS NOT NULL AND v_next_node_index IS NOT NULL THEN
    SELECT * INTO v_target_match
    FROM public.matches
    WHERE tournament_id = v_match.tournament_id
      AND round_number = v_match.round_number + 1
      AND bracket_node_index = v_next_node_index
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_target_match.id IS NOT NULL THEN
    IF v_is_player1_slot THEN
      UPDATE public.matches
      SET
        player1_id = COALESCE(player1_id, v_winner_id),
        player1_name = COALESCE(player1_name, v_winner_name),
        status = CASE
          WHEN COALESCE(player1_id, v_winner_id) IS NOT NULL AND player2_id IS NOT NULL AND status IN ('waiting', 'pending')
            THEN 'scheduled'
          ELSE status
        END
      WHERE id = v_target_match.id;
    ELSE
      UPDATE public.matches
      SET
        player2_id = COALESCE(player2_id, v_winner_id),
        player2_name = COALESCE(player2_name, v_winner_name),
        status = CASE
          WHEN player1_id IS NOT NULL AND COALESCE(player2_id, v_winner_id) IS NOT NULL AND status IN ('waiting', 'pending')
            THEN 'scheduled'
          ELSE status
        END
      WHERE id = v_target_match.id;
    END IF;
  END IF;

  SELECT MAX(round_number) INTO v_max_rounds
  FROM public.matches
  WHERE tournament_id = v_match.tournament_id;

  SELECT bracket_data INTO v_bracket
  FROM public.tournaments
  WHERE id = v_match.tournament_id
  FOR UPDATE;

  IF v_bracket IS NOT NULL AND jsonb_typeof(v_bracket->'rounds') = 'array' THEN
    IF v_max_rounds IS NULL THEN
      v_max_rounds := jsonb_array_length(v_bracket->'rounds');
    END IF;

    v_round_idx := GREATEST(0, COALESCE(v_match.round_number, 1) - 1);
    v_node_idx := COALESCE(v_match.bracket_node_index, 0);
    v_next_round_idx := v_round_idx + 1;

    IF v_round_idx < jsonb_array_length(v_bracket->'rounds') THEN
      v_bracket := jsonb_set(
        v_bracket,
        ARRAY['rounds', v_round_idx::TEXT, 'matches', v_node_idx::TEXT, 'winner_id'],
        to_jsonb(v_winner_id::TEXT),
        true
      );
      v_bracket := jsonb_set(
        v_bracket,
        ARRAY['rounds', v_round_idx::TEXT, 'matches', v_node_idx::TEXT, 'status'],
        '"completed"'::jsonb,
        true
      );
      v_bracket := jsonb_set(
        v_bracket,
        ARRAY['rounds', v_round_idx::TEXT, 'matches', v_node_idx::TEXT, 'player1_score'],
        to_jsonb(v_match.player1_score),
        true
      );
      v_bracket := jsonb_set(
        v_bracket,
        ARRAY['rounds', v_round_idx::TEXT, 'matches', v_node_idx::TEXT, 'player2_score'],
        to_jsonb(v_match.player2_score),
        true
      );

      IF v_next_round_idx < jsonb_array_length(v_bracket->'rounds') AND v_next_node_index IS NOT NULL AND v_winner_profile IS NOT NULL THEN
        IF v_is_player1_slot THEN
          v_bracket := jsonb_set(
            v_bracket,
            ARRAY['rounds', v_next_round_idx::TEXT, 'matches', v_next_node_index::TEXT, 'player1'],
            v_winner_profile,
            true
          );
        ELSE
          v_bracket := jsonb_set(
            v_bracket,
            ARRAY['rounds', v_next_round_idx::TEXT, 'matches', v_next_node_index::TEXT, 'player2'],
            v_winner_profile,
            true
          );
        END IF;

        IF (v_bracket #> ARRAY['rounds', v_next_round_idx::TEXT, 'matches', v_next_node_index::TEXT, 'player1']) IS NOT NULL
           AND jsonb_typeof(v_bracket #> ARRAY['rounds', v_next_round_idx::TEXT, 'matches', v_next_node_index::TEXT, 'player1']) = 'object'
           AND (v_bracket #> ARRAY['rounds', v_next_round_idx::TEXT, 'matches', v_next_node_index::TEXT, 'player2']) IS NOT NULL
           AND jsonb_typeof(v_bracket #> ARRAY['rounds', v_next_round_idx::TEXT, 'matches', v_next_node_index::TEXT, 'player2']) = 'object'
        THEN
          v_bracket := jsonb_set(
            v_bracket,
            ARRAY['rounds', v_next_round_idx::TEXT, 'matches', v_next_node_index::TEXT, 'status'],
            '"ready"'::jsonb,
            true
          );
        END IF;
      END IF;

      UPDATE public.tournaments
      SET bracket_data = v_bracket
      WHERE id = v_match.tournament_id;
    END IF;
  END IF;

  IF v_target_match.id IS NULL AND (
    (v_max_rounds IS NOT NULL AND v_match.round_number = v_max_rounds)
    OR (v_match.next_match_id IS NULL AND v_match.round_number IS NOT NULL AND v_max_rounds IS NOT NULL AND v_match.round_number >= v_max_rounds)
  ) THEN
    UPDATE public.tournaments
    SET
      winner_id = v_winner_id,
      status = 'completed',
      end_date = COALESCE(end_date, NOW())
    WHERE id = v_match.tournament_id;
  ELSE
    UPDATE public.tournaments
    SET status = CASE WHEN status = 'upcoming' THEN 'ongoing' ELSE status END
    WHERE id = v_match.tournament_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger Function for Automatic Bracket Advancement
CREATE OR REPLACE FUNCTION public.trg_fn_advance_tournament_bracket()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tournament_id IS NOT NULL
     AND NEW.status IN ('approved', 'confirmed', 'completed')
     AND (
       TG_OP = 'INSERT'
       OR OLD.status IS DISTINCT FROM NEW.status
       OR OLD.winner_id IS DISTINCT FROM NEW.winner_id
     )
  THEN
    PERFORM public.advance_tournament_bracket(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_advance_tournament_bracket ON public.matches;
CREATE TRIGGER trg_advance_tournament_bracket
AFTER INSERT OR UPDATE OF status, winner_id, player1_score, player2_score
ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_advance_tournament_bracket();

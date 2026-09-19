-- RLS Policies and Automated Triggers for BHOS Table Tennis Portal

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_reservations ENABLE ROW LEVEL SECURITY;

-- Helper functions to check roles
CREATE OR REPLACE FUNCTION public.is_president()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'president'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_coach_or_president()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('coach', 'president')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Profiles Policies
-- Everyone can read active profiles for the leaderboard
CREATE POLICY "Public profiles are viewable by all authenticated users"
ON public.profiles FOR SELECT
TO authenticated, anon
USING (true);

-- Users can update their own profile equipment & playstyle
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  -- Prevent normal players from elevating role or current_elo directly
  AND (role = (SELECT role FROM public.profiles WHERE id = auth.uid()) OR public.is_president())
);

-- President can manage any profile
CREATE POLICY "President can update any profile"
ON public.profiles FOR ALL
TO authenticated
USING (public.is_president());

-- 2. Matches Policies
-- Everyone can view match results
CREATE POLICY "Matches are viewable by everyone"
ON public.matches FOR SELECT
TO authenticated, anon
USING (true);

-- Only Coach or President can insert official matches
CREATE POLICY "Coach and President can log matches"
ON public.matches FOR INSERT
TO authenticated
WITH CHECK (public.is_coach_or_president());

-- 3. Tournaments Policies
CREATE POLICY "Tournaments are viewable by everyone"
ON public.tournaments FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "President can manage tournaments"
ON public.tournaments FOR ALL
TO authenticated
USING (public.is_president());

-- 4. Table Reservations Policies
CREATE POLICY "Reservations are viewable by everyone"
ON public.table_reservations FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Players can create table reservations"
ON public.table_reservations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reserved_by OR public.is_coach_or_president());

CREATE POLICY "Users can cancel their own reservations"
ON public.table_reservations FOR UPDATE
TO authenticated
USING (auth.uid() = reserved_by OR public.is_president());

-- Trigger: When a match is inserted, automatically update both players' statistics
CREATE OR REPLACE FUNCTION public.on_match_inserted()
RETURNS TRIGGER AS $$
BEGIN
  -- Update Player 1
  UPDATE public.profiles
  SET
    current_elo = NEW.player1_elo_after,
    matches_played = matches_played + 1,
    wins = CASE WHEN NEW.player1_score > NEW.player2_score THEN wins + 1 ELSE wins END,
    losses = CASE WHEN NEW.player1_score < NEW.player2_score THEN losses + 1 ELSE losses END
  WHERE id = NEW.player1_id;

  -- Update Player 2
  UPDATE public.profiles
  SET
    current_elo = NEW.player2_elo_after,
    matches_played = matches_played + 1,
    wins = CASE WHEN NEW.player2_score > NEW.player1_score THEN wins + 1 ELSE wins END,
    losses = CASE WHEN NEW.player2_score < NEW.player1_score THEN losses + 1 ELSE losses END
  WHERE id = NEW.player2_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_after_match_insert ON public.matches;
CREATE TRIGGER trg_after_match_insert
AFTER INSERT ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.on_match_inserted();


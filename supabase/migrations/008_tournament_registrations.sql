DO $$
DECLARE
  profile_id_type TEXT;
BEGIN
  SELECT data_type INTO profile_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'id';

  IF profile_id_type = 'uuid' THEN
    EXECUTE '
      CREATE TABLE IF NOT EXISTS public.tournament_registrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        tournament_slug VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE (tournament_slug, player_id)
      )
    ';
  ELSE
    EXECUTE '
      CREATE TABLE IF NOT EXISTS public.tournament_registrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        tournament_slug VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE (tournament_slug, player_id)
      )
    ';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tournament_registrations_slug
  ON public.tournament_registrations(tournament_slug);

ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read tournament_registrations" ON public.tournament_registrations;
CREATE POLICY "Allow public read tournament_registrations"
  ON public.tournament_registrations
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert tournament_registrations" ON public.tournament_registrations;
CREATE POLICY "Allow insert tournament_registrations"
  ON public.tournament_registrations
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete tournament_registrations" ON public.tournament_registrations;
CREATE POLICY "Allow delete tournament_registrations"
  ON public.tournament_registrations
  FOR DELETE
  USING (true);

-- ==============================================================================
-- BHOS Table Tennis Portal — Cloud Database Schema & Realtime Setup
-- Migration: 004_supabase_cloud_sync.sql
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Profiles Table (Player Roster & ELO Ratings)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  major_faculty VARCHAR(100) NOT NULL,
  admission_year INT NOT NULL,
  gender VARCHAR(10) CHECK (gender IN ('female', 'male', 'other')),
  role VARCHAR(20) DEFAULT 'player' CHECK (role IN ('player', 'coach', 'president')),
  playing_style VARCHAR(50),
  blade_equipment VARCHAR(100),
  forehand_rubber VARCHAR(100),
  backhand_rubber VARCHAR(100),
  current_elo INT DEFAULT 0,
  matches_played INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Matches Table (Official Head-to-Head & Tournament Fixtures)
CREATE TABLE IF NOT EXISTS public.matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT,
  tournament_title VARCHAR(150),
  player1_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player1_name VARCHAR(120),
  player2_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player2_name VARCHAR(120),
  logged_by TEXT NOT NULL,
  logged_by_name VARCHAR(120),
  player1_score INT NOT NULL,
  player2_score INT NOT NULL,
  set_scores VARCHAR(100) NOT NULL,
  player1_elo_before INT NOT NULL,
  player2_elo_before INT NOT NULL,
  player1_elo_after INT NOT NULL,
  player2_elo_after INT NOT NULL,
  elo_delta INT NOT NULL,
  match_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Tournaments Table (Single Elimination Brackets)
CREATE TABLE IF NOT EXISTS public.tournaments (
  id TEXT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  custom_rules TEXT NOT NULL,
  format VARCHAR(50) DEFAULT 'single_elimination',
  max_participants INT DEFAULT 16,
  status VARCHAR(30) DEFAULT 'upcoming',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  created_by TEXT REFERENCES public.profiles(id),
  bracket_data JSONB,
  participants JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Table Reservations Table (Campus Sports Hall Booking)
CREATE TABLE IF NOT EXISTS public.table_reservations (
  id TEXT PRIMARY KEY,
  table_number INT NOT NULL CHECK (table_number BETWEEN 1 AND 6),
  reserved_by TEXT NOT NULL REFERENCES public.profiles(id),
  reserved_by_name VARCHAR(120),
  reserved_by_role VARCHAR(20),
  slot_date DATE NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  purpose VARCHAR(50) DEFAULT 'free_play',
  status VARCHAR(20) DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create 'players' View alias for compatibility
CREATE OR REPLACE VIEW public.players AS
  SELECT * FROM public.profiles;

-- 7. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_current_elo ON public.profiles(current_elo DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_matches_date ON public.matches(match_date DESC);
CREATE INDEX IF NOT EXISTS idx_matches_p1 ON public.matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_p2 ON public.matches(player2_id);

-- 8. Seed the Exact Official Roster
-- Coach Iftixar Meherremov at 9,999 PTS (#1 benchmark)
-- All 8 students at 0 PTS (0W - 0L)
-- Ayan Aliyeva excluded
INSERT INTO public.profiles (
  id, full_name, email, major_faculty, admission_year, gender, role,
  playing_style, blade_equipment, forehand_rubber, backhand_rubber,
  current_elo, matches_played, wins, losses, is_active
)
VALUES
  ('p-2', 'Iftixar Meherremov', 'iftixar.meherremov@bhos.edu.az', 'Coach / BHOS', 2020, 'male', 'coach', 'Shakehand All-round', 'Donic / Rubbers pending', 'Tibhar Evolution MX-P', 'Yasaka Rakza 7', 9999, 0, 0, 0, true),
  ('p-1', 'Ali Iskandarli', 'ali.iskandarli@bhos.edu.az', 'Information Security', 2022, 'male', 'president', 'Shakehand Offensive', 'Not listed', 'Not listed', 'Not listed', 0, 0, 0, 0, true),
  ('p-3', 'Ali Abdulov', 'ali.abdulov@bhos.edu.az', 'Petroleum Engineering', 2023, 'male', 'player', 'Shakehand Offensive', 'Not listed', 'Not listed', 'Not listed', 0, 0, 0, 0, true),
  ('p-4', 'Ali Aghayev', 'ali.aghayev@bhos.edu.az', 'Computer Engineering', 2023, 'male', 'player', 'Penhold Offensive', 'Not listed', 'Not listed', 'Not listed', 0, 0, 0, 0, true),
  ('p-5', 'Huseyn Muradzade', 'huseyn.muradzade@bhos.edu.az', 'Process Automation', 2024, 'male', 'player', 'Shakehand All-round', 'Not listed', 'Not listed', 'Not listed', 0, 0, 0, 0, true),
  ('p-6', 'Fateh Memmedli', 'fateh.memmedli@bhos.edu.az', 'Chemical Engineering', 2024, 'male', 'player', 'Shakehand Offensive', 'Not listed', 'Not listed', 'Not listed', 0, 0, 0, 0, true),
  ('p-7', 'Rinad Avazzade', 'rinad.avazzade@bhos.edu.az', 'Information Security', 2024, 'male', 'player', 'Shakehand Offensive', 'Not listed', 'Not listed', 'Not listed', 0, 0, 0, 0, true),
  ('p-8', 'Anar Alakbarli', 'anar.alakbarli@bhos.edu.az', 'Computer Engineering', 2024, 'male', 'player', 'Shakehand All-round', 'Not listed', 'Not listed', 'Not listed', 0, 0, 0, 0, true),
  ('p-9', 'Nihat Ismayilzade', 'nihat.ismayilzade@bhos.edu.az', 'Petroleum Engineering', 2024, 'male', 'player', 'Shakehand Offensive', 'Not listed', 'Not listed', 'Not listed', 0, 0, 0, 0, true)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  major_faculty = EXCLUDED.major_faculty,
  current_elo = EXCLUDED.current_elo,
  blade_equipment = EXCLUDED.blade_equipment;

-- 9. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_reservations ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies: Public Read Access & Permissive Update/Insert for Club Portal
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public update profiles" ON public.profiles;
CREATE POLICY "Public update profiles" ON public.profiles
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public insert profiles" ON public.profiles;
CREATE POLICY "Public insert profiles" ON public.profiles
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Public read matches" ON public.matches;
CREATE POLICY "Public read matches" ON public.matches
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public insert matches" ON public.matches;
CREATE POLICY "Public insert matches" ON public.matches
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Public read tournaments" ON public.tournaments;
CREATE POLICY "Public read tournaments" ON public.tournaments
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public update tournaments" ON public.tournaments;
CREATE POLICY "Public update tournaments" ON public.tournaments
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read reservations" ON public.table_reservations;
CREATE POLICY "Public read reservations" ON public.table_reservations
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public manage reservations" ON public.table_reservations;
CREATE POLICY "Public manage reservations" ON public.table_reservations
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 11. Enable Full Replica Identity for Instant Realtime Payloads
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.matches REPLICA IDENTITY FULL;

-- 12. Add Tables to Supabase Realtime Publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  END IF;
END $$;

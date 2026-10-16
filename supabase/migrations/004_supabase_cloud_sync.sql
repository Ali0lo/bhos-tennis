-- ==============================================================================
-- BHOS Table Tennis Portal — Cloud Database Schema & Realtime Setup
-- Migration: 004_supabase_cloud_sync.sql
-- ==============================================================================

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Ensure Profiles Table & Columns Exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  major_faculty VARCHAR(100) NOT NULL DEFAULT 'Computer Engineering',
  admission_year INT,
  user_type VARCHAR(20) DEFAULT 'student' CHECK (user_type IN ('student', 'teacher', 'staff', 'alumni')),
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
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ALTER COLUMN admission_year DROP NOT NULL;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- 3. Ensure Matches Table & Columns Exist
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  tournament_title VARCHAR(150),
  player1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player1_name VARCHAR(120),
  player2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player2_name VARCHAR(120),
  logged_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS tournament_title VARCHAR(150),
  ADD COLUMN IF NOT EXISTS player1_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS player2_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS logged_by_name VARCHAR(120);

-- 4. Ensure Tournaments Table & Columns Exist
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(150) NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  custom_rules TEXT NOT NULL,
  format VARCHAR(50) DEFAULT 'single_elimination',
  max_participants INT DEFAULT 16,
  status VARCHAR(30) DEFAULT 'upcoming',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  bracket_data JSONB,
  participants JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb;

-- 5. Ensure Table Reservations Table & Columns Exist
CREATE TABLE IF NOT EXISTS public.table_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number INT NOT NULL CHECK (table_number BETWEEN 1 AND 6),
  reserved_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reserved_by_name VARCHAR(120),
  reserved_by_role VARCHAR(20),
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  purpose VARCHAR(50) DEFAULT 'free_play',
  status VARCHAR(20) DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.table_reservations
  ADD COLUMN IF NOT EXISTS reserved_by_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS reserved_by_role VARCHAR(20),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 6. Create 'players' View alias for compatibility
DROP VIEW IF EXISTS public.players;
CREATE OR REPLACE VIEW public.players AS
  SELECT * FROM public.profiles;

-- 7. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_current_elo ON public.profiles(current_elo DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_matches_date ON public.matches(match_date DESC);
CREATE INDEX IF NOT EXISTS idx_matches_p1 ON public.matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_p2 ON public.matches(player2_id);

-- 8. Step A: Ensure auth.users parent records exist before seeding public.profiles
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
)
VALUES
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'iftixar.coach@gmail.com',
    crypt('bhos2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"İftixar Məhərrəmov","user_type":"teacher","role":"coach"}',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'ali.iskandarli.std@bhos.edu.az',
    crypt('bhos2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ali Iskandarli","user_type":"student","role":"president"}',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'ali.abdulov.std@bhos.edu.az',
    crypt('bhos2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ali Abdulov","user_type":"student","role":"player"}',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'ali.aghayev.std@bhos.edu.az',
    crypt('bhos2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ali Aghayev","user_type":"student","role":"player"}',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'huseyn.muradzade.std@bhos.edu.az',
    crypt('bhos2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Huseyn Muradzada","user_type":"student","role":"player"}',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'fateh.mammadli.std@bhos.edu.az',
    crypt('bhos2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Fateh Mammadli","user_type":"student","role":"player"}',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rinad.evezzade.std@bhos.edu.az',
    crypt('bhos2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Rinad Evezzade","user_type":"student","role":"player"}',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'anar.alakbarli.std@bhos.edu.az',
    crypt('bhos2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Anar Alakbarli","user_type":"student","role":"player"}',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000009',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'nihat.ismayilzade.std@bhos.edu.az',
    crypt('bhos2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Nihat Ismayilzade","user_type":"student","role":"player"}',
    false
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email;

-- 8. Step B: Seed Official Roster into public.profiles
INSERT INTO public.profiles (
  id, full_name, email, major_faculty, admission_year, user_type, gender, role,
  playing_style, blade_equipment, forehand_rubber, backhand_rubber,
  current_elo, matches_played, wins, losses, is_verified, is_active
)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'İftixar Məhərrəmov', 'iftixar.coach@gmail.com', 'İdman Klubu', NULL, 'teacher', 'male', 'coach', 'Shakehand All-round', 'Stiga Clipper Wood', 'Tibhar Evolution MX-P', 'Yasaka Rakza 7', 1400, 0, 0, 0, true, true),
  ('00000000-0000-0000-0000-000000000001', 'Ali Iskandarli', 'ali.iskandarli.std@bhos.edu.az', 'Computer Engineering', 2023, 'student', 'male', 'president', 'Shakehand Offensive', 'Butterfly Viscaria ALC', 'Dignics 09C', 'Tenergy 05', 0, 0, 0, 0, true, true),
  ('00000000-0000-0000-0000-000000000003', 'Ali Abdulov', 'ali.abdulov.std@bhos.edu.az', 'Computer Engineering', 2023, 'student', 'male', 'player', 'Shakehand Offensive', 'Timo Boll ALC', 'Butterfly Tenergy 05', 'Donic Baracuda', 0, 0, 0, 0, true, true),
  ('00000000-0000-0000-0000-000000000004', 'Ali Aghayev', 'ali.aghayev.std@bhos.edu.az', 'Process Automation Engineering', 2024, 'student', 'male', 'player', 'Penhold Offensive', 'Yasaka Ma Lin Extra Offensive', 'DHS Hurricane 3 Neo', 'Xiom Vega Pro', 0, 0, 0, 0, true, true),
  ('00000000-0000-0000-0000-000000000005', 'Huseyn Muradzada', 'huseyn.muradzade.std@bhos.edu.az', 'Computer Engineering', 2023, 'student', 'male', 'player', 'Shakehand All-round', 'Yasaka Sweden Extra', 'Yasaka Rakza 7', 'Yasaka Rakza 7 Soft', 0, 0, 0, 0, true, true),
  ('00000000-0000-0000-0000-000000000006', 'Fateh Mammadli', 'fateh.mammadli.std@bhos.edu.az', 'Process Automation Engineering', 2022, 'student', 'male', 'player', 'Shakehand Offensive', 'Butterfly Primorac Carbon', 'Rozena', 'Rozena', 0, 0, 0, 0, true, true),
  ('00000000-0000-0000-0000-000000000007', 'Rinad Evezzade', 'rinad.evezzade.std@bhos.edu.az', 'Computer Engineering', 2023, 'student', 'male', 'player', 'Shakehand Offensive', 'Timo Boll ALC', 'Butterfly Tenergy 05', 'Donic Baracuda', 0, 0, 0, 0, true, true),
  ('00000000-0000-0000-0000-000000000008', 'Anar Alakbarli', 'anar.alakbarli.std@bhos.edu.az', 'Process Automation Engineering', 2023, 'student', 'male', 'player', 'Shakehand All-round', 'Not listed', 'Not listed', 'Not listed', 0, 0, 0, 0, true, true),
  ('00000000-0000-0000-0000-000000000009', 'Nihat Ismayilzade', 'nihat.ismayilzade.std@bhos.edu.az', 'Process Automation Engineering', 2023, 'student', 'male', 'player', 'Shakehand Offensive', 'Not listed', 'Not listed', 'Not listed', 0, 0, 0, 0, true, true)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  user_type = EXCLUDED.user_type,
  major_faculty = EXCLUDED.major_faculty,
  admission_year = EXCLUDED.admission_year,
  blade_equipment = EXCLUDED.blade_equipment;

-- Step C: Add Student Email Constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_student_email;
ALTER TABLE public.profiles ADD CONSTRAINT check_student_email 
CHECK (
  (user_type = 'student' AND email LIKE '%.std@bhos.edu.az') OR 
  (user_type != 'student')
);

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

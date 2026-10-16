-- BHOS Table Tennis Club Management Schema
-- Initial Migration

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles Table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  major_faculty VARCHAR(100) NOT NULL DEFAULT 'Computer Engineering',
  admission_year INT,
  user_type VARCHAR(20) DEFAULT 'student' CHECK (user_type IN ('student', 'teacher', 'staff', 'alumni')),
  gender VARCHAR(10) CHECK (gender IN ('female', 'male', 'other')),
  role VARCHAR(20) DEFAULT 'player' CHECK (role IN ('player', 'coach', 'president')),
  playing_level VARCHAR(50) DEFAULT 'Beginner',
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

-- 2. Tournaments Table
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

-- 3. Official Matches Table
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
  set_scores VARCHAR(100),
  player1_elo_before INT NOT NULL,
  player2_elo_before INT NOT NULL,
  player1_elo_after INT NOT NULL,
  player2_elo_after INT NOT NULL,
  elo_delta INT NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed',
  match_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table Booking / Practice Slots (Tables 1 to 6)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_elo ON public.profiles(current_elo DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_faculty ON public.profiles(major_faculty);
CREATE INDEX IF NOT EXISTS idx_matches_players ON public.matches(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON public.matches(match_date DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_slot ON public.table_reservations(slot_date, table_number);

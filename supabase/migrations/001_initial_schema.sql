-- BHOS Table Tennis Club Management Schema
-- Initial Migration

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table linked to auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  major_faculty VARCHAR(100) NOT NULL, -- e.g., Chemical Eng., Information Security, Petroleum Eng., Computer Science, Process Automation
  admission_year INT NOT NULL, -- e.g., 2021, 2022, 2023, 2024
  gender VARCHAR(10) CHECK (gender IN ('female', 'male', 'other')),
  role VARCHAR(20) DEFAULT 'player' CHECK (role IN ('player', 'coach', 'president')),
  playing_style VARCHAR(50), -- Shakehand / Penhold, Offensive / Defensive / All-round
  blade_equipment VARCHAR(100),
  forehand_rubber VARCHAR(100),
  backhand_rubber VARCHAR(100),
  current_elo INT DEFAULT 1200,
  matches_played INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tournaments Table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(150) NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  custom_rules TEXT NOT NULL, -- Formatted markdown of President's tournament-specific rules
  format VARCHAR(50) DEFAULT 'single_elimination', -- 'single_elimination', 'round_robin', 'groups_and_knockout'
  max_participants INT DEFAULT 16,
  status VARCHAR(30) DEFAULT 'upcoming', -- 'upcoming', 'ongoing', 'completed'
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id),
  bracket_data JSONB, -- Stores tournament bracket nodes and match links
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Official Matches Table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL, -- Null if regular ranked match
  player1_id UUID NOT NULL REFERENCES profiles(id),
  player2_id UUID NOT NULL REFERENCES profiles(id),
  logged_by UUID NOT NULL REFERENCES profiles(id), -- Must be admin or coach
  player1_score INT NOT NULL, -- Games won (e.g., 3)
  player2_score INT NOT NULL, -- Games won (e.g., 1)
  set_scores VARCHAR(100), -- Format: "11-9, 8-11, 11-6, 12-10"
  player1_elo_before INT NOT NULL,
  player2_elo_before INT NOT NULL,
  player1_elo_after INT NOT NULL,
  player2_elo_after INT NOT NULL,
  elo_delta INT NOT NULL,
  match_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table Booking / Practice Slots (Tables 1 to 6)
CREATE TABLE IF NOT EXISTS table_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number INT NOT NULL CHECK (table_number BETWEEN 1 AND 6),
  reserved_by UUID NOT NULL REFERENCES profiles(id),
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  purpose VARCHAR(50) DEFAULT 'free_play', -- 'free_play', 'coaching', 'tournament'
  status VARCHAR(20) DEFAULT 'confirmed', -- 'confirmed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_elo ON profiles(current_elo DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_faculty ON profiles(major_faculty);
CREATE INDEX IF NOT EXISTS idx_matches_players ON matches(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_slot ON table_reservations(slot_date, table_number);


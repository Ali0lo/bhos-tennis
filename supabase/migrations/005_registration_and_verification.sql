-- ==============================================================================
-- BHOS Table Tennis Portal — Registration & Admin Verification Pipeline
-- Migration: 005_registration_and_verification.sql
-- ==============================================================================

-- 1. Alter public.profiles to add verification and playing level columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS playing_level VARCHAR(50) DEFAULT 'Beginner';

-- 2. Ensure all existing seeded official roster players are marked as verified
-- so existing active club members never get locked out of leaderboards
UPDATE public.profiles
SET is_verified = TRUE
WHERE is_verified IS NOT TRUE;

-- 3. Add index for fast leaderboard and queue queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON public.profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_playing_level ON public.profiles(playing_level);

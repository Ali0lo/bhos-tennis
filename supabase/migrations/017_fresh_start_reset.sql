-- BHOS Table Tennis Club - Fresh Start Reset
-- 1. Wipe all registered and seeded matches
TRUNCATE TABLE public.matches CASCADE;

-- 2. Reset all player statistics to a fresh state with 1000 ELO baseline
UPDATE public.profiles
SET 
  current_elo = 1000,
  matches_played = 0,
  wins = 0,
  losses = 0;

-- 3. Maintain Coach Iftixar Meherremov at 9999 ELO
UPDATE public.profiles
SET 
  current_elo = 9999,
  matches_played = 0,
  wins = 0,
  losses = 0
WHERE email ILIKE '%iftixar%' OR full_name ILIKE '%Iftixar%';


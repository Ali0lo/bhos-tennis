-- ==============================================================================
-- Migration 041: Fix Student Department & Specialty Display
--
-- Problem:
-- Migration 035 added `department VARCHAR(100) DEFAULT 'Foundation'` which
-- stamped ALL existing profiles (including upper-year students) with 'Foundation'.
--
-- Fixes:
-- 1. Alter `department` default to 'Tələbə' (or remove 'Foundation' default).
-- 2. Alter `year_of_study` default to NULL (remove default 2026).
-- 3. Synchronize `year_of_study` with `admission_year` for upper-year students.
-- 4. Restore upper-year academic specialties (e.g., 'Kompüter mühəndisliyi',
--    'Proseslərin avtomatlaşdırılması', 'İnformasiya təhlükəsizliyi', etc.).
-- 5. Keep 'Foundation' ONLY for verified 2026 intake students.
-- 6. Update `get_arcade_leaderboard()` RPC to dynamically resolve academic departments.
-- ==============================================================================

-- 1. Schema Alterations: Remove 'Foundation' default
ALTER TABLE public.profiles
  ALTER COLUMN department DROP DEFAULT;

ALTER TABLE public.profiles
  ALTER COLUMN department SET DEFAULT 'Tələbə';

ALTER TABLE public.profiles
  ALTER COLUMN year_of_study DROP DEFAULT;

-- 2. Synchronize year_of_study with admission_year where admission_year is not 2026
UPDATE public.profiles
SET year_of_study = admission_year
WHERE admission_year IS NOT NULL AND admission_year <> 2026;

-- 3. Restore academic department for upper-year students based on major_faculty / known rosters
UPDATE public.profiles
SET department = CASE
  WHEN lower(COALESCE(major_faculty, '')) LIKE '%computer%'
    OR lower(COALESCE(major_faculty, '')) LIKE '%komp%' THEN 'Kompüter mühəndisliyi'
  WHEN lower(COALESCE(major_faculty, '')) LIKE '%process%'
    OR lower(COALESCE(major_faculty, '')) LIKE '%proses%'
    OR lower(COALESCE(major_faculty, '')) LIKE '%avtomat%' THEN 'Proseslərin avtomatlaşdırılması'
  WHEN lower(COALESCE(major_faculty, '')) LIKE '%security%'
    OR lower(COALESCE(major_faculty, '')) LIKE '%tehluke%' THEN 'İnformasiya təhlükəsizliyi'
  WHEN lower(COALESCE(major_faculty, '')) LIKE '%chemical%'
    OR lower(COALESCE(major_faculty, '')) LIKE '%kimya%' THEN 'Kimya mühəndisliyi'
  WHEN lower(COALESCE(major_faculty, '')) LIKE '%petroleum%'
    OR lower(COALESCE(major_faculty, '')) LIKE '%neft%' THEN 'Neft-qaz mühəndisliyi'
  WHEN lower(COALESCE(major_faculty, '')) LIKE '%business%'
    OR lower(COALESCE(major_faculty, '')) LIKE '%biznes%' THEN 'Biznesin idarə edilməsi'
  WHEN lower(COALESCE(major_faculty, '')) LIKE '%idman%'
    OR role = 'coach'
    OR user_type = 'teacher' THEN 'İdman Klubu'
  ELSE 'Tələbə'
END,
updated_at = NOW()
WHERE (COALESCE(year_of_study, admission_year, 0) <> 2026)
  AND (department = 'Foundation' OR department IS NULL OR btrim(department) = '');

-- 4. Specific profile updates for upper-year leaders and students

-- Ali Iskandarli (President, 2023 intake, Computer Engineering)
UPDATE public.profiles
SET
  department = 'Kompüter mühəndisliyi',
  major_faculty = 'Computer Engineering',
  admission_year = 2023,
  year_of_study = 2023,
  updated_at = NOW()
WHERE email IN ('ali.iskandarli.std@bhos.edu.az', 'ali.iskandarli@bhos.edu.az')
   OR full_name ILIKE '%ali iskandarli%'
   OR full_name ILIKE '%əli isgəndərli%';

-- Anar Alakbarli (2023 intake, Process Automation Engineering)
UPDATE public.profiles
SET
  department = 'Proseslərin avtomatlaşdırılması',
  major_faculty = 'Process Automation Engineering',
  admission_year = 2023,
  year_of_study = 2023,
  updated_at = NOW()
WHERE email ILIKE '%anar.alakbarli%'
   OR full_name ILIKE '%anar alakbarli%'
   OR full_name ILIKE '%anar ələkbərli%';

-- Məhəmməd Əhmədzadə (Upper-year student)
UPDATE public.profiles
SET
  department = CASE
    WHEN lower(COALESCE(major_faculty, '')) LIKE '%process%' OR lower(COALESCE(major_faculty, '')) LIKE '%proses%' THEN 'Proseslərin avtomatlaşdırılması'
    WHEN lower(COALESCE(major_faculty, '')) LIKE '%security%' OR lower(COALESCE(major_faculty, '')) LIKE '%tehluke%' THEN 'İnformasiya təhlükəsizliyi'
    WHEN lower(COALESCE(major_faculty, '')) LIKE '%chemical%' OR lower(COALESCE(major_faculty, '')) LIKE '%kimya%' THEN 'Kimya mühəndisliyi'
    WHEN lower(COALESCE(major_faculty, '')) LIKE '%petroleum%' OR lower(COALESCE(major_faculty, '')) LIKE '%neft%' THEN 'Neft-qaz mühəndisliyi'
    ELSE 'Kompüter mühəndisliyi'
  END,
  major_faculty = COALESCE(NULLIF(major_faculty, ''), 'Computer Engineering'),
  admission_year = COALESCE(NULLIF(admission_year, 2026), 2023),
  year_of_study = COALESCE(NULLIF(year_of_study, 2026), 2023),
  updated_at = NOW()
WHERE full_name ILIKE '%əhmədzadə%'
   OR full_name ILIKE '%ahmedzade%'
   OR email ILIKE '%ahmedzade%'
   OR email ILIKE '%ehmedzade%';

-- Ali Abdulov (2023 intake, Computer Engineering)
UPDATE public.profiles
SET
  department = 'Kompüter mühəndisliyi',
  major_faculty = 'Computer Engineering',
  admission_year = 2023,
  year_of_study = 2023,
  updated_at = NOW()
WHERE email ILIKE '%ali.abdulov%' OR full_name ILIKE '%ali abdulov%';

-- Huseyn Muradzada (2023 intake, Computer Engineering)
UPDATE public.profiles
SET
  department = 'Kompüter mühəndisliyi',
  major_faculty = 'Computer Engineering',
  admission_year = 2023,
  year_of_study = 2023,
  updated_at = NOW()
WHERE email ILIKE '%huseyn.muradzade%' OR full_name ILIKE '%huseyn muradzad%';

-- Rinad Evezzade (2023 intake, Computer Engineering)
UPDATE public.profiles
SET
  department = 'Kompüter mühəndisliyi',
  major_faculty = 'Computer Engineering',
  admission_year = 2023,
  year_of_study = 2023,
  updated_at = NOW()
WHERE email ILIKE '%rinad.evezzade%' OR full_name ILIKE '%rinad evezzad%';

-- Ali Aghayev (2024 intake, Process Automation Engineering)
UPDATE public.profiles
SET
  department = 'Proseslərin avtomatlaşdırılması',
  major_faculty = 'Process Automation Engineering',
  admission_year = 2024,
  year_of_study = 2024,
  updated_at = NOW()
WHERE email ILIKE '%ali.aghayev%' OR full_name ILIKE '%ali aghayev%';

-- Fateh Mammadli (2022 intake, Process Automation Engineering)
UPDATE public.profiles
SET
  department = 'Proseslərin avtomatlaşdırılması',
  major_faculty = 'Process Automation Engineering',
  admission_year = 2022,
  year_of_study = 2022,
  updated_at = NOW()
WHERE email ILIKE '%fateh.mammadli%' OR full_name ILIKE '%fateh mammadli%';

-- Nihat Ismayilzade (2023 intake, Process Automation Engineering)
UPDATE public.profiles
SET
  department = 'Proseslərin avtomatlaşdırılması',
  major_faculty = 'Process Automation Engineering',
  admission_year = 2023,
  year_of_study = 2023,
  updated_at = NOW()
WHERE email ILIKE '%nihat.ismayilzade%' OR full_name ILIKE '%nihat ismayilzad%';

-- Coach Iftixar Meherremov
UPDATE public.profiles
SET
  department = 'İdman Klubu',
  major_faculty = 'İdman Klubu',
  updated_at = NOW()
WHERE role = 'coach'
   OR user_type = 'teacher'
   OR email IN ('iftixar.coach@gmail.com', 'iftixar@bhos.edu.az')
   OR full_name ILIKE '%ftixar%';

-- 5. Ensure 2026 intake students are explicitly set to 'Foundation'
UPDATE public.profiles
SET department = 'Foundation', updated_at = NOW()
WHERE (year_of_study = 2026 OR admission_year = 2026)
  AND COALESCE(role, '') <> 'coach'
  AND COALESCE(user_type, '') <> 'teacher';

-- 6. Upgrade get_arcade_leaderboard RPC function to resolve dynamic department display
CREATE OR REPLACE FUNCTION public.get_arcade_leaderboard(
  p_mode TEXT DEFAULT 'infinity',
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  full_name TEXT,
  slug TEXT,
  department TEXT,
  avatar_url TEXT,
  score INT,
  achieved_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY h.score DESC, h.updated_at ASC) AS rank,
    h.user_id,
    p.full_name::TEXT,
    p.slug::TEXT,
    CASE
      -- 2026 intake students are strictly Foundation
      WHEN COALESCE(p.year_of_study, p.admission_year) = 2026 THEN 'Foundation'
      -- Valid non-Foundation department explicitly recorded
      WHEN p.department IS NOT NULL
       AND btrim(p.department) <> ''
       AND lower(p.department) <> 'foundation' THEN p.department
      -- Fallback from major_faculty translated into Azerbaijani
      WHEN p.major_faculty IS NOT NULL
       AND btrim(p.major_faculty) <> ''
       AND lower(p.major_faculty) <> 'foundation' THEN
        CASE
          WHEN lower(p.major_faculty) LIKE '%computer%' OR lower(p.major_faculty) LIKE '%komp%' THEN 'Kompüter mühəndisliyi'
          WHEN lower(p.major_faculty) LIKE '%process%' OR lower(p.major_faculty) LIKE '%proses%' OR lower(p.major_faculty) LIKE '%avtomat%' THEN 'Proseslərin avtomatlaşdırılması'
          WHEN lower(p.major_faculty) LIKE '%security%' OR lower(p.major_faculty) LIKE '%tehluke%' THEN 'İnformasiya təhlükəsizliyi'
          WHEN lower(p.major_faculty) LIKE '%chemical%' OR lower(p.major_faculty) LIKE '%kimya%' THEN 'Kimya mühəndisliyi'
          WHEN lower(p.major_faculty) LIKE '%petroleum%' OR lower(p.major_faculty) LIKE '%neft%' THEN 'Neft-qaz mühəndisliyi'
          WHEN lower(p.major_faculty) LIKE '%business%' OR lower(p.major_faculty) LIKE '%biznes%' THEN 'Biznesin idarə edilməsi'
          WHEN lower(p.major_faculty) LIKE '%idman%' OR p.role = 'coach' OR p.user_type = 'teacher' THEN 'İdman Klubu'
          ELSE p.major_faculty
        END
      ELSE 'Tələbə'
    END::TEXT AS department,
    p.avatar_url::TEXT,
    h.score,
    h.updated_at AS achieved_at
  FROM public.arcade_highscores h
  JOIN public.profiles p ON p.id = h.user_id
  WHERE h.mode = p_mode
    AND h.score > 0
    AND COALESCE(p.is_verified, FALSE) = TRUE
  ORDER BY h.score DESC, h.updated_at ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 100));
$$;

GRANT EXECUTE ON FUNCTION public.get_arcade_leaderboard(TEXT, INT) TO anon, authenticated;

-- ==============================================================================
-- BHOS Table Tennis Portal — Student Email Validation & Domain Constraint
-- Migration: 011_student_email_constraint.sql
-- ==============================================================================

-- 1. Ensure existing test students are updated to *.std@bhos.edu.az
UPDATE public.profiles
SET email = REPLACE(email, '@bhos.edu.az', '.std@bhos.edu.az')
WHERE user_type = 'student' AND email LIKE '%@bhos.edu.az' AND email NOT LIKE '%.std@bhos.edu.az';

-- 2. Ensure coach/teacher profiles use external or staff emails
UPDATE public.profiles
SET email = 'iftixar.coach@gmail.com'
WHERE role = 'coach' AND (email LIKE '%iftixar@bhos.edu.az%' OR email LIKE '%iftixar.meherremov@bhos.edu.az%');

-- 3. Add check_student_email constraint enforcing .std@bhos.edu.az for students only
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_student_email;
ALTER TABLE public.profiles ADD CONSTRAINT check_student_email 
CHECK (
  (user_type = 'student' AND email LIKE '%.std@bhos.edu.az') OR 
  (user_type != 'student')
);

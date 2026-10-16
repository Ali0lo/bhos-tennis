-- Allow admission_year to be nullable for teachers/staff
ALTER TABLE public.profiles ALTER COLUMN admission_year DROP NOT NULL;

-- Add user_type column with default 'student'
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'student' 
CHECK (user_type IN ('student', 'teacher', 'staff', 'alumni'));

-- Update existing coach/teacher records to have user_type = 'teacher' and nullable admission_year
UPDATE public.profiles
SET user_type = 'teacher', admission_year = NULL
WHERE role = 'coach';


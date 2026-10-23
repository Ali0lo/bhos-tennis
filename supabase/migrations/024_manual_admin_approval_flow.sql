-- 024_manual_admin_approval_flow.sql
-- Manual Admin Approval Flow: status ('pending' | 'approved'), origin ('İlkin Heyət' | 'Qeydiyyat'), and updated_at

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS origin VARCHAR(64) DEFAULT 'Qeydiyyat',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Set origin = 'İlkin Heyət' and status = 'approved' for the 9 initial seed members
UPDATE public.profiles
SET
  origin = 'İlkin Heyət',
  status = 'approved',
  is_verified = TRUE,
  updated_at = NOW()
WHERE LOWER(email) IN (
  'iftixar.coach@gmail.com',
  'ali.iskandarli.std@bhos.edu.az',
  'ali.abdulov.std@bhos.edu.az',
  'ali.aghayev.std@bhos.edu.az',
  'huseyn.muradzade.std@bhos.edu.az',
  'fateh.mammadli.std@bhos.edu.az',
  'rinad.evezzade.std@bhos.edu.az',
  'anar.alakbarli.std@bhos.edu.az',
  'nihat.ismayilzade.std@bhos.edu.az'
);

-- Sync status for previously verified vs unverified accounts
UPDATE public.profiles
SET
  status = CASE WHEN COALESCE(is_verified, FALSE) = TRUE THEN 'approved' ELSE 'pending' END,
  origin = COALESCE(NULLIF(origin, ''), 'Qeydiyyat')
WHERE LOWER(COALESCE(email, '')) NOT IN (
  'iftixar.coach@gmail.com',
  'ali.iskandarli.std@bhos.edu.az',
  'ali.abdulov.std@bhos.edu.az',
  'ali.aghayev.std@bhos.edu.az',
  'huseyn.muradzade.std@bhos.edu.az',
  'fateh.mammadli.std@bhos.edu.az',
  'rinad.evezzade.std@bhos.edu.az',
  'anar.alakbarli.std@bhos.edu.az',
  'nihat.ismayilzade.std@bhos.edu.az'
);

CREATE INDEX IF NOT EXISTS idx_profiles_status_origin
  ON public.profiles(status, origin);


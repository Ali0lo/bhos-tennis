ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'confirmed';

UPDATE public.matches
SET status = 'confirmed'
WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);

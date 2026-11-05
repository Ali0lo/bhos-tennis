-- Migration 035: Remove non-existent/dummy tournaments
-- The only official tournament for this semester is the Foundation Championship (Nov 7)

-- 1. Remove registrations for non-existent tournaments
DELETE FROM public.tournament_registrations
WHERE tournament_slug IN ('bhos-autumn-open-2026', 'inter-faculty-engineering-cup-2026')
   OR tournament_id::text IN ('11111111-1111-1111-1111-111111111111', 'tourn-1', 'tourn-2');

-- 2. Remove dummy tournaments
DELETE FROM public.tournaments
WHERE slug IN ('bhos-autumn-open-2026', 'inter-faculty-engineering-cup-2026')
   OR id::text IN ('11111111-1111-1111-1111-111111111111', 'tourn-1', 'tourn-2')
   OR title ILIKE '%Autumn Open%'
   OR title ILIKE '%Engineering Cup%';

-- 020_cleanup_legacy_preset_avatars.sql
-- Replaces old external Unsplash URLs (which were glitched, 403-blocked, or unrelated sports)
-- with locally hosted, 100% table-tennis avatars in /images/avatars/

UPDATE public.profiles
SET avatar_url = '/images/avatars/topspin-pro.jpg'
WHERE avatar_url LIKE '%photo-1609710228159%';

UPDATE public.profiles
SET avatar_url = '/images/avatars/carbon-blade.jpg'
WHERE avatar_url LIKE '%photo-1517649763962%';

UPDATE public.profiles
SET avatar_url = '/images/avatars/varsity-champion.jpg'
WHERE avatar_url LIKE '%photo-1579952363873%';

UPDATE public.profiles
SET avatar_url = '/images/avatars/smash-master.jpg'
WHERE avatar_url LIKE '%photo-1546519638%';

UPDATE public.profiles
SET avatar_url = '/images/avatars/match-point.jpg'
WHERE avatar_url LIKE '%photo-1534158914592%';

UPDATE public.profiles
SET avatar_url = '/images/avatars/bhos-varsity.jpg'
WHERE avatar_url LIKE '%images.unsplash.com%';

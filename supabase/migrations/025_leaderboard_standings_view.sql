CREATE INDEX IF NOT EXISTS idx_profiles_leaderboard_fast
  ON public.profiles(current_elo DESC, status, is_active);

CREATE OR REPLACE VIEW public.leaderboard_standings AS
SELECT
  p.id,
  p.full_name,
  p.major_faculty AS faculty,
  p.major_faculty,
  p.current_elo,
  p.avatar_url,
  COALESCE(p.origin, 'Qeydiyyat') AS origin,
  COALESCE(p.status, CASE WHEN COALESCE(p.is_verified, FALSE) THEN 'approved' ELSE 'pending' END) AS status,
  COALESCE(p.is_verified, FALSE) AS is_verified,
  p.role,
  p.user_type,
  p.admission_year,
  p.gender,
  p.playing_level,
  COALESCE(p.matches_played, 0) AS total_matches,
  COALESCE(p.matches_played, 0) AS matches_played,
  COALESCE(p.wins, 0) AS wins,
  COALESCE(p.losses, 0) AS losses,
  CASE
    WHEN COALESCE(p.matches_played, 0) > 0
      THEN ROUND((COALESCE(p.wins, 0)::numeric / p.matches_played::numeric) * 100, 1)
    ELSE 0
  END AS win_rate
FROM public.profiles p
WHERE COALESCE(p.status, CASE WHEN COALESCE(p.is_verified, FALSE) THEN 'approved' ELSE 'pending' END) = 'approved'
  AND COALESCE(p.is_active, TRUE) = TRUE
ORDER BY p.current_elo DESC;

GRANT SELECT ON public.leaderboard_standings TO anon, authenticated;

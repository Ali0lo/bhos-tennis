import {
  PlayerProfile,
  MatchRecord,
  Tournament,
  isDefaultMember,
  getProfileDepartment,
  resolveCanonicalDepartment,
} from '../data/types';
import { INITIAL_PROFILES, INITIAL_TOURNAMENTS } from '../data/mockData';

export type AchievementBadgeId =
  | 'first_step'
  | 'clean_sweep'
  | 'campus_ambassador'
  | 'hot_streak'
  | 'deuce_demon'
  | 'comeback_king'
  | 'club_veteran'
  | 'giant_slayer'
  | 'top_tier'
  | 'unstoppable_streak'
  | 'tournament_champion'
  | 'founding_member';

export type AchievementTierColor = 'blue' | 'crimson' | 'gold';

export interface AchievementProgress {
  current: number;
  target: number;
}

export interface AchievementBadgeDefinition {
  id: AchievementBadgeId;
  emoji: string;
  titleAz: string;
  titleEn: string;
  titleRu: string;
  descriptionAz: string;
  descriptionEn: string;
  descriptionRu: string;
  accentColor: AchievementTierColor;
  tierLabelAz: string;
  i18nKey?: string;
}

export interface EvaluatedAchievement extends AchievementBadgeDefinition {
  unlocked: boolean;
  unlockedAt?: string | null;
  progress?: AchievementProgress | null;
}

export const ACHIEVEMENT_BADGES: AchievementBadgeDefinition[] = [
  {
    id: 'first_step',
    emoji: '🛡️',
    titleAz: 'İlk Addım',
    titleEn: 'First Step',
    titleRu: 'Первый шаг',
    descriptionAz: 'İlk rəsmi klub matçınızı tamamlayın.',
    descriptionEn: 'Play and complete your first official match.',
    descriptionRu: 'Сыграйте и завершите свой первый официальный матч.',
    accentColor: 'blue',
    tierLabelAz: 'Ümumi',
  },
  {
    id: 'clean_sweep',
    emoji: '🎯',
    titleAz: 'Quru Hesab',
    titleEn: 'Clean Sweep',
    titleRu: 'Сухая победа',
    descriptionAz: 'Set itirmədən rəsmi matçda qələbə qazanın (2–0, 3–0 və ya 4–0).',
    descriptionEn: 'Win an official match without losing a set (2-0, 3-0, or 4-0).',
    descriptionRu: 'Выиграйте официальный матч, не отдав ни одного сета (2-0, 3-0 или 4-0).',
    accentColor: 'blue',
    tierLabelAz: 'Ümumi',
  },
  {
    id: 'campus_ambassador',
    emoji: '🌐',
    titleAz: 'Fakültələrarası Səfir',
    titleEn: 'Campus Ambassador',
    titleRu: 'Посол кампуса',
    descriptionAz: 'Ən azı 3 fərqli fakültə və ya kafedradan olan rəqiblərlə rəsmi oyun tamamlayın.',
    descriptionEn: 'Complete confirmed matches against opponents from at least 3 distinct departments.',
    descriptionRu: 'Сыграйте официальные матчи против соперников минимум из 3 разных факультетов.',
    accentColor: 'blue',
    tierLabelAz: 'Ümumi',
  },
  {
    id: 'hot_streak',
    emoji: '⚡',
    titleAz: 'Qələbə Seriyası',
    titleEn: 'Hot Streak',
    titleRu: 'Серия побед',
    descriptionAz: 'Ardıcıl 3 rəsmi oyunda qələbə qazanın.',
    descriptionEn: 'Win 3 consecutive official matches.',
    descriptionRu: 'Выиграйте 3 официальных матча подряд.',
    accentColor: 'blue',
    tierLabelAz: 'Ümumi',
  },
  {
    id: 'deuce_demon',
    emoji: '🔥',
    titleAz: 'Gərgin Mübarizə',
    titleEn: 'Deuce Demon',
    titleRu: 'Мастер баланса',
    descriptionAz: 'Seti 12–10 və ya daha yüksək hesabla qazanın.',
    descriptionEn: 'Win a set with a score of 12-10 or higher.',
    descriptionRu: 'Выиграйте сет со счетом 12-10 или выше.',
    accentColor: 'blue',
    tierLabelAz: 'Ümumi',
    i18nKey: 'achievements.deuce_demon',
  },
  {
    id: 'comeback_king',
    emoji: '🦅',
    titleAz: 'Geri Dönüş Kralı',
    titleEn: 'Comeback King',
    titleRu: 'Король камбэков',
    descriptionAz: 'Həlledici son setdə (2–1, 3–2, 4–3) və ya 1-ci seti uduzduqdan sonra matçı qazanın.',
    descriptionEn: 'Win a match in a deciding final set (2-1, 3-2, 4-3) or after losing Set 1.',
    descriptionRu: 'Выиграйте матч в решающем сете (2-1, 3-2, 4-3) или после поражения в 1-м сете.',
    accentColor: 'crimson',
    tierLabelAz: 'Nadir',
  },
  {
    id: 'club_veteran',
    emoji: '🎖️',
    titleAz: 'Klub Veteranı',
    titleEn: 'Club Veteran',
    titleRu: 'Ветеран клуба',
    descriptionAz: '25 və ya daha çox rəsmi təsdiqlənmiş matç tamamlayın.',
    descriptionEn: 'Complete 25 or more confirmed official matches.',
    descriptionRu: 'Сыграйте 25 или более подтвержденных официальных матчей.',
    accentColor: 'crimson',
    tierLabelAz: 'Nadir',
  },
  {
    id: 'giant_slayer',
    emoji: '⚔️',
    titleAz: 'Nəhəng Qatili',
    titleEn: 'Giant Slayer',
    titleRu: 'Победитель гигантов',
    descriptionAz: 'Sizdən ən azı 100 ELO yüksək olan rəqibi məğlub edin.',
    descriptionEn: 'Defeat an opponent whose ELO is at least 100 points higher than yours.',
    descriptionRu: 'Победите соперника, чей рейтинг ELO минимум на 100 очков выше вашего.',
    accentColor: 'gold',
    tierLabelAz: 'Əfsanəvi',
    i18nKey: 'achievements.giant_slayer',
  },
  {
    id: 'top_tier',
    emoji: '👑',
    titleAz: 'BANM Elitası',
    titleEn: 'Top Tier',
    titleRu: 'Элита БВШН',
    descriptionAz: '800+ ELO reytinq xalına çatın.',
    descriptionEn: 'Reach 800+ ELO rating points.',
    descriptionRu: 'Достигните 800+ очков рейтинга ELO.',
    accentColor: 'gold',
    tierLabelAz: 'Əfsanəvi',
  },
  {
    id: 'unstoppable_streak',
    emoji: '☄️',
    titleAz: 'Yenilməz Seriya',
    titleEn: 'Unstoppable Streak',
    titleRu: 'Неудержимая серия',
    descriptionAz: 'Ardıcıl 7 rəsmi təsdiqlənmiş oyunda qələbə qazanın.',
    descriptionEn: 'Win 7 consecutive official confirmed matches.',
    descriptionRu: 'Выиграйте 7 подтвержденных официальных матчей подряд.',
    accentColor: 'gold',
    tierLabelAz: 'Əfsanəvi',
  },
  {
    id: 'tournament_champion',
    emoji: '🏅',
    titleAz: 'Turnir Çempionu',
    titleEn: 'Tournament Champion',
    titleRu: 'Чемпион турнира',
    descriptionAz: 'Rəsmi klub turnirinin qalibi olun.',
    descriptionEn: 'Win an official club tournament.',
    descriptionRu: 'Станьте победителем официального клубного турнира.',
    accentColor: 'gold',
    tierLabelAz: 'Əfsanəvi',
  },
  {
    id: 'founding_member',
    emoji: '🏆',
    titleAz: 'Qızıl Heyət',
    titleEn: 'Founding Member',
    titleRu: 'Золотой состав',
    descriptionAz: 'Klubun "İlkin Heyət" təsisçi üzvü statusu.',
    descriptionEn: 'Founding member of the initial BHOS club roster.',
    descriptionRu: 'Основатель из первоначального состава клуба БВШН.',
    accentColor: 'gold',
    tierLabelAz: 'Əfsanəvi',
  },
];

function didPlayerWinSetWithDeuce(
  setScores: string | undefined,
  isPlayer1: boolean
): boolean {
  if (!setScores || !setScores.trim()) return false;
  const parts = setScores.split(',');
  for (const rawPart of parts) {
    const tokens = rawPart
      .trim()
      .split(/[-:]/)
      .map((t) => parseInt(t.trim(), 10));
    if (tokens.length === 2 && !isNaN(tokens[0]) && !isNaN(tokens[1])) {
      const playerPts = isPlayer1 ? tokens[0] : tokens[1];
      const oppPts = isPlayer1 ? tokens[1] : tokens[0];
      if (playerPts >= 12 && oppPts >= 10 && playerPts - oppPts >= 2) {
        return true;
      }
    }
  }
  return false;
}

function didPlayerLoseFirstSet(
  setScores: string | undefined,
  isPlayer1: boolean
): boolean {
  if (!setScores || !setScores.trim()) return false;
  const firstPart = setScores.split(',')[0]?.trim();
  if (!firstPart) return false;
  const tokens = firstPart
    .split(/[-:]/)
    .map((t) => parseInt(t.trim(), 10));
  if (tokens.length === 2 && !isNaN(tokens[0]) && !isNaN(tokens[1])) {
    const playerPts = isPlayer1 ? tokens[0] : tokens[1];
    const oppPts = isPlayer1 ? tokens[1] : tokens[0];
    return playerPts < oppPts;
  }
  return false;
}

export function evaluatePlayerAchievements(
  profile: PlayerProfile,
  playerMatches: MatchRecord[],
  dbUnlockedMap: Record<string, string> = {},
  roster?: PlayerProfile[],
  tournaments?: Tournament[]
): EvaluatedAchievement[] {
  const confirmedMatches = playerMatches
    .filter((m) => !m.status || m.status === 'confirmed' || m.status === 'approved')
    .sort(
      (a, b) =>
        new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    );

  const effectiveRoster = roster && roster.length > 0 ? roster : INITIAL_PROFILES;
  const effectiveTournaments =
    tournaments && tournaments.length > 0 ? tournaments : INITIAL_TOURNAMENTS;

  const profileById = new Map<string, PlayerProfile>();
  const profileByName = new Map<string, PlayerProfile>();
  effectiveRoster.forEach((p) => {
    if (p.id) profileById.set(p.id, p);
    if (p.full_name) profileByName.set(p.full_name.trim().toLowerCase(), p);
  });

  const normName = profile.full_name?.trim().toLowerCase();
  const totalConfirmedMatches = Math.max(
    profile.matches_played || 0,
    confirmedMatches.length
  );

  const hasFirstStep =
    Boolean(dbUnlockedMap.first_step) || totalConfirmedMatches > 0;
  const firstStepDate: string | null =
    dbUnlockedMap.first_step || (confirmedMatches[0]?.match_date ?? null);

  let hasCleanSweep = Boolean(dbUnlockedMap.clean_sweep);
  let cleanSweepDate: string | null = dbUnlockedMap.clean_sweep || null;

  let hasCampusAmbassador = Boolean(dbUnlockedMap.campus_ambassador);
  let campusAmbassadorDate: string | null = dbUnlockedMap.campus_ambassador || null;
  const uniqueOpponentDepartments = new Set<string>();

  let hasHotStreak = Boolean(dbUnlockedMap.hot_streak);
  let hotStreakDate: string | null = dbUnlockedMap.hot_streak || null;

  let hasDeuceDemon = Boolean(dbUnlockedMap.deuce_demon);
  let deuceDemonDate: string | null = dbUnlockedMap.deuce_demon || null;

  let hasComebackKing = Boolean(dbUnlockedMap.comeback_king);
  let comebackKingDate: string | null = dbUnlockedMap.comeback_king || null;

  let hasClubVeteran =
    Boolean(dbUnlockedMap.club_veteran) || totalConfirmedMatches >= 25;
  let clubVeteranDate: string | null =
    dbUnlockedMap.club_veteran ||
    (confirmedMatches[24]?.match_date ??
      (totalConfirmedMatches >= 25 ? profile.updated_at || profile.created_at : null));

  let hasGiantSlayer = Boolean(dbUnlockedMap.giant_slayer);
  let giantSlayerDate: string | null = dbUnlockedMap.giant_slayer || null;

  let hasTopTier =
    Boolean(dbUnlockedMap.top_tier) || profile.current_elo >= 800;
  let topTierDate: string | null =
    dbUnlockedMap.top_tier ||
    (profile.current_elo >= 800 ? profile.created_at : null);

  let hasUnstoppableStreak = Boolean(dbUnlockedMap.unstoppable_streak);
  let unstoppableStreakDate: string | null =
    dbUnlockedMap.unstoppable_streak || null;

  let hasTournamentChampion = Boolean(dbUnlockedMap.tournament_champion);
  let tournamentChampionDate: string | null =
    dbUnlockedMap.tournament_champion || null;

  if (!hasTournamentChampion) {
    for (const t of effectiveTournaments) {
      if (t.winner_id && t.winner_id === profile.id) {
        hasTournamentChampion = true;
        tournamentChampionDate = t.end_date || t.start_date || t.created_at;
        break;
      }
      const rounds = t.bracket_data?.rounds;
      if (rounds && rounds.length > 0) {
        const finalRound = rounds[rounds.length - 1];
        const finalMatch = finalRound?.matches?.[0];
        if (finalMatch?.winner_id && finalMatch.winner_id === profile.id) {
          hasTournamentChampion = true;
          tournamentChampionDate = t.end_date || t.start_date || t.created_at;
          break;
        }
      }
    }
  }

  const hasFoundingMember =
    Boolean(dbUnlockedMap.founding_member) ||
    isDefaultMember(profile.id, profile.email) ||
    profile.origin === 'İlkin Heyət';
  const foundingMemberDate: string | null =
    dbUnlockedMap.founding_member ||
    (hasFoundingMember ? profile.created_at : null);

  let consecutiveWins = 0;

  for (const m of confirmedMatches) {
    const isP1 =
      m.player1_id === profile.id ||
      (Boolean(normName) && m.player1_name?.trim().toLowerCase() === normName);

    const myScore = isP1 ? m.player1_score : m.player2_score;
    const oppScore = isP1 ? m.player2_score : m.player1_score;
    const won = myScore > oppScore;

    const oppId = isP1 ? m.player2_id : m.player1_id;
    const oppName = (isP1 ? m.player2_name : m.player1_name)?.trim().toLowerCase();
    const oppProfile =
      (oppId ? profileById.get(oppId) : undefined) ||
      (oppName ? profileByName.get(oppName) : undefined);

    if (oppProfile) {
      const oppDept = resolveCanonicalDepartment(getProfileDepartment(oppProfile));
      if (oppDept) {
        uniqueOpponentDepartments.add(oppDept);
        if (uniqueOpponentDepartments.size >= 3 && !hasCampusAmbassador) {
          hasCampusAmbassador = true;
          campusAmbassadorDate = m.match_date;
        }
      }
    }

    const myEloBefore = isP1 ? m.player1_elo_before : m.player2_elo_before;
    const oppEloBefore = isP1 ? m.player2_elo_before : m.player1_elo_before;
    const myEloAfter = isP1 ? m.player1_elo_after : m.player2_elo_after;

    if (won) {
      consecutiveWins += 1;
      if (consecutiveWins >= 3 && !hasHotStreak) {
        hasHotStreak = true;
        hotStreakDate = m.match_date;
      }
      if (consecutiveWins >= 7 && !hasUnstoppableStreak) {
        hasUnstoppableStreak = true;
        unstoppableStreakDate = m.match_date;
      }
      if (myScore >= 2 && oppScore === 0 && !hasCleanSweep) {
        hasCleanSweep = true;
        cleanSweepDate = m.match_date;
      }
      const isDecidingFinalSet =
        (myScore === 2 && oppScore === 1) ||
        (myScore === 3 && oppScore === 2) ||
        (myScore === 4 && oppScore === 3);
      if (
        !hasComebackKing &&
        (isDecidingFinalSet || didPlayerLoseFirstSet(m.set_scores, isP1))
      ) {
        hasComebackKing = true;
        comebackKingDate = m.match_date;
      }
      if (
        typeof oppEloBefore === 'number' &&
        typeof myEloBefore === 'number' &&
        oppEloBefore - myEloBefore >= 100 &&
        !hasGiantSlayer
      ) {
        hasGiantSlayer = true;
        giantSlayerDate = m.match_date;
      }
    } else {
      consecutiveWins = 0;
    }

    if (typeof myEloAfter === 'number' && myEloAfter >= 800 && !hasTopTier) {
      hasTopTier = true;
      topTierDate = m.match_date;
    }

    if (!hasDeuceDemon && didPlayerWinSetWithDeuce(m.set_scores, isP1)) {
      hasDeuceDemon = true;
      deuceDemonDate = m.match_date;
    }
  }

  const stateById: Record<
    AchievementBadgeId,
    {
      unlocked: boolean;
      unlockedAt: string | null;
      progress?: AchievementProgress | null;
    }
  > = {
    first_step: {
      unlocked: hasFirstStep,
      unlockedAt: firstStepDate,
      progress: {
        current: hasFirstStep ? 1 : Math.min(1, totalConfirmedMatches),
        target: 1,
      },
    },
    clean_sweep: {
      unlocked: hasCleanSweep,
      unlockedAt: cleanSweepDate,
      progress: null,
    },
    campus_ambassador: {
      unlocked: hasCampusAmbassador,
      unlockedAt: campusAmbassadorDate,
      progress: {
        current: hasCampusAmbassador
          ? 3
          : Math.min(3, uniqueOpponentDepartments.size),
        target: 3,
      },
    },
    hot_streak: {
      unlocked: hasHotStreak,
      unlockedAt: hotStreakDate,
      progress: {
        current: hasHotStreak ? 3 : Math.min(3, consecutiveWins),
        target: 3,
      },
    },
    deuce_demon: {
      unlocked: hasDeuceDemon,
      unlockedAt: deuceDemonDate,
      progress: null,
    },
    comeback_king: {
      unlocked: hasComebackKing,
      unlockedAt: comebackKingDate,
      progress: null,
    },
    club_veteran: {
      unlocked: hasClubVeteran,
      unlockedAt: clubVeteranDate,
      progress: {
        current: hasClubVeteran ? 25 : Math.min(25, totalConfirmedMatches),
        target: 25,
      },
    },
    giant_slayer: {
      unlocked: hasGiantSlayer,
      unlockedAt: giantSlayerDate,
      progress: null,
    },
    top_tier: {
      unlocked: hasTopTier,
      unlockedAt: topTierDate,
      progress: {
        current: hasTopTier
          ? 800
          : Math.min(800, Math.max(0, Math.round(profile.current_elo || 0))),
        target: 800,
      },
    },
    unstoppable_streak: {
      unlocked: hasUnstoppableStreak,
      unlockedAt: unstoppableStreakDate,
      progress: {
        current: hasUnstoppableStreak ? 7 : Math.min(7, consecutiveWins),
        target: 7,
      },
    },
    tournament_champion: {
      unlocked: hasTournamentChampion,
      unlockedAt: tournamentChampionDate,
      progress: null,
    },
    founding_member: {
      unlocked: hasFoundingMember,
      unlockedAt: foundingMemberDate,
      progress: null,
    },
  };

  return ACHIEVEMENT_BADGES.map((badge) => ({
    ...badge,
    unlocked: stateById[badge.id].unlocked,
    unlockedAt: stateById[badge.id].unlockedAt,
    progress: stateById[badge.id].progress ?? null,
  }));
}

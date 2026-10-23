import { PlayerProfile, MatchRecord, isDefaultMember } from '../data/types';

export type AchievementBadgeId =
  | 'first_step'
  | 'hot_streak'
  | 'giant_slayer'
  | 'deuce_demon'
  | 'top_tier'
  | 'founding_member';

export interface AchievementBadgeDefinition {
  id: AchievementBadgeId;
  emoji: string;
  titleAz: string;
  titleEn: string;
  titleRu: string;
  descriptionAz: string;
  descriptionEn: string;
  descriptionRu: string;
  accentColor: 'blue' | 'gold' | 'emerald';
  i18nKey?: string;
}

export interface EvaluatedAchievement extends AchievementBadgeDefinition {
  unlocked: boolean;
  unlockedAt?: string | null;
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
    i18nKey: 'achievements.giant_slayer',
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
    i18nKey: 'achievements.deuce_demon',
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

export function evaluatePlayerAchievements(
  profile: PlayerProfile,
  playerMatches: MatchRecord[],
  dbUnlockedMap: Record<string, string> = {}
): EvaluatedAchievement[] {
  const confirmedMatches = playerMatches
    .filter((m) => !m.status || m.status === 'confirmed' || m.status === 'approved')
    .sort(
      (a, b) =>
        new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    );

  const normName = profile.full_name?.trim().toLowerCase();

  let hasFirstStep = Boolean(dbUnlockedMap.first_step) ||
    profile.matches_played > 0 ||
    confirmedMatches.length > 0;
  let firstStepDate: string | null =
    dbUnlockedMap.first_step ||
    (confirmedMatches[0]?.match_date ?? null);

  let hasHotStreak = Boolean(dbUnlockedMap.hot_streak);
  let hotStreakDate: string | null = dbUnlockedMap.hot_streak || null;

  let hasGiantSlayer = Boolean(dbUnlockedMap.giant_slayer);
  let giantSlayerDate: string | null = dbUnlockedMap.giant_slayer || null;

  let hasDeuceDemon = Boolean(dbUnlockedMap.deuce_demon);
  let deuceDemonDate: string | null = dbUnlockedMap.deuce_demon || null;

  let hasTopTier =
    Boolean(dbUnlockedMap.top_tier) || profile.current_elo >= 800;
  let topTierDate: string | null =
    dbUnlockedMap.top_tier ||
    (profile.current_elo >= 800 ? profile.created_at : null);

  const hasFoundingMember =
    Boolean(dbUnlockedMap.founding_member) || isDefaultMember(profile.id, profile.email);
  const foundingMemberDate: string | null =
    dbUnlockedMap.founding_member ||
    (hasFoundingMember ? profile.created_at : null);

  let consecutiveWins = 0;

  for (const m of confirmedMatches) {
    const isP1 =
      m.player1_id === profile.id ||
      (Boolean(normName) && m.player1_name?.trim().toLowerCase() === normName);

    const won = isP1
      ? m.player1_score > m.player2_score
      : m.player2_score > m.player1_score;

    const myEloBefore = isP1 ? m.player1_elo_before : m.player2_elo_before;
    const oppEloBefore = isP1 ? m.player2_elo_before : m.player1_elo_before;
    const myEloAfter = isP1 ? m.player1_elo_after : m.player2_elo_after;

    if (won) {
      consecutiveWins += 1;
      if (consecutiveWins >= 3 && !hasHotStreak) {
        hasHotStreak = true;
        hotStreakDate = m.match_date;
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
    { unlocked: boolean; unlockedAt: string | null }
  > = {
    first_step: { unlocked: hasFirstStep, unlockedAt: firstStepDate },
    hot_streak: { unlocked: hasHotStreak, unlockedAt: hotStreakDate },
    giant_slayer: { unlocked: hasGiantSlayer, unlockedAt: giantSlayerDate },
    deuce_demon: { unlocked: hasDeuceDemon, unlockedAt: deuceDemonDate },
    top_tier: { unlocked: hasTopTier, unlockedAt: topTierDate },
    founding_member: {
      unlocked: hasFoundingMember,
      unlockedAt: foundingMemberDate,
    },
  };

  return ACHIEVEMENT_BADGES.map((badge) => ({
    ...badge,
    unlocked: stateById[badge.id].unlocked,
    unlockedAt: stateById[badge.id].unlockedAt,
  }));
}

import {
  Achievement,
  AchievementUnlock,
  AchievementUnlockContext,
  UserAchievementState,
} from './types';
import {
  AchievementRepository,
  AchievementUnlockRepository,
  InMemoryAchievementRepository,
  InMemoryAchievementUnlockRepository,
} from './repositories';

const CORE_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'core_under_1s_correct',
    name: 'Answered in under 1 second correctly',
    description: 'Win the buzzer race and answer a question correctly in <1s.',
    category: 'core',
    repeatable: true,
    trigger: 'game_result',
  },
  {
    id: 'core_perfect_party_game',
    name: 'Perfect party game',
    description: 'Host a party game where every player scores 98% or higher.',
    category: 'core',
    repeatable: false,
    trigger: 'game_result',
  },
  {
    id: 'core_first_game_created',
    name: 'First game created',
    category: 'core',
    repeatable: false,
    trigger: 'game_start',
  },
  {
    id: 'core_first_game_joined',
    name: 'First game joined',
    category: 'core',
    repeatable: false,
    trigger: 'game_start',
  },
  {
    id: 'core_five_perfect_games',
    name: '5 perfect games in a row',
    category: 'core',
    repeatable: true,
    trigger: 'session_history',
  },
  {
    id: 'core_clutch_answer',
    name: 'Clutch Answer',
    description: 'Win a game by answering the final question correctly.',
    category: 'core',
    repeatable: true,
    trigger: 'game_result',
  },
  {
    id: 'core_lightning_round',
    name: 'Lightning Round',
    description: 'Submit 3 correct answers in under 1.5 seconds each.',
    category: 'core',
    repeatable: true,
    trigger: 'game_result',
  },
  {
    id: 'core_comeback_kid',
    name: 'Comeback Kid',
    description: 'Start in last place and climb to first by the end.',
    category: 'core',
    repeatable: true,
    trigger: 'game_result',
  },
  {
    id: 'core_party_starter',
    name: 'Party Starter',
    description: 'Host a game with four or more players.',
    category: 'core',
    repeatable: true,
    trigger: 'game_result',
  },
  {
    id: 'core_scholar_mode_activated',
    name: 'Scholar Mode Activated',
    description: 'Maintain 100% accuracy in the long-form category.',
    category: 'core',
    repeatable: true,
    trigger: 'session_history',
  },
];

export class AchievementsService {
  constructor(
    private readonly achievementRepo: AchievementRepository,
    private readonly unlockRepo: AchievementUnlockRepository,
  ) {}

  registerAchievement(achievement: Achievement): void {
    this.validateAchievement(achievement);
    const existing = this.achievementRepo.getAchievementById(achievement.id);
    if (existing) {
      throw new Error(`Achievement with id "${achievement.id}" already exists`);
    }
    this.achievementRepo.saveAchievement(achievement);
  }

  getAchievementsForUser(userId: string): UserAchievementState[] {
    return this.unlockRepo
      .getUnlocksForUser(userId)
      .map((unlock) => {
        const achievement = this.achievementRepo.getAchievementById(
          unlock.achievementId,
        );
        if (!achievement) {
          return undefined;
        }
        return { achievement, unlock };
      })
      .filter((entry): entry is UserAchievementState => Boolean(entry));
  }

  unlockAchievement(
    userId: string,
    achievementId: string,
    context?: AchievementUnlockContext,
  ): AchievementUnlock {
    const achievement =
      this.achievementRepo.getAchievementById(achievementId);
    if (!achievement) {
      throw new Error(`Unknown achievement "${achievementId}"`);
    }

    if (!achievement.repeatable && this.hasUnlocked(userId, achievementId)) {
      // Ignore duplicate unlocks for non-repeatable achievements.
      const unlocks = this.unlockRepo.getUnlocksForUser(userId);
      const existing = unlocks.find(
        (unlock) => unlock.achievementId === achievementId,
      );
      if (!existing) {
        throw new Error(
          `Achievement "${achievementId}" marked as unlocked but missing record`,
        );
      }
      return existing;
    }

    const unlock: AchievementUnlock = {
      userId,
      achievementId,
      timestamp: Date.now(),
      gameId: context?.gameId ?? null,
    };

    this.unlockRepo.addUnlock(unlock);
    return unlock;
  }

  hasUnlocked(userId: string, achievementId: string): boolean {
    return this.unlockRepo.hasUnlock(userId, achievementId);
  }

  getAllCoreAchievements(): Achievement[] {
    return this.achievementRepo.listCoreAchievements();
  }

  getCustomAchievementsForOrg(orgId: string): Achievement[] {
    return this.achievementRepo.listCustomAchievementsForOrg(orgId);
  }

  private validateAchievement(achievement: Achievement): void {
    if (achievement.category === 'core' && achievement.organizationId) {
      throw new Error(
        `Core achievement "${achievement.id}" must not have an organizationId`,
      );
    }

    if (
      achievement.category === 'custom' &&
      (!achievement.organizationId || achievement.organizationId.trim() === '')
    ) {
      throw new Error(
        `Custom achievement "${achievement.id}" must include organizationId`,
      );
    }
  }
}

export function createInMemoryAchievementsService(
  options: {
    seedAchievements?: Achievement[];
    seedUnlocks?: AchievementUnlock[];
  } = {},
): AchievementsService {
  const achievementRepo = new InMemoryAchievementRepository([
    ...CORE_ACHIEVEMENTS,
    ...(options.seedAchievements ?? []),
  ]);
  const unlockRepo = new InMemoryAchievementUnlockRepository();

  options.seedUnlocks?.forEach((unlock) => unlockRepo.addUnlock(unlock));

  return new AchievementsService(achievementRepo, unlockRepo);
}

export { CORE_ACHIEVEMENTS };

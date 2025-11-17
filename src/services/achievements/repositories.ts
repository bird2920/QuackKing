import {
  Achievement,
  AchievementUnlock,
} from './types';

export interface AchievementRepository {
  saveAchievement(achievement: Achievement): void;
  getAchievementById(id: string): Achievement | undefined;
  listAllAchievements(): Achievement[];
  listCoreAchievements(): Achievement[];
  listCustomAchievementsForOrg(orgId: string): Achievement[];
}

export interface AchievementUnlockRepository {
  addUnlock(unlock: AchievementUnlock): void;
  getUnlocksForUser(userId: string): AchievementUnlock[];
  hasUnlock(userId: string, achievementId: string): boolean;
}

export class InMemoryAchievementRepository implements AchievementRepository {
  private achievements = new Map<string, Achievement>();

  constructor(seed: Achievement[] = []) {
    seed.forEach((achievement) => this.saveAchievement(achievement));
  }

  saveAchievement(achievement: Achievement): void {
    this.achievements.set(achievement.id, { ...achievement });
  }

  getAchievementById(id: string): Achievement | undefined {
    return this.achievements.get(id);
  }

  listAllAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  listCoreAchievements(): Achievement[] {
    return this.listAllAchievements().filter(
      (achievement) => achievement.category === 'core',
    );
  }

  listCustomAchievementsForOrg(orgId: string): Achievement[] {
    return this.listAllAchievements().filter(
      (achievement) =>
        achievement.category === 'custom' &&
        achievement.organizationId === orgId,
    );
  }
}

export class InMemoryAchievementUnlockRepository
  implements AchievementUnlockRepository
{
  private unlocksByUser = new Map<string, AchievementUnlock[]>();

  addUnlock(unlock: AchievementUnlock): void {
    const userUnlocks = this.unlocksByUser.get(unlock.userId) ?? [];
    userUnlocks.push({ ...unlock });
    this.unlocksByUser.set(unlock.userId, userUnlocks);
  }

  getUnlocksForUser(userId: string): AchievementUnlock[] {
    return [...(this.unlocksByUser.get(userId) ?? [])];
  }

  hasUnlock(userId: string, achievementId: string): boolean {
    return (
      this.unlocksByUser
        .get(userId)
        ?.some((unlock) => unlock.achievementId === achievementId) ?? false
    );
  }
}

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  AchievementsService,
  CORE_ACHIEVEMENTS,
  createInMemoryAchievementsService,
} from '../src/services/achievements/AchievementsService.ts';
import {
  InMemoryAchievementRepository,
  InMemoryAchievementUnlockRepository,
} from '../src/services/achievements/repositories.ts';
import type {
  Achievement,
  AchievementUnlock,
} from '../src/services/achievements/types.ts';

const setupService = () => {
  const achievementRepo = new InMemoryAchievementRepository();
  const unlockRepo = new InMemoryAchievementUnlockRepository();
  return {
    service: new AchievementsService(achievementRepo, unlockRepo),
    achievementRepo,
    unlockRepo,
  };
};

const buildAchievement = (overrides: Partial<Achievement> = {}): Achievement => ({
  id: 'test-achievement',
  name: 'Test Achievement',
  category: 'custom',
  organizationId: 'org-1',
  repeatable: false,
  trigger: 'game_start',
  ...overrides,
});

describe('AchievementsService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers valid custom achievements for organizations', () => {
    const { service } = setupService();
    const achievement = buildAchievement({
      id: 'custom-001',
      organizationId: 'org-42',
    });

    service.registerAchievement(achievement);

    expect(service.getCustomAchievementsForOrg('org-42')).toEqual([
      achievement,
    ]);
  });

  it('throws when trying to register duplicate achievement ids', () => {
    const { service } = setupService();
    const achievement = buildAchievement({ id: 'duplicate-id' });

    service.registerAchievement(achievement);

    expect(() => service.registerAchievement(achievement)).toThrow(
      /already exists/i,
    );
  });

  it('validates category and organization rules for achievements', () => {
    const { service } = setupService();

    expect(() =>
      service.registerAchievement(
        buildAchievement({
          id: 'core-invalid',
          category: 'core',
          organizationId: 'org-x',
        }),
      ),
    ).toThrow(/must not have an organizationId/i);

    expect(() =>
      service.registerAchievement(
        buildAchievement({
          id: 'custom-missing-org',
          organizationId: undefined,
        }),
      ),
    ).toThrow(/must include organizationId/i);
  });

  it('throws when unlocking unknown achievements', () => {
    const { service } = setupService();
    expect(() =>
      service.unlockAchievement('user-1', 'missing-id'),
    ).toThrow(/unknown achievement/i);
  });

  it('does not duplicate unlocks for non-repeatable achievements', () => {
    const { service, unlockRepo } = setupService();
    const achievement = buildAchievement({
      id: 'single-shot',
      repeatable: false,
    });
    service.registerAchievement(achievement);

    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const firstUnlock = service.unlockAchievement(
      'user-1',
      achievement.id,
      { gameId: 'game-1' },
    );
    vi.spyOn(Date, 'now').mockReturnValue(2_000);
    const secondUnlock = service.unlockAchievement(
      'user-1',
      achievement.id,
      { gameId: 'game-2' },
    );

    expect(secondUnlock).toEqual(firstUnlock);
    expect(unlockRepo.getUnlocksForUser('user-1')).toHaveLength(1);
  });

  it('allows repeatable achievements to record multiple unlocks', () => {
    const { service } = setupService();
    const repeatableAchievement = buildAchievement({
      id: 'repeatable',
      repeatable: true,
    });
    service.registerAchievement(repeatableAchievement);

    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(200);

    const firstUnlock = service.unlockAchievement(
      'user-1',
      repeatableAchievement.id,
    );
    const secondUnlock = service.unlockAchievement(
      'user-1',
      repeatableAchievement.id,
    );

    expect(secondUnlock.timestamp).toBeGreaterThan(firstUnlock.timestamp);
    expect(service.getAchievementsForUser('user-1')).toHaveLength(2);
  });

  it('returns user achievement state only for known achievements', () => {
    const { service, unlockRepo } = setupService();
    const achievement = buildAchievement({ id: 'known-achievement' });
    service.registerAchievement(achievement);

    const unlock = service.unlockAchievement('user-1', achievement.id, {
      gameId: 'game-xyz',
    });

    unlockRepo.addUnlock({
      userId: 'user-1',
      achievementId: 'ghost-achievement',
      timestamp: 500,
    });

    const result = service.getAchievementsForUser('user-1');

    expect(result).toHaveLength(1);
    expect(result[0].achievement.id).toBe(achievement.id);
    expect(result[0].unlock).toMatchObject({
      achievementId: achievement.id,
      gameId: 'game-xyz',
      timestamp: unlock.timestamp,
    });
  });

  it('seeds core achievements and optional data when using the factory helper', () => {
    const customAchievement = buildAchievement({
      id: 'seeded-custom',
      organizationId: 'acme',
    });
    const seededUnlock: AchievementUnlock = {
      userId: 'seed-user',
      achievementId: customAchievement.id,
      timestamp: 321,
      gameId: null,
    };

    const service = createInMemoryAchievementsService({
      seedAchievements: [customAchievement],
      seedUnlocks: [seededUnlock],
    });

    expect(
      service.getCustomAchievementsForOrg('acme').map((ach) => ach.id),
    ).toContain('seeded-custom');
    expect(service.getAchievementsForUser('seed-user')).toHaveLength(1);
    expect(
      service.getAllCoreAchievements().map((ach) => ach.id).sort(),
    ).toEqual(CORE_ACHIEVEMENTS.map((ach) => ach.id).sort());
  });
});

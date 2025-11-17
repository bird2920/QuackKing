import { AchievementBus } from './AchievementBus';

/**
 * Shared event bus instance used across the app so achievement producers/consumers
 * operate on the same channel.
 */
export const achievementBus = new AchievementBus();

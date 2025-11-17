export type AchievementCategory = 'core' | 'custom';

export type AchievementTrigger =
  | 'game_start'
  | 'game_result'
  | 'session_history';

export interface Achievement {
  id: string;
  name: string;
  description?: string;
  category: AchievementCategory;
  organizationId?: string | null;
  repeatable: boolean;
  trigger: AchievementTrigger;
  metadata?: Record<string, any>;
}

export interface AchievementUnlock {
  userId: string;
  achievementId: string;
  timestamp: number;
  gameId?: string | null;
}

export interface AchievementUnlockContext {
  gameId?: string | null;
  metadata?: Record<string, any>;
}

export interface UserAchievementState {
  achievement: Achievement;
  unlock?: AchievementUnlock;
}

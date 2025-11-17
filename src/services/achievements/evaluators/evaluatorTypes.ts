import { AchievementsService } from '../AchievementsService';
import { AchievementEvent, AchievementEventType } from '../AchievementBus';

export interface EvaluatorContext<T extends AchievementEventType> {
  service: AchievementsService;
  event: Extract<AchievementEvent, { type: T }>;
}

export interface AchievementEvaluator<T extends AchievementEventType> {
  event: T;
  handle(context: EvaluatorContext<T>): void;
}

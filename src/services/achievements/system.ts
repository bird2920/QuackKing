import { AchievementsService, createInMemoryAchievementsService } from './AchievementsService';
import { achievementBus } from './achievementBusInstance';
import { registerAchievementEvaluators } from './evaluators';

let achievementService: AchievementsService | null = null;

export function getAchievementService(): AchievementsService {
  if (!achievementService) {
    achievementService = createInMemoryAchievementsService();
    registerAchievementEvaluators({ bus: achievementBus, service: achievementService });
  }
  return achievementService;
}

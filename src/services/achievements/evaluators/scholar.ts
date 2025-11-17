import { AchievementEvaluator } from './evaluatorTypes';

const REQUIRED_ACCURACY = 1;

export function createScholarEvaluator(): AchievementEvaluator<'GAME_FINISHED'> {
  return {
    event: 'GAME_FINISHED',
    handle: ({ event, service }) => {
      const { data } = event;
      const accuracy =
        typeof data.longFormAccuracy === 'number'
          ? data.longFormAccuracy
          : (data.metadata?.longFormAccuracy as number | undefined);

      if (typeof accuracy === 'number' && accuracy >= REQUIRED_ACCURACY) {
        service.unlockAchievement(data.userId, 'core_scholar_mode_activated', {
          gameId: data.gameId,
        });
      }
    },
  };
}

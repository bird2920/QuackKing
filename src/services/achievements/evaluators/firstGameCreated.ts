import { AchievementEvaluator } from './evaluatorTypes';

export function createFirstGameCreatedEvaluator(): AchievementEvaluator<'GAME_CREATED'> {
  return {
    event: 'GAME_CREATED',
    handle: ({ event, service }) => {
      const { data } = event;
      service.unlockAchievement(data.userId, 'core_first_game_created', {
        gameId: data.gameId,
      });
    },
  };
}

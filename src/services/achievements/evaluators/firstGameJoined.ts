import { AchievementEvaluator } from './evaluatorTypes';

export function createFirstGameJoinedEvaluator(): AchievementEvaluator<'GAME_JOINED'> {
  return {
    event: 'GAME_JOINED',
    handle: ({ event, service }) => {
      const { data } = event;
      service.unlockAchievement(data.userId, 'core_first_game_joined', {
        gameId: data.gameId,
      });
    },
  };
}

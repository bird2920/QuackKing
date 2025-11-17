import { AchievementEvaluator } from './evaluatorTypes';

export function createComebackKidEvaluator(): AchievementEvaluator<'GAME_FINISHED'> {
  return {
    event: 'GAME_FINISHED',
    handle: ({ event, service }) => {
      const { data } = event;
      if (
        typeof data.startingRank !== 'number' ||
        typeof data.finalRank !== 'number'
      ) {
        return;
      }

      const totalPlayers = data.players?.length ?? 0;
      const startedLast = data.startingRank >= totalPlayers && totalPlayers > 0;
      const finishedFirst = data.finalRank === 1;

      if (startedLast && finishedFirst) {
        service.unlockAchievement(data.userId, 'core_comeback_kid', {
          gameId: data.gameId,
        });
      }
    },
  };
}

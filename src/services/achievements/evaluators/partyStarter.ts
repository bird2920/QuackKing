import { AchievementEvaluator } from './evaluatorTypes';

const MIN_PLAYERS_FOR_PARTY = 4;

export function createPartyStarterEvaluator(): AchievementEvaluator<'GAME_FINISHED'> {
  return {
    event: 'GAME_FINISHED',
    handle: ({ event, service }) => {
      const { data } = event;
      if (data.hostUserId !== data.userId) {
        return;
      }

      if ((data.players?.length ?? 0) >= MIN_PLAYERS_FOR_PARTY) {
        service.unlockAchievement(data.userId, 'core_party_starter', {
          gameId: data.gameId,
        });
      }
    },
  };
}

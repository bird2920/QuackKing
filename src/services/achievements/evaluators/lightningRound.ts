import { AchievementEvaluator } from './evaluatorTypes';

export function createLightningRoundEvaluator(): AchievementEvaluator<'QUESTION_ANSWERED'> {
  const streaks = new Map<string, number>();

  return {
    event: 'QUESTION_ANSWERED',
    handle: ({ event, service }) => {
      const { data } = event;
      if (data.correct && data.answerTimeMs <= 1500) {
        const streak = (streaks.get(data.userId) ?? 0) + 1;
        streaks.set(data.userId, streak);
        if (streak >= 3) {
          service.unlockAchievement(data.userId, 'core_lightning_round', {
            gameId: data.gameId,
          });
          streaks.set(data.userId, 0);
        }
        return;
      }

      streaks.set(data.userId, 0);
    },
  };
}

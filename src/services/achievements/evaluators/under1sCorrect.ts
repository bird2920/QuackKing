import { AchievementEvaluator } from './evaluatorTypes';

export function createUnder1sCorrectEvaluator(): AchievementEvaluator<'QUESTION_ANSWERED'> {
  return {
    event: 'QUESTION_ANSWERED',
    handle: ({ event, service }) => {
      const { data } = event;
      if (data.correct && data.answerTimeMs < 1000) {
        service.unlockAchievement(data.userId, 'core_under_1s_correct', {
          gameId: data.gameId,
        });
      }
    },
  };
}

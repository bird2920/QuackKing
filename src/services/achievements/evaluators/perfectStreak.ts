import { AchievementEvaluator } from './evaluatorTypes';

const PERFECT_SCORE_THRESHOLD = 100;
const REQUIRED_STREAK = 5;

export function createPerfectStreakEvaluator(): AchievementEvaluator<'GAME_FINISHED'> {
  const streaks = new Map<string, number>();

  return {
    event: 'GAME_FINISHED',
    handle: ({ event, service }) => {
      const { data } = event;
      const isPerfect = data.finalScore >= PERFECT_SCORE_THRESHOLD;
      if (!isPerfect) {
        streaks.set(data.userId, 0);
        return;
      }

      const streak = (streaks.get(data.userId) ?? 0) + 1;
      streaks.set(data.userId, streak);
      if (streak >= REQUIRED_STREAK) {
        service.unlockAchievement(data.userId, 'core_five_perfect_games', {
          gameId: data.gameId,
        });
        streaks.set(data.userId, 0);
      }
    },
  };
}

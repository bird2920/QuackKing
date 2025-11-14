/**
 * Calculates score/stat updates for the provided players.
 * @param {Object} params
 * @param {Array<Object>} params.players Array of player snapshots with id and stats.
 * @param {string|number} params.correctAnswer The correct answer for the current question.
 * @param {number} params.questionStartTime Epoch ms when the question started.
 * @param {number} [params.now=Date.now()] Timestamp used when an answer timestamp is missing.
 * @returns {Array<{id: string, updates: Object}>}
 */
export function calculateScoreUpdates({
  players = [],
  correctAnswer,
  questionStartTime,
  now = Date.now(),
}) {
  const updates = [];

  players.forEach((player) => {
    if (!player || player.lastAnswer == null) {
      return;
    }

    const answeredCount = (player.answeredCount || 0) + 1;
    const correct = player.lastAnswer === correctAnswer;
    const correctCount = (player.correctCount || 0) + (correct ? 1 : 0);
    const playerUpdates = {
      answeredCount,
      correctCount,
    };

    if (correct) {
      const answerTimestamp =
        typeof player.answerTimestamp === "number" ? player.answerTimestamp : now;
      const timeElapsed = answerTimestamp - questionStartTime;
      const speedBonus = Math.max(0, 30000 - timeElapsed) / 1000;
      const pointsEarned = 100 + Math.floor(speedBonus * 10);
      playerUpdates.score = (player.score || 0) + pointsEarned;
    }

    updates.push({
      id: player.id,
      updates: playerUpdates,
    });
  });

  return updates;
}

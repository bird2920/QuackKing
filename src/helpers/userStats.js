import { increment, setDoc } from "firebase/firestore";
import { getUserStatsDocPath } from "./firebasePaths";

/**
 * Saves the final game stats for a user into their persistent profile.
 */
export async function persistGameStats({
  db,
  userId,
  playerRecord,
  placement,
  gameCode,
}) {
  if (!db || !userId || !playerRecord) return;

  const statsRef = getUserStatsDocPath(db, userId);
  const score = playerRecord.score || 0;
  const answered = playerRecord.answeredCount || 0;
  const correct = playerRecord.correctCount || 0;
  const now = Date.now();

  await setDoc(
    statsRef,
    {
      totalGames: increment(1),
      totalPoints: increment(score),
      totalAnswers: increment(answered),
      totalCorrectAnswers: increment(correct),
      updatedAt: now,
      lastGame: {
        gameCode: gameCode || null,
        score,
        answered,
        correct,
        placement: placement || null,
        savedAt: now,
      },
    },
    { merge: true }
  );
}

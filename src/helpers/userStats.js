import { getDoc, increment, setDoc } from "firebase/firestore";
import { getUserStatsDocPath } from "./firebasePaths";

const MAX_SAVED_GAMES = 25;

/**
 * Saves the final game stats for a user into their persistent profile.
 */
export async function persistGameStats({
  db,
  userId,
  playerRecord,
  placement,
  gameCode,
  playerName,
  theme,
}) {
  if (!db || !userId || !playerRecord) return;

  const statsRef = getUserStatsDocPath(db, userId);
  const score = playerRecord.score || 0;
  const answered = playerRecord.answeredCount || 0;
  const correct = playerRecord.correctCount || 0;
  const now = Date.now();

  let existingGames = [];
  try {
    const currentStatsSnap = await getDoc(statsRef);
    existingGames = Array.isArray(currentStatsSnap.data()?.games)
      ? currentStatsSnap
          .data()
          .games.map((entry) => ({
            ...entry,
            gameCode: entry?.gameCode || null,
            savedAt: entry?.savedAt || entry?.timestamp || null,
          }))
      : [];
  } catch (err) {
    console.warn("Unable to load existing saved games; continuing with a fresh list.", err);
  }

  const newGameEntry = {
    gameCode: gameCode || null,
    playerName: playerName || playerRecord?.name || null,
    theme: theme || null,
    score,
    answered,
    correct,
    placement: placement || null,
    savedAt: now,
  };

  const nextGames = [newGameEntry, ...existingGames]
    .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
    .slice(0, MAX_SAVED_GAMES);

  await setDoc(
    statsRef,
    {
      totalGames: increment(1),
      totalPoints: increment(score),
      totalAnswers: increment(answered),
      totalCorrectAnswers: increment(correct),
      updatedAt: now,
      games: nextGames,
      lastGame: newGameEntry,
    },
    { merge: true }
  );
}

import React, { useMemo } from "react";
import {
  getGameDocPath,
  getPlayersCollectionPath,
} from "../helpers/firebasePaths";
import { getDocs, deleteDoc, updateDoc } from "firebase/firestore";

export default function ResultsScreen({
  db,
  gameCode,
  players,
  isHost,
  setGameCode,
  setMode,
}) {
  // 🧮 Sort players by score, excluding host
  const sortedPlayers = useMemo(
    () => players.filter((p) => !p.isHost).sort((a, b) => b.score - a.score),
    [players]
  );

  // 🧹 End Game and clean up Firestore docs
  const handleEndGame = async () => {
    if (!isHost || !db || !gameCode) return;

    try {
      // Delete player documents
      const playersColRef = getPlayersCollectionPath(db, gameCode);
      const playerDocs = await getDocs(playersColRef);
      await Promise.all(playerDocs.docs.map((d) => deleteDoc(d.ref)));

      // Delete game document
      const gameDocRef = getGameDocPath(db, gameCode);
      await deleteDoc(gameDocRef);

      // Reset to home
      setGameCode("");
      setMode("HOME");
    } catch (e) {
      console.error("❌ Error ending game:", e);
    }
  };

  // 🔄 Start New Round - keep players and questions
  const handleNewRound = async () => {
    if (!isHost || !db || !gameCode) return;

    try {
      // Reset all player scores and answers
      const playersColRef = getPlayersCollectionPath(db, gameCode);
      const playerDocs = await getDocs(playersColRef);
      await Promise.all(
        playerDocs.docs.map((d) =>
          updateDoc(d.ref, {
            score: 0,
            lastAnswer: null,
            answerTimestamp: null,
          })
        )
      );

      // Reset game state to lobby
      const gameDocRef = getGameDocPath(db, gameCode);
      await updateDoc(gameDocRef, {
        status: "LOBBY",
        currentQuestionIndex: 0,
        currentQuestionStartTime: null,
        answerRevealed: false,
      });
    } catch (e) {
      console.error("❌ Error starting new round:", e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center">
      <h1 className="text-5xl font-extrabold text-red-500 mb-2 text-center">
        GAME OVER
      </h1>
      <h2 className="text-3xl font-semibold text-yellow-400 mb-8 text-center">
        Final Results — {gameCode}
      </h2>

      {/* 🏆 Leaderboard */}
      <div className="w-full max-w-xl bg-gray-800 p-6 rounded-2xl shadow-2xl">
        <h3 className="text-2xl font-bold mb-4 text-center border-b border-gray-600 pb-2">
          Leaderboard
        </h3>

        <div className="space-y-3">
          {sortedPlayers.map((p, index) => (
            <div
              key={p.id}
              className={`flex items-center justify-between p-4 rounded-xl shadow-lg ${
                index === 0
                  ? "bg-yellow-500 text-gray-900 scale-105 ring-4 ring-yellow-300"
                  : "bg-gray-700"
              }`}
            >
              <span className="text-2xl font-black w-10 text-center flex-shrink-0">
                {index + 1}.
              </span>
              <span
                className={`flex-grow mx-4 font-extrabold truncate ${
                  index === 0 ? "text-gray-900" : "text-white"
                }`}
              >
                {p.name}
              </span>
              <span
                className={`text-2xl font-black flex-shrink-0 ${
                  index === 0 ? "text-gray-900" : "text-indigo-400"
                }`}
              >
                {p.score.toLocaleString()} pts
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 🧑‍✈️ Host Controls */}
      {isHost ? (
        <div className="mt-10 w-full max-w-md space-y-4">
          <button
            onClick={handleNewRound}
            className="w-full p-4 bg-green-600 text-white font-extrabold text-xl rounded-xl shadow-2xl hover:bg-green-700 transition transform hover:scale-[1.02]"
          >
            🔄 New Round (Keep Players & Questions)
          </button>
          <button
            onClick={handleEndGame}
            className="w-full p-4 bg-red-600 text-white font-extrabold text-xl rounded-xl shadow-2xl hover:bg-red-700 transition transform hover:scale-[1.02]"
          >
            End Game and Close Room
          </button>
        </div>
      ) : (
        <p className="mt-10 text-lg text-gray-400 text-center">
          Waiting for host to close the room...
        </p>
      )}
    </div>
  );
}
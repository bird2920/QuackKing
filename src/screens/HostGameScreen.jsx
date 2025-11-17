import React, { useState, useEffect, useCallback } from "react";
import { getGameDocPath, getPlayersCollectionPath } from "../helpers/firebasePaths";
import { updateDoc, getDocs, writeBatch } from "firebase/firestore";
import { calculateScoreUpdates } from "../helpers/scoringUtils";
import { achievementBus } from "../services/achievements";

export default function HostGameScreen({ db, gameCode, lobbyState, players, currentQuestion, userId }) {
  const [revealed, setRevealed] = useState(lobbyState?.answerRevealed || false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [playersWhoAnswered, setPlayersWhoAnswered] = useState(new Set());
  const [autoHostEnabled, setAutoHostEnabled] = useState(false);
  const [nextQuestionCountdown, setNextQuestionCountdown] = useState(null);

  const questionNumber = (lobbyState?.currentQuestionIndex || 0) + 1;
  const totalQuestions = lobbyState?.questions?.length || 0;
  const isLastQuestion = questionNumber >= totalQuestions;

  // Sync revealed state from Firestore
  useEffect(() => {
    setRevealed(lobbyState?.answerRevealed || false);
  }, [lobbyState?.answerRevealed, lobbyState?.currentQuestionIndex]);

  // ⏳ Countdown timer
  useEffect(() => {
    if (!lobbyState?.currentQuestionStartTime) return;

    const startTime = lobbyState.currentQuestionStartTime;
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 30 - Math.floor(elapsed / 1000));
      setTimeRemaining(remaining);
    };

    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [lobbyState?.currentQuestionStartTime, lobbyState?.currentQuestionIndex]);

  // 👀 Track who answered
  useEffect(() => {
    const answered = new Set();
    players.forEach((p) => {
      if (p.lastAnswer !== null && p.lastAnswer !== undefined) {
        answered.add(p.id);
      }
    });
    setPlayersWhoAnswered(answered);
  }, [players]);

  // 🎯 Reveal Answer
  const handleRevealAnswer = useCallback(async () => {
    if (!currentQuestion || !db) return;
    setRevealed(true);

    // Mark answer as revealed in Firestore
    try {
      const gameDocRef = getGameDocPath(db, gameCode);
      await updateDoc(gameDocRef, { answerRevealed: true });
    } catch (err) {
      console.error("❌ Error updating answerRevealed:", err);
    }

    // Calculate scores for correct answers & increment stats
    try {
      const playersColRef = getPlayersCollectionPath(db, gameCode);
      const playerDocs = await getDocs(playersColRef);
      if (!playerDocs.empty) {
        const playerRefMap = new Map();
        const playerData = playerDocs.docs.map((docSnap) => {
          playerRefMap.set(docSnap.id, docSnap.ref);
          return { id: docSnap.id, ...docSnap.data() };
        });

        const scoreUpdates = calculateScoreUpdates({
          players: playerData,
          correctAnswer: currentQuestion.correctAnswer,
          questionStartTime: lobbyState?.currentQuestionStartTime,
        });

        if (scoreUpdates.length) {
          const batch = writeBatch(db);
          scoreUpdates.forEach(({ id, updates }) => {
            const ref = playerRefMap.get(id);
            if (ref) {
              batch.update(ref, updates);
            }
          });
          await batch.commit();
        }
      }
    } catch (err) {
      console.error("❌ Error calculating scores:", err);
    }
  }, [db, gameCode, currentQuestion, lobbyState]);

  // ➡️ Next Question
  const handleNextQuestion = useCallback(async () => {
    if (!db || !lobbyState) return;

    try {
      const gameDocRef = getGameDocPath(db, gameCode);

      // Reset player answers
      const playersColRef = getPlayersCollectionPath(db, gameCode);
      const playerDocs = await getDocs(playersColRef);
      if (!playerDocs.empty) {
        const batch = writeBatch(db);
        playerDocs.docs.forEach((docSnap) =>
          batch.update(docSnap.ref, {
            lastAnswer: null,
            answerTimestamp: null,
          })
        );
        await batch.commit();
      }

      // Move to next question
      await updateDoc(gameDocRef, {
        currentQuestionIndex: lobbyState.currentQuestionIndex + 1,
        currentQuestionStartTime: Date.now(),
        answerRevealed: false,
      });

      setRevealed(false);
    } catch (err) {
      console.error("❌ Error moving to next question:", err);
    }
  }, [db, gameCode, lobbyState]);

  // 🏁 End Game
  const handleEndGame = useCallback(async () => {
    if (!db) return;

    try {
      const gameDocRef = getGameDocPath(db, gameCode);
      await updateDoc(gameDocRef, {
        status: "RESULTS",
      });

      const playersForEvent = players.map((player) => ({
        userId: player.id,
        score: player.score ?? 0,
      }));
      const rankByUser = new Map();
      [...playersForEvent]
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .forEach((entry, index) => {
          rankByUser.set(entry.userId, index + 1);
        });

      playersForEvent.forEach((playerEntry) => {
        achievementBus.emit({
          type: "GAME_FINISHED",
          data: {
            userId: playerEntry.userId,
            gameId: gameCode,
            finalScore: playerEntry.score,
            players: playersForEvent,
            hostUserId: lobbyState?.hostUserId,
            finalRank: rankByUser.get(playerEntry.userId),
          },
        });
      });
    } catch (err) {
      console.error("❌ Error ending game:", err);
    }
  }, [db, gameCode, players, lobbyState]);

  // 🤖 Auto reveal when everyone answers
  useEffect(() => {
    if (!autoHostEnabled || revealed) return;
    const totalParticipants = players.filter((p) => !p.isHost).length;
    if (totalParticipants === 0) return;
    if (playersWhoAnswered.size === totalParticipants) {
      handleRevealAnswer();
    }
  }, [autoHostEnabled, players, playersWhoAnswered, revealed, handleRevealAnswer]);

  // ⏭️ Auto advance or end after reveal
  useEffect(() => {
    if (!autoHostEnabled || !revealed) {
      setNextQuestionCountdown(null);
      return;
    }

    const totalParticipants = players.filter((p) => !p.isHost).length;

    if (isLastQuestion) {
      if (totalParticipants === 0 || playersWhoAnswered.size !== totalParticipants) {
        setNextQuestionCountdown(null);
        return;
      }

      setNextQuestionCountdown(3);
      const countdownInterval = setInterval(() => {
        setNextQuestionCountdown((prev) => {
          if (prev === null) return null;
          return Math.max(prev - 1, 0);
        });
      }, 1000);

      const endTimeout = setTimeout(() => {
        handleEndGame();
      }, 3000);

      return () => {
        clearInterval(countdownInterval);
        clearTimeout(endTimeout);
      };
    }

    setNextQuestionCountdown(3);
    const countdownInterval = setInterval(() => {
      setNextQuestionCountdown((prev) => {
        if (prev === null) return null;
        return Math.max(prev - 1, 0);
      });
    }, 1000);

    const advanceTimeout = setTimeout(() => {
      handleNextQuestion();
      }, 3000);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(advanceTimeout);
    };
  }, [
    autoHostEnabled,
    revealed,
    isLastQuestion,
    players,
    playersWhoAnswered,
    handleNextQuestion,
    handleEndGame,
    lobbyState?.currentQuestionIndex,
  ]);

  if (!currentQuestion) return null;

  const timeColor = timeRemaining <= 10 ? "text-red-500 animate-pulse" : "text-yellow-400";

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl mb-6">
        <h2 className="text-3xl font-extrabold text-purple-400 mb-2 text-center">
          Host Controls — {gameCode}
        </h2>
        <p className="text-center text-gray-400">
          Question {questionNumber} of {totalQuestions}
        </p>
      </div>

      {/* Timer */}
      <div className={`text-6xl font-black mb-6 ${timeColor}`}>{timeRemaining}s</div>

      {/* Question */}
      <div className="w-full max-w-4xl bg-gray-800 p-8 rounded-2xl shadow-2xl mb-6">
        <h2 className="text-3xl font-bold mb-6 text-center break-words">
          {currentQuestion.question}
        </h2>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {currentQuestion.options.map((option, i) => {
            const isCorrect = option === currentQuestion.correctAnswer;
            let bgColor = "bg-indigo-600";

            if (revealed) {
              bgColor = isCorrect
                ? "bg-green-500 ring-4 ring-green-300"
                : "bg-red-500 opacity-50";
            }

            return (
              <div
                key={i}
                className={`p-4 rounded-xl font-bold text-lg ${bgColor} text-white text-center`}
              >
                {option}
                {revealed && isCorrect && " ✅"}
              </div>
            );
          })}
        </div>

        {/* Answer Status */}
        {revealed && (
          <div className="mt-4 p-4 bg-green-800 rounded-lg border-2 border-green-500">
            <p className="text-xl font-bold text-center text-green-200">
              ✅ Correct Answer: {currentQuestion.correctAnswer}
            </p>
          </div>
        )}
      </div>

      {/* Players Answered Status */}
      <div className="w-full max-w-4xl bg-gray-800 p-6 rounded-xl shadow-2xl mb-6">
        <h3 className="text-xl font-bold mb-4">
          Players Answered: {playersWhoAnswered.size} / {players.filter((p) => !p.isHost).length}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {players
            .filter((p) => !p.isHost)
            .map((p) => {
              const hasAnswered = playersWhoAnswered.has(p.id);
              return (
                <div
                  key={p.id}
                  className={`p-2 rounded text-sm font-medium text-center ${
                    hasAnswered
                      ? "bg-green-700 text-white"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {p.name} {hasAnswered && "✓"}
                </div>
              );
            })}
        </div>
      </div>

      {/* Host Controls */}
      <div className="w-full max-w-md space-y-3">
        <div className="w-full bg-gray-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
          <div>
            <p className="text-lg font-bold">Auto-Host Mode</p>
            <p className="text-sm text-gray-400">Reveal & advance automatically</p>
          </div>
          <button
            onClick={() => setAutoHostEnabled((prev) => !prev)}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              autoHostEnabled ? "bg-green-500 text-white" : "bg-gray-700 text-gray-300"
            }`}
          >
            {autoHostEnabled ? "On" : "Off"}
          </button>
        </div>

        {autoHostEnabled && revealed && nextQuestionCountdown !== null && (
          <div className="text-center text-sm text-gray-300">
            {isLastQuestion ? "Showing results in" : "Next question in"}{" "}
            <span className="font-bold text-yellow-400">{nextQuestionCountdown}s</span>
          </div>
        )}

        {!revealed ? (
          <button
            onClick={handleRevealAnswer}
            className="w-full p-4 bg-yellow-500 text-gray-900 font-extrabold text-xl rounded-xl hover:bg-yellow-600 transition shadow-lg"
          >
            Reveal Answer
          </button>
        ) : isLastQuestion ? (
          <button
            onClick={handleEndGame}
            className="w-full p-4 bg-red-500 text-white font-extrabold text-xl rounded-xl hover:bg-red-600 transition shadow-lg"
          >
            End Game & Show Results
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            className="w-full p-4 bg-indigo-500 text-white font-extrabold text-xl rounded-xl hover:bg-indigo-600 transition shadow-lg"
          >
            Next Question →
          </button>
        )}
      </div>
    </div>
  );
}

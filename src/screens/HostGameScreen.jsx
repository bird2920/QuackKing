import React, { useState, useEffect, useCallback } from "react";
import { getGameDocPath, getPlayersCollectionPath, getPlayerDocPath } from "../helpers/firebasePaths";
import { updateDoc, getDocs } from "firebase/firestore";

export default function HostGameScreen({ db, gameCode, lobbyState, players, currentQuestion, userId, testMode, setTestMode }) {
  const [revealed, setRevealed] = useState(lobbyState?.answerRevealed || false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [playersWhoAnswered, setPlayersWhoAnswered] = useState(new Set());

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

      const updates = playerDocs.docs.map(async (docSnap) => {
        const playerData = docSnap.data();
        const answered = playerData.lastAnswer != null;
        const correct = playerData.lastAnswer === currentQuestion.correctAnswer;
        if (answered) {
          const updatesObj = {
            answeredCount: (playerData.answeredCount || 0) + 1,
            correctCount: (playerData.correctCount || 0) + (correct ? 1 : 0),
          };
          if (correct) {
            // Time-based scoring
            const timeElapsed = (playerData.answerTimestamp || Date.now()) - lobbyState.currentQuestionStartTime;
            const speedBonus = Math.max(0, 30000 - timeElapsed) / 1000; // 30s max
            const pointsEarned = 100 + Math.floor(speedBonus * 10); // 100 base + up to 300 bonus
            updatesObj.score = (playerData.score || 0) + pointsEarned;
          }
          await updateDoc(docSnap.ref, updatesObj);
        }
      });

      await Promise.all(updates);
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
      await Promise.all(
        playerDocs.docs.map((d) =>
          updateDoc(d.ref, {
            lastAnswer: null,
            answerTimestamp: null,
          })
        )
      );

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
    } catch (err) {
      console.error("❌ Error ending game:", err);
    }
  }, [db, gameCode]);

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
        <button
          onClick={() => setTestMode && setTestMode(true)}
          className="w-full p-4 bg-gray-700 text-white font-bold rounded-xl hover:bg-gray-900 mt-2"
        >
          Test Alone
        </button>
      </div>
    </div>
  );
}
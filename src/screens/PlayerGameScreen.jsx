import React, { useState, useEffect, useCallback } from "react";
import { getPlayerDocPath } from "../helpers/firebasePaths";
import { updateDoc } from "firebase/firestore";

export default function PlayerGameScreen({ db, gameCode, lobbyState, players, currentQuestion, userId }) {
  const player = players.find((p) => p.id === userId);
  const [selectedAnswer, setSelectedAnswer] = useState(player?.lastAnswer || null);
  const [timeRemaining, setTimeRemaining] = useState(30);

  // 🧹 Reset local state when question changes
  useEffect(() => {
    if (!player || player.lastAnswer === null) {
      setSelectedAnswer(null);
    }
  }, [lobbyState?.currentQuestionIndex, player]);

  // ⏳ Countdown timer (smooth 0.1s updates)
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

  // 📝 Submit answer
  const handleAnswerSubmit = useCallback(
    async (answer) => {
      if (!db || !gameCode || !player || player.lastAnswer) return;

      const playerDocRef = getPlayerDocPath(db, gameCode, userId);
      try {
        await updateDoc(playerDocRef, {
          lastAnswer: answer,
          answerTimestamp: Date.now(),
        });
        setSelectedAnswer(answer);
      } catch (e) {
        console.error("❌ Error submitting answer:", e);
      }
    },
    [db, gameCode, userId, player]
  );

  if (!currentQuestion || !player) return null;

  const questionNumber = lobbyState.currentQuestionIndex + 1;
  const timeColor = timeRemaining <= 10 ? "text-red-500 animate-pulse" : "text-yellow-400";
  const answerRevealed = lobbyState?.answerRevealed || false;
  const isCorrect = player.lastAnswer === currentQuestion.correctAnswer;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center justify-start">
      {/* Header */}
      <h1 className="text-3xl font-extrabold text-green-400 mb-4 text-center">
        {player.name} — Score: {player.score}
      </h1>

      {/* Timer */}
      <div className={`text-5xl font-black mb-6 ${timeColor}`}>{timeRemaining}s</div>

      {/* Question */}
      <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-2xl shadow-2xl mb-6 text-center">
        <p className="text-gray-400 text-lg mb-2">Question {questionNumber}</p>
        <h2 className="text-2xl font-bold break-words">{currentQuestion.question}</h2>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {currentQuestion.options.map((option, i) => {
          const isSelected = selectedAnswer === option;
          const isLocked = !!player.lastAnswer;
          const isCorrectAnswer = option === currentQuestion.correctAnswer;

          let baseColor = "bg-indigo-600 hover:bg-indigo-700";
          
          if (isLocked && answerRevealed) {
            // After reveal: show red/green for player's answer
            if (isSelected) {
              baseColor = isCorrect
                ? "bg-green-600 text-white ring-4 ring-green-400 shadow-xl"
                : "bg-red-600 text-white ring-4 ring-red-400 shadow-xl";
            } else if (isCorrectAnswer) {
              // Show correct answer in green
              baseColor = "bg-green-500 text-white ring-2 ring-green-300";
            } else {
              baseColor = "bg-gray-700 opacity-40";
            }
          } else if (isLocked) {
            // Locked but not revealed: show yellow
            baseColor = isSelected
              ? "bg-yellow-500 text-gray-900 ring-4 ring-yellow-300 shadow-lg"
              : "bg-gray-700 opacity-50";
          }

          return (
            <button
              key={i}
              onClick={() => handleAnswerSubmit(option)}
              disabled={isLocked}
              className={`p-4 rounded-xl font-extrabold text-xl transition-all duration-200 text-white shadow-md transform hover:scale-[1.02] disabled:hover:scale-100 ${baseColor}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {/* Status */}
      {answerRevealed && player.lastAnswer && (
        <p className={`mt-8 text-3xl font-extrabold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
          {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
        </p>
      )}
      {!answerRevealed && player.lastAnswer && (
        <p className="mt-8 text-2xl font-bold text-yellow-400 animate-pulse">
          ✅ Answer Locked In!
        </p>
      )}
      {!player.lastAnswer && (
        <p className="mt-8 text-lg text-gray-400 italic">Waiting for your answer...</p>
      )}

      {/* Footer */}
      <p className="mt-10 text-sm text-gray-500">Game Code: {gameCode}</p>
    </div>
  );
}
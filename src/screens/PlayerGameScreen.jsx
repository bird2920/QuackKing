import React, { useState, useEffect, useCallback } from "react";
import { getPlayerDocPath } from "../helpers/firebasePaths";
import { updateDoc } from "firebase/firestore";
import { achievementBus } from "../services/achievements";

export default function PlayerGameScreen({ db, gameCode, lobbyState, players, currentQuestion, userId }) {
  const activePlayers = players.filter((p) => !p.isHost);
  const player = activePlayers.find((p) => p.id === userId);
  const [selectedAnswer, setSelectedAnswer] = useState(player?.lastAnswer || null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const questionStartTime = lobbyState?.currentQuestionStartTime ?? null;
  const sortedPlayers = [...activePlayers].sort((a, b) => b.score - a.score);

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
      const answerTimestamp = Date.now();
      const answerTimeMs = questionStartTime
        ? Math.max(answerTimestamp - questionStartTime, 0)
        : 0;
      try {
        await updateDoc(playerDocRef, {
          lastAnswer: answer,
          answerTimestamp,
        });
        setSelectedAnswer(answer);
        achievementBus.emit({
          type: "QUESTION_ANSWERED",
          data: {
            userId,
            gameId: gameCode,
            correct: answer === currentQuestion.correctAnswer,
            answerTimeMs,
          },
        });
      } catch (e) {
        console.error("❌ Error submitting answer:", e);
      }
    },
    [db, gameCode, userId, player, questionStartTime, currentQuestion]
  );

  if (!currentQuestion || !player) return null;

  const questionNumber = lobbyState.currentQuestionIndex + 1;
  const timeColor = timeRemaining <= 10 ? "text-red-500 animate-pulse" : "text-yellow-400";
  const answerRevealed = lobbyState?.answerRevealed || false;
  const isCorrect = player.lastAnswer === currentQuestion.correctAnswer;
  const rawTheme =
    currentQuestion?.topic ||
    currentQuestion?.theme ||
    lobbyState?.currentTheme ||
    lobbyState?.theme ||
    lobbyState?.topic ||
    "Stealth Mode";
  const currentTheme = typeof rawTheme === "string" ? rawTheme.trim() : "";
  const hasTheme = currentTheme.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-900 text-white px-4 py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center space-y-8 text-center">
        <div className="space-y-2">
          {/* <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.35em] text-purple-100/70">
            Player View
          </div> */}
          <h1 className="text-3xl md:text-4xl font-black">
            {player.name}
            <span className="ml-2 text-base font-semibold text-purple-100/80">
              • {player.score} pts
            </span>
            <div className="w-full my-2 border-t border-white/10">
            {hasTheme && (
              <div className="inline-flex items-center gap-2 mt-3 rounded-2xl border border-white/20 bg-white/5 px-4 py-1 text-base uppercase tracking-[0.25em] text-purple-100/70">
                <span className="text-yellow-200 font-semibold tracking-[0.25em]">Theme</span>
                <span className="text-white/90 font-semibold normal-case tracking-normal">{currentTheme}</span>
              </div>
            )}
            </div>
          </h1>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl shadow-2xl shadow-purple-900/40 w-full">
          <div className="flex items-center justify-center gap-5">
            <p className="text-sm uppercase tracking-[0.35em] text-purple-100/70">
              Question {questionNumber}
            </p>
          </div>
          <h2 className="mt-3 text-center text-2xl font-semibold leading-snug text-white md:text-3xl">
            {currentQuestion.question}
          </h2>
        </div>

        <div className="w-full rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur-2xl shadow-[0_25px_120px_-35px_rgba(124,58,237,0.75)]">
          <div className="grid gap-4 sm:grid-cols-2">
            {currentQuestion.options.map((option, i) => {
              const isSelected = selectedAnswer === option;
              const isLocked = !!player.lastAnswer;
              const isCorrectAnswer = option === currentQuestion.correctAnswer;

              let optionClasses = "border border-white/15 bg-white/10 text-white";

              if (isLocked && answerRevealed) {
                if (isSelected) {
                  optionClasses = isCorrect
                    ? "bg-green-400 text-slate-900 border-green-200/60 shadow-green-900/40"
                    : "bg-rose-500 text-white border-rose-200/60 shadow-rose-900/40";
                } else if (isCorrectAnswer) {
                  optionClasses = "bg-green-500/60 text-white border-green-200/60";
                } else {
                  optionClasses = "bg-white/5 text-white/50 border-white/5";
                }
              } else if (isLocked) {
                optionClasses = isSelected
                  ? "bg-yellow-300 text-slate-900 border-yellow-200 shadow-amber-900/40"
                  : "bg-white/5 text-white/50 border-white/10";
              } else if (isSelected) {
                optionClasses = "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-purple-900/40";
              }

              return (
                <button
                  key={i}
                  onClick={() => handleAnswerSubmit(option)}
                  disabled={isLocked}
                  className={`rounded-2xl px-5 py-6 text-lg font-semibold transition-all duration-200 shadow-xl hover:scale-[1.02] disabled:cursor-not-allowed disabled:hover:scale-100 ${optionClasses}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`text-6xl font-black ${timeColor}`}>{timeRemaining}s</div>

        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-lg font-semibold text-purple-100/80 backdrop-blur-2xl">
          {answerRevealed && player.lastAnswer && (
            <span className={isCorrect ? "text-green-300" : "text-rose-300"}>
              {isCorrect ? "✅ Correct!" : "❌ Incorrect"}
            </span>
          )}
          {!answerRevealed && player.lastAnswer && (
            <span className="text-amber-200">✅ Answer locked in. Waiting for reveal...</span>
          )}
          {!player.lastAnswer && (
            <span className="text-purple-200">Pick an option to lock in your answer!</span>
          )}
        </div>

        {answerRevealed && (
          <div className="w-full rounded-3xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl shadow-xl max-h-[300px] overflow-y-auto flex flex-col space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-purple-100/60 mb-2">
              Leaderboard
            </p>

            {sortedPlayers.map((p, i) => (
              <div
                key={p.id}
                className={`flex justify-between items-center text-sm px-3 py-2 rounded-xl ${
                  p.id === userId
                    ? "bg-purple-600/40 border border-purple-300/30"
                    : "bg-white/5 border border-white/10"
                }`}
              >
                <span className="font-medium">
                  {i + 1}. {p.name}
                </span>
                <span className="font-bold">{p.score}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-purple-100/60">Game Code: {gameCode}</p>
      </div>
    </div>
  );
}

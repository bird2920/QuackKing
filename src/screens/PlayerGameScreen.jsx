import React, { useState, useEffect, useCallback, useRef } from "react";
import { getPlayerDocPath } from "../helpers/firebasePaths";
import { updateDoc } from "firebase/firestore";
import { achievementBus } from "../services/achievements";
import QuackKingLogo from "../components/QuackKingLogo.jsx";

export default function PlayerGameScreen({ db, gameCode, lobbyState, players, currentQuestion, userId }) {
  const activePlayers = players.filter((p) => !p.isHost);
  const player = activePlayers.find((p) => p.id === userId);
  const [selectedAnswer, setSelectedAnswer] = useState(player?.lastAnswer || null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [shouldBounce, setShouldBounce] = useState(false);
  const [startCountdown, setStartCountdown] = useState(0);
  const [logoFailed, setLogoFailed] = useState(false);
  const questionStartTime = lobbyState?.currentQuestionStartTime ?? null;
  const sortedPlayers = [...activePlayers].sort((a, b) => b.score - a.score);
  const revealTime = lobbyState?.timerSettings?.revealTime ?? 30;
  const FIRST_QUESTION_DELAY_SECONDS = 3;
  const emittedAnswerRef = useRef(null);

  // 🧹 Reset local state when question changes
  useEffect(() => {
    if (!player || player.lastAnswer === null) {
      setSelectedAnswer(null);
    }
  }, [lobbyState?.currentQuestionIndex, player]);

  useEffect(() => {
    emittedAnswerRef.current = null;
  }, [lobbyState?.currentQuestionIndex]);

  // 🎯 Scroll bounce effect when reaching bottom without selection
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const isAtBottom = scrollPosition >= documentHeight - 10;

      if (isAtBottom && !selectedAnswer && !player?.lastAnswer) {
        setShouldBounce(true);
        setTimeout(() => setShouldBounce(false), 600);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedAnswer, player?.lastAnswer]);

  // ⏳ Countdown timer (smooth 0.1s updates)
  useEffect(() => {
    if (!lobbyState?.currentQuestionStartTime) return;

    const startTime = lobbyState.currentQuestionStartTime;
    const shouldDelay = lobbyState.currentQuestionIndex === 0 && !lobbyState.answerRevealed;
    const delayMs = shouldDelay ? FIRST_QUESTION_DELAY_SECONDS * 1000 : 0;
    const tick = () => {
      const elapsed = Date.now() - startTime - delayMs;
      const adjustedElapsedSeconds = Math.max(0, Math.floor(elapsed / 1000));
      const remaining = Math.max(0, revealTime - adjustedElapsedSeconds);
      setTimeRemaining(remaining);
    };

    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [
    lobbyState?.currentQuestionStartTime,
    lobbyState?.currentQuestionIndex,
    lobbyState?.answerRevealed,
    revealTime,
  ]);

  // 🚦 Pre-start countdown when the game begins so players can see it
  useEffect(() => {
    if (!lobbyState?.currentQuestionStartTime) {
      setStartCountdown(0);
      return;
    }
    const elapsed = Date.now() - lobbyState.currentQuestionStartTime;
    const initial = lobbyState.currentQuestionIndex === 0 && !lobbyState.answerRevealed
      ? Math.max(0, FIRST_QUESTION_DELAY_SECONDS - Math.floor(elapsed / 1000))
      : 0;
    setStartCountdown(initial);
    if (initial === 0) return;

    const interval = setInterval(() => {
      setStartCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    const timeout = setTimeout(() => setStartCountdown(0), initial * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [lobbyState?.currentQuestionStartTime, lobbyState?.currentQuestionIndex, lobbyState?.answerRevealed]);

  // 📝 Submit answer
  const handleAnswerSubmit = useCallback(
    async (answer) => {
      if (!db || !gameCode || !player) return;
      if (lobbyState?.answerRevealed || startCountdown > 0) return;
      if (answer === player.lastAnswer) return;

      const playerDocRef = getPlayerDocPath(db, gameCode, userId);
      const answerTimestamp = Date.now();
      try {
        await updateDoc(playerDocRef, {
          lastAnswer: answer,
          answerTimestamp,
        });
        setSelectedAnswer(answer);
      } catch (e) {
        console.error("❌ Error submitting answer:", e);
      }
    },
    [db, gameCode, userId, player, lobbyState?.answerRevealed, startCountdown]
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

  useEffect(() => {
    if (!answerRevealed || !player?.lastAnswer || !questionStartTime) return;
    const questionIndex = lobbyState?.currentQuestionIndex ?? 0;
    if (emittedAnswerRef.current === questionIndex) return;
    const answerTimestamp =
      typeof player.answerTimestamp === "number" ? player.answerTimestamp : Date.now();
    const answerTimeMs = Math.max(answerTimestamp - questionStartTime, 0);
    achievementBus.emit({
      type: "QUESTION_ANSWERED",
      data: {
        userId,
        gameId: gameCode,
        correct: player.lastAnswer === currentQuestion.correctAnswer,
        answerTimeMs,
      },
    });
    emittedAnswerRef.current = questionIndex;
  }, [
    answerRevealed,
    player?.lastAnswer,
    player?.answerTimestamp,
    questionStartTime,
    lobbyState?.currentQuestionIndex,
    currentQuestion?.correctAnswer,
    gameCode,
    userId,
  ]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-900 text-white px-4 py-6 sm:py-10">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 pointer-events-none select-none drop-shadow-[0_12px_35px_rgba(0,0,0,0.35)]">
        {!logoFailed ? (
          <img
            src="/QuackKing.svg"
            alt="QuackKing logo"
            onError={() => setLogoFailed(true)}
            className="w-[4.1rem] sm:w-[5.1rem]"
          />
        ) : (
          <QuackKingLogo className="text-xl sm:text-2xl font-black" />
        )}
      </div>
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center space-y-6 sm:space-y-8 text-center">
        <div className="space-y-1.5">
          {/* <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.35em] text-purple-100/70">
            Player View
          </div> */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black">
            {player.name}
            <span className="ml-2 text-sm sm:text-base font-semibold text-purple-100/80">
              • {player.score} pts
            </span>
            <div className="w-full my-1.5 border-t border-white/10">
            {hasTheme && (
              <div className="inline-flex items-center gap-2 mt-3 rounded-2xl border border-white/20 bg-white/5 px-3 py-1 text-xs sm:text-sm uppercase tracking-[0.25em] text-purple-100/70">
                <span className="text-yellow-200 font-semibold tracking-[0.25em]">Theme</span>
                <span className="text-white/90 font-semibold normal-case tracking-normal">{currentTheme}</span>
              </div>
            )}
            </div>
          </h1>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur-2xl shadow-2xl shadow-purple-900/40 w-full">
          {startCountdown > 0 && (
            <div className="mb-3 rounded-2xl border border-yellow-300/40 bg-yellow-200/10 px-4 py-3 text-yellow-100 font-semibold">
              Game starting in <span className="text-yellow-300 text-xl sm:text-2xl font-black">{startCountdown}s</span> — get ready!
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.8rem] sm:text-sm uppercase tracking-[0.35em] text-purple-100/70">
              Question {questionNumber}
            </p>
            <div className={`text-3xl sm:text-4xl font-black ${timeColor}`}>{timeRemaining}s</div>
          </div>
          <h2 className="mt-2 text-center text-xl sm:text-2xl md:text-3xl font-semibold leading-relaxed text-white">
            {currentQuestion.question}
          </h2>
        </div>

        <div className={`w-full rounded-3xl border border-white/5 bg-white/5 p-4 sm:p-6 backdrop-blur-2xl shadow-[0_25px_120px_-35px_rgba(124,58,237,0.75)] transition-transform duration-150 ${shouldBounce ? 'animate-bounce-hint' : ''}`}>
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            {currentQuestion.options.map((option, i) => {
              const isSelected = selectedAnswer === option;
              const isLocked = answerRevealed || startCountdown > 0;
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
                  className={`rounded-xl px-4 py-4 text-base sm:text-lg font-semibold leading-tight transition-all duration-200 shadow-xl hover:scale-[1.02] disabled:cursor-not-allowed disabled:hover:scale-100 ${optionClasses}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

          {!answerRevealed && player.lastAnswer && (
            <span className="text-xs sm:text-sm text-amber-200">✅ Answer saved. You can still change it before reveal.</span>
          )}

        {answerRevealed && (
          <div className="w-full rounded-3xl border border-white/10 bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xl shadow-xl max-h-[280px] overflow-y-auto flex flex-col space-y-1.5 sm:space-y-2">
            <p className="text-[0.7rem] sm:text-xs uppercase tracking-[0.2em] text-purple-100/60 mb-1.5 sm:mb-2">
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

        <p className="text-xs sm:text-sm text-purple-100/60">Game Code: {gameCode}</p>
      </div>
    </div>
  );
}

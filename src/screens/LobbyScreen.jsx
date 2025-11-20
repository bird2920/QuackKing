import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { getGameDocPath, getPlayersCollectionPath, getPlayerDocPath } from "../helpers/firebasePaths";
import { parseCSV } from "../helpers/questionUtils";
import { requestAiQuestions, getAIStatus } from "../helpers/aiClient";
import { updateDoc, getDocs, writeBatch } from "firebase/firestore";
import QuestionsEditor from "../components/QuestionsEditor";
import PlayerAchievements from "../components/PlayerAchievements";
import { achievementBus, getAchievementService } from "../services/achievements";

const ACHIEVEMENT_ICON_MAP = {
  core_under_1s_correct: "⚡️",
  core_perfect_party_game: "🎉",
  core_first_game_created: "🚀",
  core_first_game_joined: "🙌",
  core_five_perfect_games: "💯",
  core_clutch_answer: "🏁",
  core_lightning_round: "🌩️",
  core_comeback_kid: "📈",
  core_party_starter: "🎊",
  core_scholar_mode_activated: "📚",
};

const THEME_SUGGESTION_POOL = [
  "World Capitals",
  "90s Cartoons",
  "Space Race",
  "Food Trivia",
  "Pop Culture",
  "Video Games",
  "Mythical Creatures",
  "Sports Legends",
  "Movie Soundtracks",
  "Science Fair Winners",
];

// Lobby screen allows host to upload or generate questions and start game.
export default function LobbyScreen({ db, gameCode, lobbyState, players, userId, isHost }) {
  const [csvText, setCsvText] = useState("");
  const [generatorTopic, setGeneratorTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [topicStatus, setTopicStatus] = useState("idle");
  const [topicMessage, setTopicMessage] = useState("");
  const [localUserAchievements, setLocalUserAchievements] = useState([]);
  // Ref for auto-scrolling/focusing the QuestionsEditor after questions load
  const editorRef = useRef(null);

  const questionCount = lobbyState?.questions?.length || 0;
  const aiStatus = useMemo(() => getAIStatus(), []);
  const aiEnabled = aiStatus.isEnabled;
  const achievementService = useMemo(() => getAchievementService(), []);
  const aiUnavailableMessage = useMemo(() => {
    if (aiEnabled) return "";
    switch (aiStatus.reason) {
      case "missing-configuration":
        return "Add a Gemini API key or AI proxy URL to enable automatic question generation.";
      default:
        return "AI question generator is currently unavailable. You can still upload CSV questions.";
    }
  }, [aiEnabled, aiStatus.reason]);
  const playerRecord = players.find((p) => p.id === userId);
  const playerSuggestion = playerRecord?.topicSuggestion || "";
  const hostThemeSuggestions = useMemo(() => {
    const shuffled = [...THEME_SUGGESTION_POOL];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 5);
  }, []);
  const localRecentAchievements = useMemo(() => {
    if (!localUserAchievements.length) return [];
    return [...localUserAchievements]
      .sort((a, b) => {
        const aTime = a.unlock?.timestamp || 0;
        const bTime = b.unlock?.timestamp || 0;
        return bTime - aTime;
      })
      .slice(0, 6)
      .map((entry) => ({
        id: entry.achievement.id,
        label: entry.achievement.name,
        shortLabel:
          entry.achievement.name.length > 18
            ? `${entry.achievement.name.slice(0, 18).trim()}…`
            : entry.achievement.name,
        description: entry.achievement.description,
        icon: ACHIEVEMENT_ICON_MAP[entry.achievement.id],
        unlockedAt: entry.unlock?.timestamp || null,
      }));
  }, [localUserAchievements]);

  useEffect(() => {
    setTopicInput(playerSuggestion);
  }, [playerSuggestion]);

  useEffect(() => {
    if (!userId) {
      setLocalUserAchievements([]);
      return;
    }

    let isActive = true;
    const syncAchievements = () => {
      try {
        const unlocked = achievementService.getAchievementsForUser(userId);
        if (isActive) {
          setLocalUserAchievements(unlocked);
        }
      } catch (err) {
        console.error("Failed to load achievements:", err);
      }
    };

    syncAchievements();

    const eventTypes = ["GAME_CREATED", "GAME_JOINED", "GAME_FINISHED", "QUESTION_ANSWERED"];
    const unsubscribes = eventTypes.map((eventType) =>
      achievementBus.on(eventType, (event) => {
        if (event.data.userId !== userId) return;
        syncAchievements();
      })
    );

    return () => {
      isActive = false;
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [achievementService, userId]);

  // 🏁 Start Game (host only)
  const handleStartGame = useCallback(async () => {
    if (!isHost || !db || !lobbyState) return;

    if (lobbyState.questions.length === 0) {
      setError("You must upload or generate questions first.");
      return;
    }

    try {
      const gameDocRef = getGameDocPath(db, gameCode);

      // Reset player answers and scores
      const playersColRef = getPlayersCollectionPath(db, gameCode);
      const playerDocs = await getDocs(playersColRef);
      if (!playerDocs.empty) {
        const batch = writeBatch(db);
        playerDocs.docs.forEach((docSnap) =>
          batch.update(docSnap.ref, {
            lastAnswer: null,
            score: 0,
            answerTimestamp: null,
          })
        );
        await batch.commit();
      }

      // Start game
      await updateDoc(gameDocRef, {
        status: "PLAYING",
        currentQuestionIndex: 0,
        currentQuestionStartTime: Date.now(),
      });
    } catch (e) {
      console.error("❌ Error starting game:", e);
      setError(`Failed to start game: ${e.message}`);
    }
  }, [db, gameCode, isHost, lobbyState]);

  // 📄 Upload CSV Questions
  const handleCSVUpload = useCallback(async () => {
    setError("");
    const questions = parseCSV(csvText);

    if (questions.length === 0) {
      setError('Could not parse any valid questions. Format: "Question","Answer","Opt1","Opt2","Opt3"');
      return;
    }

    try {
      const gameDocRef = getGameDocPath(db, gameCode);
      await updateDoc(gameDocRef, {
        questions,
        status: "UPLOAD",
      });
      // Defer scroll slightly to allow React + Firestore snapshot to render editor
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
    } catch (e) {
      console.error("Error saving questions:", e);
      setError(`Upload failed: ${e.message}`);
    }
  }, [csvText, db, gameCode]);

  // 🤖 AI Generate Questions
  const handleGenerateQuestions = useCallback(
    async (topicOverride) => {
      const rawTopic = typeof topicOverride === "string" ? topicOverride : generatorTopic;
      const topic = rawTopic.trim();
      if (!db || !gameCode || !isHost || !topic) return;
      if (!aiEnabled) {
        setError(aiUnavailableMessage || "AI generator unavailable. Please upload questions manually.");
        return;
      }

      setIsGenerating(true);
      setError("");

      try {
        const aiQuestions = await requestAiQuestions(topic);
        if (!aiQuestions.length) {
          throw new Error("AI returned empty response.");
        }

        const timestamp = Date.now();
        const formatted = aiQuestions
          .map((q, i) => {
            if (!q.options || q.options.length !== 4) return null;
            return {
              id: `ai-${timestamp}-${i}`,
              question: q.question,
              correctAnswer: q.correctAnswer,
              options: shuffle([...q.options]),
            };
          })
          .filter(Boolean);

        if (formatted.length === 0) {
          throw new Error("AI did not provide any usable questions.");
        }

        const gameDocRef = getGameDocPath(db, gameCode);
        await updateDoc(gameDocRef, { questions: formatted, status: "UPLOAD" });
        setCsvText("");
        setGeneratorTopic(topicOverride ? topic : "");
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 150);
      } catch (e) {
        console.error("AI generation failed:", e);
        const friendlyMessage =
          e.code === "AI_DISABLED"
            ? "AI generator is disabled. Upload CSV questions instead."
            : `Failed to generate questions: ${e.message}`;
        setError(friendlyMessage);
      } finally {
        setIsGenerating(false);
      }
    },
    [aiEnabled, aiUnavailableMessage, db, gameCode, generatorTopic, isHost]
  );

  // 🔀 Simple shuffle
  const shuffle = (array) => array.sort(() => Math.random() - 0.5);

  // 💡 Player topic suggestion
  const handleSubmitSuggestion = useCallback(async () => {
    if (isHost || !db || !userId || !gameCode || !topicInput.trim()) return;
    setTopicStatus("saving");
    setTopicMessage("");
    try {
      const playerDocRef = getPlayerDocPath(db, gameCode, userId);
      await updateDoc(playerDocRef, {
        topicSuggestion: topicInput.trim(),
        topicSuggestionTimestamp: Date.now(),
      });
      setTopicStatus("success");
      setTopicMessage("Sent! Host can see your idea.");
    } catch (e) {
      console.error("❌ Error saving topic suggestion:", e);
      setTopicStatus("error");
      setTopicMessage("Couldn't send that. Please try again.");
    }
  }, [db, gameCode, isHost, topicInput, userId]);

  // 💾 Save edited questions from QuestionsEditor
  const handleSaveQuestions = useCallback(async (updatedQuestions) => {
    try {
      const gameDocRef = getGameDocPath(db, gameCode);
      await updateDoc(gameDocRef, { questions: updatedQuestions });
      setError("");
    } catch (e) {
      console.error("Error saving edited questions:", e);
      setError(`Failed to save: ${e.message}`);
    }
  }, [db, gameCode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-900 text-white px-4 py-10">
      <div className="w-full max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-purple-200/70">Game Lobby</p>
          <h2 className="text-4xl md:text-5xl font-extrabold">
            Code: <span className="text-yellow-300">{gameCode}</span>
          </h2>
          <p className="text-base text-purple-100/80">
            Ask players to join with the code above or share the invite link below.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="space-y-6">
            {isHost ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-2xl shadow-purple-900/30">
                    <div className="p-6 space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-yellow-200/80 flex items-center gap-2">
                          <span role="img" aria-label="sparkles">✨</span>
                          AI Question Generator
                        </p>
                        <h3 className="text-2xl font-bold mt-2">Create themed questions</h3>
                        <p className="text-sm text-purple-100/70">
                          Drop a theme and we&apos;ll spin up five multiple-choice questions.
                        </p>
                      </div>
                      {aiEnabled ? (
                        <>
                          <input
                            type="text"
                            value={generatorTopic}
                            onChange={(e) => setGeneratorTopic(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && generatorTopic.trim()) {
                                handleGenerateQuestions();
                              }
                            }}
                            disabled={isGenerating}
                            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-purple-100/60 focus:outline-none focus:ring-2 focus:ring-yellow-300/70 disabled:opacity-50"
                            placeholder="e.g., Science, History, Pop Culture..."
                          />
                          <button
                            onClick={handleGenerateQuestions}
                            disabled={!generatorTopic.trim() || isGenerating}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 font-semibold text-white shadow-lg shadow-purple-900/40 transition hover:from-purple-400 hover:to-pink-400 disabled:opacity-50"
                          >
                            {isGenerating ? (
                              <>
                                <span role="img" aria-label="magic" className="animate-spin">✨</span>
                                Generating...
                              </>
                            ) : (
                              <>
                                <span role="img" aria-label="wand">🔮</span>
                                Generate Questions
                              </>
                            )}
                          </button>
                          <div>
                            <p className="text-xs uppercase tracking-[0.35em] text-purple-100/80 mt-4 mb-2">
                              Quick ideas
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {hostThemeSuggestions.map((idea) => (
                                <button
                                  key={idea}
                                  onClick={() => setGeneratorTopic(idea)}
                                  disabled={isGenerating}
                                  className="px-3 py-1 text-xs rounded-full border border-white/15 bg-white/5 text-white hover:border-yellow-300 disabled:opacity-40"
                                >
                                  {idea}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100">
                          <p className="font-semibold mb-1">AI Generator Disabled</p>
                          <p>{aiUnavailableMessage}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-2xl shadow-purple-900/30">
                    <div className="p-6 space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-blue-200/80 flex items-center gap-2">
                          <span role="img" aria-label="clipboard">📋</span>
                          Manual Questions
                        </p>
                        <h3 className="text-2xl font-bold mt-2">Paste CSV rows</h3>
                        <p className="text-sm text-purple-100/70">
                          Format: Question, Answer, Option1, Option2, Option3.
                        </p>
                      </div>
                      <textarea
                        value={csvText}
                        onChange={(e) => setCsvText(e.target.value)}
                        placeholder={'Q: What is 2+2?,4,2,3,5'}
                        className="w-full min-h-[130px] rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 font-mono text-sm text-white placeholder:text-purple-200/60 focus:outline-none focus:ring-2 focus:ring-blue-300/60 resize-none"
                      />
                      <button
                        onClick={handleCSVUpload}
                        disabled={!csvText.trim()}
                        className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:from-blue-400 hover:to-cyan-400 disabled:opacity-50"
                      >
                        Upload {csvText.split("\n").filter((l) => l.trim()).length} Questions
                      </button>
                      <p className="text-xs text-purple-100/60">
                        Tip: copy rows straight from Sheets/Excel and drop them here.
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-rose-400/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {error}
                  </div>
                )}

                <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-6 space-y-4 shadow-2xl shadow-purple-900/40">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Share + Start</p>
                    <h4 className="text-2xl font-semibold mt-1">Ready to play?</h4>
                    <p className="text-sm text-purple-100/70">
                      {questionCount > 0
                        ? `You have ${questionCount} question${questionCount === 1 ? "" : "s"} loaded.`
                        : "Upload or generate questions to unlock the start button."}
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      onClick={handleStartGame}
                      disabled={questionCount === 0 || players.length < 2}
                      className="flex items-center justify-center gap-2 rounded-xl bg-red-500/90 px-4 py-3 text-lg font-bold text-white shadow-lg shadow-red-900/40 transition hover:bg-red-400/90 disabled:opacity-50"
                    >
                      Start Game
                    </button>
                    <button
                      onClick={async () => {
                        if (!isHost || !db || !lobbyState) return;
                        if (lobbyState.questions.length === 0) {
                          setError("You must upload or generate questions first.");
                          return;
                        }
                        try {
                          const gameDocRef = getGameDocPath(db, gameCode);
                          const playersColRef = getPlayersCollectionPath(db, gameCode);
                          const playerDocs = await getDocs(playersColRef);
                          if (!playerDocs.empty) {
                            const batch = writeBatch(db);
                            playerDocs.docs.forEach((docSnap) =>
                              batch.update(docSnap.ref, {
                                lastAnswer: null,
                                score: 0,
                                answerTimestamp: null,
                              })
                            );
                            await batch.commit();
                          }
                          await updateDoc(gameDocRef, {
                            status: "PLAYING",
                            currentQuestionIndex: 0,
                            currentQuestionStartTime: Date.now(),
                          });
                          if (typeof window.setTestMode === "function") {
                            window.setTestMode(true);
                          }
                        } catch (e) {
                          console.error("❌ Error starting test mode:", e);
                          setError(`Failed to start test mode: ${e.message}`);
                        }
                      }}
                      disabled={questionCount === 0}
                      className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 text-lg font-semibold text-white transition hover:bg-slate-900 disabled:opacity-50"
                    >
                      Test Alone
                    </button>
                  </div>
                  {players.length < 2 && (
                    <p className="text-center text-sm text-amber-200">
                      Need at least 2 players to launch the real game.
                    </p>
                  )}
                  <CopyInviteButton gameCode={gameCode} />

                  <div className="pt-4 border-t border-white/10">
                    <button
                      onClick={() => window.open(`/#/spectator/${gameCode}`, "_blank")}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-purple-400/30 bg-purple-500/10 px-4 py-3 font-bold text-purple-200 transition hover:bg-purple-500/20 hover:border-purple-400/50"
                    >
                      <span className="text-xl">📺</span> Launch TV Mode
                    </button>
                    <p className="text-center text-xs text-purple-300/50 mt-2">
                      Open this on a big screen for players to watch!
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-4 shadow-2xl shadow-purple-900/30">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-yellow-200/80">Suggest a Theme</p>
                    <h3 className="text-2xl font-bold mt-1">Help the host pick a topic</h3>
                    <p className="text-sm text-purple-100/70">
                      Share your idea and they&apos;ll see it instantly.
                    </p>
                  </div>
                  <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value.slice(0, 40))}
                    placeholder="e.g., World Capitals, 90s Throwbacks..."
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-purple-100/60 focus:outline-none focus:ring-2 focus:ring-yellow-300/70"
                    disabled={topicStatus === "saving"}
                  />
                  <button
                    onClick={handleSubmitSuggestion}
                    disabled={!topicInput.trim() || topicStatus === "saving"}
                    className="w-full rounded-xl bg-gradient-to-r from-yellow-400 to-orange-400 px-4 py-3 font-semibold text-gray-900 shadow-lg shadow-amber-800/40 transition hover:from-yellow-300 hover:to-orange-300 disabled:opacity-50"
                  >
                    {topicStatus === "saving" ? "Sending..." : "Send to Host"}
                  </button>
                  {topicMessage && (
                    <p className={`text-sm ${topicStatus === "error" ? "text-rose-200" : "text-green-200"}`}>
                      {topicMessage}
                    </p>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-purple-100/80 mb-2">Quick ideas</p>
                    <div className="flex flex-wrap gap-2">
                      {THEME_SUGGESTION_POOL.map((idea) => (
                        <button
                          key={idea}
                          onClick={() => setTopicInput(idea)}
                          className="px-3 py-1 text-xs rounded-full border border-white/15 bg-white/5 text-white hover:border-yellow-300"
                        >
                          {idea}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 text-sm text-purple-100/80">
                  Host is preparing questions. Hang tight, share suggestions, or hype up the lobby!
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-2xl shadow-black/40 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-white/10">
              <p className="text-xs uppercase tracking-[0.35em] text-purple-200/70">Squad</p>
              <h3 className="text-2xl font-bold">Players ({players.length})</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {players.map((p) => {
                const suggestion = (p.topicSuggestion || "").trim();
                return (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-inner shadow-black/20 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-white truncate">{p.name}</span>
                      <div className="flex gap-2 text-xs font-semibold uppercase tracking-wide">
                        {p.isHost && <span className="text-purple-300">Host</span>}
                        {p.id === userId && <span className="text-green-300">You</span>}
                      </div>
                    </div>
                    {p.id === userId && (
                      <PlayerAchievements playerId={p.id} recentAchievements={localRecentAchievements} />
                    )}
                    {suggestion && (
                      <div className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm">
                        <div className="text-[0.6rem] uppercase tracking-[0.3em] text-purple-200/70 mb-1">
                          Suggested Theme
                        </div>
                        <p className="text-white break-words">{suggestion}</p>
                        {isHost && (
                          <button
                            // Set the generator topic to the suggested theme, then auto-generate.
                            onClick={() => {
                              setGeneratorTopic(suggestion);
                              void handleGenerateQuestions(suggestion);
                            }}
                            className="mt-2 text-xs font-semibold text-yellow-200 hover:text-yellow-100"
                          >
                            Use Theme
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {isHost && players.length === 1 && (
              <p className="border-t border-white/10 p-4 text-center text-amber-200 text-sm animate-pulse">
                Waiting for players...
              </p>
            )}
          </div>
        </div>

        {isHost && questionCount > 0 && (
          <div ref={editorRef} className="w-full">
            <QuestionsEditor
              questions={lobbyState.questions}
              onSave={handleSaveQuestions}
              isHost={isHost}
            />
          </div>
        )}

        <p className="text-xs text-purple-100/60 text-center break-all">User ID: {userId}</p>
      </div>
    </div>
  );
}

// --- Copy Invite Button with confirmation ---
function CopyInviteButton({ gameCode }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator === "object" && typeof navigator.share === "function");
  }, []);

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/#/game/${gameCode}`;
  }, [gameCode]);

  const handleCopy = useCallback(() => {
    if (!inviteUrl) return;
    navigator.clipboard
      .writeText(inviteUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((e) => console.error("Copy failed:", e));
  }, [inviteUrl]);

  const handleShare = useCallback(async () => {
    if (!canShare || !inviteUrl) return;
    try {
      await navigator.share({
        title: "Join my trivia game",
        text: `Use code ${gameCode} to hop into the lobby!`,
        url: inviteUrl,
      });
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Share failed:", err);
      }
    }
  }, [canShare, gameCode, inviteUrl]);

  return (
    <div className="relative w-full mt-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={handleCopy}
          className="w-full sm:w-auto flex-1 p-3 bg-yellow-500 text-gray-900 font-bold rounded-xl hover:bg-yellow-400 transition"
        >
          Copy Invite Link
        </button>
        {canShare && (
          <button
            onClick={handleShare}
            className="w-full sm:w-auto flex-1 p-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition"
          >
            Share Invite
          </button>
        )}
      </div>
      {copied && (
        <div
          className="absolute inset-x-0 mx-auto mt-2 w-max px-4 py-1 rounded-lg bg-green-600 text-white text-sm font-semibold shadow-lg animate-fadeInOut"
          style={{
            top: "100%",
            pointerEvents: "none",
            transition: "opacity 0.5s",
          }}
        >
          <span role="img" aria-label="copied" className="mr-1">✅</span>
          Copied!
        </div>
      )}
      <style>
        {`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(5px);}
          15% { opacity: 1; transform: translateY(0);}
          85% { opacity: 1; transform: translateY(0);}
          100% { opacity: 0; transform: translateY(-5px);}
        }
        .animate-fadeInOut {
          animation: fadeInOut 2s both;
        }
        `}
      </style>
    </div>
  );
}

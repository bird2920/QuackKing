import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { getGameDocPath, getPlayersCollectionPath, getPlayerDocPath } from "../helpers/firebasePaths";
import { parseCSV } from "../helpers/questionUtils";
import { requestAiQuestions, getAIStatus } from "../helpers/aiClient";
import { updateDoc, getDocs, writeBatch } from "firebase/firestore";
import QuestionsEditor from "../components/QuestionsEditor";

// Lobby screen allows host to upload or generate questions and start game.
export default function LobbyScreen({ db, gameCode, lobbyState, players, userId, isHost }) {
  const [csvText, setCsvText] = useState("");
  const [generatorTopic, setGeneratorTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [topicStatus, setTopicStatus] = useState("idle");
  const [topicMessage, setTopicMessage] = useState("");
  const [questionInputTab, setQuestionInputTab] = useState("ai");
  // Ref for auto-scrolling/focusing the QuestionsEditor after questions load
  const editorRef = useRef(null);

  const questionCount = lobbyState?.questions?.length || 0;
  const aiStatus = useMemo(() => getAIStatus(), []);
  const aiEnabled = aiStatus.isEnabled;
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
  const suggestionIdeas = ["World Capitals", "90s Cartoons", "Space Race", "Food Trivia", "Pop Culture", "Video Games"];

  useEffect(() => {
    setTopicInput(playerSuggestion);
  }, [playerSuggestion]);

  useEffect(() => {
    if (!aiEnabled && questionInputTab === "ai") {
      setQuestionInputTab("csv");
    }
  }, [aiEnabled, questionInputTab]);

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
  const handleGenerateQuestions = useCallback(async () => {
    if (!db || !gameCode || !isHost || !generatorTopic.trim()) return;
    if (!aiEnabled) {
      setError(aiUnavailableMessage || "AI generator unavailable. Please upload questions manually.");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const aiQuestions = await requestAiQuestions(generatorTopic.trim());
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
      setGeneratorTopic("");
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
  }, [aiEnabled, aiUnavailableMessage, db, gameCode, generatorTopic, isHost]);

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
    <div className="min-h-screen bg-gray-900 text-white px-4 py-6 lg:py-8 flex flex-col items-center">
      <h2 className="text-4xl font-extrabold text-indigo-400 mb-2 text-center">
        Lobby: {gameCode}
      </h2>
      <p className="text-lg text-gray-300 mb-6 text-center">
        Ask players to join using this code.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-6xl flex-1 items-start">
        {/* 🧠 Host Controls */}
        <div
          className={`p-6 rounded-xl shadow-2xl flex flex-col h-full ${
            isHost
              ? "bg-purple-800 lg:max-h-[75vh] xl:max-h-[70vh]"
              : "bg-gray-800 lg:max-h-[75vh] xl:max-h-[70vh]"
          }`}
        >
          <h3 className="text-2xl font-bold mb-4 border-b pb-2">
            {isHost ? "Host Controls" : "Waiting for Host..."}
          </h3>

          {isHost ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="space-y-5 overflow-y-auto pr-1 flex-1 min-h-0">
                {/* ✨ Question Input Modes */}
                <div className="bg-gray-900/40 rounded-lg border border-purple-600 overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    <button
                      onClick={() => aiEnabled && setQuestionInputTab("ai")}
                      disabled={!aiEnabled}
                      className={`flex-1 px-4 py-2 text-sm font-semibold tracking-wide border-b sm:border-b-0 sm:border-r border-purple-700/60 transition ${
                        questionInputTab === "ai"
                          ? "bg-purple-700 text-white"
                          : "text-gray-300 hover:text-white"
                      } ${!aiEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      AI Generation
                    </button>
                    <button
                      onClick={() => setQuestionInputTab("csv")}
                      className={`flex-1 px-4 py-2 text-sm font-semibold tracking-wide transition ${
                        questionInputTab === "csv"
                          ? "bg-purple-700 text-white"
                          : "text-gray-300 hover:text-white"
                      }`}
                    >
                      Manual CSV Upload
                    </button>
                  </div>

                  <div className="p-4 sm:p-5 space-y-3">
                    {questionInputTab === "ai" && (
                      <>
                        {aiEnabled ? (
                          <>
                            <div>
                              <h4 className="text-lg font-bold text-yellow-300 mb-1">AI Question Generator</h4>
                              <p className="text-xs text-gray-200">
                                Drop a theme and we’ll create five multiple-choice questions for it.
                              </p>
                            </div>
                            <input
                              type="text"
                              value={generatorTopic}
                              onChange={(e) => setGeneratorTopic(e.target.value)}
                              disabled={isGenerating}
                              className="w-full p-2 bg-purple-600 border border-purple-500 rounded-lg text-white placeholder-gray-300"
                              placeholder="e.g., Space Exploration, The 90s, Food"
                            />
                            <button
                              onClick={handleGenerateQuestions}
                              disabled={!generatorTopic.trim() || isGenerating}
                              className="w-full p-2 bg-yellow-500 text-gray-900 font-bold rounded-lg hover:bg-yellow-600 transition disabled:opacity-50"
                            >
                              {isGenerating ? "Generating..." : "Generate Questions"}
                            </button>
                          </>
                        ) : (
                          <div className="text-sm text-gray-300">
                            <h4 className="text-lg font-bold text-white mb-1">AI Generator Disabled</h4>
                            <p>{aiUnavailableMessage}</p>
                          </div>
                        )}
                      </>
                    )}

                    {questionInputTab === "csv" && (
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-lg font-bold">Manual CSV Upload</h4>
                          <p className="text-xs text-gray-400">
                            Paste spreadsheet rows (Question, Answer, Option1, Option2, Option3).
                          </p>
                        </div>
                        <textarea
                          value={csvText}
                          onChange={(e) => setCsvText(e.target.value)}
                          placeholder='What is 2+2?,4,2,3,5'
                          className="w-full h-32 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm resize-none"
                        />
                        <button
                          onClick={handleCSVUpload}
                          disabled={!csvText.trim()}
                          className="w-full p-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition disabled:opacity-50"
                        >
                          Upload {csvText.split("\n").filter((l) => l.trim()).length} Questions
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* ⚠️ Error */}
                {error && (
                  <p className="text-red-300 text-sm italic">{error}</p>
                )}
              </div>

              {/* 🚀 Start + Share always visible */}
              <div className="border-t border-purple-600 pt-4 mt-4">
                <p className="font-semibold text-lg mb-2">
                  Questions Loaded:{" "}
                  <span className="text-yellow-300">{questionCount}</span>
                </p>
                <button
                  onClick={handleStartGame}
                  disabled={questionCount === 0 || players.length < 2}
                  className="w-full p-4 bg-red-500 text-white font-extrabold rounded-xl hover:bg-red-600 transition disabled:opacity-50"
                >
                  Start Game ({questionCount} Qs)
                </button>
                {players.length < 2 && (
                  <p className="text-yellow-300 text-sm text-center pt-2">
                    Need at least 2 players.
                  </p>
                )}
                <button
                  onClick={async () => {
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
                      // Start game in testMode
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
                  className="w-full mt-2 p-4 bg-gray-700 text-white font-bold rounded-xl hover:bg-gray-900 transition disabled:opacity-50"
                >
                  Test Alone ({questionCount} Qs)
                </button>
                <CopyInviteButton gameCode={gameCode} />
              </div>
            </div>
          ) : (
            <div className="space-y-5 overflow-y-auto pr-1">
              <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-4 shadow-inner">
                <h4 className="text-lg font-bold text-white mb-1">Suggest a Trivia Theme</h4>
                <p className="text-sm text-gray-300 mb-3">
                  Help the host pick questions by sharing a topic idea. They&rsquo;ll see it instantly.
                </p>
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value.slice(0, 40))}
                  placeholder="e.g., World Capitals, 90s Throwbacks..."
                  className="w-full p-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 mb-3"
                  disabled={topicStatus === "saving"}
                />
                <button
                  onClick={handleSubmitSuggestion}
                  disabled={!topicInput.trim() || topicStatus === "saving"}
                  className="w-full p-3 rounded-lg bg-yellow-500 text-gray-900 font-bold hover:bg-yellow-400 disabled:opacity-50"
                >
                  {topicStatus === "saving" ? "Sending..." : "Send to Host"}
                </button>
                {topicMessage && (
                  <p
                    className={`mt-2 text-sm ${
                      topicStatus === "error" ? "text-red-300" : "text-green-300"
                    }`}
                  >
                    {topicMessage}
                  </p>
                )}
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Quick ideas</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestionIdeas.map((idea) => (
                      <button
                        key={idea}
                        onClick={() => setTopicInput(idea)}
                        className="px-3 py-1 text-xs rounded-full bg-gray-800 text-gray-200 border border-gray-700 hover:border-yellow-400"
                      >
                        {idea}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-gray-900/20 rounded-xl p-4 border border-gray-800">
                <p className="text-sm text-gray-300">
                  Host is getting the questions ready. Hang tight, share a suggestion above, or hype up your friends!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 👥 Player List */}
        <div className="lg:col-span-2 p-6 bg-gray-800 rounded-xl shadow-2xl flex flex-col h-full lg:max-h-[75vh] xl:max-h-[70vh]">
          <h3 className="text-2xl font-bold mb-4 border-b border-gray-600 pb-2">
            Players ({players.length})
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {players.map((p) => {
              const suggestion = (p.topicSuggestion || "").trim();
              return (
                <div
                  key={p.id}
                  className="bg-gray-700 p-3 rounded-lg shadow-md flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-white flex-grow truncate">
                      {p.name}
                    </span>
                    <div className="flex gap-2 flex-shrink-0">
                      {p.isHost && (
                        <span className="text-sm font-semibold text-purple-400">
                          HOST
                        </span>
                      )}
                      {p.id === userId && (
                        <span className="text-sm font-semibold text-green-400">
                          (You)
                        </span>
                      )}
                    </div>
                  </div>
                  {suggestion && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-gray-800/60 px-3 py-2">
                      <div className="text-sm text-gray-200">
                        <span className="text-xs uppercase tracking-wide text-gray-400 mr-2">
                          Suggested Theme
                        </span>
                        <span className="font-semibold text-white break-words">
                          {suggestion}
                        </span>
                      </div>
                      {isHost && (
                        <button
                          onClick={() => setGeneratorTopic(suggestion)}
                          className="self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-lg bg-yellow-500 text-gray-900 hover:bg-yellow-400"
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
            <p className="text-yellow-400 mt-4 text-center text-lg animate-pulse">
              Waiting for players...
            </p>
          )}
        </div>
      </div>

      {/* 📝 Questions Editor - shown after questions are loaded */}
      {isHost && questionCount > 0 && (
        <div ref={editorRef} className="w-full">
          <QuestionsEditor
            questions={lobbyState.questions}
            onSave={handleSaveQuestions}
            isHost={isHost}
          />
        </div>
      )}

      <p className="mt-8 text-xs text-gray-500 text-center break-all">
        User ID: {userId}
      </p>
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

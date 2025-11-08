import React, { useState, useCallback } from "react";
import { getGameDocPath, getPlayersCollectionPath } from "../helpers/firebasePaths";
import { parseCSV } from "../helpers/questionUtils";
import { callGeminiApi, QUESTION_SCHEMA } from "../helpers/geminiService";
import { updateDoc, getDocs } from "firebase/firestore";
import QuestionsEditor from "../components/QuestionsEditor";

// Lobby screen allows host to upload or generate questions and start game.
export default function LobbyScreen({ db, gameCode, lobbyState, players, userId, isHost }) {
  const [csvText, setCsvText] = useState("");
  const [generatorTopic, setGeneratorTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const questionCount = lobbyState?.questions?.length || 0;
  const hasGeminiKey = typeof window.GEMINI_API_KEY === "string" && window.GEMINI_API_KEY.trim() !== "";

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
      await Promise.all(
        playerDocs.docs.map((docSnap) =>
          updateDoc(docSnap.ref, {
            lastAnswer: null,
            score: 0,
            answerTimestamp: null,
          })
        )
      );

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
    } catch (e) {
      console.error("Error saving questions:", e);
      setError(`Upload failed: ${e.message}`);
    }
  }, [csvText, db, gameCode]);

  // 🤖 AI Generate Questions
  const handleGenerateQuestions = useCallback(async () => {
    if (!db || !gameCode || !isHost || !generatorTopic.trim()) return;

    setIsGenerating(true);
    setError("");

    const systemPrompt =
      "You are a trivia generator. Produce 5 multiple-choice questions for the given topic. Each must have 1 correct answer and 3 plausible distractors. Return valid JSON matching the schema.";
    const userQuery = `Generate 5 trivia questions about "${generatorTopic.trim()}".`;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: QUESTION_SCHEMA,
      },
    };

    try {
      const jsonString = await callGeminiApi(payload);
      const generated = JSON.parse(jsonString);

      if (!Array.isArray(generated) || generated.length === 0)
        throw new Error("Invalid or empty response from Gemini.");

      const formatted = generated
        .map((q, i) => {
          const options = [q.correctAnswer, q.distractor1, q.distractor2, q.distractor3].filter(Boolean);
          if (options.length !== 4) return null;
          return {
            id: `llm-${i}`,
            question: q.question,
            correctAnswer: q.correctAnswer,
            options: shuffle(options),
          };
        })
        .filter(Boolean);

      const gameDocRef = getGameDocPath(db, gameCode);
      await updateDoc(gameDocRef, { questions: formatted, status: "UPLOAD" });
      setCsvText("");
      setGeneratorTopic("");
    } catch (e) {
      console.error("Gemini generation failed:", e);
      setError(`Failed to generate questions: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [db, gameCode, isHost, generatorTopic]);

  // 🔀 Simple shuffle
  const shuffle = (array) => array.sort(() => Math.random() - 0.5);

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
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center">
      <h2 className="text-4xl font-extrabold text-indigo-400 mb-2 text-center">
        Lobby: {gameCode}
      </h2>
      <p className="text-lg text-gray-300 mb-6 text-center">
        Ask players to join using this code.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {/* 🧠 Host Controls */}
        <div
          className={`p-6 rounded-xl shadow-2xl ${
            isHost ? "bg-purple-800" : "bg-gray-800"
          }`}
        >
          <h3 className="text-2xl font-bold mb-4 border-b pb-2">
            {isHost ? "Host Controls" : "Waiting for Host..."}
          </h3>

          {isHost && (
            <div className="space-y-5">
              {/* ✨ AI Generator - Only show if API key is configured */}
              {hasGeminiKey && (
                <div className="bg-purple-700 p-4 rounded-lg shadow-inner">
                  <h4 className="text-lg font-bold text-yellow-300 mb-1">
                    AI Question Generator
                  </h4>
                  <p className="text-xs text-gray-200 mb-2">
                    Enter a topic and auto-generate trivia.
                  </p>
                  <input
                    type="text"
                    value={generatorTopic}
                    onChange={(e) => setGeneratorTopic(e.target.value)}
                    disabled={isGenerating}
                    className="w-full p-2 mb-2 bg-purple-600 border border-purple-500 rounded-lg text-white placeholder-gray-300"
                    placeholder="e.g., Space Exploration, The 90s, Food"
                  />
                  <button
                    onClick={handleGenerateQuestions}
                    disabled={!generatorTopic.trim() || isGenerating}
                    className="w-full p-2 bg-yellow-500 text-gray-900 font-bold rounded-lg hover:bg-yellow-600 transition disabled:opacity-50"
                  >
                    {isGenerating ? "Generating..." : "Generate 5 Questions"}
                  </button>
                </div>
              )}

              {/* 📄 CSV Upload */}
              <div className={hasGeminiKey ? "border-t border-purple-600 pt-4" : ""}>
                <h4 className="text-lg font-bold mb-2">Manual CSV Upload</h4>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder='Paste CSV data here (e.g. "Question,Answer,Option1,Option2,Option3")'
                  className="w-full h-32 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm resize-none"
                />
                <button
                  onClick={handleCSVUpload}
                  disabled={!csvText.trim()}
                  className="w-full mt-2 p-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition disabled:opacity-50"
                >
                  Upload {csvText.split("\n").filter((l) => l.trim()).length} Questions
                </button>
              </div>

              {/* ⚠️ Error */}
              {error && (
                <p className="text-red-300 text-sm italic">{error}</p>
              )}

              {/* 🚀 Start Game */}
              <div className="border-t border-purple-600 pt-4">
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
                      await Promise.all(
                        playerDocs.docs.map((docSnap) =>
                          updateDoc(docSnap.ref, {
                            lastAnswer: null,
                            score: 0,
                            answerTimestamp: null,
                          })
                        )
                      );
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
                <button
                  onClick={() => {
                    const inviteUrl = `${window.location.origin}/#/game/${gameCode}`;
                    navigator.clipboard
                      .writeText(inviteUrl)
                      .then(() => console.log("Copied invite link:", inviteUrl))
                      .catch((e) => console.error("Copy failed:", e));
                  }}
                  className="w-full mt-3 p-3 bg-yellow-500 text-gray-900 font-bold rounded-xl hover:bg-yellow-400 transition"
                >
                  Copy Invite Link
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 👥 Player List */}
        <div className="lg:col-span-2 p-6 bg-gray-800 rounded-xl shadow-2xl">
          <h3 className="text-2xl font-bold mb-4 border-b border-gray-600 pb-2">
            Players ({players.length})
          </h3>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-gray-700 p-3 rounded-lg shadow-md"
              >
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
            ))}
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
        <QuestionsEditor
          questions={lobbyState.questions}
          onSave={handleSaveQuestions}
          isHost={isHost}
        />
      )}

      <p className="mt-8 text-xs text-gray-500 text-center break-all">
        User ID: {userId}
      </p>
    </div>
  );
}
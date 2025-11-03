import React, { useState, useEffect, useCallback, useMemo } from "react";
import { HashRouter, Routes, Route, useParams } from "react-router-dom";
import { onSnapshot, getDoc, setDoc } from "firebase/firestore";

// 🔧 Helper Imports
import { useFirebase } from "./helpers/useFirebase";
import {
  getGameDocPath,
  getPlayersCollectionPath,
  getPlayerDocPath,
} from "./helpers/firebasePaths";
import { generateGameCode } from "./helpers/codeUtils";

// 🎨 Pages
import LandingPage from "../LandingPage";

// 🧠 Screens
import HomeScreen from "./screens/HomeScreen";
import LobbyScreen from "./screens/LobbyScreen";
import HostGameScreen from "./screens/HostGameScreen";
import PlayerGameScreen from "./screens/PlayerGameScreen";
import ResultsScreen from "./screens/ResultsScreen";

// 🎮 Game Component (handles game state & logic)
function TriviaGame({ prefillFromRoute }) {
  const params = prefillFromRoute ? useParams() : {};
  const { db, userId, isLoading } = useFirebase();

  const [gameCode, setGameCode] = useState("");
  const [lobbyState, setLobbyState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [screenName, setScreenName] = useState("");
  const [mode, setMode] = useState("HOME"); // HOME, LOBBY, GAME, RESULTS

  const isHost = useMemo(() => lobbyState?.hostUserId === userId, [lobbyState, userId]);

  // 📡 Firestore Listeners (Game + Players)
  useEffect(() => {
    if (!db || !gameCode) return;

    const gameDocRef = getGameDocPath(db, gameCode);
    const unsubGame = onSnapshot(
      gameDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setLobbyState(docSnap.data());
          if (mode === "HOME") setMode("LOBBY");
        } else {
          // Game deleted by host
          console.log("⚠️ Game ended by host.");
          setLobbyState(null);
          setPlayers([]);
          setGameCode("");
          setMode("HOME");
        }
      },
      (error) => console.error("Error listening to game doc:", error)
    );

    const playersColRef = getPlayersCollectionPath(db, gameCode);
    const unsubPlayers = onSnapshot(
      playersColRef,
      (querySnap) => {
        const playerList = querySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPlayers(playerList.sort((a, b) => b.score - a.score));
      },
      (error) => console.error("Error listening to players:", error)
    );

    return () => {
      unsubGame();
      unsubPlayers();
    };
  }, [db, gameCode]);

  // 🧩 Game Setup
  const handleCreateGame = useCallback(async () => {
    if (!db || !userId || !screenName.trim()) return;
    const newCode = generateGameCode();
    const gameDocRef = getGameDocPath(db, newCode);

    try {
      await setDoc(gameDocRef, {
        gameCode: newCode,
        hostUserId: userId,
        status: "LOBBY",
        questions: [],
        currentQuestionIndex: -1,
        currentQuestionStartTime: null,
      });

      const playerDocRef = getPlayerDocPath(db, newCode, userId);
      await setDoc(playerDocRef, {
        name: screenName,
        score: 0,
        isHost: true,
        lastAnswer: null,
        timestamp: Date.now(),
      });

      setGameCode(newCode);
      setMode("LOBBY");
    } catch (err) {
      console.error("❌ Error creating game:", err);
    }
  }, [db, userId, screenName]);

  const handleJoinGame = useCallback(
    async (code) => {
      if (!db || !userId || !screenName.trim()) return;
      const normalized = code.toUpperCase();
      const gameDocRef = getGameDocPath(db, normalized);
      const snap = await getDoc(gameDocRef);

      if (!snap.exists()) {
        console.log("❌ Invalid or ended game code.");
        return;
      }

      const game = snap.data();
      if (!["LOBBY", "UPLOAD"].includes(game.status)) {
        console.log("🚫 Game already in progress.");
        return;
      }

      try {
        const playerDocRef = getPlayerDocPath(db, normalized, userId);
        await setDoc(playerDocRef, {
          name: screenName,
          score: 0,
          isHost: false,
          lastAnswer: null,
          timestamp: Date.now(),
        });

        setGameCode(normalized);
        setMode("LOBBY");
      } catch (err) {
        console.error("Error joining game:", err);
      }
    },
    [db, userId, screenName]
  );

  // 🕹️ Render Control
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p>Connecting to Firebase...</p>
      </div>
    );
  }

  const prefilledCode =
    prefillFromRoute && params?.code
      ? params.code.toUpperCase().substring(0, 4)
      : null;

  const currentQuestion = lobbyState?.questions?.[lobbyState.currentQuestionIndex];

  // 🏠 HOME
  if (mode === "HOME" || !userId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <HomeScreen
          onJoin={handleJoinGame}
          onCreate={handleCreateGame}
          screenName={screenName}
          setScreenName={setScreenName}
          prefilledCode={prefilledCode}
        />
      </div>
    );
  }

  // 🧑‍🤝‍🧑 LOBBY
  if (lobbyState?.status === "LOBBY" || lobbyState?.status === "UPLOAD") {
    return (
      <LobbyScreen
        db={db}
        gameCode={gameCode}
        lobbyState={lobbyState}
        players={players}
        userId={userId}
        isHost={isHost}
      />
    );
  }

  // 🎮 GAME (Host)
  if (lobbyState?.status === "PLAYING" && isHost) {
    return (
      <HostGameScreen
        db={db}
        gameCode={gameCode}
        lobbyState={lobbyState}
        players={players}
        currentQuestion={currentQuestion}
        userId={userId}
      />
    );
  }

  // 🎮 GAME (Player)
  if (lobbyState?.status === "PLAYING" && !isHost) {
    return (
      <PlayerGameScreen
        db={db}
        gameCode={gameCode}
        lobbyState={lobbyState}
        players={players}
        currentQuestion={currentQuestion}
        userId={userId}
      />
    );
  }

  // 🏁 RESULTS
  if (lobbyState?.status === "RESULTS") {
    return (
      <ResultsScreen
        db={db}
        gameCode={gameCode}
        players={players}
        isHost={isHost}
        setGameCode={setGameCode}
        setMode={setMode}
      />
    );
  }

  return null;
}

// 📱 Main App with Routing
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/game" element={<TriviaGame />} />
        <Route path="/game/:code" element={<TriviaGame prefillFromRoute={true} />} />
      </Routes>
    </HashRouter>
  );
}

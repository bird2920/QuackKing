import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { HashRouter, Routes, Route, useParams } from "react-router-dom";
import { onSnapshot, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

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
import AccountModal from "./components/AccountModal";
import { achievementBus, getAchievementService } from "./services/achievements";

getAchievementService();

const LOADING_MESSAGES = [
  "Trivia time is brewing…",
  "Sharpening pencils for your next quiz…",
  "Warming up the neurons 🔥",
  "Pro tip: Guessing isn’t always bad.",
  "Loading fun… hopefully.",
  "Preparing mind traps 🧠",
];

// 🎮 Game Component (handles game state & logic)
function TriviaGame({ prefillFromRoute }) {
  const params = prefillFromRoute ? useParams() : {};
  const { db, auth, authUser, userId, isLoading } = useFirebase();

  const [gameCode, setGameCode] = useState("");
  const [lobbyState, setLobbyState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [screenName, setScreenName] = useState("");
  const [mode, setMode] = useState("HOME"); // HOME, LOBBY, GAME, RESULTS
  const [authModalMode, setAuthModalMode] = useState("signup");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const authCallbackRef = useRef(null);

  const isHost = useMemo(() => lobbyState?.hostUserId === userId, [lobbyState, userId]);

  const randomLoadingMessage = useMemo(
    () =>
      LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)],
    []
  );

  const openAuthModal = useCallback(({ mode = "signup", onSuccess } = {}) => {
    authCallbackRef.current = typeof onSuccess === "function" ? onSuccess : null;
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    authCallbackRef.current = null;
    setIsAuthModalOpen(false);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    if (typeof authCallbackRef.current === "function") {
      authCallbackRef.current();
    }
    authCallbackRef.current = null;
    closeAuthModal();
  }, [closeAuthModal]);

  const handleSwitchAuthMode = useCallback(() => {
    setAuthModalMode((prev) => (prev === "signup" ? "signin" : "signup"));
  }, []);

  const handleSignOut = useCallback(async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setGameCode("");
      setLobbyState(null);
      setPlayers([]);
      setMode("HOME");
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  }, [auth]);

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

      achievementBus.emit({
        type: "GAME_CREATED",
        data: { userId, gameId: newCode },
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

        achievementBus.emit({
          type: "GAME_JOINED",
          data: { userId, gameId: normalized },
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
        <p>{randomLoadingMessage}</p>
      </div>
    );
  }

  const prefilledCode =
    prefillFromRoute && params?.code
      ? params.code.toUpperCase().substring(0, 4)
      : null;

  const currentQuestion = lobbyState?.questions?.[lobbyState.currentQuestionIndex];

  let activeScreen = null;

  // 🏠 HOME
  if (mode === "HOME" || !userId) {
    activeScreen = (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <HomeScreen
          onJoin={handleJoinGame}
          onCreate={handleCreateGame}
          screenName={screenName}
          setScreenName={setScreenName}
          prefilledCode={prefilledCode}
          authUser={authUser}
          onRequestAccount={openAuthModal}
          onSignOut={handleSignOut}
        />
      </div>
    );
  } else if (lobbyState?.status === "LOBBY" || lobbyState?.status === "UPLOAD") {
    // 🧑‍🤝‍🧑 LOBBY
    activeScreen = (
      <LobbyScreen
        db={db}
        gameCode={gameCode}
        lobbyState={lobbyState}
        players={players}
        userId={userId}
        isHost={isHost}
      />
    );
  } else if (lobbyState?.status === "PLAYING" && isHost) {
    // 🎮 GAME (Host)
    activeScreen = (
      <HostGameScreen
        db={db}
        gameCode={gameCode}
        lobbyState={lobbyState}
        players={players}
        currentQuestion={currentQuestion}
        userId={userId}
      />
    );
  } else if (lobbyState?.status === "PLAYING" && !isHost) {
    // 🎮 GAME (Player)
    activeScreen = (
      <PlayerGameScreen
        db={db}
        gameCode={gameCode}
        lobbyState={lobbyState}
        players={players}
        currentQuestion={currentQuestion}
        userId={userId}
      />
    );
  } else if (lobbyState?.status === "RESULTS") {
    // 🏁 RESULTS
    activeScreen = (
      <ResultsScreen
        db={db}
        gameCode={gameCode}
        players={players}
        isHost={isHost}
        userId={userId}
        authUser={authUser}
        setGameCode={setGameCode}
        setMode={setMode}
        onRequestAccount={openAuthModal}
      />
    );
  }

  return (
    <>
      {activeScreen}
      <AccountModal
        auth={auth}
        isOpen={isAuthModalOpen}
        mode={authModalMode}
        onClose={closeAuthModal}
        onSuccess={handleAuthSuccess}
        onSwitchMode={handleSwitchAuthMode}
      />
    </>
  );
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

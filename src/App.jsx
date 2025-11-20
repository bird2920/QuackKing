import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { HashRouter, Routes, Route, useParams } from "react-router-dom";
import { signOut } from "firebase/auth";

// 🔧 Helper Imports
import { useFirebase } from "./helpers/useFirebase";
import { useGameLogic } from "./hooks/useGameLogic";

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

  const [screenName, setScreenName] = useState("");
  const [authModalMode, setAuthModalMode] = useState("signup");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const authCallbackRef = useRef(null);

  const {
    gameCode,
    setGameCode,
    lobbyState,
    setLobbyState,
    players,
    mode,
    setMode,
    isHost,
    createGame,
    joinGame,
    handleSignOut,
  } = useGameLogic(db, auth, userId, screenName);

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
          onJoin={joinGame}
          onCreate={createGame}
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

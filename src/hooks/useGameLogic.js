import { useState, useEffect, useCallback, useMemo } from "react";
import { onSnapshot, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import {
    getGameDocPath,
    getPlayersCollectionPath,
    getPlayerDocPath,
    getUserSettingsDocPath,
} from "../helpers/firebasePaths";
import { generateGameCode } from "../helpers/codeUtils";
import { achievementBus } from "../services/achievements";

export function useGameLogic(db, auth, userId, screenName, initialGameCode = "") {
    const [gameCode, setGameCode] = useState(initialGameCode);
    const [lobbyState, setLobbyState] = useState(null);
    const [players, setPlayers] = useState([]);
    const [mode, setMode] = useState("HOME"); // HOME, LOBBY, GAME, RESULTS

    const isHost = useMemo(
        () => lobbyState?.hostUserId === userId,
        [lobbyState, userId]
    );

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
                const playerList = querySnap.docs
                    .map((d) => ({
                        id: d.id,
                        ...d.data(),
                    }))
                    .filter((p) => !p.isHost); // Filter out host if they exist in DB
                setPlayers(playerList.sort((a, b) => b.score - a.score));
            },
            (error) => console.error("Error listening to players:", error)
        );

        return () => {
            unsubGame();
            unsubPlayers();
        };
    }, [db, gameCode, mode]);

    // 🧩 Game Setup
    const createGame = useCallback(async () => {
        if (!db || !userId || !screenName.trim()) return;
        const newCode = generateGameCode();
        const gameDocRef = getGameDocPath(db, newCode);

        try {
            let initialTimerSettings = { revealTime: 30, nextQuestionTime: 3 };
            let initialAutoHost = true;

            try {
                console.log('🔍 Loading user settings for:', userId);
                const userSettingsDoc = await getDoc(getUserSettingsDocPath(db, userId));
                if (userSettingsDoc.exists()) {
                    const data = userSettingsDoc.data();
                    console.log('📖 Found user settings:', data);
                    if (data.hostSettings) {
                        initialTimerSettings = { ...initialTimerSettings, ...data.hostSettings };
                        // Ensure autoHost is boolean if present
                        if (typeof data.hostSettings.autoHost === 'boolean') {
                            initialAutoHost = data.hostSettings.autoHost;
                        }
                        console.log('✅ Loaded settings - Timer:', initialTimerSettings, 'AutoHost:', initialAutoHost);
                    }
                } else {
                    console.log('ℹ️ No saved settings found, using defaults');
                }
            } catch (err) {
                console.warn("❌ Failed to load user host settings, using defaults:", err);
            }

            await setDoc(gameDocRef, {
                gameCode: newCode,
                hostUserId: userId,
                status: "LOBBY",
                questions: [],
                currentTheme: "",
                currentQuestionIndex: -1,
                currentQuestionStartTime: null,
                timerSettings: initialTimerSettings,
                autoHost: initialAutoHost,
            });

            // NOTE: We no longer create a player document for the host.
            // The host is a "god mode" user, not a participant.

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

    const joinGame = useCallback(
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

    return {
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
    };
}

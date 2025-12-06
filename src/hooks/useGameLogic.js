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

const SESSION_STORAGE_KEY = "trivia:lastSession";

const readPersistedSession = () => {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        console.warn("Failed to read session cache:", err);
        return null;
    }
};

const persistSession = (payload) => {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
        console.warn("Failed to persist session cache:", err);
    }
};

const clearPersistedSession = () => {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (err) {
        console.warn("Failed to clear session cache:", err);
    }
};

export function useGameLogic(
    db,
    auth,
    userId,
    screenName,
    initialGameCode = "",
    resumeGuardCode = null
) {
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
                    clearPersistedSession();
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

    // 🔄 Auto-resume if we have a cached session (helps mobile users returning mid-game)
    useEffect(() => {
        if (!db || !userId || gameCode) return;
        // If the user followed a fresh invite link (prefilled code), do NOT auto-resume an old game.
        if (resumeGuardCode) return;
        const cached = readPersistedSession();
        if (!cached || cached.userId !== userId || !cached.gameCode) return;

        let isCancelled = false;
        (async () => {
            try {
                const gameDocRef = getGameDocPath(db, cached.gameCode);
                const checks = [getDoc(gameDocRef)];
                if (cached.role !== "host") {
                    checks.push(getDoc(getPlayerDocPath(db, cached.gameCode, userId)));
                }
                const [gameSnap, playerSnap] = await Promise.all(checks);
                const gameExists = gameSnap?.exists();
                const isHostOfGame = gameExists && gameSnap.data()?.hostUserId === userId;
                const playerExists = cached.role === "host" ? isHostOfGame : playerSnap?.exists();

                // Clear stale sessions (game gone or user no longer part of it)
                if (!gameExists || !playerExists) {
                    clearPersistedSession();
                    return;
                }

                if (isCancelled) return;
                setGameCode(cached.gameCode);
                // Mode will be updated once the snapshot listener fires
            } catch (err) {
                console.warn("Failed to auto-resume session:", err);
            }
        })();

        return () => {
            isCancelled = true;
        };
    }, [db, userId, gameCode, resumeGuardCode]);

    // 🧩 Game Setup
    const createGame = useCallback(async () => {
        if (!db || !userId || !screenName.trim()) return;
        // Clear any cached session so the host can start fresh.
        clearPersistedSession();
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

            persistSession({
                role: "host",
                gameCode: newCode,
                screenName: screenName.trim(),
                userId,
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
            const playerDocRef = getPlayerDocPath(db, normalized, userId);
            const existingPlayer = await getDoc(playerDocRef);

            if (!["LOBBY", "UPLOAD"].includes(game.status)) {
                if (existingPlayer.exists()) {
                    // Reattach to an in-progress game using the same player record
                    persistSession({
                        role: "player",
                        gameCode: normalized,
                        screenName: existingPlayer.data()?.name || screenName.trim(),
                        userId,
                    });
                    setGameCode(normalized);
                    setMode("LOBBY");
                } else {
                    console.log("🚫 Game already in progress.");
                }
                return;
            }

            try {
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

                persistSession({
                    role: "player",
                    gameCode: normalized,
                    screenName: screenName.trim(),
                    userId,
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
            clearPersistedSession();
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

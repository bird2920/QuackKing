import React, { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { useGameLogic } from "../hooks/useGameLogic";
import { useParams } from "react-router-dom";
import { useFirebase } from "../helpers/useFirebase";
import QuackKingLogo from "../components/QuackKingLogo.jsx";

export default function SpectatorScreen() {
    const { code } = useParams();
    const { db, auth } = useFirebase();
    useEffect(() => {
        if (typeof document === "undefined") return;
        const previous = document.title;
        document.title = `QuackKing - Spectator ${code}`;
        return () => {
            document.title = previous;
        };
    }, [code]);
    // Reuse our game logic hook, but we don't need to create/join, just listen.
    // We pass a dummy user ID since spectators are passive.
    const { lobbyState, players } = useGameLogic(db, auth, "spectator", "", code);
    const [logoFailed, setLogoFailed] = useState(false);
    const revealTime = lobbyState?.timerSettings?.revealTime ?? 30;
    const FIRST_QUESTION_DELAY_SECONDS = 3;

    const joinBaseUrl = useMemo(() => {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
        return isLocal ? origin : "https://quackking.live";
    }, []);
    const joinUrl = `${joinBaseUrl}/#/game/${code}`;
    const joinDisplay = joinBaseUrl.replace(/^https?:\/\//, "");

    const currentQuestion =
        lobbyState?.questions?.[lobbyState.currentQuestionIndex];

    const answeredCount = useMemo(() => {
        return players.filter((p) => p.lastAnswer !== null).length;
    }, [players]);

    const sortedPlayers = useMemo(() => {
        return [...players].sort((a, b) => b.score - a.score);
    }, [players]);

    // 🕒 Timer Logic (Must be at top level)
    const [timeLeft, setTimeLeft] = React.useState(30);

    // 🔤 Stable sort for grid (Alphabetical)
    const gridPlayers = useMemo(() => {
        return [...players].sort((a, b) => a.name.localeCompare(b.name));
    }, [players]);

    // 🏁 Fastest players for current round (top 3 by answer time)
    const fastestPlayers = useMemo(() => {
        if (!lobbyState?.currentQuestionStartTime) return [];
        const answered = players
            .filter((p) => p.lastAnswer !== null && p.answerTimestamp)
            .map((p) => ({
                ...p,
                answerTime: p.answerTimestamp - lobbyState.currentQuestionStartTime,
            }));
        return answered
            .sort((a, b) => a.answerTime - b.answerTime)
            .slice(0, 3);
    }, [players, lobbyState?.currentQuestionStartTime, lobbyState?.currentQuestionIndex]);

    // 📊 Distribution of answers for the current question
    const answerDistribution = useMemo(() => {
        const dist = {};
        players.forEach((p) => {
            if (p.lastAnswer !== null) {
                const key = String(p.lastAnswer);
                dist[key] = (dist[key] || 0) + 1;
            }
        });
        return dist;
    }, [players, lobbyState?.currentQuestionIndex]);

    const LogoBadge = () => (
        <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 pointer-events-none select-none">
            {!logoFailed ? (
                <img
                    src="/QuackKing.svg"
                    alt="QuackKing logo"
                    onError={() => setLogoFailed(true)}
                    className="w-20 sm:w-24 drop-shadow-[0_12px_35px_rgba(0,0,0,0.35)]"
                />
            ) : (
                <QuackKingLogo className="text-2xl sm:text-3xl font-black drop-shadow-[0_12px_35px_rgba(0,0,0,0.35)]" />
            )}
        </div>
    );

    React.useEffect(() => {
        if (lobbyState?.status !== "PLAYING" || !lobbyState?.currentQuestionStartTime) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const start = lobbyState.currentQuestionStartTime;
            const shouldDelay = lobbyState.currentQuestionIndex === 0 && !lobbyState.answerRevealed;
            const delayMs = shouldDelay ? FIRST_QUESTION_DELAY_SECONDS * 1000 : 0;
            const elapsed = (now - start - delayMs) / 1000;
            const remaining = Math.max(0, revealTime - elapsed);
            setTimeLeft(remaining);
        }, 100);

        return () => clearInterval(interval);
    }, [
        lobbyState?.status,
        lobbyState?.currentQuestionStartTime,
        lobbyState?.currentQuestionIndex,
        lobbyState?.answerRevealed,
        revealTime,
    ]);

    if (!lobbyState) {
        return (
            <div className="relative min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <LogoBadge />
                <div className="text-center animate-pulse">
                    <h1 className="text-4xl font-bold mb-4">Connecting to Game...</h1>
                    <p className="text-xl text-slate-400">Code: {code}</p>
                </div>
            </div>
        );
    }

    // 📺 LOBBY VIEW
    if (lobbyState.status === "LOBBY" || lobbyState.status === "UPLOAD") {
        return (
            <div className="relative min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-white flex flex-col items-center justify-center p-8">
                <LogoBadge />
                <div className="w-full max-w-6xl grid grid-cols-2 gap-12 items-center">
                    <div className="space-y-8 text-center lg:text-left">
                        <div>
                            <p className="text-2xl uppercase tracking-[0.5em] text-yellow-400 mb-4">
                                Join the Game
                            </p>
                            <h1 className="text-8xl font-black text-white mb-6 tracking-tight">
                                {code}
                            </h1>
                            <p className="text-3xl text-purple-200">
                                Scan to join or go to <span className="text-white font-bold">{joinDisplay}</span>
                            </p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 inline-block">
                            <div className="text-4xl font-bold mb-2">{players.length}</div>
                            <div className="text-xl uppercase tracking-widest text-purple-300">Players Ready</div>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <div className="bg-white p-6 rounded-3xl shadow-2xl shadow-purple-500/20">
                            <QRCode value={joinUrl} size={400} />
                        </div>
                    </div>
                </div>

                {/* Player Grid */}
                <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex flex-wrap justify-center gap-4">
                        {players.map((p) => (
                            <div
                                key={p.id}
                                className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xl font-bold animate-bounce-in"
                            >
                                {p.name}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // 🎮 GAME VIEW
    if (lobbyState.status === "PLAYING") {
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
            <div className="relative min-h-screen bg-slate-900 text-white flex flex-col p-8">
                <LogoBadge />
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="text-2xl font-bold text-purple-400">
                        Round {lobbyState.currentQuestionIndex + 1} / {lobbyState.questions?.length || 0}
                    </div>
                    <div className="text-4xl font-black tracking-widest">{code}</div>
                    <div className={`text-4xl font-black ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-white"}`}>
                        {Math.ceil(timeLeft)}s
                    </div>
                </div>

                {/* Question */}
                <div className="mb-12 text-center flex flex-col items-center">
                    {hasTheme && (
                        <div className="inline-flex items-center gap-2 mb-6 rounded-2xl border border-white/20 bg-white/5 px-6 py-2 text-lg uppercase tracking-[0.25em] text-purple-100/70">
                            <span className="text-yellow-200 font-semibold tracking-[0.25em]">Theme</span>
                            <span className="text-white/90 font-semibold normal-case tracking-normal">{currentTheme}</span>
                        </div>
                    )}
                    <h2 className="text-5xl font-bold leading-tight max-w-6xl mx-auto drop-shadow-2xl">
                        {currentQuestion?.question}
                    </h2>
                </div>

                {/* Player Grid (Pressure Cooker) */}
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="flex flex-wrap justify-center gap-6 max-w-7xl">
                        {gridPlayers.map((p) => {
                            const hasAnswered = p.lastAnswer !== null;
                            const isPulsing = !hasAnswered && timeLeft <= 10;
                            const pulseDuration = isPulsing
                                ? `${Math.max(0.2, timeLeft / 10)}s`
                                : '0s';

                            return (
                                <div
                                    key={p.id}
                                    style={{
                                        animation: isPulsing ? `pressurePulse ${pulseDuration} infinite` : 'none'
                                    }}
                                    className={
                                        `relative w-48 h-32 rounded-2xl flex flex-col items-center justify-center border-4 transition-all duration-300 ${
                                            hasAnswered
                                                ? "bg-green-500 border-green-400 scale-105 shadow-[0_0_20px_rgba(34,197,94,0.6)]"
                                                : "bg-slate-800 border-slate-700 shadow-lg"
                                        }`
                                    }
                                >
                                    <div className={`text-2xl font-bold truncate max-w-full px-4 ${hasAnswered ? "text-white" : "text-slate-300"}`}>
                                        {p.name}
                                    </div>
                                    {hasAnswered && (
                                        <div className="absolute -top-3 -right-3 bg-white text-green-600 rounded-full p-1 shadow-lg">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Stats Panel */}
                    <div className="mt-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Fastest Answers List */}
                        <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4">
                            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                                <span role="img" aria-label="lightning">⚡</span> Fastest Answers
                            </h3>
                            {fastestPlayers && fastestPlayers.length > 0 ? (
                                <ol className="space-y-1">
                                    {fastestPlayers.map((p, idx) => (
                                        <li key={p.id} className="flex justify-between text-lg">
                                            <span className="font-medium">{idx + 1}. {p.name}</span>
                                            <span className="text-slate-400">{(p.answerTime / 1000).toFixed(1)}s</span>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="text-slate-400 text-sm">No answers yet.</p>
                            )}
                        </div>
                        {/* Answer Distribution */}
                        {lobbyState.answerRevealed && (
                            <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4">
                                <h3 className="text-xl font-bold mb-2">Answer Distribution</h3>
                                {Object.keys(answerDistribution).length > 0 ? (
                                    <ul className="space-y-1">
                                        {Object.entries(answerDistribution).map(([key, count]) => (
                                            <li key={key} className="flex justify-between text-lg font-semibold">
                                                <span>{key}</span>
                                                <span>{count}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-slate-400 text-sm">No answers recorded.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <style>{`
                    @keyframes pressurePulse {
                        0%, 100% { transform: scale(1); border-color: rgb(51, 65, 85); }
                        50% { transform: scale(0.95); border-color: rgb(239, 68, 68); box-shadow: 0 0 15px rgba(239, 68, 68, 0.5); }
                    }
                `}</style>
            </div>
        );
    }

    // 🏆 RESULTS VIEW
    if (lobbyState.status === "RESULTS") {
        return (
            <div className="relative min-h-screen bg-gradient-to-b from-slate-900 to-purple-900 text-white p-8 flex flex-col items-center">
                <LogoBadge />
                <h1 className="text-6xl font-black text-yellow-400 mb-12 uppercase tracking-widest drop-shadow-lg">
                    Leaderboard
                </h1>

                <div className="w-full max-w-4xl space-y-4">
                    {sortedPlayers.map((p, index) => (
                        <div
                            key={p.id}
                            className={`flex items-center justify-between p-6 rounded-2xl border ${index === 0
                                ? "bg-yellow-500/20 border-yellow-400/50 scale-105 shadow-yellow-500/20 shadow-2xl"
                                : "bg-white/5 border-white/10"
                                } transition-all`}
                        >
                            <div className="flex items-center gap-6">
                                <div className={`text-4xl font-black w-16 text-center ${index === 0 ? "text-yellow-400" :
                                    index === 1 ? "text-slate-300" :
                                        index === 2 ? "text-amber-600" : "text-slate-500"
                                    }`}>
                                    #{index + 1}
                                </div>
                                <div className="text-3xl font-bold">{p.name}</div>
                            </div>
                            <div className="text-4xl font-black text-purple-200">
                                {p.score}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Fallback/Debug View
    return (
        <div className="relative min-h-screen bg-slate-950 text-white p-8 flex flex-col items-center justify-center">
            <LogoBadge />
            <h1 className="text-2xl font-bold text-red-400 mb-4">Unknown Game Status</h1>
            <p className="mb-4">Status: <span className="font-mono bg-slate-800 px-2 py-1 rounded">{lobbyState.status}</span></p>
            <details className="w-full max-w-2xl bg-slate-900 p-4 rounded-lg overflow-auto max-h-96">
                <summary className="cursor-pointer mb-2 font-bold text-slate-400">Debug Data</summary>
                <pre className="text-xs font-mono text-slate-300">
                    {JSON.stringify(lobbyState, null, 2)}
                </pre>
            </details>
        </div>
    );
}

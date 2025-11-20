import React, { useMemo } from "react";
import QRCode from "react-qr-code";
import { useGameLogic } from "../hooks/useGameLogic";
import { useParams } from "react-router-dom";
import { useFirebase } from "../helpers/useFirebase";

export default function SpectatorScreen() {
    const { code } = useParams();
    const { db, auth } = useFirebase();
    // Reuse our game logic hook, but we don't need to create/join, just listen.
    // We pass a dummy user ID since spectators are passive.
    const { lobbyState, players } = useGameLogic(db, auth, "spectator", "", code);

    const currentQuestion =
        lobbyState?.questions?.[lobbyState.currentQuestionIndex];

    const answeredCount = useMemo(() => {
        return players.filter((p) => p.lastAnswer !== null).length;
    }, [players]);

    const sortedPlayers = useMemo(() => {
        return [...players].sort((a, b) => b.score - a.score);
    }, [players]);

    if (!lobbyState) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="text-center animate-pulse">
                    <h1 className="text-4xl font-bold mb-4">Connecting to Game...</h1>
                    <p className="text-xl text-slate-400">Code: {code}</p>
                </div>
            </div>
        );
    }

    // 📺 LOBBY VIEW
    if (lobbyState.status === "LOBBY" || lobbyState.status === "UPLOAD") {
        const joinUrl = `${window.location.origin}/#/game/${code}`;
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-white flex flex-col items-center justify-center p-8">
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
                                Scan to join or go to <span className="text-white font-bold">smartish.game</span>
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
        return (
            <div className="min-h-screen bg-slate-900 text-white flex flex-col p-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-12">
                    <div className="text-2xl font-bold text-purple-400">
                        Round {lobbyState.currentQuestionIndex + 1} / {lobbyState.questions.length}
                    </div>
                    <div className="text-4xl font-black tracking-widest">{code}</div>
                </div>

                {/* Question */}
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-12">
                    <h2 className="text-6xl font-bold leading-tight max-w-5xl drop-shadow-2xl">
                        {currentQuestion?.question}
                    </h2>

                    {/* Answer Progress */}
                    <div className="w-full max-w-4xl space-y-4">
                        <div className="flex justify-between text-2xl font-bold text-purple-200">
                            <span>Answers In</span>
                            <span>{answeredCount} / {players.length}</span>
                        </div>
                        <div className="h-8 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                            <div
                                className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500 ease-out"
                                style={{ width: `${(answeredCount / players.length) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 🏆 RESULTS VIEW
    if (lobbyState.status === "RESULTS") {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-purple-900 text-white p-8 flex flex-col items-center">
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

    return null;
}

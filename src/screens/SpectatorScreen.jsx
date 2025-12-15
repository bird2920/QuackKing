import React, { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { useGameLogic } from "../hooks/useGameLogic";
import { useParams } from "react-router-dom";
import { useFirebase } from "../helpers/useFirebase";
import QuackKingLogo from "../components/QuackKingLogo.jsx";
import { useSoundEffects } from "../hooks/useSoundEffects";
import CastControls from "../components/CastControls.jsx";

export default function SpectatorScreen() {
    const { code } = useParams();
    const { db, auth } = useFirebase();
    const { playSound, volume, setVolume, isMuted, toggleMute } = useSoundEffects();
    const [showControls, setShowControls] = useState(false);

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
    const [countdownValue, setCountdownValue] = React.useState(null);

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


    const SoundControls = () => {
        const [clickTimeout, setClickTimeout] = React.useState(null);

        const handleButtonClick = (e) => {
            // Prevent immediate toggle if this might be a double-click
            if (clickTimeout) {
                clearTimeout(clickTimeout);
                setClickTimeout(null);
                // This is a double-click - mute
                toggleMute();
            } else {
                // Wait to see if another click comes (double-click)
                const timeout = setTimeout(() => {
                    setShowControls(!showControls);
                    setClickTimeout(null);
                }, 250);
                setClickTimeout(timeout);
            }
        };

        return (
            <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100] flex flex-col items-end">
                {showControls && (
                    <div className="mb-2 bg-slate-900/90 backdrop-blur-md rounded-xl p-3 shadow-lg border border-white/10 flex flex-col gap-1 min-w-[180px] animate-fade-in">
                        <div className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wider text-center">Volume</div>
                        <button
                            onClick={() => setVolume(0.15)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex justify-between items-center ${Math.abs(volume - 0.15) < 0.05 ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                        >
                            <span>Whisper</span>
                            <span className="text-xs opacity-60">15%</span>
                        </button>
                        <button
                            onClick={() => setVolume(0.5)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex justify-between items-center ${Math.abs(volume - 0.5) < 0.05 ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                        >
                            <span>Reasonable</span>
                            <span className="text-xs opacity-60">50%</span>
                        </button>
                        <button
                            onClick={() => setVolume(1.0)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex justify-between items-center ${Math.abs(volume - 1.0) < 0.05 ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                        >
                            <span>Deafening</span>
                            <span className="text-xs opacity-60">100%</span>
                        </button>
                    </div>
                )}
                <button
                    onClick={handleButtonClick}
                    className="bg-slate-800/80 backdrop-blur-md hover:bg-slate-700/80 text-white rounded-full p-2 shadow-lg border border-white/10 transition-all"
                    title="Click for volume, double-click to mute"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        {isMuted ? (
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        ) : (
                            <>
                                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                            </>
                        )}
                    </svg>
                </button>
            </div>
        );
    };

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

    // 🎬 Match Start Countdown Timer
    React.useEffect(() => {
        if (lobbyState?.status !== "PLAYING" || lobbyState?.currentQuestionIndex !== 0 || lobbyState?.answerRevealed) {
            setCountdownValue(null);
            return;
        }

        let hasReachedZero = false;
        const interval = setInterval(() => {
            const now = Date.now();
            const start = lobbyState.currentQuestionStartTime;
            const elapsed = now - start;
            const remaining = FIRST_QUESTION_DELAY_SECONDS * 1000 - elapsed;

            if (remaining > 0) {
                const seconds = Math.ceil(remaining / 1000);
                setCountdownValue(seconds);
            } else if (!hasReachedZero) {
                hasReachedZero = true;
                setCountdownValue(0); // "GO!" state
                setTimeout(() => setCountdownValue(null), 500); // Clear after brief moment
                clearInterval(interval); // Stop the interval immediately
            }
        }, 100);

        return () => clearInterval(interval);
    }, [
        lobbyState?.status,
        lobbyState?.currentQuestionStartTime,
        lobbyState?.currentQuestionIndex,
        lobbyState?.answerRevealed,
    ]);

    // 🔊 Sound Effects: Match start countdown
    const [lastCountdown, setLastCountdown] = React.useState(null);
    React.useEffect(() => {
        if (countdownValue === null) return;

        if (countdownValue === 3 && lastCountdown !== 3) {
            playSound('countdown');
            setLastCountdown(3);
        } else if (countdownValue === 2 && lastCountdown !== 2) {
            playSound('countdown');
            setLastCountdown(2);
        } else if (countdownValue === 1 && lastCountdown !== 1) {
            playSound('countdown');
            setLastCountdown(1);
        } else if (countdownValue === 0 && lastCountdown !== 0) {
            playSound('all-answered'); // "GO!" sound (triumphant)
            setLastCountdown(0);
        }
    }, [countdownValue, lastCountdown, playSound]);

    // Reset countdown tracker on question change
    React.useEffect(() => {
        setLastCountdown(null);
    }, [lobbyState?.currentQuestionIndex]);

    // 🔊 Sound Effects: Timer warnings
    const [lastWarning, setLastWarning] = React.useState(null);
    React.useEffect(() => {
        if (lobbyState?.status !== "PLAYING" || lobbyState?.answerRevealed) return;

        const timeInt = Math.ceil(timeLeft);

        if (timeInt === 10 && lastWarning !== 10) {
            playSound('timer-10s');
            setLastWarning(10);
        } else if (timeInt === 5 && lastWarning !== 5) {
            playSound('timer-5s');
            setLastWarning(5);
        } else if (timeInt === 0 && lastWarning !== 0 && timeLeft <= 0.1) {
            playSound('timer-end');
            setLastWarning(0);
        }
    }, [timeLeft, lobbyState?.status, lobbyState?.answerRevealed, lastWarning, playSound]);

    // Reset warning tracker on new question
    React.useEffect(() => {
        setLastWarning(null);
    }, [lobbyState?.currentQuestionIndex]);

    // 🔊 Sound Effects: Player answers
    const prevAnsweredCount = React.useRef(0);
    React.useEffect(() => {
        if (lobbyState?.status !== "PLAYING" || lobbyState?.answerRevealed) return;

        const currentCount = answeredCount;
        const totalPlayers = players.length;

        // New player answered
        if (currentCount > prevAnsweredCount.current) {
            playSound('player-answer');

            // All players answered
            if (totalPlayers > 0 && currentCount === totalPlayers) {
                setTimeout(() => playSound('all-answered'), 200);
            }
        }

        prevAnsweredCount.current = currentCount;
    }, [answeredCount, players.length, lobbyState?.status, lobbyState?.answerRevealed, playSound]);

    // Reset count on new question
    React.useEffect(() => {
        prevAnsweredCount.current = 0;
    }, [lobbyState?.currentQuestionIndex]);

    // 🔊 Sound Effects: Answer reveal
    const prevRevealed = React.useRef(false);
    React.useEffect(() => {
        if (lobbyState?.answerRevealed && !prevRevealed.current) {
            playSound('reveal');
            setTimeout(() => playSound('correct'), 400);
        }
        prevRevealed.current = lobbyState?.answerRevealed || false;
    }, [lobbyState?.answerRevealed, playSound]);

    // 🔊 Sound Effects: Results screen
    const prevStatus = React.useRef('');
    React.useEffect(() => {
        if (lobbyState?.status === "RESULTS" && prevStatus.current !== "RESULTS") {
            playSound('results');
            // Winner fanfare after a delay
            if (sortedPlayers.length > 0) {
                setTimeout(() => playSound('winner'), 1000);
            }
        }
        prevStatus.current = lobbyState?.status || '';
    }, [lobbyState?.status, sortedPlayers.length, playSound]);

    if (!lobbyState) {
        return (
            <div className="relative min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <LogoBadge />
                <CastControls code={code} />
                <SoundControls />
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
            <div className={`relative min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-white flex flex-col items-center justify-center p-8 transition-all`}>
                <LogoBadge />
                <CastControls code={code} />
                <SoundControls />

                {/* Portrait Overlay */}
                <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-8 text-center md:hidden landscape:hidden">
                    <div className="text-6xl mb-6">📺</div>
                    <h2 className="text-3xl font-bold text-white mb-4">This is Spectator Mode.</h2>
                    <p className="text-xl text-slate-400 mb-8 max-w-sm">
                        It belongs on a big screen, not your tiny phone.
                    </p>
                    <div className="bg-slate-900 rounded-xl p-6 border border-white/10 animate-pulse">
                        <p className="text-purple-300 font-bold uppercase tracking-widest text-sm mb-2">Instructions</p>
                        <p className="text-white text-lg font-medium">Rotate your phone & Cast it to a TV.</p>
                    </div>
                </div>

                <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                    <div className="space-y-6 lg:space-y-8 text-center lg:text-left order-2 lg:order-1">
                        <div>
                            <p className="text-xl lg:text-2xl uppercase tracking-[0.5em] text-yellow-400 mb-2 lg:mb-4">
                                Join the Game
                            </p>
                            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-white mb-4 lg:mb-6 tracking-tight break-all">
                                {code}
                            </h1>
                            <p className="text-xl sm:text-2xl lg:text-3xl text-purple-200">
                                Scan to join or go to <span className="text-white font-bold block sm:inline mt-2 sm:mt-0">{joinDisplay}</span>
                            </p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 lg:p-8 border border-white/20 inline-block">
                            <div className="text-3xl lg:text-4xl font-bold mb-2">{players.length}</div>
                            <div className="text-lg lg:text-xl uppercase tracking-widest text-purple-300">Players Ready</div>
                        </div>
                    </div>

                    <div className="flex justify-center order-1 lg:order-2">
                        <div className="bg-white p-4 lg:p-6 rounded-3xl shadow-2xl shadow-purple-500/20 max-w-[280px] sm:max-w-none">
                            <QRCode value={joinUrl} size={256} className="w-full h-auto sm:w-[400px] sm:h-[400px]" />
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
                <CastControls code={code} />
                <SoundControls />
                <LogoBadge />

                {/* Portrait Overlay */}
                <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-8 text-center md:hidden landscape:hidden">
                    <div className="text-6xl mb-6">🛑</div>
                    <h2 className="text-3xl font-bold text-white mb-4">Rotate Your Phone</h2>
                    <p className="text-xl text-slate-400 mb-8 max-w-sm">
                        You can't experience the glory of Spectator Mode in portrait.
                    </p>
                    <div className="bg-slate-800 rounded-xl p-6 border border-white/10 animate-bounce">
                        <p className="text-white text-lg font-medium">Turn it sideways & Cast to TV 📺</p>
                    </div>
                </div>

                {/* Match Start Countdown Overlay */}
                {countdownValue !== null && countdownValue > 0 && (
                    <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-40 animate-fade-in">
                        <div className="text-center">
                            <p className="text-3xl text-purple-400 mb-8 uppercase tracking-widest">
                                Match Starting In...
                            </p>
                            <div
                                className="text-[10rem] md:text-[20rem] font-black text-white animate-bounce-in count-text"
                                style={{
                                    textShadow: '0 0 60px rgba(139, 92, 246, 0.8), 0 0 120px rgba(139, 92, 246, 0.4)',
                                    animation: 'pulse 0.5s ease-in-out'
                                }}
                            >
                                {countdownValue}
                            </div>
                        </div>
                    </div>
                )}

                {/* "GO!" State */}
                {countdownValue === 0 && (
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center z-40">
                        <div
                            className="text-[10rem] md:text-[20rem] font-black text-white count-text"
                            style={{
                                textShadow: '0 0 80px rgba(255, 255, 255, 0.8)',
                                animation: 'pop-scale 0.5s ease-out'
                            }}
                        >
                            GO!
                        </div>
                    </div>
                )}
                <style>{`
                    @media (max-width: 640px) {
                        .count-text { font-size: 10rem !important; }
                    }
                `}</style>
                {/* Header */}
                <div className="flex justify-between items-center mb-6 lg:mb-8">
                    <div className="text-lg lg:text-2xl font-bold text-purple-400">
                        Round {lobbyState.currentQuestionIndex + 1} / {lobbyState.questions?.length || 0}
                    </div>
                    <div className="text-2xl lg:text-4xl font-black tracking-widest">{code}</div>
                    <div className={`text-2xl lg:text-4xl font-black ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-white"}`}>
                        {Math.ceil(timeLeft)}s
                    </div>
                </div>

                {/* Question */}
                <div className="mb-8 lg:mb-12 text-center flex flex-col items-center">
                    {hasTheme && (
                        <div className="inline-flex items-center gap-2 mb-4 lg:mb-6 rounded-2xl border border-white/20 bg-white/5 px-4 lg:px-6 py-2 text-sm lg:text-lg uppercase tracking-[0.25em] text-purple-100/70">
                            <span className="text-yellow-200 font-semibold tracking-[0.25em]">Theme</span>
                            <span className="text-white/90 font-semibold normal-case tracking-normal">{currentTheme}</span>
                        </div>
                    )}
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight max-w-6xl mx-auto drop-shadow-2xl px-2">
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
                                        `relative w-32 h-20 sm:w-48 sm:h-32 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border-4 transition-all duration-300 ${hasAnswered
                                            ? "bg-green-500 border-green-400 scale-105 shadow-[0_0_20px_rgba(34,197,94,0.6)]"
                                            : "bg-slate-800 border-slate-700 shadow-lg"
                                        }`
                                    }
                                >
                                    <div className={`text-sm sm:text-lg lg:text-2xl font-bold truncate max-w-full px-2 sm:px-4 ${hasAnswered ? "text-white" : "text-slate-300"}`}>
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
                    <div className={`mt-6 sm:mt-10 w-full max-w-5xl grid grid-cols-1 ${lobbyState.answerRevealed ? 'md:grid-cols-2' : ''} gap-4 sm:gap-6`}>
                        {/* Fastest Answers List */}
                        <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-3 sm:p-4">
                            <h3 className="text-lg sm:text-xl font-bold mb-2 flex items-center gap-2">
                                <span role="img" aria-label="lightning">⚡</span> Fastest Answers
                            </h3>
                            {fastestPlayers && fastestPlayers.length > 0 ? (
                                <ol className="space-y-1">
                                    {fastestPlayers.map((p, idx) => (
                                        <li key={p.id} className="flex justify-between text-base sm:text-lg">
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
                            <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-3 sm:p-4">
                                <h3 className="text-lg sm:text-xl font-bold mb-2">Answer Distribution</h3>
                                {Object.keys(answerDistribution).length > 0 ? (
                                    <ul className="space-y-1">
                                        {Object.entries(answerDistribution).map(([key, count]) => (
                                            <li key={key} className="flex justify-between text-base sm:text-lg font-semibold">
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
                <style>{`
                    @keyframes pop-scale {
                        0% { transform: scale(0.5); opacity: 0; }
                        50% { transform: scale(1.2); opacity: 1; }
                        100% { transform: scale(1); opacity: 1; }
                    }
                    @keyframes fade-in {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                `}</style>
            </div >
        );
    }

    // 🏆 RESULTS VIEW
    if (lobbyState.status === "RESULTS") {
        return (
            <div className="relative min-h-screen bg-gradient-to-b from-slate-900 to-purple-900 text-white p-8 flex flex-col items-center">
                <CastControls code={code} />
                <SoundControls />
                <LogoBadge />
                <h1 className="text-4xl lg:text-6xl font-black text-yellow-400 mb-8 lg:mb-12 uppercase tracking-widest drop-shadow-lg text-center">
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
                            <div className="flex items-center gap-3 lg:gap-6">
                                <div className={`text-2xl lg:text-4xl font-black w-10 lg:w-16 text-center ${index === 0 ? "text-yellow-400" :
                                    index === 1 ? "text-slate-300" :
                                        index === 2 ? "text-amber-600" : "text-slate-500"
                                    }`}>
                                    #{index + 1}
                                </div>
                                <div className="text-xl lg:text-3xl font-bold truncate max-w-[150px] sm:max-w-xs">{p.name}</div>
                            </div>
                            <div className="text-2xl lg:text-4xl font-black text-purple-200">
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
            <CastControls code={code} />
            <SoundControls />
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

import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import QuackKingLogo from "./src/components/QuackKingLogo.jsx";

const TAGLINES = [
    "Are your friends as smart as they think they are?",
    "Prove your brain isn’t just decorative.",
    "Finally, a way to destroy friendships intelligently.",
    "Your ego called — it wants a rematch.",
    "A trivia game that rewards knowledge… and sarcasm.",
    "Less small talk. More smack talk.",
    "Perfect for people who can’t resist saying ‘actually…’.",
    "It’s like a pub quiz — but the bar is your couch.",
    "No controllers. No downloads. Just chaos.",
];

const LandingPage = () => {
    const navigate = useNavigate();
    const tagline = useMemo(
        () => TAGLINES[Math.floor(Math.random() * TAGLINES.length)],
        []
    );

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-900 text-white overflow-hidden">
            <div className="absolute inset-0 opacity-70 mix-blend-screen">
                <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,0.18),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(45,212,191,0.12),transparent_25%),radial-gradient(circle_at_20%_80%,rgba(244,114,182,0.12),transparent_22%)] blur-3xl" />
            </div>

            <div className="relative z-10 flex items-center justify-center px-4 py-16">
                <div className="w-full max-w-5xl text-center space-y-10">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-purple-100/70 shadow-sm">
                        <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                        Live party trivia
                    </div>

                    {/* Logo/Title */}
                    <div className="space-y-3">
                        <h1 className="text-6xl sm:text-7xl md:text-8xl font-black text-white tracking-tight drop-shadow-[0_15px_45px_rgba(79,70,229,0.35)]">
                            <QuackKingLogo />
                        </h1>
                        <p className="text-2xl sm:text-3xl text-purple-100/80 font-semibold">{tagline}</p>
                    </div>

                    {/* Description */}
                    <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 sm:p-12 shadow-[0_25px_120px_-35px_rgba(124,58,237,0.8)] border border-white/10 space-y-8">
                        <p className="text-lg sm:text-xl leading-relaxed text-white/90 max-w-3xl mx-auto">
                            Host multiplayer parties with your friends. One person kicks things off, everyone else joins with a four-letter code, and you all battle it out live on your own devices.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2 shadow-lg">
                                <div className="text-4xl">🎮</div>
                                <h3 className="text-lg font-bold text-yellow-300">Easy to Play</h3>
                                <p className="text-sm text-purple-100/70">Share a 4-letter code and jump in.</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2 shadow-lg">
                                <div className="text-4xl">⚡</div>
                                <h3 className="text-lg font-bold text-yellow-300">Real-Time</h3>
                                <p className="text-sm text-purple-100/70">Fast scoring, instant leaderboards.</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2 shadow-lg">
                                <div className="text-4xl">🎯</div>
                                <h3 className="text-lg font-bold text-yellow-300">Time-Based</h3>
                                <p className="text-sm text-purple-100/70">30-second rounds with bonus points.</p>
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 text-sm text-purple-100/70">
                            <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">1) Host a lobby</div>
                            <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">2) Share the code</div>
                            <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">3) Battle for bragging rights</div>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <div className="flex flex-col items-center gap-3">
                        <button
                            onClick={() => navigate('/game')}
                            className="bg-gradient-to-r from-yellow-300 via-amber-200 to-orange-400 hover:from-yellow-200 hover:to-orange-300 text-slate-950 font-black text-2xl sm:text-3xl px-12 py-5 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-200 border-2 border-yellow-200"
                        >
                            Start Playing Now
                        </button>
                        <p className="text-purple-100/70 text-sm">
                            Upload your own questions via CSV or let AI generate them for you.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;

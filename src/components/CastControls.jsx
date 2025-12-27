import React, { useState, useEffect } from "react";
import { ShareIcon, TvIcon, LinkIcon, XMarkIcon } from "@heroicons/react/24/solid";

/**
 * CastControls component
 * Provides options to Cast (Chromecast), Share (Native), or Copy Link.
 * Designed to sit alongside SoundControls.
 */
export default function CastControls({ code }) {
    const [showMenu, setShowMenu] = useState(false);
    const [castAvailable, setCastAvailable] = useState(false);
    const [shareAvailable, setShareAvailable] = useState(false);
    const [copied, setCopied] = useState(false);
    const [airPlayAvailable, setAirPlayAvailable] = useState(false);
    const [showAirPlayHelp, setShowAirPlayHelp] = useState(false);
    const [showCastHelp, setShowCastHelp] = useState(false);

    useEffect(() => {
        // Check for Native Share API
        if (typeof navigator !== "undefined" && navigator.share) {
            setShareAvailable(true);
        }

        // Basic check for Apple devices where AirPlay is likely available
        const isAppleDevice = /Mac|iPod|iPhone|iPad/.test(navigator.platform) || (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1);
        if (isAppleDevice) {
            setAirPlayAvailable(true);
        }

        const ua = navigator.userAgent || "";
        const isChromium = /Chrome|Chromium/.test(ua) && !/Edg|OPR/.test(ua);
        const isDesktop = !/Android|iPhone|iPad|iPod/.test(ua);
        if (isChromium && isDesktop) {
            setCastAvailable(true);
        }
    }, []);

    const handleCast = async () => {
        setShowCastHelp(true);
        setShowMenu(false);
    };

    const handleShare = async () => {
        const url = window.location.href;
        if (shareAvailable) {
            try {
                await navigator.share({
                    title: `QuackKing Spectator - ${code}`,
                    text: 'Join the audience!',
                    url: url,
                });
                setShowMenu(false);
            } catch (err) {
                console.error("Share failed", err);
            }
        }
    };

    const handleCopy = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            // Don't close immediately so they see the feedback
        });
    };

    const handleAirPlayClick = () => {
        setShowAirPlayHelp(true);
        setShowMenu(false);
    };

    return (
        <>
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-[100] flex flex-col items-end">
                {/* Toggle Button */}
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className={`
                    bg-slate-800/80 backdrop-blur-md hover:bg-slate-700/80 text-white rounded-full p-2 shadow-lg border border-white/10 transition-all
                    ${showMenu ? 'bg-slate-700 ring-2 ring-purple-500/50' : ''}
                `}
                    title="Share & Cast"
                >
                    {showMenu ? (
                        <XMarkIcon className="h-5 w-5" />
                    ) : (
                        <TvIcon className="h-5 w-5" />
                    )}
                </button>

                {/* Menu */}
                {showMenu && (
                    <div className="mt-2 bg-slate-900/90 backdrop-blur-md rounded-xl p-2 shadow-xl border border-white/10 flex flex-col gap-1 min-w-[160px] animate-fade-in origin-top-right">

                        {/* Cast Button */}
                        {castAvailable && (
                            <button
                                onClick={handleCast}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors w-full text-left"
                            >
                                <TvIcon className="h-4 w-4" />
                                <span>Cast Tab (Chrome)</span>
                            </button>
                        )}

                        {/* AirPlay Button */}
                        {airPlayAvailable && (
                            <button
                                onClick={handleAirPlayClick}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors w-full text-left"
                            >
                                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 16L7 21H17L12 16ZM4 3C2.89 3 2 3.89 2 5V15C2 16.1 2.89 17 4 17H8L12 13L16 17H20C21.1 17 22 16.1 22 15V5C22 3.89 21.1 3 20 3H4ZM4 5.01H20V15H4V5.01Z" />
                                </svg>
                                <span>AirPlay</span>
                            </button>
                        )}

                        {/* Share Button (Mobile) */}
                        {shareAvailable && (
                            <button
                                onClick={handleShare}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors w-full text-left"
                            >
                                <ShareIcon className="h-4 w-4" />
                                <span>Share</span>
                            </button>
                        )}

                        {/* Copy Link Button */}
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors w-full text-left"
                        >
                            <LinkIcon className={`h-4 w-4 ${copied ? 'text-green-400' : ''}`} />
                            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                        </button>
                    </div>
                )}
            </div>

            {/* AirPlay Help Modal */}
            {showAirPlayHelp && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAirPlayHelp(false)}>
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <svg className="h-6 w-6 text-white fill-current" viewBox="0 0 24 24">
                                    <path d="M12 16L7 21H17L12 16ZM4 3C2.89 3 2 3.89 2 5V15C2 16.1 2.89 17 4 17H8L12 13L16 17H20C21.1 17 22 16.1 22 15V5C22 3.89 21.1 3 20 3H4ZM4 5.01H20V15H4V5.01Z" />
                                </svg>
                                AirPlay Mirroring
                            </h3>
                            <button onClick={() => setShowAirPlayHelp(false)} className="text-slate-400 hover:text-white">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-4 text-slate-300">
                            <p>To cast this screen to your Apple TV or AirPlay-compatible TV:</p>
                            <ol className="list-decimal pl-5 space-y-2 marker:text-purple-400">
                                <li>Open <strong>Control Center</strong> on your device.</li>
                                <li>Tap the <span className="inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded text-xs border border-white/10"><svg className="h-3 w-3 fill-current" viewBox="0 0 24 24"><path d="M12 16L7 21H17L12 16ZM4 3C2.89 3 2 3.89 2 5V15C2 16.1 2.89 17 4 17H8L12 13L16 17H20C21.1 17 22 16.1 22 15V5C22 3.89 21.1 3 20 3H4ZM4 5.01H20V15H4V5.01Z" /></svg> Screen Mirroring</span> icon.</li>
                                <li>Select your TV from the list.</li>
                            </ol>
                            <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-3 text-sm text-purple-200 flex items-start gap-2">
                                <span className="text-lg">📱</span>
                                <p>For the best experience, <strong>rotate your device to landscape</strong> to fill the TV screen.</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowAirPlayHelp(false)}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors border border-white/5"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}

            {/* Cast Help Modal */}
            {showCastHelp && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowCastHelp(false)}>
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <TvIcon className="h-6 w-6" />
                                Cast From Chrome
                            </h3>
                            <button onClick={() => setShowCastHelp(false)} className="text-slate-400 hover:text-white">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-4 text-slate-300">
                            <p>Use Chrome's built-in casting to mirror this tab:</p>
                            <ol className="list-decimal pl-5 space-y-2 marker:text-purple-400">
                                <li>Open the <strong>Chrome menu</strong> (⋮) and choose <strong>Cast…</strong></li>
                                <li>Click <strong>Sources</strong> and select <strong>Cast tab</strong></li>
                                <li>Pick your TV to start mirroring</li>
                            </ol>
                            <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-3 text-sm text-purple-200 flex items-start gap-2">
                                <span className="text-lg">💡</span>
                                <p>If you see a black screen with a cast icon, stop casting and use <strong>Cast tab</strong> instead of "Cast via app".</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowCastHelp(false)}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors border border-white/5"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

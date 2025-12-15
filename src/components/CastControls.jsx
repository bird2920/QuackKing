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

    useEffect(() => {
        // Check for Native Share API
        if (typeof navigator !== "undefined" && navigator.share) {
            setShareAvailable(true);
        }

        // Initialize Google Cast API
        window['__onGCastApiAvailable'] = (isAvailable) => {
            if (isAvailable) {
                try {
                    cast.framework.CastContext.getInstance().setOptions({
                        receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                        autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
                    });
                    setCastAvailable(true);
                } catch (e) {
                    console.error("Failed to initialize Cast Context", e);
                }
            }
        };

        // If script loaded before this component mounted
        if (window.cast && window.cast.framework) {
            setCastAvailable(true);
            // Ideally we might want to check if context is already initialized or verify state
        }

    }, []);

    const handleCast = () => {
        if (castAvailable && window.cast) {
            cast.framework.CastContext.getInstance().requestSession()
                .then(() => {
                    console.log("Cast session started");
                    setShowMenu(false);
                })
                .catch((e) => {
                    if (e !== "cancel") {
                        console.error("Cast error", e);
                    }
                });
        }
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

    return (
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
                            <span>Cast Screen</span>
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
    );
}

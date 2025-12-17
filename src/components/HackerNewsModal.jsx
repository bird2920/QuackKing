import React, { useEffect } from "react";

export default function HackerNewsModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={() => onClose?.()}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-xl rounded-3xl bg-white text-slate-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hn-modal-title"
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-purple-500" />
        <button
          type="button"
          onClick={() => onClose?.()}
          className="absolute right-3 top-3 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
          aria-label="Close"
        >
          <span aria-hidden="true">✕</span>
        </button>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600">Heads up</p>
            <h2 id="hn-modal-title" className="text-2xl font-black text-slate-950">
              Heads up — you’re early
            </h2>
          </div>
          <div className="space-y-3 text-slate-700">
            <p className="font-semibold">You probably came here from Hacker News.</p>
            <p>
              This is a real-time multiplayer trivia game I’m stress-testing before a wider launch.
            </p>
            <p>
              If you’re poking at state, refresh behavior, reconnects, or edge cases — perfect.
            </p>
            <p>No tracking beyond basic analytics. No monetization. No account required.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => onClose?.()}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-3 text-base font-black text-slate-950 shadow-lg shadow-amber-200/70 transition hover:scale-[1.01]"
            >
              Jump in
            </button>
            <a
              href="/#/about"
              target="_blank"
              rel="noreferrer noopener"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 shadow-sm transition hover:border-amber-200 hover:text-amber-700 hover:shadow"
            >
              What’s the architecture?
            </a>
          </div>
          <p className="text-xs text-slate-500 pt-1">
            Hacker News feedback welcome — I’m in the comments.
          </p>
        </div>
      </div>
    </div>
  );
}

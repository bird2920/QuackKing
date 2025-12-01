import React, { useState, useEffect, useRef } from "react";
import QuackKingLogo from "../components/QuackKingLogo.jsx";

const CODE_LENGTH = 4;
const sanitizeCode = (value = "") =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH);
const toDigitArray = (value = "") =>
  Array.from({ length: CODE_LENGTH }, (_, idx) => value[idx] || "");

export default function HomeScreen({
  onJoin,
  onCreate,
  screenName,
  setScreenName,
  prefilledCode,
  authUser,
  onRequestAccount,
  onSignOut,
}) {
  const [codeDigits, setCodeDigits] = useState(() => toDigitArray(sanitizeCode(prefilledCode || "")));
  const [error, setError] = useState("");
  const [pendingFocusIndex, setPendingFocusIndex] = useState(null);
  const nameInputRef = useRef(null);
  const codeInputRefs = useRef([]);
  const autoFocusLockRef = useRef(false);

  const isPrefilled = Boolean(prefilledCode);
  const codeValue = codeDigits.join("");

  useEffect(() => nameInputRef.current?.focus(), []);

  useEffect(() => {
    if (!prefilledCode) return;
    setCodeDigits(toDigitArray(sanitizeCode(prefilledCode)));
  }, [prefilledCode]);

  const handleJoin = () => {
    if (!screenName.trim()) return setError("Please enter your name.");
    if (codeDigits.some((digit) => !digit)) return setError("Enter a valid 4-letter game code.");
    setError("");
    onJoin(codeValue);
  };

  const handleCreate = () => {
    if (!screenName.trim()) return setError("Please enter your name.");
    setError("");
    onCreate();
  };

  const focusInput = (index, immediate = false) => {
    if (index < 0 || index >= CODE_LENGTH) return;
    if (immediate) {
      const target = codeInputRefs.current[index];
      if (target) {
        autoFocusLockRef.current = true;
        target.focus();
      }
      return;
    }
    setPendingFocusIndex(index);
  };

  useEffect(() => {
    if (pendingFocusIndex === null) return;
    const target = codeInputRefs.current[pendingFocusIndex];
    if (target) {
      autoFocusLockRef.current = true;
      target.focus();
    }
    setPendingFocusIndex(null);
  }, [pendingFocusIndex]);

  const insertCharacters = (startIndex, value) => {
    if (!value) return startIndex;
    const chars = value.split("");
    let cursor = startIndex;
    const updates = [];

    chars.forEach((char) => {
      if (cursor >= CODE_LENGTH) return;
      updates.push({ index: cursor, char });
      cursor += 1;
    });

    if (!updates.length) return cursor;

    setCodeDigits((prev) => {
      const next = [...prev];
      updates.forEach(({ index, char }) => {
        next[index] = char;
      });
      return next;
    });

    return cursor;
  };

  const handleDigitChange = (index, rawValue) => {
    if (isPrefilled) return;
    const sanitized = sanitizeCode(rawValue);
    if (!sanitized) {
      setCodeDigits((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }

    const nextIndex = insertCharacters(index, sanitized);
    if (nextIndex < CODE_LENGTH) focusInput(nextIndex);
  };

  const handlePaste = (event, index) => {
    if (isPrefilled) return;
    const pasted = sanitizeCode(event.clipboardData.getData("text"));
    if (!pasted) return;
    event.preventDefault();
    const nextIndex = insertCharacters(index, pasted);
    if (nextIndex < CODE_LENGTH) focusInput(nextIndex);
  };

  const handleKeyDown = (event, index) => {
    if (isPrefilled) return;
    if (event.key === "Backspace") {
      event.preventDefault();
      setCodeDigits((prev) => {
        const next = [...prev];
        if (next[index]) {
          next[index] = "";
        } else if (index > 0) {
          next[index - 1] = "";
        }
        return next;
      });
      if (!codeDigits[index] && index > 0) {
        focusInput(index - 1, true);
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusInput(index - 1, true);
    } else if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      event.preventDefault();
      focusInput(index + 1, true);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-900 text-white">
      <div className="absolute inset-0 opacity-70 mix-blend-screen pointer-events-none">
        <div className="h-full w-full bg-[radial-gradient(circle_at_15%_20%,rgba(168,85,247,0.22),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(45,212,191,0.14),transparent_28%),radial-gradient(circle_at_20%_80%,rgba(244,114,182,0.16),transparent_26%)] blur-3xl" />
      </div>

      <div className="relative z-10 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-purple-100/70 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
              Join or host
            </div>
            <h1 className="text-5xl sm:text-6xl font-black tracking-tight drop-shadow-[0_15px_45px_rgba(79,70,229,0.35)]">
              <QuackKingLogo />
            </h1>
            <p className="text-lg sm:text-xl text-purple-100/80 font-semibold">
              Jump into a live party with a 4-letter code, or spin up your own lobby in seconds.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-[0_25px_120px_-35px_rgba(124,58,237,0.8)] border border-white/10 space-y-6">
            {error && (
              <p className="text-rose-200 text-center font-semibold text-sm bg-rose-500/20 border border-rose-300/40 rounded-xl px-4 py-2">
                {error}
              </p>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-purple-100/80">Your Name</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={screenName}
                  onChange={(e) => setScreenName(e.target.value.slice(0, 15))}
                  placeholder="Max 15 characters"
                  className="w-full p-3.5 rounded-2xl bg-white/10 border border-white/10 text-white placeholder:text-purple-100/50 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-transparent transition"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-purple-100/80">Game Code</label>
                <div className="flex justify-between gap-2">
                  {codeDigits.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      inputMode="text"
                      maxLength={1}
                      value={digit}
                      disabled={isPrefilled}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      onPaste={(e) => handlePaste(e, index)}
                      onFocus={(e) => {
                        if (autoFocusLockRef.current) {
                          autoFocusLockRef.current = false;
                          return;
                        }
                        e.target.select();
                      }}
                      ref={(el) => (codeInputRefs.current[index] = el)}
                      className={`w-14 h-14 sm:w-16 sm:h-16 text-center text-2xl font-black uppercase rounded-2xl border transition focus:outline-none focus:ring-2 ${
                        isPrefilled
                          ? "bg-green-100/70 border-green-300 text-green-900"
                          : "bg-slate-900/60 border-white/10 text-white focus:ring-amber-200"
                      }`}
                      aria-label={`Game code character ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <button
                onClick={handleJoin}
                disabled={!screenName.trim() || codeDigits.some((digit) => !digit)}
                className="p-3.5 w-full rounded-2xl bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 text-slate-950 font-black text-lg shadow-xl hover:scale-[1.01] transition disabled:opacity-60 disabled:hover:scale-100"
              >
                Join
              </button>
              <button
                onClick={handleCreate}
                disabled={!screenName.trim()}
                className="p-3.5 w-full rounded-2xl bg-gradient-to-r from-yellow-300 to-orange-400 text-slate-950 font-black text-lg shadow-xl hover:scale-[1.01] transition disabled:opacity-60 disabled:hover:scale-100"
              >
                Create Game
              </button>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 text-sm text-purple-100/70">
              <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-center">1) Pick a name</div>
              <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-center">2) Enter or share the code</div>
              <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-center">3) Battle for bragging rights</div>
            </div>

            <div className="text-center text-sm text-purple-100/70">
              {authUser && !authUser.isAnonymous ? (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <span>Signed in as {authUser.email || "QuackKing player"}</span>
                  <button
                    type="button"
                    onClick={() => onSignOut?.()}
                    className="text-xs font-semibold text-rose-200 underline-offset-4 hover:underline"
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onRequestAccount?.({ mode: "signin" })}
                  className="font-semibold text-amber-100 underline-offset-4 hover:underline"
                >
                  Want to keep your history? Sign in or create an account.
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

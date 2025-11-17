import React, { useState, useEffect, useRef } from "react";

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
    <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-6 mx-2">
      <h1 className="text-4xl font-extrabold text-center mb-4">Smartish</h1>
      {error && <p className="text-red-600 text-center mb-3 font-semibold text-sm">{error}</p>}

      <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
      <input
        ref={nameInputRef}
        type="text"
        value={screenName}
        onChange={(e) => setScreenName(e.target.value.slice(0, 15))}
        placeholder="Max 15 characters"
        className="w-full p-3 border rounded-lg mb-4 focus:ring-indigo-500 focus:border-indigo-500"
      />

      <div className="flex flex-col gap-3 mb-3">
        <div className="flex justify-center gap-1 sm:gap-2 flex-wrap">
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
              className={`w-14 h-14 sm:w-16 sm:h-16 text-center text-2xl font-black uppercase rounded-2xl border-4 focus:outline-none focus:ring-2 transition ${
                isPrefilled ? "bg-gray-200 border-green-400 text-green-700" : "border-indigo-300 text-gray-900"
              }`}
              aria-label={`Game code character ${index + 1}`}
            />
          ))}
        </div>
        <button
          onClick={handleJoin}
          disabled={!screenName.trim() || codeDigits.some((digit) => !digit)}
          className="p-3 w-full bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
        >
          Join
        </button>
      </div>

      <div className="text-center text-gray-500 my-2">— OR —</div>
      <button
        onClick={handleCreate}
        disabled={!screenName.trim()}
        className="w-full p-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50"
      >
        Create Game
      </button>

      <div className="mt-4 text-center text-sm text-gray-600">
        {authUser && !authUser.isAnonymous ? (
          <span>Signed in as {authUser.email || "Smartish player"}</span>
        ) : (
          <button
            type="button"
            onClick={() => onRequestAccount?.({ mode: "signin" })}
            className="font-semibold text-indigo-600 underline-offset-2 hover:underline"
          >
            Want to keep your history? Sign in or create an account.
          </button>
        )}
      </div>
    </div>
  );
}

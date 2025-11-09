import React, { useState, useEffect, useRef } from "react";

const CODE_LENGTH = 4;
const sanitizeCode = (value = "") =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH);
const toDigitArray = (value = "") =>
  Array.from({ length: CODE_LENGTH }, (_, idx) => value[idx] || "");

export default function HomeScreen({ onJoin, onCreate, screenName, setScreenName, prefilledCode }) {
  const [codeDigits, setCodeDigits] = useState(() => toDigitArray(sanitizeCode(prefilledCode || "")));
  const [error, setError] = useState("");
  const nameInputRef = useRef(null);
  const codeInputRefs = useRef([]);

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

  const focusInput = (index) => {
    codeInputRefs.current[index]?.focus();
  };

  const insertCharacters = (startIndex, value) => {
    if (!value) return startIndex;
    let cursor = startIndex;
    setCodeDigits((prev) => {
      const next = [...prev];
      value.split("").forEach((char) => {
        if (cursor >= CODE_LENGTH) return;
        next[cursor] = char;
        cursor += 1;
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
        focusInput(index - 1);
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
    } else if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      event.preventDefault();
      focusInput(index + 1);
    }
  };

  return (
    <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-6 mx-2">
      <h1 className="text-4xl font-extrabold text-center mb-4">Knowish</h1>
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
              onFocus={(e) => e.target.select()}
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
    </div>
  );
}

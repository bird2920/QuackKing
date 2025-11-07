import React, { useState, useEffect, useRef } from "react";

export default function HomeScreen({ onJoin, onCreate, screenName, setScreenName, prefilledCode }) {
  const [code, setCode] = useState(prefilledCode || "");
  const [error, setError] = useState("");
  const nameInputRef = useRef(null);

  useEffect(() => nameInputRef.current?.focus(), []);

  const handleJoin = () => {
    if (!screenName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (code.trim().length !== 4) {
      setError("Enter a valid 4-letter game code.");
      return;
    }
    setError("");
    onJoin(code.toUpperCase());
  };

  const handleCreate = () => {
    if (!screenName.trim()) {
      setError("Please enter your name.");
      return;
    }
    setError("");
    onCreate();
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
        onChange={e => {
          setScreenName(e.target.value.slice(0, 15));
          if (error && e.target.value.trim()) setError("");
        }}
        placeholder="Max 15 characters"
        className="w-full p-3 border rounded-lg mb-1 focus:ring-indigo-500 focus:border-indigo-500"
      />

      <div className="flex gap-3 mb-3">
        <input
          type="text"
          value={code}
          onChange={(e) => !prefilledCode && setCode(e.target.value.toUpperCase().slice(0, 4))}
          placeholder="CODE"
          maxLength="4"
          disabled={!!prefilledCode}
          className={`flex-grow p-3 border-4 rounded-xl text-center text-xl font-bold tracking-widest uppercase ${
            prefilledCode ? "bg-gray-200 border-green-400 text-green-700" : "border-indigo-300"
          }`}
        />
        <button
          onClick={handleJoin}
          onMouseDown={e => {
            if (!screenName.trim()) {
              setError("Please enter your name.");
              e.preventDefault();
            } else if (code.length !== 4) {
              setError("Enter a valid 4-letter game code.");
              e.preventDefault();
            }
          }}
          onPointerDown={e => {
            if (!screenName.trim()) {
              setError("Please enter your name.");
              e.preventDefault();
            } else if (code.length !== 4) {
              setError("Enter a valid 4-letter game code.");
              e.preventDefault();
            }
          }}
          disabled={!screenName.trim() || code.length !== 4}
          className="p-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
        >
          Join
        </button>
      </div>

      <div className="text-center text-gray-500 my-2">— OR —</div>
      <button
        onClick={handleCreate}
        onMouseDown={e => {
          if (!screenName.trim()) {
            setError("Please enter your name.");
            e.preventDefault();
          }
        }}
        onPointerDown={e => {
          if (!screenName.trim()) {
            setError("Please enter your name.");
            e.preventDefault();
          }
        }}
        disabled={!screenName.trim()}
        className="w-full p-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50"
      >
        Create Game
      </button>
    </div>
  );
}
import React, { useEffect, useState } from "react";
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";

const AUTH_ERRORS = {
  "auth/invalid-email": "Enter a valid email address.",
  "auth/email-already-in-use": "Email already has an account. Try signing in.",
  "auth/weak-password": "Pick a stronger password (6+ characters).",
  "auth/wrong-password": "Incorrect password. Try again.",
  "auth/user-not-found": "No account exists with that email.",
  "auth/credential-already-in-use":
    "That email is linked elsewhere. Sign in instead of creating a new account.",
};

const getFriendlyMessage = (error) => {
  if (!error) return "Something went wrong. Please try again.";
  return AUTH_ERRORS[error.code] || error.message || "Authentication failed.";
};

export default function AccountModal({
  auth,
  isOpen,
  mode = "signup",
  onClose,
  onSuccess,
  onSwitchMode,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setPassword("");
      setError("");
      setStatus("idle");
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const isLoading = status === "loading";
  const isSignup = mode === "signup";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!auth) return;
    if (!email || !password) {
      setError("Please enter an email and password.");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      if (isSignup) {
        if (auth.currentUser && auth.currentUser.isAnonymous) {
          const credential = EmailAuthProvider.credential(email, password);
          await linkWithCredential(auth.currentUser, credential);
        } else {
          await createUserWithEmailAndPassword(auth, email, password);
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setStatus("success");
      onSuccess?.();
    } catch (err) {
      console.error("Auth error:", err);
      setStatus("error");
      setError(getFriendlyMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
              {isSignup ? "Create account" : "Welcome back"}
            </p>
            <h2 className="text-2xl font-bold text-slate-900">
              {isSignup ? "Save your stats" : "Sign in to continue"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
              placeholder="Minimum 6 characters"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 text-lg font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.01] disabled:opacity-60"
          >
            {isLoading ? "Saving..." : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-slate-600">
          {isSignup ? "Already have an account?" : "Need an account?"}{" "}
          <button
            onClick={() => onSwitchMode?.()}
            className="font-semibold text-indigo-600 underline-offset-2 hover:underline"
          >
            {isSignup ? "Sign in" : "Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}

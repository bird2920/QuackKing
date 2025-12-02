import React, { useEffect, useState } from "react";
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import QuackKingLogo from "./QuackKingLogo.jsx";

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
  const [resetStatus, setResetStatus] = useState("idle");
  const [resetMessage, setResetMessage] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setPassword("");
      setError("");
      setStatus("idle");
      setResetStatus("idle");
      setResetMessage("");
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

  const handlePasswordReset = async () => {
    if (!auth || isSignup) return;
    if (!email) {
      setResetStatus("error");
      setResetMessage("Enter your account email first.");
      return;
    }
    setResetStatus("loading");
    setResetMessage("");
    try {
      await sendPasswordResetEmail(auth, email);
      setResetStatus("success");
      setResetMessage("Reset link sent! Check your inbox.");
    } catch (err) {
      console.error("Password reset error:", err);
      setResetStatus("error");
      setResetMessage(getFriendlyMessage(err));
    }
  };

  const handleReturnToGame = () => {
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-10 backdrop-blur-xl">
      <div className="absolute inset-0 opacity-70 mix-blend-screen pointer-events-none">
        <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,0.22),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(45,212,191,0.14),transparent_28%),radial-gradient(circle_at_20%_80%,rgba(244,114,182,0.16),transparent_26%)] blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-purple-900/70 to-indigo-900/70 p-8 shadow-[0_25px_120px_-35px_rgba(124,58,237,0.8)] text-white">
        <div className="absolute -left-10 -top-12 h-40 w-40 rounded-full bg-amber-300/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-12 -right-10 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" aria-hidden />

        <div className="relative flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.32em] text-purple-100/80 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
              {isSignup ? "Create account" : "Welcome back"}
            </div>
            <div className="flex items-center gap-2">
              <QuackKingLogo className="text-2xl font-black tracking-tight" />
              <span className="text-sm text-purple-100/70">Secure your stats & history</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white">
              {isSignup ? "Save your wins" : "Sign in to keep playing"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-purple-100 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative mt-8 space-y-5">
          {error && (
            <div className="rounded-2xl border border-rose-300/50 bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-100">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-purple-100/90">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-purple-100/50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:opacity-60"
              placeholder="you@quackking.gg"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-purple-100/90">Password</label>
            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
              <input
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white placeholder:text-purple-100/50 focus:border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-200/60 disabled:opacity-60"
                placeholder={isSignup ? "Minimum 6 characters" : "Enter your password"}
              />
              {!isSignup && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-purple-100/80">
                  <span>Forgot it?</span>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={isLoading || resetStatus === "loading"}
                    className="rounded-full bg-white/5 px-3 py-1 text-amber-200 underline-offset-4 transition hover:bg-white/10 disabled:opacity-60"
                  >
                    {resetStatus === "loading" ? "Sending reset link…" : "Send reset link"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {resetMessage && (
            <div
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
                resetStatus === "error"
                  ? "border-rose-300/50 bg-rose-500/15 text-rose-100"
                  : "border-emerald-200/60 bg-emerald-500/15 text-emerald-50"
              }`}
            >
              <span className="text-lg">{resetStatus === "error" ? "⚠️" : "✅"}</span>
              <div className="space-y-1">
                <p className="font-semibold">{resetMessage}</p>
                {resetStatus === "success" && (
                  <p className="text-[13px] text-emerald-50/80">
                    Check your inbox, set a new password, then sign back in below. We will keep your spot warm.
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-gradient-to-r from-yellow-300 via-amber-200 to-orange-400 px-4 py-3 text-lg font-black text-slate-950 shadow-xl shadow-amber-300/30 transition hover:scale-[1.01] disabled:opacity-60"
          >
            {isLoading ? "Saving..." : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-purple-100/80">
          <div>
            {isSignup ? "Already have an account?" : "Need an account?"}{" "}
            <button
              onClick={() => onSwitchMode?.()}
              className="font-semibold text-amber-100 underline-offset-4 hover:underline"
            >
              {isSignup ? "Sign in" : "Create one"}
            </button>
          </div>
          <button
            type="button"
            onClick={handleReturnToGame}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-amber-100 transition hover:border-amber-200 hover:bg-amber-200/10"
          >
            Return to the game
          </button>
        </div>
      </div>
    </div>
  );
}

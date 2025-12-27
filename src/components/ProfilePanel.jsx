import React, { useEffect, useMemo, useState } from "react";
import {
  EmailAuthProvider,
  linkWithCredential,
  sendPasswordResetEmail,
  updatePassword,
} from "firebase/auth";
import { getDoc } from "firebase/firestore";
import { getUserStatsDocPath } from "../helpers/firebasePaths";
import { getAchievementService } from "../services/achievements";

const ACHIEVEMENT_ICON_MAP = {
  core_under_1s_correct: "⚡️",
  core_perfect_party_game: "🎉",
  core_first_game_created: "🚀",
  core_first_game_joined: "🙌",
  core_five_perfect_games: "💯",
  core_clutch_answer: "🏁",
  core_lightning_round: "🌩️",
  core_comeback_kid: "📈",
  core_party_starter: "🎊",
  core_scholar_mode_activated: "📚",
};

const formatDate = (timestamp) => {
  if (!timestamp) return "Unknown date";

  // Support Firestore Timestamp or raw ms
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toLocaleString();
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString();
};

function useUserStats(db, userId, isOpen) {
  const [games, setGames] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !db || !userId) return;

    let isActive = true;

    const loadStats = async () => {
      setStatus("loading");
      setError("");
      try {
        const ref = getUserStatsDocPath(db, userId);
        const snap = await getDoc(ref);
        if (!isActive) return;

        if (!snap.exists()) {
          setGames([]);
          setStatus("success");
          return;
        }

        const data = snap.data() || {};
        const rawGames = Array.isArray(data.games) ? data.games : [];

        const normalized = rawGames
          .map((entry) => ({
            gameCode: entry?.gameCode || null,
            score: entry?.score ?? 0,
            correct: entry?.correct ?? 0,
            answered: entry?.answered ?? 0,
            placement: entry?.placement ?? null,
            savedAt: entry?.savedAt || entry?.timestamp || null,
          }))
          .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));

        // Legacy fallback
        if (!normalized.length && data.lastGame) {
          normalized.push({
            gameCode: data.lastGame.gameCode || null,
            score: data.lastGame.score || 0,
            correct: data.lastGame.correct || 0,
            answered: data.lastGame.answered || 0,
            placement: data.lastGame.placement || null,
            savedAt: data.lastGame.savedAt || data.updatedAt || null,
          });
        }

        setGames(normalized);
        setStatus("success");
      } catch (err) {
        console.error("Failed to load stats:", err);
        if (!isActive) return;
        setError("Could not load your saved games right now.");
        setStatus("error");
      }
    };

    loadStats();

    return () => {
      isActive = false;
    };
  }, [db, userId, isOpen]);

  return { games, status, error };
}

function useUserAchievements(achievementService, userId, isOpen) {
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    if (!isOpen || !userId) return;

    let isActive = true;

    try {
      const unlocked = achievementService.getAchievementsForUser(userId) || [];
      if (isActive) {
        setAchievements(unlocked);
      }
    } catch (err) {
      console.error("Failed to load achievements:", err);
    }

    return () => {
      isActive = false;
    };
  }, [achievementService, userId, isOpen]);

  return achievements;
}

function SavedGamesList({ games, userId, status, error, onSelectGame }) {
  if (status === "loading") {
    return (
      <div className="mt-3 space-y-2">
        <div className="h-10 w-full animate-pulse rounded-xl bg-white/10" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-white/5" />
        <div className="h-10 w-2/3 animate-pulse rounded-xl bg-white/5" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mt-3 rounded-2xl border border-rose-400/60 bg-rose-500/10 p-3 text-sm text-rose-50">
        {error}
      </div>
    );
  }

  if (!games?.length) {
    return (
      <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-purple-100/80">
        No saved games yet for this ID. Save your results at the end of a match to see them here.
      </div>
    );
  }

  // Calculate aggregate statistics
  const totalGames = games.length;
  const totalScore = games.reduce((sum, g) => sum + (g.score || 0), 0);
  const avgScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;
  const placements = games.map(g => g.placement || Infinity).filter(p => p !== Infinity);
  const bestPlacement = placements.length > 0 ? Math.min(...placements) : null;
  const totalCorrect = games.reduce((sum, g) => sum + (g.correct || 0), 0);
  const totalAnswered = games.reduce((sum, g) => sum + (g.answered || 0), 0);
  const overallAccuracy = totalAnswered > 0
    ? Math.round((totalCorrect / totalAnswered) * 100)
    : 0;

  return (
    <div className="mt-4 space-y-4">
      {/* Aggregate Statistics Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-3">
          <p className="text-[10px] uppercase tracking-wider text-purple-200/70">
            Total games
          </p>
          <p className="text-2xl font-bold text-white mt-1">{totalGames}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-3">
          <p className="text-[10px] uppercase tracking-wider text-purple-200/70">
            Avg score
          </p>
          <p className="text-2xl font-bold text-white mt-1">{avgScore}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-3">
          <p className="text-[10px] uppercase tracking-wider text-purple-200/70">
            Best rank
          </p>
          <p className="text-2xl font-bold text-white mt-1">
            {bestPlacement !== null ? `#${bestPlacement}` : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-3">
          <p className="text-[10px] uppercase tracking-wider text-purple-200/70">
            Accuracy
          </p>
          <p className="text-2xl font-bold text-white mt-1">{overallAccuracy}%</p>
        </div>
      </div>

      {/* Games List Header */}
      <div className="flex items-center justify-between text-xs text-purple-100/70">
        <span>Saved for ID: <span className="font-mono text-amber-100">{userId}</span></span>
        <span>{games.length} game{games.length === 1 ? "" : "s"}</span>
      </div>

      {/* Games List */}
      <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-slate-900/70">
        {games.map((game, index) => {
          const accuracy =
            game.answered && game.answered > 0
              ? `${Math.round(((game.correct || 0) / (game.answered || 1)) * 100)}%`
              : "—";

          return (
            <div
              key={`${game.gameCode || "game"}-${game.savedAt || index}`}
              className="flex flex-col gap-2 px-4 py-3 text-sm text-purple-100/85 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-200/80">
                    {game.gameCode || "Unknown"}
                  </span>
                  {game.placement && (
                    <span className="text-xs text-amber-100">
                      #{game.placement} place
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-purple-300/80">
                  {formatDate(game.savedAt)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <div className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px]">
                  <span className="uppercase tracking-[0.18em] text-purple-300/80">Score</span>
                  <span className="font-semibold text-white">{game.score ?? 0}</span>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px]">
                  <span className="uppercase tracking-[0.18em] text-purple-300/80">Accuracy</span>
                  <span className="font-semibold text-white">{accuracy}</span>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px]">
                  <span className="uppercase tracking-[0.18em] text-purple-300/80">Correct</span>
                  <span className="font-semibold text-white">
                    {game.correct ?? 0}/{game.answered ?? 0}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectGame?.({ ...game, userId })}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-amber-100 transition hover:border-amber-200 hover:bg-amber-200/10"
                >
                  View details
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AchievementsList({ achievements, achievementService }) {
  // Get all core achievements to show locked ones
  const allAchievements = achievementService?.getAllCoreAchievements() || [];
  const unlockedIds = new Set(achievements.map(a => a.achievement.id));
  const locked = allAchievements.filter(a => !unlockedIds.has(a.id)).slice(0, 3);

  if (!achievements?.length && !locked.length) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-purple-100/80">
        Unlock achievements during games to see them here.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      {/* Unlocked Achievements */}
      {achievements?.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-purple-100/80">
            <span>Unlocked achievements</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-amber-100">
              {achievements.length} unlocked
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1">
            {achievements.map((entry) => (
              <div
                key={entry.achievement.id}
                className="min-w-[220px] max-w-[260px] flex-shrink-0 rounded-2xl border border-white/10 bg-slate-900/70 p-3 shadow-inner shadow-black/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl">
                    {ACHIEVEMENT_ICON_MAP[entry.achievement.id] || "🏅"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {entry.achievement.name}
                    </p>
                    {entry.unlock?.timestamp && (
                      <p className="mt-0.5 text-[11px] text-purple-200/80">
                        Unlocked {formatDate(entry.unlock.timestamp)}
                      </p>
                    )}
                  </div>
                </div>
                {entry.achievement.description && (
                  <p className="mt-2 text-xs text-purple-100/80">
                    {entry.achievement.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Achievements */}
      {locked.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-purple-100/70">
            <span>Next to unlock</span>
            <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold text-purple-300/60">
              {allAchievements.length - unlockedIds.size} remaining
            </span>
          </div>
          <div className="grid gap-3">
            {locked.map(achievement => (
              <div
                key={achievement.id}
                className="rounded-xl border border-white/5 bg-slate-900/40 p-3 opacity-70 hover:opacity-90 transition-opacity"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-lg grayscale">
                    🔒
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/70">
                      {achievement.name}
                    </p>
                    {achievement.description && (
                      <p className="text-xs text-purple-100/60 mt-0.5">
                        {achievement.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GameDetailsSheet({ game, onClose }) {
  const [touchStartY, setTouchStartY] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!game) return null;

  const accuracy =
    game.answered && game.answered > 0
      ? `${Math.round(((game.correct || 0) / (game.answered || 1)) * 100)}%`
      : "—";
  const playerName = game.playerName || null;
  const theme = game.theme || null;

  const handleTouchStart = (e) => {
    setTouchStartY(e.touches?.[0]?.clientY ?? null);
  };

  const handleTouchEnd = (e) => {
    if (touchStartY === null) return;
    const endY = e.changedTouches?.[0]?.clientY ?? touchStartY;
    if (endY - touchStartY > 60) {
      onClose?.();
    }
    setTouchStartY(null);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 px-3 py-4 backdrop-blur-xl md:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`w-full max-w-[420px] transform overflow-hidden rounded-t-3xl border border-white/10 bg-slate-900/90 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] transition-all duration-300 ease-out md:rounded-3xl ${visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
      >
        <div className="relative px-5 pb-10 pt-5">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-purple-200/75">Game</p>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-sm font-semibold text-amber-100">
                  {game.gameCode || "Unknown"}
                </span>
                {game.placement && (
                  <span className="text-xs text-amber-200">#{game.placement} place</span>
                )}
              </div>
              <p className="mt-1 text-xs text-purple-100/75">{formatDate(game.savedAt)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-purple-100 transition hover:bg-white/10 hover:text-white"
              aria-label="Close details"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm text-purple-100/85">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-purple-200/70">Score</p>
              <p className="text-2xl font-bold text-white">{game.score ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-purple-200/70">Accuracy</p>
              <p className="text-2xl font-bold text-white">{accuracy}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-purple-200/70">Answered</p>
              <p className="text-2xl font-bold text-white">
                {game.correct ?? 0}/{game.answered ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-purple-200/70">Placement</p>
              <p className="text-2xl font-bold text-white">
                {game.placement ? `#${game.placement}` : "—"}
              </p>
            </div>
            {playerName && (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.3em] text-purple-200/70">Player</p>
                <p className="text-lg font-semibold text-white">{playerName}</p>
              </div>
            )}
            {theme && (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.3em] text-purple-200/70">Theme</p>
                <p className="text-base font-semibold text-white">{theme}</p>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-purple-100/80">
            Saved for ID{" "}
            <span className="font-mono text-amber-100">{game.userId || "current session"}</span>
          </div>
        </div>
      </div>

    </div>
  );
}

function AccountSection({ auth, authUser, onRequestAccount, userId }) {
  const [email, setEmail] = useState(authUser?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  const isAnonymous = !authUser || authUser.isAnonymous;
  const isWorking = status === "loading";

  useEffect(() => {
    if (authUser?.email) {
      setEmail(authUser.email);
    }
  }, [authUser]);

  const handleSavePassword = async () => {
    if (!auth || !auth.currentUser) return;

    const trimmedPassword = newPassword.trim();
    const trimmedEmail = email.trim();

    if (!trimmedPassword || trimmedPassword.length < 6) {
      setStatus("error");
      setMessage("Choose a password with at least 6 characters.");
      return;
    }

    if (isAnonymous && !trimmedEmail) {
      setStatus("error");
      setMessage("Add an email so we can attach this ID to an account.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      if (isAnonymous) {
        const credential = EmailAuthProvider.credential(trimmedEmail, trimmedPassword);
        await linkWithCredential(auth.currentUser, credential);
        setStatus("success");
        setMessage("Done! This guest ID is now upgraded to a full account.");
      } else {
        await updatePassword(auth.currentUser, trimmedPassword);
        setStatus("success");
        setMessage("Password updated. Use it next time you sign in.");
      }
      setNewPassword("");
    } catch (err) {
      console.error("Password change error:", err);
      const friendly =
        err?.code === "auth/requires-recent-login"
          ? "Please sign in again to change your password."
          : err?.message || "Could not update password right now.";
      setStatus("error");
      setMessage(friendly);
    }
  };

  const handleSendReset = async () => {
    const trimmedEmail = email.trim();

    if (!auth || !trimmedEmail) {
      setStatus("error");
      setMessage("Add an email first so we can send the reset link.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setStatus("success");
      setMessage("Reset link sent. Check your inbox.");
    } catch (err) {
      console.error("Reset link error:", err);
      setStatus("error");
      setMessage(err?.message || "Could not send reset link right now.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-purple-200/80">Account</p>
            <h3 className="text-lg font-bold text-white">
              {authUser?.email || (isAnonymous ? "Guest profile" : "Unknown user")}
            </h3>
            <p className="mt-1 text-xs text-purple-100/80">
              {isAnonymous
                ? "You’re playing as a guest. Upgrade to a full account to keep your games and achievements across devices."
                : "Signed in. Your saved games and achievements are already attached to this account."}
            </p>
          </div>
          <div className="text-right text-xs text-purple-100/70 max-w-[180px] sm:max-w-[240px] break-all ml-auto">
            <p>{isAnonymous ? "Guest mode" : "Signed in"}</p>
            {userId && (
              <p className="mt-1 font-mono text-[11px] text-amber-100">ID: {userId}</p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {isAnonymous && (
            <button
              type="button"
              onClick={() => onRequestAccount?.({ mode: "signup" })}
              className="rounded-xl bg-gradient-to-r from-yellow-300 to-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-300/30 transition hover:scale-[1.01]"
            >
              Upgrade to full account
            </button>
          )}
          {!isAnonymous && (
            <button
              type="button"
              onClick={() => onRequestAccount?.({ mode: "signin" })}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-200 hover:bg-amber-200/10"
            >
              Manage account
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-inner shadow-black/30 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-purple-200/80">Security</p>
            <h3 className="text-lg font-bold text-white">Keep this profile yours</h3>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-purple-100/90">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!isAnonymous || isWorking}
            placeholder={isAnonymous ? "Add an email to lock in this ID" : authUser?.email || "Signed in"}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-purple-100/50 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:opacity-60"
          />
          <p className="text-xs text-purple-100/75">
            {isAnonymous
              ? "Link an email + password so your saved games stay with you."
              : "Use a new password below or send a reset link to your email."}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-purple-100/90">
            {isAnonymous ? "Create a password" : "New password"}
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isWorking}
            placeholder="••••••••"
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-white placeholder:text-purple-100/50 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:opacity-60"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSavePassword}
              disabled={isWorking}
              className="rounded-xl bg-gradient-to-r from-yellow-300 to-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-300/30 transition hover:scale-[1.01] disabled:opacity-60"
            >
              {isAnonymous ? "Save email + password" : "Update password"}
            </button>
            {!isAnonymous && (
              <button
                type="button"
                onClick={handleSendReset}
                disabled={isWorking}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-200 hover:bg-amber-200/10 disabled:opacity-60"
              >
                Send reset link
              </button>
            )}
          </div>
        </div>

        {message && (
          <div
            className={`rounded-xl border px-3 py-2 text-sm ${status === "error"
              ? "border-rose-400/60 bg-rose-500/10 text-rose-50"
              : "border-emerald-300/50 bg-emerald-500/10 text-emerald-50"
              }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfilePanel({
  isOpen,
  onClose,
  db,
  auth,
  authUser,
  userId,
  onRequestAccount,
}) {
  const [activeTab, setActiveTab] = useState("games"); // 'games' | 'achievements' | 'account'
  const achievementService = useMemo(() => getAchievementService(), []);
  const { games, status: statsStatus, error: statsError } = useUserStats(db, userId, isOpen);
  const achievements = useUserAchievements(achievementService, userId, isOpen);
  const [selectedGame, setSelectedGame] = useState(null);
  const dialogRef = React.useRef(null);
  const closeButtonRef = React.useRef(null);

  // Focus management - trap focus on open
  useEffect(() => {
    if (!isOpen) return;

    // Focus the close button when modal opens
    const focusTimer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 100);

    return () => clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    // Reset to games tab each time it opens if you want:
    setActiveTab("games");
    setSelectedGame(null);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-slate-950/80 px-4 py-6 backdrop-blur-xl"
      onClick={onClose}
      role="presentation"
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none opacity-70 mix-blend-screen">
        <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,0.18),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(45,212,191,0.12),transparent_28%),radial-gradient(circle_at_20%_80%,rgba(244,114,182,0.14),transparent_26%)] blur-3xl" />
      </div>

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-panel-title"
        aria-describedby="profile-panel-description"
        className="relative w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/95 via-purple-950/85 to-indigo-950/85 p-6 shadow-[0_25px_120px_-35px_rgba(124,58,237,0.85)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-purple-100/80">
              Profile
            </div>
            <h2 id="profile-panel-title" className="text-3xl font-black text-white">
              Your games, achievements, and access
            </h2>
            <p id="profile-panel-description" className="text-sm text-purple-100/80">
              Showing data for ID{" "}
              <span className="font-mono text-amber-100">{userId || "guest"}</span>
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="rounded-full p-2 text-purple-100 transition hover:bg-white/10 hover:text-white"
            aria-label="Close profile panel"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Profile sections"
          className="mt-5 flex flex-wrap gap-2 rounded-full bg-white/5 p-1 text-xs text-purple-100/80"
          onKeyDown={(e) => {
            const tabs = ["games", "achievements", "account"];
            const currentIndex = tabs.indexOf(activeTab);

            if (e.key === "ArrowRight") {
              e.preventDefault();
              const nextIndex = (currentIndex + 1) % tabs.length;
              setActiveTab(tabs[nextIndex]);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
              setActiveTab(tabs[prevIndex]);
            } else if (e.key === "Home") {
              e.preventDefault();
              setActiveTab(tabs[0]);
            } else if (e.key === "End") {
              e.preventDefault();
              setActiveTab(tabs[tabs.length - 1]);
            }
          }}
        >
          {[
            { id: "games", label: "Games" },
            { id: "achievements", label: "Achievements" },
            { id: "account", label: "Account" },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`${tab.id}-tab`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-full px-3 py-1.5 font-semibold transition ${activeTab === tab.id
                ? "bg-slate-900 text-amber-100 shadow-sm shadow-black/40"
                : "text-purple-100/80 hover:bg-white/10"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="mt-6">
          {activeTab === "games" && (
            <div
              role="tabpanel"
              id="games-panel"
              aria-labelledby="games-tab"
              className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.25em] text-purple-200/80">
                    Saved games
                  </p>
                  <h3 className="text-lg font-bold text-white">
                    {games.length
                      ? `${games.length} saved game${games.length === 1 ? "" : "s"}`
                      : "No saved games yet"}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-purple-100/70">
                  {statsStatus === "loading" && <span className="animate-pulse">Loading…</span>}
                  {statsStatus === "error" && (
                    <span className="text-rose-200">{statsError}</span>
                  )}
                </div>
              </div>
              <SavedGamesList
                games={games}
                userId={userId}
                status={statsStatus}
                error={statsError}
                onSelectGame={setSelectedGame}
              />
            </div>
          )}

          {activeTab === "achievements" && (
            <div
              role="tabpanel"
              id="achievements-panel"
              aria-labelledby="achievements-tab"
              className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.25em] text-purple-200/80">
                    Achievements
                  </p>
                  <h3 className="text-lg font-bold text-white">
                    {achievements.length ? "Your unlocked achievements" : "No achievements yet"}
                  </h3>
                  <p className="mt-1 text-xs text-purple-100/80">
                    Play more games, chase perfect rounds, and watch this fill up.
                  </p>
                </div>
              </div>
              <AchievementsList achievements={achievements} achievementService={achievementService} />
            </div>
          )}

          {activeTab === "account" && (
            <div
              role="tabpanel"
              id="account-panel"
              aria-labelledby="account-tab"
            >
              <AccountSection
                auth={auth}
                authUser={authUser}
                onRequestAccount={onRequestAccount}
                userId={userId}
              />
            </div>
          )}
        </div>
        <GameDetailsSheet game={selectedGame} onClose={() => setSelectedGame(null)} />
      </div>
    </div>
  );
}

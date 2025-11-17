import React, { useMemo, useState } from "react";

const FALLBACK_ICONS = ["🏅", "🎯", "⚡️", "🔥"];

export default function PlayerAchievements({ playerId, recentAchievements = [] }) {
  const [expanded, setExpanded] = useState(false);

  const stripItems = useMemo(() => recentAchievements.slice(0, 4), [recentAchievements]);
  const hasAchievements = playerId && stripItems.length > 0;

  if (!hasAchievements) {
    return null;
  }

  const toggleExpanded = () => setExpanded((prev) => !prev);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-3 text-xs text-purple-100/70 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.35em] text-purple-200/70">
          <span role="img" aria-label="achievements">
            🏆
          </span>
          Achievements
        </div>
        {recentAchievements.length > 0 && (
          <button
            type="button"
            className="text-[0.65rem] uppercase tracking-wide text-yellow-200 hover:text-yellow-100"
            onClick={toggleExpanded}
          >
            {expanded ? "Hide" : "View more"}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {stripItems.map((achievement, index) => (
          <span
            key={achievement.id}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[0.7rem] font-semibold text-white/90"
          >
            <span>{achievement.icon || FALLBACK_ICONS[index % FALLBACK_ICONS.length]}</span>
            <span className="truncate max-w-[120px]">{achievement.shortLabel || achievement.label}</span>
          </span>
        ))}
      </div>

      {expanded && (
        <div className="space-y-2">
          {recentAchievements.map((achievement, index) => (
            <div
              key={`${achievement.id}-${index}`}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/90"
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-white">
                <span>{achievement.icon || FALLBACK_ICONS[index % FALLBACK_ICONS.length]}</span>
                {achievement.label}
              </p>
              {achievement.description && (
                <p className="text-xs text-purple-100/70 mt-1">{achievement.description}</p>
              )}
              {achievement.unlockedAt && (
                <p className="text-[0.6rem] uppercase tracking-[0.3em] text-purple-200/70 mt-2">
                  {new Date(achievement.unlockedAt).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

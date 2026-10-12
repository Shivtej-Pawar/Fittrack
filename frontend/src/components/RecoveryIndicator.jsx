import { useMemo } from "react";

/**
 * Recovery Indicator (Phase 13 / Feature 7) — a lightweight, explicitly
 * non-medical suggestion of which muscle groups might need more rest,
 * based purely on days since last trained. No physiology model, no
 * claim of accuracy — just "how long has it been," labeled as a
 * suggestion per the spec's explicit "do not claim medical accuracy."
 */

const RECOVERY_THRESHOLD_DAYS = 2; // fewer days than this = still "recovering"

function daysSince(date) {
  const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((start(new Date()) - start(date)) / (24 * 60 * 60 * 1000));
}

function getStatus(days) {
  if (days === 0) return { label: "Trained today", tone: "recovering" };
  if (days < RECOVERY_THRESHOLD_DAYS) {
    return { label: `Recovering (trained ${days} day${days === 1 ? "" : "s"} ago)`, tone: "recovering" };
  }
  return { label: `Rested for ${days} days — ready to train`, tone: "ready" };
}

export default function RecoveryIndicator({ workouts }) {
  const rows = useMemo(() => {
    const lastTrained = new Map(); // muscle_group -> most recent Date
    for (const workout of workouts) {
      if (!workout.muscle_group) continue;
      const date = new Date(workout.created_at);
      const existing = lastTrained.get(workout.muscle_group);
      if (!existing || date > existing) {
        lastTrained.set(workout.muscle_group, date);
      }
    }
    return Array.from(lastTrained.entries())
      .map(([group, date]) => ({ group, days: daysSince(date), ...getStatus(daysSince(date)) }))
      .sort((a, b) => b.days - a.days);
  }, [workouts]);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-lg shadow-black/5 dark:shadow-black/10 sm:p-6">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
        Recovery
      </h3>
      <p className="mt-0.5 text-xs text-gray-500">
        A training suggestion based on your history — not medical advice.
      </p>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          Log a Strength workout to see recovery suggestions here.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.slice(0, 5).map((row) => (
            <li key={row.group} className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                {row.group}
              </span>
              <span
                className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  row.tone === "ready"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {row.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

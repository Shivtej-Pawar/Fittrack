import { workoutVolume } from "../utils/workoutHelpers";

/**
 * Weekly Comparison Analytics (Phase 15 / Feature 5).
 *
 * Compares the last 7 days against the 7 days before that, across
 * Workouts / Sets / Volume / Calories — entirely computed client-side
 * from the same `workouts` array every other Dashboard card already
 * receives (from getWorkouts()). No backend changes, no new endpoint.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function summarizeRange(workouts, fromMs, toMs) {
  const inRange = workouts.filter((w) => {
    const created = new Date(w.created_at).getTime();
    return created >= fromMs && created < toMs;
  });
  return {
    workouts: inRange.length,
    sets: inRange.reduce((sum, w) => sum + (w.set_entries?.length ?? 0), 0),
    volume: inRange.reduce((sum, w) => sum + workoutVolume(w), 0),
    calories: inRange.reduce((sum, w) => sum + (w.calories ?? 0), 0),
  };
}

// Percentage change from `previous` to `current`. Previous = 0 is a
// special case (division by zero) — treated as "New" rather than a
// meaningless "+Infinity%" or a misleading "0%".
function percentChange(current, previous) {
  if (previous === 0) return current === 0 ? null : "new";
  return Math.round(((current - previous) / previous) * 100);
}

const METRICS = [
  { key: "workouts", label: "Workouts", icon: "📋" },
  { key: "sets", label: "Sets", icon: "🔁" },
  { key: "volume", label: "Volume", icon: "⚖", unit: "kg" },
  { key: "calories", label: "Calories", icon: "🔥", unit: "kcal" },
];

function TrendBadge({ current, previous }) {
  const change = percentChange(current, previous);

  if (change === null) {
    return <span className="text-xs font-medium text-gray-400">—</span>;
  }
  if (change === "new") {
    return (
      <span className="trend-arrow-in text-xs font-semibold text-blue-600 dark:text-blue-400">
        New
      </span>
    );
  }
  if (change === 0) {
    return <span className="trend-arrow-in text-xs font-medium text-gray-500">No change</span>;
  }

  const isUp = change > 0;
  return (
    <span
      className={`trend-arrow-in inline-flex items-center gap-0.5 text-xs font-semibold ${
        isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
      }`}
    >
      <span aria-hidden="true">{isUp ? "↑" : "↓"}</span>
      {Math.abs(change)}%
    </span>
  );
}

export default function WeeklyComparisonCard({ workouts }) {
  const now = Date.now();
  const thisWeek = summarizeRange(workouts, now - 7 * DAY_MS, now + DAY_MS);
  const lastWeek = summarizeRange(workouts, now - 14 * DAY_MS, now - 7 * DAY_MS);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-lg shadow-black/5 dark:shadow-black/10 sm:p-6">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
        This Week vs Last Week
      </h3>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {METRICS.map((metric) => {
          const currentValue = thisWeek[metric.key];
          const previousValue = lastWeek[metric.key];
          return (
            <div
              key={metric.key}
              className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3.5"
            >
              <p className="text-xs text-gray-500">
                <span aria-hidden="true">{metric.icon}</span> {metric.label}
              </p>
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                {currentValue.toLocaleString()}
                {metric.unit && (
                  <span className="ml-1 text-xs font-normal text-gray-500">
                    {metric.unit}
                  </span>
                )}
              </p>
              <div className="mt-1">
                <TrendBadge current={currentValue} previous={previousValue} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Last week: {lastWeek.workouts} workout{lastWeek.workouts === 1 ? "" : "s"},{" "}
        {lastWeek.sets} set{lastWeek.sets === 1 ? "" : "s"},{" "}
        {lastWeek.volume.toLocaleString()} kg, {lastWeek.calories.toLocaleString()} kcal
      </p>
    </div>
  );
}

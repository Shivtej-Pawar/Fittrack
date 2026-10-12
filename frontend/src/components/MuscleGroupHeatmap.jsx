import { useMemo } from "react";

/**
 * Muscle Group Heatmap (Phase 13 / Feature 7) — how often each muscle
 * group has been trained this calendar month. Strength-only (the only
 * category that has a `muscle_group`), computed entirely from `workouts`
 * — no new backend endpoint.
 */
export default function MuscleGroupHeatmap({ workouts }) {
  const rows = useMemo(() => {
    const now = new Date();
    const counts = {};
    for (const workout of workouts) {
      if (!workout.muscle_group) continue;
      const date = new Date(workout.created_at);
      if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) {
        continue;
      }
      counts[workout.muscle_group] = (counts[workout.muscle_group] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [workouts]);

  const maxCount = rows.length > 0 ? rows[0][1] : 0;
  const monthLabel = new Date().toLocaleDateString(undefined, { month: "long" });

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-lg shadow-black/5 dark:shadow-black/10 sm:p-6">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
        Muscle Group Focus
      </h3>
      <p className="mt-0.5 text-xs text-gray-500">Sessions in {monthLabel}</p>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          Log a Strength workout to see your muscle group breakdown.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {rows.map(([group, count]) => (
            <li key={group} className="flex items-center gap-3">
              <span className="w-32 flex-shrink-0 truncate text-sm text-gray-700 dark:text-gray-300">
                {group}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500 ease-out"
                  style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%` }}
                />
              </div>
              <span className="w-6 flex-shrink-0 text-right text-sm font-semibold text-gray-900 dark:text-white">
                {count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

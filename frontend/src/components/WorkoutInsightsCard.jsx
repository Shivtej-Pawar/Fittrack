import { useEffect, useState } from "react";
import { generateWorkoutInsights } from "../utils/workoutInsights";

/**
 * Workout Insights card (Phase 11 / Feature 3).
 *
 * Rotates through generateWorkoutInsights(workouts) automatically, one
 * at a time, with a fade transition — a small internal `visible` flag
 * flips false just before swapping text and true just after, so the
 * CSS opacity transition actually has something to animate between.
 */

const ROTATE_INTERVAL_MS = 5000;
const FADE_MS = 200;

export default function WorkoutInsightsCard({ workouts }) {
  const insights = generateWorkoutInsights(workouts);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (insights.length <= 1) return undefined;

    const interval = setInterval(() => {
      setVisible(false);
      const timeout = setTimeout(() => {
        setIndex((i) => (i + 1) % insights.length);
        setVisible(true);
      }, FADE_MS);
      return () => clearTimeout(timeout);
    }, ROTATE_INTERVAL_MS);

    return () => clearInterval(interval);
    // `insights` is derived fresh from `workouts` on every render rather
    // than memoized, so it's intentionally not a dependency here — only
    // its length matters for whether rotation should run at all, and
    // that's stable enough in practice (it only changes when new
    // workouts are logged, which already remounts this data via props).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insights.length]);

  if (insights.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-lg shadow-black/5 dark:shadow-black/10 sm:p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Workout Insights
        </h3>
        <p className="mt-3 text-sm text-gray-500">
          Log a few workouts and personalized insights will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-lg shadow-black/5 dark:shadow-black/10 sm:p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Workout Insights
        </h3>
        <span aria-hidden="true" className="text-lg">
          💡
        </span>
      </div>

      <p
        className={`mt-3 min-h-[2.5rem] text-sm text-gray-700 dark:text-gray-300 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        {insights[index]}
      </p>

      {insights.length > 1 && (
        <div className="mt-3 flex gap-1.5">
          {insights.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i === index
                  ? "bg-blue-500"
                  : "bg-gray-200 dark:bg-gray-800"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

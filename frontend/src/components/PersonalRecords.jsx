import { useMemo } from "react";

/**
 * Expanded Personal Records (Phase 10 / Feature 5).
 *
 * Turns the simple "heaviest weight per exercise" list that already
 * existed in Progress.jsx into five distinct PR cards, each scanning the
 * same `workouts` prop (from getWorkouts(), fetched by the caller — this
 * component does no fetching itself) for a different metric. "Recently
 * broken" highlights a PR set within the last 7 days.
 */

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function isRecent(isoString) {
  return Date.now() - new Date(isoString).getTime() <= RECENT_WINDOW_MS;
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// Exported (Phase 15 / Feature 6) so ShareProgressCard's "Strongest
// Personal Record" line can reuse the exact same heaviest-lift
// computation instead of re-scanning `workouts` a second time with a
// slightly different implementation that could drift from this one.
export function computeRecords(workouts) {
  let heaviestLift = null; // { weight, exercise_name, created_at }
  let mostReps = null; // { reps, exercise_name, created_at }
  let mostSets = null; // { sets, exercise_name, created_at }
  let longestCardio = null; // { duration, exercise_name, created_at }
  let highestCalories = null; // { calories, exercise_name, created_at }

  for (const workout of workouts) {
    const entries = workout.set_entries ?? [];

    if (entries.length > 0) {
      if (!mostSets || entries.length > mostSets.sets) {
        mostSets = {
          sets: entries.length,
          exercise_name: workout.exercise_name,
          created_at: workout.created_at,
        };
      }
      for (const entry of entries) {
        if (!heaviestLift || entry.weight > heaviestLift.weight) {
          heaviestLift = {
            weight: entry.weight,
            exercise_name: workout.exercise_name,
            created_at: workout.created_at,
          };
        }
        if (!mostReps || entry.reps > mostReps.reps) {
          mostReps = {
            reps: entry.reps,
            exercise_name: workout.exercise_name,
            created_at: workout.created_at,
          };
        }
      }
    }

    if (workout.duration && (!longestCardio || workout.duration > longestCardio.duration)) {
      longestCardio = {
        duration: workout.duration,
        exercise_name: workout.exercise_name,
        created_at: workout.created_at,
      };
    }

    if (
      workout.calories &&
      (!highestCalories || workout.calories > highestCalories.calories)
    ) {
      highestCalories = {
        calories: workout.calories,
        exercise_name: workout.exercise_name,
        created_at: workout.created_at,
      };
    }
  }

  return { heaviestLift, mostReps, mostSets, longestCardio, highestCalories };
}

export default function PersonalRecords({ workouts }) {
  const records = useMemo(() => computeRecords(workouts), [workouts]);

  const cards = [
    {
      key: "heaviestLift",
      icon: "🏆",
      label: "Heaviest Lift",
      record: records.heaviestLift,
      valueText: (r) => `${r.weight} kg`,
    },
    {
      key: "mostReps",
      icon: "🔁",
      label: "Most Reps",
      record: records.mostReps,
      valueText: (r) => `${r.reps} reps`,
    },
    {
      key: "mostSets",
      icon: "📊",
      label: "Most Sets",
      record: records.mostSets,
      valueText: (r) => `${r.sets} sets`,
    },
    {
      key: "longestCardio",
      icon: "⏱",
      label: "Longest Cardio Session",
      record: records.longestCardio,
      valueText: (r) => `${r.duration} min`,
    },
    {
      key: "highestCalories",
      icon: "🔥",
      label: "Highest Calories",
      record: records.highestCalories,
      valueText: (r) => `${r.calories} kcal`,
    },
  ];

  const hasAnyRecord = cards.some((card) => card.record);

  if (!hasAnyRecord) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 text-center">
        <p className="text-4xl">🏆</p>
        <p className="mt-4 text-base font-medium text-gray-700 dark:text-gray-300">
          No personal records yet.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Log a workout with sets, duration, or calories to start setting PRs.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards
        .filter((card) => card.record)
        .map((card) => {
          const recentlyBroken = isRecent(card.record.created_at);
          return (
            <div
              key={card.key}
              className={`relative rounded-2xl border p-5 shadow-lg shadow-black/5 dark:shadow-black/10 transition-all duration-200 hover:-translate-y-0.5 ${
                recentlyBroken
                  ? "border-amber-400/50 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/5"
                  : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
              }`}
            >
              {recentlyBroken && (
                <span className="absolute right-4 top-4 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  New PR
                </span>
              )}
              <span className="text-2xl" aria-hidden="true">
                {card.icon}
              </span>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {card.valueText(card.record)}
              </p>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                {card.label}
              </p>
              <p className="mt-2 truncate text-sm text-gray-700 dark:text-gray-300">
                {card.record.exercise_name}
              </p>
              <p className="text-xs text-gray-500">
                {formatDate(card.record.created_at)}
              </p>
            </div>
          );
        })}
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { getExerciseIcon } from "../utils/workoutHelpers";

/**
 * Workout Session Timeline (Phase 11 / Feature 2).
 *
 * Takes `workouts` as a prop (already fetched by Dashboard via
 * getWorkouts() — no fetching of its own) and renders the most recent
 * 8-10 as a vertical timeline.
 */

const CATEGORY_DOT = {
  Strength: "bg-blue-500",
  Cardio: "bg-emerald-500",
  Core: "bg-purple-500",
  Flexibility: "bg-orange-500",
};

function summarize(workout) {
  const entries = workout.set_entries ?? [];
  if (entries.length > 0) {
    return `${entries.length} set${entries.length === 1 ? "" : "s"}`;
  }
  if (workout.duration) return `${workout.duration} min`;
  return workout.category;
}

function relativeDate(isoString) {
  const date = new Date(isoString);
  const today = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOfDay(today) - startOfDay(date)) / (24 * 60 * 60 * 1000)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function WorkoutTimeline({ workouts, limit = 8 }) {
  const navigate = useNavigate();
  const recent = [...workouts]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);

  if (recent.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
        <p className="text-sm text-gray-500">No recent sessions yet.</p>
      </div>
    );
  }

  return (
    <ul className="relative">
      {/* Connecting line */}
      <div
        aria-hidden="true"
        className="absolute bottom-2 left-[15px] top-2 w-px bg-gray-200 dark:bg-gray-800"
      />

      {recent.map((workout) => {
        const dot = CATEGORY_DOT[workout.category] ?? "bg-gray-400";
        // Phase 11 / Feature 1: exercise-specific icon instead of always
        // the same category icon — falls back to the category icon
        // automatically if the exercise isn't in EXERCISE_ICONS.
        const icon = getExerciseIcon(workout.exercise_name, workout.category);
        return (
          <li key={workout.id} className="relative flex gap-4 pb-5 last:pb-0">
            <span
              className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm ${dot} text-white shadow-md`}
            >
              {icon}
            </span>
            <button
              type="button"
              onClick={() => navigate("/workouts")}
              className="group -mt-0.5 flex-1 rounded-xl border border-transparent px-3 py-2 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-gray-200 dark:hover:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {workout.exercise_name}
                </p>
                <span className="flex-shrink-0 text-xs text-gray-500">
                  {relativeDate(workout.created_at)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                {workout.category} · {summarize(workout)}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

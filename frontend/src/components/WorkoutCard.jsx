import { CATEGORY_META, formatDate, getExerciseIcon } from "../utils/workoutHelpers";

// A single row of stats (e.g. "⚖ 60 kg") — renders nothing if `value` is
// null/undefined, so callers don't need an `{value != null && (...)}`
// guard at every call site.
function Stat({ icon, value, label }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
      <span aria-hidden="true">{icon}</span>
      {value}
      {label && <span className="text-gray-500">{label}</span>}
    </span>
  );
}

export default function WorkoutCard({ workout, index, onEdit, onDelete, onViewDetails }) {
  const meta = CATEGORY_META[workout.category] ?? {
    icon: "🏋️",
    badge:
      "bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20",
  };
  // Phase 11 / Feature 1: exercise-specific icon instead of always the
  // same category icon (e.g. every Strength card no longer shows 💪) —
  // falls back to the category icon automatically if the exercise isn't
  // in EXERCISE_ICONS.
  const exerciseIcon = getExerciseIcon(workout.exercise_name, workout.category);

  const hasSets = workout.set_entries?.length > 0;

  return (
    <li
      className="workout-fade-in rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-lg shadow-black/5 dark:shadow-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/80 hover:shadow-xl sm:p-6"
      style={{
        animation: "workout-fade-in 0.35s ease-out both",
        animationDelay: `${Math.min(index, 8) * 40}ms`,
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
            <span aria-hidden="true">{exerciseIcon}</span> {workout.exercise_name}
          </h3>
          {(workout.muscle_group || workout.variation) && (
            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
              {[workout.muscle_group, workout.variation]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>

        {/* Category badge + Edit/Delete. Phase 11 / Feature 3: text pill
            buttons instead of ✏️/🗑️ icon-only buttons — reads as more
            deliberate/professional and is self-explanatory without a
            tooltip, at the cost of a little more horizontal space. */}
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${meta.badge}`}
          >
            {workout.category}
          </span>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${workout.exercise_name}`}
              className="rounded-lg border border-blue-500/30 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 transition-colors duration-150 hover:bg-blue-500/10 hover:border-blue-500/50"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete ${workout.exercise_name}`}
              className="rounded-lg border border-red-500/30 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 transition-colors duration-150 hover:bg-red-500/10 hover:border-red-500/50"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Stats row — plain display, not a click target. (Historically
          this row doubled as the Set Breakdown expand toggle; Phase 15
          / Feature 2 replaced that whole in-place mechanism with the
          dedicated "View Details" button below, which opens the full
          WorkoutDrawer instead.) */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Stat
          value={
            // Every set lives in `set_entries`. The compact "3 × 12" pill
            // mirrors the old flat-column display using the total row
            // count and the first set's reps — `?.` and the length check
            // mean an old workout with an empty (or missing) array just
            // shows nothing here instead of throwing.
            hasSets
              ? `${workout.set_entries.length} × ${workout.set_entries[0].reps}`
              : null
          }
          icon="🔁"
        />
        <Stat value={workout.set_entries?.[0]?.weight} label="kg" icon="⚖" />
        <Stat value={workout.duration} label="min" icon="⏱" />
        <Stat value={workout.calories} label="kcal" icon="🔥" />
      </div>

      {/* View Details (Phase 15 / Feature 2) — opens the WorkoutDrawer
          with the complete set table, total volume, calories, notes,
          and a Personal Record badge if applicable, plus Edit/Delete.
          This replaces the old inline "View/Hide Set Breakdown"
          expand/collapse (Phase 9 / Feature 7): that showed only the
          set table in place; the drawer shows everything about the
          workout in one premium, dedicated view instead. Shown even for
          workouts with no sets (Cardio/Core/Flexibility) since the
          drawer still has useful content for those — duration, calories,
          notes — not just a set table. */}
      <button
        type="button"
        onClick={onViewDetails}
        className="group mt-3 flex w-full items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 px-3.5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors duration-150 hover:border-blue-500/40 hover:bg-blue-500/5 hover:text-blue-600 dark:hover:text-blue-400"
      >
        <span
          aria-hidden="true"
          className="text-base leading-none text-gray-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-blue-500 dark:group-hover:text-blue-400"
        >
          →
        </span>
        View Details
      </button>

      {workout.notes && (
        <p className="mt-4 border-l-2 border-gray-300 dark:border-gray-700 pl-3 text-sm italic text-gray-600 dark:text-gray-400">
          {workout.notes}
        </p>
      )}

      <p className="mt-4 text-xs text-gray-500">{formatDate(workout.created_at)}</p>
    </li>
  );
}

// Animated skeleton placeholders shown while the history list is loading,
// replacing the plain "Loading..." text used elsewhere in the app.
export function WorkoutSkeletons() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-800" />
            </div>
            <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="mt-5 flex gap-4">
            <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

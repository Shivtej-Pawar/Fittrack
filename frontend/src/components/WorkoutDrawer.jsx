import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import useScrollLock from "../hooks/useScrollLock";
import {
  CATEGORY_META,
  formatDate,
  getExerciseIcon,
  workoutVolume,
} from "../utils/workoutHelpers";
import { isPersonalRecord } from "../utils/prTracking";

/**
 * Interactive Workout Detail Drawer (Phase 15 / Feature 2).
 *
 * Replaces WorkoutCard's old inline "View Set Breakdown" expand/collapse
 * (Phase 9 / Feature 7) with a proper detail view: desktop gets a panel
 * that slides in from the right, mobile gets a bottom sheet — a single
 * `.drawer-panel` CSS class (styles/index.css) picks the right keyframe
 * for each via a plain `min-width: 640px` media query, no JS viewport
 * detection needed.
 *
 * Deliberately does NOT re-embed WorkoutForm for editing: its own Edit/
 * Delete buttons call the exact same `onEdit`/`onDelete` callbacks
 * Workouts.jsx already passes down to WorkoutCard, which open the
 * existing Edit modal (already wrapping WorkoutForm) and delete-confirm
 * modal — so "reuse existing WorkoutCard and WorkoutForm" means reusing
 * that whole existing flow, not building a second copy of the edit form
 * inside the drawer itself.
 */
export default function WorkoutDrawer({ workout, onClose, onEdit, onDelete }) {
  const { user } = useAuth();
  const panelRef = useRef(null);

  // Body scroll lock (Phase 16 / Feature 4) — was a plain
  // `document.body.style.overflow = "hidden"` here before this phase,
  // which doesn't reliably block background touch-scrolling on iOS
  // Safari and didn't restore the scroll position if it drifted. See
  // hooks/useScrollLock.js's own header comment for the full reasoning;
  // this component (and ShareProgressModal.jsx) now share one
  // implementation instead of each hand-rolling their own.
  useScrollLock(true);

  // ESC closes; focus moves into the drawer on open so screen readers
  // land somewhere sensible immediately, and a lightweight Tab/Shift+Tab
  // focus trap keeps keyboard focus from escaping to the (visually
  // hidden-behind-backdrop) page underneath while the drawer is open.
  useEffect(() => {
    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!workout) return null;

  const meta = CATEGORY_META[workout.category] ?? {
    badge: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20",
  };
  const exerciseIcon = getExerciseIcon(workout.exercise_name, workout.category);
  const hasSets = workout.set_entries?.length > 0;
  const volume = workoutVolume(workout);
  const isPR = isPersonalRecord(workout, user?.id);
  // Every optional detail section below is conditionally rendered based
  // on whether this specific workout actually has that data (e.g. a
  // bare-bones Cardio entry logged with just a category, exercise, and
  // date — no duration/calories/notes/sets filled in). When none of
  // them have anything to show, the content pane would otherwise render
  // as an empty box with no explanation, which reads as "broken" even
  // though nothing is actually wrong — the fallback message below (Bug
  // fix — see DOCUMENTATION.md) makes that an explicit, intentional
  // empty state instead.
  const hasAnyDetail =
    volume > 0 ||
    workout.duration != null ||
    workout.calories != null ||
    hasSets ||
    Boolean(workout.notes);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end bg-black/50 dark:bg-black/70 backdrop-blur-sm sm:items-stretch"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${workout.exercise_name} details`}
        className="drawer-panel flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl shadow-black/20 dark:shadow-black/50 sm:h-full sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none sm:rounded-l-3xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 dark:border-gray-800 p-5 sm:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${meta.badge}`}
              >
                {workout.category}
              </span>
              {isPR && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  🏆 Personal Record
                </span>
              )}
            </div>
            <h2 className="mt-2 truncate text-xl font-bold text-gray-900 dark:text-white">
              <span aria-hidden="true">{exerciseIcon}</span> {workout.exercise_name}
            </h2>
            {(workout.muscle_group || workout.variation) && (
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                {[workout.muscle_group, workout.variation].filter(Boolean).join(" · ")}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">{formatDate(workout.created_at)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content. `min-h-0` here matters more than it looks:
            without it, a flex child with `overflow-y-auto` can fail to
            actually constrain to its available space in a `flex-col`
            parent (flex items default to `min-height: auto`, which lets
            content push the box taller instead of scrolling within it) —
            a well-known flexbox gotcha that can make a scrollable panel
            render as if it has no content area at all. */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            {volume > 0 && (
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                <p className="text-xs text-gray-500">Total Volume</p>
                <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">
                  {volume.toLocaleString()} kg
                </p>
              </div>
            )}
            {workout.duration != null && (
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                <p className="text-xs text-gray-500">Duration</p>
                <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">
                  {workout.duration} min
                </p>
              </div>
            )}
            {workout.calories != null && (
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                <p className="text-xs text-gray-500">Calories</p>
                <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">
                  {workout.calories} kcal
                </p>
              </div>
            )}
            {hasSets && (
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                <p className="text-xs text-gray-500">Sets</p>
                <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">
                  {workout.set_entries.length}
                </p>
              </div>
            )}
          </div>

          {/* Complete set table */}
          {hasSets && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Sets
              </h3>
              <div className="mt-2 space-y-1.5">
                {workout.set_entries.map((set, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3.5 py-2.5 text-sm"
                  >
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      Set {set.set ?? index + 1}
                    </span>
                    <span className="flex items-center gap-4 text-gray-800 dark:text-gray-300">
                      <span>{set.reps} reps</span>
                      <span>{set.weight} kg</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {workout.notes && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Notes
              </h3>
              <p className="mt-2 rounded-lg border-l-2 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 py-2 pl-3 text-sm italic text-gray-600 dark:text-gray-400">
                {workout.notes}
              </p>
            </div>
          )}

          {/* Bug fix (Phase 16) — previously, a workout with none of
              {volume, duration, calories, sets, notes} left this entire
              content pane empty with no explanation, which looked like
              the drawer had failed to load the workout's data at all
              rather than the workout simply not having any of that
              optional detail recorded. This makes that an explicit,
              intentional empty state instead of a mysteriously blank
              box — the header above (exercise name, category, date)
              always renders regardless, so this only ever appears
              alongside real, correctly-loaded workout identity. */}
          {!hasAnyDetail && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-gray-800 py-10 text-center">
              <span aria-hidden="true" className="text-3xl">📋</span>
              <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                No additional details recorded
              </p>
              <p className="mt-1 max-w-[220px] text-xs text-gray-500">
                This workout was logged without sets, duration, calories, or
                notes.
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 border-t border-gray-200 dark:border-gray-800 p-5 sm:p-6">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit?.();
            }}
            className="flex-1 rounded-xl border border-blue-500/30 py-2.5 text-sm font-semibold text-blue-600 dark:text-blue-400 transition-colors duration-150 hover:bg-blue-500/10 active:scale-95"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete?.();
            }}
            className="flex-1 rounded-xl border border-red-500/30 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 transition-colors duration-150 hover:bg-red-500/10 active:scale-95"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

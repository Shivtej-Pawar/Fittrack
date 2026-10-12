import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import WorkoutForm from "../components/WorkoutForm";
import PRCelebration from "../components/PRCelebration";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { createWorkout, getWorkouts } from "../services/workoutService";
import { DEFAULT_VALUES, createEmptySetEntry } from "../utils/workoutHelpers";
import { seedPRsFromHistory, checkAndRecordPR } from "../utils/prTracking";
import { queueWorkout } from "../utils/offlineQueue";

/**
 * Log Workout page (Phase 9 / Feature 1).
 *
 * Previously the workout-creation form lived at the top of a single,
 * long Workouts.jsx page with the entire history list below it. That
 * page is now split in two: this page (only the form) and Workouts.jsx
 * (only the history, filters, and export). Nothing about the form
 * itself changed — it's the same WorkoutForm component (extracted to
 * components/WorkoutForm.jsx so this page and Workouts.jsx's Edit modal
 * share one implementation), just moved to its own route.
 *
 * Phase 13 / Feature 8: after a successful save, checks whether it just
 * set a new personal record (utils/prTracking.js) and, if so, shows the
 * confetti/badge celebration plus a toast. `seedPRsFromHistory` runs
 * once on mount (a single extra getWorkouts() call — this page didn't
 * fetch anything before) so a fresh browser's very first save of an
 * exercise doesn't wrongly celebrate as "beating" a record of zero.
 */
export default function LogWorkout() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [prRecord, setPrRecord] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getWorkouts()
      .then((workouts) => {
        if (!cancelled) seedPRsFromHistory(workouts, user?.id);
      })
      .catch(() => {
        // Seeding is a best-effort nicety, not required for the page to
        // work — a failed fetch here just means PR detection falls back
        // to "everything is a new record" until the next successful
        // seed, which isn't worth surfacing an error for.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-white dark:bg-gray-950 px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                Log Workout
              </h1>
              <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
                Fields adjust automatically based on the category you pick.
              </p>
            </div>
            <Link
              to="/workouts"
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
            >
              View Workouts →
            </Link>
          </div>

          {user?.full_name && (
            <p className="mt-2 text-xs text-gray-500">
              Signed in as {user.full_name}
            </p>
          )}

          <div className="mt-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xl shadow-black/5 dark:shadow-black/20 sm:p-8">
            <WorkoutForm
              initialValues={DEFAULT_VALUES}
              initialSetEntries={[createEmptySetEntry()]}
              onSubmit={async (payload) => {
                // Phase 13 / Feature 6 — offline logging. `navigator.onLine`
                // is checked first as a fast path (most real "I'm on a
                // plane" cases), but the actual source of truth is
                // whether the request itself fails with no response at
                // all (an Axios network error, `err.response` is
                // undefined) — a slow-but-working connection shouldn't
                // be queued, only a genuinely absent one. A real
                // *rejected* request (e.g. a validation error) still
                // throws normally so WorkoutForm's existing error
                // banner handles it exactly as before.
                if (!navigator.onLine) {
                  // Tag the queued item with the current user's id — see
                  // utils/offlineQueue.js's header comment for why this
                  // matters (prevents a later sync from attributing this
                  // workout to whichever account happens to be logged in
                  // once connectivity returns).
                  await queueWorkout(payload, user?.id);
                  showToast("Workout saved offline.", "info");
                  return;
                }

                try {
                  const saved = await createWorkout(payload);
                  const record = checkAndRecordPR(saved, user?.id);
                  if (record) {
                    setPrRecord(record);
                    showToast(
                      `New ${record.exercise} record: ${record.weight} kg 🎉`,
                      "success"
                    );
                  }
                } catch (err) {
                  if (!err.response) {
                    await queueWorkout(payload, user?.id);
                    showToast("Workout saved offline.", "info");
                    return;
                  }
                  throw err;
                }
              }}
              submitLabel="Save Workout"
              submittingLabel="Saving…"
              successMessageText="Workout saved. View it on the Workouts page."
              errorMessageText="Could not save this workout. Please try again."
              resetAfterSubmit
            />
          </div>
        </div>
      </div>

      <PRCelebration record={prRecord} onClose={() => setPrRecord(null)} />
    </Layout>
  );
}

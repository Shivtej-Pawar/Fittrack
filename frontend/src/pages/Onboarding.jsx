import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateUserProfile } from "../services/userService";
import { markOnboardingSeen } from "../utils/profileStorage";

const FIELD_CLASSES =
  "mt-1.5 block w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors";
const LABEL_CLASSES = "block text-sm font-medium text-gray-700 dark:text-gray-300";

/**
 * Shown once, right after a user's first login (Login.jsx routes here
 * instead of /dashboard the first time — see utils/profileStorage.js's
 * hasSeenOnboarding()). Deliberately does NOT use Layout/Navbar (Part 3's
 * spec lists Dashboard/Workouts/Profile/Progress as the pages that show
 * the authenticated nav; Onboarding is meant to be a focused, one-time
 * flow, not part of the ongoing app chrome).
 */
export default function Onboarding() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  // Phase 13 / Feature 1 — separate from react-hook-form (like the set
  // table pattern elsewhere in this app) since it's a single segmented
  // picker, not a text field; defaults to 5 to match the backend
  // column's own default, so skipping this step still leaves the user
  // with the same goal they'd have gotten before this feature existed.
  const [weeklyGoal, setWeeklyGoal] = useState(5);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ mode: "onBlur" });

  function finishOnboarding() {
    markOnboardingSeen(user?.email);
    navigate("/dashboard", { replace: true });
  }

  async function onSubmit(data) {
    setServerError("");
    setIsSubmitting(true);
    try {
      // Optional by design — only send fields the user actually filled
      // in. Phase 9: this now goes straight to the database via
      // PATCH /users/me (services/userService.js), not localStorage —
      // see utils/profileStorage.js's header comment for what changed.
      // Phase 13: weekly_goal is always sent (it has a sensible default
      // of 5 either way, so there's no "did they touch it?" ambiguity
      // the way there is for height/weight).
      const updates = { weekly_goal: weeklyGoal };
      if (data.height) updates.height = Number(data.height);
      if (data.current_weight) updates.current_weight = Number(data.current_weight);
      if (data.goal_weight) updates.goal_weight = Number(data.goal_weight);

      await updateUserProfile(updates);
      // Sync AuthContext's `user` before navigating away, so Dashboard/
      // Profile reflect what was just saved immediately, without
      // needing another login.
      await refreshUser();
      finishOnboarding();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setServerError(
        typeof detail === "string"
          ? detail
          : "Could not save your info. You can always add it later from Profile."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 px-4 py-12 text-gray-900 dark:text-white sm:py-16">
      <div className="mx-auto max-w-lg">
        <div className="text-center">
          <span className="text-4xl">👋</span>
          <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
            Welcome, {user?.full_name?.split(" ")[0] || "there"}!
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Set a weekly workout goal and add a few optional details to
            unlock BMI and progress tracking — or skip this and do it
            anytime from your Profile.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xl shadow-black/5 dark:shadow-black/20 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {serverError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {serverError}
              </div>
            )}

            {/* Phase 13 / Feature 1 — segmented 1–7 picker, replacing the
                old hardcoded 5-workouts/week default everywhere else in
                the app reads from. */}
            <div>
              <span className={LABEL_CLASSES}>
                How many days do you want to work out each week?
              </span>
              <div className="mt-2 grid grid-cols-7 gap-1.5" role="radiogroup" aria-label="Weekly workout goal">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <button
                    key={day}
                    type="button"
                    role="radio"
                    aria-checked={weeklyGoal === day}
                    onClick={() => setWeeklyGoal(day)}
                    className={`rounded-lg py-2.5 text-sm font-semibold transition-all duration-150 active:scale-95 ${
                      weeklyGoal === day
                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                {weeklyGoal} day{weeklyGoal === 1 ? "" : "s"} / week — you can change this anytime.
              </p>
            </div>

            <div>
              <label htmlFor="height" className={LABEL_CLASSES}>
                Height (cm)
              </label>
              <input
                id="height"
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g. 175"
                className={FIELD_CLASSES}
                {...register("height", {
                  min: { value: 0, message: "Must be 0 or more" },
                })}
              />
              {errors.height && (
                <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{errors.height.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="current_weight" className={LABEL_CLASSES}>
                  Current Weight (kg)
                </label>
                <input
                  id="current_weight"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="e.g. 78"
                  className={FIELD_CLASSES}
                  {...register("current_weight", {
                    min: { value: 0, message: "Must be 0 or more" },
                  })}
                />
                {errors.current_weight && (
                  <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">
                    {errors.current_weight.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="goal_weight" className={LABEL_CLASSES}>
                  Goal Weight (kg)
                </label>
                <input
                  id="goal_weight"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="e.g. 72"
                  className={FIELD_CLASSES}
                  {...register("goal_weight", {
                    min: { value: 0, message: "Must be 0 or more" },
                  })}
                />
                {errors.goal_weight && (
                  <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">
                    {errors.goal_weight.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={finishOnboarding}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors duration-150 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 sm:w-auto sm:flex-1"
              >
                Skip For Now
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:flex-1"
              >
                {isSubmitting ? "Saving…" : "Save & Continue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

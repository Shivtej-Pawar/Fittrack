import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { updateUserProfile } from "../services/userService";

const FIELD_CLASSES =
  "mt-1.5 block w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors";
const LABEL_CLASSES = "block text-sm font-medium text-gray-700 dark:text-gray-300";

const BMI_CATEGORIES = [
  { max: 18.5, label: "Underweight", color: "text-blue-500 dark:text-blue-400" },
  { max: 25, label: "Normal", color: "text-emerald-500 dark:text-emerald-400" },
  { max: 30, label: "Overweight", color: "text-amber-500 dark:text-amber-400" },
  { max: Infinity, label: "Obese", color: "text-red-500 dark:text-red-400" },
];

// weight (kg) / height (m)^2 — returns null if either input is missing or
// not usable, so callers can show a "add your stats" prompt instead of
// NaN/Infinity.
function calculateBmi(heightCm, weightKg) {
  if (!heightCm || !weightKg) return null;
  const heightM = heightCm / 100;
  if (heightM <= 0) return null;
  const bmi = weightKg / (heightM * heightM);
  return Number.isFinite(bmi) ? bmi : null;
}

function getBmiCategory(bmi) {
  return BMI_CATEGORIES.find((category) => bmi < category.max);
}

export default function Profile() {
  // Phase 9: `user` (from AuthContext) is now the single source of truth
  // for height/current_weight/goal_weight — no more merging in a
  // localStorage-only fallback (see utils/profileStorage.js's updated
  // header comment). `refreshUser` re-fetches it after a save so the
  // rest of the app (and this page, on a later visit) sees the change
  // immediately, not just after the next login.
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  // Phase 13 / Feature 1 — edited via its own small section below, not
  // react-hook-form (same reasoning as Onboarding's segmented picker:
  // it's a single choice, not a text field). Seeded from `user` and
  // re-synced whenever `user` changes, same as the form's own
  // useEffect below.
  const [weeklyGoal, setWeeklyGoal] = useState(5);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ mode: "onBlur" });

  // Keep the form's defaults in sync with the backend's user object
  // whenever it changes (e.g. after refreshUser() below, or on initial
  // load once AuthContext finishes restoring the session).
  useEffect(() => {
    if (!user) return;
    reset({
      height: user.height ?? "",
      current_weight: user.current_weight ?? "",
      goal_weight: user.goal_weight ?? "",
    });
    setWeeklyGoal(user.weekly_goal ?? 5);
  }, [user, reset]);

  async function onSubmit(data) {
    setServerError("");
    setSuccessMessage("");
    setIsSubmitting(true);
    try {
      const updates = {
        height: data.height ? Number(data.height) : null,
        current_weight: data.current_weight ? Number(data.current_weight) : null,
        goal_weight: data.goal_weight ? Number(data.goal_weight) : null,
      };
      await updateUserProfile(updates);
      // Pulls the freshly-saved values back into AuthContext's `user`,
      // which the useEffect above then reflects into this form/view.
      await refreshUser();
      setSuccessMessage("Profile updated.");
      setIsEditing(false);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setServerError(
        typeof detail === "string"
          ? detail
          : "Could not save your changes. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function cancelEditing() {
    reset({
      height: user?.height ?? "",
      current_weight: user?.current_weight ?? "",
      goal_weight: user?.goal_weight ?? "",
    });
    setIsEditing(false);
    setServerError("");
  }

  // Phase 13 / Feature 1 — separate small save flow from the body-stats
  // form above, since it's edited independently (its own "Edit"/"Save"
  // toggle) rather than as part of the same submit.
  async function saveWeeklyGoal(newGoal) {
    setIsSavingGoal(true);
    try {
      await updateUserProfile({ weekly_goal: newGoal });
      await refreshUser();
      setIsEditingGoal(false);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setServerError(
        typeof detail === "string"
          ? detail
          : "Could not save your weekly goal. Please try again."
      );
    } finally {
      setIsSavingGoal(false);
    }
  }

  const bmi = calculateBmi(user?.height, user?.current_weight);
  const bmiCategory = bmi !== null ? getBmiCategory(bmi) : null;

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          Profile
        </h1>
        <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
          Manage your account and body stats.
        </p>

        {/* Account info */}
        <div className="mt-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xl shadow-black/5 dark:shadow-black/20 sm:p-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account</h2>
          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
              <dt className="text-sm text-gray-500">Full Name</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.full_name}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.email}
              </dd>
            </div>
          </dl>
        </div>

        {/* Body stats + edit */}
        <div className="mt-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xl shadow-black/5 dark:shadow-black/20 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Body Stats</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-lg border border-gray-300 dark:border-gray-700 px-3.5 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-150 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Edit Profile
              </button>
            )}
          </div>

          {successMessage && !isEditing && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
              {successMessage}
            </div>
          )}

          {!isEditing ? (
            <dl className="mt-4 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
                <dt className="text-sm text-gray-500">Height</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.height ? `${user.height} cm` : "Not set"}
                </dd>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
                <dt className="text-sm text-gray-500">Current Weight</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.current_weight ? `${user.current_weight} kg` : "Not set"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-500">Goal Weight</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.goal_weight ? `${user.goal_weight} kg` : "Not set"}
                </dd>
              </div>
            </dl>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
              {serverError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {serverError}
                </div>
              )}

              <div>
                <label htmlFor="height" className={LABEL_CLASSES}>
                  Height (cm)
                </label>
                <input
                  id="height"
                  type="number"
                  step="0.1"
                  min="0"
                  className={FIELD_CLASSES}
                  {...register("height", {
                    min: { value: 0, message: "Must be 0 or more" },
                  })}
                />
                {errors.height && (
                  <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">
                    {errors.height.message}
                  </p>
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

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors duration-150 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {isSubmitting ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Weekly Workout Goal (Phase 13 / Feature 1) */}
        <div className="mt-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xl shadow-black/5 dark:shadow-black/20 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Weekly Workout Goal
            </h2>
            {!isEditingGoal && (
              <button
                onClick={() => setIsEditingGoal(true)}
                className="rounded-lg border border-gray-300 dark:border-gray-700 px-3.5 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-150 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Edit
              </button>
            )}
          </div>

          {!isEditingGoal ? (
            <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
              Current Goal:{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {user?.weekly_goal ?? 5} day{(user?.weekly_goal ?? 5) === 1 ? "" : "s"}/week
              </span>
            </p>
          ) : (
            <div className="mt-4">
              <div className="grid grid-cols-7 gap-1.5" role="radiogroup" aria-label="Weekly workout goal">
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
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setWeeklyGoal(user?.weekly_goal ?? 5);
                    setIsEditingGoal(false);
                  }}
                  className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors duration-150 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveWeeklyGoal(weeklyGoal)}
                  disabled={isSavingGoal}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {isSavingGoal ? "Saving…" : "Save Goal"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* BMI card */}
        <div className="mt-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xl shadow-black/5 dark:shadow-black/20 sm:p-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">BMI</h2>

          {bmi !== null ? (
            <div className="mt-4 flex items-center gap-6">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">
                {bmi.toFixed(1)}
              </span>
              <span
                className={`rounded-full border border-gray-300 dark:border-gray-700 px-4 py-1.5 text-sm font-medium ${bmiCategory?.color}`}
              >
                {bmiCategory?.label}
              </span>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              Add your height and current weight above to see your BMI.
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}

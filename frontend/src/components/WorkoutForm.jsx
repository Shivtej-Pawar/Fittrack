import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  CATEGORIES,
  CATEGORY_META,
  EXERCISE_LIBRARY,
  FIELD_CLASSES,
  FIELD_ERROR_CLASSES,
  LABEL_CLASSES,
  createEmptySetEntry,
  getFlatExercises,
  toNullableNumber,
} from "../utils/workoutHelpers";

// --- WorkoutForm (Phase 8, extracted to its own file in Phase 9) ------
// The Log Workout page and the Edit modal (on Workouts.jsx) both need
// the exact same fields, cascading exercise picker, and dynamic set
// table — this component is that form, extracted so both call sites stay
// pixel-identical and never drift apart. A caller supplies the starting
// values/rows and an `onSubmit(payload)` that performs the actual API
// call (+ any list refresh); this component owns only the form's own
// UI state (react-hook-form, the set-entry rows, submitting/error/success
// display) and builds the same `payload` shape either call site needs.
export default function WorkoutForm({
  initialValues,
  initialSetEntries,
  onSubmit,
  onSuccess,
  submitLabel = "Save Workout",
  submittingLabel = "Saving…",
  successMessageText = "Workout saved.",
  errorMessageText = "Could not save this workout. Please try again.",
  resetAfterSubmit = false,
}) {
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm({ mode: "onBlur", defaultValues: initialValues });

  // Watching `category` drives which fields render below — no separate
  // state needed, react-hook-form already tracks the current value.
  const category = watch("category");
  const muscleGroup = watch("muscleGroup");
  const isStrength = category === "Strength";
  const showDuration =
    category === "Cardio" || category === "Core" || category === "Flexibility";
  // Calories are only reliably measurable for Cardio (treadmills/bikes/
  // rowers commonly estimate them) — Strength, Core, and Flexibility
  // never show the field.
  const showCalories = category === "Cardio";

  // --- Smart Exercise Picker -------------------------------------------
  // Strength cascades Category -> Muscle Group -> Exercise. Every other
  // category skips straight to a flat exercise list (no muscle group).
  const muscleGroupOptions = isStrength ? Object.keys(EXERCISE_LIBRARY.Strength) : [];
  const exerciseOptions = isStrength
    ? EXERCISE_LIBRARY.Strength[muscleGroup] ?? []
    : getFlatExercises(category);

  // Whenever the category changes, the previously selected exercise (and,
  // for Strength, muscle group) may no longer be valid for the new list —
  // clear them so the picker never silently submits a stale value that
  // isn't actually shown as selected. Skips its very first run: on mount
  // (including in the Edit modal, where `category` starts pre-filled to
  // the workout's actual category) this must NOT wipe the exercise that
  // was just loaded in — only a real, user-driven category change after
  // that should clear it.
  const isFirstCategoryRun = useRef(true);
  useEffect(() => {
    if (isFirstCategoryRun.current) {
      isFirstCategoryRun.current = false;
      return;
    }
    setValue("exerciseName", "");
  }, [category, setValue]);

  // Changing muscle group changes the exercise list too (Strength only) —
  // same reasoning as above, one level down, same first-run guard.
  const isFirstMuscleGroupRun = useRef(true);
  useEffect(() => {
    if (isFirstMuscleGroupRun.current) {
      isFirstMuscleGroupRun.current = false;
      return;
    }
    setValue("exerciseName", "");
  }, [muscleGroup, setValue]);

  // --- Dynamic Set Tracking ----------------------------------------------
  // Deliberately local React state, not react-hook-form fields: each row
  // is just { reps, weight }, so this is already the exact shape the
  // backend's `set_entries` payload wants — `setEntries` can be sent
  // as-is (after adding each row's 1-based `set` number).
  const [setEntries, setSetEntries] = useState(
    initialSetEntries ?? [createEmptySetEntry()]
  );
  // Tracks the index of the most-recently-added row so it can get a brief
  // highlight/pop transition, then clears itself — see the effect below.
  const [justAddedIndex, setJustAddedIndex] = useState(null);

  // A workout's sets don't carry over from one category to the next —
  // reset back to a single empty row whenever the category changes.
  // Same first-run guard as above: on mount this must not wipe out the
  // rows the Edit modal just loaded in from the workout being edited.
  const isFirstSetsResetRun = useRef(true);
  useEffect(() => {
    if (isFirstSetsResetRun.current) {
      isFirstSetsResetRun.current = false;
      return;
    }
    setSetEntries([createEmptySetEntry()]);
    setJustAddedIndex(null);
  }, [category]);

  useEffect(() => {
    if (justAddedIndex === null) return undefined;
    const timeout = setTimeout(() => setJustAddedIndex(null), 400);
    return () => clearTimeout(timeout);
  }, [justAddedIndex]);

  function handleAddSet() {
    setSetEntries((prev) => {
      const next = [...prev, createEmptySetEntry()];
      setJustAddedIndex(next.length - 1);
      return next;
    });
  }

  function handleRemoveSet(index) {
    // Always keep at least one row — an empty set table isn't a
    // meaningful state for a Strength workout.
    setSetEntries((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function handleSetFieldChange(index, field, value) {
    setSetEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
    );
  }

  async function handleFormSubmit(data) {
    setServerError("");
    setSuccessMessage("");

    // Practical, non-blocking validation for the set table (its rows live
    // outside react-hook-form, so they need their own check): reject
    // negative reps/weight before ever calling the API.
    if (isStrength) {
      const hasNegativeSetValue = setEntries.some((entry) => {
        const reps = toNullableNumber(entry.reps);
        const weight = toNullableNumber(entry.weight);
        return (reps !== null && reps < 0) || (weight !== null && weight < 0);
      });
      if (hasNegativeSetValue) {
        setServerError("Reps and weight must be 0 or more.");
        return;
      }
    }

    setIsSubmitting(true);

    // Only send the fields that are relevant to the selected category —
    // e.g. a Cardio entry shouldn't carry a leftover set_entries array
    // even if the user had rows filled in before switching categories.
    // Every row in `setEntries` is sent — each becomes `{ set, reps,
    // weight }`, where `set` is the row's 1-based position (matches the
    // "Set 1", "Set 2"... labels shown in the table), and blank
    // reps/weight inputs become `0` rather than `null`, since the
    // backend's `SetEntry` requires both fields.
    const payload = {
      category: data.category,
      exercise_name: data.exerciseName,
      variation: isStrength ? data.variation || null : null,
      muscle_group: isStrength ? data.muscleGroup || null : null,
      set_entries: isStrength
        ? setEntries.map((entry, index) => ({
            set: index + 1,
            reps: toNullableNumber(entry.reps) ?? 0,
            weight: toNullableNumber(entry.weight) ?? 0,
          }))
        : [],
      duration: showDuration ? toNullableNumber(data.duration) : null,
      calories: showCalories ? toNullableNumber(data.calories) : null,
      notes: data.notes || null,
    };

    try {
      await onSubmit(payload);
      if (successMessageText) setSuccessMessage(successMessageText);
      if (resetAfterSubmit) {
        reset(initialValues);
        setSetEntries(initialSetEntries ?? [createEmptySetEntry()]);
      }
      onSuccess?.();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setServerError(typeof detail === "string" ? detail : errorMessageText);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5" noValidate>
      {serverError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {serverError}
        </div>
      )}
      {successMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
          {successMessage}
        </div>
      )}

      {/* Category — always visible, drives every field below */}
      <div>
        <label htmlFor="category" className={LABEL_CLASSES}>
          Category
        </label>
        <select
          id="category"
          className={FIELD_CLASSES}
          {...register("category", { required: "Category is required" })}
        >
          {CATEGORIES.map((option) => (
            <option key={option} value={option}>
              {CATEGORY_META[option].icon} {option}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className={FIELD_ERROR_CLASSES}>{errors.category.message}</p>
        )}
      </div>

      {/* Muscle Group — Strength only (cascade step 1) */}
      {isStrength && (
        <div>
          <label htmlFor="muscleGroup" className={LABEL_CLASSES}>
            Muscle Group
          </label>
          <select
            id="muscleGroup"
            className={FIELD_CLASSES}
            {...register("muscleGroup", {
              required: "Muscle group is required",
            })}
          >
            <option value="">Select a muscle group</option>
            {muscleGroupOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.muscleGroup && (
            <p className={FIELD_ERROR_CLASSES}>{errors.muscleGroup.message}</p>
          )}
        </div>
      )}

      {/* Exercise Picker — for Strength this is step 2 of the cascade
          (disabled until a muscle group is chosen); for every other
          category it's a flat list with no prior step. */}
      <div>
        <label htmlFor="exerciseName" className={LABEL_CLASSES}>
          Exercise
        </label>
        <select
          id="exerciseName"
          disabled={isStrength && !muscleGroup}
          className={`${FIELD_CLASSES} disabled:cursor-not-allowed disabled:opacity-50`}
          {...register("exerciseName", {
            required: "Please select an exercise",
          })}
        >
          <option value="">
            {isStrength && !muscleGroup
              ? "Select a muscle group first"
              : "Select an exercise"}
          </option>
          {exerciseOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.exerciseName && (
          <p className={FIELD_ERROR_CLASSES}>{errors.exerciseName.message}</p>
        )}
      </div>

      {/* Variation — Strength only */}
      {isStrength && (
        <div>
          <label htmlFor="variation" className={LABEL_CLASSES}>
            Variation
          </label>
          <input
            id="variation"
            type="text"
            placeholder="e.g. Incline, Bodyweight"
            className={FIELD_CLASSES}
            {...register("variation")}
          />
        </div>
      )}

      {/* Dynamic Set Table — Strength only */}
      {isStrength && (
        <div>
          <div className="flex items-center justify-between">
            <span className={LABEL_CLASSES}>Sets</span>
            <span className="text-xs text-gray-500">
              {setEntries.length} {setEntries.length === 1 ? "set" : "sets"}
            </span>
          </div>

          <div className="mt-1.5 space-y-2.5">
            {setEntries.map((entry, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 rounded-xl border bg-gray-100/60 dark:bg-gray-800/60 p-3.5 transition-all duration-300 ease-out hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  justAddedIndex === index
                    ? "scale-[1.02] border-blue-500/60 ring-2 ring-blue-500/30"
                    : "border-gray-300 dark:border-gray-700"
                }`}
              >
                <span className="flex h-8 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-white dark:bg-gray-900 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Set {index + 1}
                </span>

                <div className="flex-1">
                  <label
                    htmlFor={`set-${index}-reps`}
                    className="block text-xs font-medium text-gray-500"
                  >
                    Reps
                  </label>
                  <input
                    id={`set-${index}-reps`}
                    type="number"
                    min="0"
                    placeholder="0"
                    value={entry.reps}
                    onChange={(e) =>
                      handleSetFieldChange(index, "reps", e.target.value)
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors"
                  />
                </div>

                <div className="flex-1">
                  <label
                    htmlFor={`set-${index}-weight`}
                    className="block text-xs font-medium text-gray-500"
                  >
                    Weight (kg)
                  </label>
                  <input
                    id={`set-${index}-weight`}
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    value={entry.weight}
                    onChange={(e) =>
                      handleSetFieldChange(index, "weight", e.target.value)
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveSet(index)}
                  disabled={setEntries.length <= 1}
                  aria-label={`Remove set ${index + 1}`}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddSet}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 transition-all duration-200 hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-600 dark:hover:text-blue-400"
          >
            + Add Set
          </button>
        </div>
      )}

      {/* Duration — Cardio, Core, Flexibility */}
      {showDuration && (
        <div>
          <label htmlFor="duration" className={LABEL_CLASSES}>
            Duration (minutes)
          </label>
          <input
            id="duration"
            type="number"
            min="0"
            className={FIELD_CLASSES}
            {...register("duration", {
              min: { value: 0, message: "Must be 0 or more" },
            })}
          />
          {errors.duration && (
            <p className={FIELD_ERROR_CLASSES}>{errors.duration.message}</p>
          )}
        </div>
      )}

      {/* Calories — Cardio only */}
      {showCalories && (
        <div>
          <label htmlFor="calories" className={LABEL_CLASSES}>
            Calories
          </label>
          <input
            id="calories"
            type="number"
            min="0"
            className={FIELD_CLASSES}
            {...register("calories", {
              min: { value: 0, message: "Must be 0 or more" },
            })}
          />
          {errors.calories && (
            <p className={FIELD_ERROR_CLASSES}>{errors.calories.message}</p>
          )}
        </div>
      )}

      {/* Notes — always visible */}
      <div>
        <label htmlFor="notes" className={LABEL_CLASSES}>
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          placeholder="Optional notes about this workout"
          className={FIELD_CLASSES}
          {...register("notes")}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-blue-900/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {isSubmitting ? submittingLabel : submitLabel}
      </button>
    </form>
  );
}

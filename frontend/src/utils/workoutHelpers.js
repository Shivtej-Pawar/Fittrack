/**
 * Shared workout constants + helpers (Phase 9).
 *
 * Extracted out of what used to be a single Workouts.jsx when "Log
 * Workout" and "View Workouts" were split into separate pages
 * (LogWorkout.jsx and Workouts.jsx) — both need the exact same category
 * list, exercise library, and form/set-entry shaping logic, so this
 * module is the one place that logic lives, instead of being copied
 * into both pages and risking them drifting apart.
 */

export const CATEGORIES = ["Strength", "Cardio", "Core", "Flexibility"];

// Mirrors backend/app/utils/exercise_library.py exactly. There's no
// "list exercises" API endpoint (out of scope, and past phases explicitly
// said not to add a backend one), so this is a frontend copy rather than
// something fetched at runtime. If the backend library ever changes, this
// constant needs to be updated to match by hand.
export const EXERCISE_LIBRARY = {
  Strength: {
    Chest: [
      "Bench Press",
      "Incline Bench Press",
      "Decline Bench Press",
      "Push-ups",
      "Dumbbell Fly",
      "Chest Press",
    ],
    Back: [
      "Pull-ups",
      "Chin-ups",
      "Lat Pulldown",
      "Barbell Row",
      "Seated Cable Row",
      "Deadlift",
    ],
    Shoulders: [
      "Overhead Press",
      "Dumbbell Shoulder Press",
      "Lateral Raise",
      "Front Raise",
      "Rear Delt Fly",
      "Arnold Press",
    ],
    Biceps: [
      "Barbell Curl",
      "Dumbbell Curl",
      "Hammer Curl",
      "Preacher Curl",
      "Concentration Curl",
    ],
    Triceps: [
      "Tricep Pushdown",
      "Skull Crushers",
      "Dips",
      "Overhead Tricep Extension",
      "Close-Grip Bench Press",
    ],
    "Legs (Quadriceps)": [
      "Squats",
      "Front Squats",
      "Leg Press",
      "Bulgarian Split Squat",
      "Lunges",
      "Leg Extension",
    ],
    Hamstrings: ["Romanian Deadlift", "Leg Curl", "Good Morning", "Glute-Ham Raise"],
    Glutes: ["Hip Thrust", "Glute Bridge", "Cable Kickback", "Step-ups", "Sumo Squat"],
    Calves: ["Standing Calf Raise", "Seated Calf Raise", "Donkey Calf Raise"],
    Forearms: ["Wrist Curl", "Reverse Wrist Curl", "Farmer's Walk", "Plate Pinch"],
  },
  Cardio: {
    Running: ["Outdoor Run", "Treadmill Run", "Sprint Intervals"],
    Cycling: ["Outdoor Cycling", "Stationary Bike"],
    HIIT: ["Burpees", "Mountain Climbers", "Jump Rope", "Jumping Jacks"],
    Rowing: ["Rowing Machine"],
  },
  Core: {
    Abs: ["Crunches", "Bicycle Crunches", "Leg Raises", "Russian Twist", "Sit-ups"],
    Obliques: ["Side Plank", "Wood Chop", "Hanging Knee Twist"],
    "Lower Back": ["Superman", "Back Extension", "Bird Dog"],
  },
  Flexibility: {
    "Full Body": ["Full Body Stretch"],
    "Upper Body": ["Shoulder Stretch", "Chest Stretch", "Tricep Stretch"],
    "Lower Body": [
      "Hamstring Stretch",
      "Quad Stretch",
      "Hip Flexor Stretch",
      "Calf Stretch",
    ],
    Yoga: ["Downward Dog", "Cobra Pose", "Child's Pose", "Cat-Cow"],
  },
};

// Cardio/Core/Flexibility have no muscle-group dropdown — the exercise
// picker for those categories is a single flat list combining every
// sub-group's exercises (e.g. all of Running + Cycling + HIIT + Rowing for
// Cardio), rather than a second cascading level.
export function getFlatExercises(category) {
  const groups = EXERCISE_LIBRARY[category] ?? {};
  return Object.values(groups).flat();
}

export const DEFAULT_VALUES = {
  category: "Strength",
  muscleGroup: "",
  exerciseName: "",
  variation: "",
  duration: "",
  calories: "",
  notes: "",
};

// Per-category icon + badge styling, used on the category <select>
// (implicitly, via the form) and as the fallback for getExerciseIcon()
// below. Kept as one lookup table so a color only ever needs to change
// in one place.
export const CATEGORY_META = {
  Strength: {
    icon: "🏋️",
    badge:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  },
  Cardio: {
    icon: "🏃",
    badge:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  },
  Core: {
    icon: "🎯",
    badge:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
  },
  Flexibility: {
    icon: "🧘",
    badge:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
  },
};

// --- Exercise-specific icons (Phase 11 / Feature 1) --------------------
// Every Strength exercise used to fall back to the same 💪 category icon
// (CATEGORY_META.Strength.icon), which made the Timeline and Workout
// History repetitive — a bench-press card and a squat card looked
// identical apart from their text. This maps individual exercise names
// (exactly as they appear in EXERCISE_LIBRARY above) to a more specific
// icon. Deliberately a flat name -> icon map, not nested under category,
// since a couple of names are unambiguous on their own and this keeps
// getExerciseIcon() below a single lookup instead of a per-category scan.
export const EXERCISE_ICONS = {
  // Chest / pressing
  "Bench Press": "🏋️",
  "Incline Bench Press": "🏋️",
  "Decline Bench Press": "🏋️",
  "Close-Grip Bench Press": "🏋️",
  "Push-ups": "🤸",
  "Dumbbell Fly": "🏋️",
  "Chest Press": "🏋️",

  // Back / pulling
  "Pull-ups": "🔝",
  "Chin-ups": "🔝",
  "Lat Pulldown": "🎯",
  "Barbell Row": "🏋️",
  "Seated Cable Row": "🏋️",
  Deadlift: "⚡",
  "Romanian Deadlift": "⚡",

  // Shoulders
  "Overhead Press": "🏋️",
  "Dumbbell Shoulder Press": "🏋️",
  "Lateral Raise": "🏋️",
  "Front Raise": "🏋️",
  "Rear Delt Fly": "🏋️",
  "Arnold Press": "🏋️",

  // Arms
  "Barbell Curl": "💪",
  "Dumbbell Curl": "💪",
  "Hammer Curl": "🔨",
  "Preacher Curl": "💪",
  "Concentration Curl": "💪",
  "Tricep Pushdown": "🔽",
  "Skull Crushers": "💀",
  Dips: "🤸",
  "Overhead Tricep Extension": "🔽",
  "Wrist Curl": "✊",
  "Reverse Wrist Curl": "✊",
  "Farmer's Walk": "🏋️",
  "Plate Pinch": "✊",

  // Legs
  Squats: "🦵",
  "Front Squats": "🦵",
  "Bulgarian Split Squat": "🦵",
  "Sumo Squat": "🦵",
  Lunges: "🦵",
  "Leg Press": "🦿",
  "Leg Extension": "🦵",
  "Leg Curl": "🦵",
  "Good Morning": "🦵",
  "Glute-Ham Raise": "🦵",
  "Hip Thrust": "🦵",
  "Glute Bridge": "🦵",
  "Cable Kickback": "🦵",
  "Step-ups": "🦵",
  "Standing Calf Raise": "🦶",
  "Seated Calf Raise": "🦶",
  "Donkey Calf Raise": "🦶",

  // Cardio
  "Outdoor Run": "🏃",
  "Treadmill Run": "🏃",
  "Sprint Intervals": "🏃",
  "Outdoor Cycling": "🚴",
  "Stationary Bike": "🚴",
  Burpees: "🔥",
  "Mountain Climbers": "🔥",
  "Jump Rope": "🔥",
  "Jumping Jacks": "🔥",
  "Rowing Machine": "🚣",

  // Core
  Crunches: "🎯",
  "Bicycle Crunches": "🎯",
  "Leg Raises": "🎯",
  "Russian Twist": "🎯",
  "Sit-ups": "🎯",
  "Side Plank": "🪵",
  "Wood Chop": "🎯",
  "Hanging Knee Twist": "🎯",
  Superman: "🎯",
  "Back Extension": "🎯",
  "Bird Dog": "🎯",

  // Flexibility
  "Full Body Stretch": "🤲",
  "Shoulder Stretch": "🤲",
  "Chest Stretch": "🤲",
  "Tricep Stretch": "🤲",
  "Hamstring Stretch": "🤲",
  "Quad Stretch": "🤲",
  "Hip Flexor Stretch": "🤲",
  "Calf Stretch": "🤲",
  "Downward Dog": "🧘",
  "Cobra Pose": "🧘",
  "Child's Pose": "🧘",
  "Cat-Cow": "🧘",
};

// The single lookup every workout-rendering component should use instead
// of reading CATEGORY_META[...].icon directly: exercise name first, then
// category fallback, then a generic dumbbell if even the category is
// unrecognized. Centralizing this means WorkoutCard, WorkoutTimeline, and
// anywhere else an exercise icon is shown can't drift out of sync with
// each other or with EXERCISE_ICONS above.
export function getExerciseIcon(exerciseName, category) {
  return (
    EXERCISE_ICONS[exerciseName] ?? CATEGORY_META[category]?.icon ?? "🏋️"
  );
}

// Converts a form field's raw string value into what the backend expects:
// an empty string becomes null (so optional numeric fields don't fail
// validation), anything else is parsed as a number.
export function toNullableNumber(value) {
  if (value === "" || value === undefined || value === null) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Shared dark-theme input styling, reused across every field below so
// text inputs, number inputs, selects, and the textarea all look
// consistent without repeating the same long class string ten times.
export const FIELD_CLASSES =
  "mt-1.5 block w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors";
export const LABEL_CLASSES = "block text-sm font-medium text-gray-700 dark:text-gray-300";
export const FIELD_ERROR_CLASSES = "mt-1.5 text-xs text-red-500 dark:text-red-400";

// A single empty set row for the dynamic set table. Kept as a factory
// function (not a shared object literal) so every new row is its own
// object — otherwise every row in the array would point at the same
// object and editing one set would silently edit all of them.
export function createEmptySetEntry() {
  return { reps: "", weight: "" };
}

// --- Edit support (Phase 8) -----------------------------------------
// Maps a workout returned by the API (snake_case, numbers/nulls) into the
// exact shape WorkoutForm's react-hook-form defaultValues expect
// (camelCase, strings) — the same shape as DEFAULT_VALUES above, just
// populated from an existing workout instead of blank.
export function workoutToFormValues(workout) {
  return {
    category: workout.category,
    muscleGroup: workout.muscle_group || "",
    exerciseName: workout.exercise_name || "",
    variation: workout.variation || "",
    duration: workout.duration ?? "",
    calories: workout.calories ?? "",
    notes: workout.notes || "",
  };
}

// Maps a workout's `set_entries` (backend shape: [{set, reps, weight}],
// numbers) into the dynamic set table's local row shape ([{reps, weight}],
// strings, ordered by `set`) — mirrors createEmptySetEntry()'s shape so
// the same table/handlers work for both a brand-new row and a row loaded
// from an existing workout. Falls back to a single empty row for
// non-Strength workouts (empty set_entries) so the table never renders
// with zero rows.
export function workoutToSetEntries(workout) {
  if (!workout.set_entries || workout.set_entries.length === 0) {
    return [createEmptySetEntry()];
  }
  return [...workout.set_entries]
    .sort((a, b) => (a.set ?? 0) - (b.set ?? 0))
    .map((entry) => ({
      reps: String(entry.reps ?? ""),
      weight: String(entry.weight ?? ""),
    }));
}

// Total volume for one workout: sum(reps × weight) across every set in
// set_entries. Cardio/Core/Flexibility workouts have an empty set_entries
// array, so they naturally contribute 0 — volume is a Strength-specific
// concept. (Mirrors Dashboard.jsx's workoutVolume().)
export function workoutVolume(workout) {
  if (!workout.set_entries?.length) return 0;
  return workout.set_entries.reduce(
    (total, entry) => total + (entry.reps || 0) * (entry.weight || 0),
    0
  );
}

/**
 * Workout Insights (Phase 11 / Feature 3).
 *
 * Deliberately NOT an AI API call — every "insight" here is a plain
 * derived statistic over `workouts` (from getWorkouts(), passed in by
 * the caller), phrased as a sentence. No network call, no new backend
 * endpoint, nothing async.
 */

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isWithinDays(isoString, days) {
  const ms = days * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(isoString).getTime() <= ms;
}

// "You're strongest on {day}." — the weekday with the highest total
// volume (reps × weight across all set_entries), not just the most
// workouts logged.
function strongestDayInsight(workouts) {
  const volumeByDay = new Array(7).fill(0);
  for (const workout of workouts) {
    const day = new Date(workout.created_at).getDay();
    for (const entry of workout.set_entries ?? []) {
      volumeByDay[day] += (entry.reps || 0) * (entry.weight || 0);
    }
  }
  const total = volumeByDay.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const bestDay = volumeByDay.indexOf(Math.max(...volumeByDay));
  return `You're strongest on ${DAY_NAMES[bestDay]}s.`;
}

// "{Category} is your most trained muscle group." — actually reports the
// most-logged *category* (Strength/Cardio/Core/Flexibility), since
// set_entries doesn't carry a distinct "muscle" beyond `muscle_group`,
// which is Strength-only. Falls back to reporting the top muscle_group
// specifically when the top category is Strength, for a more useful
// sentence.
function mostTrainedInsight(workouts) {
  if (workouts.length === 0) return null;

  const categoryCounts = {};
  const muscleGroupCounts = {};
  for (const workout of workouts) {
    categoryCounts[workout.category] = (categoryCounts[workout.category] || 0) + 1;
    if (workout.muscle_group) {
      muscleGroupCounts[workout.muscle_group] =
        (muscleGroupCounts[workout.muscle_group] || 0) + 1;
    }
  }

  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0][0];

  if (topCategory === "Strength" && Object.keys(muscleGroupCounts).length > 0) {
    const topMuscleGroup = Object.entries(muscleGroupCounts).sort(
      (a, b) => b[1] - a[1]
    )[0][0];
    return `${topMuscleGroup} is your most trained muscle group.`;
  }

  return `${topCategory} is your most trained category.`;
}

// "Your {exercise} improved by {n} kg." — compares the heaviest set
// logged for an exercise in the last 30 days against the heaviest set
// logged before that, for whichever exercise improved the most.
function biggestImprovementInsight(workouts) {
  const recentMax = new Map();
  const olderMax = new Map();

  for (const workout of workouts) {
    const bucket = isWithinDays(workout.created_at, 30) ? recentMax : olderMax;
    for (const entry of workout.set_entries ?? []) {
      const current = bucket.get(workout.exercise_name) ?? 0;
      if (entry.weight > current) bucket.set(workout.exercise_name, entry.weight);
    }
  }

  let bestExercise = null;
  let bestGain = 0;
  for (const [exercise, recentWeight] of recentMax.entries()) {
    const olderWeight = olderMax.get(exercise);
    if (olderWeight === undefined) continue;
    const gain = recentWeight - olderWeight;
    if (gain > bestGain) {
      bestGain = gain;
      bestExercise = exercise;
    }
  }

  if (!bestExercise || bestGain <= 0) return null;
  return `Your ${bestExercise} improved by ${bestGain} kg.`;
}

// "Cardio sessions increased this month." — compares this month's cardio
// count against last month's.
function cardioTrendInsight(workouts) {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  let thisMonthCount = 0;
  let lastMonthCount = 0;
  for (const workout of workouts) {
    if (workout.category !== "Cardio") continue;
    const created = new Date(workout.created_at);
    if (created >= thisMonthStart) thisMonthCount += 1;
    else if (created >= lastMonthStart && created < thisMonthStart) lastMonthCount += 1;
  }

  if (thisMonthCount > lastMonthCount && lastMonthCount > 0) {
    return "Cardio sessions increased this month.";
  }
  return null;
}

// "You've trained {n} days this week." — unique calendar days, not raw
// workout count, so 2 workouts on the same day still count as 1 day.
function thisWeekInsight(workouts) {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const days = new Set();
  for (const workout of workouts) {
    const created = new Date(workout.created_at);
    if (created.getTime() >= oneWeekAgo) {
      days.add(created.toDateString());
    }
  }
  if (days.size === 0) return null;
  return `You've trained ${days.size} day${days.size === 1 ? "" : "s"} this week.`;
}

/**
 * Returns 3-5 insight strings, in a stable but varied order. Callers
 * (WorkoutInsightsCard) are responsible for rotating through them in the
 * UI — this function just computes what's available right now.
 */
export function generateWorkoutInsights(workouts) {
  if (!workouts || workouts.length === 0) return [];

  const candidates = [
    thisWeekInsight(workouts),
    mostTrainedInsight(workouts),
    strongestDayInsight(workouts),
    biggestImprovementInsight(workouts),
    cardioTrendInsight(workouts),
  ].filter(Boolean);

  return candidates.slice(0, 5);
}

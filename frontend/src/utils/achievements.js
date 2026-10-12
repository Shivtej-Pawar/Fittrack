/**
 * Client-side achievement system (Phase 10 / Feature 3).
 *
 * Entirely derived from data `getWorkouts()` already returns — no new
 * backend endpoint, no persistence beyond what's already fetched. Each
 * achievement's `isUnlocked(stats)` reads from a small precomputed
 * `stats` object (built once by `computeAchievementStats`, below) rather
 * than raw workouts, so the unlock checks stay cheap and readable.
 */

export const ACHIEVEMENTS = [
  {
    id: "first-workout",
    title: "First Workout",
    description: "Log your first workout.",
    icon: "🥇",
    isUnlocked: (stats) => stats.totalWorkouts >= 1,
    progressLabel: (stats) => `${Math.min(stats.totalWorkouts, 1)}/1 workouts`,
  },
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Log 5 workouts.",
    icon: "🚀",
    isUnlocked: (stats) => stats.totalWorkouts >= 5,
    progressLabel: (stats) => `${Math.min(stats.totalWorkouts, 5)}/5 workouts`,
  },
  {
    id: "consistent",
    title: "Consistent",
    description: "Reach a 7-day streak.",
    icon: "🔥",
    isUnlocked: (stats) => stats.currentStreak >= 7,
    progressLabel: (stats) => `${Math.min(stats.currentStreak, 7)}/7 day streak`,
  },
  {
    id: "unstoppable",
    title: "Unstoppable",
    description: "Reach a 30-day streak.",
    icon: "⚡",
    isUnlocked: (stats) => stats.currentStreak >= 30,
    progressLabel: (stats) => `${Math.min(stats.currentStreak, 30)}/30 day streak`,
  },
  {
    id: "heavy-lifter",
    title: "Heavy Lifter",
    description: "Lift 1,000 kg of total volume.",
    icon: "🏋️",
    isUnlocked: (stats) => stats.totalVolume >= 1000,
    progressLabel: (stats) =>
      `${Math.min(stats.totalVolume, 1000).toLocaleString()}/1,000 kg`,
  },
  {
    id: "cardio-master",
    title: "Cardio Master",
    description: "Log 10 cardio workouts.",
    icon: "🏃",
    isUnlocked: (stats) => stats.categoryCounts.Cardio >= 10,
    progressLabel: (stats) =>
      `${Math.min(stats.categoryCounts.Cardio, 10)}/10 cardio workouts`,
  },
  {
    id: "core-champion",
    title: "Core Champion",
    description: "Log 20 core workouts.",
    icon: "🎯",
    isUnlocked: (stats) => stats.categoryCounts.Core >= 20,
    progressLabel: (stats) =>
      `${Math.min(stats.categoryCounts.Core, 20)}/20 core workouts`,
  },
  {
    id: "flexibility-expert",
    title: "Flexibility Expert",
    description: "Log 15 flexibility workouts.",
    icon: "🧘",
    isUnlocked: (stats) => stats.categoryCounts.Flexibility >= 15,
    progressLabel: (stats) =>
      `${Math.min(stats.categoryCounts.Flexibility, 15)}/15 flexibility workouts`,
  },
];

// Builds the small stats object every achievement's isUnlocked/
// progressLabel reads from. Takes `currentStreak` as a parameter rather
// than recomputing it here, since Dashboard.jsx already has its own
// streak calculation (calculateCurrentStreak) — passing it in avoids a
// second, potentially-drifting implementation of the same logic.
export function computeAchievementStats(workouts, currentStreak) {
  const categoryCounts = { Strength: 0, Cardio: 0, Core: 0, Flexibility: 0 };
  let totalVolume = 0;

  for (const workout of workouts) {
    categoryCounts[workout.category] = (categoryCounts[workout.category] || 0) + 1;
    for (const entry of workout.set_entries ?? []) {
      totalVolume += (entry.reps || 0) * (entry.weight || 0);
    }
  }

  return {
    totalWorkouts: workouts.length,
    currentStreak,
    totalVolume,
    categoryCounts,
  };
}

// Returns every achievement annotated with its unlocked state — the
// shape Dashboard's Achievements section actually renders.
export function getAchievementProgress(workouts, currentStreak) {
  const stats = computeAchievementStats(workouts, currentStreak);
  return ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: achievement.isUnlocked(stats),
    progress: achievement.progressLabel(stats),
  }));
}

// --- Phase 13 / Feature 3 -----------------------------------------------
// "Achievement bounce when unlocked" needs to know which achievements
// are *newly* unlocked this load, not just which ones are unlocked —
// otherwise every already-unlocked achievement would bounce on every
// single page visit forever, which stops meaning anything. Persisted to
// localStorage (achievements have no backend concept to persist to,
// same reasoning as utils/prTracking.js).
//
// --- Security/isolation fix (post-launch audit) --------------------------
// This used to be one single global key, `"fittrack_achievements_seen"`,
// shared across every account that ever logged into this browser. That
// meant switching accounts on a shared device could make a brand-new
// user's already-unlocked achievements silently fail to "bounce" (they'd
// incorrectly be treated as already-seen, because *someone else's*
// session had marked those same achievement ids as seen before) — or,
// the other direction, an achievement a returning user already saw
// bouncing again because a different account's session had never marked
// it seen. The key is now scoped per user
// (`fittrack_achievements_seen_<userId>`), the same fix and the same
// reasoning as utils/prTracking.js's PR storage.
const SEEN_ACHIEVEMENTS_KEY_PREFIX = "fittrack_achievements_seen_";

function seenAchievementsKey(userId) {
  return `${SEEN_ACHIEVEMENTS_KEY_PREFIX}${userId}`;
}

function getSeenAchievementIds(userId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(seenAchievementsKey(userId))) || []);
  } catch {
    return new Set();
  }
}

// Call once per Dashboard load with the current unlocked list and the
// current user's id. Returns the subset of ids that are unlocked now
// but weren't marked "seen" before *for this specific user* — i.e. what
// should bounce — and marks every currently-unlocked achievement as
// seen so it only ever bounces the one time. If `userId` isn't known
// yet (still loading), nothing is marked/returned as newly-unlocked,
// since there's no safe per-account bucket to read/write.
export function getNewlyUnlockedIds(achievements, userId) {
  if (!userId) return new Set();

  const seen = getSeenAchievementIds(userId);
  const unlockedIds = achievements.filter((a) => a.unlocked).map((a) => a.id);
  const newlyUnlocked = unlockedIds.filter((id) => !seen.has(id));

  if (unlockedIds.length > 0) {
    const merged = new Set([...seen, ...unlockedIds]);
    localStorage.setItem(seenAchievementsKey(userId), JSON.stringify([...merged]));
  }

  return new Set(newlyUnlocked);
}

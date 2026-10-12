/**
 * Personal record tracking (Phase 13 / Feature 8).
 *
 * Persisted to localStorage (per-browser, not per-account across
 * devices — same tradeoff as the old profileStorage.js fallback before
 * Phase 9 added real backend persistence for body stats; PRs don't have
 * a backend concept to persist to, and this phase's spec doesn't ask for
 * one, so this stays client-only by design).
 *
 * `seedPRsFromHistory` must run once (LogWorkout.jsx does this on mount)
 * before `checkAndRecordPR` is trusted — otherwise a fresh browser with
 * no local PR history would treat every exercise's very first save as
 * "beating" a phantom record of 0, which isn't a real PR.
 *
 * --- Security/isolation fix (post-launch audit) --------------------------
 * The storage key used to be a single global `"fittrack_personal_records"`
 * shared by every account that ever used this browser. That meant User
 * B, logging into a shared/public computer after User A, would
 * immediately see (and silently inherit) User A's PR numbers — and any
 * new PR User B set would overwrite User A's real record in the same
 * shared bucket. Every function here now takes a `userId` and reads/
 * writes a key scoped to that specific user
 * (`fittrack_personal_records_<userId>`), so switching accounts on the
 * same device can never leak or corrupt another account's PR data. This
 * mirrors the pattern utils/profileStorage.js already uses for the
 * onboarding-seen flag (there, scoped by email instead of id — either
 * is fine as long as it's *some* stable per-account identifier, never a
 * single shared key).
 */

const PR_STORAGE_KEY_PREFIX = "fittrack_personal_records_";

function storageKey(userId) {
  return `${PR_STORAGE_KEY_PREFIX}${userId}`;
}

function getStoredPRs(userId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId))) || {};
  } catch {
    return {};
  }
}

function saveStoredPRs(userId, prs) {
  localStorage.setItem(storageKey(userId), JSON.stringify(prs));
}

function heaviestSet(workout) {
  return (workout.set_entries ?? []).reduce(
    (max, entry) => Math.max(max, entry.weight ?? 0),
    0
  );
}

// Call once with the user's full workout history (e.g. on LogWorkout
// mount) so locally-known PRs reflect everything they've ever logged,
// not just what's happened since this browser started tracking PRs.
// `userId` scopes the read/write to this specific account — see the
// isolation-fix note above.
export function seedPRsFromHistory(workouts, userId) {
  if (!userId) return; // No authenticated user yet — nothing safe to seed into.

  const prs = getStoredPRs(userId);
  let changed = false;
  for (const workout of workouts) {
    const weight = heaviestSet(workout);
    if (weight > (prs[workout.exercise_name] ?? 0)) {
      prs[workout.exercise_name] = weight;
      changed = true;
    }
  }
  if (changed) saveStoredPRs(userId, prs);
}

// Is this specific (already-saved) workout the one currently holding
// the local PR for its exercise? Used by WorkoutDrawer.jsx (Phase 15 /
// Feature 2) to show a "Personal Record" badge — a read-only check, so
// unlike checkAndRecordPR() above it never writes to storage.
export function isPersonalRecord(workout, userId) {
  if (!userId) return false;
  const weight = heaviestSet(workout);
  if (weight <= 0) return false;
  const prs = getStoredPRs(userId);
  return prs[workout.exercise_name] === weight;
}

// Call after a workout saves successfully. Returns
// `{ exercise, weight }` if it set a new PR, otherwise `null`. Updates
// the stored record when it does, so the same weight never celebrates
// twice. `userId` scopes the read/write to this specific account.
export function checkAndRecordPR(workout, userId) {
  if (!userId) return null;

  const weight = heaviestSet(workout);
  if (weight <= 0) return null;

  const prs = getStoredPRs(userId);
  const previousBest = prs[workout.exercise_name] ?? 0;
  if (weight <= previousBest) return null;

  prs[workout.exercise_name] = weight;
  saveStoredPRs(userId, prs);
  return { exercise: workout.exercise_name, weight };
}

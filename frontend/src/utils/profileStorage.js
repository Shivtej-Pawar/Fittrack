/**
 * Client-side tracking for whether a user has seen the one-time
 * onboarding flow. The backend has no concept of this at all — it's a
 * pure UI/UX flag, not user data, so it deliberately stays in
 * `localStorage` rather than moving to the database.
 *
 * Phase 9: this file used to also hold a localStorage fallback for a
 * user's height/current_weight/goal_weight, from before
 * `PATCH /api/v1/users/me` existed. That's gone now — Profile.jsx and
 * Onboarding.jsx read/write those fields for real via
 * services/userService.js, and the user object from AuthContext
 * (backed by the database) is the single source of truth.
 * See services/userService.js and backend/app/routers/users.py.
 */

const ONBOARDING_PREFIX = "fittrack_onboarding_seen:";

// Has this email completed or skipped onboarding before? Fails "safe" —
// if we don't know the email, don't force onboarding on someone.
export function hasSeenOnboarding(email) {
  if (!email) return true;
  return localStorage.getItem(ONBOARDING_PREFIX + email) === "true";
}

export function markOnboardingSeen(email) {
  if (!email) return;
  localStorage.setItem(ONBOARDING_PREFIX + email, "true");
}

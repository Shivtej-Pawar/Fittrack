/**
 * Calendar-month math for WorkoutHeatmap.jsx (Phase 16 / Feature 1).
 *
 * Split out into its own file (per this phase's own "Files Expected to
 * Change" list) so the date arithmetic — the part that actually needs to
 * be *correct*, not just look right — is easy to read and reason about
 * in isolation from the rendering code.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// The exact number of days in a given month — the fix at the heart of
// this phase. `new Date(year, month + 1, 0)` is JavaScript's standard
// trick for "the 0th day of next month," which `Date` normalizes to
// "the last day of this month" — so this is correct for every month,
// including leap-year February, without a hardcoded days-per-month table
// that would need its own leap-year special case.
export function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

// Buckets a per-day workout count into one of 5 intensity levels (0-4),
// the same idea GitHub uses for its contribution squares. Unchanged
// logic from before this phase — only how days are grouped into months
// changed, not how a single day's color is chosen.
export function intensityLevel(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

/**
 * Builds one "month block" describing exactly `monthDate`'s own calendar
 * month — nothing from the month before or after it.
 *
 * Returned shape:
 *   {
 *     year, monthIndex, label: "Aug 2026",
 *     totalWorkouts: <sum of every real day's count>,
 *     weeks: [ [cell, cell, ...], ... ]   // each inner array has exactly 7 slots
 *   }
 * Each `cell` is either `null` (a leading/trailing alignment spacer with
 * no real date — rendered as a fully transparent placeholder, never
 * clickable/hoverable, and never "belongs" to a neighboring month) or a
 * real day object: `{ date, key, day, count, workouts }`.
 *
 * `workouts` on each real day cell is the actual array of that day's
 * Workout objects (not just a count) — Feature 3 (the click-to-open
 * popover) needs exercise names/categories/sets, not just a number.
 */
export function buildMonthBlock(year, monthIndex, workoutsByDateKey) {
  const numDays = daysInMonth(year, monthIndex);
  const firstOfMonth = new Date(year, monthIndex, 1);
  const leadingBlanks = firstOfMonth.getDay(); // 0 (Sun) - 6 (Sat)

  const slots = [];
  for (let i = 0; i < leadingBlanks; i += 1) {
    slots.push(null);
  }

  let totalWorkouts = 0;
  for (let day = 1; day <= numDays; day += 1) {
    const date = new Date(year, monthIndex, day);
    const key = toDateKey(date);
    const dayWorkouts = workoutsByDateKey.get(key) ?? [];
    totalWorkouts += dayWorkouts.length;
    slots.push({ date, key, day, count: dayWorkouts.length, workouts: dayWorkouts });
  }

  // Trailing blanks so the last week is a full 7-slot row too — purely
  // a rendering nicety (a clean rectangular grid), never a real
  // adjacent-month day. `slots.length % 7` is 0 exactly when no padding
  // is needed (the month happened to end on a Saturday).
  const trailingBlanks = (7 - (slots.length % 7)) % 7;
  for (let i = 0; i < trailingBlanks; i += 1) {
    slots.push(null);
  }

  const weeks = [];
  for (let i = 0; i < slots.length; i += 7) {
    weeks.push(slots.slice(i, i + 7));
  }

  return {
    year,
    monthIndex,
    label: firstOfMonth.toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    }),
    totalWorkouts,
    weeks,
  };
}

/**
 * Builds the last `monthCount` calendar-month blocks (oldest first),
 * ending with the current month — e.g. `monthCount=12` covers roughly
 * the same ~1-year span the old continuous grid did, just correctly
 * split at real month boundaries this time instead of one unbroken
 * 53-week ribbon.
 */
export function buildMonthBlocks(workouts, monthCount = 12) {
  const workoutsByDateKey = new Map();
  for (const workout of workouts) {
    const key = toDateKey(new Date(workout.created_at));
    const existing = workoutsByDateKey.get(key);
    if (existing) existing.push(workout);
    else workoutsByDateKey.set(key, [workout]);
  }

  const today = startOfDay(new Date());
  const blocks = [];
  for (let i = monthCount - 1; i >= 0; i -= 1) {
    // `new Date(year, month - i, 1)` deliberately lets the month index
    // go negative/overflow — Date normalizes "month -2" into the
    // correct prior-year month automatically, so this correctly walks
    // backward across a year boundary (e.g. Nov/Dec 2025 -> Jan 2026)
    // without any manual "if month < 0" branching.
    const target = new Date(today.getFullYear(), today.getMonth() - i, 1);
    blocks.push(buildMonthBlock(target.getFullYear(), target.getMonth(), workoutsByDateKey));
  }
  return blocks;
}

export { DAY_MS };

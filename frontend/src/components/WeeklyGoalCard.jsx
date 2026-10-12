import { useEffect, useMemo, useState } from "react";
import useCountUp from "../hooks/useCountUp";

/**
 * Weekly Goal Tracker (Phase 11 / Feature 1, made user-configurable in
 * Phase 13 / Feature 1).
 *
 * `goal` now comes from the caller — Dashboard.jsx passes
 * `user?.weekly_goal ?? 5`, so a user who hasn't set one yet (or is on
 * an account created before this column existed) still sees the
 * original default. "This week" = the last 7 days (same window
 * Dashboard's own "This Week" stat card already uses), counting unique
 * calendar days with at least one workout — consistent with how the
 * Current Streak card counts days, not raw workout rows.
 */

const RING_SIZE = 88;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function countThisWeekDays(workouts) {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const days = new Set();
  for (const workout of workouts) {
    const created = new Date(workout.created_at);
    if (created.getTime() >= oneWeekAgo) {
      days.add(created.toDateString());
    }
  }
  return days.size;
}

export default function WeeklyGoalCard({ workouts, goal = 5 }) {
  const completed = useMemo(() => countThisWeekDays(workouts), [workouts]);
  const remaining = Math.max(goal - completed, 0);
  const exceededBy = Math.max(completed - goal, 0);
  // Never exceeds 100% visually, even when the user has blown past their
  // goal — the ring fills and stays full; the exceeded-by count is
  // called out in the message below instead.
  const percent = Math.min(Math.round((completed / goal) * 100), 100);
  const isComplete = completed >= goal;

  // Animate the ring filling in on mount/update rather than snapping
  // straight to its final value — a plain CSS transition on
  // `strokeDashoffset`, driven by re-rendering with the target percent
  // one tick after mount (so the browser sees the "from" state first).
  //
  // Phase 16 / Feature 5 polish: the percentage *text* now counts up in
  // sync with the ring, via the same shared `useCountUp` hook Dashboard's
  // StatCard uses (extracted to hooks/useCountUp.js this phase
  // specifically so this component could reuse it instead of a second,
  // slightly-different implementation) — which also means this
  // automatically respects `prefers-reduced-motion` the same way every
  // other count-up in the app already does, for free. The ring's own
  // transition also moved from a flat 700ms `ease-out` to a slightly
  // longer, custom cubic-bezier curve with a gentle overshoot-then-settle
  // feel, which reads as noticeably smoother/more premium for the same
  // final duration.
  const [animatedPercent, setAnimatedPercent] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimatedPercent(percent));
    return () => cancelAnimationFrame(frame);
  }, [percent]);

  const displayPercent = useCountUp(percent, 900);

  const dashOffset =
    RING_CIRCUMFERENCE - (animatedPercent / 100) * RING_CIRCUMFERENCE;

  const message = isComplete
    ? exceededBy > 0
      ? `Exceeded your goal by ${exceededBy} workout${exceededBy === 1 ? "" : "s"}!`
      : "Weekly goal completed!"
    : remaining === 1
    ? "1 workout left this week!"
    : `${remaining} workouts left this week!`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-lg shadow-black/5 dark:shadow-black/10 sm:p-6">
      {/* Celebration flourish — a soft emerald glow, shown only at 100%.
          CSS-only (no confetti library), respects prefers-reduced-motion
          via the motion-safe: variant on the pulse animation. */}
      {isComplete && (
        <div
          aria-hidden="true"
          className="motion-safe:animate-pulse pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl"
        />
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Weekly Goal
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {goal} workouts / week
          </p>
        </div>

        {/* Circular progress ring */}
        <div className="relative flex-shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            className="-rotate-90"
          >
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              strokeWidth={RING_STROKE}
              className="stroke-gray-100 dark:stroke-gray-800"
            />
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              className={`transition-[stroke-dashoffset] duration-[900ms] ease-[cubic-bezier(0.34,1.2,0.64,1)] ${
                isComplete ? "stroke-emerald-500" : "stroke-blue-500"
              }`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {displayPercent}%
            </span>
          </div>
        </div>
      </div>

      <p
        className={`mt-4 text-sm font-medium ${
          isComplete
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-gray-600 dark:text-gray-400"
        }`}
      >
        {isComplete ? "🎉 " : ""}
        {message}
      </p>
      <p className="mt-0.5 text-xs text-gray-500">
        {completed} of {goal} workouts completed
      </p>
    </div>
  );
}

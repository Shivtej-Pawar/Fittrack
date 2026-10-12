/**
 * Shared skeleton-loader primitives (Phase 13 / Feature 2).
 *
 * `Skeleton` is the one raw building block (a pulsing gray/dark box) —
 * every composed skeleton below is just several `Skeleton`s arranged to
 * roughly match the shape of the real content, so a loading page doesn't
 * visually "jump" once data arrives. Uses `animate-pulse` (Tailwind's
 * built-in), which already respects `prefers-reduced-motion` via
 * Tailwind's own reduced-motion handling.
 *
 * This centralizes what several pages/components already did with
 * ad-hoc inline `animate-pulse` divs (Dashboard's old StatSkeletons/
 * ActivitySkeletons, Progress's chart skeletons, WorkoutCard's
 * WorkoutSkeletons) — new loading states go through this file; existing
 * ones are left as-is rather than risking a broad, low-value refactor
 * (see DOCUMENTATION.md's Phase 13 section for the full reasoning).
 */

export function Skeleton({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-800 ${className}`}
    />
  );
}

export function SkeletonCard({ className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-lg shadow-black/5 dark:shadow-black/10 ${className}`}
    >
      <Skeleton className="h-5 w-5" />
      <Skeleton className="mt-3 h-7 w-16" />
      <Skeleton className="mt-2 h-3 w-20" />
    </div>
  );
}

// Dashboard's 4-card "Your Stats" grid.
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// WeeklyGoalCard's ring + text layout.
export function WeeklyGoalSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-lg shadow-black/5 dark:shadow-black/10 sm:p-6">
      <div>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-3 w-32" />
      </div>
      <Skeleton className="h-[88px] w-[88px] rounded-full" />
    </div>
  );
}

// WorkoutTimeline's connecting-line rows.
export function TimelineSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 p-2">
          <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 pt-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-2 h-3 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Workout History cards (Workouts.jsx).
export function WorkoutHistorySkeleton({ rows = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="mt-5 flex gap-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Profile page (account card + body-stats card).
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xl shadow-black/5 dark:shadow-black/20 sm:p-8">
        <Skeleton className="h-5 w-24" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xl shadow-black/5 dark:shadow-black/20 sm:p-8">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}

// Progress page's chart-sized blocks.
export function ProgressChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

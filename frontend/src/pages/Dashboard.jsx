import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import WorkoutHeatmap from "../components/WorkoutHeatmap";
import WeeklyGoalCard from "../components/WeeklyGoalCard";
import WeeklyComparisonCard from "../components/WeeklyComparisonCard";
import WorkoutInsightsCard from "../components/WorkoutInsightsCard";
import WorkoutTimeline from "../components/WorkoutTimeline";
import MuscleGroupHeatmap from "../components/MuscleGroupHeatmap";
import RecoveryIndicator from "../components/RecoveryIndicator";
import ShareProgressModal from "../components/ShareProgressModal";
import { DashboardStatsSkeleton, TimelineSkeleton } from "../components/Skeleton";
import useCountUp from "../hooks/useCountUp";
import { useAuth } from "../context/AuthContext";
import { getWorkouts } from "../services/workoutService";
import { getAchievementProgress, getNewlyUnlockedIds } from "../utils/achievements";

const MOTIVATIONAL_QUOTES = [
  "Consistency beats intensity.",
  "Small steps, every day, win.",
  "The only bad workout is the one you skipped.",
  "Progress, not perfection.",
  "Show up. That's most of it.",
  "Strong today, stronger tomorrow.",
  "Discipline is choosing what you want most.",
];

// Picks a quote deterministically from the day of the year, so it's
// stable across a single day (not re-randomized on every render/refresh)
// but changes daily.
function getDailyQuote() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86_400_000
  );
  return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
}

// Phase 15 / Feature 4 — time-of-day greeting for the redesigned hero.
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

const CATEGORY_META = {
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

// formatDate()/workoutVolume()/formatVolume() previously lived here for
// the inline Recent Activity list; that list was replaced by
// WorkoutTimeline (Phase 11 / Feature 2), which has its own
// relativeDate()/summarize() formatting, so these are no longer used
// anywhere in this file and were removed rather than left as dead code.

// --- Current Streak (Phase 9 / Feature 3) -------------------------------
// Local-timezone YYYY-MM-DD key for a Date — the unit streaks are counted
// in ("workout dates only", per the spec), so two workouts logged hours
// apart on the same calendar day collapse to the same key and count as
// one streak day, not two.
function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, delta) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
}

// Counts consecutive calendar days (most recent first) that have at
// least one logged workout. Duplicate workouts on the same day only
// count once, since this walks a de-duplicated Set of date keys, not the
// raw workout list.
//
// Rule (explicit in the spec): if yesterday has no logged workout, the
// streak is 0 — full stop, even if today already has one. If yesterday
// *does* have one, the count starts from today (if today also has a
// workout) or from yesterday (if today doesn't yet — the user still has
// the rest of today to keep the streak alive), then walks backward until
// the first gap.
function calculateCurrentStreak(workouts) {
  if (workouts.length === 0) return 0;

  const workoutDateKeys = new Set(
    workouts.map((workout) => toDateKey(new Date(workout.created_at)))
  );

  const today = startOfDay(new Date());
  const yesterday = addDays(today, -1);

  if (!workoutDateKeys.has(toDateKey(yesterday))) {
    return 0;
  }

  let streak = 0;
  let cursor = workoutDateKeys.has(toDateKey(today)) ? today : yesterday;
  while (workoutDateKeys.has(toDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

const QUICK_ACTIONS = [
  {
    to: "/log-workout",
    icon: "➕",
    title: "New Workout",
    description: "Log a session",
  },
  {
    to: "/workouts",
    icon: "📜",
    title: "View Workouts",
    description: "See your history",
  },
  {
    to: "/profile",
    icon: "👤",
    title: "Profile",
    description: "Manage your account",
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // Phase 13 / Feature 4 — null when closed, `{ type }` when open
  // ("streak" is the only trigger wired up for now — see the Share
  // button on StreakCard).
  const [shareConfig, setShareConfig] = useState(null);

  useEffect(() => {
    async function loadWorkouts() {
      setIsLoading(true);
      setLoadError("");
      try {
        const data = await getWorkouts();
        setWorkouts(data);
      } catch (err) {
        const detail = err?.response?.data?.detail;
        setLoadError(
          typeof detail === "string"
            ? detail
            : "Could not load your workout data."
        );
      } finally {
        setIsLoading(false);
      }
    }
    loadWorkouts();
  }, []);

  const stats = useMemo(() => {
    if (workouts.length === 0) {
      return {
        total: 0,
        thisWeek: 0,
        currentStreak: 0,
        favoriteCategory: null,
      };
    }

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = workouts.filter(
      (workout) => new Date(workout.created_at).getTime() >= oneWeekAgo
    ).length;

    const currentStreak = calculateCurrentStreak(workouts);

    const categoryCounts = workouts.reduce((counts, workout) => {
      counts[workout.category] = (counts[workout.category] || 0) + 1;
      return counts;
    }, {});
    const favoriteCategory = Object.entries(categoryCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    // Phase 15 / Feature 6: this used to also compute a
    // most-frequently-logged exercise name here for the old
    // ShareProgressCard's "Favorite Exercise" line. The redesigned share
    // card (ShareProgressModal.jsx) shows "Strongest PR" instead (per
    // this phase's spec), computed internally from `workouts` via
    // PersonalRecords.jsx's exported computeRecords() rather than a
    // value passed down from here — so this computation is gone rather
    // than left unused.

    return {
      total: workouts.length,
      thisWeek,
      currentStreak,
      favoriteCategory,
    };
  }, [workouts]);

  // recentWorkouts previously lived here for the old inline Recent
  // Activity list; WorkoutTimeline (Phase 11 / Feature 2) now does its
  // own sort/slice internally from the raw `workouts` prop, so this was
  // removed rather than left unused.

  // Achievements (Phase 10 / Feature 3) — reuses the streak already
  // computed in `stats` above rather than recalculating it, so there's
  // only one streak implementation (calculateCurrentStreak) in the app.
  const achievements = useMemo(
    () => getAchievementProgress(workouts, stats.currentStreak),
    [workouts, stats.currentStreak]
  );

  // Phase 13 / Feature 3 — which achievements should bounce this load.
  // A useEffect (not useMemo) because getNewlyUnlockedIds has a side
  // effect (persisting "seen" ids to localStorage, scoped per user —
  // see achievements.js's isolation-fix comment), which belongs in an
  // effect, not a memo.
  const [newlyUnlockedIds, setNewlyUnlockedIds] = useState(new Set());
  useEffect(() => {
    if (achievements.length === 0 || !user?.id) return;
    setNewlyUnlockedIds(getNewlyUnlockedIds(achievements, user.id));
  }, [achievements, user]);

  const firstName = user?.full_name?.split(" ")[0] || "there";
  const weeklyGoal = user?.weekly_goal ?? 5;
  const weeklyGoalCompleted = Math.min(stats.thisWeek, weeklyGoal);

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        {/* Premium Hero (Phase 15 / Feature 4) — replaces the old plain
            header. Left: time-of-day greeting + name + today's date +
            the existing daily quote (kept — nothing said to remove it,
            and it's a nice existing touch). Right: a compact glanceable
            streak + weekly-goal readout (the *full* detailed versions —
            StreakCard with its Share button, and the WeeklyGoalCard ring
            — still render further down exactly as before; this is a
            stylized summary, not a replacement for either). Soft
            gradient wash + blurred accent circles + a translucent
            backdrop-blur card give the "glassmorphism" feel the spec
            asks for. Everything below this block is untouched. */}
        <div className="hero-fade-in relative overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 p-6 shadow-xl shadow-black/5 dark:shadow-black/20 backdrop-blur-xl sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -left-12 -top-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute -right-10 top-10 h-52 w-52 rounded-full bg-emerald-500/10 blur-3xl" />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/5 via-transparent to-emerald-500/5"
          />

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                {getGreeting()} ·{" "}
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                {getGreeting()}, {firstName}
              </h1>
              <p className="mt-2 text-sm italic text-gray-600 dark:text-gray-400">
                {getDailyQuote()}
              </p>

              {/* Quick Actions inside the hero — the full 3-card grid
                  still exists further down the page (Phase 11 spec
                  placed it last); these two buttons are just the
                  fastest path to the two most common actions, right
                  where the eye lands first. */}
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/log-workout"
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 active:scale-95"
                >
                  ➕ Log Workout
                </Link>
                <Link
                  to="/workouts"
                  className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 backdrop-blur transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-600 active:scale-95"
                >
                  📜 View History
                </Link>
              </div>
            </div>

            {!isLoading && !loadError && (
              <div className="hero-fade-in-delayed flex flex-shrink-0 gap-3">
                <div className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-gray-800/50 px-5 py-4 text-center backdrop-blur">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    🔥 {stats.currentStreak}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">Day Streak</p>
                </div>
                <div className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-gray-800/50 px-5 py-4 text-center backdrop-blur">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {weeklyGoalCompleted}/{weeklyGoal}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">Weekly Goal</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions grid moved to the bottom of the page — see the
            end of this component — per Phase 11's "Final Dashboard
            Layout" spec. */}

        {/* Statistics */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Stats</h2>
          {isLoading ? (
            <div className="mt-4">
              <DashboardStatsSkeleton />
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon="📋" label="Total Workouts" value={stats.total} />
              <StatCard icon="🗓" label="This Week" value={stats.thisWeek} />
              <StreakCard streak={stats.currentStreak} onShare={() => setShareConfig({ type: "streak" })} />
              <StatCard
                icon={CATEGORY_META[stats.favoriteCategory]?.icon ?? "⭐"}
                label="Favorite Category"
                value={stats.favoriteCategory ?? "—"}
              />
            </div>
          )}
        </div>

        {/* Weekly Goal Tracker (Phase 11 / Feature 1) — placed right
            after Stats/near Current Streak, per spec. Renders with 0/5
            completed while loading is fine (no separate skeleton) since
            the ring itself is cheap to compute once `workouts` arrives;
            still gated on `!isLoading` so it doesn't flash a "0
            completed" state before the real data loads. */}
        {!isLoading && !loadError && (
          <div className="mt-10 max-w-sm">
            <WeeklyGoalCard workouts={workouts} goal={user?.weekly_goal ?? 5} />
          </div>
        )}

        {/* Weekly Comparison (Phase 15 / Feature 5) — this week vs last
            week, entirely client-side from the same `workouts` already
            loaded above. Placed right after Weekly Goal since both are
            weekly-cadence cards. */}
        {!isLoading && !loadError && (
          <div className="mt-10">
            <WeeklyComparisonCard workouts={workouts} />
          </div>
        )}

        {/* Workout Consistency (Phase 10 / Feature 2) — below Current
            Streak, per spec. Only rendered once workouts have loaded;
            an empty-but-loaded list still renders the heatmap (all-empty
            grid), which is more honest than hiding it entirely. */}
        {!isLoading && !loadError && (
          <div className="mt-10">
            <WorkoutHeatmap workouts={workouts} />
          </div>
        )}

        {/* Muscle Group Focus + Recovery (Phase 13 / Feature 7) — both
            client-side, no new backend endpoint. Side-by-side on
            desktop, stacked on mobile. */}
        {!isLoading && !loadError && (
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <MuscleGroupHeatmap workouts={workouts} />
            <RecoveryIndicator workouts={workouts} />
          </div>
        )}

        {/* Workout Insights (Phase 11 / Feature 3) */}
        {!isLoading && !loadError && (
          <div className="mt-10">
            <WorkoutInsightsCard workouts={workouts} />
          </div>
        )}

        {/* Achievements (Phase 10 / Feature 3) */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Achievements
          </h2>

          {isLoading && (
            <div className="mt-4">
              <DashboardStatsSkeleton />
            </div>
          )}

          {!isLoading && !loadError && workouts.length === 0 && (
            <div className="mt-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
              <p className="text-sm text-gray-500">
                Complete your first workout to unlock achievements.
              </p>
            </div>
          )}

          {!isLoading && !loadError && workouts.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  title={
                    achievement.unlocked
                      ? achievement.description
                      : `Locked — ${achievement.progress}`
                  }
                  className={`rounded-2xl border p-4 text-center shadow-lg shadow-black/5 dark:shadow-black/10 transition-all duration-200 active:scale-95 sm:p-5 ${
                    achievement.unlocked
                      ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-500/10"
                      : "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 grayscale opacity-50 hover:opacity-70"
                  }`}
                >
                  <span
                    className={`text-2xl ${
                      newlyUnlockedIds.has(achievement.id)
                        ? "motion-safe:animate-bounce"
                        : ""
                    }`}
                    aria-hidden="true"
                  >
                    {achievement.icon}
                  </span>
                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                    {achievement.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {achievement.unlocked ? achievement.description : achievement.progress}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Timeline (Phase 11 / Feature 2) — replaces
            the old inline "Recent activity" list with the new
            WorkoutTimeline component; the surrounding header/loading/
            error/empty states are unchanged from before this phase. */}
        <div className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
            {!isLoading && workouts.length > 0 && (
              <Link
                to="/workouts"
                className="text-sm font-medium text-blue-600 dark:text-blue-400 transition-colors hover:text-blue-500 dark:hover:text-blue-300"
              >
                View all →
              </Link>
            )}
          </div>

          <div className="mt-4">
            {isLoading && <TimelineSkeleton rows={4} />}

            {!isLoading && loadError && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-600 dark:text-red-400">
                {loadError}
              </div>
            )}

            {!isLoading && !loadError && workouts.length === 0 && (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 text-center">
                <p className="text-5xl">🏋️</p>
                <p className="mt-4 text-base font-medium text-gray-700 dark:text-gray-300">
                  Log your first workout.
                </p>
                <Link
                  to="/log-workout"
                  className="mt-5 inline-block rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500"
                >
                  New Workout
                </Link>
              </div>
            )}

            {!isLoading && !loadError && workouts.length > 0 && (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-lg shadow-black/5 dark:shadow-black/10 sm:p-6">
                <WorkoutTimeline workouts={workouts} limit={8} />
              </div>
            )}
          </div>
        </div>

        {/* Share Progress (Phase 13 / Feature 4, wired up properly;
            Phase 15 / Feature 6 replaced the download-only modal behind
            this button with the full Universal Share experience) —
            previously the only way to reach the share flow was a small
            icon on the Streak stat card that only appeared on `:hover`
            (via `opacity-0 group-hover:opacity-100`), which meant it was
            invisible by default and completely unreachable on touch
            devices (no hover state at all). This section is the real,
            always-visible entry point the feature needed. The small
            hover icon on StreakCard still works too (harmless extra
            shortcut), it's just no longer the only way in. All values
            below are the same `stats`/`user` already computed above —
            nothing recalculated. */}
        {!isLoading && !loadError && workouts.length > 0 && (
          <div className="mt-10 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-lg shadow-black/5 dark:shadow-black/10 sm:p-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Share Progress
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Share it to social media, or download a card for your portfolio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShareConfig({ type: "streak" })}
                className="flex-shrink-0 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 active:scale-95"
              >
                Share Progress
              </button>
            </div>

            {/* Lightweight always-visible teaser — the same stats the
                modal's real (html2canvas-captured) preview shows, just
                a quick glance here rather than a second image-capture
                implementation. */}
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  🔥 {stats.currentStreak}
                </p>
                <p className="text-xs text-gray-500">Day Streak</p>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.total}
                </p>
                <p className="text-xs text-gray-500">Total Workouts</p>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {Math.min(stats.thisWeek, user?.weekly_goal ?? 5)}/{user?.weekly_goal ?? 5}
                </p>
                <p className="text-xs text-gray-500">Weekly Goal</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions — moved here from the top of the page (was
            right after the header) per Phase 11's Final Dashboard
            Layout spec, which places it last. */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Quick Actions
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.title}
                to={action.to}
                className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-lg shadow-black/5 dark:shadow-black/10 transition-all duration-200 hover:-translate-y-1 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/80"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-xl transition-transform duration-200 group-hover:scale-110">
                  {action.icon}
                </span>
                <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
                  {action.title}
                </h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  {action.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <ShareProgressModal
        open={shareConfig !== null}
        onClose={() => setShareConfig(null)}
        workouts={workouts}
        streak={stats.currentStreak}
        totalWorkouts={stats.total}
        weeklyGoalCompleted={weeklyGoalCompleted}
        weeklyGoalTarget={weeklyGoal}
        userName={user?.full_name}
      />
    </Layout>
  );
}

// useCountUp moved to hooks/useCountUp.js in Phase 16, so
// WeeklyGoalCard.jsx's percentage animation could reuse the exact same
// implementation instead of a second, slightly-different one.

function StatCard({ icon, label, value }) {
  const isNumeric = typeof value === "number";
  const animatedValue = useCountUp(isNumeric ? value : 0);
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-lg shadow-black/5 dark:shadow-black/10">
      <span className="text-xl">{icon}</span>
      <p className="mt-2 truncate text-2xl font-bold text-gray-900 dark:text-white">
        {isNumeric ? animatedValue : value}
      </p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </div>
  );
}

// Current Streak card (Phase 9 / Feature 3, replaces the old Total
// Volume card). Same shape as StatCard so it slots into the same grid
// cell, but with a bit of flair (orange flame + a one-line encouragement)
// since a streak is meant to feel motivating, not just be a number.
// Phase 13 / Feature 4 adds a small Share button once there's a streak
// worth sharing.
function StreakCard({ streak, onShare }) {
  return (
    <div className="group relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-lg shadow-black/5 dark:shadow-black/10">
      <span className="text-xl">🔥</span>
      <p className="mt-2 truncate text-2xl font-bold text-gray-900 dark:text-white">
        {streak} {streak === 1 ? "Day" : "Days"}
      </p>
      <p className="mt-0.5 text-xs text-gray-500">
        {streak > 0 ? "Keep it going!" : "Log a workout to start a streak"}
      </p>
      {streak > 0 && (
        <button
          type="button"
          onClick={onShare}
          aria-label="Share your streak"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 opacity-0 transition-opacity duration-150 hover:bg-blue-500/10 hover:text-blue-500 group-hover:opacity-100"
        >
          <span aria-hidden="true" className="text-sm">⤴</span>
        </button>
      )}
    </div>
  );
}

// StatSkeletons/ActivitySkeletons previously lived here — replaced by
// the shared DashboardStatsSkeleton/TimelineSkeleton from
// components/Skeleton.jsx (Phase 13 / Feature 2), so this page no
// longer needs its own copies.

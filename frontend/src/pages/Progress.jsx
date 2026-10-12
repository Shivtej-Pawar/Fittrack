import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { getWorkouts } from "../services/workoutService";
import PersonalRecords from "../components/PersonalRecords";
import { useTheme } from "../context/ThemeContext";
import { DashboardStatsSkeleton, ProgressChartsSkeleton } from "../components/Skeleton";
import { workoutVolume } from "../utils/workoutHelpers";

/**
 * Real analytics dashboard, built entirely from getWorkouts() — no new
 * endpoints, no invented data. Replaces the Phase 6 placeholder.
 *
 * Layout/Navbar are NOT imported here — App.jsx already wraps the
 * `/progress` route in <Layout>, same as Dashboard/Workouts/Profile, so
 * this file only owns its own content area (matching how those pages
 * are structured).
 *
 * Phase 13: this page previously had no `dark:` variants at all (it
 * predates Phase 9's theme toggle and was never updated), so it looked
 * broken in light mode. Given light-mode support now, this file's
 * container/text/card classes were brought in line with the rest of the
 * app, and the Recharts color constants below now come from `useTheme()`
 * instead of being hardcoded to dark-mode hex values.
 */

const CATEGORY_COLORS = {
  Strength: "#3b82f6",
  Cardio: "#10b981",
  Core: "#a855f7",
  Flexibility: "#f97316",
};
const CHART_ACCENT = "#3b82f6"; // primary blue, used for non-category charts

// Monday of the week containing `dateInput`, at local midnight — used to
// bucket workouts into weekly groups for Chart A.
function getWeekStart(dateInput) {
  const date = new Date(dateInput);
  const day = date.getDay(); // 0 (Sun) .. 6 (Sat)
  const diff = (day === 0 ? -6 : 1) - day; // shift back to Monday
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatShortDate(dateInput) {
  return new Date(dateInput).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// Shared themed tooltip — Recharts' default Tooltip renders a plain
// white box regardless of theme, so every chart below uses this instead.
// Phase 15 / Feature 3: gained an optional `extraFields` prop — each
// chart passes the list of secondary metrics (sets/volume/duration) it
// wants shown below the primary plotted value, pulled straight off the
// hovered data point (`payload[0].payload`) rather than a second
// Recharts series. Explicit per-chart lists (not "show whatever fields
// happen to exist") keep each chart in control of exactly what its own
// tooltip says, and avoid ever re-showing the same metric twice.
function ChartTooltip({ active, payload, label, unit, extraFields }) {
  if (!active || !payload?.length) return null;
  const dataRow = payload[0]?.payload;
  return (
    <div className="tooltip-fade-in rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-xs shadow-lg shadow-black/10 dark:shadow-black/40">
      {label && <p className="font-medium text-gray-600 dark:text-gray-300">{label}</p>}
      {payload.map((entry) => (
        <p
          key={entry.dataKey ?? entry.name}
          className="mt-0.5 font-medium"
          style={{ color: entry.color ?? entry.payload?.fill }}
        >
          {entry.name}: {Number(entry.value).toLocaleString()}
          {unit ? ` ${unit}` : ""}
        </p>
      ))}
      {extraFields?.length > 0 && dataRow && (
        <div className="mt-1.5 space-y-0.5 border-t border-gray-100 dark:border-gray-800 pt-1.5">
          {extraFields.map(({ key, label: fieldLabel, unit: fieldUnit }) => {
            const value = dataRow[key];
            if (value === undefined || value === null) return null;
            return (
              <p key={key} className="text-gray-500 dark:text-gray-400">
                {fieldLabel}: {Number(value).toLocaleString()}
                {fieldUnit ? ` ${fieldUnit}` : ""}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Progress() {
  const { isDark } = useTheme();
  // Recharts needs real color values (not Tailwind classes), so these
  // switch based on the current theme rather than being hardcoded.
  const gridColor = isDark ? "#1f2937" : "#e5e7eb"; // gray-800 / gray-200
  const axisColor = isDark ? "#374151" : "#9ca3af"; // gray-700 / gray-400
  const tickColor = isDark ? "#9ca3af" : "#6b7280"; // gray-400 / gray-500

  const [workouts, setWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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
          : "Could not load your workout data. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadWorkouts();
  }, []);

  // --- Quick stats ------------------------------------------------------
  const stats = useMemo(() => {
    if (workouts.length === 0) {
      return {
        totalWorkouts: 0,
        totalSets: 0,
        totalVolume: 0,
        favoriteCategory: null,
      };
    }
    const totalWorkouts = workouts.length;
    const totalSets = workouts.reduce(
      (sum, w) => sum + (w.set_entries?.length ?? 0),
      0
    );
    const totalVolume = workouts.reduce(
      (sum, w) => sum + workoutVolume(w),
      0
    );
    const counts = {};
    for (const w of workouts) counts[w.category] = (counts[w.category] ?? 0) + 1;
    const favoriteCategory = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    return { totalWorkouts, totalSets, totalVolume, favoriteCategory };
  }, [workouts]);

  // --- Chart A: workouts per week (bar) ---------------------------------
  // Phase 15 / Feature 3: each bucket now also totals sets/volume for
  // that week (not just the workout count already plotted), so the
  // premium tooltip can show more than the single bar value.
  const weeklyData = useMemo(() => {
    const buckets = new Map();
    for (const w of workouts) {
      const key = getWeekStart(w.created_at).toISOString();
      const bucket = buckets.get(key) ?? { count: 0, sets: 0, volume: 0 };
      bucket.count += 1;
      bucket.sets += w.set_entries?.length ?? 0;
      bucket.volume += workoutVolume(w);
      buckets.set(key, bucket);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([key, bucket]) => ({
        week: formatShortDate(key),
        ...bucket,
      }));
  }, [workouts]);

  // --- Chart B: category breakdown (pie) --------------------------------
  // Phase 15 / Feature 3: each slice also totals sets/volume for that
  // category, for the same reason as Chart A above.
  const categoryData = useMemo(() => {
    const buckets = {
      Strength: { count: 0, sets: 0, volume: 0 },
      Cardio: { count: 0, sets: 0, volume: 0 },
      Core: { count: 0, sets: 0, volume: 0 },
      Flexibility: { count: 0, sets: 0, volume: 0 },
    };
    for (const w of workouts) {
      const bucket = buckets[w.category];
      if (!bucket) continue;
      bucket.count += 1;
      bucket.sets += w.set_entries?.length ?? 0;
      bucket.volume += workoutVolume(w);
    }
    return Object.entries(buckets)
      .filter(([, bucket]) => bucket.count > 0)
      .map(([category, bucket]) => ({ name: category, value: bucket.count, ...bucket }));
  }, [workouts]);

  // --- Chart C: volume trend (line) --------------------------------------
  // Phase 15 / Feature 3: each point also carries that single workout's
  // own set count and duration, for the same reason as above.
  const volumeTrendData = useMemo(() => {
    return [...workouts]
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((w) => ({
        date: formatShortDate(w.created_at),
        volume: workoutVolume(w),
        sets: w.set_entries?.length ?? 0,
        duration: w.duration ?? null,
      }));
  }, [workouts]);

  // Personal records are computed inside the reusable
  // components/PersonalRecords.jsx (Phase 10 / Feature 5), which takes
  // `workouts` directly as a prop — no local useMemo needed here.

  const hasWorkouts = !isLoading && !loadError && workouts.length > 0;
  const isEmpty = !isLoading && !loadError && workouts.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-gray-900 dark:text-white sm:px-6 sm:py-14">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Progress
        </h1>
        <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
          Track how you're improving over time.
        </p>
      </div>

      {isLoading && (
        <div className="mt-8 space-y-10">
          <DashboardStatsSkeleton />
          <ProgressChartsSkeleton />
        </div>
      )}

      {!isLoading && loadError && (
        <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="text-2xl">⚠️</p>
          <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{loadError}</p>
          <button
            onClick={loadWorkouts}
            className="mt-4 rounded-lg border border-red-500/30 px-4 py-1.5 text-sm font-medium text-red-600 dark:text-red-300 transition-colors hover:bg-red-500/10 active:scale-95"
          >
            Try again
          </button>
        </div>
      )}

      {/* Phase 13 / Feature 10 — friendlier empty state: a touch more
          personality than a bare "no progress yet," and a clearer
          explanation of what unlocks this page, not just a dead end. */}
      {isEmpty && (
        <div className="mt-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 text-center shadow-xl shadow-black/5 dark:shadow-black/20">
          <p className="text-5xl">📈</p>
          <p className="mt-4 text-base font-medium text-gray-800 dark:text-gray-300">
            Nothing to show yet
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-gray-500">
            Once you've logged a few workouts, this page fills in with
            charts, streaks, and personal records automatically.
          </p>
          <Link
            to="/log-workout"
            className="mt-5 inline-block rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 active:scale-95"
          >
            Log Your First Workout
          </Link>
        </div>
      )}

      {hasWorkouts && (
        <>
          {/* Quick stats */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon="🏋️" label="Total Workouts" value={stats.totalWorkouts} />
            <StatCard icon="🔁" label="Total Sets" value={stats.totalSets} />
            <StatCard
              icon="⚖"
              label="Total Volume"
              value={`${stats.totalVolume.toLocaleString()} kg`}
            />
            <StatCard
              icon="🎯"
              label="Favorite Category"
              value={stats.favoriteCategory ?? "—"}
            />
          </div>

          {/* Charts */}
          <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Chart A — Workouts per week */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-lg shadow-black/5 dark:shadow-black/10 sm:p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Workouts Per Week
              </h2>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis
                      dataKey="week"
                      stroke={axisColor}
                      tick={{ fill: tickColor, fontSize: 12 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke={axisColor}
                      tick={{ fill: tickColor, fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}
                      content={(props) => (
                        <ChartTooltip
                          {...props}
                          unit="workouts"
                          extraFields={[
                            { key: "sets", label: "Sets" },
                            { key: "volume", label: "Volume", unit: "kg" },
                          ]}
                        />
                      )}
                    />
                    <Bar dataKey="count" name="Workouts" fill={CHART_ACCENT} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart B — Category breakdown */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-lg shadow-black/5 dark:shadow-black/10 sm:p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Workout Categories
              </h2>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {categoryData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={CATEGORY_COLORS[entry.name] ?? "#6b7280"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={(props) => (
                        <ChartTooltip
                          {...props}
                          unit="workouts"
                          extraFields={[
                            { key: "sets", label: "Sets" },
                            { key: "volume", label: "Volume", unit: "kg" },
                          ]}
                        />
                      )}
                    />
                    <Legend
                      wrapperStyle={{ color: tickColor, fontSize: 12 }}
                      formatter={(value) => (
                        <span style={{ color: tickColor }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart C — Volume trend, full width */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-lg shadow-black/5 dark:shadow-black/10 sm:p-6 lg:col-span-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Volume Trend
              </h2>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={volumeTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke={axisColor}
                      tick={{ fill: tickColor, fontSize: 12 }}
                    />
                    <YAxis
                      stroke={axisColor}
                      tick={{ fill: tickColor, fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ stroke: axisColor }}
                      content={(props) => (
                        <ChartTooltip
                          {...props}
                          unit="kg"
                          extraFields={[
                            { key: "sets", label: "Sets" },
                            { key: "duration", label: "Duration", unit: "min" },
                          ]}
                        />
                      )}
                    />
                    <Line
                      type="monotone"
                      dataKey="volume"
                      name="Volume"
                      stroke={CHART_ACCENT}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: CHART_ACCENT }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Personal records — Phase 10 / Feature 5: the shared,
              reusable components/PersonalRecords.jsx (heaviest lift, most
              reps, most sets, longest cardio session, highest calories —
              not just heaviest weight per exercise like before), rather
              than a one-off list inlined in this page. */}
          <div className="mt-10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Personal Records</h2>
            <div className="mt-4">
              <PersonalRecords workouts={workouts} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-lg shadow-black/5 dark:shadow-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 dark:hover:border-gray-700 sm:p-5">
      <span className="text-xl" aria-hidden="true">
        {icon}
      </span>
      <p className="mt-2 truncate text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
        {value}
      </p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

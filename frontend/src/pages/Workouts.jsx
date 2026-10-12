import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import WorkoutCard, { WorkoutSkeletons } from "../components/WorkoutCard";
import WorkoutDrawer from "../components/WorkoutDrawer";
import WorkoutForm from "../components/WorkoutForm";
import { useAuth } from "../context/AuthContext";
import {
  deleteWorkout as deleteWorkoutRequest,
  getWorkouts,
  updateWorkout as updateWorkoutRequest,
} from "../services/workoutService";
import { exportWorkoutsToCsv, exportWorkoutsToPdf } from "../utils/exportWorkouts";
import {
  CATEGORIES,
  workoutToFormValues,
  workoutToSetEntries,
} from "../utils/workoutHelpers";

/**
 * View Workouts page (Phase 9 / Feature 1).
 *
 * Split out of the old combined Workouts.jsx — this page now owns only
 * the history list (date filters, export, Edit/Delete, empty/loading/
 * error states). The create form moved to LogWorkout.jsx. Edit reuses
 * the exact same WorkoutForm component LogWorkout.jsx uses (extracted to
 * components/WorkoutForm.jsx), and each history entry is the shared
 * WorkoutCard (components/WorkoutCard.jsx), so nothing about how a
 * workout is created, displayed, or edited was duplicated by this split.
 */

const DATE_FILTERS = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "custom", label: "Custom" },
];

// Phase 10 / Feature 4 — client-side sort options for the search/filter
// toolbar. "Most Sets"/"Highest Weight" both read from set_entries, so
// they naturally sort Cardio/Core/Flexibility workouts (empty
// set_entries) to the bottom rather than erroring.
const SORT_OPTIONS = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "most-sets", label: "Most Sets" },
  { id: "highest-weight", label: "Highest Weight" },
];

function maxSetWeight(workout) {
  if (!workout.set_entries?.length) return 0;
  return Math.max(...workout.set_entries.map((entry) => entry.weight || 0));
}

// Start-of-day / Monday-of-week / first-of-month boundaries, all in the
// browser's local timezone (matching how `created_at` is already
// displayed elsewhere via formatDate/toLocaleDateString). Purely a
// client-side filter over whatever `getWorkouts()` already returned —
// no backend endpoint, no new query params, per this feature's explicit
// "filter the already fetched workouts using created_at" requirement.
function getFilterRange(filterId, customFrom, customTo) {
  const now = new Date();

  if (filterId === "today") {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { from, to: now };
  }

  if (filterId === "week") {
    const day = now.getDay(); // 0 (Sun) .. 6 (Sat)
    const diff = (day === 0 ? -6 : 1) - day; // shift back to Monday
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
    return { from, to: now };
  }

  if (filterId === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, to: now };
  }

  if (filterId === "custom") {
    // Date <input type="date"> values are "YYYY-MM-DD" — appending an
    // explicit local time avoids the classic UTC-midnight-parses-as-
    // yesterday off-by-one when the browser is behind UTC.
    const from = customFrom ? new Date(`${customFrom}T00:00:00`) : null;
    const to = customTo ? new Date(`${customTo}T23:59:59.999`) : null;
    return { from, to };
  }

  // "all" — no bounds.
  return { from: null, to: null };
}

export default function Workouts() {
  const { user } = useAuth();

  // --- History state (list) -------------------------------------------
  const [workouts, setWorkouts] = useState([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(true);
  const [workoutsError, setWorkoutsError] = useState("");

  async function loadWorkouts() {
    setIsLoadingWorkouts(true);
    setWorkoutsError("");
    try {
      const data = await getWorkouts();
      // Most recent first, so a freshly-saved workout appears at the top
      // of the list without the user needing to scroll.
      const sorted = [...data].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setWorkouts(sorted);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setWorkoutsError(
        typeof detail === "string"
          ? detail
          : "Could not load your workout history. Please try again."
      );
    } finally {
      setIsLoadingWorkouts(false);
    }
  }

  useEffect(() => {
    loadWorkouts();
  }, []);

  // --- Date filters (Phase 9 / Feature 2) -------------------------------
  const [dateFilter, setDateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const filteredWorkouts = useMemo(() => {
    const { from, to } = getFilterRange(dateFilter, customFrom, customTo);
    if (!from && !to) return workouts;
    return workouts.filter((workout) => {
      const created = new Date(workout.created_at);
      if (from && created < from) return false;
      if (to && created > to) return false;
      return true;
    });
    // `workouts` is already newest-first (sorted in loadWorkouts) —
    // Array.prototype.filter preserves order, so no re-sort is needed
    // here to keep that ordering.
  }, [workouts, dateFilter, customFrom, customTo]);

  // --- Search, category filter, sort (Phase 10 / Feature 4) --------------
  // All client-side, layered on top of the date filter above — none of
  // this touches the network or `workouts` itself.
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest");

  const hasActiveFilters =
    dateFilter !== "all" || categoryFilter !== "all" || searchQuery.trim() !== "";

  function clearAllFilters() {
    setDateFilter("all");
    setCustomFrom("");
    setCustomTo("");
    setCategoryFilter("all");
    setSearchQuery("");
  }

  const visibleWorkouts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const matched = filteredWorkouts.filter((workout) => {
      if (categoryFilter !== "all" && workout.category !== categoryFilter) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        workout.exercise_name,
        workout.muscle_group,
        workout.variation,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });

    const sorted = [...matched];
    if (sortOption === "oldest") {
      sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortOption === "most-sets") {
      sorted.sort(
        (a, b) => (b.set_entries?.length || 0) - (a.set_entries?.length || 0)
      );
    } else if (sortOption === "highest-weight") {
      sorted.sort((a, b) => maxSetWeight(b) - maxSetWeight(a));
    }
    // "newest" needs no re-sort — `workouts` (and therefore
    // `filteredWorkouts`) is already newest-first from loadWorkouts().

    return sorted;
  }, [filteredWorkouts, searchQuery, categoryFilter, sortOption]);

  // --- Export (Phase 9 / Feature 5) --------------------------------------
  // Exports whatever is currently filtered/visible, not the full
  // unfiltered history — matches the toolbar mockup showing the filter
  // pills and the export buttons together as one unit.
  const canExport = !isLoadingWorkouts && !workoutsError && visibleWorkouts.length > 0;

  // --- View details (Phase 15 / Feature 2) --------------------------------
  const [viewingWorkout, setViewingWorkout] = useState(null);

  // --- Edit (Phase 8) ---------------------------------------------------
  const [editingWorkout, setEditingWorkout] = useState(null);

  async function handleUpdateWorkout(payload) {
    await updateWorkoutRequest(editingWorkout.id, payload);
    await loadWorkouts();
  }

  // --- Delete (Phase 8) --------------------------------------------------
  const [deletingWorkout, setDeletingWorkout] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteToast, setDeleteToast] = useState("");

  function openDeleteConfirm(workout) {
    setDeleteError("");
    setDeletingWorkout(workout);
  }

  function closeDeleteConfirm() {
    if (isDeleting) return;
    setDeletingWorkout(null);
  }

  async function confirmDeleteWorkout() {
    if (!deletingWorkout) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteWorkoutRequest(deletingWorkout.id);
      setWorkouts((prev) => prev.filter((w) => w.id !== deletingWorkout.id));
      setDeletingWorkout(null);
      setDeleteToast("Workout deleted successfully.");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setDeleteError(
        typeof detail === "string"
          ? detail
          : "Could not delete this workout. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  // Auto-dismiss the delete toast after a few seconds.
  useEffect(() => {
    if (!deleteToast) return undefined;
    const timeout = setTimeout(() => setDeleteToast(""), 3500);
    return () => clearTimeout(timeout);
  }, [deleteToast]);

  return (
    <Layout>
      <div className="min-h-screen bg-white dark:bg-gray-950 px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-3xl">
          {/* Page header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                Workout History
              </h1>
              <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
                Every workout you've logged, newest first.
              </p>
            </div>
            <Link
              to="/log-workout"
              className="inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500"
            >
              ➕ Log Workout
            </Link>
          </div>

          {user?.full_name && (
            <p className="mt-2 text-xs text-gray-500">
              Signed in as {user.full_name}
            </p>
          )}

          {/* Toolbar — date filters + export (Phase 9 / Features 2 & 5) */}
          <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-lg shadow-black/5 dark:shadow-black/10 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {DATE_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setDateFilter(filter.id)}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ${
                      dateFilter === filter.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}

                {dateFilter === "custom" && (
                  <div className="flex flex-wrap items-center gap-2 pl-1">
                    <label className="flex items-center gap-1.5 text-xs text-gray-500">
                      From
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500">
                      To
                      <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportWorkoutsToCsv(visibleWorkouts)}
                  disabled={!canExport}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 px-3.5 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-150 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-300 dark:disabled:hover:border-gray-700 disabled:hover:bg-transparent"
                >
                  ⬇ Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => exportWorkoutsToPdf(visibleWorkouts)}
                  disabled={!canExport}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 px-3.5 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-150 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-300 dark:disabled:hover:border-gray-700 disabled:hover:bg-transparent"
                >
                  📄 Export PDF
                </button>
              </div>
            </div>

            {/* Search / category filter / sort (Phase 10 / Feature 4) —
                a second toolbar row so the date-filter pills above don't
                get cramped. Entirely client-side, layered on top of the
                date filter via `visibleWorkouts`. */}
            <div className="flex flex-col gap-2.5 border-t border-gray-200 dark:border-gray-800 pt-4 sm:flex-row sm:items-center">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search exercise, muscle group, or variation…"
                className="w-full flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    Sort: {option.label}
                  </option>
                ))}
              </select>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 transition-colors hover:underline"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Workout history */}
          <div className="mt-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {dateFilter === "all"
                  ? "All Workouts"
                  : DATE_FILTERS.find((f) => f.id === dateFilter)?.label}
              </h2>
              {!isLoadingWorkouts && !workoutsError && (
                <span className="text-sm text-gray-500">
                  {visibleWorkouts.length} logged
                </span>
              )}
            </div>

            <div className="mt-5">
              {isLoadingWorkouts && <WorkoutSkeletons />}

              {!isLoadingWorkouts && workoutsError && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
                  <p className="text-2xl">⚠️</p>
                  <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                    {workoutsError}
                  </p>
                  <button
                    onClick={loadWorkouts}
                    className="mt-4 rounded-lg border border-red-500/30 px-4 py-1.5 text-sm font-medium text-red-600 dark:text-red-300 transition-colors hover:bg-red-500/10"
                  >
                    Try again
                  </button>
                </div>
              )}

              {!isLoadingWorkouts && !workoutsError && workouts.length === 0 && (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 text-center">
                  <p className="text-5xl">🏋️</p>
                  <p className="mt-4 text-base font-medium text-gray-700 dark:text-gray-300">
                    No workouts logged yet.
                  </p>
                  <Link
                    to="/log-workout"
                    className="mt-5 inline-block rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500"
                  >
                    Log Workout
                  </Link>
                </div>
              )}

              {!isLoadingWorkouts &&
                !workoutsError &&
                workouts.length > 0 &&
                visibleWorkouts.length === 0 && (
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 text-center">
                    <p className="text-4xl">🔍</p>
                    <p className="mt-4 text-base font-medium text-gray-700 dark:text-gray-300">
                      No workouts match your filters.
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Try a different search term, category, or date range.
                    </p>
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="mt-5 inline-block rounded-xl border border-gray-300 dark:border-gray-700 px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}

              {!isLoadingWorkouts && !workoutsError && visibleWorkouts.length > 0 && (
                <ul className="space-y-4">
                  {visibleWorkouts.map((workout, index) => (
                    <WorkoutCard
                      key={workout.id}
                      workout={workout}
                      index={index}
                      onEdit={() => setEditingWorkout(workout)}
                      onDelete={() => openDeleteConfirm(workout)}
                      onViewDetails={() => setViewingWorkout(workout)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Workout Detail Drawer (Phase 15 / Feature 2) — its own Edit/
            Delete buttons call these same setEditingWorkout/
            openDeleteConfirm handlers, closing the drawer first so the
            respective modal opens cleanly on top rather than stacking
            behind it. */}
        {viewingWorkout && (
          <WorkoutDrawer
            workout={viewingWorkout}
            onClose={() => setViewingWorkout(null)}
            onEdit={() => setEditingWorkout(viewingWorkout)}
            onDelete={() => openDeleteConfirm(viewingWorkout)}
          />
        )}

        {/* Edit modal — reuses WorkoutForm, pre-filled from the workout
            being edited. `key={editingWorkout.id}` forces a fresh
            WorkoutForm instance (fresh internal state) whenever a
            different workout is opened for editing. */}
        {editingWorkout && (
          <Modal
            title="Edit Workout"
            description="Update the details below, then save your changes."
            onClose={() => setEditingWorkout(null)}
          >
            <WorkoutForm
              key={editingWorkout.id}
              initialValues={workoutToFormValues(editingWorkout)}
              initialSetEntries={workoutToSetEntries(editingWorkout)}
              onSubmit={handleUpdateWorkout}
              onSuccess={() => setEditingWorkout(null)}
              submitLabel="Save Changes"
              submittingLabel="Saving…"
              successMessageText=""
              errorMessageText="Could not save your changes. Please try again."
            />
          </Modal>
        )}

        {/* Delete confirmation modal — nothing is removed until this is
            explicitly confirmed. */}
        {deletingWorkout && (
          <Modal title="Delete this workout?" onClose={closeDeleteConfirm} maxWidthClass="max-w-sm">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This action cannot be undone.
            </p>
            {deleteError && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {deleteError}
              </div>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={isDeleting}
                className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteWorkout}
                disabled={isDeleting}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {isDeleting ? "Deleting…" : "Delete Workout"}
              </button>
            </div>
          </Modal>
        )}

        {/* Delete success toast — fixed, auto-dismissing, doesn't shift
            any page layout. */}
        {deleteToast && (
          <div
            role="status"
            aria-live="polite"
            className="toast-fade-in fixed inset-x-4 bottom-6 z-50 mx-auto max-w-sm rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-600 dark:text-emerald-400 shadow-xl shadow-black/10 dark:shadow-black/30 backdrop-blur sm:inset-x-auto sm:right-6"
          >
            {deleteToast}
          </div>
        )}
      </div>
    </Layout>
  );
}

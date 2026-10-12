import { useLocation, useNavigate } from "react-router-dom";

/**
 * Floating "Quick Log Workout" button (Phase 15 / Feature 1).
 *
 * Mounted once in Layout.jsx (same pattern as CommandPalette/
 * OfflineSyncManager — one always-present component rather than each
 * page rendering its own copy), so it shows up consistently without any
 * individual page needing to remember to add it.
 *
 * Visible on Dashboard, Progress, and Workout History; hidden on Log
 * Workout itself (no point floating a shortcut to the page you're
 * already on) and on every unauthenticated/onboarding page, since
 * Layout.jsx — and therefore this component — only ever mounts on
 * protected pages in the first place.
 */

const VISIBLE_PATHS = new Set(["/dashboard", "/progress", "/workouts"]);

export default function FloatingActionButton() {
  const location = useLocation();
  const navigate = useNavigate();

  if (!VISIBLE_PATHS.has(location.pathname)) return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/log-workout")}
      aria-label="Log a workout"
      className="fab-pop-in group fixed bottom-20 right-4 z-40 flex h-14 items-center gap-2 overflow-hidden rounded-full bg-blue-600 pl-4 pr-4 text-white shadow-xl shadow-blue-900/30 transition-all duration-300 ease-out hover:pr-5 hover:shadow-2xl hover:shadow-blue-900/40 active:scale-95 sm:bottom-6 md:bottom-6"
    >
      <span aria-hidden="true" className="flex-shrink-0 text-2xl leading-none">
        +
      </span>
      {/* Collapsed to 0 width by default, expands open on hover — a
          width/opacity transition (not just opacity) so the button
          genuinely widens into a pill rather than overlaying hidden
          text on top of the circle. `max-w-0` -> `max-w-xs` is the
          trick that lets `overflow-hidden` animate a "width: auto"-like
          value smoothly, which a plain `width` transition can't do
          without a hardcoded pixel target. */}
      <span
        aria-hidden="true"
        className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 ease-out group-hover:max-w-xs group-focus-visible:max-w-xs"
      >
        Log Workout
      </span>
    </button>
  );
}

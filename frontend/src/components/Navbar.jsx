import { useLayoutEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

// Phase 9 / Feature 1: "Workouts" split into two separate links now that
// the page itself was split into LogWorkout.jsx (/log-workout) and
// Workouts.jsx (/workouts).
const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/log-workout", label: "Log Workout" },
  { to: "/workouts", label: "View Workouts" },
  { to: "/progress", label: "Progress" },
  { to: "/profile", label: "Profile" },
];

// "John Doe" -> "JD". Falls back to a single "?" if there's nothing
// usable to build initials from (shouldn't happen behind ProtectedRoute,
// but avoids ever rendering an empty avatar circle).
function getInitials(fullName) {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

const LINK_BASE =
  "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150";
const LINK_INACTIVE =
  "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white";
const LINK_ACTIVE = "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white";

// Theme toggle button (Phase 9 / Feature 4) — sits beside the avatar/
// logout, per the mockup: "[Avatar] 🌙 Logout" (dark active) <->
// "[Avatar] ☀ Logout" (light active). Shared between the desktop and
// mobile layouts below so the icon/label/behavior can't drift between
// the two.
function ThemeToggleButton({ className = "" }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white ${className}`}
    >
      <span aria-hidden="true" className="text-base">
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Phase 17.1 bug-fix pass — publish this header's real rendered height
  // as `--navbar-height` on the document root, measured from the actual
  // DOM box (via ResizeObserver) rather than assumed from its Tailwind
  // classes. This header has no explicit height of its own: `h-16` (4rem)
  // lives on the inner <nav>, and the <header> itself is sized by that
  // content plus its own `border-b` (Tailwind's default 1px) — so its
  // true rendered height is 65px, not a flat 64px, and would silently
  // drift further out of sync with any future border/padding tweak.
  // Full-viewport `fixed inset-0` overlays that live inside <main>
  // (ShareProgressModal.jsx in particular) read this variable so they
  // can size/center themselves against the space actually left over
  // below this header, instead of guessing a pixel figure. ResizeObserver
  // (not a one-time measurement) keeps it correct across font-loading
  // reflows and any future content change here, with zero added
  // dependency — it's a standard browser API.
  const headerRef = useRef(null);
  useLayoutEffect(() => {
    const node = headerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;

    const setNavbarHeightVar = () => {
      document.documentElement.style.setProperty(
        "--navbar-height",
        `${node.getBoundingClientRect().height}px`
      );
    };

    setNavbarHeightVar();
    const observer = new ResizeObserver(setNavbarHeightVar);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function handleLogout() {
    logout();
    // Phase 11 / Feature 4: logout now returns to the public Landing
    // page instead of the Login form — ProtectedRoute/PublicRoute
    // themselves are untouched, so authenticated-route protection still
    // works exactly as before; this only changes where the explicit
    // "Logout" action sends the user afterward.
    navigate("/", { replace: true });
  }

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur"
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <NavLink
            to="/dashboard"
            className="text-lg font-bold tracking-tight text-gray-900 dark:text-white"
          >
            Fit<span className="text-blue-500">Track</span>
          </NavLink>

          {/* Desktop links */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `${LINK_BASE} ${isActive ? LINK_ACTIVE : LINK_INACTIVE}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Desktop right side: theme toggle, avatar, name, logout */}
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggleButton />
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
              {getInitials(user?.full_name)}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {user?.full_name}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors duration-150 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
          >
            Logout
          </button>
        </div>

        {/* Mobile (Phase 13 / Feature 9): primary navigation moved to
            the new bottom tab bar (components/MobileBottomNav.jsx), so
            the hamburger + duplicate link list it used to show here is
            gone — this row now just keeps the same three account
            controls (theme toggle, avatar, logout) visible directly,
            with no dropdown needed since there's nothing left to
            collapse. "Keep Logout and Avatar exactly as they work now"
            (an earlier phase's rule) still holds — same handleLogout,
            same getInitials avatar, just no longer hidden behind a
            hamburger tap. */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggleButton />
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
            {getInitials(user?.full_name)}
          </span>
          <button
            onClick={handleLogout}
            aria-label="Logout"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <span aria-hidden="true" className="text-base">🚪</span>
          </button>
        </div>
      </nav>
    </header>
  );
}

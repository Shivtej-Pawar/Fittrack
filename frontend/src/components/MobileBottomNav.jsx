import { NavLink } from "react-router-dom";

/**
 * Bottom tab navigation (Phase 13 / Feature 9) — small screens only
 * (`md:hidden`). Deliberately additive rather than a replacement inside
 * Navbar.jsx itself: Navbar.jsx already handles theme toggle, avatar,
 * and logout on mobile via its hamburger menu, and the spec's "keep the
 * desktop navbar unchanged" plus this project's running "don't touch
 * working files without reason" preference both argue for leaving that
 * file alone entirely. This component covers primary navigation only
 * (the 5 tabs below); account actions stay exactly where they already
 * were, in Navbar's mobile menu.
 */

const TABS = [
  { to: "/dashboard", label: "Dashboard", icon: "🏠" },
  { to: "/log-workout", label: "Log", icon: "➕" },
  { to: "/workouts", label: "History", icon: "📜" },
  { to: "/progress", label: "Progress", icon: "📈" },
  { to: "/profile", label: "Profile", icon: "👤" },
];

export default function MobileBottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur md:hidden"
    >
      <div className="flex items-stretch justify-around">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors duration-150 active:scale-95 ${
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400"
              }`
            }
          >
            <span aria-hidden="true" className="text-lg">
              {tab.icon}
            </span>
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

import { createContext, useContext, useEffect, useState } from "react";

/**
 * Dark/Light theme toggle (Phase 9 / Feature 4).
 *
 * Uses Tailwind's `class`-based dark mode (see tailwind.config.js's
 * `darkMode: "class"`): every themed className in the app is written as
 * a light-mode default plus a `dark:` variant (e.g.
 * `bg-white dark:bg-gray-950`), and this context's only job is adding or
 * removing a `dark` class on `<html>` so those `dark:` variants
 * activate. FitTrack was originally built dark-only, so `dark` is also
 * the fallback whenever there's no stored preference yet — an unmodified
 * app looks exactly like it did before this phase.
 *
 * Persistence is a plain `localStorage` read/write (not sessionStorage —
 * a theme choice should survive closing the tab, unlike the JWT in
 * api/axios.js), matching this feature's explicit
 * `localStorage.setItem("fittrack_theme", ...)` requirement.
 */

const THEME_KEY = "fittrack_theme";
const ThemeContext = createContext(undefined);

function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  // Keep <html class="dark"> (or not) in sync with `theme` — this is
  // literally the only thing that makes every `dark:` utility class in
  // the app turn on/off. Also persists the choice so it survives a
  // reload/new tab.
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  const value = { theme, toggleTheme, isDark: theme === "dark" };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

/**
 * Command Palette (Phase 11 / Feature 4) — Ctrl+K / Cmd+K.
 *
 * Mounted once in components/Layout.jsx, so it's available on every
 * authenticated page (Dashboard, Workouts, LogWorkout, Profile,
 * Progress) without each page needing to render it itself. Uses the
 * exact same `logout()` + `navigate("/")` sequence Navbar.jsx's own
 * handleLogout uses (Phase 11 / Feature 4: both now return to the public
 * Landing page, not Login), and the same `toggleTheme()` from
 * ThemeContext — no new auth/theme logic, just existing actions exposed
 * through a second entry point.
 */

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const commands = useMemo(
    () => [
      { id: "dashboard", label: "Dashboard", icon: "🏠", action: () => navigate("/dashboard") },
      { id: "log-workout", label: "Log Workout", icon: "➕", action: () => navigate("/log-workout") },
      { id: "workouts", label: "Workout History", icon: "📜", action: () => navigate("/workouts") },
      { id: "progress", label: "Progress", icon: "📈", action: () => navigate("/progress") },
      { id: "profile", label: "Profile", icon: "👤", action: () => navigate("/profile") },
      {
        id: "theme",
        label: isDark ? "Switch to Light Theme" : "Switch to Dark Theme",
        icon: isDark ? "☀️" : "🌙",
        action: toggleTheme,
      },
      {
        id: "logout",
        label: "Logout",
        icon: "🚪",
        action: () => {
          logout();
          // Phase 11 / Feature 4: matches Navbar.jsx's handleLogout —
          // logout now returns to the public Landing page ("/"), not
          // the Login form.
          navigate("/", { replace: true });
        },
      },
    ],
    [navigate, isDark, toggleTheme, logout]
  );

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((command) => command.label.toLowerCase().includes(q));
  }, [commands, query]);

  function close() {
    setIsOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  function runCommand(command) {
    if (!command) return;
    close();
    command.action();
  }

  // Global Ctrl+K / Cmd+K listener — the palette's only trigger besides
  // itself; no button is added elsewhere, per the spec's own framing
  // ("Pressing Ctrl + K opens...").
  useEffect(() => {
    function handleKeyDown(event) {
      const isToggleShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      if (isToggleShortcut) {
        event.preventDefault();
        setIsOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus the search input the moment the palette opens.
  useEffect(() => {
    if (isOpen) {
      const frame = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [isOpen]);

  // Keep the highlighted row in range whenever the filtered list shrinks
  // (e.g. typing narrows results down past the previously active index).
  useEffect(() => {
    setActiveIndex((current) =>
      Math.min(current, Math.max(filteredCommands.length - 1, 0))
    );
  }, [filteredCommands.length]);

  function handleInputKeyDown(event) {
    if (event.key === "Escape") {
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      runCommand(filteredCommands[activeIndex]);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[15vh] backdrop-blur-sm"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        className="command-palette-in w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl shadow-black/30"
      >
        <div className="flex items-center gap-2.5 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <span aria-hidden="true" className="text-gray-400">
            🔎
          </span>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={
              filteredCommands[activeIndex]
                ? `command-${filteredCommands[activeIndex].id}`
                : undefined
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command or search…"
            className="w-full bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
          />
          <kbd className="hidden flex-shrink-0 rounded border border-gray-300 dark:border-gray-700 px-1.5 py-0.5 text-[10px] text-gray-500 sm:block">
            Esc
          </kbd>
        </div>

        <ul id="command-palette-list" role="listbox" className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-gray-500">
              No matching commands.
            </li>
          )}
          {filteredCommands.map((command, i) => (
            <li
              key={command.id}
              id={`command-${command.id}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => runCommand(command)}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-100 ${
                i === activeIndex
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              <span aria-hidden="true" className="text-base">
                {command.icon}
              </span>
              {command.label}
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-4 border-t border-gray-200 dark:border-gray-800 px-4 py-2 text-[11px] text-gray-500 sm:flex">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>

      <style>{`
        @keyframes command-palette-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .command-palette-in { animation: command-palette-in 0.15s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .command-palette-in { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

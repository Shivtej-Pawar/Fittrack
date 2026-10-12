import { createContext, useCallback, useContext, useState } from "react";

/**
 * App-wide toast notifications (Phase 13). Previously each page that
 * wanted a toast (e.g. Workouts.jsx's delete confirmation) rolled its
 * own local `useState` + `setTimeout` + the shared `.toast-fade-in` CSS
 * class from styles/index.css. This context centralizes that pattern so
 * new features (offline sync, Feature 6; PR celebrations, Feature 8)
 * don't each reinvent it — Workouts.jsx's existing local toast is left
 * as-is (not a broken/duplicate thing to fix, just pre-dates this
 * context and still works fine on its own).
 */

const ToastContext = createContext(undefined);
const DEFAULT_DURATION_MS = 3500;

const TONE_CLASSES = {
  success:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  error: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, tone = "info", duration = DEFAULT_DURATION_MS) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-6 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-fade-in pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-3 text-center text-sm font-medium shadow-xl shadow-black/10 dark:shadow-black/30 backdrop-blur sm:text-left ${
              TONE_CLASSES[toast.tone] ?? TONE_CLASSES.info
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

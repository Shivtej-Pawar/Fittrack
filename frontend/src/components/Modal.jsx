import { useEffect } from "react";

/**
 * Small shared dialog shell (Phase 8, extracted into its own file in
 * Phase 9 when Workouts.jsx was split into LogWorkout.jsx + Workouts.jsx —
 * both the Edit and Delete-confirmation modals live on Workouts.jsx and
 * share this one implementation). Dark/light theme-aware, fade-in
 * backdrop + scale-in panel (Tailwind/CSS-only, respects
 * prefers-reduced-motion via the keyframes in styles/index.css), closes
 * on backdrop click or Escape. Full-width-feeling on mobile via the
 * backdrop's own padding rather than a hard breakpoint, so it stays
 * comfortably readable at any screen size.
 */
export default function Modal({
  title,
  description,
  onClose,
  children,
  maxWidthClass = "max-w-lg",
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className={`modal-panel max-h-[90vh] w-full ${maxWidthClass} overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl shadow-black/10 dark:shadow-black/40 sm:p-8`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
        )}
        {description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
        )}
        <div className={title ? "mt-6" : ""}>{children}</div>
      </div>
    </div>
  );
}

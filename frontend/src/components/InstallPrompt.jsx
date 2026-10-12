import { useEffect, useState } from "react";

/**
 * PWA install prompt (Phase 13 / Feature 5).
 *
 * Browsers that support installable PWAs fire `beforeinstallprompt`
 * once the app qualifies (served over HTTPS, has a valid manifest +
 * service worker — both configured in vite.config.js). The event is
 * captured and its default browser-controlled mini-infobar is
 * suppressed (`event.preventDefault()`) so this app can show its own
 * on-brand banner instead, matching the rest of the UI.
 *
 * Not every browser fires this event (notably Safari/iOS, which uses
 * its own "Add to Home Screen" flow with no JS hook at all) — this
 * component simply never renders anything there, which is the correct,
 * honest behavior rather than showing a button that wouldn't work.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
      // Don't nag someone who already dismissed it this session.
      if (!sessionStorage.getItem("fittrack_install_dismissed")) {
        setIsVisible(true);
      }
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsVisible(false);
  }

  function handleDismiss() {
    setIsVisible(false);
    sessionStorage.setItem("fittrack_install_dismissed", "true");
  }

  if (!isVisible) return null;

  return (
    <div className="toast-fade-in fixed inset-x-4 bottom-20 z-40 mx-auto flex max-w-sm items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 shadow-xl shadow-black/10 dark:shadow-black/30 backdrop-blur sm:inset-x-auto sm:bottom-6 sm:right-6">
      <span aria-hidden="true" className="text-2xl">📲</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          Install FitTrack
        </p>
        <p className="text-xs text-gray-500">Add it to your home screen for quick access.</p>
      </div>
      <button
        type="button"
        onClick={handleInstall}
        className="flex-shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-150 hover:bg-blue-500 active:scale-95"
      >
        Install
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="flex-shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
      >
        ✕
      </button>
    </div>
  );
}

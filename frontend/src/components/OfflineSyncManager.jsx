import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { createWorkout } from "../services/workoutService";
import { syncQueuedWorkouts, getQueuedCount } from "../utils/offlineQueue";

/**
 * Offline sync (Phase 13 / Feature 6) — renders nothing; its only job is
 * draining utils/offlineQueue.js's IndexedDB queue whenever the browser
 * regains connectivity (or on mount, in case the user closed the tab
 * while offline and reopened it after reconnecting). Mounted once in
 * Layout.jsx, so it's active on every authenticated page.
 *
 * Security/isolation fix (post-launch audit): this now reads the
 * currently authenticated user from AuthContext and only ever syncs
 * *that* user's queued items (see offlineQueue.js's header comment for
 * the full explanation of the bug this closes — briefly, without this,
 * reconnecting after a different account had logged in could silently
 * sync someone else's queued workout under the current session). If for
 * any reason `user` isn't loaded yet (e.g. this effect fires before
 * AuthContext's own initial fetch resolves), sync is skipped for that
 * run rather than guessing — the `online` event listener and the next
 * mount both give it another chance.
 */
export default function OfflineSyncManager() {
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    async function attemptSync() {
      // No authenticated user yet (still loading, or briefly logged
      // out) — there's nothing safe to sync under, so don't guess.
      if (!user?.id) return;

      const pendingCount = await getQueuedCount(user.id).catch(() => 0);
      if (pendingCount === 0) return;

      const syncedCount = await syncQueuedWorkouts(createWorkout, user.id).catch(
        () => 0
      );
      if (syncedCount > 0) {
        showToast(
          `${syncedCount} workout${syncedCount === 1 ? "" : "s"} synced successfully.`,
          "success"
        );
      }
    }

    attemptSync();
    window.addEventListener("online", attemptSync);
    return () => window.removeEventListener("online", attemptSync);
  }, [user, showToast]);

  return null;
}

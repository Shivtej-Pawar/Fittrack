/**
 * Offline workout queue (Phase 13 / Feature 6) — lets a workout save
 * even with no connection, using IndexedDB (native browser API, no
 * added dependency) as the queue's storage. LogWorkout.jsx's submit
 * handler pushes here when `createWorkout()` fails due to a network
 * error; components/OfflineSyncManager.jsx drains the queue again once
 * connectivity returns.
 *
 * Deliberately simple: one object store, sequential sync (stop at the
 * first failure rather than trying to reorder/retry cleverly), no
 * conflict resolution beyond "each queued item becomes its own
 * POST /workouts call once online" — this is the practical scope for
 * "queue offline workouts, sync when connection returns," not a general
 * offline-first sync engine.
 *
 * --- Security/isolation fix (post-launch audit) --------------------------
 * Every queued item now stores the id of the user who queued it
 * (`userId`, passed in by the caller — see LogWorkout.jsx and
 * OfflineSyncManager.jsx). Before this fix, a queued item was just
 * `{ payload, queuedAt }` with no owner at all, which meant:
 *
 *   User A goes offline, logs a workout (queued in IndexedDB), then
 *   logs out without reconnecting. User B logs into the *same browser*.
 *   When connectivity returns, the old syncQueuedWorkouts() would drain
 *   EVERY queued item and POST it using whichever JWT happens to be
 *   attached right now (User B's) — silently attributing User A's
 *   workout to User B's account.
 *
 * The fix: every read/write here now takes a `userId` and only ever
 * touches that user's own queued items, so switching accounts on the
 * same device can never mix up whose workout is whose. A *different*
 * user's queued items are simply left alone in the store — not synced
 * under the wrong account, not deleted, not lost — until that user logs
 * back in and reconnects.
 *
 * IMPORTANT — this is a client-side correctness/UX measure, not the
 * actual security boundary. Even if `userId` here were somehow wrong or
 * spoofed, the backend (app/routers/workouts.py) never trusts a
 * client-supplied user id for anything — `POST /workouts` always
 * derives ownership from `current_user.id`, taken from the validated
 * JWT attached to the request by the Axios interceptor. So the *real*
 * guarantee ("a workout can only ever be created under the account
 * whose token is making the request") already existed on the backend;
 * this fix is about making sure the *right* queued item gets synced
 * under the *right* session client-side, and that one account's pending
 * offline data is never silently discarded or misattributed just
 * because another account used the same browser.
 */

const DB_NAME = "fittrack_offline";
const DB_VERSION = 1;
const STORE_NAME = "queued_workouts";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Adds a workout payload (the same shape createWorkout() already sends)
// to the offline queue, tagged with `userId` — the id of whoever is
// authenticated right now (from AuthContext's `user.id`). This is what
// lets syncQueuedWorkouts() later sync only this user's own items, even
// if a different account uses the same browser before this one
// reconnects.
export async function queueWorkout(payload, userId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add({ payload, queuedAt: Date.now(), userId });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Returns every queued item belonging to `userId` — never another
// user's. Reads the whole store (IndexedDB queues here are expected to
// stay small — a handful of offline workouts at most) and filters in
// memory rather than a compound index, which keeps this file simple and
// easy to audit at the cost of a small amount of wasted work on a store
// that's realistically never going to be large.
export async function getQueuedWorkouts(userId) {
  const db = await openDB();
  const all = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return all.filter((item) => item.userId === userId);
}

export async function getQueuedCount(userId) {
  const items = await getQueuedWorkouts(userId);
  return items.length;
}

async function removeQueuedWorkout(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Attempts to send every queued workout *belonging to `userId`* via
// `createWorkoutFn` (the real createWorkout() from
// services/workoutService.js — passed in rather than imported directly,
// so this file has no dependency on Axios/auth setup and stays easy to
// reason about in isolation). Oldest first. Stops at the first failure
// (still offline, expired JWT, or a genuine server rejection) rather
// than skipping ahead, so a queue never gets processed out of order —
// and a failed item (plus everything queued after it) simply stays in
// IndexedDB to retry next time, rather than being dropped. Items
// belonging to *other* users are never touched by this call at all.
// Returns how many were successfully synced.
export async function syncQueuedWorkouts(createWorkoutFn, userId) {
  const items = await getQueuedWorkouts(userId);
  items.sort((a, b) => a.queuedAt - b.queuedAt);

  let syncedCount = 0;
  for (const item of items) {
    try {
      await createWorkoutFn(item.payload);
      await removeQueuedWorkout(item.id);
      syncedCount += 1;
    } catch {
      break;
    }
  }
  return syncedCount;
}

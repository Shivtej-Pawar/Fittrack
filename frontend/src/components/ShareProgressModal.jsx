import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { computeRecords } from "./PersonalRecords";
import { triggerBlobDownload } from "../utils/exportWorkouts";
import { useToast } from "../context/ToastContext";
import useScrollLock from "../hooks/useScrollLock";

/**
 * Universal Share Progress experience (Phase 15 / Feature 6).
 *
 * Replaces the old download-only ShareProgressCard.jsx (Phase 13 /
 * Feature 4) — same html2canvas approach for turning the on-screen
 * preview into a PNG (per this phase's explicit "reuse the existing
 * html2canvas implementation"), but now behind a proper Share modal with
 * four real actions instead of a single Download button: native
 * OS-level sharing where the browser supports it, a PNG download,
 * copying the image directly to the clipboard, and copying a
 * ready-to-post caption. All four operate on the same theme-aware DOM
 * preview below, captured fresh each time a button is pressed (simpler
 * and less bug-prone than caching one canvas across a theme toggle would
 * be, at the cost of a redundant capture if someone clicks two buttons
 * in a row — an acceptable trade for a modal a person opens
 * occasionally, not a hot path).
 *
 * The preview is rendered at a fixed 360×450 CSS-pixel box
 * (4:5 — Instagram's portrait ratio) and captured with `scale: 3`, so
 * the exported PNG is exactly 1080×1350 regardless of the viewer's
 * actual screen size or zoom level.
 *
 * --- Phase 16 bug fix: always a centered modal --------------------------
 * Previously this used `items-end ... sm:items-center` on the backdrop
 * and `rounded-t-3xl ... sm:rounded-2xl` on the panel — a deliberate
 * "bottom sheet on mobile, centered dialog on desktop" design carried
 * over from WorkoutDrawer's responsive pattern (see that component's own
 * `.drawer-panel` class). For this component specifically that read as
 * inconsistent/unintentional positioning rather than a considered
 * bottom-sheet treatment, so it's now unconditionally
 * `items-center justify-center` with plain `rounded-2xl` at every
 * breakpoint — mobile, tablet, and desktop all get the same true
 * centered modal. Width still adapts responsively (`w-full max-w-sm`
 * inside the backdrop's `p-4` padding gives exactly
 * `calc(100vw - 32px)` on narrow screens, capped at a reasonable 24rem
 * on wider ones), and height is capped at `calc(100vh - 32px)` with
 * internal `overflow-y-auto` so a tall viewport never has to scroll the
 * page itself to reach content below the fold — only WorkoutDrawer keeps
 * the desktop-slide/mobile-bottom-sheet treatment now, which is a
 * deliberately different, unaffected component.
 *
 * --- Phase 17.1 bug fix: respect the fixed Navbar's height --------------
 * This modal lives inside <main> (see Layout.jsx), but as a
 * `position: fixed` element its `inset-0`/centering is resolved against
 * the real viewport, not against <main> — that part is correct, and is
 * exactly what the Phase 17 `.page-fade-in` fix protects. The bug here
 * was different: the backdrop centered itself against the *full* 100vh,
 * including the strip the sticky Navbar sits on top of. On a viewport
 * short enough relative to the card+buttons' natural height, that let
 * the panel's top edge land underneath the Navbar instead of staying
 * inside the space actually left over below it.
 *
 * Fix: the backdrop's top is pinned to `var(--navbar-height)` (see
 * Navbar.jsx, which measures its own real rendered height via
 * ResizeObserver and publishes it as this CSS variable — not a guessed
 * pixel figure, since the header has no explicit height of its own)
 * instead of the viewport's true 0, so it only ever occupies — and
 * centers the panel within — the space below the Navbar. The panel's
 * own `max-h` is reduced by that same amount so it can never claim more
 * height than that reduced area actually has, falling back to its
 * existing internal `overflow-y-auto` instead. No z-index change, and
 * no hardcoded `top` offset on the panel itself — the Navbar was never
 * behind the modal; the modal's available box was simply taller than
 * the space actually visible below the Navbar.
 */

const CARD_WIDTH_PX = 360;
const CARD_HEIGHT_PX = 450; // 360 * (1350/1080) — keeps the exact 4:5 ratio
const CAPTURE_SCALE = 3; // 360*3 = 1080, 450*3 = 1350

// Minimal, non-interactive preview of the last ~10 weeks of activity for
// the share card — deliberately not a reuse of the full interactive
// WorkoutHeatmap.jsx (that component's month labels/hover-tooltip
// machinery exist for the Dashboard's full 365-day grid; this just needs
// a small static texture of squares, so a lighter, purpose-built version
// avoids paying for features an exported image can't use anyway).
function MiniHeatmapPreview({ workouts }) {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const WEEKS = 10;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const countByDay = new Map();
  for (const workout of workouts) {
    const d = new Date(workout.created_at);
    d.setHours(0, 0, 0, 0);
    const key = d.getTime();
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }

  const days = [];
  for (let i = WEEKS * 7 - 1; i >= 0; i -= 1) {
    const dayTime = today.getTime() - i * DAY_MS;
    days.push(countByDay.get(dayTime) ?? 0);
  }
  // Group into 7-day columns, oldest first — same visual grain as the
  // real heatmap (columns = weeks, rows = weekdays), just condensed.
  const columns = [];
  for (let i = 0; i < days.length; i += 7) {
    columns.push(days.slice(i, i + 7));
  }

  function levelClass(count) {
    if (count <= 0) return "bg-white/10";
    if (count === 1) return "bg-white/40";
    if (count === 2) return "bg-white/70";
    return "bg-white";
  }

  return (
    <div className="flex gap-[3px]">
      {columns.map((column, colIndex) => (
        <div key={colIndex} className="flex flex-col gap-[3px]">
          {column.map((count, dayIndex) => (
            <span
              key={dayIndex}
              className={`block h-[6px] w-[6px] rounded-[1.5px] ${levelClass(count)}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function buildCaption({ streak, totalWorkouts, weeklyGoalCompleted, weeklyGoalTarget }) {
  const goalDone = weeklyGoalCompleted >= weeklyGoalTarget;
  return (
    `💪 Just hit a ${streak}-day streak on FitTrack! ${totalWorkouts} workouts ` +
    `completed • Weekly goal: ${weeklyGoalCompleted}/${weeklyGoalTarget}` +
    `${goalDone ? " ✅" : ""} Built with FitTrack.`
  );
}

export default function ShareProgressModal({
  open,
  onClose,
  workouts,
  streak,
  totalWorkouts,
  weeklyGoalCompleted,
  weeklyGoalTarget,
  userName,
}) {
  const previewRef = useRef(null);
  const { showToast } = useToast();
  const [pendingAction, setPendingAction] = useState(null); // 'share' | 'download' | 'copyImage' | null

  // Scroll lock (Phase 16 / Feature 2) — this modal previously had NO
  // scroll lock at all, meaning the background page could still be
  // scrolled (especially via touch drag) while it was open — on a long
  // Dashboard page, that could visibly carry the modal along with it or
  // make it feel like it "wasn't really there yet" until the page
  // settled. `useScrollLock` takes `open` directly (not a hardcoded
  // `true`) since — unlike WorkoutDrawer, which is only ever mounted
  // while open — this component is always mounted and toggles via the
  // `open` prop, so the hook itself must react to that instead of the
  // component's mount/unmount.
  useScrollLock(open);

  if (!open) return null;

  const strongestPR = computeRecords(workouts ?? []).heaviestLift;
  const caption = buildCaption({
    streak,
    totalWorkouts,
    weeklyGoalCompleted,
    weeklyGoalTarget,
  });
  const filename = `fittrack-progress-${new Date().toISOString().slice(0, 10)}.png`;

  async function captureBlob() {
    const canvas = await html2canvas(previewRef.current, {
      backgroundColor: null,
      scale: CAPTURE_SCALE,
    });
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }

  async function handleDownload() {
    setPendingAction("download");
    try {
      const blob = await captureBlob();
      if (blob) triggerBlobDownload(blob, filename);
    } catch {
      showToast("Could not generate the image. Please try again.", "error");
    } finally {
      setPendingAction(null);
    }
  }

  // Web Share API (Feature 6.3) — shares the actual PNG file where the
  // browser/OS supports it (Android/Windows/macOS share sheets,
  // WhatsApp/Telegram/Discord/Messages/AirDrop/Nearby Share all hook
  // into this same OS-level mechanism, not anything FitTrack talks to
  // directly). `navigator.canShare({ files })` is the correct feature
  // check for *file* sharing specifically — `navigator.share` alone
  // exists on more browsers than actually support attaching a file to
  // the share sheet. Per spec: if unsupported, fail silently — no error
  // shown to the user, since "this device doesn't support native
  // sharing" isn't something they did wrong.
  async function handleNativeShare() {
    setPendingAction("share");
    try {
      const blob = await captureBlob();
      if (!blob) return;
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "FitTrack Progress", text: caption });
      }
      // Unsupported: silently do nothing further — the button itself is
      // only rendered when `navigator.share` exists at all (see below),
      // and canShare({files}) failing here just means this particular
      // device/browser can't share *files*, which we treat the same as
      // "not supported" rather than surfacing an error.
    } catch (err) {
      // AbortError = the user closed the native share sheet without
      // picking anything — that's a normal cancellation, not a failure,
      // so it's deliberately not shown as an error toast.
      if (err?.name !== "AbortError") {
        showToast("Could not open the share sheet. Please try again.", "error");
      }
    } finally {
      setPendingAction(null);
    }
  }

  // Clipboard API (Feature 6.5) — copies the PNG itself, not a link or
  // text, so it can be pasted directly into e.g. an iMessage/Slack
  // compose box. Requires a secure context (https, or localhost in dev)
  // and ClipboardItem support — wrapped in try/catch since older
  // browsers (notably Firefox until fairly recently) don't implement
  // this at all.
  async function handleCopyImage() {
    setPendingAction("copyImage");
    try {
      const blob = await captureBlob();
      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      showToast("Progress card copied.", "success");
    } catch {
      showToast(
        "Could not copy the image on this browser. Try Download instead.",
        "error"
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCopyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      showToast("Caption copied to clipboard.", "success");
    } catch {
      showToast("Could not copy the caption. Please try again.", "error");
    }
  }

  return (
    <div
      className="modal-backdrop fixed inset-x-0 bottom-0 top-[var(--navbar-height)] z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="modal-panel flex max-h-[calc(100vh-var(--navbar-height)-32px)] w-full max-w-sm flex-col overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl shadow-black/10 dark:shadow-black/40 sm:p-8"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Share your progress"
      >
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Share your progress
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Share it directly, download it, or copy it for your next post.
        </p>

        {/* Premium share card preview (Feature 6.1) — captured
            byte-for-byte via html2canvas, so this IS the exported image,
            not an approximation of it. Fixed pixel size (see constants
            above) so the export is always exactly 1080×1350 regardless
            of viewport. */}
        <div className="mt-5 flex justify-center overflow-hidden rounded-2xl">
          <div
            ref={previewRef}
            style={{ width: CARD_WIDTH_PX, height: CARD_HEIGHT_PX }}
            className="relative flex flex-col overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white"
          >
            {/* Soft accent glows — purely decorative, safe inside an
                html2canvas capture since they're plain CSS gradients. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-2xl"
            />

            <p className="text-sm font-bold tracking-tight">
              Fit<span className="text-blue-200">Track</span>
            </p>
            {userName && <p className="mt-0.5 text-xs text-white/60">{userName}</p>}

            <div className="mt-6 flex-1">
              <span aria-hidden="true" className="text-4xl">🔥</span>
              <p className="mt-1 text-3xl font-extrabold leading-tight">
                {streak}-Day Streak
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-white/10 p-2.5">
                  <p className="text-[10px] text-white/60">Total Workouts</p>
                  <p className="text-base font-bold">{totalWorkouts}</p>
                </div>
                <div className="rounded-xl bg-white/10 p-2.5">
                  <p className="text-[10px] text-white/60">Weekly Goal</p>
                  <p className="text-base font-bold">
                    {weeklyGoalCompleted}/{weeklyGoalTarget}
                  </p>
                </div>
                {strongestPR && (
                  <div className="col-span-2 rounded-xl bg-white/10 p-2.5">
                    <p className="text-[10px] text-white/60">Strongest PR</p>
                    <p className="text-base font-bold">
                      {strongestPR.exercise_name} — {strongestPR.weight} kg
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <p className="text-[10px] text-white/60">Consistency</p>
                <div className="mt-1.5">
                  <MiniHeatmapPreview workouts={workouts ?? []} />
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
              <p className="text-[10px] text-white/50">Built with FitTrack</p>
              <p className="text-[10px] text-white/50">
                {new Date().toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Actions (Feature 6.2) */}
        <div className="mt-5 space-y-2.5">
          {typeof navigator !== "undefined" && navigator.share && (
            <button
              type="button"
              onClick={handleNativeShare}
              disabled={pendingAction !== null}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 active:scale-95"
            >
              {pendingAction === "share" ? "Preparing…" : "Share"}
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleDownload}
              disabled={pendingAction !== null}
              className="rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors duration-150 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
            >
              {pendingAction === "download" ? "Preparing…" : "Download PNG"}
            </button>
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={pendingAction !== null}
              className="rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors duration-150 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
            >
              {pendingAction === "copyImage" ? "Copying…" : "Copy Image"}
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyCaption}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors duration-150 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95"
          >
            Copy Caption
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl py-2.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

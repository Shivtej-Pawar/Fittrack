import Navbar from "./Navbar";
import CommandPalette from "./CommandPalette";
import MobileBottomNav from "./MobileBottomNav";
import OfflineSyncManager from "./OfflineSyncManager";
import FloatingActionButton from "./FloatingActionButton";

/**
 * Shared shell for every protected page that should show the authenticated
 * nav (Dashboard, Workouts, Profile, Progress — per this phase's spec,
 * Onboarding deliberately does NOT use this, since it's meant to be a
 * focused one-time flow rather than part of the ongoing app navigation).
 *
 * Deliberately thin: owns the page background, the Navbar, (Phase 11)
 * the Command Palette, and (Phase 13) the mobile bottom nav — and
 * nothing else. Each page still manages its own padding/max-width/
 * sections inside `children` — Workouts.jsx in particular already has
 * its own layout (its own `min-h-screen` wrapper, spacing, etc.) that
 * this doesn't need to replace, just sit above.
 *
 * CommandPalette is mounted here (once) rather than in every page, so
 * Ctrl+K works app-wide without each page importing/rendering it itself.
 * It renders `null` until opened, so it has no visual footprint when idle.
 *
 * Phase 13 / Feature 3: `<main>` gets a one-time fade-in on mount — the
 * practical ceiling for "page transitions" without React Router's own
 * (still-experimental) view transition support or an added animation
 * library.
 *
 * --- Root-cause fix (Phase 17 bug-fix pass) --------------------------
 * `<main>` used to reuse the existing `workout-fade-in` keyframe (the
 * same one WorkoutCard.jsx uses for its per-card entrance). That was a
 * real, systemic bug: `workout-fade-in`'s `to` keyframe sets
 * `transform: translateY(0)`, and with `animation-fill-mode: both`, that
 * computed transform persists on `<main>` *forever* after the animation
 * finishes — and per the CSS Transforms spec, any element with a
 * transform value other than the literal keyword `none` becomes a new
 * containing block for its `position: fixed` descendants (yes, even a
 * settled, visually-inert `translateY(0)` counts).
 *
 * Every `fixed inset-0` overlay in the app — Modal.jsx (Edit Workout),
 * WorkoutDrawer.jsx (Workout Details), ShareProgressModal.jsx, and
 * WorkoutHeatmap.jsx's day popover — is rendered somewhere inside
 * `children`, i.e. inside this very `<main>`. With `<main>` silently
 * acting as their containing block instead of the real viewport,
 * `inset-0` sized and positioned those overlays against `<main>`'s own
 * box (as tall as the page's full content) instead of the visible
 * viewport. On any page taller than one screen, that meant: a
 * "centered" modal could render far below the currently-visible area
 * (only reachable by scrolling down the *page*, not by the modal's own
 * internal scroll — the reported "Share Progress opens blank" and "Edit
 * Workout requires scrolling" bugs), and a tall drawer's content could
 * overflow in ways where only its first couple of rendered rows ever
 * fell inside the visible viewport slice (the reported "Workout Details
 * partial/blank rendering" bug).
 *
 * The fix: `<main>` now uses `.page-fade-in` (styles/index.css) instead
 * — the identical fade *feel* (0.35s ease-out, same duration), but
 * opacity-only, with no `transform` at all, so it can never become an
 * unintended containing block for its fixed-positioned descendants.
 * `WorkoutCard.jsx`'s own `.workout-fade-in` usage is untouched — it's a
 * leaf list item that doesn't wrap any modal/drawer, so it was never
 * actually part of this bug.
 *
 * Phase 13 / Feature 9: the bottom tab bar only renders on small
 * screens (it's `md:hidden` internally) and adds bottom padding to
 * `<main>` at that breakpoint so page content never sits underneath it.
 *
 * Phase 15 / Feature 1: FloatingActionButton is mounted here too, same
 * "always present, decides its own visibility" pattern as the pieces
 * above — it renders `null` on any page other than Dashboard/Progress/
 * Workout History, and its own `bottom-20 sm:bottom-6` positioning
 * already accounts for MobileBottomNav sitting underneath it on small
 * screens.
 */
export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <CommandPalette />
      <OfflineSyncManager />
      <main className="page-fade-in pb-16 md:pb-0">{children}</main>
      <MobileBottomNav />
      <FloatingActionButton />
    </div>
  );
}

import { useEffect } from "react";

/**
 * Shared body-scroll lock (Phase 16 / Feature 4 — "Dashboard Scroll
 * Preservation").
 *
 * Before this phase, `WorkoutDrawer.jsx` locked scrolling with a plain
 * `document.body.style.overflow = "hidden"`, and `ShareProgressModal.jsx`
 * didn't lock scrolling at all. Both are real gaps this hook closes for
 * every caller at once:
 *
 * - A bare `overflow: hidden` on `<body>` is well known to still allow
 *   *touch* scrolling of the background content on iOS Safari — the
 *   overflow rule doesn't reliably stop a finger-drag gesture there, so
 *   the page underneath a modal could visibly shift while a drawer or
 *   modal was supposedly "locked" open.
 * - Neither approach preserved the scroll position on close beyond
 *   "whatever the browser happened to leave it at" — which is normally
 *   fine (no scrolling happened, so nothing to restore) *unless* the
 *   background did drift during the lock (the iOS case above), in which
 *   case there was nothing that put it back.
 *
 * The fix is the standard robust technique for this: capture the
 * current `scrollY`, pin `<body>` to `position: fixed` at `top:
 * -scrollY` (which visually freezes the page in place and genuinely
 * blocks all background scrolling, touch included, because a
 * position:fixed element has nothing to scroll), then on cleanup
 * restore `position`/`top` and scroll back to the exact saved position
 * in one jump (no animation — the user should never see or feel that a
 * scroll happened at all, since nothing about their intended reading
 * position should ever change just because they opened and closed a
 * modal).
 *
 * Usage: `useScrollLock(isOpen)` — locks while `isOpen` is true, always
 * cleans up correctly (including on unmount) via the effect's own
 * cleanup function.
 */
export default function useScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return undefined;

    const scrollY = window.scrollY;
    const body = document.body;

    const previousStyles = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = previousStyles.position;
      body.style.top = previousStyles.top;
      body.style.left = previousStyles.left;
      body.style.right = previousStyles.right;
      body.style.width = previousStyles.width;
      body.style.overflow = previousStyles.overflow;
      // Jump straight back — no smooth-scroll animation. The point of
      // this whole hook is that the user should never perceive any
      // scroll movement at all as a side effect of opening/closing a
      // modal, drawer, or popover.
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}

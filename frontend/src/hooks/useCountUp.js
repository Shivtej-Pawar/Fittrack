import { useEffect, useState } from "react";

/**
 * Ticks a displayed number up from 0 to `target` with an ease-out curve,
 * rather than snapping straight to it. Skips the animation entirely
 * (jumps straight to `target`) when the user has `prefers-reduced-motion`
 * set, per this project's running accessibility requirement.
 *
 * Extracted from pages/Dashboard.jsx (where it was originally a local,
 * non-exported function used only by StatCard) into its own hook in
 * Phase 16, specifically so components/WeeklyGoalCard.jsx's percentage
 * count-up (Feature 5 polish) could reuse the exact same animation
 * rather than a second, slightly-different implementation living in two
 * places.
 */
export default function useCountUp(target, durationMs = 500) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return undefined;
    }
    let frame;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

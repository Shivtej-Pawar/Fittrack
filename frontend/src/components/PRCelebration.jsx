import { useEffect, useRef } from "react";

/**
 * PR Celebration overlay (Phase 13 / Feature 8) — confetti burst +
 * animated badge, shown briefly when checkAndRecordPR() (utils/
 * prTracking.js) detects a new record. No confetti npm package added —
 * this is a small hand-rolled canvas burst (~40 particles, one physics
 * tick per frame, auto-cleans up), consistent with this project's
 * running preference for CSS/canvas-only effects over new dependencies.
 * Respects prefers-reduced-motion by skipping the confetti physics
 * entirely (the badge/toast still show, just without the particle burst).
 */

const PARTICLE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#ef4444"];
const PARTICLE_COUNT = 44;
const AUTO_CLOSE_MS = 3200;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

function runConfetti(canvas) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;

  const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
    x: width / 2,
    y: height / 2,
    vx: (Math.random() - 0.5) * 12,
    vy: Math.random() * -12 - 4,
    size: Math.random() * 6 + 4,
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    rotation: Math.random() * 360,
    spin: (Math.random() - 0.5) * 20,
  }));

  let frame;
  let ticks = 0;
  const maxTicks = 90;

  function tick() {
    ticks += 1;
    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      p.vy += 0.35; // gravity
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    if (ticks < maxTicks) {
      frame = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
  }

  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

export default function PRCelebration({ record, onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!record) return undefined;

    let stopConfetti;
    if (!prefersReducedMotion() && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stopConfetti = runConfetti(canvas);
    }

    const closeTimer = setTimeout(onClose, AUTO_CLOSE_MS);
    return () => {
      stopConfetti?.();
      clearTimeout(closeTimer);
    };
  }, [record, onClose]);

  if (!record) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center">
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />
      <div
        className="modal-panel pointer-events-auto mx-4 flex items-center gap-4 rounded-2xl border border-amber-400/30 bg-white dark:bg-gray-900 px-6 py-5 text-center shadow-2xl shadow-amber-500/10"
        role="status"
      >
        <span
          aria-hidden="true"
          className="motion-safe:animate-[bounce_1s_ease-in-out_2] text-4xl"
        >
          🏆
        </span>
        <div className="text-left">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-500">
            New Record
          </p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {record.exercise} — {record.weight.toLocaleString()} kg
          </p>
        </div>
      </div>
    </div>
  );
}

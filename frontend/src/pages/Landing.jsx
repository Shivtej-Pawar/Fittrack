import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

/**
 * Public landing page.
 *
 * Phase 10 / Feature 1 did the premium redesign (hero, animated stats,
 * feature cards, how-it-works, testimonials, final CTA). Until Phase 11
 * this page was deliberately hardcoded dark, since the theme toggle only
 * lived in the authenticated Navbar and there was no session here to
 * read a preference from. Phase 11 / Feature 6 changes that: every
 * neutral-scale class below now has a light-mode default plus a `dark:`
 * variant (same convention used across Dashboard/Profile/etc. since
 * Phase 9), and a theme toggle sits in the top nav — reusing the exact
 * same `useTheme()` context/`localStorage` persistence the authenticated
 * Navbar uses, not a second theme system.
 */

const STATS = [
  { value: 40, suffix: "+", label: "Exercises" },
  { value: null, label: "Unlimited Workouts" },
  { value: null, label: "Personal Records" },
  { value: null, label: "Progress Analytics" },
];

const FEATURES = [
  {
    icon: "📝",
    title: "Workout Logging",
    description: "Log sets, reps, and weight in seconds with a smart exercise picker.",
  },
  {
    icon: "📈",
    title: "Progress Charts",
    description: "Visualize volume, frequency, and category trends over time.",
  },
  {
    icon: "🔥",
    title: "Current Streak",
    description: "Stay accountable with a streak that tracks your consistency.",
  },
  {
    icon: "🎯",
    title: "Exercise Library",
    description: "40+ exercises across Strength, Cardio, Core, and Flexibility.",
  },
  {
    icon: "📄",
    title: "Export Reports",
    description: "Download your workout history as CSV or a clean PDF report.",
  },
  {
    icon: "☁️",
    title: "Secure Cloud Storage",
    description: "Your data is encrypted and synced — never stuck on one device.",
  },
];

const STEPS = [
  {
    number: 1,
    title: "Create Account",
    description: "Sign up in under a minute — no credit card, no fuss.",
  },
  {
    number: 2,
    title: "Log Workouts",
    description: "Pick an exercise, add your sets, and save. That's it.",
  },
  {
    number: 3,
    title: "Track Progress",
    description: "Watch your streak, PRs, and charts build up over time.",
  },
];

const TESTIMONIALS = [
  {
    name: "Maria Chen",
    role: "Marathon runner",
    quote: "FitTrack made staying consistent easier than ever.",
  },
  {
    name: "James Okafor",
    role: "Powerlifter",
    quote: "The PR tracking alone is worth it — I finally see the numbers climb.",
  },
  {
    name: "Priya Nair",
    role: "Yoga instructor",
    quote: "Clean, fast, and it doesn't get in the way of my actual workout.",
  },
];

const FOOTER_LINKS = [
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "Contact", href: "mailto:hello@fittrack.app" },
  { label: "GitHub", href: "https://github.com" },
];

// Same toggle used in the authenticated Navbar (same icons, same
// useTheme() hook, same localStorage persistence) — duplicated as a
// small local component rather than importing Navbar's, since Navbar
// doesn't export it and the two buttons only share ~10 lines; both call
// the identical context, so there's still only one theme system.
function ThemeToggleButton() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
    >
      <span aria-hidden="true" className="text-base">
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}

// Lightweight animated counter — no library. Counts from 0 to `value`
// over ~900ms once the number scrolls into view, using
// IntersectionObserver so it doesn't run off-screen on page load.
function AnimatedStat({ value, suffix = "", label }) {
  const [display, setDisplay] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (value === null) return undefined;
    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setHasStarted(true);
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [value]);

  useEffect(() => {
    if (!hasStarted || value === null) return undefined;
    const durationMs = 900;
    const start = performance.now();

    let frameId;
    function tick(now) {
      const progress = Math.min((now - start) / durationMs, 1);
      setDisplay(Math.round(progress * value));
      if (progress < 1) frameId = requestAnimationFrame(tick);
    }
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [hasStarted, value]);

  return (
    <div ref={ref} className="text-center">
      <p className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
        {value === null ? "∞" : display}
        {value !== null ? suffix : ""}
      </p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500 sm:text-sm">
        {label}
      </p>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="text-lg font-bold tracking-tight">
            Fit<span className="text-blue-500">Track</span>
          </span>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggleButton />
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white sm:px-4"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 sm:px-4"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        id="about"
        className="relative overflow-hidden px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24"
      >
        {/* Premium gradient background — layered radial glows, pure CSS.
            Translucent color washes read fine on both themes unchanged. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-10%] h-[40rem] w-[70rem] -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute right-[-10%] top-1/3 h-[26rem] w-[26rem] rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute left-[-10%] bottom-0 h-[24rem] w-[24rem] rounded-full bg-purple-600/10 blur-3xl" />
        </div>

        <div className="hero-fade-in mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Train Smarter.{" "}
            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Track Better.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-gray-600 dark:text-gray-400 sm:text-lg">
            Log every workout, maintain streaks, unlock personal records, and
            visualize your fitness journey—all in one modern fitness tracker.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="w-full rounded-xl bg-blue-600 px-8 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-blue-900/50 sm:w-auto"
            >
              Get Started
            </Link>
            <a
              href="#features"
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-8 py-3.5 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-900 sm:w-auto"
            >
              Explore Features
            </a>
          </div>
        </div>

        {/* Dashboard mockup + floating stat cards */}
        <div className="hero-fade-in-delayed relative mx-auto mt-16 max-w-4xl">
          <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl shadow-black/10 dark:shadow-black/40">
            <div className="flex items-center gap-1.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
            </div>
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 sm:p-6">
              {["Total Workouts", "This Week", "Current Streak", "Favorite"].map(
                (label) => (
                  <div
                    key={label}
                    className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4"
                  >
                    <div className="h-2.5 w-10 rounded bg-gray-200 dark:bg-gray-800" />
                    <div className="mt-3 h-5 w-14 rounded bg-gray-200 dark:bg-gray-800" />
                    <p className="mt-2 text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-600">
                      {label}
                    </p>
                  </div>
                )
              )}
            </div>
            <div className="px-5 pb-6 sm:px-6">
              <div className="h-28 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-t from-blue-500/10 to-transparent" />
            </div>
          </div>

          {/* Floating stat cards */}
          <div className="absolute -left-4 top-8 hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 shadow-xl shadow-black/10 dark:shadow-black/30 sm:block">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">🔥 12</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-500">
              Day Streak
            </p>
          </div>
          <div className="absolute -right-4 bottom-10 hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 shadow-xl shadow-black/10 dark:shadow-black/30 sm:block">
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">🏆 120 kg</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-500">
              New PR
            </p>
          </div>
        </div>

        {/* Animated statistics */}
        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
          {STATS.map((stat) => (
            <AnimatedStat key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      {/* Feature cards */}
      <section id="features" className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Everything you need to train smarter
            </h2>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 sm:text-base">
              Built for the way you actually work out.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-lg shadow-black/5 dark:shadow-black/10 transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/40"
              >
                {/* Glow effect on hover */}
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-500/0 blur-2xl transition-colors duration-300 group-hover:bg-blue-500/20" />
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-2xl transition-transform duration-200 group-hover:scale-110">
                  {feature.icon}
                </span>
                <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">How it works</h2>
          </div>

          <div className="relative mt-14 grid grid-cols-1 gap-10 sm:grid-cols-3">
            {/* Connecting line, desktop only */}
            <div
              aria-hidden="true"
              className="absolute left-0 right-0 top-6 hidden h-px bg-gray-200 dark:bg-gray-800 sm:block"
              style={{ marginLeft: "16.67%", marginRight: "16.67%" }}
            />
            {STEPS.map((step) => (
              <div key={step.number} className="relative text-center">
                <span className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-900/40">
                  {step.number}
                </span>
                <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Loved by people building better habits
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {TESTIMONIALS.map((testimonial) => (
              <div
                key={testimonial.name}
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-lg shadow-black/5 dark:shadow-black/10"
              >
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  "{testimonial.quote}"
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    {testimonial.name[0]}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-blue-500/10 dark:from-blue-600/20 via-gray-50 dark:via-gray-900 to-white dark:to-gray-900 p-10 text-center shadow-xl shadow-black/5 dark:shadow-black/20 sm:p-14">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Ready to build your next PR?
          </h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 sm:text-base">
            Create your free account and log your first workout today.
          </p>
          <Link
            to="/register"
            className="mt-7 inline-block rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-blue-900/50"
          >
            Start Your Fitness Journey
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            Fit<span className="text-blue-500">Track</span>
          </span>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={
                  link.href.startsWith("http")
                    ? "noopener noreferrer"
                    : undefined
                }
                className="text-sm text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <span className="text-xs text-gray-400 dark:text-gray-600">
            © {new Date().getFullYear()} FitTrack. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}

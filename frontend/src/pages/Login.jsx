import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hasSeenOnboarding } from "../utils/profileStorage";

/**
 * Login page.
 *
 * Phase 11 / Feature 5: visually redesigned to match Register.jsx's
 * card (same dark background/card/spacing/typography, same field and
 * button styling — literally the same class constants below). This page
 * previously used its own unrelated light theme (bg-gray-50/white card,
 * indigo accent) left over from before FitTrack's dark redesign, which
 * is the mismatch this phase asked to fix. Everything below the JSX is
 * untouched: the same react-hook-form fields/validation rules and the
 * same login()/hasSeenOnboarding() logic as before.
 */

const FIELD_CLASSES =
  "mt-1.5 block w-full rounded-xl border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors";
const LABEL_CLASSES = "block text-sm font-medium text-gray-300";
const ERROR_CLASSES = "mt-1.5 text-sm text-red-400";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ mode: "onBlur" });

  async function onSubmit(data) {
    setServerError("");
    setIsSubmitting(true);
    try {
      await login(data);
      // Phase 6: send a first-time user to the optional onboarding flow
      // instead of straight to the dashboard. "First-time" is tracked
      // client-side, keyed by email (see utils/profileStorage.js) — the
      // backend has no concept of this. Login itself (the `login()` call
      // above) is completely unchanged.
      const destination = hasSeenOnboarding(data.email)
        ? "/dashboard"
        : "/onboarding";
      navigate(destination, { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setServerError(
        typeof detail === "string"
          ? detail
          : "Incorrect email or password. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-10 text-white">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl shadow-black/20">
        <h1 className="text-2xl font-bold text-center">
          Log in to <span className="text-blue-500">FitTrack</span>
        </h1>
        <p className="mt-2 text-center text-sm text-gray-400">
          Welcome back — pick up right where you left off.
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-4"
          noValidate
        >
          {serverError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {serverError}
            </div>
          )}

          <div>
            <label htmlFor="email" className={LABEL_CLASSES}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={FIELD_CLASSES}
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email address",
                },
              })}
            />
            {errors.email && (
              <p className={ERROR_CLASSES}>{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className={LABEL_CLASSES}>
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className={FIELD_CLASSES}
              {...register("password", {
                required: "Password is required",
              })}
            />
            {errors.password && (
              <p className={ERROR_CLASSES}>{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isSubmitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Link to="/register" className="text-blue-400 hover:text-blue-300">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

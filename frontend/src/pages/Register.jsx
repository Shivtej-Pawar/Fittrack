import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const FIELD_CLASSES =
  "mt-1.5 block w-full rounded-xl border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors";
const LABEL_CLASSES = "block text-sm font-medium text-gray-300";
const ERROR_CLASSES = "mt-1.5 text-sm text-red-400";

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ mode: "onBlur" });

  const password = watch("password");

  async function onSubmit(data) {
    setServerError("");
    setIsSubmitting(true);
    try {
      // Phase 6: registration only collects identity + credentials.
      // height/current_weight/goal_weight are no longer asked for here —
      // the backend's UserCreate schema still accepts them (unchanged,
      // per this phase's "do not modify backend files" constraint), they
      // just aren't sent from this form anymore. A user can add them
      // later via the optional Onboarding flow or from Profile.
      await registerUser({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
      });
      navigate("/login", { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setServerError(
        typeof detail === "string"
          ? detail
          : "Something went wrong while registering. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-10 text-white">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl shadow-black/20">
        <h1 className="text-2xl font-bold text-center">
          Create your <span className="text-blue-500">FitTrack</span> account
        </h1>
        <p className="mt-2 text-center text-sm text-gray-400">
          Just the basics — you can add your stats anytime later.
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
            <label htmlFor="full_name" className={LABEL_CLASSES}>
              Full Name
            </label>
            <input
              id="full_name"
              type="text"
              autoComplete="name"
              className={FIELD_CLASSES}
              {...register("full_name", {
                required: "Full name is required",
                minLength: {
                  value: 2,
                  message: "Full name must be at least 2 characters",
                },
              })}
            />
            {errors.full_name && (
              <p className={ERROR_CLASSES}>{errors.full_name.message}</p>
            )}
          </div>

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
              autoComplete="new-password"
              className={FIELD_CLASSES}
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters",
                },
              })}
            />
            {errors.password && (
              <p className={ERROR_CLASSES}>{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirm_password" className={LABEL_CLASSES}>
              Confirm Password
            </label>
            <input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              className={FIELD_CLASSES}
              {...register("confirm_password", {
                required: "Please confirm your password",
                validate: (value) =>
                  value === password || "Passwords do not match",
              })}
            />
            {errors.confirm_password && (
              <p className={ERROR_CLASSES}>{errors.confirm_password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-400 hover:text-blue-300">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

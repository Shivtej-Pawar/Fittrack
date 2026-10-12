import axios from "axios";

/**
 * Shared Axios instance for all API calls.
 *
 * Centralizing baseURL + the auth header here means no other file ever
 * hardcodes the API URL or manually attaches the Authorization header.
 *
 * --- Configuration fix (post-launch audit) --------------------------
 * `baseURL` used to be hardcoded to `"http://127.0.0.1:8000/api/v1"`
 * directly in source — meaning a production build could only ever talk
 * to a backend running on the same machine as the browser, which is
 * only true in local development. It now reads `VITE_API_URL` from the
 * build-time environment (Vite exposes any `VITE_`-prefixed variable via
 * `import.meta.env` — see https://vite.dev/guide/env-and-mode), falling
 * back to the same local-dev address as before if it's not set, so
 * `npm run dev` keeps working with zero configuration. For a real
 * deployment, set `VITE_API_URL` (e.g. in a `.env.production` file, or
 * via your hosting platform's environment variable settings) to the
 * actual deployed backend's URL — see `.env.example` in this directory.
 * No production URL is invented or hardcoded here; it must be supplied.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach the JWT (if present) to every outgoing
// request. Reading it fresh from sessionStorage on each request (rather
// than caching it in a variable) means a login/logout in another part of
// the app is always picked up immediately, with no stale-token risk.
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("fittrack_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

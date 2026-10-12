import api from "../api/axios";

/**
 * Thin wrapper around the backend's user-profile-update endpoint. Same
 * pattern as authService.js/workoutService.js: no session/state
 * management or error handling here — just an HTTP call that returns
 * plain data and lets errors bubble up to whatever component calls it.
 *
 * Phase 9: this replaces services/profileService.js's old
 * localStorage-fallback version now that a real backend endpoint exists
 * (`PATCH /api/v1/users/me`) — see backend/app/routers/users.py. Every
 * field is optional; only send what actually changed (e.g. Onboarding
 * sending just `{ height }`) — the backend only overwrites fields that
 * are present in the request body.
 */

// PATCH /users/me → 200 OK, returns the updated UserResponse.
export const updateUserProfile = async (updates) => {
  const response = await api.patch("/users/me", updates);
  return response.data;
};

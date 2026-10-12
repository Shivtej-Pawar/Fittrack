import api from "../api/axios";

/**
 * Thin wrappers around the backend auth endpoints. These functions only
 * know about HTTP — no session/state management here, that's AuthContext's
 * job. Each returns response.data directly so callers get plain objects.
 */

// POST /auth/register → 201 Created, returns the new UserResponse
// (full_name, email, height, current_weight, goal_weight, etc.)
export async function registerUser(payload) {
  const response = await api.post("/auth/register", payload);
  return response.data;
}

// POST /auth/login → 200 OK, returns { access_token, token_type }
export async function loginUser(credentials) {
  const response = await api.post("/auth/login", credentials);
  return response.data;
}

// GET /users/me → 200 OK with valid token, returns the UserResponse for
// whoever the token belongs to. Relies on the axios interceptor to attach
// the Authorization header.
export async function getCurrentUser() {
  const response = await api.get("/users/me");
  return response.data;
}

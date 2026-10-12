import api from "../api/axios";

/**
 * Thin wrappers around the backend workout endpoints. Same pattern as
 * authService.js: no session/state management or error handling here —
 * just HTTP calls that return plain data and let errors bubble up to
 * whatever component calls them.
 */

// POST /workouts → 201 Created, returns the new WorkoutResponse.
// The Authorization header is attached automatically by the Axios
// request interceptor in api/axios.js — nothing to do here.
export const createWorkout = async (workoutData) => {
  const response = await api.post("/workouts", workoutData);
  return response.data;
};

// GET /workouts → 200 OK, returns the current user's WorkoutResponse[].
export const getWorkouts = async () => {
  const response = await api.get("/workouts");
  return response.data;
};

// PUT /workouts/{id} → 200 OK, returns the updated WorkoutResponse.
// Same payload shape as createWorkout — the backend reuses WorkoutCreate
// for both, since an edit replaces every editable field wholesale.
export const updateWorkout = async (id, workoutData) => {
  const response = await api.put(`/workouts/${id}`, workoutData);
  return response.data;
};

// DELETE /workouts/{id} → 200 OK, returns { message: "Workout deleted successfully" }.
export const deleteWorkout = async (id) => {
  const response = await api.delete(`/workouts/${id}`);
  return response.data;
};

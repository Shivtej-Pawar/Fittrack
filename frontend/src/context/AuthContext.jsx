import { createContext, useContext, useEffect, useState } from "react";
import {
  registerUser,
  loginUser,
  getCurrentUser,
} from "../services/authService";

const TOKEN_KEY = "fittrack_token";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY));
  // `loading` is true until we've finished trying to restore a session on
  // first mount, so ProtectedRoute can show a spinner instead of briefly
  // redirecting to /login before the refresh check finishes.
  const [loading, setLoading] = useState(true);

  // On mount (and whenever the token changes), try to restore the session:
  // if a token exists in sessionStorage, validate it by fetching the
  // current user. An invalid/expired token clears itself out automatically.
  useEffect(() => {
    async function restoreSession() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch {
        // Token is invalid or expired — log out cleanly.
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function login(credentials) {
    const { access_token: accessToken } = await loginUser(credentials);
    sessionStorage.setItem(TOKEN_KEY, accessToken);
    // Setting token triggers the effect above, which fetches the user.
    setToken(accessToken);
  }

  async function register(payload) {
    return registerUser(payload);
  }

  // Re-fetches the current user from the backend and updates context
  // state (Phase 9). Needed now that Profile/Onboarding persist body
  // stats to the database via PATCH /users/me instead of localStorage:
  // `user` here is only ever populated once per session (on login/
  // restore), so without this, a successful profile update wouldn't be
  // reflected anywhere else in the app (e.g. Navbar, or Profile itself
  // on a later visit within the same session) until the next full login.
  async function refreshUser() {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    return currentUser;
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

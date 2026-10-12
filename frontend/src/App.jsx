import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import LogWorkout from "./pages/LogWorkout";
import Workouts from "./pages/Workouts";
import Progress from "./pages/Progress";
import Profile from "./pages/Profile";
import Onboarding from "./pages/Onboarding";
import Layout from "./components/Layout";
import InstallPrompt from "./components/InstallPrompt";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
          <Routes>
            {/* Landing handles its own authenticated-user redirect internally,
                so / must render it directly rather than redirecting away. */}
            <Route path="/" element={<Landing />} />

            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />

            {/* Dashboard and Profile already wrap their own content in
                <Layout> internally, so they only need ProtectedRoute here —
                adding <Layout> again would render the Navbar twice. */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Log Workout and View Workouts (Phase 9 / Feature 1) — split
                out of what used to be a single /workouts route. Both
                pages wrap themselves in <Layout> internally (same
                pattern as Dashboard/Profile above), so neither needs it
                applied again here. */}
            <Route
              path="/log-workout"
              element={
                <ProtectedRoute>
                  <LogWorkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workouts"
              element={
                <ProtectedRoute>
                  <Workouts />
                </ProtectedRoute>
              }
            />

            {/* Progress does NOT wrap itself in <Layout> (Progress.jsx's
                own comments confirm it expects App.jsx to provide it),
                so Layout is applied here. */}
            <Route
              path="/progress"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Progress />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Standalone onboarding flow — protected, but deliberately not
                wrapped in Layout (no Navbar during first-run setup). */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <InstallPrompt />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
